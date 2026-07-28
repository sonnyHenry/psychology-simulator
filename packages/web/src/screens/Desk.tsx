import { useMemo, useState } from 'react';
import type { PlayerAction, ViewModel } from '@psy-sim/core';
import { Card, ContinueButton, RichText } from '../components/ui';

type DeskView = Extract<ViewModel, { kind: 'DESK' }>;
type DeskItem = DeskView['items'][number];

/**
 * 工作台(GAME_DESIGN 四节)。**本作的主界面。**
 *
 * 第一版的分配屏是一张脱离上下文的表:一列可投入项、一项一行字、投完就走。
 * 它能表达"精力有限",却表达不了"你在经营什么"——手上那两个课题、三个来访者、
 * 那个一年见你三次的导师,在做决定的那一屏上全都不可见。
 *
 * ## 两种动作,两条通路(TECH 4.4)
 *
 * - **花精力格的**走 `ALLOCATE`:一次原子提交,提交之前可以反复加减格子。
 * - **不花格数的**走 `DESK_ACTION`:当场生效,不离开这一屏。
 * - **纯浏览**(切页签、翻「这些年」)**绝不进 dispatch**——动作日志只记改变状态的事。
 *   工作台会显著增加点击量,浏览操作要是进了 actionLog,存档、重放和 devJump
 *   产出的动作序列全会被淹没。
 */

