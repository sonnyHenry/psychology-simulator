import type { AdvisorSwitchOption, GameEvent } from '@psy-sim/core';

/**
 * 换导师:逐年关闭的窗口 + 递增的成本(GAME_DESIGN 七节)。
 *
 * **你什么都不知道的时候可以换,等你什么都知道了就走不了了。**
 * 这是这个机制全部的意思,也是很多人真实的处境——而它之所以成立,
 * 全靠抽卡屏只给公开印象、真实原型要两三年才揭示完那个信息差。
 *
 * 配套两条纪律:
 *
 * 1. **换导师必须一直可行**,即使代价极高(validate 规则 22 守着 `late` 档)。
 *    现实中它可行,而且有人应该这么做。
 * 2. **换过导师的人不做道德惩罚**,只做数值代价。这条写在事件文案里:
 *    没有一句话说他"不够坚持"。
 */

export const advisorSwitchOptions: AdvisorSwitchOption[] = [
  {
    id: 'switch_early',
    costTier: 'early',
    label: '换一个导师',
    cost: '损失半年,资本小挫。**现在换的代价是这三档里最小的**——而你现在也确实什么都还不知道。',
    // 研一 / 直博一年级。窗口开着的时候,你手上只有公开印象和一两句打听来的话
    availableWhen: { all: [{ advisor: {} }, { year: { from: 2019, to: 2020 } }] },
    eventId: 'ev_switch_advisor_early',
  },
  {
    id: 'switch_mid',
    costTier: 'mid',
    label: '换一个导师',
    cost: '损失一年,手上的课题清零,圈里会有传言。**你现在差不多摸清他了,而代价也上来了。**',
    availableWhen: { all: [{ advisor: {} }, { year: { from: 2021, to: 2022 } }] },
    eventId: 'ev_switch_advisor_mid',
  },
  {
    id: 'switch_late',
    costTier: 'late',
    label: '还是要换',
    // **这一档不许删。** 删了它,"代价极高但始终可行"就变成了"后期不可行"
    cost: '延毕两年,课题全部清零,资本重挫。**它一直可行,只是到这时候几乎没有人还换得动。**',
    availableWhen: { all: [{ advisor: {} }, { year: { from: 2023 } }] },
    eventId: 'ev_switch_advisor_late',
  },
];

