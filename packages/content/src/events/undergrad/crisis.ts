import type { GameEvent } from '@psy-sim/core';

/**
 * 本科的危机事件(GAME_DESIGN 8.9)。**极克制。全局只出现一次。**
 *
 * 它遵守六节的危机内容规范,并额外加两条本科专属约束:
 *
 * 1. **不做成"因此你选了临床"的因果强制。** 它在动机线上留一个回响点,但不改变任何路径门槛。
 *    有人因此走向临床,有人因此永远不碰临床——**两种文案都在下面**。
 * 2. **必须明确写出"你什么都做不了"不是玩家的失败。** 一个大二学生没有任何专业能力,
 *    这是事实,不是选择的后果。符合规范的选项必须存在且不是劣势选项,
 *    但游戏也不能让玩家以为这几步就足够了。
 *
 * 机制上:`once: true`、无 `variantGroup`、不进随机池(`mandatory` + 精确 trigger)、
 * 不做变体池。validate 规则 32 守住这几条。
 *
 * `outcomeTag: 'protocol'` 标的是"照规程走"那条路——validate 规则 3 要求它存在,
 * 且数值期望不得为负(否则游戏就在教人别按规范做)。
 */
export const crisisEvents: GameEvent[] = [
  {
    id: 'ev_u_crisis_dorm_night',
    pools: ['undergrad'],
    category: 'crisis',
    mandatory: true,
    once: true,
    tier: 'major',
    // 大二下,而且只发生一次。不进任何变体池。
    trigger: { year: { from: 2016, to: 2016 } },
    order: 40,
    title: '凌晨一点,有人敲你的床板',
    text: '凌晨一点,同宿舍的那个人坐在你床边。\n\n他说他这几天一直没睡。他说他觉得自己撑不住了。他说他不知道为什么要跟你说这个,大概因为你学这个。\n\n然后他哭了。\n\n你坐起来。你学了两年心理学。你知道 DSM 抑郁发作的九条标准,知道什么是自杀意念,知道你现在应该问一句什么。\n\n**你什么都做不了。**\n\n你没有受过训练,没有督导,不知道该不该问那个问题,不知道问了之后接什么。你只有一个二十岁的身体和一间黑着灯的宿舍。',
    contextLines: [
      { text: '窗外很安静。你室友也醒了,但没有出声。' },
      { condition: { flag: 'origin_illness' }, text: '你太熟悉这个场面了。这是你第二次坐在这个位置上。' },
      { condition: { flag: 'mastered_abnormal' }, text: '你脑子里那些标准现在一条都用不上。' },
      { condition: { flag: 'trait_empathic' }, text: '你的手在抖,你希望他没看见。' },
      { condition: { flag: 'trait_resilient' }, text: '你出乎自己意料地平静。你不确定这是好事还是坏事。' },
    ],
    choices: [
      {
        id: 'stay_with_him',
        text: '不说话,陪着他坐到天亮',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'protocol',
            text: '你没有分析他,没有给建议,没有说"你应该想开一点"。你只是坐在那里,偶尔说一句"我在"。\n\n天亮的时候他睡了一会儿。\n\n**你做的这件事是对的**,而且它比任何技术都难——因为你全程都在想"我是不是应该说点什么"。\n\n> 这不是你的失败。一个大二学生没有专业能力,这是事实,不是你的选择造成的。\n> 但陪一夜也不够。天亮之后的事,得有人接。',
            effects: [{ stats: { clinical: 5, state: -4 } }, { setFlag: 'sat_through_the_night' }],
          },
        ],
      },
      {
        id: 'take_him_next_day',
        text: '第二天带他去学校心理中心',
        outcomes: [
          {
            weight: 2,
            outcomeTag: 'protocol',
            text: '你陪他去了四楼那间屋子,在门口等了五十分钟。\n\n出来的时候他说"就是聊了聊"。中心给他约了下一次,还给了一个电话号码。\n\n**你做的这一步,是你在那个位置上能做的最有效的一件事。** 你把他交给了一个比你有能力的人——这在这一行里叫转介,而你在学会这个词之前就先做对了它。',
            effects: [
              { stats: { clinical: 6, method: 2, state: -2 } },
              { setFlag: 'made_first_referral' },
              { setFlag: 'sat_through_the_night' },
            ],
          },
          {
            weight: 1,
            outcomeTag: 'protocol',
            text: '他不肯去。你劝了半小时,他说"我没事了,昨晚就是没睡好"。\n\n你没有强迫他。你把心理中心的电话存进了他手机,又存了一个自己的备份。\n\n**他没去,这不是你劝得不好。** 但你留下的那个号码,三个月后他用了一次。',
            effects: [
              { stats: { clinical: 5, state: -5 } },
              { setFlag: 'left_the_number' },
              { setFlag: 'sat_through_the_night' },
            ],
          },
        ],
      },
      {
        id: 'tell_counselor',
        text: '告诉辅导员',
        outcomes: [
          {
            weight: 2,
            outcomeTag: 'protocol',
            text: '你第二天一早去了辅导员办公室。她当天就联系了心理中心,也联系了他家里。\n\n他后来知道是你说的,有一阵不太跟你讲话。\n\n**你做的是正确的事,而正确的事有代价。** 这是这一行最难的一课,而你在二十岁就上了。',
            effects: [
              { stats: { clinical: 5, method: 2, state: -3, capital: -2 } },
              { setFlag: 'reported_upward' },
              { setFlag: 'right_thing_cost_something' },
            ],
          },
          {
            weight: 1,
            outcomeTag: 'protocol',
            text: '辅导员处理得很好:没有惊动全宿舍,只是找他谈了一次,然后一周找一次。\n\n他从来没问过是谁说的,你也没提。**这件事最好的版本就是这样——没有戏剧性,只有一个人被稳住了。**',
            effects: [
              { stats: { clinical: 5, method: 2, state: -1 } },
              { setFlag: 'reported_upward' },
            ],
          },
        ],
      },
      {
        id: 'try_to_counsel',
        text: '用你学过的东西,试着跟他谈',
        outcomes: [
          {
            weight: 2,
            text: '你问了几个开放式问题,做了两次情感反映,还问了那个你学过的、关于自伤意念的问题。\n\n他愣了一下,说:"你别用你们那套跟我说话。"\n\n他说得对。**你在那一刻不是他的咨询师,你是他室友**,而你把这两个身份搞混了——这是这一行最常见、也最不容易被本人发现的错误。',
            effects: [
              { stats: { clinical: 2, state: -6 } },
              { setFlag: 'blurred_the_role' },
            ],
          },
          {
            weight: 1,
            text: '你谈了两个小时,而且效果看起来还不错——他情绪平稳了,还说了句谢谢。\n\n后来你在督导课上讲起这一晚。督导听完问了一句:"如果那天晚上他说了更严重的话,你准备怎么办?"\n\n你答不上来。**"这次没出事"和"这次做对了"是两件事**,而你花了很多年才分清。',
            effects: [
              { stats: { clinical: 3, state: -3 } },
              { setFlag: 'blurred_the_role' },
              { setFlag: 'got_lucky_once' },
            ],
          },
        ],
      },
      {
        id: 'freeze',
        text: '你不知道该做什么',
        outcomes: [
          {
            weight: 1,
            text: '你说了几句"会好的""要不要喝点水",然后你们都沉默了。他回自己床上了。\n\n第二天你们谁都没提这件事。\n\n> **这不是你的失败。** 你二十岁,凌晨一点,没有受过任何训练。没有人教过你这一课,而学校也没有安排任何人来教。\n> 但你会记住这一晚。有些人因为这一晚走向了临床,有些人因为这一晚永远不碰临床——**这两种都是对这一晚的合理反应。**',
            effects: [
              { stats: { state: -7, clinical: 1 } },
              { setFlag: 'froze_that_night' },
              { addFlag: { key: 'burnout', delta: 6, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },

  // ── 这一晚的两种回响(不改变任何门槛,只改变叙事)──────────
  {
    id: 'ev_u_crisis_echo_toward',
    pools: ['undergrad'],
    category: 'identity',
    trigger: {
      all: [
        { year: { from: 2017 } },
        { any: [{ flag: 'made_first_referral' }, { flag: 'sat_through_the_night' }] },
      ],
    },
    weight: 3,
    title: '你又想起那一晚',
    text: '大三的某节课上,老师讲到危机干预的评估流程:直接询问、评估计划性、评估可及手段、建立安全协议。\n\n她讲得很清楚,一步一步。\n\n你在下面听着,想起那间黑着灯的宿舍。\n\n**如果那天晚上你知道这四步,你会做得好一点。** 这个念头让你把这一节课记得比任何一节都牢。',
    contextLines: [
      { text: '这门课在你们的培养方案里只有两个课时。' },
      { condition: { flag: 'froze_that_night' }, text: '你那天什么都没做。这件事你到现在还会想起来。' },
    ],
    choices: [
      {
        id: 'decide_to_learn',
        text: '决定把这条路走下去:你不想再有那种什么都做不了的时候',
        outcomes: [
          {
            weight: 1,
            text: '你去问了老师危机干预有没有更系统的培训。她说本科阶段没有,研究生的临床方向有。\n\n**这个念头不是一个决定,它是一个方向。** 它会在后面十年里被现实反复修改,但它一直在那儿。',
            effects: [{ stats: { clinical: 4, state: 2 } }, { setFlag: 'motive_reinforced_clinical' }],
          },
        ],
      },
      {
        id: 'decide_it_is_not_for_you',
        text: '决定这条路不适合你',
        outcomes: [
          {
            weight: 1,
            text: '你意识到那一晚给你留下的不是使命感,是恐惧。\n\n**这是一个成熟的判断,而且它救了你。** 有些人硬撑着走进了这条路,然后在第三年因为一个来访者崩掉。你比他们更早认识了自己。',
            effects: [
              { stats: { method: 4, clinical: -2, state: 3 } },
              { setFlag: 'motive_turned_away_clinical' },
            ],
          },
        ],
      },
      {
        id: 'no_conclusion',
        text: '你还没想清楚',
        outcomes: [
          {
            weight: 1,
            text: '你把那四步抄在笔记本上,然后继续上课。\n\n这件事在你心里一直没有结论,而**没有结论也是一种真实的状态**,它可以持续很多年。',
            effects: [{ stats: { clinical: 2, state: -1 } }],
          },
        ],
      },
    ],
  },
];
