import type { GameEvent } from '@psy-sim/core';

/**
 * 学院归属专属事件(GAME_DESIGN 8.4)。
 *
 * 按 20.3③ 的配额:**每个学院归属 ≥4 个本科专属事件**。
 * "专属"的定义是 `trigger` 里必然要求该学院归属——所以四种学院的本科体验
 * 在事件层面就是四套不同的东西,不是同一套事件换个称呼。
 *
 * 四句话概括这四种四年:
 * - **理学院**:高数、编程、脑电室。你可能到大三都没见过一个真的来访者
 * - **教育学院**:没有高数、有教育实习、咨询中心资源多。**统计教得浅**——这个亏读研时才还
 * - **医学院**:和临床医学生一起被解剖生理虐;能去精神科见习;**很早就知道自己没有处方权**
 * - **师范**:顺带拿教师资格证、有中小学实习、心理健康教育课程体系完整
 */

const science = { flag: 'college', equals: 'science' } as const;
const education = { flag: 'college', equals: 'education' } as const;
const medical = { flag: 'college', equals: 'medical' } as const;
const normal = { flag: 'college', equals: 'normal' } as const;

export const collegeEvents: GameEvent[] = [
  // ══════════ 理学院 ══════════
  {
    id: 'ev_col_sci_programming',
    pools: ['undergrad'],
    category: 'method',
    trigger: { all: [science, { year: { from: 2016 } }] },
    weight: 3,
    title: 'E-Prime 的第一个报错',
    text: '实验设计课要求你自己写一个 Stroop 任务。你用 E-Prime,拖了三个小时,运行的时候弹出一行红字。\n\n你把那行字复制到百度里,搜到的第一个结果是 2009 年的一个论坛帖,楼主最后回复:"已解决,谢谢。"',
    contextLines: [
      { text: '这一行的人有一半是这么学会编程的。' },
      { condition: { flag: 'trait_quant' }, text: '你其实有点享受这个过程。' },
    ],
    choices: [
      {
        id: 'debug_alone',
        text: '自己啃到半夜',
        outcomes: [
          {
            weight: 2,
            text: '凌晨一点你找到了:一个变量名拼错了。\n\n你在那一刻学到的东西比整门课都多,而且它跟心理学没关系——它跟"能不能把一件事查到底"有关。',
            effects: [{ stats: { method: 5, state: -3 } }, { setFlag: 'can_debug' }],
          },
          {
            weight: 1,
            text: '你两点钟放弃了,交了一个跑不起来的版本。\n\n老师给了 70 分,评语是"设计思路清楚"。他大概也知道大部分人卡在哪。',
            effects: [{ stats: { method: 2, state: -4 } }],
          },
        ],
      },
      {
        id: 'switch_to_psychopy',
        text: '换 PsychoPy,顺便学 Python',
        outcomes: [
          {
            weight: 1,
            text: '你花了两周,把这个任务用 Python 重写了一遍。\n\n这两周是你本科最有价值的两周之一——**技术栈这件事,越早开始越占便宜**,而且它是少数不会被政策取消的东西。',
            effects: [
              { stats: { method: 7, state: -4 } },
              { setFlag: 'can_debug' },
              { setFlag: 'stack_python' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_sci_never_met_client',
    pools: ['undergrad'],
    category: 'identity',
    trigger: { all: [science, { year: { from: 2017 } }, { not: { flag: 'entered_counseling_center' } }] },
    weight: 4,
    title: '你到大三还没见过一个来访者',
    text: '同学问你:"你见过真的来访者吗?"\n\n你想了想。没有。\n\n你见过 214 个被试。你知道他们的编号、反应时和正确率,知道其中 6 个因为眨眼太多被剔除了。你不知道他们里面任何一个人的名字。',
    contextLines: [
      { text: '你们理学院的心理学系离精神卫生中心有二十公里。' },
      { condition: { flag: 'motive_help_people' }, text: '你大一那年说的是"想帮人"。' },
      { condition: { flag: 'became_an_insider' }, text: '但你也确实在这条路上找到了别的东西。' },
    ],
    choices: [
      {
        id: 'go_see_one',
        text: '去咨询中心蹲一次开放日',
        outcomes: [
          {
            weight: 2,
            text: '你在等候区坐了一下午,看见五个人推门进来。没有一个人的表情跟你想象的一样。\n\n你什么都没做,但那个下午一直留在你记忆里。',
            effects: [{ stats: { clinical: 3, state: -1 } }, { setFlag: 'saw_the_waiting_room' }],
          },
          {
            weight: 1,
            text: '开放日那天你实验室有事,没去。\n\n你后来一直打算再找机会,一直到毕业都没找到。这件事本身就是这条路的一部分。',
            effects: [{ stats: { method: 2, clinical: -1 } }],
          },
        ],
      },
      {
        id: 'own_it',
        text: '承认你做的是另一件事,而那件事也有价值',
        outcomes: [
          {
            weight: 1,
            text: '你说:"我做的是机制。搞清楚机制的人和坐在椅子上的人,是两种不同的贡献。"\n\n这句话是真的。它也是你后来在无数个场合替自己辩护时用的那句话。',
            effects: [{ stats: { method: 4, capital: 1 } }, { setFlag: 'identity_researcher' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_sci_eeg_night',
    pools: ['undergrad'],
    category: 'lab',
    trigger: { all: [science, { flag: 'entered_lab' }] },
    weight: 3,
    title: '脑电室的第 37 个被试',
    text: '晚上九点,你在给第 37 个被试洗头。\n\n导电膏很难洗,你已经很熟练了:先用温水冲,再用洗发水,大概三分钟。被试是个大一的小姑娘,一边洗一边问你:"学姐,你们这个是研究什么的?"\n\n你张了张嘴,发现要讲清楚需要五分钟,而她的头发只需要三分钟。',
    contextLines: [
      { text: '被试费是 50 块钱,现金,你要她签一张表。' },
      { condition: { flag: 'mastered_exp' }, text: '你现在能一眼看出她的眨眼伪迹会不会多到要剔除。' },
    ],
    choices: [
      {
        id: 'explain_simply',
        text: '用三分钟讲一个她能懂的版本',
        outcomes: [
          {
            weight: 1,
            text: '你说:"我们在看人在纠正自己错误的时候,脑子里会不会有一个特定的反应。"\n\n她说"哇"。这个"哇"让你那天晚上心情不错。',
            effects: [{ stats: { capital: 2, state: 3, method: 1 } }, { setFlag: 'can_explain_the_field' }],
          },
        ],
      },
      {
        id: 'brush_off',
        text: '说"以后你上实验心理学就知道了"',
        outcomes: [
          {
            weight: 1,
            text: '她说"哦"。你继续洗。\n\n你后来意识到,你刚才错过了一次让人对这一行产生兴趣的机会。而这种机会,一辈子加起来也没有很多次。',
            effects: [{ stats: { method: 2, capital: -1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_sci_math_wall',
    pools: ['undergrad'],
    category: 'course',
    // 学院专属节拍设成 mandatory:一局只会命中一个学院,所以它只给这一局多一个事件,
    // 但它保证了"理学院的大一"一定包含这件事。非 mandatory 的话它要和四个时代节点抢槽位,
    // 结果是 2000 局里一次都没触发过。
    mandatory: true,
    trigger: { all: [science, { year: { from: 2015, to: 2015 } }] },
    title: '高数期中,你们班和数学系一起考',
    text: '你们理学院的心理学专业要上高数,而且是和数学系用同一张卷子。\n\n期中成绩出来,你们专业的平均分比数学系低 23 分。有人在群里问:"我们为什么要学这个?"\n\n辅导员回:"因为你们拿的是理学学士。"',
    contextLines: [
      { text: '教育学院的心理学专业不用上高数。你有个高中同学在那边。' },
      { condition: { flag: 'trait_quant' }, text: '你考了 81 分,是班里第三。' },
    ],
    choices: [
      {
        id: 'grind_math',
        text: '硬啃。这东西以后有用',
        outcomes: [
          {
            weight: 2,
            text: '你不知道它以后有什么用,但你还是啃了。\n\n七年之后你在读一篇讲混合线性模型的方法学文章,读到某一页突然觉得眼熟。**那一刻你会想起这个学期。**',
            effects: [{ stats: { method: 6, state: -4 } }, { setFlag: 'math_foundation' }],
          },
          {
            weight: 1,
            text: '你啃了半学期,期末考了 68。\n\n这门课在你成绩单上不好看。它在你后来的方法能力上留下的东西,成绩单看不见。',
            effects: [{ stats: { method: 3, state: -5 } }, { setFlag: 'math_foundation' }],
          },
        ],
      },
      {
        id: 'minimum_pass',
        text: '及格就行,精力放在专业课上',
        outcomes: [
          {
            weight: 1,
            text: '这是一个非常合理的决定,而且大部分人都这么做。\n\n代价要到很多年后才结算,而且是以"读方法学文章读不下去"这种很难归因的形式。',
            effects: [{ stats: { method: 1, state: 3, clinical: 2 } }],
          },
        ],
      },
    ],
  },

  // ══════════ 教育学院 ══════════
  {
    id: 'ev_col_edu_shallow_stats',
    pools: ['undergrad'],
    category: 'course',
    trigger: { all: [education, { year: { from: 2016 } }] },
    weight: 4,
    title: '你们的统计课只讲到方差分析',
    text: '心理统计学期末,老师划了重点:描述统计、t 检验、单因素方差分析、卡方。\n\n有人问:"回归不考吗?"\n\n老师说:"回归下学期的高级统计会讲一点。多元的部分你们以后读研会学。"\n\n下学期的高级统计是选修,而且和教育实习撞了课。',
    contextLines: [
      { text: '隔壁理学院的心理统计要考多元回归和重复测量方差分析。' },
      { condition: { flag: 'trait_quant' }, text: '你自己买了一本张厚粲在看。' },
      { condition: { flag: 'entered_lab' }, text: '实验室的师兄已经在教你跑 R 了,他不知道你们课上没讲过回归。' },
    ],
    choices: [
      {
        id: 'self_study',
        text: '自己补。这个亏不能留到读研',
        outcomes: [
          {
            weight: 2,
            text: '你花了一个暑假,把回归和中介效应自己啃了一遍。温忠麟那几篇你读了三遍。\n\n研一第一次组会,你是全组唯一一个能听懂师兄在说什么的新生。**没有人知道那个暑假**。',
            effects: [
              { stats: { method: 7, state: -4 } },
              { setFlag: 'self_taught_stats' },
              { setFlag: 'mastered_stats' },
            ],
          },
          {
            weight: 1,
            text: '你补了两周,卡在"为什么要中心化"上面,放弃了。\n\n这个坑一直留着。研一开题的时候它会以"你这个数据不能这么分析"的形式回来。',
            effects: [{ stats: { method: 3, state: -3 } }],
          },
        ],
      },
      {
        id: 'trust_the_syllabus',
        text: '相信课程设置:以后会学到的',
        outcomes: [
          {
            weight: 1,
            text: '这是最自然的反应,而且它符合所有人给你的信号。\n\n**这个亏要在读研的第一次组会上还。** 那天你会听着别人讨论固定效应和随机效应,一句话都插不上。',
            effects: [{ stats: { clinical: 3, state: 2 } }, { setFlag: 'stats_debt' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_edu_teaching_practice',
    pools: ['undergrad'],
    category: 'counseling',
    trigger: { all: [education, { year: { from: 2017 } }] },
    weight: 3,
    title: '教育实习:你去中学上了六周心理课',
    text: '教育实习六周,你被分到一所初中,教七年级两个班的心理健康课。\n\n第一节课你准备了 40 分钟的内容,讲了 12 分钟就讲完了。剩下 28 分钟,四十个十三岁的孩子看着你。\n\n第三周你学会了一件事:这门课的关键不是内容,是你能不能让他们愿意说话。',
    contextLines: [
      { text: '带你的老师说:"你们大学教的那些理论,在这里用不上三成。"' },
      { condition: { flag: 'trait_communicator' }, text: '你第四周开始被别的班的老师借去代课。' },
      { condition: { flag: 'teacher_cert_track' }, text: '这六周算在你教师资格证的实践学时里。' },
    ],
    choices: [
      {
        id: 'improvise',
        text: '放弃教案,改成让他们提问',
        outcomes: [
          {
            weight: 2,
            text: '第一个问题是"老师你有没有喜欢过人"。第二个是"我妈打我算不算家暴"。\n\n第二个问题让你在讲台上站住了三秒。你后来处理了它——找了班主任、找了那个孩子、按流程报了。\n\n**你在这六周里做的事,比你三年课上学的更接近这一行的本体。**',
            effects: [
              { stats: { clinical: 7, state: -3 } },
              { setFlag: 'faced_a_real_disclosure' },
              { setFlag: 'school_track_ready' },
            ],
          },
          {
            weight: 1,
            text: '课堂彻底放开之后有点收不住,后半段变成了聊天。带你的老师说"下次要有结构"。\n\n她说得对,但你在那节课上第一次觉得自己被四十个人需要。',
            effects: [{ stats: { clinical: 4, state: 2, capital: -1 } }, { setFlag: 'school_track_ready' }],
          },
        ],
      },
      {
        id: 'stick_to_plan',
        text: '把教案做厚,用活动填满四十分钟',
        outcomes: [
          {
            weight: 1,
            text: '你做了 PPT、游戏、小组讨论、学习单。第六周的时候你的课已经很好看了。\n\n评优的时候你拿了实习优秀。你自己知道,那四十个人里没有一个跟你说过一句真话。',
            effects: [{ stats: { capital: 4, clinical: 1 } }, { setFlag: 'school_track_ready' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_edu_counseling_access',
    pools: ['undergrad'],
    category: 'counseling',
    trigger: { all: [education, { year: { from: 2017 } }] },
    weight: 3,
    title: '你们学院跟咨询中心是一家',
    text: '教育学院的心理学系和学校心理健康教育中心是同一批老师。\n\n所以你大三就能去中心做朋辈辅导员——培训六次、考核一次、然后每周值两小时班。\n\n第一次值班,一个大一男生进来说他睡不着。你按培训的流程做了转介登记。\n\n他走的时候说:"其实我就是想找个人说说话。"',
    contextLines: [
      { text: '这个资源在理学院是没有的。他们要走行政流程申请。' },
      { condition: { flag: 'mastered_interview' }, text: '会谈技术课上练的那些,你第一次真的用上了。' },
      { condition: { flag: 'origin_illness' }, text: '"想找个人说说话"这句话你听懂了不止一层。' },
    ],
    choices: [
      {
        id: 'follow_protocol',
        text: '按流程做完,登记、转介、写记录',
        outcomes: [
          {
            weight: 1,
            text: '你做得完全正确。督导看了记录说"很规范"。\n\n你自己有点空,因为你知道他要的不是规范。**但规范是你唯一被授权做的事**,而这一点在这个阶段是对的。',
            effects: [
              { stats: { clinical: 4, method: 2 } },
              { setFlag: 'knows_protocol' },
              { addFlag: { key: 'counseling_years', delta: 1, min: 0, max: 8 } },
            ],
          },
        ],
      },
      {
        id: 'talk_longer',
        text: '流程之外多陪他坐了二十分钟',
        outcomes: [
          {
            weight: 2,
            text: '他说了很多。你什么建议都没给,只是听着。\n\n他走的时候说了句"谢谢"。你那天晚上很久没睡着——不是因为他的事,是因为你不确定自己刚才做得对不对。**这个不确定,是这一行的入场费。**',
            effects: [
              { stats: { clinical: 6, state: -3 } },
              { addFlag: { key: 'counseling_years', delta: 1, min: 0, max: 8 } },
              { addFlag: { key: 'burnout', delta: 4, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你陪他坐了二十分钟,然后还是做了转介。他有点失望。\n\n督导后来跟你说:"你没做错。你不是他的咨询师,你是个大三学生。"\n\n这句话你需要听,而且需要听好几次。',
            effects: [
              { stats: { clinical: 5, state: -1 } },
              { setFlag: 'knows_protocol' },
              { addFlag: { key: 'counseling_years', delta: 1, min: 0, max: 8 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_edu_degree_question',
    pools: ['undergrad'],
    category: 'identity',
    trigger: { all: [education, { year: { from: 2018 } }] },
    weight: 3,
    title: '毕业证上写的是"教育学学士"',
    text: '领毕业证那天你才注意到:学位证上写的是**教育学学士**,不是理学学士。\n\n你室友的是理学学士。你们上的课有七成是一样的。\n\n后来你在一个招聘要求上看到:"心理学、应用心理学专业,**理学学位优先**"。',
    contextLines: [
      { text: '这件事在报志愿的时候没有任何人跟你说过。' },
      { condition: { flag: 'self_taught_stats' }, text: '你那个暑假补的东西,证书上也看不见。' },
    ],
    choices: [
      {
        id: 'shrug_it_off',
        text: '证书是证书,能力是能力',
        outcomes: [
          {
            weight: 1,
            text: '这句话是对的,而且你确实靠能力过了后面几道关。\n\n但你也会在某几次筛选里,连让人看见能力的机会都没有。这两件事同时是真的。',
            effects: [{ stats: { state: 2, capital: -1 } }, { setFlag: 'education_degree' }],
          },
        ],
      },
      {
        id: 'plan_around_it',
        text: '记下来:读研要挑理学学位的项目',
        outcomes: [
          {
            weight: 1,
            text: '你把这件事写进了择校清单的第一行。\n\n**在信息不对称的地方,提前一年知道一件事,值一整年的努力。**',
            effects: [{ stats: { method: 2, capital: 3 } }, { setFlag: 'education_degree' }, { setFlag: 'reads_the_fine_print' }],
          },
        ],
      },
    ],
  },

  // ══════════ 医学院 ══════════
  {
    id: 'ev_col_med_anatomy_lab',
    pools: ['undergrad'],
    category: 'course',
    mandatory: true,
    trigger: { all: [medical, { year: { from: 2015, to: 2015 } }] },
    title: '解剖实验室的第一天',
    text: '系统解剖学的实验课,你们心理学专业和临床医学一起上。\n\n福尔马林的味道在你走进去之前十米就闻到了。带课老师说:"心理学的同学站外圈。"\n\n临床的同学已经戴上手套了。你们站在外圈看。',
    contextLines: [
      { text: '这门课的期末通过率在你们专业是 70%。' },
      { condition: { flag: 'origin_medical_family' }, text: '你爸妈都是医生。这个味道你小时候在他们身上闻过。' },
      { condition: { flag: 'trait_resilient' }, text: '你没什么感觉。旁边有个女生已经出去了。' },
    ],
    choices: [
      {
        id: 'go_inner_circle',
        text: '往前站,跟着临床的同学一起动手',
        outcomes: [
          {
            weight: 2,
            text: '老师看了你一眼,说"想学就过来"。\n\n那学期你解剖学考了 88 分,比一半临床的同学高。这件事在你后来的病历讨论和多学科会诊里一直在起作用——**你能听懂他们在说什么。**',
            effects: [
              { stats: { clinical: 6, state: -3 } },
              { setFlag: 'speaks_medical' },
            ],
          },
          {
            weight: 1,
            text: '你坚持了二十分钟,然后出去吐了。\n\n第二次课你还是去了,而且站在了内圈。这件事跟解剖学没关系,跟你有关系。',
            effects: [{ stats: { clinical: 4, state: -5 } }, { setFlag: 'speaks_medical' }],
          },
        ],
      },
      {
        id: 'stay_outer',
        text: '站外圈就好,这门课过了就行',
        outcomes: [
          {
            weight: 1,
            text: '你过了,72 分。\n\n"心理学的同学站外圈"这句话,你在这四年里还会以各种形式听到很多次。它不是恶意,它就是这个位置。',
            effects: [{ stats: { clinical: 2, state: -1 } }, { setFlag: 'outer_circle' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_med_psychiatry_round',
    pools: ['undergrad'],
    category: 'counseling',
    // 精神科见习是医学院这条线的定义性时刻,而且下面那个"那你能开药吗"依赖它的 flag。
    mandatory: true,
    trigger: { all: [medical, { year: { from: 2017, to: 2017 } }] },
    tier: 'major',
    title: '精神科见习:第一次查房',
    text: '大三见习,你跟着精神科的主任查房。\n\n第三床是个二十岁出头的男生,住院第九天。主任问了六个问题,写了两行字,四分钟后走向下一床。\n\n出来之后主任问你:"你觉得他刚才那句话是什么?"\n\n你说不知道。他说:"思维松散。你回去把 ICD 那一章再看一遍。"',
    contextLines: [
      { text: '你在门口的走廊上站了一会儿,才跟上队伍。' },
      { condition: { flag: 'mastered_abnormal' }, text: '你其实认出来了,只是不敢确定。' },
      {
        condition: { flag: 'mastered_anatomy' },
        text: '主任提到颞叶的时候,你脑子里浮出来的是一张切面图——大一那门解剖学在这一刻第一次派上用场。',
      },
      { condition: { flag: 'knows_no_prescription_right' }, text: '你从大一就知道自己以后开不了那张单子。' },
      { condition: { flag: 'origin_illness' }, text: '第三床那个男生的年纪,和你家里那个人当年差不多。' },
    ],
    choices: [
      {
        id: 'study_hard',
        text: '回去把那一章重看一遍,而且做了笔记',
        outcomes: [
          {
            weight: 2,
            text: '你把思维形式障碍那几条抄了一遍,对着自己录下来的会谈片段一句句比对。\n\n下一次查房你答对了。主任说了两个字:"可以。"\n\n**这两个字是你本科四年拿到的最重的评价。**',
            effects: [
              { stats: { clinical: 8, method: 2, state: -2 } },
              { setFlag: 'psychiatry_exposure' },
              { setFlag: 'speaks_medical' },
            ],
          },
          {
            weight: 1,
            text: '你看了,但下次查房还是没答上来。主任没说什么,只是没再问你。\n\n你在那一刻明白了一件事:临床判断不是背出来的,是看出来的,而看需要时间——比一个大三学生有的时间多得多。',
            effects: [{ stats: { clinical: 5, state: -4 } }, { setFlag: 'psychiatry_exposure' }],
          },
        ],
      },
      {
        id: 'ask_about_the_person',
        text: '问主任:他这九天里有没有人跟他好好说过话',
        outcomes: [
          {
            weight: 2,
            text: '主任停下来看了你一会儿,说:"有。心理治疗师每周两次。"\n\n然后他说:"但你要知道,他现在能坐在那里跟人说话,是因为药起效了。"\n\n**这句话你花了十年才完全接受它,而且它是对的。**',
            effects: [
              { stats: { clinical: 7, state: -1 } },
              { setFlag: 'psychiatry_exposure' },
              { setFlag: 'respects_medication' },
            ],
          },
          {
            weight: 1,
            text: '主任说:"你这个问题很好,但我一个上午要看四十个人。"\n\n他不是在敷衍你。他确实一个上午要看四十个人。这个数字本身就是这个系统的答案。',
            effects: [
              { stats: { clinical: 5, state: -3 } },
              { setFlag: 'psychiatry_exposure' },
              { setFlag: 'saw_the_system_load' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_med_no_prescription',
    pools: ['undergrad'],
    category: 'identity',
    // 见习在大三,这一幕在见习之后 —— 所以窗口是大三之后,不是大三当年。
    mandatory: true,
    trigger: { all: [medical, { year: { from: 2018 } }, { flag: 'psychiatry_exposure' }] },
    title: '"那你能开药吗"',
    text: '见习结束前,一个病人家属在走廊里拦住你。\n\n她以为你是医生。她问的是:"大夫,能不能给他把那个药减一点,他吃了整天没精神。"\n\n你说你不是医生。她说:"你穿着白大褂啊。"',
    contextLines: [
      { text: '你确实穿着白大褂。见习生也发白大褂。' },
      { condition: { flag: 'trait_pleaser' }, text: '你很想帮她做点什么。' },
      { condition: { flag: 'respects_medication' }, text: '你知道减药这件事不能随便说。' },
    ],
    choices: [
      {
        id: 'redirect',
        text: '说清楚自己的身份,带她去找值班医生',
        outcomes: [
          {
            weight: 1,
            text: '你带她去了医生办公室,等她进去之后才走。\n\n这件事你做得完全正确,而且做正确的事在这里花了你二十分钟。**"我不能做这个"要说得清楚、不带歉意、并且给出下一步——这三件事你在这一天学会了。**',
            effects: [
              { stats: { clinical: 5, method: 1 } },
              { setFlag: 'clear_about_scope' },
            ],
          },
        ],
      },
      {
        id: 'say_something_general',
        text: '给她讲两句关于副作用的一般知识',
        outcomes: [
          {
            weight: 2,
            text: '你讲得都对,而且都是书上的公开知识。\n\n她走的时候说"那我跟他说少吃半片"。\n\n你赶紧追上去纠正,但那句话已经说出去了。**你越过了一条线,而越过它的时候完全没有感觉。**',
            effects: [
              { stats: { clinical: 2, state: -5 } },
              { addFlag: { key: 'integrity_risk', delta: 6, min: 0, max: 100 } },
              { setFlag: 'crossed_a_line_once' },
            ],
          },
          {
            weight: 1,
            text: '你讲了两句,然后自己意识到不对,停下来说:"这个必须问医生。"\n\n她有点不高兴地走了。你站在走廊里,第一次真正理解"没有处方权"不是一句制度描述,是一件每天都要处理的事。',
            effects: [
              { stats: { clinical: 4, state: -2 } },
              { setFlag: 'clear_about_scope' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_med_identity_gap',
    pools: ['undergrad'],
    category: 'identity',
    // 医学院四年的四个定义性节拍之一(2015 解剖 / 2016 这一幕 / 2017 见习 / 2018 处方权),
    // 一年一个。非 mandatory 的话它要和时代节点、毕业论文链抢槽位,3000 局一次都抽不到——
    // **而"每个学院 ≥4 个专属事件"这条配额只有在它们真的会出现时才有意义。**
    mandatory: true,
    trigger: { all: [medical, { year: { from: 2016, to: 2016 } }] },
    title: '你在医学院,但你不是医学生',
    text: '医学院的走廊里贴着规培、执医、住院医的时间表。你们专业的名字不在上面任何一张表里。\n\n班会上,辅导员讲完临床专业的规培政策之后说:"心理学的同学不涉及这一块。"\n\n有人问:"那我们涉及哪一块?"\n\n辅导员说:"你们可以考研,也可以考编。"',
    contextLines: [
      { text: '你们班三十个人,毕业时有二十二个读了研。' },
      { condition: { flag: 'has_hospital_contact' }, text: '你爸妈能帮你问到医院的事,但问不出一条属于你的路径。' },
    ],
    choices: [
      {
        id: 'find_the_path',
        text: '自己去查医院心理科招什么人',
        outcomes: [
          {
            weight: 2,
            text: '你查到的招聘要求是:硕士及以上,心理学或应用心理学,**有注册系统资质者优先**。\n\n你把"注册系统"这四个字记下来了。这是你第一次知道那条真正的路,而它比规培更长、更没有保障。',
            effects: [
              { stats: { method: 2, capital: 3, state: -2 } },
              { setFlag: 'knows_registration_system' },
              { setFlag: 'hospital_track_aware' },
            ],
          },
          {
            weight: 1,
            text: '你查了半天,发现不同医院的要求差别极大,有些甚至写着"精神医学专业优先"。\n\n**你所在的这个位置没有一条标准路径**,这件事在大二就知道,比在大四才知道好得多。',
            effects: [{ stats: { method: 2, state: -4 } }, { setFlag: 'hospital_track_aware' }],
          },
        ],
      },
      {
        id: 'accept_ambiguity',
        text: '先把课上好,路以后再说',
        outcomes: [
          {
            weight: 1,
            text: '你这两年的解剖、生理、精神病学都学得不错。\n\n这些东西在你后面的路上确实有用——只是没有一张表告诉你它们该怎么用。',
            effects: [{ stats: { clinical: 4, state: 1 } }],
          },
        ],
      },
    ],
  },

  // ══════════ 师范 ══════════
  {
    id: 'ev_col_normal_teacher_cert',
    pools: ['undergrad'],
    category: 'course',
    trigger: { all: [normal, { year: { from: 2017 } }] },
    weight: 4,
    title: '教师资格证是顺带的',
    text: '师范专业的教师资格证,你们是**顺带拿的**——教育学、教育心理学、教学技能三门课在培养方案里,考试通过就发。\n\n非师范的同学要自己报名、自己复习、自己去考。你有个高中同学在综合性大学的心理学系,他为了这个证背了两个月。\n\n他在电话里说:"你们太爽了。"',
    contextLines: [
      { text: '这张证是中小学心理教师岗的硬门槛。' },
      { condition: { flag: 'family_wants_stable_job' }, text: '你妈知道这件事之后,在饭桌上跟所有亲戚说了一遍。' },
      { condition: { flag: 'motive_curiosity' }, text: '你其实想读博。这张证对那条路没什么用。' },
    ],
    choices: [
      {
        id: 'take_it_seriously',
        text: '认真准备,顺便把教学技能练好',
        outcomes: [
          {
            weight: 1,
            text: '你在试讲考核里拿了 92 分。评委老师说你"表达清楚、有亲和力"。\n\n这两个词在中小学心理教师岗、在大学的教学考核、在给公众讲科普的时候,分别值不同的钱。**它是本作里最通用的一项技能。**',
            effects: [
              { stats: { capital: 5, clinical: 2 } },
              { setFlag: 'has_teacher_cert' },
              { setFlag: 'can_teach' },
            ],
          },
        ],
      },
      {
        id: 'just_get_it',
        text: '过了就行,你不打算当老师',
        outcomes: [
          {
            weight: 2,
            text: '你过了。证放在抽屉里。\n\n2021 年国家出台中小学心理教师配备政策的时候,这张证会突然变得很值钱。**而那时候再考已经晚了。**',
            effects: [{ stats: { capital: 2, method: 1 } }, { setFlag: 'has_teacher_cert' }],
          },
          {
            weight: 1,
            text: '你差点忘了报名,最后一天才交的材料。\n\n你拿到了。你在很多年后回头看,会觉得那天的手忙脚乱挺值得。',
            effects: [{ stats: { capital: 2, state: -2 } }, { setFlag: 'has_teacher_cert' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_normal_school_practice',
    pools: ['undergrad'],
    category: 'counseling',
    trigger: { all: [normal, { year: { from: 2017 } }] },
    weight: 3,
    title: '中小学实习:心理老师这个岗位在干什么',
    text: '实习学校的心理老师姓王,一个人负责全校两千一百个学生。\n\n她的工作是:每周六节心理课、心理咨询室值班、心理健康月活动、新生普测、危机个案跟进、以及**填各种表**。\n\n她给你看了她的排课表和上个月的表格文件夹。表格文件夹里有 34 个文件。',
    contextLines: [
      { text: '这个学校的心理咨询室在四楼最里面,门口挂着"阳光小屋"。' },
      { condition: { flag: 'teacher_cert_track' }, text: '你毕业之后可以直接考这个岗。' },
      { condition: { flag: 'promised_stable_job' }, text: '你在饭桌上答应过的那件事,大概就是这个样子。' },
    ],
    choices: [
      {
        id: 'ask_about_the_cases',
        text: '问她那些危机个案是怎么处理的',
        outcomes: [
          {
            weight: 2,
            text: '她说:"发现、上报、联系家长、建议就医、记录。我能做的就这五步。"\n\n你问:"那咨询呢?"\n\n她说:"一个人两千一百个学生,你算一下。"\n\n**这个岗位的核心不是咨询,是筛查和转介。** 想清楚这一点的人在这里能干很久,想不清楚的两年就走了。',
            effects: [
              { stats: { clinical: 5, method: 2, state: -2 } },
              { setFlag: 'knows_school_reality' },
              { setFlag: 'school_track_ready' },
            ],
          },
          {
            weight: 1,
            text: '她讲了一个上学期的个案,讲到一半停了一下,说:"这个后来转到医院了,我一直不知道后续。"\n\n**"不知道后续"是这个岗位最常见的结局**,而它比失败更难受。',
            effects: [
              { stats: { clinical: 4, state: -4 } },
              { setFlag: 'knows_school_reality' },
              { addFlag: { key: 'burnout', delta: 4, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'ask_about_the_forms',
        text: '问那 34 个表格是什么',
        outcomes: [
          {
            weight: 1,
            text: '她笑了一下,说:"上级要的。你以后就知道了。"\n\n你帮她填了两个下午。**这两个下午让你对这个岗位的判断比任何一门课都准确。**',
            effects: [
              { stats: { capital: 2, state: -3, clinical: 1 } },
              { setFlag: 'knows_school_reality' },
              // `teaching_load` 是预聘期的累积量(M5)。本科写它等于提前记一笔没人收的账,
              // 所以这里记的是耗竭——填三十四个表格消耗的确实是这个。
              { addFlag: { key: 'burnout', delta: 5, min: 0, max: 100 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_normal_curriculum',
    pools: ['undergrad'],
    category: 'course',
    trigger: { all: [normal, { year: { from: 2016 } }] },
    weight: 3,
    title: '"心理健康教育"是一整套课程体系',
    text: '师范院校的心理学院有一套完整的"心理健康教育"课程:课程设计、班级团体辅导、生涯规划教育、家校沟通、危机干预流程。\n\n这些课在理学院的心理学系是没有的。他们那边的对应时段上的是认知神经科学导论。\n\n你在选课系统里同时看到这两门课的名字。',
    contextLines: [
      { text: '两套课程培养的是两种完全不同的人,而它们的学位证上都写着"心理学"。' },
      { condition: { flag: 'motive_curiosity' }, text: '你有点想去蹭那门认知神经科学导论。' },
    ],
    choices: [
      {
        id: 'go_deep_education',
        text: '把这套体系吃透:这是你的比较优势',
        outcomes: [
          {
            weight: 1,
            text: '你把团体辅导的方案设计学得很扎实,毕业时手里有六个完整的团辅方案。\n\n**这是可以直接拿出去用的东西**,而大部分心理学本科生毕业时手里什么都没有。',
            effects: [
              { stats: { clinical: 5, capital: 3 } },
              { setFlag: 'has_group_toolkit' },
              { setFlag: 'school_track_ready' },
            ],
          },
        ],
      },
      {
        id: 'audit_the_other',
        text: '去蹭认知神经科学导论',
        outcomes: [
          {
            weight: 2,
            text: '你蹭了一学期,期末还去考了(旁听不算分)。\n\n你没听懂一半,但你知道了那半边世界在说什么语言。**这在读研跨方向的时候是决定性的。**',
            effects: [
              { stats: { method: 5, state: -3 } },
              { setFlag: 'audited_cogneuro' },
            ],
          },
          {
            weight: 1,
            text: '你去了三次就不去了——时间对不上,而且听不懂。\n\n这很正常。跨过那道墙需要的不是热情,是一整个学期的方法课打底。',
            effects: [{ stats: { method: 2, state: -1 } }],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_col_normal_free_tuition',
    pools: ['undergrad'],
    category: 'family',
    mandatory: true,
    trigger: { all: [normal, { year: { from: 2015, to: 2015 } }] },
    title: '师范生的那份协议',
    text: '你们班有八个人签了公费师范生协议:免学费、给生活补助,毕业后回生源地中小学任教**六年**。\n\n你没签。或者你签了。\n\n签了的那几个人这四年过得比别人轻松一点,也比别人确定一点。大四那年,其中一个人想考研,发现要先赔违约金。',
    presentationVariants: [
      {
        condition: { flag: 'origin_rural' },
        title: '师范生的那份协议',
        text: '你们班有八个人签了公费师范生协议:免学费、给生活补助,毕业后回生源地中小学任教**六年**。\n\n你家里的情况让这份协议看起来不像一个选择,像一个答案。你妈在电话里说:"签吧,不用花钱。"\n\n六年之后你二十八岁。你当时算不出这六年值多少。',
      },
    ],
    contextLines: [
      { text: '2015 年的公费师范生政策,违约要退还全部费用并交违约金。' },
      { condition: { flag: 'family_wants_stable_job' }, text: '你父母认为这是这四年里最好的消息。' },
    ],
    choices: [
      {
        id: 'took_the_deal',
        text: '签了。确定性也是一种资源',
        outcomes: [
          {
            weight: 1,
            text: '你这四年不用为学费操心,这件事对你的状态影响比你以为的大。\n\n代价是你的选择空间在十九岁那年就被划定了。**这个交易不划算也不亏,它只是把不确定性换成了另一种。**',
            effects: [
              { stats: { money: 24000, state: 6 } },
              { setFlag: 'free_tuition_contract' },
              { setFlag: 'teacher_cert_track' },
            ],
          },
        ],
      },
      {
        id: 'declined',
        text: '没签。你还不想在十九岁定下六年',
        outcomes: [
          {
            weight: 2,
            text: '你继续交学费。大四那年你看着签了协议的同学直接有工作,而你在准备复试。\n\n你不确定自己当初的决定对不对。**这种不确定会一直跟着你,而它是自由的价格。**',
            effects: [{ stats: { state: -3, method: 2 } }, { setFlag: 'kept_options_open' }],
          },
          {
            weight: 1,
            text: '你没签,而且你后来考上了研。\n\n毕业那天签了协议的同学已经在教书了,他们看你的眼神有点复杂,你看他们的也一样。',
            effects: [{ stats: { state: -1, method: 3, capital: 1 } }, { setFlag: 'kept_options_open' }],
          },
        ],
      },
    ],
  },
];
