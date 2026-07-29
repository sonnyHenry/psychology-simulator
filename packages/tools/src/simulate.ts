import {
  MAX_REJECTIONS,
  NEGLECT_YEARS_TO_ABANDON,
  createEngine,
  evalCondition,
  lowerTier,
  relationLabel,
  Rng,
  selectContextLine,
  tierForQuality,
  tierRank,
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
  master: '学术硕士',
  phd: '博士',
  phd_direct: '直博',
  overseas_phd: '海外 PhD',
  postdoc: '博后',
  faculty_candidate: '教职候选',
  faculty: '高校教职',
  clinical: '独立咨询',
  hospital: '医院心理科',
  school: '学校心理教师',
  industry: '企业用研/产品',
  left: '离开这一行',
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
/** 院校名 → 档次。门禁"A+ 校 vs 双非的毕业达成率差 ≥15pp"要按档次分层 */
const institutionTierByName = new Map(
  (contentPack.institutions ?? []).map(inst => [inst.name, inst.tier as string]),
);

const examAnswers = new Map(
  [...contentPack.examBank, ...(contentPack.courseExamBank ?? [])].map(q => [q.id, q.answerIndex]),
);

/**
 * 选刊的 bot 策略(M4.6)。返回 null = 这一屏没有要做的投稿决策。
 *
 * ## 为什么不直接"投应得的那一档"
 *
 * 那样门禁"选刊各档使用率 ≥10%"永远测不出东西:`quality` 的分布决定一切,
 * 而玩家真正在做的判断是"我今年赌不赌得起"。所以 bot 按质量给四档**加权**,
 * 每一档都有真实份额——统计出来的分布才是"这个决策空间长什么样",
 * 而不是"tierForQuality 长什么样"。
 *
 * ## 降档只降到应得的那一档为止
 *
 * 这条同时是**终止性保证**(`DESK_ACTION` 不离开工作台屏,所以必须自己收敛),
 * 也是一个说得通的策略:被拒之后退回到这篇东西本来配得上的位置。
 * "一路降到能中为止"那种刷法在这里天然做不到——每次改投吃掉一年,而学制只有几年。
 */
function chooseSubmitTierAction(
  view: Extract<ViewModel, { kind: 'DESK' }>,
  state: GameState,
  bot: Rng,
): PlayerAction | null {
  for (const project of view.projects) {
    if (!project.atSubmitStage) continue;
    const raw = (state.projects ?? []).find(p => p.id === project.id);
    if (!raw) continue;
    const deserved = tierForQuality(raw.quality);
    if (!raw.submitTier) {
      const candidates = view.actions.filter(
        a => a.id === 'desk_choose_tier' && a.targetId === project.id,
      );
      if (candidates.length === 0) continue;
      // 质量越高越敢冲,但每一档都留着真实份额(下限)。
      //
      // **下限不是凑数,它是这条门禁的定义域**:一个只按 `quality` 挑档的 bot
      // 会把"选刊各档 ≥10%"变成"tierForQuality 的分布"——而那不是玩家在做的判断。
      // 反过来,不随质量变化的权重会让一堆"还有硬伤"的稿子去投一区,
      // 于是被拒死的课题变多、平均论文数掉下来(量过:1.57 → 1.33)。
      const weightOf = (tier: string): number => {
        const q = raw.quality;
        if (tier === 'chinese_core') return 1 + Math.max(0, (55 - q) / 20);
        if (tier === 'q3') return 1.1;
        if (tier === 'q2') return Math.max(0.5, (q - 45) / 15);
        return Math.max(0.5, (q - 58) / 14);
      };
      const chosen = bot.weightedPick(candidates, a => weightOf(a.value ?? ''));
      return { type: 'DESK_ACTION', actionId: chosen.id, targetId: chosen.targetId, value: chosen.value };
    }
    // 被拒过、而且当初投得比应得的高 → 有一定概率退一档再投。
    //
    // **不是每次被拒都改投**:真实的人有相当一部分会原样再投一次、或者干脆放着。
    // 一律改投的话降档率会跑到 70%,而那个数字反映的是 bot 的固执,不是这个决策的形状。
    const RESUBMIT_RATE = 0.3;
    if (raw.rejections > 0 && tierRank(raw.submitTier) > tierRank(deserved) && bot.chance(RESUBMIT_RATE)) {
      const next = lowerTier(raw.submitTier);
      const action = view.actions.find(
        a => a.id === 'desk_resubmit_lower' && a.targetId === project.id && a.value === next,
      );
      if (action) {
        return { type: 'DESK_ACTION', actionId: action.id, targetId: action.targetId, value: action.value };
      }
    }
  }
  return null;
}

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
    case 'INVENTORY':
      if (view.result) return { type: 'CONTINUE' };
      if (!view.question) throw new Error(`INVENTORY ${view.inventoryId} has neither question nor result`);
      return { type: 'ANSWER_INVENTORY', optionIndex: bot.int(0, view.question.options.length - 1) };
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
    case 'ADVISOR_DRAW':
      // **先打听,再选。** 13.3 的全部意义就是把这一屏从"闭眼选"变成"调查后选",
      // 所以 bot 也要真的问——不问的话"打听使用率"这条门禁量的永远是 0。
      if (view.ask.asksLeft > 0 && view.ask.options.length > 0) {
        return { type: 'ASK_AROUND', rumorId: bot.pick(view.ask.options).id };
      }
      // 问完之后 bot 仍然随机挑:**它读不懂那几句话**。
      // 这恰恰是对这个机制最诚实的模拟——情报不给数值优势,只减少方差,
      // 能不能用是玩家的事,不是 bot 的事。
      return { type: 'JOIN_ADVISOR', advisorId: bot.pick(view.candidates).id };
    case 'DESK': {
      // 工作台上也能打听(手上课题的地基、你导师)。同样先问再投
      if (view.ask.asksLeft > 0 && view.ask.options.length > 0 && bot.chance(0.5)) {
        return { type: 'ASK_AROUND', rumorId: bot.pick(view.ask.options).id };
      }
      // ── 先做不花格数的当场决策(选刊 / 降档改投),再分配格子 ──
      //
      // 两种动作走两条通路(TECH 4.4),bot 也照这个顺序:`DESK_ACTION` 不离开这一屏,
      // 所以下一次循环还会回到 DESK,最后一定落到 `ALLOCATE` 上。
      // **终止性靠"只往下降到应得的那一档为止"保证**,不靠计数器。
      const tierAction = chooseSubmitTierAction(view, state, bot);
      if (tierAction) return tierAction;

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
          // 同理,**接个案是咨询师的默认动作**:不接个案的年份,临床线什么都不发生
          // (开案容量 = 2 × 接个案格数,见 systems/case.ts)。
          if (item.id === 'alloc_casework') return 4;
          // **「寻求指导」要被真的用起来。** 三格经济里一格很贵,均匀随机下它每年
          // 只有十分之一的机会被选中,于是六原型分流表在门禁里长期缺样本——
          // 而那张表恰恰是 M4.6 唯一的新内容。门禁"使用率 ≥60%"守的就是这个定价。
          if (item.id === 'alloc_advisor_consult') return 2;
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
    case 'JOB_MARKET': {
      // 投递那一步是多选,别的步都是选项。**bot 求稳**:按模糊档位从稳到悬排,
      // 投满上限——它读不懂条款,只能按清单顺序来,而这对"一个都没有"的
      // 门禁恰恰是最诚实的模拟(玩家的判断力不该被算进市场松紧里)。
      if (view.step === 'targeting') {
        const order = ['稳', '较稳', '冲', '悬', '基本无望'];
        // **学术岗排在退路前面。** 不这么排的话 bot 会把八个名额全填给"稳"的退路岗,
        // 于是没有人再去投教职——那不是一个求职策略,那是一个排序 bug 的副作用。
        const isBackup = (kind: string) => kind.includes('医院') || kind.includes('机构')
          || kind.includes('企业') || kind.includes('中小学');
        const sorted = [...view.positions].sort((a, b) => {
          const backupDiff = Number(isBackup(a.kindLabel)) - Number(isBackup(b.kindLabel));
          if (backupDiff !== 0) return backupDiff;
          return order.indexOf(a.chanceLabel) - order.indexOf(b.chanceLabel);
        });
        return {
          type: 'JOB_MARKET_STEP',
          positionIds: sorted.slice(0, view.maxPicks).map(p => p.id),
        };
      }
      if (view.options.length === 0) return { type: 'JOB_MARKET_STEP' };
      return { type: 'JOB_MARKET_STEP', optionId: bot.pick(view.options).id };
    }
    case 'TENURE_REVIEW':
      return { type: 'CONTINUE' };
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
  /** 这一局有没有遇到过地基塌方(门禁:学术线 ≥45%) */
  sawCollapse: boolean;
  /** 塌方那一幕实际选了哪个(门禁:四个选项各 ≥8%) */
  collapseChoices: string[];
  // ── M4.6 工作台门禁读的五笔账 ────────────────────────────
  /**
   * 「寻求指导」这一格**出现过**没有 / **用过**没有。
   *
   * 分母是"出现过"而不是"有导师":导师是大三进组就抽好的,而这一格只在
   * 你还在读的时候才在。拿"有导师"当分母,门禁量的就变成"多少人走了学术/临床线",
   * 跟这一格的定价没关系了。
   */
  consultOffered: boolean;
  usedConsult: boolean;
  /** 命中过的「寻求指导」结果 id(门禁:六原型每种 ≥1%) */
  consultResults: string[];
  /** 局终的师生关系档位(门禁:最高档 ≤50%) */
  finalRelation: string | null;
  /** 选过的目标档位(门禁:每档 ≥10%) */
  submitTierPicks: string[];
  /** 降档改投的次数(门禁:发生率 15%–40%) */
  resubmitCount: number;
  /** 局终有没有达到所在院校的毕业指标 + 那所院校的档次(门禁:A+ vs 双非 ≥15pp) */
  graduation: { tier: string; met: boolean } | null;
  // ── M4.5 社会层门禁读的四笔账 ────────────────────────────
  /** 打听这个入口出现过没有 / 用过没有(门禁:出现过的对局里 ≥60% 用过) */
  askOffered: boolean;
  askUsed: boolean;
  /**
   * **被假消息误导过没有**(门禁:15%–35%)。
   *
   * 口径是"误导",不是"听到假的":玩家听到一条关于某导师的假消息、**而且真的进了那个组**,
   * 才算被它误导。只数"假消息占比"的话量到的是内容配比(规则 18 已经在管),
   * 跟这个机制有没有真的干扰过决策没关系。
   */
  misledByRumor: boolean | null;
  /** 局终玩家论文数 vs 竞争者(门禁:玩家胜出 35%–65%) */
  rivalCompare: { playerPapers: number; rivalPapers: number } | null;
  // ── M5 求职季门禁读的四笔账 ────────────────────────────
  /** 走到过求职季没有(分母) */
  jobMarketReached: boolean;
  /** 拿到几个 offer。**0 = "一个都没有",门禁 20%–40%** */
  jobOffers: number;
  /** 最后接了哪个 */
  jobAccepted: string | null;
  /** 长聘首考过没过。null = 没走到那一步(门禁 30%–50%) */
  tenureJudged: boolean | null;
  /** 两体问题的归宿(门禁:五种各 ≥5%) */
  twoBody: string | null;
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
  let sawCollapse = false;
  const collapseChoices: string[] = [];
  let consultOffered = false;
  let usedConsult = false;
  const consultResults: string[] = [];
  const submitTierPicks: string[] = [];
  let resubmitCount = 0;
  let graduation: { tier: string; met: boolean } | null = null;
  let askOffered = false;
  let askUsed = false;
  /** 听到过假消息的导师话题。JOIN_ADVISOR 时用它判"有没有被误导" */
  const heardFalseAbout = new Set<string>();
  let misledByRumor: boolean | null = null;
  let jobMarketReached = false;
  let jobOffers = 0;
  let jobAccepted: string | null = null;
  let tenureJudged: boolean | null = null;
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
        sawCollapse,
        collapseChoices: [...collapseChoices],
        consultOffered,
        usedConsult,
        consultResults: [...consultResults],
        finalRelation: state.advisor ? relationLabel(state.advisor.favor) : null,
        submitTierPicks: [...submitTierPicks],
        resubmitCount,
        graduation,
        askOffered,
        askUsed,
        misledByRumor,
        jobMarketReached,
        jobOffers,
        jobAccepted,
        tenureJudged,
        twoBody: state.jobMarket?.twoBody ?? null,
        rivalCompare: state.rival
          ? {
              // 预印本进结局清单，但不拿来和竞争者的正式发表数比赛。
              playerPapers: (state.papers ?? []).filter(paper => paper.tier !== 'preprint').length,
              rivalPapers: state.rival.papers,
            }
          : null,
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
        if (view.ask.options.length > 0 || view.ask.heard.length > 0) askOffered = true;
        if (action.type === 'ASK_AROUND') {
          askUsed = true;
          // **只有工具能看 accurate。** ViewModel 里没有它,所以这里从内容包直接读——
          // 门禁要量"这个机制有没有真的干扰过决策",而那必须知道哪条是假的。
          const def = contentPack.rumors?.find(r => r.id === action.rumorId);
          if (def && !def.accurate) heardFalseAbout.add(def.topic);
          log(`  🗣 打听(${def?.source}):${def?.text}`);
        }
        if (action.type === 'JOIN_ADVISOR') {
          // 听过关于他的假话、而且真的进了他的组 = 被误导了
          if (askOffered) misledByRumor = heardFalseAbout.has(`advisor:${action.advisorId}`);
          log(`\n🎓 进组:${view.candidates.find(c => c.id === action.advisorId)?.name}`);
        }
        break;
      case 'DESK':
        if (view.ask.options.length > 0 || view.ask.heard.length > 0) askOffered = true;
        if (action.type === 'ASK_AROUND') askUsed = true;
        // **选刊要记账**:门禁"各档 ≥10%""降档改投 15%–40%"读的就是这两笔
        if (action.type === 'DESK_ACTION' && action.value) {
          if (action.actionId === 'desk_choose_tier') submitTierPicks.push(action.value);
          if (action.actionId === 'desk_resubmit_lower') resubmitCount += 1;
          log(`\n📮 选刊: ${view.actions.find(a => a.id === action.actionId && a.value === action.value)?.label}`);
        }
        if (action.type === 'ALLOCATE') {
          if (view.projects.length > 0) {
            log(`\n📋 白板: ${view.projects.map(p => `「${p.title}」${p.stage}(第 ${p.yearsSpent + 1} 年)`).join(' · ')}`);
          }
          if (view.graduation) {
            log(`🎓 ${view.graduation.institution} ${view.graduation.bar} — ${view.graduation.have.join(' · ')}${view.graduation.remaining ? `,${view.graduation.remaining}` : ',已达标'}`);
            // 每年覆盖一次:门禁看的是**离开这个阶段时**够没够,所以留最后一次
            const tier = institutionTierByName.get(view.graduation.institution);
            if (tier) graduation = { tier, met: view.graduation.met };
          }
          if (view.items.some(item => item.id === 'alloc_advisor_consult')) consultOffered = true;
          if (action.picks.includes('alloc_advisor_consult')) usedConsult = true;
          const labels = new Map(view.items.map(item => [item.id, item.label]));
          const counted = new Map<string, number>();
          for (const id of action.picks) counted.set(id, (counted.get(id) ?? 0) + 1);
          const summary = [...counted.entries()]
            .map(([id, n]) => `${labels.get(id) ?? id}${n > 1 ? `×${n}` : ''}`)
            .join(' · ');
          log(`\n🎯 ${view.year} 年投入(${view.slots} 格${view.retakeSlots > 0 ? `,重修占 ${view.retakeSlots} 格` : ''}): ${summary}`);
        }
        break;
      case 'JOB_MARKET':
        if (view.step === 'targeting' && action.type === 'JOB_MARKET_STEP') {
          jobMarketReached = true;
          log(`\n💼 ${view.year} 年求职季:投了 ${action.positionIds?.length ?? 0} 个`);
        }
        if (view.step === 'result') {
          jobOffers = view.offers.length;
          if (action.type === 'JOB_MARKET_STEP') {
            jobAccepted = action.optionId && action.optionId !== 'leave_academia' ? action.optionId : null;
          }
          log(`  结果:${view.offers.length} 个 offer`);
        }
        break;
      case 'TENURE_REVIEW':
        tenureJudged = view.passed;
        log(`\n🏛 长聘首考:${view.passed ? '通过' : '未通过'}`);
        for (const line of view.lines) {
          log(`  ${line.label}: ${line.actual}${line.required ? ` (要求:${line.required})` : ''}`);
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
        // 「寻求指导」命中了哪一支。**门禁"六原型每种 ≥1%"读这一笔**——
        // 那张分流表是六原型第一次被玩家主动感知到,有一格走不到就是白写。
        if (view.eventId.startsWith('ev_consult_')) {
          consultResults.push(view.eventId.slice('ev_consult_'.length));
        }
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
          if (view.eventId.startsWith('ev_collapse_')) {
            sawCollapse = true;
            if (action.type === 'CHOOSE') collapseChoices.push(action.choiceId);
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

/**
 * 临床线专项统计(M4)。
 *
 * **脱落率的分母是"已终结的个案"**(脱落 + 自然结束 + 转介),不是全部个案——
 * 一个还在谈的个案没有"结束方式"可言。TECH 7.2 的门禁区间 15%–40% 用的就是这个口径。
 */
interface ClinicalStats {
  runs: number;
  cases: number;
  dropped: number;
  completed: number;
  referred: number;
  activeAtEnd: number;
  hoursSamples: number[];
}

interface BatchStats {
  strategy: Strategy;
  academic: AcademicStats;
  clinical: ClinicalStats;
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
  collapseRuns: number;
  projectRuns: number;
  collapseChoicePicks: Map<string, number>;
  /** 节奏:每个自然年放了几幕事件 */
  eventsYearly: Map<number, number[]>;
  npcStats: Map<string, { active: number; completed: number; special: number; stages: Map<string, number> }>;
  /** M4.6 工作台门禁的五组统计 */
  desk: DeskStats;
  /** M4.5 社会层门禁的三组统计 */
  social: SocialStats;
  /** M5 求职季与长聘首考门禁 */
  career: CareerStats;
  /** M6 六条职业出口的互斥分布(后续转向按最终出口归类) */
  m6Paths: Map<string, number>;
  /** M7 量表 / drama / 黑天鹅 / 隐线的动态门禁。 */
  m7: {
    fullRuns: number;
    inventoryById: Map<string, number>;
    discrepancyRuns: number;
    dramaTotal: number;
    academicRuns: number;
    academicDramaTotal: number;
    clinicalRuns: number;
    clinicalDramaTotal: number;
    blackSwanCounts: Map<number, number>;
    retractions: number;
    originTotal: number;
    studentLists: number;
  };
}

/**
 * 求职季与长聘首考(TECH 7.2 / M5)。
 *
 * **"一个都没有"和"首考没过"这两条都是双向门禁**:太低说明这一行被写得太顺,
 * 太高说明玩家做什么都没用。它们量的是同一件事——这条路的真实难度。
 */
interface CareerStats {
  marketRuns: number;
  shutoutRuns: number;
  domesticOffers: number;
  overseasOffers: number;
  tenureRuns: number;
  tenurePassed: number;
  twoBody: Map<string, number>;
}

/**
 * 社会层门禁(TECH 7.2 / M4.5)。三条各守一个机制**不退化**:
 * 竞争者不变成固定难度曲线、打听不变成没人点的入口、假消息不变成攻略或噪声。
 */
interface SocialStats {
  askOfferedRuns: number;
  askUsedRuns: number;
  rumorJudgedRuns: number;
  misledRuns: number;
  rivalRuns: number;
  playerAheadRuns: number;
  rivalPapersSum: number;
  playerPapersSum: number;
}

/**
 * 工作台门禁(TECH 7.2)。**每一条都在守一件已经付过学费的事:**
 * 使用率守定价、六原型命中守"那张表没白写"、关系档位守"关系不是进度条"、
 * 选刊分布守"四档不是摆设"、降档率守"一路降到能中为止"这条刷法没生效。
 */
interface DeskStats {
  /** 分母:「寻求指导」这一格真的出现过的对局 */
  withAdvisor: number;
  consultRuns: number;
  consultResults: Map<string, number>;
  relationTiers: Map<string, number>;
  submitTiers: Map<string, number>;
  submitRuns: number;
  resubmitRuns: number;
  /** 按院校档次分层的毕业达成率 */
  graduationByTier: Map<string, { runs: number; met: number }>;
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
    clinical: { runs: 0, cases: 0, dropped: 0, completed: 0, referred: 0, activeAtEnd: 0, hoursSamples: [] },
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
    collapseRuns: 0,
    projectRuns: 0,
    collapseChoicePicks: new Map(),
    eventsYearly: new Map(),
    npcStats: new Map(),
    career: {
      marketRuns: 0,
      shutoutRuns: 0,
      domesticOffers: 0,
      overseasOffers: 0,
      tenureRuns: 0,
      tenurePassed: 0,
      twoBody: new Map(),
    },
    m6Paths: new Map(),
    m7: {
      fullRuns: 0,
      inventoryById: new Map(),
      discrepancyRuns: 0,
      dramaTotal: 0,
      academicRuns: 0,
      academicDramaTotal: 0,
      clinicalRuns: 0,
      clinicalDramaTotal: 0,
      blackSwanCounts: new Map(),
      retractions: 0,
      originTotal: 0,
      studentLists: 0,
    },
    social: {
      askOfferedRuns: 0,
      askUsedRuns: 0,
      rumorJudgedRuns: 0,
      misledRuns: 0,
      rivalRuns: 0,
      playerAheadRuns: 0,
      rivalPapersSum: 0,
      playerPapersSum: 0,
    },
    desk: {
      withAdvisor: 0,
      consultRuns: 0,
      consultResults: new Map(),
      relationTiers: new Map(),
      submitTiers: new Map(),
      submitRuns: 0,
      resubmitRuns: 0,
      graduationByTier: new Map(),
    },
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
    // ── M7 元玩法与高强度内容统计 ──
    {
      const eventHistory = fs.history.filter(h => h.kind === 'event');
      const drama = eventHistory.filter(h => h.category === 'drama');
      const blackSwans = eventHistory.filter(h => h.category === 'blackswan').length;
      const origin = eventHistory.filter(h => h.category === 'origin').length;
      const early = earlyEndingIds.has(result.endingId);
      if (!early) {
        stats.m7.fullRuns++;
        stats.m7.blackSwanCounts.set(
          blackSwans,
          (stats.m7.blackSwanCounts.get(blackSwans) ?? 0) + 1,
        );
        stats.m7.originTotal += origin;
      }
      stats.m7.dramaTotal += drama.length;
      for (const inventory of fs.inventoryResults ?? []) {
        stats.m7.inventoryById.set(
          inventory.inventoryId,
          (stats.m7.inventoryById.get(inventory.inventoryId) ?? 0) + 1,
        );
      }
      if ((fs.inventoryResults ?? []).some(item => item.discrepancyKind !== 'aligned')) {
        stats.m7.discrepancyRuns++;
      }
      const academic = Boolean(fs.flags.path_phd_direct || fs.flags.path_phd_after_master || fs.flags.path_overseas);
      if (academic) {
        stats.m7.academicRuns++;
        stats.m7.academicDramaTotal += drama.filter(h => h.eventId.startsWith('ev_drama_ac_')).length;
        if (fs.flags.paper_retracted) stats.m7.retractions++;
      }
      if (fs.flags.path_clinical) {
        stats.m7.clinicalRuns++;
        stats.m7.clinicalDramaTotal += drama.filter(h => {
          const event = eventsById.get(h.eventId);
          return event?.pools.some(pool => pool.startsWith('clinical')) ?? false;
        }).length;
      }
      if ((fs.students ?? []).length > 0) stats.m7.studentLists++;
    }
    for (const key of ['method', 'money', 'state', 'capital', 'clinical'] as StatKey[]) {
      stats.statSums[key] += fs.stats[key];
    }
    // 学术线专项统计(GAME_DESIGN 五节的三条硬约束在这里被量化)
    if (fs.flags.path_phd_direct || fs.flags.path_phd_after_master || fs.flags.path_overseas) {
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
    // 临床线专项统计(M4)。分母只算走了临床线的对局。
    if (fs.flags.track_clinical) {
      stats.clinical.runs++;
      stats.clinical.hoursSamples.push(
        typeof fs.flags.clinical_hours === 'number' ? fs.flags.clinical_hours : 0,
      );
      for (const kase of fs.cases ?? []) {
        stats.clinical.cases++;
        if (kase.status === 'dropped') stats.clinical.dropped++;
        else if (kase.status === 'completed') stats.clinical.completed++;
        else if (kase.status === 'referred') stats.clinical.referred++;
        else stats.clinical.activeAtEnd++;
      }
    }
    // ── M5 求职季统计 ──
    if (result.jobMarketReached) {
      stats.career.marketRuns++;
      if (result.jobOffers === 0) stats.career.shutoutRuns++;
      if (fs.flags.job_overseas) stats.career.overseasOffers++;
      if (fs.flags.job_domestic) stats.career.domesticOffers++;
    }
    if (result.tenureJudged !== null) {
      stats.career.tenureRuns++;
      if (result.tenureJudged) stats.career.tenurePassed++;
    }
    if (result.twoBody) {
      stats.career.twoBody.set(result.twoBody, (stats.career.twoBody.get(result.twoBody) ?? 0) + 1);
    }

    // ── M6 路径分布。按最终出口互斥归类,避免“读硕后转学校”同时算学术与学校。──
    const m6Path = fs.flags.path_hospital ? 'hospital'
      : fs.flags.path_school ? 'school'
      : fs.flags.path_industry ? 'industry'
      : fs.flags.path_leave ? 'left'
      : fs.flags.path_clinical ? 'clinical'
      : fs.flags.track_academic ? 'academic'
      : null;
    if (m6Path) stats.m6Paths.set(m6Path, (stats.m6Paths.get(m6Path) ?? 0) + 1);

    // ── M4.5 社会层统计 ──
    if (result.askOffered) {
      stats.social.askOfferedRuns++;
      if (result.askUsed) stats.social.askUsedRuns++;
    }
    if (result.misledByRumor !== null) {
      stats.social.rumorJudgedRuns++;
      if (result.misledByRumor) stats.social.misledRuns++;
    }
    if (result.rivalCompare) {
      const { playerPapers, rivalPapers } = result.rivalCompare;
      // **分母只算学术线。** 论文数是学术线的记分方式;一个去了大厂的玩家
      // 和一个还在发论文的旧同学之间,"谁领先"这个问题本身就没有定义。
      // 算进去的话这条门禁量的是路径分布,不是这个对手强不强。
      const stayedAcademic = Boolean(fs.flags.track_academic)
        && !fs.flags.path_hospital
        && !fs.flags.path_school
        && !fs.flags.path_industry
        && !fs.flags.path_leave
        && !fs.flags.path_clinical;
      if (stayedAcademic && playerPapers + rivalPapers > 0) {
        stats.social.rivalRuns++;
        if (playerPapers > rivalPapers) stats.social.playerAheadRuns++;
        stats.social.playerPapersSum += playerPapers;
        stats.social.rivalPapersSum += rivalPapers;
      }
    }

    // ── M4.6 工作台统计 ──
    if (result.consultOffered) {
      stats.desk.withAdvisor++;
      if (result.usedConsult) stats.desk.consultRuns++;
      if (result.finalRelation) {
        stats.desk.relationTiers.set(
          result.finalRelation,
          (stats.desk.relationTiers.get(result.finalRelation) ?? 0) + 1,
        );
      }
    }
    for (const hit of result.consultResults) {
      stats.desk.consultResults.set(hit, (stats.desk.consultResults.get(hit) ?? 0) + 1);
    }
    if (result.submitTierPicks.length > 0) {
      stats.desk.submitRuns++;
      if (result.resubmitCount > 0) stats.desk.resubmitRuns++;
    }
    for (const tier of result.submitTierPicks) {
      stats.desk.submitTiers.set(tier, (stats.desk.submitTiers.get(tier) ?? 0) + 1);
    }
    if (result.graduation) {
      const row = stats.desk.graduationByTier.get(result.graduation.tier) ?? { runs: 0, met: 0 };
      row.runs++;
      if (result.graduation.met) row.met++;
      stats.desk.graduationByTier.set(result.graduation.tier, row);
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
    // **分母是"手上有过真课题的对局",不是全部对局。**
    // 没进学术线的人根本没有地基可塌,把他们算进分母只会让这个数字失去意义。
    if ((fs.projects ?? []).some(p => !p.isThesis)) {
      stats.projectRuns += 1;
      if (result.sawCollapse) stats.collapseRuns += 1;
    }
    for (const c of result.collapseChoices) {
      stats.collapseChoicePicks.set(c, (stats.collapseChoicePicks.get(c) ?? 0) + 1);
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

  if (s.projectRuns > 0) {
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

  if (s.clinical.runs > 0) {
    const c = s.clinical;
    const terminal = c.dropped + c.completed + c.referred;
    const hours = [...c.hoursSamples].sort((x, y) => x - y);
    console.log(
      `临床线 ${c.runs} 局:` +
        ` 个案 ${(c.cases / c.runs).toFixed(1)} 个/局` +
        ` · 脱落率 ${terminal > 0 ? ((c.dropped / terminal) * 100).toFixed(1) : '—'}%` +
        `(结束 ${c.completed} · 脱落 ${c.dropped} · 转介 ${c.referred} · 局末仍在谈 ${c.activeAtEnd})` +
        ` · 注册小时数 p50=${percentile(hours, 50)} p90=${percentile(hours, 90)}`,
    );
  }

  // ── 求职季与长聘(M5)──
  {
    const c = s.career;
    if (c.marketRuns > 0) {
      console.log(
        `\n求职季(走到 ${c.marketRuns} 局):` +
          ` 一个都没有 ${((c.shutoutRuns / c.marketRuns) * 100).toFixed(1)}%` +
          ` · 国内 offer ${((c.domesticOffers / c.marketRuns) * 100).toFixed(1)}%` +
          ` · 海外 offer ${((c.overseasOffers / c.marketRuns) * 100).toFixed(1)}%`,
      );
    }
    if (c.tenureRuns > 0) {
      console.log(
        `长聘首考(走到 ${c.tenureRuns} 局): 通过率 ${((c.tenurePassed / c.tenureRuns) * 100).toFixed(1)}%`,
      );
    }
    const twoBodyTotal = [...c.twoBody.values()].reduce((a, b) => a + b, 0);
    if (twoBodyTotal > 0) {
      console.log(
        `两体问题(${twoBodyTotal} 局): ` +
          [...c.twoBody.entries()]
            .map(([k, v]) => `${k} ${((v / twoBodyTotal) * 100).toFixed(0)}%`)
            .join(' · '),
      );
    }
  }

  // ── 社会层(M4.5)──
  {
    const so = s.social;
    if (so.askOfferedRuns > 0) {
      console.log(
        `\n社会层 · 打听(入口出现过 ${so.askOfferedRuns} 局):` +
          ` 使用率 ${((so.askUsedRuns / so.askOfferedRuns) * 100).toFixed(1)}%` +
          (so.rumorJudgedRuns > 0
            ? ` · 被假消息误导 ${((so.misledRuns / so.rumorJudgedRuns) * 100).toFixed(1)}%(可判定 ${so.rumorJudgedRuns} 局)`
            : ''),
      );
    }
    if (so.rivalRuns > 0) {
      console.log(
        `社会层 · 竞争者(可比 ${so.rivalRuns} 局):` +
          ` 玩家胜出 ${((so.playerAheadRuns / so.rivalRuns) * 100).toFixed(1)}%` +
          ` · 平均论文 你 ${(so.playerPapersSum / so.rivalRuns).toFixed(2)} vs 他 ${(so.rivalPapersSum / so.rivalRuns).toFixed(2)}`,
      );
    }
  }

  // ── 工作台(M4.6)。**每一行都对着 TECH 7.2 的一条门禁** ──
  {
    const d = s.desk;
    if (d.withAdvisor > 0) {
      const rel = ['疏远', '一般', '熟络', '亲近']
        .map(t => `${t} ${(((d.relationTiers.get(t) ?? 0) / d.withAdvisor) * 100).toFixed(1)}%`)
        .join(' · ');
      console.log(
        `\n工作台 · 导师(可寻求指导的 ${d.withAdvisor} 局):` +
          ` 寻求指导使用率 ${((d.consultRuns / d.withAdvisor) * 100).toFixed(1)}%` +
          ` · 局终关系 ${rel}`,
      );
      const totalConsults = [...d.consultResults.values()].reduce((a, b) => a + b, 0);
      if (totalConsults > 0) {
        const rows = [...d.consultResults.entries()].sort((a, b) => b[1] - a[1]);
        console.log(
          `  六原型分流(共 ${totalConsults} 次): ` +
            rows.map(([id, n]) => `${id} ${((n / totalConsults) * 100).toFixed(1)}%`).join(' · '),
        );
      }
    }
    const totalPicks = [...d.submitTiers.values()].reduce((a, b) => a + b, 0);
    if (totalPicks > 0) {
      const tiers = ['chinese_core', 'q3', 'q2', 'q1']
        .map(t => `${t} ${(((d.submitTiers.get(t) ?? 0) / totalPicks) * 100).toFixed(1)}%`)
        .join(' · ');
      console.log(
        `工作台 · 选刊(共 ${totalPicks} 次): ${tiers}` +
          ` · 降档改投 ${d.submitRuns > 0 ? ((d.resubmitRuns / d.submitRuns) * 100).toFixed(1) : '—'}%`,
      );
    }
    if (d.graduationByTier.size > 0) {
      const rows = [...d.graduationByTier.entries()].sort((a, b) => b[1].runs - a[1].runs);
      console.log(
        '工作台 · 毕业指标达成率: ' +
          rows.map(([tier, r]) => `${tier} ${((r.met / r.runs) * 100).toFixed(1)}%(${r.runs} 局)`).join(' · '),
      );
    }
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
  console.log(
    `M6 六出口: ${['academic', 'clinical', 'hospital', 'school', 'industry', 'left']
      .map(id => `${id} ${(((s.m6Paths.get(id) ?? 0) / s.runs) * 100).toFixed(1)}%`)
      .join(' · ')}`,
  );

  // ── M7。四行分别守住四种不会由静态校验发现的退化。──
  {
    const m = s.m7;
    const inventories = (contentPack.inventories ?? [])
      .map(item => `${item.id} ${(((m.inventoryById.get(item.id) ?? 0) / s.runs) * 100).toFixed(1)}%`)
      .join(' · ');
    const black = [...m.blackSwanCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([count, runs]) => `${count}次 ${((runs / Math.max(1, m.fullRuns)) * 100).toFixed(1)}%`)
      .join(' · ');
    console.log(`M7 量表: ${inventories} · 偏差文案 ${((m.discrepancyRuns / s.runs) * 100).toFixed(1)}%`);
    console.log(
      `M7 drama: 全局 ${(m.dramaTotal / s.runs).toFixed(2)} 幕/局` +
      ` · 学术专属 ${m.academicRuns ? (m.academicDramaTotal / m.academicRuns).toFixed(2) : '—'}` +
      ` · 临床专属 ${m.clinicalRuns ? (m.clinicalDramaTotal / m.clinicalRuns).toFixed(2) : '—'}`,
    );
    console.log(
      `M7 黑天鹅(非提前结局 ${m.fullRuns} 局): ${black || '(无)'}` +
      ` · origin ${(m.originTotal / Math.max(1, m.fullRuns)).toFixed(2)} 次/局`,
    );
    console.log(
      `M7 诚信/清单: 撤回 ${m.academicRuns ? ((m.retractions / m.academicRuns) * 100).toFixed(2) : '—'}%` +
      ` · 有学生清单 ${((m.studentLists / s.runs) * 100).toFixed(1)}%`,
    );
  }

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

  // **地基塌方**(M3.6 门禁)。文献可靠性是一级线机制,不能是稀有彩蛋。
  if (s.academic.runs > 0) {
    const rate = (s.collapseRuns / Math.max(1, s.projectRuns)) * 100;
    const total = [...s.collapseChoicePicks.values()].reduce((a, b) => a + b, 0);
    const spread = [...s.collapseChoicePicks.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${id} ${((n / Math.max(1, total)) * 100).toFixed(0)}%`)
      .join(' · ');
    console.log(`地基塌方: ${rate.toFixed(1)}% 的有课题对局遇到过 · 四选项 ${spread || '(无)'}`);
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
  // M6:六条职业出口都必须真的有人走到。按主队列分布判定,不是拿精英补样本。
  for (const path of ['academic', 'clinical', 'hospital', 'school', 'industry', 'left']) {
    const rate = (s.m6Paths.get(path) ?? 0) / s.runs;
    if (rate < 0.03) {
      failures.push(`M6 路径可达率过低(<3%): ${path} ${(rate * 100).toFixed(1)}%`);
    }
  }
  // **地基塌方**(M3.6 门禁)。文献可靠性是一级线机制,不能是稀有彩蛋——
  // 而它最容易的失效方式是静默的:塌方年份挑得不对,这个机制一次都不会触发,
  // 而所有别的检查都会是绿的(第一版就是这样:唯一会塌的那条在 2015 年,
  // 而真课题 2019 年才开始)。
  {
    const projectRuns = s.projectRuns + (extra?.projectRuns ?? 0);
    const collapseRuns = s.collapseRuns + (extra?.collapseRuns ?? 0);
    if (projectRuns > 0) {
      const rate = (collapseRuns / projectRuns) * 100;
      if (rate < 45) {
        failures.push(`地基塌方命中率过低(<45%): ${rate.toFixed(1)}%——文献可靠性是一级线机制,不是稀有彩蛋`);
      }
    }
    const picks = new Map(s.collapseChoicePicks);
    for (const [id, n] of extra?.collapseChoicePicks ?? []) picks.set(id, (picks.get(id) ?? 0) + n);
    const total = [...picks.values()].reduce((a, b) => a + b, 0);
    if (total >= 50) {
      // 四条路每条都得有人走。某一条掉到 8% 以下 = 它实际上不是一个选项,
      // 而这一幕的全部意义就是"四条路都真实存在、都有代价"。
      for (const id of ['push_anyway', 'reframe', 'do_replication', 'abandon']) {
        const share = ((picks.get(id) ?? 0) / total) * 100;
        if (share < 8) failures.push(`塌方选项「${id}」使用率过低(<8%): ${share.toFixed(1)}%`);
      }
    }
  }
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
    if (emptyRate > 0.05) {
      failures.push(`论文清单为空的比例过高(>5%,M7): ${(emptyRate * 100).toFixed(1)}%`);
    }
    const abandonRate = academic.withAbandoned / academic.runs;
    if (abandonRate < 0.7) {
      failures.push(
        `至少一个课题做废的比例过低(<70%): ${(abandonRate * 100).toFixed(1)}%` +
          `——做废是这个职业最普遍的经验,不该是稀有事件`,
      );
    }
  }

  // ── M7 量表 / drama / 黑天鹅 / origin / 诚信门禁 ─────────
  {
    const m = s.m7;
    for (const inventory of contentPack.inventories ?? []) {
      const rate = (m.inventoryById.get(inventory.id) ?? 0) / s.runs;
      if (rate < 0.75) {
        failures.push(`量表 ${inventory.id} 命中率过低(<75%): ${(rate * 100).toFixed(1)}%`);
      }
    }
    if (m.discrepancyRuns / s.runs < 0.2) {
      failures.push(`量表偏差文案命中率过低(<20%): ${((m.discrepancyRuns / s.runs) * 100).toFixed(1)}%`);
    }
    const avgDrama = m.dramaTotal / s.runs;
    if (avgDrama < 3) failures.push(`Drama 平均覆盖过低(<3): ${avgDrama.toFixed(2)} 幕/局`);
    if (m.academicRuns >= 20 && m.academicDramaTotal / m.academicRuns < 1) {
      failures.push(`学术专属 drama 平均覆盖过低(<1): ${(m.academicDramaTotal / m.academicRuns).toFixed(2)}`);
    }
    if (m.clinicalRuns >= 20 && m.clinicalDramaTotal / m.clinicalRuns < 1) {
      failures.push(`临床专属 drama 平均覆盖过低(<1): ${(m.clinicalDramaTotal / m.clinicalRuns).toFixed(2)}`);
    }
    const invalidBlackSwanRuns = [...m.blackSwanCounts.entries()]
      .filter(([count]) => count < 1 || count > 2)
      .reduce((sum, [, runs]) => sum + runs, 0);
    if (invalidBlackSwanRuns > 0) {
      failures.push(`黑天鹅不是每局 1–2 次: ${invalidBlackSwanRuns}/${m.fullRuns} 个非提前结局对局违规`);
    }
    const avgOrigin = m.originTotal / Math.max(1, m.fullRuns);
    if (avgOrigin < 3) failures.push(`origin 隐线回响过少(<3): ${avgOrigin.toFixed(2)} 次/局`);
    if (m.academicRuns >= 20 && m.retractions / m.academicRuns > 0.03) {
      failures.push(`撤稿结局率过高(>3%): ${((m.retractions / m.academicRuns) * 100).toFixed(2)}%`);
    }
  }

  // ── 临床线门禁(TECH 7.2:个案脱落率 15%–40%)────────────────────
  //
  // 上限和下限守的是两件不同的事:低于 15% 说明脱落被优化没了
  // (而"来了就不会走"的咨询在真实世界里不存在);高于 40% 说明联盟机制在空转,
  // 玩家做什么都留不住人。样本不足时不判——泊松噪声会把门禁变成抽签。
  {
    const c = s.clinical;
    const terminal = c.dropped + c.completed + c.referred;
    if (terminal >= 100) {
      const dropoutRate = c.dropped / terminal;
      if (dropoutRate < 0.15 || dropoutRate > 0.4) {
        failures.push(
          `个案脱落率超出 15%–40%: ${(dropoutRate * 100).toFixed(1)}%` +
            `(脱落 ${c.dropped} / 终结 ${terminal})`,
        );
      }
    }
  }

  // ── 求职季与长聘门禁(M5,TECH 7.2)────────────────────────
  {
    const c = s.career;
    if (c.marketRuns >= 50) {
      // **"一个都没有"必须是高概率的、有尊严的结果**(9.3 第一条)。
      // 低于 20% 说明这一行被写得太顺;高于 40% 说明玩家做什么都没用。
      const shutout = c.shutoutRuns / c.marketRuns;
      if (shutout < 0.2 || shutout > 0.4) {
        failures.push(
          `求职季"一个都没有"超出 20%–40%: ${(shutout * 100).toFixed(1)}%(走到求职季的 ${c.marketRuns} 局)`,
        );
      }
      // 国内/海外各 ≥15%:两个市场都要真的是选项,否则"双市场"只是一句话
      const cn = c.domesticOffers / c.marketRuns;
      const os = c.overseasOffers / c.marketRuns;
      if (cn < 0.15) failures.push(`国内 offer 率过低(<15%): ${(cn * 100).toFixed(1)}%`);
      if (os < 0.15) failures.push(`海外 offer 率过低(<15%): ${(os * 100).toFixed(1)}%`);
    }
    if (c.tenureRuns >= 50) {
      // **通过率 30%–50%,因为这个数字应该是真实的**(十节)
      const pass = c.tenurePassed / c.tenureRuns;
      if (pass < 0.3 || pass > 0.5) {
        failures.push(
          `长聘首考通过率超出 30%–50%: ${(pass * 100).toFixed(1)}%(走到首考的 ${c.tenureRuns} 局)`,
        );
      }
    }
    // 两体五归宿各 ≥5%。**没有正确答案**,所以也不该有走不通的答案
    const twoBodyTotal = [...c.twoBody.values()].reduce((a, b) => a + b, 0);
    if (twoBodyTotal >= 50) {
      for (const resolution of ['apart', 'partner_follows', 'player_yields', 'spouse_hire', 'breakup']) {
        const rate = (c.twoBody.get(resolution) ?? 0) / twoBodyTotal;
        if (rate < 0.05) {
          failures.push(`两体问题归宿占比过低(<5%): ${resolution} ${(rate * 100).toFixed(1)}%`);
        }
      }
    }
  }

  // ── 社会层门禁(M4.5,TECH 7.2)────────────────────────────
  //
  // 三条各守一个机制**不退化**。三种退化都不会崩、不会红,只会让机制悄悄变成装饰。
  {
    const so = s.social;
    // **打听使用率。** 这条守的和「寻求指导」那条一样是定价:
    // 没人点说明这个入口摆错了地方或者代价定错了,不是玩家不感兴趣。
    if (so.askOfferedRuns >= 50) {
      const rate = so.askUsedRuns / so.askOfferedRuns;
      if (rate < 0.6) {
        failures.push(
          `打听使用率过低(<60%): ${(rate * 100).toFixed(1)}%(这个入口出现过的 ${so.askOfferedRuns} 局)`,
        );
      }
    }
    // **假消息误导率。** 太低 = 情报变成攻略(照着抄就行);
    // 太高 = 玩家两局之后学会无视这个入口,而那等于把机制关掉。
    if (so.rumorJudgedRuns >= 50) {
      const rate = so.misledRuns / so.rumorJudgedRuns;
      if (rate < 0.15 || rate > 0.35) {
        failures.push(
          `假消息误导率超出 15%–35%: ${(rate * 100).toFixed(1)}%(可判定的 ${so.rumorJudgedRuns} 局)`,
        );
      }
    }
    // **玩家胜出率。** 他不能总赢也不能总输——13.1 第 2 条。
    // 总赢的对手不构成参照系,总输的对手是一堵墙。
    if (so.rivalRuns >= 50) {
      const rate = so.playerAheadRuns / so.rivalRuns;
      if (rate < 0.35 || rate > 0.65) {
        failures.push(
          `玩家论文数超过竞争者的比例超出 35%–65%: ${(rate * 100).toFixed(1)}%(可比的 ${so.rivalRuns} 局)`,
        );
      }
    }
  }

  // ── 工作台门禁(M4.6,TECH 7.2)────────────────────────────
  //
  // 这五条各守一件事,而且**每一件都是"不报错、也不会被玩家立刻发现"的那种坏**:
  // 一格没人用的动作、一张写了六格却只走得到两格的分流表、一条能刷满的关系条、
  // 四档里三档没人选的选刊、以及"一路降到能中为止"那种把决策抹平的刷法。
  {
    const d = s.desk;
    if (d.withAdvisor >= 50) {
      const consultRate = d.consultRuns / d.withAdvisor;
      // **这条守的是定价。** 三格经济里一格很贵,没人用说明标价错了,不是玩家不感兴趣。
      if (consultRate < 0.6) {
        failures.push(
          `「寻求指导」使用率过低(<60%): ${(consultRate * 100).toFixed(1)}%(这一格出现过的 ${d.withAdvisor} 局)`,
        );
      }
      // **关系不是可以刷满的资源条。** 全员"亲近" = 这个面板退化成一条进度条。
      const topTier = d.relationTiers.get('亲近') ?? 0;
      const topRate = topTier / d.withAdvisor;
      if (topRate > 0.5) {
        failures.push(`局终师生关系最高档占比过高(>50%): ${(topRate * 100).toFixed(1)}%`);
      }
    }
    // 六原型的分流表:每一支都要走得到。**有一格走不到就是白写。**
    const totalConsults = [...d.consultResults.values()].reduce((a, b) => a + b, 0);
    if (totalConsults >= 200) {
      for (const advisor of contentPack.advisors ?? []) {
        for (const response of advisor.consultResponses ?? []) {
          const rate = (d.consultResults.get(response.id) ?? 0) / totalConsults;
          if (rate < 0.01) {
            failures.push(
              `「寻求指导」结果命中率过低(<1%): ${response.id} ${(rate * 100).toFixed(2)}%`,
            );
          }
        }
      }
    }
    // 选刊四档:有一档没人选,说明档位设计或提示文案有问题。
    const totalPicks = [...d.submitTiers.values()].reduce((a, b) => a + b, 0);
    if (totalPicks >= 200) {
      for (const tier of ['chinese_core', 'q3', 'q2', 'q1']) {
        const rate = (d.submitTiers.get(tier) ?? 0) / totalPicks;
        if (rate < 0.1) {
          failures.push(`选刊档位使用率过低(<10%): ${tier} ${(rate * 100).toFixed(1)}%`);
        }
      }
    }
    // 降档改投:太低 = 这个决策不存在;太高 = "一路降到能中为止"的刷法生效了。
    if (d.submitRuns >= 50) {
      const rate = d.resubmitRuns / d.submitRuns;
      if (rate < 0.15 || rate > 0.4) {
        failures.push(
          `降档改投发生率超出 15%–40%: ${(rate * 100).toFixed(1)}%(选过刊的 ${d.submitRuns} 局)`,
        );
      }
    }
    // 毕业指标的院校分层差。**否则那 27 所院校的差异仍然只活在录取那一屏。**
    const top = d.graduationByTier.get('a_plus');
    const low = d.graduationByTier.get('b_plus');
    if (top && low && top.runs >= 30 && low.runs >= 30) {
      const gap = low.met / low.runs - top.met / top.runs;
      if (gap < 0.15) {
        failures.push(
          `毕业达成率的院校分层差过小(<15pp): 双非 ${((low.met / low.runs) * 100).toFixed(1)}% vs A+ ${((top.met / top.runs) * 100).toFixed(1)}%`,
        );
      }
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
