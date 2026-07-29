import type { Condition, Effect, GameEvent } from '@psy-sim/core';

/**
 * M6 二级线。它们的精度刻意低于学术/临床两条一级线:
 * 没有新的跨年对象,只用阶段、事件、收入与结局把处境写准(P6)。
 * 医院线稍细,因为它与临床共享评估、危机和督导语境。
 */

interface TrackChoice {
  id: string;
  text: string;
  result: string;
  effects: Effect[];
  weight?: number;
}

function trackEvent(args: {
  id: string;
  pools: string[];
  career: string;
  title: string;
  text: string;
  choices: TrackChoice[];
  year?: { from?: number; to?: number };
  category?: string;
  tier?: 'major';
  weight?: number;
}): GameEvent {
  const trigger: Condition = args.year
    ? { all: [{ career: args.career }, { year: args.year }] }
    : { career: args.career };
  return {
    id: args.id,
    pools: args.pools,
    title: args.title,
    text: args.text,
    trigger,
    category: args.category ?? 'work',
    tier: args.tier,
    weight: args.weight,
    once: true,
    choices: args.choices.map(choice => ({
      id: choice.id,
      text: choice.text,
      outcomes: [{
        weight: choice.weight ?? 1,
        text: choice.result,
        effects: choice.effects,
      }],
    })),
  };
}

const HOSPITAL = ['hospital_common'];
const HOSPITAL_PRACTICE = ['hospital_practice'];
const HOSPITAL_LATE = ['hospital_late'];

