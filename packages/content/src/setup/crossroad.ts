import type { CrossroadOption, LifeGoal } from '@psy-sim/core';

/**
 * 大四三岔口(2018.3,GAME_DESIGN 第八节末)。
 *
 * 两步:先选 **人生取向**(改变导演偏好与最终评分权重),再选 **路径**。
 *
 * 前作把这个屏的选项和分流**硬编码在引擎里**(考研/求职/考公 + 按专业名 if-else 五段)。
 * 本作全在数据里:加一条路径只需要往下面加一行 + 在 timeline 里加一个阶段。
 *
 * ## 门控就是"兑现"
 * 每条路径的 `availableWhen` 读的都是本科四年攒下来的东西:
 * 保研直博要资本和方法,海外 PhD 要备考年数,考编要教师资格证。
 * **手里没有那张牌的路径不会出现在清单上**——这是大四"兑现"这个功能的全部实现。
 */

/** 人生取向:改变导演偏好与最终评分权重。五种都必须能通关。 */
export const lifeGoals: LifeGoal[] = [
  {
    id: 'goal_academic',
    label: '学术成就',
    text: '你想把一个问题做到底,想让自己的名字出现在别人的参考文献里。',
    poolBias: { method: 1.4, era: 1.1, counseling: 0.7 },
    scoringWeights: { method: 0.34, clinical: 0.1, capital: 0.34, state: 0.16, money: 0.06 },
  },
  {
    id: 'goal_help_people',
    label: '帮到具体的人',
    text: '不是"人类",是坐在你对面那一个人。你要的是那种能看见的改变。',
    poolBias: { counseling: 1.5, crisis: 1.2, method: 0.75 },
    scoringWeights: { method: 0.1, clinical: 0.4, capital: 0.14, state: 0.28, money: 0.08 },
  },
  {
    id: 'goal_stability',
    label: '稳定与编制',
    text: '你要一份能算清楚的人生:有编制、有寒暑假、周末不用回邮件。',
    poolBias: { social: 1.2, era: 1.2, method: 0.8 },
    scoringWeights: { method: 0.14, clinical: 0.2, capital: 0.2, state: 0.36, money: 0.1 },
  },
  {
    id: 'goal_income',
    label: '收入',
    text: '你不想在三十岁的时候还在算这个月能不能不花超。这不庸俗,这是账。',
    poolBias: { social: 1.2, method: 1.1, crisis: 0.8 },
    scoringWeights: { method: 0.16, clinical: 0.14, capital: 0.2, state: 0.16, money: 0.34 },
  },
  {
    id: 'goal_freedom',
    label: '自由',
    text: '你想自己决定几点起床、做什么题、跟谁合作。代价你愿意付。',
    poolBias: { identity: 1.3, method: 1.1, social: 0.85 },
    scoringWeights: { method: 0.22, clinical: 0.22, capital: 0.12, state: 0.34, money: 0.1 },
  },
];

/**
 * 七条路径。`group: 'crossroad_2018'` 对应大四三岔口这个 flow 阶段的 id。
 *
 * M2 的落地范围:每条路径都能被选中、都能跳到对应阶段、都能走到一个结局。
 * 各阶段内部的内容(硕士三年、临床线、二级线)分别是 M3/M4/M6。
 */
