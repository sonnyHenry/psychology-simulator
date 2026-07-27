import type { GameState } from '../types/state';
import type { PlayerAction } from '../types/view';
import type { Engine } from '../engine/engine';

export const CURRENT_SAVE_VERSION = 2;

export interface SaveFile {
  saveVersion: number;
  contentVersion: string;
  savedAt: string;
  seed: number;
  actionLog: PlayerAction[];
  snapshot: GameState;
}

type AnySave = Record<string, unknown>;

// 迁移链:v(n) → v(n+1),旧档逐级升级;缺失迁移函数的版本直接判为不可恢复。
const migrations: Record<number, (save: AnySave) => AnySave> = {
  // v1(仅 snapshot 的网页存档)→ v2:补 seed 与空 actionLog。
  // 空日志无法从头重放,restoreSave 会在内容版本不一致时判为不可恢复(与 v1 行为一致)。
  1: save => {
    const snapshot = save.snapshot as GameState | undefined;
    return {
      ...save,
      saveVersion: 2,
      seed: snapshot?.seed ?? 0,
      actionLog: [],
    };
  },
};

export function migrateSaveFile(raw: unknown): SaveFile | null {
  if (!raw || typeof raw !== 'object') return null;
  let save = raw as AnySave;
  while (
    typeof save.saveVersion === 'number' &&
    save.saveVersion >= 1 &&
    save.saveVersion < CURRENT_SAVE_VERSION
  ) {
    const migrate = migrations[save.saveVersion];
    if (!migrate) return null;
    save = migrate(save);
  }
  if (save.saveVersion !== CURRENT_SAVE_VERSION) return null;
  if (!save.snapshot || typeof save.snapshot !== 'object') return null;
  if (!Array.isArray(save.actionLog)) return null;
  if (typeof save.seed !== 'number' || typeof save.contentVersion !== 'string') return null;
  return save as unknown as SaveFile;
}

export function createSaveFile(
  contentVersion: string,
  snapshot: GameState,
  actionLog: PlayerAction[],
): SaveFile {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    contentVersion,
    savedAt: new Date().toISOString(),
    seed: snapshot.seed,
    actionLog: [...actionLog],
    snapshot,
  };
}

export function replaySave(engine: Engine, save: SaveFile): GameState | null {
  // 日志必须从开局第一步(START)开始才可信;v1 迁移档的空/半截日志在此被拒绝
  if (save.actionLog.length === 0 || save.actionLog[0]?.type !== 'START') return null;
  try {
    let state = engine.start(save.seed);
    for (const action of save.actionLog) {
      state = engine.dispatch(state, action);
    }
    return state;
  } catch {
    // 新内容下动作序列不再合法(事件/选项被删改),交给上层丢档
    return null;
  }
}

/**
 * 双保险读档:内容版本一致直接用快照(快);
 * 不一致则用 seed + actionLog 在当前内容上重放(引擎纯函数,结果确定)。
 */
export function restoreSave(
  engine: Engine,
  save: SaveFile,
  currentContentVersion: string,
): GameState | null {
  if (save.contentVersion === currentContentVersion) return save.snapshot;
  return replaySave(engine, save);
}
