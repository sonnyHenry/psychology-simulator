import type { AllocationItem, ContentPack, PhaseConfig } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';
import { applyEffects } from '../dsl/apply';
import { readNumericFlag } from '../dsl/evaluate';
import { activeProjects, allocationIdForProject } from './project';

/**
 * 年度投入分配(GAME_DESIGN 第四节)。
 *
 * 每个回合开场先分配精力,再进简报 → 事件 → 结算。这是前作没有的一层,
 * 也是本作"方法 vs 临床互相抢时间"这条核心张力的唯一载体:
 * 本科每年只有四格,而两门重点课就要占掉两格。
 */

/** 重修占用格数的记账 flag(课程 `failed` 的 effects 往里写,下一年的分配屏读) */
export const RETAKE_FLAG = 'retake_slots';

/**
 * 本回合真正能用的精力格数。
 *
 * 基准来自阶段配置(本科 4 / 硕博 3 / 博后 3 / 预聘期 2 —— **递减本身就是一句评论**),
 * 叠加 `{ grantSlots }` 的本回合临时增减,再扣掉上一年挂科带来的重修占用。
 * 下限 0:被吃到负数只意味着这一年你什么都没能推进,不意味着倒扣。
 */
export function effectiveSlots(state: GameState, phase: PhaseConfig): number {
  if (phase.kind !== 'rounds') return 0;
  const retake = readNumericFlag(state.flags[RETAKE_FLAG]);
  return Math.max(0, (phase.allocationSlots ?? 0) + (state.grantedSlots ?? 0) - retake);
}

/**
 * 本回合可投入项:静态内容 + **每个活跃课题一项**。
 *
 * 课题项是动态合成的,不写在内容里——因为课题是运行时创建的对象,
 * 而"今年主要推哪个课题"必须是玩家一格一格投出来的具体选择,
 * 不能退化成一个笼统的"做科研"。这也是 `stageSuccessChance` 里
 * `投入格数` 那一项的唯一来源。
 */
export function availableItems(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
): AllocationItem[] {
  const ctx = { state, pack, rng };
  const staticItems = (pack.allocationItems ?? []).filter(item =>
    evalCondition(item.availableWhen, ctx),
  );
  const projectItems: AllocationItem[] = activeProjects(state)
    .filter(project => !project.isThesis)
    .map(project => ({
      id: allocationIdForProject(project.id),
      label: `推进「${project.title}」`,
      text: `第 ${project.yearsSpent + 1} 年 · 现在卡在${STAGE_TEXT[project.stage] ?? project.stage}`,
      category: 'course' as const,
      maxSlots: 2,
      // 投入本身不给属性:它的回报是**推进概率**(见 stageSuccessChance),
      // 而那个回报是概率性的——这正是"课题不能被稳定通关"的手感来源。
      perSlot: [{ stats: { method: 1 } }],
    }));
  return [...projectItems, ...staticItems];
}

/** 阶段的中文名。分配屏要让玩家一眼看出"这个课题现在卡在哪" */
const STAGE_TEXT: Record<string, string> = {
  ideation: '想法',
  lit: '文献',
  ethics: '伦理审查',
  collect: '收数据',
  analyze: '分析',
  write: '写作',
  submit: '投稿',
  review: '审稿',
};

export interface AllocationError {
  message: string;
}

/** 校验一次提交。返回 null 表示合法 */
export function validateAllocation(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  picks: string[],
  slots: number,
): AllocationError | null {
  if (picks.length !== slots) {
    return { message: `ALLOCATE expects exactly ${slots} picks, got ${picks.length}` };
  }
  const items = new Map(availableItems(state, pack, rng).map(item => [item.id, item]));
  const counts = new Map<string, number>();
  for (const id of picks) {
    const item = items.get(id);
    if (!item) return { message: `ALLOCATE unknown or unavailable item: ${id}` };
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of counts) {
    const max = items.get(id)?.maxSlots;
    if (max !== undefined && count > max) {
      return { message: `ALLOCATE item ${id} allows at most ${max} slots, got ${count}` };
    }
  }
  return null;
}

/**
 * 结算投入:每格应用一次 `perSlot`。
 *
 * 投两格就是应用两次——这让"今年主要就干这个"在数值上真的不一样,
 * 而不是一个只影响文案的姿态。
 */
export function settleAllocation(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  picks: string[],
): void {
  const items = new Map(availableItems(state, pack, rng).map(item => [item.id, item]));
  for (const id of picks) {
    const item = items.get(id);
    if (!item) continue;
    applyEffects(item.perSlot, state, pack);
  }
  // 重修的账在分配屏读过一次就清:它只占用一年
  if (readNumericFlag(state.flags[RETAKE_FLAG]) !== 0) state.flags[RETAKE_FLAG] = 0;
}
