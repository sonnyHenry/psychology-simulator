import type { GameEvent } from '@psy-sim/core';

const CAREER_POOLS = [
  'grad', 'postdoc', 'tenure', 'clinical_grad', 'clinical_practice', 'clinical_late', 'clinical_common',
  'hospital_grad', 'hospital_practice', 'hospital_late', 'hospital_common',
  'school', 'school_late', 'industry', 'industry_late', 'left', 'left_late', 'left_academia',
];

/** 量表触发事件：effect 只登记待填量表，真正计分在 core/systems/inventory.ts。 */
export const inventoryEvents: GameEvent[] = [
  {
    id: 'ev_inventory_phq9_2016', pools: ['undergrad'], category: 'self_check', mandatory: true, eventSlotCost: 0,
    title: '那张你见过很多次的表',
    text: '大二期末，老师把一张自评表放在课程平台上，说是体验作业。\n\n你刚学完信效度，也知道每个选项会把总分推向哪里。**知道题目在测什么，会让回答更准确，也会让人更会防御。**',
    presentationVariants: [
      { condition: { flag: 'origin_illness' }, title: '你在家里见过相似的问题', text: '大二期末，课程平台弹出 PHQ-9 体验作业。你见过家里人被问相似的问题，也记得那时每个答案如何被大人们反复斟酌。\n\n今天轮到你自己填。' },
      { condition: { flag: 'trait_quant' }, title: '九道题，一列总分', text: '大二期末，老师布置 PHQ-9 体验作业。你已经知道九个选项怎样相加、分界值在哪里。\n\n知道计分规则，并没有告诉你该怎样回答。' },
    ],
    trigger: { year: { from: 2016, to: 2016 } },
    choices: [{ id: 'fill', text: '按最近两周填写', outcomes: [{ weight: 1, text: '你把手机放平，从第一题开始。', effects: [{ startInventory: 'phq9' }] }] }],
  },
  {
    id: 'ev_inventory_gad7_2023', pools: CAREER_POOLS, category: 'self_check', mandatory: true, eventSlotCost: 0,
    title: '七项',
    text: '你在一份材料里看到 GAD-7。七项，不到两分钟。\n\n你给别人解释过“筛查不等于诊断”，也在研究里把它当作一列变量。今天轮到你自己填。',
    presentationVariants: [
      { condition: { career: 'clinical' }, title: '你给来访者递过很多次的七项', text: 'GAD-7 放在桌边。你给来访者递过很多次，也解释过筛查不等于诊断。\n\n今天纸的方向反了过来。' },
      { condition: { stat: 'method', op: '>=', value: 60 }, title: '你知道它的截断分', text: '你在材料里看到 GAD-7。信度、效度、截断分都记得，七道题几乎能背下来。\n\n这些知识不能替你回答最近两周。' },
    ],
    trigger: { year: { from: 2022, to: 2024 } },
    choices: [{ id: 'fill', text: '填写', outcomes: [{ weight: 1, text: '你没有先算分。至少第一题没有。', effects: [{ startInventory: 'gad7' }] }] }],
  },
  {
    id: 'ev_inventory_mbi_2028', pools: CAREER_POOLS, category: 'self_check', mandatory: true, eventSlotCost: 0,
    title: '“只是累”',
    text: '培训材料里出现了职业倦怠。你下意识想说自己只是累：项目多、案量大、课排得满、业务在调整。\n\n**每一个解释都是真的。解释并不会自动让耗竭变轻。**',
    presentationVariants: [
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 60 } }, title: '“只是累”已经说了很久', text: '培训材料里出现职业倦怠。你下意识又说“只是累”，然后发现这句话已经说了不止一年。\n\n每一个解释都是真的，耗竭也是真的。' },
      { condition: { career: 'school' }, title: '下课铃之后', text: '区里培训发来一份职业倦怠短表。白天你给学生讲过怎样识别压力，晚上办公室只剩你还亮着灯。\n\n六道题，现在轮到你。' },
    ],
    trigger: { year: { from: 2027, to: 2029 } },
    choices: [{ id: 'fill', text: '看看“只是累”写成什么样', outcomes: [{ weight: 1, text: '六个句子。你读得比想象中慢。', effects: [{ startInventory: 'mbi' }] }] }],
  },
  {
    id: 'ev_inventory_scs_2032', pools: CAREER_POOLS, category: 'self_check', mandatory: true, eventSlotCost: 0,
    title: '把同一句话说给自己',
    text: '这些年你对学生、来访者、同事说过很多次：“不要只用最坏的一天定义自己。”\n\n一张自我关怀短表问的其实是：**轮到你时，这句话还算不算数。**',
    presentationVariants: [
      { condition: { stat: 'state', op: '<', value: 45 }, title: '最难的一天不能代表全部', text: '这些年你对别人说过很多次：“不要只用最坏的一天定义自己。”最近，你越来越难把这句话留给自己。\n\n短表的第一题正在等。' },
      { condition: { flag: 'origin_broke_cycle' }, title: '你已经替别人停过一次', text: '你曾经没有把那句省事的答案交给后来的人。现在一张自我关怀短表问你：轮到自己时，能不能也停一下。' },
    ],
    trigger: { year: { from: 2031, to: 2033 } },
    choices: [{ id: 'fill', text: '填写', outcomes: [{ weight: 1, text: '这一次，没有标准答案可背。', effects: [{ startInventory: 'scs' }] }] }],
  },
];

