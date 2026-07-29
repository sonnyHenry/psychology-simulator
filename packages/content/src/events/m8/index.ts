import type { Condition, Effect, GameEvent } from '@psy-sim/core';

/**
 * M8 配置专属内容。
 *
 * 这 80 幕不是继续扩张公共随机池，而是给背景、特质、人生目标、导师原型、
 * 临床取向与二级职业出口补“只有这套构筑才看得见”的短场景。每条标题、正文与
 * 结果均手写；下面的 helper 只复用事件结构，不在运行时生成文案。
 */
interface ConfiguredScene {
  id: string;
  pools: string[];
  condition: Condition;
  from: number;
  to?: number;
  title: string;
  text: string;
  choice: string;
  result: string;
  category: string;
  effects?: Effect[];
  weight?: number;
}

const ALL_LIFE_POOLS = [
  'undergrad', 'grad', 'postdoc', 'tenure', 'left_academia',
  'clinical_grad', 'clinical_common', 'clinical_practice', 'clinical_late',
  'hospital_grad', 'hospital_common', 'hospital_practice', 'hospital_late',
  'school', 'school_late', 'industry', 'industry_late', 'left', 'left_late',
];

const POST_CROSSROAD_POOLS = ALL_LIFE_POOLS.filter(pool => pool !== 'undergrad');

function configured(scene: ConfiguredScene): GameEvent {
  return {
    id: `ev_m8_${scene.id}`,
    pools: scene.pools,
    title: scene.title,
    text: scene.text,
    category: scene.category,
    once: true,
    weight: scene.weight ?? 2,
    trigger: {
      all: [scene.condition, { year: { from: scene.from, to: scene.to } }],
    },
    choices: [{
      id: 'continue',
      text: scene.choice,
      outcomes: [{
        weight: 1,
        text: scene.result,
        effects: scene.effects ?? [{ stats: { state: 1 } }],
      }],
    }],
  };
}

