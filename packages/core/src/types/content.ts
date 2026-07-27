import type { Citation, Foundation, GradApplyKind, Institution, Position } from './institution';
import type { Condition, Effect } from './dsl';
import type { AdvisorDef } from './advisor';
import type { ProjectStage, ProjectTemplate } from './project';
import type { StatKey, Track } from './stats';

export interface GameDate {
  year: number;
  month: number;
}

export interface ChoiceOutcome {
  weight: number;
  condition?: Condition;
  text: string;
  outcomeTag?: string;
  effects: Effect[];
}

export interface EventChoice {
  id: string;
  text: string;
  visibleIf?: Condition;
  outcomes: ChoiceOutcome[];
}

export interface GameEvent {
  id: string;
  pools: string[];
  title: string;
  text: string;
  /** 首个条件命中的版本替换标题/正文，不改变事件 ID、选择或因果链。 */
  presentationVariants?: { condition: Condition; title: string; text: string }[];
  /**
   * 正文后、选择前显示的短回响。首个条件命中的一句优先；
   * 一条都没命中时，从不带 condition 的兜底句里随机挑一句(见 systems/context-lines.ts)。
   * 不带 condition 的句子必须对任何存档都成立，不能引用 flag/前史。
   */
  contextLines?: { condition?: Condition; text: string }[];
  category?: string;
  trigger?: Condition;
  weight?: number;
  once?: boolean;
  mandatory?: boolean;
  /** 同组事件同一轮只会抽取一个,用于时代/人生节点变体池 */
  variantGroup?: string;
  /** 同一回合内的展示顺序,越小越靠前,默认 0(如毕业散伙饭应排在当年最后) */
  order?: number;
  /** 事件等级:major=剧情转折/高光事件(UI 有关键节点标识,文案更长) */
  tier?: 'major';
  /**
   * 课题管线阶段事件:这个事件属于哪一站。
   *
   * 带这个字段的事件**不走普通事件池**——调度器按每个活跃课题的当前阶段单独挑
   * (TECH 4.5 的 ②'),而且不占 `eventSlots` 名额。
   */
  projectStage?: ProjectStage;
  /** 只对这些领域的课题出现。不写 = 所有领域通用 */
  projectDomains?: string[];
  choices: EventChoice[];
}

export interface EndingDef {
  id: string;
  title: string;
  text: string;
  category: 'early' | 'final';
  priority: number;
  condition: Condition;
  shareCard?: {
    tone: 'triumph' | 'bitter' | 'warm';
    tagline: string;
  };
}

/**
 * 引擎知道如何"进入"的屏:既用于 flow 阶段的 `steps`,也用于 rounds 阶段的 `roundOpeners`。
 * (前作叫 `FlowStep`,只有 flow 阶段用得上;`roundOpeners` 复用同一套进屏逻辑之后,
 * 那个名字就有误导性了。新增一个屏要能当开场用,就加到这里。)
 */
export type StepScreen =
  | 'BACKGROUND_DRAW'
  | 'SETUP'
  | 'EXAM'
  | 'APPLICATION'
  | 'NPC_SELECTION'
  | 'LIFE_GOAL'
  | 'CROSSROAD'
  | 'ALLOCATION'
  | 'ADVISOR_DRAW'
  | 'PROJECT_BOARD'
  // 读研/读博/博后的真实院校清单选择。**一屏三用**,靠阶段声明的 kind 区分
  | 'GRAD_APPLY';

