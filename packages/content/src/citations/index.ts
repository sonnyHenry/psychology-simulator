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
];

const byId = new Map(citations.map(c => [c.id, c]));

function cite(id: string): Citation {
  const found = byId.get(id);
  if (!found) throw new Error(`unknown citation: ${id}`);
  return found;
}

/**
 * 理论基础(M3.6 消费,M3.5 先把数据和校验建起来)。
 *
 * **`replicationFailure.year` 必须是真实历史年份。** 机制的全部说服力来自它和
 * 玩家在游戏里的时间线真的对得上——2015 年读到那篇重复研究,是因为它 2015 年真的发表了。
 * 一个玩家在 2016 年选了这个方向,他后面几年遇到的事就该是那几年真实发生的事。
 */
export const foundations: Foundation[] = [
  {
    id: 'fnd_power_pose',
    label: '高权力姿势',
    domains: ['domain_social'],
    origin: cite('cit_carney_2010'),
    hypeYears: [2011, 2015],
    replicationFailure: { year: 2015, citation: cite('cit_ranehill_2015') },
    skepticHint: '原始研究的样本量只有几十人。',
  },
  {
    id: 'fnd_replication_crisis',
    label: '可重复性',
    domains: ['domain_social', 'domain_cognition', 'domain_psychometrics'],
    origin: cite('cit_osc_2015'),
    hypeYears: [2015, 2024],
    replicationFailure: null,
    skepticHint: '这一篇本身就是在数别人有多少站得住。',
  },
  {
    id: 'fnd_researcher_dof',
    label: '研究者自由度',
    domains: ['domain_psychometrics', 'domain_social', 'domain_cognition'],
    origin: cite('cit_simmons_2011'),
    hypeYears: [2011, 2024],
    replicationFailure: null,
    skepticHint: '它用一个荒谬的例子证明了流程本身有问题:听音乐能让人变年轻。',
  },
];