const backgroundScenes: ConfiguredScene[] = [
  {
    id: 'bg_urban_dinner_schedule', pools: ALL_LIFE_POOLS, condition: { background: 'bg_urban_middle' }, from: 2016, to: 2018,
    title: '一家人的共享日历', text: '父母把你的考试周、他们的出差和外婆的复诊放进同一个家庭日历。每件事都有负责人，也都默认能被安排好。',
    choice: '把实验室招募也写进去', result: '父亲问“被试”算不算工作。你说算。那一格从此没有再被拿来安排聚餐。', category: 'family', effects: [{ stats: { state: 2, capital: 1 } }],
  },
  {
    id: 'bg_urban_down_payment', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_urban_middle' }, from: 2020, to: 2024,
    title: '“首付我们可以先准备”', text: '你还不知道下一站在哪座城市，父母已经开始讨论一套小房子的首付。他们不是催你，只是不习惯一件大事没有时间表。',
    choice: '说明未来三年都定不下来', result: '电话那头安静了一会儿。钱仍然在那里，确定性没有因为有钱就出现。', category: 'family', effects: [{ stats: { state: 1, money: 8000 } }],
  },
  {
    id: 'bg_urban_care_budget', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_urban_middle' }, from: 2027,
    title: '第一次反过来做预算', text: '父母说退休金够用，让你别管。你打开表格，第一次把他们未来的医疗和自己的不稳定合同放在同一列里。',
    choice: '每月固定留出一笔', result: '这笔钱暂时没有用途。它让你看见，中产家庭的安全感也需要下一代继续维护。', category: 'family', effects: [{ stats: { state: 2 } }, { moneyCost: { rate: 0.02, max: 12000, reason: 'family' } }],
  },
  {
    id: 'bg_county_phone_directory', pools: ALL_LIFE_POOLS, condition: { background: 'bg_county_system' }, from: 2016, to: 2018,
    title: '那本还在用的通讯录', text: '父亲问你们学院书记姓什么。你说不知道。他说没关系，又翻了一遍那本用圆珠笔改过很多次的通讯录。',
    choice: '告诉他学校不是这样办事的', result: '他说知道，只是想问问。你们都没有继续解释各自理解的“问问”。', category: 'family', effects: [{ stats: { state: 1, capital: 1 } }],
  },
  {
    id: 'bg_county_exam_advice', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_county_system' }, from: 2020, to: 2024,
    title: '“要不顺手考个编”', text: '家里转来一张本地事业单位招考截图，岗位要求写着心理学类。报名截止就在下周，和你的数据截止是同一天。',
    choice: '把招考表存下来', result: '你没有报名，也没有删除。一个确定的入口放在手机里，会让正在走的路显得更像主动选择。', category: 'career', effects: [{ stats: { state: 2, capital: 1 } }],
  },
  {
    id: 'bg_county_transfer_window', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_county_system' }, from: 2027,
    title: '调动窗口只有半个月', text: '家里说县里新设了心理服务岗位，错过这批以后未必再有。你的现合同还剩两年，下一份合同连城市都没有。',
    choice: '认真问完编制与工作内容', result: '岗位比想象复杂，也比想象真实。你没有回去，但不再把“回去”当成一句失败的同义词。', category: 'career', effects: [{ stats: { capital: 2, state: 2 } }],
  },
  {
    id: 'bg_rural_train_ticket', pools: ALL_LIFE_POOLS, condition: { background: 'bg_rural' }, from: 2016, to: 2018,
    title: '硬座是晚上十一点开', text: '最便宜的票要坐十四小时。你把到站时间发回家，母亲回“到县里再说”，因为最后那段车现在还买不了。',
    choice: '把电脑和量表塞进行李最里面', result: '一路上你没打开电脑。那十四小时不是休息，是两种生活之间真实的距离。', category: 'family', effects: [{ stats: { state: -1, money: 500 } }],
  },
  {
    id: 'bg_rural_fieldwork_home', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_rural' }, from: 2019, to: 2022,
    title: '村里成了你的“研究现场”', text: '同门说农村样本难招，问你能不能回家联系。你知道谁会帮忙，也知道他们答应可能只是因为认得你家。',
    choice: '先把知情同意讲给联系人听', result: '有人听完说“这么麻烦就算了”。样本少了，留下的人第一次不是被人情推到问卷前。', category: 'method', effects: [{ stats: { method: 3, capital: -1 } }],
  },
  {
    id: 'bg_rural_family_ledger', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_rural' }, from: 2026,
    title: '家里的账没有表格', text: '父亲说今年收成一般，又立刻补一句“你不用管”。你知道这句话里没有一个可以直接填进预算的数字。',
    choice: '把能承担的上限说具体', result: '具体数字让两边都轻松了一点。支持不再靠猜，也没有因此变得不近人情。', category: 'family', effects: [{ stats: { state: 3, money: -8000 } }],
  },
  {
    id: 'bg_doctor_ward_language', pools: ALL_LIFE_POOLS, condition: { background: 'bg_doctor_family' }, from: 2016, to: 2018,
    title: '饭桌上的会诊语气', text: '父母讨论一个病例时语速很快，轮到你说实验设计，他们同时慢下来，像在听一个还没有临床意义的指标。',
    choice: '把研究问题讲完', result: '他们没有被说服，但开始问测量误差。专业之间第一次不是高低，而是两套证据标准。', category: 'family', effects: [{ stats: { method: 2, state: 1 } }],
  },
  {
    id: 'bg_doctor_pandemic_roster', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_doctor_family' }, from: 2020, to: 2021,
    title: '排班表上的名字', text: '封控最紧的时候，父母都在医院。你知道他们的班次，却不知道该在几点打电话才不会打断工作。',
    choice: '每天只发一句报平安', result: '回复有时到凌晨才来。你第一次发现，懂医疗并不会让等待变得更专业。', category: 'family', effects: [{ stats: { clinical: 2, state: -2 } }],
  },
  {
    id: 'bg_doctor_title_comparison', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_doctor_family' }, from: 2027,
    title: '两套职称表', text: '母亲问你的考核到底看什么。你把材料目录发过去，她看了很久，说和医院那套很像，又完全不一样。',
    choice: '请她讲当年的第一次晋升', result: '她讲的是名额、科室和一个没赶上的年份。你们终于在相似的压力里说同一种语言。', category: 'career', effects: [{ stats: { capital: 2, state: 2 } }],
  },
  {
    id: 'bg_teacher_lesson_plan', pools: ALL_LIFE_POOLS, condition: { background: 'bg_teacher_family' }, from: 2016, to: 2018,
    title: '父亲替你看了教案', text: '你第一次试讲，把课件发回家。父亲没有改知识点，只圈出三页，说：“这里学生会走神。”',
    choice: '按他的圈重排一遍', result: '试讲那天那三页确实最顺。教学经验没有论文引用，却能准确预测一间教室。', category: 'teaching', effects: [{ stats: { capital: 2, state: 1 } }],
  },
  {
    id: 'bg_teacher_parent_question', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_teacher_family' }, from: 2021, to: 2024,
    title: '家长群里有人问起心理筛查', text: '母亲截来一段家长群争论，问你学校该不该做筛查。她不是请你站队，是想知道该怎么向家长解释边界。',
    choice: '写一段她能直接转发的话', result: '你删了三遍术语。最后那段没有显得更浅，只是终于能在一个真实的家长群里被读完。', category: 'social', effects: [{ stats: { clinical: 2, capital: 2 } }],
  },
  {
    id: 'bg_teacher_retirement_desk', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_teacher_family' }, from: 2027,
    title: '讲台下来的那一年', text: '父亲退休后把教参装进三个纸箱，说以后用不上了。你看见每一本里都有学生名字和只有他懂的记号。',
    choice: '留下一本最旧的', result: '那不是权威教材，只是一份做过三十年的工作的痕迹。你把它放在自己的书架上。', category: 'family', effects: [{ stats: { state: 4 } }],
  },
  {
    id: 'bg_illness_missed_call', pools: ALL_LIFE_POOLS, condition: { background: 'bg_illness_at_home' }, from: 2016, to: 2018,
    title: '连续三个未接来电', text: '实验结束后你看见家里的三个未接来电。回过去之前那十秒，你已经在脑子里排完了最坏的几种可能。',
    choice: '先回电话，再保存数据', result: '只是问你医保卡放哪了。你松下来，也知道这种预演不会因为这次没事就消失。', category: 'family', effects: [{ stats: { state: -2, clinical: 1 } }],
  },
  {
    id: 'bg_illness_appointment_number', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_illness_at_home' }, from: 2019, to: 2022,
    title: '挂号成功的短信', text: '你在组会中途刷到了那个一直约不到的号。手机亮了一下，台上还在讨论你的模型为什么不收敛。',
    choice: '出去把预约确认完', result: '回来时讨论已经到下一页。你少听了一段，也保住了一件不能等散会再做的事。', category: 'family', effects: [{ stats: { state: 1, method: -1 } }],
  },
  {
    id: 'bg_illness_care_calendar', pools: POST_CROSSROAD_POOLS, condition: { background: 'bg_illness_at_home' }, from: 2026,
    title: '照护也有交接表', text: '家里几个人终于把复诊、取药和陪护排进一张表。你排到的那周正好撞上考核或最满的预约日。',
    choice: '不交换，按表回去', result: '工作没有因此理解你。家里第一次不用靠谁临时牺牲来维持。', category: 'family', effects: [{ stats: { state: 2, capital: -1, money: -5000 } }],
  },
];

