import type { Effect } from '../types/dsl';
import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { StatDeltas, StatKey } from '../types/stats';
import { readNumericFlag } from './evaluate';
import { applyProjectOp } from '../systems/project';
import { applyCaseOp } from '../systems/case';
import { changeAdvisorFavor, setAdvisorStage } from '../systems/advisor';
import { applyRivalOp } from '../systems/rival';
import { applyFavorOp } from '../systems/favor';

function clampStat(key: StatKey, value: number): number {
  if (key === 'money') return Math.max(0, Math.round(value));
  return Math.max(0, Math.min(100, Math.round(value)));
}

export interface ApplyResult {
  deltas: StatDeltas;
}

export function applyEffects(effects: Effect[], state: GameState, pack: ContentPack): ApplyResult {
  const deltas: StatDeltas = {};

  for (const effect of effects) {
    if ('stats' in effect) {
      for (const [k, delta] of Object.entries(effect.stats) as [StatKey, number][]) {
        state.stats[k] = clampStat(k, state.stats[k] + delta);
        // deltas 记声明值而非钳制后的实际变化:属性顶到上下限时,结果页仍要展示加减分
        deltas[k] = (deltas[k] ?? 0) + delta;
      }
    } else if ('moneyCost' in effect) {
      const { rate, min = 0, max = Infinity, roundTo } = effect.moneyCost;
      const raw = state.stats.money * rate;
      const bounded = Math.max(min, Math.min(max, raw));
      const rounded = roundTo && roundTo > 0 ? Math.round(bounded / roundTo) * roundTo : Math.round(bounded);
      const actual = Math.max(0, Math.min(state.stats.money, rounded));
      state.stats.money = clampStat('money', state.stats.money - actual);
      deltas.money = (deltas.money ?? 0) - actual;
    } else if ('setStat' in effect) {
      const before = state.stats[effect.setStat];
      const after = clampStat(effect.setStat, effect.value);
      state.stats[effect.setStat] = after;
      deltas[effect.setStat] = (deltas[effect.setStat] ?? 0) + (after - before);
    } else if ('setFlag' in effect) {
      state.flags[effect.setFlag] = effect.value ?? true;
    } else if ('addFlag' in effect) {
      const { key, delta, min = -Infinity, max = Infinity } = effect.addFlag;
      const next = readNumericFlag(state.flags[key]) + delta;
      state.flags[key] = Math.max(min, Math.min(max, next));
    } else if ('project' in effect) {
      applyProjectOp(state, pack, effect.project);
    } else if ('case' in effect) {
      applyCaseOp(state, pack, effect.case);
    } else if ('advisorFavor' in effect) {
      changeAdvisorFavor(state, effect.advisorFavor);
    } else if ('advisorStage' in effect) {
      setAdvisorStage(state, effect.advisorStage);
    } else if ('rival' in effect) {
      applyRivalOp(state, effect.rival);
    } else if ('favor' in effect) {
      // **年份由引擎填。** 内容不该也不需要知道今年是哪年,而人情贬值全靠这个年份
      applyFavorOp(state, state.date.year, effect.favor);
    } else if ('advisorLine' in effect) {
      // 导师面板上的"他上次说的那句话"。没有导师时静默丢弃——
      // 这行字是给面板看的,不是一个会被门控读到的状态。
      if (state.advisor) state.advisor.lastLine = effect.advisorLine;
    } else if ('drawAdvisor' in effect) {
      // 只标记"该抽卡了",真正的抽样在引擎里做——它需要 RNG,而 applyEffects 没有。
      state.pendingAdvisorDraw = effect.drawAdvisor.count;
    } else if ('extendPhase' in effect) {
      // 延毕。累加而不是覆盖:同一个阶段里延两次就是延两次
      state.phaseExtraRounds = (state.phaseExtraRounds ?? 0) + effect.extendPhase.rounds;
    } else if ('grantSlots' in effect) {
      state.grantedSlots = (state.grantedSlots ?? 0) + effect.grantSlots;
    } else if ('npcFavor' in effect) {
      const npc = state.npcs[effect.npcFavor];
      if (npc) npc.favor = Math.max(0, Math.min(100, npc.favor + effect.delta));
    } else if ('npcStage' in effect) {
      const npc = state.npcs[effect.npcStage];
      if (npc) npc.stage = effect.stage;
    } else if ('schedule' in effect) {
      state.scheduled.push({
        eventId: effect.schedule.eventId,
        dueRound: state.roundCounter + effect.schedule.afterRounds,
      });
    } else if ('setCareer' in effect) {
      state.profile.career = effect.setCareer;
    } else if ('jumpToPhase' in effect) {
      state.pendingJumpPhaseId = effect.jumpToPhase;
    } else if ('triggerEnding' in effect) {
      state.forcedEndingId = effect.triggerEnding;
    } else if ('fn' in effect) {
      const fn = pack.fns[effect.fn];
      if (!fn) throw new Error(`DSL effect references unknown fn: ${effect.fn}`);
      fn({ state, args: effect.args });
    } else {
      throw new Error(`Unknown effect shape: ${JSON.stringify(effect)}`);
    }
  }

  return { deltas };
}
