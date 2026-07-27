import { readFileSync } from 'node:fs';
import type { Condition, ContentPack, Effect } from '@psy-sim/core';
import { contentPack as realContentPack } from '@psy-sim/content';

/**
 * 正常运行校验真内容包;`PSY_VALIDATE_FIXTURE` 指向一个 JSON 化的内容包时校验那个夹具。
 *
 * 这个开关只服务一件事:`verify-validate.ts` 用它给**每条规则喂一个反例**,证明规则真的会红。
 * 470+ 事件规模下 validate 是唯一的保险,而"从来不报错的检查"和"没有检查"是一回事——
 * 前作那条 `NPC_TAG_PREFIXES` 检查 fork 之后就一直在空转,没人发现。
 *
 * 用环境变量换掉一个 import 绑定,是为了不把这 700 行缩进到一个函数里:
 * 保持逐行结构一致,前作的规则补丁才还能直接对照移植(见 FORK.md 纪律第 3 条)。
 */
const fixturePath = process.env.PSY_VALIDATE_FIXTURE;
const contentPack: ContentPack = fixturePath
  ? (JSON.parse(readFileSync(fixturePath, 'utf-8')) as ContentPack)
  : realContentPack;

interface Issue {
  level: 'error' | 'warn';
  message: string;
}

const issues: Issue[] = [];
const MAX_FIXED_MONEY_DEBIT = 10000;
const BOUNDED_STATS = new Set(['method', 'state', 'capital', 'clinical']);

function error(message: string): void {
  issues.push({ level: 'error', message });
}

function warn(message: string): void {
  issues.push({ level: 'warn', message });
}

function checkUnique(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) error(`${label} id duplicated: ${id}`);
    seen.add(id);
  }
}

function visitCondition(cond: Condition | undefined, visit: (cond: Condition) => void): void {
  if (!cond) return;
  visit(cond);
  if ('all' in cond) for (const c of cond.all) visitCondition(c, visit);
  else if ('any' in cond) for (const c of cond.any) visitCondition(c, visit);
  else if ('not' in cond) visitCondition(cond.not, visit);
}

function visitEffects(effects: Effect[], visit: (effect: Effect) => void): void {
  for (const effect of effects) visit(effect);
}

/**
 * 内容包里**所有** Effect 的来源,附带一个人类可读的归属标签。
 *
 * 加一个带 effects 的内容面(课程、投入项、岔口选项…)就必须加到这里,
 * 否则依赖它的规则会静默漏检。M2 就是这么发现漏检的:七条路径全被判成死阶段。
 */
function* allEffectSources(): Generator<{ owner: string; effects: Effect[] }> {
  for (const event of contentPack.events) {
    for (const choice of event.choices) {
      for (const outcome of choice.outcomes) {
        yield { owner: `event ${event.id}.${choice.id}`, effects: outcome.effects };
      }
    }
  }
  for (const application of contentPack.applications) {
    yield { owner: `application ${application.id}`, effects: application.effects ?? [] };
    yield { owner: `application ${application.id} (fail)`, effects: application.failEffects ?? [] };
    for (const major of application.majors) {
      yield { owner: `application ${application.id}.${major.id}`, effects: major.effects ?? [] };
    }
  }
  for (const item of contentPack.allocationItems ?? []) {
    yield { owner: `allocation item ${item.id}`, effects: item.perSlot };
  }
  for (const option of contentPack.crossroadOptions ?? []) {
    yield { owner: `crossroad option ${option.id}`, effects: option.effects };
  }
  for (const course of contentPack.courses ?? []) {
    for (const tier of ['mastered', 'passed', 'failed'] as const) {
      yield { owner: `course ${course.id} (${tier})`, effects: course.outcomes[tier] };
    }
  }
}

function* allEffectsInPack(): Generator<Effect> {
  for (const source of allEffectSources()) yield* source.effects;
}

/** 内容包里**所有** Condition 的来源。与 `allEffectSources` 同一条纪律。 */
function* allConditionSources(): Generator<{ owner: string; condition: Condition | undefined }> {
  for (const event of contentPack.events) {
    yield { owner: `event ${event.id} trigger`, condition: event.trigger };
    for (const [index, variant] of (event.presentationVariants ?? []).entries()) {
      yield { owner: `event ${event.id} presentation ${index}`, condition: variant.condition };
    }
    for (const [index, line] of (event.contextLines ?? []).entries()) {
      yield { owner: `event ${event.id} context line ${index}`, condition: line.condition };
    }
    for (const choice of event.choices) {
      yield { owner: `event ${event.id}.${choice.id} visibleIf`, condition: choice.visibleIf };
      for (const outcome of choice.outcomes) {
        yield { owner: `event ${event.id}.${choice.id} outcome`, condition: outcome.condition };
      }
    }
  }
  for (const ending of contentPack.endings) {
    yield { owner: `ending ${ending.id}`, condition: ending.condition };
  }
  for (const income of contentPack.incomes) {
    yield { owner: `income ${income.id}`, condition: income.when };
  }
  for (const npc of contentPack.npcs) {
    for (const [stageId, stage] of Object.entries(npc.stages)) {
      yield { owner: `npc ${npc.id}.${stageId}`, condition: stage.advanceWhen };
    }
  }
  for (const item of contentPack.allocationItems ?? []) {
    yield { owner: `allocation item ${item.id}`, condition: item.availableWhen };
  }
  for (const option of contentPack.crossroadOptions ?? []) {
    yield { owner: `crossroad option ${option.id}`, condition: option.availableWhen };
  }
  for (const course of contentPack.courses ?? []) {
    yield { owner: `course ${course.id}`, condition: course.availableWhen };
  }
}

const eventIds = new Set(contentPack.events.map(e => e.id));
const endingIds = new Set(contentPack.endings.map(e => e.id));
const npcIds = new Set(contentPack.npcs.map(n => n.id));
const fnIds = new Set(Object.keys(contentPack.fns));
const phasePoolIds = new Set(
  contentPack.timeline.flatMap(phase => (phase.kind === 'rounds' ? phase.pools : [])),
);
const eventPoolIds = new Set(contentPack.events.flatMap(e => e.pools));
const scheduledEventIds = new Set<string>();
for (const event of contentPack.events) {
  for (const choice of event.choices) {
    for (const outcome of choice.outcomes) {
      for (const effect of outcome.effects) {
        if ('schedule' in effect) scheduledEventIds.add(effect.schedule.eventId);
      }
    }
  }
}

// NPC 温度标签采用“靠近/疏远”语义。一个事件一旦开始使用某条人物线的温度标签，
// 所有 outcome 都必须标注同一前缀，防止新增条件变体时悄悄漏出 historyCount 统计。
const NPC_TAG_PREFIXES = ['grinder', 'hometown', 'roommate', 'love', 'mentor'] as const;
for (const event of contentPack.events) {
  const outcomes = event.choices.flatMap(choice => choice.outcomes);
  for (const prefix of NPC_TAG_PREFIXES) {
    if (!outcomes.some(outcome => outcome.outcomeTag?.startsWith(`${prefix}_`))) continue;
    for (const choice of event.choices) {
      for (const outcome of choice.outcomes) {
        if (outcome.outcomeTag !== `${prefix}_warm` && outcome.outcomeTag !== `${prefix}_cool`) {
          error(`NPC temperature tag missing/invalid: ${event.id}.${choice.id} expected ${prefix}_warm/cool`);
        }
      }
    }
  }
}
for (const application of contentPack.applications) {
  for (const effect of [...(application.effects ?? []), ...(application.failEffects ?? [])]) {
    if ('schedule' in effect) scheduledEventIds.add(effect.schedule.eventId);
  }
}