export type PhaseConfig =
  | {
      kind: 'flow';
      id: string;
      label: string;
      /** 省略 = 沿用当前日期。理由同 rounds 分支:被多个入口共用的阶段不能写死年份 */
      date?: GameDate;
      steps: StepScreen[];
      /**
       * 本阶段的 `GRAD_APPLY` 屏按哪一种申请来。**一屏三用就是靠这个字段。**
       * 声明了 `GRAD_APPLY` 步骤就必须写(validate 规则 13)。
       */
      gradApplyKind?: GradApplyKind;
      /** 显式指定下一阶段。见 rounds 分支下的说明——两种阶段都强制要求写。 */
      nextPhaseId?: string;
    }
  | {
      kind: 'rounds';
      id: string;
      label: string;
      /**
       * 进入本阶段时把时钟拨到这里。**省略 = 沿用当前日期。**
       *
       * 写死日期的前提是"这个阶段只有一个入口"。一旦某个阶段被两个岔口共用
       * (比如大厂用研既能从大四去、也能从硕士毕业去),写死就会让时间倒流。
       * 这类阶段一律省略 `date`,让它跟着玩家真实走到的年份走。
       */
      date?: GameDate;
      rounds: number;
      eventSlots: number;
      pools: string[];
      briefs: string[];
      /** 每轮开场先走这些屏(如年度投入分配),走完才进 BRIEF。通用机制。 */
      roundOpeners?: StepScreen[];
      /** 每轮推进几年,默认 1。非学术路径 2029 之后两年一回合,让所有路线统一收在 2034。 */
      yearsPerRound?: number;
      /** 本阶段默认精力格数(本科 4 / 硕博 3 / 博后 3 / 预聘期 2)。消费方是 ALLOCATION 屏。 */
      allocationSlots?: number;
      /**
       * 本阶段第一回合对应的学年(本科阶段是 1)。写了才有课程判定,不写就是没有课的阶段。
       * 当前学年 = `courseYearFrom + roundIndex`。
       */
      courseYearFrom?: 1 | 2 | 3 | 4;
      /**
       * 显式指定下一阶段。**非 `isFinal` 的阶段必须写**(validate 强制)。
       *
       * 前作在这里是 `enterPhase(state.phaseIndex + 1)`,按 timeline **数组下标**顺延。
       * 前作只有一条主干所以没问题;本作把六条培养路径并列放进数组后,
       * 直博阶段打完会掉进数组里紧跟其后的硕士阶段。
       */
      nextPhaseId?: string;
      /**
       * 终局阶段。**允许多个**——每条培养路径都有自己的终局。
       * `isFinal` 在 `settleRound` 里是按"当前阶段"读的,所以多个终局不需要引擎改动。
       */
      isFinal?: boolean;
    };