const traitScenes: ConfiguredScene[] = [
  {
    id: 'trait_rigorous_version_log', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_rigorous' }, from: 2017, to: 2024,
    title: '你给文件名加上了日期', text: '别人都在用 final、final2 和 final_new。你从第一天开始留版本记录，当时显得有点多余。',
    choice: '把规则也发给合作者', result: '半年后第一次需要回滚时，没有人再觉得那套命名麻烦。', category: 'method', effects: [{ stats: { method: 3, state: 1 } }],
  },
  {
    id: 'trait_empathic_after_room', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_empathic' }, from: 2017, to: 2024,
    title: '你最后一个离开房间', text: '讨论结束，所有人都收起电脑。你注意到刚才一直没说话的人还坐着。',
    choice: '留下来问一句', result: '你没有解决什么，只让他不用带着那句话独自走出门。', category: 'social', effects: [{ stats: { clinical: 3, state: -1 } }],
  },
  {
    id: 'trait_quant_unit_error', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_quant' }, from: 2017, to: 2024,
    title: '单位差了一千倍', text: '表格看起来很整齐，只有你觉得那列标准差不可能这么小。追到原始导出，发现一边用毫秒，一边用秒。',
    choice: '把整条转换链重跑', result: '图变难看了，结论没塌。真正省下的是以后解释一个漂亮错误的时间。', category: 'method', effects: [{ stats: { method: 4, state: -1 } }],
  },
  {
    id: 'trait_pleaser_third_yes', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_pleaser' }, from: 2017, to: 2024,
    title: '今天第三个“可以”', text: '上午替人换班，中午帮忙改材料，下午又有人问你能不能临时接一件事。每一件单独看都不值得拒绝。',
    choice: '先问截止时间', result: '对方说其实下周也行。你第一次发现，很多“现在”只是没有人替你问过。', category: 'social', effects: [{ stats: { state: 2, capital: -1 } }],
  },
  {
    id: 'trait_skeptic_default_setting', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_skeptic' }, from: 2017, to: 2024,
    title: '默认设置是谁定的', text: '软件自动勾选了一个处理选项，教程也这样做。你找了很久，才在方法附录里看到它会改变什么。',
    choice: '把默认值改成显式参数', result: '结果差别不大。重要的是以后每个人都必须知道自己选了什么。', category: 'method', effects: [{ stats: { method: 3, capital: 1 } }],
  },
  {
    id: 'trait_communicator_three_versions', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_communicator' }, from: 2017, to: 2024,
    title: '同一件事写了三个版本', text: '给同行、给机构、给家属的说明不能是同一段。你花了一下午，把同一个结论写成三种没有互相背叛的语言。',
    choice: '保留三份，不再合并', result: '后来最常被转发的是最短的那份。短不是少说，是知道什么必须留下。', category: 'social', effects: [{ stats: { capital: 3, method: 1 } }],
  },
  {
    id: 'trait_resilient_second_morning', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_resilient' }, from: 2017, to: 2024,
    title: '第二天早上还是来了', text: '昨天的拒信、投诉或失败没有被解释成成长。今天九点，你只是按原计划又坐回桌前。',
    choice: '先做最小的一件事', result: '那件事没有扭转局面。它让局面继续有下一步。', category: 'identity', effects: [{ stats: { state: 3, method: 1 } }],
  },
  {
    id: 'trait_perfectionist_send_button', pools: ALL_LIFE_POOLS, condition: { flag: 'trait_perfectionist' }, from: 2017, to: 2024,
    title: '发送按钮亮了一整晚', text: '材料已经满足要求，你仍能看见四处可以更好。截止时间不会因为你看得见而延后。',
    choice: '在零点前按下发送', result: '发出去的版本不完美，也没有因此失去价值。第二天你仍记得那四处。', category: 'identity', effects: [{ stats: { state: 2, capital: 1 } }],
  },
];