checkUnique('event', contentPack.events.map(e => e.id));
checkUnique('income', contentPack.incomes.map(i => i.id));
for (const income of contentPack.incomes) {
  visitCondition(income.when, cond => {
    if ('fn' in cond && !fnIds.has(cond.fn)) error(`income ${income.id} references missing condition fn: ${cond.fn}`);
  });
}
checkUnique('ending', contentPack.endings.map(e => e.id));
checkUnique('npc', contentPack.npcs.map(n => n.id));
checkUnique('exam question', contentPack.examBank.map(q => q.id));
checkUnique('application', contentPack.applications.map(a => a.id));
// 学院归属(GAME_DESIGN 2.5):心理学系挂在哪个学院下,决定学位、课程结构和后续路线顺畅度
const KNOWN_COLLEGES = new Set(['science', 'education', 'medical', 'normal']);
for (const application of contentPack.applications) {
  if (application.majors.length === 0) error(`application has no majors: ${application.id}`);
  checkUnique(`application ${application.id} major`, application.majors.map(m => m.id));
  for (const major of application.majors) {
    if (!KNOWN_COLLEGES.has(major.college)) {
      error(`application ${application.id} major ${major.id} has unknown college: ${major.college}`);
    }
  }
}
checkUnique('background', contentPack.backgrounds.map(b => b.id));

// ---- 特质校验 ----
checkUnique('trait', contentPack.traits.map(t => t.id));
const traitIds = new Set(contentPack.traits.map(t => t.id));
checkUnique('trait evolution', contentPack.traitEvolutions.map(e => e.id));
const traitEvolutionIds = new Set(contentPack.traitEvolutions.map(e => e.id));
const knownTraitFlagIds = new Set([...traitIds, ...traitEvolutionIds]);
const eventCategories = new Set(
  contentPack.events.map(e => e.category).filter((c): c is string => Boolean(c)),
);
for (const trait of contentPack.traits) {
  if (!trait.id.startsWith('trait_')) error(`trait id must start with "trait_": ${trait.id}`);
  if (!trait.label.trim()) error(`trait has empty label: ${trait.id}`);
  if (!trait.text.trim()) error(`trait has empty text: ${trait.id}`);
  for (const [category, bias] of Object.entries(trait.poolBias ?? {})) {
    if (!(bias > 0 && bias <= 5)) {
      error(`trait ${trait.id} poolBias.${category} out of range (0, 5]: ${bias}`);
    }
    if (!eventCategories.has(category)) {
      error(`trait ${trait.id} poolBias references unknown event category: ${category}`);
    }
  }
  for (const [key, mod] of Object.entries(trait.statMods ?? {})) {
    if (!BOUNDED_STATS.has(key) && key !== 'money') {
      error(`trait ${trait.id} statMods has unknown stat: ${key}`);
    }
    if (typeof mod !== 'number' || mod === 0 || Math.abs(mod) > 20) {
      error(`trait ${trait.id} statMods.${key} out of range ±20 (nonzero): ${mod}`);
    }
  }
}
for (const evolution of contentPack.traitEvolutions) {
  if (!evolution.id.startsWith('trait_growth_')) {
    error(`trait evolution id must start with "trait_growth_": ${evolution.id}`);
  }
  if (!traitIds.has(evolution.traitId)) {
    error(`trait evolution ${evolution.id} references unknown trait: ${evolution.traitId}`);
  }
  if (!evolution.label.trim()) error(`trait evolution has empty label: ${evolution.id}`);
  for (const [category, bias] of Object.entries(evolution.poolBias ?? {})) {
    if (!(bias > 0 && bias <= 5)) {
      error(`trait evolution ${evolution.id} poolBias.${category} out of range (0, 5]: ${bias}`);
    }
    if (!eventCategories.has(category)) {
      error(`trait evolution ${evolution.id} poolBias references unknown event category: ${category}`);
    }
  }
}
checkUnique('life goal', contentPack.lifeGoals.map(goal => goal.id));
for (const goal of contentPack.lifeGoals) {
  if (!goal.id.startsWith('goal_')) error(`life goal id must start with "goal_": ${goal.id}`);
  const weightSum = Object.values(goal.scoringWeights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(weightSum - 1) > 1e-9) error(`life goal ${goal.id} scoring weights must sum to 1`);
  for (const [category, bias] of Object.entries(goal.poolBias ?? {})) {
    if (!(bias > 0 && bias <= 5)) error(`life goal ${goal.id} has invalid poolBias.${category}: ${bias}`);
    if (!eventCategories.has(category)) error(`life goal ${goal.id} references unknown event category: ${category}`);
  }
}
// 条件里引用的 trait_ flag 必须真实存在;内容不得 setFlag 特质(特质只在开局抽取时赋值)
function checkTraitFlagRefs(owner: string, cond: Condition | undefined): void {
  visitCondition(cond, c => {
    if ('flag' in c && c.flag.startsWith('trait_') && !knownTraitFlagIds.has(c.flag)) {
      error(`${owner} references unknown trait flag: ${c.flag}`);
    }
  });
}
for (const event of contentPack.events) {
  checkTraitFlagRefs(`event ${event.id} trigger`, event.trigger);
  for (const [index, variant] of (event.presentationVariants ?? []).entries()) {
    checkTraitFlagRefs(`event ${event.id} presentation ${index}`, variant.condition);
  }
  for (const [index, line] of (event.contextLines ?? []).entries()) {
    checkTraitFlagRefs(`event ${event.id} context line ${index}`, line.condition);
  }
  for (const choice of event.choices) {
    checkTraitFlagRefs(`event ${event.id} choice ${choice.id} visibleIf`, choice.visibleIf);
    for (const outcome of choice.outcomes) {
      checkTraitFlagRefs(`event ${event.id} choice ${choice.id} outcome`, outcome.condition);
      for (const effect of outcome.effects) {
        if ('setFlag' in effect && effect.setFlag.startsWith('trait_') && !traitEvolutionIds.has(effect.setFlag)) {
          error(`event ${event.id} sets trait flag via setFlag (traits are draw-only): ${effect.setFlag}`);
        }
      }
    }
  }
}
for (const ending of contentPack.endings) checkTraitFlagRefs(`ending ${ending.id}`, ending.condition);
for (const income of contentPack.incomes) checkTraitFlagRefs(`income ${income.id}`, income.when);
for (const npc of contentPack.npcs) {
  for (const [stageId, stage] of Object.entries(npc.stages)) {
    checkTraitFlagRefs(`npc ${npc.id} stage ${stageId}`, stage.advanceWhen);
  }
}

for (const track of ['文', '理'] as const) {
  const available = contentPack.examBank.filter(q => q.track === 'both' || q.track === track);
  if (available.length < contentPack.meta.examQuestionCount) {
    error(`not enough exam questions for ${track}: ${available.length}/${contentPack.meta.examQuestionCount}`);
  }
}

for (const question of contentPack.examBank) {
  if (question.options.length < 2) error(`exam question has too few options: ${question.id}`);
  if (question.answerIndex < 0 || question.answerIndex >= question.options.length) {
    error(`exam question answerIndex out of range: ${question.id}`);
  }
  if (question.difficulty !== undefined && (question.difficulty < 1 || question.difficulty > 5)) {
    error(`exam question difficulty out of range: ${question.id}`);
  }
}

if (!endingIds.has(contentPack.meta.fallbackEndingId)) {
  error(`fallback ending not found: ${contentPack.meta.fallbackEndingId}`);
}

// ---------- 阶段路由校验(本作新增,保护六条并行培养路径不串线) ----------
// 前作按 timeline 数组下标顺延,只有一条主干所以无所谓。本作六条培养路径并列,
// 一个漏写的 nextPhaseId 就意味着"直博读到第五年掉进硕士阶段",而这种 bug 在
// simulate 里只表现为某些结局到达率异常,极难定位。所以这一整块都是 error 级。

const phaseIds = new Set(contentPack.timeline.map(p => p.id));
checkUnique('phase', contentPack.timeline.map(p => p.id));

const finalPhases = contentPack.timeline.filter(p => p.kind === 'rounds' && p.isFinal);
// 本作允许多个终局阶段(每条培养路径各有自己的终局),但至少要有一个,否则打不完
if (finalPhases.length === 0) error('timeline has no final phase (isFinal), the game can never end');

