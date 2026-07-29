import type { Condition, Effect } from './dsl';

/**
 * 课题管线(GAME_DESIGN 第五节 / TECH 4.7)。
 *
 * 这是 **P5 长机制状态化** 的第一个真实使用者:课题跨年、玩家需要随时知道
 * "我手上有哪几个课题、各在什么阶段",所以它必须是 `GameState` 里一个真的列表,
 * 而不是一堆扁平 flag。(反例是课程——见 `types/content.ts` 的 `Course`。)
 *
 * 毕业论文(M2.5)是这条管线的**教学关**:阶段序列裁短成
 * `想法 → 收数据 → 分析 → 写作 → 答辩`,跳过伦理/预注册和投稿两站。
 * 真课题(M3)走完整的九阶段。**阶段序列写在模板里,引擎不知道有哪些序列。**
 */

export type ProjectStage =
  | 'ideation'
  | 'lit'
  | 'ethics'
  | 'collect'
  | 'analyze'
  | 'write'
  | 'submit'
  | 'review'
  | 'published'
  | 'abandoned';

/** 终态。任何课题最终必须落在这两个之一(validate 规则 1 靠它判死锁) */
export const TERMINAL_STAGES: readonly ProjectStage[] = ['published', 'abandoned'];

export type Authorship = 'first' | 'co_first' | 'second' | 'middle' | 'corresponding';

export interface Project {
  /** 运行时生成:`proj_1` */
  id: string;
  /** 指向内容里的 `ProjectTemplate` */
  templateId: string;
  title: string;
  /** 领域标签,决定抽哪个阶段事件池 */
  domain: string;
  stage: ProjectStage;
  /** 0–100,影响可投期刊档位与拒稿率。毕业论文的 quality 不影响后续 */
  quality: number;
  yearsSpent: number;
  authorship: Authorship;
  /**
   * 本课题累积的诚信风险。发表时结转到 `Paper`(M3)。
   * **毕业论文的这一笔也要结转**——`p = .08` 是诚信线的第一笔账,不能因为"只是本科论文"就一笔勾销。
   */
  integrityRisk: number;
  rejections: number;
  preregistered: boolean;
  startedYear: number;
  /** 毕业论文标记。阶段序列裁短、不投稿、quality 不影响后续 */
  isThesis?: boolean;
  /**
   * 上一次阶段推进的掷骰结果。
   *
   * **骰子由引擎掷,故事由内容讲。** 调度器在给这个课题挑阶段事件之前先掷一次
   * (成功率 = 阶段基准 × 方法 × 导师原型 × 本年投入格数,见 `stageSuccessChance`),
   * 结果写在这里,内容用 `{ projectRoll }` 条件分流到"推进了"还是"卡住了"的文案。
   *
   * 这样拆的理由:失败率必须是**系统性**的(GAME_DESIGN 五节的三条硬约束),
   * 光靠 outcome 权重调不出"高方法的人更快但同样会做废";
   * 而文案又必须跟骰子结果一致,否则 simulate 的统计和玩家看到的东西对不上。
   */
  lastRoll?: 'ok' | 'setback';
  /**
   * 本年掷骰成功的次数 = 今年这个课题实际推进几站。年度结算时由引擎兑现,然后清零。
   *
   * **一年一次推进太慢了。** 八站的完整管线,每年一次、平均六成的话要十三年才出一篇——
   * 而真实的课题是两三年一篇。所以每个课题每年掷 `2 + 2×投入格数` 次:
   * 不投的课题一年爬一站(基本等于卡死),投满两格的一年能走三四站。
   *
   * 这个设计顺带做出了两个真实的东西:**你只能同时认真推一两个课题**,
   * 以及**那些你没顾上的课题会以看不见的方式烂在手里**。
   */
  lastAdvances?: number;
  /**
   * 连续几年一格精力都没往它上面投过。到阈值就烂在手里了。
   *
   * 记的是**忽视**而不是运气:运气差只会让课题变慢,而慢下来的课题最后是被忽视杀死的。
   */
  neglectedYears?: number;
  /**
   * 这个课题已经放过的阶段事件。**去重必须记在课题上,不能记在全局。**
   *
   * 阶段事件全是 `once: false`(同一幕要能在不同课题、不同年份复用),
   * 而调度器原先只在**同一轮内**去重。后果是一个卡在收数据的课题会连着两年
   * 收到同一封"被试招不满"——文案里还写着"这是第 2 年",像个笑话。
   *
   * 记在课题上而不是全局,是因为两个课题各自遇到一次招不满是真实的,
   * 同一个课题遇到两次不是。
   */
  seenEventIds?: string[];
  /**
   * 这个课题建在哪条理论基础上(GAME_DESIGN 19.4)。创建时随机分配,**玩家看不到**。
   * 只有 `trait_skeptic` 能在白板上多看到一行原始研究的样本量。
   */
  foundationId?: string;
  /** 地基已经塌过一次。一个课题只塌一次,否则同一幕会每年重放 */
  foundationShaken?: boolean;
  /**
   * 玩家在审稿站选的**目标档位**(M4.6 的选刊,GAME_DESIGN 五节)。
   *
   * `undefined` = 还没选,引擎按 `quality` 自动兜底(`tierForQuality`)——
   * bot、旧存档、以及玩家干脆不管这个课题时都走这一条。
   *
   * **这是投稿阶段唯一由玩家直接决定的事。** 冲一冲的代价是被拒之后再等一年,
   * 而博士只有三到五年;降档改投必须吃掉这一年,否则"从一区一路降到能中为止"就成立了。
   */
  submitTier?: PaperTier;
}

