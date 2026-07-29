import { contentPack } from '@psy-sim/content';
import type { Condition, GameEvent, GameState } from '@psy-sim/core';
import { runOne, type Strategy } from './simulate';

interface Args {
  runs: number;
  seed: number;
  strategy: Strategy;
  top: number;
  check: boolean;
}

interface LifeRun {
  eventIds: string[];
  eventSet: Set<string>;
  renderSet: Set<string>;
  /** 事件 id -> 首次出现的年份,用来量化"节奏记忆"(同一件事是不是每局都在同一年撞见) */
  eventYears: Map<string, number>;
  signature: string;
  /** 学院归属(science/education/medical/normal)。本科四年的构筑维度里最早生效的一个 */
  college: string;
  presentationHits: string[];
  contextLineHits: string[];
  eligibleLibrarySize: number;
}

type Source = '强制节点' | 'NPC线' | '职业线' | '公共池' | '主时间线';

function parseArgs(argv: string[]): Args {
  const args: Args = { runs: 300, seed: 42, strategy: 'random', top: 15, check: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '-n' || arg === '--runs') && argv[i + 1]) args.runs = Number(argv[++i]);
    else if (arg === '--seed' && argv[i + 1]) args.seed = Number(argv[++i]);
    else if (arg === '--top' && argv[i + 1]) args.top = Number(argv[++i]);
    else if (arg === '--check') args.check = true;
    else if (arg === '--bot' && argv[i + 1]) {
      const strategy = argv[++i];
      if (strategy === 'random' || strategy === 'money' || strategy === 'state' || strategy === 'score') {
        args.strategy = strategy;
      } else throw new Error(`unknown bot strategy: ${strategy}`);
    }
  }
  if (!Number.isInteger(args.runs) || args.runs < 3) throw new Error('--runs 必须是至少 3 的整数');
  return args;
}

const eventsById = new Map(contentPack.events.map(event => [event.id, event]));
const npcEventIds = new Set(
  contentPack.npcs.flatMap(npc =>
    Object.values(npc.stages).flatMap(stage => (stage.eventId ? [stage.eventId] : [])),
  ),
);
const careerId = /^ev_(?:career|cs|edu|gov|local|fin|med|psy)_/;

function sourceOf(event: GameEvent): Source {
  if (npcEventIds.has(event.id)) return 'NPC线';
  if (careerId.test(event.id)) return '职业线';
  if (event.mandatory) return '强制节点';
  if (event.pools.includes('random') || event.pools.includes('invest')) return '公共池';
  return '主时间线';
}

function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const id of a) if (b.has(id)) shared++;
  return shared / new Set([...a, ...b]).size;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function perceivedVariation(event: GameEvent): string[] {
  const labels: string[] = [];
  if (event.variantGroup) labels.push('变体池');
  if (event.presentationVariants?.length) labels.push(`条件开场${event.presentationVariants.length + 1}版`);
  if (event.contextLines?.length) labels.push(`回响${event.contextLines.length}条`);
  if (event.id === 'ev_trait_growth_2023') labels.push('内部12条成长路线');
  return labels;
}

const variantGroupSizes = new Map<string, number>();
for (const event of contentPack.events) {
  if (event.variantGroup) variantGroupSizes.set(event.variantGroup, (variantGroupSizes.get(event.variantGroup) ?? 0) + 1);
}

/** 基础版也算一个版本；多种机制并存时取能让玩家感知到的最大变体池。 */
function perceivedVariantCount(event: GameEvent): number {
  return Math.max(
    event.variantGroup ? (variantGroupSizes.get(event.variantGroup) ?? 1) : 1,
    1 + (event.presentationVariants?.length ?? 0),
    event.contextLines?.length ?? 0,
  );
}

function configurationSignature(state: GameState): string {
  const advisor = contentPack.advisors?.find(item => item.id === state.advisor?.id)?.archetype ?? 'none';
  const domain = (state.projects ?? []).find(project => !project.isThesis)?.domain ?? 'none';
  const orientation = Object.keys(state.flags)
    .filter(key => key.startsWith('orientation_') && Boolean(state.flags[key]))
    .sort()[0] ?? 'none';
  return [
    `advisor:${advisor}`,
    `domain:${domain}`,
    `orientation:${orientation}`,
    `path:${state.profile.career ?? 'none'}`,
    `college:${String(state.flags.college ?? 'none')}`,
  ].join('|');
}

