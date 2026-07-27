import type { GameEvent } from '@psy-sim/core';

/**
 * 大四(2018):**兑现**。手里的牌决定你能去哪。
 *
 * 这一年不再给新东西,只结账。玩家在这一年会第一次清楚地看到:
 * 大二那个周五下午、大三那次没去打听、以及"绩点还不错"——分别值多少。
 */
export const year4Events: GameEvent[] = [
  // ── 诚信线的第一次读账 ───────────────────────────────────
  // GAME_DESIGN 8.6 把诚信线的首笔账放在毕业论文的 `p = .08`(那是 M2.5)。
  // 但简历润色这一笔在本科就记上了,所以这一年必须有人来读它——
  // 否则 `integrity_risk` 就是一个只涨不看的数字,而那正是 validate 规则 4 要拦的东西。
  {
    id: 'ev_u4_integrity_first_read',
    // **schedule 专用事件**,不进任何池。
    //
    // 简历润色发生在 2018,而本科到 2018 就结束了——没有"下一年"可以放这笔账。
    // 所以由写账的那个 outcome 用 `{ schedule: { afterRounds: 0 } }` 把它追加到**当年队列末尾**。
    // 这是前作留下的"年内后果"机制,本作第一次用它。
    pools: [],
    category: 'method',
    trigger: { flagNum: { key: 'integrity_risk', op: '>=', value: 5 } },
    title: '你自己知道那一行是怎么写的',
    text: '你在准备下一场面试,又一次打开那份简历。\n\n"独立完成数据分析"那一行还在。你盯着它看了一会儿。\n\n这件事没有任何人知道。它也不严重——比它严重得多的事,你这一年在群里、在别人的简历里、在师兄的开题报告里都见过。\n\n**它只是你自己知道。**',
    contextLines: [
      { text: '没有人会来查这一行。' },
      { condition: { flag: 'caught_once' }, text: '上一次被追问细节的时候,你出了汗。' },
      {
        condition: { flagNum: { key: 'integrity_risk', op: '>=', value: 10 } },
        text: '不止这一行。你想了想,大概有三处。',
      },
      { condition: { flag: 'trait_rigorous' }, text: '这件事按你的标准是不能接受的,而你还是写了。' },
    ],
    choices: [
      {
        id: 'walk_it_back',
        text: '改回去',
        outcomes: [
          {
            weight: 1,
            text: '你把那一行改成了"参与数据整理与初步分析"。\n\n简历弱了一点。你后面那场面试没过,而你不知道是不是因为这个——**你永远不会知道**,这就是把线画回来的代价。\n\n但你从此有了一个可以对自己说的版本。',
            effects: [
              { stats: { state: 4, capital: -2 } },
              { addFlag: { key: 'integrity_risk', delta: -6, min: 0, max: 100 } },
              { setFlag: 'walked_it_back_once' },
            ],
          },
        ],
      },
      {
        id: 'leave_it',
        text: '留着。所有人都是这么写的',
        outcomes: [
          {
            weight: 2,
            text: '你留着了。这个判断在事实层面是对的——所有人都是这么写的。\n\n**它的问题不在这一行,在你刚才做那个判断时用的那把尺子。** 那把尺子你还要用二十年,而它今天变松了一点。',
            effects: [
              { stats: { capital: 2, state: -1 } },
              { addFlag: { key: 'integrity_risk', delta: 3, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你留着了,而且你在心里给自己划了一条线:简历可以润色,数据不行。\n\n**这条线是真的,很多人一辈子都守住了。** 只是划线的人往往不记得自己是在哪一年划的、当时手边的诱惑有多小。',
            effects: [
              { stats: { capital: 2, method: 1 } },
              { setFlag: 'drew_a_line_somewhere' },
            ],
          },
        ],
      },
    ],
  },

  // ── 时代节点 2018:保研内卷与 347 分数线(≥3 变体)────────
  {
    id: 'ev_era_2018_grad_race_strong',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_2018_grad_race',
    trigger: {
      all: [
        { year: { from: 2018, to: 2018 } },
        { flagNum: { key: 'lab_years', op: '>=', value: 2 } },
      ],
    },
    weight: 4,
    order: -5,
    title: '保研名单公示了',
    text: '推免名单在学院网站上挂出来。你的名字在上面。\n\n名单下面有一行小字:综合成绩 = 学业成绩 × 0.7 + 科研与竞赛 × 0.2 + 综合表现 × 0.1。\n\n你的学业成绩排在第 11。你能进这个名单,靠的是中间那 0.2——两年实验室,一篇会议摘要,一个署名靠后的横向报告。\n\n排在你后面第一个的那个人,学业成绩是第 4。',
    contextLines: [
      { text: '公示期七天。你每天都会去刷一下那个页面。' },
      { condition: { flag: 'entered_counseling_center' }, text: '咨询中心那半年在这张表里没有对应的加分项。' },
      {
        condition: { flagNum: { key: 'rumors_heard', op: '>=', value: 2 } },
        text: '你大三打听过的那几条,现在有两条对上了——你提前一个月就知道哪几个老师今年不招人。',
      },
      { condition: { flag: 'origin_rural' }, text: '你给家里打了电话。你妈问的第一句是"要花钱吗"。' },
    ],
    choices: [
      {
        id: 'take_it',
        text: '接下来,去联系导师',
        outcomes: [
          {
            weight: 1,
            text: '你开始给几个老师发邮件。有一个当天就回了,有两个一直没回。\n\n你后来知道那两个当年已经满了——而这件事,如果你大三去打听过,就会提前一个月知道。',
            effects: [
              { stats: { capital: 5, method: 2 } },
              { setFlag: 'has_grad_offer' },
            ],
          },
        ],
      },
      {
        id: 'look_at_the_gap',
        text: '看着那个第 4 名,想这件事公不公平',
        outcomes: [
          {
            weight: 2,
            text: '你想不出结论。他四年的绩点比你高,你四年在实验室里贴了大概三百次电极。\n\n**这套规则奖励的是提前两年下注的人。** 它不完全公平,但它也不是随机的。',
            effects: [
              { stats: { state: -2, method: 1 } },
              { setFlag: 'has_grad_offer' },
              { setFlag: 'saw_the_rules_clearly' },
            ],
          },
          {
            weight: 1,
            text: '你在食堂遇到了他。他说"恭喜"，然后问你实验室是怎么进的。\n\n你把流程讲了一遍。他听完说:"原来大二就要开始。"\n\n他说这话的时候你俩都知道,现在说这个已经晚了。',
            effects: [
              { stats: { state: -3, capital: 1 } },
              { setFlag: 'has_grad_offer' },
              { setFlag: 'saw_the_rules_clearly' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2018_grad_race_347',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_2018_grad_race',
    trigger: {
      all: [
        { year: { from: 2018, to: 2018 } },
        { flagNum: { key: 'exam_prep', op: '>=', value: 2 } },
      ],
    },
    weight: 4,
    order: -5,
    title: '347 的分数线开始不讲道理',
    text: '你在准备 347 应用心理专硕。\n\n往年的分数线你都抄在本子上:2015 年 320,2016 年 335,2017 年 350。\n\n今年群里有人说某校复试线可能到 370。有人贴出一张截图,某个热门院校报录比 30:1。\n\n你翻回自己的模拟卷分数。上一次是 356。',
    contextLines: [
      { text: '347 不考数学,所以它是全校最多人跨考的专业课之一。' },
      { condition: { flag: 'shallow_stats_training' }, text: '你们统计教得浅,而 347 的心理统计部分只占三十分——这一次它反而不算你的短板。' },
      { condition: { flag: 'doubted_the_clinical_path' }, text: '去年证取消的时候你就动摇过一次。' },
    ],
    choices: [
      {
        id: 'aim_high',
        text: '不改志愿,冲那个热门院校',
        outcomes: [
          {
            weight: 2,
            text: '你把每天的复习时间从八小时加到十一小时。十二月的时候你已经睡不好了。\n\n这个选择是很多人做的,而它的结果不取决于你有多想要。',
            effects: [
              { stats: { method: 4, state: -8 } },
              { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } },
              { addFlag: { key: 'exam_prep', delta: 2, min: 0, max: 6 } },
            ],
          },
          {
            weight: 1,
            text: '你冲了,而且你考上了。\n\n后来你知道那年那个院校的线是 368,你 371。三分。你在很多年后仍然会想起这三分。',
            effects: [
              { stats: { method: 5, capital: 3, state: -5 } },
              { setFlag: 'has_grad_offer' },
              { setFlag: 'won_by_three_points' },
            ],
          },
        ],
      },
      {
        id: 'aim_safe',
        text: '换一个稳的:本校或者本省的一本',
        outcomes: [
          {
            weight: 1,
            text: '你改了志愿。做这个决定那天晚上你没告诉任何人。\n\n**这不是认输,是算术。** 但它在很多年之后仍然会以"如果当初"的形式回来找你几次。',
            effects: [
              { stats: { method: 2, state: -2, capital: 1 } },
              { setFlag: 'has_grad_offer' },
              { setFlag: 'played_it_safe_2018' },
            ],
          },
        ],
      },
      {
        id: 'add_backup',
        text: '同时准备调剂和考编',
        outcomes: [
          {
            weight: 1,
            text: '你开了三个文档:考研、调剂目标院校、教师编。\n\n三条路一起走的人看起来最从容,其实最累——因为你得同时相信三个不同的未来。',
            effects: [
              { stats: { method: 2, capital: 2, state: -5 } },
              { setFlag: 'hedged_2018' },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2018_grad_race_undecided',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_2018_grad_race',
    trigger: { year: { from: 2018, to: 2018 } },
    weight: 2,
    order: -5,
    title: '毕业季,每个人手里都有一张牌',
    text: '三月的宣讲会和四月的复试挤在同一个月。\n\n宿舍里,上铺在准备复试,对床签了一家教育机构,另一个已经考上了县里的教师编。\n\n你在整理简历。写到"专业技能"那一栏时你停了很久:SPSS 会一点,R 不会,访谈做过课堂练习。\n\n**你写不出一件能证明自己会做什么的具体的事。**',
    contextLines: [
      { text: '这份简历你后来又改了十一版。' },
      { condition: { flag: 'no_cards_yet' }, text: '你的绩点在全班前 30%。这是你手上最硬的一张牌,而它在这一栏里派不上用场。' },
      { condition: { flagNum: { key: 'student_work_years', op: '>=', value: 2 } }, text: '你写了两年学生工作。HR 好像挺喜欢这个。' },
      {
        condition: { flag: 'mastered_measurement' },
        text: '"能独立完成量表的信效度分析"——这一行你写得心里很稳,因为它是真的。',
      },
      { condition: { flag: 'late_awakening' }, text: '去年这个时候你才刚开始想这些事。' },
    ],
    choices: [
      {
        id: 'write_honestly',
        text: '老实写,不夸大',
        outcomes: [
          {
            weight: 2,
            text: '你的简历很干净,也很短。\n\n投出去二十份,回了三个。这个比例在那一年不算差,而"没有编造任何一行"这件事,你在后面十年里会一直庆幸。',
            effects: [{ stats: { method: 1, state: -2, capital: 2 } }, { setFlag: 'clean_resume' }],
          },
          {
            weight: 1,
            text: '你把"参与课题研究"改成了"参与课题研究(数据整理)"。\n\n加那四个字的时候你想了几秒钟。这四个字后来让一个面试官对你的印象变好了。',
            effects: [{ stats: { method: 2, capital: 3 } }, { setFlag: 'clean_resume' }],
          },
        ],
      },
      {
        id: 'polish_hard',
        text: '把每一段经历都写到最漂亮',
        outcomes: [
          {
            weight: 2,
            text: '"参与国家级课题""独立完成数据分析""接待来访者数十人次"。每一句都有一个真实的核,外面包了一层。\n\n这份简历效果更好。而你在第二次面试被追问细节的时候出了汗。',
            effects: [
              { stats: { capital: 4, state: -3 } },
              { addFlag: { key: 'integrity_risk', delta: 5, min: 0, max: 100 } },
              { schedule: { eventId: 'ev_u4_integrity_first_read', afterRounds: 0 } },
            ],
          },
          {
            weight: 1,
            text: '面试官问:"你说的独立完成数据分析,用的什么方法?"\n\n你答了。他又问:"为什么用这个不用那个?"\n\n那天回去的路上你把简历改回来了。',
            effects: [
              { stats: { state: -5, method: 2 } },
              { addFlag: { key: 'integrity_risk', delta: 3, min: 0, max: 100 } },
              { setFlag: 'caught_once' },
              { schedule: { eventId: 'ev_u4_integrity_first_read', afterRounds: 0 } },
            ],
          },
        ],
      },
    ],
  },
];