export const crossroadOptions: CrossroadOption[] = [
  {
    id: 'path_phd_direct',
    label: '保研直博',
    text: '你签了直博。五年,2023 年毕业。\n\n没有硕士学位这个安全垫,中间退出就是什么都没有。你签字的时候手很稳,因为你已经在那间实验室待了三年。',
    group: 'crossroad_2018',
    // 直博要的是资本(推荐 + 组内位置)+ 方法。这两样都得提前两年下注。
    availableWhen: {
      all: [
        { stat: 'capital', op: '>=', value: 22 },
        { stat: 'method', op: '>=', value: 62 },
        { flagNum: { key: 'lab_years', op: '>=', value: 2 } },
      ],
    },
    hint: '需要组里的位置和方法功底——你两年前就开始攒了',
    effects: [
      { setFlag: 'track_academic' },
      { setFlag: 'path_phd_direct' },
      { setCareer: 'phd_direct' },
      { stats: { capital: 6, method: 3, state: -4 } },
      { jumpToPhase: 'apply_phd_direct' },
    ],
  },
  {
    id: 'path_master',
    label: '读硕(保研或考研)',
    text: '你去读硕士。三年,2021 年毕业,到时候再决定要不要接着读博。\n\n这是最多人走的一条路,也是最不容易后悔的一条——因为它把决定往后推了三年。',
    group: 'crossroad_2018',
    availableWhen: {
      any: [
        { flag: 'has_grad_offer' },
        { flagNum: { key: 'exam_prep', op: '>=', value: 2 } },
        { stat: 'method', op: '>=', value: 55 },
      ],
    },
    hint: '最稳的一条。把决定推后三年也是一种决定',
    effects: [
      { setFlag: 'track_academic' },
      { setFlag: 'path_master' },
      { setCareer: 'master' },
      { stats: { capital: 3, method: 2, state: -2 } },
      { jumpToPhase: 'apply_master' },
    ],
  },
  {
    id: 'path_overseas',
    label: '申请海外 PhD',
    text: '你申了海外。六年,含资格考和全程 TA。\n\nGRE、托福、三封推荐信、套磁邮件发了十四封回了五封。这件事你从大三就开始准备了,而现在你要在二十二岁搬到一个没有人认识你的地方。',
    group: 'crossroad_2018',
    // 海外要提前两年准备:语言 + RA 经历 + 推荐信
    // 三个条件同时满足在 2000 局里只出现了 0.85%,低于"每条路径可达率 ≥3%"的门禁。
    // 放宽的是 RA 年数和方法线,不是"要提前准备"这个设计——语言(`exam_prep`)仍然是硬门槛。
    availableWhen: {
      all: [
        { flagNum: { key: 'exam_prep', op: '>=', value: 2 } },
        { flagNum: { key: 'lab_years', op: '>=', value: 1 } },
        { stat: 'method', op: '>=', value: 55 },
      ],
    },
    hint: '语言、RA 经历、推荐信——三样都得两年前就开始',
    effects: [
      { setFlag: 'track_academic' },
      { setFlag: 'path_overseas' },
      { setFlag: 'overseas' },
      { setCareer: 'overseas_phd' },
      { stats: { capital: 5, method: 4, state: -6 } },
      { jumpToPhase: 'apply_abroad' },
    ],
  },
  {
    id: 'path_clinical',
    label: '走临床:读专硕,进医院或机构',
    text: '你读应用心理专硕,目标是注册系统那条路:个案小时、督导小时、然后是助理心理师。\n\n这条路比那个被取消的证长得多,而且没有任何一步是可以跳过的。',
    group: 'crossroad_2018',
    availableWhen: {
      any: [
        { flag: 'knows_registration_system' },
        { flagNum: { key: 'counseling_years', op: '>=', value: 1 } },
        { stat: 'clinical', op: '>=', value: 40 },
      ],
    },
    hint: '需要临床底子。咨询中心那一年在这里第一次兑现',
    effects: [
      { setFlag: 'track_clinical' },
      { setFlag: 'path_clinical' },
      { setCareer: 'clinical' },
      { stats: { clinical: 6, state: -2 } },
      // 专硕也要投申请:与学硕同一张院校表(一屏四用),门槛平移用 master 档
      { jumpToPhase: 'apply_clinical' },
    ],
  },
  {
    id: 'path_school',
    label: '考编:中小学心理教师',
    text: '你去考教师编。心理健康教育岗,一个学校一到两个人。\n\n你父母那天在电话里说了三次"好"。',
    group: 'crossroad_2018',
    availableWhen: {
      any: [
        { flag: 'has_teacher_cert' },
        { flag: 'school_track_ready' },
        { flag: 'teacher_cert_track' },
      ],
    },
    hint: '教师资格证是硬门槛。师范生是顺带拿的,别人要自己考',
    effects: [
      { setFlag: 'track_school' },
      { setFlag: 'path_school' },
      { setCareer: 'school' },
      { stats: { capital: 3, state: 4 } },
      { jumpToPhase: 'school' },
    ],
  },
  {
    id: 'path_industry',
    label: '本科毕业就业:大厂用研或产品',
    text: '你去投了互联网公司的用户研究岗。\n\n面试官问你会不会 SQL,问你做过多大样本的问卷,问你能不能一周出一份报告。他没有问你任何一个关于心理学的问题。',
    group: 'crossroad_2018',
    hint: '门槛最低,起薪最高,和这门学科的距离也最远',
    effects: [
      { setFlag: 'track_industry' },
      { setFlag: 'path_industry' },
      { setCareer: 'industry' },
      { stats: { money: 60000, capital: 2, method: -2 } },
      { jumpToPhase: 'industry' },
    ],
  },
  {
    id: 'path_leave',
    label: '离开这一行',
    text: '你去考了别的方向的研究生,或者直接去做了一份和心理学没关系的工作。\n\n这四年不是白读的。你只是决定不在这条路上继续。',
    group: 'crossroad_2018',
    hint: '这四年不算白读。这条路也有它自己的好结局',
    effects: [
      { setFlag: 'track_left' },
      { setFlag: 'path_leave' },
      { setCareer: 'left' },
      { stats: { money: 20000, state: 6, clinical: -4 } },
      { jumpToPhase: 'left' },
    ],
  },
];

