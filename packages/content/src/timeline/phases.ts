import type { PhaseConfig } from '@psy-sim/core';

/**
 * 时间线。阶段路由是**显式**的:每个非终局阶段必须写 `nextPhaseId`(validate 强制,一个不许漏),
 * 终局阶段可以有多个——七条路径各有自己的终局。
 *
 * ## 学年与自然年
 * 大一学年 2014.9–2015.6 记作 **2015**,所以本科阶段 `date.year = 2015`、`courseYearFrom: 1`,
 * 四个回合分别是 2015(大一)/ 2016(大二)/ 2017(大三)/ 2018(大四)。
 * 内容侧的年份门控和时代事件都用这套口径。
 *
 * M6 之后所有入口都铺到 2034:国内学术、海外 PhD、临床、医院、学校、企业与离开。
 * 一级线保留跨年对象和工作台,二级线只用阶段、事件与收入规则(P6 精度分级)。
 */

/**
 * 七条路径的下游阶段。M3/M4/M6 会把它们各自展开成真正的培养阶段。
 *
 * ## 为什么这里不写 `date`
 *
 * 这几个阶段**有两个入口**:大四岔口(2018)和硕士岔口(2021)都能走进来。
 * 写死年份的后果是硕士毕业去大厂会看到"2019 年 · 大厂用研",时间倒流三年。
 * 省略 `date` 让阶段跟着玩家真实走到的年份走。
 *
 * 同理,brief 里**不许出现具体年月**——一句"2018 年七月你入职了"会在 2021 年入口下变成谎话。
 * 展开成真正的阶段时可以再写年份,但那时每条路径得有自己的入口年份。
 */
function secondaryPhase(
  id: string,
  label: string,
  fromYear: number,
  rounds: number,
  pools: string[],
  briefs: string[],
  tail: { nextPhaseId: string } | { isFinal: true },
  yearsPerRound = 1,
): Extract<PhaseConfig, { kind: 'rounds' }> {
  return {
    kind: 'rounds',
    id,
    label,
    date: { year: fromYear, month: 9 },
    rounds,
    yearsPerRound,
    eventSlots: 2,
    pools,
    briefs,
    ...tail,
  };
}

/** 研究生阶段的公共形状:三格精力、先看白板再分配、管线事件不占槽位 */
function gradPhase(
  id: string,
  label: string,
  fromYear: number,
  rounds: number,
  briefs: string[],
  tail: { nextPhaseId: string } | { isFinal: true },
): Extract<PhaseConfig, { kind: 'rounds' }> {
  return {
    kind: 'rounds',
    id,
    label,
    date: { year: fromYear, month: 9 },
    rounds,
    eventSlots: 2,
    pools: ['grad'],
    briefs,
    // 工作台(M4.6)。它**吃掉了原来的 `PROJECT_BOARD` + `ALLOCATION` 两屏**:
    // 一块要专门点进去看的白板,和一块你每年必然要坐在前面的桌子,是两种东西。
    // 手上有什么、今年干什么,现在是同一屏的两个页签。
    roundOpeners: ['DESK'],
    allocationSlots: 3,
    ...tail,
  };
}

/**
 * 申请屏阶段。**每个学术去向一个,因为 flow 阶段只有一条 `nextPhaseId`。**
 *
 * 为什么不把 `GRAD_APPLY` 直接塞进岔口那个 flow:岔口的每个选项都带 `jumpToPhase`,
 * 一选完就跳走了,排在 CROSSROAD 后面的步骤永远走不到。
 * 拆成独立阶段之后路由是显式的:岔口 → 申请 → 培养阶段,validate 的连通性检查看得见每一条边。
 */
function applyPhase(
  id: string,
  label: string,
  gradApplyKind: 'master' | 'phd' | 'phd_abroad' | 'postdoc',
  nextPhaseId: string,
): Extract<PhaseConfig, { kind: 'flow' }> {
  return { kind: 'flow', id, label, steps: ['GRAD_APPLY'], gradApplyKind, nextPhaseId };
}

