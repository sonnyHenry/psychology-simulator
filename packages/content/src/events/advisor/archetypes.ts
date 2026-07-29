import type { GameEvent } from '@psy-sim/core';

interface AdvisorScene {
  slug: string;
  title: string;
  text: string;
  choice: string;
  result: string;
}

const ACADEMIC_CAREERS = ['master', 'phd', 'phd_direct', 'overseas_phd', 'postdoc', 'faculty_candidate', 'faculty'];

const scenes: Record<string, AdvisorScene[]> = {
  star: [
    { slug: 'conference_intro', title: '他在茶歇里说了你的名字', text: '{{advisor}}只用一句话把你介绍给那位你读了很多年的学者：“这是我学生，做这个问题的。”', choice: '接住接下来的三分钟', result: '三分钟后你手里多了一个邮箱。那句话本身就是资源。' },
    { slug: 'grant_data', title: '本子里有一批你没见过的数据', text: '重点项目立项后，{{advisor}}说有一批多中心数据可以给你用。你没有参与设计，也没有见过采集现场。', choice: '先把数据字典与权限问清楚', result: '机会没有消失，数据也第一次从“资源”变成有来处的记录。' },
    { slug: 'name_on_email', title: '邮件抄送了他', text: '合作方两周没回信。你把{{advisor}}抄送进去，四十分钟后收到了完整附件和一句“久等”。', choice: '把后续工作做得配得上这封回信', result: '你借来的是名字，最后仍要用自己的工作偿还。' },
    { slug: 'airport_feedback', title: '机场发来的十二条语音', text: '{{advisor}}在转机时听完你的报告，发来十二条语音。每条不到一分钟，正好点中最关键的地方。', choice: '逐条整理成修改清单', result: '他给你的时间很碎，信息却比很多完整会议更密。' },
    { slug: 'letterhead', title: '推荐信上的那一行抬头', text: '你第一次看到{{advisor}}替你写的推荐信。正文不长，抬头和签名让它在委员会里被认真读完。', choice: '把它当作机会，不当作结论', result: '门开得更宽了一点，走进去仍然要靠你自己的材料。' },
  ],
  young_pi: [
    { slug: 'night_revision', title: '晚上十一点的共享文档', text: '{{advisor}}还在线，光标在你的方法部分一行行往下走。批注出现得比你修改得快。', choice: '改完这一轮就停', result: '文档变好了，你也第一次给共同的拼命设了一个下班点。' },
    { slug: 'pilot_again', title: '“再跑一个预实验”', text: '{{advisor}}看完结果说还差一个控制条件。你知道这会多一个月，也知道他说得对。', choice: '把控制条件补上', result: '一个月后，原来的解释果然站不住了。' },
    { slug: 'shared_failure', title: '他先说“是我判断错了”', text: '项目结果完全不支持假设。组会上{{advisor}}先说：“这个方向是我让大家押的，判断错了。”', choice: '把失败拆成下一步', result: '责任没有落到最年轻的人头上，失败才真正变成可以研究的东西。' },
    { slug: 'fourth_year', title: '他的第四年也是你的第二年', text: '{{advisor}}的非升即走考核和你的毕业时钟同时在走。你们都需要这篇文章，但需要的方式不同。', choice: '把时间表摊开谈', result: '压力没有减少，至少不再假装只有一个人的期限。' },
    { slug: 'celebration', title: '接收邮件是凌晨两点转来的', text: '{{advisor}}把接收邮件转到群里，只写了三个感叹号。你知道他那一晚也没有睡。', choice: '第二天再开始下一篇', result: '你们庆祝了一天，没有立刻把成功变成新的进度表。' },
  ],
  hands_off: [
    { slug: 'empty_calendar', title: '一整学期没有固定组会', text: '{{advisor}}说有问题随时找。真正的问题是，没有固定见面的日子，所有问题都要先由你判断值不值得打扰。', choice: '自己建立同门例会', result: '没有导师的组会照样开起来，问题终于不必积到失控才出现。' },
    { slug: 'signature', title: '他签字前没有翻到第二页', text: '{{advisor}}很快在开题表上签了字。你本来准备解释三处风险，他说：“你觉得行就行。”', choice: '请他至少看风险页', result: '他看了，也只改一处。那一处足以说明你坚持开口不是多余。' },
    { slug: 'freedom', title: '你真的可以换问题', text: '做了半年后你想彻底改方向。{{advisor}}说：“可以啊，你自己想清楚。”没有阻拦，也没有替你承担重来。', choice: '写一页取舍再决定', result: '自由没有变轻，但它第一次有了可检查的理由。' },
    { slug: 'retirement_box', title: '办公室门口出现了纸箱', text: '{{advisor}}开始整理书，说退休手续还没完全定。你论文做到一半，他的人生阶段也走到另一站。', choice: '把毕业与交接安排问具体', result: '第一次，含糊的“到时候再说”变成了几项日期。' },
    { slug: 'unexpected_line', title: '他记得你两年前那个问题', text: '一次很久没开的组会上，{{advisor}}突然问起你两年前放下的想法。他记得，而且说那可能比现在这个更重要。', choice: '会后把旧文件重新打开', result: '放养不等于没看见，只是看见从来不按你需要的时间发生。' },
  ],
  clinical: [
    { slug: 'ward_before_paper', title: '先去看这个人，再回来改模型', text: '{{advisor}}没有先看你的路径图，带你去门诊见了一个与样本描述很像的人。', choice: '回来重写变量定义', result: '模型少了一个漂亮箭头，多了一点临床上真正存在的差异。' },
    { slug: 'case_note', title: '她改的是病历里的一个动词', text: '{{advisor}}把“患者拒绝配合”改成“患者暂未同意”。一个动词改变了责任落在哪里。', choice: '把自己的记录也逐份检查', result: '你的文字开始少替别人解释一点，多记录一点。' },
    { slug: 'paper_zero', title: '门诊小时涨得比论文快', text: '这一年你跟{{advisor}}做了很多临床，考核表上的论文栏仍然很薄。两种成长没有共同的计量单位。', choice: '为科研单独留出固定时间', result: '临床没有停，文章第一次不再只靠剩下的时间。' },
    { slug: 'supervision_boundary', title: '“这个案子你先别接”', text: '{{advisor}}听完你的概念化，明确说目前训练还不足以独立承担。你已经和机构说过可以。', choice: '撤回承诺并安排转介', result: '你失去一个小时数，也保住了边界不是一句口号。' },
    { slug: 'conference_split', title: '临床会场和方法会场在两栋楼', text: '{{advisor}}去临床论坛，你的研究报告在方法分会。她说你应该自己去讲，但那意味着第一次没有她坐在台下。', choice: '独自去方法分会', result: '问题比预想更尖锐，你也第一次用自己的名字答完。' },
  ],
  boundary: [
    { slug: 'weekend_car', title: '“周末顺路送我一下”', text: '{{advisor}}说去机场顺路，让你开车送。路程两小时，车是你的，拒绝却不像一件纯私人小事。', choice: '说周末已有安排', result: '他停了一秒，自己叫了车。边界没有被感谢，但被画出来了。' },
    { slug: 'client_dinner', title: '饭局名单里没有学生', text: '{{advisor}}让你陪一个横向项目客户吃饭，说这也是“认识行业”。桌上谈的内容和你的课题几乎无关。', choice: '只参加正式项目讨论', result: '你少认识了几个人，也没有把学生身份扩展成全天候助理。' },
    { slug: 'authorship_sheet', title: '投稿前才看见作者顺序', text: '系统邮件发来时，你发现自己从第二作者变成第三。{{advisor}}说另一位老师“对接资源很多”。', choice: '拿贡献记录要求说明', result: '顺序没有完全改回，贡献声明里第一次写清你做了什么。' },
    { slug: 'private_wechat', title: '消息总在深夜发来', text: '{{advisor}}的任务消息越来越常在凌晨出现，并默认第二天早上有结果。每一条单看都不算过分。', choice: '设定可响应时段', result: '任务没有少很多，但“立刻”不再是默认值。' },
    { slug: 'recommendation_trade', title: '“这个忙你先帮我”', text: '你提到推荐信，{{advisor}}同时把一份项目结项材料推过来。交换没有被明说，所以更难拒绝。', choice: '把两件事分开确认', result: '他有点不耐烦，仍答应了推荐信的明确日期。' },
  ],
  warm: [
    { slug: 'tea_first', title: '她先问你睡得怎么样', text: '{{advisor}}看见你带来的结果，却先把电脑合上，问你最近是不是又没睡。', choice: '说实话，再谈工作', result: '会面少讲了一个模型，你没有因此独自扛完整个星期。' },
    { slug: 'small_grant', title: '经费不够时她把范围缩小', text: '「{{project}}」需要的样本费超过组里余额。{{advisor}}没有让你自己想办法垫，先问能不能把问题做小。', choice: '重做一个付得起的设计', result: '课题没有原来宏大，也没有用学生的钱替平台补洞。' },
    { slug: 'intro_letter', title: '她写了一封很长的引荐信', text: '{{advisor}}的平台有限，却认真把你介绍给外校一个更合适的合作组，逐条写了你能做什么。', choice: '主动联系对方', result: '名字分量不大，信里的具体细节让对方愿意见你。' },
    { slug: 'group_conflict', title: '她让所有人都把话说完', text: '署名争议把组会拖了两个小时。{{advisor}}没有替任何人拍板，要求每个人先复述对方的贡献。', choice: '把自己的底线说具体', result: '关系没有破，作者顺序也不再靠谁更能忍。' },
    { slug: 'ceiling', title: '她说“这部分我教不了你了”', text: '{{advisor}}看完你的新分析，坦白这已经超出她熟悉的范围，并给了两个可以去问的人。', choice: '接下这份诚实', result: '导师的边界没有变成你的天花板，前提是你愿意走出这间办公室。' },
  ],
};

