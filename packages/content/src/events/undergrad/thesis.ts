import type { GameEvent } from '@psy-sim/core';

/**
 * 毕业论文:课题管线的教学关(GAME_DESIGN 8.6)。
 *
 * 四个真实决策:
 * 1. 导师给你一个题 / 你自己提一个
 * 2. 用师兄剩下的数据 / 自己收
 * 3. **第一次遇到 `p = .08`**
 * 4. 盲审与答辩
 *
 * ## 第 3 条是全游戏最重要的教学时刻
 *
 * 它要写得**毫无戏剧性**——因为现实中它就毫无戏剧性。你只是加了 20 个被试再看一眼,
 * 或者换了个假设写。**没有人告诉你这是一件严重的事,也没有人阻止你。**
 * `integrity_risk` 从这里开始记账。
 *
 * ## 为什么用 schedule 串成链
 *
 * 五个阶段要在**同一个学年**里走完(大四只有一个回合),而事件抽取只在回合开始做一次。
 * 所以每个阶段事件用 `{ schedule: { afterRounds: 0 } }` 把下一阶段追加到**当年队列末尾**。
 *
 * 这是前作留下的"年内后果"机制,而它正好就是管线要的形状。
 * M3 有多个并行课题时才需要动调度器(TECH 4.5 的 ②'),现在不需要。
 */

/**
 * 链上的每一步都推进课题阶段 + 排下一步。抽出来避免五处写错。
 *
 * **阶段语义**:一个事件就是那个阶段的工作,`trigger` 读的是"课题正卡在这个阶段",
 * 做完它就 `advance` 出去。所以答辩(trigger `review`)推进出去之后课题落在终态。
 * 差一格就会让课题永远停在最后一个阶段上——那是 validate 规则 1 要抓的死锁。
 */
function advanceTo(nextEventId: string | null) {
  return [
    { project: { op: 'advance' as const, target: 'thesis' } },
    ...(nextEventId ? [{ schedule: { eventId: nextEventId, afterRounds: 0 } }] : []),
  ];
}