export const hospitalEvents: GameEvent[] = [
  trackEvent({
    id: 'ev_h_grad_first_record', pools: ['hospital_grad'], career: 'hospital', year: { to: 2019 }, weight: 6,
    title: '第一份评估记录',
    text: '带教老师把一份 WAIS-IV 记录交给你。数字、行为观察、家属叙述,最后要落成一句能进病历的话。\n\n**量表给的是分数,病历要写的是这个人。**',
    choices: [
      { id: 'rewrite', text: '把行为观察重写一遍', result: '你删掉了三句像教科书的套话,补上受测者在哪几道题上停了很久。\n\n带教老师只改了一个词。那一个词你后来用了很多年。', effects: [{ stats: { clinical: 4, method: 1 } }, { setFlag: 'hospital_assessment_rigorous' }] },
      { id: 'template', text: '先按科里的模板交', result: '格式一项没错。老师说可以。\n\n你知道“可以”和“看见了这个人”之间还差一段路。', effects: [{ stats: { clinical: 2, capital: 1 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_2020_hotline', pools: ['hospital_grad'], career: 'hospital', year: { from: 2020, to: 2020 },
    title: '热线那一年', tier: 'major',
    text: '2020 年。见习停了,医院把你们拉进心理援助热线。来电排成一列,而你坐在宿舍里,手边只有一张流程纸。\n\n**这一年心理服务第一次被所有人看见,也第一次暴露出它有多不够。**',
    choices: [
      { id: 'take_shifts', text: '把能接的班都接了', result: '你学会了在很短的时间里判断什么该听、什么必须转。\n\n代价是每次摘下耳机,房间里都安静得过分。', effects: [{ stats: { clinical: 5, state: -5 } }, { setFlag: 'hospital_hotline_2020' }] },
      { id: 'keep_limit', text: '按训练边界接班,不逞强', result: '你没有把“需要人”误解成“必须是我”。\n\n这个边界让你在后来的危机轮值里多撑了很多年。', effects: [{ stats: { clinical: 3, state: 1 } }, { setFlag: 'hospital_kept_capacity' }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_no_prescription', pools: HOSPITAL, career: 'hospital', year: { to: 2023 },
    title: '那张你不能开的单子',
    text: '一位家属听完你的解释,把门诊卡往前一推:“那你给他开点药吧。”\n\n隔壁诊室的精神科医生能开。你不能。你能做评估和心理治疗,但你的工牌不会因为你解释得更清楚就改变。',
    choices: [
      { id: 'explain', text: '把边界和转诊流程讲清楚', result: '家属还是有点失望,但拿着你写的转诊建议去了隔壁。\n\n**边界不是少做一点,是让该做的人接上。**', effects: [{ stats: { clinical: 3, state: -1 } }, { setFlag: 'hospital_boundary_kept' }] },
      { id: 'ask_doctor', text: '请精神科医生一起说明', result: '医生进来三分钟,把同样的话换了一种身份说了一遍。家属点头了。\n\n你第一次具体地理解了“建制”两个字。', effects: [{ stats: { capital: 3, clinical: 2 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_title_exam', pools: HOSPITAL_PRACTICE, career: 'hospital', year: { from: 2022, to: 2025 },
    title: '职称考试',
    text: '白天门诊,晚上刷题。你做了几年心理治疗,考试仍然会问一串你工作中从来不按这种方式背的定义。\n\n**医院里的专业身份,一半长在诊室里,一半长在表格和考试里。**',
    choices: [
      { id: 'prepare', text: '把三个月晚上交给考试', result: '成绩出来那天你没有庆祝,只是把准考证从桌面收走。\n\n下一轮聘岗时,那一栏终于不是空的。', effects: [{ stats: { capital: 5, state: -4 } }, { setFlag: 'hospital_title_passed' }] },
      { id: 'keep_clinic', text: '先保住门诊状态,明年再考', result: '你没有在最累的时候再压一块石头。\n\n同事先评上一级。你得承认自己在意,也得承认今年这样更安全。', effects: [{ stats: { clinical: 3, state: 2 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_measurement_room', pools: HOSPITAL_PRACTICE, career: 'hospital',
    title: '测评室的一天',
    text: '上午两套智测,下午人格测验和报告。走廊里的人只看见你发量表、收答题纸。\n\n真正费力的是把一个分数放回病史、教育经历和当下状态里。',
    choices: [
      { id: 'full_context', text: '把病史访谈也补全', result: '最后那份报告晚交了半天,但会诊医生少追问了三个问题。\n\n你做的不是“测量室流水线”。至少今天不是。', effects: [{ stats: { clinical: 4, state: -2 } }, { setFlag: 'hospital_assessment_depth' }] },
      { id: 'clear_queue', text: '先把当天队列清完', result: '所有人都按时拿到了结果。\n\n你下班前在一份报告旁留了张便签:明天补一次访谈。', effects: [{ stats: { capital: 2, clinical: 2, state: -1 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_fifteen_minutes', pools: HOSPITAL_PRACTICE, career: 'hospital', year: { from: 2023 },
    title: '十五分钟一个', tier: 'major',
    text: '门诊加号到二十个。电子病历右上角的计时一直在走。第五位患者刚说到最重要的地方,下一位已经在门外敲门。\n\n**医院给了你最稳定的入口,也给了你最短的时间。**',
    choices: [
      { id: 'protect_slot', text: '给高风险的人留出完整时间', result: '后面的号全部延迟,护士来问了两次。\n\n那位患者离开前知道下一步去哪、谁会接上。这半小时没有被白用。', effects: [{ stats: { clinical: 5, capital: -2, state: -3 } }, { setFlag: 'hospital_protected_time' }] },
      { id: 'triage', text: '按分诊流程先做必要处置', result: '你没有假装十五分钟能完成治疗。风险评估、转诊、复诊预约,每一步都很短,但连得起来。', effects: [{ stats: { method: 2, clinical: 3, state: -2 } }, { setFlag: 'hospital_triage_skill' }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_team_round', pools: HOSPITAL_PRACTICE, career: 'hospital',
    title: '联合查房',
    text: '精神科医生谈药物,护士谈睡眠和服药,社工谈家庭,轮到你谈治疗联盟。\n\n没有谁的那一块能单独解释眼前这个人。',
    choices: [
      { id: 'speak_plainly', text: '用团队听得懂的语言讲', result: '你没说取向名词,只说患者在哪些时刻会退出谈话、家属怎样能减少对抗。\n\n会后护士来要了你的那页记录。', effects: [{ stats: { capital: 3, clinical: 3 } }, { setFlag: 'hospital_team_trust' }] },
      { id: 'hold_precision', text: '把概念化讲完整', result: '你的判断很准确,只是查房已经超时。主任打断时没有否定你。\n\n准确和能被团队使用,是两种能力。', effects: [{ stats: { clinical: 4, method: 1, state: -1 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_research_quota', pools: HOSPITAL_PRACTICE, career: 'hospital', year: { from: 2024 },
    title: '科研考核也追来了',
    text: '聘岗表上多了一栏论文。你一天看二十个病人,科里仍然希望你有课题、有文章、有继续教育学分。\n\n**离开高校不等于离开考核。**',
    choices: [
      { id: 'clinical_dataset', text: '把常规评估整理成一个规范队列', result: '你先补伦理、补数据字典、补随访。最慢的做法,也是以后还能解释那些数字的做法。', effects: [{ stats: { method: 4, capital: 3, state: -4 } }, { setFlag: 'hospital_researcher' }] },
      { id: 'choose_service', text: '今年只把门诊做好', result: '考核表少一行,病历质量没有少。\n\n主任不满意。来复诊的人不知道这件事。', effects: [{ stats: { clinical: 4, capital: -2, state: 1 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_family_request', pools: HOSPITAL_PRACTICE, career: 'hospital',
    title: '家属在门口等你',
    text: '家属说:“你就告诉我他到底跟你说了什么。”他在哭,也确实承担着照护。病历系统里的授权范围写得很清楚,眼前的人没有那么清楚。',
    choices: [
      { id: 'boundary', text: '只谈风险与照护建议', result: '你没有复述治疗内容。家属不完全满意,但知道今晚该观察什么、什么时候回医院。', effects: [{ stats: { clinical: 4, state: -2 } }, { setFlag: 'hospital_confidentiality_kept' }] },
      { id: 'joint_session', text: '征得同意后安排一次共同会谈', result: '多占了一个号,也多了一次把两边话放在同一间屋里的机会。\n\n关系没有因此变简单,只是少了一点猜。', effects: [{ stats: { clinical: 3, capital: 1, state: -2 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_crisis_pathway', pools: HOSPITAL_PRACTICE, career: 'hospital', year: { from: 2025 },
    title: '一条真正能走通的转介线',
    text: '急诊、精神科门诊、心理治疗门诊、学校和社区之间没有一张共同的流程图。每次危机都靠某个人记得给某个人打电话。\n\n你知道这样迟早会漏。',
    choices: [
      { id: 'build', text: '把流程一段段接起来', result: '你开了八次会,改了十一版表格。没有新增编制,但值班的人终于知道下一通电话打给谁。\n\n**系统的作用,是在最慌的时候不用靠英雄。**', effects: [{ stats: { capital: 6, method: 2, state: -5 } }, { setFlag: 'hospital_built_pathway' }] },
      { id: 'local', text: '先把科内流程做扎实', result: '你没解决整个城市的问题。你让本科室每一次交接都有名字、有时间、有去向。\n\n范围小,但它真的执行了。', effects: [{ stats: { clinical: 4, capital: 2, state: -2 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_night_call', pools: HOSPITAL_PRACTICE, career: 'hospital', year: { from: 2026 },
    title: '夜里十一点的电话',
    text: '值班医生打来,问你能不能现在到院。你明早八点有第一位门诊,家里人已经睡了。\n\n这不是合同上最醒目的那一条,却是医院线和独立执业最不一样的地方。',
    choices: [
      { id: 'go', text: '去医院', result: '你在空走廊里听见自己的鞋声。会诊做完是凌晨两点。\n\n第二天第一位患者看不出你只睡了四小时。', effects: [{ stats: { clinical: 4, capital: 2, state: -6 } }, { setFlag: 'hospital_took_nights' }] },
      { id: 'handoff', text: '按值班链转给当班同事', result: '你把情况交接完整,确认对方接到。\n\n不是每一通电话都必须由最熟的人亲自到场；流程存在就是为了这件事。', effects: [{ stats: { method: 2, state: 2, capital: -1 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_newcomer', pools: HOSPITAL_LATE, career: 'hospital',
    title: '新人坐在你旁边',
    text: '新来的治疗师第一次独立门诊前,把病历模板看了六遍。你认得那种紧张——很多年前你也把每一句都写得像教材。',
    choices: [
      { id: 'supervise', text: '每周留一小时带他复盘', result: '这一小时不算门诊量,也不算科研。三个月后,他第一次说“这里我不知道”,而不是硬给一个答案。\n\n你知道训练开始了。', effects: [{ stats: { clinical: 3, capital: 4, state: -2 } }, { setFlag: 'hospital_mentor' }] },
      { id: 'on_call', text: '告诉他随时来问', result: '你把门开着。代价是问题总在你最忙的时候来。\n\n他长得慢一点,但没有被扔在第一次危机里。', effects: [{ stats: { clinical: 2, state: -1, capital: 2 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_admin_role', pools: HOSPITAL_LATE, career: 'hospital',
    title: '副主任那张表',
    text: '科里问你愿不愿意接一部分管理。排班、投诉、医保口径、耗材和年轻人的轮转。\n\n升上去意味着离开一部分门诊,留下意味着很多决定由别人做。',
    choices: [
      { id: 'take_role', text: '接下来', result: '你开始在会议里替心理治疗争那几个不会直接产生收入的小时。\n\n做管理没有让你离临床更近,但有些边界终于能写进制度。', effects: [{ stats: { capital: 6, clinical: -1, state: -3 } }, { setFlag: 'hospital_manager' }] },
      { id: 'stay_clinical', text: '把位置留给别人,继续坐门诊', result: '你的名字没有出现在新组织架构里。预约表仍然排得很满。\n\n你选择继续做手艺人。', effects: [{ stats: { clinical: 5, state: 1 } }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_department_argument', pools: HOSPITAL_LATE, career: 'hospital',
    title: '科会上那场争论',
    text: '有人主张把心理治疗门诊压缩成评估与短程干预,因为周转率更好看。有人说那样等于把真正需要长期工作的人推出去。\n\n两边说的都是医院正在承受的压力。',
    choices: [
      { id: 'protect_long_term', text: '保留一小块长程治疗名额', result: '名额很少,少到不能改变总表。它让几位最复杂的患者不用每六次重新解释一遍自己。', effects: [{ stats: { clinical: 5, capital: -2, state: -2 } }, { setFlag: 'hospital_long_term_slots' }] },
      { id: 'stepped_care', text: '改成分层照护,把资源留给最需要的人', result: '大多数人进入短程与团体,复杂个案保留长程。没有人拿到全部想要的,但队列开始动了。', effects: [{ stats: { method: 3, clinical: 3, capital: 2 } }, { setFlag: 'hospital_stepped_care' }] },
    ],
  }),
  trackEvent({
    id: 'ev_h_last_room', pools: HOSPITAL_LATE, career: 'hospital', year: { from: 2033 },
    title: '最后一个号',
    text: '下午五点四十,当天最后一位患者离开。走廊终于空了。你关掉电子病历,看见桌角那本用了很多年的评估手册。\n\n你仍然没有处方权。你也已经很少再用这句话解释自己能做什么。',
    choices: [
      { id: 'close_on_time', text: '按时下班', result: '你关灯,把门带上。明天还有二十个号,但今晚不在这间屋里。', effects: [{ stats: { state: 4, clinical: 1 } }] },
      { id: 'finish_notes', text: '把今天最难的那份记录补完', result: '你多留了半小时,只为了让下一个接手的人不用从猜开始。\n\n这是你在建制里留下的最小一块连续性。', effects: [{ stats: { clinical: 3, state: -1, capital: 1 } }] },
    ],
  }),
];

export const schoolEvents: GameEvent[] = [
  trackEvent({ id: 'ev_s_first_room', pools: ['school'], career: 'school', year: { to: 2022 }, title: '阳光小屋', text: '门牌写着“阳光小屋”。屋里有沙盘、两把椅子和上一任留下的三箱心理健康月横幅。\n\n全校两千一百个学生,心理老师一个。', choices: [
    { id: 'open_door', text: '先让学生知道这扇门真的能进', result: '你把预约方式贴在门口,没有写“有问题才来”。第一周没人,第三周有人在门口绕了两圈。', effects: [{ stats: { clinical: 3, state: 1 } }, { setFlag: 'school_room_open' }] },
    { id: 'build_files', text: '先把档案和转介表建起来', result: '没有学生会为一套表格感谢你。第一次需要转介时,你没有在抽屉里乱找。', effects: [{ stats: { method: 2, capital: 2 } }] },
  ] }),
  trackEvent({ id: 'ev_s_main_subject', pools: ['school'], career: 'school', title: '这节课数学老师要用', text: '班主任在课前十分钟来找你:“这节心理课先给数学吧,下周月考。”\n\n他不是故意看轻你。他手上也有一张排名表。', choices: [
    { id: 'keep_class', text: '把这节课留下', result: '你第一次在教研会上讲清楚心理课不是机动课。关系僵了一点,下个月课表没有再动。', effects: [{ stats: { capital: -1, clinical: 3, state: -1 } }, { setFlag: 'school_protected_class' }] },
    { id: 'trade', text: '换一节不在考前的课', result: '这周让了,下周补回。你学会这所学校里“原则”要怎样翻译成能执行的交换。', effects: [{ stats: { capital: 3, method: 1 } }] },
  ] }),
  trackEvent({ id: 'ev_s_2020_online', pools: ['school'], career: 'school', year: { from: 2020, to: 2020 }, title: '屏幕那一边', text: '2020 年,学生都在家。你开的线上心理课里,摄像头几乎全黑。私信却从晚上开始一条条进来。', choices: [
    { id: 'office_hours', text: '固定线上值班,不做全天候热线', result: '你给出明确时段和紧急转介方式。边界让学生知道什么时候能找到你,也让你能睡觉。', effects: [{ stats: { clinical: 4, state: -2 } }, { setFlag: 'school_online_protocol' }] },
    { id: 'answer_all', text: '先把每一条都回掉', result: '你回到凌晨两点。那个月确实有人因此接上了帮助,你也第一次理解了“24 小时待命”会怎样吃掉一个人。', effects: [{ stats: { clinical: 4, state: -6, capital: 2 } }] },
  ] }),
  trackEvent({ id: 'ev_s_2021_policy', pools: ['school'], career: 'school', year: { from: 2021, to: 2021 }, title: '文件下来了', tier: 'major', text: '2021 年,专职心理健康教师被正式写进政策。校长在会上说:“以后这块要重视。”\n\n你的编制没有因此多出一个同事,但你第一次能拿着文件去争时间。', choices: [
    { id: 'ask_headcount', text: '申请第二个专职岗位', result: '今年没批。申请被留下了。两年后区里统一扩岗时,你们学校排在前面。', effects: [{ stats: { capital: 5, state: -2 } }, { setFlag: 'school_second_post' }] },
    { id: 'ask_hours', text: '先把心理课和咨询时段写进课表', result: '你要到了每周固定的咨询时段。文件没有改变一切,但它让“能不能给”变成了“怎么落实”。', effects: [{ stats: { clinical: 3, capital: 3 } }] },
  ] }),
  trackEvent({ id: 'ev_s_screening', pools: ['school'], career: 'school', year: { from: 2023 }, title: '全校筛查', text: '三千份问卷跑完,高风险名单比你一个月能访谈的人数多。\n\n量表不是诊断,但名单已经打印出来了。', choices: [
    { id: 'tiered', text: '分层复核,建立转介优先级', result: '你把“分数高”拆成需要立即见、需要班主任观察、需要家长联系。表格变复杂了,误报少了一些。', effects: [{ stats: { method: 4, clinical: 3, state: -3 } }, { setFlag: 'school_screening_system' }] },
    { id: 'interview_all', text: '尽量把名单上的人都见一遍', result: '你连续三周午休都在谈。见到了更多人,也越来越难保证每一次谈话的质量。', effects: [{ stats: { clinical: 4, state: -6, capital: 2 } }] },
  ] }),
  trackEvent({ id: 'ev_s_return_to_school', pools: ['school'], career: 'school', year: { from: 2024 }, title: '复学会', text: '一个休学半年的学生要回来。家长希望“别特殊对待”,班主任担心出事,任课老师只问能不能正常考试。\n\n你要把几种恐惧翻译成一张可执行的复学计划。', choices: [
    { id: 'staged', text: '做分阶段复学,每两周复盘', result: '计划很慢,也不漂亮。学生先回来上半天,两个月后才坐满一周。\n\n**回到学校不是一个日期,是一段过程。**', effects: [{ stats: { clinical: 5, capital: 3, state: -3 } }, { setFlag: 'school_return_pathway' }] },
    { id: 'simple', text: '先把支持联系人和危机预案写清', result: '你没有替所有人消除担心。你确保出问题时不会有人问“现在该找谁”。', effects: [{ stats: { method: 2, clinical: 3, state: -1 } }] },
  ] }),
  trackEvent({ id: 'ev_s_homeroom', pools: ['school_late'], career: 'school', title: '顺便带个班', text: '教务处说缺班主任,问你能不能“暂时”带一个。理由很充分:你最会做学生工作。\n\n你知道“暂时”在学校里通常有多长。', choices: [
    { id: 'take', text: '接下来', result: '从此你的咨询时段里混进了考勤、家长群和运动会。你更了解学生的日常,也更难让他们相信谈话不会影响班级管理。', effects: [{ stats: { capital: 5, clinical: -2, state: -5 } }, { setFlag: 'school_homeroom' }] },
    { id: 'decline', text: '说明双重角色的风险,不接', result: '教务处不高兴。咨询室保住了它唯一重要的东西:学生不用猜眼前的人下一分钟会不会去找班主任。', effects: [{ stats: { clinical: 5, capital: -2, state: 1 } }, { setFlag: 'school_protected_room' }] },
  ] }),
  trackEvent({ id: 'ev_s_district_system', pools: ['school_late'], career: 'school', title: '一张区级流程图', text: '区里让你牵头做危机转介流程。医院、教育局、学校和家长需要在同一张纸上出现,而每一方都希望责任停在自己门外。', choices: [
    { id: 'build', text: '把每个接口谈到有人签字', result: '一年后,这张图没有漂亮到能拿奖,但学校再遇到危机时知道该往哪送、谁来接、怎样回来。\n\n没人知道这套流程避免过什么。你也不知道。', effects: [{ stats: { capital: 7, method: 3, state: -5 } }, { setFlag: 'school_district_system' }] },
    { id: 'pilot', text: '先在三所学校做小范围试点', result: '它没有覆盖全区,却真的跑过三次。你宁愿有一条走过的窄路,也不愿有一张没人照着走的大图。', effects: [{ stats: { method: 4, capital: 3, state: -2 } }] },
  ] }),
  trackEvent({ id: 'ev_s_parent_group', pools: ['school_late'], career: 'school', title: '家长群里的截图', text: '一张学生筛查通知被截到家长群，有人问学校是不是在给孩子“贴标签”。通知本身没有诊断字样，恐惧却已经有了方向。', choices: [
    { id: 'meeting', text: '开一场说明会，把筛查与诊断分清', result: '质疑没有全部消失，家长至少知道分数之后还有复核、访谈和转介，而不是一张名单决定孩子是谁。', effects: [{ stats: { clinical: 3, capital: 3, state: -2 } }] },
    { id: 'rewrite', text: '先重写通知和知情流程', result: '流程慢了一周，下一轮每个家庭都能看见数据去哪里、谁能看、何时删除。', effects: [{ stats: { method: 3, capital: 1 } }] },
  ] }),
  trackEvent({ id: 'ev_s_graduate_message', pools: ['school_late'], career: 'school', year: { from: 2030 }, title: '毕业生发来一条消息', text: '一个毕业多年的学生说，ta 不记得你心理课讲过什么，只记得有一年在咨询室里，你没有立刻给建议。', choices: [
    { id: 'reply', text: '回一句“谢谢你告诉我”', result: '这句话不能写进年度考核，也比大多数考核更接近你想知道的结果。', effects: [{ stats: { state: 5, clinical: 2 } }] },
    { id: 'keep', text: '把消息留在收藏里', result: '它和危机流程、课表、筛查名单放在同一个职业里，没有谁能单独代表全部。', effects: [{ stats: { state: 4 } }] },
  ] }),
];

export const industryEvents: GameEvent[] = [
  trackEvent({ id: 'ev_i_first_report', pools: ['industry'], career: 'industry', year: { to: 2022 }, title: '第一份用研报告', text: '你访谈了十二个人,写了四十页。产品经理翻到第六页问:“所以我们下周改什么?”\n\n你第一次发现,这里的结论必须能在一个迭代周期里被使用。', choices: [
    { id: 'rewrite', text: '把报告改成三条决策与证据', result: '四十页没有白写,只是被压进了三页。评审会第一次有人沿着你的证据改了方案。', effects: [{ stats: { method: 3, capital: 3 } }, { setFlag: 'industry_actionable_research' }] },
    { id: 'defend', text: '保留方法和限制,不把不确定性藏掉', result: '报告长了一点,结论弱了一点。团队最后仍做了决定,但知道它站在多薄的样本上。', effects: [{ stats: { method: 4, capital: 1, state: -1 } }] },
  ] }),
  trackEvent({ id: 'ev_i_sql', pools: ['industry'], career: 'industry', year: { to: 2023 }, title: '“这个数数据同学已经看过了”', text: '你的访谈发现和埋点数据冲突。会上有人说:“定性就是讲故事,我们看大盘。”\n\n你知道大盘回答不了用户为什么在那一步退出。', choices: [
    { id: 'learn_sql', text: '自己把两份数据接起来', result: '你补了 SQL,把退出用户按行为分层再访谈。两边不再互相否定,只是各自解释一半。', effects: [{ stats: { method: 6, state: -3 } }, { setFlag: 'industry_data_hybrid' }] },
    { id: 'hold_line', text: '把定性的边界讲清楚', result: '你没有假装十二个人代表全部用户。你也没有让一张平均数替代他们为什么离开。', effects: [{ stats: { method: 3, capital: 2 } }] },
  ] }),
  trackEvent({ id: 'ev_i_2022_layoff', pools: ['industry'], career: 'industry', year: { from: 2022, to: 2022 }, title: '名单', tier: 'major', text: '2022 年,用研是第一批被问“这个岗位直接产生什么价值”的团队。上午十点,会议邀请分成两种。你的在下午三点。', choices: [
    { id: 'stay', text: '留下,接更靠业务的项目', result: '你留下了。团队少了一半,项目没有少。你开始把“研究价值”翻译成留存、转化和少走的弯路。', effects: [{ stats: { capital: 4, state: -6, money: 30000 } }, { setFlag: 'industry_survived_layoff' }] },
    { id: 'take_package', text: '拿补偿离开', result: '补偿到账,工牌失效。你第一次有整块时间想下一份工作要不要还叫“用户研究”。', effects: [{ stats: { money: 90000, state: -4, capital: -3 } }, { setFlag: 'industry_laid_off' }] },
  ] }),
  trackEvent({ id: 'ev_i_product_turn', pools: ['industry'], career: 'industry', year: { from: 2023 }, title: '要不要转产品', text: '业务负责人说你已经在做一半产品经理的事:定义问题、排优先级、说服团队。转过去,权限和薪资都会涨；留下,你还能把时间花在理解人。', choices: [
    { id: 'switch', text: '转产品', result: '你的日历从访谈变成了评审和排期。心理学没有消失,只是变成你做判断时的一层底色。', effects: [{ stats: { capital: 6, money: 60000, state: -3 } }, { setFlag: 'industry_product' }] },
    { id: 'stay_research', text: '留下做研究专家', result: '你放弃了一条更直的晋升线,换来继续问那些别人嫌慢的问题。两年后,新人开始把最难的研究设计拿来找你。', effects: [{ stats: { method: 5, capital: 3, state: 1 } }, { setFlag: 'industry_research_expert' }] },
  ] }),
  trackEvent({ id: 'ev_i_ai_research', pools: ['industry'], career: 'industry', year: { from: 2023 }, title: 'AI 能不能替你访谈', text: '有人演示让大模型生成一百个“用户回答”。曲线很整齐,成本几乎为零。会议室里有人问:“以后还要真人访谈吗?”', choices: [
    { id: 'benchmark', text: '拿真实访谈做一轮对照', result: '模型复述了所有常见答案,漏掉了真正让产品失败的那几个尴尬停顿。你没有宣布它没用,你写清了它能替代哪一段、不能替代哪一段。', effects: [{ stats: { method: 5, capital: 3 } }, { setFlag: 'industry_ai_literate' }] },
    { id: 'adopt', text: '把它用于前期假设生成', result: '项目快了一周。你把生成内容明确标成假设,没有把模拟用户包装成样本。', effects: [{ stats: { method: 3, capital: 4, state: 1 } }] },
  ] }),
  trackEvent({ id: 'ev_i_reorg', pools: ['industry'], career: 'industry', year: { from: 2025 }, title: '汇报对象换了第五次', text: '组织架构又调了。新老板不认识你做过的任何项目,只看到今年的 OKR。\n\n你保存的那些洞察不会随组织图自动迁移。', choices: [
    { id: 'repository', text: '把研究资产做成可检索的证据库', result: '它没有阻止下一次重组,但让三年前的访谈第一次在新项目里被重新用上。', effects: [{ stats: { method: 3, capital: 5, state: -3 } }, { setFlag: 'industry_research_system' }] },
    { id: 'reset', text: '接受重置,从新老板的问题开始', result: '你没有花半年证明过去的自己。新项目启动得很快,旧文件夹仍留在硬盘里。', effects: [{ stats: { capital: 3, state: 2 } }] },
  ] }),
  trackEvent({ id: 'ev_i_hire_psych', pools: ['industry_late'], career: 'industry', title: '面试一个心理学应届生', text: '简历上写着实验设计、SPSS、访谈和一篇毕业论文。十几年前你也用这些词解释自己。\n\n面试最后,ta 问:“心理学背景在这里真的有用吗?”', choices: [
    { id: 'honest', text: '说清楚哪些有用、哪些不够', result: '你说研究设计有用,会听人说话有用；不会 SQL、不懂业务约束也是真的不够。\n\nta 没得到一句鼓励,得到了一张能准备的清单。', effects: [{ stats: { capital: 4, state: 2 } }, { setFlag: 'industry_mentor' }] },
    { id: 'hire', text: '给一个 case,让作品说话', result: 'ta 的答案不成熟,但在所有人都抢着给结论时,ta 先问了一句“我们到底要决定什么”。你把名字留在了下一轮。', effects: [{ stats: { method: 2, capital: 3 } }] },
  ] }),
  trackEvent({ id: 'ev_i_last_review', pools: ['industry_late'], career: 'industry', year: { from: 2033 }, title: '最后一次评审', text: '大屏上是一条你看过很多次的增长曲线。年轻同事在讲用户洞察,用的模板是你几年前搭的。\n\n岗位名已经不一定叫用研了。', choices: [
    { id: 'ask_question', text: '问那个最慢的问题', result: '“这个指标变化,对用户的生活具体意味着什么?”\n\n会议停了十秒。你仍然在做心理学教你的第一件事:别把一个数当成一个人。', effects: [{ stats: { method: 3, state: 3 } }] },
    { id: 'let_team', text: '让年轻同事把结论讲完', result: 'ta 讲得比你当年短,也更能被使用。你没有补充。\n\n一个团队真正长出来的标志,是有些话不再需要你说。', effects: [{ stats: { capital: 4, state: 3 } }] },
  ] }),
  trackEvent({ id: 'ev_i_metric_moved', pools: ['industry_late'], career: 'industry', title: '指标涨了，但不是因为那个功能', text: '上线后一周核心指标上涨，团队准备把成功写进复盘。同期市场投放翻倍，旧版本用户也被强制迁移。', choices: [
    { id: 'separate', text: '把不能归因的部分写清', result: '复盘少了一句胜利宣言，多了一张下一轮真正能验证的实验计划。', effects: [{ stats: { method: 4, capital: 1 } }] },
    { id: 'take_win', text: '先承认业务结果，再标注归因限制', result: '团队拿到了结果，你也没有让相关性在文档里悄悄变成因果。', effects: [{ stats: { capital: 4, method: 2 } }] },
  ] }),
  trackEvent({ id: 'ev_i_archive_interview', pools: ['industry_late'], career: 'industry', year: { from: 2030 }, title: '十年前的访谈还能不能看', text: '新人翻到一批十年前的录音，里面的人、产品和同意范围都属于另一个时代。洞察可能仍有用，授权未必覆盖今天。', choices: [
    { id: 'audit', text: '先核对授权与保存期限', result: '一部分材料被删除，一部分匿名后留下。证据库第一次也有了忘记的能力。', effects: [{ stats: { method: 3, capital: 2 } }] },
    { id: 'summary', text: '只使用当年已匿名的研究摘要', result: '细节少了，参与者没有因为组织记性太好而被重新识别。', effects: [{ stats: { method: 2, state: 2 } }] },
  ] }),
];

export const leftEvents: GameEvent[] = [
  trackEvent({ id: 'ev_l_first_intro', pools: ['left'], career: 'left', year: { to: 2022 }, title: '“你以前学什么的?”', text: '新同事问你以前学什么。你说心理学。对方马上笑:“那你分析分析我。”\n\n这句话你已经听了四年,只是这次你不再需要替自己的专业辩护。', choices: [
    { id: 'light', text: '笑一下,把话题带过去', result: '你没有上第九遍“心理学不是读心术”的课。下午的工作照常开始。', effects: [{ stats: { state: 3, capital: 1 } }] },
    { id: 'translate', text: '说你会研究问题、读数据和做访谈', result: '你第一次不用学科名解释那四年。对方点头:“那这项目你正好能帮上。”', effects: [{ stats: { method: 2, capital: 3 } }, { setFlag: 'left_translated_skills' }] },
  ] }),
  trackEvent({ id: 'ev_l_exam_again', pools: ['left'], career: 'left', year: { to: 2024 }, title: '再考一次', text: '你面前有两条路:考一个完全不同的研究生,或者不再把人生交给下一张录取通知书。\n\n前一条更容易解释,后一条更快开始。', choices: [
    { id: 'study', text: '换专业再读', result: '你又回到图书馆。不同的是,这次你知道一个学科不会替你回答“以后做什么”。', effects: [{ stats: { method: 4, money: -10000, state: -2 } }, { setFlag: 'left_retrained' }] },
    { id: 'work', text: '直接工作,从可迁移的那部分开始', result: '第一份工作不理想,但它给了你一条不再按学期计算的时间线。', effects: [{ stats: { money: 40000, capital: 2, state: 1 } }] },
  ] }),
  trackEvent({ id: 'ev_l_data_path', pools: ['left'], career: 'left', year: { from: 2021 }, title: '一张数据岗的招聘启事', text: '要求里有统计、实验设计、Python 和业务理解。你不满足全部,但比自己想的更接近。\n\n心理学没有给你岗位名,给了你一半工具。', choices: [
    { id: 'apply', text: '补代码,去投', result: '你从回归、实验和因果问题切进去。半年后,你的工牌上写的是数据分析。\n\n你没有离开“研究问题”,只是换了问题。', effects: [{ stats: { method: 7, money: 50000, state: -3 } }, { setFlag: 'left_data_science' }] },
    { id: 'other', text: '不把会统计误认成必须做数据', result: '你关掉招聘页。能做不等于想做——这是你离开第一条路时学到的东西。', effects: [{ stats: { state: 4, capital: 1 } }] },
  ] }),
  trackEvent({ id: 'ev_l_public_service', pools: ['left'], career: 'left', year: { from: 2022 }, title: '一份能算清楚的工作', text: '考试、面试、体检、政审。父母第一次完全听懂你在准备什么。\n\n工作内容和心理学关系不大,稳定这件事本身却很具体。', choices: [
    { id: 'take', text: '去考', result: '你考上了。工资不高,每个月同一天到账。几年后你负责一项群众沟通工作,那四年训练以一种没人命名的方式出现了。', effects: [{ stats: { capital: 4, state: 5, money: 20000 } }, { setFlag: 'left_public_service' }] },
    { id: 'decline', text: '稳定不是你现在最想要的', result: '你没有因为这条路容易解释就选它。家里不完全理解,但那是他们要慢慢消化的部分。', effects: [{ stats: { state: 2, capital: -1 } }] },
  ] }),
  trackEvent({ id: 'ev_l_psych_echo', pools: ['left'], career: 'left', year: { from: 2024 }, title: '旧专业的回声', text: '一个旧同学转来一篇论文,问你还看不看。你点开摘要,发现自己仍然能看出样本和结论之间哪里站不住。\n\n技能退得比身份慢。', choices: [
    { id: 'read', text: '把全文读完', result: '你没有因此想回去。你只是确认那部分自己还在。', effects: [{ stats: { method: 3, state: 2 } }, { setFlag: 'left_kept_connection' }] },
    { id: 'close', text: '看完摘要就关掉', result: '不是每一扇旧门都需要重新打开。你回到现在的工作,没有遗憾,也没有宣言。', effects: [{ stats: { state: 4 } }] },
  ] }),
  trackEvent({ id: 'ev_l_manager', pools: ['left'], career: 'left', year: { from: 2026 }, title: '第一次带人', text: '新人连续两周交不出东西。会上大家都在给建议,你注意到 ta 一直没说自己卡在哪里。\n\n你学过的会谈技术在这里不能叫会谈技术。', choices: [
    { id: 'ask', text: '先问清楚问题是什么', result: '问题不是能力,是任务从来没人定义过。你们重写了目标,一周后东西出来了。\n\n心理学背景没有替你读心,它让你晚一点下判断。', effects: [{ stats: { capital: 5, clinical: 2 } }, { setFlag: 'left_people_lead' }] },
    { id: 'structure', text: '拆任务、定节点、给明确反馈', result: '结构解决了大部分焦虑。你没有治疗任何人,只是把一份工作变得能完成。', effects: [{ stats: { method: 3, capital: 3 } }] },
  ] }),
  trackEvent({ id: 'ev_l_no_longer_switching', pools: ['left_late'], career: 'left', title: '不再叫转行', text: '有人介绍你时说:“ta 以前学心理学,后来转行了。”\n\n你忽然发现自己已经在现在这件事上做了十年。“转行”仍把原来的专业当中心,而你早就不这么算了。', choices: [
    { id: 'correct', text: '说“我现在就是做这个的”', result: '一句很普通的话。它把你的时间线从“离开之后”改成了“这些年”。', effects: [{ stats: { state: 5, capital: 2 } }, { setFlag: 'left_new_identity' }] },
    { id: 'let_pass', text: '不纠正', result: '介绍没有错,只是已经不完整。你不再需要每一次都把自己讲完整。', effects: [{ stats: { state: 4 } }] },
  ] }),
  trackEvent({ id: 'ev_l_drawer', pools: ['left_late'], career: 'left', year: { from: 2033 }, title: '抽屉里的学位证', text: '搬家时你翻到心理学学位证。纸边已经有点卷。\n\n它没有证明你应该留下,也没有因为你离开就失效。', choices: [
    { id: 'keep', text: '放回文件袋', result: '你把它和现在职业的证件放在一起。它们不是前后两个人,都是你。', effects: [{ stats: { state: 5 } }] },
    { id: 'photo', text: '拍张照发给旧同学', result: '群里有人回了一个笑脸,有人说自己也刚翻到。没人问谁走得更对。', effects: [{ stats: { state: 4, capital: 1 } }] },
  ] }),
  trackEvent({ id: 'ev_l_reunion', pools: ['left_late'], career: 'left', title: '同学会上的职业名单', text: '当年的同学现在分散在医院、学校、高校、公司和完全不相关的行业。没有哪两条履历能按同一把尺排序。', choices: [
    { id: 'listen', text: '只问这些年具体在做什么', result: '“留下”和“离开”很快被更具体的工作、家庭和偶然替代。', effects: [{ stats: { state: 4, capital: 2 } }] },
    { id: 'share', text: '也讲讲自己的现在', result: '你没有从“我本来学心理学”开始。现在的职业终于不再需要一个旧专业做前言。', effects: [{ stats: { state: 5 } }] },
  ] }),
  trackEvent({ id: 'ev_l_skill_decay', pools: ['left_late'], career: 'left', year: { from: 2030 }, title: '有些东西确实忘了', text: '旧同学问一个统计问题，你发现公式记不清了。技能没有永远待在原地，这并不证明那几年白费。', choices: [
    { id: 'relearn', text: '需要用，就重新查一遍', result: '两小时后你找回了思路。遗忘和能重新学会可以同时成立。', effects: [{ stats: { method: 2, state: 2 } }] },
    { id: 'refer', text: '坦白忘了，介绍更合适的人', result: '你没有用旧身份冒充现在的专业能力，也没有因此否定那段训练。', effects: [{ stats: { capital: 2, state: 3 } }] },
  ] }),
];

export const trackEvents: GameEvent[] = [
  ...hospitalEvents,
  ...schoolEvents,
  ...industryEvents,
  ...leftEvents,
];
