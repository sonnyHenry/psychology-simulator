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

/** 去掉注释再做源码级检查。规则 19/36 都要用:**注释里必须能写出被禁的那个词** */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
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
  // **职位的硬门槛也是条件。** 漏了这一处的代价量过:`requires` 读了一个
  // 从来没有人写过的 flag(`paper_count`),于是清单恒为空、求职季"一个都没有"
  // 率 94.7%,而所有检查都是绿的——因为规则根本没看这里。
  for (const position of contentPack.positions ?? []) {
    yield { owner: `position ${position.id} requires`, condition: position.requires };
  }
  for (const rumor of contentPack.rumors ?? []) {
    yield { owner: `rumor ${rumor.id}`, condition: rumor.availableWhen };
  }
  for (const option of contentPack.advisorSwitchOptions ?? []) {
    yield { owner: `advisorSwitch ${option.id}`, condition: option.availableWhen };
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
/** 引擎按基础塌方年份排进来的事件。id 由 `collapseEventId` 约定 */
const collapseEventIds = new Set(
  (contentPack.foundations ?? [])
    .filter(f => f.replicationFailure && f.assignable !== false)
    .map(f => `ev_collapse_${f.id.replace(/^fnd_/, '')}`),
);

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

// ---------- M7 量表校验 ----------
// 量表最危险的失效不是类型错，而是“看起来像评估”却没有边界提示，或计分带有空洞。
checkUnique('inventory', (contentPack.inventories ?? []).map(inventory => inventory.id));
if ((contentPack.inventories ?? []).length < 4) {
  error(`M7 requires at least 4 inventories, got ${(contentPack.inventories ?? []).length}`);
}
const inventoryIds = new Set((contentPack.inventories ?? []).map(inventory => inventory.id));
for (const inventory of contentPack.inventories ?? []) {
  if (inventory.items.length < 5 || inventory.items.length > 7) {
    error(`inventory ${inventory.id} must have 5–7 items, got ${inventory.items.length}`);
  }
  if (!inventory.disclaimer.includes('诊断') || !inventory.disclaimer.includes('评估')) {
    error(`inventory ${inventory.id} disclaimer must explicitly say it is not diagnosis or assessment`);
  }
  if (inventory.discrepancy.length < 3) {
    error(`inventory ${inventory.id} needs at least 3 discrepancy lines`);
  }
  let maxScore = 0;
  for (const [index, item] of inventory.items.entries()) {
    if (!item.text.trim()) error(`inventory ${inventory.id} item ${index} has empty text`);
    if (item.options.length < 2) error(`inventory ${inventory.id} item ${index} has fewer than 2 options`);
    if (item.options.some(option => !option.text.trim() || !Number.isFinite(option.score))) {
      error(`inventory ${inventory.id} item ${index} has invalid option`);
    }
    maxScore += Math.max(0, ...item.options.map(option => option.score));
  }
  const bands = [...inventory.bands].sort((a, b) => a.min - b.min);
  if (bands.length === 0 || bands[0]?.min !== 0 || (bands[bands.length - 1]?.max ?? -1) < maxScore) {
    error(`inventory ${inventory.id} score bands do not cover 0–${maxScore}`);
  }
  for (let i = 1; i < bands.length; i++) {
    if (bands[i]!.min > bands[i - 1]!.max + 1) {
      error(`inventory ${inventory.id} score bands have a gap before ${bands[i]!.min}`);
    }
  }
}

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
    // 管线阶段事件由调度器按课题当前阶段挑,不进普通池;个案阶段事件同理(②'')
    event.projectStage === undefined &&
    event.caseStatus === undefined &&
    !isAdvisorStageEvent &&
    !scheduledEventIds.has(event.id) &&
    // 塌方事件由 `systems/foundation.ts` 在真实历史年份 schedule 进来,
    // 内容里没有任何 `{ schedule }` 指向它们——**引擎排的事件也算有出处。**
    !collapseEventIds.has(event.id) &&
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
          'setStat' in e ||
          // 量表 effect 不是静默 flag：它会立刻进入一个可见的逐题屏，
          // 完成后由 inventory system 展示偏差文案并给小幅状态修复。
          'startInventory' in e,
      );
      if (!hasVisibleStat) {
        error(`outcome has no visible stat change (选完不展示加减分): ${event.id}.${choice.id}`);
      }
      visitCondition(outcome.condition, cond => {
        if ('fn' in cond && !fnIds.has(cond.fn)) error(`outcome ${event.id}.${choice.id} references missing condition fn: ${cond.fn}`);
      });
      visitEffects(outcome.effects, effect => {
        if ('startInventory' in effect && !inventoryIds.has(effect.startInventory)) {
          error(`event ${event.id}.${choice.id} starts unknown inventory: ${effect.startInventory}`);
        }
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
 * `clinical_hours` / `supervision_hours` 由 `systems/case.ts` 在年度结算里累积
 * (会谈数与督导格数),内容侧只读——写的那一端在引擎里。
 * `students_graduated` / `service_load` / `teaching_load` 由内容写、由
 * `systems/tenure.ts` 的首考清单读——**读的那一端在引擎里**,内容侧扫不到。
 */
const ENGINE_HANDLED_NUMERIC_FLAGS = new Set([
  'retake_slots',
  'clinical_hours',
  'supervision_hours',
  'students_graduated',
  'service_load',
  'teaching_load',
]);

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

// ---------- 规则 2:个案状态图无死锁(TECH 7.1) ----------
//
// 个案的状态机在**引擎**里(与课题相反,课题的序列在模板里),所以这里不查出口——
// 引擎保证任何个案都会走到终态。会静默失效的是另外三样,和课题那边的教训一一对应:
//
// 1. **某个非终态一个阶段事件都没有** = 个案在那一站的整年没有故事,
//    只剩年度回顾页一行摘要(对应"817 次伦理审查、0 次收数据")。
// 2. **`caseStatus` 写了终态或拼错的状态** = 这个事件永远不会被调度器挑中,
//    而且不报错(对应课题那条"读了没有模板会经过的阶段")。
// 3. **取向 flag 拼错** = 那个取向的匹配加成永远不生效,个案只是"莫名慢"(规则 7 的同类)。
{
  const CASE_STATUSES = new Set(['intake', 'working', 'plateau', 'terminating', 'dropped', 'completed', 'referred']);
  const CASE_TERMINAL = new Set(['dropped', 'completed', 'referred']);
  const CASE_ACTIVE = ['intake', 'working', 'plateau', 'terminating'] as const;
  const ORIENTATION_REGISTRY = new Set([
    'orientation_cbt',
    'orientation_dynamic',
    'orientation_humanistic',
    'orientation_integrative',
  ]);

  const templates = contentPack.caseTemplates ?? [];
  checkUnique('caseTemplate', templates.map(t => t.id));
  for (const template of templates) {
    if (!template.label.trim()) error(`个案模板缺少 label: ${template.id}`);
    if (template.presentingIssues.length === 0) {
      error(`个案模板没有主诉候选: ${template.id}`);
    }
    for (const fit of template.orientationFit) {
      if (!ORIENTATION_REGISTRY.has(fit)) {
        error(`个案模板 ${template.id} 的取向 ${fit} 不在注册表内;拼错会让匹配加成永远不生效`);
      }
    }
  }

  // 内容里 setFlag 的取向也要对上注册表(引擎按 `orientation_` 前缀读它们)
  for (const { owner, effects } of allEffectSources()) {
    visitEffects(effects, effect => {
      if ('setFlag' in effect && effect.setFlag.startsWith('orientation_') && !ORIENTATION_REGISTRY.has(effect.setFlag)) {
        error(`取向 flag 不在注册表内: ${effect.setFlag}(${owner})`);
      }
    });
  }

  if (templates.length > 0) {
    // 每个非终态至少一个阶段事件。个案不像课题分领域,所以只查全局覆盖。
    for (const status of CASE_ACTIVE) {
      const covered = contentPack.events.some(event => event.caseStatus === status);
      if (!covered) {
        error(
          `个案状态无内容:状态 ${status} 一个阶段事件都没有` +
            `(个案在这一站的整年只剩年度回顾页的一行摘要)`,
        );
      }
    }
  }

  for (const event of contentPack.events) {
    if (event.caseStatus === undefined) continue;
    if (!CASE_STATUSES.has(event.caseStatus)) {
      error(`事件 ${event.id} 声明的个案状态 ${event.caseStatus} 不存在;拼错了?`);
    } else if (CASE_TERMINAL.has(event.caseStatus)) {
      error(
        `事件 ${event.id} 把阶段事件挂在了终态 ${event.caseStatus} 上` +
          `(调度器只给还在谈的个案挑事件,这个事件永远不会出现)`,
      );
    }
  }

  // `{ caseCount: { status } }` 的状态引用也要合法——条件恒假连 simulate 都看不出异常
  for (const { owner, condition } of allConditionSources()) {
    visitCondition(condition, cond => {
      if ('caseCount' in cond && cond.caseCount.status !== undefined && !CASE_STATUSES.has(cond.caseCount.status)) {
        error(`caseCount 引用了不存在的个案状态 ${cond.caseCount.status}(${owner})`);
      }
    });
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

// ---------- 规则 16–22:社会层(GAME_DESIGN 十三节 / TECH 7.1) ----------
//
// 这七条守的是三个新机制**不退化**:竞争者不变成固定难度曲线、人情账不变成只进不出的数字、
// 情报不变成攻略。三种退化都不会崩、不会红,只会让机制悄悄变成装饰。

{
  // 规则 16:五个交汇点齐全,而且每个都有"他领先"与"你领先"两个版本。
  //
  // **同一件事在这两种处境下根本不是同一件事**:一作之争在你落后时是屈辱,
  // 在你领先时是你手上有一张可以让出去的牌。只写一个版本 = 这一幕只有一种读法。
  const ENCOUNTERS = ['authorship', 'review', 'conference', 'struggle', 'same_position'];
  const encounterEvents = contentPack.events.filter(event =>
    event.choices.some(choice =>
      choice.outcomes.some(outcome =>
        outcome.effects.some(
          effect => 'rival' in effect && effect.rival.op === 'encounter',
        ),
      ),
    ),
  );
  const marksEncounter = (event: (typeof encounterEvents)[number], id: string): boolean =>
    event.choices.some(choice =>
      choice.outcomes.some(outcome =>
        outcome.effects.some(
          effect => 'rival' in effect && effect.rival.op === 'encounter' && effect.rival.id === id,
        ),
      ),
    );
  /** 这个事件的 trigger 里必然要求 `aheadOfPlayer === 期望值` */
  const requiresAhead = (cond: Condition | undefined, expected: boolean): boolean => {
    let hit = false;
    visitCondition(cond, c => {
      if ('rival' in c && c.rival.aheadOfPlayer === expected) hit = true;
    });
    return hit;
  };
  for (const id of ENCOUNTERS) {
    const forId = encounterEvents.filter(event => marksEncounter(event, id));
    if (forId.length === 0) {
      error(`规则 16:交汇点「${id}」没有任何内容事件`);
      continue;
    }
    if (!forId.some(event => requiresAhead(event.trigger, true))) {
      error(`规则 16:交汇点「${id}」缺"他领先"的版本(trigger 里没有 aheadOfPlayer: true)`);
    }
    if (!forId.some(event => requiresAhead(event.trigger, false))) {
      error(`规则 16:交汇点「${id}」缺"你领先"的版本(trigger 里没有 aheadOfPlayer: false)`);
    }
  }

  // 规则 16b:`momentum` 必须真的能被玩家行为改。
  // 不能被修正的对手是**一条固定难度曲线,不是人**——13.1 第一条设计约束就落空了。
  const nudgesMomentum = [...allEffectsInPack()].some(
    effect => 'rival' in effect && effect.rival.op === 'nudge' && effect.rival.momentum !== undefined,
  );
  if ((contentPack.rivalArchetypes ?? []).length > 0 && !nudgesMomentum) {
    error('规则 16:没有任何内容改过竞争者的 momentum,他退化成了一条固定难度曲线');
  }

  // 规则 17:人情必须能兑现。**只能欠不能还的账是死机制**(与规则 4 同源)。
  {
    const written = new Set<string>();
    const settled = new Set<string>();
    for (const effect of allEffectsInPack()) {
      if (!('favor' in effect)) continue;
      if (effect.favor.op === 'add') written.add(effect.favor.direction);
      else if (effect.favor.op === 'settle') {
        // 不写 direction 的 settle 两个方向都能结
        if (effect.favor.direction === undefined) {
          settled.add('owed');
          settled.add('owing');
        } else settled.add(effect.favor.direction);
      }
    }
    for (const direction of written) {
      if (!settled.has(direction)) {
        error(`规则 17:方向为 ${direction} 的人情有人记、没有人兑现——只能欠不能还的账是死机制`);
      }
    }
  }

  // 规则 18:`RumorDef` 的真伪配比守在 40%–70%。
  //
  // **全真 = 情报变成攻略**(玩家照着抄);**全假 = 玩家两局之后学会无视这个入口**。
  // 落在中间,玩家才会去做那件现实中大家都在做的事:打听三个人,取交集。
  {
    const byTopic = new Map<string, { total: number; accurate: number }>();
    for (const rumor of contentPack.rumors ?? []) {
      const row = byTopic.get(rumor.topic) ?? { total: 0, accurate: 0 };
      row.total += 1;
      if (rumor.accurate) row.accurate += 1;
      byTopic.set(rumor.topic, row);
    }
    for (const [topic, row] of byTopic) {
      // 单条的话题没有"配比"可言,不判——判了只会逼内容凑数
      if (row.total < 2) continue;
      const ratio = row.accurate / row.total;
      if (ratio < 0.4 || ratio > 0.7) {
        error(
          `规则 18:话题「${topic}」的情报真伪配比 ${(ratio * 100).toFixed(0)}% 超出 40%–70%(${row.accurate}/${row.total})`,
        );
      }
    }
  }

  // 规则 19:`accurate` 不得泄漏。**这是 13.3 全部设计的支点,必须机械守住。**
  //
  // 静态检查 `systems/rumor.ts`:除了明确标注"只给引擎和 simulate 统计用"的两个函数,
  // 没有任何地方把 `accurate` 放进出参。照规则 36 的写法。
  {
    const source = stripComments(
      readFileSync(new URL('../../core/src/systems/rumor.ts', import.meta.url), 'utf-8'),
    );
    // `AskableRumor` 是摆到玩家面前的那个类型,它必须是残缺的——缺的那一块就是支点
    const askable = source.match(/export interface AskableRumor \{[^}]*\}/)?.[0] ?? '';
    if (askable.includes('accurate')) {
      error('规则 19:AskableRumor 里出现了 accurate——可靠度只能由玩家自己推断');
    }
    // `askRumor` 的返回类型里也不许有
    const askFn = source.match(/export function askRumor\([\s\S]*?\n\) \{/)?.[0] ?? '';
    if (askFn.includes('accurate')) {
      error('规则 19:askRumor 的返回类型里出现了 accurate');
    }
    // **注释里要能写这个词。** 第一版直接扫全文,结果被
    // "`accurate` 不在这里,也不在任何地方"这句注释判红了——
    // 一条会被自己的说明文字触发的规则,下一个人只会把它删掉。
    const viewSource = stripComments(
      readFileSync(new URL('../../core/src/types/view.ts', import.meta.url), 'utf-8'),
    );
    if (/accurate/.test(viewSource)) {
      error('规则 19:ViewModel 类型里出现了 accurate');
    }
  }

  // 规则 20:Drama 事件"两边都有道理"。
  //
  // `category: 'drama'` 的事件,**每个 choice 的数值变化必须有正有负**。
  // 这是 14.1 第 1 条的机械化版本:如果一个选项明显正确,它就不是 drama,是道德测试题。
  for (const event of contentPack.events) {
    if (event.category !== 'drama') continue;
    for (const choice of event.choices) {
      let hasUp = false;
      let hasDown = false;
      for (const outcome of choice.outcomes) {
        for (const effect of outcome.effects) {
          if (!('stats' in effect)) continue;
          for (const [key, value] of Object.entries(effect.stats)) {
            if (typeof value !== 'number' || value === 0) continue;
            // **钱的处理是不对称的**:挣到钱算一份好处(接下那个指标,收入确实涨了),
            // 但花钱**不算代价**——花钱办事是合理的,不该因此被判成"这个选项有代价"。
            // 对称处理会同时冤枉两类事件:一律排除会把"挣钱但伤身"判成全是代价,
            // 一律计入会把"花钱买个安心"判成两边都有道理。
            if (key === 'money') {
              if (value > 0) hasUp = true;
              continue;
            }
            if (value > 0) hasUp = true;
            else hasDown = true;
          }
        }
      }
      if (!hasUp || !hasDown) {
        error(
          `规则 20:drama 事件的选项不是"两边都有道理"(${!hasUp ? '全是代价' : '纯优势'}): ${event.id}.${choice.id}`,
        );
      }
    }
  }

  // 规则 21:黑天鹅必须有处置空间。
  // ≥2 个真实可行的选项,而且**不许直接 triggerEnding**——
  // 一记闷棍不是黑天鹅,是作者在替玩家做决定(14.4 第 2、3 条)。
  for (const event of contentPack.events) {
    if (event.category !== 'blackswan') continue;
    if (event.choices.length < 2) {
      error(`规则 21:黑天鹅事件只有 ${event.choices.length} 个选项(要求 ≥2): ${event.id}`);
    }
    for (const choice of event.choices) {
      for (const outcome of choice.outcomes) {
        if (outcome.effects.some(effect => 'triggerEnding' in effect)) {
          error(`规则 21:黑天鹅事件不得直接触发结局: ${event.id}.${choice.id}`);
        }
      }
    }
  }

  // 规则 22:换导师的窗口必须一直开着。
  //
  // 至少有一个 `costTier: 'late'` 的入口存在,否则"**代价极高但始终可行**"
  // 就变成了"后期不可行"——而那两句话是完全不同的设计。
  {
    const switchOptions = (contentPack.advisorSwitchOptions ?? []);
    if (switchOptions.length > 0 && !switchOptions.some(option => option.costTier === 'late')) {
      error('规则 22:换导师没有 late 档的入口,"代价极高但始终可行"变成了"后期不可行"');
    }
  }
}

// ---------- 规则 38:求职季(GAME_DESIGN 九节 / TECH 7.1) ----------
{
  // 规则 38:`marketTightness` 不得进 ViewModel。
  //
  // 这是 9.3 第一条("'一个都没有'必须是高概率的真实结果")的实现方式:
  // 同样的资本值在紧年份和松年份结果不同,而玩家**只能事后从"今年大家都不好找"
  // 里推断**。一旦摆到屏上,"要不要再等一年"就从一次赌博变成一道算术题。
  //
  // 与规则 19(`accurate`)、规则 36(`quality`/`alliance`/`favor`)同一族:
  // **这个游戏里所有"玩家不该看见的数"都由一条静态检查守着。**
  const viewSource = stripComments(
    readFileSync(new URL('../../core/src/types/view.ts', import.meta.url), 'utf-8'),
  );
  if (/marketTightness/.test(viewSource)) {
    error('规则 38:ViewModel 类型里出现了 marketTightness——市场松紧只能事后推断');
  }
  const jmSource = stripComments(
    readFileSync(new URL('../../core/src/systems/jobmarket.ts', import.meta.url), 'utf-8'),
  );
  // 构造 ViewModel 的那个函数里不许读它(它只该被概率函数读)
  const buildFn = jmSource.match(/export function buildJobMarketView[\s\S]*?\n\}/)?.[0] ?? '';
  if (/marketTightness/.test(buildFn)) {
    error('规则 38:buildJobMarketView 里读了 marketTightness');
  }
}

// ---------- 规则 33–37:工作台(GAME_DESIGN 四节、七节 / TECH 7.1) ----------
//
// 这五条守的是**工作台不把已经付过学费的规矩重新破掉**:明码标价、两份数据不许说两件事、
// 原型不许被间接指认、精确数值不许穿过 ViewModel、两种动作不许混成一条通路。

{
  // 规则 33:每个投入项必须有非空 `payoff`。
  // 借来的那一条(GAME_DESIGN 4.6):**不写清楚不是含蓄,是让玩家瞎猜。**
  for (const item of contentPack.allocationItems ?? []) {
    if (!item.payoff || item.payoff.trim().length === 0) {
      error(`规则 33:投入项没写 payoff(这一格换来什么): ${item.id}`);
    }
  }

  // 规则 34:毕业指标的两种写法必须一致。
  // **两份数据说两件事,是这一行最容易写出来又最难发现的错**——文案说 2 篇、
  // 结构化说 3 篇的话,玩家照着文案攒,系统按结构化判,而且两边都不会报错。
  for (const inst of contentPack.institutions ?? []) {
    const admission = inst.gameified.admission;
    const bar = admission?.graduationBar;
    const req = admission?.graduationReq;
    if (Boolean(bar) !== Boolean(req)) {
      error(`规则 34:${inst.id} 的 graduationBar 与 graduationReq 必须要么都有要么都无`);
      continue;
    }
    if (!bar || !req) continue;
    if (!bar.includes(String(req.papers))) {
      error(`规则 34:${inst.id} 的 graduationBar 里没有出现篇数 ${req.papers}:「${bar}」`);
    }
    if (req.topTier !== undefined && !bar.includes(String(req.topTier))) {
      error(`规则 34:${inst.id} 的 graduationBar 里没有出现高档篇数 ${req.topTier}:「${bar}」`);
    }
    if (req.topTierLabel !== undefined && !bar.includes(req.topTierLabel)) {
      error(`规则 34:${inst.id} 的 graduationBar 里没有出现档位名「${req.topTierLabel}」:「${bar}」`);
    }
  }

  // 规则 35:原型的两条防泄漏检查(GAME_DESIGN 七节)。
  //
  // 配套沿用已有的"`archetype` 不进 ViewModel"单测——**三条缺一不可:
  // 一条防直接泄漏,两条防间接指认。** 导师面板是 M4.6 新开的泄漏面:
  // 面板上那两行档位如果和原型一一对应,ViewModel 里不给 archetype 就白防了。
  const advisors = contentPack.advisors ?? [];
  if (advisors.length > 0) {
    // ① 可及性档位的映射必须多对一:三档里每一档至少落 2 个原型
    const byAvailability = new Map<string, string[]>();
    for (const advisor of advisors) {
      byAvailability.set(advisor.availability, [
        ...(byAvailability.get(advisor.availability) ?? []),
        advisor.archetype,
      ]);
    }
    for (const [availability, archetypes] of byAvailability) {
      if (archetypes.length < 2) {
        error(
          `规则 35:可及性档位「${availability}」只落了 ${archetypes.length} 个原型(${archetypes.join(', ')});一对一 = 玩家看一眼面板就知道抽到了谁`,
        );
      }
    }
    // ② 每个原型的「寻求指导」结果 ≥2 种,而且至少一种与另一个原型的某种结果同属一类
    const tagOwners = new Map<string, Set<string>>();
    for (const advisor of advisors) {
      for (const response of advisor.consultResponses ?? []) {
        tagOwners.set(
          response.outcomeTag,
          (tagOwners.get(response.outcomeTag) ?? new Set()).add(advisor.id),
        );
      }
    }
    const eventIds = new Set(contentPack.events.map(ev => ev.id));
    for (const advisor of advisors) {
      const responses = advisor.consultResponses ?? [];
      if (responses.length < 2) {
        error(
          `规则 35:导师 ${advisor.id} 的「寻求指导」只有 ${responses.length} 种结果(要求 ≥2);一次问出结论,换导师窗口那个张力就没了`,
        );
      }
      for (const response of responses) {
        if (!eventIds.has(response.eventId)) {
          error(`规则 35:导师 ${advisor.id} 的 consultResponse ${response.id} 指向不存在的事件 ${response.eventId}`);
        }
      }
      const shared = responses.some(r => (tagOwners.get(r.outcomeTag)?.size ?? 0) >= 2);
      if (responses.length > 0 && !shared) {
        error(
          `规则 35:导师 ${advisor.id} 的结果没有一种与别的原型同属一类(outcomeTag 全是独有的),等于一问就露底`,
        );
      }
    }
  }

  // 规则 36:工作台不得泄漏精确数值。
  //
  // 照 M3.5 那条"不含 `"chance": 0.x`"的单测写法,**静态检查 `systems/desk.ts` 的源码**:
  // 聚合层里不许出现读 `quality` / `alliance` / `favor` 原始值再往外塞的写法。
  //
  // **这条规则与内容包无关**,所以它在夹具模式下照常运行,也没有内容侧的反例
  // (verify-validate 里对应一条说明)。查产出的那一半在 core 的单测里:
  // 「DESK 的 ViewModel 序列化后不含任何原始数值」。**两头都要**——
  // 静态检查抓"有人绕过了档位函数",单测抓"档位函数本身漏了一个字段"。
  {
    const deskSource = readFileSync(
      new URL('../../core/src/systems/desk.ts', import.meta.url),
      'utf-8',
    );
    // 允许的形态只有"喂给档位函数":qualityLabel(project.quality) / relationLabel(...favor)
    const leaks = [
      { field: 'quality', allowed: /qualityLabel\(\s*project\.quality\s*\)/ },
      { field: 'alliance', allowed: /$^/ },
      { field: 'favor', allowed: /relationLabel\(state\.advisor\.favor\)/ },
    ];
    for (const leak of leaks) {
      const uses = deskSource.match(new RegExp(`\\.${leak.field}\\b`, 'g')) ?? [];
      const allowedUses = deskSource.match(new RegExp(leak.allowed.source, 'g')) ?? [];
      if (uses.length > allowedUses.length) {
        error(
          `规则 36:systems/desk.ts 里读了 ${uses.length} 处 .${leak.field},但只有 ${allowedUses.length} 处是喂给档位函数的——原始数值不许穿过这一层`,
        );
      }
    }
  }

  // 规则 37:`DESK_ACTION` 不许花精力格。
  //
  // 花格数的一律走 `ALLOCATE`(4.4 那张分工表的机械保障)。这里查的是它的反面:
  // 挂在工作台面板上的投入项**必须**声明 `target`,否则它会掉进"桌面"那一堆里,
  // 而"投入挂在对象上"(4.2)那条设计就悄悄失效了——不报错,只是又变回一张表。
  const PANEL_ITEM_IDS = new Set([
    'alloc_advisor_consult',
    'alloc_advisor_work',
    'alloc_casework',
    'alloc_supervision',
    'alloc_personal_therapy',
  ]);
  for (const item of contentPack.allocationItems ?? []) {
    if (PANEL_ITEM_IDS.has(item.id) && item.target === undefined) {
      error(`规则 37:${item.id} 是面板动作,必须声明 target(挂到哪张卡片/哪个面板上)`);
    }
    if (item.target?.kind === 'project' && item.target.id === undefined) {
      // 课题投入项由引擎按活跃课题动态合成并写上 id;内容里手写一条没有 id 的
      // project target,意味着它会挂到"课题面板"上而那里没有这样的位置。
      error(`规则 37:${item.id} 的 target.kind 是 project 但没有 id`);
    }
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

  // 规则 12b:声明了 GRAD_APPLY 步骤的阶段必须写 gradApplyKind。
  // (TECH 的规则 13 是 Foundation 时间线一致性,见下——M3.5 时我把编号占错了。)
  // 不写的话引擎会静默跳过这一屏——玩家不会看到申请,而且没有任何报错。
  for (const phase of contentPack.timeline) {
    if (phase.kind !== 'flow' || !phase.steps.includes('GRAD_APPLY')) continue;
    if (!phase.gradApplyKind) error(`规则 12b:阶段 ${phase.id} 有 GRAD_APPLY 步骤但没写 gradApplyKind`);
  }


  // 规则 13:`Foundation` 时间线一致性(TECH 7.1)。
  //
  // 这一条守的是**这个机制会不会静默失效**。第一版的基础表里只有一条会塌(2015 年),
  // 而真课题 2019 年才开始——**它一次都不会触发**,和 M3.1 挖出的那两条死常量同类。
  // 所以这条规则不只查数据自洽,还查"它到底够不够得着玩家"。
  {
    const foundations = contentPack.foundations ?? [];
    const eventsById2 = new Map(contentPack.events.map(e => [e.id, e]));
    const GAME_YEARS: [number, number] = [2014, 2034];
    const REQUIRED_COLLAPSE_CHOICES = ['push_anyway', 'reframe', 'do_replication', 'abandon'];
    let assignableCollapsing = 0;

    for (const fnd of foundations) {
      for (const cit of [fnd.origin, fnd.replicationFailure?.citation]) {
        if (cit && cit.verified !== true) {
          error(`规则 13:基础 ${fnd.id} 引用了未核对的文献 ${cit.id}`);
        }
      }
      for (const d of fnd.domains) {
        if (!DOMAIN_REGISTRY.has(d)) error(`规则 13:基础 ${fnd.id} 的 domain 不在注册表里: ${d}`);
      }
      const failure = fnd.replicationFailure;
      if (!failure) continue;
      if (failure.year <= fnd.origin.year) {
        error(`规则 13:基础 ${fnd.id} 的重复失败年份(${failure.year})不晚于原始文献(${fnd.origin.year})`);
      }
      if (failure.year < GAME_YEARS[0] || failure.year > GAME_YEARS[1]) {
        warn(`规则 13:基础 ${fnd.id} 的塌方年份 ${failure.year} 在游戏时间线外,这条永远不会塌`);
      }
      // **不进分配池的基础不需要塌方事件**:它塌的时候玩家手上没有能被砸中的课题,
      // 位置是时代节点而不是"你的地基塌了"。写一个事件反而会造出永远不触发的内容。
      if (fnd.assignable === false) continue;
      assignableCollapsing += 1;
      const evId = `ev_collapse_${fnd.id.replace(/^fnd_/, '')}`;
      const ev = eventsById2.get(evId);
      if (!ev) {
        error(`规则 13:会塌的基础 ${fnd.id} 没有对应的塌方事件 ${evId}`);
        continue;
      }
      // 四个选项一个都不能少:少一个,这一幕就从"一个真实的两难"退化成"一个惩罚"
      for (const need of REQUIRED_COLLAPSE_CHOICES) {
        if (!ev.choices.some(c => c.id === need)) {
          error(`规则 13:塌方事件 ${evId} 缺少选项「${need}」(四选项必须齐全)`);
        }
      }
    }
    // 设计要求 ≥6 条基础、其中 ≥3 条在时间线内塌方(GAME_DESIGN 二十二节第 3 条)
    if (foundations.length > 0 && foundations.length < 6) {
      error(`规则 13:理论基础只有 ${foundations.length} 条(<6)`);
    }
    if (foundations.length > 0 && assignableCollapsing < 3) {
      error(`规则 13:会砸到玩家课题的基础只有 ${assignableCollapsing} 条(<3),这个机制会变成稀有彩蛋`);
    }
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
