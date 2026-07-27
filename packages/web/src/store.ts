import { create } from 'zustand';
import {
  createEngine,
  devJump,
  randomSeed,
  restoreSave,
  type GameState,
  type PlayerAction,
  type ViewModel,
} from '@psy-sim/core';
import { contentPack, devJumpTargets } from '@psy-sim/content';
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
  /** 开发用一键跳转(见 core 的 devJump)。返回是否到达 */
  devJumpTo: (targetId: string) => boolean;
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
    devJumpTo: targetId => {
      const target = devJumpTargets.find(t => t.id === targetId);
      if (!target) return false;
      // 种子随机:每次跳转是一局新的人生,不然测试永远看同一份档
      const result = devJump(contentPack, target, { seed: randomSeed() });
      if (!result) return false;
      // 快进产出的 actions 就是合法的 actionLog——存档、重放、继续手玩全部照常成立
      actionLog = [...result.actions];
      saveGame(result.state, actionLog);
      set({
        game: result.state,
        view: engine.view(result.state),
        hasSave: result.state.screen !== 'ENDING',
      });
      return true;
    },
  };
});
