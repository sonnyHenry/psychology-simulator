import type { Course } from '@psy-sim/core';
import { RETAKE_FLAG } from '@psy-sim/core';

/**
 * 本科课程表(GAME_DESIGN 8.2)。真实教材,按学院分流。
 *
 * **课程不加属性,课程决定你后面听不听得懂。** 三档判定的产出是能力标签:
 * 心理统计只是"过了"的角色,在后面所有涉及中介分析、混合线性模型、贝叶斯因子的事件里,
 * 只能选「点头,假装听懂了」。而 `mastered_stats` 会在十年后的某个审稿事件里救你一命。
 *
 * 属性变化只给一点点——它必须存在(validate 要求 outcome 有可见数值变化),
 * 但它不是这个系统的重点。
 */

/** 挂科的统一代价:下一年被重修占掉一格精力 */
const retakeCost = { addFlag: { key: RETAKE_FLAG, delta: 1, min: 0, max: 3 } } as const;

export const courses: Course[] = [
  // ── 大一:幻灭 ────────────────────────────────────────────
  {
    id: 'crs_general',
    label: '普通心理学',
    textbook: '彭聃龄《普通心理学》',
    year: 1,
    statKey: 'method',
    outcomes: {
      mastered: [{ stats: { method: 3, clinical: 2 } }],
      passed: [{ stats: { method: 1 } }],
      failed: [{ stats: { method: 1, state: -3 } }, retakeCost],
    },
  },
  {
    id: 'crs_history',
    label: '心理学史',
    textbook: '叶浩生《心理学史》',
    year: 1,
    statKey: 'method',
    outcomes: {
      mastered: [{ stats: { method: 2, capital: 1 } }],
      passed: [{ stats: { method: 1 } }],
      failed: [{ stats: { state: -2 } }, retakeCost],
    },
  },
  {
    id: 'crs_calculus',
    label: '高等数学',
    textbook: '同济版《高等数学》',
    year: 1,
    // 只有理学院要上高数。这一门是理学院方法起点更高的一部分原因,也是他们大一最痛的一门。
    availableWhen: { flag: 'college', equals: 'science' },
    statKey: 'method',
    masteryFlag: 'mastered_calculus',
    outcomes: {
      mastered: [{ stats: { method: 5 } }],
      passed: [{ stats: { method: 2, state: -2 } }],
      failed: [{ stats: { method: 1, state: -5 } }, retakeCost],
    },
  },
  {
    id: 'crs_anatomy',
    label: '系统解剖学',
    textbook: '柏树令《系统解剖学》',
    year: 1,
    // 医学院的心理学生和临床医学生一起上这门课,一起被虐
    availableWhen: { flag: 'college', equals: 'medical' },
    statKey: 'clinical',
    masteryFlag: 'mastered_anatomy',
    outcomes: {
      mastered: [{ stats: { clinical: 4, method: 1 } }],
      passed: [{ stats: { clinical: 2, state: -3 } }],
      failed: [{ stats: { clinical: 1, state: -5 } }, retakeCost],
    },
  },
  {
    id: 'crs_physio',
    label: '人体解剖生理学',
    textbook: '沈政《生理心理学》配套',
    year: 1,
    availableWhen: { not: { flag: 'college', equals: 'medical' } },
    statKey: 'clinical',
    outcomes: {
      mastered: [{ stats: { clinical: 3, method: 1 } }],
      passed: [{ stats: { clinical: 1 } }],
      failed: [{ stats: { state: -3 } }, retakeCost],
    },
  },

  // ── 大二:两座大山 ────────────────────────────────────────
  {
    id: 'crs_stats',
    label: '心理统计学',
    textbook: '张厚粲《现代心理与教育统计学》',
    year: 2,
    statKey: 'method',
    masteryFlag: 'mastered_stats',
    // 两座大山之一。期末小测那道题是心理学人的身份标记(validate 规则 30 只允许这两门有小测)
    finalExam: { questionIds: ['cq_stats_pvalue'] },
    outcomes: {
      mastered: [{ stats: { method: 6 } }],
      passed: [{ stats: { method: 2 } }],
      failed: [{ stats: { method: 1, state: -6 } }, retakeCost],
    },
  },
  {
    id: 'crs_exp',
    label: '实验心理学',
    textbook: '郭秀艳《实验心理学》',
    year: 2,
    statKey: 'method',
    masteryFlag: 'mastered_exp',
    // 两道题随机抽一道:同一门课在不同局里考的不一样,这是最便宜的一处跨局差异
    finalExam: { questionIds: ['cq_exp_confound', 'cq_exp_counterbalance'] },
    outcomes: {
      mastered: [{ stats: { method: 5, capital: 1 } }],
      passed: [{ stats: { method: 2 } }],
      failed: [{ stats: { method: 1, state: -5 } }, retakeCost],
    },
  },
  {
    id: 'crs_measurement',
    label: '心理测量学',
    textbook: '戴海崎《心理与教育测量》',
    year: 2,
    statKey: 'method',
    masteryFlag: 'mastered_measurement',
    outcomes: {
      mastered: [{ stats: { method: 3, clinical: 2 } }],
      passed: [{ stats: { method: 1 } }],
      failed: [{ stats: { state: -3 } }, retakeCost],
    },
  },
  {
    id: 'crs_development',
    label: '发展心理学',
    textbook: '林崇德《发展心理学》',
    year: 2,
    statKey: 'clinical',
    outcomes: {
      mastered: [{ stats: { clinical: 4 } }],
      passed: [{ stats: { clinical: 1 } }],
      failed: [{ stats: { state: -2 } }, retakeCost],
    },
  },
  {
    id: 'crs_social',
    label: '社会心理学',
    textbook: '侯玉波《社会心理学》',
    year: 2,
    statKey: 'method',
    outcomes: {
      mastered: [{ stats: { method: 2, capital: 2 } }],
      passed: [{ stats: { method: 1 } }],
      failed: [{ stats: { state: -2 } }, retakeCost],
    },
  },

  // ── 大三:承诺 ────────────────────────────────────────────
  {
    id: 'crs_abnormal',
    label: '变态心理学',
    textbook: '钱铭怡《变态心理学》',
    year: 3,
    statKey: 'clinical',
    masteryFlag: 'mastered_abnormal',
    outcomes: {
      mastered: [{ stats: { clinical: 6 } }],
      passed: [{ stats: { clinical: 2 } }],
      failed: [{ stats: { clinical: 1, state: -4 } }, retakeCost],
    },
  },
  {
    id: 'crs_interview',
    label: '会谈技术',
    textbook: '角色扮演 + 录像回看',
    year: 3,
    statKey: 'clinical',
    masteryFlag: 'mastered_interview',
    outcomes: {
      mastered: [{ stats: { clinical: 5, state: 2 } }],
      passed: [{ stats: { clinical: 2 } }],
      failed: [{ stats: { clinical: 1, state: -3 } }, retakeCost],
    },
  },
  {
    id: 'crs_clinical',
    label: '临床与咨询心理学',
    textbook: '钱铭怡《心理咨询与心理治疗》',
    year: 3,
    statKey: 'clinical',
    outcomes: {
      mastered: [{ stats: { clinical: 4, method: 1 } }],
      passed: [{ stats: { clinical: 2 } }],
      failed: [{ stats: { state: -3 } }, retakeCost],
    },
  },
  {
    id: 'crs_personality',
    label: '人格心理学',
    textbook: '许燕《人格心理学》',
    year: 3,
    statKey: 'clinical',
    outcomes: {
      mastered: [{ stats: { clinical: 3, method: 1 } }],
      passed: [{ stats: { clinical: 1 } }],
      failed: [{ stats: { state: -2 } }, retakeCost],
    },
  },
  {
    id: 'crs_adv_stats',
    label: '高级统计',
    textbook: '温忠麟《中介效应》系列文献',
    year: 3,
    // 上过统计才配得上上高级统计。没学通的人在这门课上只会更迷茫。
    availableWhen: { flag: 'mastered_stats' },
    statKey: 'method',
    masteryFlag: 'mastered_adv_stats',
    outcomes: {
      mastered: [{ stats: { method: 6, capital: 1 } }],
      passed: [{ stats: { method: 2 } }],
      failed: [{ stats: { method: 1, state: -3 } }, retakeCost],
    },
  },
];
