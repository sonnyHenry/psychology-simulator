import type { GradApplyKind } from './institution';
import type { BackgroundCard, TraitCard } from './content';
import type { Gender, StatDeltas, Stats, Track } from './stats';

export interface PublicExamQuestion {
  id: string;
  subject: string;
  text: string;
  options: string[];
}

/**
 * 工作台(GAME_DESIGN 四节 / TECH 4.4)。**本作的主界面。**
 *
 * ## 它不是一张表,是一张桌子
 *
 * 第一版的分配屏是一列可投入项、一项一行字、投完就走。它能表达"精力有限",
 * 却表达不了"你在经营什么"——手上那两个课题、三个来访者、那个一年见你三次的导师,
 * 在做决定的那一屏上全都不可见。**于是玩家的体感是在填表,而不是在过日子。**
 *
 * 工作台里**没有一条新机制**:`Project` / `ClinicalCase` / `AdvisorState` 在引擎里
 * 早就是真的跨年对象,`yearlySnapshots` 也一直在存。它做的事是把**已经存在但玩家
 * 看不见的状态摆到桌面上**——一个玩家看不见的状态字段和一个 flag 没有区别。
 *
 * ## 这一层的纪律:原始数值不许穿过去(validate 规则 36)
 *
 * `quality` / `alliance` / `favor` 的数字一个都不进这个 ViewModel,只给档位:
 * 阶段是事实(六站的哪一站),质量是判断("还有硬伤 / 看得过去 / 结实")。
 * **给了数字,一屏选择就从一次判断变成一道最优化题,而那道题的答案通常很无聊。**
 * 同理 `advisor.archetype` 不进来,可及性三档的映射也必须多对一(规则 35)。
 */
