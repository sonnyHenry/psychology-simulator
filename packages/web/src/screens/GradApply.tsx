import { useState } from 'react';
import type { ViewModel } from '@psy-sim/core';
import { Card, ContinueButton, RichText } from '../components/ui';

type View = Extract<ViewModel, { kind: 'GRAD_APPLY' }>;

const KIND_TITLE: Record<View['applyKind'], string> = {
  master: '投申请 · 读硕',
  phd: '投申请 · 读博',
  phd_abroad: '投申请 · 出去读',
  postdoc: '投申请 · 博后',
};

const KIND_SUB: Record<View['applyKind'], string> = {
  master: '你要在这张清单上选几个,然后等。',
  phd: '这一次你比四年前懂得多,但要选的东西也更重。',
  phd_abroad: '语言、推荐信、以及没有人认识你——这三件事都在门槛里。',
  postdoc: '这一次看的是你手上有几篇。',
};

/**
 * 读研 / 读博 / 出国的院校清单。**一屏三用**,靠 `applyKind` 换标题和文案,数据全在 ViewModel 里。
 *
 * ## 只给模糊档位,不给精确概率
 *
 * 清单上是"稳 / 较稳 / 冲 / 悬",不是百分比。真实的申请里没有人知道自己的确切概率——
 * 你只知道"这个有点冒险"。给了数字,这一屏就从一次选择变成一道最优化题,
 * 而**那道题的答案是全投稳的**,那正好把这件事最真实的部分抹掉了。
 *
 * ## 顶部声明是常驻的
 *
 * 招生规模、经费、考核年限全是游戏化设定。validate 规则 12 要求这条声明非空,
 * 所以它不可能因为改版被顺手删掉。
 */
export function GradApplyScreen(props: { view: View; act: (a: { type: 'APPLY_GRAD'; institutionIds: string[] }) => void }) {
  const { view, act } = props;
  const [picked, setPicked] = useState<string[]>([]);
  const full = picked.length >= view.maxPicks;

  function toggle(id: string) {
    setPicked(prev => (prev.includes(id) ? prev.filter(x => x !== id) : full ? prev : [...prev, id]));
  }

  return (
    <Card className="apply">
      <div className="screen-head">
        <h2>
          {view.year} 年 · {KIND_TITLE[view.applyKind]}
        </h2>
        <p className="screen-sub">
          {KIND_SUB[view.applyKind]} 最多选 {view.maxPicks} 个——
          <strong>材料是一份份写的,全勾上不是策略。</strong>
        </p>
      </div>

      <div className="apply-notice">
        <RichText text={view.notice} />
      </div>

      <div className="apply-list">
        {view.options.map(opt => {
          const on = picked.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`apply-card${on ? ' on' : ''}${!on && full ? ' dim' : ''}`}
              onClick={() => toggle(opt.id)}
            >
              <div className="apply-card-head">
                <span className="apply-name">{opt.name}</span>
                <span className={`apply-chance c-${opt.chanceLabel}`}>{opt.chanceLabel}</span>
              </div>
              <div className="apply-unit">
                {opt.unit}
                {opt.lab ? ` · ${opt.lab}` : ''} · {opt.city}
              </div>
              <div className="apply-impression">{opt.impression}</div>
              {opt.matchedDomains.length > 0 && (
                // 本科四年在这里兑现:你泡实验室做的那个方向,决定了谁会认真看你的材料
                <div className="apply-match">方向对得上 ×{opt.matchedDomains.length}</div>
              )}
              {opt.terms.length > 0 && <div className="apply-terms">{opt.terms.join(' · ')}</div>}
            </button>
          );
        })}
      </div>

      <ContinueButton
        disabled={picked.length === 0}
        label={picked.length === 0 ? '选至少一个' : `投出去(${picked.length}/${view.maxPicks})`}
        onClick={() => act({ type: 'APPLY_GRAD', institutionIds: picked })}
      />
    </Card>
  );
}
