import type { AdvisorDef } from '@psy-sim/core';

/**
 * 六个导师原型(GAME_DESIGN 第七节)——**本作最大的随机变量**。
 *
 * ## 姓名全部虚构,建制真实
 *
 * validate 规则 10/11:姓名不得命中真实心理学研究者黑名单;`publicImpression` 里的
 * 建制描述(实验室、方向、论文数量级)可以真实。这条边界的理由在 GAME_DESIGN 19.2:
 * **虚构行为不能挂到真实可查的个体身上。**
 *
 * ## 抽卡时你只看得到 `publicImpression`
 *
 * `archetype` 是真实原型,**不进 ViewModel**。真实体验要两三年才由关系事件揭示完。
 * 这个信息差是"换导师窗口逐年关闭"那个张力的全部前提:
 * **你什么都不知道的时候可以换,等你什么都知道了就走不了了。**
 *
 * ## `projectModifiers` 是六个原型在机制上真正不同的地方
 *
 * 它是**乘数**,不是加数——一个放养型导师让每一站都按比例变难,而这件事不是
 * 多投两格精力能补上的。这正是"导师是最大的随机变量"在数值上的样子。
 */
/**
 * **虚构人名 + 真实建制**(GAME_DESIGN 19.2)。
 *
 * 姓名一个都不能真:六原型里有"边界感差的"(挂名、抢一作、要求陪同应酬),
 * 安在真实可查的人身上就是诽谤。而 `institutionId` 必须指向真实存在的机构——
 * 共鸣度几乎全在建制和方向上,这样既保住了质感,又把风险归零。
 * 规则 11 同时查这两条:姓名不许命中人名表,机构必须存在。
 */
export const advisors: AdvisorDef[] = [
  {
    id: 'adv_star',
    institutionId: 'inst_pku',
    archetype: 'star',
    name: '沈遇春',
    publicImpression:
      '主页上挂着 30 多篇一区,国家重点实验室 PI,今年刚拿了一个重点项目。\n\n师兄的原话:"老师很忙,但资源是真的多。你要能自己推着自己走。"',
    poolBias: { method: 1.3, social: 1.2, counseling: 0.7 },
    // 资源顶级:数据、被试、平台都不缺。但没人管你,想法和分析全靠自己。
    projectModifiers: { collect: 1.35, submit: 1.25, review: 1.2, ideation: 0.85, analyze: 0.85 },
    initialStage: 'joined',
    initialFavor: 30,
    stages: {
      joined: { eventId: 'ev_adv_star_reveal', advanceWhen: { year: { from: 2019 } } },
      known: {},
    },
  },
  {
    id: 'adv_young_pi',
    institutionId: 'inst_szu',
    archetype: 'young_pi',
    name: '柯一鸣',
    publicImpression:
      '刚从海外回来两年,三十四岁,组里只有四个学生。主页更新得很勤,连周末的组会记录都挂着。\n\n师姐的原话:"他人很好,就是……很拼。"',
    poolBias: { method: 1.35, era: 1.1, social: 0.9 },
    // 自己在非升即走,把你当同事用。成长最快,压力最大。
    projectModifiers: { ideation: 1.3, analyze: 1.25, write: 1.3, submit: 1.2, collect: 0.9 },
    initialStage: 'joined',
    initialFavor: 55,
    stages: {
      joined: { eventId: 'ev_adv_young_pi_reveal', advanceWhen: { year: { from: 2019 } } },
      known: {},
    },
  },
  {
    id: 'adv_hands_off',
    institutionId: 'inst_bnu',
    archetype: 'hands_off',
    name: '罗慕安',
    publicImpression:
      '快退休了,主页很久没更新,最近的论文是 2016 年的。学生说他人特别好,从来不催。\n\n"不催"这两个字被师兄说了三遍。',
    poolBias: { identity: 1.3, method: 0.8 },
    // 自由到没有指导。**每一站都只给你自己扛**,而这件事不是多投两格精力能补上的。
    projectModifiers: {
      ideation: 0.8,
      lit: 0.85,
      ethics: 0.85,
      collect: 0.85,
      analyze: 0.8,
      write: 0.85,
      submit: 0.8,
      review: 0.8,
    },
    initialStage: 'joined',
    initialFavor: 45,
    stages: {
      joined: { eventId: 'ev_adv_hands_off_reveal', advanceWhen: { year: { from: 2019 } } },
      known: {},
    },
  },
  {
    id: 'adv_clinical',
    institutionId: 'inst_ecnu',
    archetype: 'clinical',
    name: '万淑宜',
    publicImpression:
      '挂靠在附属医院的临床心理科,组里学生每周都去出门诊。论文不算多,但主页上写着"注册督导师"。\n\n师姐的原话:"跟她能学到真东西。"',
    poolBias: { counseling: 1.5, crisis: 1.2, method: 0.75 },
    // 临床成长极快,不重视发文。你会在毕业要求前一年才发现文章不够。
    projectModifiers: { collect: 1.2, ideation: 0.85, analyze: 0.8, write: 0.8, submit: 0.75 },
    initialStage: 'joined',
    initialFavor: 50,
    stages: {
      joined: { eventId: 'ev_adv_clinical_reveal', advanceWhen: { year: { from: 2019 } } },
      known: {},
    },
  },
  {
    id: 'adv_boundary',
    institutionId: 'inst_swu',
    archetype: 'boundary',
    name: '皮崇岳',
    publicImpression:
      '论文数量不少,横向项目做得很大,经常出差。学院官网上的照片是他在一个论坛上讲话。\n\n问了三个人,三个人都说"还行吧"。',
    poolBias: { social: 1.4, method: 1.1, identity: 1.1 },
    // 产出不低,但你的一作会变二作。数值上他不差——**这正是这条线难处理的地方**。
    projectModifiers: { collect: 1.2, submit: 1.15, review: 1.1, analyze: 0.9 },
    initialStage: 'joined',
    initialFavor: 40,
    stages: {
      joined: { eventId: 'ev_adv_boundary_reveal', advanceWhen: { year: { from: 2019 } } },
      known: {},
    },
  },
  {
    id: 'adv_warm',
    institutionId: 'inst_scnu',
    archetype: 'warm',
    name: '苗知白',
    publicImpression:
      '一所普通高校调过来的,组里氛围据说特别好。论文以中文核心为主,有两篇三区。\n\n师姐的原话:"她会记得你的生日。"',
    poolBias: { identity: 1.2, counseling: 1.15, social: 0.9 },
    // 人真的好,平台弱资源少。**你的天花板是她的天花板。**
    projectModifiers: { ideation: 1.15, write: 1.15, analyze: 1.1, collect: 0.85, submit: 0.75, review: 0.8 },
    initialStage: 'joined',
    initialFavor: 65,
    stages: {
      joined: { eventId: 'ev_adv_warm_reveal', advanceWhen: { year: { from: 2019 } } },
      known: {},
    },
  },
];
