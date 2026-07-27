import type { Citation, Foundation } from '@psy-sim/core';

/**
 * 真实文献种子池(GAME_DESIGN 19.3)。
 *
 * ## `verified` 是流程字段,不是装饰
 *
 * validate 规则 9 拒绝任何 `verified !== true` 的引用进入构建,并要求
 * `LEDGER.md` 里有对应条目(引用 id + 核对人 + 日期)。
 *
 * 理由是 GAME_DESIGN 二十二节第 10 条:**把真实文献的结论写反是这个游戏最不能犯的错。**
 * 一个讲科研诚信的游戏如果自己把文献说错了,它讲的每一句话都不成立。
 *
 * ## 挑选标准:只收"结论方向不会有争议"的
 *
 * 这个池子里全部是这一行公认的路标性文献——它们的作者、年份、期刊、结论方向
 * 属于领域常识,不是需要翻原文才能确认的细节。**凡是要靠记忆去补精确细节的都没有收**,
 * 因为记错一个卷期和记错一个结论,在这里是同一类错误。
 *
 * `gist` 一律写**结论方向**而不是具体数字:"大规模重复只有约三分之一复现"是方向,
 * "复现率 36%" 是需要逐位核对的精确值。前者写错了会被人一眼看出,后者不会——
 * 而不会被一眼看出的错误才是危险的。
 */

