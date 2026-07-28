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
 * ## 当前边界(M3)
 * **学术线已经铺到博士毕业**:硕士 3 年 → 硕士岔口 → 博士 3 年,以及直博 5 年。
 * 培养年限按真实规则设定。博后与教职求职季是 M5,所以博士毕业就是学术线现在的终点。
 *
 * 其余五条路径仍是一个回合的"2018 年之后"快照:临床线是 M4,二级线是 M6。
 *
 * 保留这些快照而不是留空,是为了让 `validate` 的阶段图连通性/可终止性和
 * `simulate --check` 的结局分布门禁**从现在起就在真的查东西**——不用等到 M5 才发现路由有洞。
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
function pathStub(
  id: string,
  label: string,
  brief: string,
): Extract<PhaseConfig, { kind: 'rounds' }> {
  return {
    kind: 'rounds',
    id,
    label,
    rounds: 1,
    eventSlots: 0,
    pools: [],
    briefs: [brief],
    isFinal: true,
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
  ], { isFinal: true }),
  gradPhase('phd_direct', '直博', 2019, 5, [
    '直博一年级。没有硕士学位这个安全垫,中间退出就是什么都没有。',
    '直博二年级。第一个课题开始显出它真正的难度。',
    '直博三年级。中期考核。同批考研进来的人还有两年,你还有两年半。',
    '直博四年级。该有的文章还没有该有的数量。',
    '直博五年级。毕业,或者延毕。这两个词你今年会听很多次。',
  ], { isFinal: true }),

  // ── 临床线(M4):专硕 → 执业早期 → 执业后期 ────────────────
  //
  // 注册系统那条路没有一步是可以跳过的:个案小时、督导小时、然后才是头衔。
  // 时间结构:专硕 2019–2021(与学硕同表申请,一屏四用)→ 执业 2022–2026 →
  // 2027 起两年一回合,终点 2033——与设计文档"非学术路径统一收在 2034 观测点"对齐。
  applyPhase('apply_clinical', '投申请', 'master', 'clinical'),
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

  // ── 其余四条路径(M6 展开)──────────────────────────────
  pathStub('overseas_phd', '海外 PhD', '你拖着两个箱子落地。六年,一个没有人认识你的地方。'),
  pathStub('school', '中小学心理教师', '你考上了教师编。全校两千一百个学生,心理老师一个。'),
  pathStub('industry', '大厂用研', '你入职了。工位在十七楼,你的组叫"用户研究"。'),
  pathStub('left', '离开这一行', '你去做了别的。这些年不算白读,你只是不在这条路上了。'),
];
