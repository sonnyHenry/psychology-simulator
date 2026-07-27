import type { ContentPack, GameEvent, LifeGoal, PhaseConfig, TraitCard, TraitEvolution } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';
import {
  activeProjects,
  advanceAttempts,
  investedSlotsOn,
  MAX_ADVANCES_PER_YEAR,
  stageSuccessChance,
} from '../systems/project';
import { pendingAdvisorEvent } from '../systems/advisor';

// ---------- 导演式选择器(storyteller) ----------
// 只调整非 mandatory 事件进入随机槽位的相对概率;强制/NPC/schedule 事件不受影响。
// 所有乘数都有下限钳位,任何事件的权重不会被压成 0,n=10000 覆盖门禁依然成立。

/** 状态低于此值视为"低谷",导演倾向给喘息(正情绪事件加权) */
const LOW_STATE = 35;
/** 状态高于此值视为"顺风",导演倾向注入压力(负情绪事件加权) */
const HIGH_STATE = 75;
/** 同一年已排入同类事件时的降权 */
const SAME_YEAR_CATEGORY_PENALTY = 0.35;
/** 近两年同类事件出现 >=2 次时的冷却降权 */
const RECENT_CATEGORY_PENALTY = 0.6;
/** 导演乘数钳位区间,保证不会把事件压到抽不到 */
const MULTIPLIER_FLOOR = 0.15;
const MULTIPLIER_CEIL = 4;
/** 每轮最多抽取的公共随机池事件数,避免多周目反复看到同一批日常公共事件 */
const MAX_RANDOM_POOL_EVENTS_PER_ROUND = 1;
/** 每轮最多展示的 NPC 阶段事件数,避免同一局固定 NPC 线铺满全年 */
const MAX_NPC_STAGE_EVENTS_PER_ROUND = 1;
/**
 * 每轮最多弹出的**课题管线**事件数(TECH 4.5)。
 *
 * 一个手上三个课题的博士生,如果每个课题都弹一个阶段事件,再加时代节点和导师节点,
 * 单回合会弹出八到十个事件,节奏直接崩掉。超出的课题本轮只做**静默阶段推进**,
 * 在年度回顾页用一行交代("还卡在收数据")。
 */
const MAX_PIPELINE_EVENTS_PER_ROUND = 3;

const valenceCache = new WeakMap<GameEvent, number>();

/**
 * 事件的"情绪期望":对全部选项按 outcome 权重平均的名义 state 变化。
 * 从既有内容自动推导,不需要给 147 个事件人工打情绪标签。
 */
export function eventStateValence(ev: GameEvent): number {
  const cached = valenceCache.get(ev);
  if (cached !== undefined) return cached;
  let sum = 0;
  let choiceCount = 0;
  for (const choice of ev.choices) {
    let weighted = 0;
    let totalWeight = 0;
    for (const outcome of choice.outcomes) {
      let delta = 0;
      for (const eff of outcome.effects) {
        if ('stats' in eff && typeof eff.stats.state === 'number') delta += eff.stats.state;
      }
      weighted += delta * outcome.weight;
      totalWeight += outcome.weight;
    }
    if (totalWeight > 0) {
      sum += weighted / totalWeight;
      choiceCount += 1;
    }
  }
  const valence = choiceCount > 0 ? sum / choiceCount : 0;
  valenceCache.set(ev, valence);
  return valence;
}

function recentCategoryCounts(state: GameState): Map<string, number> {
  const counts = new Map<string, number>();
  const fromYear = state.date.year - 1;
  for (const entry of state.history) {
    if (entry.kind !== 'event' || !entry.category || entry.year < fromYear) continue;
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }
  return counts;
}

function directorMultiplier(
  ev: GameEvent,
  state: GameState,
  activeTraits: TraitCard[],
  activeEvolutions: TraitEvolution[],
  activeGoal: LifeGoal | undefined,
  pickedCategories: ReadonlySet<string>,
  recentCounts: ReadonlyMap<string, number>,
): number {
  let m = 1;
  if (ev.category) {
    if (pickedCategories.has(ev.category)) m *= SAME_YEAR_CATEGORY_PENALTY;
    if ((recentCounts.get(ev.category) ?? 0) >= 2) m *= RECENT_CATEGORY_PENALTY;
    for (const trait of activeTraits) {
      const bias = trait.poolBias?.[ev.category];
      if (bias !== undefined) m *= bias;
    }
    for (const evolution of activeEvolutions) {
      const bias = evolution.poolBias?.[ev.category];
      if (bias !== undefined) m *= bias;
    }
    const goalBias = activeGoal?.poolBias?.[ev.category];
    if (goalBias !== undefined) m *= goalBias;
  }
  // 节奏调节:低谷给喘息、顺风上压力(阈值间的中段不干预)
  const valence = eventStateValence(ev);
  if (state.stats.state <= LOW_STATE) {
    if (valence > 0.5) m *= 1.8;
    else if (valence < -0.5) m *= 0.55;
  } else if (state.stats.state >= HIGH_STATE) {
    if (valence < -0.5) m *= 1.5;
    else if (valence > 0.5) m *= 0.75;
  }
  return Math.min(MULTIPLIER_CEIL, Math.max(MULTIPLIER_FLOOR, m));
}

