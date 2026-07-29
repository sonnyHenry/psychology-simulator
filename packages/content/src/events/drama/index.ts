import type { GameEvent } from '@psy-sim/core';

const CAREER_POOLS = [
  'grad', 'postdoc', 'tenure', 'clinical_grad', 'clinical_practice', 'clinical_late', 'clinical_common',
  'hospital_grad', 'hospital_practice', 'hospital_late', 'hospital_common',
  'school', 'school_late', 'industry', 'industry_late', 'left', 'left_late', 'left_academia',
];

/**
 * 三幕公共抉择保证每局有一条 drama 骨架；学术八幕、临床两幕与已有四幕再形成路线差异。
 * 所有 drama 选项都显式含正负数值，validate 规则 20 会拒绝“正确答案”。
 */
export const dramaEvents: GameEvent[] = [
  // ── 每局公共三幕 ────────────────────────────────────────
  {
    id: 'ev_drama_group_credit', pools: ['undergrad'], category: 'drama', mandatory: true, eventSlotCost: 0,
    title: '名单上的第三个人',
    text: '实验课小组报告做完了。一个几乎没出现的组员说，奖学金评定需要这门课的项目经历，希望名字保留在前三。\n\n他确实没做多少。你也知道，他这学期一直在医院陪家人。',
    trigger: { year: { from: 2016, to: 2016 } },
    choices: [
      { id: 'keep', text: '把他留在前三', outcomes: [{ weight: 1, text: '名单没改。真正做事的同学没有当场说什么，下一次分组时没有再找你。**你替一个人留了余地，也让另一个人的劳动变轻了。**', effects: [{ stats: { clinical: 2, capital: -2 } }, { setFlag: 'drama_kept_credit' }] }] },
      { id: 'rank_work', text: '按实际工作量排序', outcomes: [{ weight: 1, text: '你把他移到最后。他说理解，后来奖学金差了这一项。**规则变得公平，具体的人承担了公平的全部代价。**', effects: [{ stats: { method: 2, state: -2 } }, { setFlag: 'drama_ranked_credit' }] }] },
    ],
  },
  {
    id: 'ev_drama_absence_reason', pools: ['undergrad'], category: 'drama', mandatory: true, eventSlotCost: 0,
    title: '“你知道他为什么没来吗”',
    text: '同学在咨询中心做完一次紧急会谈，错过了必点名的课。老师问你知不知道原因。\n\n同学只对你说过一句：“别告诉别人。”老师说没有正当理由就记旷课。',
    trigger: { year: { from: 2018, to: 2018 } },
    choices: [
      { id: 'protect', text: '只说“有私事”，不透露更多', outcomes: [{ weight: 1, text: '旷课记上了。你守住了他交给你的边界，也没能替他挡住制度。**后来他没有怪你，反而让这件事更难受。**', effects: [{ stats: { clinical: 3, capital: -2 } }, { setFlag: 'drama_protected_secret' }] }] },
      { id: 'hint', text: '暗示是健康原因，请老师通融', outcomes: [{ weight: 1, text: '老师删了旷课记录。第二天同学问：“你跟他说了什么？”你说没讲细节。**你帮到了他，也替他决定了边界可以退到哪里。**', effects: [{ stats: { capital: 2, clinical: -2 } }, { setFlag: 'drama_hint_secret' }] }] },
    ],
  },
  {
    id: 'ev_drama_cover_colleague', pools: CAREER_POOLS, category: 'drama', mandatory: true, eventSlotCost: 0,
    title: '替他顶两个月',
    text: '同事家里出了事，问你能不能替他顶两个月：课、门诊、项目或值班。\n\n你知道他不是偷懒。你也知道自己的日历已经没有空白。',
    trigger: { year: { from: 2025, to: 2026 } },
    choices: [
      { id: 'cover', text: '接下来', outcomes: [{ weight: 1, text: '事情都做完了，同事回来时认真向你道谢。**没有一项工作记得是你额外做的，只有你的身体记得。**', effects: [{ stats: { capital: 3, state: -4 } }, { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } }] }] },
      { id: 'decline', text: '说清楚自己接不动', outcomes: [{ weight: 1, text: '他点头说理解，最后把事情拆给了三个人。关系没有破裂，只是以后你需要别人接住时，**你不确定他会不会想起今天。**', effects: [{ stats: { state: 3, capital: -2 } }, { setFlag: 'drama_declined_cover' }] }] },
    ],
  },

  // ── 学术线八幕 ──────────────────────────────────────────
  {
    id: 'ev_drama_ac_first_author', pools: ['grad'], category: 'drama', mandatory: true, eventSlotCost: 0, tier: 'major',
    title: '一作',
    text: '导师说，要把你做了两年的课题一作给刚来的博士生：“他快毕业了，差这一篇。你还年轻，下一篇还是你的。”\n\n那个博士生确实快到期限了，也补完了最后一轮分析。',
    trigger: { all: [{ paperCount: { op: '>=', value: 1 } }, { year: { from: 2020, to: 2023 } }] },
    choices: [
      { id: 'fight', text: '拿着贡献记录去争', outcomes: [{ weight: 1, text: '一作保住了。之后三年，组里每次需要帮忙，消息都绕过你。**署名写清了贡献，关系也写清了。**', effects: [{ stats: { capital: -4, method: 3 } }, { setFlag: 'drama_fought_authorship' }, { schedule: { eventId: 'ev_drama_authorship_return', afterRounds: 2 } }] }] },
      { id: 'cofirst', text: '接受共同一作，但要求贡献声明写明', outcomes: [{ weight: 1, text: '名字旁边多了同一个星号，贡献声明写得很具体。招聘委员会会不会细看，你不知道。**你保住了关系，也接受了一个永远解释不清的折中。**', effects: [{ stats: { capital: 2, state: -2 } }, { setFlag: 'drama_shared_authorship' }] }] },
      { id: 'yield', text: '让出去，换导师承诺下一篇', outcomes: [{ weight: 1, text: '他毕业了，临走请你吃饭，说欠你一次。导师也记得这个人情——至少当时记得。**你用一篇已经存在的文章，换了一篇还不存在的。**', effects: [{ stats: { capital: 4, state: -4 } }, { favor: { op: 'add', who: 'peer_generic', direction: 'owed', weight: 3, reason: '你把已经完成的一作让给了快到期限的同门' } }, { setFlag: 'drama_yielded_authorship' }] }] },
    ],
  },
  {
    id: 'ev_drama_ac_scooped', pools: ['grad', 'postdoc'], category: 'drama', mandatory: true, eventSlotCost: 0,
    title: '先发出来的人',
    text: '你的稿子在审。今天，一篇问题、范式甚至图表顺序都很像的文章 online first。审稿人名单不可见，但你记得大会上那个组问过你的全部细节。',
    trigger: { all: [{ paperCount: { op: '>=', value: 1 } }, { year: { from: 2024, to: 2026 } }] },
    choices: [
      { id: 'revise_fast', text: '连夜重写，强调差异，尽快转投', outcomes: [{ weight: 1, text: '稿子两周后投出。你删掉了最野心勃勃的部分，换来时间。**它最终发表了，也永远像那篇文章的补充。**', effects: [{ stats: { method: 3, state: -4 } }, { setFlag: 'drama_scooped_revised' }] }] },
      { id: 'contact_editor', text: '把时间线和会议记录交给编辑', outcomes: [{ weight: 1, text: '编辑回复无法据此判断审稿泄密，但允许你撤稿。你把怀疑写进一封不会公开的邮件。**程序没有证实你，也没有说你错。**', effects: [{ stats: { capital: -3, state: 2 } }, { setFlag: 'drama_scooped_reported' }] }] },
    ],
  },
  {
    id: 'ev_drama_ac_review_competitor', pools: ['grad', 'postdoc', 'tenure'], category: 'drama',
    title: '审稿邀请',
    text: '编辑发来一篇匿名稿。读到第二页你就认出来了：这是与你直接竞争的那个团队。稿子有一个真实缺陷；指出它会让对方至少多做半年。',
    trigger: { year: { from: 2024 } },
    choices: [
      { id: 'strict', text: '按你希望别人审自己的标准，要求补实验', outcomes: [{ weight: 1, text: '意见专业而严格。半年后文章重投，实验补得很好。**你让领域多了一篇更扎实的文章，也给竞争者指出了怎样把它做扎实。**', effects: [{ stats: { method: 3, capital: -2 } }] }] },
      { id: 'decline', text: '向编辑说明利益冲突，拒审', outcomes: [{ weight: 1, text: '编辑两小时后说谢谢。你失去了一次提前看见对手牌面的机会，保住了不用猜自己是否公允的位置。', effects: [{ stats: { state: 2, method: -1 } }] }] },
    ],
  },
  {
    id: 'ev_drama_ac_labmate_data', pools: ['grad', 'postdoc'], category: 'drama',
    title: '那一列不该那么整齐',
    text: '同门让你帮忙看数据。你发现一列反应时整齐得不自然，十几个被试的小数位模式完全相同。可能是复制错误，也可能不是。',
    trigger: { year: { from: 2021 } },
    choices: [
      { id: 'ask_labmate', text: '先只找本人核对', outcomes: [{ weight: 1, text: '他说是合并脚本的问题，第二天给了新文件。异常消失了。**你没有证据证明别的，也没有证据证明这就是全部。**', effects: [{ stats: { clinical: 2, method: -1 } }, { setFlag: 'drama_data_private' }] }] },
      { id: 'tell_pi', text: '把原文件和疑点一起交给导师', outcomes: [{ weight: 1, text: '组里做了内部核查，论文停了。同门后来转组。接下来三年，微信群里没人 @ 你。**你做的事有程序上的名字，代价没有。**', effects: [{ stats: { method: 4, capital: -5 } }, { setFlag: 'drama_data_reported' }] }] },
    ],
  },
  {
    id: 'ev_drama_ac_advisor_paper', pools: ['grad', 'postdoc'], category: 'drama',
    title: '导师 2013 年那篇',
    text: '你复现导师 2013 年那篇奠基论文的分析，发现一个编码方向写反了。改正后，最有名的结果不再显著。你的新课题正在用它当地基。',
    trigger: { all: [{ advisor: {} }, { year: { from: 2022 } }] },
    choices: [
      { id: 'show_advisor', text: '带着脚本去找导师', outcomes: [{ weight: 1, text: '导师看了很久，说“先别在组会上讲”。一周后又约你重跑。**他没有否认错误，也没有准备好让错误立刻属于所有人。**', effects: [{ stats: { method: 4, state: -3 } }, { setFlag: 'drama_advisor_error_opened' }] }] },
      { id: 'change_project', text: '悄悄换掉自己课题的地基', outcomes: [{ weight: 1, text: '你的课题绕开了那条结果，代价是前半年几乎重来。旧论文继续被引用。**你保护了自己的工作，没有替领域处理那篇旧文。**', effects: [{ stats: { method: 2, capital: -2 } }, { setFlag: 'drama_advisor_error_avoided' }] }] },
    ],
  },
  {
    id: 'ev_drama_ac_advisor_move', pools: ['grad'], category: 'drama',
    title: '导师要走了',
    text: '{{advisor}}拿到另一所学校的职位，问你要不要一起走。跟走要重办学籍、课题重来；留下来，实验室会被拆分给两个你不熟的老师。',
    trigger: { all: [{ advisor: {} }, { year: { from: 2021, to: 2024 } }] },
    choices: [
      { id: 'follow', text: '跟着走', outcomes: [{ weight: 1, text: '你重新签材料、搬数据、向新伦理委员会解释旧项目。导师还在，毕业时钟多走了一圈。', effects: [{ stats: { capital: 3, state: -4 } }, { extendPhase: { rounds: 1 } }, { setFlag: 'drama_followed_advisor' }] }] },
      { id: 'stay', text: '留下，保住学籍和课题', outcomes: [{ weight: 1, text: '课题没有重来。此后一年，你的邮件平均九天收到回复。**你保住了时间，失去了原来替这段时间赋形的人。**', effects: [{ stats: { method: 2, capital: -3 } }, { setFlag: 'drama_stayed_without_advisor' }] }] },
    ],
  },
  {
    id: 'ev_drama_ac_project_to_junior', pools: ['grad', 'postdoc', 'tenure'], category: 'drama',
    title: '“你先带带他”',
    text: '导师把一个新来的师弟加进你的课题：“你先带带他，后面让他接一部分。”那部分正是最可能出结果的分析。师弟很认真，也确实需要一个能毕业的题。',
    trigger: { year: { from: 2022 } },
    choices: [
      { id: 'define_piece', text: '把边界和署名现在就写清', outcomes: [{ weight: 1, text: '你发了一封贡献说明。师弟照着做，关系一直客气。**没人抢走东西，也没人再把这个课题当成共同的。**', effects: [{ stats: { method: 3, capital: -2 } }] }] },
      { id: 'mentor', text: '真的把他带进来，共享最好的一部分', outcomes: [{ weight: 1, text: '他做出了一个你没想到的分析。文章更好，署名更挤。**你失去了一部分“我的”，得到了一篇不再只属于你的好工作。**', effects: [{ stats: { capital: 3, state: -2 } }] }] },
    ],
  },
  {
    id: 'ev_drama_ac_cofirst', pools: ['grad', 'postdoc', 'tenure'], category: 'drama',
    title: '共同一作',
    text: '合作者要求把你的一作改成共同一作。他后来补的样本救了这篇文章，但问题、设计和前两年数据都是你的。理由听起来并不荒唐。',
    trigger: { all: [{ paperCount: { op: '>=', value: 1 } }, { year: { from: 2023 } }] },
    choices: [
      { id: 'agree', text: '同意共同一作', outcomes: [{ weight: 1, text: '文章顺利收尾。申请表里只能填“第一作者：是/否”的地方，你每次都会停一下。', effects: [{ stats: { capital: 3, state: -2 } }] }] },
      { id: 'keep_first', text: '保留一作，给他通讯作者', outcomes: [{ weight: 1, text: '他接受了，但下一个合作没有再找你。你的排序保住了，合作网络少了一条边。', effects: [{ stats: { method: 2, capital: -3 } }] }] },
    ],
  },

  // ── 临床新增两幕（加上已有四幕 = v1 六幕）────────────────
  {
    id: 'ev_drama_cl_family_records', pools: ['clinical_practice', 'clinical_late'], category: 'drama', mandatory: true, eventSlotCost: 0,
    title: '家属在哭',
    text: '来访者的家属在前台拦住你，哭着问：“他到底跟你说了什么？我们是家人，为什么什么都不能知道？”\n\n来访者明确要求保密。家属的害怕也不是表演。',
    trigger: { year: { from: 2024, to: 2026 } },
    choices: [
      { id: 'hold', text: '不透露内容，只解释保密边界和风险流程', outcomes: [{ weight: 1, text: '家属说你冷血。下一次会谈，来访者说谢谢你没有说。**关系被保护了，家门外的恐惧没有被处理。**', effects: [{ stats: { clinical: 4, capital: -3 } }] }] },
      { id: 'invite', text: '征得来访者同意后，安排一次家庭会谈', outcomes: [{ weight: 1, text: '来访者同意了，但进入房间后几乎没说话。家属终于听见一些东西。**你打开了一条沟通路径，也改变了原本只属于两个人的空间。**', effects: [{ stats: { capital: 3, state: -2 } }] }] },
    ],
  },
  {
    id: 'ev_drama_cl_gift', pools: ['clinical_practice', 'clinical_late'], category: 'drama', mandatory: true, eventSlotCost: 0,
    title: '“你不收，我以后不来了”',
    text: '来访者带来一件价值不小的礼物，说这是家里做的，拒绝就是看不起。你解释设置，他把礼物推回来：“你不收，我以后不来了。”',
    trigger: { year: { from: 2028, to: 2030 } },
    choices: [
      { id: 'decline', text: '仍然拒绝，把“为什么必须收”带进会谈', outcomes: [{ weight: 1, text: '那次会谈很僵。后来他谈起家里从不允许拒绝礼物背后的东西。**边界保住了，关系先承受了边界。**', effects: [{ stats: { clinical: 4, state: -3 } }] }] },
      { id: 'accept_record', text: '收下，登记并在督导中讨论', outcomes: [{ weight: 1, text: '他留下来了。你把礼物和处理过程写进记录。**例外被透明地处理了；它仍然是一个例外。**', effects: [{ stats: { capital: 2, clinical: -2 } }, { setFlag: 'accepted_client_gift' }] }] },
    ],
  },
];

export const dramaConsequences: GameEvent[] = [
  {
    id: 'ev_drama_authorship_return', pools: [], category: 'consequence', once: true,
    title: '三年后的一封邮件',
    text: '当年和你争一作的那个人发来邮件。他所在的组有一个与你完全匹配的岗位，问你要不要投。\n\n邮件最后写：“工作归工作。我一直觉得你当年应该争。”',
    choices: [
      { id: 'apply', text: '投', outcomes: [{ weight: 1, text: '你投了。关系没有被修复成友情，但它也没有被永远定格在那次争执里。', effects: [{ stats: { capital: 3 } }] }] },
      { id: 'pass', text: '不投', outcomes: [{ weight: 1, text: '你回了谢谢。不是每一笔旧账都要靠下一次合作结清。', effects: [{ stats: { state: 2 } }] }] },
    ],
  },
];
