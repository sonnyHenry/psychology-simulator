import type { ExamQuestion } from '@psy-sim/core';

/**
 * 两座大山的期末小测题库(GAME_DESIGN 8.2)。
 *
 * **只有心理统计和实验心理学有小测**(validate 规则 30 强制)。
 * 把仪式感留给全学科挂科率最高、也最构成分水岭的这两门课,不拖节奏——
 * 每门课都考一道会把本科变成半个答题游戏。
 *
 * 答错不惩罚:你照样能"过",只是拿不到那 +0.15,并且记一个 flag,
 * 两年后在某个组会事件里让你尴尬一次。
 */
export const courseExamBank: ExamQuestion[] = [
  {
    id: 'cq_stats_pvalue',
    track: 'both',
    subject: '心理统计学',
    // 这道题在真实世界里的错误率高得惊人,而正确回答它几乎是心理学人的身份标记
    text: 'p = .04 的正确解读是?',
    options: [
      '有 96% 的概率结论是对的',
      '假设零假设为真,得到当前或更极端结果的概率是 4%',
      '这个效应有 4% 的可能性是偶然的',
      '你有 4% 的概率犯了第一类错误',
    ],
    answerIndex: 1,
    difficulty: 4,
  },
  {
    id: 'cq_exp_confound',
    track: 'both',
    subject: '实验心理学',
    text: '一个记忆实验里,实验组在上午测、控制组在下午测。这属于',
    options: [
      '被试内设计的顺序效应',
      '测量误差,增大样本量即可解决',
      '混淆变量——时间与组别共变,效应无法归因',
      '天花板效应',
    ],
    answerIndex: 2,
    difficulty: 3,
  },
  {
    id: 'cq_exp_counterbalance',
    track: 'both',
    subject: '实验心理学',
    text: '被试内设计中采用拉丁方平衡条件顺序,主要为了控制',
    options: [
      '练习效应与疲劳效应',
      '个体差异带来的误差方差',
      '实验者期望效应',
      '选择性流失',
    ],
    answerIndex: 0,
    difficulty: 3,
  },
];
