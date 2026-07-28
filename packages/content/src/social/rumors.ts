import type { RumorDef } from '@psy-sim/core';

/**
 * 可打听的情报(GAME_DESIGN 13.3)。
 *
 * ## 排版规矩:引文 + 灰色括注
 *
 * 正文是那个人的**原话**,括注是那句让人不安的补充。
 * **括注永远不评价可靠性**,只给一个事实——她哪年毕业的、他没说为什么走。
 * 一旦括注开始说"这个消息可能不准",玩家就不用自己判断了,而自己判断就是全部内容。
 *
 * ## 真伪配比守在 40%–70%(validate 规则 18)
 *
 * 全真 = 情报变成攻略,玩家照着抄;全假 = 玩家两局之后学会无视这个入口。
 * 落在中间,玩家才会去做那件现实中大家都在做的事:**打听三个人,取交集**。
 *
 * ## 来源有自己的立场
 *
 * 和导师有过节的师兄、三年前就毕业的师姐、想把你招进来的人、匿名论坛。
 * **一条消息假,常常不是因为有人撒谎,是因为它过期了或者只对了一半。**
 * 所以假消息也要写得像真的——写得心虚的假消息等于没有假消息。
 */

/** 导师话题的公共前缀。topic 的形状是 `advisor:<id>`,与引擎的 `advisorTopics` 对齐 */
function advisorRumor(
  id: string,
  advisorId: string,
  source: string,
  text: string,
  caveat: string,
  accurate: boolean,
): RumorDef {
  return { id, topic: `advisor:${advisorId}`, source, text, caveat, accurate };
}

export const rumors: RumorDef[] = [
  // ══════════ 学术大牛 ══════════
  advisorRumor(
    'rum_star_busy', 'adv_star', '师兄',
    '"老师很忙,但资源是真的多。你要能自己推着自己走。"',
    '他是组里第七个学生。',
    true,
  ),
  advisorRumor(
    'rum_star_hands_on', 'adv_star', '师姐',
    '"他其实挺管的,我毕业那年他逐字改过我的稿子。"',
    '她 2016 年毕业。',
    // **假,但不是她撒谎**:那是他还没拿帽子、组里只有三个人的时候。
    false,
  ),
  advisorRumor(
    'rum_star_first_author', 'adv_star', '匿名论坛',
    '"那个组一作从来不会被抢,这一点必须说句公道话。"',
    '这条帖子下面有两个回复,都被删了。',
    true,
  ),

  // ══════════ 青年 PI ══════════
  advisorRumor(
    'rum_young_pi_pace', 'adv_young_pi', '师姐',
    '"他人很好,就是……很拼。周末的组会记录你可以自己去主页上看。"',
    '她说这句话的时候是周日下午,她在实验室。',
    true,
  ),
  advisorRumor(
    'rum_young_pi_easy', 'adv_young_pi', '同门',
    '"他今年评上了,应该会松一些。"',
    '他没说这个消息是从哪听来的。',
    false,
  ),

  // ══════════ 放养型 ══════════
  advisorRumor(
    'rum_hands_off_free', 'adv_hands_off', '师兄',
    '"他从来不催。你想做什么就做什么,真的。"',
    '"不催"这两个字他说了三遍。',
    true,
  ),
  advisorRumor(
    'rum_hands_off_network', 'adv_hands_off', '匿名论坛',
    '"老先生资源其实很深,关键时候一个电话就够了。"',
    '发帖时间是 2013 年。',
    false,
  ),

  // ══════════ 临床派 ══════════
  advisorRumor(
    'rum_clinical_real', 'adv_clinical', '师姐',
    '"跟她能学到真东西。每周门诊她都带着我们。"',
    '她那一届四个人,三个人延毕了。',
    true,
  ),
  advisorRumor(
    'rum_clinical_papers', 'adv_clinical', '同门',
    '"文章的事她会安排的,你不用太担心。"',
    '他自己还有一年毕业。',
    false,
  ),

  // ══════════ 边界感差的 ══════════
  advisorRumor(
    'rum_boundary_vague', 'adv_boundary', '师兄',
    '"还行吧。"',
    '你问了三个人,三个人都说了这三个字。',
    true,
  ),
  advisorRumor(
    'rum_boundary_money', 'adv_boundary', '匿名论坛',
    '"跟他做横向,补助是全院最高的。"',
    '这条没有说补助是从哪一笔里出的。',
    true,
  ),
  advisorRumor(
    'rum_boundary_clean', 'adv_boundary', '同门',
    '"署名的事他一向很规矩,这个我可以担保。"',
    '他去年刚跟着这个组发了一篇二作。',
    false,
  ),

  // ══════════ 温暖型 ══════════
  advisorRumor(
    'rum_warm_kind', 'adv_warm', '师姐',
    '"她会记得你的生日。"',
    '她现在在一所高职教书。',
    true,
  ),
  advisorRumor(
    'rum_warm_platform', 'adv_warm', '匿名论坛',
    '"那个组最近在上升期,平台会越来越好。"',
    '这条帖子的账号只发过这一条。',
    false,
  ),
];
