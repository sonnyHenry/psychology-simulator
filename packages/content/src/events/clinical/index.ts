import type { GameEvent } from '@psy-sim/core';

/**
 * 临床线事件(GAME_DESIGN 第六节 / 第十一节"独立咨询师")。
 *
 * 池子分工:
 * - `clinical_grad`     专硕三年(2019–2021)
 * - `clinical_practice` 执业早期(2022–2026;成熟期阶段也挂了这个池)
 * - `clinical_late`     执业成熟期(2027–2033)
 * - `clinical_common`   全程共用:取向、督导线、个人体验、时代节点
 *
 * 个案阶段事件不在这里(见 ./cases.ts),它们由调度器按个案状态单独挑。
 *
 * ## 伦理事件的写法(GAME_DESIGN 十四节)
 *
 * 两边都有道理、代价要具体、不评判、后果延迟。危机类严格遵守第六节规范:
 * 必有 `protocol` 选项且不亏、不写方法细节、不做"你选错了所以他出事了"的归因。
 */

export const clinicalEvents: GameEvent[] = [
  // ══════════ 取向(全程只选一次,两个入口都会经过)══════════
  {
    id: 'ev_cl_orientation',
    pools: ['clinical_common'],
    title: '你是什么取向的',
    text: '这个问题你被问过很多次,一直用"都学一点"混过去。现在你的受训时数、你的督导、你接的个案,都在逼你回答。\n\n取向不是圣经,但它决定你在会谈里**先看见什么**:想法、还是移情、还是坐在那里的那个人本身。',
    category: 'identity',
    tier: 'major',
    mandatory: true,
    trigger: { all: [{ flag: 'track_clinical' }, { not: { flag: 'chose_orientation' } }] },
    choices: [
      {
        id: 'pick_cbt',
        text: 'CBT:结构、证据、可以被验证的改变',
        outcomes: [
          {
            weight: 1,
            text: '你选了 CBT 的受训路线。议程、家庭作业、自动思维记录表。\n\n有人说它浅。你的回答是:**它是少数敢把疗效摆出来被检验的。** 这句话里有你本科四年方法课的影子。',
            effects: [
              { setFlag: 'orientation_cbt' },
              { setFlag: 'chose_orientation' },
              { stats: { clinical: 2, method: 2 } },
            ],
          },
        ],
      },
      {
        id: 'pick_dynamic',
        text: '动力学:更慢,更深,更贵',
        outcomes: [
          {
            weight: 1,
            text: '你选了动力学。这条路的规矩是硬的:个人体验一周一次做上几年,督导按小时买,起效按年算。\n\n**你要先把自己放到来访者的位置上,才有资格坐到那把椅子上。** 你的钱包从此有了一个固定的去处。',
            effects: [
              { setFlag: 'orientation_dynamic' },
              { setFlag: 'chose_orientation' },
              { stats: { clinical: 3, state: -1 } },
            ],
          },
        ],
      },
      {
        id: 'pick_humanistic',
        text: '人本:关系本身就是治疗',
        outcomes: [
          {
            weight: 1,
            text: '你选了来访者中心那一路。真诚、无条件积极关注、共情——1957 年就有人主张这几样是治疗起效的**必要且充分条件**,吵到今天还没吵完。\n\n你不确定它充分。你确定的是,没有它什么都不发生。',
            effects: [
              { setFlag: 'orientation_humanistic' },
              { setFlag: 'chose_orientation' },
              { stats: { clinical: 2, state: 1 } },
            ],
          },
        ],
      },
      {
        id: 'pick_family',
        text: '家庭系统：问题不只住在一个人身上',
        outcomes: [{
          weight: 1,
          text: '你选了家庭系统。循环因果、三角关系、代际传递。\n\n一个人的症状可能在替整个家庭维持平衡；**改变一个人，也会让整个系统重新找位置。**',
          effects: [{ setFlag: 'orientation_family' }, { setFlag: 'chose_orientation' }, { stats: { clinical: 3, capital: 1 } }],
        }],
      },
      {
        id: 'pick_act',
        text: 'ACT / 正念：带着不适，仍往重要的方向走',
        outcomes: [{
          weight: 1,
          text: '你选了 ACT 与正念路线。目标不是把每个念头消掉，而是改变人与念头的关系。\n\n**症状可以还在，生活不必等它完全离开才开始。**',
          effects: [{ setFlag: 'orientation_act' }, { setFlag: 'chose_orientation' }, { stats: { clinical: 2, state: 2 } }],
        }],
      },
      {
        id: 'pick_integrative',
        text: '整合:按来访者选工具,不按门派',
        outcomes: [
          {
            weight: 1,
            text: '你不入哪个门。焦虑用暴露,丧失用意义,关系议题看过程。\n\n整合是最难走的路:**它要求你先把每一派都学到能用,才轮得到"按人选工具"。** 学艺不精的整合有另一个名字,叫什么都不会。',
            effects: [
              { setFlag: 'orientation_integrative' },
              { setFlag: 'chose_orientation' },
              { stats: { clinical: 2, method: 1 } },
            ],
          },
        ],
      },
    ],
  },

  // ══════════ 专硕三年(2019–2021)══════════
  {
    id: 'ev_cg_hours_math',
    pools: ['clinical_grad'],
    title: '那条路有多长',
    text: '研一的某个晚上,你把注册系统的标准从头读了一遍,拿计算器算了算:个案小时、督导小时、伦理课时,然后是助理心理师,然后才是注册心理师。\n\n你算出来的年数让你在椅子上坐了一会儿。\n\n**2017 年那个被取消的证,考三个月就能拿。** 现在你面前这条路,没有一步可以跳过——这大概就是它的意义。',
    category: 'identity',
    mandatory: true,
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2019, to: 2019 } }] },
    choices: [
      {
        id: 'make_plan',
        text: '列一张到 2030 年的表',
        outcomes: [
          {
            weight: 1,
            text: '你把每一年该攒的小时数排了出来,贴在书桌前。\n\n后来你发现,这张表最大的用处不是规划,是**在你想放弃的年份告诉你已经走到哪了**。',
            effects: [{ stats: { clinical: 1, method: 1 } }],
          },
        ],
      },
      {
        id: 'one_step',
        text: '先不算总账,把眼前的小时攒了',
        outcomes: [
          {
            weight: 1,
            text: '你合上电脑。一条按十年算的路,盯着终点看会走不动。\n\n**一小时一小时地攒**——后来你发现,这一行里走得久的人,多数用的是这个算法。',
            effects: [{ stats: { state: 2 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cg_video_review',
    pools: ['clinical_grad'],
    title: '录像回看',
    text: '实务课交的会谈录像,督导当着全组的面逐句回放。\n\n"停。这里,来访者刚说完他父亲,你接的是什么?"\n\n屏幕上的你接的是一句共情套话。屏幕外的你脚趾抠紧了鞋底。',
    category: 'counseling',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { to: 2021 } }] },
    choices: [
      {
        id: 'take_notes',
        text: '把每一处停顿都记下来',
        outcomes: [
          {
            weight: 2,
            text: '那节课你记了四页。最疼的一条批注是:"**你在他的沉默里待不住,所以你说话了。**"\n\n此后很多年,每次想开口填补沉默,你都会想起这一句。',
            effects: [{ stats: { clinical: 4, state: -2 } }],
          },
        ],
      },
      {
        id: 'defend',
        text: '解释你当时为什么那么接',
        outcomes: [
          {
            weight: 1,
            text: '你解释了。督导听完,说:"你的理由都对。**但录像里的来访者在那一刻收回去了,这个你怎么解释?**"\n\n你解释不了。录像最残忍也最公平:它只放事实。',
            effects: [{ stats: { clinical: 2, state: -1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cg_cohort',
    pools: ['clinical_grad'],
    title: '你们班',
    text: '专硕班三十个人。期中聚餐,你数了一圈:准备考公的七八个,想进大厂做用研的五六个,把这三年当成"先拿个硕士文凭"的占一半。\n\n**真打算做咨询的,包括你在内,一只手数得过来。**\n\n没有人错。这个行业挣钱慢、门槛长、编制少,他们只是算得比你早。',
    category: 'social',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2020, to: 2021 } }] },
    choices: [
      {
        id: 'stay_course',
        text: '你还是想做这个',
        outcomes: [
          {
            weight: 2,
            text: '散场路上,一个要去考公的同学问你:"你是真想做咨询啊?"\n\n你说是。她说:"挺好的,以后我心理出问题了找你。"\n\n**这句玩笑话,后面十年你会听几百遍。** 而你每次都会认真地说:找我可以,但我会转介给合适的人。',
            effects: [{ stats: { clinical: 2, state: 1 } }],
          },
        ],
      },
      {
        id: 'doubt',
        text: '那天晚上你也动摇了一下',
        outcomes: [
          {
            weight: 1,
            text: '回宿舍你打开了招聘软件,看了看用研岗的薪资,又看了看简单心理上新手咨询师的定价。\n\n差距是具体的。**你关掉软件继续写个案概念化作业——但你允许自己知道了那个数字。** 知道了还留下,和不知道地留下,不是一回事。',
            effects: [{ stats: { state: -2, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cg_thesis_squeeze',
    pools: ['clinical_grad'],
    title: '论文和小时数',
    text: '研三。毕业论文卡在数据分析,而你的实习个案正在最要紧的阶段。\n\n导师说:"先毕业,个案可以以后接。"督导说:"个案不是暂停键,他每周都坐在那里。"\n\n**两个人都对。你的一周还是只有七天。**',
    category: 'counseling',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2021, to: 2021 } }] },
    choices: [
      {
        id: 'protect_cases',
        text: '保个案,论文往后压',
        outcomes: [
          {
            weight: 2,
            text: '你把个案保住了,论文写到答辩前最后一周,质量你自己清楚。\n\n答辩老师放你过了,只提了一句"仓促了"。**你选了坐在你对面的人,而不是装订成册的那一本**——这个选择你后面还会做很多次。',
            effects: [{ stats: { clinical: 3, method: -1, state: -2 } }],
          },
        ],
      },
      {
        id: 'protect_thesis',
        text: '保论文,个案降频',
        outcomes: [
          {
            weight: 2,
            text: '你和来访者商量把频率降到两周一次,论文按时写完了。\n\n复盘那次降频,督导没批评你,只说:"记住这次是怎么谈的。**以后你会不断在自己的人生和别人的人生之间排班,这是第一次。**"',
            effects: [{ stats: { method: 2, clinical: 1, state: -1 } }],
          },
        ],
      },
    ],
  },

  // ══════════ 督导与个人体验(全程)══════════
  {
    id: 'ev_cs2_bordin',
    pools: ['clinical_common'],
    title: '它有名字',
    text: '督导听你讲完个案,在白板上写了三个词:**任务。目标。纽带。**\n\n"你刚才说的\'关系还行\',拆开就是这三样:你们在做的事他认不认、要去的方向一不一致、你们之间那条线结不结实。1979 年就有人把它拆开了,叫**工作联盟**。这不是玄学,它有定义,有量表,有几十年的疗效证据——**跨流派都成立**。"\n\n你一直凭手感操作的那个东西,原来有名字。',
    category: 'counseling',
    tier: 'major',
    trigger: { all: [{ flag: 'track_clinical' }, { flagNum: { key: 'supervision_hours', op: '>=', value: 12 } }] },
    choices: [
      {
        id: 'read_it',
        text: '回去把那篇 1979 年的找出来读了',
        outcomes: [
          {
            weight: 1,
            text: '四十多年前的文章,读起来像在描述你上周的会谈。\n\n**这一行真正的地基不多,但都很结实。** 你把参考文献里另外三篇也存了下来。',
            effects: [{ stats: { clinical: 3, method: 2 } }],
          },
        ],
      },
      {
        id: 'prefer_intuition',
        text: '"我还是更信手感"',
        outcomes: [
          {
            weight: 1,
            text: '督导笑了:"手感很好。手感就是内化了的理论。\n\n**但等你带学生的时候,\'手感\'两个字没法教。** 到时候你会回来找这三个词的。"\n\n(她说对了。)',
            effects: [{ stats: { clinical: 2, state: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cs2_projection',
    pools: ['clinical_common'],
    title: '督导指出了一件事',
    text: '督导打断了你的个案汇报:"我数了一下,这个个案每次谈到父亲,你都会把话题引去别处。三次了。\n\n**你有没有发现?**"\n\n你没有发现。这正是问题所在。',
    category: 'counseling',
    presentationVariants: [
      {
        condition: { background: 'bg_illness_at_home' },
        title: '督导指出了一件事',
        text: '督导打断了你的个案汇报:"这个个案每次谈到家里生病的事,你都会很快把话题接走。接得很专业,快得不自然。\n\n**你有没有发现?**"\n\n你没有发现。那个话题,在你自己家里也没有谈完。',
      },
    ],
    trigger: { all: [{ flag: 'track_clinical' }, { flagNum: { key: 'supervision_hours', op: '>=', value: 24 } }] },
    choices: [
      {
        id: 'go_deeper',
        text: '承认,并在督导里谈下去',
        outcomes: [
          {
            weight: 2,
            text: '那次督导后半段谈的不是个案,是你。\n\n结束时督导说:"今天这半小时,比你上三门技术课都值。**咨询师的盲区不在他不懂的地方,在他绕着走的地方。**"',
            effects: [{ stats: { clinical: 4, state: -2 } }],
          },
        ],
      },
      {
        id: 'think_later',
        text: '"我回去想想"',
        outcomes: [
          {
            weight: 1,
            text: '你说回去想想。督导没有追,只说:"想的时候留意一下,**你现在对我用的,是不是也是那一招。**"\n\n你在电梯里愣了很久。',
            effects: [{ stats: { clinical: 1, state: -1 } }],
          },
        ],
      },
      {
        id: 'to_personal_therapy',
        text: '把它带进你自己的个人体验',
        visibleIf: { flagNum: { key: 'self_insight', op: '>=', value: 1 } },
        outcomes: [
          {
            weight: 1,
            text: '下一次个人体验,你把督导的话原样搬了过去。你的咨询师听完,问:"那个不能碰的话题,最早是谁定的规矩?"\n\n**督导看见你的盲区,个人体验负责问它从哪来。** 这套系统开始像它被设计的那样运转了。',
            effects: [{ stats: { clinical: 3, state: 2 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cs2_why_this_job',
    pools: ['clinical_common'],
    title: '你为什么选这行',
    text: '个人体验做到第二个年头的某一次,你的咨询师问了一个所有初始访谈都会问的问题:"你当初为什么学心理学?"\n\n你说出的答案,和你准备了十年的那个版本不一样。\n\n**你听见自己说出它的时候,才知道原来是这个。**',
    category: 'identity',
    tier: 'major',
    trigger: { all: [{ flag: 'track_clinical' }, { flagNum: { key: 'self_insight', op: '>=', value: 2 } }] },
    choices: [
      {
        id: 'sit_with_it',
        text: '在那个答案里坐一会儿',
        outcomes: [
          {
            weight: 2,
            text: '五十分钟结束,你在楼下坐了很久。\n\n没有天崩地裂。只是一些一直很重的东西,轻了一点——**不是被解决了,是被看见了。** 你终于分清了哪些是你的问题,哪些是这门学科还回答不了的问题。\n\n这大概就是你劝了别人很多年的那件事。',
            effects: [{ stats: { state: 6 } }],
          },
        ],
      },
      {
        id: 'bring_to_work',
        text: '把这份明白带回你自己的咨询室',
        outcomes: [
          {
            weight: 1,
            text: '知道自己为什么坐在这把椅子上之后,你在椅子上坐得更稳了。\n\n**动机不干净不可怕,可怕的是不知道。** 你现在知道了。',
            effects: [{ stats: { state: 4, clinical: 2 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cs2_supervisor_boundary',
    pools: ['clinical_common'],
    title: '你的督导',
    text: '同门的实习生跟你喝咖啡,犹豫了很久,说了一件事:你的督导——那个教你伦理、教你设置、在白板上写"任务目标纽带"的人——正在和一个被督导者发展督导之外的关系。\n\n**双重关系。她课上讲这四个字的时候,你记过笔记。**',
    category: 'drama',
    trigger: { all: [{ flag: 'track_clinical' }, { flagNum: { key: 'supervision_hours', op: '>=', value: 36 } }] },
    choices: [
      {
        id: 'ask_directly',
        text: '下次督导,直接问她',
        outcomes: [
          {
            weight: 2,
            text: '你问了。她沉默了很久,没有否认,只说:"这件事不该由你来处理,但你问出口是对的。"\n\n下个月她主动终止了那段督导关系,也把你转给了别的督导。**你失去了一个督导,保住了对这套体系的信任——代价是哪个更大,你说不清。**',
            effects: [{ stats: { clinical: 3, state: -3 } }],
          },
        ],
      },
      {
        id: 'switch_quietly',
        text: '什么都不说,换个督导',
        outcomes: [
          {
            weight: 2,
            text: '你用"时间冲突"的理由换了督导。没有对质,没有举报,没有波澜。\n\n新督导很好。只是每次讲到伦理课,你都会想起那杯咖啡——**你绕开了一件你认为错的事,而绕开也是一种立场。**',
            effects: [{ stats: { state: -2, clinical: 1 } }],
          },
        ],
      },
      {
        id: 'look_away',
        text: '当作不知道',
        outcomes: [
          {
            weight: 1,
            text: '二手消息,当事人没找你,圈子这么小。你说服了自己。\n\n督导照常进行,她的指导依然专业。**只是"伦理"这门课,从此你在她那里上不进去了。**',
            effects: [
              { stats: { state: -2, clinical: 1 } },
              { addFlag: { key: 'ethics_strain', delta: 1, min: 0, max: 10 } },
            ],
          },
        ],
      },
    ],
  },

  // ══════════ 时代节点:2020 疫情(临床视角,三变体)══════════
  {
    id: 'ev_era_2020_online',
    pools: ['clinical_common'],
    variantGroup: 'era_2020_clinical',
    category: 'era',
    mandatory: true,
    title: '对方正在输入…',
    text: '2020 年春天,你的个案全部转到了线上。\n\n第一次视频会谈,画面卡了三次。你盯着"对方正在输入…"看了四十秒,不知道他删掉了什么。咨询室里你赖以工作的一半信息——姿势、手、进门时的样子——都被裁掉了,只剩一张脸和一个你看不见的房间。\n\n**有的来访者在镜头里第一次哭了出来:原来隔着屏幕反而敢。** 也有的从此消失在通讯录里。',
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { year: { from: 2020, to: 2020 } },
        { caseCount: { active: true, op: '>=', value: 1 } },
      ],
    },
    choices: [
      {
        id: 'adapt',
        text: '重新学一遍怎么做咨询',
        outcomes: [
          {
            weight: 2,
            text: '你重新谈设置:摄像头的位置、家里人会不会听到、断线了怎么办。你学着从更少的信息里读更多的东西。\n\n**几个月后你承认:线上咨询不是权宜之计,它是一种要单独学的东西。** 而这门手艺,后面十年都用得上。',
            effects: [{ stats: { clinical: 4, state: -1 } }],
          },
        ],
      },
      {
        id: 'hold_until_reopen',
        text: '把能暂停的暂停,等线下恢复',
        outcomes: [
          {
            weight: 1,
            text: '你和几个个案商定暂停,留下最要紧的两个转线上。\n\n恢复线下那天,有一个没有回来。**你到现在还留着他没用完的那半盒纸巾。**',
            effects: [{ stats: { state: -3, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2020_paused',
    pools: ['clinical_common'],
    variantGroup: 'era_2020_clinical',
    category: 'era',
    mandatory: true,
    title: '停摆的实习',
    text: '2020 年春天,你的实习停了。咨询中心关门,个案还没轮到你,你在出租屋里上网课。\n\n朋友圈里,这个行业在两个方向上同时爆炸:心理援助热线缺人缺到连夜培训上岗,而线下咨询室一间间关掉。\n\n**你隔着屏幕看着这一行被需要,又插不上手。**',
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { year: { from: 2020, to: 2020 } },
        { caseCount: { active: true, op: '==', value: 0 } },
        { stat: 'clinical', op: '<', value: 52 },
      ],
    },
    choices: [
      {
        id: 'online_training',
        text: '把停摆的时间拿来受训',
        outcomes: [
          {
            weight: 2,
            text: '各家机构的工作坊都搬到了线上,还打折。你报了两个,认认真真做了笔记。\n\n**这是你唯一买得起大牌工作坊的一年。** 后来你会怀念 2020 年的价格,并为这个念头感到复杂。',
            effects: [{ stats: { clinical: 3, method: 1 } }],
          },
        ],
      },
      {
        id: 'wait_it_out',
        text: '承认这一年就是停了',
        outcomes: [
          {
            weight: 1,
            text: '你没有把隔离期过成进修期。你打游戏、给家里打电话、有几天什么都不做。\n\n复课之后督导问起,你如实说了。她说:"**一个不会停下来的人,以后接不住来访者的停下来。** 挺好。"',
            effects: [{ stats: { state: 4 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2020_hotline',
    pools: ['clinical_common'],
    variantGroup: 'era_2020_clinical',
    category: 'era',
    mandatory: true,
    title: '热线',
    text: '2020 年二月,你报名了心理援助热线。一夜培训,上岗,四小时一班。\n\n电话那头有医护,有隔离在家的人,有单纯想听到一个活人声音的人。没有摄像头,没有初始访谈,没有下一次——**你只有这一通电话的时间,和你的声音。**',
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { year: { from: 2020, to: 2020 } },
        { stat: 'clinical', op: '>=', value: 52 },
      ],
    },
    choices: [
      {
        id: 'take_shifts',
        text: '接下去,一班一班值',
        outcomes: [
          {
            weight: 2,
            text: '那两个月你值了很多班。挂断每一通电话都不知道对面后来怎么样了——热线的规则就是没有后来。\n\n**这段经历教会你的东西,教科书上那章叫"危机干预",而你以后会叫它 2020 年春天。**',
            effects: [{ stats: { clinical: 5, state: -3 } }],
          },
        ],
      },
      {
        id: 'know_your_limit',
        text: '值了几班之后,承认自己撑不住这个强度',
        outcomes: [
          {
            weight: 1,
            text: '第五班下来,你整晚没睡着。你跟组长说了,退出了排班。\n\n组长说:"知道自己的边界在哪,你比一半老手都专业。"**这句安慰是真的,你的挫败感也是真的。** 两样你都收下了。',
            effects: [{ stats: { clinical: 2, state: -1 } }],
          },
        ],
      },
    ],
  },

  // ══════════ 时代节点:2022 需求暴涨与集体耗竭(三变体)══════════
  {
    id: 'ev_era_2022_full',
    pools: ['clinical_common'],
    variantGroup: 'era_2022_clinical',
    category: 'era',
    mandatory: true,
    title: '约不上了',
    text: '2022 年,你的预约表第一次排满了。转介电话里,对方的第一句话从"你们收费多少"变成了"最早什么时候能约上"。\n\n行业报告说心理咨询需求暴涨。报告没说的是,**同一份报告的另一页写着从业者集体耗竭**——你在同行群里亲眼看着这两页同时发生。',
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { year: { from: 2022, to: 2022 } },
        { caseCount: { active: true, op: '>=', value: 2 } },
      ],
    },
    choices: [
      {
        id: 'expand',
        text: '加班加点,多接',
        outcomes: [
          {
            weight: 2,
            text: '你把午休砍了,晚上加了两个时段。收入涨了,小时数涨得更快。\n\n某个周四晚上第六个个案结束后,你在椅子上坐着,发现自己在用倒计时的方式度过会谈。**你在教科书里读过这个信号。**',
            effects: [
              { stats: { money: 20000, state: -3 } },
              { addFlag: { key: 'burnout', delta: 10, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'hold_the_line',
        text: '不再超量接人，开始让新来访者排等候名单',
        outcomes: [
          {
            weight: 2,
            text: '你把周个案量钉死,多出来的排等候名单,或者转介给靠谱的同行。\n\n**拒绝的每一个都是收入,也都是一个真的在等的人。** 你选择先保住那个能长期接住人的自己——这个决定没人给你发奖章。',
            effects: [{ stats: { state: 2, clinical: 2 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2022_burned',
    pools: ['clinical_common'],
    variantGroup: 'era_2022_clinical',
    category: 'era',
    mandatory: true,
    title: '耗竭的人接住耗竭的人',
    text: '2022 年,坐在你对面的人一半在谈耗竭:裁员的、封在家里的、撑着不敢倒的。\n\n而你自己这一年也在往下掉。某次会谈,来访者描述"每天早上睁眼那种空",你在心里说:**我知道,我今天早上就是这样。**\n\n你没有说出口。你的疲惫在这间屋子里没有座位。',
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { year: { from: 2022, to: 2022 } },
        { flagNum: { key: 'burnout', op: '>=', value: 30 } },
      ],
    },
    choices: [
      {
        id: 'get_help',
        text: '给自己找督导和个人体验,把强度降下来',
        outcomes: [
          {
            weight: 2,
            text: '你做了你会建议来访者做的全部事情:求助、减量、把休息排进日程表。\n\n**助人者先自助不是口号,是执业安全规范**——耗竭的咨询师伤到的不只是自己。这一年你算是真的学会了这句话。',
            effects: [
              { stats: { state: 4, clinical: 2 } },
              { addFlag: { key: 'burnout', delta: -12, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'push_through',
        text: '撑着。来访者比你更难',
        outcomes: [
          {
            weight: 1,
            text: '你告诉自己:他们更难,你至少还有工具。你撑过了这一年。\n\n代价在第二年春天到账:你开始在会谈前感到生理性的抗拒。**"来访者比我更难"是这一行最温柔的自我剥削。**',
            effects: [
              { stats: { state: -3, clinical: 1 } },
              { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2022_newcomers',
    pools: ['clinical_common'],
    variantGroup: 'era_2022_clinical',
    category: 'era',
    mandatory: true,
    title: '涌进来的人',
    text: '2022 年,心理咨询突然成了转行热门。你的朋友圈里,前 HR、前教培老师、前产品经理,都在晒各种"心理咨询师速成班"的结业证书。\n\n证书培训机构比咨询机构挣钱,这件事在 2017 年取消统一证书之后就是这个行业公开的秘密。**资质真空里,培训班在互相定义什么叫专业。**\n\n有个转行的朋友来问你:"这行到底怎么入?"',
    trigger: {
      all: [{ flag: 'track_clinical' }, { year: { from: 2022, to: 2022 } }],
    },
    choices: [
      {
        id: 'honest_answer',
        text: '把注册系统那条长路照实讲给他',
        outcomes: [
          {
            weight: 2,
            text: '你讲了:受训、个案小时、督导小时、个人体验,以及前几年基本不挣钱。\n\n他听完说"这么久啊",然后去报了那个 21 天的班。**你不怪他——是这个行业没有给认真的人立一块看得见的路标。** 你只是替未来坐在他对面的人捏了把汗。',
            effects: [{ stats: { clinical: 2, state: -1 } }],
          },
        ],
      },
      {
        id: 'keep_head_down',
        text: '少说,把自己的路走好',
        outcomes: [
          {
            weight: 1,
            text: '你笑笑说"挺难的",没有多讲。行业的事一个人纠正不了。\n\n**你把力气留给了自己的个案记录、自己的督导、自己的下一个小时数。** 乱世里的手艺人都是这么活下来的。',
            effects: [{ stats: { state: 2, clinical: 1 } }],
          },
        ],
      },
    ],
  },

  // ══════════ 执业早期(2022–2026)══════════
  {
    id: 'ev_cp_platform',
    pools: ['clinical_practice'],
    title: '平台',
    text: '毕业了,案源问题第一次真实地摆在面前。\n\n入驻平台:流量是平台的,定价被平台压着,抽成三到四成,但下周就能有来访者。自己攒:每一个来访者都是自己的,但"自己的来访者"现在等于零。\n\n**同行群里为这道题吵了三年,没吵出答案。**',
    category: 'social',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2022 } }] },
    choices: [
      {
        id: 'join_platform',
        text: '入驻平台,先活下来',
        outcomes: [
          {
            weight: 2,
            text: '你挂了牌。头像照片拍了四十多张才选出一张"专业但不冷漠"的。\n\n单子来得确实快。抽成划走的时候也确实疼。**你安慰自己:现在是平台在给你攒口碑,等攒够了——嗯,等攒够了再说。**',
            effects: [{ stats: { money: 10000, state: -1, clinical: 1 } }],
          },
        ],
      },
      {
        id: 'build_own',
        text: '不入驻,自己慢慢攒',
        outcomes: [
          {
            weight: 2,
            text: '你靠转介、讲座和硕士期间攒下的口碑,一个一个地攒来访者。头一年很慢,慢到你反复怀疑这个决定。\n\n**但第三年你会发现:自己攒的来访者,脱落率只有平台单的一半。** 他们是冲你来的,不是冲一个列表里的头像。',
            effects: [{ stats: { capital: 3, state: -2 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_fee_raise_1',
    pools: ['clinical_practice'],
    title: '两百,还是三百',
    text: '你的定价挂着两百,是三年前定的。同批的同行陆续涨到了三百,新来访者的咨询邮件却越来越多——**你的排期比价格先满了。**\n\n你打开定价那一栏,光标在数字上闪。',
    category: 'social',
    once: false,
    mandatory: true,
    eventSlotCost: 0,
    weight: 2,
    presentationVariants: [
      {
        condition: { historyCount: { outcomeTag: 'fee_hesitate', op: '>=', value: 1 } },
        title: '又是那一栏',
        text: '又是年底,又是这一栏。你去年就把这个页面打开过,又原样关上了。\n\n排期更满了,价目表还是两百。**同行都说你在做慈善,只有你知道你在怕什么。**',
      },
    ],
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { year: { from: 2023 } },
        { flagNum: { key: 'fee_level', op: '==', value: 0 } },
        { flagNum: { key: 'clinical_hours', op: '>=', value: 150 } },
      ],
    },
    choices: [
      {
        id: 'raise',
        text: '涨到三百,老来访者保留半年旧价',
        outcomes: [
          {
            weight: 2,
            text: '你发了调价通知,给在谈的来访者留了半年缓冲。没有人因此离开——**你怕的那件事没有发生。**\n\n发生的是另一件:收到第一笔新价格的那天,你有一种说不清的心虚。督导说:"去查查\'收费的反移情\',这是功课。"',
            effects: [{ stats: { state: -1, capital: 1 } }, { addFlag: { key: 'fee_level', delta: 1, min: 0, max: 3 } }],
          },
        ],
      },
      {
        id: 'not_yet',
        text: '再等等',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'fee_hesitate',
            text: '你把页面关了。理由很多:来访者里有学生,行情还不稳,再攒攒口碑。\n\n**真正的理由你在个人体验里才说出来:你还不太敢承认自己值这个价。**',
            effects: [{ stats: { state: -1, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_fee_raise_2',
    pools: ['clinical_practice'],
    title: '五百这道坎',
    text: '五百是这个城市咨询定价的一道心理坎:过了它,来访者的构成会变——学生几乎消失,换成了付得起也更挑剔的人。\n\n你的小时数和受训背景都够了。**问题是你想服务谁,以及每月的场地费想让你服务谁。**',
    category: 'social',
    once: false,
    mandatory: true,
    eventSlotCost: 0,
    weight: 2,
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { flagNum: { key: 'fee_level', op: '==', value: 1 } },
        { flagNum: { key: 'clinical_hours', op: '>=', value: 300 } },
      ],
    },
    choices: [
      {
        id: 'raise',
        text: '涨。同时留两个低价名额给学生',
        outcomes: [
          {
            weight: 2,
            text: '你涨到了五百,价目表最下面加了一行:全日制学生名额两个,两百。\n\n**那两个名额后来常年满着,像一根系着来路的绳子。** 有同行说你定价混乱,你没解释。',
            effects: [{ stats: { capital: 2, state: 1 } }, { addFlag: { key: 'fee_level', delta: 1, min: 0, max: 3 } }],
          },
        ],
      },
      {
        id: 'stay',
        text: '不过这道坎',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'fee_hesitate',
            text: '你留在三百。能约得起你的人群没有变,你的收入也没有变。\n\n**这是一个选择,不是一次失败**——只是每次付完咨询室的场地费,它看起来更像后者一点。',
            effects: [{ stats: { state: -1, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_fee_raise_3',
    pools: ['clinical_practice', 'clinical_late'],
    title: '排到下个月',
    text: '新的咨询申请,你能给出的最早时段在五周之后。等候名单上有十一个名字。\n\n按供需关系,你该涨到八百了。八百意味着:你和这个城市大多数普通人的一个月里,你的一小时约等于他们两天的工资。\n\n**你入行时想服务的人,和你的价格能筛出来的人,已经不是同一群了。**',
    category: 'social',
    once: false,
    mandatory: true,
    eventSlotCost: 0,
    weight: 2,
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { flagNum: { key: 'fee_level', op: '==', value: 2 } },
        // 450 不是 700:涨到第二档的人多在执业中后段,700 在时间线里基本够不到
        //(800 局实测小时数 p90 只有 746)。阈值要放回时间线里核一遍够不够得到。
        { flagNum: { key: 'clinical_hours', op: '>=', value: 400 } },
      ],
    },
    choices: [
      {
        id: 'raise',
        text: '涨到八百',
        outcomes: [
          {
            weight: 2,
            text: '你涨了。等候名单短了一半,你的时间终于回来了一些。\n\n督导那句老话又应验了:**"定价是你执业哲学的一部分,不是它的对立面。"** 你用多出来的时间做了更多督导和公益转介——至少你是这么安排的。',
            effects: [{ stats: { state: 1, capital: 2 } }, { addFlag: { key: 'fee_level', delta: 1, min: 0, max: 3 } }],
          },
        ],
      },
      {
        id: 'cap_it',
        text: '不涨了。用等候名单来限流',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'fee_hesitate',
            text: '你把价格钉在五百,让时间而不是价格做筛子。等的人依然在等,但等得起的和付得起的至少不是同一道门槛。\n\n**这个决定每年少挣的钱是一个具体的数字。你知道那个数字,并且接受它。**',
            effects: [{ stats: { state: 2, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_assistant_reg',
    pools: ['clinical_practice'],
    title: '助理心理师',
    text: '个案小时、督导小时、受训证明、伦理承诺书——你把注册系统要的材料一项一项扫描上传。研一那年你算过这条路要走多少年,现在第一站到了。\n\n几周后,系统状态变成了"通过"。**没有仪式,没有证书快递,就是网页上两个字。**',
    category: 'identity',
    tier: 'major',
    mandatory: true,
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { flagNum: { key: 'clinical_hours', op: '>=', value: 250 } },
        { flagNum: { key: 'supervision_hours', op: '>=', value: 24 } },
      ],
    },
    choices: [
      {
        id: 'tell_someone',
        text: '截图发给了一个人',
        outcomes: [
          {
            weight: 2,
            text: '你把截图发给了当年那个说"以后我心理出问题了找你"的同学。\n\n她回了一串烟花表情,然后问:"所以你现在是真的了?"\n\n**"真的"。这个行业没有一纸统一的证,你们用这个词代替。**',
            effects: [{ stats: { capital: 2, state: 3 } }, { setFlag: 'registered_assistant' }],
          },
        ],
      },
      {
        id: 'quiet',
        text: '没告诉任何人',
        outcomes: [
          {
            weight: 1,
            text: '你看了一会儿那两个字,关掉网页,给下午的个案做准备。\n\n**从 2019 年算起,这两个字用了你几年时间。** 它不需要观众,它知道自己是怎么来的。',
            effects: [{ stats: { state: 4 } }, { setFlag: 'registered_assistant' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_registered',
    pools: ['clinical_practice', 'clinical_late'],
    title: '注册心理师',
    text: '第二站。比上一站的材料厚得多:累计个案小时、持续督导记录、继续教育学时、两位注册督导师的推荐。\n\n通过名单公示那天,你在上面找到了自己的名字。**全国拿到这个身份的人,数量比很多人以为的少一个数量级。**',
    category: 'identity',
    tier: 'major',
    mandatory: true,
    trigger: {
      all: [
        { flag: 'registered_assistant' },
        // 600/48:按会谈数口径,这是执业第七八年的量。800/60 在这条时间线里
        // 只有 10% 的人够得到——门槛要高,但"几乎没人到"就成了死内容。
        { flagNum: { key: 'clinical_hours', op: '>=', value: 600 } },
        { flagNum: { key: 'supervision_hours', op: '>=', value: 48 } },
        { flagNum: { key: 'cpd_years', op: '>=', value: 2 } },
      ],
    },
    choices: [
      {
        id: 'raise_bar',
        text: '这个身份意味着更贵的责任',
        outcomes: [
          {
            weight: 2,
            text: '注册心理师这五个字上了你的简介。转介来的个案立刻重了一个量级——同行现在把他们最难的个案转给你。\n\n**头衔不是保护伞,是靶心。** 你的督导频率不降反升了。',
            effects: [{ stats: { capital: 4, clinical: 2, state: -1 } }, { setFlag: 'registered_psychologist' }],
          },
        ],
      },
      {
        id: 'thank_the_road',
        text: '你想起了 2017 年',
        outcomes: [
          {
            weight: 1,
            text: '2017 年证书取消那天,群里刷屏"那我们以后考什么"。现在你有了答案的一种:**考一条没有捷径的路。**\n\n你给当年一起刷屏的同学发了消息。她已经不做这行了,回你:"替我们把它做下去。"',
            effects: [{ stats: { capital: 3, state: 2 } }, { setFlag: 'registered_psychologist' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_agency_quota',
    pools: ['clinical_practice'],
    title: '十五到二十五',
    text: '机构开季度会,新的运营负责人把周个案量指标从 15 提到 25,理由是"隔壁机构都是这个数""需求这么大,你们空着时段是浪费"。\n\n散会后,一个入行两年的同事在楼梯间问你:"25 个正常吗?"\n\n**你知道文献里可持续案量的大致范围。它不是 25。**',
    category: 'drama',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2023 } }] },
    choices: [
      {
        id: 'comply',
        text: '接下指标',
        outcomes: [
          {
            weight: 2,
            text: '你接了。收入确实涨了,机构的排班表确实好看了。\n\n第三个月,你发现自己开始记混两个来访者的经历。**你在会谈里做的第一件事变成了确认自己没有拿错档案。**',
            effects: [
              { stats: { money: 24000, state: -4 } },
              { addFlag: { key: 'burnout', delta: 14, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'push_back',
        text: '拿着伦理守则去谈',
        outcomes: [
          {
            weight: 2,
            text: '你带着守则里"胜任力与自我照顾"那几条去找负责人。谈成了一半:你的量维持在 18,但"不配合运营"这个标签从此挂在了你身上。\n\n**季度优秀员工不会再有你。你保住的东西不在那个榜上。**',
            effects: [{ stats: { capital: -2, state: 1, clinical: 2 } }],
          },
        ],
      },
      {
        id: 'go_independent',
        text: '离开机构,自己单干',
        visibleIf: { flagNum: { key: 'fee_level', op: '>=', value: 1 } },
        outcomes: [
          {
            weight: 2,
            text: '你交了离职申请。没有底薪、没有平台、没有前台帮你排班的日子从下个月开始。\n\n**自由的定价是:所有安全感一次性结清。** 你签字的手很稳——这几年攒下的口碑和小时数,就是你的底气。',
            effects: [
              { stats: { state: -2, capital: 2 } },
              { moneyCost: { rate: 0.12, max: 15000, reason: 'other' } },
              { setFlag: 'independent_practice' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_complaint',
    pools: ['clinical_practice', 'clinical_late'],
    title: '投诉',
    text: '机构转来一封投诉信。一个结束了三个月的来访者,投诉你"引导他做出了错误的人生决定"。\n\n你把那段工作的记录翻出来复盘了三遍。**每一次会谈你都守在设置里;而他此刻的愤怒也是真的。** 这两件事同时成立,是这一行最难咽下去的一课。',
    category: 'drama',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2024 } }] },
    choices: [
      {
        id: 'formal_response',
        text: '按流程逐条回应,提交记录',
        outcomes: [
          {
            weight: 2,
            text: '你的记录写得完整——这是督导逼出来的习惯,今天它救了你。伦理工作组审议后未予处理。\n\n**程序还了你清白。没有任何程序负责修复你接下来三个月每次开门前的那半秒钟迟疑。**',
            effects: [{ stats: { clinical: 2, state: -4 } }],
          },
        ],
      },
      {
        id: 'with_supervisor',
        text: '先把它带进督导,再回应',
        outcomes: [
          {
            weight: 2,
            text: '督导陪你把整段工作走了一遍,最后说:"你没有做错什么。**现在我们谈谈更难的部分:没做错,为什么你还是觉得这么疼?**"\n\n那次督导谈的东西,比投诉本身值钱。',
            effects: [{ stats: { clinical: 3, state: -2 } }],
          },
        ],
      },
      {
        id: 'want_out',
        text: '那一晚你认真想了想转行',
        outcomes: [
          {
            weight: 1,
            text: '你打开了很久没看的招聘软件,看了一晚上用研和 HR 的岗位。\n\n第二天你还是去开了门。**想走而没走的那些夜晚,后来都成了你理解来访者的一部分**——他们也总在"再试一次"和"算了"之间过夜。',
            effects: [{ stats: { state: -3, clinical: 2 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_no_therapist',
    pools: ['clinical_practice', 'clinical_late'],
    title: '找不到一个没有双重关系的人',
    text: '你需要咨询。这个判断你给别人下过几百次,现在轮到自己,证据同样充分。\n\n然后你发现了这一行最安静的困境:**这个城市里水平够的咨询师,你都认识。** 同过学、同过督导小组、在会场加过微信。圈子小到——研究和治疗心理问题的人,自己需要帮助时,反而最难找到一个干净的咨询关系。',
    category: 'counseling',
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { any: [{ flagNum: { key: 'burnout', op: '>=', value: 32 } }, { stat: 'state', op: '<=', value: 45 }] },
      ],
    },
    choices: [
      {
        id: 'remote_therapist',
        text: '找了一个外地的,视频咨询',
        outcomes: [
          {
            weight: 2,
            text: '你在另一个城市找到一位完全不认识的咨询师。第一次视频,对方问"你为什么来",你张了张嘴,先笑了——**这个问题你问了别人十年。**\n\n然后你开始回答。像每一个终于坐下来的人一样,断断续续,词不达意。',
            effects: [{ stats: { state: 5, clinical: 1 } }, { moneyCost: { rate: 0.05, max: 12000, reason: 'other' } }],
          },
        ],
      },
      {
        id: 'peer_support',
        text: '和两个信得过的同行搭了个互助小组',
        outcomes: [
          {
            weight: 1,
            text: '三个人,每月一次,轮流当说话的那个。不是咨询,你们都清楚它不是——**但它是此刻够得着的东西。**\n\n散场时谁都不说"辛苦了",这三个字你们白天说得太多了。',
            effects: [{ stats: { state: 3, capital: 1 } }],
          },
        ],
      },
      {
        id: 'carry_on',
        text: '先撑着',
        outcomes: [
          {
            weight: 1,
            text: '你把这件事放回了"以后再说"的抽屉。那个抽屉里已经有不少东西了。\n\n**你比谁都清楚这个选择在文献里叫什么,预后如何。** 清楚,和做得到,从来是两回事——这句话也是你说给来访者听过的。',
            effects: [{ stats: { state: -3 } }, { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_office',
    pools: ['clinical_practice', 'clinical_late'],
    weight: 5,
    title: '一间自己的咨询室',
    text: '中介发来钥匙照片。五十平,朝南,离地铁站八百米。押三付一,加上装修和头半年的空窗期,数字不小。\n\n你看中它的理由和商业计划书没关系:**一间你自己选沙发、自己定规矩、没有运营指标的屋子。**',
    category: 'social',
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { flagNum: { key: 'fee_level', op: '>=', value: 2 } },
        { stat: 'money', op: '>=', value: 80000 },
      ],
    },
    choices: [
      {
        id: 'sign_it',
        text: '签',
        outcomes: [
          {
            weight: 2,
            text: '你签了。挑沙发那天比拿到任何证书都郑重——**来访者要在那上面坐很多年。**\n\n开业没有仪式。第一个来访者进门,环顾了一圈,说:"这里跟你很像。"你说谢谢,心想:这就是我要的效果,以及,房租的效果。',
            effects: [{ stats: { state: 4, capital: 2 } }, { moneyCost: { rate: 0.5, max: 90000, reason: 'house' } }, { setFlag: 'own_office' }],
          },
        ],
      },
      {
        id: 'not_yet',
        text: '再等等',
        outcomes: [
          {
            weight: 1,
            text: '你把照片存进了一个相册,相册名叫"以后"。\n\n继续用共享咨询室没什么不好:成本低,风险小。**只是每次来访者问"这里是你的地方吗",你都要解释一下。**',
            effects: [{ stats: { state: 1, money: 0, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cp_scope_creep',
    pools: ['clinical_practice', 'clinical_late'],
    title: '超出胜任范围的同行',
    text: '你转介出去的一个来访者回来了,说起他这半年在另一位咨询师那里的经历:那位同行在给他做一种他明显没有受训背景的工作,收费不低,疗程"至少两年起"。\n\n**心理咨询圈很小。** 那位同行,上个月还在行业年会上和你同桌吃饭。',
    category: 'drama',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2024 } }] },
    choices: [
      {
        id: 'talk_privately',
        text: '私下找那位同行谈',
        outcomes: [
          {
            weight: 2,
            text: '你约了咖啡,把话尽量说得像同行探讨。对方先是客气,然后冷下来:"每个人对胜任力的理解不一样。"\n\n谈崩了。**年会上你们还会同桌,只是碰杯的时候各自看向别处。** 你做了该做的事,该做的事没有全须全尾的做法。',
            effects: [{ stats: { capital: -2, clinical: 2, state: -2 } }],
          },
        ],
      },
      {
        id: 'report_ethics',
        text: '向伦理工作组反映',
        outcomes: [
          {
            weight: 1,
            text: '你整理了情况,提交了。流程走了很久,结果你无从知晓——伦理程序对外不公开。\n\n**圈子里慢慢有人知道是你。** 有人敬你,有人从此和你保持距离。你提交材料前就知道会这样,提交了。',
            effects: [{ stats: { capital: -3, state: -2, clinical: 3 } }],
          },
        ],
      },
      {
        id: 'stay_out',
        text: '管好你自己的来访者',
        outcomes: [
          {
            weight: 1,
            text: '你把回来的这位接住,做好你自己的工作。别人的执业,你没有执法权。\n\n**这个理由是成立的。它成立了很多年,在这个行业的每一个角落。** 这也是那种工作能收"两年起"的原因之一。',
            effects: [
              { stats: { state: -1, clinical: 1 } },
              { addFlag: { key: 'ethics_strain', delta: 1, min: 0, max: 10 } },
            ],
          },
        ],
      },
    ],
  },

  // ══════════ 危机(严格遵守第六节规范)══════════
  {
    id: 'ev_cc_risk_assessment',
    pools: ['clinical_practice', 'clinical_late'],
    title: '评估',
    text: '这次会谈里出现了你必须停下来评估的信号。\n\n你按受训做了该做的询问。得到的信息把风险放在"中等"附近——**而"中等"是最难的档:高了有流程接手,低了继续工作,中间这一档,判断在你,责任也在你。**\n\n没有人能替你背这个判断。',
    category: 'crisis',
    trigger: {
      all: [{ flag: 'track_clinical' }, { caseCount: { riskLevel: 'high', active: true, op: '>=', value: 1 } }],
    },
    choices: [
      {
        id: 'full_protocol',
        text: '按规程走完全部步骤',
        outcomes: [
          {
            weight: 2,
            outcomeTag: 'protocol',
            text: '结构化评估、安全计划、紧急联系人确认、会谈加密、告知督导——你把清单一项一项走完,包括那几项让气氛变得艰难的。\n\n之后的几周风险回落了。**你不知道是不是这些步骤起的作用。规程的意义就在于:你不需要赌这个答案。**',
            effects: [{ stats: { clinical: 3, state: -2 } }],
          },
          {
            weight: 1,
            outcomeTag: 'protocol',
            text: '你把清单走完了。来访者对被加密的频率和被联系的家人有情绪,接下来两次会谈都在修这段关系。\n\n**规程保护的是人,不是关系的舒适度。** 这笔账你算得清,疼是照样疼。',
            effects: [{ stats: { clinical: 3, state: -3 } }],
          },
        ],
      },
      {
        id: 'clinical_judgment',
        text: '维持原频率,加强监测',
        outcomes: [
          {
            weight: 2,
            text: '你判断维持设置、密切观察。接下来的每一周,你都在周中多想起这个个案一次。\n\n情况后来平稳了。**你的判断这次是对的——而你清楚,"这次是对的"和"这个做法是对的"不是一句话。** 你把这次判断的全过程写进了记录,拿去了督导。',
            effects: [{ stats: { clinical: 2, state: -3 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cc_duty_to_report',
    pools: ['clinical_practice', 'clinical_late'],
    title: '保密例外',
    text: '会谈进行到一半,来访者说出了一件事。那件事落在你首次会谈就讲过的那一小段话里——**"以下几种情况,我需要突破保密"。**\n\n他说完看着你。他记得那段话。他是知道着说出来的。\n\n这间屋子安静了几秒。',
    category: 'crisis',
    trigger: { all: [{ flag: 'track_clinical' }, { caseCount: { active: true, op: '>=', value: 1 } }, { year: { from: 2023 } }] },
    choices: [
      {
        id: 'follow_code',
        text: '按伦理守则处理:确认信息,启动该走的程序',
        outcomes: [
          {
            weight: 2,
            outcomeTag: 'protocol',
            text: '你先在会谈里把信息核实清楚,然后告诉他接下来会发生什么、你会怎么陪他走这一段。程序启动了。\n\n**关系没有当场断掉。** 第一次会谈讲清楚的那段话,在此刻接住了你们两个人——设置从来不是官样文章,它是为今天这种时刻写的。',
            effects: [{ stats: { clinical: 4, state: -2 } }],
          },
          {
            weight: 1,
            outcomeTag: 'protocol',
            text: '程序启动之后,他没有再来。\n\n你反复回看那次会谈的处理,督导陪你过了两遍:每一步都符合规范。**规范保住了该保住的人。它从来没有承诺过同时保住咨询关系——这两样有时候只能选一样。**',
            effects: [{ stats: { clinical: 4, state: -3 } }],
          },
        ],
      },
      {
        id: 'wait_one_session',
        text: '再约一次紧急会谈,确认你没有理解错',
        outcomes: [
          {
            weight: 2,
            text: '你在四十八小时内加了一次会谈,把那件事从头到尾核实了一遍——有一个关键细节和你最初理解的不同,处理路径因此完全不同。\n\n**多问的那一次是对的。但那四十八小时里你没有睡好:如果理解没错,这四十八小时就是代价。** 这种时间差,守则的条文帮不了你,只有督导电话能分担一半。',
            effects: [{ stats: { clinical: 3, state: -3 } }],
          },
        ],
      },
      {
        id: 'rationalize',
        text: '说服自己这不在报告范围内',
        outcomes: [
          {
            weight: 1,
            text: '你在心里替那件事找了一个不属于例外条款的解释。会谈照常继续。\n\n那个解释站得住的部分是真的,站不住的部分你没有细看。**几个月后这件事没有变成事故——你是靠运气而不是靠判断走过去的,这一点只有你自己知道。**',
            effects: [
              { stats: { state: -2, clinical: 1 } },
              { addFlag: { key: 'ethics_strain', delta: 2, min: 0, max: 10 } },
            ],
          },
        ],
      },
    ],
  },

  // ══════════ 执业成熟期(2027–2033)══════════
  {
    id: 'ev_cl2_become_supervisor',
    pools: ['clinical_late'],
    title: '换一把椅子',
    text: '一家机构发来邀请:给他们的新手咨询师做督导。\n\n你想起自己第一次被督导的样子——录像被逐句暂停,手心出汗,以及那句"你说四次,我数到六次"。\n\n**现在有人要坐到你当年那个位置上,而你要坐到那个数数的位置上。**',
    category: 'counseling',
    // 里程碑不去抢槽位:攒够小时数的人必然会收到这类邀请,这是这条线的关键岔口之一
    mandatory: true,
    trigger: {
      all: [
        { flag: 'track_clinical' },
        { flagNum: { key: 'clinical_hours', op: '>=', value: 480 } },
        { flagNum: { key: 'supervision_hours', op: '>=', value: 30 } },
      ],
    },
    choices: [
      {
        id: 'accept',
        text: '接',
        outcomes: [
          {
            weight: 2,
            text: '第一次给别人做督导,你准备了三个小时。轮到你开口时,你听见自己说出的第一句话,和你的督导当年对你说的一模一样。\n\n**这一行的传承不走文献,走这个。**',
            effects: [
              { stats: { capital: 4, clinical: 2, state: -1 } },
              { setFlag: 'becoming_supervisor' },
              { addFlag: { key: 'training_gigs', delta: 2, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'decline',
        text: '还不到时候',
        outcomes: [
          {
            weight: 1,
            text: '你回绝了,理由是自己的受训还没到那一层。对方说"你太谦虚了"。\n\n**不是谦虚。你见过太多急着换椅子的人**——这一行的年会上,头衔总是比手艺长得快。',
            effects: [{ stats: { state: 2, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cl2_teen_wave',
    pools: ['clinical_late'],
    title: '孩子们',
    text: '你的预约构成在这几年明显变了:青少年,以及被学校"建议就诊"之后手足无措的父母。\n\n筛查普查在铺开,识别出来的孩子越来越多,**接得住他们的人没有同步变多。** 你的等候名单上,未成年人的名字排到了三个月以后。\n\n电话里,一位母亲问:"能不能插个队,孩子等不了三个月。"',
    category: 'counseling',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2027 } }] },
    choices: [
      {
        id: 'triage',
        text: '按风险分级,不按来电顺序',
        outcomes: [
          {
            weight: 2,
            text: '你把等候名单改成了风险分级:高风险的先进来,稳定的往后排。这意味着你要在电话里做初筛,每一通都是一次微型评估。\n\n**插队与否不再由谁更会哀求决定。** 这是你能建的最小的一套公平。',
            effects: [{ stats: { clinical: 3, state: -2 } }],
          },
        ],
      },
      {
        id: 'train_others',
        text: '腾出时间,给学校心理老师做培训',
        outcomes: [
          {
            weight: 2,
            text: '你算了笔账:你一年最多接几十个孩子,但一个会识别、会转介的心理老师,一年能接住几百个。你砍了自己的个案量,去给区里的心理老师做培训。\n\n**杠杆在上游。** 只是每次培训结束,你都会想起自己名单上那些还在等的名字。',
            effects: [
              { stats: { capital: 3, clinical: 2, state: -1 } },
              { addFlag: { key: 'training_gigs', delta: 2, min: 0, max: 20 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cl2_email',
    pools: ['clinical_late'],
    title: '一封邮件',
    text: '一个几年前结束的来访者发来邮件。三行字:近况,一句谢谢,和一张窗台上的花的照片。\n\n按设置,结束就是结束,你们不该再有联系;按守则,回复要克制。**按你此刻的心跳,这三行字比这个月所有的咨询费加起来都重。**',
    category: 'counseling',
    trigger: { all: [{ flag: 'track_clinical' }, { caseCount: { status: 'completed', op: '>=', value: 1 } }] },
    choices: [
      {
        id: 'brief_reply',
        text: '回三行',
        outcomes: [
          {
            weight: 2,
            text: '你回了三行:收到,很高兴,祝好。删掉了第四行,又删掉了新写的第四行。\n\n**克制不是冷。克制是把这段关系继续放在它该在的位置上——包括现在。**',
            effects: [{ stats: { state: 4, clinical: 1 } }],
          },
        ],
      },
      {
        id: 'no_reply',
        text: '不回,把它存进那个文件夹',
        outcomes: [
          {
            weight: 1,
            text: '你没有回。你有一个文件夹存这样的信,很多年了,一封都舍不得删。\n\n**咨询结束后你不该知道他们过得怎么样。偶尔知道了,是这份工作发的奖金。**',
            effects: [{ stats: { state: 3 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cl2_price_of_staying',
    pools: ['clinical_late'],
    title: '还在做的人',
    text: '行业年会,你和几个 2019 年前后入行的同行凑了一桌。数了数,当年一起受训的那批人,还在接个案的不到一半:有的去做了 HR,有的专职讲课带证书班,有的彻底离开。\n\n没走的这几个,聊的话题是腰椎、档期和"你今年督导涨价没"。\n\n**没有人聊初心。初心是新手用的词,你们现在用的词是"下周三见"。**',
    category: 'social',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2029 } }, { flagNum: { key: 'casework_years', op: '>=', value: 5 } }] },
    choices: [
      {
        id: 'toast',
        text: '举杯,敬还坐在椅子上的',
        outcomes: [
          {
            weight: 2,
            text: '有人举杯说"敬还在做的"。你们碰了杯,没有人多说什么。\n\n**留下来不是因为比走的人更有情怀——多数时候只是那个星期三下午,有人在等,你就去了。一去去了十年。**',
            effects: [{ stats: { state: 3, capital: 1 } }],
          },
        ],
      },
      {
        id: 'ask_the_left',
        text: '散场后,你给一个离开的人发了消息',
        outcomes: [
          {
            weight: 1,
            text: '你问她现在怎么样。她说挺好的,不熬人了,收入翻倍,"就是偶尔梦见还在接个案,醒来分不清是噩梦还是想念"。\n\n你说我懂。**你们一个在行内一个在行外,做的是同一个梦。**',
            effects: [{ stats: { state: 2, clinical: 1 } }],
          },
        ],
      },
    ],
  },

  // ══════════ 公共杂项 ══════════
  {
    id: 'ev_cl_family_ask',
    pools: ['clinical_common'],
    title: '"你给看看"',
    text: '过年饭桌上,亲戚把她上初中的儿子推到你面前:"你不是学这个的吗,给看看,他最近老是关着门。"\n\n孩子低着头。全桌人都在看你。\n\n**你知道三件事:不能给亲属做咨询;饭桌不是会谈室;以及此刻任何专业术语都会变成这个孩子的罪名。**',
    category: 'social',
    trigger: { flag: 'track_clinical' },
    choices: [
      {
        id: 'protect_the_kid',
        text: '把话接过来,替孩子挡掉这一轮',
        outcomes: [
          {
            weight: 2,
            text: '"关着门挺正常的,我初中也这样。"你把话题岔开,转头跟孩子聊了两句游戏。\n\n散席时你单独跟他妈妈说:如果真的担心,可以去哪儿、怎么挂号、说什么。**双重关系的边界你守住了,该给的路标也给了。** 这套分寸,教科书管它叫伦理,亲戚管它叫"你怎么这么见外"。',
            effects: [{ stats: { clinical: 2, state: -1 } }],
          },
        ],
      },
      {
        id: 'lecture_mode',
        text: '认真科普一下为什么不能"给看看"',
        outcomes: [
          {
            weight: 1,
            text: '你讲了双重关系,讲了设置,讲了为什么饭桌上做不了这件事。亲戚听完点头:"就是说你不给看。"\n\n**你说的每一句都对,加起来等于零。** 那孩子倒是抬头看了你一眼——那一眼像是感谢。',
            effects: [{ stats: { state: -2, clinical: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_cl_era_ai',
    pools: ['clinical_common'],
    category: 'era',
    title: '"AI 会取代咨询师吗"',
    text: '2023 年之后,每一个饭局都有人问你这个问题。\n\n来访者也在问。有一个直接把和聊天机器人的对话记录拿给你看:"它凌晨三点秒回,还不要钱。你觉得它说得对吗?"\n\n你看了。**它说得还行。这是最让你睡不着的部分。**',
    trigger: { all: [{ flag: 'track_clinical' }, { year: { from: 2023, to: 2026 } }] },
    choices: [
      {
        id: 'take_it_seriously',
        text: '认真读了那段对话,和他讨论',
        outcomes: [
          {
            weight: 2,
            text: '你们把那段对话当材料用了半次会谈。它共情的部分确实标准,标准得像会谈技术课的示范录像。\n\n"那你为什么还来?"你问。他想了想:"它记不住我。每次都要重新讲。"\n\n**你记住了这个答案。这可能是这个行业未来十年的答案之一。**',
            effects: [{ stats: { clinical: 3, method: 1 } }],
          },
        ],
      },
      {
        id: 'uneasy',
        text: '嘴上说不会,心里没底',
        outcomes: [
          {
            weight: 1,
            text: '你给出了标准答案:治疗关系无法替代。饭桌上的人满意了。\n\n晚上你自己试了试那个机器人,聊了四十分钟。**它接不住沉默,不会在你绕开话题时数你绕开了几次。暂时。** 你关掉对话框,把"暂时"两个字记在了心里。',
            effects: [{ stats: { state: -1, method: 1, clinical: 1 } }],
          },
        ],
      },
    ],
  },
];
