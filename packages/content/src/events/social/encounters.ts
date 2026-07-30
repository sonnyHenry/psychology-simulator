import type { GameEvent } from '@psy-sim/core';

/**
 * 五个交汇点(GAME_DESIGN 13.1)。**每个都有"他领先"和"你领先"两个版本**
 * (validate 规则 16),因为同一件事在这两种处境下根本不是同一件事:
 * 一作之争在你落后时是屈辱,在你领先时是你手上有一张可以让出去的牌。
 *
 * ## 他不是反派
 *
 * 五个里有两个(会议重逢、他的低谷)是**你看见他的处境**的那种。
 * 那时候他从对手变成同类——而这个转折比"他又发了一篇"有分量得多,
 * 也是这条线唯一能长出温度的地方。
 *
 * ## 每一幕都在改他的 momentum
 *
 * 13.1 第一条设计约束是"他的强弱部分取决于你的选择"。所以每个选项都带
 * `{ rival: { op: 'nudge' } }`——你帮过他、抢过他的机会、在他低谷时说过一句话,
 * 这些都要在他后面十年的数字里留下痕迹。**不能修正的对手是一条固定难度曲线,不是人。**
 */

/** 一作冲突仍发生在别人的课题组里，只适用于培养阶段、博后和临床专硕。 */
const RIVAL_LAB_POOLS = ['grad', 'postdoc', 'clinical_grad'];
/** 审稿、会议与低谷会延续到独立职业阶段。 */
const RIVAL_CAREER_POOLS = [
  'grad',
  'postdoc',
  'tenure',
  'clinical_grad',
  'clinical_practice',
  'clinical_late',
];
/** “同投一个岗”只能发生在仍处于学术求职窗口的阶段。 */
const RIVAL_JOB_SEARCH_POOLS = ['grad', 'postdoc'];

/** 交汇点的公共形状。`once: true`——同一个交汇点一局只发生一次 */
function encounter(
  id: string,
  pools: string[],
  fields: Omit<GameEvent, 'id' | 'pools' | 'category'>,
): GameEvent {
  return { id, pools, category: 'social', ...fields };
}