function necessarilyRequires(cond: Condition | undefined, leaf: (cond: Condition) => boolean): boolean {
  if (!cond) return false;
  if ('all' in cond) return cond.all.some(item => necessarilyRequires(item, leaf));
  if ('any' in cond) return cond.any.length > 0 && cond.any.every(item => necessarilyRequires(item, leaf));
  if ('not' in cond) return false;
  return leaf(cond);
}

function eventRequires(event: GameEvent, leaf: (cond: Condition) => boolean): boolean {
  return necessarilyRequires(event.trigger, leaf) ||
    event.choices.some(choice => necessarilyRequires(choice.visibleIf, leaf));
}

const DOMAIN_IDS = ['cognition', 'cogneuro', 'social', 'clinical', 'development', 'education', 'psychometrics', 'health'];
const ORIENTATION_IDS = ['orientation_cbt', 'orientation_dynamic', 'orientation_humanistic', 'orientation_family', 'orientation_act', 'orientation_integrative'];
const PATH_CAREERS: Record<string, string[]> = {
  academic: ['master', 'phd', 'phd_direct', 'overseas_phd', 'postdoc', 'faculty_candidate', 'faculty'],
  clinical: ['clinical'],
  hospital: ['hospital'],
  school: ['school'],
  industry: ['industry'],
  left: ['left'],
};

/**
 * 一局真正可达的内容库：剔除与本局领域、取向、导师、路径、学院互斥的专属事件。
 * 同时保留“全库覆盖率”诊断值，避免这个口径把库规模藏起来。
 */
function eligibleLibrarySize(state: GameState): number {
  const domains = new Set((state.projects ?? []).filter(project => !project.isThesis).map(project => project.domain));
  const orientation = ORIENTATION_IDS.find(id => Boolean(state.flags[id]));
  const advisor = contentPack.advisors?.find(item => item.id === state.advisor?.id)?.archetype;
  const college = String(state.flags.college ?? 'none');
  const career = state.profile.career ?? 'none';
  const path = Object.entries(PATH_CAREERS).find(([, careers]) => careers.includes(career))?.[0];

  return contentPack.events.filter(event => {
    for (const domain of DOMAIN_IDS) {
      if (eventRequires(event, cond => 'projectCount' in cond && cond.projectCount.domain === domain) && !domains.has(domain)) return false;
    }
    for (const id of ORIENTATION_IDS) {
      if (eventRequires(event, cond => 'flag' in cond && cond.flag === id && (cond.equals === undefined || cond.equals === true)) && orientation !== id) return false;
    }
    for (const archetype of new Set((contentPack.advisors ?? []).map(item => item.archetype))) {
      if (eventRequires(event, cond => 'advisor' in cond && cond.advisor.archetype === archetype) && advisor !== archetype) return false;
    }
    for (const id of ['science', 'education', 'medical', 'normal']) {
      if (eventRequires(event, cond => 'flag' in cond && cond.flag === 'college' && cond.equals === id) && college !== id) return false;
    }
    for (const [family, careers] of Object.entries(PATH_CAREERS)) {
      if (eventRequires(event, cond => 'career' in cond && careers.includes(cond.career)) && path !== family) return false;
    }
    return true;
  }).length;
}

function filtered(run: LifeRun, source?: Source): Set<string> {
  if (!source) return run.eventSet;
  return new Set([...run.eventSet].filter(id => {
    const event = eventsById.get(id);
    return event && sourceOf(event) === source;
  }));
}

function pairOverlaps(runs: LifeRun[], source?: Source): number[] {
  const values: number[] = [];
  for (let i = 1; i < runs.length; i++) values.push(overlap(filtered(runs[i - 1]!, source), filtered(runs[i]!, source)));
  return values;
}

function configurationOverlaps(runs: LifeRun[]): { same: number[]; different: number[] } {
  const same: number[] = [];
  const different: number[] = [];
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const bucket = runs[i]!.signature === runs[j]!.signature ? same : different;
      bucket.push(overlap(runs[i]!.eventSet, runs[j]!.eventSet));
    }
  }
  return { same, different };
}