export interface DeskView {
  kind: 'DESK';
  year: number;
  phaseLabel: string;
  /** 本回合能用的格数(已扣掉重修占用) */
  slots: number;
  /** 上一年因挂科被占掉的格数,为 0 时不展示 */
  retakeSlots: number;
  /**
   * 顶部常驻的毕业/考核进度(GAME_DESIGN 4.3)。**只列清单,不算总分。**
   * `null` = 现在这个阶段没有毕业硬指标(本科、非学术路径)。
   */
  graduation: {
    institution: string;
    /** 展示文案:'博士毕业要求 2 篇 SCI,其中 1 篇二区以上' */
    bar: string;
    /** 你现在有什么:['二区 1', '中文核心 1', '在审 1'] */
    have: string[];
    /** 还差什么。`null` = 已经够了 */
    remaining: string | null;
    met: boolean;
  } | null;
  /** 花精力格的投入项。`target` 决定它显示在哪张卡片/哪个面板上 */
  items: {
    id: string;
    label: string;
    /** 氛围文案 */
    text: string;
    /** **这一格换来什么**(明码标价,GAME_DESIGN 4.6) */
    payoff: string;
    category: string;
    maxSlots: number | null;
    /** 该项关联课程时,课程的教材名("张厚粲《现代心理与教育统计学》") */
    textbook?: string;
    target?: { kind: 'project' | 'case' | 'advisor'; id?: string };
  }[];
  /** 课题页签:一卡一课题,像一块实验室白板 */
  projects: {
    id: string;
    title: string;
    /** 六站走到哪。**阶段是事实**,所以给中文站名 */
    stage: string;
    /** 走到第几站 / 一共几站。进度是事实,不是评价 */
    stageIndex: number;
    stageTotal: number;
    yearsSpent: number;
    authorship: string;
    isThesis: boolean;
    /** **质量只给档位**:'还有硬伤' / '看得过去' / '结实'。原始 quality 不进来 */
    qualityLabel: string;
    /** 被拒过几次。这是事实,不是判断,可以给数字 */
    rejections: number;
    /** 站在投稿/审稿站 = 可以选刊 */
    atSubmitStage: boolean;
    /** 已经选定的目标档位(中文名),没选过为 null */
    submitTierLabel: string | null;
    /** 只有 `trait_skeptic` 能看到:这个课题地基的原始研究样本量 */
    foundationHint?: string;
  }[];
  /** 已发表的论文清单 */
  papers: { title: string; tier: string; authorship: string; year: number }[];
  /**
   * 个案页签:一卡一个案。**联盟只给走向**,数值不进 ViewModel——
   * 这条在结算屏上已经写死过一次,工作台不许绕过。
   */
  cases: {
    id: string;
    label: string;
    presentingIssue: string;
    status: string;
    sessions: number;
    /** 'warm' | 'strained' | null(今年还没掷过) */
    trend: string | null;
    supervised: boolean;
    riskLabel: string;
  }[];
  /** 注册系统的两个累积量,个案页签底下一行 */
  clinicalHours: number;
  supervisionHours: number;
  /**
   * 导师面板(GAME_DESIGN 七节)。好感度和关系阶段从一开始就在引擎里,
   * 但**玩家一次都没看见过**——导师只在事件里出现,平时是一个幕后乘数。
   */
  advisor: {
    name: string;
    /** 抽卡那天你读到的那句话,**永远留在面板上**。几年之后再读它会有别的味道 */
    publicImpression: string;
    /** 疏远 / 一般 / 熟络 / 亲近。**四档,不给数字** */
    relationLabel: string;
    /** 几乎见不到 / 一月一次 / 每周都问。**多对一映射**,不是原型的编码 */
    availabilityLabel: string;
    /** 他上次说的那句话。没有则为 null */
    lastLine: string | null;
  } | null;
  /** 「这些年」页签:历年流水,可以往回翻。纯读,零机制 */
  years: {
    year: number;
    phaseLabel: string | null;
    money: number;
    state: number | null;
    papers: { title: string; tier: string }[];
    notes: string[];
  }[];
  /**
   * **不花精力格**的当场动作(选刊、降档改投、放弃课题)。
   *
   * 分工见 TECH 4.4:花格数的一律走 `ALLOCATE`(一次原子提交,格数守恒只能有一个校验点),
   * 不花格数的走 `DESK_ACTION` 当场生效——它们不参与格数校验,不会把那条不变式搞乱。
   */
  actions: {
    id: string;
    label: string;
    hint: string;
    targetId?: string;
    value?: string;
  }[];
}

