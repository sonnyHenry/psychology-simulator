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
  initialStage: string;
  initialFavor: number;
  /** 关系状态机。每一步揭示一点真实原型 */
  stages: Record<string, { advanceWhen?: Condition; eventId?: string }>;
}

export interface AdvisorState {
  id: string;
  favor: number;
  stage: string;
  /** 玩家已经看穿了这个导师是什么原型(由关系事件揭示)。只影响文案,不影响判定 */
  revealed?: boolean;
}