/** 三幕换导师。**没有一句话说他"不够坚持"**——数值代价已经够重了 */
export const advisorSwitchEvents: GameEvent[] = [
  {
    id: 'ev_switch_advisor_early',
    pools: ['grad'],
    category: 'social',
    tier: 'major',
    // 关系差 + 还在窗口期时必然把选择摆到玩家面前；事件默认 once，仍然只问一次。
    // 让它再去抢随机槽会把“逐年关闭的窗口”变成几千局都看不到的死机制。
    mandatory: true,
    eventSlotCost: 0,
    trigger: {
      all: [
        { advisor: { favor: { op: '<=', value: 34 } } },
        { year: { from: 2019, to: 2020 } },
        { flag: 'track_academic' },
      ],
    },
    title: '你才来了半年,但你已经知道了',
    text: '半年里你单独见到他四次,每次不超过十分钟。\n\n你昨天在楼道听见另一个组的老师跟学生讲了四十分钟的实验设计。回来的路上你一直在想那四十分钟。\n\n**现在换,你损失的是半年。**',
    contextLines: [
      { text: '你手上还没有真正开起来的课题——这正是换的成本最低的时候。' },
      { condition: { flag: 'trait_pleaser' }, text: '你光是想到要开这个口就已经很难受了。' },
    ],
    choices: [
      {
        id: 'switch_now',
        text: '现在就换',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'advisor_switch',
            text: '你写了封很客气的邮件。他回了三个字:"知道了。"\n\n新组接收得很痛快。**半年确实白过了**,但你后面还有四年半。',
            effects: [
              { stats: { capital: -6, state: -3 } },
              { setFlag: 'switched_advisor' },
              { drawAdvisor: { count: 2 } },
              { favor: { op: 'add', who: 'advisor', direction: 'owing', weight: 2, reason: '你半路走了,而他签了字' } },
            ],
          },
        ],
      },
      {
        id: 'stay_for_now',
        text: '再看看',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'advisor_stay',
            text: '你决定再给一年时间。\n\n**这个选择没有错。** 只是明年再想这件事的时候,代价会是现在的两倍。',
            effects: [{ stats: { state: -1, method: 1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_switch_advisor_mid',
    pools: ['grad'],
    category: 'social',
    tier: 'major',
    mandatory: true,
    eventSlotCost: 0,
    trigger: {
      all: [
        { advisor: { favor: { op: '<=', value: 30 } } },
        { year: { from: 2021, to: 2022 } },
        { flag: 'track_academic' },
      ],
    },
    title: '现在你全都知道了',
    text: '两年下来他是什么样的人,你已经很清楚了。\n\n问题是你手上有两个课题、一批收了一半的数据、一个跑通了的分析管线——**这些东西一样都带不走。**\n\n你算了一下:换,等于把这两年从头再来一遍。',
    contextLines: [
      { text: '你现在知道的东西,是当初那个信息差里换不到的。' },
      { condition: { flag: 'rival_appeared' }, text: '跟你同一天进实验室的那个人已经有一篇了。' },
    ],
    choices: [
      {
        id: 'switch_now',
        text: '认了,重来',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'advisor_switch',
            text: '手上的东西全部作废。新组的第一年你几乎什么都没干成,只是在重新学怎么跟一个人共事。\n\n**这不是一个错误的决定**——它只是一个很贵的决定。',
            effects: [
              { stats: { capital: -12, state: -6 } },
              { extendPhase: { rounds: 1 } },
              { setFlag: 'switched_advisor' },
              { drawAdvisor: { count: 2 } },
            ],
          },
        ],
      },
      {
        id: 'endure',
        text: '忍到毕业',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'advisor_stay',
            text: '你把毕业的日子算成了具体的月份,贴在桌角。\n\n**很多人是这么过来的。** 这条路不比换那条轻松,只是它的代价不出现在任何一份材料上。',
            effects: [
              { stats: { state: -4, method: 2 } },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
              { setFlag: 'endured_advisor' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_switch_advisor_late',
    pools: ['grad'],
    category: 'social',
    tier: 'major',
    mandatory: true,
    eventSlotCost: 0,
    // **窗口没有关。** 它只是贵到几乎没有人还换得动
    trigger: {
      all: [
        { advisor: { favor: { op: '<=', value: 26 } } },
        { year: { from: 2023 } },
        { flag: 'track_academic' },
      ],
    },
    title: '博三,还有一条路,但它很贵',
    text: '出了事之后你去问了学位办。\n\n答复是:可以换,手续走得通,但你的学位论文要重新开题,培养计划重新算——**延毕两年**。\n\n那位老师说完补了一句:"每年都有一两个。"',
    contextLines: [
      { text: '"每年都有一两个"这句话你回去想了很久。' },
      { condition: { flag: 'endured_advisor' }, text: '你已经忍了两年了。' },
    ],
    choices: [
      {
        id: 'switch_now',
        text: '走这条路',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'advisor_switch',
            text: '你成了那"一两个"里的一个。两年很长,长到你后来很少跟人讲这一段。\n\n**但你确实毕业了**,而且是在一个你愿意待的地方毕业的。',
            effects: [
              { stats: { capital: -18, state: -8 } },
              { extendPhase: { rounds: 2 } },
              { setFlag: 'switched_advisor' },
              { setFlag: 'switched_late' },
              { drawAdvisor: { count: 2 } },
            ],
          },
        ],
      },
      {
        id: 'finish_it',
        text: '把它熬完',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'advisor_stay',
            text: '你选择把剩下的时间熬完。\n\n**这也是一个决定,而且是绝大多数人的那个决定。** 它不比另一条更轻松,只是它的代价不写在任何一份材料上。',
            effects: [
              { stats: { state: -6, method: 3 } },
              { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } },
              { setFlag: 'endured_advisor' },
            ],
          },
        ],
      },
    ],
  },
];