for (const phase of contentPack.timeline) {
  const isFinal = phase.kind === 'rounds' && phase.isFinal === true;
  if (phase.nextPhaseId !== undefined && !phaseIds.has(phase.nextPhaseId)) {
    error(`phase ${phase.id} has unknown nextPhaseId: ${phase.nextPhaseId}`);
  }
  if (isFinal && phase.nextPhaseId !== undefined) {
    error(`final phase ${phase.id} must not have nextPhaseId (it ends the game)`);
  }
  // 强制显式路由。TECH 4.3 只要求"除主干外一律显式写",这里收紧成"一个不许漏":
  // 主干多写两行的代价,换掉"靠人工确认数组顺序是不是设计意图"这件必然出错的事。
  if (!isFinal && phase.nextPhaseId === undefined) {
    error(`phase ${phase.id} is not final and has no nextPhaseId (阶段路由必须显式声明)`);
  }
  if (phase.kind === 'rounds') {
    if (phase.rounds <= 0) error(`phase ${phase.id} has non-positive rounds: ${phase.rounds}`);
    if (phase.yearsPerRound !== undefined && phase.yearsPerRound < 1) {
      error(`phase ${phase.id} has invalid yearsPerRound: ${phase.yearsPerRound}`);
    }
    if (phase.allocationSlots !== undefined && phase.allocationSlots < 0) {
      error(`phase ${phase.id} has negative allocationSlots: ${phase.allocationSlots}`);
    }
  }
}

// 阶段图连通性。边有三种来源:
//   ① `nextPhaseId`
//   ② 事件的 `{ jumpToPhase }`——但**只从那些池子包含该事件的阶段出发**
//   ③ 岔口选项的 `{ jumpToPhase }`——只从 `group` 对应的那个阶段出发
//
// ② 的精确性很重要。M1 最初的写法是"任何阶段都能跳到任何 jump 目标",
// 结果只要内容里存在一个跳到终局阶段的 jumpToPhase,**可终止性检查就几乎失效了**:
// 任何死环都会因为"理论上能跳出去"而被判成可终止。反例自测正是这么发现的
// (M1 时内容里还没有 jumpToPhase,所以那个反例当时是绿的)。
const phaseEdges = new Map<string, string[]>();
for (const phase of contentPack.timeline) {
  phaseEdges.set(phase.id, phase.nextPhaseId === undefined ? [] : [phase.nextPhaseId]);
}
function addEdge(fromPhaseId: string, toPhaseId: string): void {
  const existing = phaseEdges.get(fromPhaseId);
  if (existing && !existing.includes(toPhaseId)) existing.push(toPhaseId);
}
for (const event of contentPack.events) {
  const targets = new Set<string>();
  for (const choice of event.choices) {
    for (const outcome of choice.outcomes) {
      for (const effect of outcome.effects) {
        if ('jumpToPhase' in effect) targets.add(effect.jumpToPhase);
      }
    }
  }
  if (targets.size === 0) continue;
  for (const phase of contentPack.timeline) {
    if (phase.kind !== 'rounds') continue;
    // 事件只能在池子对得上的阶段里被抽到,所以边只从那些阶段出发
    if (!event.pools.some(pool => phase.pools.includes(pool))) continue;
    for (const target of targets) addEdge(phase.id, target);
  }
}
for (const option of contentPack.crossroadOptions ?? []) {
  for (const effect of option.effects) {
    // 岔口选项的 `group` 就是那个 flow 阶段的 id
    if ('jumpToPhase' in effect) addEdge(option.group, effect.jumpToPhase);
  }
}

const startPhase = contentPack.timeline[0];
if (!startPhase) {
  error('timeline is empty');
} else {
  const reachable = new Set<string>();
  const queue = [startPhase.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const next of phaseEdges.get(id) ?? []) queue.push(next);
  }
  for (const phase of contentPack.timeline) {
    if (!reachable.has(phase.id)) {
      error(`phase is unreachable from ${startPhase.id}: ${phase.id}(死阶段,内容永远不会被玩到)`);
    }
  }

  // 反向:每个可达阶段都必须能走到某个终局。同时抓死路和"绕不出去的环"。
  const finalIds = new Set(finalPhases.map(p => p.id));
  const canFinish = new Set(finalIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const phase of contentPack.timeline) {
      if (canFinish.has(phase.id)) continue;
      if ((phaseEdges.get(phase.id) ?? []).some(next => canFinish.has(next))) {
        canFinish.add(phase.id);
        grew = true;
      }
    }
  }
  for (const id of reachable) {
    if (!canFinish.has(id)) error(`phase can never reach a final phase: ${id}(玩到这里就永远打不完)`);
  }
}

for (const pool of phasePoolIds) {
  if (pool === 'npc') continue;
  if (!eventPoolIds.has(pool)) warn(`phase references pool with no events: ${pool}`);
}

