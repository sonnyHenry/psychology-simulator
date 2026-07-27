import type { GameEvent } from '@psy-sim/core';

/**
 * 个案阶段事件池(GAME_DESIGN 第六节)。
 *
 * ## 这些事件不推进个案
 *
 * 状态机由引擎的年度结算推(联盟漂移、脱落判定、intake→working→…),
 * 阶段事件只做三件事:**讲这一年会谈室里的某一幕**、小幅调联盟/临床、
 * 提供"转介 / 提前结束 / 带去督导"这类需要你决定的转折。
 *
 * 内容用 `{ caseTrend: 'warm' | 'strained' }` 分流文案——走向由引擎掷,
 * 所以"这段关系在变好还是变僵"这句话永远和数值一致。
 *
 * ## 文案纪律
 *
 * `{{case}}` = 短名 · `{{issue}}` = 主诉 · `{{caseYears}}` = 谈到第几年。
 * 主诉写来访者带进门的那句话,不写诊断;所有来访者虚构;
 * 不猎奇——他们的痛苦不是奇观,是你每周三下午的工作。
 */

/** 阶段事件的公共形状:不进普通池、可重复、由调度器按个案当前状态挑 */
function caseEvent(
  id: string,
  caseStatus: NonNullable<GameEvent['caseStatus']>,
  rest: Omit<GameEvent, 'id' | 'pools' | 'caseStatus' | 'once'>,
): GameEvent {
  return { id, pools: [], caseStatus, once: false, category: 'counseling', ...rest };
}

