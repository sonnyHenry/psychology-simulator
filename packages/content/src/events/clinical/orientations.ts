import type { GameEvent } from '@psy-sim/core';

interface OrientationScene {
  slug: string;
  title: string;
  text: string;
  choice: string;
  result: string;
}

interface OrientationSpec {
  flag: string;
  scenes: OrientationScene[];
}

const specs: OrientationSpec[] = [
  {
    flag: 'orientation_cbt',
    scenes: [
      { slug: 'agenda', title: '议程表上还有两项', text: '会谈还剩十分钟，议程表上有两项没谈。来访者却第一次提到父亲去世后的那一晚。', choice: '让议程等一等', result: '你没有丢掉结构，只把结构用来容纳真正发生的事。' },
      { slug: 'homework', title: '空白的思维记录表', text: '来访者连续三周没做家庭作业，说“我一打开那张表就觉得自己又失败了”。', choice: '一起重做一份更小的作业', result: '作业从考核变回了实验：只记录一次，而不是证明他够不够努力。' },
      { slug: 'exposure', title: '暴露层级卡在第四级', text: '前三步都完成了，第四步是重新坐地铁。来访者在入口站了二十分钟，没有进去。', choice: '把“站在入口”也算作暴露', result: '那天没有坐成地铁，但回避的边界向后退了一点。' },
      { slug: 'measurement', title: '量表降了，生活没动', text: '症状量表下降明显，来访者却仍不出门、不见朋友。分数与功能第一次给出不同答案。', choice: '把生活功能重新放回目标', result: '下一阶段不再追更低的分，而是追一次真实的行动。' },
      { slug: 'formulation', title: '同一张概念化图要重画', text: '新信息让原来的维持循环站不住了。那张画得很漂亮的图需要承认自己只是暂时假设。', choice: '当面和来访者一起重画', result: '概念化不再是你对他的结论，而是你们共同维护的工作模型。' },
    ],
  },
  {
    flag: 'orientation_dynamic',
    scenes: [
      { slug: 'silence', title: '这次沉默了七分钟', text: '来访者坐下后一直不说话。你想填上空白，也知道沉默可能正在重复一段关系。', choice: '留在沉默里', result: '第八分钟，他问：“你是不是也觉得我很麻烦？”' },
      { slug: 'holiday', title: '假期前突然变好', text: '你宣布下月休假后，来访者一周里状态突然很好，说也许可以结束。', choice: '把结束冲动放进关系里谈', result: '你们没有立刻决定结束，先谈了每次分开前都会发生什么。' },
      { slug: 'countertransference', title: '你开始盼着他取消', text: '每到这位来访者的时段，你都会提前疲惫。督导问的第一句不是“他做了什么”，而是“你被放在了什么位置”。', choice: '把自己的反应当成材料', result: '不舒服没有消失，却不再只是你需要藏起来的失误。' },
      { slug: 'interpretation', title: '那句话现在说会不会太早', text: '你看见一个反复出现的关系模式。解释它可能打开东西，也可能只是显示你比来访者先看懂。', choice: '先用问题靠近，不急着解释', result: '他自己说出了那句话的一半，剩下一半还可以等。' },
      { slug: 'ending', title: '最后一次并不轻松', text: '长期工作要结束了。来访者说感谢，也说有一部分自己觉得被你抛下。', choice: '让两种感受同时留下', result: '结束没有被包装成圆满，它因此更像一段真实关系的结束。' },
    ],
  },
  {
    flag: 'orientation_humanistic',
    scenes: [
      { slug: 'congruence', title: '“你刚才走神了”', text: '来访者突然说：“你刚才走神了。”你确实有一瞬间没跟上。', choice: '承认，并回到这一刻', result: '你没有用技术保护自己。关系因为一句不完美的诚实继续了。' },
      { slug: 'reflection', title: '复述得太准确', text: '你把来访者的话总结得很准确，他却说：“我不是这个意思。”', choice: '放下总结，请他纠正你', result: '你少懂了一点，他多拥有了一点自己的经验。' },
      { slug: 'positive_regard', title: '你不喜欢他的选择', text: '来访者决定回到一段你认为会再次伤害他的关系。接纳这个人，不等于赞成这个决定。', choice: '说清担忧，也保留他的选择权', result: '你没有把关心变成控制，也没有假装自己没有判断。' },
      { slug: 'pace', title: '没有目标清单的第十二次', text: '十二次会谈过去，没有量化目标，也没有戏剧性突破。来访者说这里是唯一不用立刻变好的地方。', choice: '和他一起确认这段工作的意义', result: '关系本身被说出来，也第一次可以被检验是否足够。' },
      { slug: 'presence', title: '今天没有一句漂亮的话', text: '来访者讲完丧失后看着你。所有总结都显得太轻，所有解释都显得太早。', choice: '只说“我在这里”', result: '这句话没有解决任何事，但没有让他独自待在那件事里。' },
    ],
  },
  {
    flag: 'orientation_family',
    scenes: [
      { slug: 'identified_patient', title: '“问题都在孩子身上”', text: '父母轮流列出孩子的问题，孩子低头不说话。每一个描述都把关系里的箭头指向同一个人。', choice: '把问题改写成家庭中的循环', result: '第一次，主语从“他”变成了“你们之间”。' },
      { slug: 'triangle', title: '母亲每次都替父亲回答', text: '你问父亲时，母亲先开口；你转向母亲时，孩子开始制造动静。三个人熟练地维持着同一个三角。', choice: '温和地打断代答', result: '房间安静下来，父亲第一次用自己的句子回答。' },
      { slug: 'secret', title: '一个人提前告诉你的秘密', text: '家庭会谈前，一位成员单独来电，要求你替 ta 保守一件会影响所有人的事。', choice: '先重申家庭工作的秘密政策', result: '你没有接下一个会把治疗师也拉进联盟的秘密。' },
      { slug: 'genogram', title: '家谱图上重复的离开', text: '画到第三代时，几次“突然断联”落在相似的位置。模式清楚，但家谱不是命运。', choice: '把重复当作提问，不当作结论', result: '家庭开始讲那些离开之前从未被说出的冲突。' },
      { slug: 'reframe', title: '控制也可能曾经是保护', text: '父亲的严密控制让孩子窒息，也曾是这个家庭度过混乱时期的方法。重新命名不能替伤害开脱。', choice: '同时指出功能与代价', result: '一个行为不再只有恶意，也没有因此免除责任。' },
    ],
  },
  {
    flag: 'orientation_act',
    scenes: [
      { slug: 'defusion', title: '“我就是一个失败者”', text: '来访者不是在描述一个想法，而是在陈述身份。反驳内容只会开启下一轮辩论。', choice: '练习看见“我有一个失败的念头”', result: '念头没有消失，和人的距离多出了一点。' },
      { slug: 'values', title: '目标写的是“不再焦虑”', text: '如果要等焦虑完全离开才行动，生活会一直停在候诊区。你们需要一个症状之外的方向。', choice: '问焦虑在阻止什么重要的事', result: '“不焦虑”被改成了“即使焦虑，也去见重要的人”。' },
      { slug: 'willingness', title: '电梯门开了', text: '来访者站在电梯前，心率很快。目标不是证明这里安全，而是练习带着身体反应走进去。', choice: '陪他给不适留一个位置', result: '门关上时焦虑还在，行动也发生了。' },
      { slug: 'mindfulness', title: '正念练习让她更难受', text: '闭眼关注身体时，来访者反而被创伤记忆淹没。正念不是对所有人、所有时刻都安全。', choice: '睁眼，改用外部锚定', result: '练习停止了。灵活性先用在了治疗方法本身。' },
      { slug: 'committed_action', title: '很小，但方向是对的', text: '来访者想修复一段关系，却把行动写成“等我状态好一点再联系”。', choice: '把它缩成今天能做的一步', result: '他没有解决关系，只发出了一条不要求对方立刻回应的消息。' },
    ],
  },
  {
    flag: 'orientation_integrative',
    scenes: [
      { slug: 'rationale', title: '今天为什么换一种做法', text: '前几次你在做结构化练习，今天却想把注意力放在关系上。整合不能只是治疗师随心所欲。', choice: '先向来访者说明改变的理由', result: '方法之间第一次有了共同的个案概念化，而不是一只工具箱。' },
      { slug: 'contradiction', title: '两位督导给了相反建议', text: '一位要你推进暴露，一位要你先处理关系安全。两种建议各自都说得通。', choice: '回到这个人的阶段与目标', result: '你没有选门派，选了此刻最需要被检验的假设。' },
      { slug: 'depth', title: '会很多，不等于哪样都够深', text: '来访者进入复杂创伤材料时，你发现自己对这个方向只上过一个周末工作坊。', choice: '承认边界并转向专门督导', result: '整合没有变成掩盖训练不足的名字。' },
      { slug: 'client_preference', title: '来访者不想做你最熟的技术', text: '你最熟悉的方案证据最好，来访者却明确不愿意用。偏好本身会影响联盟与坚持。', choice: '讨论替代方案与证据边界', result: '选择不是迎合，也不是把“有证据”当成命令。' },
      { slug: 'common_factors', title: '技术变了，关系没有', text: '你们换过几种技术，真正稳定的是目标共识、任务合作和关系。它们不是“什么都没做”。', choice: '把共同因素也纳入复盘', result: '整合第一次不是技术相加，而是知道什么一直在起作用。' },
    ],
  },
];

export const orientationEvents: GameEvent[] = specs.flatMap(spec => spec.scenes.map(scene => ({
  id: `ev_orientation_${spec.flag.replace('orientation_', '')}_${scene.slug}`,
  pools: ['clinical_practice', 'clinical_late', 'clinical_common'],
  category: 'counseling',
  once: true,
  trigger: { all: [{ flag: spec.flag }, { career: 'clinical' }] },
  title: scene.title,
  text: scene.text,
  choices: [{
    id: 'respond',
    text: scene.choice,
    outcomes: [{ weight: 1, text: scene.result, effects: [{ stats: { clinical: 3, state: -1 } }] }],
  }],
}))) satisfies GameEvent[];
