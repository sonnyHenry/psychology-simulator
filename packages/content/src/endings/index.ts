import type { EndingDef } from '@psy-sim/core';

/**
 * 结局体系(GAME_DESIGN 第十八节)。目标 34–38 个,学术线占 9 个,
 * 终局是"拿到教职"或"拿到长聘"。
 *
 * ## 当前落地范围(M3)
 *
 * - 一个 `early` 结局(**状态 ≤0**)
 * - **学术线的博士毕业结局 6 个**:论文数 / 临床转向 / 教学 / 副业 / 人脉 / 产出很薄。
 *   它们不是同一件事的六个档次,是六种不同的四到八年。
 * - 其余五条路径各一个 2018 年之后的快照(临床线 M4,二级线 M6 取代)
 *
 * `priority` 升序,**首个命中生效**——所以一条路径被铺成真阶段之后,
 * 必须把它原来那个快照结局删掉,否则快照会抢在真结局前面命中。
 * M3 就是这么删掉 `end_m2_phd_direct` 和 `end_m2_master` 的。
 */
export const endings: EndingDef[] = [
  // ── 提前结局:状态 ≤0 ─────────────────────────────────────
  {
    id: 'end_early_withdrew',
    title: '你休学了',
    text: '不是某一件事压垮了你。是连着几个学期,每一件都只重一点。\n\n办休学手续那天出乎意料地简单:三个签字,一张表,辅导员说了句"注意身体"。你走出教务处的时候是下午三点,阳光很好,校园里没什么人。\n\n**你没有失败。** 你只是在一个不允许停下来的系统里停了下来,而这件事需要的勇气比继续走多得多。\n\n休学的人里有人第二年回来了,有人换了专业,有人再也没回来——这三种结局在真实世界里的比例,比任何人愿意承认的都更平均。',
    category: 'early',
    priority: 1,
    condition: { stat: 'state', op: '<=', value: 0 },
    shareCard: { tone: 'bitter', tagline: '在一个不允许停下来的系统里停了下来。' },
  },

  // ── 七条路径的 2018 快照 ─────────────────────────────────
  {
    id: 'end_m2_overseas',
    title: '第一个学期结束了',
    text: '2019 年一月,你在一个下午四点就天黑的地方过完了第一个学期。\n\n你做 TA,带两个 section,每周要批四十份作业。资格考在明年。你的英语在讨论课上永远慢半拍,而你已经学会了在别人说完之后先说 "That\'s a good point"。\n\n你发工资条那天拍了张照发回家。你妈问的是"这是一个月的吗"。\n\n**你说是。然后你在屏幕这边坐了很久。**',
    category: 'final',
    priority: 12,
    condition: { flag: 'path_overseas' },
    shareCard: { tone: 'warm', tagline: '一个下午四点就天黑的地方,第一个学期。' },
  },
  // ── 临床线(M4:六个结局,读的是六种不同的十五年)──────────
  //
  // 与学术线同一套排法:priority 升序、条件从最独特到最普通。
  // 停业(伦理终局)排最前且条件严格;"下周三见"是这条线的兜底,
  // 它不是失败——**还在做,本身就是这一行的一种成就。**
  {
    id: 'end_cl_shutdown',
    title: '停业',
    text: '不是哪一次塌方,是很多次小的让步:收下的礼物、加了的微信、说服自己"不算例外"的那些时刻。它们单独看都不大,叠在一起,压弯了你执业的那根梁。\n\n伦理程序走完之后,你停了下来。咨询室退租那天,你把沙发送给了一个刚入行的年轻人。\n\n**这一行的门槛不在入口,在全程。** 守则你都背得出来——它不是用来背的。\n\n有人问你还回不回来。你说不知道。这次你没有说服自己。',
    category: 'final',
    priority: 30,
    condition: {
      // 5 分:全库能记下的伦理让步总共 6 分——**几乎每一次都让了步才会走到这里**。
      // 4 分时随机 bot 有 8.7% 的临床对局停业,对"条件严格"的伦理终局太松。
      all: [{ flag: 'path_clinical' }, { flagNum: { key: 'ethics_strain', op: '>=', value: 5 } }],
    },
    shareCard: { tone: 'bitter', tagline: '门槛不在入口,在全程。' },
  },
  {
    id: 'end_cl_burnout',
    title: '助人者的耗竭',
    text: '你把最后一个个案转介出去,给等候名单上的每个人写了推荐名单,然后关掉了预约表。\n\n停业一年。这个决定你替很多来访者做过评估,轮到自己时拖了两年。\n\n那一年你睡觉、走路、把咨询室的绿萝搬回家养。第八个月的某天早上,你醒来发现自己在想一个旧个案的隐喻——**不是焦虑地想,是手艺人想起手艺的那种想。**\n\n你知道自己会回来。但这次,按可持续的排法。\n\n接住过很多人的人,也要学会被自己接住。**你教了别人十年的那件事,轮到自己,也要从第一次会谈学起。**',
    category: 'final',
    priority: 31,
    condition: {
      all: [{ flag: 'path_clinical' }, { flagNum: { key: 'burnout', op: '>=', value: 50 } }],
    },
    shareCard: { tone: 'warm', tagline: '接住过很多人的人,也要学会被自己接住。' },
  },
  {
    id: 'end_cl_supervisor',
    title: '你成了那个数数的人',
    text: '注册督导师。这个头衔背后是一张长得吓人的清单:个案小时、督导小时、受训年限、伦理零记录——**这一行唯一的捷径,是从第一天起就不抄近路。**\n\n现在每周有几个新手坐在你对面,讲他们最没底的个案。有人讲到一半自己哭了,你递纸巾,等着,不说话。\n\n某次你听见自己说:"你刚才有几次想给建议?"\n\n对面的年轻人说三次。你说:"我数到五次。"\n\n**你想起了很多年前那个手心出汗的下午。这一行的传承不走文献,走这个。**',
    category: 'final',
    priority: 32,
    condition: {
      all: [
        { flag: 'path_clinical' },
        { flag: 'registered_psychologist' },
        { flag: 'becoming_supervisor' },
      ],
    },
    shareCard: { tone: 'triumph', tagline: '唯一的捷径,是从第一天起就不抄近路。' },
  },
  {
    id: 'end_cl_full_practice',
    title: '排到明年的独立执业',
    text: '你的预约表排到了明年一月。价目表上的数字是你入行时不敢想的,等候名单上的名字比你本科班级的人还多。\n\n你在自己选的沙发对面坐了这么多年。窗台的绿萝换了三盆,纸巾盒永远放在来访者伸手够得到的地方。\n\n同行说你该带团队、开机构、做大。你想过,没动。**你清楚自己的手艺长在哪里:就长在每周那几十个五十分钟里。** 离开那把椅子,你和一个懂点心理学的老板没有区别。\n\n你在考虑要不要涨价。考虑了三年了。',
    category: 'final',
    priority: 33,
    condition: {
      all: [
        { flag: 'path_clinical' },
        { flagNum: { key: 'fee_level', op: '>=', value: 2 } },
        { any: [{ flag: 'own_office' }, { flag: 'independent_practice' }] },
      ],
    },
    shareCard: { tone: 'triumph', tagline: '手艺长在每周那几十个五十分钟里。' },
  },
  {
    id: 'end_cl_trainer',
    title: '不接个案了,教别人接',
    text: '你算过一笔账:你一年能接住的来访者是两位数,但你培训过的心理老师、督导过的新手,他们一年接住的人数你算不清。\n\n所以你把个案降到了每周三个——**留着它们不是为了收入,是为了讲课的时候,你说的每一句都还带着咨询室的体温。**\n\n有学员问你:"老师,你讲的这些,书上怎么都查不到?"\n\n你说:"书上有,写得比我好。你缺的不是那本书,是坐满一千个小时之后再读它一遍。"',
    category: 'final',
    priority: 34,
    condition: {
      all: [{ flag: 'path_clinical' }, { flagNum: { key: 'training_gigs', op: '>=', value: 7 } }],
    },
    shareCard: { tone: 'warm', tagline: '留三个个案,是为了讲课带着体温。' },
  },
  {
    id: 'end_cl_steady',
    title: '下周三见',
    text: '你还在做咨询。\n\n没有开机构,没有成为大 V,注册系统里你的条目和几年前一样朴素。你的收入够生活,你的排期不满也不空,你的腰椎和所有久坐的人一样在抗议。\n\n当年一起入行的人,一半已经不在这一行了。你偶尔也想过走——投诉最疼的那年,耗竭最深的那年。**你没走的原因说出来一点都不壮烈:星期三下午有人在等,你就去了。一去去了十年。**\n\n今天的最后一个来访者站起来,穿外套,说:"那,下周三见。"\n\n你说:"下周三见。"\n\n**这四个字,是这个行业全部的意义所在:下周三,你还在。**',
    category: 'final',
    priority: 39,
    condition: { flag: 'path_clinical' },
    shareCard: { tone: 'warm', tagline: '下周三,你还在。' },
  },
  {
    id: 'end_m2_school',
    title: '阳光小屋',
    text: '2019 年,你是这所中学唯一的心理老师。\n\n办公室在四楼最里面,门口挂着"阳光小屋"。你负责两千一百个学生:每周六节课、咨询室值班、心理健康月、新生普测、危机个案跟进,以及三十四个表格。\n\n你父母很满意。有编制、有寒暑假,亲戚问起来一句话就能说清楚。\n\n上个学期有一个孩子被你筛出来、转去了医院。你至今不知道后续。\n\n**"不知道后续"是这个岗位最常见的结局**,而它比失败更难受。',
    category: 'final',
    priority: 14,
    condition: { flag: 'path_school' },
    shareCard: { tone: 'warm', tagline: '两千一百个学生,心理老师一个。' },
  },
  {
    id: 'end_m2_industry',
    title: '十七楼',
    text: '2019 年,你在十七楼,组名叫"用户研究"。\n\n你的工作是:两周一个项目,访谈八到十二个用户,出一份报告,在评审会上讲十五分钟。你用的技能有三样来自那四年:访谈、问卷、还有看数据时的那点警惕。\n\n年包比读研的同学一年的补助多十倍。你妈终于不用跟亲戚解释你学的是什么。\n\n有一次你在会上说"这个样本量不够,结论不稳",产品经理说"我们只是要个方向"。\n\n**他说得对,而你那一刻很想念一个你曾经很讨厌的东西:显著性检验。**',
    category: 'final',
    priority: 15,
    condition: { flag: 'path_industry' },
    shareCard: { tone: 'warm', tagline: '年包是他们的十倍。而你想念显著性检验。' },
  },
  {
    id: 'end_m2_left',
    title: '你去做了别的',
    text: '2019 年,你在一个和心理学没关系的地方上班。\n\n那四年没有白读。你比同事更会读一份数据、更知道什么时候一个结论站不住、更能听出一个人在会上说的和想说的不是同一件事。这些能力没有名字,也不写在简历上。\n\n有时候有人知道你学过心理学,会说"那你帮我分析分析"。你笑一下,不接。\n\n**你没有背叛什么。** 这一行留下的人和离开的人,谁也不比谁更完整。\n\n只是每年有那么一两次,你会点开一篇论文,读完摘要,然后关掉。',
    category: 'final',
    priority: 16,
    condition: { flag: 'path_leave' },
    shareCard: { tone: 'warm', tagline: '那四年没有白读,只是不在那条路上了。' },
  },

  // ── 学术线:博士毕业(M3 的终点。博后与求职季是 M5)────────
  //
  // 五个结局按 priority 升序排,读的是完全不同的东西:论文数、做废、临床小时、
  // 教学工作量、副业收入。**它们不是同一件事的五个档次**,是五种不同的四到八年。

  // ══════════ M5 学术终局:九个(GAME_DESIGN 九节、十节)══════════
  //
  // **优先级排在博士毕业那批之前**(10–18 < 20–29):走完了求职季和预聘期的人,
  // 他的结局不该还停在"你毕业了"。
  //
  // 这九个里有四个是"没有留在这条路上"的,而**其中两个是好结局**——
  // 9.3 第一条要的就是这个:失败是市场的属性,不是玩家的属性。
  {
    id: 'end_ac_tenured_top',
    title: '你留下来了,在那个最难留下的地方',
    text: '首考通过。\n\n没有仪式,没有掌声。人事处发了一份新合同,行政楼三层,签完字下楼的时候你在想中午吃什么。\n\n六年前搬进这间办公室的那天,箱子堆在门口,你连打印机的驱动都装不上。\n\n**你现在是这栋楼里那个会说"再想想"的人了。**\n\n你带出来的学生里有一个还在读博,有一个去了企业,还有一个偶尔半夜给你发消息问一个统计问题。\n\n那份论文清单在下面。它不长,但每一篇你都还记得是哪一年、卡在哪一站、谁帮过你。',
    category: 'final',
    priority: 10,
    condition: { all: [{ flag: 'tenure_passed' }, { flag: 'offer_from_top_tier' }] },
    shareCard: { tone: 'triumph', tagline: '你现在是那个会说"再想想"的人了。' },
  },
  {
    id: 'end_ac_tenured',
    title: '长聘',
    text: '首考通过。\n\n这六年你没有做出什么惊人的东西。你上了很多课,带了几个学生,写了两次本子,发了几篇结实的文章。\n\n**你把一个位置坐成了自己的位置**,而这件事没有任何一个指标能衡量。\n\n有一年你差点走。那年年底你在办公室里坐到很晚,窗外的楼一层层暗下去。后来你没走,原因说不太清楚,大概是第二天有一节课。',
    category: 'final',
    priority: 14,
    condition: { flag: 'tenure_passed' },
    shareCard: { tone: 'warm', tagline: '你把一个位置坐成了自己的位置。' },
  },
  {
    id: 'end_ac_overseas',
    title: '在另一个国家的一栋楼里',
    text: '你在离家一万公里的地方拿到了 tenure。\n\n开会用另一种语言,吵架也用另一种语言,但梦话还是中文。\n\n**你父母来过一次**,住了三周,走的时候你妈在机场说"这边挺好的"。那句话你后来想了很多年。\n\n每年有那么几天你会算一下:如果当年留在国内,现在会在哪一栋楼里。这个算法没有答案,而你也不是真的想要答案。',
    category: 'final',
    // **排在文理学院之后。** Williams 也是 overseas,所以这条更泛的先命中的话,
    // end_ac_slac 永远到不了——而九节点名 SLAC 是一条被严重低估的好路
    priority: 12,
    condition: { all: [{ flag: 'tenure_passed' }, { flag: 'job_overseas' }] },
    shareCard: { tone: 'warm', tagline: '开会用另一种语言,梦话还是中文。' },
  },
  {
    id: 'end_ac_slac',
    title: '一所很小的学院',
    text: '你去了一所文理学院。一年三门课,班上十二个人,你叫得出每一个人的名字。\n\n**没有人问你今年发了几篇。**\n\n这条路当年在群里几乎没有人提,大家都在盯着 R1 的岗位。而你后来发现,你每周最期待的那两个小时是坐在小教室里的那两个小时。\n\n你手上那份论文清单不长,而且以后也不会很长。有一个学生因为你的课转了专业,这件事你记得比任何一篇文章都清楚。',
    category: 'final',
    priority: 11,
    condition: { all: [{ flag: 'tenure_passed' }, { flag: 'job_slac' }] },
    shareCard: { tone: 'warm', tagline: '你叫得出班上每一个人的名字。' },
  },
  {
    id: 'end_ac_yielded',
    title: '你去了 ta 的城市',
    text: '你手上有一个更好的 offer,在另一个城市。你没有去。\n\n**这件事你从来没有跟 ta 说得很详细**,ta 大概知道,但你们都没有把它摊开讲。\n\n你现在这所学校的平台差一点,启动经费少一半,你的课题往前推得慢。\n\n每年总有那么一两次,你会在深夜里把那封拒信翻出来看一眼。\n\n然后你关掉电脑,回家。家里有人在等。',
    category: 'final',
    priority: 13,
    condition: { flag: 'two_body_player_yields' },
    shareCard: { tone: 'warm', tagline: '你关掉电脑,回家。家里有人在等。' },
  },
  {
    id: 'end_ac_tenure_denied',
    title: '未通过',
    text: '院里的答复是一句很短的话。\n\n你有一年时间收尾。这一年你还要上课,还要带完手上那个学生,还要把实验室的仪器交回去。\n\n**最难的不是那个结果,是这一年里每天还要走进那栋楼。**\n\n后来你去了另一个地方,或者不在这一行了。这一段你很少跟人讲,讲的时候语气很平。\n\n有一件事你没跟人说过:那六年里你有过几个很好的想法,其中一个到现在还没有人做出来。',
    category: 'final',
    priority: 22,
    condition: { flag: 'tenure_denied' },
    shareCard: { tone: 'bitter', tagline: '有一个想法到现在还没有人做出来。' },
  },
  {
    id: 'end_ac_backup',
    title: '你去了另一种地方',
    text: '你没有拿到教职,但你拿到了一份工作。\n\n医院的心理科、企业的用研部门、一家咨询机构——这些地方需要你会的那些东西,而且它们发工资比学校准时。\n\n**头两年你有点不适应**:没有人关心你在想什么问题,只关心你什么时候能出结论。\n\n第三年你带了一个刚毕业的年轻人。ta 问你"要不要读博",你想了很久,给了一个很长的回答。',
    category: 'final',
    priority: 15,
    condition: { flag: 'took_backup_job' },
    shareCard: { tone: 'warm', tagline: '这些地方需要你会的那些东西。' },
  },
  {
    id: 'end_ac_shutout',
    title: '那一年的市场',
    text: '你投了十几份,一个 offer 都没有。\n\n**这不是一句关于你的判断。** 那一年招人的岗位比前一年少了三分之一,而这件事你事先看不出来,事后也没有人会替你解释。\n\n群里那几个月很安静。后来有人转行了,有人再战一年,有人去了博后的第二站。\n\n你现在做的事情跟当年想的不一样。但你还留着那个装满数据的硬盘,而且你知道里面每一个文件夹是什么。',
    category: 'final',
    priority: 23,
    condition: { flag: 'job_market_shutout' },
    shareCard: { tone: 'bitter', tagline: '那一年招人的岗位少了三分之一。' },
  },
  {
    id: 'end_ac_left_after_phd',
    title: '你读完了,然后走了',
    text: '答辩通过那天你就知道自己不会接着走。\n\n**这不是放弃**——你读完了,而读完之后要不要接着走是另一件事,虽然很多人不这么看。\n\n你现在的工作跟心理学有点关系。你用得上统计,用得上实验设计,用得上那种"先问清楚这个问题是什么"的习惯。\n\n有人在饭桌上说"你博士白读了",你笑了笑没接话。\n\n那十年长在你身上了,而它长的地方不在简历上。',
    category: 'final',
    priority: 24,
    condition: { flag: 'path_left_after_phd' },
    shareCard: { tone: 'warm', tagline: '那十年长在你身上了。' },
  },
  {
    id: 'end_phd_strong',
    title: '你毕业了,而且手里有东西',
    text: '答辩那天你讲了二十分钟。台下坐着 {{advisor}} 和另外四个老师。\n\n你的论文清单在下面。它比你研一那年敢想的长,也比你博二那年怕的短。\n\n**你现在知道一篇文章要花多少年了**,而这个知识是这几年里最值钱的一样东西——它让你以后再也不会说"这个我一年就能做完"。\n\n接下来是博后,或者不是。那是另一个故事。',
    category: 'final',
    priority: 20,
    condition: { all: [{ any: [{ flag: 'path_left_after_phd' }, { flag: 'tenure_denied' }] }, {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { paperCount: { op: '>=', value: 3 } },
      ],
    }] },
    shareCard: { tone: 'triumph', tagline: '你现在知道一篇文章要花多少年了。' },
  },
  {
    id: 'end_phd_clinical_turn',
    title: '博士读完了,但你想做的是另一件事',
    text: '你的注册系统小时数比你的论文数长得多。\n\n这几年你一边做课题一边跟着出门诊,而后者才是你每周真正期待的那两个下午。\n\n答辩过了。**你拿到了一个学位,和一个跟这个学位不完全对应的方向。**\n\n没有人会说这是浪费。只有你自己偶尔会算一下,如果当初直接走临床,现在会在哪。',
    category: 'final',
    priority: 16,
    condition: { all: [{ any: [{ flag: 'job_market_shutout' }, { flag: 'path_left_after_phd' }, { flag: 'tenure_denied' }] }, {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'clinical_hours', op: '>=', value: 60 } },
      ],
    }] },
    shareCard: { tone: 'warm', tagline: '一个学位,和一个跟它不完全对应的方向。' },
  },
  {
    id: 'end_phd_taught_a_lot',
    title: '你成了一个很会讲课的博士',
    text: '这几年你带了很多次实验课,做过助教、代过课、给本科生开过讲座。\n\n学生评教年年很高。有一年有个大二的学生课后来找你,说她因为你那节课决定读心理学的研究生。\n\n你的论文不多。**在这个体系里,"很会讲课"这件事在简历上几乎写不出来**,而它是你这几年做过的最确定有价值的事。',
    category: 'final',
    priority: 17,
    condition: { all: [{ any: [{ flag: 'job_market_shutout' }, { flag: 'path_left_after_phd' }, { flag: 'tenure_denied' }] }, {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'teaching_load', op: '>=', value: 3 } },
      ],
    }] },
    shareCard: { tone: 'warm', tagline: '在这个体系里,"很会讲课"几乎写不出来。' },
  },
  {
    id: 'end_phd_side_income',
    title: '你博士期间挣的钱比补助多得多',
    text: '横向、培训、考研网课。这几年你把学术时间换成了现金,汇率还行。\n\n**你比同批任何人都不焦虑钱**,而你手上的文章也比他们少。\n\n答辩过了。你已经在想接下来是继续走这条路,还是把副业变成主业——而这个问题,你其实在第二年就开始想了。',
    category: 'final',
    priority: 18,
    condition: { all: [{ any: [{ flag: 'job_market_shutout' }, { flag: 'path_left_after_phd' }, { flag: 'tenure_denied' }] }, {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'side_gigs', op: '>=', value: 3 } },
      ],
    }] },
    shareCard: { tone: 'warm', tagline: '你比同批任何人都不焦虑钱。' },
  },
  {
    id: 'end_phd_networked',
    title: '这一行你已经认识很多人了',
    text: '你这几年跑了很多会。海报站过、分会场讲过、也在茶歇的时候硬着头皮跟人搭过话。\n\n毕业的时候,你的通讯录里有三十几个同行,其中五六个是真的会回你邮件的人。\n\n**在这一行,"有人认识你"是一种真实的资产**,而它不出现在任何一份考核表上。\n\n你的文章数一般。但下一步要找人写推荐信、要找合作、要打听哪个组在招人的时候,你不是从零开始的。',
    category: 'final',
    priority: 19,
    condition: { all: [{ any: [{ flag: 'job_market_shutout' }, { flag: 'path_left_after_phd' }, { flag: 'tenure_denied' }] }, {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'conferences', op: '>=', value: 3 } },
      ],
    }] },
    shareCard: { tone: 'warm', tagline: '"有人认识你"是一种不出现在考核表上的资产。' },
  },
  {
    id: 'end_phd_thin',
    title: '你毕业了',
    text: '答辩过了。你拿到了博士学位。\n\n你的论文清单很短。那几个做废的课题在下面——**它们花掉的年数比发出来的那些还多**,而这件事在任何一份简历上都不会出现。\n\n{{advisor}} 说了句"辛苦了"。\n\n这几年不是白过的,只是它的产出不长在能被数出来的地方:你现在能一眼看出一个设计有没有问题,能读懂任何一篇方法部分,知道一个数字要多久才能变成一句话。\n\n**接下来的事,得用别的东西去换了。**',
    category: 'final',
    priority: 21,
    condition: { all: [{ any: [{ flag: 'job_market_shutout' }, { flag: 'path_left_after_phd' }, { flag: 'tenure_denied' }] }, { not: { flag: 'job_market_shutout' } }, { paperCount: { op: '<=', value: 1 } }] },
    shareCard: { tone: 'bitter', tagline: '产出不长在能被数出来的地方。' },
  },
  {
    id: 'end_m2_fallback',
    title: '2018 年夏天',
    text: '你拿到了一张心理学学士学位证书。它证明你上过那些课,不证明你想清楚了要去哪。\n\n有人在准备复试,有人已经签了三方,有人还在犹豫要不要考编。这个夏天之后,你们就再不是同一批人了。',
    category: 'final',
    priority: 999,
    condition: { always: true },
    shareCard: { tone: 'warm', tagline: '心理学学士,2018 届。' },
  },
];
