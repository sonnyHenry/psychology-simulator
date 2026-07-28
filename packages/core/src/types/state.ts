import type { GradApplicationState, GradApplyKind } from './institution';
import type { AdvisorState } from './advisor';
import type { ClinicalCase } from './case';
import type { Paper, Project } from './project';
import type { Flags, StatDeltas, Stats, Track } from './stats';

export type ScreenId =
  | 'TITLE'
  | 'BACKGROUND_DRAW'
  | 'SETUP'
  | 'EXAM'
  | 'EXAM_RESULT'
  | 'APPLICATION'
  | 'NPC_SELECTION'
  | 'LIFE_GOAL'
  | 'CROSSROAD'
  /** 工作台。M4.6 起吃掉了 `ALLOCATION` 与 `PROJECT_BOARD` 两个屏 */
  | 'DESK'
  | 'ADVISOR_DRAW'
  | 'GRAD_APPLY'
  | 'GRAD_RESULT'
  | 'BRIEF'
  | 'EVENT'
  | 'OUTCOME'
  | 'SETTLEMENT'
  | 'ENDING';

export interface Profile {
  background: string | null;
  track: Track | null;
  examScore: number | null;
  university: string | null;
  major: string | null;
  career: string | null;
}

export type HistoryEntry =
  | {
      kind: 'event';
      year: number;
      eventId: string;
      category?: string;
      choiceId: string;
      outcomeTag?: string;
    }
  | {
      kind: 'application';
      year: number;
      optionId: string;
      admitted: boolean;
    }
  | {
      kind: 'crossroad';
      year: number;
      optionId: string;
    };

export interface NpcState {
  favor: number;
  stage: string;
}

/** 年度结算明细:进入 SETTLEMENT 屏时由引擎写入,供结算页展示收入构成 */
export interface SettlementReport {
  /** 本回合命中的收入规则(amount 为 0 的规则不列出) */
  incomes: { label: string; amount: number }[];
  /** 收入结算引起的金钱净变化(钳制后的实际值) */
  moneyDelta: number;
  /** 跨越财富里程碑时的一句话提示,无则为 null */
  milestone: string | null;
}