export interface ExamQuestion {
  id: string;
  track: Track | 'both';
  subject: string;
  text: string;
  options: string[];
  answerIndex: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface BackgroundCard {
  id: string;
  label: string;
  text: string;
  initialMoney: number;
  /**
   * 背景卡的开局数值影响。设计文档要求**临床起始值由背景卡决定**
   * (如"家里有人生病":临床高、状态低),所以这不是可选的装饰。
   */
  statMods?: Partial<Record<StatKey, number>>;
  flags?: Record<string, boolean | number | string>;
}

/**
 * 玩家特质:开局随背景亮出 4 张候选(traitOffer),玩家选 2 张,以 `flags[id]=true` 存储。
 * id 必须以 `trait_` 开头,事件内容可用 `{ flag: 'trait_xxx' }` 做分支。
 */
export interface TraitCard {
  id: string;
  label: string;
  text: string;
  /**
   * 导演选择器的类别偏好:key 为事件 category,value 为权重乘数(>1 更常见,<1 更稀)。
   * 只影响非 mandatory 事件的抽取概率,不影响强制/NPC/schedule 事件。
   */
  poolBias?: Record<string, number>;
  /** 选中该特质时的开局数值加成(有得有失,选卡屏直接展示) */
  statMods?: Partial<Record<StatKey, number>>;
}

/** 2018 毕业节点由玩家选择的人生目标,改变事件偏好与最终评分权重。 */
export interface LifeGoal {
  id: string;
  label: string;
  text: string;
  poolBias?: Record<string, number>;
  scoringWeights: ScoringConfig['weights'];
}

/** 2023 年由基础特质分化出的成年性格路线。 */
export interface TraitEvolution {
  id: string;
  traitId: string;
  label: string;
  poolBias?: Record<string, number>;
}

export interface ApplicationMajor {
  id: string;
  /** 专业名,需与 CROSSROAD 分流和事件 visibleIf 里的 major 字符串一致 */
  name: string;
  /**
   * 学院归属,写入 `flags.college`(见 GAME_DESIGN 2.5)。
   * science(理学院)/ education(教育学院)/ medical(医学院)/ normal(师范)。
   * 本作所有路径都是心理学,真正的第一次路线塑形是心理学系挂在哪个学院下面。
   */
  college: string;
  /**
   * 学院归属带来的开局塑形(方法起点、专属 flag)。
   * 录取后立即应用,所以理学院的方法起点确实比教育学院高——这个亏教育学院要在读研时才还。
   */
  effects?: Effect[];
}

/** 志愿"批次":录取概率由引擎按(分数 - minScore)动态计算,不再静态配置 */
export interface ApplicationOption {
  id: string;
  label: string;
  university: string;
  minScore: number;
  effects?: Effect[];
  failEffects?: Effect[];
  majors: ApplicationMajor[];
}

/**
 * 课程(GAME_DESIGN 8.2 / TECH 4.7.5)。
 *
 * 课程该做的**不是加属性,是决定你后面听不听得懂**。它的产出是能力标签,而标签就是 flag——
 * 所以课程**不进 `GameState` 的结构化列表**(P5 的反例:玩家不需要知道"我手上有哪几门课在什么阶段")。
 */
export interface Course {
  id: string;
  label: string;
  /** 真实教材。写进文案里,圈内人一看就知道是哪一本 */
  textbook?: string;
  /** 开在哪一学年 */
  year: 1 | 2 | 3 | 4;
  /** 学院归属门控(如高等数学仅理学院) */
  availableWhen?: Condition;
  /** 判定时看哪个属性 */
  statKey: 'method' | 'clinical';
  /**
   * 学通后解锁的能力标签,写进 flags。必须以 `mastered_` 开头。
   *
   * **可选**:只有真正门控后续选项的课才该有标签。普通心理学"学通"不该解锁什么——
   * 它只是属性和年度回顾页上的一行。声明了标签就必须有人读它(validate 规则 28),
   * 所以这个字段的数量等于这个系统真正的因果链条数。
   */
  masteryFlag?: string;
  /**
   * 期末小测。**只允许心理统计与实验心理学两门有**(validate 规则 30)——
   * 把仪式感留给最重要的两门课,不拖节奏。答对给"学通"概率 +0.15。
   */
  finalExam?: { questionIds: string[] };
  /** 三档结果各自的效果。`failed` 通常含 `{ grantSlots: -1 }` 的下一年重修代价 */
  outcomes: {
    mastered: Effect[];
    passed: Effect[];
    failed: Effect[];
  };
}

/**
 * 年度投入分配的可投入项(GAME_DESIGN 第四节)。
 *
 * 同一项可重复投入(投两格 = 今年主要就干这个)。**"休息"必须是一个真实有效的选项**:
 * 它给状态、降耗竭,但会让进度停一年。游戏不能奖励只会硬撑的玩家——那是前作
 * "卷王必胜"的逻辑,在这个题材里是错的;但也不能让休息成为最优解。
 */
export interface AllocationItem {
  id: string;
  label: string;
  /** 一行说明,分配屏直接展示 */
  text: string;
  /**
   * 可投入门控。**门槛开放时间的不对称就靠这里实现**(GAME_DESIGN 8.3②):
   * 实验室大二开门、咨询中心大三开门,所以实验室先开门整整一年。
   */
  availableWhen?: Condition;
  /** 最多能投几格,默认不限(受总格数约束) */
  maxSlots?: number;
  /** 每投一格应用一次的效果 */
  perSlot: Effect[];
  /** 分类,给 UI 分组和 validate 用 */
  category: 'course' | 'lab' | 'counseling' | 'work' | 'exam_prep' | 'money' | 'rest';
  /** category === 'course' 时指向的课程 id */
  courseId?: string;
}

/**
 * 岔口选项(大四三岔口 / 硕士岔口)。
 *
 * 前作把三岔口的选项和分流逻辑**硬编码在引擎里**(考研/求职/考公 + 按专业名 if-else 五段)。
 * 本作改成内容驱动:选项文案、门控、分流全在 `effects` 里(通常含 `{ jumpToPhase }`)。
 */
export interface CrossroadOption {
  id: string;
  label: string;
  text: string;
  /** 哪个岔口用它。与 `PhaseConfig.id` 无关,由内容自己定义分组 */
  group: string;
  /** 门控。手里没有牌的路径不该出现在清单上 */
  availableWhen?: Condition;
  /** 选择后应用的效果,分流靠 `{ jumpToPhase }` */
  effects: Effect[];
  /** 清单上的一行提示("你手上的牌够 / 有点冒险"),模糊而非精确概率 */
  hint?: string;
}

export interface IncomeRule {
  id: string;
  label: string;
  when: Condition;
  /** 年度净储蓄(元/年,可为负) */
  amount: number;
  /** 年度状态损耗/恢复(可选,职业压力的系统性建模) */
  stateDelta?: number;
  /** 年度临床能力累积/流失(可选:在医院或咨询室工作会自然长临床,离开会退) */
  clinicalDelta?: number;
}

export interface ScoringConfig {
  weights: { method: number; money: number; state: number; capital: number; clinical: number };
  moneyFullScore: number;
}

export interface NpcDef {
  id: string;
  name: string;
  /**
   * 选人屏展示的一句话人物介绍。**只写 2014 年的样子**——
   * 不写他后面会变成谁、也不写他在这局里承担什么功能(见 content/npcs 的说明)。
   */
  description?: string;
  initialStage: string;
  initialFavor: number;
  stages: Record<string, { advanceWhen?: Condition; eventId?: string }>;
}

export interface FnCtx {
  state: unknown;
  args?: Record<string, unknown>;
}

export type ContentFn = (ctx: FnCtx) => unknown;

export interface ContentPack {
  meta: {
    id: string;
    version: string;
    title: string;
    fallbackEndingId: string;
    examQuestionCount: number;
    /**
     * 同期人物选择时要选几位。**本作恋人线不强制**(与前作不同——学术生涯里
     * "没有伴侣"和"有伴侣"是同等重要的两种真实处境),所以这里只有一个数量,
     * 没有"必选人物"的概念。前作把 `first_love` 硬编码成必选,那是前作的设定。
     */
    npcPickCount?: number;
    scoring?: ScoringConfig;
  };
  timeline: PhaseConfig[];
  events: GameEvent[];
  incomes: IncomeRule[];
  endings: EndingDef[];
  examBank: ExamQuestion[];
  /** 课程小测题库。与高考题库分开,因为它按课程取题而不是按文理取题 */
  courseExamBank?: ExamQuestion[];
  courses?: Course[];
  projectTemplates?: ProjectTemplate[];
  advisors?: AdvisorDef[];
  /** 真实素材层(M3.5)。院校/职位/文献是**数据源**,不是事件——由申请屏和事件引用 */
  institutions?: Institution[];
  positions?: Position[];
  citations?: Citation[];
  foundations?: Foundation[];
  /** `GRAD_APPLY` 顶部的游戏化声明。**validate 规则 12 要求非空** */
  gameifiedTermsNotice?: string;
  /** 真实研究者姓名黑名单(规则 10):正文与人物定义里一律不许出现 */
  researcherNameBlocklist?: string[];
  /** 著作署名白名单:可以在正文里当书名用,但不许当人物 */
  textbookAuthorAllowlist?: string[];
  allocationItems?: AllocationItem[];
  crossroadOptions?: CrossroadOption[];
  backgrounds: BackgroundCard[];
  traits: TraitCard[];
  traitEvolutions: TraitEvolution[];
  lifeGoals: LifeGoal[];
  applications: ApplicationOption[];
  npcs: NpcDef[];
  fns: Record<string, ContentFn>;
}