/**
 * 硕士岔口(2021.3)。三年硕士读完,现在要决定接不接着读。
 *
 * 门控读的是这三年攒下来的东西:**有没有论文**决定你能不能接着读博。
 * 这一点比本科三岔口残酷得多,而且它是准确的。
 */
export const masterCrossroadOptions: CrossroadOption[] = [
  {
    id: 'm_continue_phd',
    label: '接着读博',
    text: '你继续读。三年,2024 年毕业——如果不延毕的话。\n\n签字那天你想起研一那年组会上一个词都听不懂的自己。',
    group: 'crossroad_2021',
    // 有一篇文章是硬门槛。这不是游戏设定,这是大部分学校的实际要求。
    availableWhen: {
      any: [
        { paperCount: { op: '>=', value: 1 } },
        { all: [{ stat: 'capital', op: '>=', value: 40 }, { stat: 'method', op: '>=', value: 70 }] },
      ],
    },
    hint: '需要拿得出手的产出。三年不是白算的',
    effects: [
      { setFlag: 'path_phd_after_master' },
      { setCareer: 'phd' },
      { stats: { capital: 4, state: -3 } },
      { jumpToPhase: 'apply_phd' },
    ],
  },
  {
    id: 'm_industry',
    label: '硕士毕业就业',
    text: '你去了企业。用研、数据分析、或者一个跟心理学沾点边的岗位。\n\n**三年硕士在简历上值多少,这一刻会给你一个很具体的答案。**',
    group: 'crossroad_2021',
    hint: '起薪比读博高一个数量级,而且现在就有',
    effects: [
      { setFlag: 'path_industry' },
      { setCareer: 'industry' },
      { stats: { money: 180000, capital: 2, method: -1 } },
      { jumpToPhase: 'industry_after_master' },
    ],
  },
  {
    id: 'm_clinical',
    label: '转去做临床',
    text: '你去考注册系统那条路。个案小时、督导小时,一小时一小时地攒。\n\n三年硕士里你做的那些研究,在这条路上用得上的部分比你以为的多。',
    group: 'crossroad_2021',
    availableWhen: {
      any: [
        { stat: 'clinical', op: '>=', value: 45 },
        { flag: 'knows_registration_system' },
        { advisor: { archetype: 'clinical' } },
      ],
    },
    hint: '需要临床底子',
    effects: [
      { setFlag: 'track_clinical' },
      { setFlag: 'path_clinical' },
      { setCareer: 'clinical' },
      { stats: { clinical: 6, state: -1 } },
      // 学硕转临床不再读一个专硕,但仍要明确选择医院建制还是社会机构。
      { jumpToPhase: 'clinical_entry_2021' },
    ],
  },
  {
    id: 'm_school',
    label: '考编:中小学心理教师',
    text: '你去考教师编。硕士学历在这条路上是加分项,而且是很实的加分项。',
    group: 'crossroad_2021',
    hint: '硕士学历在这里是实打实的加分',
    effects: [
      { setFlag: 'path_school' },
      { setCareer: 'school' },
      { stats: { capital: 3, state: 4 } },
      { jumpToPhase: 'school_after_master' },
    ],
  },
  {
    id: 'm_leave',
    label: '离开这一行',
    text: '你去做了别的。七年,本科加硕士。\n\n**这七年不是白读的**,只是它们的价值不会以你当初设想的方式兑现。',
    group: 'crossroad_2021',
    hint: '七年不算白读。这条路也有它自己的好结局',
    effects: [
      { setFlag: 'path_leave' },
      { setCareer: 'left' },
      { stats: { money: 60000, state: 6 } },
      { jumpToPhase: 'left_after_master' },
    ],
  },
];

/**
 * 临床培养出口(M6)。同一个应用心理专硕可以去社会机构,也可以进医院心理科；
 * 学硕转临床的人同样从这里选。医院不是“咨询做得更好”的高阶版本,而是另一套建制、
 * 职称与工作节奏,所以用显式岔口分开,不靠一个后期事件偷偷改 career。
 */
