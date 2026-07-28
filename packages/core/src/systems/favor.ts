import type { GameState } from '../types/state';
import type { Favor, FavorOp } from '../types/social';

/**
 * 人情账(GAME_DESIGN 13.2 / TECH 4.7.3)。
 *
 * 好感度那一个数字太薄了。这一行真实的运作方式是**具体的一件件事**:
 * 你替师兄跑了 40 个被试、师姐把她的被试池分给你、有人在会上替你说过一句话。
 *
 * 两条让它有嚼头的规则,都在这个文件里:
 *
 * 1. **人情会贬值。** 五年前的恩情兑现不了一封今年的推荐信——这逼玩家想"什么时候用"。
 * 2. **欠太多本身是压力。** 净欠额直接吃状态,于是"接不接这个活"从数值题变成社会题:
 *    接了有资本,但你又欠了一笔。
 */

/** 每过一年掉多少分量 */
const DECAY_PER_YEAR = 0.15;
/**
 * 贬值的地板。**不能归零**——十年前那件事的分量会变得很小,但它没有消失,
 * 而"它没有消失"正是人情这件事最真实的部分。
 */
const MIN_FACTOR = 0.2;

/**
 * 一笔人情**现在**值多少。所有读取一律走这里,不许读原始 `weight`——
 * 那等于把"什么时候用"这个决策抹掉。
 */
export function effectiveWeight(favor: Favor, currentYear: number): number {
  if (favor.settled) return 0;
  const age = Math.max(0, currentYear - favor.year);
  return favor.weight * Math.max(MIN_FACTOR, 1 - DECAY_PER_YEAR * age);
}

/** 某个方向的账面总额(贬值后)。`who` 省略 = 所有人 */
export function favorTotal(
  state: GameState,
  currentYear: number,
  query: { who?: string; direction?: Favor['direction'] } = {},
): number {
  let sum = 0;
  for (const favor of state.favors ?? []) {
    if (favor.settled) continue;
    if (query.who !== undefined && favor.who !== query.who) continue;
    if (query.direction !== undefined && favor.direction !== query.direction) continue;
    sum += effectiveWeight(favor, currentYear);
  }
  return sum;
}

/** 净额:他欠我 − 我欠他。正数 = 你手上有牌;负数 = 你欠着 */
export function favorBalance(state: GameState, currentYear: number, who?: string): number {
  return (
    favorTotal(state, currentYear, { ...(who ? { who } : {}), direction: 'owed' }) -
    favorTotal(state, currentYear, { ...(who ? { who } : {}), direction: 'owing' })
  );
}

/**
 * 净欠额超过这条线就开始吃状态。
 *
 * 阈值不能低:欠一两笔是这一行的常态,不该有惩罚。要到**你已经欠了三四个人、
 * 而且都是大人情**的时候,那种"见了谁都得先笑一下"的压力才成立。
 */
export const OWING_PRESSURE_BAR = 6;
/** 超过阈值之后,每多欠一分掉多少状态 */
const STATE_HIT_PER_POINT = 1.2;
/** 一年最多因此掉多少。它是压力,不是死刑 */
const MAX_STATE_HIT = 8;

/**
 * 年度结算的净欠额惩罚。返回实际扣掉的状态(0 表示没触发),供年度回顾页复述。
 *
 * **这一笔必须在回顾页上说出来**,否则玩家只会看到状态莫名其妙掉了几点——
 * 一个说不出理由的惩罚等于一个 bug。
 */
export function settleOwingPressure(state: GameState, currentYear: number): number {
  const owing = favorTotal(state, currentYear, { direction: 'owing' });
  const owed = favorTotal(state, currentYear, { direction: 'owed' });
  const net = owing - owed;
  if (net <= OWING_PRESSURE_BAR) return 0;
  const hit = Math.min(MAX_STATE_HIT, Math.round((net - OWING_PRESSURE_BAR) * STATE_HIT_PER_POINT));
  if (hit <= 0) return 0;
  state.stats.state = Math.max(0, state.stats.state - hit);
  return hit;
}

/**
 * 应用一次人情操作。
 *
 * `add` 的 `year` 由引擎填当前年份——**内容不该也不需要知道今年是哪年**,
 * 而贬值全靠这个年份,写错了整条机制就歪了。
 */
export function applyFavorOp(state: GameState, currentYear: number, operation: FavorOp): void {
  state.favors = state.favors ?? [];
  if (operation.op === 'add') {
    state.favors.push({
      who: operation.who,
      direction: operation.direction,
      weight: operation.weight,
      reason: operation.reason,
      year: currentYear,
    });
    return;
  }
  // settle:按**贬值后**的分量从高到低结掉,结不满就结到没有为止。
  // 人情不够用是常态,不是错误——所以这里不报错、不回滚。
  let budget = operation.weight ?? Infinity;
  const candidates = (state.favors ?? [])
    .filter(favor => {
      if (favor.settled) return false;
      if (operation.who !== undefined && favor.who !== operation.who) return false;
      if (operation.direction !== undefined && favor.direction !== operation.direction) return false;
      return true;
    })
    .sort((a, b) => effectiveWeight(b, currentYear) - effectiveWeight(a, currentYear));
  for (const favor of candidates) {
    if (budget <= 0) break;
    // **先算分量再标记。** 反过来写的话 `effectiveWeight` 会读到已结清的那一笔、
    // 返回 0,于是预算永远不减——一次 settle 会把这个方向上的账全部清空。
    // (单测抓到的:结 3 分的一笔,结果把 4 分和 1 分两笔都结了。)
    budget -= effectiveWeight(favor, currentYear);
    favor.settled = true;
  }
}

/** 未结清的人情,给年度回顾页和工作台用。已结清的不列——那是历史,不是账 */
export function openFavors(state: GameState): Favor[] {
  return (state.favors ?? []).filter(favor => !favor.settled);
}
