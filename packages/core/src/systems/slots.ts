import type { ContentPack, GameEvent, NarrativeSlot, PhaseConfig } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';

export interface FilledNarrativeSlot {
  slot: NarrativeSlot;
  events: GameEvent[];
}

/**
 * 填本回合命中的功能位。只有真的抽到至少一幕才记 filled，避免条件暂时不满足时
 * 把整个窗口提前关掉。候选仍走自身的 pool、trigger 与 once 约束。
 */
export function fillNarrativeSlots(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  phase: Extract<PhaseConfig, { kind: 'rounds' }>,
  alreadyPicked: ReadonlySet<string>,
): FilledNarrativeSlot[] {
  const eventsById = new Map(pack.events.map(event => [event.id, event]));
  const filled = new Set(state.filledSlots ?? []);
  const selected: FilledNarrativeSlot[] = [];

  for (const slot of pack.narrativeSlots ?? []) {
    if (slot.phaseId !== phase.id || filled.has(slot.id)) continue;
    const [from, to] = slot.roundWindow;
    if (state.roundIndex < from || state.roundIndex > to) continue;

    const candidates = slot.candidates
      .map(id => eventsById.get(id))
      .filter((event): event is GameEvent => Boolean(event))
      .filter(event => {
        if (alreadyPicked.has(event.id)) return false;
        if (!event.pools.some(pool => phase.pools.includes(pool))) return false;
        if (event.once !== false && state.triggeredEventIds.includes(event.id)) return false;
        return evalCondition(event.trigger, { state, pack, rng });
      });
    if (candidates.length === 0) continue;

    const events: GameEvent[] = [];
    const pool = [...candidates];
    while (events.length < slot.fill && pool.length > 0) {
      const event = rng.weightedPick(pool, candidate => candidate.weight ?? 1);
      events.push(event);
      pool.splice(pool.indexOf(event), 1);
    }
    if (events.length > 0) selected.push({ slot, events });
  }
  return selected;
}
