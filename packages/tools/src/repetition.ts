import { contentPack } from '@psy-sim/content';
import type { GameEvent } from '@psy-sim/core';
import { runOne, type Strategy } from './simulate';

interface Args {
  runs: number;
  seed: number;
  strategy: Strategy;
  top: number;
}

interface LifeRun {
  eventIds: string[];
  eventSet: Set<string>;
  /** 事件 id -> 首次出现的年份,用来量化"节奏记忆"(同一件事是不是每局都在同一年撞见) */
  eventYears: Map<string, number>;
  signature: string;
  /** 学院归属(science/education/medical/normal)。本科四年的构筑维度里最早生效的一个 */
  college: string;
  presentationHits: string[];
  contextLineHits: string[];
}

type Source = '强制节点' | 'NPC线' | '职业线' | '公共池' | '主时间线';

function parseArgs(argv: string[]): Args {
  const args: Args = { runs: 300, seed: 42, strategy: 'random', top: 15 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '-n' || arg === '--runs') && argv[i + 1]) args.runs = Number(argv[++i]);
    else if (arg === '--seed' && argv[i + 1]) args.seed = Number(argv[++i]);
    else if (arg === '--top' && argv[i + 1]) args.top = Number(argv[++i]);
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
  const appearances = new Map<string, number>();
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
    const activeNpcs = Object.keys(result.finalState.npcs).sort().join('+');
    const signature = `${result.finalState.profile.career ?? 'none'}|${activeNpcs}`;
    runs.push({
      eventIds,
      eventSet,
      eventYears,
      signature,
      college: String(result.finalState.flags.college ?? 'none'),
      presentationHits: result.presentationHits,
      contextLineHits: result.contextLineHits,
    });
    for (const key of result.presentationHits) presentationHits.set(key, (presentationHits.get(key) ?? 0) + 1);
    for (const key of result.contextLineHits) contextLineHits.set(key, (contextLineHits.get(key) ?? 0) + 1);
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
  console.log(`重复率仪表盘 · ${args.runs} 局 · seed ${args.seed}–${args.seed + args.runs - 1} · ${args.strategy} bot\n`);
  console.log(`平均每局事件数: ${mean(runs.map(run => run.eventIds.length)).toFixed(1)}`);
  console.log(`相邻两局事件重合率(Jaccard): ${pct(mean(pairOverlaps(runs)))}`);
  console.log(`去除强制节点后的重合率: ${pct(mean(runs.slice(1).map((run, i) => {
    const previous = runs[i]!;
    const strip = (item: LifeRun) => new Set([...item.eventSet].filter(id => !eventsById.get(id)?.mandatory));
    return overlap(strip(previous), strip(run));
  })))}`);
  console.log(`连续 3 局独有事件比例(独有ID/三局事件总次数): ${pct(threeRunUniqueRatio(runs))}`);
  console.log(`相邻两局节奏重合率(共有事件里落在同一年的比例): ${pct(mean(rhythmOverlaps(runs)))}`);

  const highFrequency = [...appearances.entries()]
    .filter(([, count]) => count / args.runs >= 0.5)
    .map(([id]) => eventsById.get(id)!)
    .filter(Boolean);
  const variedHighFrequency = highFrequency.filter(event => perceivedVariation(event).length > 0);
  console.log(`高频事件感知变体覆盖(出现率≥50%): ${variedHighFrequency.length}/${highFrequency.length} (${pct(variedHighFrequency.length / highFrequency.length)})`);
  const uncovered = highFrequency.filter(event => perceivedVariation(event).length === 0);
  if (uncovered.length) console.log(`  待补: ${uncovered.map(event => `${event.title}(${event.id})`).join('、')}`);

  const contextEnabledAppearances = [...appearances.entries()].reduce((sum, [id, count]) =>
    sum + (eventsById.get(id)?.contextLines?.length ? count : 0), 0);
  const totalContextHits = [...contextLineHits.values()].reduce((sum, count) => sum + count, 0);
  const runsWithContext = runs.filter(run => run.contextLineHits.length > 0).length;
  const totalPresentationHits = [...presentationHits.values()].reduce((sum, count) => sum + count, 0);
  console.log('\n实际条件文案命中:');
  console.log(`  小回响: 平均每局 ${(totalContextHits / args.runs).toFixed(2)} 条 · ${pct(runsWithContext / args.runs)} 的对局至少看到 1 条`);
  console.log(`  带回响事件出现后命中率: ${contextEnabledAppearances ? pct(totalContextHits / contextEnabledAppearances) : '无样本'} (${totalContextHits}/${contextEnabledAppearances})`);
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
    const shown = appearances.get(event.id) ?? 0;
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

  const same: number[] = [];
  const different: number[] = [];
  for (let i = 1; i < runs.length; i++) {
    const previous = runs[i - 1]!;
    const current = runs[i]!;
    const bucket = previous.signature === current.signature ? same : different;
    bucket.push(overlap(previous.eventSet, current.eventSet));
  }
  console.log('\n配置影响(职业 + 激活NPC):');
  console.log(`  相同配置: ${same.length ? pct(mean(same)) : '样本不足'} (${same.length} 对)`);
  console.log(`  不同配置: ${different.length ? pct(mean(different)) : '样本不足'} (${different.length} 对)`);

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
}

main();