export const timeline: PhaseConfig[] = [
  {
    kind: 'flow',
    id: 'gaokao',
    label: '2014 年夏天',
    date: { year: 2014, month: 6 },
    steps: ['BACKGROUND_DRAW', 'SETUP', 'EXAM', 'APPLICATION', 'NPC_SELECTION'],
    nextPhaseId: 'undergrad',
  },
  {
    kind: 'rounds',
    id: 'undergrad',
    label: '本科',
    date: { year: 2015, month: 6 },
    rounds: 4,
    // **槽位是给非 mandatory 事件的,而 mandatory 不占槽位——每年放几幕由两者相加决定。**
    //
    // 玩家反馈"每年事件太多"时,砍槽位是错的那条路:降到 2 之后事件覆盖从 84/84 塌到 64/84,
    // 学院专属线和耗竭线在 3000 局里一次都抽不到。**本科的内容量就是按 3 格配的。**
    // 减量要从 mandatory 那一路减——那才是每局必现、真正造成疲劳的部分(大三原本一年 8 幕全是它)。
    eventSlots: 3,
    pools: ['undergrad'],
    briefs: [
      '大一。你以为自己来学"人为什么会这样",课表告诉你先学高等数学。',
      '大二。心理统计和实验心理学同时压过来,班上开始出现"跟不上"的人。',
      '大三。实验室和咨询中心的门都开了,但你只有一个周五下午。',
      '大四。有人在准备考研,有人在投简历,有人还没想清楚自己要什么。',
    ],
    // 每年开场先坐到工作台前分配四格精力。递减到硕博 3 / 博后 3 / 预聘期 2——递减本身就是一句评论。
    roundOpeners: ['DESK'],
    allocationSlots: 4,
    courseYearFrom: 1,
    nextPhaseId: 'crossroad_2018',
  },
  {
    kind: 'flow',
    id: 'crossroad_2018',
    label: '2018 年三月',
    date: { year: 2018, month: 3 },
    // 先选人生取向(改评分权重与导演偏好),再选路径
    steps: ['LIFE_GOAL', 'CROSSROAD'],
    // CROSSROAD 的每个选项都带 `{ jumpToPhase }`,所以这条边正常走不到。
    // 但它必须写:validate 要求每个非终局阶段都有显式路由,而"正常走不到"不等于"不会走到"。
    nextPhaseId: 'master',
  },

  // ── 学术线:硕士 → 硕士岔口 → 博士,以及直博 ────────────────
  //
  // 培养年限按真实规则:**直博 5 年;硕 3 年 + 博 3 年**。
  // M3 的学术线收在**博士毕业**——博后与教职求职季是 M5。
  applyPhase('apply_master', '投申请', 'master', 'master'),
  applyPhase('apply_phd_direct', '投申请', 'phd', 'phd_direct'),
  applyPhase('apply_phd', '投申请', 'phd', 'phd_after_master'),
  applyPhase('apply_abroad', '投申请', 'phd_abroad', 'overseas_phd'),

  gradPhase('master', '硕士', 2019, 3, [
    '研一。组会上一半的词你听不懂,而所有人都在点头。',
    '研二。你手上有了一个真正属于自己的课题,以及它做不出来的可能性。',
    '研三。该决定要不要接着读了,而这个决定的依据比你以为的少。',
  ], { nextPhaseId: 'crossroad_2021' }),
  {
    kind: 'flow',
    id: 'crossroad_2021',
    label: '2021 年三月',
    date: { year: 2021, month: 3 },
    steps: ['CROSSROAD'],
    nextPhaseId: 'phd_after_master',
  },
  gradPhase('phd_after_master', '博士', 2022, 3, [
    '博一。你已经知道课题会怎么烂掉了,这既是经验也是负担。',
    '博二。中期考核。你手上有几篇,以及几个说不清算不算活着的课题。',
    '博三。毕业要求、答辩、以及"接下来去哪"这个你回避了很久的问题。',
  ], { nextPhaseId: 'crossroad_phd' }),
  gradPhase('phd_direct', '直博', 2019, 5, [
    '直博一年级。没有硕士学位这个安全垫,中间退出就是什么都没有。',
    '直博二年级。第一个课题开始显出它真正的难度。',
    '直博三年级。中期考核。同批考研进来的人还有两年,你还有两年半。',
    '直博四年级。该有的文章还没有该有的数量。',
    '直博五年级。毕业,或者延毕。这两个词你今年会听很多次。',
  ], { nextPhaseId: 'crossroad_phd' }),

  // ── M5:博士毕业岔口 → 博后 → 求职季 → 预聘期 → 长聘首考 ──────
  //
  // 时间结构:博士 2023/2024 毕业 → 博后 2025–2026 → 求职季 2027 →
  // 预聘期 2028–2033(两年一回合 × 3)→ 首考 2034。
  // **和别的路线一样收在 2034**,所以结局页上所有人是同一个观测点。
  {
    kind: 'flow',
    id: 'crossroad_phd',
    label: '博士毕业',
    steps: ['CROSSROAD'],
    // 兜底:三个选项都带 jumpToPhase,这条只在门控全灭时才用得上
    nextPhaseId: 'left_academia',
  },
  applyPhase('apply_postdoc', '投博后', 'postdoc', 'postdoc'),
  {
    kind: 'rounds',
    id: 'postdoc',
    label: '博后',
    date: { year: 2025, month: 9 },
    rounds: 2,
    eventSlots: 2,
    // 不继承整个 grad 池。跨阶段科研事件必须在自身 pools 里显式声明 postdoc，
    // 否则“毕业、同门、换导师”之类培养期文案会跟着漏进博后。
    pools: ['postdoc'],
    briefs: [
      '博后第一年。你终于只需要做研究了,而这件事比你想的更难。',
      '博后第二年。合同还剩一年,而求职季就在今年秋天。',
    ],
    roundOpeners: ['DESK'],
    allocationSlots: 3,
    nextPhaseId: 'job_market',
  },
  {
    kind: 'flow',
    id: 'job_market',
    label: '求职季',
    date: { year: 2027, month: 9 },
    steps: ['JOB_MARKET'],
    // 求职季自己会 jumpToPhase 到 left_academia(一个都没有);
    // 拿到 offer 的走这条边进预聘期
    nextPhaseId: 'tenure_track',
  },
  {
    kind: 'rounds',
    id: 'tenure_track',
    label: '预聘期',
    date: { year: 2028, month: 9 },
    // 六年,两年一回合。
    //
    // **`allocationSlots` 是每回合的,不是每年的。** 设计写的是"预聘期每年两格",
    // 而这个阶段一回合两年,所以这里要写 4。写 2 的后果量过:六年一共只有 6 格,
    // 而首考清单有四条判定行——**六格根本同时买不起那么多行**,通过率 0%。
    // (`yearsPerRound` 和 `allocationSlots` 是两个独立的量,写的时候要一起看。)
    rounds: 3,
    yearsPerRound: 2,
    eventSlots: 3,
    // 不继承整个 grad 池。预聘期只收显式声明 tenure 的事件，避免硕博语境串阶段。
    pools: ['tenure'],
    briefs: [
      '预聘期第一、二年。搬进一间自己的办公室,然后发现要从招学生开始。',
      '预聘期第三、四年。中期考核。你第一次知道"还差多少"是一个具体的数字。',
      '预聘期第五、六年。材料要交了。这六年做过的每一件事都要写进那本册子里。',
    ],
    roundOpeners: ['DESK'],
    allocationSlots: 4,
    nextPhaseId: 'tenure_review',
  },
  {
    kind: 'flow',
    id: 'tenure_review',
    label: '长聘首考',
    date: { year: 2034, month: 6 },
    steps: ['TENURE_REVIEW'],
    nextPhaseId: 'after_tenure',
  },
  {
    kind: 'rounds',
    id: 'after_tenure',
    label: '首考之后',
    rounds: 1,
    eventSlots: 1,
    pools: ['tenure'],
    briefs: ['结果出来了。接下来的事和这六年是两回事。'],
    isFinal: true,
  },
  {
    kind: 'rounds',
    id: 'left_academia',
    label: '离开学术界',
    rounds: 1,
    eventSlots: 1,
    pools: ['left_academia'],
    briefs: ['你没有留在这条路上。这不是一句关于你的判断——那一年的市场就是那样。'],
    isFinal: true,
  },

  // ── 临床线(M4):专硕 → 执业早期 → 执业后期 ────────────────
  //
  // 注册系统那条路没有一步是可以跳过的:个案小时、督导小时、然后才是头衔。
  // 时间结构:专硕 2019–2021(与学硕同表申请,一屏四用)→ 执业 2022–2026 →
  // 2027 起两年一回合,终点 2033——与设计文档"非学术路径统一收在 2034 观测点"对齐。
  applyPhase('apply_clinical', '投申请', 'master', 'clinical_entry_2019'),
  {
    kind: 'flow',
    id: 'clinical_entry_2019',
    label: '培养方向',
    date: { year: 2019, month: 9 },
    steps: ['CROSSROAD'],
    nextPhaseId: 'clinical',
  },
  {
    kind: 'rounds',
    id: 'clinical',
    label: '应用心理专硕',
    date: { year: 2019, month: 9 },
    rounds: 3,
    // **3 不是 2:个案阶段事件每年最多占 2 个总槽**(eventSlots 是总幕数上限,M3.2 的教训)。
    // 写 2 的后果实测过:临床池的随机事件(涨价、平台、投诉……)在 800 局里几乎一个都进不来,
    // fee_level 到 1 的对局只有 7%——一整层执业内容被个案事件静默挤死,而所有检查都是绿的。
    eventSlots: 3,
    pools: ['clinical_grad', 'clinical_common'],
    briefs: [
      '研一。课表上一半是理论,另一半在教你怎么坐在一个人对面。真正的个案还轮不到你。',
      '研二。你开始在督导的注视下接实习个案。注册系统的表格上,小时数从个位数开始涨。',
      '研三。毕业论文、实习报告、以及一个问题:出去之后,案源从哪里来。',
    ],
    roundOpeners: ['DESK'],
    allocationSlots: 3,
    nextPhaseId: 'clinical_practice',
  },
  {
    kind: 'flow',
    id: 'clinical_entry_2021',
    label: '培养出口',
    steps: ['CROSSROAD'],
    nextPhaseId: 'clinical_practice',
  },
  {
    kind: 'rounds',
    id: 'clinical_practice',
    label: '执业',
    // **这个阶段有两个入口,但都落在 2021**(专硕毕业 2021 · 硕士岔口 2021.3),
    // 所以写死 2022 不会时间倒流。⚠️ 如果以后加中途转行入口(比如 2030 博后转咨询),
    // 这个 date 必须删掉、改走"沿用当前日期"——那时也要把 briefs 里的年份感一并检查。
    date: { year: 2022, month: 7 },
    rounds: 5,
    // 同上:2 个个案事件之外要留出一个槽给执业线的池子事件
    eventSlots: 3,
    pools: ['clinical_practice', 'clinical_common'],
    briefs: [
      '你挂靠了一家机构。时薪两百,机构抽走一半,来访者管你叫老师。',
      '案源开始稳定。你发现自己会在晚上十点想起下午那句没接住的话。',
      '有同行涨价了。你盯着自己的价目表看了很久,没动。',
      '你的名字开始被转介。这一行的口碑长得很慢,但它是真的在长。',
      '你在考虑要不要租一间自己的咨询室。押三付一,以及一张你自己选的沙发。',
    ],
    roundOpeners: ['DESK'],
    allocationSlots: 3,
    nextPhaseId: 'clinical_late',
  },
  {
    kind: 'rounds',
    id: 'clinical_late',
    label: '执业(成熟期)',
    date: { year: 2027, month: 1 },
    rounds: 4,
    // 两年一回合,2027 → 2033。**格数从 3 降到 2**:到了这个阶段,
    // 行业协会的事、带实习生、家里的事,都在吃你的时间——人生在收紧,临床线也一样。
    yearsPerRound: 2,
    // 同上;而且这个阶段一回合是两年,3 幕/两年反而是全线最疏的节奏
    eventSlots: 3,
    pools: ['clinical_late', 'clinical_practice', 'clinical_common'],
    briefs: [
      '你的价目表更新过几次了。新来的咨询师在朋友圈转发你几年前写的科普。',
      '有机构请你去做督导。你想起自己第一次被督导时手心出汗的样子。',
      '来访者的构成在变:更多青少年,更多"孩子不上学"的父母,更多深夜的危机电话。',
      '你数了一下,这些年坐在你对面的人,加起来比你的微信好友还多。',
    ],
    roundOpeners: ['DESK'],
    allocationSlots: 2,
    isFinal: true,
  },

  // ── 海外 PhD:不再停在“第一个学期”,六年后接回博士毕业岔口 ─────
  gradPhase('overseas_phd', '海外 PhD', 2019, 6, [
    '第一年。TA、课程和口语一起占满你的日历。',
    '第二年。资格考。你第一次用另一种语言完整 defending 一个想法。',
    '第三年。课题终于像一件自己的东西,而时差也成了日常。',
    '第四年。你开始带本科生,也开始被问毕业以后留不留下。',
    '第五年。市场、签证和论文同时进入倒计时。',
    '第六年。viva 或答辩结束后,你仍然要回答那句“接下来去哪”。',
  ], { nextPhaseId: 'crossroad_phd' }),

  // ── M6 医院线:专硕培养 → 医院早期 → 成熟期 ─────────────
  secondaryPhase('hospital_grad', '临床培养(医院方向)', 2019, 3,
    ['hospital_grad', 'hospital_common'], [
      '研一。你第一次把量表分数和病历放在同一张桌上。',
      '研二。见习轮转。心理科和精神科只隔一条走廊,边界却很清楚。',
      '研三。职称考试、招聘名额、以及那家医院今年到底招不招人。',
    ], { nextPhaseId: 'hospital_practice' }),
  secondaryPhase('hospital_practice', '医院心理科', 2022, 7,
    ['hospital_practice', 'hospital_common'], [
      '入职第一年。测评室门口每天都有人等。',
      '第二年。你开始独立做心理治疗门诊。',
      '第三年。门诊量涨了,每个人分到的时间没涨。',
      '第四年。职称材料里既要业务量,也要论文。',
      '第五年。你已经能从转诊单上看出这一天会有多长。',
      '第六年。科室让你带一个新人。',
      '第七年。你开始参与医院的危机流程和会诊制度。',
    ], { nextPhaseId: 'hospital_late' }),
  secondaryPhase('hospital_late', '医院心理科(成熟期)', 2029, 3,
    ['hospital_late', 'hospital_practice', 'hospital_common'], [
      '你成了科里那个会被叫去处理最难沟通的人的人。',
      '门诊、会诊、教学和科研考核同时排在一张表上。',
      '你回头看,这间诊室已经换过三轮年轻人。',
    ], { isFinal: true }, 2),

  // ── M6 学校线:本科/硕士两个入口,2029 汇入同一成熟期 ───────
  secondaryPhase('school', '中小学心理教师', 2019, 10,
    ['school'], Array.from({ length: 10 }, (_, i) => `入职第 ${i + 1} 年。全校两千多个学生,心理老师仍然只有你。`),
    { nextPhaseId: 'school_late' }),
  secondaryPhase('school_after_master', '中小学心理教师', 2022, 7,
    ['school'], Array.from({ length: 7 }, (_, i) => `入职第 ${i + 1} 年。硕士学历写在档案里,日常仍从值班表开始。`),
    { nextPhaseId: 'school_late' }),
  secondaryPhase('school_late', '中小学心理教师(成熟期)', 2029, 3,
    ['school', 'school_late'], [
      '你开始带区里的新心理老师。',
      '筛查、复学与危机转介被写成了一套流程。',
      '又一届学生毕业了。大多数人不会记得来过这间屋子。',
    ], { isFinal: true }, 2),

  // ── M6 企业线 ────────────────────────────────────────
  secondaryPhase('industry', '大厂用研', 2019, 10,
    ['industry'], Array.from({ length: 10 }, (_, i) => `工作第 ${i + 1} 年。研究问题跟着业务线一起换。`),
    { nextPhaseId: 'industry_late' }),
  secondaryPhase('industry_after_master', '大厂用研', 2022, 7,
    ['industry'], Array.from({ length: 7 }, (_, i) => `工作第 ${i + 1} 年。那三年硕士最先兑现成的是一份更高的职级。`),
    { nextPhaseId: 'industry_late' }),
  secondaryPhase('industry_late', '企业(成熟期)', 2029, 3,
    ['industry', 'industry_late'], [
      '你的汇报对象又换了一次。',
      '你开始决定新人该问什么问题。',
      '三十八岁。心理学仍在你的工作里,只是岗位名已经变了。',
    ], { isFinal: true }, 2),

  // ── M6 离开线:离开不是空白,也有逐年的生活 ─────────────
  secondaryPhase('left', '离开这一行', 2019, 10,
    ['left'], Array.from({ length: 10 }, (_, i) => `离开后的第 ${i + 1} 年。心理学从专业变成了你的旧背景。`),
    { nextPhaseId: 'left_late' }),
  secondaryPhase('left_after_master', '离开这一行', 2022, 7,
    ['left'], Array.from({ length: 7 }, (_, i) => `离开后的第 ${i + 1} 年。七年训练没有消失,只是换了用法。`),
    { nextPhaseId: 'left_late' }),
  secondaryPhase('left_late', '另一种生活', 2029, 3,
    ['left', 'left_late'], [
      '你已经很少用“转行”介绍自己。',
      '有人来问你当年为什么走,你给不出一句话的答案。',
      '三十八岁。那张心理学学位证还在抽屉里。',
    ], { isFinal: true }, 2),
];
