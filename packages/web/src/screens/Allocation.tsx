import { useMemo, useState } from 'react';
import type { ViewModel } from '@psy-sim/core';
import { Card, ContinueButton, RichText } from '../components/ui';

type AllocationView = Extract<ViewModel, { kind: 'ALLOCATION' }>;

const CATEGORY_LABELS: Record<string, string> = {
  course: '重点课程',
  lab: '实验室',
  counseling: '咨询中心',
  work: '学生工作',
  exam_prep: '备考',
  money: '挣钱',
  rest: '休息',
};

/** 分组顺序:课程在最上面(它们占掉最多格子),休息在最下面 */
const CATEGORY_ORDER = ['course', 'lab', 'counseling', 'work', 'exam_prep', 'money', 'rest'];

/**
 * 年度投入分配屏(GAME_DESIGN 第四节)。
 *
 * 这一屏是本作与前作最核心的一处不同:**方法 vs 临床是互相抢时间的**,
 * 而"抢"这件事只能靠一个格数有限、必须做减法的界面表达出来。
 *
 * 交互刻意做成点一下加一格、再点减一格,而不是拖放:
 * 格子少(4 格),而且玩家真正要感受的是"加满了就没了",不是操作本身。
 */
export function AllocationScreen(props: { view: AllocationView; onSubmit: (picks: string[]) => void }) {
  const { view, onSubmit } = props;
  const [picks, setPicks] = useState<string[]>([]);
  const remaining = view.slots - picks.length;

  const grouped = useMemo(() => {
    const byCategory = new Map<string, AllocationView['items']>();
    for (const item of view.items) {
      byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
    }
    return CATEGORY_ORDER.filter(c => byCategory.has(c)).map(c => ({
      category: c,
      items: byCategory.get(c)!,
    }));
  }, [view.items]);

  const countOf = (id: string) => picks.filter(p => p === id).length;
  const canAdd = (id: string, maxSlots: number | null) =>
    remaining > 0 && (maxSlots === null || countOf(id) < maxSlots);

  return (
    <Card className="allocation">
      <div className="screen-head">
        <h2>{view.year} 年 · 这一年你打算怎么过</h2>
        <p className="screen-sub">
          {view.phaseLabel}阶段每年 {view.slots + view.retakeSlots} 格精力
          {view.retakeSlots > 0 && (
            <span className="retake-note">,其中 {view.retakeSlots} 格被重修占掉了</span>
          )}
        </p>
      </div>

      <div className={`slot-meter ${remaining === 0 ? 'slot-meter-full' : ''}`}>
        {Array.from({ length: view.slots }, (_, i) => (
          <span key={i} className={`slot ${i < picks.length ? 'slot-used' : ''}`} />
        ))}
        <span className="slot-count">
          {remaining > 0 ? `还剩 ${remaining} 格` : '分配完了'}
        </span>
      </div>

      {grouped.map(group => (
        <div key={group.category} className="alloc-group">
          <div className="alloc-group-label">{CATEGORY_LABELS[group.category] ?? group.category}</div>
          {group.items.map(item => {
            const count = countOf(item.id);
            return (
              <div key={item.id} className={`alloc-item ${count > 0 ? 'alloc-item-on' : ''}`}>
                <div className="alloc-item-body">
                  <div className="alloc-item-label">
                    {item.label}
                    {count > 0 && <span className="alloc-count">×{count}</span>}
                  </div>
                  <div className="alloc-item-text"><RichText text={item.text} /></div>
                  {item.textbook && <div className="alloc-textbook">{item.textbook}</div>}
                </div>
                <div className="alloc-item-controls">
                  <button
                    className="alloc-btn"
                    disabled={count === 0}
                    onClick={() => {
                      const next = [...picks];
                      next.splice(next.lastIndexOf(item.id), 1);
                      setPicks(next);
                    }}
                    aria-label={`减少 ${item.label}`}
                  >
                    −
                  </button>
                  <button
                    className="alloc-btn"
                    disabled={!canAdd(item.id, item.maxSlots)}
                    onClick={() => setPicks([...picks, item.id])}
                    aria-label={`增加 ${item.label}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <ContinueButton
        onClick={() => onSubmit(picks)}
        disabled={remaining !== 0}
        label={remaining === 0 ? '就这么过这一年' : `还要分配 ${remaining} 格`}
      />
    </Card>
  );
}