for (const event of contentPack.events) {
  const isAdvisorStageEvent = (contentPack.advisors ?? []).some(advisor =>
    Object.values(advisor.stages).some(stage => stage.eventId === event.id),
  );
  if (
    event.pools.length === 0 &&
    // 管线阶段事件由调度器按课题当前阶段挑,不进普通池
    event.projectStage === undefined &&
    !isAdvisorStageEvent &&
    !scheduledEventIds.has(event.id) &&
    ![...contentPack.npcs].some(npc =>
      Object.values(npc.stages).some(stage => stage.eventId === event.id),
    )
  ) {
    warn(`event has no pool and is not referenced by an NPC stage or schedule: ${event.id}`);
  }
  if (event.choices.length === 0) error(`event has no choices: ${event.id}`);
  checkUnique(`choice in ${event.id}`, event.choices.map(choice => choice.id));
  visitCondition(event.trigger, cond => {
    if ('fn' in cond && !fnIds.has(cond.fn)) error(`event ${event.id} references missing condition fn: ${cond.fn}`);
    if ('npcFavor' in cond && !npcIds.has(cond.npcFavor)) error(`event ${event.id} references missing npc: ${cond.npcFavor}`);
    if ('npcStage' in cond && !npcIds.has(cond.npcStage)) error(`event ${event.id} references missing npc: ${cond.npcStage}`);
  });
  for (const [index, variant] of (event.presentationVariants ?? []).entries()) {
    visitCondition(variant.condition, cond => {
      if ('fn' in cond && !fnIds.has(cond.fn)) error(`presentation ${event.id}.${index} references missing condition fn: ${cond.fn}`);
      if ('npcFavor' in cond && !npcIds.has(cond.npcFavor)) error(`presentation ${event.id}.${index} references missing npc: ${cond.npcFavor}`);
      if ('npcStage' in cond && !npcIds.has(cond.npcStage)) error(`presentation ${event.id}.${index} references missing npc: ${cond.npcStage}`);
    });
  }
  for (const [index, line] of (event.contextLines ?? []).entries()) {
    visitCondition(line.condition, cond => {
      if ('fn' in cond && !fnIds.has(cond.fn)) error(`context line ${event.id}.${index} references missing condition fn: ${cond.fn}`);
      if ('npcFavor' in cond && !npcIds.has(cond.npcFavor)) error(`context line ${event.id}.${index} references missing npc: ${cond.npcFavor}`);
      if ('npcStage' in cond && !npcIds.has(cond.npcStage)) error(`context line ${event.id}.${index} references missing npc: ${cond.npcStage}`);
    });
  }
  for (const choice of event.choices) {
    visitCondition(choice.visibleIf, cond => {
      if ('fn' in cond && !fnIds.has(cond.fn)) error(`choice ${event.id}.${choice.id} references missing condition fn: ${cond.fn}`);
    });
    if (choice.outcomes.length === 0) error(`choice has no outcomes: ${event.id}.${choice.id}`);
    for (const outcome of choice.outcomes) {
      if (outcome.weight <= 0) error(`outcome weight must be positive: ${event.id}.${choice.id}`);
      // 结果页只展示 stats 变化:没有任何非零 stats 的 outcome 会让玩家看不到选择反馈
      const hasVisibleStat = outcome.effects.some(
        e =>
          ('stats' in e && Object.values(e.stats).some(v => v !== 0)) ||
          'moneyCost' in e ||
          'setStat' in e,
      );
      if (!hasVisibleStat) {
        error(`outcome has no visible stat change (选完不展示加减分): ${event.id}.${choice.id}`);
      }
      visitCondition(outcome.condition, cond => {
        if ('fn' in cond && !fnIds.has(cond.fn)) error(`outcome ${event.id}.${choice.id} references missing condition fn: ${cond.fn}`);
      });
      visitEffects(outcome.effects, effect => {
        if ('addFlag' in effect) {
          if (effect.addFlag.delta === 0) {
            error(`event ${event.id} has a no-op addFlag (delta 0): ${effect.addFlag.key}`);
          }
          const { min, max } = effect.addFlag;
          if (min !== undefined && max !== undefined && min > max) {
            error(`event ${event.id} has addFlag min > max: ${effect.addFlag.key}`);
          }
        }
        if ('extendPhase' in effect && effect.extendPhase.rounds <= 0) {
          error(`event ${event.id} has non-positive extendPhase rounds: ${effect.extendPhase.rounds}`);
        }
        if ('grantSlots' in effect && effect.grantSlots === 0) {
          error(`event ${event.id} has a no-op grantSlots (0)`);
        }
        if ('stats' in effect && effect.stats.money !== undefined && effect.stats.money < -MAX_FIXED_MONEY_DEBIT) {
          error(
            `event ${event.id} has large fixed money debit ${effect.stats.money}; use moneyCost for costs above ${MAX_FIXED_MONEY_DEBIT}`,
          );
        }
        if ('schedule' in effect && !eventIds.has(effect.schedule.eventId)) {
          error(`event ${event.id} schedules missing event: ${effect.schedule.eventId}`);
        } else if ('triggerEnding' in effect && !endingIds.has(effect.triggerEnding)) {
          error(`event ${event.id} triggers missing ending: ${effect.triggerEnding}`);
        } else if ('moneyCost' in effect) {
          if (effect.moneyCost.rate < 0 || effect.moneyCost.rate > 1) {
            error(`event ${event.id} has invalid moneyCost rate: ${effect.moneyCost.rate}`);
          }
          if (effect.moneyCost.min !== undefined && effect.moneyCost.min < 0) {
            error(`event ${event.id} has invalid moneyCost min: ${effect.moneyCost.min}`);
          }
          if (effect.moneyCost.max !== undefined && effect.moneyCost.max < 0) {
            error(`event ${event.id} has invalid moneyCost max: ${effect.moneyCost.max}`);
          }
          if (
            effect.moneyCost.min !== undefined &&
            effect.moneyCost.max !== undefined &&
            effect.moneyCost.min > effect.moneyCost.max
          ) {
            error(`event ${event.id} has moneyCost min > max`);
          }
          if (effect.moneyCost.roundTo !== undefined && effect.moneyCost.roundTo <= 0) {
            error(`event ${event.id} has invalid moneyCost roundTo: ${effect.moneyCost.roundTo}`);
          }
        } else if ('setStat' in effect && !['method', 'money', 'state', 'capital', 'clinical'].includes(effect.setStat)) {
          error(`event ${event.id} sets unknown stat: ${effect.setStat}`);
        } else if ('npcFavor' in effect && !npcIds.has(effect.npcFavor)) {
          error(`event ${event.id} changes missing npc favor: ${effect.npcFavor}`);
        } else if ('npcStage' in effect && !npcIds.has(effect.npcStage)) {
          error(`event ${event.id} changes missing npc stage: ${effect.npcStage}`);
        } else if ('jumpToPhase' in effect && !contentPack.timeline.some(p => p.id === effect.jumpToPhase)) {
          error(`event ${event.id} jumps to missing phase: ${effect.jumpToPhase}`);
        } else if ('fn' in effect && !fnIds.has(effect.fn)) {
          error(`event ${event.id} references missing effect fn: ${effect.fn}`);
        }
      });
    }
  }
}

for (const npc of contentPack.npcs) {
  if (!npc.stages[npc.initialStage]) error(`npc ${npc.id} initial stage not found: ${npc.initialStage}`);
  for (const [stageId, stage] of Object.entries(npc.stages)) {
    if (stage.eventId && !eventIds.has(stage.eventId)) {
      error(`npc ${npc.id}.${stageId} references missing event: ${stage.eventId}`);
    }
    visitCondition(stage.advanceWhen, cond => {
      if ('fn' in cond && !fnIds.has(cond.fn)) error(`npc ${npc.id}.${stageId} references missing condition fn: ${cond.fn}`);
    });
  }
}

for (const ending of contentPack.endings) {
  visitCondition(ending.condition, cond => {
    if ('fn' in cond && !fnIds.has(cond.fn)) error(`ending ${ending.id} references missing condition fn: ${cond.fn}`);
  });
}

// ---------- 恒假条件静态检查(防 vc-simulator 式死结局) ----------

const datedYears = contentPack.timeline.flatMap(p => (p.date ? [p.date.year] : []));
const gameYearMin = Math.min(...datedYears);
// 多个终局阶段时取最晚的那个。少算 gameYearMax 会把合法的后期事件误判成"条件恒假",
// 所以这里必须扫全部 rounds 阶段而不是只看第一个 final(六条路径长度不同,最长的才是上界)。
const datedMax = contentPack.timeline.reduce((max, phase) => {
  if (phase.kind !== 'rounds' || !phase.date) return max;
  const lastYear = phase.date.year + (phase.rounds - 1) * (phase.yearsPerRound ?? 1);
  return Math.max(max, lastYear);
}, gameYearMin);
// 不写 date 的阶段沿用进入时的日期,静态看不出那是哪一年。**这里必须往宽了估**:
// 上界估小会把合法的后期事件误判成"条件恒假",而估大只是少查出几条,不会误伤。
// 这样的阶段最早也得从某个有日期的阶段之后进来,所以拿 datedMax 当它的起点。
const gameYearMax = contentPack.timeline.reduce((max, phase) => {
  if (phase.kind !== 'rounds' || phase.date) return max;
  return Math.max(max, datedMax + phase.rounds * (phase.yearsPerRound ?? 1));
}, datedMax);

function statBoundsImpossible(stat: string, op: string, value: number): boolean {
  if (!BOUNDED_STATS.has(stat)) return false;
  if (op === '>' && value >= 100) return true;
  if (op === '>=' && value > 100) return true;
  if (op === '<' && value <= 0) return true;
  if (op === '<=' && value < 0) return true;
  if (op === '==' && (value < 0 || value > 100)) return true;
  return false;
}

