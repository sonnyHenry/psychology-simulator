import type { ExamQuestion } from '@psy-sim/core';

/**
 * 高考答题(GAME_DESIGN 2.4):6 道 2014 年风格题,答对率映射分数段。
 * 分数决定 `stats.method` 的起点和能报哪一档院校,所以这一屏不是装饰。
 *
 * 每个 track 可用题数必须 ≥ `meta.examQuestionCount`(validate 会查),
 * 现在是 4 道通用 + 2 理 + 2 文 = 每个方向 6 道。
 */
export const examBank: ExamQuestion[] = [
  {
    id: 'q_math_seq',
    track: 'both',
    subject: '数学',
    text: '等差数列 {aₙ} 中,a₂ = 3,a₆ = 11,则 a₁₀ =',
    options: ['15', '17', '19', '21'],
    answerIndex: 2,
    difficulty: 3,
  },
  {
    id: 'q_math_prob',
    track: 'both',
    subject: '数学',
    text: '从 5 个球(3 红 2 白)中不放回地取 2 个,两个都是红球的概率是',
    options: ['3/10', '2/5', '3/5', '9/25'],
    answerIndex: 0,
    difficulty: 3,
  },
  {
    id: 'q_chinese_idiom',
    track: 'both',
    subject: '语文',
    text: '下列各句中,加点成语使用恰当的一项是',
    options: [
      '他做事一丝不苟,常常首当其冲地接下最难的任务。',
      '这份报告数据翔实,论证严密,可谓无微不至。',
      '两人观点截然不同,争论了一整晚也未能达成一致,最后不了了之。',
      '面对突如其来的变故,他显得差强人意,一句话也说不出。',
    ],
    answerIndex: 2,
    difficulty: 2,
  },
  {
    id: 'q_english_cloze',
    track: 'both',
    subject: '英语',
    text: 'Hardly ______ the room when the phone rang.',
    options: ['he had entered', 'had he entered', 'he entered', 'did he enter'],
    answerIndex: 1,
    difficulty: 2,
  },
  {
    id: 'q_physics_field',
    track: '理',
    subject: '物理',
    text: '匀强电场中,沿电场线方向移动正电荷,电势能与电势的变化分别是',
    options: ['都减小', '都增大', '电势能减小、电势增大', '电势能增大、电势减小'],
    answerIndex: 0,
    difficulty: 4,
  },
  {
    id: 'q_bio_neuron',
    track: '理',
    subject: '生物',
    text: '关于神经冲动在神经纤维上的传导,下列说法正确的是',
    options: [
      '以局部电流的形式双向传导',
      '依靠神经递质在轴突内扩散',
      '传导速度与刺激强度成正比',
      '静息电位由 Na⁺ 内流维持',
    ],
    answerIndex: 0,
    difficulty: 4,
  },
  {
    id: 'q_history_reform',
    track: '文',
    subject: '历史',
    text: '1978 年十一届三中全会作出的历史性决策是',
    options: ['提出社会主义初级阶段理论', '把工作重点转移到经济建设上来', '确立市场经济体制目标', '恢复高等学校统一招生'],
    answerIndex: 1,
    difficulty: 3,
  },
  {
    id: 'q_politics_contradiction',
    track: '文',
    subject: '政治',
    text: '"抓主要矛盾"这一方法论的哲学依据是',
    options: ['矛盾具有普遍性', '矛盾双方相互依存', '矛盾发展的不平衡性', '矛盾双方相互转化'],
    answerIndex: 2,
    difficulty: 3,
  },
];
