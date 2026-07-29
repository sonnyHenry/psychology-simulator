import type { GameEvent } from '@psy-sim/core';

/**
 * 诚信线的后半段。重复失败 → 原始数据请求 → 多年后重读。
 *
 * 这条线刻意把“结果没有重复出来”和“论文被撤回”拆开：前者可能发生在低风险论文上，
 * 后者只藏在高风险 + 无法交付记录 + 极低权重的组合里。
 */
export const integrityEvents: GameEvent[] = [
  {
    id: 'ev_ac_first_public_record',
    pools: ['grad'],
    title: '第一份公开记录',
    text: '你手上的几个课题都还没走到“论文”。其中一个结果不显著，完整故事撑不起一篇期刊文章，但设计、材料和零结果本身可以留下。\n\n导师说：“也可以先不发，等下一个结果拼起来。”你知道“等下一个”常常就是再也没有。',
    category: 'method',
    mandatory: true,
    eventSlotCost: 0,
    trigger: { all: [{ year: { from: 2021, to: 2023 } }, { paperCount: { op: '==', value: 0 } }] },
    choices: [
      {
        id: 'preprint', text: '把方法和零结果整理成预印本',
        outcomes: [{
          weight: 1,
          text: '它没有期刊卷期，也不会替你满足所有毕业指标。它有 DOI、材料、分析脚本和一个诚实的零结果。\n\n**这是你的论文清单第一行。它不耀眼，但任何人都能打开。**',
          effects: [
            { project: { op: 'create', templateId: 'tpl_survey' } },
            { project: { op: 'publish', target: 'latest', tier: 'preprint' } },
            { stats: { method: 2, capital: 1 } },
            { setFlag: 'first_public_record' },
          ],
        }],
      },
      {
        id: 'methods_note', text: '写成一份可复用的方法说明',
        outcomes: [{
          weight: 1,
          text: '你把招募、材料与清理规则写成一份方法说明，连同零结果一起公开。后来有人复用了它。\n\n**被引用的不是那个“发现”，是你把没发现什么写清楚了。**',
          effects: [
            { project: { op: 'create', templateId: 'tpl_behavioral' } },
            { project: { op: 'publish', target: 'latest', tier: 'preprint' } },
            { stats: { method: 3, capital: 1 } },
            { setFlag: 'first_public_record' },
          ],
        }],
      },
    ],
  },
  {
    id: 'ev_integrity_replication_failed',
    pools: ['grad', 'postdoc', 'tenure'],
    title: '没有重复出来',
    text: '邮件标题是你的论文名。另一个团队做了一个更大样本的直接重复，结果接近零。预印本已经挂出来，措辞很克制。\n\n**重复失败不等于你的研究有问题。** 你知道这句话是真的。你也知道，接下来每个人都会先看你怎么回应。',
    category: 'drama',
    tier: 'major',
    mandatory: true,
    eventSlotCost: 0,
    trigger: {
      all: [
        { year: { from: 2028, to: 2030 } },
        { paperCount: { op: '>=', value: 1 } },
        { chance: 0.5 },
      ],
    },
    choices: [
      {
        id: 'public_response', text: '公开欢迎重复，同时解释设计差异',
        outcomes: [{
          weight: 1,
          text: '你写了一份克制的回应：承认结果不同，也列出样本与测量差异。有人说你专业，有人说你在找借口。\n\n**公开回应没有结束争议；它只让争议有了一份可以引用的原文。**',
          effects: [
            { paperAudit: { op: 'replicationFailed' } },
            { stats: { capital: 3, state: -4 } },
            { setFlag: 'integrity_audit_started' },
            { schedule: { eventId: 'ev_integrity_data_request', afterRounds: 1 } },
          ],
        }],
      },
      {
        id: 'reanalyse_first', text: '先不回应，把当年的数据从头跑一遍',
        outcomes: [{
          weight: 1,
          text: '你关掉社交媒体，打开那个旧文件夹。变量名、排除规则、三个叫 final 的脚本。\n\n两天后你仍没有公开说话。同行觉得你沉默；**你第一次真正看懂了当年的每一步。**',
          effects: [
            { paperAudit: { op: 'replicationFailed' } },
            { stats: { method: 3, state: -4 } },
            { setFlag: 'integrity_audit_started' },
            { schedule: { eventId: 'ev_integrity_data_request', afterRounds: 1 } },
          ],
        }],
      },
      {
        id: 'do_replication', text: '和对方联系，共同做一轮预注册重复',
        outcomes: [{
          weight: 1,
          text: '对方回得很快。你们在 OSF 上一起写方案，每一条排除规则都在收数据之前定下。\n\n这会花一年，也可能再一次得到零。**你得到的是一个更清楚的答案，失去的是抢下一篇的时间。**',
          effects: [
            { paperAudit: { op: 'replicationFailed' } },
            { stats: { method: 4, capital: 2, state: -3 } },
            { setFlag: 'integrity_open_replication' },
            { setFlag: 'integrity_audit_started' },
            { schedule: { eventId: 'ev_integrity_data_request', afterRounds: 1 } },
          ],
        }],
      },
    ],
  },
  {
    id: 'ev_integrity_data_request',
    pools: [],
    title: '请提供原始数据与分析代码',
    text: '期刊编辑来信，请你在三十天内提供原始数据、分析代码和当年的排除记录。\n\n你有数据。问题是它们散在旧硬盘、邮箱附件和几个命名不同的表格里。**当年能跑出结果，不等于今天能重建过程。**',
    category: 'integrity',
    once: true,
    eventSlotCost: 0,
    choices: [
      {
        id: 'open_archive', text: '把能找到的全部交出去，包括不漂亮的部分',
        outcomes: [
          {
            weight: 3,
            condition: { flagNum: { key: 'integrity_risk', op: '>=', value: 28 } },
            text: '编辑看完后要求发表更正：一项未报告的排除规则改变了效应量，但没有改变主结论。\n\n更正挂在论文首页。**它会一直在那里；这正是更正存在的意义。**',
            effects: [{ paperAudit: { op: 'correct' } }, { stats: { capital: -4, method: 3, state: -3 } }, { schedule: { eventId: 'ev_integrity_reread', afterRounds: 1 } }],
          },
          {
            weight: 2,
            text: '文件不整齐，但链条能对上。编辑结案，没有替你宣告“清白”，只写“未发现需要进一步处理的问题”。\n\n**程序能结束，别人是否相信不会同步结束。**',
            effects: [{ paperAudit: { op: 'clear' } }, { stats: { capital: 2, method: 2, state: -2 } }, { schedule: { eventId: 'ev_integrity_reread', afterRounds: 1 } }],
          },
        ],
      },
      {
        id: 'reconstruct', text: '按记忆重建一份干净的分析记录',
        outcomes: [
          {
            weight: 2,
            // 28 已是同一封编辑来信会要求公开更正的高风险档。把撤回另锁在
            // 35 会令它在数千局里统计性消失；这里仍需同时选中“重建记录”。
            condition: { flagNum: { key: 'integrity_risk', op: '>=', value: 28 } },
            text: '两版脚本对不上。编辑又问了三轮，最后通知撤回。\n\n公告没有写“造假”，写的是**无法核实报告结果所依据的分析流程**。这句话已经够了。',
            effects: [{ paperAudit: { op: 'retract' } }, { stats: { capital: -18, state: -10 } }, { schedule: { eventId: 'ev_integrity_reread', afterRounds: 1 } }],
          },
          {
            weight: 4,
            text: '你重建出了一条能运行的流程，也发现它和论文里写的并不完全一样。期刊要求更正方法部分。\n\n没有撤稿。**“没有撤稿”不是这件事的胜利。**',
            effects: [{ paperAudit: { op: 'correct' } }, { stats: { capital: -6, method: 2, state: -5 } }, { schedule: { eventId: 'ev_integrity_reread', afterRounds: 1 } }],
          },
        ],
      },
      {
        id: 'request_correction', text: '主动说明哪些记录已无法重建，请求更正',
        outcomes: [{
          weight: 1,
          text: '你在编辑给结论之前先提交了更正说明。它承认记录缺口，也把能够确认的结果重新报告。\n\n有人把这看作负责，有人把它看作迟来的自保。**两种读法都不会被你控制。**',
          effects: [{ paperAudit: { op: 'correct' } }, { stats: { capital: -5, method: 3, state: -3 } }, { schedule: { eventId: 'ev_integrity_reread', afterRounds: 1 } }],
        }],
      },
    ],
  },
  {
    id: 'ev_integrity_reread',
    pools: [],
    title: '重读',
    text: '几年后，你为了给学生讲研究透明度，又打开那篇论文。\n\n你已经很难重新成为当年那个自己：赶毕业、等审稿、每一步都只差一点。现在你能看见那些“一点”怎样连成了一条线。',
    category: 'integrity',
    once: true,
    eventSlotCost: 0,
    choices: [
      {
        id: 'teach_it', text: '把匿名后的全过程讲给学生',
        outcomes: [{ weight: 1, text: '你没有把故事讲成“从此做对”。你讲的是：**很多问题发生时，看起来都只是一项合理的小决定。**', effects: [{ setFlag: 'integrity_taught_forward' }, { stats: { method: 3, state: 2 } }] }],
      },
      {
        id: 'close_folder', text: '合上文件，不把它变成一堂课',
        outcomes: [{ weight: 1, text: '不是每一段经历都必须被提炼成教育意义。你合上文件。它仍然在论文列表里，状态也写在那里。', effects: [{ stats: { state: 1 } }] }],
      },
    ],
  },
];