function allBranchContradicts(children: Condition[]): boolean {
  const lower = new Map<string, number>();
  const upper = new Map<string, number>();
  const flagRequired = new Map<string, boolean | number | string>();
  const flagForbidden = new Set<string>();
  const single = new Map<string, string>(); // background/career/major/npcStage 单值字段
  let yearFrom = gameYearMin;
  let yearTo = gameYearMax;

  for (const child of children) {
    if ('stat' in child) {
      const key = child.stat;
      if (!BOUNDED_STATS.has(key) && key !== 'money') continue;
      if (child.op === '>' ) lower.set(key, Math.max(lower.get(key) ?? -Infinity, child.value + 1));
      if (child.op === '>=') lower.set(key, Math.max(lower.get(key) ?? -Infinity, child.value));
      if (child.op === '<' ) upper.set(key, Math.min(upper.get(key) ?? Infinity, child.value - 1));
      if (child.op === '<=') upper.set(key, Math.min(upper.get(key) ?? Infinity, child.value));
      if (child.op === '==') {
        lower.set(key, Math.max(lower.get(key) ?? -Infinity, child.value));
        upper.set(key, Math.min(upper.get(key) ?? Infinity, child.value));
      }
    } else if ('flag' in child) {
      const want = child.equals ?? true;
      if (flagForbidden.has(child.flag) && want === true) return true;
      const existing = flagRequired.get(child.flag);
      if (existing !== undefined && existing !== want) return true;
      flagRequired.set(child.flag, want);
    } else if ('not' in child && typeof child.not === 'object' && 'flag' in child.not && child.not.equals === undefined) {
      if (flagRequired.get(child.not.flag) === true) return true;
      flagForbidden.add(child.not.flag);
    } else if ('year' in child) {
      yearFrom = Math.max(yearFrom, child.year.from ?? gameYearMin);
      yearTo = Math.min(yearTo, child.year.to ?? gameYearMax);
    } else if ('background' in child) {
      if ((single.get('background') ?? child.background) !== child.background) return true;
      single.set('background', child.background);
    } else if ('career' in child) {
      if ((single.get('career') ?? child.career) !== child.career) return true;
      single.set('career', child.career);
    } else if ('major' in child) {
      if ((single.get('major') ?? child.major) !== child.major) return true;
      single.set('major', child.major);
    } else if ('npcStage' in child) {
      const key = `npcStage:${child.npcStage}`;
      if ((single.get(key) ?? child.stage) !== child.stage) return true;
      single.set(key, child.stage);
    }
  }
  if (yearFrom > yearTo) return true;
  for (const [key, lo] of lower) {
    const hi = upper.get(key);
    if (hi !== undefined && lo > hi) return true;
  }
  return false;
}

function conditionImpossible(cond: Condition | undefined): boolean {
  if (!cond) return false;
  if ('chance' in cond) return cond.chance <= 0;
  if ('stat' in cond) return statBoundsImpossible(cond.stat, cond.op, cond.value);
  if ('year' in cond) {
    const from = cond.year.from ?? gameYearMin;
    const to = cond.year.to ?? gameYearMax;
    return from > to || from > gameYearMax || to < gameYearMin;
  }
  if ('not' in cond) return typeof cond.not === 'object' && 'always' in cond.not;
  if ('all' in cond) {
    if (cond.all.some(conditionImpossible)) return true;
    return allBranchContradicts(cond.all);
  }
  if ('any' in cond) return cond.any.length > 0 && cond.any.every(conditionImpossible);
  return false;
}

for (const ending of contentPack.endings) {
  if (conditionImpossible(ending.condition)) {
    error(`ending condition can never be true (dead ending): ${ending.id}`);
  }
}
for (const event of contentPack.events) {
  if (conditionImpossible(event.trigger)) {
    warn(`event trigger can never be true: ${event.id}`);
  }
  for (const [index, variant] of (event.presentationVariants ?? []).entries()) {
    if (conditionImpossible(variant.condition)) {
      warn(`presentation condition can never be true: ${event.id}.${index}`);
    }
  }
  for (const [index, line] of (event.contextLines ?? []).entries()) {
    if (conditionImpossible(line.condition)) {
      warn(`context line condition can never be true: ${event.id}.${index}`);
    }
  }
  for (const choice of event.choices) {
    if (conditionImpossible(choice.visibleIf)) {
      warn(`choice visibleIf can never be true: ${event.id}.${choice.id}`);
    }
    for (const outcome of choice.outcomes) {
      if (conditionImpossible(outcome.condition)) {
        warn(`outcome condition can never be true: ${event.id}.${choice.id}`);
      }
    }
  }
}

// ---------- 互斥语境词表检查(防"买了房还收到房租涨价"式穿帮) ----------
// 只扫事件标题和正文(不扫 outcome 文案,避免"当年交给房东"这类回忆句误报)。

function conditionRequiresFlag(cond: Condition | undefined, flag: string): boolean {
  if (!cond) return false;
  if ('flag' in cond) return cond.flag === flag && (cond.equals === undefined || cond.equals === true);
  if ('all' in cond) return cond.all.some(c => conditionRequiresFlag(c, flag));
  return false;
}

function conditionForbidsFlag(cond: Condition | undefined, flag: string): boolean {
  if (!cond) return false;
  if ('not' in cond) {
    const inner = cond.not;
    return typeof inner === 'object' && 'flag' in inner && inner.flag === flag && inner.equals === undefined;
  }
  if ('all' in cond) return cond.all.some(c => conditionForbidsFlag(c, flag));
  return false;
}

const MUTEX_TEXT_RULES: { pattern: RegExp; label: string; ok: (trigger?: Condition) => boolean }[] = [
  {
    pattern: /房租|房东|续租|租房软件/,
    label: '租房语境需要 not has_house(或 no_house)门控',
    ok: trigger => conditionForbidsFlag(trigger, 'has_house') || conditionRequiresFlag(trigger, 'no_house'),
  },
  {
    pattern: /相亲/,
    label: '相亲语境需要 not in_love 门控',
    ok: trigger => conditionForbidsFlag(trigger, 'in_love'),
  },
];

// ---------- 回响兜底检查 ----------
// 回响(contextLines)全部带 condition 时,条件一条都没命中的对局就什么都看不到。
// 历史上《换季重感冒》因此只有 5.8% 的对局能看到回响。要么补一条无条件兜底句,
// 要么保证条件互斥且穷尽(例如博士线的两个分支),后者用 exhaustive 白名单登记。
// 白名单登记的是"条件互斥且穷尽"的事件。前作那两个 id 在本作不存在,清空重新开始。
const EXHAUSTIVE_CONTEXT_EVENTS = new Set<string>();
for (const event of contentPack.events) {
  const lines = event.contextLines ?? [];
  if (lines.length === 0) continue;
  if (lines.some(line => !line.condition)) continue;
  if (EXHAUSTIVE_CONTEXT_EVENTS.has(event.id)) continue;
  warn(`回响没有无条件兜底句(条件不命中的对局看不到任何回响): ${event.id}`);
}

// ---------- 规则 4:累积量读写成对(TECH 7.1) ----------
// 注册小时数、督导小时数、耗竭值、诚信风险、教学工作量都靠 flags 字典承载。
// 埋了累积量却从来不结算,是前作 `() => false` 死结局的同类问题:内容看起来做了,实际是死的。
//
// 本作把这条规则做成**双向**的(TECH 只要求"写了必须有人读"):
// 反方向"读了必须有人写"抓的是 key 拼错——`clincal_hours` 这种 typo 会让整条支线永久不触发,
// 而且因为条件永远是 false,simulate 里连异常都看不到。两个方向的漏检代价一样大。
const accumulatorWrites = new Map<string, string[]>();
const accumulatorReads = new Map<string, string[]>();

function noteWrite(key: string, owner: string): void {
  accumulatorWrites.set(key, [...(accumulatorWrites.get(key) ?? []), owner]);
}
function noteRead(key: string, owner: string): void {
  accumulatorReads.set(key, [...(accumulatorReads.get(key) ?? []), owner]);
}

// 读:扫全部 Condition 来源(含投入项门控、岔口门控、课程门控)
for (const { owner, condition } of allConditionSources()) {
  visitCondition(condition, c => {
    if ('flagNum' in c) noteRead(c.flagNum.key, owner);
  });
}

// 写:扫全部 Effect 来源(含投入项 perSlot、岔口 effects、课程三档 outcomes)
for (const { owner, effects } of allEffectSources()) {
  for (const effect of effects) {
    if ('addFlag' in effect) noteWrite(effect.addFlag.key, owner);
    // setFlag 写入数字值也算写累积量(内容可能用它做"直接设为某个值")
    if ('setFlag' in effect && typeof effect.value === 'number') noteWrite(effect.setFlag, owner);
  }
}
for (const background of contentPack.backgrounds) {
  for (const [key, value] of Object.entries(background.flags ?? {})) {
    if (typeof value === 'number') noteWrite(key, `background ${background.id}`);
  }
}

