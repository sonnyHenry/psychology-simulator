import type { DevJumpTarget } from '@psy-sim/core';

/**
 * 一键跳转的目标表(测试工具)。快进器在 core(`devJump`),这里只放数据:
 * 停在哪个阶段、路上的岔口怎么选、精力往哪儿投。
 *
 * ## 加一个目标的方法
 *
 * 抄一条改 `targetPhaseId` 和岔口偏好即可。**加完跑一遍 `pnpm test`**——
 * tools 的 verify-jumps 会证明每个目标真的到得了;到不了(门控和偏好对不上)当场红。
 *
 * ## 分配偏好的写法
 *
 * token 匹配 精确 id / category / id 前缀,按顺序**轮转**填格。
 * 本科的组合是为了把岔口门控都攒出来:实验室年数(直博/海外)、备考(读硕/海外)、
 * 咨询中心年数(临床)。哪条线的目标就把哪条的 token 排在前面。
 */

/** 本科阶段的通用攒法:课程 + 实验室 + 备考轮转(学术向) */
const UNDERGRAD_ACADEMIC = ['alloc_lab', 'course', 'alloc_exam_prep'];
/** 本科阶段的临床向攒法:咨询中心优先(2017 才开门,前两年落到课程上) */
const UNDERGRAD_CLINICAL = ['alloc_counseling', 'course', 'alloc_lab'];
/** 研究生阶段:推课题为主(`alloc_project_` 前缀匹配所有动态课题项) */
const GRAD_ACADEMIC = ['alloc_project_', 'alloc_advisor_work', 'alloc_conference'];
/** 临床阶段:接个案 + 督导 + 个人体验——注册系统的小时数就是这么攒的 */
const CLINICAL_PRACTICE = ['alloc_casework', 'alloc_supervision', 'alloc_personal_therapy'];

export const devJumpTargets: DevJumpTarget[] = [
  {
    id: 'jump_crossroad_2018',
    label: '大四三岔口(2018)',
    targetPhaseId: 'crossroad_2018',
    collegePref: 'science',
    // 兼顾几条线的门控:实验室(直博/海外)、备考(读硕/海外)、咨询中心(临床)。
    // 注意考编线(教师资格证)要师范归属,这个通用跳转顾不上——要测考编,手玩或加专属目标。
    allocationPrefs: ['alloc_lab', 'alloc_counseling', 'course', 'alloc_exam_prep'],
  },
  {
    id: 'jump_master',
    label: '研一入学(2019)',
    targetPhaseId: 'master',
    collegePref: 'science',
    lifeGoalId: 'goal_academic',
    crossroadPrefs: { crossroad_2018: ['path_master'] },
    allocationPrefs: UNDERGRAD_ACADEMIC,
  },
  {
    id: 'jump_master_grad',
    label: '硕士岔口(2021,硕士毕业)',
    targetPhaseId: 'crossroad_2021',
    collegePref: 'science',
    lifeGoalId: 'goal_academic',
    crossroadPrefs: { crossroad_2018: ['path_master'] },
    allocationPrefs: [...GRAD_ACADEMIC, ...UNDERGRAD_ACADEMIC],
  },
  {
    id: 'jump_phd',
    label: '博一入学(2022,硕转博)',
    targetPhaseId: 'phd_after_master',
    collegePref: 'science',
    lifeGoalId: 'goal_academic',
    // 读博的门控是"有一篇文章"(或资本+方法),默认策略不保证每个种子都攒得出——由重试兜底
    crossroadPrefs: { crossroad_2018: ['path_master'], crossroad_2021: ['m_continue_phd'] },
    allocationPrefs: [...GRAD_ACADEMIC, ...UNDERGRAD_ACADEMIC],
  },
  {
    id: 'jump_phd_direct',
    label: '直博一年级(2019)',
    targetPhaseId: 'phd_direct',
    collegePref: 'science',
    lifeGoalId: 'goal_academic',
    crossroadPrefs: { crossroad_2018: ['path_phd_direct'] },
    allocationPrefs: UNDERGRAD_ACADEMIC,
  },
  {
    id: 'jump_phd_ending',
    label: '博士毕业(直接看结局)',
    collegePref: 'science',
    lifeGoalId: 'goal_academic',
    crossroadPrefs: { crossroad_2018: ['path_master'], crossroad_2021: ['m_continue_phd'] },
    allocationPrefs: [...GRAD_ACADEMIC, ...UNDERGRAD_ACADEMIC],
  },
  {
    id: 'jump_clinical_grad',
    label: '专硕研一(2019,临床线)',
    targetPhaseId: 'clinical',
    collegePref: 'education',
    lifeGoalId: 'goal_help_people',
    crossroadPrefs: { crossroad_2018: ['path_clinical'] },
    allocationPrefs: UNDERGRAD_CLINICAL,
  },
  {
    id: 'jump_clinical_practice',
    label: '临床执业(2022)',
    targetPhaseId: 'clinical_practice',
    collegePref: 'education',
    lifeGoalId: 'goal_help_people',
    crossroadPrefs: { crossroad_2018: ['path_clinical'] },
    allocationPrefs: [...CLINICAL_PRACTICE, ...UNDERGRAD_CLINICAL],
  },
  {
    id: 'jump_clinical_late',
    label: '执业成熟期(2027)',
    targetPhaseId: 'clinical_late',
    collegePref: 'education',
    lifeGoalId: 'goal_help_people',
    crossroadPrefs: { crossroad_2018: ['path_clinical'] },
    allocationPrefs: [...CLINICAL_PRACTICE, ...UNDERGRAD_CLINICAL],
  },
  {
    id: 'jump_clinical_ending',
    label: '临床结局(2033)',
    collegePref: 'education',
    lifeGoalId: 'goal_help_people',
    crossroadPrefs: { crossroad_2018: ['path_clinical'] },
    allocationPrefs: [...CLINICAL_PRACTICE, ...UNDERGRAD_CLINICAL],
  },
];
