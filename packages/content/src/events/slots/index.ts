import type { GameEvent } from '@psy-sim/core';

const oneOutcome = (text: string, effects: GameEvent['choices'][number]['outcomes'][number]['effects']) => [
  { weight: 1, text, effects },
];

/**
 * 叙事功能位的兄弟候选。每组三幕承担同一个叙事功能，但具体处境不同；
 * 它们不进入普通随机抽取，只有对应的 NarrativeSlot 会挑中其中一幕。
 */
export const narrativeSlotEvents: GameEvent[] = [
  // 大三第一次真实碰壁：设备、协作、手续三种版本。
  {
    id: 'ev_slot_u3_freezer', pools: ['undergrad'], category: 'lab',
    title: '冰箱门没有关严',
    text: '你到实验室时，样本冰箱的温度记录已经红了九个小时。昨晚最后离开的人不是你，但今天负责清点的人是你。',
    trigger: { year: { from: 2017, to: 2017 } },
    choices: [
      { id: 'report', text: '先封存记录，立刻告诉师姐', outcomes: oneOutcome('她看完温度曲线，删掉了两周的数据。你第一次知道“诚实记录”有时就是亲手让工作归零。', [{ stats: { method: 3, state: -2 } }]) },
      { id: 'check', text: '先补做质量检查，再决定能不能用', outcomes: oneOutcome('午后你确认只有一部分样本失效。工作保住了一半，那个上午也把“侥幸”和“核查”分开了。', [{ stats: { method: 2, state: -1 } }]) },
    ],
  },
  {
    id: 'ev_slot_u3_teammate_exit', pools: ['undergrad'], category: 'lab',
    title: '他说不做了',
    text: '正式课题刚开始收数据，与你搭档的同学说要退出实验室。考研、家里的事、还有这份没有学分的工作，他只能放掉一个。',
    trigger: { year: { from: 2017, to: 2017 } },
    choices: [
      { id: 'take_over', text: '把他那一半接过来', outcomes: oneOutcome('课题没有停。你的周五下午从此只剩下被试编号，师姐也开始把你当成真正能交付的人。', [{ stats: { capital: 3, state: -3 } }]) },
      { id: 'rescope', text: '和师姐一起缩小课题', outcomes: oneOutcome('你们砍掉一个条件。问题没有原来漂亮，但第一次按现有的人和时间真正做得完。', [{ stats: { method: 3, capital: -1 } }]) },
    ],
  },
  {
    id: 'ev_slot_u3_consent_gap', pools: ['undergrad'], category: 'lab',
    title: '少了十二张签字页',
    text: '录入到第 48 个被试时，你发现有十二份知情同意书只有编号，没有签字页。数据已经收完，人也联系不上了。',
    trigger: { year: { from: 2017, to: 2017 } },
    choices: [
      { id: 'discard', text: '把十二份数据剔除', outcomes: oneOutcome('样本量从 48 变成 36。图上的误差线立刻变宽，但每一个留下的数字都有来处。', [{ stats: { method: 4, state: -2 } }]) },
      { id: 'recontact', text: '逐个联系补手续', outcomes: oneOutcome('最后补回八份。你花了三天解释一张当初只用三十秒递出去的纸为什么重要。', [{ stats: { clinical: 2, state: -2 } }]) },
    ],
  },

  // 研二低谷：数据、导师、同门三种版本。
  {
    id: 'ev_slot_m2_drive_failure', pools: ['grad'], category: 'research',
    title: '移动硬盘只响了一声',
    text: '装着原始数据和清理日志的移动硬盘接上电脑，只响了一声。你有一份三周前的备份，之后那批被试没有。',
    trigger: { year: { from: 2020, to: 2020 } },
    choices: [
      { id: 'recover', text: '停下其他工作，做只读恢复', outcomes: oneOutcome('目录救回来大半，文件名全乱了。你用两天重新对表，也在当天晚上设好了自动备份。', [{ stats: { method: 3, state: -3 } }]) },
      { id: 'restart', text: '承认丢失，重收那批数据', outcomes: oneOutcome('你给{{advisor}}发了邮件。回复只有一句“那就重来”，但至少从这一刻起，损失不再需要藏着。', [{ stats: { capital: -2, method: 2 } }]) },
    ],
  },
  {
    id: 'ev_slot_m2_advisor_silence', pools: ['grad'], category: 'research',
    title: '三封邮件都没有回复',
    text: '你的分析卡在一个不能靠搜索解决的决定上。给{{advisor}}的三封邮件都没有回复，组会又连续取消了两次。',
    trigger: { year: { from: 2020, to: 2020 } },
    choices: [
      { id: 'ask_peer', text: '带着完整记录去问高年级同门', outcomes: oneOutcome('同门没有替你选，只指出了你漏掉的那条假设。你终于能继续，也欠下了一次认真读稿。', [{ stats: { method: 2, capital: 1 } }]) },
      { id: 'decide', text: '写下理由，自己做决定', outcomes: oneOutcome('你把取舍写进分析日志。它未必是最好的方案，却是第一次由你承担的方案。', [{ stats: { method: 3, state: -1 } }]) },
    ],
  },
  {
    id: 'ev_slot_m2_peer_published', pools: ['grad'], category: 'research',
    title: '同门的文章先出来了',
    text: '与你同年进组的人发来论文链接。题目不是你的方向，时间表却像一面镜子：ta 已经 online，你还在解释为什么分析要重跑。',
    trigger: { year: { from: 2020, to: 2020 } },
    choices: [
      { id: 'read', text: '把文章认真读完，再回一句祝贺', outcomes: oneOutcome('文章有做得很好的地方，也有你不会那样处理的地方。比较没有消失，但终于变得具体。', [{ stats: { method: 2, state: -1 } }]) },
      { id: 'close', text: '先关掉链接，完成今天的重跑', outcomes: oneOutcome('进度条走到 100% 时已经凌晨。你没有因此追上谁，只把自己的工作往前推了一步。', [{ stats: { state: 1, capital: -1 } }]) },
    ],
  },

  // 培养第一年：先学会读文献、听组会、把一个问题讲清楚。
  {
    id: 'ev_slot_g1_literature_map', pools: ['grad'], category: 'research',
    title: '二十七篇文献和一张图',
    text: '入学后的第一个月，{{advisor}}让你把一个方向的文献理清。你下载了二十七篇，标题都懂，放在一起却不知道谁在回答谁。\n\n你第一次发现，**“读过”与“知道这个领域发生了什么”是两件事。**',
    trigger: { always: true },
    contextLines: [
      { text: '文件夹按下载时间排列，而一个领域并不按下载时间生长。' },
      { condition: { flag: 'trait_curious' }, text: '每篇的局限都让你想再开一个标签页。' },
    ],
    choices: [
      { id: 'map', text: '按问题、方法和结论画一张图', outcomes: oneOutcome('图画到第三版，二十七篇终于不再是二十七个文件。你也第一次看见，其中有一块空白不是“没人搜到”，是真的还没人回答。', [{ stats: { method: 4, state: -1 } }, { setFlag: 'grad_mapped_literature' }]) },
      { id: 'summaries', text: '逐篇写摘要，先把数量读够', outcomes: oneOutcome('你写了二十七段工整摘要。组会被问到“所以这些研究彼此什么关系”时，你翻了很久，没有找到那一段。', [{ stats: { method: 2, state: -2 } }]) },
    ],
  },
  {
    id: 'ev_slot_g1_first_report', pools: ['grad'], category: 'research',
    title: '第一次组会报告',
    text: '轮到你做文献报告。前一晚，你把每张幻灯片都塞满了字，因为删掉任何一句都像是在承认自己没有读懂。\n\n台下坐着的人都比你多读了几年。',
    trigger: { always: true },
    contextLines: [
      { text: '投影仪亮起来时，你先看见了自己幻灯片右下角的“1 / 63”。' },
      { condition: { flagNum: { key: 'journal_club_reports', op: '>=', value: 1 } }, text: '你今年把一格精力留给了读文献和练组会，这至少让开头那五分钟稳了下来。' },
    ],
    choices: [
      { id: 'one_question', text: '只讲清一个真正重要的问题', outcomes: oneOutcome('你删到十八页。讲完后有人不同意你的判断，但讨论一直围着那个问题走。**报告不是证明你全懂了，是让一群人能从同一个地方开始争论。**', [{ stats: { capital: 3, method: 2 } }, { setFlag: 'grad_first_report' }]) },
      { id: 'complete', text: '尽量完整，不漏掉任何一篇', outcomes: oneOutcome('你讲了四十七分钟。没人能说你准备不足，散会时也没人记得你最想说的那一页。', [{ stats: { method: 2, state: -2 } }]) },
    ],
  },
  {
    id: 'ev_slot_g1_after_meeting_question', pools: ['grad'], category: 'identity',
    title: '散会后剩下的那个问题',
    text: '组会散了，白板上还留着一个没擦掉的箭头。刚才大家讨论的是别人的研究，你却一直在想：如果把箭头反过来，会怎样？\n\n它可能只是一个幼稚的问题。',
    trigger: { always: true },
    choices: [
      { id: 'ask', text: '追出去问问师姐', outcomes: oneOutcome('师姐说有人做过相近的，但反过来那一下确实没见过。她发来三篇文章。**你第一次带着自己的问题开始读，而不是为了读完开始读。**', [{ stats: { method: 3, capital: 2 } }, { setFlag: 'grad_owned_question' }]) },
      { id: 'note', text: '先记在本子上，不急着暴露', outcomes: oneOutcome('你在页边写下日期。半年后它又出现了一次；这次你已经能把它讲成一个可以研究的问题。', [{ stats: { method: 2, state: 1 } }, { setFlag: 'grad_owned_question' }]) },
    ],
  },

  // 培养第二年：第一次真正碰到“研究可能做不出来”。
  {
    id: 'ev_slot_g2_null_result', pools: ['grad'], category: 'research', tier: 'major',
    title: '图上没有你等的那条线',
    text: '第一个研究的数据终于齐了。脚本跑完，图上两组几乎重合。你检查了三遍，没有报错。\n\n前一年所有阅读、伦理和招募，最后得到的是：**可能没有这个效应。**',
    trigger: { always: true },
    choices: [
      { id: 'audit', text: '先复核设计与检出力，再决定它说明什么', outcomes: oneOutcome('你把“我失败了”拆成几个可以检查的问题。设计有局限，数据也是真的。研究没有按期待成功，训练第一次开始成功。', [{ stats: { method: 5, state: -3 } }, { setFlag: 'grad_survived_first_setback' }]) },
      { id: 'try_more', text: '再换几种分析，也许只是方法不对', outcomes: oneOutcome('第五种分析出现了一个显著交互。你高兴了十分钟，然后发现自己无法解释为什么前四种不算。', [{ stats: { method: 1, state: -2 } }, { addFlag: { key: 'integrity_risk', delta: 7, min: 0, max: 100 } }]) },
    ],
  },
  {
    id: 'ev_slot_g2_second_project_stalls', pools: ['grad'], category: 'identity', tier: 'major',
    title: '第一个往前走，第二个停在原地',
    text: '第一个研究终于有了一个能解释的结果。你以为自己会做研究了。\n\n第二个研究却连预实验都过不了。同一套认真、同一个人，得到完全不同的进度。你开始怀疑，上一次是不是只是运气。',
    trigger: { always: true },
    choices: [
      { id: 'compare_process', text: '比较两个项目的过程，不比较自己的价值', outcomes: oneOutcome('你列出差别：任务成熟度、样本、指导、时间。运气仍在里面，但不再包揽全部解释。**“我行不行”被改写成了几个能处理的问题。**', [{ stats: { method: 4, state: 1 } }, { setFlag: 'grad_survived_first_setback' }]) },
      { id: 'push_both', text: '两个都继续顶，不能证明自己只会做一个', outcomes: oneOutcome('两个文件夹都在更新，你每天都很忙。真正困难的决定被忙碌推迟了。', [{ stats: { capital: 2, state: -5 } }, { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } }]) },
    ],
  },
  {
    id: 'ev_slot_g2_manipulation_failed', pools: ['grad'], category: 'research', tier: 'major',
    title: '预实验里谁都没被操纵',
    text: '你设计的操纵在预实验里完全没有拉开差异。被试认真做了，材料也按计划呈现；只是你以为会改变人的那件事，没有改变他们。\n\n{{advisor}}说：“那就重做。”他说得像在说换一张纸。',
    trigger: { always: true },
    choices: [
      { id: 'interview', text: '先问被试实际经历了什么', outcomes: oneOutcome('五个人给了五种理解。你删掉最漂亮的那段理论说明，重新写了最基本的指令。第二版没有那么聪明，终于能工作。', [{ stats: { clinical: 3, method: 3, state: -2 } }, { setFlag: 'grad_survived_first_setback' }]) },
      { id: 'copy_paradigm', text: '换成文献里更成熟的范式', outcomes: oneOutcome('效应出来了。它不再完全是你原来想问的问题，但至少让项目重新开始移动。', [{ stats: { method: 2, capital: 1, state: -1 } }]) },
    ],
  },

  // 培养第三年：研究第一次被迫变成一篇别人能读的论文。
  {
    id: 'ev_slot_g3_first_intro', pools: ['grad'], category: 'research', tier: 'major',
    title: '第一篇论文，引言第六版',
    text: '结果已经有了。你以为写论文只是把做过的事按顺序写下来，真正开始才发现，引言要求你解释为什么**全世界应该在乎这个问题**。\n\n第六版仍然像一份读书笔记。',
    trigger: { always: true },
    choices: [
      { id: 'argument', text: '每一段只保留一个论点', outcomes: oneOutcome('你删掉十二篇舍不得的引用。篇幅短了，论证第一次出现了方向。**难写不是因为没读够，是因为终于要做判断。**', [{ stats: { method: 4, state: -2 } }, { setFlag: 'grad_first_manuscript' }]) },
      { id: 'more_citations', text: '再补一轮文献，怕自己漏掉关键研究', outcomes: oneOutcome('参考文献从四十八篇变成七十六篇。引言更完整，也更像一间没有出口的仓库。', [{ stats: { method: 2, state: -3 } }]) },
    ],
  },
  {
    id: 'ev_slot_g3_methods_rewrite', pools: ['grad'], category: 'method', tier: 'major',
    title: '“按这个方法，别人能重复吗？”',
    text: '{{advisor}}把方法部分退回来，只批了一句：“按你写的这些，别人能重复吗？”\n\n你当然知道自己做了什么。可当你试着写清每个排除、每次改动和每个版本，才发现很多决定只存在于聊天记录里。',
    trigger: { always: true },
    choices: [
      { id: 'reconstruct', text: '沿时间线重建完整方法记录', outcomes: oneOutcome('你花了一周翻脚本、邮件和旧表格。论文只多了两页，未来的你少欠了一笔很大的账。', [{ stats: { method: 5, state: -3 } }, { setFlag: 'grad_first_manuscript' }]) },
      { id: 'standard', text: '先按同领域论文的标准写法交稿', outcomes: oneOutcome('稿子顺利进入下一轮。那些没有写进去的决定仍然存在，只是暂时没人问。', [{ stats: { capital: 2, method: 1 } }, { addFlag: { key: 'integrity_risk', delta: 4, min: 0, max: 100 } }]) },
    ],
  },
  {
    id: 'ev_slot_g3_blank_discussion', pools: ['grad'], category: 'identity', tier: 'major',
    title: '光标在“讨论”下面闪了一下午',
    text: '方法能照记录写，结果能照输出写。到了讨论，你必须说这个结果意味着什么、又不意味着什么。\n\n你第一次理解：**论文最难写的地方，正是数据不能替你说话的地方。**',
    trigger: { always: true },
    choices: [
      { id: 'limits_first', text: '先写三条你真正相信的局限', outcomes: oneOutcome('局限写出来以后，能说到哪里反而清楚了。那不是把论文写弱，是给结论画出真实边界。', [{ stats: { method: 4, state: 1 } }, { setFlag: 'grad_first_manuscript' }]) },
      { id: 'story_first', text: '先把最顺的故事写出来，再往回收', outcomes: oneOutcome('故事写得很顺。往回收的时候，每一句都舍不得删；你终于知道夸大通常不是一句谎话，而是一连串舍不得。', [{ stats: { capital: 2, state: -2 } }, { addFlag: { key: 'integrity_risk', delta: 3, min: 0, max: 100 } }]) },
    ],
  },

  // 国内博士中段：开题不是“选个题目”，而是把几年压进一个可完成的承诺。
  {
    id: 'ev_slot_phd_proposal_scope', pools: ['grad'], category: 'research', tier: 'major',
    title: '开题报告里有三个研究',
    text: '你把博士开题写成三个相互咬合的研究。逻辑很漂亮，也刚好需要四年，而培养方案留给你的时间没有四年。\n\n预答辩前一晚，你必须决定砍掉哪一块。',
    trigger: { always: true },
    choices: [
      { id: 'core', text: '保留一个核心问题，砍掉最漂亮的延伸', outcomes: oneOutcome('报告少了野心，多了完成的可能。你第一次把“这是我的博士课题”和“这辈子只能做这个”分开。', [{ stats: { method: 4, state: 2 } }, { setFlag: 'phd_proposal_passed' }]) },
      { id: 'keep_all', text: '先全部写进去，后面再根据进度调整', outcomes: oneOutcome('开题通过了。评审说“工作量比较饱满”。这句好话在未来两年里逐渐变成重量。', [{ stats: { capital: 2, state: -4 } }, { addFlag: { key: 'burnout', delta: 6, min: 0, max: 100 } }, { setFlag: 'phd_proposal_passed' }]) },
    ],
  },
  {
    id: 'ev_slot_phd_proposal_committee', pools: ['grad'], category: 'research', tier: 'major',
    title: '开题委员问：“如果第一个研究不成立呢？”',
    text: '你的整套博士计划都从研究一往后推。委员翻到第二页，问：“如果第一步没有结果，后面两个还成立吗？”\n\n你准备了三十七页幻灯片，没有一页回答这个问题。',
    trigger: { always: true },
    choices: [
      { id: 'branch', text: '现场承认风险，补一条独立的备选路径', outcomes: oneOutcome('你没有假装风险不存在。会后重画的路线图不再那么整齐，却不会因为一个零结果整张塌掉。', [{ stats: { method: 5, capital: 1, state: -2 } }, { setFlag: 'phd_proposal_passed' }]) },
      { id: 'defend', text: '论证研究一有充分依据，不会轻易失败', outcomes: oneOutcome('回答听起来很有信心。开题通过了；你也从那天起更难允许研究一失败。', [{ stats: { capital: 3, state: -3 } }, { setFlag: 'phd_proposal_passed' }]) },
    ],
  },
  {
    id: 'ev_slot_phd_proposal_calendar', pools: ['grad'], category: 'identity', tier: 'major',
    title: '毕业日期第一次写进项目表',
    text: '开题秘书让你倒排计划：送审、预答辩、外审、正式答辩，再往前是论文和数据。\n\n你第一次看见“博士毕业”不是远处的名词，而是一串每一项都会推迟下一项的日期。',
    trigger: { always: true },
    choices: [
      { id: 'buffer', text: '给失败和返工各留一段缓冲', outcomes: oneOutcome('表格看起来没有同门的激进。半年后第一次延期发生时，你没有立刻失去毕业窗口。', [{ stats: { method: 3, state: 3 } }, { setFlag: 'phd_proposal_passed' }]) },
      { id: 'tight', text: '按最快情况排，先把节点抢在前面', outcomes: oneOutcome('每一格都刚好接上。它给了你很强的推进感，也让任何一次停顿都开始像犯错。', [{ stats: { capital: 2, state: -3 } }, { setFlag: 'phd_proposal_passed' }]) },
    ],
  },

  // 培养后段：从国内组会走到海外会议与真正的同行交流。
  {
    id: 'ev_slot_grad_conference_talk', pools: ['grad'], category: 'career',
    title: '十二分钟英文报告',
    text: '海外会议给了你十二分钟口头报告。你把逐字稿练到能背，真正站上去时，第二排有人在第三分钟就举手。\n\n主持人说：“Let them finish.”',
    trigger: { always: true },
    choices: [
      { id: 'answer_end', text: '先讲完，最后正面回答那个问题', outcomes: oneOutcome('那个人问得很尖锐，也正好击中边界。你没有假装没听懂。茶歇时他又来找你，介绍了一个正在做相近问题的人。', [{ stats: { capital: 5, method: 2, state: -2 } }, { setFlag: 'grad_international_exchange' }]) },
      { id: 'answer_now', text: '停下来现在回答', outcomes: oneOutcome('时间被打乱，最后两页没讲到。可接下来的讨论第一次不像考试，而像几个人真的在共同处理一个问题。', [{ stats: { capital: 4, state: 1 } }, { setFlag: 'grad_international_exchange' }]) },
    ],
  },
  {
    id: 'ev_slot_grad_conference_poster', pools: ['grad'], category: 'career',
    title: '海报前那段没有准备过的对话',
    text: '你准备了研究背景、方法、结果和局限的英文说法。来的人却指着角落一张小图，问了一个你从没准备过的问题。\n\n你们站在那里聊了二十分钟。',
    trigger: { always: true },
    choices: [
      { id: 'admit', text: '承认没想过，和他一起沿着问题往下推', outcomes: oneOutcome('对话最后没有答案。对方在你的海报上写下邮箱，说如果真做可以交换材料。**交流不是把准备好的东西讲完，是允许问题改变方向。**', [{ stats: { method: 3, capital: 4 } }, { setFlag: 'grad_international_exchange' }]) },
      { id: 'return_results', text: '把话题拉回你最确定的结果', outcomes: oneOutcome('你完整讲完了研究。他礼貌点头离开。海报没有出错，也没有再发生别的事。', [{ stats: { capital: 2, state: 1 } }]) },
    ],
  },
  {
    id: 'ev_slot_grad_conference_dinner', pools: ['grad'], category: 'social',
    title: '会议晚餐没有座位表',
    text: '你端着盘子站在门口。认识的人都已经坐满，剩下几桌的人来自你只在参考文献里见过的机构。\n\n白天的报告有程序，晚餐没有。',
    trigger: { always: true },
    choices: [
      { id: 'sit_unknown', text: '坐到一桌陌生人旁边', outcomes: oneOutcome('前十分钟很尴尬。后来有人问起你的课题，其中一个人正好缺你会的那类分析。合作没有当场发生，但你从此不再只是邮件地址。', [{ stats: { capital: 5, state: -1 } }, { setFlag: 'grad_international_exchange' }]) },
      { id: 'find_peer', text: '找同校的人一起吃', outcomes: oneOutcome('你们终于能用中文复盘一天，确认很多没听懂的地方不是只有自己没懂。第二天再进会场时轻松了一些。', [{ stats: { state: 4, capital: 1 } }]) },
    ],
  },

  // 博士最后一年：从“再做一点”切换到“把已有的东西交出去”。
  {
    id: 'ev_slot_phd_graduation_checklist', pools: ['grad'], category: 'career', tier: 'major',
    title: '毕业要求变成一张逐项打钩的表',
    text: '论文、学分、预答辩、外审、盲审格式、签字页。真正到最后一年，博士毕业首先不是一个学术问题，而是一套任何一项漏掉都会错过窗口的程序。\n\n你把表打印出来贴在墙上。',
    trigger: { always: true },
    choices: [
      { id: 'verify', text: '逐项找负责人确认，不凭“应该可以”', outcomes: oneOutcome('你发现一门学分的系统记录缺失，补回时离截止还有六周。那六周比任何关于细心的道理都有用。', [{ stats: { capital: 3, state: 2 } }, { setFlag: 'phd_graduation_prepared' }]) },
      { id: 'paper_first', text: '先把论文做好，手续最后集中处理', outcomes: oneOutcome('论文多改了一轮。手续也都赶上了，只是最后十天你每天都在不同办公室门口等签字。', [{ stats: { method: 3, state: -4 } }, { setFlag: 'phd_graduation_prepared' }]) },
    ],
  },
  {
    id: 'ev_slot_phd_dissertation_binding', pools: ['grad'], category: 'identity', tier: 'major',
    title: '把几年装订成一本论文',
    text: '三个研究原本有不同的文件夹、不同的合作者，甚至不是完全相同的问题。现在它们必须出现在一本论文里，像是从一开始就知道会走到一起。\n\n你很清楚事实不是这样。',
    trigger: { always: true },
    choices: [
      { id: 'honest_arc', text: '写清问题怎样在失败和结果中改变', outcomes: oneOutcome('总论不再是一条完美直线。它更像真实的研究：前一个答案改变了后一个问题。', [{ stats: { method: 5, state: 1 } }, { setFlag: 'phd_graduation_prepared' }]) },
      { id: 'clean_arc', text: '整理成一条最清楚、最容易答辩的主线', outcomes: oneOutcome('整本论文读起来非常顺。那些没有进入主线的岔路仍在硬盘里，构成了这几年同样真实但不会被装订的部分。', [{ stats: { capital: 3, method: 1 } }, { setFlag: 'phd_graduation_prepared' }]) },
    ],
  },
  {
    id: 'ev_slot_phd_defense_rehearsal', pools: ['grad'], category: 'career', tier: 'major',
    title: '预答辩只讲到第十八页',
    text: '你准备了四十二页。预答辩讲到第十八页，老师打断：“后面的先不用讲。你先告诉我，这篇博士论文最重要的新东西是什么？”\n\n你发现自己准备了所有细节，没有准备这一句。',
    trigger: { always: true },
    choices: [
      { id: 'one_sentence', text: '停下来，用一句话重新回答', outcomes: oneOutcome('那句话不够全面，但终于有了重心。你围着它重排了整场答辩，也第一次能向家里解释这几年到底做了什么。', [{ stats: { capital: 4, method: 2, state: 1 } }, { setFlag: 'phd_graduation_prepared' }]) },
      { id: 'qualify', text: '先说明问题很复杂，需要分三部分回答', outcomes: oneOutcome('你的回答严谨、完整，讲了七分钟。老师说：“我知道这些。我问的是最重要的是什么。”', [{ stats: { method: 2, state: -3 } }, { setFlag: 'phd_graduation_prepared' }]) },
    ],
  },
];

export const gradPacingEventIds = {
  entry: ['ev_slot_g1_literature_map', 'ev_slot_g1_first_report', 'ev_slot_g1_after_meeting_question'],
  setback: ['ev_slot_g2_null_result', 'ev_slot_g2_second_project_stalls', 'ev_slot_g2_manipulation_failed'],
  writing: ['ev_slot_g3_first_intro', 'ev_slot_g3_methods_rewrite', 'ev_slot_g3_blank_discussion'],
  proposal: ['ev_slot_phd_proposal_scope', 'ev_slot_phd_proposal_committee', 'ev_slot_phd_proposal_calendar'],
  conference: ['ev_slot_grad_conference_talk', 'ev_slot_grad_conference_poster', 'ev_slot_grad_conference_dinner'],
  graduation: ['ev_slot_phd_graduation_checklist', 'ev_slot_phd_dissertation_binding', 'ev_slot_phd_defense_rehearsal'],
} as const;
