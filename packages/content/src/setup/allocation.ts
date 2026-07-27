import type { AllocationItem } from '@psy-sim/core';
import { allocationIdForCourse } from '@psy-sim/core';

/**
 * 本科四年的可投入项(GAME_DESIGN 第四节 / 8.3)。
 *
 * 本科每年四格。**两门重点课就要占掉两格**,所以"方法 vs 临床"的抢时间是真的在抢:
 * 周五下午去实验室贴电极帽,还是去咨询中心值班——你只有一个周五下午。
 *
 * ## 学年与自然年的对应
 * 大一学年 2014.9–2015.6 记作 **2015**,于是 大二 = 2016 · 大三 = 2017 · 大四 = 2018。
 * 门控直接用自然年(`{ year: {...} }`),和时代事件同一套口径。
 *
 * ## 门槛开放时间的不对称(8.3②,本作最重要的一处倾斜)
 * 实验室 **2016(大二)** 开门,咨询中心 **2017(大三)** 才开门。
 * **所以实验室先开门整整一年。** 后果是很多本来想做咨询的人在大二被拉进了实验室,
 * 然后就再没出来——等咨询中心开门时他们已经在跑第二个实验了。
 *
 * 这不是设计上的不公平,是一个准确的观察。它让"做研究比做咨询更容易发生"在机制层面就成立。
 *
 * > **为什么门控不写 `masteryFlag`:** 课程判定发生在**学年末**,而实验心理学是大二的课。
 * > 要求 `mastered_exp` 等于把实验室推到大三,和咨询中心同时开门——那一年的不对称就被抹平了,
 * > 而不对称正是这条设计的全部内容。所以门控只看年份,能力标签改为影响**回报**而不是**准入**。
 *
 * ## 连续投入才有回报(8.3①)
 * `lab_years` / `counseling_years` 这两个累积量记的是"你在这件事上待了几年"。
 * 投一年就撤,什么都留不下——没有导师、没有人情、没有第一批来访者。这制造真正的承诺压力。
 */

const YEAR_2 = { year: { from: 2016 } } as const;
const YEAR_3 = { year: { from: 2017 } } as const;

/** 课程投入项:id 由 `allocationIdForCourse` 生成,引擎和内容共用同一个函数,两边不会写错 */
function courseItem(
  courseId: string,
  label: string,
  text: string,
  calendarYear: number,
  statKey: 'method' | 'clinical',
): AllocationItem {
  return {
    id: allocationIdForCourse(courseId),
    label,
    text,
    category: 'course',
    courseId,
    // 课只在开课那一年可投。投两格 = 这门课今年是你的主线
    availableWhen: { year: { from: calendarYear, to: calendarYear } },
    maxSlots: 2,
    perSlot: [{ stats: { [statKey]: 1 } }],
  };
}

export const allocationItems: AllocationItem[] = [
  // ── 大一(2015)────────────────────────────────────────────
  courseItem('crs_general', '啃普通心理学', '彭聃龄那本砖头。你以为它讲人心,它讲神经元和记忆的三级模型。', 2015, 'method'),
  courseItem('crs_calculus', '啃高等数学', '理学院的心理学生要上高数。你室友是教育学院的,他不用。', 2015, 'method'),
  courseItem('crs_anatomy', '啃系统解剖学', '和临床医学生一起上,一起被虐。他们至少知道自己以后要干什么。', 2015, 'clinical'),

  // ── 大二(2016):两座大山 ─────────────────────────────────
  courseItem('crs_stats', '啃心理统计学', '张厚粲。这门课决定你后面十年听不听得懂别人在说什么。', 2016, 'method'),
  courseItem('crs_exp', '啃实验心理学', '郭秀艳。自变量、因变量、混淆变量——以及为什么你的设计一定有问题。', 2016, 'method'),

  // ── 大三(2017):承诺 ────────────────────────────────────
  courseItem('crs_abnormal', '啃变态心理学', '所有本科生最期待的一门课。然后你发现它是背 DSM。', 2017, 'clinical'),
  courseItem('crs_interview', '练会谈技术', '角色扮演加录像回看。你会在录像里看见一个你不认识的自己。', 2017, 'clinical'),
  courseItem('crs_adv_stats', '啃高级统计', '中介、调节、多层模型。上过统计的人才配得上在这里痛苦。', 2017, 'method'),

  // ── 两个去处:门槛开放时间不对称 ─────────────────────────
  {
    id: 'alloc_lab',
    label: '进实验室搬砖',
    text: '一周两个下午,贴电极帽、念指导语、导出数据。没有钱。**大二就能进。**',
    category: 'lab',
    availableWhen: YEAR_2,
    maxSlots: 2,
    perSlot: [
      { stats: { method: 3, capital: 2, state: -1 } },
      { addFlag: { key: 'lab_years', delta: 1, min: 0, max: 8 } },
      { setFlag: 'entered_lab' },
    ],
  },
  {
    id: 'alloc_counseling',
    label: '咨询中心值班',
    text: '登记、倒水、告诉来访者往哪边走,后来能坐在旁边听。**大三才开门。**',
    category: 'counseling',
    // 大三开门 + 得先有点临床底子。比实验室晚整整一年——这一年就是那个不对称。
    availableWhen: { all: [YEAR_3, { stat: 'clinical', op: '>=', value: 18 }] },
    maxSlots: 2,
    perSlot: [
      { stats: { clinical: 4, state: 1 } },
      { addFlag: { key: 'counseling_years', delta: 1, min: 0, max: 8 } },
      { setFlag: 'entered_counseling_center' },
    ],
  },

  // ── 其余四项 ─────────────────────────────────────────────
  {
    id: 'alloc_student_work',
    label: '学生工作',
    text: '班委、学生会、心理健康协会。开会很多,但你认识了所有老师。',
    category: 'work',
    maxSlots: 2,
    perSlot: [
      { stats: { capital: 4, state: -1 } },
      { addFlag: { key: 'student_work_years', delta: 1, min: 0, max: 4 } },
    ],
  },
  {
    id: 'alloc_exam_prep',
    label: '备考',
    text: '考研 312 还是 347,或者背托福。这件事从大三开始就没法再拖了。',
    category: 'exam_prep',
    availableWhen: YEAR_3,
    maxSlots: 3,
    perSlot: [
      { stats: { method: 2, state: -2 } },
      { addFlag: { key: 'exam_prep', delta: 1, min: 0, max: 6 } },
    ],
  },
  {
    id: 'alloc_part_time',
    label: '兼职挣钱',
    text: '家教、发单、做被试。一小时的钱和一小时的实验室时间,你只能选一个。',
    category: 'money',
    maxSlots: 2,
    perSlot: [{ stats: { money: 4000, state: -1 } }],
  },
  {
    id: 'alloc_rest',
    label: '休息',
    text: '睡觉、打球、看剧、什么都不干。',
    category: 'rest',
    maxSlots: 4,
    // "休息"必须是一个真实有效的选项:游戏不能奖励只会硬撑的玩家。
    // 但它也不能是最优解——它给状态、降耗竭,代价是这一格没有推进任何东西。
    perSlot: [
      { stats: { state: 5 } },
      { addFlag: { key: 'burnout', delta: -6, min: 0, max: 100 } },
    ],
  },
];
