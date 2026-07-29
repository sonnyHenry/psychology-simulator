import type { GameEvent } from '@psy-sim/core';

const ALL_CAREER_POOLS = [
  'grad', 'postdoc', 'tenure', 'clinical_grad', 'clinical_practice', 'clinical_late', 'clinical_common',
  'hospital_grad', 'hospital_practice', 'hospital_late', 'hospital_common',
  'school', 'school_late', 'industry', 'industry_late', 'left', 'left_late', 'left_academia',
];

/** v1 四只黑天鹅。命中只由种子和年份决定，选项负责把冲击变成不同路线。 */
export const blackSwanEvents: GameEvent[] = [
  {
    id: 'ev_bs_storage_failure', pools: ALL_CAREER_POOLS, category: 'blackswan', tier: 'major', eventSlotCost: 0,
    title: '那块盘不转了',
    text: '开机时，硬盘发出三声很轻的咔哒。电脑识别不到它。\n\n里面是过去三年的原始材料：数据、逐字稿、记录、课件或项目文件。你一直打算“这个周末”做完整备份。',
    choices: [
      { id: 'recovery', text: '送专业数据恢复，停下手头工作', outcomes: [{ weight: 1, text: '报价单很贵，恢复过程用了六周。最后拿回了大部分文件，目录结构全没了。**钱能买回数据，买不回你确定它是否完整的那种安心。**', effects: [{ moneyCost: { rate: 0.12, min: 3000, max: 30000, reason: 'investment' } }, { stats: { method: 2, state: -4 } }, { setFlag: 'bs_recovered_data' }] }] },
      { id: 'rebuild', text: '承认丢失，从能重建的部分开始', outcomes: [{ weight: 1, text: '你发出几封很难写的邮件，承认哪些东西没了。项目退回几个月前。**从此你有三份备份；这套习惯的学费是一段回不来的时间。**', effects: [{ stats: { method: 4, capital: -4 } }, { setFlag: 'bs_rebuilt_data' }] }] },
    ],
  },
  {
    id: 'ev_bs_collaborator_gone', pools: ALL_CAREER_POOLS, category: 'blackswan', tier: 'major', eventSlotCost: 0,
    title: '对方不再回复',
    text: '合作最关键的那个人突然不再回复。邮件、电话、共同群聊都没有回音。后来你从第三个人那里知道，ta 离职了，原因没人愿意转述。\n\n有一部分材料和权限只在 ta 手里。',
    choices: [
      { id: 'wait', text: '留出三个月，等对方处理完自己的事', outcomes: [{ weight: 1, text: '三个月后收到一封很短的邮件和一个下载链接。没有解释。材料回来了，节点错过了。**你保留了对一个人处境的余地，也承担了不知道要等多久的代价。**', effects: [{ stats: { clinical: 3, capital: -3 } }, { setFlag: 'bs_waited_collaborator' }] }] },
      { id: 'replace', text: '立刻重建权限与合作关系', outcomes: [{ weight: 1, text: '你找了新的人，把缺口一项项补上。项目活了，旧合作者回来时发现自己的位置已经不存在。**这是风险管理，也是一次没有当面对话的替换。**', effects: [{ stats: { capital: 3, state: -3 } }, { setFlag: 'bs_replaced_collaborator' }] }] },
    ],
  },
  {
    id: 'ev_bs_building_closed', pools: ALL_CAREER_POOLS, category: 'blackswan', tier: 'major', eventSlotCost: 0,
    title: '封闭施工',
    text: '通知贴出来：你工作的那层楼发现结构或消防问题，立即封闭，预计一年。\n\n预计通常不是承诺。设备、档案和那间你已经习惯怎样开门的屋子，全在警戒线后面。',
    choices: [
      { id: 'borrow_space', text: '借别人的空间，把工作拆成更小的块', outcomes: [{ weight: 1, text: '你在三处临时空间之间跑。工作没有停，但每一次开始前都要重新布置。**你保住了连续性，失去了所有理所当然。**', effects: [{ stats: { capital: 3, state: -4 } }, { setFlag: 'bs_borrowed_space' }] }] },
      { id: 'pause_core', text: '暂停核心工作，趁这一年改做整理与写作', outcomes: [{ weight: 1, text: '你停掉了最依赖场地的部分，清理旧材料、补文档、写下拖了很久的东西。**产出结构变了，不等于这一年没有损失。**', effects: [{ stats: { method: 4, capital: -3 } }, { setFlag: 'bs_paused_core' }] }] },
    ],
  },
  {
    id: 'ev_bs_rules_changed', pools: ALL_CAREER_POOLS, category: 'blackswan', tier: 'major', eventSlotCost: 0,
    title: '这项以后不算了',
    text: '新规则发布。你花了几年积累的那项成果，不再计入下一轮考核、评级、职称或业务优先级。\n\n规则没有针对你。**这句话对损失没有任何帮助。**',
    choices: [
      { id: 'translate', text: '把旧成果重新翻译成新规则认可的形式', outcomes: [{ weight: 1, text: '你重写材料、补流程、换指标。大部分被接住了，仍有一部分永远留在旧表格里。**适应能力被看见，原来做过的事没有全部被看见。**', effects: [{ stats: { method: 3, state: -4 } }, { setFlag: 'bs_translated_work' }] }] },
      { id: 'refuse_chase', text: '不追新口径，保住原本工作的完整性', outcomes: [{ weight: 1, text: '你没有把所有工作扭成新指标。考核表难看了一截，真正使用那些成果的人仍然在用。**你保住了工作的意义，放弃了让表格承认全部意义。**', effects: [{ stats: { state: 3, capital: -4 } }, { setFlag: 'bs_kept_work' }] }] },
    ],
  },
];
