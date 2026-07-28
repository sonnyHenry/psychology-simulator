import type { AllocationItem, Condition } from '@psy-sim/core';

/**
 * 临床线的可投入项(GAME_DESIGN 第四、六节)。
 *
 * ## 三个 id 是引擎约定,不能改
 *
 * `alloc_casework` / `alloc_supervision` / `alloc_personal_therapy` 被
 * `systems/case.ts` 按 id 读取(接个案的格数决定开案容量与会谈频率、
 * 督导格数压脱落率并累积督导小时)。改名等于把机制掐断,而且不报错。
 *
 * ## 门控
 *
 * `track_clinical` 由两个入口设置(大四岔口走专硕 / 硕士岔口转临床),
 * 而临床玩家此后只会经过临床阶段——所以不需要 `to` 上界:
 * 这些项不可能漏进别的阶段的分配屏(M3.1 那条"只写 from 会一路漏下去"的规矩,
 * 在这里靠路径互斥成立,不靠年份)。
 */

const IN_CLINICAL: Condition = { flag: 'track_clinical' };

export const clinicalAllocationItems: AllocationItem[] = [
  {
    id: 'alloc_casework',
    // 挂在个案页签的面板上(没有 id = 挂在该类目的面板上,不是某一个来访者)
    target: { kind: 'case' },
    label: '接个案',
    payoff: '1 格 = 临床 +2、状态 −1,能同时撑起 2 个个案,会谈频率也上一档。**接得越多,注册小时数涨得越快,你被掏空得也越快**',
    text: '每周固定留给来访者的那些小时。接得越多,小时数涨得越快,你被掏空得也越快。',
    category: 'counseling',
    availableWhen: IN_CLINICAL,
    maxSlots: 2,
    perSlot: [
      { stats: { clinical: 2, state: -1 } },
      { addFlag: { key: 'casework_years', delta: 1, min: 0, max: 30 } },
    ],
  },
  {
    id: 'alloc_supervision',
    // 挂在个案页签的面板上(没有 id = 挂在该类目的面板上,不是某一个来访者)
    target: { kind: 'case' },
    label: '参加督导',
    payoff: '1 格 = 临床 +2、状态 +1,督导小时 +20,自付督导费。它压低每个个案的脱落率,也是注册系统那条长路上绕不开的一格',
    text: '一小时几百块,讲你最没底的那个个案。**低督导比高个案量更危险**,这句话是真的。',
    category: 'counseling',
    availableWhen: IN_CLINICAL,
    maxSlots: 1,
    perSlot: [
      { stats: { clinical: 2, state: 1 } },
      { moneyCost: { rate: 0.06, max: 9000, reason: 'other' } },
    ],
  },
  {
    id: 'alloc_personal_therapy',
    // 挂在个案页签的面板上(没有 id = 挂在该类目的面板上,不是某一个来访者)
    target: { kind: 'case' },
    label: '个人体验',
    payoff: '1 格 = 状态 +6、耗竭 −6、自我觉察 +1,一年几千到三万。**这是这一行少数明确正向的长期投入**',
    text: '你自己坐到来访者的位置上。一周一次,一小时六百到一千二,做上几年。这是这一行少数明确正向的长期投入。',
    category: 'counseling',
    availableWhen: IN_CLINICAL,
    maxSlots: 1,
    perSlot: [
      { stats: { state: 6 } },
      { moneyCost: { rate: 0.12, min: 4000, max: 30000, reason: 'other' } },
      { addFlag: { key: 'self_insight', delta: 1, min: 0, max: 12 } },
      { addFlag: { key: 'burnout', delta: -6, min: 0, max: 100 } },
    ],
  },
  {
    id: 'alloc_clinical_training',
    label: '进修与工作坊',
    payoff: '1 格 = 临床 +3,自付培训费。证书会攒一抽屉,派上用场的是其中那几个瞬间',
    text: 'CBT 连续培训、家庭治疗中级班、创伤主题工作坊。证书会攒一抽屉,有用的是那几个瞬间。',
    category: 'work',
    availableWhen: IN_CLINICAL,
    maxSlots: 1,
    perSlot: [
      { stats: { clinical: 3 } },
      { moneyCost: { rate: 0.08, max: 12000, reason: 'other' } },
      { addFlag: { key: 'cpd_years', delta: 1, min: 0, max: 20 } },
    ],
  },
  {
    id: 'alloc_clinical_gigs',
    label: '讲课、测评、EAP',
    payoff: '1 格 = ¥16,000、状态 −1。比个案挣钱,也比个案浅——它不涨注册小时数',
    text: '给企业讲情绪管理,给学校做筛查,接 EAP 的转介单。比个案挣钱,也比个案浅。',
    category: 'money',
    availableWhen: IN_CLINICAL,
    maxSlots: 2,
    perSlot: [
      { stats: { money: 16000, state: -1 } },
      { addFlag: { key: 'training_gigs', delta: 1, min: 0, max: 20 } },
    ],
  },
  {
    id: 'alloc_clinical_rest',
    label: '休息',
    payoff: '1 格 = 状态 +7、耗竭 −9。不接新案的那一年,手上的个案也更容易停下来',
    text: '不加新个案,推掉两个讲座,去过一点自己的生活。你劝来访者做的那些事。',
    category: 'rest',
    availableWhen: IN_CLINICAL,
    maxSlots: 3,
    perSlot: [
      { stats: { state: 7 } },
      { addFlag: { key: 'burnout', delta: -9, min: 0, max: 100 } },
    ],
  },
];
