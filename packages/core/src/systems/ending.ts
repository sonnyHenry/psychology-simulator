import type { ContentPack, EndingDef } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';

export function findEnding(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  categories: ReadonlyArray<EndingDef['category']>,
): EndingDef | null {
  const sorted = [...pack.endings]
    .filter(e => categories.includes(e.category))
    .sort((a, b) => a.priority - b.priority);
  const ctx = { state, pack, rng };
  for (const ending of sorted) {
    if (evalCondition(ending.condition, ctx)) return ending;
  }
  return null;
}