const goalScenes: ConfiguredScene[] = [
  {
    id: 'goal_academic_empty_citation', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_academic' }, from: 2020, to: 2025,
    title: '第一个陌生引用', text: '引用提醒里出现一个你不认识的名字。对方只在方法部分引用了一次，没有夸你的结论。',
    choice: '把那篇文章读完', result: '他们用你的工作往前走了半步。你想要的“留下些什么”第一次有了很小的形状。', category: 'identity', effects: [{ stats: { method: 2, state: 2 } }],
  },
  {
    id: 'goal_academic_question_survives', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_academic' }, from: 2026,
    title: '问题还在，项目名换了', text: '当年申请书的标题早已过期，但你发现自己仍在绕着同一个问题工作。资助、岗位和合作者都换过。',
    choice: '把这条线写进下一份计划', result: '不是坚持证明你当年正确，而是这个问题仍值得再问一次。', category: 'identity', effects: [{ stats: { method: 3, capital: 1 } }],
  },
  {
    id: 'goal_help_people_no_update', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_help_people' }, from: 2020, to: 2025,
    title: '你不会知道后来怎样', text: '一次转介、一次课程或一次会谈结束后，对方没有再出现。你做的是助人工作，结果却不归你持续查看。',
    choice: '把记录停在该停的地方', result: '不知道不是失败，是边界的一部分。这个答案仍然不让人轻松。', category: 'identity', effects: [{ stats: { clinical: 3, state: 1 } }],
  },
  {
    id: 'goal_help_people_small_route', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_help_people' }, from: 2026,
    title: '帮助最后变成一张路线图', text: '你没能替那个人解决问题，只把能挂的号、能找的机构和下一个联系人写在一张纸上。',
    choice: '逐项确认他看得懂', result: '他把纸折起来放进口袋。很多真正有效的帮助，外形并不像改变人生。', category: 'identity', effects: [{ stats: { clinical: 3, capital: 1 } }],
  },
  {
    id: 'goal_stability_renewal_date', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_stability' }, from: 2020, to: 2025,
    title: '合同续签日写进了日历', text: '别人讨论机会时，你先看合同期限、社保和下一次续签。稳定不是没有野心，是你不愿把生活交给一句“以后再说”。',
    choice: '把最坏情况算一遍', result: '数字没有让未来确定，却让你知道哪一步真的承担不起。', category: 'career', effects: [{ stats: { state: 3, money: 3000 } }],
  },
  {
    id: 'goal_stability_fixed_key', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_stability' }, from: 2026,
    title: '一把不用按年交回的钥匙', text: '你第一次拿到没有和短合同绑定的门禁卡或房门钥匙。它很普通，甚至没有仪式。',
    choice: '给它配一个不会丢的钥匙扣', result: '稳定没有让工作变轻，只让你不必每年重新证明自己可以留下。', category: 'identity', effects: [{ stats: { state: 4 } }],
  },
  {
    id: 'goal_income_first_comparison', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_income' }, from: 2020, to: 2025,
    title: '你开始按小时算', text: '名义收入涨了，但通勤、备课、记录和没有计费的沟通也在涨。你第一次把所有时间放进同一张表。',
    choice: '保留真实时薪那一列', result: '有些看起来体面的机会立刻变便宜了。钱没有毁掉意义，只把代价说清楚。', category: 'career', effects: [{ stats: { method: 1, money: 6000 } }],
  },
  {
    id: 'goal_income_decline_prestige', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_income' }, from: 2026,
    title: '一个有名但不付钱的邀请', text: '邀请函写得很漂亮，工作量也写得很模糊。过去你会把“被看见”当作报酬的一部分。',
    choice: '先问预算', result: '对方说这次没有经费。你礼貌拒绝，名声没有当场减少，时间当场回来了。', category: 'career', effects: [{ stats: { state: 3, money: 8000 } }],
  },
  {
    id: 'goal_freedom_unscheduled_day', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_freedom' }, from: 2020, to: 2025,
    title: '日历上第一次有一整天空白', text: '没有课程、门诊、组会或排班。自由出现时没有配说明书，你反而花了半天决定该做什么。',
    choice: '不把它补成工作日', result: '一天过去，没有产出。你想要的自由原来包含允许时间不被证明。', category: 'identity', effects: [{ stats: { state: 4 } }],
  },
  {
    id: 'goal_freedom_self_deadline', pools: POST_CROSSROAD_POOLS, condition: { flag: 'life_goal', equals: 'goal_freedom' }, from: 2026,
    title: '没有人催的截止日', text: '这件事完全由你决定，也因此可以永远不完成。自主和拖延共用同一扇门。',
    choice: '给自己一个可以违约的日期', result: '你按时做完了。不是因为有人管，而是自由也需要自己提供一点结构。', category: 'identity', effects: [{ stats: { method: 2, state: 2 } }],
  },
];

