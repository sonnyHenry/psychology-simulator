import type { GameEvent } from '@psy-sim/core';

/**
 * 大一(2015):**幻灭**。
 *
 * 这一年的功能只有一个:**这不是你以为的那门学科**。
 *
 * 幻灭必须做足——它是全游戏的情感起点,而且几乎每个心理学人都经历过:
 * 你以为学的是懂人心,第一学期在背神经元结构和记忆的三级模型;
 * 你以为会学弗洛伊德,老师第二节课就说"那不是科学心理学的主流";
 * 第一次考试考的是韦伯定律。
 *
 * 两个 mandatory 时代节点(亲戚追问 / 宿舍夜谈)各有 ≥3 个**按处境分流**的变体
 * (不是靠 `chance` 随机,而是按背景卡和学院归属分流)——这是 M7.5 的纪律,从第一版就要遵守。
 */
export const year1Events: GameEvent[] = [
  // ── 幻灭三连 ─────────────────────────────────────────────
  {
    id: 'ev_u1_first_lecture',
    pools: ['undergrad'],
    category: 'identity',
    mandatory: true,
    trigger: { year: { from: 2015, to: 2015 } },
    order: -10,
    title: '第一堂专业课',
    text: '普通心理学第一课。老师放的第一张 PPT 是一张脑区图。\n\n第二节课有人举手问弗洛伊德什么时候讲,老师说:"精神分析在科学心理学里不是主流,我们这门课不讲。"后排安静了几秒。',
    presentationVariants: [
      {
        condition: { flag: 'origin_illness' },
        title: '第一堂专业课',
        text: '普通心理学第一课。老师放的第一张 PPT 是一张脑区图。\n\n你翻着目录找那一章——你真正想弄明白的那一章。它在书的最后面,十几页。',
      },
      {
        condition: { flag: 'college_medical' },
        title: '第一堂专业课',
        text: '普通心理学第一课,和临床医学的大教室共用一个楼。\n\n老师第一句话是:"你们以后不是医生,这一点现在就要清楚。"',
      },
    ],
    contextLines: [
      { text: '你翻开教材目录,找了半天没看到"读心"这两个字。' },
      { condition: { flag: 'trait_skeptic' }, text: '你反而松了一口气:至少这门课看起来是要讲证据的。' },
      { condition: { flag: 'trait_empathic' }, text: '你有点失望,但你说不清失望的是什么。' },
    ],
    choices: [
      {
        id: 'take_notes',
        text: '把整本书的目录抄一遍,先搞清楚这门学科的骨架',
        outcomes: [
          {
            weight: 1,
            text: '你把目录抄下来贴在书桌前。后来你发现,这一行的人大多都做过这件事——那是他们试图理解自己进了什么门的方式。',
            effects: [{ stats: { method: 3, state: -1 } }],
          },
        ],
      },
      {
        id: 'ask_teacher',
        text: '下课去问老师"那心理咨询要怎么学"',
        outcomes: [
          {
            weight: 3,
            text: '老师说:"先把统计学好。"\n\n你当时完全没听懂这句话的意思。四年后你会在某个下午突然想起它。',
            effects: [{ stats: { method: 2, clinical: 2 } }],
          },
          {
            weight: 2,
            text: '老师反问你:"你想帮谁?"\n\n你没答上来。这个问题跟了你很多年,而且每隔几年答案都不一样。',
            effects: [{ stats: { clinical: 4, state: -2 } }, { setFlag: 'asked_who_do_you_help' }],
          },
        ],
      },
      {
        id: 'shrug',
        text: '算了,先把这学期的课上完再说',
        outcomes: [
          {
            weight: 1,
            text: '你没有为此纠结太久。开学第一周有太多别的事要办——这在四年里回头看,可能是最健康的一种反应。',
            effects: [{ stats: { state: 3, method: -1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_u1_weber',
    pools: ['undergrad'],
    category: 'course',
    mandatory: true,
    trigger: { year: { from: 2015, to: 2015 } },
    title: '第一次专业课考试',
    text: '你复习了两周,以为会考"人为什么会焦虑"。\n\n卷子上第一道大题是**韦伯定律**,第二道是艾宾浩斯遗忘曲线的三个阶段,第三道让你画出记忆的三级模型。\n\n没有一道题跟你报志愿时想的那件事有关。',
    contextLines: [
      { text: '交卷的时候你听见前排两个人在小声争论"感觉阈限"和"差别阈限"哪个是哪个。' },
      { condition: { flag: 'trait_quant' }, text: '说实话,这种题你做得挺顺的。' },
    ],
    choices: [
      {
        id: 'accept',
        text: '接受它:这门学科的样子和你想的不一样',
        outcomes: [
          {
            weight: 1,
            text: '你把"心理学"这三个字在心里重新定义了一次。这个动作你还要做四五次,一直做到读博。',
            effects: [{ stats: { method: 3, state: -2 } }, { setFlag: 'accepted_the_discipline' }],
          },
        ],
      },
      {
        id: 'hold_on',
        text: '不接受:你来学的不是这个',
        outcomes: [
          {
            weight: 2,
            text: '你开始自己找书看——罗杰斯、欧文·亚隆、武志红。课上的东西你只求过。\n\n这条路上有人后来成了很好的咨询师,也有人一直没搞懂自己在做什么。',
            effects: [{ stats: { clinical: 4, method: -2 } }, { setFlag: 'reads_outside_syllabus' }],
          },
          {
            weight: 1,
            text: '你去找了辅导员问转专业。她把政策讲了一遍:大一下学期,专业前 15%。\n\n你算了算自己的排名,回宿舍了。',
            effects: [{ stats: { state: -5, method: 1 } }, { setFlag: 'considered_transfer' }],
          },
        ],
      },
    ],
  },

  // ── 时代节点:亲戚追问(≥3 变体,按处境分流)─────────────
  {
    id: 'ev_era_2015_relatives_urban',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_relatives_ask',
    trigger: { all: [{ year: { from: 2015, to: 2015 } }, { not: { flag: 'origin_rural' } }] },
    weight: 3,
    title: '"你给我看看我在想什么"',
    text: '过年的饭桌上,姑妈知道你学心理学之后,笑着把脸转过来:"来,你给我看看我在想什么。"\n\n一桌子人都在看你。',
    contextLines: [
      { text: '这句话你未来十年会听到几十次,措辞几乎一模一样。' },
      { condition: { flag: 'trait_communicator' }, text: '你其实挺想认真讲讲这门学科到底在干什么。' },
    ],
    choices: [
      {
        id: 'explain',
        text: '认真解释心理学不是读心术',
        outcomes: [
          {
            weight: 2,
            text: '你讲了两分钟实验、统计和被试。姑妈点点头说"哦",然后问旁边的人要不要再添点汤。\n\n你没有讲错任何一句,但那不是她想听的。',
            effects: [{ stats: { method: 1, state: -3 } }],
          },
          {
            weight: 1,
            condition: { flag: 'trait_communicator' },
            text: '你换了个说法:"我们研究的是人怎么记东西、怎么做决定。"姑妈居然听住了,还追问了两句。\n\n那一刻你第一次觉得这门学科可以被讲清楚。',
            effects: [{ stats: { capital: 3, state: 2 } }, { setFlag: 'can_explain_the_field' }],
          },
        ],
      },
      {
        id: 'play_along',
        text: '配合一下,说个她想听的',
        outcomes: [
          {
            weight: 1,
            text: '你说"您最近睡得不好吧",她眼睛一亮说"你怎么知道"。全桌都笑了,气氛很好。\n\n回房间之后你有点说不清的别扭。',
            effects: [{ stats: { capital: 2, state: -1, method: -1 } }],
          },
        ],
      },
      {
        id: 'deflect',
        text: '笑一下,把话题带走',
        outcomes: [
          {
            weight: 1,
            text: '你说"我才大一,还没学到那个"，然后问表弟期末考得怎么样。\n\n这一招你后来用得越来越熟。',
            effects: [{ stats: { state: 2, capital: -1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2015_relatives_rural',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_relatives_ask',
    trigger: { all: [{ year: { from: 2015, to: 2015 } }, { flag: 'origin_rural' }] },
    weight: 3,
    title: '"这个专业出来能干啥"',
    text: '过年回村,二叔问的不是你能不能看出他在想什么。他问的是:"这个专业出来能干啥?"\n\n你父亲在旁边没说话,但你知道他也想听这个答案。',
    contextLines: [
      { text: '你说不出一个具体的单位名字。' },
      { condition: { flag: 'family_wants_stable_job' }, text: '你妈在厨房那边接了一句:"当老师也行。"' },
    ],
    choices: [
      {
        id: 'honest',
        text: '老实说你还不知道',
        outcomes: [
          {
            weight: 1,
            text: '你说"还不太清楚,得看后面读不读研"。二叔点头,说了句"读书是好事",就没再问了。\n\n你父亲那天晚上多抽了两根烟。',
            effects: [{ stats: { state: -4, method: 1 } }, { setFlag: 'family_cost_visible' }],
          },
        ],
      },
      {
        id: 'promise',
        text: '说个听起来稳的:考编当心理老师',
        outcomes: [
          {
            weight: 1,
            text: '一桌子人都松了口气。"当老师好,当老师稳。"\n\n这句话在你后面四年里会变成一根线,你时不时会想起来它拴在哪。',
            effects: [{ stats: { state: 2, capital: 1 } }, { setFlag: 'promised_stable_job' }],
          },
        ],
      },
      {
        id: 'ambitious',
        text: '说你想做研究',
        outcomes: [
          {
            weight: 2,
            text: '"研究啥?"二叔问。你说"人的心理机制"。他没听懂,但说"那你要读到博士吧"。\n\n你说不一定。其实你自己也不知道。',
            effects: [{ stats: { method: 2, state: -2 } }],
          },
          {
            weight: 1,
            text: '你说你想读博。二叔算了一下:"那得到二十八九?"\n\n那顿饭剩下的时间,你一直在心里算这个数。',
            effects: [{ stats: { method: 1, state: -5 } }, { setFlag: 'phd_cost_counted_early' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2015_relatives_medical',
    pools: ['undergrad'],
    category: 'era',
    mandatory: true,
    variantGroup: 'era_relatives_ask',
    trigger: {
      all: [
        { year: { from: 2015, to: 2015 } },
        { any: [{ flag: 'origin_medical_family' }, { flag: 'college_medical' }] },
      ],
    },
    weight: 4,
    title: '"心理学不是精神科"',
    text: '饭桌上没人问你能不能读心。你爸的同事——一位精神科主任——问的是:"你们那个专业,学不学药理?"\n\n你说不学。他点了点头,说:"那你以后遇到重性精神病人,还是得转给我们。"\n\n他说得完全正确,而且没有任何恶意。',
    contextLines: [
      { text: '你第一次意识到"没有处方权"是一句会跟你一辈子的话。' },
      { condition: { flag: 'origin_illness' }, text: '你想起家里那次转诊,当时也是这样一句话决定了后面的事。' },
    ],
    choices: [
      {
        id: 'accept_boundary',
        text: '承认边界,问他转介该怎么做',
        outcomes: [
          {
            weight: 1,
            text: '他给你讲了半小时:什么情况必须转、转给谁、怎么跟家属说。你记了满满一页。\n\n这一页比你这学期任何一门课都实用。',
            effects: [{ stats: { clinical: 5, capital: 2 } }, { setFlag: 'learned_referral_early' }],
          },
        ],
      },
      {
        id: 'push_back',
        text: '说心理干预也有它管得了的部分',
        outcomes: [
          {
            weight: 2,
            text: '他说"那当然",然后补了一句:"但你们那边的门槛太低了,谁都能挂个牌。"\n\n这句话你反驳不了。',
            effects: [{ stats: { clinical: 2, state: -3 } }, { setFlag: 'defended_the_field' }],
          },
          {
            weight: 1,
            text: '你举了 CBT 治疗焦虑的证据。他愣了一下,说"你还挺懂"。\n\n他后来给你留了个手机号,说以后想去科里看看可以找他。',
            effects: [{ stats: { clinical: 3, capital: 4 } }, { setFlag: 'has_psychiatry_contact' }],
          },
        ],
      },
    ],
  },

  // ── 时代节点:宿舍夜谈(≥3 变体)─────────────────────────
  {
    id: 'ev_era_2015_dorm_night_helper',
    pools: ['undergrad'],
    category: 'identity',
    mandatory: true,
    variantGroup: 'era_dorm_night',
    trigger: { all: [{ year: { from: 2015, to: 2015 } }, { not: { flag: 'origin_illness' } }] },
    weight: 3,
    order: 5,
    title: '"你为什么学心理学"',
    text: '熄灯之后,宿舍里聊到这个问题。\n\n上铺说他是调剂来的。对床说他分数刚好够。另一个说他妈觉得女孩子学这个好找对象。\n\n然后他们问你。',
    contextLines: [
      { text: '黑暗里没有人看得见谁的表情,所以那晚说的话都比平时真一点。' },
      { condition: { flag: 'considered_transfer' }, text: '你白天刚去问过转专业。' },
    ],
    choices: [
      {
        id: 'say_help',
        text: '说你想帮人',
        outcomes: [
          {
            weight: 1,
            text: '上铺说"那你选错了,应该学医"。你说不是那种帮。他说"哦"。\n\n这个"哦"里面没有恶意,只是他真的没听懂——你自己也还讲不清。',
            effects: [{ stats: { clinical: 3, state: 1 } }, { setFlag: 'motive_help_people' }],
          },
        ],
      },
      {
        id: 'say_curious',
        text: '说你好奇人是怎么运转的',
        outcomes: [
          {
            weight: 1,
            text: '这个答案在宿舍里没引起什么反应,但它是你后来在无数次面试里给出的那个答案的原型。',
            effects: [{ stats: { method: 3, state: 1 } }, { setFlag: 'motive_curiosity' }],
          },
        ],
      },
      {
        id: 'say_nothing',
        text: '说"随便报的"',
        outcomes: [
          {
            weight: 1,
            text: '大家笑了,话题过去了。\n\n你其实有一个真实的答案,但你在那个晚上决定不说。',
            effects: [{ stats: { state: -2, capital: 1 } }, { setFlag: 'motive_withheld' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2015_dorm_night_private',
    pools: ['undergrad'],
    category: 'identity',
    mandatory: true,
    variantGroup: 'era_dorm_night',
    trigger: { all: [{ year: { from: 2015, to: 2015 } }, { flag: 'origin_illness' }] },
    weight: 4,
    order: 5,
    title: '"你为什么学心理学"',
    text: '熄灯之后,宿舍里聊到这个问题。上铺说他是调剂来的,对床说他分数刚好够。\n\n然后他们问你。\n\n你有一个准确的答案。它跟你家里那件事有关,而且你知道说出来之后这间宿舍的气氛会变。',
    contextLines: [
      { text: '你在黑暗里躺了几秒,想了想要不要说。' },
    ],
    choices: [
      {
        id: 'tell_them',
        text: '说出来',
        outcomes: [
          {
            weight: 2,
            text: '你讲了大概三句。宿舍安静了一会儿,上铺说了句"辛苦了"，然后大家很自然地换了话题——那是一种笨拙但真实的体贴。\n\n后来这几个人是你四年里最不用解释自己的人。',
            effects: [{ stats: { state: 4, capital: 3 } }, { setFlag: 'origin_shared' }],
          },
          {
            weight: 1,
            text: '你讲了大概三句。没人接话。第二天早上也没人提。\n\n你不确定那是尊重还是不知道该说什么。可能两者都有。',
            effects: [{ stats: { state: -3, clinical: 2 } }, { setFlag: 'origin_shared' }],
          },
        ],
      },
      {
        id: 'keep_it',
        text: '不说,给一个体面的答案',
        outcomes: [
          {
            weight: 1,
            text: '你说"觉得这个专业挺有意思的"。话题过去了。\n\n这句话你会在未来很多场合重复使用,熟练到自己都快信了。',
            effects: [{ stats: { clinical: 2, state: -2 } }, { setFlag: 'origin_withheld' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_era_2015_dorm_night_stigma',
    pools: ['undergrad'],
    category: 'identity',
    mandatory: true,
    variantGroup: 'era_dorm_night',
    trigger: { all: [{ year: { from: 2015, to: 2015 } }, { flag: 'college_science' } ] },
    weight: 3,
    order: 5,
    title: '"学这个的是不是都有点问题"',
    text: '熄灯之后,隔壁宿舍串门过来的那个人问:"我听说学心理学的自己都有点问题,是真的吗?"\n\n他是笑着问的。他真的只是好奇。',
    contextLines: [
      { text: '这个问题的另一个版本你以后还会听很多次,有些版本没有这么友好。' },
      { condition: { flag: 'trait_resilient' }, text: '你完全不在意。你只是有点想睡了。' },
    ],
    choices: [
      {
        id: 'joke_back',
        text: '开个玩笑接住',
        outcomes: [
          {
            weight: 1,
            text: '你说"对啊,所以你小心点"。全宿舍笑了。\n\n用玩笑接住这类问题,是这一行的人最早学会的一项技术。',
            effects: [{ stats: { state: 3, capital: 1 } }],
          },
        ],
      },
      {
        id: 'take_it_seriously',
        text: '认真回答这个问题',
        outcomes: [
          {
            weight: 2,
            text: '你说:"确实有人是因为自己遇到过事才来学的。这不代表他们有问题,可能代表他们更认真。"\n\n串门那个人愣了一下,说"有道理"。这句话你后来自己也反复用它说服自己。',
            effects: [{ stats: { clinical: 3, state: 1 } }, { setFlag: 'defended_the_field' }],
          },
          {
            weight: 1,
            text: '你讲得有点长,而且有点激动。讲完之后宿舍安静了两秒,有人说"睡吧"。\n\n你躺下之后觉得自己反应过度了,又觉得自己没有。',
            effects: [{ stats: { clinical: 2, state: -3 } }],
          },
        ],
      },
    ],
  },
];