export const advisorArchetypeEvents: GameEvent[] = Object.entries(scenes).flatMap(([archetype, items]) =>
  items.map(scene => ({
    id: `ev_advisor_${archetype}_${scene.slug}`,
    pools: ['grad', 'postdoc', 'tenure'],
    category: 'social',
    once: true,
    // 专属池要足以改变导师构筑的实际体验；普通权重在扩容后的 grad 池里
    // 会让整组内容只存在于静态配额中，无法稳定通过全量可达性扫描。
    // 推荐信是明星导师原型最能被玩家感知的资源兑现点；在五个同权场景里
    // 它常被毕业时钟截掉，因此给这个关键场景更高的抽取优先级。
    weight: scene.slug === 'letterhead' ? 5 : 2,
    trigger: {
      all: [
        { advisor: { archetype } },
        { any: ACADEMIC_CAREERS.map(career => ({ career })) },
      ],
    },
    title: scene.title,
    text: scene.text,
    choices: [{
      id: 'respond',
      text: scene.choice,
      outcomes: [{ weight: 1, text: scene.result, effects: [{ stats: { capital: 2, state: -1 } }] }],
    }],
  })),
) satisfies GameEvent[];

export const advisorArchetypeEventIds = advisorArchetypeEvents.map(event => event.id);