export type PaperTier = 'q1' | 'q2' | 'q3' | 'cssci' | 'chinese_core' | 'conference' | 'preprint';

/**
 * 论文。**结局页展示你的论文清单**——这是科研人的"回响",比任何数值都有杀伤力。
 */
export interface Paper {
  id: string;
  title: string;
  tier: PaperTier;
  authorship: Authorship;
  year: number;
  domain: string;
  /** 从课题结转过来。结局页"哪几篇后来重复不出来"的判定依据 */
  integrityRisk: number;
  /** `null` = 从来没有人试过重复。**这是最真实的情况**,也是默认值 */
  replicated?: boolean | null;
  /** 重复失败之后的编辑流程。重复失败不等于造假，所以它与 `replicated` 分开记。 */
  auditStatus?: 'questioned' | 'cleared' | 'corrected' | 'retracted';
}

/** 诚信事件链对论文清单的操作。省略 target 时作用于诚信风险最高的一篇。 */
export type PaperAuditOp = {
  op: 'replicationFailed' | 'clear' | 'correct' | 'retract';
  target?: string;
};

/**
 * 课题模板(内容侧)。决定标题候选、领域、以及**这个课题走哪一条阶段序列**。
 *
 * 阶段序列写在模板里而不是硬编码在引擎里,是为了让毕业论文的裁短版和真课题的完整版
 * 用同一套推进代码。加一种课题形态 = 加一个模板。
 */
export interface ProjectTemplate {
  id: string;
  /** 分配屏和看板上的短名(「情绪调节」)。不写就用标题 */
  label?: string;
  /** 标题候选。开新课题时随机取一个,让不同局里的课题名不一样 */
  titles: string[];
  domain: string;
  /** 这个课题要走的阶段序列。最后一个阶段推进出去就进终态 */
  stageSequence: ProjectStage[];
  isThesis?: boolean;
  availableWhen?: Condition;
  /**
   * 各阶段的基准推进概率。没写的阶段用 `DEFAULT_STAGE_CHANCE`。
   * **这是"哪一站最容易卡住"的唯一来源**——收数据和审稿本来就比写作难得多。
   */
  stageChance?: Partial<Record<ProjectStage, number>>;
  /** 创建时立即应用的效果(如"导师给你一个题"带来的资本变化) */
  onCreate?: Effect[];
}

/**
 * 课题操作(DSL Effect `{ project: ProjectOp }`)。
 *
 * `target` 指定操作哪个课题:`'thesis'` = 本局的毕业论文;`'latest'` = 最近创建的;
 * 具体 id 也可以。省略时按 `'latest'` 处理。
 */
export type ProjectOp =
  | { op: 'create'; templateId: string }
  /** 沿 `stageSequence` 前进一步;走完最后一个阶段则进 `published`(毕业论文进 `abandoned` 之外的终态见下) */
  | { op: 'advance'; target?: string; stages?: number }
  /** 退回一步。地基塌方、答辩没过都用它 */
  | { op: 'regress'; target?: string; stages?: number }
  | { op: 'abandon'; target?: string }
  /** 发表:把课题变成一份 `Paper`,`integrityRisk` 结转过去,课题进 `published` */
  | { op: 'publish'; target?: string; tier: PaperTier }
  | {
      op: 'setField';
      target?: string;
      quality?: number;
      integrityRisk?: number;
      authorship?: Authorship;
      preregistered?: boolean;
    };
