/**
 * 量表自评只服务叙事，不提供诊断或评估。
 *
 * `direction` 让核心层能把不同量表统一换算成“玩家自报的状态”：
 * distress 分越高状态越差；wellbeing 分越高状态越好。
 */
export interface Inventory {
  id: string;
  name: string;
  disclaimer: string;
  direction: 'distress' | 'wellbeing';
  items: {
    text: string;
    options: { text: string; score: number }[];
  }[];
  bands: { min: number; max: number; label: string; text: string }[];
  /** 按 minGap 从大到小匹配；gap = 自报状态 − 游戏中的实际状态 */
  discrepancy: { minGap: number; text: string }[];
}

export interface InventoryResult {
  inventoryId: string;
  year: number;
  score: number;
  maxScore: number;
  bandLabel: string;
  bandText: string;
  discrepancyText: string;
  /** defensive = 自报明显好于状态；distressed = 自报明显差于状态 */
  discrepancyKind: 'defensive' | 'aligned' | 'distressed';
  stateRepair: number;
}

export interface PendingInventory {
  inventoryId: string;
  cursor: number;
  answers: number[];
  result?: InventoryResult;
}
