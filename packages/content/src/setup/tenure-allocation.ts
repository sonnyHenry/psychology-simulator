import type { AllocationItem, Condition } from '@psy-sim/core';

/**
 * 预聘期的可投入项(M5,GAME_DESIGN 十节)。**每年两格。**
 *
 * 本科四格 → 硕博三格 → 博后三格 → 预聘期**两格**。这个递减本身就是一句评论,
 * 而它在这一段最狠:你要同时应付论文、基金、教学、学生和院里的事,而手上只有两格。
 *
 * ## 这五项直接对着首考清单
 *
 * 十节那张清单上有几行(论文 / 基金 / 教学 / 学生 / 其他),这里就有几项。
 * **不是巧合**:首考是一张清单,而清单上的每一行都得有一个地方能挣。
 * 缺一项的话那一行永远是"没有",于是它从判定项退化成一句嘲讽。
 */

const IN_TENURE: Condition = { flag: 'took_faculty_job' };

export const tenureAllocationItems: AllocationItem[] = [
  {
    id: 'alloc_write_grant',
    label: '写本子',
    text: '国自然青年。三月截止,前后要占掉你两个月。',
    payoff: '1 格 = 一次申请机会。**基金是首考的硬指标,没有直接不过**——而它一年只有一次',
    category: 'work',
    availableWhen: IN_TENURE,
    // 一回合两年,所以最多写两次。**第二版本子和第一版几乎是两个东西**
    maxSlots: 2,
    perSlot: [
      { stats: { method: 1, state: -3 } },
      { addFlag: { key: 'grant_attempts', delta: 1, min: 0, max: 8 } },
    ],
  },
  {
    id: 'alloc_teach',
    label: '上课',
    text: '两门新课,备课比上课花的时间多三倍。',
    payoff: '1 格 = 教学工作量 +3。**首考要看的**,而且你会发现自己挺会讲的',
    category: 'work',
    availableWhen: IN_TENURE,
    maxSlots: 2,
    perSlot: [
      { stats: { capital: 2, state: -2 } },
      { addFlag: { key: 'teaching_load', delta: 3, min: 0, max: 30 } },
    ],
  },
  {
    id: 'alloc_supervise_students',
    label: '带学生',
    text: '你现在是那个要说"再想想"的人了。',
    payoff: '1 格 = 学生进度 +1,攒够就有人毕业。**带出来的人是首考清单上的一行**,也是你以后真正留下的东西',
    category: 'work',
    availableWhen: IN_TENURE,
    maxSlots: 2,
    perSlot: [
      { stats: { capital: 2, method: 1, state: -1 } },
      { addFlag: { key: 'student_progress', delta: 1, min: 0, max: 20 } },
    ],
  },
  {
    id: 'alloc_service',
    label: '院里的事',
    text: '教学秘书、实验室安全、迎新、评估材料。没有一件跟你的研究有关。',
    payoff: '1 格 = 资本 +3、院里的事 +1。**它不在硬指标里,但没有人做过这些的人在首考会上没人替他说话**',
    category: 'work',
    availableWhen: IN_TENURE,
    maxSlots: 1,
    perSlot: [
      { stats: { capital: 3, state: -2 } },
      { addFlag: { key: 'service_load', delta: 1, min: 0, max: 10 } },
    ],
  },
  {
    id: 'alloc_tenure_rest',
    label: '休息',
    text: '把周末还给自己。你已经六年没有这么做过了。',
    payoff: '1 格 = 状态 +8、耗竭 −10。**两格里花掉一格休息,意味着这两年你只推得动一件事**',
    category: 'rest',
    availableWhen: IN_TENURE,
    maxSlots: 2,
    perSlot: [
      { stats: { state: 8 } },
      { addFlag: { key: 'burnout', delta: -10, min: 0, max: 100 } },
    ],
  },
];
