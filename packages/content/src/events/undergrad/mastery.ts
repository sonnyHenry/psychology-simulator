import type { GameEvent } from '@psy-sim/core';

/**
 * 能力标签的兑现事件(GAME_DESIGN 8.2)。**课程系统的全部意义在这里。**
 *
 * ## "点头,假装听懂了"
 *
 * 心理统计只是"过了"的角色,在后面所有涉及中介分析、混合线性模型、贝叶斯因子的事件里,
 * 只能选「点头,假装听懂了」。这个选项要:
 *
 * - **一直存在、一直可用**
 * - **不带任何嘲讽**——因为现实里很多人就是这么过来的,**包括一些发了很多论文的人**
 *
 * 机制上它是一对互斥选项:`{ flag: 'mastered_x' }` 与 `{ not: { flag: 'mastered_x' } }`。
 * validate 规则 29 强制这个配对:**不允许出现"没学通就没得选"的事件**——
 * 现实里那些人也在做决定,而且有些人做得还不错。
 *
 * ## 最长的那条因果链
 *
 * 这些事件是本科段的兑现点。真正最长的一条是:
 * **大二期末统计课的一次判定 → `mastered_stats` → 2029 年的一个审稿事件。**
 * 那一头在 M5/M7,这一头在这里。
 */
