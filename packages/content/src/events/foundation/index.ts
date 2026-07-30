import type { Effect, GameEvent } from '@psy-sim/core';

/**
 * 地基塌方事件(GAME_DESIGN 19.4)。**本作最有辨识度的一个机制。**
 *
 * 一条基础一幕,事件 id 由 `collapseEventId` 约定(`fnd_x` → `ev_collapse_x`),
 * validate 规则 13 查:每条**会塌且会被分配**的基础都必须有对应事件,而且四个选项齐全。
 *
 * ## 为什么必须是四个,而且一个都不能少
 *
 * | 选项 | 现实里的代价 |
 * |---|---|
 * | 硬着头皮发出去 | 能发,但它会进你结局页的"后来重复不出来"那一栏 |
 * | 改故事 | **正确做法**,可阴性结果难发——少一篇好刊 |
 * | 做一个真正的重复 | **隐藏最优解**,要多花一年,而且得方法够硬 |
 * | 放弃 | 最常见的现实选择,损失全部投入年数 |
 *
 * 少任何一个,这一幕就从"一个真实的两难"退化成"一个惩罚"。
 * 而这四条正好是现实里全部的四条路——**没有第五条,也没有一条是免费的**。
 *
 * ## 反向奖励是真实的学科史,不是设计的善意
 *
 * 选"做重复"的人前期吃亏(慢一年、导师不理解),但 2015 年之后大样本重复研究的
 * 价值逐年上升。这不是游戏在奖励好人,这是那几年真的发生过的事。
 */

/** 四个选项的公共效果尾巴:塌方这件事本身要在诚信线和状态上留痕 */
const SHAKEN: Effect[] = [{ setFlag: 'foundation_collapsed' }];