export type ViewModel =
  | { kind: 'TITLE'; title: string }
  | {
      kind: 'BACKGROUND_DRAW';
      card: BackgroundCard;
      /** 特质候选卡(抽 4 选 2),玩家通过 CHOOSE_TRAITS 提交选择 */
      traitOffer: TraitCard[];
      pickCount: number;
    }
  | { kind: 'SETUP'; genders: Gender[]; tracks: Track[] }
  | { kind: 'EXAM'; index: number; total: number; question: PublicExamQuestion }
  | { kind: 'EXAM_RESULT'; score: number; correct: number; total: number }
  | {
      kind: 'APPLICATION';
      score: number;
      options: {
        id: string;
        label: string;
        university: string;
        /** 稳 / 较稳 / 冲 / 悬 / 基本无望 */
        chanceLabel: string;
        risky: boolean;
        majors: { id: string; name: string }[];
      }[];
    }
  | {
      kind: 'NPC_SELECTION';
      /** 本作恒为空数组:没有必选人物 */
      requiredNpcs: { id: string; name: string; description: string }[];
      npcs: { id: string; name: string; description: string }[];
      pickCount: number;
    }
  | {
      kind: 'LIFE_GOAL';
      goals: { id: string; label: string; text: string }[];
    }
  | {
      kind: 'CROSSROAD';
      year: number;
      university: string;
      major: string;
      /** 岔口分组 id,同一个屏服务多个岔口(大四 / 硕士) */
      group: string;
      options: { id: string; label: string; text: string; hint?: string }[];
    }
  | {
      /**
       * 读研 / 读博 / 出国的院校清单。**一屏三用**,靠 `kind` 区分。
       *
       * 概率**只给模糊档位**(稳/较稳/冲/悬),不给精确值:
       * 真实的申请里没有人知道自己的确切概率,你只知道"这个有点冒险"。
       * 给了精确数字,这一屏就从一次选择变成一道最优化题。
       */
      kind: 'GRAD_APPLY';
      year: number;
      applyKind: GradApplyKind;
      /** 顶部常驻声明:条款是游戏化设定。**validate 规则 12 要求非空** */
      notice: string;
      maxPicks: number;
      options: {
        id: string;
        name: string;
        unit: string;
        lab?: string;
        city: string;
        impression: string;
        /** 方向匹配上的标签,让玩家看见本科四年在这里兑现 */
        matchedDomains: string[];
        terms: string[];
        /** '稳' | '较稳' | '冲' | '悬' | '基本无望' */
        chanceLabel: string;
      }[];
    }
  | {
      /**
       * 录取结果。**这一屏不能省。**
       *
       * 第一版投完直接进了下一阶段:玩家看不到自己中没中,也不知道去了哪——
       * 而"查结果那一刻"恰好是这条线上最有分量的时刻之一,把它做成一次静默的状态变更
       * 等于把整个申请屏的意义抹掉了一半。
       */
      kind: 'GRAD_RESULT';
      year: number;
      applyKind: GradApplyKind;
      results: { name: string; unit: string; admitted: boolean }[];
      /** 最终去哪。null 只在内容还没给这一种申请配兜底时出现 */
      landedName: string | null;
      landedUnit: string | null;
      /** 想去的一个都没中,最后是被兜底接住的 */
      viaAdjustment: boolean;
      text: string;
    }
  | {
      kind: 'ADVISOR_DRAW';
      year: number;
      /**
       * 候选导师。**只有公开印象**——真实原型(`archetype`)刻意不在这里,
       * 它要两三年才由关系事件揭示完。这个信息差是"换导师窗口逐年关闭"的全部前提。
       */
      candidates: { id: string; name: string; publicImpression: string }[];
    }
  | DeskView
  | { kind: 'BRIEF'; phaseLabel: string; year: number; text: string }
  | {
      kind: 'EVENT';
      eventId: string;
      title: string;
      text: string;
      major: boolean;
      choices: { id: string; text: string }[];
    }
  | { kind: 'OUTCOME'; text: string; deltas: StatDeltas; relationshipHint?: string }
  | {
      kind: 'SETTLEMENT';
      year: number;
      stats: Stats;
      /** 本年命中的收入规则明细("大厂工资 +¥62,000"等) */
      incomes: { label: string; amount: number }[];
      /** 收入结算引起的金钱净变化 */
      moneyDelta: number;
      /** 财富里程碑提示(跨越 10万/50万/100万),无则为 null */
      milestone: string | null;
      /** 历年年末金钱快照,用于趋势小图 */
      moneyTrend: { year: number; money: number }[];
      /** 本学年的课程判定结果,年度回顾页一行一门 */
      courseResults: { label: string; tier: 'mastered' | 'passed' | 'failed' }[];
      /**
       * 手上的课题,一行一个。M4.5 的年度回顾页会把它扩成完整的清单式排版
       * (含论文、个案、竞争者进度);现在先让 P5 的状态**在界面上真的看得见**——
       * 一个玩家看不见的状态字段和一个 flag 没有区别。
       */
      projects: { title: string; stage: string; yearsSpent: number; isThesis: boolean }[];
      /**
       * 手上的个案,一行一个(M4)。**联盟的数值不进 ViewModel**——
       * 玩家看到的是走向("在变好 / 在变僵"),不是一个可以优化的数字。
       * 把关系变成进度条,恰好毁掉这个机制想说的事。
       */
      cases: {
        label: string;
        status: string;
        sessions: number;
        /** 'warm' | 'strained' | null(今年没掷过) */
        trend: string | null;
        /** 脱落发生在第几次会谈,仅 dropped 时有 */
        droppedAtSession: number | null;
      }[];
      /** 注册系统的两个累积量。临床线的年度回顾要能看到它们在涨 */
      clinicalHours: number;
      supervisionHours: number;
    }
  | {
      kind: 'ENDING';
      endingId: string;
      title: string;
      text: string;
      stats: Stats;
      score: number;
      grade: 'S' | 'A' | 'B' | 'C' | 'D';
      historyLength: number;
      /**
       * **你的论文清单。** 结局页三份清单里的第一份(GAME_DESIGN 十八节),
       * 含"哪几篇后来重复不出来"。这是科研人的回响,比任何数值都有杀伤力。
       */
      papers: {
        title: string;
        tier: string;
        authorship: string;
        year: number;
        /** `null` = 从来没有人试过重复。**这是绝大多数论文的真实结局** */
        replicated: boolean | null;
      }[];
      /** 做废的课题。跟论文清单一样重要——做废是这个职业最普遍的经验 */
      abandonedProjects: { title: string; stage: string; yearsSpent: number }[];
      /**
       * **你的来访者们。** 结局页三份清单里的第三份(GAME_DESIGN 十八节)。
       * 脱落的写"他在第 N 次之后没有再来";结束的写"你不知道后来怎么样了,
       * 咨询结束后就不该知道了"——这句由 UI 层写,数据只给事实。
       */
      cases: {
        label: string;
        presentingIssue: string;
        status: string;
        sessions: number;
        startedYear: number;
        droppedAtSession: number | null;
      }[];
      /** 历年年末金钱快照,供结局页/分享图做趋势展示 */
      moneyTrend: { year: number; money: number }[];
      /** 本局真正完成的 NPC 关系收束,由核心层统一解释内部 flags。 */
      relationships: {
        npcId: string;
        name: string;
        title: string;
        text: string;
        warmCount: number;
        coolCount: number;
        moments: string[];
      }[];
      shareCard: {
        title: string;
        tagline: string;
        tone: 'triumph' | 'bitter' | 'warm';
        seed: number;
        years: string;
        /** 本局选择的特质 label(如 ['天生胆大','恋家']),旧存档可能为空 */
        traits: string[];
        /** 2023 年形成的成年性格路线 */
        traitEvolutions: string[];
        /** 分享卡和分享文案使用的精简关系称号。 */
        relationships: string[];
        /** 2018 年选择的人生目标,旧存档可能为空 */
        goal?: string;
      };
    };