export function pickRoundEvents(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  phase: Extract<PhaseConfig, { kind: 'rounds' }>,
): string[] {
  const picked: string[] = [];

  const due = state.scheduled.filter(s => s.dueRound <= state.roundCounter);
  state.scheduled = state.scheduled.filter(s => s.dueRound > state.roundCounter);
  for (const d of due) picked.push(d.eventId);

  const ctx = { state, pack, rng };
  const isEligible = (ev: GameEvent): boolean => {
    // 管线阶段事件由 ②' 单独挑,不进普通池
    if (ev.projectStage !== undefined) return false;
    if (!ev.pools.some(p => phase.pools.includes(p))) return false;
    if (ev.once !== false && state.triggeredEventIds.includes(ev.id)) return false;
    if (picked.includes(ev.id)) return false;
    return evalCondition(ev.trigger, ctx);
  };

  // variantGroup = 同一个节点的不同版本,一局只播一个。
  // 变体的 trigger 从单一年份放宽成年份窗口(见 content 的 spreadYears)之后,
  // 没被选中的同组变体会在后面的年份重新变得 eligible,必须显式挡掉。
  const eventsById = new Map(pack.events.map(ev => [ev.id, ev]));
  const firedGroups = new Set<string>();
  for (const id of state.triggeredEventIds) {
    const group = eventsById.get(id)?.variantGroup;
    if (group) firedGroups.add(group);
  }

  const mandatoryGroups = new Map<string, GameEvent[]>();
  for (const ev of pack.events) {
    if (!ev.mandatory || !isEligible(ev)) continue;
    if (!ev.variantGroup) {
      picked.push(ev.id);
      continue;
    }
    if (firedGroups.has(ev.variantGroup)) continue;
    const group = mandatoryGroups.get(ev.variantGroup) ?? [];
    group.push(ev);
    mandatoryGroups.set(ev.variantGroup, group);
  }
  for (const group of mandatoryGroups.values()) {
    const chosen = rng.weightedPick(group, ev => ev.weight ?? 1);
    if (!picked.includes(chosen.id)) picked.push(chosen.id);
  }

  // ②' 课题管线阶段事件(TECH 4.5)。不占 `eventSlots` 名额。
  //
  // **本轮被投入过精力的课题优先。** 这一条同时解决两件事:节奏(总量有上限)
  // 和手感("你投了精力的那个课题才有戏")。一个你今年根本没碰的课题,
  // 本来也不该在年底给你一个戏剧性的转折。
  state.eventProjects = {};
  const pipelineOrder = [...activeProjects(state)].sort(
    (a, b) => investedSlotsOn(state, b.id) - investedSlotsOn(state, a.id),
  );
  let pipelineSlotsLeft = MAX_PIPELINE_EVENTS_PER_ROUND;
  for (const project of pipelineOrder) {
    // **骰子先掷,再挑文案。** 今年掷几次由投入格数决定;成功几次就是今年推进几站,
    // 由年度结算统一兑现(见 engine 的 settleProjectAdvances)。
    // 阶段事件只负责讲这一年的故事,不负责推进——这样"高方法的人更快但同样会做废"
    // 才是系统性的,而不是某个 outcome 权重的副产品。
    const attempts = advanceAttempts(state, project);
    const chance = stageSuccessChance(state, pack, project);
    let advances = 0;
    for (let i = 0; i < attempts; i++) if (rng.chance(chance)) advances += 1;
    // 一年最多推进几站:课题有一个再多努力也压不掉的最短孕期
    project.lastAdvances = Math.min(advances, MAX_ADVANCES_PER_YEAR);
    project.lastRoll = advances > 0 ? 'ok' : 'setback';
    if (pipelineSlotsLeft <= 0) continue;
    const candidates = pack.events.filter(ev => {
      if (ev.projectStage !== project.stage) return false;
      if (ev.projectDomains && !ev.projectDomains.includes(project.domain)) return false;
      if (picked.includes(ev.id)) return false;
      if (ev.once !== false && state.triggeredEventIds.includes(ev.id)) return false;
      return evalCondition(ev.trigger, ctx);
    });
    if (candidates.length === 0) continue;
    const chosen = rng.weightedPick(candidates, ev => ev.weight ?? 1);
    picked.push(chosen.id);
    state.eventProjects[chosen.id] = project.id;
    pipelineSlotsLeft -= 1;
  }

  // ③' 导师关系阶段事件。每轮上限 1,复用 NPC 那套"当前阶段声明了 eventId 就播"的形状。
  const advisorEventId = pendingAdvisorEvent(state, pack, rng);
  if (advisorEventId && !picked.includes(advisorEventId)) picked.push(advisorEventId);

  // NPC 阶段事件不占普通槽位,但每轮限量播放。
  // 同年撞车的事件进入 pendingNpcEvents,后续回合继续播放,避免错过单年窗口后整条人物线卡死。
  const npcDefsById = new Map(pack.npcs.map(def => [def.id, def]));
  const pendingNpcEvents = (state.pendingNpcEvents ?? []).filter(pending => {
    const def = npcDefsById.get(pending.npcId);
    const npc = state.npcs[pending.npcId];
    const stage = npc && def?.stages[npc.stage];
    return (
      stage?.eventId === pending.eventId &&
      !picked.includes(pending.eventId) &&
      !state.triggeredEventIds.includes(pending.eventId)
    );
  });
  state.pendingNpcEvents = [];

  let npcSlotsLeft = MAX_NPC_STAGE_EVENTS_PER_ROUND;
  while (npcSlotsLeft > 0 && pendingNpcEvents.length > 0) {
    const pending = pendingNpcEvents.shift()!;
    picked.push(pending.eventId);
    npcSlotsLeft -= 1;
  }
  state.pendingNpcEvents.push(...pendingNpcEvents);

  const npcCandidates: { npcId: string; eventId: string; weight: number }[] = [];
  for (const def of pack.npcs) {
    const npc = state.npcs[def.id];
    if (!npc) continue;
    const stage = def.stages[npc.stage];
    if (!stage?.eventId || !evalCondition(stage.advanceWhen, ctx)) continue;
    if (picked.includes(stage.eventId)) continue;
    if (state.triggeredEventIds.includes(stage.eventId)) continue;
    if (state.pendingNpcEvents.some(pending => pending.eventId === stage.eventId)) continue;
    npcCandidates.push({ npcId: def.id, eventId: stage.eventId, weight: 1 + npc.favor / 100 });
  }
  while (npcSlotsLeft > 0 && npcCandidates.length > 0) {
    const chosen = rng.weightedPick(npcCandidates, c => c.weight);
    picked.push(chosen.eventId);
    npcCandidates.splice(npcCandidates.indexOf(chosen), 1);
    npcSlotsLeft -= 1;
  }
  state.pendingNpcEvents.push(
    ...npcCandidates.map(candidate => ({ npcId: candidate.npcId, eventId: candidate.eventId })),
  );

  // 随机槽位:导演式加权抽取(基础 weight × 类别冷却 × 特质偏好 × 状态节奏)
  const activeTraits = pack.traits.filter(t => Boolean(state.flags[t.id]));
  const activeEvolutions = pack.traitEvolutions.filter(evolution => Boolean(state.flags[evolution.id]));
  const activeGoal = pack.lifeGoals.find(goal => goal.id === state.flags.life_goal);
  const recentCounts = recentCategoryCounts(state);
  const pickedCategories = new Set<string>();
  let randomPoolPicked = 0;
  for (const id of picked) {
    const ev = eventsById.get(id);
    const cat = ev?.category;
    if (cat) pickedCategories.add(cat);
    if (ev?.pools.includes('random')) randomPoolPicked += 1;
  }

  while (picked.length < phase.eventSlots) {
    const candidates = pack.events.filter(ev => {
      if (ev.mandatory || !isEligible(ev)) return false;
      if (randomPoolPicked >= MAX_RANDOM_POOL_EVENTS_PER_ROUND && ev.pools.includes('random')) {
        return false;
      }
      return true;
    });
    if (candidates.length === 0) break;
    const chosen = rng.weightedPick(
      candidates,
      ev =>
        (ev.weight ?? 1) *
        directorMultiplier(ev, state, activeTraits, activeEvolutions, activeGoal, pickedCategories, recentCounts),
    );
    picked.push(chosen.id);
    if (chosen.category) pickedCategories.add(chosen.category);
    if (chosen.pools.includes('random')) randomPoolPicked += 1;
  }

  // 同回合内按 order 稳定排序(默认 0),让"毕业散伙饭"这类年末事件排在最后
  const orderOf = new Map(pack.events.map(ev => [ev.id, ev.order ?? 0]));
  return picked
    .map((id, index) => ({ id, index }))
    .sort((a, b) => (orderOf.get(a.id) ?? 0) - (orderOf.get(b.id) ?? 0) || a.index - b.index)
    .map(entry => entry.id);
}