export const clinicalEntryOptions: CrossroadOption[] = [
  {
    id: 'cl_enter_practice',
    label: '去机构,走注册系统',
    text: '你去了一家咨询机构。个案小时、督导小时、继续教育,一格一格地攒。\n\n这条路没有编制,也没有谁替你兜底；但五十分钟完整属于坐在你对面的人。',
    group: 'clinical_entry_2021',
    hint: '完整的咨询训练,收入和案源都要从零长出来',
    effects: [
      { setFlag: 'path_clinical' },
      { setCareer: 'clinical' },
      { stats: { clinical: 3, state: 1 } },
      { jumpToPhase: 'clinical_practice' },
    ],
  },
  {
    id: 'cl_enter_hospital',
    label: '进医院心理科',
    text: '你去医院。心理测量、心理治疗、门诊会诊和一套完整的职称体系。\n\n你会很早再次撞上那堵墙:**你能评估、能治疗,但你不是精神科医生,没有处方权。**',
    group: 'clinical_entry_2021',
    availableWhen: {
      any: [
        { flag: 'college_medical' },
        { flag: 'mastered_assessment' },
        { stat: 'clinical', op: '>=', value: 52 },
      ],
    },
    hint: '医疗建制更稳,门诊节奏更快；医学/评估背景更顺',
    effects: [
      { setFlag: 'path_hospital' },
      { setCareer: 'hospital' },
      { stats: { clinical: 4, capital: 2, state: -2 } },
      { jumpToPhase: 'hospital_practice' },
    ],
  },
];

/** 本科毕业后读应用心理专硕时,在培养开始前选机构/医院方向。 */
export const clinicalTrainingOptions: CrossroadOption[] = [
  {
    ...clinicalEntryOptions[0]!,
    id: 'cl_train_practice',
    group: 'clinical_entry_2019',
    label: '咨询与注册方向',
    text: '你选了咨询与注册方向。课程、个人体验、督导,然后才轮到第一个实习个案。\n\n这三年训练的终点不是一张证,是你能不能在五十分钟里不急着替别人解决人生。',
    effects: [
      { setFlag: 'path_clinical' },
      { setCareer: 'clinical' },
      { stats: { clinical: 3, state: 1 } },
      { jumpToPhase: 'clinical' },
    ],
  },
  {
    ...clinicalEntryOptions[1]!,
    id: 'cl_train_hospital',
    group: 'clinical_entry_2019',
    label: '医院临床心理方向',
    text: '你选了医院方向。课程表里多了精神病学、心理评估与见习轮转。\n\n三年后你会进入一套稳定得多、也拥挤得多的建制。',
    effects: [
      { setFlag: 'path_hospital' },
      { setCareer: 'hospital' },
      { stats: { clinical: 4, capital: 2, state: -2 } },
      { jumpToPhase: 'hospital_grad' },
    ],
  },
];

/**
 * 博士毕业岔口(M5,GAME_DESIGN 九节的入口)。
 *
 * 三条路:**博后 → 求职季**(学术线的正路)、**直接投教职**(少数人,而且更难)、
 * **离开**(这不是失败分支)。
 *
 * ## 为什么直接投教职的门槛更高
 *
 * 现实里博士毕业直接拿到教职的人是少数,而且几乎都是产出特别硬的那批。
 * 门控写成"四篇以上或资本很高",不是为了惩罚,是因为**博后这一步在这一行里
 * 事实上已经变成必经之路了**——而这件事本身就值得让玩家在这一屏上看见。
 */
export const phdCrossroadOptions: CrossroadOption[] = [
  {
    id: 'p_postdoc',
    label: '做博后',
    text: '两年,一份合同,一个新的城市。\n\n**这一步在二十年前是可选的,现在不是了。** 你会用这两年把简历上那几行补齐,然后去投教职。',
    group: 'crossroad_phd',
    hint: '学术线的正路,但它只是把那场考试推迟两年',
    effects: [
      { setFlag: 'path_postdoc' },
      { setCareer: 'postdoc' },
      { stats: { capital: 3, state: -2 } },
      { jumpToPhase: 'apply_postdoc' },
    ],
  },
  {
    id: 'p_go_market',
    label: '直接投教职',
    text: '不做博后,今年就上市场。\n\n**能这么做的人不多**,而你觉得自己手上的东西够。',
    group: 'crossroad_phd',
    // 产出特别硬的那批才走得通。这不是惩罚,是这一行的现状
    availableWhen: {
      any: [
        { paperCount: { op: '>=', value: 4 } },
        { all: [{ paperCount: { op: '>=', value: 2 } }, { stat: 'capital', op: '>=', value: 65 }] },
      ],
    },
    hint: '省下两年,代价是你少了两年攒东西的时间',
    effects: [
      { setFlag: 'path_direct_market' },
      { setCareer: 'faculty_candidate' },
      { stats: { capital: 2, state: -3 } },
      { jumpToPhase: 'job_market' },
    ],
  },
  {
    id: 'p_leave',
    label: '不留在这条路上了',
    text: '你把答辩 PPT 存进一个文件夹,然后关掉了那个文件夹。\n\n**这不是放弃。** 你读完了,而读完之后要不要接着走是另一件事。',
    group: 'crossroad_phd',
    hint: '博士学位在别的地方也算数',
    effects: [
      { setFlag: 'path_left_after_phd' },
      { setCareer: 'left' },
      { stats: { money: 60000, state: 6 } },
      { jumpToPhase: 'left_academia' },
    ],
  },
];
