import {
  MAX_REJECTIONS,
  NEGLECT_YEARS_TO_ABANDON,
  createEngine,
  evalCondition,
  Rng,
  selectContextLine,
  type GameState,
  type PlayerAction,
  type StatKey,
  type ViewModel,
} from '@psy-sim/core';
import { contentPack } from '@psy-sim/content';
import { pathToFileURL } from 'node:url';

export type Strategy = 'random' | 'money' | 'state' | 'score';

interface CliArgs {
  runs: number;
  seed: number | null;
  verbose: boolean;
  check: boolean;
  strategy: Strategy;
  compare: boolean;
  examSkill: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    runs: 200,
    seed: null,
    verbose: false,
    check: false,
    strategy: 'random',
    compare: false,
    examSkill: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '-n' || a === '--runs') && argv[i + 1]) args.runs = Number(argv[++i]);
    else if (a === '--seed' && argv[i + 1]) args.seed = Number(argv[++i]);
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--check') args.check = true;
    else if (a === '--compare') args.compare = true;
    else if (a === '--exam-skill' && argv[i + 1]) {
      const skill = Number(argv[++i]);
      if (!(skill >= 0 && skill <= 1)) throw new Error('--exam-skill 取值必须在 [0, 1]');
      args.examSkill = skill;
    } else if (a === '--bot' && argv[i + 1]) {
      const s = argv[++i];
      if (s === 'random' || s === 'money' || s === 'state' || s === 'score') args.strategy = s;
      else throw new Error(`unknown bot strategy: ${s}(可选 random/money/state/score)`);
    }
  }
  return args;
}

const engine = createEngine(contentPack);
const eventsById = new Map(contentPack.events.map(e => [e.id, e]));
const backgroundLabels = new Map(contentPack.backgrounds.map(b => [b.id, b.label]));
const CAREER_LABELS: Record<string, string> = {
  cs: '计算机',
  education: '教育',
  gov: '体制内',
  local: '县城/本地',
  finance: '金融',
  medicine: '医学',
  psychology: '心理',
};
const STRATEGY_LABELS: Record<Strategy, string> = {
  random: '随机',
  money: '卷钱',
  state: '保状态',
  score: '卷总分',
};

/** 与 engine.computeScore 同一套权重(直接读内容包配置):模拟"看得出哪个选项得分"的玩家 */
const packScoring = contentPack.meta.scoring ?? {
  weights: { method: 0.2, money: 0.25, state: 0.2, capital: 0.15, clinical: 0.2 },
  moneyFullScore: 600000,
};
const SCORE_WEIGHTS: Record<StatKey, number> = {
  ...packScoring.weights,
  // money 权重按满分线折算成"每元多少分"
  money: (packScoring.weights.money * 100) / packScoring.moneyFullScore,
};

/** 贪心 bot 的选项打分:按 outcome 权重求某项数值变化的期望(条件用一次性 RNG 求值,不污染对局随机流) */
function expectedStatDelta(
  eventId: string,
  choiceId: string,
  state: GameState,
  stat: StatKey,
): number {
  const event = eventsById.get(eventId);
  const choice = event?.choices.find(c => c.id === choiceId);
  if (!choice) return 0;
  const probe = new Rng(0x9e3779b9);
  const ctx = { state, pack: contentPack, rng: probe };
  const eligible = choice.outcomes.filter(o => evalCondition(o.condition, ctx));
  const pool = eligible.length > 0 ? eligible : choice.outcomes;
  const totalWeight = pool.reduce((sum, o) => sum + o.weight, 0) || 1;
  let expectation = 0;
  for (const outcome of pool) {
    let delta = 0;
    for (const effect of outcome.effects) {
      if ('stats' in effect) delta += effect.stats[stat] ?? 0;
      if ('moneyCost' in effect && stat === 'money') {
        const { rate, min = 0, max = Infinity, roundTo } = effect.moneyCost;
        const raw = state.stats.money * rate;
        const bounded = Math.max(min, Math.min(max, raw));
        const rounded = roundTo && roundTo > 0 ? Math.round(bounded / roundTo) * roundTo : Math.round(bounded);
        delta -= Math.max(0, Math.min(state.stats.money, rounded));
      }
      if ('setStat' in effect && effect.setStat === stat) delta += effect.value - state.stats[stat];
    }
    expectation += (outcome.weight / totalWeight) * delta;
  }
  return expectation;
}

// 高考答题正确率:0 = 纯瞎猜(历史默认档),1 = 全对。
// 瞎猜 bot 的分数分布压在专科/二本(62%/30%),985/211/一本 只占 8.5%,
// 于是这三档才开设的专业(心理学、金融学、计算机科学与技术)在门禁里长期缺样本。
const examAnswers = new Map(
  [...contentPack.examBank, ...(contentPack.courseExamBank ?? [])].map(q => [q.id, q.answerIndex]),
);

