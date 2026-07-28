import type { Condition } from './dsl';

/**
 * 社会层的三个跨年对象(GAME_DESIGN 十三节 / TECH 4.7.3)。
 *
 * 前面三套跨年机制(课题、个案、导师)解决的是"你在做什么"。
 * 这三个解决的是**"你在跟谁比、你欠谁、你知道什么"**。
 *
 * 它们和 `Project` / `ClinicalCase` 一样进 `GameState`(P5 长机制状态化),
 * 理由也一样:玩家需要随时能列出"我欠了谁几笔""他现在几篇了"——
 * 需要枚举成列表的东西才该占 state 字段。
 */

// ══════════════════ 影子竞争者(13.1)══════════════════

/**
 * 影子竞争者。**本作提升游戏性的最高杠杆。**
 *
 * 它让所有数值突然有了意义:你发了 3 篇不知道算好算坏,但"他发了 5 篇"你立刻就懂了。
 * 前作全靠玩家自己脑补参照系;有了对手,焦虑是游戏给的,而且是准确的。
 *
 * **他不跑完整引擎**(`systems/rival.ts` 每年按 `momentum` 推进,几十行)——
 * 他只需要每年产出一个可比的数字和一句处境。
 *
 * **他也不是反派。** 他也在延毕、也在焦虑、也有一年状态崩了;
 * 有几个交汇点是你看到他的处境,那时候他从对手变成同类。
 */
export interface RivalState {
  /** 虚构姓名(受人名黑名单校验,validate 规则 10) */
  name: string;
  /** 'grinder' | 'lucky' | 'strategic' | 'struggling' … 决定 momentum 基线与处境文案 */
  archetype: string;
  track: 'academic' | 'clinical' | 'industry' | 'left';
  /** 与玩家培养阶段平行的粗粒度进度 */
  stage: string;
  papers: number;
  capital: number;
  /**
   * 每年成长速度。基线由 `archetype` 定,**但必须能被玩家行为修正**——
   * 你帮过他、抢过他的机会、在他低谷时说过一句话。
   * 不能被修正的话他就退化成一条固定难度曲线,13.1 第 1 条就落空了。
   */
  momentum: number;
  /** 玩家对他的了解程度:0 只知道名字,3 知道他的处境。打听可提升 */
  visibility: number;
  /** 已发生的交汇点 id,防重复 */
  encounters: string[];
  /**
   * 他今年过得怎么样。由 `systems/rival.ts` 每年写,内容用 `{ rival: { struggling } }` 分流。
   * **这是"他从对手变成同类"那几幕的触发条件。**
   */
  struggling?: boolean;
}

/** 竞争者操作(DSL Effect `{ rival: RivalOp }`)。 */
export type RivalOp =
  /**
   * 遇到他。**只标记意图,不当场创建**——抽哪个原型需要 RNG,
   * 而 `applyEffects` 没有 RNG(引擎偷偷消耗随机流会让同种子的回放漂移)。
   * 真正的抽样在 `continueAfterOutcome` 里,照 `{ drawAdvisor }` 的写法。
   */
  | { op: 'meet' }
  /**
   * 改他的成长速度。**这是玩家行为影响他的唯一通道**,也是 13.1 第 1 条的落地:
   * 你帮过他(+)、你抢了他的一作(−)、你在他低谷时拉了一把(+)。
   */
  | { op: 'nudge'; momentum?: number; papers?: number; capital?: number }
  /** 提高玩家对他的了解(打听、或者某一幕让你看见了他的处境) */
  | { op: 'reveal'; visibility?: number }
  /** 记下一次交汇,防重复 */
  | { op: 'encounter'; id: string };

// ══════════════════ 人情账(13.2)══════════════════

/**
 * 一笔人情。**好感度那一个数字太薄了**——学术圈和咨询圈的真实运作是人情往来。
 *
 * 两个让它有嚼头的地方,都在 `systems/favor.ts` 里:
 * **人情会贬值**(五年前的恩情兑现不了一封今年的推荐信,所以要想"什么时候用"),
 * **欠太多本身是压力**(净欠额直接吃状态,所以"接不接这个活"从数值题变成社会题)。
 */
export interface Favor {
  /** `npcId` | 'advisor' | 'rival' | 'peer_generic' */
  who: string;
  /** `owed` = 他欠我;`owing` = 我欠他 */
  direction: 'owed' | 'owing';
  /** 1–5 */
  weight: number;
  /** 结算页与兑现事件里复述的**具体那件事**。"他帮过你"没有分量,"他把被试池分给你"才有 */
  reason: string;
  /** 记账年份,用于计算贬值 */
  year: number;
  settled?: boolean;
}

/** 人情操作(DSL Effect `{ favor: FavorOp }`)。 */
export type FavorOp =
  /** 记一笔。`year` 由引擎填当前年份——内容不该也不需要知道今年是哪年 */
  | { op: 'add'; who: string; direction: Favor['direction']; weight: number; reason: string }
  /**
   * 兑现/抵消。按**贬值后**的分量从高到低结掉 `weight` 那么多,
   * 结不满就结到没有为止(人情不够用是常态,不是错误)。
   */
  | { op: 'settle'; who?: string; direction?: Favor['direction']; weight?: number };

// ══════════════════ 情报(13.3)══════════════════

/**
 * 一条可打听的情报(内容层)。
 *
 * 学术圈第一痛点是**信息不对称**:导师真实为人、这个方向是不是快塌了、这个岗位的坑在哪。
 * 没有这个机制,玩家做重大选择就只是看数值猜。
 *
 * **信息带可靠度,但不告诉你可靠度。** 玩家看到的永远是"某人说了一句话 +
 * 一句让人不安的括注",而括注**永远不评价可靠性**,只给一个事实
 * (她哪年毕业的、他没说为什么走)。
 */
export interface RumorDef {
  id: string;
  /** `'advisor:adv_star'` | `'foundation:fnd_xxx'` | `'institution:inst_pku'` */
  topic: string;
  /** '师姐' | '猎头' | '同门' | '匿名论坛' —— 来源有自己的立场 */
  source: string;
  /** 打听到的原话 */
  text: string;
  /** 括注里那句破坏性信息('她 2016 年毕业')。**不评价可靠性,只给事实** */
  caveat: string;
  /**
   * 这条消息是否为真。**玩家永远看不到,也绝不进 ViewModel**(validate 规则 19)。
   * 这是 13.3 全部设计的支点:可靠度只能自己推断。
   */
  accurate: boolean;
  availableWhen?: Condition;
  /** 打听的代价。**打听要花代价,所以"打听什么"本身是一次决策** */
  cost?: { slots?: number; network?: number };
}

/** 玩家已经听到的情报。只记 id 和年份——那句话本身在内容里 */
export interface Rumor {
  defId: string;
  year: number;
}
