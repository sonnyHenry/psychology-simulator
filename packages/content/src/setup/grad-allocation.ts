import type { AllocationItem, Condition } from '@psy-sim/core';

/**
 * 研究生阶段的可投入项(GAME_DESIGN 第四节)。**每年三格。**
 *
 * 本科是四格,硕博是三格,博后三格,预聘期两格。**这个递减本身就是一句评论**,
 * 而且完全真实——玩家不需要任何文案就能感觉到人生在收紧。
 *
 * ## "推进某个具体课题"不在这里
 *
 * 那些项是**按活跃课题动态合成的**(见 `systems/allocation.ts` 的 `availableItems`),
 * 因为课题是运行时创建的对象。这也是 `stageSuccessChance` 里"投入格数"那一项的唯一来源:
 * **你投了精力的那个课题才有戏。**
 */

/**
 * 研究生阶段的门控。
 *
 * **不能只判"有没有导师"**——导师是大三进组时就抽好的,所以那样写会让
 * "帮导师干活""开一个新课题"这些项在大四的分配屏上就冒出来。
 * `track_academic` 由大四三岔口的学术路径设置,时点正好。
 */
const IN_GRAD_SCHOOL: Condition = {
  all: [
    { advisor: {} },
    { flag: 'track_academic' },
    // **拿到教职之后这些项要退场。** `advisor` 和 `track_academic` 一辈子都是真的,
    // 所以不排掉的话,预聘期的工作台上会冒出"帮导师干活""教学助理"——
    // 而你现在自己就是那个导师。(M3.1 那条"只写 from 会一路漏下去"的同型错。)
    { not: { flag: 'took_faculty_job' } },
  ],
};

/**
 * 「寻求指导」的门控:**有导师,而且你还在读**。
 *
 * 比 `IN_GRAD_SCHOOL` 宽一点——走临床线的人手上也有一个大三就抽到的导师,
 * 临床派导师给的是个案层面的指导,那正是六原型分流表里的一格。
 * 但临床线到 2022 年就进独立执业了,那时候那个人已经是"一年发一次邮件"的关系,
 * **不该每年占掉一格精力**。
 *
 * > 这条上界不是文案问题,是标定问题:不设的话,独立执业那几年这一格会去抢
 * > "接个案"的格子,注册小时数中位数直接从 534 掉到 434。
 * > (M3.1 那条"只写 from 会一路漏下去"的规矩,在这里以另一种形式又出现了一次。)
 */
const HAS_ADVISOR: Condition = {
  all: [
    { advisor: {} },
    { any: [{ flag: 'track_academic' }, { all: [{ flag: 'track_clinical' }, { year: { to: 2021 } }] }] },
  ],
};