function botAction(
  view: ViewModel,
  bot: Rng,
  strategy: Strategy,
  state: GameState,
  examSkill: number,
): PlayerAction {
  switch (view.kind) {
    case 'TITLE':
      return { type: 'START' };
    case 'GRAD_APPLY': {
      // **投递策略是这一屏真正要测的东西**,所以四个 bot 在这里必须不一样:
      // 全冲高的人有相当概率一个都不中(GAME_DESIGN 9.3),而那是设计要的结果。
      //
      // 顺带,`--check` 的"每所院校被选中率 ≥0.5%"门禁靠随机 bot 保证:
      // 清单里有 20 多所但实际只有 3 所可达 = 这份数据白做了。
      const byChance = (label: string) => view.options.filter(o => o.chanceLabel === label);
      const reach = [...byChance('冲'), ...byChance('悬'), ...byChance('基本无望')];
      const safe = [...byChance('稳'), ...byChance('较稳')];
      let picks: typeof view.options;
      if (strategy === 'score') picks = [...reach, ...safe]; // 尽量冲高
      else if (strategy === 'state') picks = [...safe, ...reach]; // 求稳
      else picks = bot.sample(view.options, Math.min(view.maxPicks, view.options.length));
      const chosen = picks.slice(0, view.maxPicks);
      return {
        type: 'APPLY_GRAD',
        institutionIds: (chosen.length > 0 ? chosen : view.options.slice(0, 1)).map(o => o.id),
      };
    }
    case 'BACKGROUND_DRAW':
      // 随机选满 pickCount 个特质(策略 bot 不做特质期望计算)
      return {
        type: 'CHOOSE_TRAITS',
        traitIds: bot.sample(view.traitOffer, view.pickCount).map(t => t.id),
      };
    case 'GRAD_RESULT':
    case 'EXAM_RESULT':
    case 'BRIEF':
    case 'OUTCOME':
    case 'SETTLEMENT':
      return { type: 'CONTINUE' };
    case 'SETUP':
      return {
        type: 'CHOOSE_SETUP',
        gender: bot.pick(view.genders),
        track: bot.pick(view.tracks),
      };
    case 'EXAM': {
      const answer = examAnswers.get(view.question.id);
      if (answer !== undefined && examSkill > 0 && bot.int(1, 1000) <= examSkill * 1000) {
        return { type: 'ANSWER', optionIndex: answer };
      }
      return { type: 'ANSWER', optionIndex: bot.int(0, view.question.options.length - 1) };
    }
    case 'APPLICATION':
      const appOpt = bot.pick(view.options);
      return { type: 'APPLY', optionId: appOpt.id, majorId: bot.pick(appOpt.majors).id };
    case 'NPC_SELECTION':
      return {
        type: 'CHOOSE_NPCS',
        npcIds: bot.sample(view.npcs, view.pickCount).map(npc => npc.id),
      };
    case 'LIFE_GOAL':
      return { type: 'CHOOSE_LIFE_GOAL', goalId: bot.pick(view.goals).id };
    case 'PROJECT_BOARD':
      return { type: 'CONTINUE' };
    case 'ADVISOR_DRAW':
      // bot 只能看到公开印象——**跟玩家第一次抽卡时知道的一样多**,
      // 所以随机挑是对这个机制最诚实的模拟。
      return { type: 'JOIN_ADVISOR', advisorId: bot.pick(view.candidates).id };
    case 'ALLOCATION': {
      // 逐格填,按权重抽。策略 bot 有偏好但不死板:偏好项满了就退回其他,
      // 这样"精力格"在门禁统计里既能反映策略差异,又不会把某些投入项彻底饿死。
      const preferred: Record<Strategy, string[]> = {
        random: [],
        money: ['money', 'rest'],
        state: ['rest', 'counseling'],
        score: ['course', 'lab'],
      };
      const used = new Map<string, number>();
      const picks: string[] = [];

      // **`score` bot 会集中投入。**
      //
      // 这不是给它开后门,是让它真的像一个"看得出哪个选项得分"的玩家:
      // 课题推进的回报是超线性的——两格投在同一个课题上,比分投在两个上快得多
      // (`1 + 4×格数` 次机会,而八站走完才算数)。**分散投入的人发不出文章**,
      // 而这正是这个机制想说的话。随机 bot 仍然分散,它的低产出也是真实的。
      if (strategy === 'score') {
        // 主攻一个、兼顾一个:这是研究生真实的分配方式,也是这个机制想教的那件事
        //(**分散投入的人发不出文章,但只押一个的人赌不起**)。
        const projectItems = view.items.filter(item => item.id.startsWith('alloc_project_'));
        const plan: string[] = [];
        const focus = projectItems[0];
        const second = projectItems[1];
        if (focus) plan.push(focus.id, focus.id);
        if (second) plan.push(second.id);
        for (const id of plan) {
          if (picks.length >= view.slots) break;
          picks.push(id);
          used.set(id, (used.get(id) ?? 0) + 1);
        }
      }

      while (picks.length < view.slots) {
        const usable = view.items.filter(
          item => item.maxSlots === null || (used.get(item.id) ?? 0) < item.maxSlots,
        );
        if (usable.length === 0) break;
        const chosen = bot.weightedPick(usable, item => {
          // **推进手上的课题是研究生的默认动作,不是十选一。**
          // 均匀随机会让每个课题每年只分到三分之一格,于是所有课题都因无人问津而烂掉——
          // 那不是"随机玩家"的模型,那是"根本没在读研的人"的模型。
          if (item.id.startsWith('alloc_project_')) return 4;
          if (preferred[strategy].includes(item.category)) return 3;
          return 1;
        });
        picks.push(chosen.id);
        used.set(chosen.id, (used.get(chosen.id) ?? 0) + 1);
      }
      return { type: 'ALLOCATE', picks };
    }
    case 'CROSSROAD': {
      const preferred =
        strategy === 'money' ? 'job' : strategy === 'state' ? 'civil_service' : null;
      const hit = preferred && view.options.find(o => o.id === preferred);
      return { type: 'CHOOSE_CROSSROAD', optionId: hit ? hit.id : bot.pick(view.options).id };
    }
    case 'EVENT': {
      if (strategy === 'random') return { type: 'CHOOSE', choiceId: bot.pick(view.choices).id };
      const scoreOf = (choiceId: string): number => {
        if (strategy === 'score') {
          return (Object.keys(SCORE_WEIGHTS) as StatKey[]).reduce(
            (sum, key) => sum + SCORE_WEIGHTS[key] * expectedStatDelta(view.eventId, choiceId, state, key),
            0,
          );
        }
        return expectedStatDelta(view.eventId, choiceId, state, strategy === 'money' ? 'money' : 'state');
      };
      let best: string[] = [];
      let bestScore = -Infinity;
      for (const choice of view.choices) {
        const score = scoreOf(choice.id);
        if (score > bestScore + 1e-9) {
          bestScore = score;
          best = [choice.id];
        } else if (Math.abs(score - bestScore) <= 1e-9) {
          best.push(choice.id);
        }
      }
      return { type: 'CHOOSE', choiceId: bot.pick(best) };
    }
    case 'ENDING':
      throw new Error('botAction called on ENDING view');
  }
}

