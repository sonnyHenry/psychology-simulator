import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { RivalOp, RivalState } from '../types/social';
import type { Rng } from '../rng/rng';

/**
 * 影子竞争者的年度推进(GAME_DESIGN 13.1 / TECH 4.7.3)。
 *
 * ## 他不跑完整引擎
 *
 * 模拟他的全部人生是浪费:玩家需要的只是**每年一个可比的数字和一句处境**。
 * 所以这里是几十行的简化规则,不是第二个 `engine.ts`。
 *
 * ## 但他必须能被玩家影响
 *
 * `momentum` 由 archetype 定基线,由 `{ rival: { op: 'nudge' } }` 修正。
 * 不能被修正的话他就退化成一条固定难度曲线——**而 13.1 第一条设计约束就是
 * "他的强弱部分取决于你的选择"**。你帮过他、抢过他的一作、在他低谷时说过一句话,
 * 这些都要在他后面十年的数字里留下痕迹。
 *
 * ## 他不是反派
 *
 * `struggling` 那一年是这个机制最重要的产出之一:他也会延毕、也会有一年状态崩了。
 * 那几幕里他从对手变成同类,而那个转折比"他又发了一篇"有分量得多。
 */

/** 每个原型的成长基线。**没有一个是"稳定碾压你"的** */
const BASE_MOMENTUM: Record<string, number> = {
  // 拼命三郎:产出稳,但他消耗的方式最后会显出来
  grinder: 1.0,
  // 运气好的:某一年突然冒出来两篇,别的年份平平
  lucky: 0.8,
  // 会挑题、会挑合作者的:慢热,后期最快
  strategic: 0.85,
  // 一直在挣扎的:他是那个提醒你"这条路本来就很难"的人
  struggling: 0.55,
};

export function baseMomentumFor(archetype: string): number {
  return BASE_MOMENTUM[archetype] ?? 0.8;
}

/**
 * 他从哪一年开始出东西。**本科生不发论文**——你们是 2016 年在实验室认识的,
 * 但那几年他和你一样在贴电极帽。
 *
 * 不设这条线的话他会白拿三四年的产出,而玩家的论文全部来自 2019 年之后的
 * 培养阶段——**对手领先的那几篇是从一个玩家根本没有参赛的赛段里来的**。
 */
const FIRST_PRODUCTIVE_YEAR = 2019;

/**
 * 他今年"发出来"多少。用泊松式的低频掷骰而不是加一个小数——
 * **论文是整数,而且是一阵一阵出来的。** 每年匀速 +0.9 篇的对手看起来像一条曲线,
 * 不像一个人;真实的观感是"他今年一篇没有,明年一下两篇"。
 *
 * ## 这个系数是按玩家的实际产出标定的,不是拍的
 *
 * 学术线玩家一局平均 1.5 篇左右(见 simulate 的学术线统计)。对手必须落在同一个量级:
 * **总赢的对手不构成参照系,总输的对手是一堵墙**(13.1 第 2 条)。
 * 第一版给的是 `momentum * 0.55` × 每年 2 掷,结果他平均 5.14 篇、玩家 0.36 篇——
 * 玩家胜出率 0.5%,那不是竞争者,那是一个嘲讽用的计分板。
 */
const OUTPUT_SCALE = 0.16;

function papersThisYear(rival: RivalState, rng: Rng): number {
  const chance = Math.max(0, Math.min(0.95, rival.momentum * OUTPUT_SCALE));
  let out = 0;
  for (let i = 0; i < 2; i++) if (rng.chance(chance)) out += 1;
  // 运气型:偶尔一年爆一篇额外的
  if (rival.archetype === 'lucky' && rng.chance(0.08)) out += 1;
  return out;
}

/** 状态崩掉的那一年。**每个人都有**,只是有人早有人晚 */
const STRUGGLE_CHANCE = 0.16;

/**
 * 真正创建竞争者。从内容声明的候选里加权抽一个。
 *
 * **同一个存档里他是谁是随机的**:这一局是拼命三郎,下一局可能是那个一直在挣扎的人,
 * 而这两个人后面十年会在同样的五个交汇点上给你完全不同的东西。
 */
