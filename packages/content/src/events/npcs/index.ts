import type { Effect, GameEvent } from '@psy-sim/core';

interface BeatChoice {
  id: string;
  text: string;
  outcome: string;
  tag: string;
  favor: number;
  effects: Effect[];
  /** 高好感时才结成专属关系；普通收束仍然推进到终态。 */
  special?: { flag: string; favorAtLeast: number };
}

interface Beat {
  id: string;
  npcId: string;
  yearFrom: number;
  title: string;
  text: string;
  nextStage: string;
  choices: [BeatChoice, BeatChoice];
  tier?: 'major';
}

/**
 * 同期人物事件不进普通池，由 NpcDef 当前阶段直接点名；一轮最多播一条，撞车会顺延。
 * 每个 outcome 都推进阶段，避免玩家因为选了另一边而把整条人物线选断。
 */
function beat(def: Beat): GameEvent {
  return {
    id: def.id,
    pools: [],
    category: 'npc',
    once: true,
    tier: def.tier,
    trigger: { year: { from: def.yearFrom } },
    title: def.title,
    text: def.text,
    choices: def.choices.map(choice => {
      const effects: Effect[] = [
        ...choice.effects,
        { npcFavor: def.npcId, delta: choice.favor },
        { npcStage: def.npcId, stage: def.nextStage },
      ];
      const outcome = {
        weight: 1,
        outcomeTag: choice.tag,
        text: choice.outcome,
        effects,
      };
      return {
        id: choice.id,
        text: choice.text,
        outcomes: choice.special
          ? [
              {
                ...outcome,
                condition: { npcFavor: def.npcId, op: '>=' as const, value: choice.special.favorAtLeast },
                effects: [...effects, { setFlag: choice.special.flag }],
              },
              {
                ...outcome,
                condition: { npcFavor: def.npcId, op: '<' as const, value: choice.special.favorAtLeast },
              },
            ]
          : [outcome],
      };
    }),
  };
}

