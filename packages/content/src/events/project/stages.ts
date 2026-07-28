import type { GameEvent } from '@psy-sim/core';

/**
 * 课题管线的九个阶段事件池(GAME_DESIGN 第五节)。
 *
 * ## 这些事件不推进课题
 *
 * 推进由引擎按 `stageSuccessChance` 掷骰决定(每年 `2 + 2×投入格数` 次),
 * 阶段事件只做三件事:**讲这一年的故事**、改 `quality` / `integrityRisk`、
 * 以及提供"放弃 / 改设计 / 换故事"这类需要玩家决定的转折。
 *
 * 内容用 `{ projectRoll: 'ok' | 'setback' }` 分流到"推进了"和"卡住了"两种文案,
 * 所以玩家看到的话永远和骰子结果一致。
 *
 * ## 文案一律参数化(M7.5 的纪律,从第一版起就遵守)
 *
 * `{{project}}` = 课题名 · `{{years}}` = 这是第几年 · `{{advisor}}` = 导师名。
 * 事后补参数化的成本是当初就那么写的三到五倍——前作补了九轮变体池,那就是学费。
 *
 * ## `once: false`
 *
 * 阶段事件要能在不同课题、不同年份重复出现,所以全部 `once: false`。
 * 这也意味着**每个阶段的池子必须够厚**,否则同一句话会在一局里出现四次。
 */

/** 阶段事件的公共形状:不进普通池、可重复、由调度器按课题当前阶段挑 */
function stageEvent(
  id: string,
  projectStage: GameEvent['projectStage'],
  rest: Omit<GameEvent, 'id' | 'pools' | 'projectStage' | 'once'>,
): GameEvent {
  return { id, pools: [], projectStage, once: false, category: 'method', ...rest };
}

