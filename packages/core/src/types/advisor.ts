import type { Condition } from './dsl';
import type { ProjectStage } from './project';

/**
 * 导师系统(GAME_DESIGN 第七节)——**本作最大的随机变量**。
 *
 * 心理学人生里没有比这个更重要的一次骰子。**报志愿后不抽,进实验室时才抽**(大三或研一),
 * 抽卡前你只能看到公开信息:主页、论文列表、师兄师姐的一句话。
 *
 * ## 抽卡屏只给公开印象
 *
 * `publicImpression` 是抽卡时唯一展示的东西。**真实原型要两三年才揭示完**,
 * 靠 `stages` 的关系事件一步步露出来。这个信息差不是为了刁难玩家——
 * 它就是现实中选导师时的处境,而且它是"换导师窗口逐年关闭"那个张力的全部前提:
 * **你什么都不知道的时候可以换,等你什么都知道了就走不了了。**
 *
 * 所以 `archetype`(真实原型)**绝对不能出现在 ViewModel 里**。
 */
export interface AdvisorDef {
  /**
   * 导师所属机构(GAME_DESIGN 19.2)。**虚构人名 + 真实建制**——
   * 共鸣度几乎不损失,而把"边界感差"这类原型安在真实个体上的风险归零。
   * validate 规则 11 要求它指向真实存在的 `Institution`。
   */
  institutionId?: string;
  id: string;
  /** 真实原型。**不进 ViewModel** */
  archetype: string;
  /** 虚构姓名(validate 规则 10/11:不得命中真实研究者姓名黑名单) */
  name: string;
  /** 抽卡屏上你能看到的:主页、论文数、师兄师姐的一句话 */
  publicImpression: string;
  /** 全局事件类别偏置。导师改写的是你整条时间线会遇到什么 */
  poolBias?: Record<string, number>;
  /**
   * 对课题各阶段推进概率的乘数修正。
   *
   * 这是六个原型在**机制上**真正不同的地方:大牛的资源让收数据变容易、
   * 青年 PI 盯得紧让写作和投稿快、放养型在每一站都只给你自己扛。
   */
  projectModifiers?: Partial<Record<ProjectStage, number>>;
  /**
   * 工作台上"他有多少时间给你"那一档(M4.6,GAME_DESIGN 七节)。
   *
   * **映射必须多对一**(validate 规则 35):学术大牛和放养型老教授都是"几乎见不到",
   * 而这两个人在关键时刻会做的事完全相反。**你能看见他忙不忙,看不见他会不会抢你一作。**
   * 一对一的映射等于把 `archetype` 印在面板上,那 ViewModel 里不给 archetype 就白防了。
   */
  availability: 'rare' | 'monthly' | 'weekly';
  /**
   * 「寻求指导」的可能结果(M4.6)。**六个原型第一次在玩家的主动动作上产生差异。**
   *
   * 每个原型 **≥2 种**,而且至少一种要和另一个原型的某种结果**同属一类**(`outcomeTag`)——
   * 大牛的"约不上"和放养型的"你自己看着办"在第一年读起来是同一件事("他不管我"),
   * 分开要到第二第三年、看他在关键时刻做什么才行。
   *
   * **这一格是原型的渐进揭示通道,不是揭示按钮。** 一次问出结论,
   * 七节那个"换导师窗口逐年关闭"的张力就没了。validate 规则 35 强制这两条。
   *
   * 掷骰由引擎做(`rollAdvisorConsult`),命中的 `eventId` 当年播出来——
   * 老规矩:**骰子由引擎掷,故事由内容讲**。
   */
  consultResponses?: { id: string; outcomeTag: string; eventId: string; weight?: number }[];
  initialStage: string;
  initialFavor: number;
  /** 关系状态机。每一步揭示一点真实原型 */
  stages: Record<string, { advanceWhen?: Condition; eventId?: string }>;
}

/**
 * 换导师的一个入口(GAME_DESIGN 七节)。
 *
 * ## 逐年关闭的窗口 + 递增的成本
 *
 * | 时机 | 你知道多少 | 代价 |
 * |---|---|---|
 * | 研一 / 直博一年级 | 很少 | 小。损失半年,资本小挫 |
 * | 研二 / 博二 | 差不多摸清了 | 中。损失一年,课题清零 |
 * | 博三及以后 | 全都知道了 | 极高,但**仍然可行** |
 *
 * **你什么都不知道的时候可以换,等你什么都知道了就走不了了。**
 * 这是这个机制全部的意思,也是很多人真实的处境。
 *
 * ## `late` 档必须存在(validate 规则 22)
 *
 * 换导师**必须一直可行**,即使代价极高——因为现实中它可行,而且有人应该这么做。
 * 少了 late 档,"代价极高但始终可行"就变成了"后期不可行",
 * 而那是完全不同的一句话。
 */
export interface AdvisorSwitchOption {
  id: string;
  /** 'early' | 'mid' | 'late' —— 决定代价档位,也决定它在哪几年出现 */
  costTier: 'early' | 'mid' | 'late';
  label: string;
  /** 这一档的代价说明。**明码标价**,与工作台同一条纪律 */
  cost: string;
  availableWhen?: Condition;
  /** 触发的事件。换导师是一幕戏,不是一个按钮 */
  eventId: string;
}

export interface AdvisorState {
  id: string;
  favor: number;
  stage: string;
  /** 玩家已经看穿了这个导师是什么原型(由关系事件揭示)。只影响文案,不影响判定 */
  revealed?: boolean;
  /**
   * **他上次说的那句话**(M4.6 导师面板的第四行)。由内容用 `{ advisorLine }` effect 写。
   *
   * 一行文本,把一个幕后乘数变回一个人。这是整块面板里最便宜也最有效的一处:
   * 好感度和关系阶段从一开始就在引擎里,而玩家一次都没"看见"过这个人。
   */
  lastLine?: string;
}