/**
 * 引擎自己读写的数值型 flag,不参与内容侧的成对判定。
 *
 * `retake_slots` 由课程的 `failed` effects 写入、由 `systems/allocation.ts` 的
 * `effectiveSlots` 读取——读的那一端在引擎里,内容侧扫不到。
 */
const ENGINE_HANDLED_NUMERIC_FLAGS = new Set(['retake_slots']);

for (const [key, owners] of accumulatorWrites) {
  if (accumulatorReads.has(key) || ENGINE_HANDLED_NUMERIC_FLAGS.has(key)) continue;
  error(
    `累积量 ${key} 被写入但从来没有条件读它(写入方:${owners.slice(0, 3).join(', ')}${owners.length > 3 ? ` 等 ${owners.length} 处` : ''})`,
  );
}
for (const [key, owners] of accumulatorReads) {
  if (accumulatorWrites.has(key) || ENGINE_HANDLED_NUMERIC_FLAGS.has(key)) continue;
  error(
    `累积量 ${key} 被条件读取但从来没有人写它(读取方:${owners.slice(0, 3).join(', ')}${owners.length > 3 ? ` 等 ${owners.length} 处` : ''});key 拼错了?`,
  );
}

// ---------- 规则 1:课题阶段图无死锁(TECH 7.1) ----------
//
// **每个 `ProjectStage` 至少有一个内容事件能推进出去;`abandoned`/`published` 是唯一允许的终态。**
//
// 阶段语义:一个事件就是那个阶段的工作,`trigger` 里的 `{ projectCount: { stage: X } }`
// 表示"课题正卡在 X",而它的 outcome 用 `{ project: { op: 'advance' } }` 推进出去。
// 差一格就会让课题永远停在序列的最后一个阶段上——**这条规则就是为了抓那个**
// (M2.5 写毕业论文链的时候真的差了一格,是 trace 手工发现的,不是 validate)。
//
// 例外:序列的**第一个阶段**可以由"创建课题的那个 outcome 自己顺手推进出去"来退出
// (`create` 和 `advance` 写在同一个 effects 里),因为课题根本没在那里停留过。

const projectTemplates = contentPack.projectTemplates ?? [];
checkUnique('project template', projectTemplates.map(t => t.id));

const PROJECT_TERMINAL_STAGES = new Set(['published', 'abandoned']);

/** 事件的 trigger 里必然要求"课题卡在某个阶段"时,返回那些阶段 */
function stagesGatedByEvent(event: (typeof contentPack.events)[number]): string[] {
  const stages: string[] = [];
  visitCondition(event.trigger, cond => {
    if ('projectCount' in cond && cond.projectCount.stage !== undefined) {
      stages.push(cond.projectCount.stage);
    }
  });
  return stages;
}

/** 该事件的 outcome 里有没有能"推进出当前阶段"的操作 */
function eventCanExitStage(event: (typeof contentPack.events)[number]): boolean {
  return event.choices.some(choice =>
    choice.outcomes.some(outcome =>
      outcome.effects.some(
        effect =>
          'project' in effect && (effect.project.op === 'advance' || effect.project.op === 'abandon'),
      ),
    ),
  );
}

/** 有没有 outcome 在创建这个模板的课题时**同一笔**就推进了一步 */
function templateAdvancedOnCreate(templateId: string): boolean {
  for (const event of contentPack.events) {
    for (const choice of event.choices) {
      for (const outcome of choice.outcomes) {
        const creates = outcome.effects.some(
          e => 'project' in e && e.project.op === 'create' && e.project.templateId === templateId,
        );
        if (!creates) continue;
        if (outcome.effects.some(e => 'project' in e && e.project.op === 'advance')) return true;
      }
    }
  }
  return false;
}

const allSequenceStages = new Set<string>(projectTemplates.flatMap(t => t.stageSequence));

for (const template of projectTemplates) {
  if (template.stageSequence.length === 0) {
    error(`project template has an empty stageSequence: ${template.id}`);
    continue;
  }
  if (template.titles.length === 0) error(`project template has no titles: ${template.id}`);
  for (const stage of template.stageSequence) {
    if (PROJECT_TERMINAL_STAGES.has(stage)) {
      error(
        `project template ${template.id} 把终态 ${stage} 写进了 stageSequence` +
          `(终态是推进出序列之后自动落到的,不是序列里的一步)`,
      );
    }
  }
  // 两种推进模型,查的东西不一样:
  //
  // **内容驱动**(毕业论文):阶段事件自己 `advance`。风险是死锁——某一站没人推得动,
  // 课题永远停在那里。这是 M2.5 真的踩过的坑。
  //
  // **引擎驱动**(真课题,M3):推进由 `stageSuccessChance` 掷骰决定,阶段事件只讲故事。
  // 死锁不可能发生,但另一种毛病会:**某一站一个事件都没有 = 那一年玩家什么都看不到**,
  // 只在年度回顾页看到一行"还卡在收数据"。所以这里查的是覆盖,不是出口。
  const engineDriven = !template.isThesis;
  for (const [index, stage] of template.stageSequence.entries()) {
    // 内容驱动的模板只认**它自己那条链上的事件**(trigger 读 `projectCount.stage`)当出口;
    // 引擎驱动的阶段事件(`projectStage`)不负责推进,把它们算进来会让死锁检查空转。
    const chainEvents = contentPack.events.filter(event =>
      stagesGatedByEvent(event).includes(stage),
    );
    const pooledStageEvents = contentPack.events.filter(
      event =>
        event.projectStage === stage &&
        (!event.projectDomains || event.projectDomains.includes(template.domain)),
    );
    const stageEvents = engineDriven ? [...pooledStageEvents, ...chainEvents] : chainEvents;
    if (engineDriven) {
      if (stageEvents.length === 0) {
        error(
          `课题阶段无内容:模板 ${template.id} 的阶段 ${stage} 一个事件都没有` +
            `(玩家在这一站只会看到年度回顾页的一行摘要,整整一年没有故事)`,
        );
      }
      continue;
    }
    if (stageEvents.some(eventCanExitStage)) continue;
    // 第一个阶段允许"创建时顺手推进出去"
    if (index === 0 && templateAdvancedOnCreate(template.id)) continue;
    error(
      `课题阶段死锁:模板 ${template.id} 的阶段 ${stage} 没有任何事件能推进出去` +
        `(需要一个 trigger 读 projectCount.stage=${stage} 且 outcome 里有 advance/abandon 的事件)`,
    );
  }
}

// 反方向:读了一个不在任何模板序列里的阶段 = 拼错了,那个事件永远不会触发
for (const event of contentPack.events) {
  const declared = [...stagesGatedByEvent(event)];
  if (event.projectStage !== undefined) declared.push(event.projectStage);
  for (const stage of declared) {
    if (allSequenceStages.has(stage) || PROJECT_TERMINAL_STAGES.has(stage)) continue;
    error(
      `事件 ${event.id} 声明的阶段 ${stage} 没有任何课题模板会经过;拼错了?`,
    );
  }
}

// ---------- 规则 28–32:课程系统与本科纪律(TECH 7.1) ----------

const courses = contentPack.courses ?? [];
checkUnique('course', courses.map(c => c.id));

/** 只有这两门"大山"允许有期末小测(规则 30) */
const COURSES_WITH_FINAL_EXAM = new Set(['crs_stats', 'crs_exp']);
const courseExamIds = new Set((contentPack.courseExamBank ?? []).map(q => q.id));

// 所有条件里读到的 flag(任何形式),用来判断能力标签有没有人读
const allReadFlags = new Set<string>();
for (const { condition } of allConditionSources()) {
  visitCondition(condition, c => {
    if ('flag' in c) allReadFlags.add(c.flag);
  });
}

