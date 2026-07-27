import type { GameEvent } from '@psy-sim/core';

/**
 * 大二(2016):**分水岭**。两座大山 + 教科书原来会错。
 *
 * 这一年有全游戏少见的一个**纯粹正向时刻**:上完统计课之后的某一天,
 * 你第一次真正看懂了一篇论文的结果部分。那是学科认同的诞生时刻,
 * 所以它是 `tier: 'major'`。
 *
 * 也是这一年,可重复性危机爆发。你刚上完实验心理学,第一次意识到**教科书可以错**。
 * 这两件事必须挨在一起发生——先给认同,再给怀疑,顺序反了就只剩虚无。
 */
export const year2Events: GameEvent[] = [
  // ── 大二的高光:第一次读懂结果部分 ───────────────────────
  {
    id: 'ev_u2_first_read_results',
    pools: ['undergrad'],
    category: 'method',
    mandatory: true,
    tier: 'major',
    // 得先上过统计。没投入过统计课的人这一年读不懂,这个时刻会晚一年到,或者永远不到。
    trigger: { all: [{ year: { from: 2016, to: 2016 } }, { stat: 'method', op: '>=', value: 45 }] },
    order: 20,
    title: '你第一次看懂了结果部分',
    text: '一个普通的下午,你在图书馆读一篇英文文献。读到 Results 那一节,你本来准备像往常一样跳过去。\n\n然后你发现你没跳。\n\n"F(2, 87) = 6.34, p = .003, η² = .13"——你知道这行字在说什么了。你知道那两个数字是自由度,知道 87 意味着他们大概招了 90 个人,知道 η² = .13 是个不小的效应,也知道为什么作者在下一句要提 Bonferroni 校正。\n\n你把那一页翻回去又读了一遍,不是因为没读懂,是因为读懂了。',
    contextLines: [
      { text: '这一刻不会出现在任何一张成绩单上。' },
      { condition: { flag: 'mastered_stats' }, text: '那门课你是真的学通了,现在它开始还你东西。' },
      { condition: { flag: 'college_education' }, text: '你们的统计课教得浅,所以这一步你是自己多补了两周才走到的。' },
      { condition: { flag: 'reads_outside_syllabus' }, text: '你想起大一那年自己找的那些书。它们里面一个数字都没有。' },
    ],
    choices: [
      {
        id: 'keep_reading',
        text: '把这篇从头到尾读完',
        outcomes: [
          {
            weight: 1,
            text: '你读到了 Discussion,发现作者自己承认样本是大学生、效应可能不能推广。\n\n那天你在图书馆待到关门。走出去的时候你第一次觉得自己是这一行的人——不是学这个专业的学生,是这一行的人。',
            effects: [
              { stats: { method: 6, state: 5 } },
              { setFlag: 'became_an_insider' },
            ],
          },
        ],
      },
      {
        id: 'tell_someone',
        text: '发消息告诉一个人',
        outcomes: [
          {
            weight: 2,
            text: '你发给了实验室的师姐。她回了一句"欢迎入坑",后面跟着一个表情。\n\n你盯着那四个字看了一会儿。',
            effects: [
              { stats: { method: 4, capital: 3, state: 4 } },
              { setFlag: 'became_an_insider' },
            ],
          },
          {
            weight: 1,
            text: '你发给了高中同学,想解释这件事为什么让你高兴。打了三行字,删了,最后发的是"没事"。\n\n有些高兴是没法翻译的。这也是这一行的一部分。',
            effects: [
              { stats: { method: 4, state: 2 } },
              { setFlag: 'became_an_insider' },
              { setFlag: 'hard_to_explain_to_outsiders' },
            ],
          },
        ],
      },
    ],
  },

  // ── 时代节点 2015/2016:可重复性危机(≥3 变体)──────────
  {
    id: 'ev_era_2016_replication_lab',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_replication_crisis',
    trigger: { all: [{ year: { from: 2016 } }, { flag: 'entered_lab' }] },
    weight: 4,
    tier: 'major',
    title: '组会上有人念了那篇 Science',
    text: '组会最后十分钟,师兄放了一张幻灯片:一百个心理学实验,只有三十几个重复出来了。\n\n"Estimating the reproducibility of psychological science."\n\n屋子里没有人说话。导师看了一会儿,说:"我们组的那个 priming 实验,先别做了。"',
    contextLines: [
      { text: '你上个月刚背完的那本教材里,有一整节讲的就是这类效应。' },
      { condition: { flag: 'mastered_exp' }, text: '你想起实验心理学课上讲的混淆变量。原来那不是考试题,那是在讲这个。' },
      { condition: { flag: 'trait_skeptic' }, text: '你有一种说不上来的感觉:终于有人把这件事说出来了。' },
    ],
    choices: [
      {
        id: 'ask_which_textbook',
        text: '举手问:那我们教材里那些效应,哪些是真的?',
        visibleIf: { not: { flag: 'trait_pleaser' } },
        outcomes: [
          {
            weight: 2,
            text: '导师说:"这个问题很好,但我现在没法回答你。"\n\n他不是在打太极。他真的不知道——那一年没有人知道。',
            effects: [{ stats: { method: 5, state: -3 } }, { setFlag: 'knows_textbooks_can_be_wrong' }],
          },
          {
            weight: 1,
            text: '师兄接过话:"你自己去查每个效应的重复研究。这个习惯你现在养成,比多发两篇文章有用。"\n\n他说得对,而且这句话你后来说给了你自己的学生。',
            effects: [
              { stats: { method: 7, capital: 1, state: -2 } },
              { setFlag: 'knows_textbooks_can_be_wrong' },
              { setFlag: 'checks_replications' },
            ],
          },
        ],
      },
      {
        id: 'stay_quiet',
        text: '不说话,回去把自己在做的那个实验重新看一遍',
        outcomes: [
          {
            weight: 1,
            text: '你翻出自己那份实验设计,发现里面有两个地方是照着一篇 2011 年的文章抄的。\n\n你去查了那篇文章有没有被重复过。没有查到任何结果——不是失败,是从来没有人试过。',
            effects: [
              { stats: { method: 4, state: -4 } },
              { setFlag: 'knows_textbooks_can_be_wrong' },
              { setFlag: 'checks_replications' },
            ],
          },
        ],
      },
      {
        id: 'trust_the_field',
        text: '觉得这是个别现象,主流的东西应该没问题',
        outcomes: [
          {
            weight: 1,
            text: '你把幻灯片当成一个新闻记住了,没往心里去。\n\n这个判断在接下来的四年里会被反复挑战。有些人一直没改,而他们里面也有人做得很不错。',
            effects: [{ stats: { method: 1, state: 3 } }, { setFlag: 'trusts_the_literature' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2016_replication_class',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_replication_crisis',
    trigger: { all: [{ year: { from: 2016, to: 2016 } }, { not: { flag: 'entered_lab' } }] },
    weight: 3,
    title: '老师讲了一节课之外的东西',
    text: '实验心理学课快下课的时候,老师把 PPT 关了。\n\n"讲点跟考试无关的。去年有个大规模重复研究,一百个实验只有三分之一重复成功。你们书上写的很多效应,现在是有争议的。"\n\n有人问:"那考试还考吗?"\n\n老师说:"考。但我希望你们知道,考试和真的是两件事。"',
    contextLines: [
      { text: '下课铃响了,教室里一半人已经在收书包。' },
      { condition: { flag: 'trait_skeptic' }, text: '你留在座位上,想再问点什么。' },
      { condition: { flag: 'accepted_the_discipline' }, text: '大一那次你刚说服自己接受这门学科的样子,现在它又变了一次。' },
    ],
    choices: [
      {
        id: 'stay_after',
        text: '下课后留下来问她具体是哪些效应',
        outcomes: [
          {
            weight: 2,
            text: '她给你列了三个,然后说:"你去 Google Scholar 上把这三个的重复研究都找出来,下周告诉我你发现了什么。"\n\n这是你第一次做真正的文献工作,而且没有任何学分。',
            effects: [
              { stats: { method: 6, state: -2 } },
              { setFlag: 'knows_textbooks_can_be_wrong' },
              { setFlag: 'checks_replications' },
            ],
          },
          {
            weight: 1,
            text: '她说:"你先把这门课学好。等你能自己读懂方法部分,再来问这个问题。"\n\n这句话有点扎人,但它是对的。',
            effects: [{ stats: { method: 3, state: -3 } }, { setFlag: 'knows_textbooks_can_be_wrong' }],
          },
        ],
      },
      {
        id: 'only_exam',
        text: '记下来"这个考",然后继续复习',
        outcomes: [
          {
            weight: 1,
            text: '你在笔记边上写了"重复性危机(可能考名词解释)"。\n\n期末确实考了。你答对了,但你当时并不真的知道它意味着什么。',
            effects: [{ stats: { method: 2, state: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2016_replication_online',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_replication_crisis',
    trigger: { all: [{ year: { from: 2016, to: 2016 } }, { flag: 'reads_outside_syllabus' }] },
    weight: 4,
    title: '你在网上刷到了那篇报道',
    text: '一个科普号发了篇文章:《你读过的心理学畅销书,一半的结论可能不成立》。\n\n下面点名了几个效应。其中两个,正好是你大一那年自己找书看时候记得最牢的。',
    contextLines: [
      { text: '评论区有人说"所以心理学根本不是科学"。有人在跟他吵。' },
      { condition: { flag: 'motive_help_people' }, text: '你想的不是这门学科的名声,是那些照着这些书去调整自己生活的人。' },
    ],
    choices: [
      {
        id: 'verify_yourself',
        text: '自己去查原始文献',
        outcomes: [
          {
            weight: 2,
            text: '你花了一个周末,查到其中一个效应的原始样本是 41 个人,重复研究做了 2000 人,没有重复出来。\n\n你把那本畅销书从书架上拿下来,没扔,放到了最下面一层。',
            effects: [
              { stats: { method: 6, state: -3 } },
              { setFlag: 'knows_textbooks_can_be_wrong' },
              { setFlag: 'checks_replications' },
            ],
          },
          {
            weight: 1,
            text: '你查了两小时就放弃了——原文你读不下来,方法部分全是看不懂的词。\n\n你意识到"自己判断"这件事需要一套你还没有的技能。那天你去把统计课的作业补了。',
            effects: [{ stats: { method: 4, state: -2 } }, { setFlag: 'knows_textbooks_can_be_wrong' }],
          },
        ],
      },
      {
        id: 'defend_online',
        text: '在评论区跟人争"心理学是科学"',
        outcomes: [
          {
            weight: 1,
            text: '你打了三百字,有人回你"你才大二"。你确实才大二。\n\n你把那条评论删了,然后有点想不通:为什么替这门学科说话这么费劲。',
            effects: [{ stats: { state: -4, capital: 1 } }, { setFlag: 'defended_the_field' }],
          },
        ],
      },
      {
        id: 'shelve_it',
        text: '关掉,不想了',
        outcomes: [
          {
            weight: 1,
            text: '你划走了。这几年你会遇到很多次这种时刻,而"先不想"也是一种真实的处理方式。\n\n只是它会攒起来。',
            effects: [{ stats: { state: 2, method: -1 } }, { addFlag: { key: 'burnout', delta: 3, min: 0, max: 100 } }],
          },
        ],
      },
    ],
  },

  // ── 时代节点 2016 下:权力姿势与预注册(≥3 变体)─────────
  {
    id: 'ev_era_2016_power_pose_lab',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_power_pose',
    trigger: { all: [{ year: { from: 2016 } }, { flag: 'entered_lab' }] },
    weight: 3,
    order: 30,
    title: '"预注册"这个词第一次出现在组会上',
    text: '师姐讲完她的新设计,导师问:"你打算预注册吗?"\n\n屋子里有人不知道那是什么。导师解释了两句:在收数据之前把假设和分析方案登记出去,之后不能改。\n\n有人小声说:"那要是结果不显著怎么办?"\n\n导师说:"那就是不显著。"',
    contextLines: [
      { text: '这是你第一次听见有人把"不显著"说得这么平常。' },
      { condition: { flag: 'trait_perfectionist' }, text: '你在想:那万一我的假设本来就写错了呢。' },
    ],
    choices: [
      {
        id: 'embrace',
        text: '觉得这是对的,记下来以后自己也这么做',
        outcomes: [
          {
            weight: 1,
            text: '你把 OSF 的网址抄在笔记本第一页。\n\n后来你有一半的课题预注册了,另一半没有。原因每次都很具体,而且每次都说得通。',
            effects: [{ stats: { method: 5, state: -1 } }, { setFlag: 'knows_preregistration' }],
          },
        ],
      },
      {
        id: 'worry',
        text: '担心它会让课题更难发出去',
        outcomes: [
          {
            weight: 1,
            text: '你私下问师姐这个问题。她说:"会。但你想想那些发出来又重复不出来的,他们现在什么处境。"\n\n这个回答没有让你更轻松。',
            effects: [{ stats: { method: 3, state: -3 } }, { setFlag: 'knows_preregistration' }],
          },
        ],
      },
      {
        id: 'not_my_problem',
        text: '你还只是搬砖的,这事跟你没关系',
        outcomes: [
          {
            weight: 1,
            text: '你继续贴电极帽。这是对的——大二的你确实还没有需要做这个决定的位置。\n\n只是三年之后你会需要,而那时候没有人再解释一遍。',
            effects: [{ stats: { method: 1, capital: 2 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2016_power_pose_class',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_power_pose',
    trigger: { all: [{ year: { from: 2016, to: 2016 } }, { not: { flag: 'entered_lab' } }] },
    weight: 3,
    order: 30,
    title: '那个 TED 演讲被撤了一半',
    text: '社会心理学课上,老师放了一个很有名的 TED 演讲片段:站成有力量的姿势两分钟,你的激素水平和自信都会改变。\n\n放完之后她说:"这个效应的重复研究失败了。原作者之一已经公开说不再相信自己那篇文章的结论。"\n\n有人说:"那她为什么还在讲?"',
    contextLines: [
      { text: '那个 TED 演讲有几千万播放量。你室友的手机壳上就写着那句话。' },
      { condition: { flag: 'trait_communicator' }, text: '你在想一个很实际的问题:科普讲错了,该怎么收回来。' },
    ],
    choices: [
      {
        id: 'think_about_science_comm',
        text: '想这件事:科普该怎么处理"后来发现是错的"',
        outcomes: [
          {
            weight: 2,
            text: '你没得出结论,但你从此对"研究表明"这四个字过敏。\n\n这个过敏后来救了你几次。',
            effects: [{ stats: { method: 4, state: -1 } }, { setFlag: 'wary_of_pop_science' }],
          },
          {
            weight: 1,
            text: '你课后跟老师聊了十分钟。她说:"公开承认自己错了的那个人,其实是这件事里最值得尊敬的。"\n\n你记住了这句话,虽然要很多年才真正理解它。',
            effects: [
              { stats: { method: 3, clinical: 2, state: 1 } },
              { setFlag: 'wary_of_pop_science' },
            ],
          },
        ],
      },
      {
        id: 'tell_roommate',
        text: '回去告诉室友他手机壳上那句话是错的',
        outcomes: [
          {
            weight: 1,
            text: '他说:"我知道啊,但我觉得挺励志的。"\n\n你没接着说。这是你第一次遇到"事实正确"和"对方需要"不在同一边。',
            effects: [{ stats: { clinical: 3, method: 1, state: -1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2016_power_pose_skeptic',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_power_pose',
    // 第三个变体。门控用**开局就有**的特质,所以它的条件不会晚于窗口——
    // 这是给变体池选门控条件时的一条纪律:门控要么在窗口之前就已定,要么这个变体等不到。
    trigger: { all: [{ year: { from: 2016, to: 2016 } }, { flag: 'trait_skeptic' }] },
    weight: 5,
    order: 30,
    title: '你在课上问了一个让场面安静的问题',
    text: '社会心理学课上讲到那个很有名的姿势研究。你举手问:"那篇的样本量是多少?"\n\n老师翻了一下 PPT,说:"这个我没记。"\n\n后排有人小声笑了一下——不是笑老师,是笑你居然问这个。\n\n下课的时候你自己去查了。**42 个人。**',
    contextLines: [
      { text: '你以后还会在很多屋子里问这类问题,而场面每次都会安静一下。' },
      { condition: { flag: 'entered_lab' }, text: '实验室的师兄跟你说过,这个习惯"比多发两篇文章有用"。' },
    ],
    choices: [
      {
        id: 'keep_asking',
        text: '以后继续问。这是你能提供的价值',
        outcomes: [
          {
            weight: 2,
            text: '你成了那个"总是问样本量的人"。\n\n**这个标签让你不太受欢迎,但它让你被记住,而且被记住的方式是"他不会让你把话说过头"。** 十年后有人专门找你审稿,就是因为这个。',
            effects: [
              { stats: { method: 6, capital: -2 } },
              { setFlag: 'known_for_asking' },
              { setFlag: 'knows_textbooks_can_be_wrong' },
            ],
          },
          {
            weight: 1,
            text: '你继续问了几次,然后发现有个老师开始不太点你回答问题。\n\n你没有停,但你学会了换个说法:"我想确认一下方法部分。"**同一件事,包装一下,阻力小很多**——这个技巧的道德性你想了很久。',
            effects: [
              { stats: { method: 5, capital: 1 } },
              { setFlag: 'known_for_asking' },
              { setFlag: 'learned_to_package_it' },
            ],
          },
        ],
      },
      {
        id: 'learn_the_room',
        text: '以后私下问,不在课上问',
        outcomes: [
          {
            weight: 1,
            text: '你下课去问,老师认真回答了,而且后来还给你推了两篇方法学文章。\n\n**私下问的信息回报更高,代价是没有人知道你会问。** 而"有人知道你会问"在这一行是一种真实的资本。',
            effects: [
              { stats: { method: 4, capital: 2 } },
              { setFlag: 'knows_textbooks_can_be_wrong' },
            ],
          },
        ],
      },
      {
        id: 'let_it_go',
        text: '算了,后排那个笑声让你不想再问',
        outcomes: [
          {
            weight: 1,
            text: '你那学期没再举过手。\n\n**这件事本身很小**,而这一行有很多人的怀疑精神就是这么被一两声笑消掉的。它不会出现在任何一份记录里。',
            effects: [
              { stats: { method: 1, state: -3 } },
              { addFlag: { key: 'burnout', delta: 4, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_u_stats_recompute',
    pools: ['undergrad'],
    category: 'method',
    // **从变体池里拿出来了。** 它要 `mastered_stats`,而学通在学年末才写入;
    // 留在 `era_power_pose` 组里意味着同组的别的变体已经在 2016 触发、把这个组关掉了,
    // 它永远等不到自己的窗口。**"条件永远晚于窗口"是变体池最容易出的一种 bug**,
    // 而且它不报错、只表现为"这个变体从来没人见过"。
    trigger: { all: [{ year: { from: 2017 } }, { flag: 'mastered_stats' }] },
    weight: 5,
    title: '你算了一遍那篇文章的效应量',
    text: '你在图书馆里把那篇被重复失败的经典文章翻出来,自己算了一遍。\n\n42 个被试。t 检验。p = .045。\n\n你算了一下达到 80% 检出力需要多少人。数字出来的时候你在纸上圈了三遍:**需要将近 200 个**。\n\n这篇文章上过教材。',
    contextLines: [
      { text: '你旁边的人在背这本教材,准备两周后的期末考试。' },
      {
        condition: { flag: 'mastered_adv_stats' },
        text: '你顺手又算了它的置信区间。上过高级统计之后,这一步已经变成肌肉记忆。',
      },
      {
        condition: { flag: 'mastered_calculus' },
        text: '检出力那个公式你是自己推的——大一那学期被高数虐过的人,在这里会突然占一次便宜。',
      },
      { condition: { flag: 'checks_replications' }, text: '这已经是你这个月查的第三篇了。' },
    ],
    choices: [
      {
        id: 'write_it_down',
        text: '把这个算法记下来,以后每篇都算一遍',
        outcomes: [
          {
            weight: 1,
            text: '你从此有了一个习惯:看到一个结论,先看 n 是多少。\n\n这个习惯让你在后来的组会上不太受欢迎,但它从来没有害过你。',
            effects: [
              { stats: { method: 8, capital: -2 } },
              { setFlag: 'checks_power' },
              { setFlag: 'knows_textbooks_can_be_wrong' },
            ],
          },
        ],
      },
      {
        id: 'tell_the_teacher',
        text: '拿去问任课老师',
        outcomes: [
          {
            weight: 2,
            text: '老师看了一眼,说:"你算得对。"然后停了一下:"这本教材我们用了十二年。"\n\n那节课之后她在群里发了一份补充材料。',
            effects: [
              { stats: { method: 6, capital: 3, state: 1 } },
              { setFlag: 'checks_power' },
              { setFlag: 'knows_textbooks_can_be_wrong' },
            ],
          },
          {
            weight: 1,
            text: '老师说:"当年的标准跟现在不一样,你不能拿今天的尺子去量。"\n\n这句话一半是对的。你花了几年才想清楚是哪一半。',
            effects: [
              { stats: { method: 4, state: -2 } },
              { setFlag: 'checks_power' },
            ],
          },
        ],
      },
    ],
  },
];