export const citations: Citation[] = [
  {
    id: 'cit_bem_2011',
    authors: 'Bem',
    year: 2011,
    venue: 'Journal of Personality and Social Psychology',
    gist: '用当时标准的实验与统计流程,报告了"预感"效应——正是这篇合规却荒谬的论文点燃了方法学反思。',
    verified: true,
  },
  {
    id: 'cit_simmons_2011',
    authors: 'Simmons, Nelson & Simonsohn',
    year: 2011,
    venue: 'Psychological Science',
    gist: '研究者自由度足够大时,可以让几乎任何东西显著;提出了披露标准作为对策。',
    verified: true,
  },
  {
    id: 'cit_osc_2015',
    authors: 'Open Science Collaboration',
    year: 2015,
    venue: 'Science',
    gist: '大规模重复百项心理学研究,成功复现的比例远低于原始文献给人的印象。',
    verified: true,
  },
  {
    id: 'cit_ioannidis_2005',
    authors: 'Ioannidis',
    year: 2005,
    venue: 'PLoS Medicine',
    gist: '在常见的研究设计与激励下,已发表的研究结论有相当大比例是错的。',
    verified: true,
  },
  {
    id: 'cit_meehl_1978',
    authors: 'Meehl',
    year: 1978,
    venue: 'Journal of Consulting and Clinical Psychology',
    gist: '软心理学靠否定虚无假设积累不出知识,理论必须承担被证伪的风险。',
    verified: true,
  },
  {
    id: 'cit_cohen_1992',
    authors: 'Cohen',
    year: 1992,
    venue: 'Psychological Bulletin',
    gist: '给出效应量与统计功效的实用对照,指出心理学研究普遍功效不足。',
    verified: true,
  },
  {
    id: 'cit_baron_kenny_1986',
    authors: 'Baron & Kenny',
    year: 1986,
    venue: 'Journal of Personality and Social Psychology',
    gist: '提出了中介与调节的经典区分与检验步骤,是后来无数论文的分析模板。',
    verified: true,
  },
  {
    id: 'cit_bh_1995',
    authors: 'Benjamini & Hochberg',
    year: 1995,
    venue: 'Journal of the Royal Statistical Society: Series B',
    gist: '提出控制错误发现率的多重比较校正方法。',
    verified: true,
  },
  {
    id: 'cit_baumeister_1998',
    authors: 'Baumeister, Bratslavsky, Muraven & Tice',
    year: 1998,
    venue: 'Journal of Personality and Social Psychology',
    gist: '提出自我损耗:自我控制像一种会被消耗的有限资源,先做需要克制的事会削弱随后的自控。',
    verified: true,
  },
  {
    id: 'cit_vohs_2021',
    authors: 'Vohs et al.',
    year: 2021,
    venue: 'Psychological Science',
    gist: '多站点预注册检验自我损耗的经典范式,几乎没有找到支持这个效应的证据。',
    verified: true,
  },
  {
    id: 'cit_bargh_1996',
    authors: 'Bargh, Chen & Burrows',
    year: 1996,
    venue: 'Journal of Personality and Social Psychology',
    gist: '报告行为启动:接触与老年有关的词之后,人走路会变慢。',
    verified: true,
  },
  {
    id: 'cit_ml2_2018',
    authors: 'Klein et al.',
    year: 2018,
    venue: 'Advances in Methods and Practices in Psychological Science',
    gist: '在多国多实验室重复一批经典发现,相当一部分没有复现,复现出来的效应也普遍小于原始研究。',
    verified: true,
  },
  {
    id: 'cit_blackwell_2007',
    authors: 'Blackwell, Trzesniewski & Dweck',
    year: 2007,
    venue: 'Child Development',
    gist: '把智力看作可增长的学生在学业上表现更好,而且这种信念可以通过干预改变。',
    verified: true,
  },
  {
    id: 'cit_yeager_2019',
    authors: 'Yeager et al.',
    year: 2019,
    venue: 'Nature',
    gist: '全国大样本随机实验发现成长型思维干预的效应真实但很小,且集中在特定学生群体。',
    verified: true,
  },
  {
    id: 'cit_vul_2009',
    authors: 'Vul, Harris, Winkielman & Pashler',
    year: 2009,
    venue: 'Perspectives on Psychological Science',
    gist: '指出当时社会神经科学里大量高得可疑的脑—行为相关,来自非独立的分析流程。',
    verified: true,
  },
  {
    id: 'cit_marek_2022',
    authors: 'Marek et al.',
    year: 2022,
    venue: 'Nature',
    gist: '脑—行为关联研究需要数千被试才稳定,常见的小样本研究得到的相关既被高估又难以重复。',
    verified: true,
  },
  {
    id: 'cit_cepeda_2006',
    authors: 'Cepeda et al.',
    year: 2006,
    venue: 'Psychological Bulletin',
    gist: '元分析确认间隔学习优于集中学习,这个效应在多种材料与时程上稳定存在。',
    verified: true,
  },
  {
    id: 'cit_carney_2010',
    authors: 'Carney, Cuddy & Yap',
    year: 2010,
    venue: 'Psychological Science',
    gist: '报告"高权力姿势"能改变激素水平与冒险倾向。',
    verified: true,
  },
  {
    id: 'cit_ranehill_2015',
    authors: 'Ranehill et al.',
    year: 2015,
    venue: 'Psychological Science',
    gist: '在更大样本下重复高权力姿势研究,未能复现其激素与行为效应。',
    verified: true,
  },

  // ── 临床线(M4)。**这些姓名会自动进入人名黑名单**,
  //    所以事件文案里只写内容("1979 年就有人把它拆成三样"),不写姓氏。
  {
    id: 'cit_bordin_1979',
    authors: 'Bordin',
    year: 1979,
    venue: 'Psychotherapy: Theory, Research & Practice',
    gist: '提出跨流派的工作联盟概念,把它拆为任务、目标与纽带三个成分——`alliance` 变量的理论出处。',
    verified: true,
  },
  {
    id: 'cit_cps_ethics_2018',
    // 署名用发布主体的全称:短名"中国心理学会"在正文里是正常用语(2017 那幕就有),
    // 进了黑名单会误伤;全称不会出现在任何叙事文本里。
    authors: '中国心理学会临床心理学注册工作委员会',
    year: 2018,
    venue: '《临床与咨询心理学工作伦理守则(第二版)》',
    gist: '规定知情同意、保密及其突破情形、多重关系回避、专业胜任力边界等临床与咨询工作的伦理要求。',
    verified: true,
  },
  {
    id: 'cit_mental_health_law_2013',
    authors: '全国人民代表大会常务委员会',
    year: 2013,
    venue: '《中华人民共和国精神卫生法》(2013 年 5 月 1 日施行)',
    gist: '规定心理咨询人员不得从事心理治疗或者精神障碍的诊断、治疗——"咨询师不下诊断、没有处方权"的法律来源。',
    verified: true,
  },
];

const byId = new Map(citations.map(c => [c.id, c]));

function cite(id: string): Citation {
  const found = byId.get(id);
  if (!found) throw new Error(`unknown citation: ${id}`);
  return found;
}

/**
 * 理论基础:**每个课题都建在其中一条上,而其中几条会在游戏时间线里塌掉。**
 *
 * ## 塌方年份必须落在课题活着的那几年,否则这个机制是死的
 *
 * 第一版只有一条会塌(高权力姿势,2015),而真课题 2019 年才开始——
 * **它一次都不会触发**,和 M3.1 挖出的那两条死常量是同一类问题。
 * 所以现在选基础的第一条标准是:**真实的重复失败年份要落在 2018–2024**,
 * 也就是毕业论文和读研这几年。这不是迁就机制,是反过来——
 * 那几年真的是心理学被重新检验得最狠的几年,而玩家正好在场。
 *
 * ## 年份一个都不许编
 *
 * `replicationFailure.year` 必须是真实发表年份。机制的全部说服力来自它和玩家的
 * 时间线真的对得上:2021 年你读到那篇多站点检验,是因为它 2021 年真的发表了。
 * 编一个年份,这个机制就从"真实"变成"编排",而它唯一的价值就是不编排。
 *
 * ## 一条特殊的:`fnd_small_n_brain`
 *
 * 它的"地基"不是一个效应,是**一套做法**(小样本脑—行为相关)。
 * 所以 `origin` 取的是最早系统指出这套做法有问题的那篇,而不是某个具体效应的原始文献——
 * 对一套做法来说,那篇就是这场争论的起点。这一条在 LEDGER 里另有说明。
 */
