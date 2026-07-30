import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { RumorDef } from '../types/social';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';

/**
 * 情报与打听(GAME_DESIGN 13.3 / TECH 4.7.3)。
 *
 * 学术圈第一痛点是**信息不对称**:导师真实为人、这个方向是不是快塌了、
 * 这个岗位的坑在哪。没有这个机制,玩家做重大选择就只是看数值猜。
 *
 * ## 这一层唯一要机械守住的事:`accurate` 不许出去
 *
 * 玩家看到的永远是"某人说了一句话 + 一句让人不安的括注",可靠度只能自己推断。
 * 这个文件里**没有任何函数返回 `accurate`**,`askableRumors` 的出参类型也刻意
 * 不含它(validate 规则 19 静态检查这条)。
 *
 * ## 括注永远不评价可靠性
 *
 * 括注给的是**一个事实**——她哪年毕业的、他没说为什么走。
 * 一旦括注开始说"这个消息可能不准",玩家就不用自己判断了,而"自己判断"就是全部内容。
 *
 * ## 玩家会自己学会"打听三个人取交集"
 *
 * 这正是现实中大家的做法。机制不教,玩家自己会——所以同一个 topic 下要有
 * 好几条口径不同的消息,而它们的真伪配比由 validate 规则 18 守在 40%–70%。
 */

/** 每回合能打听几次。**打听要花代价,所以"打听什么"本身是一次决策** */
export const MAX_ASKS_PER_ROUND = 2;

/**
 * 一条可以摆到玩家面前的情报。**注意这个类型里没有 `accurate`**——
 * 它是 `RumorDef` 的一个刻意残缺的投影,残缺的那一块就是 13.3 的支点。
 */
export interface AskableRumor {
  id: string;
  topic: string;
  source: string;
}

/** 玩家听过没有 */
export function hasHeard(state: GameState, defId: string): boolean {
  return (state.rumors ?? []).some(rumor => rumor.defId === defId);
}

/** 本回合还能不能打听 */
export function asksLeft(state: GameState): number {
  return Math.max(0, MAX_ASKS_PER_ROUND - (state.asksThisRound ?? 0));
}

/**
 * 当前这一屏能打听的东西。`topics` 由调用方按屏给出
 * (抽卡屏给候选导师、院校清单给院校、工作台给手上的课题地基)。
 *
 * 听过的不再列出来——**同一个人不会把同一句话说两遍**,而且重复的选项会让
 * "打听三个人取交集"退化成刷新。
 */
export function askableRumors(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  topics: string[],
): AskableRumor[] {
  const ctx = { state, pack, rng };
  return (pack.rumors ?? [])
    .filter(def => topics.includes(def.topic))
    .filter(def => !hasHeard(state, def.id))
    .filter(def => evalCondition(def.availableWhen, ctx))
    .map(def => ({ id: def.id, topic: def.topic, source: def.source }));
}

/**
 * 打听一条。返回那句话和括注——**仍然不返回 `accurate`**。
 *
 * 记账在 `state.rumors` 里,内容侧用 `{ heardRumor }` 读"听到过没有"。
 * 一条假消息的后果不是这里判的,是它引导玩家做了一个决定之后由那个决定判的——
 * **这正是"信息不给数值优势,只减少方差"的实现方式**。
 */
export function askRumor(
  state: GameState,
  pack: ContentPack,
  defId: string,
): { text: string; caveat: string; source: string } | null {
  const def = (pack.rumors ?? []).find(rumor => rumor.id === defId);
  if (!def) return null;
  state.rumors = [...(state.rumors ?? []), { defId: def.id, year: state.date.year }];
  state.asksThisRound = (state.asksThisRound ?? 0) + 1;
  state.flags.asked_around_once = true;
  state.flags.rumors_heard = Math.min(20, Number(state.flags.rumors_heard ?? 0) + 1);
  return { text: def.text, caveat: def.caveat, source: def.source };
}

/**
 * 这条情报**说对了没有**。只给引擎和 simulate 的统计用,**不给 ViewModel**。
 *
 * 存在的理由只有一个:门禁"假消息误导率 15%–35%"要能量出来。
 * 量不出来的话,真伪配比这件事就只能靠内容作者自觉——而自觉是会漂的。
 */
export function rumorAccuracyStats(
  state: GameState,
  pack: ContentPack,
): { heard: number; inaccurate: number } {
  let heard = 0;
  let inaccurate = 0;
  for (const rumor of state.rumors ?? []) {
    const def = (pack.rumors ?? []).find(d => d.id === rumor.defId);
    if (!def) continue;
    heard += 1;
    if (!def.accurate) inaccurate += 1;
  }
  return { heard, inaccurate };
}

/** 按 topic 数真伪配比,给 validate 规则 18 用 */
export function accuracyRatioByTopic(pack: ContentPack): Map<string, { total: number; accurate: number }> {
  const byTopic = new Map<string, { total: number; accurate: number }>();
  for (const def of pack.rumors ?? []) {
    const row = byTopic.get(def.topic) ?? { total: 0, accurate: 0 };
    row.total += 1;
    if (def.accurate) row.accurate += 1;
    byTopic.set(def.topic, row);
  }
  return byTopic;
}

export type { RumorDef };
