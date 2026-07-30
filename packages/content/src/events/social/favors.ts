import type { GameEvent } from '@psy-sim/core';

/**
 * 人情账的兑现面(GAME_DESIGN 13.2)。
 *
 * ## 只能欠不能还的账是死机制
 *
 * validate 规则 17 强制**每个方向都至少有一处兑现**。这条和规则 4
 * ("累积量写了没人读")同源:一个只进不出的数字看起来在运转,其实什么都没发生。
 *
 * ## 兑现点写在设计里的那四个
 *
 * 推荐信(欠你的人愿意认真写,而不是写一封模板)· **你的稿子落到欠你的人手上**
 * (伦理灰区,而这正是个好事件)· 合作邀约 · 出事时有没有人替你说话。
 * 这里做前两个和"你被人叫去还债"那一个,剩下的等 M5 求职季接上。
 *
 * ## 人情会贬值,所以"什么时候用"才是决策
 *
 * 门控读的是 `favorBalance`,而它算的是**贬值之后**的分量
 * (`systems/favor.ts`)。攒了五年不用的那笔,到求职那年已经不够换一封推荐信了。
 */

const TRAINING_POOLS = ['grad', 'clinical_grad'];
const ACADEMIC_POOLS = ['grad', 'postdoc', 'tenure'];
const PROFESSIONAL_POOLS = [
  ...ACADEMIC_POOLS,
  'clinical_grad',
  'clinical_practice',
  'clinical_late',
];