for (const course of courses) {
  if (course.year < 1 || course.year > 4) error(`course ${course.id} has invalid year: ${course.year}`);

  // 规则 28:能力标签必须被读。课程系统的全部意义就在这里,所以单独报。
  if (course.masteryFlag !== undefined) {
    if (!course.masteryFlag.startsWith('mastered_')) {
      error(`course ${course.id} masteryFlag must start with "mastered_": ${course.masteryFlag}`);
    }
    if (!allReadFlags.has(course.masteryFlag)) {
      error(
        `能力标签 ${course.masteryFlag}(课程 ${course.id})没有任何条件读它——` +
          `课程系统的意义就是"决定你后面听不听得懂",没人读的标签等于这门课白判定了`,
      );
    }
  }

  // 规则 30:两座大山才有小测。防"每门课都考一道"的蔓延。
  if (course.finalExam !== undefined) {
    if (!COURSES_WITH_FINAL_EXAM.has(course.id)) {
      error(
        `只有心理统计与实验心理学允许有期末小测,而 ${course.id} 声明了 finalExam` +
          `(把仪式感留给最重要的两门课,不拖节奏)`,
      );
    }
    if (course.finalExam.questionIds.length === 0) {
      error(`course ${course.id} has an empty finalExam.questionIds`);
    }
    for (const qid of course.finalExam.questionIds) {
      if (!courseExamIds.has(qid)) error(`course ${course.id} references missing exam question: ${qid}`);
    }
  }

  for (const tier of ['mastered', 'passed', 'failed'] as const) {
    if (course.outcomes[tier].length === 0) {
      error(`course ${course.id} has no effects for tier ${tier}`);
    }
  }
}

// 规则 29:"假装听懂"选项必须成对。**不允许出现"没学通就没得选"的事件**——
// 现实里那些人也在做决定,而且有些人做得还不错。
/**
 * 这个条件是不是**必然要求**某个 flag。
 *
 * `any` 里的分支**不算必然要求**——那是"几条路之一",没有它照样可能满足。
 * (跟引擎的 `requiredTraitLabel` 同一套语义。)
 *
 * 一开始把 `any` 也算进来了,结果规则 29 冤枉了一个"会 Python **或** 学通实验心理学
 * **或** 理学院"的选项,要求它给出一个"没学通实验心理学"的对应选项——
 * 而那个选项本来就不是靠实验心理学门控的。
 */
function requiresFlagPositively(cond: Condition | undefined, flag: string): boolean {
  if (!cond) return false;
  if ('flag' in cond) return cond.flag === flag && (cond.equals === undefined || cond.equals === true);
  if ('all' in cond) return cond.all.some(c => requiresFlagPositively(c, flag));
  return false;
}
function forbidsFlag(cond: Condition | undefined, flag: string): boolean {
  if (!cond) return false;
  if ('not' in cond) {
    const inner = cond.not;
    return typeof inner === 'object' && 'flag' in inner && inner.flag === flag;
  }
  if ('all' in cond) return cond.all.some(c => forbidsFlag(c, flag));
  if ('any' in cond) return cond.any.some(c => forbidsFlag(c, flag));
  return false;
}
const masteryFlags = new Set(
  courses.map(c => c.masteryFlag).filter((f): f is string => f !== undefined),
);
for (const event of contentPack.events) {
  for (const flag of masteryFlags) {
    const gated = event.choices.filter(choice => requiresFlagPositively(choice.visibleIf, flag));
    if (gated.length === 0) continue;
    const hasCounterpart = event.choices.some(choice => forbidsFlag(choice.visibleIf, flag));
    if (!hasCounterpart) {
      error(
        `事件 ${event.id} 用 ${flag} 门控了选项,但没有 not(${flag}) 的对应选项——` +
          `"点头,假装听懂了"必须一直存在、一直可用,而且不带嘲讽`,
      );
    }
  }
}

// 规则 32:本科危机事件全局唯一。不进变体池、不做变体。
for (const event of contentPack.events) {
  if (event.category !== 'crisis') continue;
  if (event.once === false) error(`危机事件不能可重复触发: ${event.id}`);
  if (event.variantGroup !== undefined) {
    error(`危机事件不得进变体池(全局唯一一次): ${event.id}`);
  }
}

// 规则 24:mandatory 时代节点必须是 ≥3 个成员的变体池,而且按**处境**区分而不是靠 chance。
// 这条从写第一版起就要遵守——事后拆变体池的成本是当初就那么写的三到五倍(前作补了九轮)。
const variantGroupMembers = new Map<string, string[]>();
for (const event of contentPack.events) {
  if (!event.variantGroup) continue;
  variantGroupMembers.set(event.variantGroup, [
    ...(variantGroupMembers.get(event.variantGroup) ?? []),
    event.id,
  ]);
}
for (const [group, members] of variantGroupMembers) {
  if (members.length < 3) {
    error(`变体池 ${group} 只有 ${members.length} 个成员(要求 ≥3): ${members.join(', ')}`);
  }
}
for (const event of contentPack.events) {
  if (event.category !== 'era' || !event.mandatory) continue;
  if (!event.variantGroup) {
    error(`mandatory 时代节点必须属于一个变体池: ${event.id}`);
  }
  // 靠 chance 分流不算"按处境区分":那样两局之间的差异只是随机数,玩家读不出因果
  let usesChance = false;
  visitCondition(event.trigger, c => {
    if ('chance' in c) usesChance = true;
  });
  if (usesChance) {
    error(`时代节点变体不得用 chance 分流(必须按处境):${event.id}`);
  }
}

// ---------- 规则 3:危机内容规范(GAME_DESIGN 第六节) ----------
// 危机事件里必须始终存在一条"照规程走"的路,而且走这条路不能整体吃亏。
// 这一条守的是内容伦理而不是平衡:如果规范操作在数值上是亏的,游戏就在教人别按规范做。
for (const event of contentPack.events) {
  if (event.category !== 'crisis') continue;
  const protocolChoices = event.choices.filter(choice =>
    choice.outcomes.some(outcome => outcome.outcomeTag === 'protocol'),
  );
  if (protocolChoices.length === 0) {
    error(`危机事件缺少 outcomeTag: 'protocol' 的选项(必须始终有一条照规程走的路): ${event.id}`);
    continue;
  }
  for (const choice of protocolChoices) {
    // 该选项所有 outcome 的属性变化按权重求期望,整体为负 → error
    const totalWeight = choice.outcomes.reduce((sum, o) => sum + o.weight, 0) || 1;
    let expected = 0;
    for (const outcome of choice.outcomes) {
      let delta = 0;
      for (const effect of outcome.effects) {
        if ('stats' in effect) {
          for (const [key, value] of Object.entries(effect.stats)) {
            // 钱不参与:规程操作花钱是合理的,不该因此被判成"亏"
            if (key !== 'money' && typeof value === 'number') delta += value;
          }
        }
      }
      expected += (outcome.weight / totalWeight) * delta;
    }
    if (expected < 0) {
      error(
        `危机事件的规程选项数值期望为负(${expected.toFixed(1)}),等于在教玩家别按规范做: ${event.id}.${choice.id}`,
      );
    }
  }
}

for (const event of contentPack.events) {
  const surface = `${event.title} ${event.text}`;
  for (const rule of MUTEX_TEXT_RULES) {
    if (rule.pattern.test(surface) && !rule.ok(event.trigger)) {
      error(`互斥门控缺失(${rule.label}): ${event.id}`);
    }
  }
}

/**
 * 领域注册表。院校的 `domains` 和玩家的 `domain_*` flag 必须用同一套词——
 * 拼错一个词的后果是那所学校对任何人都不匹配,而这不会报错,只会让它悄悄变冷门。
 */
const DOMAIN_REGISTRY = new Set([
  'domain_cognition', 'domain_cogneuro', 'domain_social', 'domain_clinical',
  'domain_development', 'domain_education', 'domain_psychometrics', 'domain_health',
]);

