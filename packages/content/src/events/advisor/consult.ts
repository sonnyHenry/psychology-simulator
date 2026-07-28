import type { GameEvent } from '@psy-sim/core';

/**
 * 「寻求指导」的十二幕(M4.6,GAME_DESIGN 七节)。
 *
 * ## 这一格是原型的渐进揭示通道,不是揭示按钮
 *
 * 六个原型各两种回应,而且**至少一种要和另一个原型的某种回应同属一类**
 * (`outcomeTag`,validate 规则 35 强制)。大牛的"约不上"和放养型的"你自己看着办"
 * 在第一年读起来是同一件事——**他不管我**;分开要到第二第三年、看他在关键时刻
 * 做什么才行。一次问出结论,七节那个"换导师窗口逐年关闭"的张力就没了。
 *
 * ## 掷骰在引擎,故事在这里
 *
 * 玩家投下那一格 → `rollAdvisorConsult` 按 `AdvisorDef.consultResponses` 掷 →
 * 写下 `advisor_consult_result` → 这里的某一幕当年播出来。事件只讲故事,
 * 不决定命中哪一支。**这和课题掷骰、个案走向是同一条纪律。**
 *
 * ## 每一幕都留下一句话
 *
 * 每个 outcome 都写一条 `{ advisorLine }`——它常驻在工作台的导师面板上。
 * 一行文本,把一个幕后乘数变回一个人。
 */

const CONSULT_POOLS = ['grad', 'undergrad', 'clinical_common'];

/**
 * 事件的公共形状。`mandatory: true` + `once: false`:
 * 玩家花了一格,这一幕就必须播,而且明年再花一格还要能播。
 */
function consultEvent(
  responseId: string,
  fields: Omit<GameEvent, 'id' | 'pools' | 'trigger' | 'mandatory' | 'once' | 'category'>,
): GameEvent {
  return {
    id: `ev_consult_${responseId}`,
    pools: CONSULT_POOLS,
    category: 'social',
    mandatory: true,
    once: false,
    trigger: { flag: 'advisor_consult_result', equals: responseId },
    ...fields,
  };
}

