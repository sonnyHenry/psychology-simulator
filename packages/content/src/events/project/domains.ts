import type { GameEvent, ProjectStage } from '@psy-sim/core';

interface Scene {
  title: string;
  text: string;
  choice: string;
  result: string;
}

interface DomainScenes {
  domain: string;
  ideation: Scene;
  collect: [Scene, Scene];
  analyze: [Scene, Scene];
  write: Scene;
}

const scenes: DomainScenes[] = [
  {
    domain: 'cognition',
    ideation: { title: '范式比问题更有名', text: '「{{project}}」最初是从一个经典范式长出来的。{{advisor}}问：如果把范式名删掉，你真正想知道什么？', choice: '先把问题写成人话', result: '你删掉三个术语，终于剩下一句可以被证伪的问题。' },
    collect: [
      { title: '反应时快得不像真的', text: '「{{project}}」第 {{years}} 年。第一批数据里有人每道题都在 120 毫秒内作答，正确率却接近满分。', choice: '按预先规则剔除', result: '样本少了一截，剩下的反应时终于像人做出来的。' },
      { title: '顺序效应压过了实验效应', text: '「{{project}}」跑到一半，你发现先做困难条件的人后面普遍更慢。counterbalance 表少排了一种顺序。', choice: '补齐缺的顺序', result: '你又招了一批人。设计上的洞，比统计模型更早被补上。' },
    ],
    analyze: [
      { title: '反应时不是正态的', text: '「{{project}}」的反应时拖着一条很长的右尾。原计划的均值比较会被少数慢反应牵着走。', choice: '重做分布假设', result: '结论变窄了，也更像这批数据真正允许你说的话。' },
      { title: '快和准不能分开看', text: '一个条件更快，也更容易错。只报告反应时，故事很好看；把正确率放进来，故事变成了速度—准确权衡。', choice: '把两条结果一起报告', result: '摘要没有原来利落，但不再拿半个现象冒充全部。' },
    ],
    write: { title: '不要把任务写成心智本身', text: '写「{{project}}」讨论时，{{advisor}}圈出一句：“这个任务测到的，不等于这个能力的全部。”', choice: '把外推范围收回来', result: '你删掉“揭示了人类认知机制”，换成了这套任务真正支持的范围。' },
  },
  {
    domain: 'cogneuro',
    ideation: { title: '先问脑区，还是先问问题', text: '你想为「{{project}}」找一个脑区。{{advisor}}让你把脑区名字遮住，再讲一遍为什么值得做。', choice: '从行为问题重新起笔', result: '扫描不再是答案本身，只是一种测量。' },
    collect: [
      { title: '第三个被试开始动头', text: '扫描做到第三个人，头动曲线越过阈值。机时按小时计费，重扫会吃掉下个月预算。', choice: '停下来重新固定并重扫', result: '那一小时的钱没有回来，数据里少了一团无法解释的运动伪迹。' },
      { title: '凌晨两点的机时', text: '「{{project}}」排到的扫描时段是凌晨。被试迟到二十分钟，后面还有两个人，机器每一分钟都在计费。', choice: '缩短准备，不缩短质控', result: '最后一个人离开时天快亮了，四份数据都能用。' },
    ],
    analyze: [
      { title: '两套预处理，两张脑图', text: '「{{project}}」换一套去噪参数，显著簇从左侧移到右侧。两套管线都有论文可引。', choice: '按预注册管线，并公开敏感性分析', result: '主图只留一张，补充材料诚实地放下另一张。' },
      { title: '十万个体素都在问问题', text: '阈值从未校正改成簇校正后，最漂亮的那块不见了。{{advisor}}盯着空下来的图例没有说话。', choice: '保留校正后的结果', result: '图不再适合做海报封面，但错误率终于有了边界。' },
    ],
    write: { title: '亮起来不等于负责', text: '「{{project}}」的讨论里写着某脑区“负责”一种情绪。你知道 BOLD 信号没有说过这么强的话。', choice: '改成关联与任务差异', result: '动词变弱了，论证反而站得更稳。' },
  },
  {
    domain: 'social',
    ideation: { title: '三个量表和一条箭头', text: '「{{project}}」的第一版模型里有三个量表和两条中介箭头。{{advisor}}问哪一条是理论，哪一条只是软件能跑。', choice: '删掉没有机制的箭头', result: '模型少了一半，看起来第一次像一个问题而不是一张路径图。' },
    collect: [
      { title: '问卷星里整齐的一百份', text: '一夜之间多出一百份回答，时长几乎相同，开放题连标点都一样。样本费已经结算。', choice: '按注意力检验与时长清洗', result: '一百份只剩十二份。成本沉下去了，机器人没有进入结论。' },
      { title: '样本全来自同一门公共课', text: '「{{project}}」收得很快，因为老师允许你在一门大课上发问卷。七成被试来自同一年级同一专业。', choice: '补招其他年级和专业', result: '进度慢了一个月，样本终于不再只是那间教室的画像。' },
    ],
    analyze: [
      { title: '共同方法偏差也会显著', text: '预测变量和结果变量在同一张问卷、同一分钟里填写。模型很漂亮，方法因子也很漂亮。', choice: '报告共同方法限制', result: '你没有假装一组横断面相关已经解释了因果过程。' },
      { title: '人都在班级里面', text: '「{{project}}」把八所学校的学生摊平成独立个体。班级内相关不高，但绝不是零。', choice: '改用多层模型', result: '标准误变大，一条边不再显著；学校与班级第一次进入模型。' },
    ],
    write: { title: '相关不是预测，更不是导致', text: '初稿三次把横断面相关写成“影响”。{{advisor}}只批了四个字：时间顺序呢？', choice: '逐句收回因果动词', result: '文章少了一个宏大故事，多了一条清楚的证据边界。' },
  },
  {
    domain: 'clinical',
    ideation: { title: '诊断名不是研究问题', text: '「{{project}}」写着“抑郁症的认知机制”。伦理会上有人问：哪一群人、哪一个过程、哪一个时间点？', choice: '把人群与过程写具体', result: '题目变长了，也终于知道要招谁、测什么。' },
    collect: [
      { title: '三个月招到十一个', text: '科室每周都有合适的患者，但医生要先判断能否接触，家属也要同意。三个月后「{{project}}」只有十一个人。', choice: '延长招募，不放宽标准', result: '进度落后了，样本没有因为期限而变成另一群人。' },
      { title: '退出的人恰好最严重', text: '随访第二次，症状最重的一批人最少回来。完成者看起来改善明显，但缺失不是随机掉下来的。', choice: '记录退出原因并继续追访', result: '你没有追回所有人，至少知道空白集中在哪里。' },
    ],
    analyze: [
      { title: '平均改善掩住了两群人', text: '「{{project}}」的均值下降很清楚，个体轨迹却分成快速改善与几乎不变两群。', choice: '把轨迹差异纳入模型', result: '一个平均数变成了几种不同的临床过程。' },
      { title: '统计显著，临床上呢', text: '量表下降三分，p 值很好看。可靠变化指数却显示多数人没有跨过测量误差。', choice: '同时报告临床显著性', result: '结论没有消失，只是不再把“可检测”写成“有意义”。' },
    ],
    write: { title: '来访者不是病例材料', text: '写「{{project}}」时，一个人的经历太能说明问题，也太容易被认出来。改掉细节，故事会失去力度。', choice: '去除可识别细节', result: '段落弱了一点，那个具体的人没有被论文占有。' },
  },
  {
    domain: 'development',
    ideation: { title: '年龄不是一条直线', text: '「{{project}}」把三岁到六岁当成一个连续斜率。幼儿园老师问：中班和大班学的是同一件事吗？', choice: '按发展任务重写假设', result: '年龄不再只是表格里的一列数字。' },
    collect: [
      { title: '幼儿园临时改了排期', text: '园里通知下周迎检，原定四天的测试只能挪到一个上午。孩子午睡前后完全不是同一种状态。', choice: '拆到两周完成', result: '你多跑了六趟，没有把困倦当成发展差异。' },
      { title: '做到一半要找妈妈', text: '孩子完成第三个任务时开始哭，说要找妈妈。那一格数据再做两分钟就完整。', choice: '立刻停止', result: '记录表停在第三项。研究少了一个完整样本，孩子没有被完整样本绑在椅子上。' },
    ],
    analyze: [
      { title: '六个月在这里很长', text: '把年龄按整数岁分组后，组内最大相差近十二个月。对四岁的孩子，这不是噪声。', choice: '按月龄重新建模', result: '曲线不再整齐，却第一次符合儿童真正长大的速度。' },
      { title: '孩子们属于不同班级', text: '同一班的孩子共享老师、作息和课堂语言。把他们当独立样本，标准误小得不真实。', choice: '加入班级层级', result: '一个效应缩小了，老师与环境从误差项里被看见。' },
    ],
    write: { title: '“落后”是一个危险的词', text: '「{{project}}」初稿把低于组均值写成“发展落后”。{{advisor}}问：落后于谁，凭什么？', choice: '改成观察到的任务差异', result: '你没有用一次实验给孩子贴一张比研究寿命更长的标签。' },
  },
  {
    domain: 'education',
    ideation: { title: '干预不是一份教案', text: '「{{project}}」计划比较一套心理课程。校长问谁来上、占哪节课、月考周怎么办。', choice: '把实施条件写进设计', result: '研究问题里第一次出现了学校真正怎样运转。' },
    collect: [
      { title: '心理课又被主科借走了', text: '干预组原定八节课，第三周开始连续被数学和英语借课。对照组反而按计划完成常规课程。', choice: '逐节记录实施剂量', result: '你没有把“分到干预组”假装成“真的接受了干预”。' },
      { title: '老师把方案改成了自己的版本', text: '一位老师跳过活动，直接讲了二十分钟道理；另一位严格照手册。学生收到的不是同一种干预。', choice: '保留适配并记录忠实度', result: '你没有强迫课堂变成实验室，也没有假装差异不存在。' },
    ],
    analyze: [
      { title: '效果可能只是老师效应', text: '「{{project}}」中最好的两个班恰好由同一位老师授课。课程与教师缠在一起。', choice: '把教师作为层级与限制', result: '课程效果缩小了，但不再借用一个好老师的全部能力。' },
      { title: '政策在研究中途变了', text: '第二学期区里统一增加心理课时，原来的对照学校也开始做类似活动。', choice: '按时间与暴露重新分析', result: '简单的组间差异不见了，现实发生的政策变化留在解释里。' },
    ],
    write: { title: '有效不等于学校做得到', text: '「{{project}}」在受控条件下有效，但每班需要两位受训教师。普通学校没有这两个人。', choice: '把实施成本写进结论', result: '文章不只回答“有没有效”，也回答“谁有条件让它有效”。' },
  },
  {
    domain: 'psychometrics',
    ideation: { title: '量表不是把题目加起来', text: '「{{project}}」的题目都很像，内部一致性一定会很高。{{advisor}}问它到底覆盖了构念的哪几面。', choice: '先画构念地图', result: '你删掉重复题，也补上原来完全没有问到的一面。' },
    collect: [
      { title: '校准样本只会一种语言', text: '量表准备跨地区使用，预测样本却几乎都来自同一所大学。几个词在另一地区不是同一种语气。', choice: '补做认知访谈与跨地区样本', result: '题目改了七处。改动很小，却决定人们是不是在回答同一件事。' },
      { title: '所有人都选了最高分', text: '一个分量表出现严重天花板效应。题目写得像道德表态，没人愿意选低。', choice: '重写高端区分题', result: '新版答案不再整齐，量尺上端终于能区分开。' },
    ],
    analyze: [
      { title: '同一个分数不一定同一个意思', text: '不同群体的总分均值可以比较，题目截距却不等值。直接比较会把作答方式写成群体差异。', choice: '检验并报告测量不变性', result: '你放弃一组漂亮均值，保住了比较成立的前提。' },
      { title: '残差还在彼此说话', text: '模型拟合尚可，但两道措辞几乎相同的题有很强局部依赖。它们在重复计分同一件事。', choice: '处理局部依赖并重估', result: '信度降了一点，信息不再被两道近义题算两遍。' },
    ],
    write: { title: '高信度不是有效', text: '「{{project}}」摘要把 α=.94 写成“量表高度有效”。{{advisor}}把“有效”两个字划掉。', choice: '分别陈述可靠性与效度证据', result: '一个系数回到它能证明的那件事上。' },
  },
  {
    domain: 'health',
    ideation: { title: '健康行为发生在诊室外', text: '「{{project}}」原本只测一次问卷。{{advisor}}问：真正决定行为的那些天、那些提醒和那些中断在哪里？', choice: '把时间过程放进设计', result: '研究从一张横截面变成了会发生变化的一段生活。' },
    collect: [
      { title: '手环空白的三天', text: '参与者最忙、最累的三天恰好没有佩戴设备。缺失段落与健康状态本身纠缠在一起。', choice: '联系核实并保留缺失模式', result: '你没有用日均值把最重要的空白填平。' },
      { title: '出院后电话没人接', text: '「{{project}}」的三月随访进入第四轮，病历上的号码仍然无人接听。失访者往往也是风险最高的人。', choice: '走获批的多渠道随访', result: '你追回一部分，也把仍失联的人明确留在流程图里。' },
    ],
    analyze: [
      { title: '坚持下来的人本来就不同', text: '完成十二周计划的人改善明显，但他们起点更有资源、状态也更好。依从不是随机发生的。', choice: '建模依从与基线差异', result: '效果变小了，干预不再独占参与者自己带来的优势。' },
      { title: '今天的压力影响明天的行为', text: '每日数据里，压力、睡眠和运动互相追逐。把每个人压成一个均值，会丢掉真正的问题。', choice: '使用时变与个体内模型', result: '你分开了“谁更健康”和“一个人什么时候更健康”。' },
    ],
    write: { title: '建议必须能被人做到', text: '「{{project}}」结论建议每天增加四十分钟运动。样本里轮班工作者根本没有固定的四十分钟。', choice: '按生活约束改写建议', result: '建议不再最理想，开始有可能被真实的人使用。' },
  },
];

