import type { GradApplyKind } from './institution';
import type { BackgroundCard, TraitCard } from './content';
import type { Gender, StatDeltas, Stats, Track } from './stats';

export interface PublicExamQuestion {
  id: string;
  subject: string;
  text: string;
  options: string[];
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
  | {
      kind: 'PROJECT_BOARD';
      year: number;
      /** 像一块实验室白板:一行一个课题 */
      projects: {
        id: string;
        title: string;
        stage: string;
        yearsSpent: number;
        authorship: string;
        isThesis: boolean;
        /** 只有 `trait_skeptic` 能看到:这个课题地基的原始研究样本量 */
        foundationHint?: string;
      }[];
      papers: { title: string; tier: string; authorship: string; year: number }[];
      /** 导师的公开身份(抽卡后才有)。仍然不含真实原型 */
      advisorName: string | null;
    }
  | {
      kind: 'ALLOCATION';
      year: number;
      phaseLabel: string;
      /** 本回合能用的格数(已扣掉重修占用) */
      slots: number;
      /** 上一年因挂科被占掉的格数,为 0 时不展示 */
      retakeSlots: number;
      items: {
        id: string;
        label: string;
        text: string;
        category: string;
        maxSlots: number | null;
        /** 该项关联课程时,课程的教材名,用来在分配屏上直接显示"张厚粲《现代心理与教育统计学》" */
        textbook?: string;
      }[];
    }
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
  | { type: 'JOIN_ADVISOR'; advisorId: string }
  | { type: 'APPLY_GRAD'; institutionIds: string[] }
  | { type: 'CHOOSE'; choiceId: string };