export const npcEvents: GameEvent[] = [
  // ══════════ 同门师姐：带你入门的人，也会先走到你前面那几年 ══════════
  beat({
    id: 'ev_npc_senior_2016', npcId: 'npc_senior_sister', yearFrom: 2016, nextStage: 'extension',
    title: '她教你报那笔被试费',
    text: '师姐把报销系统打开，指着三张几乎一样的表：“这张错一个格就会整单退回来。”\n\n她替你圈完，又赶去跑自己的第六个被试。**你第一次看见研究里那些不会写进方法部分的工作。**',
    choices: [
      { id: 'learn', text: '坐下来把流程记完整', outcome: '你把每一步写进本子。一个月后，另一个本科生来问，你已经能替她讲一遍。', tag: 'senior_warm', favor: 5, effects: [{ stats: { method: 2, capital: 1 } }] },
      { id: 'leave_it', text: '把材料都交给她处理', outcome: '单子过了。后来她让你自己报第二笔时，你还是不知道附件该放哪。', tag: 'senior_cool', favor: -4, effects: [{ stats: { state: 2, method: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_senior_2019', npcId: 'npc_senior_sister', yearFrom: 2019, nextStage: 'crossroad', tier: 'major',
    title: '她延毕了',
    text: '毕业名单里没有师姐。她那篇稿子第二轮大修，补实验要再招一百二十个人。\n\n她说：“也就多一年。”说完低头把已经凉了的饭吃完。',
    choices: [
      { id: 'stay', text: '陪她把补实验拆成一张清单', outcome: '你们列到凌晨。清单没有让一年变短，但把“延毕”拆回了一个个可以做完的动作。', tag: 'senior_warm', favor: 7, effects: [{ stats: { capital: 2, state: -2 } }] },
      { id: 'reassure', text: '说“多一年也没什么”', outcome: '她笑了一下，说也是。你们都知道这句话不坏，只是它不用承担那一年的房租和解释。', tag: 'senior_cool', favor: -2, effects: [{ stats: { state: 1, clinical: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_senior_2021', npcId: 'npc_senior_sister', yearFrom: 2021, nextStage: 'other_side',
    title: '她手里有三个去向',
    text: '师姐拿到一个教职面试、一份大厂研究岗和一所海外实验室的短合同。\n\n“你觉得哪个像我？”她问。**你忽然发现，她是在拿自己的下一步给你预演。**',
    choices: [
      { id: 'ask_cost', text: '不替她选，问每条路最舍不得什么', outcome: '她讲了半个小时。最后说：“原来我不是不知道想要什么，我是不想付那个价。”', tag: 'senior_warm', favor: 5, effects: [{ stats: { clinical: 2, state: 1 } }] },
      { id: 'pick_academic', text: '说她做了这么久，应该留在学术界', outcome: '她点头。后来选了大厂，没有再问你的意见。她不是在否定你，只是不想再为离开辩护。', tag: 'senior_cool', favor: -3, effects: [{ stats: { capital: 1, clinical: -2 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_senior_2026', npcId: 'npc_senior_sister', yearFrom: 2026, nextStage: 'reunion',
    title: '这次轮到她问你近况',
    text: '你们隔了两年才吃上这顿饭。她已经很少谈论文，问的是你睡得怎么样、合同还有几年、现在谁替你报销。\n\n最后一个问题把你们都逗笑了。',
    choices: [
      { id: 'tell_truth', text: '把最难解释的那部分也讲出来', outcome: '她没有给建议，只说：“我那时候也这样，只是没人问。”账单最后还是她抢着付了。', tag: 'senior_warm', favor: 6, effects: [{ stats: { state: 4, capital: 1 } }] },
      { id: 'say_fine', text: '说都挺好的', outcome: '你们聊了行业、城市和共同认识的人。饭吃得很顺，真正想问的东西都留在了下一次。', tag: 'senior_cool', favor: -2, effects: [{ stats: { capital: 2, state: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_senior_2030', npcId: 'npc_senior_sister', yearFrom: 2028, nextStage: 'settled', tier: 'major',
    title: '会场外面',
    text: '散会后你在侧门看见师姐。她手里夹着会议证，站在风口，没有急着回去。\n\n“当年那张报销单，”她说，“你后来是不是也教过别人？”',
    choices: [
      { id: 'yes', text: '说起后来被你带过的那些人', outcome: '她听完说：“那就没白教。”你们都没有把这句话说成传承，它只是两个人在风口站了一会儿。', tag: 'senior_warm', favor: 8, effects: [{ stats: { capital: 3, state: 3 } }], special: { flag: 'npc_senior_bond', favorAtLeast: 54 } },
      { id: 'change_subject', text: '问她现在过得怎么样', outcome: '她说还行，真的还行。你们不再靠同一间实验室维持关系，也不需要证明当年有多重要。', tag: 'senior_cool', favor: 1, effects: [{ stats: { clinical: 2, state: 2 } }, { setFlag: 'npc_senior_closure' }] },
    ],
  }),

  // ══════════ 同期：不是影子竞争者的数值化替身，是与你一起被比较的那个人 ══════════
  beat({
    id: 'ev_npc_peer_2016', npcId: 'npc_rival', yearFrom: 2016, nextStage: 'lab_door',
    title: '你们一起读不懂那篇文章',
    text: '他借来的那篇文章有三页公式。你们在图书馆坐了一下午，最后确认两个人都没看懂。\n\n他把“没看懂”三个字写在页边。**这是你第一次看见他承认不会。**',
    choices: [
      { id: 'split', text: '一人补一半，下周再讲给对方', outcome: '第二周你们各自只讲明白了一半，拼起来刚好够继续往下读。', tag: 'peer_warm', favor: 5, effects: [{ stats: { method: 3, capital: 1 } }] },
      { id: 'pretend', text: '说大概意思已经懂了', outcome: '他点点头，也没再问。后来课堂讲到那一页，你们同时低下头翻书。', tag: 'peer_cool', favor: -2, effects: [{ stats: { state: 1, method: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_peer_2019', npcId: 'npc_rival', yearFrom: 2019, nextStage: 'first_output',
    title: '两封录取通知',
    text: '你们在同一天收到结果。他去的地方名气更大，你的方向更合。群里很快有人把两所学校排了个高低。\n\n他私聊你：“你是真的想做那个方向，对吧？”',
    choices: [
      { id: 'answer', text: '说是，也认真祝贺他', outcome: '他说谢谢。你们第一次没有沿着别人画的那条排序线说话。', tag: 'peer_warm', favor: 5, effects: [{ stats: { state: 3, capital: 1 } }] },
      { id: 'compare', text: '问他的导师今年有几个名额', outcome: '他把主页链接发来。你们又聊回了平台、论文和名额，这些更安全。', tag: 'peer_cool', favor: -1, effects: [{ stats: { method: 1, state: -2 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_peer_2022', npcId: 'npc_rival', yearFrom: 2022, nextStage: 'separate_tracks', tier: 'major',
    title: '他的名字先出现在目录里',
    text: '会议日程公布，他有一个口头报告。你的是墙报。\n\n他发消息说晚上一起吃饭，后面跟了句：“其实那篇也就那样。”**安慰和炫耀有时用同一句话。**',
    choices: [
      { id: 'go', text: '去吃饭，不谈报告档次', outcome: '你们聊到闭店。第二天他站在台上卡了一次词，第一眼看的是你坐的方向。', tag: 'peer_warm', favor: 6, effects: [{ stats: { capital: 2, state: 2 } }] },
      { id: 'skip', text: '说自己要改墙报', outcome: '你的墙报改得更清楚了。晚上十一点，他发来的餐厅定位还停在聊天框里。', tag: 'peer_cool', favor: -4, effects: [{ stats: { method: 3, state: -2 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_peer_2027', npcId: 'npc_rival', yearFrom: 2026, nextStage: 'colleague',
    title: '同一份短名单',
    text: '转发来的评选短名单没有隐藏其他候选人。你在第二行看到他的名字。\n\n十分钟后他发来一个句号，又撤回了。',
    choices: [
      { id: 'call', text: '给他打电话，把尴尬说开', outcome: '你们约好各凭材料，不交换面试信息。挂电话前他说：“至少别让别人替我们演成仇人。”', tag: 'peer_warm', favor: 7, effects: [{ stats: { state: 3, clinical: 2 } }] },
      { id: 'silence', text: '当作没看见', outcome: '面试那天你们在走廊点了下头。所有人都很专业，专业得像你们从来没有一起读不懂过一篇文章。', tag: 'peer_cool', favor: -5, effects: [{ stats: { capital: 2, state: -3 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_peer_2032', npcId: 'npc_rival', yearFrom: 2028, nextStage: 'settled', tier: 'major',
    title: '现在你们都坐在评审桌这边',
    text: '评审会结束，你们留下来收材料。桌上是比你们年轻十岁的一批申请人，每个人都被压成论文数、推荐信和一页陈述。\n\n他说：“我们当年是不是也看起来这么薄？”',
    choices: [
      { id: 'remember', text: '把当年撤回的那个句号讲出来', outcome: '他愣了两秒，大笑。你们终于能把那几年当成共同经历，而不只是彼此的排名。', tag: 'peer_warm', favor: 8, effects: [{ stats: { state: 4, capital: 2 } }], special: { flag: 'npc_peer_bond', favorAtLeast: 64 } },
      { id: 'keep_working', text: '说先把材料收完', outcome: '你们把文件按编号装回袋子。关系没有坏，只是一直停在最擅长的那种合作里。', tag: 'peer_cool', favor: 0, effects: [{ stats: { method: 2, state: 1 } }, { setFlag: 'npc_peer_closure' }] },
    ],
  }),

  // ══════════ 那位老师：十八岁时看过主页，后来才知道主页装不下一个人 ══════════
  beat({
    id: 'ev_npc_teacher_2016', npcId: 'npc_advisor_to_be', yearFrom: 2016, nextStage: 'office_hour',
    title: '他终于认出了你',
    text: '课后你拿着一页实验设计去问问题。那位老师看了页眉，说：“你是不是上学期也来问过一次？”\n\n其实没有。**但你第一次从主页上的名字变成了他眼前的学生。**',
    choices: [
      { id: 'correct', text: '说不是，然后继续问设计', outcome: '他停了一下，说抱歉。后面二十分钟讲得很具体，还在页边画了一个你后来一直留着的框。', tag: 'teacher_warm', favor: 5, effects: [{ stats: { method: 3, capital: 1 } }] },
      { id: 'agree', text: '顺着说“对”', outcome: '谈话很顺利。出门以后你说不清他记住的是你，还是那个并不存在的上学期。', tag: 'teacher_cool', favor: 1, effects: [{ stats: { capital: 2, state: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_teacher_2019', npcId: 'npc_advisor_to_be', yearFrom: 2019, nextStage: 'reference',
    title: '一封只有四行的邮件',
    text: '你入学后收到他的邮件：“听说你去了那边。方向选得不错。别急着出结果，先把方法学扎稳。”\n\n总共四行，没有附件，也没有要求。',
    choices: [
      { id: 'reply', text: '认真回一封近况', outcome: '他第二天回了一个“好”。几年后你才明白，有些关系就是靠这种很轻的确认没有断掉。', tag: 'teacher_warm', favor: 4, effects: [{ stats: { state: 2, method: 1 } }] },
      { id: 'archive', text: '标成已读，等有成果再回', outcome: '你一直没有等到那个“够像成果”的节点。邮件留在收件箱里，偶尔搜索别的东西时会翻出来。', tag: 'teacher_cool', favor: -2, effects: [{ stats: { method: 1, state: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_teacher_2022', npcId: 'npc_advisor_to_be', yearFrom: 2022, nextStage: 'peer_review',
    title: '他把一个学生转给你',
    text: '那位老师问你能不能跟他的学生聊聊。对方也在做你现在的方向，卡在你两年前卡过的地方。\n\n“我不懂这块了，”他说得很直接。',
    choices: [
      { id: 'mentor', text: '约一小时，把踩过的坑都讲清楚', outcome: '那一小时用了两个半小时。学生走后，他说：“你现在比我更适合回答这个问题。”', tag: 'teacher_warm', favor: 6, effects: [{ stats: { capital: 3, state: -1 } }] },
      { id: 'send_papers', text: '发一份文献清单，让对方先自己看', outcome: '清单很完整，也确实够用。他谢谢你，没有再约第二次。', tag: 'teacher_cool', favor: -1, effects: [{ stats: { method: 2, state: 1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_teacher_2026', npcId: 'npc_advisor_to_be', yearFrom: 2026, nextStage: 'retirement',
    title: '主页上的数字不再更新了',
    text: '你偶然点开他的主页，论文列表停在两年前。后来才知道他生了一场病，课已经交给别人。\n\n十八岁时你以为老师会一直待在老师的位置上。',
    choices: [
      { id: 'visit', text: '回去看他', outcome: '他走得慢了，说话还是快。你们没有复盘什么人生，只在旧办公室里把那杯茶喝完。', tag: 'teacher_warm', favor: 7, effects: [{ stats: { clinical: 2, state: 2 } }] },
      { id: 'message', text: '发一条问候，不去打扰', outcome: '他回了谢谢，后面跟着一个很少见的句号。你尊重了距离，也不知道那个距离是不是他想要的。', tag: 'teacher_cool', favor: 0, effects: [{ stats: { state: 1, capital: 1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_teacher_2031', npcId: 'npc_advisor_to_be', yearFrom: 2027, nextStage: 'settled', tier: 'major',
    title: '页边那个框',
    text: '整理旧材料时，你翻到本科那页实验设计。纸已经发黄，页边那个框还在。\n\n你今天刚给一个年轻人画了几乎一样的框。',
    choices: [
      { id: 'send_photo', text: '拍下来发给他', outcome: '他回：“我不记得了，但你记得就好。”这不是你期待的回答，后来却成了你最喜欢的回答。', tag: 'teacher_warm', favor: 8, effects: [{ stats: { state: 4, capital: 1 } }], special: { flag: 'npc_teacher_bond', favorAtLeast: 35 } },
      { id: 'keep_page', text: '把那页重新放回文件夹', outcome: '你没有发消息。影响一个人不一定要被原来那个人知道，这件事仍然成立。', tag: 'teacher_cool', favor: 1, effects: [{ stats: { method: 2, state: 2 } }, { setFlag: 'npc_teacher_closure' }] },
    ],
  }),

  // ══════════ 室友：离你最近的人，未必走进同一个职业 ══════════
  beat({
    id: 'ev_npc_roommate_2015', npcId: 'npc_roommate', yearFrom: 2015, nextStage: 'second_year',
    title: '凌晨两点的台灯',
    text: '你背韦伯定律背到凌晨两点。下铺拉开帘子，说：“我明天第一节。”\n\n灯光确实照到了他那边。你也确实还差三章。',
    choices: [
      { id: 'move', text: '抱着书去走廊', outcome: '走廊很冷。第二天桌上多了一杯他替你带的豆浆，谁也没提那盏灯。', tag: 'roommate_warm', favor: 5, effects: [{ stats: { state: -1, capital: 2 } }] },
      { id: 'finish', text: '说再看二十分钟', outcome: '二十分钟变成五十分钟。他后来买了眼罩，你们都把这件事当成解决了。', tag: 'roommate_cool', favor: -5, effects: [{ stats: { method: 2, capital: -2 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_roommate_2018', npcId: 'npc_roommate', yearFrom: 2018, nextStage: 'different_city',
    title: '最后一晚谁也没收床帘',
    text: '明天搬走。地上堆着纸箱，墙上胶带撕下来留下四块浅色。\n\n你们聊了四年食堂和天气，今晚第一次聊毕业以后最怕什么。',
    choices: [
      { id: 'say_it', text: '把自己不确定的那部分说出来', outcome: '他说他也没有你以为的确定。两个人都没有答案，宿舍第一次显得不是一个临时房间。', tag: 'roommate_warm', favor: 7, effects: [{ stats: { state: 4, clinical: 1 } }] },
      { id: 'joke', text: '开玩笑说最怕押金不退', outcome: '他笑了。你们把最后一晚也过成了熟悉的样子，轻松，而且安全。', tag: 'roommate_cool', favor: -1, effects: [{ stats: { state: 2, clinical: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_roommate_2021', npcId: 'npc_roommate', yearFrom: 2021, nextStage: 'spare_bed',
    title: '他在你的城市出差',
    text: '他临时来三天，问能不能睡你这儿。你住的地方只有一张床和一张窄沙发，第二天还有组会、门诊或早班。',
    choices: [
      { id: 'host', text: '让他来，自己睡沙发', outcome: '三天里你们真正说话不到两小时。第四天醒来，桌上放着他买的新枕头。', tag: 'roommate_warm', favor: 6, effects: [{ stats: { capital: 2, state: -2 } }] },
      { id: 'hotel', text: '替他找附近的酒店', outcome: '你们吃了一顿饭，各自睡得很好。成年人的关系有时靠承认自己家里确实住不下维持。', tag: 'roommate_cool', favor: 0, effects: [{ stats: { state: 3, capital: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_roommate_2026', npcId: 'npc_roommate', yearFrom: 2026, nextStage: 'old_room',
    title: '原来的宿舍楼要拆了',
    text: '校友群发通知，老宿舍楼暑假拆除。有人提议回去拍张照。\n\n他只在群里回了一个“去”。',
    choices: [
      { id: 'return', text: '请一天假回去', outcome: '门锁已经换了。你们站在楼下，发现能准确指出四楼哪扇窗曾经属于你们。', tag: 'roommate_warm', favor: 6, effects: [{ stats: { state: 4, capital: 1 } }] },
      { id: 'ask_photo', text: '让他替你拍一张', outcome: '照片拍得很普通，楼、树、晾衣杆都在。你存了下来，从没发过朋友圈。', tag: 'roommate_cool', favor: -1, effects: [{ stats: { state: 1, method: 1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_roommate_2031', npcId: 'npc_roommate', yearFrom: 2028, nextStage: 'settled', tier: 'major',
    title: '他又住进你家三天',
    text: '十年后他又来你的城市。这次家里有多余的房间，门口却堆着你的工作材料。\n\n他把箱子推进去，说：“比上次条件好多了。”',
    choices: [
      { id: 'clear_weekend', text: '把周末空出来', outcome: '你们去了两个谁都不感兴趣的地方，聊的仍然是食堂和天气。能这样浪费时间，本身就是关系留下来的证据。', tag: 'roommate_warm', favor: 8, effects: [{ stats: { state: 5, capital: 1 } }], special: { flag: 'npc_roommate_bond', favorAtLeast: 69 } },
      { id: 'keep_schedule', text: '照常工作，把钥匙留给他', outcome: '他自己进出，走时把床单洗了。你们没有重新变回学生，也没有因此变成陌生人。', tag: 'roommate_cool', favor: 1, effects: [{ stats: { method: 2, state: 1 } }, { setFlag: 'npc_roommate_closure' }] },
    ],
  }),

  // ══════════ 高中同学：另一套时间表一直在旁边运行 ══════════
  beat({
    id: 'ev_npc_hometown_2015', npcId: 'npc_hometown_friend', yearFrom: 2015, nextStage: 'internship',
    title: '他已经在改第一版简历',
    text: '你还在适应大学，他已经报名一个商业分析比赛，简历上写了三行你看不懂的岗位词。\n\n他问：“你们专业暑假实习去哪？”你答不上来。',
    choices: [
      { id: 'ask_help', text: '请他也帮你做一版简历', outcome: '他把“参加实验”改成“协助数据采集”，又问你到底会什么。这个问题不太好听，但很有用。', tag: 'hometown_warm', favor: 5, effects: [{ stats: { capital: 3, state: -1 } }] },
      { id: 'dismiss', text: '说心理学不是靠实习的专业', outcome: '他说也是。后来他不再把招聘信息转给你，你也轻松了一阵。', tag: 'hometown_cool', favor: -4, effects: [{ stats: { state: 2, capital: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_hometown_2017', npcId: 'npc_hometown_friend', yearFrom: 2017, nextStage: 'first_job',
    title: '他问你要不要一起学 Python',
    text: '他报了一个周末班，问你要不要一起。你这学期有实验心理学、咨询见习和一份刚接下来的实验室工作。\n\n“每周六下午，就十二周。”',
    choices: [
      { id: 'join', text: '一起学', outcome: '十二周后你写不出完整项目，但已经不怕打开终端。后来这点差别在很多地方救过你。', tag: 'hometown_warm', favor: 5, effects: [{ stats: { method: 4, state: -2 } }] },
      { id: 'decline', text: '把时间留给本专业', outcome: '你在实验室多做了一轮数据。他进了第一份实习。两条路都往前走，只是开始用不同的单位计量。', tag: 'hometown_cool', favor: -1, effects: [{ stats: { clinical: 2, method: 1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_hometown_2020', npcId: 'npc_hometown_friend', yearFrom: 2020, nextStage: 'mortgage', tier: 'major',
    title: '他买房了',
    text: '视频里他把镜头转了一圈：六十多平方米，墙还是毛坯。\n\n他问你什么时候毕业。你说完那个年份，两个人都停了一下。',
    choices: [
      { id: 'congratulate', text: '认真问月供和通勤', outcome: '他算给你听，数字并不轻松。你第一次意识到“买房了”和“轻松了”不是同一句话。', tag: 'hometown_warm', favor: 6, effects: [{ stats: { clinical: 2, capital: 1 } }] },
      { id: 'compare', text: '说自己以后工作的城市还没定', outcome: '他说学术就是自由。你听得出那是羡慕，也听得出他并不知道这种自由具体是什么。', tag: 'hometown_cool', favor: -2, effects: [{ stats: { state: -3, method: 1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_hometown_2024', npcId: 'npc_hometown_friend', yearFrom: 2024, nextStage: 'same_table',
    title: '“你还在读书吗？”',
    text: '过年同桌吃饭，他随口问：“你还在读书吗？”\n\n问完马上补了一句：“不是，我知道你那叫工作。”补得越快，越说明这个问题存在很久了。',
    choices: [
      { id: 'explain', text: '把合同、收入和工作内容讲清楚', outcome: '他听完说：“原来你也不是一直在上课。”这句话很笨，却让你松了一口气。', tag: 'hometown_warm', favor: 5, effects: [{ stats: { state: 3, capital: 1 } }] },
      { id: 'laugh', text: '笑着说“差不多吧”', outcome: '话题很快转到孩子和房价。你省掉了一次解释，也让那条旧时间表继续替你们比较。', tag: 'hometown_cool', favor: -2, effects: [{ stats: { state: 1, clinical: -1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_hometown_2032', npcId: 'npc_hometown_friend', yearFrom: 2028, nextStage: 'settled', tier: 'major',
    title: '两张完全不同的十年',
    text: '高中毕业后的这些年，你们第一次又坐在操场看台。他讲换过的三家公司，你讲做废的课题、结束的个案或换过的岗位。\n\n任何一张履历单独拿出来，都看不见另一张替它照亮的部分。',
    choices: [
      { id: 'admit_envy', text: '承认有几年你很羡慕他', outcome: '他说他也一样，尤其是你还能说清自己为什么做一件事的时候。羡慕没有被抵消，只是终于变成了双向的。', tag: 'hometown_warm', favor: 8, effects: [{ stats: { state: 5, clinical: 2 } }], special: { flag: 'npc_hometown_bond', favorAtLeast: 57 } },
      { id: 'leave_unsorted', text: '不替这些年下结论', outcome: '你们起身去找下一场聚会。两种人生没有被排成先后，这已经足够难得。', tag: 'hometown_cool', favor: 2, effects: [{ stats: { state: 4, method: 1 } }, { setFlag: 'npc_hometown_closure' }] },
    ],
  }),

  // ══════════ 伴侣：不负责浪漫化职业成本，只让成本落到两个人身上 ══════════
  beat({
    id: 'ev_npc_partner_2016', npcId: 'npc_partner', yearFrom: 2016, nextStage: 'distance',
    title: '你又取消了周六',
    text: '实验室临时补被试，你把周六的约会取消。ta 回“好”，隔了十分钟又发：“你下次能不能早一点告诉我？”\n\n不是不支持，是等待也需要被安排。',
    choices: [
      { id: 'reschedule', text: '现在就定一个不会被工作占掉的晚上', outcome: '你把那晚写进日历，后来真的守住了。边界不是一句承诺，是有别的事来挤时仍然不挪。', tag: 'partner_warm', favor: 6, effects: [{ stats: { state: 3, capital: -1 } }] },
      { id: 'explain', text: '解释这个被试窗口有多难约', outcome: 'ta 听懂了项目，没等到一句关于自己的话。争执没有发生，失望也没有因此消失。', tag: 'partner_cool', favor: -5, effects: [{ stats: { method: 2, state: -2 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_partner_2019', npcId: 'npc_partner', yearFrom: 2019, nextStage: 'years_left', tier: 'major',
    title: '“你到底还要读几年？”',
    text: '你说完硕士、博士、博后几个词，ta 拿手机算了一遍。\n\n“所以最顺利也要到二十九岁？”\n\n你第一次发现，“顺利”在两个人的时间表里可以是相反的意思。',
    choices: [
      { id: 'draw_timeline', text: '把每个岔口和不确定性都摊开', outcome: '那张时间表没有让人安心，但从此不是只有你一个人知道它会怎么变。', tag: 'partner_warm', favor: 7, effects: [{ stats: { clinical: 2, state: 2 } }] },
      { id: 'promise', text: '保证自己会尽快', outcome: 'ta 点头。你给了一个谁都无法兑现的保证，接下来几年每次延期都会像你主动改口。', tag: 'partner_cool', favor: -6, effects: [{ stats: { state: -3, capital: 1 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_partner_2023', npcId: 'npc_partner', yearFrom: 2023, nextStage: 'two_maps',
    title: '两张地图',
    text: 'ta 的机会在南方，你的下一站可能在北方，也可能在另一个国家。\n\n你们把两张地图叠在一起，重合处只有几个谁都没有把握的点。',
    choices: [
      { id: 'both_apply', text: '各自都投，把结果留到结果出来以后', outcome: '申请季很长。你们没有提前牺牲任何一边，也因此把最后的决定压缩到了更短的时间里。', tag: 'partner_warm', favor: 4, effects: [{ stats: { capital: 2, state: -2 } }] },
      { id: 'one_city', text: '现在就定一个共同城市', outcome: '地图一下变小了。你们得到确定性，也都清楚有些没有投出的机会以后不能拿来算账。', tag: 'partner_cool', favor: -1, effects: [{ stats: { state: 3, capital: -2 } }] },
    ],
  }),
  beat({
    id: 'ev_npc_partner_2027', npcId: 'npc_partner', yearFrom: 2027, nextStage: 'shared_home', tier: 'major',
    title: '结果不是同时出来的',
    text: 'ta 的 offer 要求一周内答复。你的面试在三周后。\n\n谁都没有做错，两个机构也不会为了你们协调日历。**两体问题最残酷的部分常常只是截止日期。**',
    choices: [
      { id: 'accept_first', text: '先保住 ta 的，再处理你的', outcome: 'ta 接了。你的职位清单少了一半，多了一个具体可以回去的地址。', tag: 'partner_warm', favor: 7, effects: [{ stats: { state: 3, capital: -3 } }, { setFlag: 'has_partner' }] },
      { id: 'wait_for_mine', text: '请 ta 争取延期，等你的结果', outcome: '延期只批了五天。第五天晚上你们做了决定，此后很久都说不清那是共同决定还是共同承担。', tag: 'partner_cool', favor: -4, effects: [{ stats: { capital: 2, state: -4 } }, { setFlag: 'has_partner' }] },
    ],
  }),
  beat({
    id: 'ev_npc_partner_2032', npcId: 'npc_partner', yearFrom: 2028, nextStage: 'settled', tier: 'major',
    title: '那天 ta 没有问结果',
    text: '考核、晋升或项目结果出来那天，ta 先问你晚上想吃什么。\n\n十几年前，ta 不知道你在学什么。现在 ta 知道什么时候不先问工作。',
    choices: [
      { id: 'go_home', text: '关掉工作群，回家', outcome: '饭很普通。你讲了结果，也讲了结果之外的事。职业仍然占很大一块，但不再替你们命名全部生活。', tag: 'partner_warm', favor: 9, effects: [{ stats: { state: 6, clinical: 2 } }], special: { flag: 'npc_partner_bond', favorAtLeast: 72 } },
      { id: 'keep_working', text: '说还有材料要补完', outcome: 'ta 把饭留在锅里。你很晚才回去，灯还亮着。支持不是没有代价，只是那笔账一直没有被摊开。', tag: 'partner_cool', favor: -5, effects: [{ stats: { method: 3, state: -3 } }, { setFlag: 'npc_partner_closure' }] },
    ],
  }),
];