export const rivalEncounterEvents: GameEvent[] = [
  // ══════════ ① 一作之争 ══════════
  encounter('ev_rv_authorship_behind', RIVAL_LAB_POOLS, {
    tier: 'major',
    weight: 4,
    title: '同一批数据,两个人',
    trigger: {
      all: [
        { rival: { met: true, aheadOfPlayer: true } },
        { year: { from: 2020 } },
        { projectCount: { active: true, op: '>=', value: 1 } },
      ],
    },
    text: '你和{{advisor}}组里的另一个人用的是同一批数据。他比你早两个月开始写。\n\n今天开会,导师说:"这篇让他先出,他今年要毕业。"\n\n他没看你。**他也知道这句话意味着什么。**',
    contextLines: [
      { text: '你们两个后面十几年会反复在同一个地方出现。' },
      { condition: { flag: 'rival_is_friend' }, text: '你们大二一起读过一年文献。' },
    ],
    choices: [
      {
        id: 'let_it_go',
        text: '让给他',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_yield',
            text: '你说行。他愣了一下,说了句"谢谢"。\n\n**这笔账他记住了**——而在这一行里,记住这种事的人比你想的多。',
            effects: [
              { stats: { state: -4, capital: 2 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 4, reason: '你把那篇的一作让给了他' } },
              { rival: { op: 'nudge', momentum: 0.15, papers: 1 } },
              { rival: { op: 'encounter', id: 'authorship' } },
              { setFlag: 'yielded_first_author' },
            ],
          },
        ],
      },
      {
        id: 'push_back',
        text: '争一下',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_fight',
            text: '你说这批数据的清洗方案是你写的。会议室安静了几秒。\n\n最后是共同一作。**没有人不高兴,也没有人高兴。**',
            effects: [
              { stats: { method: 2, state: -3 } },
              { project: { op: 'setField', authorship: 'co_first' } },
              { rival: { op: 'nudge', momentum: -0.05 } },
              { rival: { op: 'encounter', id: 'authorship' } },
            ],
          },
        ],
      },
    ],
  }),
  encounter('ev_rv_authorship_ahead', RIVAL_LAB_POOLS, {
    tier: 'major',
    title: '这次轮到他来问你',
    trigger: {
      all: [
        { rival: { met: true, aheadOfPlayer: false } },
        { year: { from: 2020 } },
        { projectCount: { active: true, op: '>=', value: 1 } },
      ],
    },
    text: '他敲门进来,站着说完了整件事:你们那批共享数据,他想用其中一部分再做一篇,一作署他。\n\n"我今年得有东西。"\n\n**他从来没有用这种语气跟你说过话。**',
    contextLines: [
      { text: '你手上的东西比他多,这件事你们两个都知道。' },
      { condition: { flag: 'rival_is_friend' }, text: '你们大二一起读过一年文献。' },
    ],
    choices: [
      {
        id: 'give',
        text: '给他',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_yield',
            text: '你说你用不上那一部分,拿去吧。\n\n**你手上有牌的时候让出去,和没有牌的时候被拿走,是两件事。** 他也懂这个区别。',
            effects: [
              { stats: { capital: 2, state: 1 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 4, reason: '你把那部分数据让给了他' } },
              { rival: { op: 'nudge', momentum: 0.12, papers: 1 } },
              { rival: { op: 'encounter', id: 'authorship' } },
            ],
          },
        ],
      },
      {
        id: 'refuse',
        text: '不给',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_fight',
            text: '你说你自己还要用。他点点头就走了,没有多说一句。\n\n**你没有做错任何事。** 这件事之后你们再也没有一起吃过饭。',
            effects: [
              { stats: { state: -3, method: 1 } },
              { rival: { op: 'nudge', momentum: -0.12 } },
              { rival: { op: 'encounter', id: 'authorship' } },
              { setFlag: 'refused_rival' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ ② 互相审稿 ══════════
  encounter('ev_rv_review_behind', RIVAL_CAREER_POOLS, {
    tier: 'major',
    title: '稿子是他的',
    trigger: {
      all: [
        { rival: { met: true, aheadOfPlayer: true } },
        { year: { from: 2022 } },
        { paperCount: { op: '>=', value: 1 } },
      ],
    },
    text: '编辑部第一次请你审稿。你点开 PDF,作者信息没有隐去。\n\n**是他的。**\n\n文章不错,但有一处分析你觉得站不住。这一处如果写重了,这篇至少要多走半年。',
    contextLines: [
      { text: '他现在比你多几篇,这件事你每年都会算一次。' },
      { condition: { flagNum: { key: 'integrity_risk', op: '>=', value: 3 } }, text: '你自己那篇的清理规则,也不是每一条都写在文里了。' },
    ],
    choices: [
      {
        id: 'honest',
        text: '照专业判断写',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_fair',
            text: '你把那处写清楚了,措辞很克制,还给了两条可行的补救。\n\n**你不知道他后来知不知道审稿人是你。** 这一行里大多数这样的事都没有下文。',
            effects: [
              { stats: { method: 4, capital: 1 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 2, reason: '你审他的稿子时给了两条能救的意见' } },
              { rival: { op: 'encounter', id: 'review' } },
              { rival: { op: 'reveal', visibility: 1 } },
            ],
          },
        ],
      },
      {
        id: 'weaponize',
        text: '写重一点',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_abuse',
            text: '你把那一处写成了"根本性缺陷",又加了两条不太必要的要求。\n\n稿子被拒了。**没有人会知道这件事**——包括很多年以后的你自己,如果你不去想的话。',
            effects: [
              { stats: { state: -5, capital: 1 } },
              { addFlag: { key: 'integrity_risk', delta: 3, min: 0, max: 100 } },
              { rival: { op: 'nudge', momentum: -0.2 } },
              { rival: { op: 'encounter', id: 'review' } },
              { setFlag: 'abused_review' },
            ],
          },
        ],
      },
    ],
  }),
  encounter('ev_rv_review_ahead', RIVAL_CAREER_POOLS, {
    tier: 'major',
    title: '他是你的审稿人',
    trigger: {
      all: [
        { rival: { met: true, aheadOfPlayer: false } },
        { year: { from: 2022 } },
        { projectCount: { stage: 'review', op: '>=', value: 1 } },
      ],
    },
    text: '两条审稿意见回来了。第二条你读到第三行就停住了——**那个措辞你太熟了。**\n\n意见提得很细,细到只有做过同一批数据的人才提得出来。最后一句是:"建议小修后接收。"',
    contextLines: [
      { text: '你没有办法确认,而且你也不该去确认。' },
      { condition: { flag: 'yielded_first_author' }, text: '你想起那年你把一作让给了他。' },
    ],
    choices: [
      {
        id: 'just_revise',
        text: '当作不知道,认真改',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_fair',
            text: '你按意见改完,接收了。\n\n**这一行里很多善意是匿名的**,而且永远不会被确认。你只能选择相信它存在过。',
            effects: [
              { stats: { method: 3, state: 3 } },
              { project: { op: 'setField', quality: 8 } },
              { rival: { op: 'encounter', id: 'review' } },
              { rival: { op: 'reveal', visibility: 1 } },
            ],
          },
        ],
      },
      {
        id: 'thank_him',
        text: '找个由头当面谢他',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_warm',
            text: '你在组会后聊起那篇,说"审稿意见提得真好"。他说"是吗",低头收电脑。\n\n**你们谁都没有承认过这件事。** 但从那年起,他有活会想到你。',
            effects: [
              { stats: { capital: 3, state: 2 } },
              { favor: { op: 'add', who: 'rival', direction: 'owing', weight: 2, reason: '他大概替你说了话,而你没法确认' } },
              { rival: { op: 'nudge', momentum: 0.05 } },
              { rival: { op: 'encounter', id: 'review' } },
              { rival: { op: 'reveal', visibility: 2 } },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ ③ 会议上遇见 ══════════
  encounter('ev_rv_conference_behind', RIVAL_CAREER_POOLS, {
    title: '他的名片换了头衔',
    trigger: { all: [{ rival: { met: true, aheadOfPlayer: true } }, { year: { from: 2023 } }] },
    text: '年会的茶歇。你端着一杯温的美式,他从人堆里走过来。\n\n名片上的头衔和上次不一样了。他问你最近在做什么,你说了两句,他说"挺好的"。\n\n**"挺好的"这三个字在这一行有很多种意思。**',
    contextLines: [
      { text: '茶歇一共二十分钟,你们说了不到三分钟。' },
      { condition: { flag: 'refused_rival' }, text: '你们上一次说话是那年他来找你要数据。' },
    ],
    choices: [
      {
        id: 'ask_how',
        text: '认真问他这几年怎么过的',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_warm',
            text: '他愣了一下,然后说了很多:延过一年、有一年一篇没出来、去年差点转行。\n\n**你一直以为他一路顺风。** 那杯咖啡凉透了你们才散。',
            effects: [
              { stats: { state: 4, capital: 2 } },
              { rival: { op: 'reveal', visibility: 3 } },
              { rival: { op: 'encounter', id: 'conference' } },
              { setFlag: 'saw_rival_as_human' },
            ],
          },
        ],
      },
      {
        id: 'keep_it_short',
        text: '客气两句就走开',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_cool',
            text: '你说还有个报告要听,先走了。\n\n**你后来在朋友圈看到他那天发的照片**,配文是"见到很多老朋友"。你在照片的边上。',
            effects: [
              { stats: { state: -2 } },
              { rival: { op: 'reveal', visibility: 1 } },
              { rival: { op: 'encounter', id: 'conference' } },
            ],
          },
        ],
      },
    ],
  }),
  encounter('ev_rv_conference_ahead', RIVAL_CAREER_POOLS, {
    title: '这次是他来找你',
    trigger: { all: [{ rival: { met: true, aheadOfPlayer: false } }, { year: { from: 2023 } }] },
    text: '年会的茶歇。他端着杯子走过来,先问了你那篇的事——他读过,而且记得数据量。\n\n聊到一半他说:"你比我做得好。"\n\n**这句话他说得很平静,而你一时不知道该怎么接。**',
    contextLines: [
      { text: '你手上的东西比他多,这件事你们两个都知道。' },
      { condition: { flag: 'rival_is_friend' }, text: '你们大二一起读过一年文献。' },
    ],
    choices: [
      {
        id: 'offer_help',
        text: '问他要不要一起做点什么',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_warm',
            text: '你说手上有个方向缺人,问他有没有兴趣。他说他想想。\n\n三个月后他发邮件来了。**这一行里最好的合作,一半是这样开始的。**',
            effects: [
              { stats: { capital: 4, method: 2 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 3, reason: '你在他不顺的时候拉了他一把' } },
              { rival: { op: 'nudge', momentum: 0.15 } },
              { rival: { op: 'reveal', visibility: 3 } },
              { rival: { op: 'encounter', id: 'conference' } },
              { setFlag: 'saw_rival_as_human' },
            ],
          },
        ],
      },
      {
        id: 'accept_it',
        text: '受着这句话',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_cool',
            text: '你说哪有。他笑了笑,去跟别人说话了。\n\n**你等这句话等了很多年,真等到的时候没有想象中那么好。**',
            effects: [
              { stats: { capital: 1, state: 1 } },
              { rival: { op: 'reveal', visibility: 2 } },
              { rival: { op: 'encounter', id: 'conference' } },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ ④ 他的低谷(**他从对手变成同类的那一幕**)══════════
  encounter('ev_rv_struggling_behind', RIVAL_CAREER_POOLS, {
    tier: 'major',
    title: '他一年没出东西',
    trigger: {
      all: [{ rival: { met: true, struggling: true, aheadOfPlayer: true } }, { year: { from: 2022 } }],
    },
    text: '你听说他今年一篇都没有。有人说他在准备大的,有人说不是。\n\n后来你在楼道里遇到他。他瘦了,说话的时候一直在看别处。\n\n**你忽然想起来他也只有二十几岁。**',
    contextLines: [
      { text: '你自己也有过那样的一年,或者正在过。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 50 } }, text: '你现在的样子未必比他好。' },
    ],
    choices: [
      {
        id: 'say_something',
        text: '说一句话',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_warm',
            text: '你说:"我去年也这样。"\n\n他看了你一眼,说"嗯"。就这么一句,但那天之后你们之间那种东西变了。\n\n**竞争关系里最难得的不是赢,是有人知道你在扛什么。**',
            effects: [
              { stats: { state: 5 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 3, reason: '他最难的那年你说了一句话' } },
              { rival: { op: 'nudge', momentum: 0.1 } },
              { rival: { op: 'reveal', visibility: 3 } },
              { rival: { op: 'encounter', id: 'struggle' } },
              { setFlag: 'saw_rival_as_human' },
            ],
          },
        ],
      },
      {
        id: 'stay_out',
        text: '不掺和',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_cool',
            text: '你点了下头就过去了。这不算错——**你们不熟,而且他也未必想被人看见**。\n\n只是那个画面你记了很久。',
            effects: [
              { stats: { state: -1 } },
              { rival: { op: 'reveal', visibility: 2 } },
              { rival: { op: 'encounter', id: 'struggle' } },
            ],
          },
        ],
      },
    ],
  }),
  encounter('ev_rv_struggling_ahead', RIVAL_CAREER_POOLS, {
    tier: 'major',
    title: '你已经走在前面了,而他停下来了',
    trigger: {
      all: [{ rival: { met: true, struggling: true, aheadOfPlayer: false } }, { year: { from: 2022 } }],
    },
    text: '他今年一篇都没有,而你手上正顺。\n\n有人在群里问起他,没有人接话。\n\n**你比谁都清楚那种年份是什么样的**——因为你也有过,只是你的那次撑过来了。',
    contextLines: [
      { text: '你手上的东西比他多,这件事你们两个都知道。' },
      { condition: { flag: 'saw_rival_as_human' }, text: '你见过他难的时候是什么样。' },
    ],
    choices: [
      {
        id: 'reach_out',
        text: '主动约他吃个饭',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_warm',
            text: '他先说没空,过了两天又说那就吃吧。\n\n那顿饭他没怎么说自己的事,倒是把你那篇的一个问题指出来了——**很准。他一直都很准。**',
            effects: [
              { stats: { state: 4, method: 2 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 3, reason: '他最难的那年你约了他一顿饭' } },
              { rival: { op: 'nudge', momentum: 0.18 } },
              { rival: { op: 'reveal', visibility: 3 } },
              { rival: { op: 'encounter', id: 'struggle' } },
              { setFlag: 'saw_rival_as_human' },
            ],
          },
        ],
      },
      {
        id: 'focus_on_self',
        text: '专心做自己的',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_cool',
            text: '你什么也没做。你手上的事情确实很多。\n\n**这不是冷漠,只是这一行里大家都在自顾不暇。** 那年之后他慢了下来。',
            effects: [
              { stats: { method: 2 } },
              { rival: { op: 'nudge', momentum: -0.1 } },
              { rival: { op: 'reveal', visibility: 2 } },
              { rival: { op: 'encounter', id: 'struggle' } },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ ⑤ 同投一个岗(学术线才有)══════════
  encounter('ev_rv_same_position_behind', RIVAL_JOB_SEARCH_POOLS, {
    tier: 'major',
    // 求职窗口只有两年；符合条件时保证发生，否则扩池后很容易整局错过这次交汇。
    mandatory: true,
    title: '候选名单上有他',
    trigger: {
      all: [
        { rival: { met: true, aheadOfPlayer: true } },
        { flag: 'track_academic' },
        { year: { from: 2024 } },
      ],
    },
    text: '你投了那个岗。面试通知来的时候附了当天的日程——**同一个上午,四个候选人,他排在你前面。**\n\n你们在会议室外面碰上了。他说:"你也来了。"',
    contextLines: [
      { text: '这个岗一个人,你们两个都很想要。' },
      { condition: { flag: 'saw_rival_as_human' }, text: '你见过他难的时候是什么样。' },
    ],
    choices: [
      {
        id: 'talk_before',
        text: '进去之前跟他说两句',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_warm',
            text: '你们聊了五分钟,聊的居然是各自这七年最难的那一段。\n\n轮到他进去的时候,你说了句"顺利"。**你是真心的,而这件事本身让你有点意外。**',
            effects: [
              { stats: { state: 3, capital: 1 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 2, reason: '面试那天你在门口跟他说了句顺利' } },
              { rival: { op: 'reveal', visibility: 3 } },
              { rival: { op: 'encounter', id: 'same_position' } },
              { setFlag: 'saw_rival_as_human' },
            ],
          },
        ],
      },
      {
        id: 'stay_sharp',
        text: '把状态收住,别被带走',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_cool',
            text: '你点点头,回去把开场那三分钟又过了一遍。\n\n**这是对的做法。** 你也确实讲得比平时好。',
            effects: [
              { stats: { capital: 3, state: -2 } },
              { rival: { op: 'encounter', id: 'same_position' } },
            ],
          },
        ],
      },
    ],
  }),
  encounter('ev_rv_same_position_ahead', RIVAL_JOB_SEARCH_POOLS, {
    tier: 'major',
    mandatory: true,
    title: '你是那个更被看好的',
    trigger: {
      all: [
        { rival: { met: true, aheadOfPlayer: false } },
        { flag: 'track_academic' },
        { year: { from: 2024 } },
      ],
    },
    text: '同一个岗,同一个上午。你的材料比他厚。\n\n中午吃饭的时候有个老师半开玩笑地问你:"你觉得他怎么样?"\n\n**这句话不是闲聊。**',
    contextLines: [
      { text: '这个岗一个人,你们两个都很想要。' },
      { condition: { flag: 'yielded_first_author' }, text: '你想起那年你把一作让给了他。' },
    ],
    choices: [
      {
        id: 'speak_well',
        text: '实话实说,他很好',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_fair',
            text: '你说他方法很扎实,那批数据当年是他救回来的。\n\n那个老师"哦"了一声,没再问。**你不知道这句话有没有起作用**,而你也永远不会知道。',
            effects: [
              { stats: { state: 3, capital: 1 } },
              { favor: { op: 'add', who: 'rival', direction: 'owed', weight: 3, reason: '有人问起他时你说了实话' } },
              { rival: { op: 'nudge', momentum: 0.1 } },
              { rival: { op: 'encounter', id: 'same_position' } },
            ],
          },
        ],
      },
      {
        id: 'stay_quiet',
        text: '含糊过去',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'rival_cool',
            text: '你说"挺好的,不太熟"。\n\n**"不太熟"这三个字是假的**,而说完之后那顿饭你没怎么再吃。',
            effects: [
              { stats: { capital: 2, state: -3 } },
              { rival: { op: 'nudge', momentum: -0.08 } },
              { rival: { op: 'encounter', id: 'same_position' } },
            ],
          },
        ],
      },
    ],
  }),
];
