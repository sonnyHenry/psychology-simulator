import type { Condition, Op } from '../types/dsl';
import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { countPapers, countProjects, resolveTarget } from '../systems/project';
import { countCases, resolveCaseTarget } from '../systems/case';

export interface EvalCtx {
  state: GameState;
  pack: ContentPack;
  rng: Rng;
}

function compare(left: number, op: Op, right: number): boolean {
  switch (op) {
    case '>': return left > right;
    case '>=': return left >= right;
    case '<': return left < right;
    case '<=': return left <= right;
    case '==': return left === right;
  }
}

/**
 * 累积量的读取口径,`{ flagNum }` 与 `{ addFlag }` 共用一份,保证读写对称:
 * 缺失 → 0(不必先初始化)· 布尔 → 1/0 · 数字 → 原值 · 其他(字符串)→ 0。
 */
export function readNumericFlag(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return 0;
}

export function evalCondition(cond: Condition | undefined, ctx: EvalCtx): boolean {
  if (!cond) return true;
  const { state } = ctx;

  if ('always' in cond) return true;
  if ('stat' in cond) return compare(state.stats[cond.stat], cond.op, cond.value);
  if ('flag' in cond) {
    const v = state.flags[cond.flag];
    return cond.equals === undefined ? Boolean(v) : v === cond.equals;
  }
  if ('year' in cond) {
    const y = state.date.year;
    if (cond.year.from !== undefined && y < cond.year.from) return false;
    if (cond.year.to !== undefined && y > cond.year.to) return false;
    return true;
  }
  if ('career' in cond) return state.profile.career === cond.career;
  if ('background' in cond) return state.profile.background === cond.background;
  if ('major' in cond) return state.profile.major === cond.major;
  if ('npcFavor' in cond) {
    const npc = state.npcs[cond.npcFavor];
    return npc ? compare(npc.favor, cond.op, cond.value) : false;
  }
  if ('npcStage' in cond) {
    const npc = state.npcs[cond.npcStage];
    return npc ? npc.stage === cond.stage : false;
  }
  if ('historyCount' in cond) {
    const q = cond.historyCount;
    const count = state.history.filter(h => {
      if (h.kind !== 'event') return false;
      if (q.category !== undefined && h.category !== q.category) return false;
      if (q.outcomeTag !== undefined && h.outcomeTag !== q.outcomeTag) return false;
      return true;
    }).length;
    return compare(count, q.op, q.value);
  }
  if ('flagNum' in cond) {
    return compare(readNumericFlag(state.flags[cond.flagNum.key]), cond.flagNum.op, cond.flagNum.value);
  }
  if ('projectCount' in cond) {
    const { op, value, ...query } = cond.projectCount;
    return compare(countProjects(state, query), op, value);
  }
  if ('paperCount' in cond) {
    const { op, value, ...query } = cond.paperCount;
    return compare(countPapers(state, query), op, value);
  }
  if ('projectRoll' in cond) {
    // 读当前事件绑定的那个课题的掷骰结果。没有绑定或没掷过 = 不匹配。
    return resolveTarget(state)?.lastRoll === cond.projectRoll;
  }
  if ('caseCount' in cond) {
    const { op, value, ...query } = cond.caseCount;
    return compare(countCases(state, query), op, value);
  }
  if ('caseTrend' in cond) {
    // 读当前事件绑定的那个个案的联盟走向。没有绑定或没掷过 = 不匹配。
    return resolveCaseTarget(state)?.lastTrend === cond.caseTrend;
  }
  if ('advisor' in cond) {
    const advisor = state.advisor;
    if (!advisor) return false;
    const query = cond.advisor;
    if (query.stage !== undefined && advisor.stage !== query.stage) return false;
    if (query.favor !== undefined && !compare(advisor.favor, query.favor.op, query.favor.value)) {
      return false;
    }
    if (query.archetype !== undefined) {
      const def = ctx.pack.advisors?.find(a => a.id === advisor.id);
      if (def?.archetype !== query.archetype) return false;
    }
    return true;
  }
  if ('chance' in cond) return ctx.rng.chance(cond.chance);
  if ('all' in cond) return cond.all.every(c => evalCondition(c, ctx));
  if ('any' in cond) return cond.any.some(c => evalCondition(c, ctx));
  if ('not' in cond) return !evalCondition(cond.not, ctx);
  if ('fn' in cond) {
    const fn = ctx.pack.fns[cond.fn];
    if (!fn) throw new Error(`DSL condition references unknown fn: ${cond.fn}`);
    return Boolean(fn({ state }));
  }
  throw new Error(`Unknown condition shape: ${JSON.stringify(cond)}`);
}