export const thesisEvents: GameEvent[] = [
  // ── 开题:创建课题并起链 ─────────────────────────────────
  {
    id: 'ev_thesis_start',
    pools: ['undergrad'],
    category: 'method',
    mandatory: true,
    // 大四人人都要写毕业论文,所以它是 mandatory 而不是可选项。
    // order 极小:它必须是这一年的第一件事,后面四步靠 schedule 排在队列末尾。
    trigger: { year: { from: 2018, to: 2018 } },
    order: -30,
    tier: 'major',
    title: '毕业论文开题',
    text: '大四上学期,论文选题表要交了。\n\n导师在办公室里翻着他手边的几个方向,说:"你可以跟着我这个项目做一小块,数据我有;也可以自己提一个,但你得自己收数据。"\n\n他把两条路说得一样平常。**它们的代价完全不一样。**',
    contextLines: [
      { text: '选题表下周三交,一页,要有研究问题和预期结果。' },
      { condition: { flag: 'in_formal_project' }, text: '你大三就在他的正式课题里做过一块,他知道你能干什么。' },
      { condition: { flag: 'mastered_stats' }, text: '你现在能看懂他给的那份数据里有什么、缺什么。' },
      { condition: { flagNum: { key: 'lab_years', op: '>=', value: 2 } }, text: '实验室的流程你已经很熟了,收数据这件事不至于让你害怕。' },
    ],
    choices: [
      {
        id: 'take_his_topic',
        text: '跟着导师的项目做一小块,用他的数据',
        outcomes: [
          {
            weight: 1,
            text: '他给了你一个 Excel,1200 多行,是前年一个横向课题收的。变量名是拼音缩写,没有说明文档。\n\n**这条路省下的是三个月,代价是你对这份数据一无所知。**',
            effects: [
              { stats: { method: 2, capital: 2, state: 3 } },
              { project: { op: 'create', templateId: 'tpl_thesis' } },
              // 开题就是 ideation 阶段的工作,做完它就推进出这个阶段
              { project: { op: 'advance', target: 'thesis' } },
              { project: { op: 'setField', target: 'thesis', quality: -5 } },
              { setFlag: 'thesis_used_existing_data' },
              { schedule: { eventId: 'ev_thesis_collect', afterRounds: 0 } },
            ],
          },
        ],
      },
      {
        id: 'own_topic',
        text: '自己提一个',
        outcomes: [
          {
            weight: 2,
            text: '你提了一个自己想了很久的问题。导师看完说:"可以做,但你这个样本量得两百以上,你自己收得来吗?"\n\n你说收得来。你当时不知道两百个大学生意味着什么。',
            effects: [
              { stats: { method: 4, state: -3 } },
              { project: { op: 'create', templateId: 'tpl_thesis' } },
              // 开题就是 ideation 阶段的工作,做完它就推进出这个阶段
              { project: { op: 'advance', target: 'thesis' } },
              { project: { op: 'setField', target: 'thesis', quality: 8 } },
              { setFlag: 'thesis_own_topic' },
              { schedule: { eventId: 'ev_thesis_collect', afterRounds: 0 } },
            ],
          },
          {
            weight: 1,
            text: '你提了一个自己想了很久的问题。导师听完停了两秒,说:"这个问题太大了,你把它切小一点。"\n\n他说得对。你切了三次才切到一个能在半年里做完的尺寸,而**"把问题切到能做"这件事本身就是一门手艺**。',
            effects: [
              { stats: { method: 6, state: -2 } },
              { project: { op: 'create', templateId: 'tpl_thesis' } },
              // 开题就是 ideation 阶段的工作,做完它就推进出这个阶段
              { project: { op: 'advance', target: 'thesis' } },
              { project: { op: 'setField', target: 'thesis', quality: 12 } },
              { setFlag: 'thesis_own_topic' },
              { setFlag: 'learned_to_scope' },
              { schedule: { eventId: 'ev_thesis_collect', afterRounds: 0 } },
            ],
          },
        ],
      },
    ],
  },

  // ── 收数据 ──────────────────────────────────────────────
  {
    id: 'ev_thesis_collect',
    pools: [],
    category: 'method',
    trigger: { projectCount: { isThesis: true, stage: 'collect', op: '>=', value: 1 } },
    title: '收数据',
    presentationVariants: [
      {
        condition: { flag: 'thesis_used_existing_data' },
        title: '别人收的数据',
        text: '你打开那个 Excel。\n\n1247 行。有 83 行关键变量是空的,有 11 行填答时间不到 90 秒,还有 4 行所有题目选的都是同一个数字。\n\n没有人告诉过你该怎么处理这些行。而**你怎么处理它们,会直接改变你最后那个 p 值**。',
      },
    ],
    text: '你开始收数据。\n\n问卷发到了七个班级群、三个社团群,和你自己的朋友圈。前三天来了 60 份,然后就停了。你开始一个个私聊,发红包,答应帮人代取快递。\n\n第 43 天,你凑到了 208 份。删掉无效的,剩 181。',
    contextLines: [
      { text: '你后来才知道,181 这个数字对你的分析意味着什么。' },
      { condition: { flag: 'mastered_exp' }, text: '你按标准加了两道反向计分题做筛查,这一步让你多删了 9 份、多信了自己的数据一分。' },
      { condition: { flag: 'trait_rigorous' }, text: '你为每一份被删掉的问卷写了删除理由。后来答辩的时候有个老师专门表扬了这一点。' },
    ],
    choices: [
      {
        id: 'clean_carefully',
        text: '把清理规则先写下来,再动数据',
        outcomes: [
          {
            weight: 1,
            text: '你在动数据之前先写好了三条规则:关键变量缺失即删、作答时间低于 90 秒即删、连续 15 题同一选项即删。\n\n然后才跑。\n\n**"先定规则再看结果"是这一行最便宜也最有效的一道防线**,而它需要你在还不知道结果的时候就下决心。',
            effects: [
              { stats: { method: 6, state: -1 } },
              { project: { op: 'setField', target: 'thesis', quality: 10 } },
              { setFlag: 'preset_cleaning_rules' },
              ...advanceTo('ev_thesis_analyze'),
            ],
          },
        ],
      },
      {
        id: 'clean_as_you_go',
        text: '边跑边看,哪里不对再处理',
        outcomes: [
          {
            weight: 2,
            text: '你先跑了一遍,不显著;删掉几个异常值,还是不显著;换了个缺失值处理方式,p 值开始动了。\n\n你最后用的那套规则是**倒着从结果找回去的**,而你当时完全没有意识到这一点——你只觉得自己在"处理数据"。',
            effects: [
              { stats: { method: 2 } },
              { project: { op: 'setField', target: 'thesis', integrityRisk: 12 } },
              { addFlag: { key: 'integrity_risk', delta: 6, min: 0, max: 100 } },
              { setFlag: 'cleaned_toward_result' },
              { schedule: { eventId: 'ev_thesis_ledger', afterRounds: 1 } },
              ...advanceTo('ev_thesis_analyze'),
            ],
          },
          {
            weight: 1,
            text: '你边跑边处理,中途自己觉得不对劲,回去把规则重新写了一遍,然后从原始数据重跑。\n\n多花了两周。**你自己抓住了自己**,而这一次比任何一门课都教得多。',
            effects: [
              { stats: { method: 5, state: -3 } },
              { project: { op: 'setField', target: 'thesis', quality: 6 } },
              { setFlag: 'caught_myself_once' },
              ...advanceTo('ev_thesis_analyze'),
            ],
          },
        ],
      },
    ],
  },

  // ── 分析:p = .08 ───────────────────────────────────────
  //
  // **全游戏最重要的教学时刻。** 它必须写得毫无戏剧性:
  // 没有人告诉你这是一件严重的事,也没有人阻止你,而且每个选项在当时都说得通。
  {
    id: 'ev_thesis_analyze',
    pools: [],
    category: 'method',
    trigger: { projectCount: { isThesis: true, stage: 'analyze', op: '>=', value: 1 } },
    tier: 'major',
    title: 'p = .08',
    text: 'SPSS 的输出窗口里那一行:\n\n> t(179) = 1.76, **p = .080**\n\n差一点。\n\n你盯着那个数字看了一会儿。你的假设方向是对的,效应也是对的方向,就是没过 .05。\n\n没有人在旁边。没有人知道你现在在想什么。导师下周才看你的初稿。',
    contextLines: [
      { text: '你论文的第三章已经按"假设成立"写了两千字。' },
      { condition: { flag: 'preset_cleaning_rules' }, text: '你的清理规则是动数据之前就写好的,所以现在没有"再调一调"的空间——这是你当初那个决定的回报。' },
      { condition: { flag: 'mastered_stats' }, text: '你知道 p = .08 到底意味着什么,也知道它不意味着"接近显著"。' },
      { condition: { flag: 'knows_preregistration' }, text: '组会上讲过的"预注册",你现在明白它是为了什么了。' },
      { condition: { flag: 'trait_skeptic' }, text: '你心里有个声音在说:这个数字就是这个数字。' },
    ],
    choices: [
      {
        id: 'report_as_is',
        text: '照实写:未达显著',
        outcomes: [
          {
            weight: 1,
            text: '你把第三章重写了,结论改成"未发现显著差异",讨论里老实分析了可能的原因:样本偏小、测量工具的信度、大学生样本的同质性。\n\n导师看完只说了一句:"行,这样就可以。"\n\n**没有人表扬你。这件事在任何记录里都留不下痕迹。** 但你从此知道自己在这种时候会怎么做,而这个知识后面十年会用上很多次。',
            effects: [
              { stats: { method: 6, state: 2, capital: -1 } },
              { project: { op: 'setField', target: 'thesis', quality: 8 } },
              { setFlag: 'reported_null_result' },
              ...advanceTo('ev_thesis_write'),
            ],
          },
        ],
      },
      {
        id: 'add_more_subjects',
        text: '再加 20 个被试看看',
        outcomes: [
          {
            weight: 2,
            text: '你又发了一轮问卷，收了 23 份，重新计算。\n\n> t(201) = 2.03，**p = .044**\n\n显著了。你把结果写进去，接着写讨论。\n\n这件事花了你两周，**而且它看起来完全合理**——样本量本来就该更大一点，不是吗。\n\n没有人告诉你，这叫“看过结果后再决定要不要继续收数据”（optional stopping）。它会让碰巧跨过门槛的概率变高。',
            effects: [
              { stats: { method: 1, state: -1 } },
              { project: { op: 'setField', target: 'thesis', integrityRisk: 20 } },
              { addFlag: { key: 'integrity_risk', delta: 14, min: 0, max: 100 } },
              { setFlag: 'did_optional_stopping' },
              { schedule: { eventId: 'ev_thesis_ledger', afterRounds: 1 } },
              ...advanceTo('ev_thesis_write'),
            ],
          },
          {
            weight: 1,
            text: '你又收了 23 份,重跑。\n\n> t(201) = 1.81, **p = .072**\n\n还是没过。你又想再加一轮,然后停下来了——你意识到自己已经在做一件不太对的事,只是说不清哪里不对。\n\n你把两次的数据合在一起,照实写了未达显著,并且在方法部分**写明了自己分两批收数据**。',
            effects: [
              { stats: { method: 5, state: -2 } },
              { project: { op: 'setField', target: 'thesis', integrityRisk: 6 } },
              { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } },
              { setFlag: 'reported_null_result' },
              { setFlag: 'disclosed_two_batches' },
              { schedule: { eventId: 'ev_thesis_ledger', afterRounds: 1 } },
              ...advanceTo('ev_thesis_write'),
            ],
          },
        ],
      },
      {
        id: 'change_hypothesis',
        text: '换一个能讲通的假设',
        outcomes: [
          {
            weight: 2,
            text: '你翻回自己的结果表，找到两个 p < .01 的关系，然后把引言重写了——**改成本来就是要研究这两个变量的**。\n\n第三章现在很好看。讨论也顺。导师说“逻辑很清楚”。\n\n这叫“看到结果后再倒写原假设”（HARKing）。你在这一年里没听过这个词。',
            effects: [
              { stats: { method: 1, capital: 2 } },
              { project: { op: 'setField', target: 'thesis', integrityRisk: 28, quality: 4 } },
              { addFlag: { key: 'integrity_risk', delta: 18, min: 0, max: 100 } },
              { setFlag: 'did_harking' },
              { schedule: { eventId: 'ev_thesis_ledger', afterRounds: 1 } },
              ...advanceTo('ev_thesis_write'),
            ],
          },
          {
            weight: 1,
            text: '你想换假设,写到一半发现自己讲不圆:那两个变量的关系用你现有的理论框架解释不了。\n\n你回去照实写了未达显著。**不是因为你更诚实,是因为编不圆。** 这件事你后来想起来会有点不好意思。',
            effects: [
              { stats: { method: 3, state: -3 } },
              { project: { op: 'setField', target: 'thesis', integrityRisk: 8 } },
              { addFlag: { key: 'integrity_risk', delta: 5, min: 0, max: 100 } },
              { setFlag: 'reported_null_result' },
              { schedule: { eventId: 'ev_thesis_ledger', afterRounds: 1 } },
              ...advanceTo('ev_thesis_write'),
            ],
          },
        ],
      },
      {
        id: 'ask_advisor',
        text: '拿去问导师该怎么办',
        outcomes: [
          {
            weight: 2,
            text: '你把输出截图发给他。他回了一句:"本科论文不显著也能过,照实写。讨论里写清楚为什么。"\n\n**这句话让整件事变得很简单。** 而你后来知道,不是每个学生都会收到这样一句回复。',
            effects: [
              { stats: { method: 5, capital: 2, state: 4 } },
              { project: { op: 'setField', target: 'thesis', quality: 6 } },
              { setFlag: 'reported_null_result' },
              { setFlag: 'advisor_said_report_it' },
              ...advanceTo('ev_thesis_write'),
            ],
          },
          {
            weight: 1,
            text: '你把输出截图发给他。他回:"再看看能不能调一调,不然不好写。"\n\n他没说"造假"。他大概也不觉得自己在说什么严重的话。**而你在这一刻收到的是一个授权。**\n\n你调了。',
            effects: [
              { stats: { method: 1, capital: 1, state: -3 } },
              { project: { op: 'setField', target: 'thesis', integrityRisk: 22 } },
              { addFlag: { key: 'integrity_risk', delta: 15, min: 0, max: 100 } },
              { setFlag: 'told_to_adjust' },
              { schedule: { eventId: 'ev_thesis_ledger', afterRounds: 1 } },
              ...advanceTo('ev_thesis_write'),
            ],
          },
        ],
      },
    ],
  },

  // ── 写作 ────────────────────────────────────────────────
  {
    id: 'ev_thesis_write',
    pools: [],
    category: 'method',
    trigger: { projectCount: { isThesis: true, stage: 'write', op: '>=', value: 1 } },
    title: '写',
    text: '三万字。摘要、文献综述、方法、结果、讨论、参考文献、致谢。\n\n最难的不是结果那一章,是**文献综述**——你要把三十篇文章讲成一个故事,而它们本来并没有在讲同一个故事。\n\n最容易的是致谢。你写了八百字,超了。',
    contextLines: [
      { text: '格式要求有一份 14 页的文档。参考文献必须按 APA 第六版的统一格式排。' },
      { condition: { flag: 'trait_perfectionist' }, text: '你改了十一稿。前八稿只改了引言。' },
      { condition: { flag: 'reported_null_result' }, text: '不显著的结果反而让讨论好写:你有一整节可以认真谈局限。' },
      { condition: { flag: 'did_harking' }, text: '引言现在读起来天衣无缝,而你自己知道它是倒着写出来的。' },
    ],
    choices: [
      {
        id: 'write_hard',
        text: '认真写,尤其是讨论那一章',
        outcomes: [
          {
            weight: 1,
            text: '你在讨论里写了三条局限、两条未来方向,而且没有一条是套话。\n\n盲审老师在意见里写了"讨论部分有独立思考"。**这七个字是你本科四年拿到的最实的一句评价。**',
            effects: [
              { stats: { method: 5, state: -3 } },
              { project: { op: 'setField', target: 'thesis', quality: 12 } },
              ...advanceTo('ev_thesis_defense'),
            ],
          },
        ],
      },
      {
        id: 'write_enough',
        text: '够用就行,格式弄对最重要',
        outcomes: [
          {
            weight: 1,
            text: '你把格式弄得一丝不差,内容中规中矩。\n\n这个策略是对的:**本科论文被打回来最常见的原因是格式,不是内容。** 你顺利过了初审。',
            effects: [
              { stats: { method: 2, state: 2 } },
              { project: { op: 'setField', target: 'thesis', quality: 2 } },
              ...advanceTo('ev_thesis_defense'),
            ],
          },
        ],
      },
      {
        id: 'write_late',
        text: '拖到最后两周',
        outcomes: [
          {
            weight: 2,
            text: '你在两周里写了三万字,最后三天没怎么睡。交上去那天你不记得自己写了什么。\n\n过了。**大部分人是这么过的**,而这件事的代价不在这一次——在于你从此相信自己"两周能搞定"。',
            effects: [
              { stats: { method: 1, state: -8 } },
              { addFlag: { key: 'burnout', delta: 10, min: 0, max: 100 } },
              { project: { op: 'setField', target: 'thesis', quality: -8 } },
              ...advanceTo('ev_thesis_defense'),
            ],
          },
          {
            weight: 1,
            text: '你在两周里写了三万字,然后发现参考文献格式全错,又熬了一晚。\n\n交的时候比截止时间早四十分钟。',
            effects: [
              { stats: { method: 1, state: -6 } },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
              { project: { op: 'setField', target: 'thesis', quality: -5 } },
              ...advanceTo('ev_thesis_defense'),
            ],
          },
        ],
      },
    ],
  },

  // ── 答辩(复用 review 阶段)─────────────────────────────
  {
    id: 'ev_thesis_defense',
    pools: [],
    category: 'method',
    trigger: { projectCount: { isThesis: true, stage: 'review', op: '>=', value: 1 } },
    tier: 'major',
    title: '答辩',
    text: '五个老师坐一排。你讲八分钟,他们问十二分钟。\n\n前面那个同学被问住了,在讲台上站了很久。轮到你的时候，你手心是湿的。\n\n第一个问题是:"你为什么选这个方向?"',
    contextLines: [
      { text: '会议室的投影仪偏色,你的图表看起来都是灰的。' },
      { condition: { flag: 'did_optional_stopping' }, text: '你在心里过了一遍:如果有人问你为什么样本量是 201 而不是 181,你要怎么说。' },
      { condition: { flag: 'reported_null_result' }, text: '你准备好了"为什么不显著"这个问题的答案,而且你准备的是真的答案。' },
      { condition: { flag: 'origin_illness' }, text: '"你为什么选这个方向"——这个问题的真实答案,你不会在这个房间里说。' },
    ],
    choices: [
      {
        id: 'answer_honestly',
        text: '认真回答每一个问题,不会的就说不会',
        outcomes: [
          {
            weight: 2,
            text: '有一个问题你确实答不上来——关于中介效应检验的前提条件。你说:"这个我没有想清楚。"\n\n问的那位老师点了点头,说:"回去看看温忠麟。"\n\n**"我没有想清楚"这五个字在答辩场上比任何一句糊过去的话都值钱**,而这一点要到你自己坐在那一排的时候才完全明白。',
            effects: [
              { stats: { method: 5, capital: 2, state: 3 } },
              { setFlag: 'thesis_passed' },
              { setFlag: 'said_i_dont_know' },
              ...advanceTo(null),
            ],
          },
          {
            weight: 1,
            text: '你答得挺顺,五个问题里有四个都在你准备的范围内。\n\n走出会议室的时候你觉得有点空——**准备了半年的东西,二十分钟就结束了。**',
            effects: [
              { stats: { method: 4, capital: 1 } },
              { setFlag: 'thesis_passed' },
              ...advanceTo(null),
            ],
          },
        ],
      },
      {
        id: 'talk_around',
        text: '答不上来的地方绕过去',
        outcomes: [
          {
            weight: 2,
            text: '你用"这个问题很好,我在讨论部分也提到了"接住了两个不会的问题。\n\n过了,良好。这套话术很有用,你后面还会用很多次——**在会上、在评审里、在别人问你研究意义的时候。**',
            effects: [
              { stats: { capital: 3, method: -1 } },
              { setFlag: 'thesis_passed' },
              { setFlag: 'learned_to_deflect' },
              ...advanceTo(null),
            ],
          },
          {
            weight: 1,
            text: '你绕了一次,那位老师追问了第二遍。\n\n第二遍你绕不过去了,只能说"我再去看一下"。会议室里安静了三秒。\n\n**你还是过了**,而那三秒你记了很多年。',
            effects: [
              { stats: { state: -5, method: 2 } },
              { setFlag: 'thesis_passed' },
              { setFlag: 'caught_deflecting' },
              ...advanceTo(null),
            ],
          },
        ],
      },
      {
        id: 'defend_the_null',
        text: '主动谈那个不显著的结果',
        visibleIf: { flag: 'reported_null_result' },
        outcomes: [
          {
            weight: 1,
            text: '你在讲的时候主动说:"我的主假设没有得到支持。我想谈一下我认为的原因。"\n\n然后你讲了样本同质性、测量工具在中国样本上的信度、以及效应量本身可能就很小。\n\n答辩组主席在评语里写了一句:"能正面讨论阴性结果。"\n\n**这一行里能做到这件事的人,比你以为的少。**',
            effects: [
              { stats: { method: 7, capital: 3, state: 4 } },
              { setFlag: 'thesis_passed' },
              { setFlag: 'defended_a_null_result' },
              ...advanceTo(null),
            ],
          },
        ],
      },
    ],
  },

  // ── 诚信线的结转确认(schedule 专用)─────────────────────
  //
  // 8.6 要求 `integrityRisk` **正常累积并结转**。这个事件是"结转"这件事的可见证据:
  // 它读课题上的 `integrityRisk`,让玩家知道那笔账被记住了——而不是随毕业一笔勾销。
  {
    id: 'ev_thesis_ledger',
    // schedule 专用。**不能靠 trigger 挡**——被 schedule 的事件绕过 trigger 检查,
    // 所以"只有真的记了账才出现"这件事由写账的那一方(上面几个 outcome)决定。
    pools: [],
    category: 'method',
    trigger: { flagNum: { key: 'integrity_risk', op: '>=', value: 10 } },
    title: '论文交上去之后',
    text: '论文归档了。图书馆的系统里能查到你的名字和那个标题。\n\n没有人会读它。你自己以后也不会再打开。\n\n只是有一件事你记得:在某个下午,你为了那个数字做过一个决定。**那个决定不严重,而且它成功了。**',
    contextLines: [
      { text: '这一行的人几乎都有这样一个下午。' },
      { condition: { flag: 'did_optional_stopping' }, text: '你后来知道那件事有个名字。' },
      { condition: { flag: 'did_harking' }, text: '你后来知道那件事有个名字,而且知道它比你当时以为的严重。' },
      { condition: { flag: 'told_to_adjust' }, text: '而且你不是自己想到的——是有人跟你说"再调一调"。' },
    ],
    choices: [
      {
        id: 'note_it',
        text: '记住它',
        outcomes: [
          {
            weight: 1,
            text: '你没有跟任何人说过这件事,但你记着。\n\n**记着的人和不记着的人,在后面十年里会分成两种。** 不是道德上的两种——是"下一次会不会犹豫一下"的两种。',
            effects: [
              { stats: { method: 2, state: -2 } },
              { setFlag: 'remembers_the_first_time' },
            ],
          },
        ],
      },
      {
        id: 'let_it_go',
        text: '这没什么大不了的',
        outcomes: [
          {
            weight: 1,
            text: '你说得对,它确实没什么大不了的。一篇没人读的本科论文。\n\n**问题从来不在这一篇。** 问题在于你刚才做那个判断时用的那把尺子,而那把尺子你还要用二十年。',
            effects: [
              { stats: { state: 3 } },
              { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
];
