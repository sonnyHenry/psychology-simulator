import type { ContentPack } from '../types/content';
import type { Inventory, InventoryResult } from '../types/inventory';
import type { GameState } from '../types/state';

export const INVENTORY_STATE_REPAIR = 2;

export function inventoryOf(pack: ContentPack, id: string): Inventory | undefined {
  return (pack.inventories ?? []).find(inventory => inventory.id === id);
}

export function startInventory(state: GameState, pack: ContentPack, inventoryId: string): void {
  const inventory = inventoryOf(pack, inventoryId);
  if (!inventory) throw new Error(`startInventory references unknown inventory: ${inventoryId}`);
  if (inventory.items.length === 0) throw new Error(`inventory has no items: ${inventoryId}`);
  state.pendingInventory = { inventoryId, cursor: 0, answers: [] };
}

function maxScoreOf(inventory: Inventory): number {
  return inventory.items.reduce(
    (sum, item) => sum + Math.max(...item.options.map(option => option.score)),
    0,
  );
}

function resultFor(state: GameState, inventory: Inventory, answers: number[]): InventoryResult {
  const score = answers.reduce((sum, answer) => sum + answer, 0);
  const maxScore = Math.max(1, maxScoreOf(inventory));
  const band = inventory.bands.find(item => score >= item.min && score <= item.max)
    ?? inventory.bands[inventory.bands.length - 1];
  if (!band) throw new Error(`inventory has no score bands: ${inventory.id}`);

  const selfReportedState = inventory.direction === 'distress'
    ? 100 - (score / maxScore) * 100
    : (score / maxScore) * 100;
  const gap = selfReportedState - state.stats.state;
  const line = [...inventory.discrepancy]
    .sort((a, b) => b.minGap - a.minGap)
    .find(item => gap >= item.minGap)
    ?? inventory.discrepancy[inventory.discrepancy.length - 1];
  if (!line) throw new Error(`inventory has no discrepancy lines: ${inventory.id}`);

  return {
    inventoryId: inventory.id,
    year: state.date.year,
    score,
    maxScore,
    bandLabel: band.label,
    bandText: band.text,
    discrepancyText: line.text
      .replace(/\{\{score\}\}/g, String(score))
      .replace(/\{\{state\}\}/g, String(state.stats.state)),
    discrepancyKind: gap >= 18 ? 'defensive' : gap <= -18 ? 'distressed' : 'aligned',
    stateRepair: INVENTORY_STATE_REPAIR,
  };
}

/**
 * 记录一道回答。最后一题答完时立刻计分并给很小的状态修复；结果仍留在同一屏，
 * 等玩家读完后再由引擎清掉 `pendingInventory` 并恢复原事件流程。
 */
export function answerInventory(
  state: GameState,
  pack: ContentPack,
  optionIndex: number,
): InventoryResult | null {
  const pending = state.pendingInventory;
  if (!pending || pending.result) throw new Error('ANSWER_INVENTORY without an active question');
  const inventory = inventoryOf(pack, pending.inventoryId);
  if (!inventory) throw new Error(`pending inventory not found: ${pending.inventoryId}`);
  const item = inventory.items[pending.cursor];
  const option = item?.options[optionIndex];
  if (!item || !option) throw new Error(`invalid inventory option ${optionIndex} at ${pending.cursor}`);

  pending.answers.push(option.score);
  pending.cursor += 1;
  if (pending.cursor < inventory.items.length) return null;

  const result = resultFor(state, inventory, pending.answers);
  pending.result = result;
  state.inventoryResults = [...(state.inventoryResults ?? []), result];
  state.stats.state = Math.min(100, state.stats.state + result.stateRepair);
  state.flags.inventory_completed = true;
  if (result.discrepancyKind !== 'aligned') state.flags.inventory_discrepancy_seen = true;
  return result;
}
