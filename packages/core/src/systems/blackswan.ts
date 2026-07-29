import type { ContentPack, GameEvent, PhaseConfig } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';

/**
 * 黑天鹅不占普通事件槽，也不读方法/资本。种子只决定本局配额是 1 还是 2；
 * 第一次落在职业早期，第二次落在职业后期。若当前池没有候选，后续回合继续尝试。
 */
export function pickBlackSwan(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  phase: Extract<PhaseConfig, { kind: 'rounds' }>,
  alreadyPicked: ReadonlySet<string>,
): GameEvent | null {
  const quota = state.blackSwanQuota ?? ((state.seed & 1) === 0 ? 1 : 2);
  const count = state.blackSwanCount ?? 0;
  if (count >= quota) return null;
  // 第一只统一放在 2020 后：有些博士毕业后直接离开，整局会在 2023 收束，
  // 如果单配额局等到 2024 才抽，它们会一只都见不到。第二只仍留到职业后期。
  const dueYear = count === 0 ? 2020 : 2028;
  if (state.date.year < dueYear) return null;

  const ctx = { state, pack, rng };
  const candidates = pack.events.filter(event =>
    event.category === 'blackswan'
    && event.pools.some(pool => phase.pools.includes(pool))
    && !alreadyPicked.has(event.id)
    && !state.triggeredEventIds.includes(event.id)
    && evalCondition(event.trigger, ctx),
  );
  if (candidates.length === 0) return null;
  const chosen = rng.weightedPick(candidates, event => event.weight ?? 1);
  state.blackSwanQuota = quota;
  return chosen;
}
