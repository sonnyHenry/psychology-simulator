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
              { setFlag: 'has_senior_channel' },
            ],
          },
          {
            weight: 1,
            text: '她说不用了,忙。你把奶茶放在她桌上就走了。\n\n**人情账最麻烦的地方是:你还不上的时候它不会消失,只会记着。**',
            effects: [
              { stats: { capital: 2, state: -1 } },
              { addFlag: { key: 'favor_owed_senior', delta: 1, min: 0, max: 5 } },
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
              { setFlag: 'rival_is_friend' },
            ],
          },
          {
            weight: 1,
            text: '你提议了,他答应了,但只坚持了三周——他自己看得更快,不需要你。\n\n他没有恶意。这就是差距在早期的样子:**它先表现为节奏不同,后来才表现为结果不同。**',
            effects: [
              { stats: { method: 3, state: -2 } },
              { setFlag: 'rival_appeared' },
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
              { addFlag: { key: 'burnout', delta: 8, min: 0, max: 100 } },
            ],
          },
          {
            weight: 1,
            text: '你追了半年,然后在某个熬到两点的晚上突然不想追了。\n\n你把台灯关掉,坐在黑着的屋子里想了很久。**第二天你去问了导师一个跟他完全没关系的问题。**',
            effects: [
              { stats: { method: 3, state: -2 } },
              { setFlag: 'rival_appeared' },
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

  // ── 种子三:第一次打听(大三)─────────────────────────────
  {
    id: 'ev_seed_first_rumor',
    pools: ['undergrad'],
    category: 'social',
    mandatory: true,
    trigger: { year: { from: 2017, to: 2017 } },
    order: 16,
    title: '进组之前,你第一次去打听一个人',
    text: '你要选导师了。学院网站上每个老师的页面长得都差不多:研究方向、代表论文、承担项目。\n\n**这些页面唯一不写的,就是你真正需要知道的那件事。**\n\n于是你开始打听。你找到了三个人:一个刚毕业的师姐、一个在读的师兄、还有一个跟你不太熟但据说很知情的同班同学。',
    // 师姐那条线要有 `has_senior_channel` 才问得到。**开场白不能许诺一个玩家没有的选项**——
    // 说"你找到了三个人"却只给两个可问的人,读起来像 bug,实际上也是。
    presentationVariants: [
      {
        condition: { not: { flag: 'has_senior_channel' } },
        title: '进组之前,你第一次去打听一个人',
        text: '你要选导师了。学院网站上每个老师的页面长得都差不多:研究方向、代表论文、承担项目。\n\n**这些页面唯一不写的,就是你真正需要知道的那件事。**\n\n于是你开始打听。但你能找到的人不多:一个在读的师兄,还有一个跟你不太熟但据说很知情的同班同学。\n\n**已经毕业的人才敢说真话,而你一个都不认识。**',
      },
    ],
    contextLines: [
      { text: '这是这一行最重要的一项技能,而它不在任何一门课的教学大纲里。' },
      { condition: { flag: 'has_senior_channel' }, text: '师姐那条线你已经有了,而且她欠你一顿饭的人情正好可以用。' },
      { condition: { flag: 'lab_years' }, text: '你在实验室待了两年,组里的事你本来就知道一些。' },
    ],
    choices: [
      {
        id: 'ask_the_graduate',
        text: '问那个刚毕业的师姐',
        visibleIf: { flag: 'has_senior_channel' },
        outcomes: [
          {
            weight: 2,
            text: '她想了几秒,说:\n\n> "老师很忙,但资源是真的多。你要能自己推着自己走。"\n\n(她是去年毕业的。她没有说她延期过一年。)\n\n**这就是情报的样子:原话是真的,括注里的东西她没说。** 你以后每一次打听都会是这个结构。',
            effects: [
              { stats: { capital: 3, method: 1 } },
              { setFlag: 'asked_around_once' },
              { addFlag: { key: 'rumors_heard', delta: 1, min: 0, max: 20 } },
            ],
          },
          {
            weight: 1,
            text: '她说:"这个我不太好说。你自己去组会坐一次。"\n\n**"不太好说"本身就是一条情报**,而且是可靠性最高的那一类。你听懂了。',
            effects: [
              { stats: { capital: 2, method: 2 } },
              { setFlag: 'asked_around_once' },
              { setFlag: 'read_between_lines' },
              { addFlag: { key: 'rumors_heard', delta: 1, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'ask_the_classmate',
        text: '问那个据说很知情的同班同学',
        outcomes: [
          {
            weight: 2,
            text: '他讲了十分钟,信息量很大:谁组里压榨、谁给一作、谁去年有个学生退学。\n\n(他讲的这些,有一半是他从别人那里听来的。)\n\n**成本最低的情报也最不可靠**,而你在这个阶段分不出哪一半是真的。',
            effects: [
              { stats: { capital: 2, state: -2 } },
              { setFlag: 'asked_around_once' },
              { setFlag: 'heard_unreliable_rumor' },
              { addFlag: { key: 'rumors_heard', delta: 2, min: 0, max: 20 } },
            ],
          },
          {
            weight: 1,
            text: '他说的和你自己观察到的完全对不上。你去核了一件事,发现他讲错了。\n\n**你从此对"据说很知情的人"打了个折。** 这个折扣以后省了你很多麻烦。',
            effects: [
              { stats: { method: 3, capital: 1 } },
              { setFlag: 'asked_around_once' },
              { setFlag: 'verifies_rumors' },
              { addFlag: { key: 'rumors_heard', delta: 1, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'ask_the_senior_student',
        text: '问那个还在读的师兄',
        outcomes: [
          {
            weight: 2,
            text: '他说了很多好话,而且说得很快。\n\n"挺好的老师,资源也多,你来肯定没问题。"\n\n(他还有两年毕业,而他的毕业得这个老师签字。)\n\n**在读的人不能说真话,这不是人品问题,是位置问题。** 你以后打听的第一件事会变成:这个人还归不归他管。',
            effects: [
              { stats: { method: 2, capital: 1 } },
              { setFlag: 'asked_around_once' },
              { setFlag: 'learned_who_can_speak' },
              { addFlag: { key: 'rumors_heard', delta: 1, min: 0, max: 20 } },
            ],
          },
          {
            weight: 1,
            text: '他讲了二十分钟的好话,然后在你要走的时候补了一句:\n\n> "你要是想清楚了再来,别到时候后悔。"\n\n这句话他压低了声音。**你当时没听懂,两年后懂了。**',
            effects: [
              { stats: { method: 2, capital: 1, state: -2 } },
              { setFlag: 'asked_around_once' },
              { setFlag: 'heard_the_warning' },
              { addFlag: { key: 'rumors_heard', delta: 2, min: 0, max: 20 } },
            ],
          },
        ],
      },
      {
        id: 'sit_in',
        text: '不打听,直接去蹭一次组会',
        outcomes: [
          {
            weight: 1,
            text: '你坐在最后一排听了两个小时。你看到导师怎么问问题、学生怎么回答、有人被问住的时候屋里是什么气氛。\n\n**这两个小时比十条情报都准。** 代价是你只能看到一个组,而打听可以覆盖五个。',
            effects: [
              { stats: { method: 3, capital: 2 } },
              { setFlag: 'sat_in_lab_meeting' },
            ],
          },
        ],
      },
      {
        id: 'skip_it',
        text: '不打听。看官网和论文自己判断',
        outcomes: [
          {
            weight: 1,
            text: '你按论文数、分区、项目级别排了个序,选了最高的那个。\n\n**这个方法不算错,而且它有一个很大的优点:公平。** 它的缺点要到研二才显现——那时候你会发现,论文数和"这个人怎么带学生"之间没有相关。',
            effects: [
              { stats: { method: 3, state: 1, capital: -1 } },
              { setFlag: 'chose_by_metrics' },
            ],
          },
        ],
      },
    ],
  },
];