// ---------- 规则 9–15:真实素材层(TECH 7.1 / GAME_DESIGN 十九节) ----------
//
// 这七条守的是**内容真实性**,不是数据完整性。它们能拦住的错误有一个共同点:
// **不会崩、不会红、玩家也不会立刻发现**——但它们一旦发布出去,伤的是真实的人或真实的文献。

{
  const institutions = contentPack.institutions ?? [];
  const instById = new Map(institutions.map(i => [i.id, i]));

  // 规则 9:引用必须已核对。**任何 verified !== true 都让构建失败。**
  // GAME_DESIGN 二十二节第 10 条:把真实文献的结论写反是这个游戏最不能犯的错——
  // 一个讲科研诚信的游戏如果自己把文献说错了,它讲的每一句话都不成立。
  const ledgerPath = new URL('../../content/src/citations/LEDGER.md', import.meta.url);
  let ledger = '';
  try {
    ledger = readFileSync(ledgerPath, 'utf8');
  } catch {
    error('规则 9:找不到核对台账 content/src/citations/LEDGER.md');
  }
  for (const cit of contentPack.citations ?? []) {
    if (cit.verified !== true) error(`规则 9:引用未核对 ${cit.id}(verified 必须为 true 才能进构建)`);
    // 台账是 verified 的凭据。没有台账行,verified 就只是一个谁都能敲上去的布尔值。
    if (ledger && !ledger.includes(cit.id)) {
      error(`规则 9:引用 ${cit.id} 在 LEDGER.md 里没有核对条目`);
    }
  }

  // 规则 10:真实研究者姓名只允许出现在 Citation 结构里。
  //
  // 导师六原型里有"边界感差的"(挂名、抢一作),把它安在真实可查的个体身上是诽谤,
  // 免责声明豁免不了。**这条对所有原型一视同仁**——只对负面原型虚构等于反向指认。
  const blocklist = contentPack.researcherNameBlocklist ?? [];
  const allowlist = contentPack.textbookAuthorAllowlist ?? [];
  const PERSONIFY = ['说', '告诉', '让你', '问你', '看着你', '叫住', '拍了拍', '皱眉', '点头', '回复'];
  function scanProse(owner: string, text: string): void {
    for (const name of blocklist) {
      if (text.includes(name)) error(`规则 10:正文出现真实研究者姓名「${name}」: ${owner}`);
    }
    // 白名单里的名字可以当书名用,**但不许当人物**:
    // 指一本书可以,让那本书的作者在你的故事里开口不行。
    for (const name of allowlist) {
      let from = text.indexOf(name);
      while (from >= 0) {
        const after = text.slice(from + name.length, from + name.length + 6);
        if (PERSONIFY.some(marker => after.includes(marker))) {
          error(`规则 10:真实人名「${name}」被当成人物使用(后接「${after.trim()}」): ${owner}`);
        }
        from = text.indexOf(name, from + 1);
      }
    }
  }
  for (const ev of contentPack.events) {
    scanProse(`event ${ev.id}`, `${ev.title} ${ev.text}`);
    for (const v of ev.presentationVariants ?? []) scanProse(`event ${ev.id} variant`, `${v.title} ${v.text}`);
    for (const c of ev.choices) for (const o of c.outcomes) scanProse(`event ${ev.id} outcome`, o.text);
  }
  for (const end of contentPack.endings) scanProse(`ending ${end.id}`, `${end.title} ${end.text}`);

  // 规则 11:导师必须虚构 + 必须挂真实建制。两条一起才是 19.2 的完整落地。
  for (const adv of contentPack.advisors ?? []) {
    for (const name of [...blocklist, ...allowlist]) {
      if (adv.name.includes(name)) error(`规则 11:导师姓名命中真实人名「${name}」: ${adv.id}`);
    }
    if (adv.institutionId !== undefined && !instById.has(adv.institutionId)) {
      error(`规则 11:导师 ${adv.id} 的 institutionId 指向不存在的机构: ${adv.institutionId}`);
    }
  }
  for (const npc of contentPack.npcs) {
    for (const name of [...blocklist, ...allowlist]) {
      if (npc.name.includes(name)) error(`规则 11:NPC 姓名命中真实人名「${name}」: ${npc.id}`);
    }
  }

  // 规则 12:游戏化条款声明必须存在且非空。
  // 这不是免责套话,是 19.1 那条硬约束("待遇条款是游戏化近似")的机械保障。
  if (institutions.length > 0 && !(contentPack.gameifiedTermsNotice ?? '').trim()) {
    error('规则 12:有院校表却没有 gameifiedTermsNotice(GRAD_APPLY 顶部的游戏化声明)');
  }

  // 规则 13:声明了 GRAD_APPLY 步骤的阶段必须写 gradApplyKind。
  // 不写的话引擎会静默跳过这一屏——玩家不会看到申请,而且没有任何报错。
  for (const phase of contentPack.timeline) {
    if (phase.kind !== 'flow' || !phase.steps.includes('GRAD_APPLY')) continue;
    if (!phase.gradApplyKind) error(`规则 13:阶段 ${phase.id} 有 GRAD_APPLY 步骤但没写 gradApplyKind`);
  }

  // 规则 14:院校数据完整性 + 每个 Position 都挂在真实机构上。
  for (const inst of institutions) {
    if (inst.domains.length === 0) error(`规则 14:机构 ${inst.id} 没有 domains,永远匹配不上任何玩家方向`);
    if (inst.admits.length === 0) error(`规则 14:机构 ${inst.id} 的 admits 为空,它不会出现在任何清单里`);
    for (const d of inst.domains) {
      if (!DOMAIN_REGISTRY.has(d)) error(`规则 14:机构 ${inst.id} 的 domain 不在注册表里: ${d}`);
    }
  }
  for (const pos of contentPack.positions ?? []) {
    if (!instById.has(pos.institutionId)) {
      error(`规则 14:职位 ${pos.id} 指向不存在的机构: ${pos.institutionId}`);
    }
  }

  // 规则 15:清单规模下限。每种 kind 至少 8 所,否则"选择"退化成"没得选"。
  const KINDS = ['master', 'phd', 'phd_abroad', 'postdoc'] as const;
  const declared = new Set(
    contentPack.timeline.flatMap(p => (p.kind === 'flow' && p.gradApplyKind ? [p.gradApplyKind] : [])),
  );
  for (const kind of KINDS) {
    if (!declared.has(kind)) continue; // 还没接入的 kind(博后是 M5)不查
    const n = institutions.filter(i => i.admits.includes(kind)).length;
    if (n < 8) error(`规则 15:${kind} 的可选院校只有 ${n} 所(<8),清单选择退化成没得选`);
  }
  const positions = contentPack.positions ?? [];
  if (positions.length > 0) {
    const cn = positions.filter(p => instById.get(p.institutionId)?.region === 'cn').length;
    const overseas = positions.length - cn;
    if (positions.length < 20) error(`规则 15:职位只有 ${positions.length} 个(<20)`);
    if (cn < 8) error(`规则 15:国内职位只有 ${cn} 个(<8)`);
    if (overseas < 8) error(`规则 15:海外职位只有 ${overseas} 个(<8)`);
  }
}

const errors = issues.filter(i => i.level === 'error');
const warnings = issues.filter(i => i.level === 'warn');

console.log(`校验内容包 ${contentPack.meta.id}@${contentPack.meta.version}`);
console.log(`事件 ${contentPack.events.length}, 结局 ${contentPack.endings.length}, NPC ${contentPack.npcs.length}, 题目 ${contentPack.examBank.length}, 收入规则 ${contentPack.incomes.length}, 特质 ${contentPack.traits.length}, 特质成长 ${contentPack.traitEvolutions.length}, 人生目标 ${contentPack.lifeGoals.length}`);
for (const issue of issues) {
  console.log(`${issue.level === 'error' ? 'ERROR' : 'WARN'} ${issue.message}`);
}
console.log(`\n完成: ${errors.length} errors, ${warnings.length} warnings`);

if (errors.length > 0) process.exit(1);
