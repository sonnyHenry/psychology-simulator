import type { GradApplicationState, GradApplyKind } from './institution';
import type { AdvisorState } from './advisor';
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
  | 'ALLOCATION'
  | 'ADVISOR_DRAW'
  | 'GRAD_APPLY'
  | 'GRAD_RESULT'
  | 'PROJECT_BOARD'
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
  /** 每次年度结算后的金钱快照,用于结算/结局页的趋势展示 */
  yearlySnapshots?: { year: number; money: number }[];
}