function domainEvent(domain: string, stage: ProjectStage, index: number, scene: Scene): GameEvent {
  return {
    id: `ev_domain_${domain}_${stage}_${index}`,
    pools: [],
    category: 'method',
    projectStage: stage,
    projectDomains: [domain],
    once: false,
    trigger: { projectCount: { domain, active: true, op: '>=', value: 1 } },
    title: scene.title,
    text: scene.text,
    choices: [{
      id: 'handle',
      text: scene.choice,
      outcomes: [
        {
          weight: 1,
          condition: { projectRoll: 'ok' },
          text: `${scene.result}\n\n「{{project}}」在第 {{years}} 年留下了这笔记录。`,
          effects: [{ stats: { method: 3, state: -1 } }, { project: { op: 'setField', quality: 3 } }],
        },
        {
          weight: 1,
          condition: { projectRoll: 'setback' },
          text: `${scene.result}\n\n处理是对的，但它只解决了眼前的问题。「{{project}}」在第 {{years}} 年仍没有离开这一站。`,
          effects: [{ stats: { method: 1, state: -3 } }],
        },
      ],
    }],
  };
}

export const domainProjectEvents: GameEvent[] = scenes.flatMap(spec => [
  domainEvent(spec.domain, 'ideation', 1, spec.ideation),
  ...spec.collect.map((scene, index) => domainEvent(spec.domain, 'collect', index + 1, scene)),
  ...spec.analyze.map((scene, index) => domainEvent(spec.domain, 'analyze', index + 1, scene)),
  domainEvent(spec.domain, 'write', 1, spec.write),
]);