export const advisorConsultEvents: GameEvent[] = [
  // ══════════ 学术大牛:约不上 / 一条资源 ══════════
  consultEvent('star_unavailable', {
    title: '他的日程排到了下个月',
    text: '你把卡住的地方整理成三页纸,发过去。\n\n秘书回你:{{advisor}}这两周在国外,回来那周有个评审。要不你先跟组里的博后聊聊?\n\n**三页纸你自己又读了一遍。** 读到第二页的时候,你发现有一个问题其实自己知道答案。',
    contextLines: [
      { text: '你把邮件从"已发送"里翻出来看了看,写得其实挺清楚的。' },
      { condition: { flag: 'trait_pleaser' }, text: '你回了一句"没关系老师您忙"。' },
    ],
    choices: [
      {
        id: 'wait',
        text: '再等等,这事得他拍板',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'unavailable',
            text: '你等了三周。等到的时候那个问题已经不重要了,因为你在等的过程中把它绕过去了。\n\n**这一年你学会的东西里,没有一件是他教的。**',
            effects: [
              { stats: { state: -3, method: 1 } },
              { advisorLine: '"这两周实在排不开,你先按自己的思路推。"' },
            ],
          },
        ],
      },
      {
        id: 'ask_postdoc',
        text: '找组里的博后聊',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'unavailable',
            text: '博后花了四十分钟,把你三页纸里两页划掉了。剩下那一页他说"这个可以做"。\n\n他没提署名的事。**在这个组里,真正在带你的人不是名单上那个。**',
            effects: [
              { stats: { method: 3, capital: 1 } },
              { setFlag: 'had_a_proxy_mentor' },
              { advisorLine: '"你先跟组里的博后聊聊。"' },
            ],
          },
        ],
      },
    ],
  }),
  consultEvent('star_resource', {
    title: '十分钟,但他给了你一个人',
    text: '他在两个会之间见了你十分钟,一边看手机一边听。\n\n听到第四分钟他抬头:"这个数据我们没有。隔壁组那边有一批现成的,我跟他说一声,你去联系。"\n\n然后他就走了。\n\n**十分钟里他没有回答你任何一个问题,但你手上多了一件你自己拿不到的东西。**',
    contextLines: [{ text: '你后来才知道,那句"我跟他说一声"值多少钱。' }],
    choices: [
      {
        id: 'take_it',
        text: '接住这条线',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'resource',
            text: '对方回邮件很快,因为提到了他的名字。数据一周之内到了你手上。\n\n**这就是"资源是真的多"这句话的具体样子**——它不解决你不会做的问题,它解决你做不到的问题。',
            effects: [
              { stats: { capital: 5, method: 2, state: 1 } },
              { project: { op: 'setField', quality: 6 } },
              { advisorLine: '"这个数据我们没有,我跟他说一声,你去联系。"' },
            ],
          },
        ],
      },
      {
        id: 'ask_again',
        text: '追着问完那几个问题',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'resource',
            text: '你跟着他走到电梯口。电梯来了,他说"你邮件里写一下",进去了。\n\n那条线你后来自己联系了,对方问"是{{advisor}}的学生吗",你说是,事情就办成了。\n\n**你借的是他的名字,不是他的时间。**',
            effects: [
              { stats: { capital: 4, state: -2 } },
              { project: { op: 'setField', quality: 4 } },
              { advisorLine: '"你邮件里写一下。"' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 青年 PI:给得很细 / 顺手又给两件事 ══════════
  consultEvent('young_pi_guidance', {
    title: '他拉着你在白板前站了两个小时',
    text: '{{advisor}}看完你的三页纸,说"你这个问题问错了",然后把白板擦干净。\n\n两个小时里他画了七版设计,推翻了六版。第七版的时候他停下来说:"这个能做。"\n\n**你从来没有被人这样一句一句地纠正过。** 累,但是有东西真的进去了。',
    contextLines: [
      { text: '白板上最后那版你拍了照,后来一直存在手机里。' },
      { condition: { flag: 'mastered_exp' }, text: '有两处你自己已经想到了,他点了下头。' },
    ],
    choices: [
      {
        id: 'follow',
        text: '按第七版重做',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'guidance',
            text: '重做的两周很痛苦,但推进得比前半年都快。\n\n**这就是"跟着一个自己也在拼命的人"的全部好处和全部代价。**',
            effects: [
              { stats: { method: 4, state: -2 } },
              { project: { op: 'advance' } },
              { project: { op: 'setField', quality: 5 } },
              { advisorLine: '"你这个问题问错了。"' },
            ],
          },
        ],
      },
      {
        id: 'keep_mine',
        text: '保留自己那一版,只吸收方法',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'guidance',
            text: '你把他的方法用在了自己的问题上。他后来看到结果说"哦,这样也行"。\n\n他没有不高兴。**这一点你要过几年、换一个导师之后才知道有多难得。**',
            effects: [
              { stats: { method: 3, capital: 1 } },
              { project: { op: 'setField', quality: 4 } },
              { setFlag: 'kept_own_design' },
              { advisorLine: '"哦,这样也行。"' },
            ],
          },
        ],
      },
    ],
  }),
  consultEvent('young_pi_chore', {
    title: '"正好,还有两件事"',
    text: '他很快就回了你,当天下午就见。你的问题他二十分钟给了答案,清楚、可执行。\n\n然后他说:"正好,还有两件事。"\n\n一件是下周的基金本子要一段文献综述,一件是他另一个学生的数据你帮着跑一下。\n\n**都是小事,加起来是三周。**',
    contextLines: [
      {
        condition: { flagNum: { key: 'advisor_consults', op: '>=', value: 3 } },
        text: '这是你第三次这样约他了。前两次的清单你还留着。',
      },
      { text: '他自己也在非升即走的第四年。' },
    ],
    choices: [
      {
        id: 'take_both',
        text: '都接下来',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'chore',
            text: '三周里你没碰自己的东西。本子中了,他在群里@了你一下。\n\n**你确实学到了怎么写本子——而这件事要到很多年以后才用得上。**',
            effects: [
              { stats: { capital: 4, state: -4 } },
              { advisorFavor: 8 },
              { addFlag: { key: 'advisor_chores', delta: 2, min: 0, max: 12 } },
              { advisorLine: '"正好,还有两件事。"' },
            ],
          },
        ],
      },
      {
        id: 'take_one',
        text: '只接一件',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'chore',
            text: '你说这周得先把自己的收尾。他愣了半秒,说"行"。\n\n**那半秒你记了很久。** 但下一次他还是当天就回了你邮件。',
            effects: [
              { stats: { capital: 2, state: -1 } },
              { advisorFavor: 2 },
              { addFlag: { key: 'advisor_chores', delta: 1, min: 0, max: 12 } },
              { setFlag: 'said_no_once' },
              { advisorLine: '"行。"' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 放养型:你自己看着办 / 那句话有时候是对的 ══════════
  consultEvent('hands_off_unavailable', {
    title: '"你自己看着办"',
    text: '{{advisor}}的办公室门开着,他在看一份很旧的打印稿。\n\n你把三页纸放下,讲了十分钟。他听完点点头,说了六个字:\n\n"你自己看着办。"\n\n然后他又低头去看那份打印稿了。**你在门口站了两秒才走。**',
    contextLines: [
      {
        condition: { flagNum: { key: 'advisor_consults', op: '>=', value: 3 } },
        text: '这句话你今年是第三次听到了。第一次你还愣了一下。',
      },
      { text: '走廊很安静,这层楼一共没几个人。' },
      { condition: { flag: 'trait_pleaser' }, text: '你想问"那您觉得哪个方向好一点",但没问出口。' },
    ],
    choices: [
      {
        id: 'figure_out',
        text: '那就自己看着办',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'unavailable',
            text: '你自己选了一条路。走了半年才知道那条路不通,但你确实是自己走的。\n\n**没有人给你划掉两页纸,所以两页纸你都得自己走一遍。**',
            effects: [
              { stats: { state: -4, method: 2 } },
              { setFlag: 'self_directed' },
              { advisorLine: '"你自己看着办。"' },
            ],
          },
        ],
      },
      {
        id: 'ask_others',
        text: '去问别的老师',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'unavailable',
            text: '隔壁组的老师很热心地给你讲了半小时,末了说:"不过这是你们组的事,我不好多说。"\n\n**这一行里最难的不是没人帮你,是所有人都很客气。**',
            effects: [
              { stats: { method: 2, capital: 1, state: -2 } },
              { advisorLine: '"你自己看着办。"' },
            ],
          },
        ],
      },
    ],
  }),
  consultEvent('hands_off_insight', {
    title: '他讲了一件三十年前的事',
    text: '你以为又是"你自己看着办"。他这次抬起头,问你:"你为什么要做这个题?"\n\n你答了一半,他打断:"不是这个。你自己想知道什么?"\n\n然后他讲了一件一九九几年的事——一个他做了六年没做出来的东西,和他后来是怎么想明白那六年不算白做的。\n\n**四十分钟里他一句方法都没教。**',
    contextLines: [{ text: '他说话很慢,中间停了好几次。' }],
    choices: [
      {
        id: 'sit_with_it',
        text: '听完,回去重新想那个问题',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'insight',
            text: '那天晚上你把题重新写了一遍。写出来的东西没有更好做,但你知道自己在做什么了。\n\n**"你自己看着办"这句话有时候是对的,只是它不该是唯一的一句。**',
            effects: [
              { stats: { state: 5, method: 1 } },
              { setFlag: 'knows_why' },
              { advisorLine: '"你自己想知道什么?"' },
            ],
          },
        ],
      },
      {
        id: 'still_need_help',
        text: '还是把那三个具体问题问完',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'insight',
            text: '他很认真地想了想,给了三个都不算答案的回答。\n\n但其中一个后来被证明是对的,而你当时没听懂。**这种事在这一行里经常发生。**',
            effects: [
              { stats: { state: 2, method: 2 } },
              { project: { op: 'setField', quality: 3 } },
              { advisorLine: '"我也不知道,你试试看。"' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 临床派:个案层面的指导 / 方法上的指导 ══════════
  consultEvent('clinical_case', {
    title: '她把你的问题换了一个问法',
    text: '你想问的是课题,{{advisor}}听了两句就问:"你手上那个来访者,上周怎么样?"\n\n你说了。她追问了三个细节,然后说:"你刚才讲他的时候,一直在讲你自己做了什么。"\n\n**那一句话你回去想了三天。**',
    contextLines: [
      { text: '她办公室里有一个沙盘,角落堆着几箱教具。' },
      { condition: { flagNum: { key: 'clinical_hours', op: '>=', value: 200 } }, text: '你已经攒了两百多小时,这还是第一次有人这么说你。' },
    ],
    choices: [
      {
        id: 'take_the_note',
        text: '认真接住这句话',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'clinical_guidance',
            text: '下一次会谈你少说了很多话。来访者反而多说了。\n\n**你的文章她一个字都没看,但你这一年真正长进的地方在这儿。**',
            effects: [
              { stats: { clinical: 5, state: 1 } },
              { addFlag: { key: 'self_insight', delta: 1, min: 0, max: 12 } },
              { advisorLine: '"你刚才讲他的时候,一直在讲你自己做了什么。"' },
            ],
          },
        ],
      },
      {
        id: 'redirect',
        text: '把话题拉回课题',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'clinical_guidance',
            text: '她配合地聊了课题,给的建议不算错,但明显没多少兴趣。\n\n**你毕业那年会发现文章不够,而她那时候会很真诚地帮你想办法。**',
            effects: [
              { stats: { clinical: 2, method: 1 } },
              { advisorLine: '"文章的事……你先把手上这个案子做完。"' },
            ],
          },
        ],
      },
    ],
  }),
  consultEvent('clinical_guidance', {
    title: '她给你找了一段录像',
    text: '这次她认真看了你的三页纸,看了很久。\n\n"你这个测量的问题,"她说,"不是统计能解决的。你去看一段东西。"\n\n她给了你一段十年前的会谈录像和一篇很老的文章。**看完你把量表全换了。**',
    contextLines: [{ text: '那篇文章的复印件上有她自己的批注。' }],
    choices: [
      {
        id: 'rebuild',
        text: '按那个思路重做测量',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'guidance',
            text: '重做花了两个月,课题往前挪了一大步,而且挪得很结实。\n\n**做临床的人做研究,慢,但不容易做空。**',
            effects: [
              { stats: { method: 2, clinical: 3 } },
              { project: { op: 'advance' } },
              { project: { op: 'setField', quality: 6 } },
              { advisorLine: '"你这个测量的问题,不是统计能解决的。"' },
            ],
          },
        ],
      },
      {
        id: 'partial',
        text: '只改一部分,来不及全换',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'guidance',
            text: '你留了两个旧量表。**那两个后来在审稿意见里被点了名**,而她当时其实提醒过你。',
            effects: [
              { stats: { method: 1, clinical: 1 } },
              { project: { op: 'setField', quality: 2, integrityRisk: 2 } },
              { advisorLine: '"那你自己权衡时间。"' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 边界感差的:代价是一件私活 / 带你去见一个人 ══════════
  consultEvent('boundary_chore', {
    title: '他给了,然后说"周六有个事"',
    text: '{{advisor}}给得很痛快:两个小时,问题一个个过,还替你想到了两个你没想到的。\n\n临走的时候他说:"对了,周六有个企业的验收会,你跟我去一趟,做个记录。"\n\n**周六是你唯一能连着干八小时的那一天。**',
    contextLines: [
      { text: '上一次这样的"一趟"是三个月前,去了两天。' },
      { condition: { flag: 'trait_pleaser' }, text: '你听见自己说"好的"的时候,心里那一下很清楚。' },
    ],
    choices: [
      {
        id: 'go',
        text: '去',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'chore',
            text: '会开到晚上,后面还有饭局。你记了很详细的笔记,他很满意。\n\n**指导是真的,代价也是真的,而且它们是一起给的。** 这条线上最难受的地方就在这儿。',
            effects: [
              { stats: { capital: 5, state: -5 } },
              { advisorFavor: 10 },
              { addFlag: { key: 'advisor_chores', delta: 2, min: 0, max: 12 } },
              { project: { op: 'setField', quality: 4 } },
              { advisorLine: '"周六有个事,你跟我去一趟。"' },
            ],
          },
        ],
      },
      {
        id: 'decline',
        text: '推掉',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'chore',
            text: '你说周六约了人。他"哦"了一声,说"那算了"。\n\n之后两个月,你的邮件平均要三天才回。**没有人会承认这两件事有关系。**',
            effects: [
              { stats: { state: -2 } },
              { advisorFavor: -8 },
              { setFlag: 'said_no_once' },
              { project: { op: 'setField', quality: 4 } },
              { advisorLine: '"哦,那算了。"' },
            ],
          },
        ],
      },
    ],
  }),
  consultEvent('boundary_resource', {
    title: '"晚上一起吃个饭,有个人你该认识"',
    text: '他没怎么看你的三页纸,直接说:"这个方向你一个人做不动。晚上有个饭局,有个人你该认识。"\n\n饭局上他把你介绍给一位处长模样的人,说"我这个学生很能干"。\n\n酒过了两轮,他让你去敬一圈。**你敬了。**',
    contextLines: [{ text: '回去的路上你想的是明天九点还有个组会。' }],
    choices: [
      {
        id: 'follow_up',
        text: '第二天跟进那条线',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'resource',
            text: '那条线是真的:三个月后一个横向项目落到你名下,经费不少。\n\n**你说不清昨晚那一圈酒到底算什么。** 它换来了一个你原本够不到的资源,而这句话本身就已经说明问题了。',
            effects: [
              { stats: { capital: 6, money: 12000, state: -3 } },
              { advisorFavor: 6 },
              { addFlag: { key: 'advisor_chores', delta: 1, min: 0, max: 12 } },
              { advisorLine: '"我这个学生很能干。"' },
            ],
          },
        ],
      },
      {
        id: 'let_go',
        text: '不跟进,回去做自己的东西',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'resource',
            text: '那条线断在了那儿。他后来问过一次,你说在忙,他就没再提。\n\n**你保住了那三个月,也确实少了一样东西。** 这笔账没有对错,只有代价。',
            effects: [
              { stats: { state: 1, method: 2 } },
              { advisorFavor: -4 },
              { advisorLine: '"上次那个,后来你联系了没有?"' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 温暖型:她真的花两小时跟你聊 / 一句听不懂的实话 ══════════
  consultEvent('warm_warmth', {
    title: '她泡了茶,问你最近睡得怎么样',
    text: '你把三页纸摊开,{{advisor}}看了一眼,先去倒了两杯茶。\n\n"这个先放放,"她说,"你最近睡得怎么样?"\n\n后面两个小时里,课题只占了二十分钟。她讲了她自己延毕那一年,讲得很具体——具体到哪个月最难。\n\n**方法上她没帮上什么。你走出办公室的时候眼睛有点热。**',
    contextLines: [
      { text: '她记得你哪个月生日,尽管你从来没说过。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 45 } }, text: '你已经很久没有跟人这样说过话了。' },
    ],
    choices: [
      {
        id: 'let_it_land',
        text: '把话说完',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'warmth',
            text: '你说了很多本来不打算说的事。她一直在听,没有给建议。\n\n**这一格没有推进任何一个课题。** 但接下来那半年你没有垮。',
            effects: [
              { stats: { state: 9 } },
              { addFlag: { key: 'burnout', delta: -10, min: 0, max: 100 } },
              { advisorFavor: 6 },
              { advisorLine: '"这个先放放,你最近睡得怎么样?"' },
            ],
          },
        ],
      },
      {
        id: 'push_back_to_work',
        text: '还是想把课题问完',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'warmth',
            text: '她认真陪你过了一遍,能给的建议都给了——但她能给的确实有限。\n\n**你的天花板是她的天花板**,这件事她自己比你更早知道。',
            effects: [
              { stats: { state: 4, method: 1 } },
              { project: { op: 'setField', quality: 2 } },
              { advisorLine: '"我们组的条件……你别只盯着我这边。"' },
            ],
          },
        ],
      },
    ],
  }),
  consultEvent('warm_insight', {
    title: '"你要不要考虑换个人问?"',
    text: '这次她没有先倒茶。她把你的三页纸从头看到尾,然后说了一句你没想到的话:\n\n"这个东西我帮不了你。你去找做这一块的人问,认知那边有几个老师比我在行。"\n\n她说这话的时候很平静。**她在把你往外推,而这是她能给你的最贵的东西。**',
    contextLines: [{ text: '她列了三个名字,写在一张便利贴上。' }],
    choices: [
      {
        id: 'go_ask',
        text: '照那张便利贴去问',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'insight',
            text: '第二个名字回了你的邮件,聊了四十分钟,把你卡住的地方讲通了。\n\n**你后来才明白,一个愿意说"我帮不了你"的导师有多稀少。**',
            effects: [
              { stats: { method: 4, capital: 2, state: 2 } },
              { project: { op: 'advance' } },
              { advisorLine: '"这个东西我帮不了你。"' },
            ],
          },
        ],
      },
      {
        id: 'stay',
        text: '不去,就在她这儿做',
        outcomes: [
          {
            weight: 1,
            outcomeTag: 'insight',
            text: '你说没关系,慢慢做。她笑了一下,没再说什么。\n\n**这个选择你不后悔,但它是有价钱的**,而价钱要到几年之后才结算。',
            effects: [
              { stats: { state: 3 } },
              { advisorFavor: 8 },
              { setFlag: 'stayed_with_warm' },
              { advisorLine: '"那我们就慢慢做。"' },
            ],
          },
        ],
      },
    ],
  }),
];