const TABS = [
  { id: 'desk', label: '桌面' },
  { id: 'projects', label: '课题' },
  { id: 'cases', label: '个案' },
  { id: 'advisor', label: '导师' },
  { id: 'years', label: '这些年' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const CATEGORY_LABELS: Record<string, string> = {
  course: '重点课程',
  lab: '实验室',
  counseling: '咨询中心',
  work: '学生工作',
  exam_prep: '备考',
  money: '挣钱',
  rest: '休息',
};

/** 分组顺序:课程在最上面(它们占掉最多格子),休息在最下面但**不是被塞在末尾** */
const CATEGORY_ORDER = ['course', 'lab', 'counseling', 'work', 'exam_prep', 'money', 'rest'];

const TIER_NAME: Record<string, string> = {
  q1: '一区',
  q2: '二区',
  q3: '三区',
  cssci: 'CSSCI',
  chinese_core: '中文核心',
  conference: '会议',
  preprint: '预印本',
};

const AUTHORSHIP_NAME: Record<string, string> = {
  first: '一作',
  co_first: '共同一作',
  second: '二作',
  middle: '中间作者',
  corresponding: '通讯',
};

export function DeskScreen(props: { view: DeskView; act: (action: PlayerAction) => void }) {
  const { view, act } = props;
  const [tab, setTab] = useState<TabId>('desk');
  const [picks, setPicks] = useState<string[]>([]);
  const remaining = view.slots - picks.length;

  const countOf = (id: string) => picks.filter(p => p === id).length;
  const canAdd = (item: DeskItem) =>
    remaining > 0 && (item.maxSlots === null || countOf(item.id) < item.maxSlots);
  const add = (id: string) => setPicks([...picks, id]);
  const remove = (id: string) => {
    const next = [...picks];
    const at = next.lastIndexOf(id);
    if (at >= 0) next.splice(at, 1);
    setPicks(next);
  };

  const slotControls = (item: DeskItem) => (
    <SlotControls
      count={countOf(item.id)}
      canAdd={canAdd(item)}
      label={item.label}
      onAdd={() => add(item.id)}
      onRemove={() => remove(item.id)}
    />
  );

  /** 桌面页签上的项:没有挂到任何卡片/面板上的那些 */
  const deskItems = useMemo(() => view.items.filter(item => !item.target), [view.items]);
  const itemsFor = (kind: 'project' | 'case' | 'advisor', id?: string) =>
    view.items.filter(item => item.target?.kind === kind && item.target.id === id);

  const actionsFor = (projectId: string) => view.actions.filter(a => a.targetId === projectId);

  return (
    <Card className="desk">
      <div className="screen-head">
        <h2>{view.year} 年 · 工作台</h2>
        <p className="screen-sub">
          {view.phaseLabel}阶段每年 {view.slots + view.retakeSlots} 格精力
          {view.retakeSlots > 0 && (
            <span className="retake-note">,其中 {view.retakeSlots} 格被重修占掉了</span>
          )}
        </p>
      </div>

      {view.graduation && (
        <div className={`grad-bar ${view.graduation.met ? 'grad-bar-met' : ''}`}>
          <div className="grad-bar-req">
            <span className="grad-bar-inst">{view.graduation.institution}</span>
            {view.graduation.bar}
          </div>
          <div className="grad-bar-have">
            <span>你现在 {view.graduation.have.join(' · ')}</span>
            <span className="grad-bar-gap">{view.graduation.remaining ?? '已经够了'}</span>
          </div>
        </div>
      )}

      <div className={`slot-meter ${remaining === 0 ? 'slot-meter-full' : ''}`}>
        {Array.from({ length: view.slots }, (_, i) => (
          <span key={i} className={`slot ${i < picks.length ? 'slot-used' : ''}`} />
        ))}
        <span className="slot-count">{remaining > 0 ? `还剩 ${remaining} 格` : '分配完了'}</span>
      </div>

      {/* 切页签是纯 UI 状态,不进 dispatch */}
      <div className="desk-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`desk-tab ${tab === t.id ? 'desk-tab-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'projects' && view.projects.length > 0 && (
              <span className="desk-tab-badge">{view.projects.length}</span>
            )}
            {t.id === 'cases' && view.cases.length > 0 && (
              <span className="desk-tab-badge">{view.cases.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'desk' && (
        <DeskTab
          view={view}
          items={deskItems}
          countOf={countOf}
          slotControls={slotControls}
        />
      )}

      {tab === 'projects' && (
        <div className="desk-pane">
          {view.projects.length === 0 && <p className="desk-empty">手上还没有课题。</p>}
          {view.projects.map(project => (
            <div key={project.id} className="obj-card">
              <div className="obj-card-head">
                <span className="obj-card-title">
                  「{project.title}」
                  {project.isThesis && <span className="thesis-tag">毕业论文</span>}
                </span>
                <span className="obj-card-meta">第 {project.yearsSpent + 1} 年</span>
              </div>
              <div className="obj-card-facts">
                {/* 阶段是事实,质量是判断——这两栏的口径不一样,排版也不该一样 */}
                <span className="fact">
                  {project.stage}
                  {project.stageTotal > 0 && (
                    <span className="fact-sub">
                      {project.stageIndex}/{project.stageTotal} 站
                    </span>
                  )}
                </span>
                <span className="fact">
                  {project.qualityLabel}
                  <span className="fact-sub">现在的成色</span>
                </span>
                <span className="fact">
                  {AUTHORSHIP_NAME[project.authorship] ?? project.authorship}
                  <span className="fact-sub">作者位次</span>
                </span>
                {project.rejections > 0 && (
                  <span className="fact fact-warn">
                    被拒 {project.rejections} 次<span className="fact-sub">还能再投</span>
                  </span>
                )}
              </div>
              {project.foundationHint && (
                <div className="skeptic-hint">【怀疑主义】{project.foundationHint}</div>
              )}
              {project.atSubmitStage && (
                <div className="submit-box">
                  <div className="submit-label">
                    {project.submitTierLabel
                      ? `已经投了${project.submitTierLabel}`
                      : '该定投哪一档了'}
                  </div>
                  {actionsFor(project.id)
                    .filter(a => a.id !== 'desk_abandon_project')
                    .map(action => (
                      <button
                        key={`${action.id}-${action.value}`}
                        className="submit-btn"
                        onClick={() =>
                          act({
                            type: 'DESK_ACTION',
                            actionId: action.id,
                            targetId: action.targetId,
                            value: action.value,
                          })
                        }
                      >
                        <span className="submit-btn-label">
                          {action.id === 'desk_resubmit_lower' ? '降到' : ''}
                          {TIER_NAME[action.value ?? ''] ?? action.label}
                          {action.id === 'desk_resubmit_lower' ? '改投' : ''}
                        </span>
                        <span className="submit-btn-hint">{action.hint}</span>
                      </button>
                    ))}
                </div>
              )}
              {itemsFor('project', project.id).map(item => (
                <ItemRow key={item.id} item={item} count={countOf(item.id)} controls={slotControls(item)} />
              ))}
              {actionsFor(project.id)
                .filter(a => a.id === 'desk_abandon_project')
                .map(action => (
                  <button
                    key={action.id}
                    className="obj-card-danger"
                    onClick={() =>
                      act({ type: 'DESK_ACTION', actionId: action.id, targetId: action.targetId })
                    }
                    title={action.hint}
                  >
                    {action.label}
                  </button>
                ))}
            </div>
          ))}
          {view.papers.length > 0 && (
            <div className="review-block">
              <div className="review-label">已发表</div>
              {view.papers.map((paper, i) => (
                <div key={i} className="review-row">
                  <span>「{paper.title}」</span>
                  <span className="review-value">
                    {paper.year} · {TIER_NAME[paper.tier] ?? paper.tier} ·{' '}
                    {AUTHORSHIP_NAME[paper.authorship] ?? paper.authorship}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'cases' && (
        <div className="desk-pane">
          {view.cases.length === 0 && <p className="desk-empty">手上还没有来访者。</p>}
          {view.cases.map(kase => (
            <div key={kase.id} className="obj-card">
              <div className="obj-card-head">
                <span className="obj-card-title">{kase.label}</span>
                <span className="obj-card-meta">第 {kase.sessions} 次会谈</span>
              </div>
              <div className="obj-card-issue">{kase.presentingIssue}</div>
              <div className="obj-card-facts">
                <span className="fact">
                  {kase.status}
                  <span className="fact-sub">现在在哪一段</span>
                </span>
                {/* **联盟只给走向,不给数值。** 把关系变成进度条,恰好毁掉它想说的事 */}
                <span className="fact">
                  {kase.trend === 'warm' ? '在变好' : kase.trend === 'strained' ? '有点僵' : '还看不出来'}
                  <span className="fact-sub">这段关系</span>
                </span>
                <span className="fact">
                  {kase.riskLabel}
                  <span className="fact-sub">风险</span>
                </span>
                <span className="fact">
                  {kase.supervised ? '有督导' : '没有督导'}
                  <span className="fact-sub">今年</span>
                </span>
              </div>
            </div>
          ))}
          <div className="hours-row">
            <span>注册小时数 {view.clinicalHours}</span>
            <span>督导小时数 {view.supervisionHours}</span>
          </div>
          {itemsFor('case').map(item => (
            <ItemRow key={item.id} item={item} count={countOf(item.id)} controls={slotControls(item)} />
          ))}
        </div>
      )}

      {tab === 'advisor' && (
        <div className="desk-pane">
          {!view.advisor && <p className="desk-empty">你还没有进组。</p>}
          {view.advisor && (
            <>
              <div className="obj-card">
                <div className="obj-card-head">
                  <span className="obj-card-title">{view.advisor.name}</span>
                </div>
                {/* 抽卡那天你读到的那句话,永远留在这儿。几年之后再读它会有别的味道 */}
                <div className="advisor-impression">
                  <RichText text={view.advisor.publicImpression} />
                </div>
                <div className="obj-card-facts">
                  <span className="fact">
                    {view.advisor.relationLabel}
                    <span className="fact-sub">师生关系</span>
                  </span>
                  <span className="fact">
                    {view.advisor.availabilityLabel}
                    <span className="fact-sub">他有多少时间给你</span>
                  </span>
                </div>
                {view.advisor.lastLine && (
                  <div className="advisor-line">他上次说:{view.advisor.lastLine}</div>
                )}
              </div>
              {itemsFor('advisor').map(item => (
                <ItemRow key={item.id} item={item} count={countOf(item.id)} controls={slotControls(item)} />
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'years' && (
        <div className="desk-pane">
          {view.years.length === 0 && <p className="desk-empty">还没有过完一年。</p>}
          {[...view.years].reverse().map(year => (
            <div key={year.year} className="year-row">
              <div className="year-row-head">
                <span className="year-row-year">{year.year}</span>
                {year.phaseLabel && <span className="year-row-phase">{year.phaseLabel}</span>}
                <span className="year-row-money">¥{year.money.toLocaleString()}</span>
                {year.state !== null && <span className="year-row-state">状态 {year.state}</span>}
              </div>
              {year.papers.map((paper, i) => (
                <div key={i} className="year-row-note">
                  发表「{paper.title}」({TIER_NAME[paper.tier] ?? paper.tier})
                </div>
              ))}
              {year.notes.map((note, i) => (
                <div key={i} className="year-row-note">
                  {note}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <ContinueButton
        onClick={() => act({ type: 'ALLOCATE', picks })}
        disabled={remaining !== 0}
        label={remaining === 0 ? '就这么过这一年' : `还要分配 ${remaining} 格`}
      />
    </Card>
  );
}

function DeskTab(props: {
  view: DeskView;
  items: DeskItem[];
  countOf: (id: string) => number;
  slotControls: (item: DeskItem) => JSX.Element;
}) {
  const { view, items, countOf, slotControls } = props;
  const grouped = useMemo(() => {
    const byCategory = new Map<string, DeskItem[]>();
    for (const item of items) {
      byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
    }
    return CATEGORY_ORDER.filter(c => byCategory.has(c)).map(c => ({
      category: c,
      items: byCategory.get(c)!,
    }));
  }, [items]);

  return (
    <div className="desk-pane">
      {/* 手上有什么的一行摘要:对象在别的页签里,但**它们必须在做决定的这一屏上可见** */}
      {(view.projects.length > 0 || view.cases.length > 0) && (
        <div className="desk-summary">
          {view.projects.map(project => (
            <div key={project.id} className="desk-summary-row">
              <span>「{project.title}」</span>
              <span className="review-value">
                {project.stage} · 第 {project.yearsSpent + 1} 年 · {project.qualityLabel}
              </span>
            </div>
          ))}
          {view.cases.map(kase => (
            <div key={kase.id} className="desk-summary-row">
              <span>{kase.label}</span>
              <span className="review-value">
                {kase.status} · 第 {kase.sessions} 次 ·{' '}
                {kase.trend === 'warm' ? '在变好' : kase.trend === 'strained' ? '有点僵' : '看不出来'}
              </span>
            </div>
          ))}
        </div>
      )}
      {grouped.map(group => (
        <div key={group.category} className="alloc-group">
          <div className="alloc-group-label">{CATEGORY_LABELS[group.category] ?? group.category}</div>
          {group.items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              count={countOf(item.id)}
              controls={slotControls(item)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 一个投入项。**`payoff` 那一行是这次改动借来的唯一一条东西**(GAME_DESIGN 4.6):
 * 氛围文案留在上面,代价写在下面。不写清楚不是含蓄,是让玩家瞎猜。
 */
function ItemRow(props: { item: DeskItem; count: number; controls: JSX.Element }) {
  const { item, count, controls } = props;
  return (
    <div className={`alloc-item ${count > 0 ? 'alloc-item-on' : ''}`}>
      <div className="alloc-item-body">
        <div className="alloc-item-label">
          {item.label}
          {count > 0 && <span className="alloc-count">×{count}</span>}
        </div>
        <div className="alloc-item-text">
          <RichText text={item.text} />
        </div>
        <div className="alloc-item-payoff">
          <RichText text={item.payoff} />
        </div>
        {item.textbook && <div className="alloc-textbook">{item.textbook}</div>}
      </div>
      {controls}
    </div>
  );
}

function SlotControls(props: {
  count: number;
  canAdd: boolean;
  label: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="alloc-item-controls">
      <button
        className="alloc-btn"
        disabled={props.count === 0}
        onClick={props.onRemove}
        aria-label={`减少 ${props.label}`}
      >
        −
      </button>
      <button
        className="alloc-btn"
        disabled={!props.canAdd}
        onClick={props.onAdd}
        aria-label={`增加 ${props.label}`}
      >
        +
      </button>
    </div>
  );
}