export interface GameState {
  schemaVersion: 1;
  seed: number;
  rngState: number;
  screen: ScreenId;
  phaseIndex: number;
  flowStepIndex: number;
  roundIndex: number;
  roundCounter: number;
  date: { year: number; month: number };
  currentBrief: string | null;
  eventQueue: string[];
  eventCursor: number;
  pendingOutcome: { text: string; deltas: StatDeltas } | null;
  pendingFlowAdvance: boolean;
  forcedEndingId: string | null;
  pendingJumpPhaseId: string | null;
  examPaper: string[];
  /** 开局特质候选(抽 4 选 2);选完清空。旧存档无此字段按空处理 */
  traitOffer?: string[];
  examCursor: number;
  examCorrect: number;
  examEarnedPoints: number;
  /**
   * 当前 EXAM 屏在考什么。`gaokao` = 高考(答完算分数与方法起点);
   * `course` = 两座大山的期末小测(答完提高"学通"概率,然后进年度结算)。
   * 旧存档无此字段按 `gaokao` 处理。
   */
  examKind?: 'gaokao' | 'course';
  /** 课程小测:与 `examPaper` 逐位对应的课程 id */
  courseExamCourseIds?: string[];
  /** 本学年课程小测的答题结果,年度结算读完即清 */
  courseExamResults?: Record<string, boolean>;
  /**
   * 本回合的投入分配。`picks` 里同一个 id 可重复出现(投两格 = 今年主要就干这个),
   * 长度等于 `effectiveSlots`。`null` = 本回合还没分配(或该阶段没有分配屏)。
   */
  allocation?: { slots: number; picks: string[] } | null;
  /** 上一学年课程判定的结果,给年度回顾页展示;下一次判定时覆盖 */
  lastCourseResults?: { courseId: string; label: string; tier: 'mastered' | 'passed' | 'failed' }[];
  /**
   * 课题列表(**P5 长机制状态化**的第一个真实使用者)。
   *
   * 课题跨年,而且玩家需要随时知道"我手上有哪几个、各在什么阶段"——
   * 所以它是一个真的列表,不是一堆扁平 flag。旧存档没有此字段时按空数组处理。
   */
  projects?: Project[];
  /** 已发表的论文。**结局页的招牌清单**,也是所有门槛判定的实质依据 */
  papers?: Paper[];
  /**
   * 个案列表(P5 的第三个使用者,临床线的骨架)。
   * 与课题一样跨年存在;终结的个案(脱落/结束/转介)留在列表里——
   * 结局页"你的来访者们"那份清单要用。旧存档没有此字段时按空数组处理。
   */
  cases?: ClinicalCase[];
  /**
   * 本回合"这个事件是替哪个个案弹出来的"。由调度器写,回合开始时重建。
   * (与 `eventProjects` 同源:阶段事件必须知道自己在说哪个个案。)
   */
  eventCases?: Record<string, string>;
  /** 当前正在处理的事件绑定的个案 id。`resolveChoice` 写,effects 读 */
  currentCaseId?: string;
  /** 导师。大三或研一抽卡后写入 */
  advisor?: AdvisorState | null;
  /** 本次申请的状态。走完 GRAD_APPLY 后保留,内容侧用 `landed` 读去向 */
  gradApplication?: GradApplicationState | null;
  /** 历次申请去向:`master` → 'inst_bnu'。结局页和后续门控读它 */
  admissions?: Partial<Record<GradApplyKind, string | null>>;
  /** 抽卡屏的候选导师 id,选完清空(照 traitOffer 的写法) */
  advisorOffer?: string[];
  /**
   * `{ drawAdvisor }` 标记的待抽卡张数。
   *
   * 抽样需要 RNG,而 `applyEffects` 没有(也不该有——引擎偷偷消耗随机流会让回放漂移)。
   * 所以 effect 只写下"该抽了",真正的抽样在 `continueAfterOutcome` 里做。
   */
  pendingAdvisorDraw?: number;
  /**
   * 本回合"这个事件是替哪个课题弹出来的"。由调度器写,回合开始时重建。
   *
   * 管线阶段事件需要知道自己在说哪个课题——`{ project: { target } }` 省略 target 时
   * 就解析到它。没有这张表的话,一个博士生手上三个课题,阶段事件会全部作用在最新那个上。
   */
  eventProjects?: Record<string, string>;
  /** 当前正在处理的事件绑定的课题 id。`resolveChoice` 写,effects 读 */
  currentProjectId?: string;
  stats: Stats;
  profile: Profile;
  flags: Flags;
  npcs: Record<string, NpcState>;
  /**
   * 同年撞车而顺延的 NPC 阶段事件。旧存档没有此字段时按空队列处理。
   * 顺延播放前会再次核验 NPC 仍处于该事件对应的阶段。
   */
  pendingNpcEvents?: { npcId: string; eventId: string }[];
  /**
   * 延毕:`{ extendPhase }` 给当前 rounds 阶段追加的轮数。进入新阶段时清零。
   * 旧存档没有此字段时按 0 处理。
   */
  phaseExtraRounds?: number;
  /**
   * `{ grantSlots }` 给本回合临时增减的精力格数。每回合开始清零。
   * 有效格数 = `phase.allocationSlots + grantedSlots`(见 core 导出的 `effectiveSlots`)。
   */
  grantedSlots?: number;
  scheduled: { eventId: string; dueRound: number }[];
  triggeredEventIds: string[];
  history: HistoryEntry[];
  endingId: string | null;
  /** 可选:旧快照存档没有这两个字段,读取处需给默认值 */
  lastSettlement?: SettlementReport | null;
  /**
   * 每次年度结算后的快照。金钱趋势图读前两个字段;**工作台的「这些年」页签读整条**。
   *
   * 结算屏是那一年结束时的一次正式回顾(一次性、有仪式感),「这些年」是它的**存档**
   * (随时可翻)。两者读同一份数据,不各写一套聚合——这也是 M4.5 的 `systems/review.ts`
   * 将来要接管的地方(TECH 六节)。
   *
   * 后四个字段是 M4.6 新增的,**全部可选**:旧存档只有 `{year, money}`,
   * 「这些年」对它们只会少显示几行,不会崩。
   */
  yearlySnapshots?: {
    year: number;
    money: number;
    /** 那一年的阶段名(「读博」「独立执业」) */
    phaseLabel?: string;
    /** 那一年年末的五维快照,用来在流水里看状态曲线 */
    state?: number;
    /** 那一年发表的论文(标题 + 档位),按年归档 */
    papers?: { title: string; tier: string }[];
    /** 那一年的一行事实清单("「情绪调节」还卡在收数据"「小张在第 6 次之后没有再来」) */
    notes?: string[];
  }[];
}
