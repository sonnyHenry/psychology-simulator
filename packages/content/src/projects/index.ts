import type { ProjectTemplate } from '@psy-sim/core';

/**
 * 课题模板。

 * ## 为什么是六站而不是九站
 *
 * 设计文档的管线图有九站(想法→文献→伦理→收数据→分析→写作→投稿→审稿→发表)。
 * 落地时合成了六站:**伦理/预注册并进"文献",投稿并进"写作"**。
 *
 * 理由是时间预算。阶段事件按"回合开始时课题卡在哪一站"挑,所以每年推进的站数必须**有方差**
 * (定值会让一半的站永远不出现);而有方差就意味着每年只走一两站。
 * 九站 × 每年一两站 = 六到八年一篇,而硕博一共只有五六年。
 *
 * 合掉的两站没有丢内容:`ev_ps_ethics_revisions`(伦理返修 + 预注册)挂在文献站,
 * `ev_ps_submit_aim`(冲一冲还是稳一稳)挂在写作站。
 */
/**
 * 课题模板。
 *
 * ## M2.5:毕业论文 = 课题管线的教学关(GAME_DESIGN 8.6 / TECH 4.7.6)
 *
 * **不新增机制**——毕业论文就是一个 `Project`,只是打了 `isThesis` 且阶段序列裁短:
 *
 * ```
 * 想法 → 收数据 → 分析 → 写作 → 答辩
 * ```
 *
 * 跳过伦理/预注册和投稿两站(本科论文确实不走这两步)。`quality` 不影响后续,
 * 但 **`integrityRisk` 正常累积并结转**——8.6 那个 `p = .08` 就是诚信线的第一笔账。
 *
 * 这样做的好处:玩家在大四已经完整走过一遍管线的操作流程,
 * 研一开第一个真课题时不需要再教一次。
 *
 * 真课题的完整九阶段模板归 M3。**阶段序列写在模板里而不是引擎里**,
 * 所以那时候只是多一个模板,推进代码一行都不用改。
 */
export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'tpl_thesis',
    // 标题候选:本科毕业论文的真实选题气质——范围偏窄、变量偏现成、样本是大学生
    titles: [
      '大学生手机成瘾与睡眠质量的关系',
      '自尊在社会支持与主观幸福感间的中介作用',
      '情绪调节策略对考试焦虑的影响',
      '不同专业大学生的时间管理倾向差异',
      '正念水平与拖延行为的相关研究',
      '亲子依恋对大学生人际信任的影响',
    ],
    domain: 'general',
    // 裁短版:跳过 ethics / lit 的独立阶段和 submit。`review` 阶段复用成"答辩"。
    stageSequence: ['ideation', 'collect', 'analyze', 'write', 'review'],
    isThesis: true,
  },
  // ── M3:真课题的完整九阶段 ────────────────────────────────
  //
  // `stageChance` 是"哪一站最容易卡住"的唯一来源。**收数据和审稿是两个真正的坎**,
  // 而它们难的原因完全不同:一个是你招不到人,一个是你等了十一个月然后被拒。
  //
  // 三个模板对应三种研究气质,`stageChance` 各有偏斜——
  // 行为实验难在收数据,神经影像难在收数据和分析,问卷难在审稿(因为它太好做了,所以门槛在后面)。
  {
    id: 'tpl_behavioral',
    label: '行为实验',
    titles: [
      '认知重评与表达抑制的情绪调节效率差异',
      '工作记忆负荷对注意瞬脱的影响',
      '社会排斥后的疼痛敏感性变化',
      '自我参照加工的记忆增强效应',
      '睡眠剥夺对冲动决策的影响',
      '内疚与羞耻在亲社会行为中的分离作用',
    ],
    domain: 'cognition',
    stageSequence: ['ideation', 'lit', 'collect', 'analyze', 'write', 'review'],
    stageChance: {
      ideation: 0.71,
      lit: 0.81,
      collect: 0.51,
      analyze: 0.64,
      write: 0.67,
      review: 0.49,
    },
  },
  {
    id: 'tpl_neuro',
    label: '神经影像',
    titles: [
      '情绪调节的神经机制:一项 fMRI 研究',
      '错误相关负波与自我监控的关系',
      '静息态功能连接与特质焦虑',
      '奖赏预期误差的时间进程:ERP 证据',
    ],
    domain: 'cogneuro',
    stageSequence: ['ideation', 'lit', 'collect', 'analyze', 'write', 'review'],
    // 机时贵、被试难约、预处理管线一改结果就变。**它是最容易做废的一类课题。**
    stageChance: {
      ideation: 0.69,
      lit: 0.79,
      collect: 0.43,
      analyze: 0.53,
      write: 0.64,
      review: 0.47,
    },
  },
  {
    id: 'tpl_survey',
    label: '问卷研究',
    titles: [
      '知觉压力与抑郁症状:自尊的中介作用',
      '父母教养方式与大学生人际信任',
      '正念特质对职业倦怠的调节效应',
      '社会支持、应对方式与主观幸福感的关系',
      '手机依赖与睡眠质量的纵向追踪',
    ],
    domain: 'social',
    stageSequence: ['ideation', 'lit', 'collect', 'analyze', 'write', 'review'],
    // 前面几站都很顺——**问题全在后面**:这类研究最容易被审稿人问"所以呢"。
    stageChance: {
      ideation: 0.81,
      lit: 0.87,
      collect: 0.69,
      analyze: 0.75,
      write: 0.75,
      review: 0.39,
    },
  },
];
