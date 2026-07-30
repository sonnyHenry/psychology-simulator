import type { GameEvent } from '@psy-sim/core';

/**
 * 社会层的三颗种子(GAME_DESIGN 8.7)。
 *
 * | 种子 | 落在 | 内容 |
 * |---|---|---|
 * | **第一笔人情** | 大二 | 师姐教你跑被试、帮你搞被试费报销 → 你欠她一笔 |
 * | **竞争者出场** | 大二 | 一起进实验室的那个人。第一次交汇是大三"谁跟着导师做正式课题" |
 * | **第一次打听** | 大三 | 进组前打听导师。情报机制的教学关,成本压到最低 |
 *
 * 三颗种子都要在本科埋下,因为它们后面十六年都在结果。
 *
 * > **M2 的实现口径**:人情账、竞争者状态机、情报库的**真实机制在 M4.5**
 * > (`{ favor }` / `RivalState` / `RumorDef` + `ASK_AROUND`)。这里先用累积量和 flag 把
 * > **叙事**埋下去,语义与后面的机制一致。M4.5 接管时改的是实现,不是内容。
 */
export const socialSeedEvents: GameEvent[] = [
  // ── 种子一:第一笔人情(大二)─────────────────────────────
  {
    id: 'ev_seed_first_favor',
    pools: ['undergrad'],
    category: 'social',
    mandatory: true,
    // 种子落在大二**或之后**:进实验室是玩家的投入选择,他可能大三才进。
    // 锁死在 2016 会让这颗种子在很多局里根本不发芽(simulate 覆盖统计就是这么发现的)。
    trigger: { all: [{ year: { from: 2016 } }, { flag: 'entered_lab' }] },
    order: 10,
    title: '师姐替你把被试费报了',
    text: '你跑完第一批被试,才知道被试费要先自己垫,然后走报销:签到表、身份证号、收款码截图、导师签字、财务窗口。\n\n你垫了 1200 块。窗口的老师看了一眼说:"签到表格式不对,重做。"\n\n师姐把你的表拿过去,说"我下午顺便交",然后帮你重排了格式、跑了两趟财务、还替你解释了为什么有三个被试没签身份证号。\n\n钱两周后到账了。她什么都没说。',
    contextLines: [
      { text: '她博三,今年要毕业,自己的论文还在修。' },
      { condition: { flag: 'trait_pleaser' }, text: '你觉得很不好意思,而且你会记很久。' },
      { condition: { flag: 'origin_rural' }, text: '那 1200 块是你半个月的生活费。' },
    ],
    choices: [
      {
        id: 'thank_properly',
        text: '请她吃个饭,顺便问她博士这几年怎么样',
        outcomes: [
          {
            weight: 2,
            text: '她吃饭的时候讲了很多:开题被批、数据废了一次、一篇文章投了四个刊。讲完说了句"你别学我"。\n\n这顿饭比你这学期任何一门课都有信息量。**而你欠她的那笔账,从今天起是两笔。**',
            effects: [
              { stats: { capital: 4, method: 2, state: 1 } },
              { addFlag: { key: 'favor_owed_senior', delta: 2, min: 0, max: 5 } },
              // **人情账记的是具体那件事**,不是一个分数。
              // 「她帮过你」没有分量,「她替你跑了两趟财务」才有。
              { favor: { op: 'add', who: 'npc_senior_sister', direction: 'owing', weight: 3, reason: '她替你重排了报销单、跑了两趟财务' } },
              { setFlag: 'has_senior_channel' },
            ],
          },
          {
            weight: 1,
            text: '她说不用了,忙。你把奶茶放在她桌上就走了。\n\n**人情账最麻烦的地方是:你还不上的时候它不会消失,只会记着。**',
            effects: [
              { stats: { capital: 2, state: -1 } },
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
              { favor: { op: 'add', who: 'npc_senior_sister', direction: 'owing', weight: 2, reason: '她替你把那笔被试费报了' } },
              { setFlag: 'has_senior_channel' },
            ],
          },
        ],
      },
      {
        id: 'learn_the_process',
        text: '把整套报销流程学会,以后自己弄',
        outcomes: [
          {
            weight: 1,
            text: '你做了一份签到表模板,把财务的要求逐条写在旁边。后来实验室的新人都在用你这份。\n\n**这是你在这个组里的第一份"资本"**,而它跟学术水平毫无关系。',
            effects: [
              { stats: { capital: 5, method: 1 } },
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
              { favor: { op: 'add', who: 'npc_senior_sister', direction: 'owing', weight: 2, reason: '她替你把那笔被试费报了' } },
              { setFlag: 'lab_logistics' },
            ],
          },
        ],
      },
      {
        id: 'take_it_for_granted',
        text: '道个谢就过去了',
        outcomes: [
          {
            weight: 1,
            text: '你说了谢谢,她说"没事"。这件事在你那边过去了。\n\n**在她那边没有。** 不是她记仇——是这一行的账本就是这么记的,而你两年后需要她帮你看一份申请材料。',
            effects: [
              { stats: { capital: 1, state: 1 } },
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
              { favor: { op: 'add', who: 'npc_senior_sister', direction: 'owing', weight: 2, reason: '她替你把那笔被试费报了' } },
            ],
          },
        ],
      },
    ],
  },

  // ── 种子二:竞争者出场(大二)─────────────────────────────
  {
    id: 'ev_seed_rival_appears',
    pools: ['undergrad'],
    category: 'social',
    mandatory: true,
    // 种子落在大二**或之后**:进实验室是玩家的投入选择,他可能大三才进。
    // 锁死在 2016 会让这颗种子在很多局里根本不发芽(simulate 覆盖统计就是这么发现的)。
    trigger: { all: [{ year: { from: 2016 } }, { flag: 'entered_lab' }] },
    order: 12,
    tier: 'major',
    title: '跟你同一天进实验室的那个人',
    text: '你不是那年唯一一个进这个组的本科生。\n\n还有一个人,跟你同一天来的,坐你对面。他记东西比你快,问的问题比你准,而且他已经在自己看 R 的教程了。\n\n第一次组会,导师让你们两个各讲三分钟自己感兴趣的方向。他讲完之后导师说了句"这个想法可以做"。\n\n轮到你的时候,导师说的是"再想想"。',
    contextLines: [
      { text: '你们两个后面十几年会反复在同一个地方出现:同一个组会、同一个会议、同一批教职名单。' },
      { condition: { flag: 'trait_rigorous' }, text: '你回去把自己那三分钟重写了七遍。' },
      { condition: { flag: 'trait_resilient' }, text: '你没太当回事。这是你最大的优势之一。' },
      { condition: { flag: 'became_an_insider' }, text: '你知道自己是真的喜欢这件事,这跟他讲得比你好是两回事。' },
    ],
    choices: [
      {
        id: 'befriend',
        text: '主动跟他一起看文献',
        outcomes: [
          {
            weight: 2,
            text: '你们组了个两人的读文献小组,每周一篇,轮流讲。\n\n这一年你的方法长得比任何一门课都快。**而你们的关系从这天起变成了一件很难命名的东西:既是唯一懂你在干什么的人,也是每次比较都躲不开的那个人。**',
            effects: [
              { stats: { method: 5, capital: 2 } },
              { setFlag: 'rival_appeared' },
              // **这里才真的把他变成一个对象。** flag 只说明遇到过,
              // 而 13.1 要的是一个有自己数值、每年都在推进的人。
              // (`{ op: 'meet' }` 只标记意图,抽哪个原型要 RNG,在引擎里做)
              { rival: { op: 'meet' } },
              { setFlag: 'rival_is_friend' },
            ],
          },
          {
            weight: 1,
            text: '你提议了,他答应了,但只坚持了三周——他自己看得更快,不需要你。\n\n他没有恶意。这就是差距在早期的样子:**它先表现为节奏不同,后来才表现为结果不同。**',
            effects: [
              { stats: { method: 3, state: -2 } },
              { setFlag: 'rival_appeared' },
              // **这里才真的把他变成一个对象。** flag 只说明遇到过,
              // 而 13.1 要的是一个有自己数值、每年都在推进的人。
              // (`{ op: 'meet' }` 只标记意图,抽哪个原型要 RNG,在引擎里做)
              { rival: { op: 'meet' } },
            ],
          },
        ],
      },
      {
        id: 'compete',
        text: '把他当标杆,盯着他的进度追',
        outcomes: [
          {
            weight: 2,
            text: '你开始算他每周读几篇、写了多少行代码、跟导师聊了几次。\n\n你这一年确实追得很紧,**代价是你有一整年没有认真问过自己想做什么**——你的方向是他的方向的镜像。',
            effects: [
              { stats: { method: 6, state: -5 } },
              { setFlag: 'rival_appeared' },
              // **这里才真的把他变成一个对象。** flag 只说明遇到过,
              // 而 13.1 要的是一个有自己数值、每年都在推进的人。
              // (`{ op: 'meet' }` 只标记意图,抽哪个原型要 RNG,在引擎里做)
              { rival: { op: 'meet' } },
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你追了半年,然后在某个熬到两点的晚上突然不想追了。\n\n你把台灯关掉,坐在黑着的屋子里想了很久。**第二天你去问了导师一个跟他完全没关系的问题。**',
            effects: [
              { stats: { method: 3, state: -2 } },
              { setFlag: 'rival_appeared' },
              // **这里才真的把他变成一个对象。** flag 只说明遇到过,
              // 而 13.1 要的是一个有自己数值、每年都在推进的人。
              // (`{ op: 'meet' }` 只标记意图,抽哪个原型要 RNG,在引擎里做)
              { rival: { op: 'meet' } },
              { setFlag: 'found_own_question' },
            ],
          },
        ],
      },
      {
        id: 'ignore',
        text: '不比。走自己的',
        outcomes: [
          {
            weight: 1,
            text: '你不去关心他的进度。这让你这一年过得平静得多。\n\n**你仍然会知道他的每一个消息**——这一行太小了,不比较是一种选择,不知道不是。',
            effects: [
              { stats: { state: 4, method: 2 } },
              { setFlag: 'rival_appeared' },
              // **这里才真的把他变成一个对象。** flag 只说明遇到过,
              // 而 13.1 要的是一个有自己数值、每年都在推进的人。
              // (`{ op: 'meet' }` 只标记意图,抽哪个原型要 RNG,在引擎里做)
              { rival: { op: 'meet' } },
              { setFlag: 'refuses_to_compare' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ev_seed_rival_first_crossing',
    pools: ['undergrad'],
    category: 'social',
    
    // 第一次交汇:大三"谁跟着导师做正式课题"
    // 不能锁死 2017:玩家可能大三才进实验室,那时"竞争者出场"本身就在 2017,
    // 而事件抽取发生在回合开始,同一年不可能既出场又交汇。
    trigger: { all: [{ year: { from: 2017 } }, { flag: 'rival_appeared' }] },
    order: 14,
    tier: 'major',
    title: '第一次交汇:谁跟着做那个正式课题',
    text: '导师申到了一个面上项目,要带一个本科生进正式课题组——署名、经费、有可能出一篇文章。\n\n名额一个。你们两个都在候选里。\n\n导师在组会后把你们叫过去,说:"你们自己商量一下。"\n\n他不是在偷懒。他是在看你们怎么处理这件事。',
    contextLines: [
      { text: '这是你人生中第一次和一个具体的人竞争一个具体的位置。' },
      { condition: { flag: 'rival_is_friend' }, text: '你们上周还在一起读文献。' },
      { condition: { flag: 'mastered_stats' }, text: '你的统计比他扎实,这件事导师知道。' },
      { condition: { flagNum: { key: 'favor_owed_senior', op: '>=', value: 2 } }, text: '师姐大概能替你说句话。你不确定要不要用这个。' },
    ],
    choices: [
      {
        id: 'make_the_case',
        text: '直接去跟导师讲你为什么更合适',
        outcomes: [
          {
            weight: 2,
            text: '你讲了三点:统计基础、这一年的出勤、以及你对那个具体假设的想法。\n\n导师说"我知道了"。三天后名单出来,是你。\n\n**你没有做任何不体面的事,而你确实抢走了一个别人也想要的位置。** 这两件事第一次同时成立,以后还有很多次。',
            effects: [
              { stats: { capital: 6, method: 2, state: -2 } },
              { setFlag: 'won_first_crossing' },
              { setFlag: 'in_formal_project' },
            ],
          },
          {
            weight: 2,
            text: '你讲了,他也讲了。名单出来是他。\n\n导师后来单独跟你说:"你差的不是能力,是他去年暑假留下来做了两个月。"\n\n**这个理由让你没法生气,也没法安慰自己。**',
            effects: [
              { stats: { method: 2, state: -6 } },
              { setFlag: 'lost_first_crossing' },
              { addFlag: { key: 'burnout', delta: 6, min: 0, max: 100 } },
            ],
          },
        ],
      },
      {
        id: 'negotiate_together',
        text: '找他商量,提议一起做、分工署名',
        visibleIf: { flag: 'rival_is_friend' },
        outcomes: [
          {
            weight: 2,
            text: '你们一起去找导师,提了一个分工方案:他做设计,你做分析,共同署名。\n\n导师同意了,而且说了句"这个提法挺成熟"。\n\n**这是最好的结果,而它只可能发生在你们之前一起读过一年文献的情况下。**',
            effects: [
              { stats: { capital: 5, method: 3, state: 2 } },
              { setFlag: 'won_first_crossing' },
              { setFlag: 'in_formal_project' },
              { setFlag: 'shared_first_project' },
            ],
          },
          {
            weight: 1,
            text: '你提了,他犹豫了一下说"我想自己做"。\n\n他有权这么说。你们那周的读文献小组照常进行,但气氛不一样了,而且再也没有回去过。',
            effects: [
              { stats: { state: -4, method: 1 } },
              { setFlag: 'lost_first_crossing' },
              { setFlag: 'friendship_cooled' },
            ],
          },
        ],
      },
      {
        id: 'step_back',
        text: '让给他,你去做别的',
        outcomes: [
          {
            weight: 1,
            text: '你说"让他做吧,我今年想先把统计学扎实"。\n\n导师看了你一会儿,说"行"。然后他给了你另一件事:帮他整理一个数据库。那件事没有署名,但你在那三个月里把数据处理练得很熟。\n\n**这不是一个错误的选择,只是它的回报晚两年才到,而且没有人会知道你让过。**',
            effects: [
              { stats: { method: 5, capital: -1, state: 1 } },
              { setFlag: 'lost_first_crossing' },
              { setFlag: 'stepped_back_once' },
            ],
          },
        ],
      },
    ],
  },

  // 选完导师后的下一幕必须承接“已经选定”这个事实，不能再让玩家重新打听一遍。
  {
    id: 'ev_seed_first_rumor',
    pools: ['undergrad'],
    category: 'social',
    mandatory: true,
    trigger: { year: { from: 2017, to: 2017 } },
    order: 16,
    title: '第一次坐进{{advisor}}的组会',
    text: '人已经选定了。周三下午，你抱着电脑坐到{{advisor}}组会的最后一排。\n\n师兄师姐轮流汇报，很多词你还听不懂；但你第一次看见，这位老师怎样追问、怎样否定，也怎样在学生卡住时把问题拆小。\n\n**网页上没有写的那部分，现在就在你面前。**',
    contextLines: [
      { text: '打听告诉你别人怎样描述一个导师，组会让你开始形成自己的判断。' },
      { condition: { flag: 'asked_around_once' }, text: '你刚才听来的几句话，有一部分正在得到印证，也有一部分还看不出来。' },
      { condition: { flag: 'has_senior_channel' }, text: '师姐进门时朝你点了点头。至少在这间屋里，你不是一个人都不认识。' },
    ],
    choices: [
      {
        id: 'prepare_with_senior',
        text: '照师姐提醒的，提前读完今天要讲的论文',
        visibleIf: { flag: 'has_senior_channel' },
        outcomes: [
          {
            weight: 2,
            text: '大部分内容仍然很难，但你至少知道大家争的是哪一个问题。会后师姐说：“第一次能跟到这里已经不错了。”',
            effects: [{ stats: { capital: 3, method: 1 } }, { setFlag: 'first_lab_meeting_done' }],
          },
          {
            weight: 1,
            text: '你查了两晚，会上还是没跟上。可当老师问“这篇最薄弱的地方是什么”时，你认出了作者自己写在最后的那条局限。',
            effects: [{ stats: { capital: 2, method: 2 } }, { setFlag: 'first_lab_meeting_done' }],
          },
        ],
      },
      {
        id: 'take_notes',
        text: '先把听不懂的词和追问全部记下来',
        outcomes: [
          {
            weight: 2,
            text: '散会时你记了三页，其中两页是问号。回去逐个查完以后，你终于能复述今天那项研究究竟想回答什么。',
            effects: [{ stats: { capital: 2, state: -2 } }, { setFlag: 'first_lab_meeting_done' }],
          },
          {
            weight: 1,
            text: '你没能记全结论，却记住了老师连续追问的三个“为什么”。后来你发现，组会真正教人的常常不是答案，而是怎么继续问。',
            effects: [{ stats: { method: 3, capital: 1 } }, { setFlag: 'first_lab_meeting_done' }],
          },
        ],
      },
      {
        id: 'ask_after_meeting',
        text: '散会后留下，问一个刚才没听懂的问题',
        outcomes: [
          {
            weight: 2,
            text: '师兄先替你解释了一遍，{{advisor}}又补了一句：“下次先把这个概念查清楚再来。”语气不轻，但答案是认真的。',
            effects: [{ stats: { method: 2, capital: 1 } }, { setFlag: 'first_lab_meeting_done' }],
          },
          {
            weight: 1,
            text: '{{advisor}}反问你：“你觉得它为什么要这样设计？”你答得断断续续。五分钟后，你带着一个更具体的问题离开了。',
            effects: [{ stats: { method: 2, capital: 1, state: -2 } }, { setFlag: 'first_lab_meeting_done' }],
          },
        ],
      },
    ],
  },

];