const advisorScenes: ConfiguredScene[] = [
  { id: 'adv_star_calendar_gap', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'star' } }, from: 2019, to: 2022, title: '日历里唯一的十五分钟', text: '{{advisor}}下周只有周四 7:45 能见你。秘书问这个时间是否可以，语气像在问一个不需要答案的问题。', choice: '带一页纸去', result: '十五分钟只够谈一个问题。你第一次学会把最贵的注意力用在最窄的地方。', category: 'social' },
  { id: 'adv_star_photo_line', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'star' } }, from: 2022, to: 2025, title: '合影队伍排到了门外', text: '报告结束，年轻人排队和{{advisor}}合影。你抱着电脑站在旁边，知道他晚上还要看你的修改稿。', choice: '先回去改稿', result: '照片里没有你。第二天文档里有他留下的七条批注。', category: 'social' },
  { id: 'adv_star_declined_panel', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'star' } }, from: 2025, to: 2028, title: '他替你拒绝了一个圆桌', text: '{{advisor}}说那个圆桌只想借年轻面孔，不会给你真正发言时间。他已经替你回绝。', choice: '问清判断依据', result: '他说：“名额不是机会，能说完整一句话才是。”这次保护也带着替你决定的重量。', category: 'career' },
  { id: 'adv_star_name_without_room', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'star' } }, from: 2026, title: '别人先认出你的导师', text: '介绍到你时，对方立刻接上{{advisor}}的名字。你自己的研究问题还没说完，房间里已经有了预设。', choice: '把问题完整说完', result: '那个名字让门打开，也占掉了门口的一部分空间。你仍要把自己带进去。', category: 'identity' },

  { id: 'adv_young_pi_shared_clock', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'young_pi' } }, from: 2019, to: 2022, title: '两个人都在倒计时', text: '{{advisor}}问你的毕业节点，也把自己的考核表摊在桌上。你们的截止日期只差三个月。', choice: '把共同依赖写出来', result: '合作变得更清楚，也更难假装这只是纯粹的学术兴趣。', category: 'career' },
  { id: 'adv_young_pi_first_rejection', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'young_pi' } }, from: 2022, to: 2025, title: '他也第一次投这个项目', text: '{{advisor}}把拒信转给你，说自己没中过，不知道下一版该怎么改。导师承认不知道，并没有自动给出新的方向。', choice: '一起拆评审意见', result: '你们分完任务。那一刻更像两个资历不同的合作者，而不是一个人给另一个人答案。', category: 'method' },
  { id: 'adv_young_pi_lab_growth', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'young_pi' } }, from: 2025, to: 2028, title: '组里终于坐不下了', text: '新生又来了三个。{{advisor}}很高兴，也开始用群公告代替以前逐个说的话。', choice: '提议建立固定的一对一时间', result: '制度补上了，亲近感没有完全回来。成长会解决资源，也会改变关系。', category: 'social' },
  { id: 'adv_young_pi_tenure_news', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'young_pi' } }, from: 2026, title: '先收到的是他的结果', text: '{{advisor}}的考核结果先出来。群里刷满祝贺，你自己的材料还停在待办列表第一行。', choice: '下班后单独祝贺', result: '他说谢谢，又问你的那一项到哪了。两条倒计时终于只剩一条。', category: 'identity' },

  { id: 'adv_hands_off_first_agenda', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'hands_off' } }, from: 2019, to: 2022, title: '你自己发了会议议程', text: '{{advisor}}回“都可以聊”。你把三个问题按优先级排好，第一次像给自己主持组会。', choice: '会前一天再确认', result: '他来了，也回答了。放养留下的空白，有一部分可以被结构填上。', category: 'method' },
  { id: 'adv_hands_off_silent_approval', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'hands_off' } }, from: 2022, to: 2025, title: '批注只有一个“行”', text: '你发去十二页方案，{{advisor}}两天后回了一个“行”。你不知道这是信任、忙碌，还是没有细看。', choice: '附上三个必须确认的是非题', result: '他回了三行。信息仍然少，但终于足够让你承担下一步。', category: 'social' },
  { id: 'adv_hands_off_external_mentor', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'hands_off' } }, from: 2025, to: 2028, title: '固定请教的人不在本组', text: '你每月和外校一位同行开一次线上会。{{advisor}}知道，也从未表示介意。', choice: '把合作边界写进邮件', result: '指导关系有了名字。自由不再要求你假装所有支持都来自同一个人。', category: 'social' },
  { id: 'adv_hands_off_public_credit', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'hands_off' } }, from: 2026, title: '他在台上说“这是学生自己做的”', text: '{{advisor}}只在介绍时说了一句，后面把话筒完全交给你。你仍然希望他能坐近一点。', choice: '自己答完提问', result: '自由和缺席有时长得一样。你把这一次变成了前者。', category: 'identity' },

  { id: 'adv_clinical_double_record', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'clinical' } }, from: 2019, to: 2022, title: '研究记录和病历不能混写', text: '{{advisor}}退回你的笔记，指出同一句话在研究记录里是变量，在病历里是一个人的经历。', choice: '分成两套记录重写', result: '内容没有变，责任边界变清楚了。', category: 'method' },
  { id: 'adv_clinical_recruitment_pause', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'clinical' } }, from: 2022, to: 2025, title: '招募在门诊最忙时暂停', text: '样本还差很多，门诊却进入危机高峰。{{advisor}}说先停招，临床容量不能为研究进度让路。', choice: '重排项目时间线', result: '论文慢了一个季度。那张时间表第一次承认人不是稳定流入的数据点。', category: 'clinical' },
  { id: 'adv_clinical_incidental_finding', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'clinical' } }, from: 2025, to: 2028, title: '量表之外的那句话', text: '参与者填完材料，离开前低声说了一句不在访谈提纲里的话。你不能把它只当作“额外信息”。', choice: '按预案启动风险评估', result: '{{advisor}}接过后续联系。研究少了一个干净收尾，一个人多了一条能走的路。', category: 'clinical' },
  { id: 'adv_clinical_translation_limit', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'clinical' } }, from: 2026, title: '“显著”还不能进指南', text: '你的结果很好看。{{advisor}}问了三个问题：效应多大、谁没被纳入、临床上要付出什么。', choice: '把结论降到证据能承受的位置', result: '摘要没那么亮了，离真实使用反而近了一点。', category: 'method' },

  { id: 'adv_boundary_receipt', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'boundary' } }, from: 2019, to: 2022, title: '打车票没有报销项', text: '{{advisor}}让你先垫一笔项目交通费，说月底一起处理。月底到了，财务表里没有对应科目。', choice: '把票据和原约定一起发过去', result: '钱报回来了，回复只有“收到”。边界不需要对方喜欢才成立。', category: 'social' },
  { id: 'adv_boundary_holiday_message', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'boundary' } }, from: 2022, to: 2025, title: '假期第一天的任务', text: '{{advisor}}发来一句“有空看一下”，附件是一整份申请书。没有明确截止，也没有真正的可选。', choice: '回复返工日期', result: '他回了好。你没有证明自己更忠诚，只保住了假期仍然有边界。', category: 'social' },
  { id: 'adv_boundary_private_story', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'boundary' } }, from: 2025, to: 2028, title: '你的私事进了组会', text: '{{advisor}}为解释你最近进度，顺口提到你家里的情况。信息是真的，也确实不是他该替你说的。', choice: '会后明确要求不再转述', result: '他先说是为你好，后来答应。被理解和被公开不是同一件事。', category: 'social' },
  { id: 'adv_boundary_reference_condition', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'boundary' } }, from: 2026, title: '推荐信前的附加条件', text: '{{advisor}}愿意写信，同时希望你再替组里完成一项已经不属于你的收尾。', choice: '把推荐信与工作分别确认', result: '气氛变冷，日期和任务却都第一次写清楚了。', category: 'career' },

  { id: 'adv_warm_bad_week', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'warm' } }, from: 2019, to: 2022, title: '她记得你上周状态不好', text: '{{advisor}}没有追问原因，只把今天的议程从五项删到三项。照顾没有被说成特殊待遇。', choice: '把能完成的三项确认好', result: '工作量真的少了，不是一句“注意休息”之后照旧。', category: 'social' },
  { id: 'adv_warm_hard_no', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'warm' } }, from: 2022, to: 2025, title: '她很温和地说了不行', text: '你想同时开第三个课题，{{advisor}}听完说设计不错，但现在不行。语气温和，结论没有因此变软。', choice: '先完成手上的', result: '被支持不等于每个想法都会获批。你后来感谢的是那个明确的“不行”。', category: 'method' },
  { id: 'adv_warm_credit_email', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'warm' } }, from: 2025, to: 2028, title: '抄送你的那封感谢邮件', text: '合作方感谢{{advisor}}解决问题，她回复时把你的具体贡献逐条写了出来。', choice: '把邮件存进材料文件夹', result: '那些工作本来就属于你。被准确说出来，仍然是一种稀缺的支持。', category: 'career' },
  { id: 'adv_warm_independent_room', pools: ['grad', 'postdoc', 'tenure'], condition: { advisor: { archetype: 'warm' } }, from: 2026, title: '她没有坐进第一排', text: '你第一次独立主持重要会议，{{advisor}}坐在靠后的位置，也没有在冷场时接话。', choice: '自己把议程带到最后', result: '结束后她只问：“你觉得哪里要改？”支持有时是把房间完整地交还给你。', category: 'identity' },
];