export const masteryEvents: GameEvent[] = [
  {
    id: 'ev_mastery_stats_lab_meeting',
    pools: ['undergrad'],
    category: 'method',
    mandatory: true,
    trigger: { all: [{ year: { from: 2017 } }, { flag: 'entered_lab' }] },
    order: 18,
    title: '组会上师兄在讲一套你没学过的统计方法',
    text: '师兄在分析一个问题：A 是否先改变 B，再通过 B 影响 C。统计里把这叫“中介效应”。\n\n接着他一口气说了 bootstrap、置信区间、Baron & Kenny 和 Sobel——几种判断这条间接路径是否站得住的方法。\n\n他讲完看了一圈：“有问题吗？”',
    contextLines: [
      { text: '屋里六个人,有两个在点头,有一个在记笔记,有一个在看手机。' },
      { condition: { flag: 'mastered_stats' }, text: '你知道他刚才那句话有一个地方讲错了。' },
      { condition: { flag: 'stats_debt' }, text: '你们的统计课讲到方差分析就结束了。' },
    ],
    choices: [
      {
        id: 'ask_real_question',
        text: '问他：如果 A 仍会直接影响 C，该怎么解释',
        visibleIf: { flag: 'mastered_stats' },
        outcomes: [
          {
            weight: 2,
            text: '师兄停了一下，说：“问得好。过去会把这种情况叫‘部分中介’，但这个名字依赖直接路径有没有达到统计门槛，而门槛又会受样本量影响。”\n\n导师在旁边说了一句：“这个学生的统计学得不错。”\n\n**你在这个屋子里的位置从今天起不一样了。** 而这句话的起点是大二期末的一次判定。',
            effects: [
              { stats: { method: 5, capital: 4 } },
              { setFlag: 'known_for_stats' },
            ],
          },
          {
            weight: 1,
            text: '师兄说:"这个我得回去查一下。"\n\n组会后他专门来找你聊了二十分钟。**这二十分钟是你在这个组里第一次被当成同行,而不是本科生。**',
            effects: [
              { stats: { method: 4, capital: 3 } },
              { setFlag: 'known_for_stats' },
            ],
          },
        ],
      },
      {
        id: 'nod_along',
        text: '点头,假装听懂了',
        visibleIf: { not: { flag: 'mastered_stats' } },
        outcomes: [
          {
            weight: 1,
            // 不带任何嘲讽。现实里很多人就是这么过来的,包括一些发了很多论文的人。
            text: '你点了头。屋里另外三个人也点了头。\n\n组会结束后，你把那三个陌生的方法名抄在手机备忘录里，打算晚上查。\n\n后来你查了，而且大致看懂了。**你会用这种方式补上很多东西**——比在课上学慢，比什么都不做快。这一行有很多人是这么走完全程的。',
            effects: [
              { stats: { method: 2, state: -1 } },
              { addFlag: { key: 'nodded_along', delta: 1, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'admit_not_following',
        text: '直接说:我没听懂,能从头讲一下吗',
        outcomes: [
          {
            weight: 2,
            text: '屋里安静了一秒。然后师兄说"行",从中介效应是什么开始讲了十分钟。\n\n讲完之后有个平时看起来什么都懂的师姐说:"我也是今天才彻底搞清楚。"\n\n**问出"我没听懂"这句话的成本,永远比你以为的低,而收益比你以为的高。**',
            effects: [
              { stats: { method: 4, state: -1, capital: 1 } },
              { setFlag: 'asks_when_lost' },
            ],
          },
          {
            weight: 1,
            text: '师兄说:"这个你自己去看一下温忠麟那几篇吧,讲起来太长。"\n\n有点尴尬,但他给的建议是对的。你去看了。\n\n**尴尬三十秒,换一篇你真的读完了的方法学文献。** 这个交易一直是划算的。',
            effects: [
              { stats: { method: 3, capital: -1 } },
              { setFlag: 'asks_when_lost' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_mastery_exp_design_flaw',
    pools: ['undergrad'],
    category: 'method',
    mandatory: true,
    trigger: { year: { from: 2017 } },
    order: 19,
    title: '同学请你帮他看一份实验设计',
    text: '同班一个人要交实验设计的课程作业,发给你看。\n\n他的设计是:实验组做正念练习八周,控制组什么都不做,前后测焦虑量表,比较两组的变化量。',
    contextLines: [
      { text: '他说:"应该没问题吧?老师说下周三交。"' },
      { condition: { flag: 'mastered_exp' }, text: '你一眼看到了三个问题。' },
      { condition: { flag: 'checks_power' }, text: '你顺手算了一下他要多少人才够。' },
    ],
    choices: [
      {
        id: 'name_the_flaws',
        text: '指出问题:控制组该做等时长的安慰剂活动',
        visibleIf: { flag: 'mastered_exp' },
        outcomes: [
          {
            weight: 2,
            text: '你写了三条:①控制组没有等时长活动,分不清是正念起作用还是"每周被关注八次"起作用;②量表前后测有练习效应;③没有盲法,主试知道分组。\n\n他改了,拿了 95 分,请你吃了饭。\n\n**你在这一刻做的事,跟你十年后审稿时做的事是同一件事。**',
            effects: [
              { stats: { method: 5, capital: 3 } },
              { setFlag: 'can_spot_confounds' },
            ],
          },
          {
            weight: 1,
            text: '你指出来之后他有点不高兴,说"老师又不会看这么细"。\n\n他没改,拿了 78 分,评语第一条就是"缺少适当的对照条件"。\n\n他后来没提这件事。**你学到的是另一件事:看出问题和让人接受,是两种不同的能力。**',
            effects: [
              { stats: { method: 4, capital: -1 } },
              { setFlag: 'can_spot_confounds' },
            ],
          },
        ],
      },
      {
        id: 'nod_along_exp',
        text: '看不出什么问题,说"挺好的"',
        visibleIf: { not: { flag: 'mastered_exp' } },
        outcomes: [
          {
            weight: 1,
            text: '你说挺好的。他交了,拿了 78 分,评语是"缺少适当的对照条件"。\n\n他把评语发给你,问"这是什么意思"。你也不知道。\n\n**你们两个一起去查了什么叫等时长安慰剂对照。** 这是补课最常见的触发方式:不是课上,是被扣分之后。',
            effects: [
              { stats: { method: 3, state: -2 } },
              { addFlag: { key: 'nodded_along', delta: 1, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'ask_the_teacher_together',
        text: '拉他一起去问任课老师',
        outcomes: [
          {
            weight: 1,
            text: '老师用十五分钟把对照条件的设计讲了一遍,还举了三个真实文献的例子。\n\n你们两个都改了自己的作业。**主动去问,是这一行少数几个稳赚不赔的动作。**',
            effects: [
              { stats: { method: 4, capital: 1 } },
              { setFlag: 'asks_when_lost' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_mastery_nodded_reckoning',
    pools: ['undergrad'],
    category: 'method',
    // "假装听懂"攒够了会有一次结账。它不是惩罚,是一次看清自己的机会。
    trigger: { all: [{ year: { from: 2018 } }, { flagNum: { key: 'nodded_along', op: '>=', value: 2 } }] },
    weight: 4,
    title: '毕业论文答辩前一周',
    text: '你在准备答辩 PPT,数据分析那一页写着"采用独立样本 t 检验"。\n\n师姐帮你看的时候问:"你这三组数据,为什么用 t 检验?"\n\n你说因为课上教的是这个。\n\n她说:"三组要用方差分析。而且你这个还是重复测量。"\n\n**你在过去两年里点过很多次头。这是第一次有人当面把账翻出来。**',
    contextLines: [
      { text: '答辩在七天后。' },
      { condition: { flag: 'stats_debt' }, text: '你们的统计课确实没讲到重复测量。' },
      { condition: { flag: 'asks_when_lost' }, text: '你至少已经学会了在这种时候不装。' },
    ],
    choices: [
      {
        id: 'learn_it_now',
        text: '七天,把重复测量方差分析学会',
        outcomes: [
          {
            weight: 2,
            text: '你七天没怎么睡,把张厚粲那一章、一篇教程、和 SPSS 的操作步骤全过了一遍,重跑了一遍数据。\n\n答辩的时候有个老师专门问了这个,你答上来了。\n\n**你补上了,而且是自己补上的。** 这个能力比那个知识重要一百倍。',
            effects: [
              { stats: { method: 7, state: -6 } },
              { setFlag: 'mastered_stats' },
              { setFlag: 'caught_up_the_hard_way' },
            ],
          },
          {
            weight: 1,
            text: '你学了七天,勉强跑出来了,但你不太确定自己做对了。\n\n答辩过了。**你带着这份不确定毕业了,而这一行有非常多的人是这样的**——包括一些后来发了很多论文的人。',
            effects: [
              { stats: { method: 4, state: -5 } },
              { addFlag: { key: 'nodded_along', delta: 1, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'ask_her_to_run_it',
        text: '请师姐帮你跑',
        outcomes: [
          {
            weight: 1,
            text: '她帮你跑了,还写了结果怎么读。你答辩顺利过了。\n\n**这件事在本科阶段没有任何后果**,而且几乎每个组都有人这么干过。它的代价是三年之后:那时候你要自己带学生,而你手上没有这一课。',
            effects: [
              { stats: { method: 1, state: 2 } },
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
              { addFlag: { key: 'nodded_along', delta: 1, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'keep_the_t_test',
        text: '不改了,答辩老师未必会问',
        outcomes: [
          {
            weight: 2,
            text: '没人问。你过了,拿了良好。\n\n**这件事的结局就是这样:什么都没发生。** 而这正是它危险的地方——它教会你的是"这种事糊过去就行了",而这个教训会一直用到你不该用它的时候。',
            effects: [
              { stats: { state: 3, method: -1 } },
              { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } },
              { addFlag: { key: 'nodded_along', delta: 1, min: 0, max: 20 } },
            ],
          },
          {
            weight: 1,
            text: '答辩老师问了。你说"课上教的是 t 检验"。\n\n他说:"那你现在知道了。"然后在评分表上写了什么。\n\n你拿了及格。**这是这四年里最便宜的一次教训**——它只花了你一个等级。',
            effects: [
              { stats: { state: -5, method: 3 } },
              { setFlag: 'called_out_at_defense' },
            ],
          },
        ],
      },
    ],
  },

  // ── 耗竭的读取点:accumulator 不能只写不读 ─────────────────
  {
    id: 'ev_u_burnout_check',
    pools: ['undergrad'],
    category: 'family',
    trigger: { all: [{ year: { from: 2016 } }, { flagNum: { key: 'burnout', op: '>=', value: 18 } }] },
    weight: 4,
    title: '你已经连着三周没睡好了',
    text: '不是失眠。是躺下之后脑子里一直在过明天要做的事,过到三四点。\n\n早上八点的课你能起来,但坐在那里什么都听不进去。你已经这样三周了。\n\n你室友说:"你最近脸色好差。"',
    contextLines: [
      { text: '你自己知道这不正常。你学过。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 45 } }, text: '这已经不是三周了。是从上个学期开始的。' },
      { condition: { flag: 'entered_counseling_center' }, text: '你在咨询中心值班的时候，给别人递过学校心理中心的预约单。' },
    ],
    choices: [
      {
        id: 'go_get_help',
        text: '去学校心理中心约一次',
        outcomes: [
          {
            weight: 2,
            text: '你在预约系统里填表的时候卡了一下:"主要困扰"那一栏你写了三遍才写下去。\n\n第一次见的老师问你:"你学心理学的?"你说是。她说:"那你可能比别人更难开口。"\n\n**她说得对。** 这一行的人求助最难,因为你知道对面在做什么。',
            effects: [
              { stats: { state: 10 } },
              { addFlag: { key: 'burnout', delta: -20, min: 0, max: 100 } },
              { setFlag: 'sought_help_once' },
            ],
          },
          {
            weight: 1,
            text: '你约了,但那周太忙,你改了两次时间,最后没去。\n\n**这件事的最常见结局就是这个**,而它不是懒,是"我还能撑"这个判断——那是这一行最普遍也最贵的一个错误判断。',
            effects: [
              { stats: { state: -2 } },
              { addFlag: { key: 'burnout', delta: 5, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'self_manage',
        text: '自己调整:少接点事,先把睡眠补回来',
        outcomes: [
          {
            weight: 1,
            text: '你退了一个社团,跟师兄说下个月不来实验室了,把手机放到客厅充电。\n\n两周之后你睡得好了一点。**自己管住自己是有效的**,只是它需要你先承认有问题——而承认那一步已经是最难的一步。',
            effects: [
              { stats: { state: 6, capital: -2 } },
              { addFlag: { key: 'burnout', delta: -14, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'push_through',
        text: '硬撑。这学期太关键了',
        outcomes: [
          {
            weight: 2,
            text: '你撑过去了。期末成绩没掉,实验室的活也没耽误。\n\n**代价没有消失,只是被推到了后面。** 它会在某个你没有预料的时刻结算,而那时候你会以为那是一件突然发生的事。',
            effects: [
              { stats: { method: 3, state: -8 } },
              { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你撑到期末最后一周,然后发了一场高烧,躺了五天。\n\n**身体比你先做出了那个决定。** 你在床上躺着的时候想:早两周停下来,损失会小得多。',
            effects: [
              { stats: { state: -6, method: -1 } },
              { addFlag: { key: 'burnout', delta: -8, min: 0, max: 100 } },
              { setFlag: 'body_forced_a_stop' },
            ],
          },
        ],
      },
    ],
  },
];
