import type { AdvisorDef } from '../types/advisor';
import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';

/**
 * 导师系统(GAME_DESIGN 第七节)——**本作最大的随机变量**。
 *
 * ## 抽卡屏只给公开信息
 *
 * `AdvisorDef.archetype` 是真实原型,**绝对不进 ViewModel**。抽卡时玩家只看到
 * `publicImpression`(主页、论文数、师兄师姐的一句话),真实体验要两三年才揭示完。
 *
 * 这个信息差不是刁难玩家,它是"换导师窗口逐年关闭"那个张力的全部前提:
 * **你什么都不知道的时候可以换,等你什么都知道了就走不了了。**
 */

export function advisorDefOf(state: GameState, pack: ContentPack): AdvisorDef | undefined {
  if (!state.advisor) return undefined;
  return (pack.advisors ?? []).find(a => a.id === state.advisor?.id);
}

/**
 * 抽卡候选池。
 *
 * **池子取决于你大二干了什么**(GAME_DESIGN 8.5):进过实验室的人能看到更多导师,
 * 没进过的人是盲抽。这条由内容侧的 `AdvisorDef.stages` 之外的门控实现——
 * 这里只负责按 `availableWhen` 过滤 + 抽样。
 */
export function drawAdvisorOffer(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  count: number,
): string[] {
  const ctx = { state, pack, rng };
  const pool = (pack.advisors ?? []).filter(advisor => {
    const gate = advisor.stages[advisor.initialStage]?.advanceWhen;
    // 初始阶段的 advanceWhen 在这里当"能不能被抽到"的门控用,
    // 因为导师的可见性本来就该由玩家前面几年的处境决定。
    return gate === undefined || evalCondition(gate, ctx);
  });
  return rng.sample(pool.length > 0 ? pool : (pack.advisors ?? []), count).map(a => a.id);
}

export function joinAdvisor(state: GameState, pack: ContentPack, advisorId: string): void {
  const def = (pack.advisors ?? []).find(a => a.id === advisorId);
  if (!def) throw new Error(`unknown advisor: ${advisorId}`);
  state.advisor = { id: def.id, favor: def.initialFavor, stage: def.initialStage };
  state.advisorOffer = [];
}

export function changeAdvisorFavor(state: GameState, delta: number): void {
  if (!state.advisor) return;
  state.advisor.favor = Math.max(0, Math.min(100, state.advisor.favor + delta));
}

export function setAdvisorStage(state: GameState, stage: string): void {
  if (!state.advisor) return;
  state.advisor.stage = stage;
}

/**
 * 本回合可播的导师关系事件(TECH 4.5 的 ③')。
 *
 * 复用 NPC 阶段事件的形状:当前阶段声明了 `eventId` 且 `advanceWhen` 成立就可播,
 * 每轮上限 1。播过的事件由 `triggeredEventIds` 挡住,不会重播。
 */
export function pendingAdvisorEvent(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
): string | undefined {
  const def = advisorDefOf(state, pack);
  if (!def || !state.advisor) return undefined;
  const stage = def.stages[state.advisor.stage];
  if (!stage?.eventId) return undefined;
  if (state.triggeredEventIds.includes(stage.eventId)) return undefined;
  if (!evalCondition(stage.advanceWhen, { state, pack, rng })) return undefined;
  return stage.eventId;
}