export const m8AdvisorEventIdsByBand = {
  early: advisorScenes.filter(scene => scene.from === 2019).map(scene => `ev_m8_${scene.id}`),
  middle: advisorScenes.filter(scene => scene.from === 2022).map(scene => `ev_m8_${scene.id}`),
  late: advisorScenes.filter(scene => scene.from === 2025).map(scene => `ev_m8_${scene.id}`),
  final: advisorScenes.filter(scene => scene.from === 2026).map(scene => `ev_m8_${scene.id}`),
};

const orientationScenes: ConfiguredScene[] = [
  { id: 'orientation_cbt_homework_gap', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_cbt' }, from: 2021, title: '作业每次都写，生活没有动', text: '记录表填得工整，自动思维也抓得准确。来访者说：“我都懂，但回家还是一样。”', choice: '把问题从完成度移回功能', result: '你们删掉一半表格，去看哪一个真实场景仍然卡住。技术没有失效，只是不能替关系决定重点。', category: 'clinical', effects: [{ stats: { clinical: 3, method: 1 } }] },
  { id: 'orientation_cbt_measurement_plateau', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_cbt' }, from: 2024, title: '曲线三个月没有再降', text: '每周量表分数稳定在同一段。症状改善停住，来访者却说现在终于能和家人争吵了。', choice: '重新定义要追踪的变化', result: '那张曲线不再是唯一的进展证据。可测量不等于只有一个量值得测。', category: 'clinical', effects: [{ stats: { clinical: 3, method: 2 } }] },
  { id: 'orientation_dynamic_silence', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_dynamic' }, from: 2021, title: '沉默到了第四分钟', text: '来访者看着窗外，你也没有立即填满。第四分钟时他说：“你是不是也觉得我没什么可说的？”', choice: '把此刻发生的事放进会谈', result: '沉默第一次不只是空白，而是关系里可以共同看的材料。', category: 'clinical', effects: [{ stats: { clinical: 4, state: -1 } }] },
  { id: 'orientation_dynamic_ending_date', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_dynamic' }, from: 2024, title: '结束日期被反复忘记', text: '你们已经谈过三次还剩几次，他每周仍问“下次是什么时候”。遗忘发生得太稳定，不像信息问题。', choice: '不再只重复日期', result: '谈到离开时，他第一次生气。结束没有更轻松，但终于真的进入了会谈。', category: 'clinical', effects: [{ stats: { clinical: 4, state: -1 } }] },
  { id: 'orientation_humanistic_fix_request', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_humanistic' }, from: 2021, title: '“你就告诉我该怎么做”', text: '来访者第三次要求一个明确答案。你能感到自己用“不替你决定”保护了自主，也可能在躲避承担。', choice: '先回应他为什么现在需要答案', result: '你没有给方案，也没有把请求挡回去。被听见和被指导之间多出了一点空间。', category: 'clinical', effects: [{ stats: { clinical: 4 } }] },
  { id: 'orientation_humanistic_congruence', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_humanistic' }, from: 2024, title: '你确实被那句话刺到了', text: '来访者说你听起来和他父亲一样。你第一反应是解释专业意图，第二反应才是承认自己正在防御。', choice: '把这点诚实地放回关系', result: '会谈没有因此变温暖，却少了一层假装不受影响的专业姿态。', category: 'clinical', effects: [{ stats: { clinical: 4, state: -1 } }] },
  { id: 'orientation_family_empty_chair', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_family' }, from: 2021, title: '每个人都在替没来的人说话', text: '一家三口坐满房间，谈话中心却是拒绝出席的那个人。每句话都以“他就是”开头。', choice: '把注意力转向房间里的互动', result: '缺席者仍然重要，但不再替在场的人承担全部问题。', category: 'clinical', effects: [{ stats: { clinical: 4, method: 1 } }] },
  { id: 'orientation_family_subsystem', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_family' }, from: 2024, title: '孩子成了唯一的翻译', text: '父母互相不说话，所有要求都通过孩子传递。孩子准确复述每一句，也越来越像家里最累的大人。', choice: '请父母直接对彼此说', result: '房间立刻变得不顺。结构开始改变时，常先失去原来那种熟练。', category: 'clinical', effects: [{ stats: { clinical: 4, state: -1 } }] },
  { id: 'orientation_act_values_list', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_act' }, from: 2021, title: '价值清单写得太漂亮', text: '来访者圈了家庭、成长和健康，解释得也很完整。下周回来时，生活里一件对应的动作都没有。', choice: '把价值缩成明天十分钟能做的事', result: '宏大的词没有消失，只是第一次落到一个会遇到阻力的动作上。', category: 'clinical', effects: [{ stats: { clinical: 4, method: 1 } }] },
  { id: 'orientation_act_anxiety_first', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_act' }, from: 2024, title: '焦虑没有先离开', text: '来访者问：“所以我要带着它去面试？”他原本期待的是先不焦虑，再开始生活。', choice: '和他一起把这句话说完整', result: '目标从消灭感受，变成不再让感受独占方向盘。代价也因此说得更诚实。', category: 'clinical', effects: [{ stats: { clinical: 4, state: 1 } }] },
  { id: 'orientation_integrative_case_map', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_integrative' }, from: 2021, title: '四种语言描述同一个人', text: '你的个案概念化同时写了认知、依恋、关系和行为。每一段都对，放在一起却没有告诉你下次先做什么。', choice: '删到只剩一个近期焦点', result: '整合不是把理论都留下，而是知道此刻哪一种解释真的指导行动。', category: 'clinical', effects: [{ stats: { clinical: 3, method: 2 } }] },
  { id: 'orientation_integrative_supervision', pools: ['clinical_grad', 'clinical_practice', 'clinical_late'], condition: { flag: 'orientation_integrative' }, from: 2024, title: '两个督导给了相反建议', text: '一个建议更结构化，一个建议先留在关系里。你不能靠再问第三个人把选择消掉。', choice: '回到个案目标与当前联盟', result: '你选了一条，也记录为什么。整合最后仍然要求承担一次具体判断。', category: 'clinical', effects: [{ stats: { clinical: 4, method: 2 } }] },
];

const secondaryCareerScenes: ConfiguredScene[] = [
  { id: 'hospital_shift_handover', pools: ['hospital_practice', 'hospital_late'], condition: { career: 'hospital' }, from: 2023, title: '交班只给了三分钟', text: '上一班把最复杂的情况压成三句话，走廊里已经有人等。医院不会为心理工作自动腾出更慢的时间。', choice: '先确认风险与下一联系人', result: '你没能听完全部故事，至少没有让最关键的信息在换班处断掉。', category: 'clinical', effects: [{ stats: { clinical: 3, state: -1 } }] },
  { id: 'hospital_title_paper', pools: ['hospital_practice', 'hospital_late'], condition: { career: 'hospital' }, from: 2027, title: '职称表里仍然有论文栏', text: '这一年你的门诊量已经满了，晋升材料却仍要求一篇文章。临床做得好不会自动翻译成考核语言。', choice: '用真实业务问题做一项研究', result: '进度很慢，问题却来自每天的诊室，而不是为了填栏临时找来的题目。', category: 'career', effects: [{ stats: { method: 2, clinical: 2, state: -2 } }] },
  { id: 'school_parent_corridor', pools: ['school', 'school_late'], condition: { career: 'school' }, from: 2022, title: '家长堵在走廊问结果', text: '筛查后，一位家长在放学时拦住你，要求立刻说孩子“到底有没有问题”。旁边还有同班学生经过。', choice: '另约时间并先说明筛查边界', result: '家长不满意当场没拿到答案。孩子第二天仍能走过这条走廊，不必知道同学听见了什么。', category: 'clinical', effects: [{ stats: { clinical: 3, capital: -1 } }] },
  { id: 'school_empty_room', pools: ['school', 'school_late'], condition: { career: 'school' }, from: 2027, title: '咨询室被临时借去开会', text: '行政说只占一下午，学生预约也可以改。那间屋子在课表上永远比别的空间更容易被挪用。', choice: '拿预约记录说明不能借', result: '会议换了教室。你守住的不是一间屋，是学生相信这里按约定存在。', category: 'career', effects: [{ stats: { capital: 2, clinical: 2 } }] },
  { id: 'industry_research_question', pools: ['industry', 'industry_late'], condition: { career: 'industry' }, from: 2022, title: '问题在汇报前一天换了', text: '业务方说原来的研究问题“不够行动”，希望把结论改成能支持下周上线的版本。数据没有随需求一起变化。', choice: '把能回答与不能回答的分开', result: '汇报少了一句确定结论，多了一张风险页。上线没有停，至少没有借你的研究假装确定。', category: 'career', effects: [{ stats: { method: 3, capital: 1 } }] },
  { id: 'industry_layoff_list', pools: ['industry', 'industry_late'], condition: { career: 'industry' }, from: 2027, title: '名单里先删的是研究岗', text: '重组表把研究团队并进产品，岗位名一夜之间消失。你做过的工作还在，新组织图上没有对应方框。', choice: '把方法能力翻译成新岗位能读懂的语言', result: '你没有证明研究岗不可替代，只证明自己不等于那个岗位名。', category: 'career', effects: [{ stats: { capital: 3, state: -2 } }] },
  { id: 'left_old_classmate', pools: ['left', 'left_late'], condition: { career: 'left' }, from: 2022, title: '同学问你是不是“彻底不做了”', text: '聚会上有人问得很小心，好像转行是一种需要被保护的失败。你已经很久没这样理解自己的工作。', choice: '说清现在具体在做什么', result: '对方听完说“原来如此”。心理学没有从履历里消失，也不再占据标题。', category: 'identity', effects: [{ stats: { capital: 2, state: 3 } }] },
  { id: 'left_skill_returns', pools: ['left', 'left_late'], condition: { career: 'left' }, from: 2027, title: '旧训练在一个普通会议里回来', text: '争论卡住时，你先复述了双方真正不同的假设。没人把这叫心理学，会议却因此继续往下走。', choice: '不解释方法出处', result: '训练留下来的方式比专业身份安静。它已经变成你做事的一部分。', category: 'identity', effects: [{ stats: { method: 2, capital: 2, state: 2 } }] },
];

export const m8ConfiguredEvents: GameEvent[] = [
  ...backgroundScenes,
  ...traitScenes,
  ...goalScenes,
  ...advisorScenes,
  ...orientationScenes,
  ...secondaryCareerScenes,
].map(configured);