export const caseStageEvents: GameEvent[] = [
  // ══════════ 初始访谈期 ══════════
  caseEvent('ev_ci_first_session', 'intake', {
    title: '首次会谈',
    text: '{{issue}}\n\n五十分钟。你的记录纸上写了很多,又划掉了一些。结束之后你在咨询室里多坐了两分钟。',
    contextLines: [
      { condition: { flagNum: { key: 'clinical_hours', op: '<', value: 50 } }, text: '你说的话不超过三十句。你手心是湿的。' },
      { condition: { flagNum: { key: 'clinical_hours', op: '>=', value: 400 } }, text: '几百个小时之后,首次会谈仍然是你最紧张的五十分钟。这可能是好事。' },
      { text: '注册系统的表格上,小时数又多了一格。' },
    ],
    choices: [
      {
        id: 'follow_structure',
        text: '按初始访谈的结构走',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '结构给了你们俩安全感。信息收齐了,设置讲清了,他走的时候说"下周见"——这三个字比听起来重要。',
            effects: [{ stats: { clinical: 2 } }, { case: { op: 'adjustAlliance', delta: 3 } }],
          },
          {
            weight: 2,
            condition: { caseTrend: 'strained' },
            text: '你问一句他答半句。快结束时他说:"这些表格一样的问题,和我在网上填的有什么区别?"\n\n你知道区别,但你没能让他感觉到。',
            effects: [{ stats: { clinical: 1, state: -2 } }],
          },
        ],
      },
      {
        id: 'just_listen',
        text: '把结构放一放,先让他讲完',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '他讲了四十分钟,中间只停下来喝过一次水。最后他说:"我从来没有把这件事从头讲过一遍。"\n\n**初始访谈该收集的信息你少了一半,但坐在你对面的人决定了再来。**',
            effects: [{ stats: { clinical: 1 } }, { case: { op: 'adjustAlliance', delta: 6 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '他讲得散,你听得散。五十分钟到了,设置没讲、频次没定、他对咨询的期待你也没摸到。\n\n下周他会不会来,你没有把握。',
            effects: [{ stats: { clinical: 1, state: -1 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_ci_fit_or_refer', 'intake', {
    title: '接,还是转',
    text: '两次评估之后你有点拿不准:「{{case}}」这个个案,在你现在的胜任范围里吗?\n\n伦理守则写着"在专业胜任力范围内工作"。守则没写的是,**你的胜任范围也是靠略微超出它一点点才长大的**。',
    contextLines: [
      { condition: { flagNum: { key: 'supervision_hours', op: '>=', value: 12 } }, text: '这正是督导存在的意义之一。' },
      { text: '转介单就在抽屉里。写它不难,难的是承认。' },
    ],
    choices: [
      {
        id: 'take_it',
        text: '接下来',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '你接了。前两个月你把相关的书翻了个遍,像备考。\n\n有些能力确实是这样长出来的——只是你不会推荐别人都这么干。',
            effects: [{ stats: { clinical: 3, state: -1 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '你接了。第三次会谈你就意识到自己在用不熟的工具干精细的活。\n\n每次会谈前你都要做很久的功课,每次会谈后你都不确定刚才那样对不对。',
            effects: [{ stats: { clinical: 2, state: -3 } }],
          },
        ],
      },
      {
        id: 'refer_out',
        text: '转介给更合适的同行',
        outcomes: [
          {
            weight: 1,
            text: '你写了转介单,给他讲清楚了为什么。他愣了一下,说好。\n\n**这是教科书上的正确做法。** 教科书没写的是:接下来两周你都在想,他会不会觉得是自己被退回来了。',
            effects: [{ stats: { clinical: 2, state: 1 } }, { case: { op: 'refer' } }],
          },
        ],
      },
      {
        id: 'ask_supervisor',
        text: '带去督导,再决定',
        visibleIf: { flagNum: { key: 'supervision_hours', op: '>=', value: 12 } },
        outcomes: [
          {
            weight: 1,
            text: '督导听完说:"你可以接,但这个个案从今天起放在督导里过。"\n\n她又补了一句:"你注意到没有,你描述他的时候,一直在替他解释。"',
            effects: [{ stats: { clinical: 3 } }, { case: { op: 'setField', supervised: true } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_ci_frame_money', 'intake', {
    title: '谈钱,谈时间',
    text: '设置:每周同一时间,五十分钟,提前二十四小时取消不收费,否则收。\n\n「{{case}}」听到收费标准的时候停了一下。你看见了那一下。',
    contextLines: [
      { text: '会谈技术课教过怎么共情,没教过怎么把"取消也要收费"说出口。' },
    ],
    choices: [
      {
        id: 'hold_frame',
        text: '把设置一条条讲清楚',
        outcomes: [
          {
            weight: 2,
            text: '你讲完了,包括最难开口的那条。他说"理解"。\n\n**设置不是对来访者的防备,是给这段关系一个能预测的形状。** 这句话你以前不信,现在开始信了。',
            effects: [{ stats: { clinical: 3 } }],
          },
        ],
      },
      {
        id: 'flex',
        text: '先照顾他的情况,设置松一点',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '你给他挪了时间,取消费也没提。他很感激,关系升温很快。\n\n只是从此他的"临时有事"都发生在你的周五晚上。',
            effects: [{ stats: { state: -2 } }, { case: { op: 'adjustAlliance', delta: 5 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '设置松了之后,请假越来越随意。你上周为他空等了五十分钟。\n\n你开始理解:当初不好意思讲的那条规则,保护的其实是这段关系本身。',
            effects: [{ stats: { state: -3, clinical: 1 } }],
          },
        ],
      },
    ],
  }),

  // ══════════ 工作期 ══════════
  caseEvent('ev_cw_silence', 'working', {
    title: '沉默',
    text: '这次会谈有一段很长的沉默。你数了墙上挂钟走过的格子。\n\n「{{case}}」看着窗外。你等着。',
    contextLines: [
      { condition: { flag: 'orientation_dynamic' }, text: '你的受训告诉你:沉默里有东西,别急着填。' },
      { condition: { flag: 'orientation_cbt' }, text: '议程表还有两项没过。你决定让它们等着。' },
      { text: '新手会怕沉默。你正在学着不怕。' },
    ],
    choices: [
      {
        id: 'hold_it',
        text: '陪着这段沉默',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '第七分钟,他开口了。说出来的事和前面十几次会谈说的都不一样。\n\n**那段沉默不是空的,是他在下决心。** 幸好你没打断。',
            effects: [{ stats: { clinical: 3 } }, { case: { op: 'adjustAlliance', delta: 5 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '沉默一直到了结束。他走的时候说"今天好像没什么可说的"。\n\n你不确定刚才是该等,还是该接。这种不确定会跟你回家。',
            effects: [{ stats: { state: -2, clinical: 1 } }],
          },
        ],
      },
      {
        id: 'name_it',
        text: '把沉默本身说出来',
        outcomes: [
          {
            weight: 2,
            text: '"我注意到我们安静了一会儿。刚才你在哪儿?"\n\n他说了一个地方,一个年份。会谈从那里重新开始。**过程评论是你最近才敢用的技术,今天它接住了。**',
            effects: [{ stats: { clinical: 3 } }, { case: { op: 'adjustAlliance', delta: 3 } }],
          },
          {
            weight: 1,
            text: '"刚才你在想什么?"他说:"在想今天的停车费。"\n\n好吧。不是每个沉默里都有东西。',
            effects: [{ stats: { clinical: 1, state: -1 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_cw_gift', 'working', {
    title: '一份礼物',
    text: '会谈结束时,「{{case}}」从包里拿出一个盒子。不便宜。\n\n"你不收,我就不来了。"他说这话的时候在笑,但你听得出来他是认真的。',
    contextLines: [
      { text: '伦理守则关于礼物的那一节,你读过。守则没有写他此刻的表情。' },
    ],
    choices: [
      {
        id: 'decline_and_explore',
        text: '不收,并把这件事变成工作材料',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '"我不能收。但我很想知道,送我这个,对你来说意味着什么?"\n\n那次会谈成了几个月来最重要的一次:你们第一次谈到了他怎么对待所有对他好的人。',
            effects: [{ stats: { clinical: 4, state: -1 } }, { case: { op: 'adjustAlliance', delta: 4 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '你按教科书拒绝了。他把盒子放回包里,那之后的半小时都很客气。\n\n**客气是这间屋子里最坏的信号之一。**',
            effects: [{ stats: { clinical: 2, state: -2 } }, { case: { op: 'adjustAlliance', delta: -4 } }],
          },
        ],
      },
      {
        id: 'accept_it',
        text: '收下',
        outcomes: [
          {
            weight: 2,
            text: '你收下了。他很高兴。\n\n之后的几次会谈,你发现自己在该质询的地方软了一寸——**那个盒子在你们中间,你们都知道。**',
            effects: [
              { stats: { state: -2 } },
              { case: { op: 'adjustAlliance', delta: 3 } },
              { addFlag: { key: 'ethics_strain', delta: 1, min: 0, max: 10 } },
            ],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_cw_wechat', 'working', {
    title: '微信',
    text: '「{{case}}」说想加你微信:"有些话,当面说不出来。只有打字才敢。"\n\n他说的可能是真的。**这正是难办的地方。**',
    choices: [
      {
        id: 'keep_boundary',
        text: '不加,把"说不出来"带回会谈里',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '"那些打字才敢说的话——我们能不能试着让它们在这个房间里也能存在?"\n\n用了三次会谈,那些话进来了。**边界没有推开他,反而给了那些话一个更结实的容器。**',
            effects: [{ stats: { clinical: 4 } }, { case: { op: 'adjustAlliance', delta: 4 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '你解释了设置。他说"懂了",然后有两次会谈明显在赌气。\n\n你按规范做了。规范没有承诺过它不疼。',
            effects: [{ stats: { clinical: 2, state: -2 } }, { case: { op: 'adjustAlliance', delta: -3 } }],
          },
        ],
      },
      {
        id: 'add_wechat',
        text: '加了',
        outcomes: [
          {
            weight: 2,
            text: '头两周还好。第三周开始,消息在晚上十一点来,在你陪家人吃饭的时候来,在你自己撑不住的那天来。\n\n**你没有下班时间了。** 而你不知道怎么把已经打开的门再关上。',
            effects: [
              { stats: { state: -4 } },
              { case: { op: 'adjustAlliance', delta: 3 } },
              { addFlag: { key: 'ethics_strain', delta: 1, min: 0, max: 10 } },
            ],
          },
        ],
      },
      {
        id: 'ask_supervision_first',
        text: '先带到督导里',
        visibleIf: { flagNum: { key: 'supervision_hours', op: '>=', value: 12 } },
        outcomes: [
          {
            weight: 1,
            text: '督导问了一个你没想过的问题:"他要的是你的微信,还是要确认你在会谈之外也记得他?"\n\n下一次会谈,你回应的是第二件事。微信没有加,那个更深的东西被接住了。',
            effects: [{ stats: { clinical: 4, state: 1 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_cw_that_sentence', 'working', {
    title: '那句话',
    text: '「{{case}}」今天说:"上次你说的那句话,我这两周一直在想。那句话让我撑过来了。"\n\n他复述了那句话。\n\n**你不记得自己说过。**',
    contextLines: [
      { text: '你翻遍了那次的记录。纸上没有这句。' },
    ],
    choices: [
      {
        id: 'stay_with_him',
        text: '不纠正,跟着他往下走',
        outcomes: [
          {
            weight: 2,
            text: '那句话对他有用,这就够了。你们顺着它谈了一整次。\n\n后来你在督导里说起这件事,督导笑了:"**治疗起效的那个瞬间,常常不在咨询师的记录里。** 这一行你干得越久,对这件事越谦卑。"',
            effects: [{ stats: { clinical: 3, state: 2 } }, { case: { op: 'adjustAlliance', delta: 4 } }],
          },
        ],
      },
      {
        id: 'be_honest',
        text: '承认你不记得了',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '"说实话,我不记得自己说过。但我很想听听,它在你那里变成了什么。"\n\n他讲了。他讲的版本比你可能说过的任何话都好——**那句话有一半是他自己造的,而这正是好转的样子。**',
            effects: [{ stats: { clinical: 4 } }, { case: { op: 'adjustAlliance', delta: 3 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '他的表情暗了一下:"你不记得了?"\n\n那次会谈剩下的时间,你都在弥补这三个字。诚实是对的,时机是你的。',
            effects: [{ stats: { clinical: 2, state: -2 } }, { case: { op: 'adjustAlliance', delta: -3 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_cw_six_times', 'working', {
    title: '第四次',
    text: '这次会谈进行到一半,你已经第四次想给「{{case}}」建议了。\n\n"你为什么不直接……"这句话在你舌尖上,像一颗随时要出膛的子弹。',
    contextLines: [
      { condition: { flagNum: { key: 'clinical_hours', op: '<', value: 100 } }, text: '实习那年督导数过你:你说四次,她数到六次。' },
      { text: '给建议是这一行最便宜也最没用的东西。你知道。你还是想给。' },
    ],
    choices: [
      {
        id: 'hold_back',
        text: '咽回去,继续跟着他',
        outcomes: [
          {
            weight: 2,
            text: '你咽回去了。十分钟后,他自己说出了那个建议——**用他自己的话,当成他自己的发现。**\n\n他自己找到的那个版本,他会真的去做。你给的那个版本,只会被记在"道理我都懂"里。',
            effects: [{ stats: { clinical: 4 } }, { case: { op: 'adjustAlliance', delta: 3 } }],
          },
        ],
      },
      {
        id: 'give_advice',
        text: '给了',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '你给了,而且这次给对了地方——有些时刻来访者要的就是一个明确的方向,而你判断这是那种时刻。\n\n判断对了。这次。',
            effects: [{ stats: { clinical: 1, state: 1 } }, { case: { op: 'adjustAlliance', delta: 2 } }],
          },
          {
            weight: 2,
            condition: { caseTrend: 'strained' },
            text: '他点头,说"有道理"。\n\n下次会谈,他汇报了没做到的理由,像交作业。**你把一段咨询关系变成了他和另一个权威的关系,而他人生里最不缺的就是这个。**',
            effects: [{ stats: { clinical: 1, state: -1 } }, { case: { op: 'adjustAlliance', delta: -4 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_cw_supermarket', 'working', {
    title: '超市',
    text: '周六下午,你在超市的酸奶货架前看见了「{{case}}」。他和家人在一起,在笑,和会谈室里判若两人。\n\n他还没看见你。你有三秒钟决定。',
    contextLines: [
      { text: '首次会谈你讲过这种情况的约定。你不确定他还记不记得。' },
    ],
    choices: [
      {
        id: 'walk_away',
        text: '转身走开,当作没看见',
        outcomes: [
          {
            weight: 2,
            text: '你推着车拐进了日化区。**保护他的隐私,包括不让他的家人有机会问"那是谁"。**\n\n下次会谈他主动提了:"上周在超市,是你吧?"你们谈了这件事——在咨询室里谈,这才是它该在的地方。',
            effects: [{ stats: { clinical: 3 } }],
          },
        ],
      },
      {
        id: 'nod_lightly',
        text: '等他看过来,轻轻点头',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '他点头回礼,谁都没停下。三秒钟,像两个只是眼熟的人。\n\n下次会谈他说:"谢谢你没过来打招呼。也谢谢你没装作不认识我。"**这个分寸,教科书给不了。**',
            effects: [{ stats: { clinical: 2, state: 1 } }, { case: { op: 'adjustAlliance', delta: 3 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '他愣了一下,家人顺着他的视线看过来,问了句什么。\n\n下次会谈他迟到了十分钟,解释说堵车。你们都知道不是。',
            effects: [{ stats: { state: -2, clinical: 1 } }, { case: { op: 'adjustAlliance', delta: -3 } }],
          },
        ],
      },
    ],
  }),

  // ══════════ 停滞期 ══════════
  caseEvent('ev_cp2_cancellations', 'plateau', {
    title: '"这周有点忙"',
    text: '「{{case}}」连续第三次改期了。理由都正当:出差、孩子发烧、临时加班。\n\n单独看每一个都没问题。**连起来看,这是脱落前最常见的脚步声。**',
    contextLines: [
      { condition: { caseCount: { status: 'dropped', op: '>=', value: 1 } }, text: '上一个脱落的个案,也是这样开始的。这次你听出来了。' },
      { text: '督导说过:改期是来访者在说一件他说不出口的事。' },
    ],
    choices: [
      {
        id: 'name_the_pattern',
        text: '下次会谈,把这个模式放到桌面上',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '"最近三次改期——我在想,是不是我们的工作里有什么让你想离远一点?"\n\n他沉默了很久,然后说了实话:上上次你说的某句话伤到他了。**你们谈开了。这段关系比谈开之前更结实。**',
            effects: [{ stats: { clinical: 4 } }, { case: { op: 'adjustAlliance', delta: 8 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '他说:"没有啊,就是真的忙。"语气客气而完整。\n\n你碰到了一扇关着的门。也许时机不对,也许门后没有东西——你不会知道。',
            effects: [{ stats: { clinical: 2, state: -2 } }],
          },
        ],
      },
      {
        id: 'wait',
        text: '不点破,等他自己回来',
        outcomes: [
          {
            weight: 2,
            text: '你等着。第四周他来了,像什么都没发生过。\n\n有的东西没被谈到,就还在那里。**你选择了不惊动它,代价是它也没有被工作到。**',
            effects: [{ stats: { state: -2, clinical: 1 } }],
          },
        ],
      },
      {
        id: 'lower_frequency',
        text: '主动提出降低频率',
        outcomes: [
          {
            weight: 1,
            text: '"要不要试试两周一次?"他明显松了一口气。\n\n频率降了,他反而稳定了。**有时候来访者需要的不是更多,是一个他撑得起的节奏。** 你的排期表也松了一格——你没承认这也是你提议的原因之一。',
            effects: [{ stats: { clinical: 2, state: 2 } }, { case: { op: 'adjustAlliance', delta: 3 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_cp2_stuck', 'plateau', {
    title: '原地转圈',
    text: '「{{case}}」谈到第 {{caseYears}} 年,最近的几次会谈像同一份录音:同样的抱怨,同样的领悟,同样的"我知道,但是"。\n\n今天他讲到一半,你走神了两秒。**你走神了。** 这件事吓到你的程度超过了会谈本身。',
    choices: [
      {
        id: 'bring_to_supervision',
        text: '把这个个案带回督导',
        outcomes: [
          {
            weight: 2,
            text: '督导听完二十分钟,问:"卡住的是他,还是你们俩?"\n\n她让你看见:他在会谈里绕的那个圈,和他在生活里绕的是同一个——**停滞不是治疗的故障,停滞就是他的问题本身在你面前上演。** 你重新有了工作的落点。',
            effects: [{ stats: { clinical: 4, state: 1 } }, { case: { op: 'setField', supervised: true } }],
          },
        ],
      },
      {
        id: 'change_approach',
        text: '换一种工作方式',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '你换了工作方式——给这段工作换了个抓手。他明显被激活了:"这个不一样。"\n\n新鲜感能撑几周,但它买来了几周,**而卡住的治疗最缺的就是时间。**',
            effects: [{ stats: { clinical: 2 } }, { case: { op: 'adjustAlliance', delta: 5 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '你换了技术。他配合着做了,像陪你完成作业。\n\n工具换了,你们之间那个没被说出来的东西没动。**是关系卡住了,不是方法不够多。**',
            effects: [{ stats: { clinical: 1, state: -2 } }],
          },
        ],
      },
      {
        id: 'admit_stuck',
        text: '对他承认:我们好像卡住了',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '"我有个感觉,最近我们像在原地转圈。你也有吗?"\n\n他看着你,第一次在会谈里笑出声:"我以为只有我觉得。"**那次会谈是几个月来最诚实的一次。**',
            effects: [{ stats: { clinical: 3 } }, { case: { op: 'adjustAlliance', delta: 8 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '他的脸垮了下来:"所以连你也觉得我没救?"\n\n你花了半次会谈解释"卡住"和"没救"的区别。**同一句话,接得住的人听到邀请,接不住的人听到判决。** 你选错了时机。',
            effects: [{ stats: { clinical: 2, state: -2 } }, { case: { op: 'adjustAlliance', delta: -5 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_cp2_is_it_working', 'plateau', {
    title: '"这个真的有用吗"',
    text: '会谈快结束的时候,「{{case}}」问:"我们做这个,真的有用吗?"\n\n不是挑衅。他是真的在问。**这可能是停滞期里最重要的一个问题,而你只有一次回答的机会。**',
    choices: [
      {
        id: 'answer_with_evidence',
        text: '认真回答:证据、疗程、以及合理的期待',
        outcomes: [
          {
            weight: 2,
            text: '你讲了心理治疗的疗效证据,讲了起效需要的时间,也讲了"有用"在他身上可能是什么样子——**包括他上个月做到的两件半年前做不到的事。**\n\n他听完说:"你不说我都没发现。"',
            effects: [{ stats: { clinical: 3 } }, { case: { op: 'adjustAlliance', delta: 4 } }],
          },
        ],
      },
      {
        id: 'turn_it_back',
        text: '把问题还给他:"你问这个问题的时候,心里已经有答案了吗?"',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '他沉默了一会儿,说:"我怕它有用。有用的话,我就没有借口继续现在这样了。"\n\n**这个回答值回了前面所有转圈的日子。**',
            effects: [{ stats: { clinical: 4 } }, { case: { op: 'adjustAlliance', delta: 7 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '他叹了口气:"你们是不是都这样,用问题回答问题。"\n\n技术没有错。**但一个真诚的问题有时候需要一个真诚的回答,而不是一面镜子。**',
            effects: [{ stats: { clinical: 1, state: -2 } }, { case: { op: 'adjustAlliance', delta: -4 } }],
          },
        ],
      },
      {
        id: 'honest_pause',
        text: '停三秒,说实话',
        outcomes: [
          {
            weight: 1,
            text: '"我不知道。我知道的是,你还在来,我还在认真对待每一次。有些变化要回头看才看得见,而我们现在还在里面。"\n\n他点点头。这不是一个漂亮的回答,**但它是真的,而他对"真的"很敏感。**',
            effects: [{ stats: { clinical: 2, state: 1 } }, { case: { op: 'adjustAlliance', delta: 3 } }],
          },
        ],
      },
    ],
  }),

  // ══════════ 结束期 ══════════
  caseEvent('ev_ct_countdown', 'terminating', {
    title: '倒数第三次',
    text: '你们约好了还有三次就结束。这次「{{case}}」迟到了一刻钟,上次他"忘了带钱包"。\n\n一个做了 {{caseYears}} 年咨询、从不迟到的人,在最后三次开始迟到。**结束也是一种丧失,他在提前练习失去你。**',
    choices: [
      {
        id: 'name_it',
        text: '把这个说给他听',
        outcomes: [
          {
            weight: 2,
            condition: { caseTrend: 'warm' },
            text: '"我们还有三次。我注意到你开始迟到——我猜,先走掉一点点,比到时候整个失去要容易一些?"\n\n他眼圈红了。那次会谈你们谈的全是告别:他人生里那些没来得及好好告别的人。**这才是结束期该干的活。**',
            effects: [{ stats: { clinical: 4 } }, { case: { op: 'adjustAlliance', delta: 6 } }],
          },
          {
            weight: 1,
            condition: { caseTrend: 'strained' },
            text: '他说:"想多了,就是堵车。"\n\n也许真是堵车。结束期的解释你永远无法验证——**再过两次,他就把答案带走了。**',
            effects: [{ stats: { clinical: 2, state: -1 } }],
          },
        ],
      },
      {
        id: 'let_it_be',
        text: '不点破,让结束按它自己的样子发生',
        outcomes: [
          {
            weight: 1,
            text: '你没说。他迟到,你们就用剩下的三十五分钟工作。\n\n不是每个过程都需要被命名。**有的告别就是要潦草一点才过得去**——这是你做了这些年才敢承认的事。',
            effects: [{ stats: { clinical: 1, state: 1 } }],
          },
        ],
      },
    ],
  }),
  caseEvent('ev_ct_last_session', 'terminating', {
    title: '最后一次',
    text: '「{{case}}」的最后一次会谈。{{caseYears}} 年,从"{{issue}}"开始,到今天。\n\n他坐在那个坐了很多次的位置上,说:"感觉应该说点什么总结的话,又不知道说什么。"',
    contextLines: [
      { text: '这间屋子里发生过的事,只有你们两个人知道。以后也是。' },
    ],
    choices: [
      {
        id: 'proper_ending',
        text: '按结束的仪式来:回顾、命名、告别',
        outcomes: [
          {
            weight: 2,
            text: '你们把这段工作从头走了一遍:他带来的问题、中间那段谁都不想提的僵局、变化是从哪一次开始的。\n\n最后他站起来,握了你的手。**你们都知道大概率不会再见了,而这正是做得好的咨询该有的结局。**',
            effects: [{ stats: { clinical: 3, state: 2 } }, { case: { op: 'complete' } }],
          },
        ],
      },
      {
        id: 'leave_door_open',
        text: '告诉他:门开着,需要的时候可以回来',
        outcomes: [
          {
            weight: 2,
            text: '"结束不是判决。以后如果需要,这里还在。"\n\n他说"好",笑了笑:"希望用不上。"\n\n**"希望用不上"——这是这一行能收到的最好的告别之一。**',
            effects: [{ stats: { clinical: 2, state: 2 } }, { case: { op: 'complete' } }],
          },
        ],
      },
      {
        id: 'you_talked_more',
        text: '这一次,你说得比平时多',
        outcomes: [
          {
            weight: 1,
            text: '最后一次,你允许自己多说了一点:你看见的他的变化,你佩服他的地方。都是真话,平时的技术纪律不让你说而已。\n\n他走后你收拾屋子,把纸巾盒摆正。**下周这个时间,这个位置上会坐着另一个人。**',
            effects: [{ stats: { state: 3, clinical: 1 } }, { case: { op: 'complete' } }],
          },
        ],
      },
    ],
  }),
];
