import type { GameEvent } from '@psy-sim/core';

/**
 * 研究生阶段的骨架事件:进组抽卡、开新课题、六个导师原型的揭示时刻。
 *
 * ## 导师抽卡在大三,不在报志愿的时候
 *
 * GAME_DESIGN 第七节:**报志愿后不抽,进实验室时才抽**。抽卡前只能看到公开信息。
 * 抽卡池取决于你大二干了什么——进过实验室的人能看到更多导师,
 * **没进过实验室的人在大三是盲抽**(8.5)。
 *
 * ## 真实原型要两三年才揭示完
 *
 * 下面六个 `*_reveal` 事件就是那个揭示时刻。它们由导师状态机在读研第一年之后触发,
 * 而**抽卡屏上你看不到任何关于它们的暗示**。
 */
export const gradEvents: GameEvent[] = [
  // ── 大三进组:抽导师 ─────────────────────────────────────
  {
    id: 'ev_join_lab',
    pools: ['undergrad'],
    category: 'method',
    mandatory: true,
    tier: 'major',
    trigger: { all: [{ year: { from: 2017, to: 2017 } }, { not: { advisor: {} } }] },
    order: -20,
    title: '进组',
    text: '大三上学期,该定导师了。\n\n学院网站上每个老师的页面长得都差不多:研究方向、代表论文、承担项目。\n\n**这些页面唯一不写的,就是你真正需要知道的那件事。**\n\n你手上有三个人选。',
    contextLines: [
      { text: '这是这条路上最大的一次骰子,而你现在几乎什么都不知道。' },
      { condition: { flag: 'entered_lab' }, text: '你在实验室待过,组里的事你本来就知道一些——你能看到的人选也更多。' },
      { condition: { flag: 'asked_around_once' }, text: '你大三打听过一轮,有几句话现在派上用场了。' },
      {
        condition: { not: { flag: 'entered_lab' } },
        text: '你没进过实验室。**这一抽基本是盲的**——不是惩罚,是大二那个周五下午的真实后果。',
      },
    ],
    choices: [
      {
        id: 'go_pick',
        text: '去挑一个',
        outcomes: [
          {
            weight: 1,
            text: '你把三个人的主页翻了一遍,又找人问了两句。\n\n**你知道的仍然远远不够。** 而这件事没有更好的办法——这一行的每个人都是这么选的。',
            effects: [{ stats: { capital: 2 } }, { drawAdvisor: { count: 3 } }],
          },
        ],
      },
    ],
  },

  // ── 研一/直博一年级:第一个真课题 ────────────────────────
  {
    id: 'ev_first_real_project',
    pools: ['grad'],
    category: 'method',
    mandatory: true,
    tier: 'major',
    // **手上少于三个在推进的课题就再开一个。**
    //
    // 三个课题、三格精力——**这个不等式是故意的**。你能同时认真推的最多两个,
    // 于是永远有一个在边上放着,而放着的那个会在两年后烂掉。
    //
    // 这不是惩罚,是这一行的默认状态:一个课题会做废,所以没有人只押一个;
    // 而"手上三个、真正在动的两个"就是一个研究生的常态。
    once: false,
    trigger: { projectCount: { active: true, isThesis: false, op: '<', value: 3 } },
    order: -20,
    title: '你的第一个真课题',
    text: '{{advisor}} 让你自己定一个方向。\n\n"毕业论文那种不算,"他说,"那是练手。这次是要能发出去的。"\n\n三条路摆在你面前,而你现在还不知道它们各自意味着几年。',
    presentationVariants: [
      {
        condition: { projectCount: { isThesis: false, op: '>=', value: 1 } },
        title: '再起一个',
        text: '手上那个还在跑,但你需要第二条线。\n\n**没有人只押一个课题**——一个会做废,两个至少有一个能成。这是这一行最普遍的算法,而且它是对的。\n\n代价是两个都会慢一点。',
      },
    ],
    contextLines: [
      { text: '组里在做的东西你大概摸清了。' },
      { condition: { flag: 'stack_python' }, text: '你会写代码,这件事在选方向的时候比你以为的重要。' },
      { condition: { flag: 'mastered_stats' }, text: '统计学通了的人,选择余地会大一些。' },
    ],
    choices: [
      {
        id: 'behavioral',
        text: '做行为实验',
        outcomes: [
          {
            weight: 1,
            text: '经典路线:设计、招人、跑、分析。**难点全在收数据那一站**,而你要一年后才知道这句话的分量。',
            effects: [
              { stats: { method: 3 } },
              { project: { op: 'create', templateId: 'tpl_behavioral' } },
              { setFlag: 'domain_cognition' },
              { schedule: { eventId: 'ev_ps_ideation_done_before', afterRounds: 0 } },
            ],
          },
        ],
      },
      {
        id: 'neuro',
        text: '做神经影像',
        visibleIf: { any: [{ flag: 'stack_python' }, { flag: 'mastered_exp' }, { flag: 'college_science' }] },
        outcomes: [
          {
            weight: 1,
            text: '机时贵、被试难约、预处理管线一改结果就变。\n\n**它是最容易做废的一类课题**,也是简历上最好看的一类。这两件事同时为真。',
            effects: [
              { stats: { method: 4, capital: 2, state: -2 } },
              { project: { op: 'create', templateId: 'tpl_neuro' } },
              { setFlag: 'domain_cogneuro' },
              { schedule: { eventId: 'ev_ps_ideation_journal_club', afterRounds: 0 } },
            ],
          },
        ],
      },
      {
        id: 'survey',
        text: '做问卷研究',
        outcomes: [
          {
            weight: 1,
            text: '前面几站都会很顺:量表现成、样本好收、模型跑得快。\n\n**问题全在后面**——这类研究最容易被审稿人问"所以呢"。',
            effects: [
              { stats: { method: 2, clinical: 2 } },
              { project: { op: 'create', templateId: 'tpl_survey' } },
              { setFlag: 'domain_social' },
              { schedule: { eventId: 'ev_ps_ideation_too_big', afterRounds: 0 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_open_another_project',
    pools: ['grad'],
    category: 'method',
    mandatory: true,
    // 可以开很多次。**"一个课题会做废,两个至少有一个能成"**是这一行的普遍算法。
    once: false,
    // 玩家在分配屏投了"开一个新课题"才会有这一幕
    trigger: {
      all: [
        { flagNum: { key: 'wants_new_project', op: '>=', value: 1 } },
        { projectCount: { isThesis: false, op: '>=', value: 1 } },
      ],
    },
    order: -18,
    title: '再开一个',
    text: '你手上那个还没做完,但你想再开一个。\n\n理由很实际:**一个课题会做废,两个至少有一个能成。** 这一行的人几乎都是这么算的。\n\n代价也很实际:两个都会变慢。',
    contextLines: [
      { text: '组里那个师兄手上有四个。他一个都没发出来。' },
      { condition: { advisor: { archetype: 'young_pi' } }, text: '{{advisor}} 鼓励你多开。他自己在非升即走。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 45 } }, text: '你已经很累了。' },
    ],
    choices: [
      {
        id: 'open_behavioral',
        text: '开一个行为实验',
        outcomes: [
          {
            weight: 1,
            text: '新课题建了文件夹,写了第一版设计。\n\n**开新课题那天永远是最有干劲的一天。**',
            effects: [
              { stats: { method: 2, state: -2 } },
              { project: { op: 'create', templateId: 'tpl_behavioral' } },
              { addFlag: { key: 'wants_new_project', delta: -1, min: 0, max: 3 } },
            ],
          },
        ],
      },
      {
        id: 'open_survey',
        text: '开一个问卷研究(快,好发)',
        outcomes: [
          {
            weight: 1,
            text: '量表现成,样本好收。你知道这类文章的天花板在哪,但你现在需要的是**有东西能发出去**。\n\n这个判断在毕业要求面前是对的,在十年之后未必。',
            effects: [
              { stats: { method: 1, capital: 1 } },
              { project: { op: 'create', templateId: 'tpl_survey' } },
              { addFlag: { key: 'wants_new_project', delta: -1, min: 0, max: 3 } },
            ],
          },
        ],
      },
      {
        id: 'dont',
        text: '算了,先把手上的做完',
        outcomes: [
          {
            weight: 1,
            text: '你把新想法写在备忘录里,关掉了。\n\n**专注是对的**,而且它在数值上真的更划算——只是当手上那个做废的时候,你会想起这一天。',
            effects: [
              { stats: { state: 2, method: 1 } },
              { addFlag: { key: 'wants_new_project', delta: -1, min: 0, max: 3 } },
              { setFlag: 'chose_to_focus' },
            ],
          },
        ],
      },
    ],
  },

  // ══════════ 六个原型的揭示时刻 ══════════
  {
    id: 'ev_adv_star_reveal',
    pools: [],
    category: 'social',
    tier: 'major',
    title: '你一年见了他三次',
    text: '年底你算了一下:这一年你和 {{advisor}} 单独说话的次数是三次,每次不超过十分钟。\n\n组会由博后代开。你发邮件问问题,平均四天回一次,回的是"你先试试"。\n\n实验室的机器是最好的,经费从来不缺,他的推荐信在圈里分量很重。\n\n**这些都是真的,而且它们同时为真。**',
    contextLines: [
      { text: '组里有八个博士生、三个博后、两个访问学者。' },
      { condition: { flag: 'trait_pleaser' }, text: '你一直在等他给你一个明确的指示。' },
    ],
    choices: [
      {
        id: 'self_drive',
        text: '认了,自己推着自己走',
        outcomes: [
          {
            weight: 1,
            text: '你开始每周给自己开一次组会:写下这周做了什么、下周做什么、卡在哪。\n\n**这个习惯是他没教给你的,但也是因为他你才不得不学会。** 你后来带学生的时候,第一件事就是教他们这个。',
            effects: [
              { stats: { method: 5, state: -2 } },
              { setFlag: 'self_directed' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
      {
        id: 'find_a_proxy',
        text: '找组里的博后当"实际导师"',
        outcomes: [
          {
            weight: 1,
            text: '你跟一个博后混熟了,有问题问他。他教了你很多,而且从来没提过署名的事。\n\n他两年后去了另一个学校。**你在这个组里真正的导师走了,而名义上的导师什么都没变。**',
            effects: [
              { stats: { method: 4, capital: 2 } },
              { setFlag: 'had_a_proxy_mentor' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_adv_young_pi_reveal',
    pools: [],
    category: 'social',
    tier: 'major',
    title: '他把你当同事用',
    text: '晚上十一点,{{advisor}} 在群里发了一段分析思路,然后 @ 你:"明天能出个结果吗?"\n\n第二天他自己也在实验室待到十点。\n\n他不是在压榨你——**他自己就在非升即走的倒计时里**,而他真的把你当成能一起解决问题的人。\n\n这两件事让人很难生气,也很难拒绝。',
    contextLines: [
      { text: '他的合同是六年。现在是第三年。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 40 } }, text: '你的耗竭已经很高了。' },
      { condition: { flag: 'trait_resilient' }, text: '你居然还挺享受这种节奏。' },
    ],
    choices: [
      {
        id: 'keep_up',
        text: '跟上他的节奏',
        outcomes: [
          {
            weight: 2,
            text: '这两年你成长得比同批任何人都快。你会写基金本子、会做同行评议、会在两周内把一篇稿子改完。\n\n**代价是你的耗竭在稳定地涨**,而你把它解释成"这个阶段就是这样"。',
            effects: [
              { stats: { method: 7, capital: 4, state: -6 } },
              { addFlag: { key: 'burnout', delta: 14, min: 0, max: 100 } },
              { advisorStage: 'known' },
            ],
          },
          {
            weight: 1,
            text: '你跟了一年半,然后在某个凌晨两点看着屏幕突然什么都写不出来。\n\n你请了两周假。他没说什么,还发消息说"注意身体"。\n\n**他是真心的。这件事让整件事更难处理了。**',
            effects: [
              { stats: { method: 4, state: -10 } },
              { addFlag: { key: 'burnout', delta: 20, min: 0, max: 100 } },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
      {
        id: 'set_a_line',
        text: '跟他谈一次节奏',
        outcomes: [
          {
            weight: 2,
            text: '你说你晚上十一点之后不看消息。他愣了一下,说"应该的"。\n\n然后他真的改了。**大部分人不敢开这个口,而开了口的人里大部分得到的回应比想象中好。**',
            effects: [
              { stats: { state: 8, capital: -1 } },
              { advisorFavor: -3 },
              { setFlag: 'set_boundaries_with_advisor' },
              { advisorStage: 'known' },
            ],
          },
          {
            weight: 1,
            text: '你说了。他说"我理解",然后节奏一周之后就回去了。\n\n他不是不尊重你,他是**自己也停不下来**。',
            effects: [
              { stats: { state: 2 } },
              { addFlag: { key: 'burnout', delta: 6, min: 0, max: 100 } },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_adv_hands_off_reveal',
    pools: [],
    category: 'social',
    tier: 'major',
    title: '他真的不催你',
    text: '这一年 {{advisor}} 问过你两次进度。两次你都说"在做了",他都说"好,你自己安排"。\n\n组会一学期开了三次。你的开题报告他看了两天就签了字,一个字没改。\n\n**这是很多人梦想的导师**,而你现在有点慌。',
    contextLines: [
      { text: '同批的人已经有两个投出去了。' },
      { condition: { flag: 'self_directed' }, text: '好在你早就学会了自己给自己开组会。' },
      { condition: { flag: 'trait_perfectionist' }, text: '没有人给你划线,于是你自己把线划得越来越高。' },
    ],
    choices: [
      {
        id: 'grow_on_your_own',
        text: '自己长出来',
        outcomes: [
          {
            weight: 2,
            text: '你自己定节奏、自己找合作、自己投稿。三年后你比同批的人更能独当一面。\n\n**代价是你的推荐信写得很温暖,但没有分量。** 那封信里全是"这个学生很自觉"。',
            effects: [
              { stats: { method: 6, capital: -3, state: 1 } },
              { setFlag: 'self_directed' },
              { setFlag: 'weak_reference_letter' },
              { advisorStage: 'known' },
            ],
          },
          {
            weight: 1,
            text: '你试着自己长,但没有方向的自由很快变成了空转。\n\n第二年年底你才发现自己这一年读了很多东西、什么都没产出。',
            effects: [
              { stats: { method: 2, state: -5 } },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
      {
        id: 'find_another',
        text: '去找组外的人带你',
        outcomes: [
          {
            weight: 1,
            text: '你厚着脸皮给隔壁组的老师发了邮件,问能不能旁听他们组会。他同意了。\n\n**这件事需要的不是能力,是脸皮**,而这一行有太多人卡在这一步。',
            effects: [
              { stats: { method: 5, capital: 3, state: -1 } },
              { setFlag: 'found_outside_mentor' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_adv_clinical_reveal',
    pools: [],
    category: 'counseling',
    tier: 'major',
    title: '你的临床长得很快,文章一篇没有',
    text: '这一年你跟着 {{advisor}} 出了四十多次门诊,做了督导,还参加了一个 CBT 的连续培训。\n\n你的个案概念化能力比同批任何人都强。\n\n年底填科研考核表的时候,"发表论文"那一栏你填了 0。',
    contextLines: [
      { text: '毕业要求是两篇,其中一篇要是核心。' },
      { condition: { flag: 'motive_help_people' }, text: '你当初就是为了这个来的。' },
      { condition: { flag: 'knows_registration_system' }, text: '注册系统的小时数你倒是攒得很快。' },
    ],
    choices: [
      {
        id: 'ask_about_papers',
        text: '跟她提文章的事',
        outcomes: [
          {
            weight: 2,
            text: '她说:"我们组的文章都是从个案里长出来的,你先把临床做扎实。"\n\n**这句话是真诚的,而且在她那个年代是对的。** 只是现在的毕业要求不认这个逻辑。',
            effects: [
              { stats: { clinical: 5, method: -1, state: -3 } },
              { setFlag: 'clinical_heavy_light_papers' },
              { advisorStage: 'known' },
            ],
          },
          {
            weight: 1,
            text: '她说:"你说得对,我给你个数据。"然后从抽屉里翻出一个 U 盘,是她攒了六年的门诊评估数据。\n\n**那份数据后来变成了你的两篇文章。**',
            effects: [
              { stats: { clinical: 3, method: 3, capital: 3 } },
              { project: { op: 'create', templateId: 'tpl_survey' } },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
      {
        id: 'take_the_clinical_road',
        text: '认了。你要的本来就是这个',
        outcomes: [
          {
            weight: 1,
            text: '你把重心全放在临床上。**你在做的是这一行里最难被量化的那种成长**,而毕业要求不会因此宽容一点。\n\n这个矛盾没有解,只有取舍。',
            effects: [
              { stats: { clinical: 8, method: -2 } },
              { addFlag: { key: 'clinical_hours', delta: 120, min: 0, max: 3000 } },
              { setFlag: 'clinical_heavy_light_papers' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_adv_boundary_reveal',
    pools: [],
    category: 'social',
    tier: 'major',
    // 这条线要写得**准确但不猎奇**,并给玩家真实的处理选项:忍、谈、换导师、举报、走人。
    title: '周六下午的电话',
    text: '周六下午三点,{{advisor}} 打电话让你去一趟——不是实验室,是一个饭局。\n\n"来认识几个人,对你以后有好处。"\n\n你去了。整场你被介绍为"我的学生",说了大概十句话,喝了两杯。\n\n结束的时候他说:"下周那个横向的材料你整理一下。"那个横向和你的课题没有任何关系。',
    contextLines: [
      { text: '这是这个学期第三次了。' },
      { condition: { flag: 'trait_pleaser' }, text: '你每次都答应了,而且每次答应得很快。' },
      { condition: { flag: 'lost_first_authorship' }, text: '上一篇的一作已经不是你了。' },
      { condition: { flagNum: { key: 'advisor_chores', op: '>=', value: 4 } }, text: '你这两年帮他干的活,比自己课题上花的时间还多。' },
    ],
    choices: [
      {
        id: 'endure',
        text: '忍着。还有两年就毕业了',
        outcomes: [
          {
            weight: 2,
            text: '你算了一下时间:再忍两年。\n\n**这是最多人做的选择,而且它通常是有效的**——你确实毕业了。代价是这两年你的课题几乎没动,以及某种你说不清的东西。',
            effects: [
              { stats: { capital: 3, state: -8 } },
              { advisorFavor: 5 },
              { addFlag: { key: 'burnout', delta: 14, min: 0, max: 100 } },
              { setFlag: 'endured_it' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
      {
        id: 'talk',
        text: '找他谈一次',
        outcomes: [
          {
            weight: 2,
            text: '你说你想把重心放回自己的课题上。他说:"你这样想就格局小了。"\n\n然后他补了一句:"我带过的学生,哪个不是这么过来的。"\n\n**这句话没法反驳,因为它可能是真的。**',
            effects: [
              { stats: { state: -6, method: 1 } },
              { advisorFavor: -12 },
              { setFlag: 'tried_talking' },
              { advisorStage: 'known' },
            ],
          },
          {
            weight: 1,
            text: '你说了。他愣了一下,说"行,那横向的事我找别人"。\n\n之后他对你客气了很多,也疏远了很多。**你拿回了时间,失去了那条通道。** 这个交易是划算的,但它有代价。',
            effects: [
              { stats: { state: 4, capital: -4, method: 2 } },
              { advisorFavor: -8 },
              { setFlag: 'set_boundaries_with_advisor' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
      {
        id: 'ask_around',
        text: '先去打听别人是怎么处理的',
        outcomes: [
          {
            weight: 1,
            text: '你找了两个毕业的师兄。一个说"忍着",一个说"我当年换了导师,延了一年,不后悔"。\n\n**两个人给的都是真话。** 你现在知道这条路上有两个出口了,而这件事本身就让人好受一点。',
            effects: [
              { stats: { capital: 2, state: 2 } },
              { addFlag: { key: 'rumors_heard', delta: 2, min: 0, max: 20 } },
              { setFlag: 'knows_the_options' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_adv_warm_reveal',
    pools: [],
    category: 'social',
    tier: 'major',
    title: '她记得你的生日',
    text: '你生日那天,{{advisor}} 在组会结束时拿出一个小蛋糕。\n\n她记得组里每个人的生日,记得你上次说过喜欢什么口味,也记得你妈妈住院那次。\n\n她是你见过最好的人之一。\n\n年底评奖学金,你们组一个都没评上——因为评审看的是一区文章数,而她这五年一篇都没有。',
    contextLines: [
      { text: '她的平台是这个学院里最弱的。' },
      { condition: { flag: 'origin_illness' }, text: '你妈妈住院那次,是她帮你联系的医生。' },
      { condition: { flag: 'trait_empathic' }, text: '你很难对她有任何不满,而这件事让你更难受。' },
    ],
    choices: [
      {
        id: 'stay',
        text: '留下。这样的人不多',
        outcomes: [
          {
            weight: 2,
            text: '你留下了。这三年你过得比同批任何人都舒服,也比他们任何人都慢。\n\n**你的天花板是她的天花板**,而你在很多年之后回头看,仍然说不清这个交易划不划算。',
            effects: [
              { stats: { state: 8, capital: -4 } },
              { advisorFavor: 8 },
              { setFlag: 'stayed_with_warm_advisor' },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
      {
        id: 'seek_collaboration',
        text: '留下,但自己去找外部合作',
        outcomes: [
          {
            weight: 2,
            text: '你跟她说想跟外面的组合作。她非常支持,还主动帮你写了引荐信。\n\n**她一点都不介意你去别处找资源**,而这件事恰恰说明她是什么样的人。',
            effects: [
              { stats: { capital: 5, method: 3 } },
              { advisorFavor: 4 },
              { setFlag: 'found_outside_mentor' },
              { advisorStage: 'known' },
            ],
          },
          {
            weight: 1,
            text: '你找了两个组,一个没回,一个回了但后来没下文。\n\n**没有平台的人去谈合作,难的不是意愿,是没有人认识你。**',
            effects: [
              { stats: { capital: 1, state: -3 } },
              { advisorStage: 'known' },
            ],
          },
        ],
      },
    ],
  },
];
