import type { GameEvent } from '@psy-sim/core';

/**
 * 大三(2017):**承诺**。你得选一边站,而且证没了。
 *
 * 这一年有两件事同时发生:咨询中心终于开门(比实验室晚了整整一年),
 * 以及**心理咨询师二级/三级资格考试被取消**。
 *
 * 后者是这一代人共同的一道疤:想做咨询的同学在群里刷屏"那我们以后考什么",
 * 而当时没有人能回答。这个节点必须做足,而且不能给玩家一个"其实还有别的证"的安慰。
 */
export const year3Events: GameEvent[] = [
  // ── 时代节点 2017:咨询师证取消(≥3 变体)────────────────
  {
    id: 'ev_era_2017_cert_gone_clinical',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_cert_abolished',
    tier: 'major',
    trigger: {
      all: [
        { year: { from: 2017, to: 2017 } },
        { any: [{ flag: 'entered_counseling_center' }, { flag: 'motive_help_people' }] },
      ],
    },
    weight: 5,
    title: '"那我们以后考什么"',
    text: '2017 年 9 月,人社部把心理咨询师职业资格退出了国家职业资格目录。\n\n专业群里从下午开始刷屏。有人贴文件,有人贴新闻,有人贴自己刚买的三级教材照片。\n\n最上面那条消息是:"那我们以后考什么?"\n\n没有人回答。因为那一年真的没有答案。',
    contextLines: [
      { text: '你书架上有一本二级教材,是大二暑假买的。' },
      { condition: { flag: 'entered_counseling_center' }, text: '你在咨询中心值班了大半年,原本打算大四考证。' },
      { condition: { flag: 'origin_illness' }, text: '你想起你当初为什么要走这条路。那件事跟证没有关系。' },
      { condition: { flag: 'promised_stable_job' }, text: '你想起过年时在饭桌上答应过的那句话。' },
    ],
    choices: [
      {
        id: 'find_another_way',
        text: '去查还有什么路径能做咨询',
        outcomes: [
          {
            weight: 2,
            text: '你查到了中国心理学会的注册系统:助理心理师、注册心理师。要求是硕士以上、督导下的个案小时数、督导小时数。\n\n**门槛比那个取消的证高得多,而且必须读研。**\n\n你把那两个数字抄在本子上:个案小时、督导小时。这两个数字后面十年都在跟着你。',
            effects: [
              { stats: { clinical: 4, method: 2, state: -3 } },
              { setFlag: 'knows_registration_system' },
              // 注册小时数/督导小时数从研究生阶段才开始真的记账(M4)。
              // 这里只让玩家**知道**这两个数字存在——本科阶段攒不到一小时。
            ],
          },
          {
            weight: 1,
            text: '你翻了一晚上,看到的全是各种机构的"国际认证""协会颁发"。价格从三千到三万。\n\n你分不清哪个是真的。**那一年谁都分不清**,而这个混乱是这个行业后来很多问题的起点。',
            effects: [
              { stats: { clinical: 2, state: -5 } },
              { setFlag: 'saw_the_cert_market' },
            ],
          },
        ],
      },
      {
        id: 'pivot_to_grad',
        text: '认了:那就必须读研',
        outcomes: [
          {
            weight: 1,
            text: '你当天晚上去查了 347 应用心理和 312 学硕的区别。\n\n证没了,但路还在,只是长了三年。这个认知比证本身重要——它让你在大三就想清楚了一件很多人到大四才想的事。',
            effects: [
              { stats: { method: 3, state: -2 } },
              { setFlag: 'committed_to_grad_school' },
              { addFlag: { key: 'exam_prep', delta: 1, min: 0, max: 6 } },
            ],
          },
        ],
      },
      {
        id: 'lose_faith',
        text: '第一次认真怀疑这条路能不能走',
        outcomes: [
          {
            weight: 2,
            text: '你那本二级教材一直放在书架上,四年没动过,搬家的时候才扔。\n\n有人从这一天开始悄悄转向别的方向:考公、大厂、教师编。他们不是不够热爱,是这一天让他们看清了这条路的成本。',
            effects: [
              { stats: { state: -6, clinical: -1 } },
              { setFlag: 'doubted_the_clinical_path' },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你在群里打了一句"其实那个证本来也没什么用",发出去之后有人回你"你说得轻巧"。\n\n你们两个说的都对。',
            effects: [{ stats: { state: -3, capital: -1 } }, { setFlag: 'doubted_the_clinical_path' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2017_cert_gone_lab',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_cert_abolished',
    trigger: { all: [{ year: { from: 2017, to: 2017 } }, { flag: 'entered_lab' }] },
    weight: 4,
    title: '群里在刷屏,而你在跑被试',
    text: '专业群从下午开始刷屏:心理咨询师资格考试取消了。\n\n你在脑电室,手上是导电膏,屏幕上是第 14 个被试的第三个 block。你抽空看了两眼手机,划了下去。\n\n晚上十点导出数据的时候,群里还在刷。有个女生发了一段很长的话，说她大一就想做咨询。\n\n你想回点什么,发现自己没什么可说的——**你早就在另一条路上了,只是你从来没有正式做过那个决定。**',
    contextLines: [
      { text: '你上一次认真想过"做咨询"这件事,是大一的时候。' },
      { condition: { flagNum: { key: 'lab_years', op: '>=', value: 2 } }, text: '你已经在这间屋子里待了两年。' },
      { condition: { flag: 'asked_who_do_you_help' }, text: '"你想帮谁"——那个问题今天又冒出来了一次。' },
    ],
    choices: [
      {
        id: 'reply_carefully',
        text: '认真给那个女生回一条',
        outcomes: [
          {
            weight: 2,
            text: '你说:"注册系统还在,但要读研。我实验室有个师姐走的是这条路,我帮你问问。"\n\n她回了一长串感谢。你确实去问了。这是你第一次给别人指路,而你自己走的是另一条。',
            effects: [
              { stats: { clinical: 2, capital: 3 } },
              { setFlag: 'knows_registration_system' },
              // 人情账的真实机制(`{ favor }`)在 M4.5。这里先用累积量记一笔,语义一致。
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
            ],
          },
          {
            weight: 1,
            text: '你打了一半删了。你意识到你其实不了解那条路——你在实验室待了两年,咨询这条路上的事你只知道个大概。\n\n你最后发了一个拍拍的表情。',
            effects: [{ stats: { state: -2, method: 1 } }],
          },
        ],
      },
      {
        id: 'keep_working',
        text: '关掉手机,把今天的数据导完',
        outcomes: [
          {
            weight: 1,
            text: '你导完了,存了三份备份,骑车回宿舍。\n\n路上你想到一件事:这三年里你从来没有做过"不做咨询"这个决定。它是被一间开着灯的实验室和一个大二的周五下午替你做掉的。',
            effects: [
              { stats: { method: 4, capital: 1, state: -2 } },
              { setFlag: 'never_chose_against_clinical' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2017_cert_gone_outsider',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_cert_abolished',
    trigger: {
      all: [
        { year: { from: 2017, to: 2017 } },
        { not: { flag: 'entered_lab' } },
        { not: { flag: 'entered_counseling_center' } },
      ],
    },
    weight: 3,
    title: '你是从别人那里知道这件事的',
    text: '你是晚上刷手机才看到的:心理咨询师资格考试取消了。\n\n群里已经吵了一整天,几百条。你从头往下翻,翻到一半就翻不动了。\n\n你既不在实验室,也不在咨询中心。你这两年上课、考试、拿了不错的绩点,参加了两个社团。这件事对你的影响是:**你不知道它对你有多大影响。**',
    contextLines: [
      { text: '你到大三还没有真正选过一边。' },
      { condition: { flagNum: { key: 'student_work_years', op: '>=', value: 2 } }, text: '你这两年主要在学生工作上,认识的老师比认识的文献多。' },
      { condition: { flag: 'family_wants_stable_job' }, text: '你爸妈从来只关心一件事:有没有编制。' },
    ],
    choices: [
      {
        id: 'wake_up',
        text: '意识到自己该做个决定了',
        outcomes: [
          {
            weight: 2,
            text: '你在纸上列了三栏:考研、考编、找工作。列完之后你发现每一栏下面你都写不出具体的下一步。\n\n**这是大三最真实的处境**,而它并不比那些早早选边的人更糟——只是留给你的时间少了一年。',
            effects: [
              { stats: { method: 2, state: -4 } },
              { setFlag: 'late_awakening' },
              { addFlag: { key: 'exam_prep', delta: 1, min: 0, max: 6 } },
            ],
          },
          {
            weight: 1,
            text: '你第二天去找了辅导员,她给你讲了本院这几年的去向统计:读研六成,考编两成,其余的什么都有。\n\n她最后说:"你现在开始不算晚。"这句话是真的。',
            effects: [
              { stats: { method: 2, capital: 2, state: -1 } },
              { setFlag: 'late_awakening' },
            ],
          },
        ],
      },
      {
        id: 'stay_out',
        text: '这跟你没关系,继续走自己的节奏',
        outcomes: [
          {
            weight: 1,
            text: '你把手机放下,继续做第二天要交的作业。\n\n你在大四会突然发现所有人手里都有一张牌,而你的牌是"绩点还不错"。那张牌能用,但不能用在所有地方。',
            effects: [{ stats: { state: 2, capital: -2 } }, { setFlag: 'no_cards_yet' }],
          },
        ],
      },
    ],
  },

  // ── 变态心理学是背 DSM ───────────────────────────────────
  {
    id: 'ev_u3_abnormal_is_dsm',
    pools: ['undergrad'],
    category: 'course',
    // **窗口而不是单点。** 普通事件只在当年 mandatory 没占满槽位时才抽得到,
    // 锁死在一个年份等于把它交给运气——3000 局里一次都没出现过。放宽成窗口它才总能落地。
    trigger: { year: { from: 2017, to: 2018 } },
    title: '所有人最期待的那门课',
    text: '变态心理学是全专业最期待的一门课。选课的时候人挤爆了,后排都坐满了。\n\n第三周你发现:这门课就是背 DSM。\n\nA 标准、B 标准、持续时间、排除条件、鉴别诊断。抑郁发作要满足九条里的五条,其中必须包含前两条之一,持续两周以上。\n\n后排的人开始变少。',
    presentationVariants: [
      {
        condition: { flag: 'college_medical' },
        title: '所有人最期待的那门课',
        text: '变态心理学。你们医学院这门课是精神科的老师来上的,而且上的是 ICD 和 DSM 两套。\n\n第三周他讲鉴别诊断,讲到一半停下来说:"你们要记住,你们以后不能下诊断。这些标准你们学,是为了知道什么时候该把人转出去。"\n\n那节课后排没有人变少,因为你们都记住了这句话的分量。',
      },
      {
        condition: { flag: 'origin_illness' },
        title: '所有人最期待的那门课',
        text: '变态心理学。第三周讲到那一章的时候,你在书上看到了一组你已经很熟悉的标准。\n\n你在心里逐条对了一遍。全对上了。\n\n你合上书,在教室里坐了一会儿,然后照常记笔记。这门课后面还有十二周。',
      },
    ],
    contextLines: [
      { text: 'DSM-5 是 2013 年出的,你们用的就是这一版。' },
      { condition: { flag: 'trait_empathic' }, text: '你有点不适应把人写成一组标准。' },
      { condition: { flag: 'trait_quant' }, text: '你反而觉得这套东西很清爽:至少它是可操作的。' },
    ],
    choices: [
      {
        id: 'memorize',
        text: '认真背。这是这一行的语言',
        outcomes: [
          {
            weight: 1,
            text: '你把九条背下来了,把鉴别诊断的表格自己重画了一遍。\n\n这套语言你后面十年都在用,而且每次修订你都得重新学一遍。',
            effects: [{ stats: { clinical: 4, method: 1, state: -2 } }],
          },
        ],
      },
      {
        id: 'resist',
        text: '反感这种把人切成条目的做法',
        outcomes: [
          {
            weight: 2,
            text: '你在课上问:"符合五条和符合四条的人,差别真的那么大吗?"\n\n老师说:"不大。但我们需要一条线,不然没法做研究,也没法报销。"\n\n她答得很诚实。你也没有更好的答案。',
            effects: [{ stats: { clinical: 3, method: 2, state: -1 } }, { setFlag: 'questions_diagnosis' }],
          },
          {
            weight: 1,
            text: '你没在课上说,但你从那学期开始去看更偏人本和叙事的东西。\n\n这条线你后来一直保留着。它让你的诊断做得慢,但让你的来访者更愿意说话。',
            effects: [{ stats: { clinical: 4, method: -1 } }, { setFlag: 'humanistic_lean' }],
          },
        ],
      },
      {
        id: 'just_pass',
        text: '就当一门要背的课,过了就行',
        outcomes: [
          {
            weight: 1,
            text: '你考了七十几分。这门课在你记忆里就是一堆标准。\n\n三年后你第一次接个案,发现你得重新学一遍——而那时候没有人给你划考试范围。',
            effects: [{ stats: { clinical: 1, state: 2 } }],
          },
        ],
      },
    ],
  },

  // ── 会谈技术:第一次给同班同学做"咨询" ───────────────────
  {
    id: 'ev_u3_first_roleplay',
    pools: ['undergrad'],
    category: 'counseling',
    tier: 'major',
    trigger: { year: { from: 2017, to: 2018 } },
    title: '会谈技术课:第一次坐在那把椅子上',
    text: '会谈技术课的作业是两人一组,一个人当来访者,一个人当咨询师,全程录像,下周课上回看。\n\n你抽到的搭档是坐在你旁边四年的那个人。\n\n他说的是他爸的事。他讲了十二分钟,你只说了七句话。其中三句是"嗯"。\n\n下课的时候你俩都有点不知道该怎么打招呼。**你突然发现你不了解这个坐在你旁边四年的人。**',
    contextLines: [
      { text: '录像回看那节课是你四年里最难熬的五十分钟。' },
      { condition: { flag: 'trait_empathic' }, text: '你当时很想抱他一下,但课程规范里写着不要有身体接触。' },
      { condition: { flag: 'trait_rigorous' }, text: '你事后逐字记录了那十二分钟,标出了自己每一次不该打断的地方。' },
    ],
    choices: [
      {
        id: 'watch_the_tape',
        text: '认真看那段录像,把自己的每个失误标出来',
        outcomes: [
          {
            weight: 2,
            text: '你数出自己打断了他四次,有两次是在他停顿的时候急着填空。\n\n老师在评语里写:"沉默是可以的。你要习惯它。"\n\n这句话你后来在督导里又听了三次,每次都是同一件事。',
            effects: [
              { stats: { clinical: 6, state: -2 } },
              { setFlag: 'learned_to_sit_with_silence' },
            ],
          },
          {
            weight: 1,
            text: '你看到自己在镜头里的样子,身体前倾、眉毛皱着、手一直在动。\n\n你意识到"共情"和"表演共情"在录像里看起来完全不一样,而你不确定自己刚才是哪一种。',
            effects: [{ stats: { clinical: 4, state: -4 } }, { setFlag: 'saw_myself_on_tape' }],
          },
        ],
      },
      {
        id: 'talk_to_him',
        text: '课后单独找他说话',
        outcomes: [
          {
            weight: 1,
            text: '你没提课上的事,只是问他最近怎么样。他说还行,然后你们聊了两小时别的。\n\n那两小时不是咨询,而这一点很重要:**他需要的不是一个咨询师,是一个知道这件事的同学。**',
            effects: [
              { stats: { clinical: 4, capital: 3, state: 2 } },
              { setFlag: 'knows_the_difference_friend_therapist' },
            ],
          },
        ],
      },
      {
        id: 'stay_technical',
        text: '把它当一次技术练习,不往心里去',
        outcomes: [
          {
            weight: 1,
            text: '你按评分表打了分,写了反思报告,拿了 88。\n\n这个处理方式是可行的,而且能保护你。只是它也会让你在很多年后仍然不太确定自己为什么做这一行。',
            effects: [{ stats: { clinical: 2, method: 2, state: 1 } }],
          },
        ],
      },
    ],
  },
];
