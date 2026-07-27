import type { Condition, Effect } from './dsl';

/**
 * 个案系统(GAME_DESIGN 第六节 / TECH 4.7)。临床线的对应物,P5 的第三个使用者
 * (课题、论文之后)。个案跨年、玩家需要随时知道"我手上有几个、各在什么状态",
 * 所以它是 `GameState` 里一个真的列表。
 *
 * ## 与课题管线的一个本质区别
 *
 * 课题的状态机写在**模板**里(`stageSequence`,毕业论文和真课题走不同的序列);
 * 个案的状态机写在**引擎**里(`systems/case.ts`)。因为个案的阶段不是工作流程,
 * 是关系的自然史——初始访谈、工作期、停滞、结束期,任何一个个案都走同一张图,
 * 差别只在走多快、在哪一站脱落。没有"裁短版个案"这种东西。
 */

export type CaseStatus =
  | 'intake' // 初始访谈期:建立设置、收集信息、决定接不接
  | 'working' // 工作期:大多数会谈发生在这里
  | 'plateau' // 停滞:联盟或进展卡住。可以回到 working,也常常从这里脱落
  | 'terminating' // 结束期:双方知道快结束了。做得好是 completed,做不好也会脱落
  | 'dropped' // 脱落:他没有再来。**这一行最普遍的结束方式**
  | 'completed' // 自然结束
  | 'referred'; // 转介出去

/** 终态。validate 规则 2 靠它判死锁 */
export const CASE_TERMINAL_STATUSES: readonly CaseStatus[] = ['dropped', 'completed', 'referred'];

/** 非终态(个案还"在谈")。调度器按这个挑阶段事件 */
export const CASE_ACTIVE_STATUSES: readonly CaseStatus[] = [
  'intake',
  'working',
  'plateau',
  'terminating',
];

export interface ClinicalCase {
  /** 运行时生成:`case_1` */
  id: string;
  /** 指向内容里的 `CaseTemplate` */
  templateId: string;
  /** 主诉的短句(「惊恐发作之后不敢再坐地铁」)。写主诉,不写诊断 */
  presentingIssue: string;
  /** 分配屏和回顾页上的短名(「地铁」个案这种叫法是真实的行话) */
  label: string;
  status: CaseStatus;
  /**
   * 工作联盟,0–100。Bordin (1979) 的那三样:任务、目标、纽带。
   * 联盟高则进展快、脱落低;联盟受临床值、状态值、取向匹配度影响。
   * **这个数值有名字这件事,会在一个督导事件里被点出来。**
   */
  alliance: number;
  /** 累计会谈次数。注册系统的个案小时数从这里长出来 */
  sessions: number;
  riskLevel: 'low' | 'moderate' | 'high';
  /**
   * 你的取向与这个个案的匹配度(0–100)。开案时由引擎按
   * 玩家的取向 flag × 模板的 `orientationFit` 算一次,之后不变。
   */
  orientationMatch: number;
  startedYear: number;
  /** 这个个案是否在督导中。督导显著降低脱落与伦理事件的严重后果 */
  supervised: boolean;
  /**
   * 今年联盟的走向。**骰子由引擎掷,故事由内容讲**(与 `Project.lastRoll` 同一纪律):
   * 调度器在挑阶段事件之前先算这一年的联盟漂移,内容用 `{ caseTrend }` 分流文案,
   * 所以"这段关系在变好还是变僵"这句话永远和数值一致。
   */
  lastTrend?: 'warm' | 'strained';
  /** 今年的联盟漂移量。调度器写,年度结算兑现后清零 */
  pendingDrift?: number;
  /**
   * 这个个案已经放过的阶段事件。**去重记在个案上,不记在全局**——
   * 两个个案各自有一次"他迟到了二十分钟"是真实的,同一个个案两次不是。
   * (与 `Project.seenEventIds` 同源,那边的教训见 types/project.ts。)
   */
  seenEventIds?: string[];
  /** 脱落时的会谈次数。「他在第 8 次脱落」那个数字,结局页还会用 */
  droppedAtSession?: number;
}

/**
 * 个案模板(内容侧)。决定主诉、风险分级、取向匹配面。
 *
 * `availableWhen` 是"这个来访者会不会出现在你的池子里"——
 * 高风险个案要临床值够、或者已经有督导,才会被分给你(现实里也是这样,
 * 机构不会把自伤史的青少年分给一个刚上手的新手……通常不会)。
 */
export interface CaseTemplate {
  id: string;
  /** 回顾页与文案里的短名 */
  label: string;
  /** 主诉候选。开案时轮取,让不同局里的同一模板不完全一样 */
  presentingIssues: string[];
  riskLevel: 'low' | 'moderate' | 'high';
  /**
   * 哪些取向做这个个案顺手(`orientation_cbt` 这类 flag id)。
   * 玩家的取向命中 → `orientationMatch` 高;没命中不是不能做,是慢。
   */
  orientationFit: string[];
  availableWhen?: Condition;
  /** 开案时立即应用的效果 */
  onOpen?: Effect[];
}

/**
 * 个案操作(DSL Effect `{ case: CaseOp }`)。
 *
 * `target` 指定操作哪个个案:省略 = 当前事件绑定的那个(`state.currentCaseId`),
 * 兜底取最近开的。`'latest'` 强制取最近开的。
 *
 * **状态推进的大方向由引擎的年度结算决定**(联盟漂移、脱落判定),
 * 内容侧的 op 用于事件里的**转折**:来访者提前结束、你决定转介、
 * 一次会谈把联盟拉回来。这与课题的分工一致:阶段事件不负责日常推进。
 */
export type CaseOp =
  | { op: 'open'; templateId: string }
  | { op: 'setStatus'; target?: string; status: CaseStatus }
  | { op: 'drop'; target?: string }
  | { op: 'complete'; target?: string }
  | { op: 'refer'; target?: string }
  | { op: 'adjustAlliance'; target?: string; delta: number }
  | { op: 'setField'; target?: string; supervised?: boolean; riskLevel?: ClinicalCase['riskLevel'] };