/**
 * 节奏重合率:两局都出现过的事件里,落在同一年的比例。
 * 事件集合的 Jaccard 看不出"顺序腻",这条才是锚点年份错位要压的数字。
 */
function rhythmOverlap(a: LifeRun, b: LifeRun): number {
  let shared = 0;
  let sameYear = 0;
  for (const [id, year] of a.eventYears) {
    const other = b.eventYears.get(id);
    if (other === undefined) continue;
    shared++;
    if (other === year) sameYear++;
  }
  return shared === 0 ? 0 : sameYear / shared;
}

function rhythmOverlaps(runs: LifeRun[]): number[] {
  const values: number[] = [];
  for (let i = 1; i < runs.length; i++) values.push(rhythmOverlap(runs[i - 1]!, runs[i]!));
  return values;
}

function threeRunUniqueRatio(runs: LifeRun[]): number {
  const ratios: number[] = [];
  for (let i = 0; i + 2 < runs.length; i++) {
    const window = runs.slice(i, i + 3);
    const unique = new Set(window.flatMap(run => run.eventIds));
    const total = window.reduce((sum, run) => sum + run.eventIds.length, 0);
    ratios.push(total === 0 ? 0 : unique.size / total);
  }
  return mean(ratios);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const runs: LifeRun[] = [];
  // `appearances` 统计“出现过的局数”，用于高频事件与跨局间隔；
  // `occurrences` 统计实际播放次数，用作回响命中率分母。管线/个案事件一局可播多次，
  // 两者不能混用，否则命中率会超过 100%。
  const appearances = new Map<string, number>();
  const occurrences = new Map<string, number>();
  const gaps = new Map<string, number[]>();
  const lastSeen = new Map<string, number>();
  const presentationHits = new Map<string, number>();
  const contextLineHits = new Map<string, number>();

  for (let i = 0; i < args.runs; i++) {
    const seed = args.seed + i;
    const result = runOne(seed, seed ^ 0x5eed, args.strategy, false);
    const eventIds = result.finalState.history
      .filter(entry => entry.kind === 'event')
      .map(entry => entry.eventId);
    const eventSet = new Set(eventIds);
    const eventYears = new Map<string, number>();
    for (const entry of result.finalState.history) {
      if (entry.kind !== 'event' || eventYears.has(entry.eventId)) continue;
      eventYears.set(entry.eventId, entry.year);
    }
    const signature = configurationSignature(result.finalState);
    runs.push({
      eventIds,
      eventSet,
      renderSet: new Set(result.renderFingerprints),
      eventYears,
      signature,
      college: String(result.finalState.flags.college ?? 'none'),
      presentationHits: result.presentationHits,
      contextLineHits: result.contextLineHits,
      eligibleLibrarySize: eligibleLibrarySize(result.finalState),
    });
    for (const key of result.presentationHits) presentationHits.set(key, (presentationHits.get(key) ?? 0) + 1);
    for (const key of result.contextLineHits) contextLineHits.set(key, (contextLineHits.get(key) ?? 0) + 1);
    for (const id of eventIds) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
    for (const id of eventSet) {
      appearances.set(id, (appearances.get(id) ?? 0) + 1);
      const previous = lastSeen.get(id);
      if (previous !== undefined) {
        const list = gaps.get(id) ?? [];
        list.push(i - previous);
        gaps.set(id, list);
      }
      lastSeen.set(id, i);
    }
  }

  const sources: Source[] = ['强制节点', 'NPC线', '职业线', '公共池', '主时间线'];
  const renderOverlap = mean(runs.slice(1).map((run, index) => overlap(runs[index]!.renderSet, run.renderSet)));
  const nonMandatoryOverlap = mean(runs.slice(1).map((run, index) => {
    const strip = (item: LifeRun) => new Set([...item.eventSet].filter(id => !eventsById.get(id)?.mandatory));
    return overlap(strip(runs[index]!), strip(run));
  }));
  const uniqueRatio = threeRunUniqueRatio(runs);
  // 口径与设计稿的“每局约 90 幕 / 约 471 个事件”一致：一局实际经历的幕数，
  // 而不是 unique ID。管线模板可绑定不同课题多次出现，每次都是一幕真实内容。
  const fullLibraryCoverage = mean(runs.map(run => run.eventIds.length / contentPack.events.length));
  const reachableCoverage = mean(runs.map(run => run.eventIds.length / run.eligibleLibrarySize));
  const contextAverage = [...contextLineHits.values()].reduce((sum, count) => sum + count, 0) / args.runs;
  const config = configurationOverlaps(runs);
  const configGap = config.same.length && config.different.length ? mean(config.same) - mean(config.different) : 0;
  const slotDistributions = (contentPack.narrativeSlots ?? []).map(slot => {
    const counts = slot.candidates.map(id => ({ id, count: appearances.get(id) ?? 0 }));
    const total = counts.reduce((sum, item) => sum + item.count, 0);
    return {
      slot,
      counts,
      total,
      minimum: total > 0 ? Math.min(...counts.map(item => item.count / total)) : 0,
      checksGlobalBalance: slot.candidateMode !== 'conditional',
    };
  });
  console.log(`重复率仪表盘 · ${args.runs} 局 · seed ${args.seed}–${args.seed + args.runs - 1} · ${args.strategy} bot\n`);
  console.log(`平均每局事件数: ${mean(runs.map(run => run.eventIds.length)).toFixed(1)}`);
  console.log(`相邻两局渲染三元组重合率: ${pct(renderOverlap)}`);
  console.log(`相邻两局事件重合率(Jaccard): ${pct(mean(pairOverlaps(runs)))}`);
  console.log(`去除强制节点后的重合率: ${pct(nonMandatoryOverlap)}`);
  console.log(`连续 3 局独有事件比例(独有ID/三局事件总次数): ${pct(uniqueRatio)}`);
  console.log(`单局内容覆盖率(本配置可达库): ${pct(reachableCoverage)}`);
  console.log(`  全内容库诊断值: ${pct(fullLibraryCoverage)}`);
  console.log(`相邻两局节奏重合率(共有事件里落在同一年的比例): ${pct(mean(rhythmOverlaps(runs)))}`);

  console.log('\n叙事功能位候选分布:');
  if (slotDistributions.length === 0) console.log('  暂无');
  else for (const item of slotDistributions) {
    const counts = item.counts.map(candidate => `${candidate.id} ${candidate.count}`).join(' · ');
    const summary = item.checksGlobalBalance
      ? `最低 ${pct(item.minimum)}`
      : `条件分流 · 总命中 ${item.total}`;
    console.log(`  ${item.slot.id}: ${summary} · ${counts}`);
  }

  const highFrequency = [...appearances.entries()]
    .filter(([, count]) => count / args.runs >= 0.5)
    .map(([id]) => eventsById.get(id)!)
    .filter(Boolean);
  const variedHighFrequency = highFrequency.filter(event => perceivedVariantCount(event) >= 3);
  console.log(`高频事件感知变体覆盖(出现率≥50%): ${variedHighFrequency.length}/${highFrequency.length} (${pct(variedHighFrequency.length / highFrequency.length)})`);
  const uncovered = highFrequency.filter(event => perceivedVariantCount(event) < 3);
  if (uncovered.length) console.log(`  待补: ${uncovered.map(event => `${event.title}(${event.id})`).join('、')}`);

  const contextEnabledOccurrences = [...occurrences.entries()].reduce((sum, [id, count]) =>
    sum + (eventsById.get(id)?.contextLines?.length ? count : 0), 0);
  const totalContextHits = [...contextLineHits.values()].reduce((sum, count) => sum + count, 0);
  const runsWithContext = runs.filter(run => run.contextLineHits.length > 0).length;
  const totalPresentationHits = [...presentationHits.values()].reduce((sum, count) => sum + count, 0);
  console.log('\n实际条件文案命中:');
  console.log(`  小回响: 平均每局 ${(totalContextHits / args.runs).toFixed(2)} 条 · ${pct(runsWithContext / args.runs)} 的对局至少看到 1 条`);
  console.log(`  带回响事件出现后命中率: ${contextEnabledOccurrences ? pct(totalContextHits / contextEnabledOccurrences) : '无样本'} (${totalContextHits}/${contextEnabledOccurrences})`);
  // 条件命中 = 玩家看到的是引用自己前史的那一句;兜底 = 没有任何前史命中,给了泛化句。
  // 两者都算"看到回响",但只有前者是差异化内容,所以要分开看。
  const conditionalHits = [...contextLineHits.entries()].reduce((sum, [key, count]) => {
    const [id, index] = key.split('#');
    const line = eventsById.get(id!)?.contextLines?.[Number(index)];
    return sum + (line?.condition ? count : 0);
  }, 0);
  console.log(
    `    其中条件命中 ${pct(totalContextHits ? conditionalHits / totalContextHits : 0)}(${conditionalHits}) · 兜底 ${pct(totalContextHits ? 1 - conditionalHits / totalContextHits : 0)}(${totalContextHits - conditionalHits})`,
  );
  console.log(`  条件开场: 平均每局 ${(totalPresentationHits / args.runs).toFixed(2)} 个`);

  const contextEvents = contentPack.events.filter(event => event.contextLines?.length);
  console.log('  各事件回响命中率:');
  for (const event of contextEvents) {
    const shown = occurrences.get(event.id) ?? 0;
    const hits = event.contextLines!.reduce((sum, _line, index) => sum + (contextLineHits.get(`${event.id}#${index}`) ?? 0), 0);
    console.log(`    ${pct(shown ? hits / shown : 0).padStart(6)}  ${String(hits).padStart(3)}/${String(shown).padEnd(3)}  ${event.title}`);
  }

  const deadContextLines = contextEvents.flatMap(event => event.contextLines!.flatMap((line, index) => {
    const key = `${event.id}#${index}`;
    return contextLineHits.has(key) ? [] : [`${event.title}#${index + 1}「${line.text.slice(0, 18)}…」`];
  }));
  console.log(`  ${args.runs}局零命中回响: ${deadContextLines.length ? deadContextLines.join('、') : '无'}`);
  const rareContextLines = contextEvents.flatMap(event => event.contextLines!.map((line, index) => ({
    event,
    line,
    count: contextLineHits.get(`${event.id}#${index}`) ?? 0,
  }))).filter(item => item.count / args.runs < 0.03).sort((a, b) => a.count - b.count);
  console.log('  低命中回响(<总局数3%):');
  if (rareContextLines.length === 0) console.log('    无');
  else for (const item of rareContextLines) {
    console.log(`    ${String(item.count).padStart(3)} 局  ${item.event.title}「${item.line.text.slice(0, 24)}…」`);
  }

  console.log('\n按来源拆分的相邻两局重合率:');
  for (const source of sources) {
    const averageCount = mean(runs.map(run => filtered(run, source).size));
    console.log(`  ${source.padEnd(5, ' ')} ${pct(mean(pairOverlaps(runs, source))).padStart(6)}  平均每局 ${averageCount.toFixed(1)} 个`);
  }

  console.log('\n配置影响(导师 × 领域 × 取向 × 职业 × 学院):');
  console.log(`  相同配置: ${config.same.length ? pct(mean(config.same)) : '样本不足'} (${config.same.length} 对)`);
  console.log(`  不同配置: ${config.different.length ? pct(mean(config.different)) : '样本不足'} (${config.different.length} 对)`);
  console.log(`  重合率差值: ${pct(configGap)}`);

  // ── 学院归属之间的本科事件重合率(M2 验收标准:<60%)──────────────────────
  //
  // 这一条查的是"四种学院归属是不是四套不同的四年"。如果四个学院之间的重合率很高,
  // 那学院归属就只是一个称呼,而不是一个构筑维度——**而这一点在结局分布里完全看不出来**。
  //
  // 口径:**两局之间的成对 Jaccard**,只算本科池的事件。
  //
  // 一开始我用的是"该学院所有对局的事件并集之间的 Jaccard",那个数字永远到不了 60%——
  // 公共骨架有三十几个事件,而每个学院的专属配额是 ≥4 个,并集重合率的下界就是 80% 上下。
  // 但**玩家不玩并集,玩家玩一局**:一局里能看到的本科事件只有十来个,其中三四个是学院专属的。
  // 所以要问的是"两个不同学院的玩家各打一局,有多像",而这正好和这个工具已有的
  // "相邻两局重合率"是同一套口径。同学院配对作为对照,两者的差值才是构筑维度真正的贡献。
  const COLLEGE_LABELS: Record<string, string> = {
    science: '理学院',
    education: '教育学院',
    medical: '医学院',
    normal: '师范',
  };
  const undergradEventIds = new Set(
    contentPack.events.filter(event => event.pools.includes('undergrad')).map(event => event.id),
  );
  const collegeRuns = runs
    .filter(run => run.college in COLLEGE_LABELS)
    .map(run => ({
      college: run.college,
      set: new Set([...run.eventSet].filter(id => undergradEventIds.has(id))),
    }));
  const sameCollegePairs: number[] = [];
  const crossCollegePairs: number[] = [];
  for (let i = 0; i < collegeRuns.length; i++) {
    for (let j = i + 1; j < collegeRuns.length; j++) {
      const a = collegeRuns[i]!;
      const b = collegeRuns[j]!;
      const shared = [...a.set].filter(id => b.set.has(id)).length;
      const union = new Set([...a.set, ...b.set]).size;
      const overlap = union === 0 ? 0 : shared / union;
      (a.college === b.college ? sameCollegePairs : crossCollegePairs).push(overlap);
    }
  }
  if (crossCollegePairs.length > 0) {
    const cross = mean(crossCollegePairs);
    console.log('\n学院归属对本科体验的影响(成对重合率,只算本科池事件):');
    console.log(`  同一学院: ${sameCollegePairs.length ? pct(mean(sameCollegePairs)) : '样本不足'} (${sameCollegePairs.length} 对)`);
    console.log(`  不同学院: ${pct(cross)} (${crossCollegePairs.length} 对)`);
    console.log(
      `  验收标准 <60%: ${cross < 0.6 ? '✅' : '❌ 学院归属还不够像四套不同的四年'}`,
    );
  }

  console.log(`\n出现率最高的 ${args.top} 个事件:`);
  const common = [...appearances.entries()].sort((a, b) => b[1] - a[1]).slice(0, args.top);
  for (const [id, count] of common) {
    const event = eventsById.get(id)!;
    const averageGap = mean(gaps.get(id) ?? []);
    const variation = perceivedVariation(event);
    const internal = variation.length ? ` · ${variation.join(' + ')}` : '';
    console.log(`  ${pct(count / args.runs).padStart(6)}  ${sourceOf(event).padEnd(5, ' ')}  间隔${averageGap.toFixed(1).padStart(5)}局  ${event.title} (${id})${internal}`);
  }

  const variants = new Map<string, GameEvent[]>();
  for (const event of contentPack.events) {
    if (!event.variantGroup) continue;
    const group = variants.get(event.variantGroup) ?? [];
    group.push(event);
    variants.set(event.variantGroup, group);
  }
  console.log('\n固定节点变体池:');
  if (variants.size === 0) console.log('  暂无');
  else for (const [group, events] of variants) console.log(`  ${group}: ${events.length} 个变体`);

  if (args.check) {
    const failures: string[] = [];
    if (renderOverlap > 0.15) failures.push(`渲染三元组重合率 ${pct(renderOverlap)} > 15%`);
    if (nonMandatoryOverlap > 0.3) failures.push(`非强制事件重合率 ${pct(nonMandatoryOverlap)} > 30%`);
    if (uniqueRatio < 0.4) failures.push(`连续三局独有事件比例 ${pct(uniqueRatio)} < 40%`);
    if (!config.same.length || !config.different.length) failures.push('同/异配置配对样本不足');
    else if (configGap < 0.2) failures.push(`同/异配置重合率差值 ${pct(configGap)} < 20pp`);
    if (reachableCoverage < 0.2 || reachableCoverage > 0.3) failures.push(`单局内容覆盖率 ${pct(reachableCoverage)} 不在 20%–30%`);
    if (uncovered.length > 0) failures.push(`${uncovered.length} 个高频事件的感知变体少于 3 个`);
    if (contextAverage < 6) failures.push(`平均每局小回响 ${contextAverage.toFixed(2)} < 6`);
    if (slotDistributions.length === 0) failures.push('内容包没有叙事功能位');
    for (const item of slotDistributions) {
      if (item.checksGlobalBalance && item.minimum < 0.15) {
        failures.push(`功能位 ${item.slot.id} 最低候选占比 ${pct(item.minimum)} < 15%`);
      }
    }
    if (failures.length > 0) {
      console.error('\n❌ M7.5 重复率门禁失败:');
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exitCode = 1;
    } else {
      console.log('\n✅ M7.5 重复率门禁通过');
    }
  }
}

main();
