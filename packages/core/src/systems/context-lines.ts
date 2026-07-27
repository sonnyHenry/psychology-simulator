import type { ContentPack, GameEvent } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';

/**
 * 事件正文后的"小回响":优先放条件命中的那一句(它引用玩家自己的前史),
 * 一条都没命中时,从**无条件的兜底句**里随机挑一句。
 *
 * 为什么需要兜底:回响原本全部带条件,条件卡太死时命中率只有个位数
 * (《换季重感冒》300 局只有 5.8% 的对局看得到),写好的差异化文案等于没写。
 * 兜底句必须是"对谁都成立"的泛化句,不能引用任何 flag/前史——引用前史的
 * 句子请老老实实写 condition。
 *
 * 兜底句的选取用 rngState 与事件 id 混出的确定性下标,**不消耗 rng**:
 * `view` 必须是 state 的纯函数,同一个 state 反复渲染要拿到同一句;
 * 混入事件 id 是为了让同一回合里的两个事件不会挑到同一个下标。
 */
export function selectContextLine(
  ev: GameEvent,
  ctx: { state: GameState; pack: ContentPack; rng: Rng },
): { index: number; text: string; fallback: boolean } | undefined {
  const lines = ev.contextLines;
  if (!lines?.length) return undefined;

  for (const [index, line] of lines.entries()) {
    if (!line.condition) continue;
    if (evalCondition(line.condition, ctx)) return { index, text: line.text, fallback: false };
  }

  const fallbackIndexes = lines.flatMap((line, index) => (line.condition ? [] : [index]));
  if (fallbackIndexes.length === 0) return undefined;
  const picked = fallbackIndexes[stableIndex(ctx.state.rngState, ev.id, fallbackIndexes.length)]!;
  return { index: picked, text: lines[picked]!.text, fallback: true };
}

/** FNV-1a 变体:把 (rngState, 事件 id) 混成一个稳定下标 */
function stableIndex(seed: number, key: string, size: number): number {
  let hash = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash % size;
}
