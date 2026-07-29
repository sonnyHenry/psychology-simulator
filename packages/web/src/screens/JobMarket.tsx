import { useState } from 'react';
import type { PlayerAction, ViewModel } from '@psy-sim/core';
import { Card, ChoiceButton, ContinueButton, RichText } from '../components/ui';

type JobMarketView = Extract<ViewModel, { kind: 'JOB_MARKET' }>;
type TenureView = Extract<ViewModel, { kind: 'TENURE_REVIEW' }>;

/**
 * 教职求职季(GAME_DESIGN 九节)。**全游戏的高光。**
 *
 * 七步一屏一步,靠 `view.step` 分支。三种交互形态:
 * 选项(时机 / 材料 / talk / 谈判 / 两体)、清单多选(投递)、offer 卡片(结果)。
 *
 * ## 谈条件那一屏做成真的合同条款排版
 *
 * 等宽字体、条目编号、区间数字——**同一所学校的两个 offer 可以在启动经费
 * 和考核指标上差一倍**,而这件事只有排成条款才看得出来。
 *
 * ## 市场松紧不在这一屏上,也不在任何一屏上
 *
 * 那是 9.3 第一条的实现方式:你只能事后从"今年大家都不好找"里推断。
 */
export function JobMarketScreen(props: { view: JobMarketView; act: (a: PlayerAction) => void }) {
  const { view, act } = props;
  const [picks, setPicks] = useState<string[]>([]);

  const toggle = (id: string) =>
    setPicks(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < view.maxPicks ? [...prev, id] : prev,
    );

  return (
    <Card className="jobmarket">
      <div className="screen-head">
        <h2>
          {view.year} 年 · {view.title}
        </h2>
        <p className="gameified-notice">
          <RichText text={view.notice} />
        </p>
      </div>

      <div className="jm-body">
        <RichText text={view.text} />
      </div>

      {/* ── 投递:清单多选。**只给模糊档位**,与录取屏同一口径 ── */}
      {view.step === 'targeting' && (
        <>
          <div className="jm-picked">
            已选 {picks.length} / {view.maxPicks}
          </div>
          {view.positions.map(position => {
            const on = picks.includes(position.id);
            return (
              <button
                key={position.id}
                className={`jm-position ${on ? 'jm-position-on' : ''}`}
                onClick={() => toggle(position.id)}
              >
                <div className="jm-position-head">
                  <span className="jm-position-name">
                    {position.name}
                    {position.unit && <span className="jm-position-unit"> · {position.unit}</span>}
                  </span>
                  <span className="jm-chance">{position.chanceLabel}</span>
                </div>
                <div className="jm-position-meta">
                  {position.kindLabel} · {position.city}
                  {position.matchedDomains.length > 0 && (
                    <span className="jm-match"> · 方向对得上</span>
                  )}
                </div>
                {position.terms.length > 0 && (
                  <div className="jm-position-terms">{position.terms.join(' · ')}</div>
                )}
              </button>
            );
          })}
          <ContinueButton
            onClick={() => act({ type: 'JOB_MARKET_STEP', positionIds: picks })}
            disabled={picks.length === 0}
            label={picks.length === 0 ? '至少投一个' : `投出这 ${picks.length} 份`}
          />
        </>
      )}

      {/* ── 谈条件 / 结果:**做成真的合同条款排版** ── */}
      {(view.step === 'negotiation' || view.step === 'result') && view.offers.length > 0 && (
        <div className="jm-offers">
          {view.offers.map((offer, index) => (
            <div key={offer.positionId} className="jm-offer">
              <div className="jm-offer-head">
                <span className="jm-offer-name">{offer.institutionName}</span>
                <span className="jm-offer-city">
                  {offer.city}
                  {offer.negotiated && <span className="jm-negotiated">谈过</span>}
                </span>
              </div>
              <ol className="jm-terms">
                {offer.termLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              {view.step === 'result' && (
                <button
                  className="jm-accept"
                  onClick={() => act({ type: 'JOB_MARKET_STEP', optionId: offer.positionId })}
                >
                  接受第 {index + 1} 份
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 其余各步:选项 ── */}
      {view.step !== 'targeting' &&
        !(view.step === 'result' && view.offers.length > 0) &&
        view.options.map(option => (
          <ChoiceButton
            key={option.id}
            sub={[option.text, option.hint].filter(Boolean).join('  ·  ')}
            onClick={() => act({ type: 'JOB_MARKET_STEP', optionId: option.id })}
          >
            {option.label}
          </ChoiceButton>
        ))}

      {view.step === 'talks' && view.invitedCount > 0 && (
        <p className="jm-footnote">
          投了 {view.appliedCount} 份,{view.invitedCount} 个进了面试。
        </p>
      )}
    </Card>
  );
}

/**
 * 长聘首考(GAME_DESIGN 十节)。**它不是一个数值阈值,是一张清单。**
 *
 * 逐行渲染,最后给结果。**人际那一行没有"要求"那一栏**——
 * 它是陈述,不是判定项,而排版必须让这件事看得出来。
 */
export function TenureReviewScreen(props: { view: TenureView; act: (a: PlayerAction) => void }) {
  const { view, act } = props;
  return (
    <Card className="tenure">
      <div className="screen-head">
        <h2>{view.year} 年 · 长聘首考</h2>
        <p className="screen-sub">{view.institution}</p>
      </div>

      <div className="tenure-list">
        {view.lines.map(line => (
          <div key={line.label} className={`tenure-row ${line.required && !line.met ? 'tenure-row-miss' : ''}`}>
            <span className="tenure-label">{line.label}</span>
            <span className="tenure-actual">{line.actual}</span>
            <span className="tenure-req">
              {/* 没有硬指标的行不画那一栏,而不是画一个空的 */}
              {line.required ? (
                <>
                  {line.required}
                  <span className={line.met ? 'tenure-ok' : 'tenure-no'}>{line.met ? '达标' : '未达标'}</span>
                </>
              ) : null}
            </span>
          </div>
        ))}
      </div>

      <div className={`tenure-verdict ${view.passed ? 'tenure-pass' : 'tenure-fail'}`}>
        <RichText text={view.text} />
      </div>

      <ContinueButton onClick={() => act({ type: 'CONTINUE' })} label="继续" />
    </Card>
  );
}
