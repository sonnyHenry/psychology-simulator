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

/**
 * 分配项 id 约定:**寻求指导**。`systems/advisor.ts` 按 id 读它,内容侧必须用这个 id。
 * (与个案那三个 id 同一条约定:改名等于把机制掐断,而且不报错。)
 */
export const ALLOC_ADVISOR_CONSULT_ID = 'alloc_advisor_consult';

/**
 * 「寻求指导」的结果 flag。引擎写,内容读——每个 `consultResponses` 条目对应一个事件,
 * 事件的 trigger 就是 `{ flag: 'advisor_consult_result', equals: '<responseId>' }`。
 */
export const ADVISOR_CONSULT_FLAG = 'advisor_consult_result';

/**
 * 掷这一年「寻求指导」的结果(M4.6,GAME_DESIGN 七节)。
 *
 * **骰子由引擎掷,故事由内容讲**——和课题推进、个案走向同一条纪律。
 * 在分配提交之后立刻掷,是因为工作台是回合开场屏:掷完写下的 flag 赶得上
 * **当年**的事件抽取。(M2 那个 bug 的教训:投入写下的 flag 如果赶不上当年抽事件,
 * 整个机制看起来就"没什么用",而且不报错。)
 *
 * 没投这一格、或者没有导师,就把上一年的结果清掉——否则那个事件会年年重播。
 */
export function rollAdvisorConsult(state: GameState, pack: ContentPack, rng: Rng): void {
  const invested = (state.allocation?.picks ?? []).some(p => p === ALLOC_ADVISOR_CONSULT_ID);
  const def = advisorDefOf(state, pack);
  const responses = def?.consultResponses ?? [];
  if (!invested || responses.length === 0) {
    delete state.flags[ADVISOR_CONSULT_FLAG];
    return;
  }
  const chosen = rng.weightedPick(responses, r => r.weight ?? 1);
  state.flags[ADVISOR_CONSULT_FLAG] = chosen.id;
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
