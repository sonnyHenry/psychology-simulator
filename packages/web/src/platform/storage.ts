import {
  createSaveFile,
  migrateSaveFile,
  type GameState,
  type PlayerAction,
  type SaveFile,
} from '@psy-sim/core';
import { contentPack } from '@psy-sim/content';

const SAVE_KEY = 'psy-sim-2014:save:v1';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadSaveFile(): SaveFile | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSaveFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(snapshot: GameState, actionLog: PlayerAction[]): void {
  if (!canUseStorage()) return;
  try {
    const save = createSaveFile(contentPack.meta.version, snapshot, actionLog);
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can fail in private mode or quota pressure; gameplay should continue.
  }
}

export function clearSave(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