function collapseEvent(
  foundationId: string,
  opts: {
    title: string;
    text: string;
    contextLines: GameEvent['contextLines'];
    /** 硬发之后那篇文章的样子 */
    pushText: string;
    /** 改成阴性结果之后的样子 */
    reframeText: string;
    /** 做重复做成了 / 没做成 */
    replicationText: string;
    replicationFailText: string;
    abandonText: string;
  },
): GameEvent {
  return {
    id: `ev_collapse_${foundationId.replace(/^fnd_/, '')}`,
    // 由 `systems/foundation.ts` schedule 进来,不进普通池
    pools: [],
    category: 'method',
    tier: 'major',
    title: opts.title,
    text: opts.text,
    contextLines: opts.contextLines,
    choices: [
      {
        id: 'push_anyway',
        text: '硬着头皮发出去',
        outcomes: [
          {
            weight: 1,
            text: opts.pushText,
            effects: [
              ...SHAKEN,
              { stats: { state: -4, capital: 1 } },
              { project: { op: 'setField', quality: -14, integrityRisk: 18 } },
              { setFlag: 'published_on_shaky_ground' },
            ],
          },
        ],
      },
      {
        id: 'reframe',
        text: '改故事:我们检验了这个效应,没有发现',
        outcomes: [
          {
            weight: 1,
            text: opts.reframeText,
            effects: [
              ...SHAKEN,
              { stats: { method: 5, state: -3 } },
              // 回退到写作:整篇要重写,而且引言得从头立
              { project: { op: 'regress', stages: 2 } },
              { project: { op: 'setField', quality: -6 } },
              { setFlag: 'reported_a_null_result' },
            ],
          },
        ],
      },
      {
        id: 'do_replication',
        text: '做一个真正的重复实验',
        // **隐藏的最优解,而且它要门槛。** 方法不够硬的人做不出一个站得住的重复,
        // 那样只是多花一年得到一个谁都不信的结果。
        visibleIf: { stat: 'method', op: '>=', value: 62 },
        outcomes: [
          {
            weight: 2,
            text: opts.replicationText,
            effects: [
              ...SHAKEN,
              { stats: { method: 8, capital: 3, state: -5 } },
              // 回到收数据,多花一年——这一年是真的要花的
              { project: { op: 'regress', stages: 3 } },
              { project: { op: 'setField', quality: 22, preregistered: true } },
              { setFlag: 'did_a_real_replication' },
              { addFlag: { key: 'burnout', delta: 10, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: opts.replicationFailText,
            effects: [
              ...SHAKEN,
              { stats: { method: 5, state: -7 } },
              { project: { op: 'regress', stages: 3 } },
              { project: { op: 'setField', quality: 8, preregistered: true } },
              { setFlag: 'did_a_real_replication' },
              { addFlag: { key: 'burnout', delta: 14, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'abandon',
        text: '放弃这个课题',
        outcomes: [
          {
            weight: 1,
            text: opts.abandonText,
            effects: [
              ...SHAKEN,
              { stats: { state: -9, method: 3 } },
              { project: { op: 'abandon' } },
              { setFlag: 'abandoned_a_project' },
              { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  };
}

export const foundationEvents: GameEvent[] = [
  collapseEvent('fnd_ego_depletion', {
    title: '你的地基塌了',
    text: '你在读一篇刚出来的大规模重复研究：几十个实验室都在收数据前登记好方案，用同一套实验做法和统一流程重做那个经典结果。\n\n结论是：**几乎没有找到支持“自我损耗”的证据。**\n\n你的开题报告第 3 页，整个理论框架建立在这个结果之上。\n\n「{{project}}」你已经做了 {{years}} 年。',
    contextLines: [
      { text: '你把那篇下载下来,又从头读了一遍。没有读错。' },
      { condition: { flag: 'trait_skeptic' }, text: '那个样本量的问题,你其实早就注意到了。' },
      { condition: { flag: 'knows_the_literature' }, text: '你读过这条线上几乎所有文章,所以你比谁都清楚这意味着什么。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 50 } }, text: '你已经很累了,而这件事今天才发生。' },
    ],
    pushText: '你把引言里那几句改得含糊了一点,然后投了出去。\n\n审稿人没有问。文章发了。\n\n**你知道那个框架有问题,而你什么都没说。** 这件事以后每次有人引用你这篇的时候都会回来一次。',
    reframeText: '你把整篇重写成"我们在中国样本上检验了这个效应,没有发现"。\n\n引言从头立,讨论部分你写了三稿。\n\n**这是对的做法。** 代价是阴性结果不好发——你这篇最后去了一个没人看的刊,而同期那个师兄发了二区。',
    replicationText: '你决定做一个真正的重复:预注册、大样本、公开数据。\n\n这一年基本没有别的产出,导师问过你两次"这个到底什么时候能出来"。\n\n第二年文章出来了。**它是你后来被引用最多的一篇**——因为在这个题目上,认真做过的人不多。',
    replicationFailText: '你做了预注册和大样本,一年过去,结果是一堆干净的零。\n\n这篇很难发,你最后放在了一个专门收阴性结果的地方。\n\n**没有人为它鼓掌。** 但十年后你回看自己的清单,这是你唯一完全不心虚的一篇。',
    abandonText: '你把文件夹归档了。{{years}} 年。\n\n你没有做错任何事——你只是在一个别人后来证明不存在的东西上，认真地花了 {{years}} 年。\n\n**这一行最难接受的就是这种损失:它不是你的错,但代价全部由你承担。**',
  }),

  collapseEvent('fnd_growth_mindset', {
    title: '不是塌了,是比你以为的小得多',
    text: '那篇全国大样本随机实验出来了。\n\n结论不是"成长型思维没用",而是:**效应真实,但很小,而且只在特定学生里出现。**\n\n小到什么程度?小到你那个几百人的样本,**根本不可能检出来**。\n\n「{{project}}」你已经做了 {{years}} 年。',
    contextLines: [
      { text: '你翻回自己的开题报告,那里写着"预期中等效应量"。' },
      { condition: { flag: 'trait_skeptic' }, text: '早期那些研究都是单个学校的几百人,你当时就觉得哪里不对。' },
      { condition: { flag: 'mastered_stats' }, text: '你当场算了一下功效。你需要的样本量是你现在的十倍。' },
    ],
    pushText: '你按原计划分析、写作、投稿。你那个"显著"的结果留在了文章里。\n\n**在一个真实效应很小的领域里,你得到了一个大效应。** 这句话的意思你懂,审稿人没细想。',
    reframeText: '你把整篇改成了"效应量估计"——不再问有没有,而是问有多大。\n\n**这是这一行最不讨喜也最有用的一类文章。** 它不会上新闻,但十年后做元分析的人会一篇篇把它们找出来。',
    replicationText: '你联系了三所学校,把样本扩到了原来的四倍,预注册了分析方案。\n\n结果和那篇全国实验一致:效应存在,很小。\n\n**你成了这个题目上少数几个数字可信的人。** 后来有人做元分析,专门给你发了封邮件。',
    replicationFailText: '你扩了样本、做了预注册,然后发现连那个"很小"的效应都没检出来。\n\n这一年花掉了,而你手上是一个不好发也不好讲的结果。\n\n**你学会了一件事:功效不足的时候,阴性和阳性一样不可信。**',
    abandonText: '你把它放下了。{{years}} 年。\n\n这个题目还会有人做——**但你不会再做了。** 你后来看到相关的新闻推送会直接划过去。',
  }),

  collapseEvent('fnd_small_n_brain', {
    title: '你需要的被试是几千人',
    text: '那篇 Nature 出来了。\n\n结论很简单:**脑—行为关联需要数千被试才稳定。** 常见的小样本研究得到的相关既被高估,又重复不出来。\n\n你这个课题的样本量是 28 人。这是你们领域的常规做法。\n\n「{{project}}」你已经做了 {{years}} 年,机时是排了半年才排上的。',
    contextLines: [
      { text: '组里那天下午没有人说话。' },
      { condition: { flag: 'trait_skeptic' }, text: '你早就发现你这个领域大部分文章的样本量都是二十几个人。' },
      { condition: { flag: 'stack_python' }, text: '你自己写过预处理管线,你知道换一个参数结果会变成什么样。' },
      { condition: { advisor: { archetype: 'young_pi' } }, text: '你导师在非升即走,他需要这篇文章出来。' },
    ],
    pushText: '你按原来的分析发了出去。那个相关很漂亮。\n\n**你和所有人一样清楚它意味着什么,而所有人也和你一样在发。** 这是这个领域那几年的默认状态。',
    reframeText: '你把文章改成了方法学的角度:在这个样本量下,我们能说什么、不能说什么。\n\n**你把一篇结果文章改成了一篇诚实的文章。** 它的引用不会多,但它不会错。',
    replicationText: '你去申请了一个公开的大样本数据集,重新做了一遍分析。\n\n机时的钱省下来了,时间没省——学数据结构就花了半年。\n\n**你成了组里唯一会用这类数据的人。** 后面几年,组里所有相关的活都要过你的手。',
    replicationFailText: '你转到大样本数据上重做,结果是那个相关基本消失了。\n\n你把这个写成了文章,投了两家都被拒,理由是"缺乏新意"。\n\n**否定一个东西永远比提出一个东西难发。** 你现在亲身知道了这件事。',
    abandonText: '你退了机时,把数据打包存进了移动硬盘。{{years}} 年。\n\n那块硬盘你一直留着,虽然再也没插过。',
  }),
];