export const favorEvents: GameEvent[] = [
  // ══════════ 两笔日常的账。**没有这两个,人情账在大多数对局里是空的** ══════════
  //
  // 兑现事件写完之后测出来:学术线局终 `owed` 的中位数是 0——
  // 而一个大部分时间是空的账本,和没有账本是一回事(M4 的耗竭是同一个教训)。
  // 设计里点名的那两件日常事(替人跑被试、师姐把被试池分给你)就是最好的来源。
  {
    id: 'ev_fv_ran_his_subjects',
    pools: TRAINING_POOLS,
    category: 'social',
    trigger: { all: [{ year: { from: 2019 } }, { advisor: {} }] },
    title: '四十个被试',
    text: '师兄的数据收到一半,他得回老家两周。\n\n"四十个人,预约都排好了,你只要念指导语。"\n\n**两周,每天下午三个小时。** 你自己的东西这两周基本停了。',
    contextLines: [
      { text: '这种忙在这一行里没有人会拒绝,而且拒绝一次是要还很久的。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 45 } }, text: '你自己已经很久没喘过气了。' },
    ],
    choices: [
      {
        id: 'run_them',
        text: '接下来',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_earn',
            text: '四十个人,一个不落。他回来的时候数据全在那儿。\n\n他说"回头请你吃饭"——**而这句话在这一行里是有具体分量的**,尽管那顿饭可能三年后才吃上。',
            effects: [
              { stats: { state: -3, method: 1 } },
              { favor: { op: 'add', who: 'peer_generic', direction: 'owed', weight: 3, reason: '你替师兄跑完了那四十个被试' } },
            ],
          },
        ],
      },
      {
        id: 'say_no',
        text: '推掉',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_refuse',
            text: '你说这两周实在排不开。他找了别人,没有说什么。\n\n**你什么都没失去,也什么都没得到。** 只是三年后你需要人帮忙的时候,名单上少了一个。',
            effects: [{ stats: { method: 2, state: 1 } }, { setFlag: 'said_no_to_peer' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_fv_subject_pool',
    pools: TRAINING_POOLS,
    category: 'social',
    trigger: { all: [{ year: { from: 2019 } }, { projectCount: { active: true, op: '>=', value: 1 } }] },
    title: '她把被试池分给了你',
    text: '你的被试招不满,进度卡在那儿快两个月了。\n\n师姐把她攒了三年的被试群转给你一半——**那是她自己毕业要用的**。\n\n"你先用,我下半年再招。"',
    contextLines: [
      { text: '被试池这种东西,在这一行里比钱值钱。' },
      { condition: { flagNum: { key: 'favor_owed_senior', op: '>=', value: 2 } }, text: '你已经欠她好几笔了。' },
    ],
    choices: [
      {
        id: 'take_it',
        text: '收下',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_receive',
            text: '两周之内你补齐了样本。\n\n**这笔账你记着**——而且你知道她下半年招人的时候会很紧。',
            effects: [
              { stats: { method: 2 } },
              { project: { op: 'setField', quality: 5 } },
              { favor: { op: 'add', who: 'npc_senior_sister', direction: 'owing', weight: 3, reason: '她把攒了三年的被试池分了一半给你' } },
            ],
          },
        ],
      },
      {
        id: 'decline_it',
        text: '不要,自己想办法',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_decline',
            text: '你说你再试试。又拖了一个半月才补齐,期间导师问了两次进度。\n\n**你没欠人情,代价是那一个半月。** 这笔账你自己付的。',
            effects: [
              { stats: { state: -4, method: 2 } },
              { addFlag: { key: 'burnout', delta: 6, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_fv_recommendation',
    // 这封信服务的是学术求职；拿到教职以后不再出现。
    pools: ['grad', 'postdoc'],
    category: 'social',
    tier: 'major',
    // 手上有牌才有这一幕。**攒着不用的人到这里会发现牌已经贬值了**
    trigger: {
      all: [
        { year: { from: 2022 } },
        // 求职季发生时，早年那笔 3 点人情通常已贬值到 2；继续要求 3 会让
        // “人情会贬值”退化成“这幕永远不会出现”，而不是一个何时兑现的选择。
        { favorBalance: { direction: 'owed', op: '>=', value: 2 } },
      ],
    },
    title: '你需要一封不是模板的推荐信',
    text: '申请材料里要三封信。前两封好办。\n\n第三封你想了很久——**你需要一封真的写了点什么的信**,而不是"该生学习刻苦、工作认真"。\n\n你翻了翻这些年的账:有几个人是欠着你的。',
    contextLines: [
      { text: '推荐信这种东西,写的人花多少时间是看得出来的。' },
      { condition: { flag: 'saw_rival_as_human' }, text: '你想起那年在楼道里的那句话。' },
    ],
    choices: [
      {
        id: 'cash_it_in',
        text: '开口找那个人',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_cash',
            text: '他回得很快:"你把 CV 发我,我这两天写。"\n\n信是两页纸,里面提到了三件具体的事——**其中一件连你自己都快忘了**。\n\n这笔人情用掉了。',
            effects: [
              { stats: { capital: 6, state: 2 } },
              { favor: { op: 'settle', direction: 'owed', weight: 2 } },
              { setFlag: 'got_a_real_letter' },
            ],
          },
        ],
      },
      {
        id: 'save_it',
        text: '留着这笔,随便找个人写',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_hold',
            text: '你找了一个只上过他两门课的老师。信写得很客气,一件具体的事都没有。\n\n**那笔人情你留住了。** 但人情是会贬值的,而你不知道后面还有没有更该用它的地方。',
            effects: [{ stats: { capital: 1, state: -1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_fv_called_in',
    pools: PROFESSIONAL_POOLS,
    category: 'social',
    // 欠着的时候才有人来找你。**这就是"欠太多本身是压力"的具体样子**
    trigger: {
      all: [
        { year: { from: 2021 } },
        { favorBalance: { direction: 'owing', op: '>=', value: 3 } },
      ],
    },
    title: '"上次那个事,你还记得吧"',
    text: '电话是晚上十点打来的。寒暄了两句,然后是那句:"上次那个事,你还记得吧。"\n\n他要你下周替他去外地做两天的培训——你的课、你的数据、你手上正在收尾的那一段,全都要往后挪。\n\n**你确实欠他的。**',
    contextLines: [
      { text: '你翻了翻这些年欠下的账,不止他一个人。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 45 } }, text: '你已经很久没有一个完整的周末了。' },
    ],
    choices: [
      {
        id: 'go',
        text: '去',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_repay',
            text: '两天下来讲了十二个小时,回来那周你什么都没推进。\n\n**但账清了。** 而清账这件事本身让你松了一口气——你自己都没想到会这样。',
            effects: [
              { stats: { state: -5, capital: 2, money: 3000 } },
              { favor: { op: 'settle', direction: 'owing', weight: 3 } },
            ],
          },
        ],
      },
      {
        id: 'decline',
        text: '推掉',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_dodge',
            text: '你说那周实在走不开。他说"没事没事",挂得很快。\n\n**账还在那儿**,而且从今往后你每次想起这个人,心里都要先过一下这件事。',
            effects: [
              { stats: { state: -3, method: 2 } },
              { favor: { op: 'add', who: 'peer_generic', direction: 'owing', weight: 1, reason: '你推掉了一次他开口的请求' } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_fv_reviewer_owes_you',
    pools: ACADEMIC_POOLS,
    category: 'social',
    tier: 'major',
    // 稿件在审与尚未贬值的人情同时存在时，这个伦理冲突本身就已经发生；
    // 不再让它和日常随机事件竞争一次额外的抽签。
    mandatory: true,
    eventSlotCost: 0,
    // **伦理灰区,而这正是个好事件**(13.2 点名要的那一个)
    trigger: {
      all: [
        // 2023 太晚了:那时候手上的人情已经贬值到 2 以下,而稿子在审的窗口本来就窄,
        // 三个条件一交就几乎撞不上(3000 局里一次都没触发过)。
        { year: { from: 2021 } },
        { favorBalance: { direction: 'owed', op: '>=', value: 2 } },
        { projectCount: { stage: 'review', op: '>=', value: 1 } },
      ],
    },
    title: '主编把稿子送到了谁手上',
    text: '一个欠着你人情的人在群里随口说了一句:"最近在审一篇做{{project}}那个方向的。"\n\n时间对得上,方向对得上。**大概率就是你那篇。**\n\n你们私下还有联系。你可以什么都不做,也可以顺口提一句。',
    contextLines: [
      { text: '这种事没有任何规定能拦住,拦住它的一直是别的东西。' },
      { condition: { flag: 'abused_review' }, text: '你自己也在评审里做过一次不该做的事。' },
    ],
    choices: [
      {
        id: 'say_nothing',
        text: '什么都不说',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_clean',
            text: '你把那句话当没看见,该改的地方自己改。\n\n**这一格不给你任何东西**——没有加分,没有人知道。它只是让你在很多年以后想起这件事的时候是平静的。',
            effects: [
              { stats: { state: 3 } },
              { setFlag: 'kept_review_clean' },
            ],
          },
        ],
      },
      {
        id: 'nudge_him',
        text: '顺口提一句"那篇是我的"',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'favor_gray',
            text: '他回了个"哦哦",没再说什么。\n\n一个月后意见回来了,写得很客气。**你永远不会知道那份客气里有多少是因为文章本身。**',
            effects: [
              { stats: { capital: 2, state: -2 } },
              { project: { op: 'setField', quality: 6 } },
              { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } },
              { favor: { op: 'settle', direction: 'owed', weight: 2 } },
            ],
          },
        ],
      },
    ],
  },
];
