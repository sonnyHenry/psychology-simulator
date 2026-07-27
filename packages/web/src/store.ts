import { create } from 'zustand';
import {
  createEngine,
  randomSeed,
  restoreSave,
  type GameState,
  type PlayerAction,
  type ViewModel,
} from '@psy-sim/core';
import { contentPack } from '@psy-sim/content';
import { clearSave, loadSaveFile, saveGame } from './platform/storage';

const engine = createEngine(contentPack);

interface GameStore {
  game: GameState;
  view: ViewModel;
  hasSave: boolean;
  act: (action: PlayerAction) => void;
  newGame: (seed?: number) => void;
  continueGame: () => void;
  clearSavedGame: () => void;
}

export const useGame = create<GameStore>((set, get) => {
  // 双保险读档:内容版本一致用快照,不一致用 seed+actionLog 重放
  const savedFile = loadSaveFile();
  const restored = savedFile ? restoreSave(engine, savedFile, contentPack.meta.version) : null;
  let actionLog: PlayerAction[] = restored && savedFile ? [...savedFile.actionLog] : [];
  const initial = engine.start();
  return {
    game: initial,
    view: engine.view(initial),
    hasSave: restored !== null && restored.screen !== 'TITLE' && restored.screen !== 'ENDING',
    act: action => {
      // 从标题页开始新的一局时重置操作日志,保证日志始终从 START 起步可重放
      if (get().game.screen === 'TITLE') actionLog = [];
      const next = engine.dispatch(get().game, action);
      actionLog.push(action);
      saveGame(next, actionLog);
      set({ game: next, view: engine.view(next), hasSave: next.screen !== 'ENDING' });
    },
    newGame: seed => {
      const g = engine.start(seed ?? randomSeed());
      actionLog = [];
      clearSave();
      set({ game: g, view: engine.view(g), hasSave: false });
    },
    continueGame: () => {
      if (!restored || restored.screen === 'ENDING') return;
      set({ game: restored, view: engine.view(restored), hasSave: true });
    },
    clearSavedGame: () => {
      clearSave();
      actionLog = [];
      const g = engine.start();
      set({ game: g, view: engine.view(g), hasSave: false });
    },
  };
});
