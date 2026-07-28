import type { Authorship, PaperTier, ProjectOp, ProjectStage } from './project';
import type { CaseOp, CaseStatus, ClinicalCase } from './case';
import type { FavorOp, RivalOp } from './social';
import type { StatKey } from './stats';

export type Op = '>' | '>=' | '<' | '<=' | '==';

export type Condition =
  | { always: true }
  | { stat: StatKey; op: Op; value: number }
  | { flag: string; equals?: boolean | number | string }
  | { year: { from?: number; to?: number } }
  | { career: string }
  | { background: string }
  | { major: string }
  | { npcFavor: string; op: Op; value: number }
  | { npcStage: string; stage: string }
  | { historyCount: { category?: string; outcomeTag?: string; op: Op; value: number } }
  /**
   * 数值型 flag 的大小比较。注册小时数、督导小时数、耗竭值、诚信风险、教学工作量
   * 这一整批累积量都靠这一条继续用 `flags` 字典承载,不必各开一个 state 字段
   * (TECH 4.2:只有需要枚举成列表的东西——课题/论文/个案——才真的进 P5)。
   *
   * 缺失的 key 读作 0,布尔读作 1/0。所以 `{ flagNum: { key: 'burnout', op: '>=', value: 60 } }`
   * 在开局就是 false,不需要内容侧先把每个累积量初始化一遍。
   */
  | { flagNum: { key: string; op: Op; value: number } }
  /**
   * 课题计数。**管线阶段事件靠它串成序列**:
   * `{ projectCount: { stage: 'analyze', op: '>=', value: 1 } }` = 手上有课题正卡在分析阶段。
   */
  | {
      projectCount: {
        stage?: ProjectStage;
        domain?: string;
        isThesis?: boolean;
        /** true = 只数还在推进的(不含已发表/已做废) */
        active?: boolean;
        op: Op;
        value: number;
      };
    }
  | { paperCount: { tier?: PaperTier; authorship?: Authorship; op: Op; value: number } }
  /**
   * 当前事件绑定课题的**掷骰结果**。骰子由调度器掷(见 `Project.lastRoll`),
   * 内容用它把同一个阶段事件分流成"推进了"和"卡住了"两种文案。
   */
  | { projectRoll: 'ok' | 'setback' }
  /**
   * 个案计数。个案阶段事件与"手上有个案在谈"类门控靠它:
   * `{ caseCount: { status: 'plateau', op: '>=', value: 1 } }` = 有个案正卡在停滞期。
   */
  | {
      caseCount: {
        status?: CaseStatus;
        riskLevel?: ClinicalCase['riskLevel'];
        /** true = 只数还在谈的(不含脱落/结束/转介) */
        active?: boolean;
        op: Op;
        value: number;
      };
    }
  /**
   * 当前事件绑定个案的**联盟走向**(见 `ClinicalCase.lastTrend`)。
   * 与 `{ projectRoll }` 同一纪律:走向由引擎掷,内容只分流文案,
   * 所以"这段关系在变好还是变僵"这句话永远和数值一致。
   */
  | { caseTrend: 'warm' | 'strained' }
  /** 导师。`archetype` 是真实原型——内容可以读,但**它不进 ViewModel** */
  | { advisor: { archetype?: string; stage?: string; favor?: { op: Op; value: number } } }
  /**
   * 影子竞争者的处境(M4.5,13.1)。
   *
   * `aheadOfPlayer` 是五个交汇点分流的主条件——**每个交汇点都必须有
   * "他领先"和"你领先"两个版本**(validate 规则 16),否则那一幕只有一种读法。
   * `struggling` 是"他从对手变成同类"那几幕的开关。
   */
  | { rival: { aheadOfPlayer?: boolean; struggling?: boolean; track?: string; met?: boolean } }
  /**
   * 人情账的余额(M4.5,13.2)。读的是**贬值之后**的分量之和,不是原始值——
   * 五年前的恩情兑现不了一封今年的推荐信。
   * `direction` 省略时读净额(他欠我 − 我欠他)。
   */
  | { favorBalance: { who?: string; direction?: 'owed' | 'owing'; op: Op; value: number } }
  /** 玩家有没有听到过某条情报。**读的是"听到过没有",不是"这条是真是假"** */
  | { heardRumor: string }
  | { chance: number }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fn: string };

export type Effect =
  | { stats: Partial<Record<StatKey, number>> }
  | {
      moneyCost: {
        rate: number;
        min?: number;
        max?: number;
        roundTo?: number;
        reason?: 'daily' | 'medical' | 'family' | 'investment' | 'scam' | 'house' | 'other';
      };
    }
  | { setStat: StatKey; value: number }
  | { setFlag: string; value?: boolean | number | string }
  /**
   * 累积量增减。非数值的现值(含缺失)按 0 起算,再按 min/max 钳位。
   * 与 `{ flagNum }` 成对使用——validate 双向强制:写了没人读、读了没人写,都是 error。
   */
  | { addFlag: { key: string; delta: number; min?: number; max?: number } }
  | { npcFavor: string; delta: number }
  | { npcStage: string; stage: string }
  | { schedule: { eventId: string; afterRounds: number } }
  /**
   * 延毕:给**当前** rounds 阶段追加轮数。累加,阶段切换时清零。
   * 延毕机制的全部实现就是这一条 effect + `state.phaseExtraRounds` 一个字段。
   */
  | { extendPhase: { rounds: number } }
  /** 课题操作:create / advance / regress / abandon / setField(见 types/project.ts) */
  | { project: ProjectOp }
  /** 个案操作:open / setStatus / drop / complete / refer / adjustAlliance / setField(见 types/case.ts) */
  | { case: CaseOp }
  | { advisorFavor: number }
  | { advisorStage: string }
  /** 竞争者操作:nudge(改成长速度)/ reveal(提高了解)/ encounter(记一次交汇) */
  | { rival: RivalOp }
  /** 人情账:add(记一笔)/ settle(兑现或抵消) */
  | { favor: FavorOp }
  /**
   * 记下**导师上次说的那句话**,常驻在工作台的导师面板上(M4.6)。
   * 一行文本,把一个幕后乘数变回一个人——由内容自己决定哪句话值得留着。
   */
  | { advisorLine: string }
  /** 抽导师:亮出 `count` 张候选,进 ADVISOR_DRAW 屏 */
  | { drawAdvisor: { count: number } }
  /**
   * 临时增减**本回合**的精力格数(负数就是"这一年你被别的事吃掉了一格")。
   * 每回合开始清零,所以它只影响当年。消费方是 `ALLOCATION` 屏(M2)。
   */
  | { grantSlots: number }
  | { setCareer: string }
  | { jumpToPhase: string }
  | { triggerEnding: string }
  | { fn: string; args?: Record<string, unknown> };
