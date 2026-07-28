import type { RivalArchetypeDef } from '@psy-sim/core';

/**
 * 影子竞争者的四个候选(GAME_DESIGN 13.1)。大二那年遇到他时抽一个。
 *
 * ## 姓名一律虚构
 *
 * 和导师同一条规范(19.2):他会抢你的一作、会在评审里遇到你,
 * 把这些安在真实可查的个体身上就是诽谤。validate 规则 10 查这一条。
 *
 * ## `impression` 不许透露机制
 *
 * 玩家读到的是"他这个人什么样",不是"他的 momentum 是 1.0"。
 * 写成"他很强"等于把难度曲线印在脸上——而 13.1 想要的是**你要花好几年
 * 才看得出他到底走得多快**,那正是打听机制在他身上的兑现点。
 *
 * ## 他不是反派
 *
 * 四个原型里没有一个是"稳定碾压你"的,而且每个人都会有状态崩掉的那一年。
 * 有几个交汇点是你看到他的处境——那时候他从对手变成同类,
 * 而那个转折比"他又发了一篇"有分量得多。
 */
export const rivalArchetypes: RivalArchetypeDef[] = [
  {
    archetype: 'grinder',
    name: '郑允之',
    impression: '他每天最后一个走。你后来发现他不是效率高,是真的在那儿坐着。',
    weight: 3,
  },
  {
    archetype: 'lucky',
    name: '温良辰',
    impression: '他手气好得离谱:第一个课题的数据一次就跑通了,而那批被试是别人招剩的。',
    weight: 2,
  },
  {
    archetype: 'strategic',
    name: '曹见微',
    impression: '他挑题很挑,合作者也挑。前两年看起来平平,第三年你才明白他在等什么。',
    weight: 3,
  },
  {
    archetype: 'struggling',
    name: '蒋叙',
    impression: '他一直很努力,但事情好像总是不太顺。你说不清是运气还是别的什么。',
    weight: 2,
  },
];