export type PlayerAction =
  | { type: 'START' }
  | { type: 'CONTINUE' }
  | { type: 'CHOOSE_TRAITS'; traitIds: string[] }
  | { type: 'CHOOSE_SETUP'; gender: Gender; track: Track }
  | { type: 'ANSWER'; optionIndex: number }
  | { type: 'SKIP_EXAM' }
  | { type: 'APPLY'; optionId: string; majorId?: string }
  | { type: 'CHOOSE_NPCS'; npcIds: string[] }
  | { type: 'CHOOSE_LIFE_GOAL'; goalId: string }
  | { type: 'CHOOSE_CROSSROAD'; optionId: string }
  /** 提交年度投入分配。`picks` 长度必须等于本回合格数,同一项可重复出现 */
  | { type: 'ALLOCATE'; picks: string[] }
  /**
   * 工作台上**不花精力格**的当场动作(选刊、降档改投、放弃课题)。
   *
   * 新加动作时**先问这一格花不花精力**:花 → 加一条 `AllocationItem` 走 `ALLOCATE`;
   * 不花 → 加一个 actionId 走这里。答案决定它走哪条通路(TECH 4.4)。
   * validate 规则 37 机械地守住这条:`DESK_ACTION` 的效果里不许出现 `grantSlots`。
   */
  | { type: 'DESK_ACTION'; actionId: string; targetId?: string; value?: string }
  | { type: 'JOIN_ADVISOR'; advisorId: string }
  | { type: 'APPLY_GRAD'; institutionIds: string[] }
  | { type: 'CHOOSE'; choiceId: string };