export function meetRival(state: GameState, pack: ContentPack, rng: Rng): void {
  if (state.rival) return;
  const candidates = pack.rivalArchetypes ?? [];
  if (candidates.length === 0) return;
  const picked = rng.weightedPick(candidates, def => def.weight ?? 1);
  state.rival = {
    name: picked.name,
    archetype: picked.archetype,
    track: 'academic',
    stage: 'undergrad',
    papers: 0,
    capital: 30,
    momentum: baseMomentumFor(picked.archetype),
    // 刚认识:**你只知道他的名字**。了解要靠打听,或者靠某一幕让你看见他的处境
    visibility: 0,
    encounters: [],
  };
}

/**
 * 竞争者的一年。年度结算时调用一次。
 *
 * 顺序:先判他今年过得怎么样(崩掉的那年产出减半),再推 papers/capital。
 */
export function advanceRivalYear(state: GameState, rng: Rng): void {
  const rival = state.rival;
  if (!rival) return;
  rival.struggling = rng.chance(STRUGGLE_CHANCE);
  const productive = state.date.year >= FIRST_PRODUCTIVE_YEAR;
  const output = rival.struggling || !productive ? 0 : papersThisYear(rival, rng);
  rival.papers += output;
  // 资本跟着产出走,但不完全跟:会来事的人不发论文也在积累
  rival.capital = Math.max(
    0,
    Math.min(100, rival.capital + output * 4 + (rival.archetype === 'strategic' ? 3 : 1)),
  );
}

/** 他领先吗。**这是五个交汇点分流的主条件**(每个交汇点两个版本) */
export function rivalAheadOfPlayer(state: GameState): boolean {
  const rival = state.rival;
  if (!rival) return false;
  return rival.papers > (state.papers ?? []).filter(paper => paper.tier !== 'preprint').length;
}

/** momentum 的钳位。上不封顶的对手不好玩,压到 0 的对手不真实 */
const MIN_MOMENTUM = 0.3;
const MAX_MOMENTUM = 1.6;

export function applyRivalOp(state: GameState, operation: RivalOp): void {
  if (operation.op === 'meet') {
    // 只标记"该抽了"。抽样要 RNG,而 applyEffects 没有——理由同 `{ drawAdvisor }`
    if (!state.rival) state.pendingRivalMeet = true;
    return;
  }
  const rival = state.rival;
  if (!rival) return;
  switch (operation.op) {
    case 'nudge':
      if (operation.momentum !== undefined) {
        rival.momentum = Math.max(
          MIN_MOMENTUM,
          Math.min(MAX_MOMENTUM, rival.momentum + operation.momentum),
        );
      }
      if (operation.papers !== undefined) rival.papers = Math.max(0, rival.papers + operation.papers);
      if (operation.capital !== undefined) {
        rival.capital = Math.max(0, Math.min(100, rival.capital + operation.capital));
      }
      return;
    case 'reveal':
      rival.visibility = Math.max(0, Math.min(3, rival.visibility + (operation.visibility ?? 1)));
      return;
    case 'encounter':
      if (!rival.encounters.includes(operation.id)) rival.encounters.push(operation.id);
      return;
  }
}

/**
 * 他现在的一句处境。**按 `visibility` 分层**——你对他了解多少,决定你看到多细。
 *
 * `visibility` 0 的时候只有"你偶尔听到他的名字";打听过、或者某一幕让你看见了
 * 他的处境之后,才会具体到"他今年一篇都没发"。
 * 这条分层是打听机制在竞争者身上的兑现点。
 */
export function rivalStatusLine(state: GameState): string | null {
  const rival = state.rival;
  if (!rival) return null;
  if (rival.visibility <= 0) return `${rival.name}的名字你偶尔还会听到。`;
  if (rival.visibility === 1) return `${rival.name}还在这一行里,听说做得不错。`;
  const papers = `${rival.name}现在 ${rival.papers} 篇`;
  if (rival.visibility === 2) return `${papers}。`;
  return rival.struggling
    ? `${papers}。今年他一篇都没出来——有人说他状态不太好。`
    : `${papers}。他今年又出了东西。`;
}