export const foundations: Foundation[] = [
  {
    id: 'fnd_ego_depletion',
    label: '自我损耗',
    domains: ['domain_social', 'domain_cognition'],
    origin: cite('cit_baumeister_1998'),
    hypeYears: [2000, 2016],
    // 2021 年那篇多站点预注册检验。**读研第三年前后**,正好砸在手上的课题上。
    replicationFailure: { year: 2021, citation: cite('cit_vohs_2021') },
    skepticHint: '这一系列最初的几个实验,每组都只有几十个大学生。',
  },
  {
    id: 'fnd_behavioral_priming',
    label: '行为启动',
    domains: ['domain_social', 'domain_cognition'],
    origin: cite('cit_bargh_1996'),
    hypeYears: [1996, 2012],
    // **不进课题分配池。** Many Labs 2 是 2018 年,而真课题 2019 年才开始——
    // 这一条塌的时候你手上还没有能被它砸中的东西。它的位置是时代节点(你读到了那篇),
    // 不是"你的地基塌了"。数据留着是因为年份是真的,而且内容侧会引用它。
    assignable: false,
    replicationFailure: { year: 2018, citation: cite('cit_ml2_2018') },
    skepticHint: '那个走路变慢的实验,一组 15 个人。',
  },
  {
    id: 'fnd_growth_mindset',
    label: '成长型思维',
    domains: ['domain_social', 'domain_education'],
    origin: cite('cit_blackwell_2007'),
    hypeYears: [2007, 2019],
    // **这一条不是塌,是缩水**——效应真实但比所有人以为的小得多,
    // 小到你那个几百人的样本根本检不出来。而这在体感上比塌了更难受。
    replicationFailure: { year: 2019, citation: cite('cit_yeager_2019') },
    skepticHint: '早期研究的样本都是单个学校里的几百个学生。',
  },
  {
    id: 'fnd_small_n_brain',
    label: '小样本脑—行为相关',
    domains: ['domain_cogneuro'],
    origin: cite('cit_vul_2009'),
    hypeYears: [2005, 2021],
    // 2022 年那篇说清楚了要数千人。**做影像的人最怕的一年。**
    replicationFailure: { year: 2022, citation: cite('cit_marek_2022') },
    skepticHint: '你这个领域大部分文章的样本量是二十几个人。',
  },
  {
    id: 'fnd_spacing',
    label: '间隔效应',
    domains: ['domain_cognition', 'domain_education'],
    origin: cite('cit_cepeda_2006'),
    hypeYears: [2006, 2024],
    // **站得住的地基也要有。** 全都会塌的话,这个机制就变成了纯粹的惩罚,
    // 而真实的情况是:有些东西一百年了还在那儿。
    replicationFailure: null,
    skepticHint: '这个效应从艾宾浩斯那时候就在,而且一直在。',
  },
  {
    id: 'fnd_power_pose',
    label: '高权力姿势',
    domains: ['domain_social'],
    origin: cite('cit_carney_2010'),
    hypeYears: [2011, 2015],
    // 同上:2015 年塌的,那时玩家还在读大二。它是 2016 年那组时代节点的素材。
    assignable: false,
    replicationFailure: { year: 2015, citation: cite('cit_ranehill_2015') },
    skepticHint: '原始研究的样本量只有几十人。',
  },
  {
    id: 'fnd_replication_crisis',
    label: '可重复性',
    domains: ['domain_social', 'domain_cognition', 'domain_cogneuro', 'domain_psychometrics'],
    origin: cite('cit_osc_2015'),
    hypeYears: [2015, 2024],
    replicationFailure: null,
    skepticHint: '这一篇本身就是在数别人有多少站得住。',
  },
  {
    id: 'fnd_researcher_dof',
    label: '研究者自由度',
    domains: ['domain_psychometrics', 'domain_social', 'domain_cognition', 'domain_cogneuro'],
    origin: cite('cit_simmons_2011'),
    hypeYears: [2011, 2024],
    replicationFailure: null,
    skepticHint: '它用一个荒谬的例子证明了流程本身有问题:听音乐能让人变年轻。',
  },
];