export interface RunResult {
  endingId: string;
  endingTitle: string;
  endingScore: number;
  finalState: GameState;
  stateByYear: Array<[number, number]>;
  steps: number;
  presentationHits: string[];
  contextLineHits: string[];
  /**
   * 每个自然年放了几幕事件。**节奏指标。**
   *
   * 玩家的原话是"每一年的事件太多了,玩久了有点累"——而在此之前没有任何一条指标在看这个。
   * 事件数是分四路加起来的(mandatory 不占槽位、管线不占槽位、导师不占槽位),
   * 所以 `eventSlots: 2` 的阶段实际可能放七八幕,**而配置里任何一个数字都看不出来。**
   */
  eventsPerYear: Array<[number, number]>;
  /** 这一局投递过的院校。**门禁"每所院校被选中率 ≥0.5%"读它** */
  institutionsPicked: string[];
}

function fmtDeltas(deltas: Record<string, number | undefined>): string {
  const parts = Object.entries(deltas)
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => `${k}${v! > 0 ? '+' : ''}${v}`);
  return parts.length > 0 ? `  [${parts.join(', ')}]` : '';
}

export function runOne(
  seed: number,
  botSeed: number,
  strategy: Strategy,
  verbose: boolean,
  examSkill = 0,
): RunResult {
  let state = engine.start(seed);
  const bot = new Rng(botSeed);
  const eventsPerYear = new Map<number, number>();
  const institutionsPicked = new Set<string>();
  const stateByYear: Array<[number, number]> = [];
  const presentationHits: string[] = [];
  const contextLineHits: string[] = [];
  let steps = 0;
  const log = (line: string) => {
    if (verbose) console.log(line);
  };

  while (steps < 1000) {
    const view = engine.view(state);
    if (view.kind === 'ENDING') {
      log(`\n🏁 结局:【${view.title}】`);
      log(view.text);
      log(
        `\n最终数值: 方法${state.stats.method} 临床${state.stats.clinical} 资本${state.stats.capital} 状态${state.stats.state} 金钱¥${state.stats.money}`,
      );
      if (view.papers.length > 0) {
        log('\n论文清单:');
        for (const paper of view.papers) log(`  ${paper.year} · ${paper.tier} · ${paper.authorship} · ${paper.title}`);
      }
      if (view.abandonedProjects.length > 0) {
        log(`做废的课题: ${view.abandonedProjects.map(p => `「${p.title}」(${p.yearsSpent} 年)`).join(' · ')}`);
      }
      log(`人生总分: ${view.score} (${view.grade} 级)`);
      return {
        endingId: view.endingId,
        endingTitle: view.title,
        endingScore: view.score,
        finalState: state,
        stateByYear,
        steps,
        presentationHits,
        contextLineHits,
        eventsPerYear: [...eventsPerYear.entries()],
        institutionsPicked: [...institutionsPicked],
      };
    }
    const action = botAction(view, bot, strategy, state, examSkill);
    switch (view.kind) {
      case 'BACKGROUND_DRAW': {
        const picked =
          action.type === 'CHOOSE_TRAITS'
            ? view.traitOffer
                .filter(t => action.traitIds.includes(t.id))
                .map(t => t.label)
                .join(' × ')
            : '';
        log(`\n🎴 家境:${view.card.label} (初始资金 ¥${view.card.initialMoney}) · 特质:${picked}`);
        break;
      }
      case 'EXAM':
        // 课程小测(两座大山)也走 EXAM 屏。高考的题不逐题打,小测只有一两道,值得打出来。
        if (state.examKind === 'course' && action.type === 'ANSWER') {
          const courseId = state.courseExamCourseIds?.[state.examCursor];
          const course = contentPack.courses?.find(c => c.id === courseId);
          const correct = action.optionIndex === examAnswers.get(view.question.id);
          log(`\n📄 ${course?.label ?? view.question.subject} 期末小测:${view.question.text}`);
          log(`  答:${view.question.options[action.optionIndex]} ${correct ? '✅' : '❌'}`);
        }
        break;
      case 'EXAM_RESULT':
        log(`\n📝 高考出分:${view.score} 分 (答对 ${view.correct}/${view.total})`);
        break;
      case 'APPLICATION':
        if (action.type === 'APPLY') {
          const opt = view.options.find(o => o.id === action.optionId);
          log(`🎓 志愿:${opt?.label}${opt?.risky ? '(有滑档风险)' : ''}`);
        }
        break;
      case 'NPC_SELECTION':
        if (action.type === 'CHOOSE_NPCS') {
          const names = [...view.requiredNpcs, ...view.npcs.filter(npc => action.npcIds.includes(npc.id))]
            .map(npc => npc.name)
            .join(' × ');
          log(`🤝 重要的人:${names}`);
        }
        break;
      case 'LIFE_GOAL':
        if (action.type === 'CHOOSE_LIFE_GOAL') {
          log(`🧭 人生目标:${view.goals.find(goal => goal.id === action.goalId)?.label}`);
        }
        break;
      case 'CROSSROAD':
        if (action.type === 'CHOOSE_CROSSROAD') {
          const opt = view.options.find(o => o.id === action.optionId);
          log(`\n🎒 毕业三岔口:${opt?.label}`);
        }
        break;
      case 'ADVISOR_DRAW':
        if (action.type === 'JOIN_ADVISOR') {
          log(`\n🎓 进组:${view.candidates.find(c => c.id === action.advisorId)?.name}`);
        }
        break;
      case 'PROJECT_BOARD':
        if (view.projects.length > 0) {
          log(`\n📋 白板: ${view.projects.map(p => `「${p.title}」${p.stage}(第 ${p.yearsSpent + 1} 年)`).join(' · ')}`);
        }
        break;
      case 'ALLOCATION':
        if (action.type === 'ALLOCATE') {
          const labels = new Map(view.items.map(item => [item.id, item.label]));
          const counted = new Map<string, number>();
          for (const id of action.picks) counted.set(id, (counted.get(id) ?? 0) + 1);
          const summary = [...counted.entries()]
            .map(([id, n]) => `${labels.get(id) ?? id}${n > 1 ? `×${n}` : ''}`)
            .join(' · ');
          log(`\n🎯 ${view.year} 年投入(${view.slots} 格${view.retakeSlots > 0 ? `,重修占 ${view.retakeSlots} 格` : ''}): ${summary}`);
        }
        break;
      case 'SETTLEMENT':
        for (const project of view.projects) {
          log(`  课题: 「${project.title}」${project.isThesis ? '(毕业论文)' : ''} → ${project.stage}`);
        }
        if (view.courseResults.length > 0) {
          const tierLabel = { mastered: '学通', passed: '过了', failed: '挂了' } as const;
          log(`  课程: ${view.courseResults.map(c => `${c.label}(${tierLabel[c.tier]})`).join(' · ')}`);
        }
        break;
      case 'BRIEF':
        stateByYear.push([view.year, state.stats.state]);
        log(`\n===== ${view.year} 年 · ${view.phaseLabel} =====`);
        log(view.text);
        break;
      case 'GRAD_APPLY': {
        if (action.type === 'APPLY_GRAD') {
          for (const id of action.institutionIds) institutionsPicked.add(id);
          const names = action.institutionIds
            .map(id => view.options.find(o => o.id === id))
            .map(o => (o ? `${o.name}(${o.chanceLabel})` : '?'));
          log(`\n🏫 ${view.applyKind} 投递: ${names.join(' · ')}`);
        }
        break;
      }
      case 'GRAD_RESULT': {
        const hit = view.results.filter(r => r.admitted).length;
        log(
          `\n📬 结果: ${hit}/${view.results.length} 录取 · 去 ${view.landedName ?? '(无)'}` +
            (view.viaAdjustment ? '(调剂)' : ''),
        );
        break;
      }
      case 'EVENT':
        eventsPerYear.set(state.date.year, (eventsPerYear.get(state.date.year) ?? 0) + 1);
        if (action.type === 'CHOOSE') {
          const event = eventsById.get(view.eventId);
          if (event) {
            // 与 engine.view 使用相同初始 RNG 与求值顺序，记录玩家本次真正看到的条件文案。
            const probe = new Rng(state.rngState);
            const ctx = { state, pack: contentPack, rng: probe };
            const presentationIndex = event.presentationVariants?.findIndex(variant =>
              evalCondition(variant.condition, ctx),
            ) ?? -1;
            // 回响的"条件优先、否则兜底"规则由 core 的 selectContextLine 统一实现,
            // 工具侧直接复用,避免统计口径和引擎渲染漂移。
            const contextLine = selectContextLine(event, ctx);
            if (presentationIndex >= 0) presentationHits.push(`${event.id}#${presentationIndex}`);
            if (contextLine) contextLineHits.push(`${event.id}#${contextLine.index}`);
          }
          const choice = view.choices.find(c => c.id === action.choiceId);
          log(`\n▶ ${view.title}`);
          log(`  选择:${choice?.text}`);
        }
        break;
      case 'OUTCOME':
        log(`  ${view.text}${fmtDeltas(view.deltas)}`);
        break;
      default:
        break;
    }
    state = engine.dispatch(state, action);
    steps++;
  }
  throw new Error(`Run did not finish within 1000 steps (seed=${seed})`);
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

interface AcademicStats {
  runs: number;
  papers: number;
  emptyLists: number;
  withAbandoned: number;
  paperSamples: number[];
}

interface BatchStats {
  strategy: Strategy;
  academic: AcademicStats;
  runs: number;
  examSkill: number;
  endingCounts: Map<string, { title: string; count: number; moneySum: number; scoreSum: number }>;
  eventsSeen: Set<string>;
  totalRounds: number;
  statSums: Record<StatKey, number>;
  scoreSum: number;
  moneySamples: number[];
  stateSamples: number[];
  earlyEndingCount: number;
  byBackground: Map<string, { count: number; moneySum: number; stateSum: number; scoreSum: number }>;
  byCareer: Map<string, { count: number; moneySum: number; stateSum: number; scoreSum: number }>;
  stateYearly: Map<number, number[]>;
  /**
   * 课题做废的死法分布。**每一条死法都得有人盯着,否则它会悄悄变成死规则。**
   *
   * M3.1 就是这么发现 `MAX_REJECTIONS` 从来没生效过的:3000 局里 `rejections`
   * 的分布是 `{0: 323, 1: 1}`——而在此之前所有门禁都是绿的。
   */
  abandonReasons: Map<string, number>;
  /** 每所院校在多少局里被投递过 */
  institutionPicks: Map<string, number>;
  /** 节奏:每个自然年放了几幕事件 */
  eventsYearly: Map<number, number[]>;
  npcStats: Map<string, { active: number; completed: number; special: number; stages: Map<string, number> }>;
}

const NPC_SPECIAL_FLAGS: Record<string, string[]> = {
  first_love: ['love_true_companion', 'love_history_closure'],
  roommate: ['roommate_true_partner'],
  grinder: ['grinder_true_mirror'],
  hometown_friend: ['hometown_true_friend'],
  mentor: ['mentor_true_legacy'],
};

function runBatch(runs: number, baseSeed: number, strategy: Strategy, examSkill = 0): BatchStats {
  const stats: BatchStats = {
    strategy,
    runs,
    examSkill,
    endingCounts: new Map(),
    eventsSeen: new Set(),
    totalRounds: 0,
    academic: { runs: 0, papers: 0, emptyLists: 0, withAbandoned: 0, paperSamples: [] },
    statSums: { method: 0, money: 0, state: 0, capital: 0, clinical: 0 },
    scoreSum: 0,
    moneySamples: [],
    stateSamples: [],
    earlyEndingCount: 0,
    byBackground: new Map(),
    byCareer: new Map(),
    stateYearly: new Map(),
    abandonReasons: new Map(),
    institutionPicks: new Map(),
    eventsYearly: new Map(),
    npcStats: new Map(),
  };
  const earlyEndingIds = new Set(
    contentPack.endings.filter(e => e.category === 'early').map(e => e.id),
  );

  for (let i = 0; i < runs; i++) {
    const result = runOne(baseSeed + i, (baseSeed + i) ^ 0x5eed, strategy, false, examSkill);
    const fs = result.finalState;
    const entry = stats.endingCounts.get(result.endingId) ?? {
      title: result.endingTitle,
      count: 0,
      moneySum: 0,
      scoreSum: 0,
    };
    entry.count++;
    entry.moneySum += fs.stats.money;
    entry.scoreSum += result.endingScore;
    stats.endingCounts.set(result.endingId, entry);
    stats.totalRounds += fs.roundCounter;
    for (const h of fs.history) {
      if (h.kind === 'event') stats.eventsSeen.add(h.eventId);
    }
    for (const key of ['method', 'money', 'state', 'capital', 'clinical'] as StatKey[]) {
      stats.statSums[key] += fs.stats[key];
    }
    // 学术线专项统计(GAME_DESIGN 五节的三条硬约束在这里被量化)
    if (fs.flags.path_phd_direct || fs.flags.path_phd_after_master) {
      const papers = (fs.papers ?? []).length;
      stats.academic.runs++;
      stats.academic.papers += papers;
      stats.academic.paperSamples.push(papers);
      if (papers === 0) stats.academic.emptyLists++;
      if ((fs.projects ?? []).some(p => p.stage === 'abandoned')) stats.academic.withAbandoned++;
      for (const p of fs.projects ?? []) {
        if (p.stage !== 'abandoned' || p.isThesis) continue;
        // **阈值一律从引擎导入,不在这里抄一份。**
        // 抄过一次:MAX_REJECTIONS 从 3 调成 2 之后,这里还在按 3 判,
        // 于是被拒死的课题被算进了"玩家主动放弃",指标自己撒了谎。
        const why =
          (p.rejections ?? 0) >= MAX_REJECTIONS ? '投稿被拒'
          : (p.neglectedYears ?? 0) >= NEGLECT_YEARS_TO_ABANDON ? '烂在手里'
          : '做太久没写完 / 玩家主动放弃';
        stats.abandonReasons.set(why, (stats.abandonReasons.get(why) ?? 0) + 1);
      }
    }
    stats.scoreSum += result.endingScore;
    stats.moneySamples.push(fs.stats.money);
    stats.stateSamples.push(fs.stats.state);
    if (earlyEndingIds.has(result.endingId)) stats.earlyEndingCount++;

    for (const npcDef of contentPack.npcs) {
      const npc = fs.npcs[npcDef.id];
      if (!npc) continue;
      const row = stats.npcStats.get(npcDef.id) ?? { active: 0, completed: 0, special: 0, stages: new Map() };
      row.active++;
      row.stages.set(npc.stage, (row.stages.get(npc.stage) ?? 0) + 1);
      if (!npcDef.stages[npc.stage]?.eventId) row.completed++;
      if ((NPC_SPECIAL_FLAGS[npcDef.id] ?? []).some(flag => Boolean(fs.flags[flag]))) row.special++;
      stats.npcStats.set(npcDef.id, row);
    }

    const bgKey =
      backgroundLabels.get(fs.profile.background ?? '') ?? fs.profile.background ?? '未知';
    const careerKey = fs.profile.career
      ? (CAREER_LABELS[fs.profile.career] ?? fs.profile.career)
      : '未定线';
    for (const [map, key] of [
      [stats.byBackground, bgKey],
      [stats.byCareer, careerKey],
    ] as const) {
      const g = map.get(key) ?? { count: 0, moneySum: 0, stateSum: 0, scoreSum: 0 };
      g.count++;
      g.moneySum += fs.stats.money;
      g.stateSum += fs.stats.state;
      g.scoreSum += result.endingScore;
      map.set(key, g);
    }
    for (const [year, state] of result.stateByYear) {
      const arr = stats.stateYearly.get(year) ?? [];
      arr.push(state);
      stats.stateYearly.set(year, arr);
    }
    for (const id of result.institutionsPicked) {
      stats.institutionPicks.set(id, (stats.institutionPicks.get(id) ?? 0) + 1);
    }
    for (const [year, count] of result.eventsPerYear) {
      const arr = stats.eventsYearly.get(year) ?? [];
      arr.push(count);
      stats.eventsYearly.set(year, arr);
    }
  }
  stats.moneySamples.sort((a, b) => a - b);
  stats.stateSamples.sort((a, b) => a - b);
  return stats;
}

function printBatch(s: BatchStats): void {
  console.log('结局分布:');
  const sorted = [...s.endingCounts.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [id, { title, count, moneySum, scoreSum }] of sorted) {
    const pct = ((count / s.runs) * 100).toFixed(1).padStart(5);
    console.log(
      `  ${pct}%  【${title}】 (${id}, ${count} 局, 均分${Math.round(scoreSum / count)}, 均财¥${Math.round(moneySum / count).toLocaleString()})`,
    );
  }
  const missingEndings = contentPack.endings.filter(e => !s.endingCounts.has(e.id));
  if (missingEndings.length > 0) {
    console.log(`\n⚠️  从未到达的结局: ${missingEndings.map(e => e.id).join(', ')}`);
  }
  console.log(`\n事件覆盖: ${s.eventsSeen.size}/${contentPack.events.length}`);
  const missedEvents = contentPack.events.filter(e => !s.eventsSeen.has(e.id));
  if (missedEvents.length > 0) {
    console.log(`  未触发过的事件: ${missedEvents.map(e => e.id).join(', ')}`);
  }
  console.log(`平均回合数: ${(s.totalRounds / s.runs).toFixed(1)}`);
  console.log(
    `平均最终数值: 方法${(s.statSums.method / s.runs).toFixed(0)} 临床${(s.statSums.clinical / s.runs).toFixed(0)} 资本${(s.statSums.capital / s.runs).toFixed(0)} 状态${(s.statSums.state / s.runs).toFixed(0)} 金钱¥${(s.statSums.money / s.runs).toFixed(0)} · 均分${(s.scoreSum / s.runs).toFixed(0)}`,
  );
  console.log(
    `金钱分位: p10=¥${percentile(s.moneySamples, 10)} p50=¥${percentile(s.moneySamples, 50)} p90=¥${percentile(s.moneySamples, 90)}`,
  );
  console.log(
    `状态分位: p10=${percentile(s.stateSamples, 10)} p50=${percentile(s.stateSamples, 50)} p90=${percentile(s.stateSamples, 90)}`,
  );
  console.log(`提前结局占比: ${((s.earlyEndingCount / s.runs) * 100).toFixed(1)}%`);

  if (s.academic.runs > 0) {
    const a = s.academic;
    const sorted = [...a.paperSamples].sort((x, y) => x - y);
    console.log(
      `\n学术线(读到博士毕业)${a.runs} 局:` +
        ` 平均论文 ${(a.papers / a.runs).toFixed(2)} 篇` +
        ` (p10=${percentile(sorted, 10)} p50=${percentile(sorted, 50)} p90=${percentile(sorted, 90)})` +
        ` · 清单为空 ${((a.emptyLists / a.runs) * 100).toFixed(1)}%` +
        ` · 至少一个课题做废 ${((a.withAbandoned / a.runs) * 100).toFixed(1)}%`,
    );
  }

  console.log('\nNPC 关系完成率:');
  for (const npc of contentPack.npcs) {
    const row = s.npcStats.get(npc.id);
    if (!row) continue;
    const stages = [...row.stages.entries()].sort((a, b) => b[1] - a[1])
      .map(([stage, count]) => `${stage} ${((count / row.active) * 100).toFixed(1)}%`).join(' / ');
    console.log(
      `  ${npc.name}:激活 ${row.active} · 收官 ${((row.completed / row.active) * 100).toFixed(1)}% · 专属关系 ${((row.special / row.active) * 100).toFixed(1)}% · stage ${stages}`,
    );
  }

  const printGroups = (
    label: string,
    map: BatchStats['byBackground'],
  ): void => {
    console.log(`\n${label}:`);
    const rows = [...map.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [key, g] of rows) {
      console.log(
        `  ${key.padEnd(6, ' ')} ${String(g.count).padStart(4)} 局  均财¥${Math.round(g.moneySum / g.count).toLocaleString().padStart(9)}  状态均值${Math.round(g.stateSum / g.count)}  均分${Math.round(g.scoreSum / g.count)}`,
      );
    }
  };
  printGroups('按家境分组', s.byBackground);
  printGroups('按职业线分组', s.byCareer);

  const years = [...s.stateYearly.keys()].sort((a, b) => a - b);
  if (years.length > 0) {
    const curve = years
      .map(y => {
        const arr = [...(s.stateYearly.get(y) ?? [])].sort((a, b) => a - b);
        return `${y}:${percentile(arr, 50)}`;
      })
      .join(' ');
    console.log(`\n状态年度中位数(年初): ${curve}`);
  }

  // **节奏**。玩家累不累看的是这一行,不是事件总数。
  // 中位数后面括号里是 p90:偶尔一年特别满是好事,年年特别满就是负担。
  const evYears = [...s.eventsYearly.keys()].sort((a, b) => a - b);
  if (evYears.length > 0) {
    const line = evYears
      .map(y => {
        const arr = [...(s.eventsYearly.get(y) ?? [])].sort((a, b) => a - b);
        return `${y}:${percentile(arr, 50)}(p90 ${percentile(arr, 90)})`;
      })
      .join(' ');
    console.log(`每年事件数中位数: ${line}`);
  }

  // **每所院校被选中率**(TECH 里程碑门禁)。清单里有 27 所但实际只有 3 所可达 = 这份数据白做。
  if (s.institutionPicks.size > 0) {
    const total = s.runs;
    const rows = (contentPack.institutions ?? []).map(inst => ({
      name: inst.name,
      rate: (s.institutionPicks.get(inst.id) ?? 0) / total,
    }));
    const cold = rows.filter(r => r.rate < 0.005);
    console.log(
      `院校被投递率: 最高 ${(Math.max(...rows.map(r => r.rate)) * 100).toFixed(1)}% · ` +
        `最低 ${(Math.min(...rows.map(r => r.rate)) * 100).toFixed(2)}%` +
        (cold.length > 0 ? ` · ⚠️ 低于 0.5% 的 ${cold.length} 所: ${cold.map(r => r.name).join('、')}` : ''),
    );
  }

  if (s.abandonReasons.size > 0) {
    const total = [...s.abandonReasons.values()].reduce((a, b) => a + b, 0);
    const line = [...s.abandonReasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([why, n]) => `${why} ${((n / total) * 100).toFixed(0)}%`)
      .join(' · ');
    console.log(`课题做废的死法: ${line}(共 ${total} 个)`);
  }
}

// 可达性(事件覆盖 / 结局可达)取"瞎猜队列 ∪ 会做题队列"的并集:
// 高分档才开设的专业只有会做题的玩家才够得着,只用瞎猜队列会把这些内容误判成死内容。
// 分布类门禁(结局占比、提前结局、NPC 收官率)仍只看主队列,基线不受影响。
function runCheck(s: BatchStats, extra?: BatchStats): void {
  const failures: string[] = [];
  // **每所院校被选中率 ≥0.5%**(M3.5 里程碑门禁)。
  // 清单里有 27 所但实际只有 3 所可达 = 这份数据白做了,而且没有任何别的检查会发现——
  // validate 只看数据完整性,它不知道玩家实际能不能走到。
  {
    const picks = new Map<string, number>();
    for (const [id, n] of s.institutionPicks) picks.set(id, n);
    for (const [id, n] of extra?.institutionPicks ?? []) picks.set(id, (picks.get(id) ?? 0) + n);
    const total = s.runs + (extra?.runs ?? 0);
    const cold = (contentPack.institutions ?? []).filter(
      inst => (picks.get(inst.id) ?? 0) / total < 0.005,
    );
    if (total > 0 && picks.size > 0 && cold.length > 0) {
      failures.push(
        `院校被投递率过低(<0.5%): ${cold.map(i => i.name).join('、')}` +
          '——清单里有但走不到的院校等于没写',
      );
    }
  }
  const seenEvents = new Set([...s.eventsSeen, ...(extra?.eventsSeen ?? [])]);
  const reachedEndings = new Set([
    ...s.endingCounts.keys(),
    ...(extra ? extra.endingCounts.keys() : []),
  ]);
  if (seenEvents.size < contentPack.events.length) {
    const missed = contentPack.events.filter(e => !seenEvents.has(e.id)).map(e => e.id);
    failures.push(
      `事件覆盖不完整: ${seenEvents.size}/${contentPack.events.length} · 未触发 ${missed.join(', ')}`,
    );
  }
  for (const ending of contentPack.endings) {
    const entry = s.endingCounts.get(ending.id);
    // **兜底结局是安全网,到不了是好事。**
    // 它的作用是"所有结局条件都不命中时不至于崩",所以"从来没用上"恰恰说明结局条件覆盖完整。
    // 对它真正该查的是下面那条"占比不能超过 35%"——那才说明结局条件有洞。
    const isFallback = ending.id === contentPack.meta.fallbackEndingId;
    if (!reachedEndings.has(ending.id)) {
      if (!isFallback) failures.push(`结局从未到达: ${ending.id}`);
    } else if (entry && entry.count / s.runs > 0.4) {
      failures.push(
        `结局占比过高(>40%): ${ending.id} ${((entry.count / s.runs) * 100).toFixed(1)}%`,
      );
    }
  }
  const fallback = s.endingCounts.get(contentPack.meta.fallbackEndingId);
  if (fallback && fallback.count / s.runs > 0.35) {
    failures.push(`兜底结局占比过高(>35%): ${((fallback.count / s.runs) * 100).toFixed(1)}%`);
  }
  if (s.earlyEndingCount / s.runs > 0.1) {
    failures.push(`提前结局占比过高(>10%): ${((s.earlyEndingCount / s.runs) * 100).toFixed(1)}%`);
  }
  for (const npc of contentPack.npcs) {
    const row = s.npcStats.get(npc.id);
    if (!row || row.active === 0) {
      failures.push(`NPC 从未激活: ${npc.id}`);
      continue;
    }
    // 还没有任何阶段事件的人物线**没有东西可以收官**,收官率和专属关系率都无从谈起。
    // 不是放宽门禁,是这两个指标对它没有定义域——M4.5/M6 写完阶段事件之后它们自动重新生效。
    const hasStageEvents = Object.values(npc.stages).some(stage => stage.eventId !== undefined);
    if (!hasStageEvents) continue;
    const completionRate = row.completed / row.active;
    const minimumCompletion = 0.85;
    if (completionRate < minimumCompletion) {
      failures.push(
        `NPC 收官率过低(<${(minimumCompletion * 100).toFixed(0)}%): ${npc.id} ${(completionRate * 100).toFixed(1)}%`,
      );
    }
    const specialRate = row.special / row.active;
    if (specialRate < 0.03 || specialRate > 0.3) {
      failures.push(`NPC 专属关系命中率超出 3%-30%: ${npc.id} ${(specialRate * 100).toFixed(1)}%`);
    }
    for (const [stage, count] of row.stages) {
      if (!npc.stages[stage]?.eventId) continue;
      const stuckRate = count / row.active;
      if (stuckRate > 0.1) {
        failures.push(`NPC 非终态滞留率过高(>10%): ${npc.id}.${stage} ${(stuckRate * 100).toFixed(1)}%`);
      }
    }
  }
  // ── 学术线门禁(GAME_DESIGN 第五节的三条硬约束)────────────────────
  //
  // **这三个数字强烈依赖打法,而那个依赖本身就是机制。** 四种 bot 的实测(M3 标定完成时):
  //
  //   | bot                  | 论文  | 清单为空 | 做废   |
  //   |----------------------|-------|----------|--------|
  //   | score(集中投入)     | 2.46  |  1.3%    | 76.4%  |
  //   | random(平均分散)    | 1.49  | 12.6%    | 89.4%  |
  //   | money / state        | ~1.1  | ~26%     | ~96%   |
  //
  // **会不会分配精力,就是"会不会做研究"在这个游戏里的全部含义。**
  // 而"至少一个课题彻底做废"在**四种打法下全部 ≥70%**——这是第五节那条硬约束的真正落点:
  // 做废不是惩罚,是这个职业最普遍的经验,好玩家也躲不掉。
  //
  // 阈值按 `--check` 实际使用的随机 bot 定,留了回归余量。
  // TECH 7.2 写的"平均论文数 3–9"是按会打的玩家定的:`--bot score` 的中位数正好是 3,
  // 但均值只有 2.46——差的那部分在博后(M5),那是真实世界里产出最高的两三年。
  const academic = s.academic;
  if (academic.runs >= 20) {
    const avgPapers = academic.papers / academic.runs;
    if (avgPapers < 1.2 || avgPapers > 9) {
      failures.push(`学术线平均论文数超出 1.2–9(随机 bot 口径): ${avgPapers.toFixed(2)}`);
    }
    const emptyRate = academic.emptyLists / academic.runs;
    if (emptyRate > 0.2) {
      failures.push(`论文清单为空的比例过高(>20%): ${(emptyRate * 100).toFixed(1)}%`);
    }
    const abandonRate = academic.withAbandoned / academic.runs;
    if (abandonRate < 0.7) {
      failures.push(
        `至少一个课题做废的比例过低(<70%): ${(abandonRate * 100).toFixed(1)}%` +
          `——做废是这个职业最普遍的经验,不该是稀有事件`,
      );
    }
  }

  console.log('');
  if (failures.length > 0) {
    for (const f of failures) console.log(`❌ ${f}`);
    process.exit(1);
  }
  const coverageNote = extra
    ? `瞎猜 ${s.runs} 局 ∪ 会做题 ${extra.runs} 局`
    : `${s.runs} 局`;
  console.log(`✅ 分布与 NPC 关系门禁通过(全覆盖、全可达(${coverageNote})、结局分布、收官率、专属关系率、stage 滞留率均达标)`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.verbose) {
    const seed = args.seed ?? Math.floor(Math.random() * 2147483646) + 1;
    console.log(`《${contentPack.meta.title}》 seed=${seed} bot=${STRATEGY_LABELS[args.strategy]}\n`);
    runOne(seed, seed ^ 0x5eed, args.strategy, true);
    return;
  }

  const baseSeed = args.seed ?? 42;

  if (args.compare) {
    console.log(`策略对比,每种策略 ${args.runs} 局 (baseSeed=${baseSeed}) ...\n`);
    const batches = (['random', 'money', 'state', 'score'] as Strategy[]).map(strategy =>
      runBatch(args.runs, baseSeed, strategy),
    );
    console.log('策略     均分  均财        状态均值  崩溃率   Top 结局');
    for (const b of batches) {
      const top = [...b.endingCounts.entries()].sort((x, y) => y[1].count - x[1].count)[0];
      const topText = top
        ? `${top[1].title} ${((top[1].count / b.runs) * 100).toFixed(0)}%`
        : '-';
      console.log(
        `${STRATEGY_LABELS[b.strategy].padEnd(4, ' ')}  ${String(Math.round(b.scoreSum / b.runs)).padStart(4)}  ¥${Math.round(b.statSums.money / b.runs).toLocaleString().padStart(9)}  ${String(Math.round(b.statSums.state / b.runs)).padStart(6)}  ${((b.earlyEndingCount / b.runs) * 100).toFixed(1).padStart(5)}%   ${topText}`,
      );
    }
    console.log('\n(各策略结局分布)');
    for (const b of batches) {
      console.log(`\n--- ${STRATEGY_LABELS[b.strategy]} bot ---`);
      const sorted = [...b.endingCounts.entries()].sort((x, y) => y[1].count - x[1].count);
      for (const [id, { title, count }] of sorted.slice(0, 6)) {
        console.log(`  ${(((count / b.runs) * 100).toFixed(1)).padStart(5)}%  【${title}】 (${id})`);
      }
    }
    return;
  }

  console.log(
    `模拟 ${args.runs} 局 (baseSeed=${baseSeed}, bot=${STRATEGY_LABELS[args.strategy]}, 答题正确率=${(args.examSkill * 100).toFixed(0)}%) ...`,
  );
  const t0 = Date.now();
  const batch = runBatch(args.runs, baseSeed, args.strategy, args.examSkill);
  const elapsed = Date.now() - t0;
  console.log(`\n完成,耗时 ${elapsed}ms (${(elapsed / args.runs).toFixed(2)}ms/局)\n`);
  printBatch(batch);

  // --check 时补一个"会做题"的队列:主队列瞎猜答题,91.5% 落在二本/专科,
  // 高分档专业(心理学/金融学/计算机科学与技术)长期缺样本,可达性会被误判。
  let eliteBatch: BatchStats | undefined;
  if (args.check && args.examSkill < 1) {
    const eliteRuns = Math.max(300, Math.round(args.runs / 2));
    console.log(`\n--- 补测:会做题的 bot(答题正确率 100%,${eliteRuns} 局,只并入可达性判定) ---`);
    eliteBatch = runBatch(eliteRuns, baseSeed + 100000, args.strategy, 1);
    // 兜底结局(`always: true`)**永远到不了才是对的**——它到得了就说明有局没匹配上真结局。
    // 不标出来的话,"结局到达 12/13"每次都会让人以为有一个结局写废了(已经追查过一次)。
    const fallbackId = contentPack.meta.fallbackEndingId;
    const reachable = contentPack.endings.filter(e => e.id !== fallbackId).length;
    const hitFallback = eliteBatch.endingCounts.has(fallbackId);
    const seenReal = [...eliteBatch.endingCounts.keys()].filter(id => id !== fallbackId).length;
    console.log(
      `事件覆盖: ${eliteBatch.eventsSeen.size}/${contentPack.events.length} · 结局到达 ${seenReal}/${reachable}` +
        (hitFallback ? ' · ⚠️ 有对局落到了兜底结局' : '(兜底结局不计:它到得了才是 bug)'),
    );
    const careerLine = [...eliteBatch.byCareer.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, row]) => `${CAREER_LABELS[id] ?? id} ${((row.count / eliteBatch!.runs) * 100).toFixed(1)}%`)
      .join(' · ');
    console.log(`职业线分布: ${careerLine}`);
  }
  if (args.check) runCheck(batch, eliteBatch);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
