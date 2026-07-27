import type { Authorship, PaperTier, ProjectOp, ProjectStage } from './project';
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
  /** 导师。`archetype` 是真实原型——内容可以读,但**它不进 ViewModel** */
  | { advisor: { archetype?: string; stage?: string; favor?: { op: Op; value: number } } }
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
  | { advisorFavor: number }
  | { advisorStage: string }
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