export const originEvents: GameEvent[] = [
  {
    id: 'ev_origin_2019', pools: CAREER_POOLS, category: 'origin', mandatory: true, eventSlotCost: 0,
    title: '你为什么学心理学', text: '新同学或新同事轮流自我介绍。轮到你时，那句老问题又来了：**“你为什么学心理学？”**',
    presentationVariants: [
      { condition: { flag: 'origin_illness' }, title: '那句不能写进自我介绍的话', text: '轮到你说为什么学心理学。家里那次住院浮上来，又被你压回一句“对人感兴趣”。' },
      { condition: { flag: 'origin_rural' }, title: '从县道到这里', text: '轮到你说为什么学心理学。你想起当年到学校要换三趟车，也想起家里没人知道这个专业以后能做什么。' },
      { condition: { flag: 'origin_medical_family' }, title: '另一种白大褂', text: '轮到你说为什么学心理学。你父母的科室、值班电话和饭桌上的病例都在答案里，但你只说了“想做助人的工作”。' },
    ],
    trigger: { year: { from: 2019, to: 2021 } },
    choices: [
      { id: 'say_simple', text: '说一个适合自我介绍的版本', outcomes: [{ weight: 1, text: '“对人感兴趣。”大家点头。这个答案不假，只是不完整。', effects: [{ setFlag: 'origin_told_simple' }, { stats: { capital: 1, state: -1 } }] }] },
      { id: 'say_more', text: '多说一句真的', outcomes: [{ weight: 1, text: '你只多说了一句。房间没有发生什么，问题却第一次不再只待在你心里。', effects: [{ setFlag: 'origin_shared' }, { stats: { state: 2, capital: -1 } }] }] },
    ],
  },
  {
    id: 'ev_origin_2024', pools: CAREER_POOLS, category: 'origin', mandatory: true, eventSlotCost: 0,
    title: '熟人来问', text: '一个熟人私下问你：“你学这个的，你觉得我是不是有问题？”\n\n二十岁时你会急着给解释。现在你先听见了这句话里真正的请求。',
    presentationVariants: [
      { condition: { flag: 'origin_shared' }, title: '你认得这句问法', text: '一个熟人私下问：“你学这个的，你觉得我是不是有问题？”你认得那种把真正的问题藏进一句泛问里的方式，因为你也这样做过。' },
      { condition: { career: 'clinical' }, title: '门外的熟人', text: '一个熟人绕开正式预约来问：“你觉得我是不是有问题？”你每天都在会谈室里听问题，但熟人之间没有设置、知情同意或清楚的边界。' },
    ],
    trigger: { year: { from: 2024, to: 2026 } },
    choices: [
      { id: 'hold_boundary', text: '不隔空判断，帮 ta 找到能求助的入口', outcomes: [{ weight: 1, text: '你没有给一个漂亮答案。你给了几个号码、一条路径，和一句“如果你愿意，我可以陪你走到门口”。', effects: [{ setFlag: 'origin_boundary' }, { stats: { clinical: 2, state: -1 } }] }] },
      { id: 'explain', text: '把你知道的尽量讲清楚', outcomes: [{ weight: 1, text: '你讲了很久。对方说“懂了”，但你知道理解概念和得到帮助不是一回事。', effects: [{ stats: { method: 2, state: -1 } }] }] },
    ],
  },
  {
    id: 'ev_origin_2029', pools: CAREER_POOLS, category: 'origin', mandatory: true, eventSlotCost: 0,
    title: '现在轮到别人来问你', text: '一个刚入行的年轻人问：“我是不是不适合做这个？”\n\n你听见自己准备说的话，和很多年前某个人对你说过的那句很像。',
    presentationVariants: [
      { condition: { flag: 'origin_boundary' }, title: '答案和入口不是一回事', text: '一个刚入行的年轻人问：“我是不是不适合做这个？”你想起多年前那个熟人。那次你没有给判断，而是给了一个入口。' },
      { condition: { career: 'school' }, title: '年轻老师坐在你对面', text: '新来的心理老师问：“我是不是不适合做这个？”ta 的课表、值班和你当年很像，你也知道一句“坚持”有多便宜。' },
    ],
    trigger: { year: { from: 2029, to: 2030 } },
    choices: [
      { id: 'ask_back', text: '先问：发生了什么', outcomes: [{ weight: 1, text: '你没有替 ta 定义适不适合。你们先把那件具体的事拆开。**你终于没有重复那句最省事的话。**', effects: [{ setFlag: 'origin_broke_cycle' }, { stats: { clinical: 2, state: 1 } }] }] },
      { id: 'give_answer', text: '给一个你当年想听到的答案', outcomes: [{ weight: 1, text: '你说“再试一年”。ta 松了一口气。你不知道这是接住了 ta，还是替 ta 推迟了一个决定。', effects: [{ stats: { capital: 2, state: -1 } }] }] },
    ],
  },
  {
    id: 'ev_origin_2033', pools: CAREER_POOLS, category: 'origin', mandatory: true, eventSlotCost: 0, order: 80,
    title: '那张志愿表', text: '整理抽屉时，你翻到一张旧照片：2014 年的志愿表，心理学那一行还空着。\n\n你已经不记得按下确认键时在想什么了。',
    presentationVariants: [
      { condition: { flag: 'origin_broke_cycle' }, title: '那张志愿表，和后来的人', text: '整理抽屉时，你翻到 2014 年的志愿表。后来也有人问过你适不适合走这条路，而你没有替 ta 把答案写上。' },
      { condition: { background: 'bg_rural' }, title: '从家里到这里的那张表', text: '旧照片里是 2014 年的志愿表。心理学那一行还空着，旁边压着你当年算生活费的草稿。\n\n那时你不知道这条路到底有多长。' },
    ],
    trigger: { year: { from: 2032, to: 2034 } },
    choices: [
      { id: 'keep', text: '把照片留着', outcomes: [{ weight: 1, text: '你没有给十八岁的自己写信。那个人听不懂你现在的答案，而你也不需要把二十年压成一句忠告。', effects: [{ setFlag: 'origin_closed' }, { stats: { state: 2 } }] }] },
    ],
  },
];
