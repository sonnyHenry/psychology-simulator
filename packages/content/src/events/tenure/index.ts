import type { GameEvent } from '@psy-sim/core';

/**
 * 博后与预聘期(M5,GAME_DESIGN 九节、十节)。
 *
 * 这一批事件只做一件事:**让首考清单上的每一行都有地方长出来**。
 * 基金中没中、学生毕没毕业、教学评估几分——这些在十节那张清单上都是一行,
 * 而一行没有来源就等于一行永远写"没有"。
 */

export const tenureEvents: GameEvent[] = [
  // ══════════ 博后:两年,一份合同 ══════════
  {
    id: 'ev_pd_only_research',
    pools: ['postdoc'],
    category: 'method',
    mandatory: true,
    tier: 'major',
    variantGroup: 'postdoc_entry',
    trigger: { all: [{ flag: 'path_postdoc' }, { year: { from: 2025, to: 2025 } }] },
    title: '你终于只需要做研究了',
    text: '没有课,没有组会要主持,没有本科生的实验报告要改。\n\n**你以为这是你等了七年的东西。**\n\n第三个月你发现自己坐在办公室里刷手机——原来那些杂事一直在替你决定"今天先做什么"。',
    contextLines: [
      { text: '合同两年。第二年秋天就是求职季。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 50 } }, text: '你已经很久没有过一段完全属于自己的时间了。' },
    ],
    choices: [
      {
        id: 'build_routine',
        text: '给自己定一套节奏',
        outcomes: [
          {
            weight: 1,
            text: '你把一周切成块:上午写,下午跑数据,周三下午读文献。\n\n**这套东西是你自己发明的**,而它会跟着你很多年。',
            effects: [
              { stats: { method: 5, state: 3 } },
              { setFlag: 'self_directed' },
            ],
          },
        ],
      },
      {
        id: 'chase_the_market',
        text: '盯着求职季倒推',
        outcomes: [
          {
            weight: 1,
            text: '你把两年拆成"要在哪个月之前有几篇在审",然后照着倒推。\n\n**很有效,而且很难受。** 你有一年多没有为了好奇心读过一篇文章。',
            effects: [
              { stats: { capital: 5, method: 2, state: -4 } },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_pd_entry_independence',
    pools: ['postdoc'],
    category: 'identity',
    mandatory: true,
    tier: 'major',
    variantGroup: 'postdoc_entry',
    trigger: { all: [{ flag: 'path_postdoc' }, { year: { from: 2025, to: 2025 } }] },
    title: '“这条线以后算谁的？”',
    text: '合作导师把主项目拆成三块，让你挑一块负责。资源、样本和团队都是现成的；代价是两年后别人很容易把它看成“你在他的项目里做得很好”。\n\n博后第一年，**独立不是没人帮你，是别人能不能看见哪一部分由你决定。**',
    contextLines: [{ text: '合同两年。求职委员会会同时问你做过什么，以及离开这里以后还会做什么。' }],
    choices: [
      {
        id: 'own_question',
        text: '接主项目，但把自己的问题写进设计',
        outcomes: [{
          weight: 1,
          text: '进度慢了一点。第一次内部报告时，合作导师介绍道：“主设计是我们的，这个问题是 ta 加进去的。”\n\n**一句准确的归属，比一句笼统的夸奖值钱。**',
          effects: [{ stats: { method: 4, capital: 3, state: -2 } }, { setFlag: 'postdoc_independent_line' }],
        }],
      },
      {
        id: 'main_project',
        text: '先把主项目做出来，独立线以后再搭',
        outcomes: [{
          weight: 1,
          text: '六个月后数据已经很完整。你的名字会在一篇好文章前面，研究陈述里的未来方向仍然是空白。',
          effects: [{ stats: { capital: 5, method: 2, state: -2 } }],
        }],
      },
    ],
  },
  {
    id: 'ev_pd_entry_old_and_new',
    pools: ['postdoc'],
    category: 'career',
    mandatory: true,
    tier: 'major',
    variantGroup: 'postdoc_entry',
    trigger: { all: [{ flag: 'path_postdoc' }, { year: { from: 2025, to: 2025 } }] },
    title: '博士的最后一篇，博后的第一个项目',
    text: '博士论文留下两篇稿子：一篇大修，一篇只有共同作者的最后几条意见。新组同时已经把数据权限和第一次截止发给你。\n\n旧阶段没有在你入职那天自动结束。',
    contextLines: [{ text: '今年三格精力里，至少有一格会用来结清一个已经离开的自己。' }],
    choices: [
      {
        id: 'clear_old',
        text: '先用三个月把遗留稿全部送出去',
        outcomes: [{
          weight: 1,
          text: '春天结束时，两篇都不再躺在你的邮箱里。新项目落后了一点，你第一次真正感觉自己进入了博后。',
          effects: [{ stats: { capital: 5, state: 2, method: 1 } }],
        }],
      },
      {
        id: 'start_new',
        text: '优先在新组站住，旧稿并行慢慢改',
        outcomes: [{
          weight: 1,
          text: '新组很快开始依赖你。旧共同作者每隔两周问一次进度；两个阶段都没有消失，只是一起占满了日历。',
          effects: [{ stats: { method: 3, capital: 3, state: -5 } }, { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } }],
        }],
      },
    ],
  },

  // 第二年不再重复“终于只做研究”：合同、材料与求职把工作结构彻底改掉。
  {
    id: 'ev_pd_market_contract_clock',
    pools: ['postdoc'],
    category: 'career',
    mandatory: true,
    tier: 'major',
    variantGroup: 'postdoc_market_clock',
    trigger: { all: [{ flag: 'path_postdoc' }, { year: { from: 2026, to: 2026 } }] },
    title: '合同还有十一个月',
    text: '人事系统发来自动邮件：合同结束日期、离校手续、设备归还。离真正结束还有十一个月，求职材料却要在六周后开始投。\n\n**第二年不是第一年的续集，它从倒计时开始。**',
    contextLines: [{ text: '每写一页 research statement，就少跑一次今天的数据；每多跑一次数据，就少准备一道面试问题。' }],
    choices: [
      {
        id: 'market_first',
        text: '先把申请材料和 job talk 做出来',
        outcomes: [{
          weight: 1,
          text: '材料不再是临近截止的拼贴。代价是那篇最可能赶上的文章停了一个月。',
          effects: [{ stats: { capital: 6, state: -2, method: -1 } }, { setFlag: 'postdoc_market_ready' }],
        }],
      },
      {
        id: 'paper_first',
        text: '先冲一篇在审，材料晚一点再说',
        outcomes: [{
          weight: 1,
          text: '稿子按时投出。第一批岗位开放时，你还在把博士和博后项目硬接成一条线。',
          effects: [{ stats: { method: 4, capital: 2, state: -4 } }],
        }],
      },
    ],
  },
  {
    id: 'ev_pd_market_research_statement',
    pools: ['postdoc'],
    category: 'identity',
    mandatory: true,
    tier: 'major',
    variantGroup: 'postdoc_market_clock',
    trigger: { all: [{ flag: 'path_postdoc' }, { year: { from: 2026, to: 2026 } }] },
    title: '“这几篇为什么属于同一个人？”',
    text: '研究陈述第一页放着博士论文，第二页是博后项目，第三页是一个还没有数据的新方向。每一篇单独看都说得通，连在一起却像三份不同的简历。\n\n求职要你解释的不是发表列表，是**为什么下一篇也会由你做出来。**',
    contextLines: [{ condition: { flag: 'postdoc_independent_line' }, text: '好在你第一年真的留出了一条由自己定义的问题。' }, { text: '你删掉“我的研究兴趣广泛”这句，空白反而更诚实。' }],
    choices: [
      {
        id: 'question_line',
        text: '按同一个问题重排，而不是按年份罗列',
        outcomes: [{
          weight: 1,
          text: '有两篇文章被放到脚注。主线终于清楚：方法换过、样本换过，你一直在追同一个没被答完的问题。',
          effects: [{ stats: { method: 3, capital: 5, state: 1 } }, { setFlag: 'postdoc_market_ready' }],
        }],
      },
      {
        id: 'output_line',
        text: '按最强成果排序，先证明自己能产出',
        outcomes: [{
          weight: 1,
          text: '第一页非常有力。读完的人会知道你做成过什么，未必知道给你一间办公室后你准备做什么。',
          effects: [{ stats: { capital: 5, state: -1 } }],
        }],
      },
    ],
  },
  {
    id: 'ev_pd_market_mock_talk',
    pools: ['postdoc'],
    category: 'career',
    mandatory: true,
    tier: 'major',
    variantGroup: 'postdoc_market_clock',
    trigger: { all: [{ flag: 'path_postdoc' }, { year: { from: 2026, to: 2026 } }] },
    title: '模拟 job talk 的第一个问题',
    text: '你讲完四十五分钟，合作导师没有评价结果，先问：“这里面如果只能带走一条线，你带哪条？”\n\n你准备的是如何把所有工作讲完，没有准备如何放弃其中一半。',
    contextLines: [{ text: '真正的岗位不会把现在这套设备、样本和合作关系一起交给你。' }],
    choices: [
      {
        id: 'choose_line',
        text: '现在就选一条，并说明另外两条为什么放下',
        outcomes: [{
          weight: 1,
          text: '答案不再全面，却第一次像一个可以在新地方执行的计划。下一轮模拟时，所有人的问题都更具体了。',
          effects: [{ stats: { capital: 6, method: 2, state: -2 } }, { setFlag: 'postdoc_market_ready' }],
        }],
      },
      {
        id: 'keep_portfolio',
        text: '强调几条线可以互相支持，不必现在砍掉',
        outcomes: [{
          weight: 1,
          text: '论证成立。合作导师最后只说：“那你要准备好，他们会问经费和人从哪里来。”',
          effects: [{ stats: { method: 3, capital: 3, state: -3 } }],
        }],
      },
    ],
  },
  {
    id: 'ev_pd_partner_track',
    pools: ['postdoc', 'grad'],
    category: 'social',
    mandatory: true,
    tier: 'major',
    // 有伴侣才有这一幕。**两体问题的前提在这里立起来**。
    // 这是求职季五种归宿的入口，不得随着研究生随机池扩容而被稀释。
    trigger: {
      all: [
        {
          any: ['together', 'distance', 'years_left', 'two_maps', 'shared_home', 'settled'].map(stage => ({
            npcStage: 'npc_partner',
            stage,
          })),
        },
        // 直博会在 2023 年离开 grad 池；写 2024 会让这批玩家直到求职季都
        // 没有机会说明伴侣是否也在学术圈，同校配偶岗因此被结构性关掉。
        { year: { from: 2023 } },
      ],
    },
    title: 'ta 也在找工作',
    text: '你们在同一张地图上各画各的圈,然后把两张纸放在一起看。\n\n重合的地方很少。\n\n**这件事你们回避了两年,现在回避不掉了。**',
    contextLines: [
      { text: '两个人的职业都在同一个时间点上要做决定,这在这一行里很常见。' },
    ],
    choices: [
      {
        id: 'partner_in_academia',
        text: 'ta 也在学术圈,一起投',
        outcomes: [
          {
            weight: 1,
            text: '你们开始互相改研究陈述,晚上对着两份职位清单找交集。\n\n**同校配偶岗这条路是存在的**,虽然稀缺。',
            effects: [
              { setFlag: 'has_partner' },
              { setFlag: 'partner_academic' },
              { stats: { state: 2 } },
            ],
          },
        ],
      },
      {
        id: 'partner_outside',
        text: 'ta 的工作跟学术无关',
        outcomes: [
          {
            weight: 1,
            text: 'ta 的工作在一个具体的城市里,而你的工作在一张全国地图上。\n\n**这不是谁更重要的问题**,是两种职业对"你能住在哪"的要求根本不同。',
            effects: [
              { setFlag: 'has_partner' },
              { stats: { state: 1 } },
            ],
          },
        ],
      },
    ],
  },

  // ══════════ 预聘期:六年 ══════════
  {
    id: 'ev_tn_grant_result',
    pools: ['tenure'],
    category: 'method',
    mandatory: true,
    once: false,
    tier: 'major',
    // 写了本子才有结果。**基金是首考的硬指标**,所以这一幕必须能重复
    trigger: { flagNum: { key: 'grant_attempts', op: '>=', value: 1 } },
    title: '本子的结果出来了',
    text: '八月中旬,系统里的状态从"评审中"变成了一个字。\n\n**这个字决定了你首考那一栏是"中了"还是"没有中"。**',
    contextLines: [
      { text: '青年基金一个人一辈子只能拿一次,而且有年龄限制。' },
      { condition: { flagNum: { key: 'grant_attempts', op: '>=', value: 2 } }, text: '这已经是你第二次写了。' },
    ],
    choices: [
      {
        id: 'open_it',
        text: '点开',
        outcomes: [
          {
            weight: 3,
            condition: { flagNum: { key: 'grant_attempts', op: '>=', value: 2 } },
            outcomeTag: 'grant_hit',
            text: '**中了。**\n\n你在办公室里坐了一会儿,然后给家里打了个电话。\n\n第二次写的那版和第一版几乎是两个东西——中间那一年你把整个思路推翻重来了。',
            effects: [
              { setFlag: 'got_young_grant' },
              { stats: { capital: 12, money: 300000, state: 8 } },
            ],
          },
          {
            weight: 1,
            condition: { flagNum: { key: 'grant_attempts', op: '>=', value: 2 } },
            outcomeTag: 'grant_miss',
            text: '没中。\n\n意见有三条,其中两条互相矛盾。\n\n**你还有明年**——如果年龄还够的话。',
            effects: [
              { stats: { state: -7 } },
              { addFlag: { key: 'burnout', delta: 10, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            outcomeTag: 'grant_hit',
            text: '**中了。** 第一次就中。\n\n你知道这里面有运气的成分,而且你会在很多年里都记得这一点。',
            effects: [
              { setFlag: 'got_young_grant' },
              { stats: { capital: 12, money: 300000, state: 8 } },
            ],
          },
          {
            weight: 2,
            outcomeTag: 'grant_miss',
            text: '没中。\n\n**第一次写没中是常态**,所有人都会这么安慰你,而这句话是真的。\n\n只是首考的钟不会因为它是常态就走慢一点。',
            effects: [
              { stats: { state: -6 } },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_tn_first_student',
    pools: ['tenure'],
    category: 'social',
    mandatory: true,
    once: false,
    tier: 'major',
    trigger: { flagNum: { key: 'student_progress', op: '>=', value: 2 } },
    title: '你的第一个学生要毕业了',
    text: '答辩那天你坐在台下,位置和七年前你自己答辩时{{advisor}}坐的那个差不多。\n\nta 讲得有点快,有一处被问住了,你的手心比 ta 还紧张。\n\n**你现在知道当年那句"再想想"是什么意思了。**',
    contextLines: [
      { text: '带出来的人是首考清单上的一行,但那一行写不下这三年。' },
      { condition: { flag: 'endured_advisor' }, text: '你发过誓不做那样的导师。' },
    ],
    choices: [
      {
        id: 'let_them_go',
        text: '让 ta 走自己的路',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'student_out',
            text: 'ta 去了企业,说"老师我可能不做学术了"。你说挺好的。\n\n**你是真心的**,而这句真心话是这七年教会你的东西里最不像成果的一个。',
            effects: [
              { addFlag: { key: 'students_graduated', delta: 1, min: 0, max: 12 } },
              { addFlag: { key: 'student_progress', delta: -2, min: 0, max: 20 } },
              { student: { op: 'graduate', path: 'industry', note: '去了企业；你认真说了“挺好的”' } },
              { stats: { state: 4, capital: 2 } },
              { favor: { op: 'add', who: 'peer_generic', direction: 'owed', weight: 2, reason: '你带出来的第一个学生' } },
            ],
          },
        ],
      },
      {
        id: 'keep_them_in',
        text: '劝 ta 接着读',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'student_stay',
            text: 'ta 接着读了博。你多了一个能干活的人,也多了一份七年的责任。\n\n**你说的那些话,和当年别人对你说的那些,像得让你不太舒服。**',
            effects: [
              { addFlag: { key: 'students_graduated', delta: 1, min: 0, max: 12 } },
              { addFlag: { key: 'student_progress', delta: -2, min: 0, max: 20 } },
              { student: { op: 'graduate', path: 'phd', note: '继续读博；你多了一份七年的责任' } },
              { stats: { capital: 4, method: 2, state: -2 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_tn_midterm',
    pools: ['tenure'],
    // **不是时代节点。** 它是这条职业线自己的节点,而 `era` 那一类
    // 有"必须是 ≥3 个成员的变体池"的规矩(规则 24),套在这里既不适用也不该绕过
    category: 'method',
    mandatory: true,
    tier: 'major',
    trigger: { year: { from: 2031 } },
    title: '中期考核:还差多少',
    text: '院里把你的材料摆出来,给了一张表。\n\n**"还差多少"这件事第一次变成了一个具体的数字。**\n\n剩下的时间也是一个具体的数字,而且它比你以为的小。',
    contextLines: [
      { text: '同一批进来的人里,已经有一个走了。' },
      { condition: { flag: 'got_young_grant' }, text: '基金那一栏是绿的,这让整张表看起来没那么吓人。' },
      { condition: { not: { flag: 'got_young_grant' } }, text: '基金那一栏空着,而它是硬指标。' },
    ],
    choices: [
      {
        id: 'all_in_papers',
        text: '把剩下的时间全押在产出上',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'tenure_push',
            text: '你推掉了两个院里的活,把课调成了一门。\n\n**有用,而且有代价**——后面那两年你在系里几乎是隐形的。',
            effects: [
              { stats: { method: 4, capital: -3, state: -5 } },
              { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } },
              { project: { op: 'setField', quality: 6 } },
            ],
          },
        ],
      },
      {
        id: 'keep_balance',
        text: '照原来的节奏走完',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'tenure_steady',
            text: '你没有改什么。课照上,学生照带,本子照写。\n\n**这可能不是最优解**,但你在这六年里没有变成一个你自己不认识的人。',
            effects: [
              { stats: { state: 4, capital: 2 } },
              { addFlag: { key: 'service_load', delta: 1, min: 0, max: 10 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_tn_someone_left',
    pools: ['tenure'],
    category: 'social',
    weight: 5,
    trigger: { year: { from: 2030 } },
    title: '隔壁办公室空了',
    text: '同一批进来的那个人走了。\n\n没有通知,没有告别会。有一天你路过,门开着,里面什么都没有了。\n\n**他去年还在走廊上跟你聊过他那个课题。**',
    contextLines: [
      { text: '这栋楼里每年都有一两间办公室会这样空出来。' },
      { condition: { flag: 'saw_rival_as_human' }, text: '你想起那年在楼道里说的那句话。' },
    ],
    choices: [
      {
        id: 'ask_around',
        text: '打听一下他去哪了',
        outcomes: [
          {
            weight: 1,
            text: '有人说他去了企业,有人说他回老家了,还有人说他"就是不想干了"。\n\n**三种说法可能都对。** 你后来加了他微信,他的朋友圈很久没更新。',
            effects: [{ stats: { state: -3, capital: 1 } }],
          },
        ],
      },
      {
        id: 'say_nothing',
        text: '什么都不问',
        outcomes: [
          {
            weight: 1,
            text: '你走过去,继续做自己的事。\n\n**你不问不是因为不关心**,是因为你知道再过三年那间办公室可能是你的。',
            effects: [
              { stats: { state: -4, method: 2 } },
              { addFlag: { key: 'burnout', delta: 6, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },

  // ══════════ 离开学术界:这不是惩罚 ══════════
  {
    id: 'ev_la_the_year_after',
    pools: ['left_academia'],
    category: 'identity',
    mandatory: true,
    tier: 'major',
    title: '第二年春天',
    text: '你现在在一个跟心理学有点关系、又不完全是的地方上班。\n\n有一天你在地铁上看到一篇推送,是你那个方向的新进展。你点进去读完了,读得比在组会上认真。\n\n**你把它转给了一个还在读博的师弟,没有加评论。**',
    contextLines: [
      { text: '离开这一行的人比留下的多得多,而他们大部分过得不错。' },
      { condition: { flag: 'job_market_shutout' }, text: '那一年市场很紧,这件事你后来才从别人嘴里确认。' },
      { condition: { flag: 'path_left_after_phd' }, text: '你是自己走的,而这一点在很多个夜里是有分量的。' },
    ],
    choices: [
      {
        id: 'keep_a_foot_in',
        text: '还留一只脚在里面',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'left_connected',
            text: '你偶尔帮人审稿,偶尔给以前的组做点数据分析。\n\n**你没有变成"以前学心理学的人"**,你只是不在那栋楼里了。',
            effects: [
              { stats: { capital: 3, state: 4, money: 90000 } },
              { setFlag: 'left_but_connected' },
            ],
          },
        ],
      },
      {
        id: 'close_the_door',
        text: '就到这儿',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'left_clean',
            text: '你把那些 PDF 和数据文件打包存进硬盘,然后没有再打开过。\n\n**这不是一件伤心的事。** 那十年长在你身上了,而它长的地方不在简历上。',
            effects: [
              { stats: { state: 8, money: 150000 } },
              { setFlag: 'left_cleanly' },
            ],
          },
        ],
      },
    ],
  },
];