export const projectStageEvents: GameEvent[] = [
  // ══════════ 想法 ══════════
  stageEvent('ev_ps_ideation_done_before', 'ideation', {
    title: '"这个别人做过了"',
    text: '组会上你讲了十分钟。\n\n{{advisor}} 听完停了两秒,说:"这个思路 2013 年有人做过,而且样本比你大。"\n\n他没有说"所以别做了"。他也没有说"所以你可以做"。',
    contextLines: [
      { text: '你回去搜了那篇。确实很像,但不完全一样。' },
      { condition: { flag: 'checks_replications' }, text: '你顺手查了那篇有没有被重复过。没有。' },
    ],
    choices: [
      {
        id: 'find_the_gap',
        text: '找出你和那篇的真正差别',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你花了两周把那篇和相关的六篇读透,找到了一个真的没人做过的角度:他们用的是回忆任务,而你想做的是**在线**加工。\n\n「{{project}}」现在有了一个能站住的立论。',
            effects: [{ stats: { method: 4 } }, { project: { op: 'setField', quality: 10 } }],
          },
          {
            weight: 2,
            condition: { projectRoll: 'setback' },
            text: '你读了两周,越读越觉得自己那点差别不重要。\n\n「{{project}}」还停在原地,而你现在连自己都说服不了。',
            effects: [{ stats: { method: 2, state: -3 } }],
          },
        ],
      },
      {
        id: 'pivot',
        text: '换一个角度重新想',
        outcomes: [
          {
            weight: 1,
            text: '你把整个想法推倒重来。这一年基本白过,但新的那个问题你自己是真的想知道答案。\n\n**这是这一行少数几件不用后悔的事。**',
            effects: [{ stats: { method: 3, state: -2 } }, { project: { op: 'setField', quality: 8 } }],
          },
        ],
      },
      {
        id: 'push_anyway',
        text: '就做,差别够写',
        outcomes: [
          {
            weight: 2,
            text: '你把差别写进了引言。它够写,但不够有意思——**你自己也知道**。\n\n这个课题从这一刻起就注定是一篇"能发但没人引"的文章。',
            effects: [{ stats: { method: 1 } }, { project: { op: 'setField', quality: -6 } }],
          },
          {
            weight: 1,
            text: '你就做了。三年后那篇发出来,被引 4 次,其中 3 次是你自己。',
            effects: [{ stats: { method: 1, capital: 1 } }, { project: { op: 'setField', quality: -4 } }],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_ideation_journal_club', 'ideation', {
    title: 'journal club 上读到一篇',
    text: '这周的 journal club,师妹选的那篇正是你想做的。\n\n同一个问题,更大的样本,而且他们预注册了。\n\n屋里所有人都在看你——因为大家都知道你在做这个。',
    contextLines: [
      { text: '「{{project}}」你已经做了 {{years}} 年。' },
      { condition: { flag: 'knows_preregistration' }, text: '他们预注册了。你没有。' },
    ],
    choices: [
      {
        id: 'extend_it',
        text: '把你的做成它的延伸',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你把自己的设计改成"在他们的基础上加一个边界条件"。这个定位更小,但更扎实,而且**引言好写多了**。',
            effects: [{ stats: { method: 4 } }, { project: { op: 'setField', quality: 8 } }],
          },
          {
            weight: 2,
            condition: { projectRoll: 'setback' },
            text: '你想改成延伸,但发现他们已经把你想加的那个边界条件做了——在补充材料里。\n\n你在组会上没说话。',
            effects: [{ stats: { state: -4, method: 1 } }],
          },
        ],
      },
      {
        id: 'wait_and_see',
        text: '先放两个月,想清楚再说',
        outcomes: [
          {
            weight: 2,
            text: '你把「{{project}}」的文件夹合上了,打算过阵子再看。\n\n**"过阵子再看"这句话在这一行的存活率很低**,但也不是零——有些东西确实需要放一放。',
            effects: [{ stats: { state: 2, method: 1 } }],
          },
        ],
      },
      {
        id: 'abandon_it',
        text: '放弃这个课题',
        outcomes: [
          {
            weight: 1,
            text: '你把「{{project}}」的文件夹归档了。{{years}} 年。\n\n{{advisor}} 说了句"这很正常"。他说得对——**做废是这一行最普遍的经验,不是失败**。只是这句话要自己经历过才信。',
            effects: [
              { stats: { state: -6, method: 2 } },
              { project: { op: 'abandon' } },
              { setFlag: 'abandoned_a_project' },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_ideation_too_big', 'ideation', {
    title: '你的问题太大了',
    text: '你想做的那个问题,写在纸上是一句话,拆成实验是三年。\n\n{{advisor}} 在你的开题报告上画了一个圈,圈住了其中一小块,旁边写:"先做这个。"',
    contextLines: [
      { text: '圈里那一块看起来一点都不有意思。' },
      { condition: { flag: 'learned_to_scope' }, text: '大四写毕业论文的时候你已经学过一次这件事了。' },
    ],
    choices: [
      {
        id: 'take_the_circle',
        text: '就做圈里那一块',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '小问题做起来快得多。三个月你就把设计定下来了。\n\n**"把问题切到能做"是一门手艺**,而大部分人是被逼着学会的。',
            effects: [{ stats: { method: 4 } }, { project: { op: 'setField', quality: 6 } }],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你按他画的圈做了,但做着做着发现那一小块本身不成立——它依赖的那个前提没人验证过。',
            effects: [{ stats: { method: 2, state: -3 } }],
          },
        ],
      },
      {
        id: 'keep_the_scope',
        text: '坚持做完整的',
        outcomes: [
          {
            weight: 2,
            text: '你做了三个实验的设计。{{advisor}} 没再说什么。\n\n**这个决定在三年后会以两种形式之一回来**:一篇很好的文章,或者一个做不完的课题。现在还看不出是哪种。',
            effects: [
              { stats: { method: 3, state: -3 } },
              { project: { op: 'setField', quality: 14 } },
              { setFlag: 'kept_the_big_question' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 文献 ══════════
  stageEvent('ev_ps_lit_review_exists', 'lit', {
    title: '综述已经有人写了',
    text: '你读到第 80 篇的时候,搜到了一篇 2019 年的系统综述。\n\n它把你这两个月读的东西整理得比你好。',
    contextLines: [
      { text: '你的文献表格现在有 214 行。' },
      { condition: { flag: 'trait_rigorous' }, text: '每一行你都自己读过原文。' },
    ],
    choices: [
      {
        id: 'use_it',
        text: '用它,把省下的时间放到设计上',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你把综述的参考文献倒着查了一遍,补了近三年的十几篇,然后回到设计。\n\n**读文献的目的从来不是读完,是知道自己站在哪。**',
            effects: [{ stats: { method: 4 } }, { project: { op: 'setField', quality: 6 } }],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你用了它,但你没意识到它的纳入标准把你最关心的那一类研究排除掉了。\n\n这件事要到审稿意见回来才会被指出来。',
            effects: [{ stats: { method: 2 } }, { project: { op: 'setField', quality: -5 } }],
          },
        ],
      },
      {
        id: 'read_on',
        text: '继续自己读完',
        outcomes: [
          {
            weight: 1,
            text: '你又读了三个月,读到 260 篇。\n\n你比那篇综述的作者更懂这个领域了。**这件事在你的简历上一个字都写不出来**,但它在你后面十年的每一次审稿里都在。',
            effects: [
              { stats: { method: 7, state: -4 } },
              { project: { op: 'setField', quality: 10 } },
              { setFlag: 'knows_the_literature' },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_lit_replication_failed', 'lit', {
    title: '这个效应在 2015 年被重复失败过',
    text: '你读到一篇 2015 年的多实验室重复研究。\n\n你整个设计建立在其中一个效应上,而那个效应,在 2000 多人的样本里没有重复出来。\n\n原文那篇 1998 年的,被引 3000 多次。',
    contextLines: [
      { text: '你的开题报告里引了那篇原文,引了三次。' },
      { condition: { flag: 'knows_textbooks_can_be_wrong' }, text: '大二那年你就知道会有这一天。' },
      { condition: { flag: 'checks_replications' }, text: '幸好你养成了先查重复研究的习惯——这次它救了你几个月。' },
    ],
    choices: [
      {
        id: 'redesign',
        text: '换一个不依赖它的设计',
        outcomes: [
          {
            weight: 1,
            text: '你把地基换掉了。多花了半年,但「{{project}}」现在站在一个你自己验证过的东西上。\n\n**这半年不会有任何人知道。**',
            effects: [
              { stats: { method: 6, state: -3 } },
              { project: { op: 'setField', quality: 14 } },
              { setFlag: 'rebuilt_the_foundation' },
            ],
          },
        ],
      },
      {
        id: 'cite_original_only',
        text: '只引原文,不提重复失败',
        outcomes: [
          {
            weight: 2,
            text: '你在引言里引了那篇 1998 年的,没提 2015 年那篇。\n\n**这不算造假**——你只是没有引一篇不利的文献,而这件事每天都在发生。审稿人大概率不会知道。',
            effects: [
              { stats: { capital: 1 } },
              { project: { op: 'setField', integrityRisk: 14, quality: -4 } },
              { addFlag: { key: 'integrity_risk', delta: 8, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你没提。审稿人正好是做这个重复研究的组里的人。\n\n那是两年后的事了。',
            effects: [
              { stats: { capital: 1 } },
              { project: { op: 'setField', integrityRisk: 14 } },
              { addFlag: { key: 'integrity_risk', delta: 8, min: 0, max: 100 } },
              { setFlag: 'reviewer_will_know' },
            ],
          },
        ],
      },
      {
        id: 'do_the_replication',
        text: '干脆先自己做一次重复',
        visibleIf: { flag: 'trait_skeptic' },
        outcomes: [
          {
            weight: 1,
            text: '你把「{{project}}」暂停,先做了一次直接重复。\n\n没重复出来。你把这个结果写成了一篇短文,发在一个不起眼的刊上。\n\n**这篇文章的被引会很低,而它是你做过的最诚实的一件事。**',
            effects: [
              { stats: { method: 8, capital: -2, state: -2 } },
              { project: { op: 'setField', quality: 16 } },
              { setFlag: 'did_a_replication' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 伦理 / 预注册(挂在文献站)══════════
  stageEvent('ev_ps_ethics_revisions', 'lit', {
    title: '伦理委员会返修第三次',
    text: '第三次返修意见:知情同意书里未成年被试的监护人签字栏格式不符合要求。\n\n你这个研究招的是大学生。\n\n你回复说明了,他们回复"请按模板修改"。',
    contextLines: [
      { text: '第一次返修是三月,现在是七月。' },
      { condition: { flag: 'lab_logistics' }, text: '你现在是组里最会填表的那个人。' },
    ],
    choices: [
      {
        id: 'comply',
        text: '照模板改,不争',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你按模板改完,一周后过了。\n\n**四个月,换一张纸。** 这四个月里你其实什么都没耽误——因为你早就学会了同时推两件事。',
            effects: [{ stats: { method: 2, capital: 1 } }],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你改完了,第四次返修:这次是数据保存年限那一栏。',
            effects: [{ stats: { state: -4 } }, { addFlag: { key: 'burnout', delta: 5, min: 0, max: 100 } }],
          },
        ],
      },
      {
        id: 'preregister',
        text: '顺便把预注册也做了',
        outcomes: [
          {
            weight: 1,
            text: '你在 OSF 上把假设、样本量和分析方案登记出去。\n\n**从这一刻起你不能改假设了。** 这件事在收数据之前感觉像自缚手脚,在拿到不显著结果那天感觉像救命。',
            effects: [
              { stats: { method: 5 } },
              { project: { op: 'setField', preregistered: true, quality: 12 } },
              { setFlag: 'knows_preregistration' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 收数据 ══════════
  stageEvent('ev_ps_collect_no_subjects', 'collect', {
    title: '被试招不满',
    text: '「{{project}}」需要 120 个被试。\n\n你挂了两个月,来了 61 个。SONA 池被隔壁组抢空了,他们给的钱比你多 20 块。',
    contextLines: [
      { text: '这是第 {{years}} 年。' },
      { condition: { advisor: { archetype: 'star' } }, text: '你导师那边其实有钱,但你得先在组会上开口。' },
      { condition: { flag: 'origin_rural' }, text: '自己贴钱这个选项你算过,是这个月的生活费。' },
    ],
    choices: [
      {
        id: 'ask_for_money',
        text: '去问导师要被试费',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '{{advisor}} 说"报销的时候写清楚",然后批了。\n\n三周后你收满了。**开口这件事比你以为的容易,而你花了两个月才开口。**',
            effects: [{ stats: { capital: 2, method: 2 } }, { advisorFavor: 3 }],
          },
          {
            weight: 2,
            condition: { projectRoll: 'setback' },
            text: '{{advisor}} 说这个项目的经费卡在学校那边,让你先想别的办法。\n\n他不是在推脱。经费真的卡了半年。',
            effects: [{ stats: { state: -4 } }],
          },
        ],
      },
      {
        id: 'lower_the_bar',
        text: '把样本量要求降下来',
        outcomes: [
          {
            weight: 2,
            text: '你把预期样本从 120 改成 70,重新算了一遍检出力,发现刚好够检出一个"中等偏大"的效应。\n\n**你没有说谎**——你只是把标准调到了你能达到的地方。这件事和造假之间隔着很多步,而这是第一步。',
            effects: [
              { stats: { method: 1 } },
              { project: { op: 'setField', quality: -10, integrityRisk: 8 } },
              { addFlag: { key: 'integrity_risk', delta: 5, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            condition: { flag: 'checks_power' },
            text: '你算了一遍检出力,发现 70 个人只够检出一个大得不真实的效应。\n\n你没改。你继续招。**大二那年自己算过一遍这个公式的人,在这里会停下来。**',
            effects: [{ stats: { method: 4, state: -3 } }],
          },
        ],
      },
      {
        id: 'recruit_friends',
        text: '发动同学和师弟师妹来做',
        outcomes: [
          {
            weight: 1,
            text: '你收满了。其中 23 个是你同门,他们大概能猜到你的假设。\n\n这件事你在方法部分不会写。',
            effects: [
              { stats: { capital: -1, method: 1 } },
              { project: { op: 'setField', quality: -6, integrityRisk: 6 } },
              { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } },
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_collect_counterbalance', 'collect', {
    title: '师妹把 counterbalance 弄反了',
    text: '你翻数据的时候发现:第 31 到 58 号被试的条件顺序全反了。\n\n帮你跑被试的师妹按你写的流程做的。你写的那份流程,第 4 步和第 5 步的顺序确实有歧义。',
    contextLines: [
      { text: '28 个被试。三周。' },
      { condition: { flag: 'mastered_exp' }, text: '你一眼就看出这 28 个不能直接合并——顺序效应会和你的自变量混在一起。' },
      { condition: { flag: 'trait_rigorous' }, text: '你写流程的时候写了七版。第八版应该写清楚的。' },
    ],
    choices: [
      {
        id: 'redo_them',
        text: '这 28 个重跑',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你重新招了 28 个,自己跑,三周。\n\n你没有怪师妹,还把流程重写了一遍贴在实验室墙上。**后来那份流程被组里用了很多年。**',
            effects: [
              { stats: { method: 5, capital: 2, state: -3 } },
              { project: { op: 'setField', quality: 8 } },
            ],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你重跑了,但这学期只剩两周,只补回来 12 个。\n\n数据依然不够,而学期结束了。',
            effects: [{ stats: { state: -5, method: 2 } }],
          },
        ],
      },
      {
        id: 'keep_them',
        text: '留着,分析时加一个顺序变量控制',
        outcomes: [
          {
            weight: 2,
            text: '你把顺序当协变量放进模型。技术上说得通,而且很多文章都这么干。\n\n**它确实说得通。** 只是你自己知道,这不是当初设计的那个实验了。',
            effects: [
              { stats: { method: 3 } },
              { project: { op: 'setField', quality: -8, integrityRisk: 6 } },
              { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你把顺序当协变量放进模型,而且在方法部分**写清楚了这 28 个是怎么回事**。\n\n审稿人后来问了这一点,你答得很稳——因为你写了。',
            effects: [
              { stats: { method: 4 } },
              { project: { op: 'setField', quality: -3 } },
              { setFlag: 'disclosed_the_mess' },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_collect_grind', 'collect', {
    title: '这一年你就在跑被试',
    text: '「{{project}}」的第 {{years}} 年。\n\n你这一年做的事是:约人、跑人、洗头、导数据、备份、约下一个人。\n\n没有一件事能写进简历,没有一件事能在组会上讲五分钟。',
    contextLines: [
      { text: '你的实验室日志现在有 190 多条。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 40 } }, text: '你已经很久没有觉得这件事有意思了。' },
      { condition: { advisor: { archetype: 'hands_off' } }, text: '这一年里 {{advisor}} 问过你两次进度。' },
    ],
    choices: [
      {
        id: 'keep_grinding',
        text: '接着跑',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '年底你收满了。导出数据那天你在实验室坐了很久,没有很高兴,只是很累。\n\n**这一年是这条路上最长的一段,而它在任何叙述里都会被压缩成一句"然后我收完了数据"。**',
            effects: [{ stats: { method: 3, state: -4 } }, { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } }],
          },
          {
            weight: 2,
            condition: { projectRoll: 'setback' },
            text: '年底你还差 30 个。明年再说。\n\n「{{project}}」进入第 {{years}} 年。',
            effects: [{ stats: { state: -6 } }, { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } }],
          },
        ],
      },
      {
        id: 'automate',
        text: '花两周写个脚本把流程自动化',
        visibleIf: { flag: 'can_debug' },
        outcomes: [
          {
            weight: 1,
            text: '两周的脚本,省了后面四个月。而且组里所有人都在用它。\n\n**这是"会写代码"在这一行的真实价值**:不是发文章,是把重复劳动砍掉。',
            effects: [
              { stats: { method: 5, capital: 3 } },
              { project: { op: 'setField', quality: 4 } },
              { addFlag: { key: 'burnout', delta: -6, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'shelve_it',
        text: '停下来。这个课题做不动了',
        outcomes: [
          {
            weight: 1,
            text: '你把「{{project}}」放下了。{{years}} 年的数据存在一个叫「暂停」的文件夹里。\n\n**你后来再也没打开过它。** 这不是失败,这是这一行里每个人的硬盘上都有的那个文件夹。',
            effects: [
              { stats: { state: 4, method: -1 } },
              { project: { op: 'abandon' } },
              { setFlag: 'abandoned_a_project' },
              { addFlag: { key: 'burnout', delta: -10, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 分析 ══════════
  stageEvent('ev_ps_analyze_p062', 'analyze', {
    title: 'p = .062',
    text: '「{{project}}」的主效应:\n\n> F(1, 118) = 3.58, **p = .062**\n\n你已经见过一次这个场面了。那次是你的毕业论文。',
    contextLines: [
      { text: '这次的样本比那次大得多,而且花了 {{years}} 年。' },
      { condition: { flag: 'reported_null_result' }, text: '上一次你照实写了。' },
      { condition: { flag: 'did_optional_stopping' }, text: '上一次你又加了 20 个被试。' },
      { condition: { flag: 'preregistered' }, text: '你预注册了。分析方案登记出去了,改不了。' },
    ],
    choices: [
      {
        id: 'report_it',
        text: '照实写',
        outcomes: [
          {
            weight: 1,
            text: '你把它写成一个未达显著的主效应,然后老实讨论了检出力。\n\n{{advisor}} 说:"那这篇不好投。"他说得对。\n\n**你还是照实写了。** 这一次比上一次难,因为这一次有 {{years}} 年在里面。',
            effects: [
              { stats: { method: 6, state: -2, capital: -2 } },
              { project: { op: 'setField', quality: 10 } },
              { setFlag: 'reported_null_again' },
            ],
          },
        ],
      },
      {
        id: 'find_the_interaction',
        text: '主效应没了,但交互显著',
        outcomes: [
          {
            weight: 2,
            text: '你跑了交互:**p = .028**。\n\n你把引言重写成"我们关注的是调节效应",讨论里讲得很顺。\n\n这篇会发出来。而三年后有人做重复研究,重复的是你写的那个交互——**那个你事后才找到的交互**。',
            effects: [
              { stats: { method: 1, capital: 2 } },
              { project: { op: 'setField', integrityRisk: 24, quality: 4 } },
              { addFlag: { key: 'integrity_risk', delta: 15, min: 0, max: 100 } },
              { setFlag: 'did_harking' },
            ],
          },
          {
            weight: 1,
            condition: { flag: 'preregistered' },
            text: '你跑了交互,显著。然后你想起自己预注册了。\n\n你把交互放进了"探索性分析"那一节,并且标明它是探索性的。\n\n**预注册那天你觉得是自缚手脚,今天它替你做了一个你未必做得出的决定。**',
            effects: [
              { stats: { method: 7, state: 2 } },
              { project: { op: 'setField', quality: 12 } },
              { setFlag: 'preregistration_saved_me' },
            ],
          },
        ],
      },
      {
        id: 'drop_outliers',
        text: '剔掉那两个离群值再看',
        outcomes: [
          {
            weight: 2,
            text: '剔掉之后:**p = .041**。\n\n那两个被试的反应时确实异常。你有理由剔。你也有理由不剔。\n\n**而你是在看过结果之后才决定剔的。**',
            effects: [
              { stats: { method: 1 } },
              { project: { op: 'setField', integrityRisk: 18 } },
              { addFlag: { key: 'integrity_risk', delta: 11, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            condition: { flag: 'preset_cleaning_rules' },
            text: '你翻回自己写在收数据之前的清理规则:3 个标准差以外剔除。\n\n那两个不到 3 个标准差。\n\n你没剔。**规则是你自己在还不知道结果的时候写的,现在它管住了你。**',
            effects: [
              { stats: { method: 6, state: 1 } },
              { project: { op: 'setField', quality: 8 } },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_analyze_which_method', 'analyze', {
    title: '组会上关于方法的争论',
    text: '你讲完分析,师兄说应该用 PROCESS,师姐说 Baron & Kenny 那套早就不用了,另一个人说你应该报贝叶斯因子。\n\n{{advisor}} 看着你,说:"你觉得呢?"',
    contextLines: [
      { text: '屋里五个人,三个说法。' },
      { condition: { flag: 'mastered_adv_stats' }, text: '这三种你都跑过。' },
      { condition: { flag: 'stats_debt' }, text: '你们本科的统计课讲到方差分析就结束了。' },
    ],
    choices: [
      {
        id: 'argue_it',
        text: '讲清楚你为什么选这个',
        visibleIf: { flag: 'mastered_stats' },
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你说:"因为我的假设是中介,而且样本量够做 bootstrap;贝叶斯因子我也算了,放在补充材料。"\n\n屋里安静了一下。{{advisor}} 说:"可以。"\n\n**这一刻的起点是大二期末统计课的那次判定。**',
            effects: [
              { stats: { method: 6, capital: 3 } },
              { project: { op: 'setField', quality: 10 } },
              { setFlag: 'known_for_stats' },
            ],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你讲了理由,师兄接着追问了两层,你答不上第三层。\n\n他没有为难你的意思。你回去把那一层补上了,花了两周。',
            effects: [{ stats: { method: 4, state: -2 } }],
          },
        ],
      },
      {
        id: 'nod_and_google',
        text: '点头,回去挨个试一遍',
        visibleIf: { not: { flag: 'mastered_stats' } },
        outcomes: [
          {
            weight: 1,
            // 不带嘲讽。现实里很多人就是这么过来的,包括发了很多论文的人。
            text: '你回去把三种都跑了一遍,选了结果最好看的那个,然后倒着去找理由。\n\n理由找到了,而且写得很像样。**这条路是通的**——只是你永远不会真的确定自己做对了。',
            effects: [
              { stats: { method: 3 } },
              { project: { op: 'setField', integrityRisk: 10 } },
              { addFlag: { key: 'integrity_risk', delta: 6, min: 0, max: 100 } },
              { addFlag: { key: 'nodded_along', delta: 1, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'ask_for_help',
        text: '承认你不确定,请人一起看',
        outcomes: [
          {
            weight: 1,
            text: '你说"我不确定哪种更合适,能不能一起看看数据"。\n\n师姐留下来陪你跑了一下午。**这一下午你学到的东西,比自己试一个月都多。**',
            effects: [
              { stats: { method: 5, capital: 1 } },
              { project: { op: 'setField', quality: 6 } },
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
              { setFlag: 'asks_when_lost' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 写作 ══════════
  stageEvent('ev_ps_write_discussion', 'write', {
    title: '讨论部分写不动',
    text: '结果写完了。讨论写了三段,删了两段。\n\n问题不在于没话说,在于你不知道这个结果**到底意味着什么**。\n\n光标在第三段末尾闪了四十分钟。',
    contextLines: [
      { text: '「{{project}}」做到第 {{years}} 年,你第一次要回答"所以呢"。' },
      { condition: { flag: 'knows_the_literature' }, text: '你读过 260 篇。现在它们全在你脑子里打架。' },
    ],
    choices: [
      {
        id: 'write_honestly',
        text: '写你真正的判断,包括不确定的部分',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你写了三条局限,而且没有一条是套话。你甚至写了"我们的设计无法区分这两种解释"。\n\n{{advisor}} 把那句删了,说"审稿人会抓住这个"。\n\n你又加回去了。**后来审稿人夸了那一句。**',
            effects: [
              { stats: { method: 6, capital: 1 } },
              { project: { op: 'setField', quality: 14 } },
              { setFlag: 'writes_honest_limitations' },
            ],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你写了真实的判断,{{advisor}} 全改了。改完之后那一节读起来很顺,也很空。\n\n你没有争。',
            effects: [{ stats: { method: 3, state: -4 } }, { project: { op: 'setField', quality: -4 } }],
          },
        ],
      },
      {
        id: 'write_the_story',
        text: '按"故事"写:讲得顺最重要',
        outcomes: [
          {
            weight: 2,
            text: '你把讨论写成了一个干净的故事:假设、证据、意义、未来方向。\n\n它读起来很好。**它也比你真正知道的多说了一点。** 每一篇文章都是这样,而这就是问题所在。',
            effects: [
              { stats: { method: 2, capital: 2 } },
              { project: { op: 'setField', quality: 4, integrityRisk: 8 } },
              { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_write_authorship', 'write', {
    title: '作者位次',
    text: '{{advisor}} 把作者名单发给你看。\n\n你在第二位。第一位是一个你见过三次的博后——他在你收数据的第二年加入,做了数据分析的一部分。\n\n邮件最后一句是:"你还年轻,后面机会多。"',
    contextLines: [
      { text: '「{{project}}」你做了 {{years}} 年。' },
      { condition: { advisor: { archetype: 'boundary' } }, text: '这不是第一次了。' },
      { condition: { flag: 'trait_pleaser' }, text: '你已经在心里想好怎么说"没关系"了。' },
    ],
    choices: [
      {
        id: 'accept',
        text: '接受',
        outcomes: [
          {
            weight: 2,
            text: '你回了"好的老师"。\n\n**这件事你不会跟任何人说**,包括很多年以后。你只是会在别人问起这篇文章的时候,说得比实际情况简略一点。',
            effects: [
              { stats: { capital: 1, state: -6 } },
              { project: { op: 'setField', authorship: 'second' } },
              { setFlag: 'lost_first_authorship' },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你回了"好的老师"。\n\n三个月后 {{advisor}} 主动提起这件事,说下一篇会让你做一作。**他记得。** 有些人是真的会记得。',
            effects: [
              { stats: { capital: 2, state: -3 } },
              { project: { op: 'setField', authorship: 'second' } },
              { advisorFavor: 5 },
            ],
          },
        ],
      },
      {
        id: 'negotiate',
        text: '去谈:提共同一作',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你去了办公室,把自己做的每一部分列了一遍——不是抱怨,是清单。\n\n{{advisor}} 看了两分钟,说:"那共同一作吧。"\n\n**列清单比讲道理有用。** 这一课你会用很多年。',
            effects: [
              { stats: { capital: 3, method: 1, state: 2 } },
              { project: { op: 'setField', authorship: 'co_first' } },
              { setFlag: 'negotiated_authorship' },
            ],
          },
          {
            weight: 2,
            condition: { projectRoll: 'setback' },
            text: '你去谈了。{{advisor}} 说:"作者顺序是我定的,你要相信我的判断。"\n\n然后他补了一句:"你这样对合作不好。"\n\n**这句话的杀伤力比拒绝本身大得多**,而说这句话的人往往并不觉得自己在威胁谁。',
            effects: [
              { stats: { capital: -1, state: -8 } },
              { project: { op: 'setField', authorship: 'second' } },
              { advisorFavor: -10 },
              { setFlag: 'pushed_back_and_lost' },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 投稿(挂在写作站)══════════
  stageEvent('ev_ps_submit_aim', 'write', {
    title: '投哪儿',
    text: '「{{project}}」写完了。现在要决定投哪个刊。\n\n往上一档,大概率 desk reject,但万一呢。往下一档,基本能中,但这篇你做了 {{years}} 年。\n\n{{advisor}} 说:"你自己定。"',
    contextLines: [
      { text: '这是你第一次要自己做这个判断。' },
      { condition: { flag: 'writes_honest_limitations' }, text: '你的讨论那一节写得很实,而这在高档次的刊那里未必是加分项。' },
    ],
    choices: [
      {
        id: 'aim_high',
        text: '冲一冲',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '送外审了。**光是送外审这件事就值得高兴一晚上**——那个刊的 desk reject 率是七成。',
            effects: [{ stats: { capital: 2, state: 3 } }, { project: { op: 'setField', quality: 12 } }],
          },
          {
            weight: 2,
            condition: { projectRoll: 'setback' },
            text: 'desk reject。三天。\n\n编辑的信有四行,其中两行是模板。',
            effects: [
              { stats: { state: -5 } },
              { project: { op: 'setField', quality: -4 } },
              { setFlag: 'got_desk_rejected' },
            ],
          },
        ],
      },
      {
        id: 'aim_safe',
        text: '稳一稳',
        outcomes: [
          {
            weight: 1,
            text: '你投了一个稳的。\n\n**这是一个成年人的决定**,而做完之后你有点说不清的失落——你其实一直想知道那个更高的刊会怎么说。',
            effects: [{ stats: { capital: 1, state: -1 } }, { project: { op: 'setField', quality: -6 } }],
          },
        ],
      },
      {
        id: 'apc',
        text: '投开放获取的,APC 两千八美元',
        outcomes: [
          {
            weight: 1,
            text: '你去问经费。{{advisor}} 说这个刊的版面费报不了,得走另一个项目。\n\n最后是报了,流程走了五个月。**你在这五个月里第一次意识到,发文章是要花钱的。**',
            effects: [
              { stats: { capital: 2, state: -2 } },
              { moneyCost: { rate: 0.15, max: 8000, reason: 'other' } },
              { project: { op: 'setField', quality: 4 } },
            ],
          },
        ],
      },
    ],
  }),

  // ══════════ 审稿 ══════════
  stageEvent('ev_ps_review_reviewer_two', 'review', {
    title: '审稿人 2 号',
    text: '意见回来了。审稿人 1 号两段,基本正面。\n\n审稿人 2 号写了三页半。他要你补一个行为实验,理由是"当前证据不足以支持因果推断"。\n\n他说得对。补那个实验要一年。',
    contextLines: [
      { text: '「{{project}}」已经第 {{years}} 年了。' },
      { condition: { flag: 'reviewer_will_know' }, text: '他还问了那篇 2015 年的重复研究为什么没引。' },
      { condition: { flag: 'trait_perfectionist' }, text: '你读第三遍的时候承认:他提的每一点你自己都想过。' },
    ],
    choices: [
      {
        id: 'do_the_experiment',
        text: '补那个实验',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你花了一年补完,结果支持你的推断。\n\n返修稿送回去,接受了。\n\n**审稿人 2 号让这篇文章变好了,而且你永远不会知道他是谁。**',
            effects: [
              { stats: { method: 7, state: -5 } },
              { project: { op: 'setField', quality: 16 } },
              { setFlag: 'reviewer_two_made_it_better' },
            ],
          },
          {
            weight: 2,
            condition: { projectRoll: 'setback' },
            text: '你花了一年补完,结果**不支持**你的推断。\n\n现在你手上有一篇写好的文章和一个推翻它的实验。',
            effects: [
              { stats: { method: 5, state: -8 } },
              { project: { op: 'regress', stages: 2 } },
              { project: { op: 'setField', quality: -10 } },
              { addFlag: { key: 'burnout', delta: 12, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'argue_back',
        text: '写回复信,论证不需要补',
        outcomes: [
          {
            weight: 2,
            text: '你写了六页回复信,逐条回应。编辑接受了你的论证。\n\n**写回复信是这一行最被低估的一项技能**,而没有人教过你怎么写。',
            effects: [
              { stats: { method: 5, capital: 2, state: -3 } },
              { project: { op: 'setField', quality: 6 } },
            ],
          },
          {
            weight: 2,
            text: '你写了六页回复信。编辑回:"审稿人 2 号坚持原意见。"\n\n拒了。',
            effects: [
              { stats: { state: -6, method: 3 } },
              { project: { op: 'regress' } },
              { setFlag: 'rejected_after_review' },
            ],
          },
        ],
      },
      {
        id: 'withdraw_and_downgrade',
        text: '撤稿,转投低一档的',
        outcomes: [
          {
            weight: 1,
            text: '你撤了,改投下一档。三个月后小修接受。\n\n**这是最理性的决定**,而你在很多年后偶尔还会想:如果当时补了那个实验会怎么样。',
            effects: [
              { stats: { capital: 1, state: -2 } },
              { project: { op: 'setField', quality: -12 } },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_review_major_revision', 'review', {
    title: 'major revision,第十一个月',
    text: '「{{project}}」投出去十一个月了。系统状态一直是 "Under Review"。\n\n你每周点开看一次。第十一个月的某天,状态变成了 "Decision in Process"。\n\n那天你什么都没干成。',
    contextLines: [
      { text: '这十一个月里你开了两个新课题。' },
      { condition: { flagNum: { key: 'burnout', op: '>=', value: 50 } }, text: '你已经不太在乎结果了,而这件事本身让你有点害怕。' },
    ],
    choices: [
      {
        id: 'revise_fast',
        text: '两周内改完返回去',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你两周改完,一个月后接受。\n\n收到接受信那天你没有很高兴。**你在想下一篇。**\n\n这句话你以前在别人那里听过,当时以为是凡尔赛。',
            effects: [
              { stats: { method: 4, capital: 3, state: 2 } },
              { project: { op: 'setField', quality: 8 } },
            ],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你两周改完返回去,第二轮又回来了,还是 major。\n\n又是七个月。',
            effects: [
              { stats: { state: -6 } },
              { project: { op: 'regress' } },
              { addFlag: { key: 'burnout', delta: 10, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'revise_carefully',
        text: '认真改,慢一点没关系',
        outcomes: [
          {
            weight: 2,
            text: '你改了三个月,把两个审稿人提的每一点都做实了,还补了一段稳健性检验。\n\n接受。**而且这一版比你原来那版好得多。**',
            effects: [
              { stats: { method: 6, state: -3 } },
              { project: { op: 'setField', quality: 14 } },
            ],
          },
        ],
      },
    ],
  }),
  stageEvent('ev_ps_review_scooped', 'review', {
    title: '被抢发了',
    text: '你在等审稿意见的时候,刷到一篇刚上线的文章。\n\n同一个问题,同一个方向的结果,样本比你大。他们比你早三个月。\n\n通讯作者是你在会议上见过的一个人。',
    contextLines: [
      { text: '「{{project}}」你做了 {{years}} 年。' },
      // **代词要有先行词。** 原文写的是"不是他。这次不是他。"——那个"他"指的是
      // 跟你同一天进实验室的那个人,但这一幕的正文里从没提过他,玩家接不上。
      // 回响是一行独立的字,它不能指望正文替它交代人物。
      {
        condition: { flag: 'rival_appeared' },
        text: '你先把作者名单从头看到尾:跟你同一天进实验室的那个人不在上面。这次不在。',
      },
    ],
    choices: [
      {
        id: 'reframe',
        text: '改成"独立重复 + 拓展"',
        outcomes: [
          {
            weight: 2,
            condition: { projectRoll: 'ok' },
            text: '你把定位改成"独立样本的直接重复,并加入一个边界条件"。\n\n**在重复性危机之后,这个定位反而变得值钱了。** 编辑接受了这个框架。\n\n2015 年那件事,十年后在这里帮了你一次。',
            effects: [
              { stats: { method: 6, capital: 2 } },
              { project: { op: 'setField', quality: 10 } },
              { setFlag: 'reframed_as_replication' },
            ],
          },
          {
            weight: 1,
            condition: { projectRoll: 'setback' },
            text: '你改了定位,编辑回:"本刊不接受重复研究。"\n\n这句话在 2024 年依然会被写出来。',
            effects: [
              { stats: { state: -6, method: 2 } },
              { project: { op: 'regress' } },
            ],
          },
        ],
      },
      {
        id: 'give_up_this_one',
        text: '算了。把它撤下来',
        outcomes: [
          {
            weight: 1,
            text: '你撤了稿,把「{{project}}」归档。{{years}} 年。\n\n你没有很生气,只是有一种很具体的疲倦——**你知道这件事跟你做得好不好没有关系。**',
            effects: [
              { stats: { state: -7, method: 1 } },
              { project: { op: 'abandon' } },
              { setFlag: 'abandoned_a_project' },
              { setFlag: 'got_scooped' },
            ],
          },
        ],
      },
    ],
  }),
];