export const gradAllocationItems: AllocationItem[] = [
  {
    /**
     * **寻求指导**(M4.6,GAME_DESIGN 七节)。id 是引擎约定(`ALLOC_ADVISOR_CONSULT_ID`)。
     *
     * 这一格是六个原型第一次在**玩家的主动动作**上产生差异:此前 `projectModifiers`
     * 是一个被动乘数,玩家感受不到自己抽到了谁;现在他每年花一格去问一次,
     * 一两年就能自己拼出这个人的形状——**而这正是现实中你了解导师的方式**。
     *
     * 结果由引擎按 `AdvisorDef.consultResponses` 掷(`rollAdvisorConsult`),
     * 命中的那一幕当年播出来。**结果不保证**:大牛大概率约不上,那一格就白花了。
     */
    id: 'alloc_advisor_consult',
    label: '寻求指导',
    text: '把卡住的地方整理成三页纸,约他一次。约不约得上是另一回事。',
    payoff: '1 格 = 一次面谈,**结果不保证**:可能推进一站、可能换来一条资源或一个人,也可能只换来一句"你自己看着办"',
    category: 'work',
    availableWhen: HAS_ADVISOR,
    // 一年只能问一次。**这一格是渐进揭示通道,不是揭示按钮**——
    // 允许一年问三次的话,一个原型的两三种回应会在同一年里全部露出来。
    maxSlots: 1,
    // 挂在导师面板上(没有 id = 挂在该类目的面板上)
    target: { kind: 'advisor' },
    perSlot: [
      { stats: { state: -1 } },
      { addFlag: { key: 'advisor_consults', delta: 1, min: 0, max: 20 } },
    ],
  },
  {
    id: 'alloc_new_project',
    label: '开一个新课题',
    text: '想法你有,时间你没有。开新的意味着手上的那个今年基本不动。',
    payoff: '1 格 = 方法 +2、状态 −2,今年会有一个新课题立项。**三格精力配三个课题,总有一个轮空**——而轮空的那个就是会烂掉的那个',
    category: 'work',
    availableWhen: IN_GRAD_SCHOOL,
    maxSlots: 1,
    perSlot: [
      { stats: { method: 2, state: -2 } },
      // 开哪一类课题由内容侧的事件决定;这里只是把"今年我要开一个新的"这个意图记下来
      { addFlag: { key: 'wants_new_project', delta: 1, min: 0, max: 3 } },
    ],
  },
  {
    id: 'alloc_advisor_work',
    // 挂在导师面板上。**关系越近这件事越理所当然,所以它不会灰掉**——
    // 参考的那款游戏里"端茶倒水"在关系亲近后会灰掉,而我们的关系是一笔会到期的人情账,
    // 不是一条可以刷满的资源条(GAME_DESIGN 4.6 第四条"不借")。
    target: { kind: 'advisor' },
    label: '帮导师干活',
    text: '他的横向、他的基金本子、他学生的数据。跟你的课题没关系。',
    payoff: '1 格 = 资本 +4、状态 −2,师生关系上升。**关系越近这件事越理所当然,所以它不会灰掉**——你替他干的每一件活都记在账上,兑现点在推荐信那一年',
    category: 'work',
    availableWhen: IN_GRAD_SCHOOL,
    maxSlots: 2,
    perSlot: [
      { stats: { capital: 4, state: -2 } },
      { advisorFavor: 6 },
      { addFlag: { key: 'advisor_chores', delta: 1, min: 0, max: 12 } },
    ],
  },
  {
    id: 'alloc_ta',
    label: '教学助理',
    text: '带两个班的实验课,改作业,答疑。有补助,而且你会发现自己挺会讲的。',
    payoff: '1 格 = ¥6,000、资本 +2、状态 −1,教学工作量 +1。教学量在求职那一年才有人问起',
    category: 'work',
    availableWhen: IN_GRAD_SCHOOL,
    maxSlots: 1,
    perSlot: [
      { stats: { money: 6000, capital: 2, state: -1 } },
      { addFlag: { key: 'teaching_load', delta: 1, min: 0, max: 20 } },
    ],
  },
  {
    id: 'alloc_conference',
    label: '投会议、跑会',
    text: '海报或者口头报告。认识人这件事在这一行是有复利的。',
    payoff: '1 格 = 资本 +5、方法 +1、状态 −1,自付一笔会议开销。**认识人是有复利的**,但要好几年才看得见',
    category: 'work',
    availableWhen: IN_GRAD_SCHOOL,
    maxSlots: 1,
    perSlot: [
      { stats: { capital: 5, method: 1, state: -1 } },
      { moneyCost: { rate: 0.08, max: 4000, reason: 'other' } },
      { addFlag: { key: 'conferences', delta: 1, min: 0, max: 10 } },
    ],
  },
  {
    id: 'alloc_side_income',
    label: '接点活挣钱',
    text: '横向、培训、考研网课。用学术时间换现金,汇率还行。',
    payoff: '1 格 = ¥22,000、方法 −1、状态 −1。这一格换的是现金,代价是它没有推进任何一个课题',
    category: 'money',
    availableWhen: IN_GRAD_SCHOOL,
    maxSlots: 2,
    perSlot: [
      { stats: { money: 22000, method: -1, state: -1 } },
      { addFlag: { key: 'side_gigs', delta: 1, min: 0, max: 10 } },
    ],
  },
  {
    id: 'alloc_grad_rest',
    label: '休息',
    text: '睡觉、跑步、见朋友、什么都不干。',
    payoff: '1 格 = 状态 +7、耗竭 −9。**耗竭清零之后课题还是卡在那里,而你的同批已经发了两篇**',
    category: 'rest',
    availableWhen: IN_GRAD_SCHOOL,
    maxSlots: 3,
    // **"休息"必须是一个真实有效的选项。** 它给状态、降耗竭,代价是这一格没有推进任何东西。
    // 游戏不能奖励只会硬撑的玩家——但也不能让休息成为最优解:
    // 耗竭清零之后课题还是卡在那里,而你的同批已经发了两篇。
    perSlot: [
      { stats: { state: 7 } },
      { addFlag: { key: 'burnout', delta: -9, min: 0, max: 100 } },
    ],
  },
];
