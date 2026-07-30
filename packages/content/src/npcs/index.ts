import type { NpcDef } from '@psy-sim/core';

/**
 * 同期人物(GAME_DESIGN 2.6 / 第十二节)。志愿填报后从六位里**选 2 位**。
 *
 * **恋人线不强制**——这是与前作最重要的一处不同。学术生涯里"没有伴侣"和"有伴侣"
 * 是同等重要的两种真实处境,把恋人设成必选等于在设定层面否认了其中一种。
 * (前作把 `first_love` 硬编码成必选 NPC,那是前作的设定,不是引擎的限制。)
 *
 * ## 简介只写 2014 年的样子
 *
 * 这六段简介刻意**只描述你现在看到的这个人**,不写他后面会变成什么、也不写他在这局里
 * 会承担什么功能。理由很直接:**你在十八岁选这两个人的时候,并不知道他们会变成谁。**
 *
 * 提前写出"她会成为你的打听渠道""他会是五个交汇点上的竞争者",等于把二十年的剧情
 * 压缩成一行标签贴在选人屏上,而玩家一旦看过标签,后面每一次相遇都变成了对标签的确认。
 *
 * 所以这里的写法是:一句他是谁 + 一句你现在对他的观察。**足够让人凭直觉选,不够让人算最优解。**
 */
export const npcs: NpcDef[] = [
  {
    id: 'npc_senior_sister',
    name: '师姐',
    description: '实验室里那个总是最后走的人。你问她问题她会回答，但她说话很快，像是随时要赶去下一件事。',
    initialStage: 'lab_senior',
    initialFavor: 40,
    stages: {
      lab_senior: { eventId: 'ev_npc_senior_2016', advanceWhen: { year: { from: 2016 } } },
      extension: { eventId: 'ev_npc_senior_2019', advanceWhen: { year: { from: 2019 } } },
      crossroad: { eventId: 'ev_npc_senior_2021', advanceWhen: { year: { from: 2021 } } },
      other_side: { eventId: 'ev_npc_senior_2026', advanceWhen: { year: { from: 2026 } } },
      reunion: { eventId: 'ev_npc_senior_2030', advanceWhen: { year: { from: 2028 } } },
      settled: {},
    },
  },
  {
    id: 'npc_rival',
    name: '同期',
    description: '和你同一年进来的。开学第一周他就把教材目录读完了，还在图书馆借了两本不在书单上的书。',
    initialStage: 'same_cohort',
    initialFavor: 50,
    stages: {
      same_cohort: { eventId: 'ev_npc_peer_2016', advanceWhen: { year: { from: 2016 } } },
      lab_door: { eventId: 'ev_npc_peer_2019', advanceWhen: { year: { from: 2019 } } },
      first_output: { eventId: 'ev_npc_peer_2022', advanceWhen: { year: { from: 2022 } } },
      separate_tracks: { eventId: 'ev_npc_peer_2027', advanceWhen: { year: { from: 2026 } } },
      colleague: { eventId: 'ev_npc_peer_2032', advanceWhen: { year: { from: 2028 } } },
      settled: {},
    },
  },
  {
    id: 'npc_advisor_to_be',
    name: '那位老师',
    description: '你在学院网站上看过他的主页。四十几篇论文，照片是十年前照的。走廊上遇到过一次，他没认出你。',
    initialStage: 'not_yet_joined',
    initialFavor: 20,
    stages: {
      not_yet_joined: { eventId: 'ev_npc_teacher_2016', advanceWhen: { year: { from: 2016 } } },
      office_hour: { eventId: 'ev_npc_teacher_2019', advanceWhen: { year: { from: 2019 } } },
      reference: { eventId: 'ev_npc_teacher_2022', advanceWhen: { year: { from: 2022 } } },
      peer_review: { eventId: 'ev_npc_teacher_2026', advanceWhen: { year: { from: 2026 } } },
      retirement: { eventId: 'ev_npc_teacher_2031', advanceWhen: { year: { from: 2027 } } },
      settled: {},
    },
  },
  {
    id: 'npc_roommate',
    name: '同宿舍的那个人',
    description: '睡你下铺。作息比你规律，话比你少。你们聊过球、聊过食堂，没聊过别的。',
    initialStage: 'dorm',
    initialFavor: 55,
    stages: {
      dorm: { eventId: 'ev_npc_roommate_2015', advanceWhen: { year: { from: 2015 } } },
      second_year: { eventId: 'ev_npc_roommate_2018', advanceWhen: { year: { from: 2018 } } },
      different_city: { eventId: 'ev_npc_roommate_2021', advanceWhen: { year: { from: 2021 } } },
      spare_bed: { eventId: 'ev_npc_roommate_2026', advanceWhen: { year: { from: 2026 } } },
      old_room: { eventId: 'ev_npc_roommate_2031', advanceWhen: { year: { from: 2028 } } },
      settled: {},
    },
  },
  {
    id: 'npc_hometown_friend',
    name: '高中同学',
    description: '和你考进了同一座城市，学的是另一个专业。他大一就在打听哪家公司暑期招实习。',
    initialStage: 'outside',
    initialFavor: 45,
    stages: {
      outside: { eventId: 'ev_npc_hometown_2015', advanceWhen: { year: { from: 2015 } } },
      internship: { eventId: 'ev_npc_hometown_2017', advanceWhen: { year: { from: 2017 } } },
      first_job: { eventId: 'ev_npc_hometown_2020', advanceWhen: { year: { from: 2020 } } },
      mortgage: { eventId: 'ev_npc_hometown_2024', advanceWhen: { year: { from: 2024 } } },
      same_table: { eventId: 'ev_npc_hometown_2032', advanceWhen: { year: { from: 2028 } } },
      settled: {},
    },
  },
  {
    id: 'npc_partner',
    name: '在一起的那个人',
    description: '你们是这学期认识的。他不太懂你在学什么，但每次你讲的时候他都在听。',
    initialStage: 'together',
    initialFavor: 60,
    stages: {
      together: { eventId: 'ev_npc_partner_2016', advanceWhen: { year: { from: 2016 } } },
      distance: { eventId: 'ev_npc_partner_2019', advanceWhen: { year: { from: 2019 } } },
      years_left: { eventId: 'ev_npc_partner_2023', advanceWhen: { year: { from: 2023 } } },
      two_maps: { eventId: 'ev_npc_partner_2027', advanceWhen: { year: { from: 2027 } } },
      shared_home: { eventId: 'ev_npc_partner_2032', advanceWhen: { year: { from: 2028 } } },
      settled: {},
    },
  },
];
