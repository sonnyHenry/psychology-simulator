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
const IN_GRAD_SCHOOL: Condition = { all: [{ advisor: {} }, { flag: 'track_academic' }] };

export const gradAllocationItems: AllocationItem[] = [
  {
    id: 'alloc_new_project',
    label: '开一个新课题',
    text: '想法你有,时间你没有。开新的意味着手上的那个今年基本不动。',
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
    label: '帮导师干活',
    text: '他的横向、他的基金本子、他学生的数据。跟你的课题没关系。',
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
