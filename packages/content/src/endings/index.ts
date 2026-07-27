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
  {
    id: 'end_phd_strong',
    title: '你毕业了,而且手里有东西',
    text: '答辩那天你讲了二十分钟。台下坐着 {{advisor}} 和另外四个老师。\n\n你的论文清单在下面。它比你研一那年敢想的长,也比你博二那年怕的短。\n\n**你现在知道一篇文章要花多少年了**,而这个知识是这几年里最值钱的一样东西——它让你以后再也不会说"这个我一年就能做完"。\n\n接下来是博后,或者不是。那是另一个故事。',
    category: 'final',
    priority: 20,
    condition: {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { paperCount: { op: '>=', value: 3 } },
      ],
    },
    shareCard: { tone: 'triumph', tagline: '你现在知道一篇文章要花多少年了。' },
  },
  {
    id: 'end_phd_clinical_turn',
    title: '博士读完了,但你想做的是另一件事',
    text: '你的注册系统小时数比你的论文数长得多。\n\n这几年你一边做课题一边跟着出门诊,而后者才是你每周真正期待的那两个下午。\n\n答辩过了。**你拿到了一个学位,和一个跟这个学位不完全对应的方向。**\n\n没有人会说这是浪费。只有你自己偶尔会算一下,如果当初直接走临床,现在会在哪。',
    category: 'final',
    priority: 21,
    condition: {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'clinical_hours', op: '>=', value: 60 } },
      ],
    },
    shareCard: { tone: 'warm', tagline: '一个学位,和一个跟它不完全对应的方向。' },
  },
  {
    id: 'end_phd_taught_a_lot',
    title: '你成了一个很会讲课的博士',
    text: '这几年你带了很多次实验课,做过助教、代过课、给本科生开过讲座。\n\n学生评教年年很高。有一年有个大二的学生课后来找你,说她因为你那节课决定读心理学的研究生。\n\n你的论文不多。**在这个体系里,"很会讲课"这件事在简历上几乎写不出来**,而它是你这几年做过的最确定有价值的事。',
    category: 'final',
    priority: 22,
    condition: {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'teaching_load', op: '>=', value: 3 } },
      ],
    },
    shareCard: { tone: 'warm', tagline: '在这个体系里,"很会讲课"几乎写不出来。' },
  },
  {
    id: 'end_phd_side_income',
    title: '你博士期间挣的钱比补助多得多',
    text: '横向、培训、考研网课。这几年你把学术时间换成了现金,汇率还行。\n\n**你比同批任何人都不焦虑钱**,而你手上的文章也比他们少。\n\n答辩过了。你已经在想接下来是继续走这条路,还是把副业变成主业——而这个问题,你其实在第二年就开始想了。',
    category: 'final',
    priority: 23,
    condition: {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'side_gigs', op: '>=', value: 3 } },
      ],
    },
    shareCard: { tone: 'warm', tagline: '你比同批任何人都不焦虑钱。' },
  },
  {
    id: 'end_phd_networked',
    title: '这一行你已经认识很多人了',
    text: '你这几年跑了很多会。海报站过、分会场讲过、也在茶歇的时候硬着头皮跟人搭过话。\n\n毕业的时候,你的通讯录里有三十几个同行,其中五六个是真的会回你邮件的人。\n\n**在这一行,"有人认识你"是一种真实的资产**,而它不出现在任何一份考核表上。\n\n你的文章数一般。但下一步要找人写推荐信、要找合作、要打听哪个组在招人的时候,你不是从零开始的。',
    category: 'final',
    priority: 24,
    condition: {
      all: [
        { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
        { flagNum: { key: 'conferences', op: '>=', value: 3 } },
      ],
    },
    shareCard: { tone: 'warm', tagline: '"有人认识你"是一种不出现在考核表上的资产。' },
  },
  {
    id: 'end_phd_thin',
    title: '你毕业了',
    text: '答辩过了。你拿到了博士学位。\n\n你的论文清单很短。那几个做废的课题在下面——**它们花掉的年数比发出来的那些还多**,而这件事在任何一份简历上都不会出现。\n\n{{advisor}} 说了句"辛苦了"。\n\n这几年不是白过的,只是它的产出不长在能被数出来的地方:你现在能一眼看出一个设计有没有问题,能读懂任何一篇方法部分,知道一个数字要多久才能变成一句话。\n\n**接下来的事,得用别的东西去换了。**',
    category: 'final',
    priority: 29,
    condition: { any: [{ flag: 'path_phd_direct' }, { flag: 'path_phd_after_master' }] },
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
