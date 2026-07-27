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
    stages: { lab_senior: {} },
  },
  {
    id: 'npc_rival',
    name: '同期',
    description: '和你同一年进来的。开学第一周他就把教材目录读完了，还在图书馆借了两本不在书单上的书。',
    initialStage: 'same_cohort',
    initialFavor: 50,
    stages: { same_cohort: {} },
  },
  {
    id: 'npc_advisor_to_be',
    name: '那位老师',
    description: '你在学院网站上看过他的主页。四十几篇论文，照片是十年前照的。走廊上遇到过一次，他没认出你。',
    initialStage: 'not_yet_joined',
    initialFavor: 20,
    stages: { not_yet_joined: {} },
  },
  {
    id: 'npc_roommate',
    name: '同宿舍的那个人',
    description: '睡你下铺。作息比你规律，话比你少。你们聊过球、聊过食堂，没聊过别的。',
    initialStage: 'dorm',
    initialFavor: 55,
    stages: { dorm: {} },
  },
  {
    id: 'npc_hometown_friend',
    name: '高中同学',
    description: '和你考进了同一座城市，学的是另一个专业。他大一就在打听哪家公司暑期招实习。',
    initialStage: 'outside',
    initialFavor: 45,
    stages: { outside: {} },
  },
  {
    id: 'npc_partner',
    name: '在一起的那个人',
    description: '你们是这学期认识的。他不太懂你在学什么，但每次你讲的时候他都在听。',
    initialStage: 'together',
    initialFavor: 60,
    stages: { together: {} },
  },
];
