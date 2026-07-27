import type { Institution } from '@psy-sim/core';

/**
 * 真实院校表(GAME_DESIGN 19.1)。**24 条,国内 15 + 海外 9。**
 *
 * ## 只写公开事实
 *
 * 名称、建制、城市、方向是公开可查的。`lab` 只在**确有其名**时写——
 * 编一个实验室名和编一个人名一样不可接受,只是更不容易被发现。
 * 不确定的一律留空:清单上少一行字,比多一行假话好。
 *
 * `impression` 只写建制、方向、体量,以及这个地方在圈里的位置。
 * **不写"这里的老师怎么样"**——那既无法核实,又会滑向对具体个人的评价。
 *
 * ## `gameified` 里每一个数字都是近似
 *
 * 启动经费用区间,考核指标只写**描述**不写指标本身。
 * `GRAD_APPLY` 屏顶部有一条常驻声明(validate 规则 12 强制非空),这是第二道保险。
 *
 * ## `admits` 决定它出现在哪次选择的清单里
 *
 * 一屏三用靠的就是这个字段:同一张表按 `kind` 过滤出三份不同的清单。
 * validate 规则 15 要求每种 kind 至少 8 条,低于这个数"选择"就退化成"没得选"。
 */

/** 常驻声明。**规则 12 检查它非空**——这一条不是免责套话,是 19.1 那条硬约束的落地 */
export const GAMEIFIED_TERMS_NOTICE =
  '院校名称、建制与研究方向为公开事实;招生规模、经费、考核年限等条款为**游戏化设定,不代表任何单位的实际招生或招聘条件**。';

export const institutions: Institution[] = [
  // ══════════ 国内 · 综合与师范 ══════════
  {
    id: 'inst_bnu',
    name: '北京师范大学',
    unit: '心理学部',
    lab: '认知神经科学与学习国家重点实验室',
    region: 'cn',
    city: '北京',
    tier: 'a_plus',
    domains: ['domain_cogneuro', 'domain_development', 'domain_psychometrics'],
    impression: '国内心理学的两个头部之一。学部建制、国家重点实验室,发展、心理测量与统计、认知神经都齐。',
    gameified: {
      admission: { quota: '推免占多数,统考名额每年个位数' },
      employment: { tenureYears: 6, tenureBar: '预聘期内要有代表作与主持项目' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_pku',
    name: '北京大学',
    unit: '心理与认知科学学院',
    region: 'cn',
    city: '北京',
    tier: 'a_plus',
    domains: ['domain_cogneuro', 'domain_cognition', 'domain_social'],
    impression: '理科传统最重的一家。视觉与注意、认知神经、行为遗传、社会认知。这里的人默认你会写代码。',
    gameified: {
      admission: { quota: '推免为主,统考极少' },
      employment: { tenureYears: 6, tenureBar: '预聘-长聘,首考看独立性' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_psych_cas',
    name: '中国科学院心理研究所',
    unit: '研究生教育走中国科学院大学',
    region: 'cn',
    city: '北京',
    tier: 'institute',
    domains: ['domain_cogneuro', 'domain_health', 'domain_social'],
    impression: '科研院所不是学校:没有本科生,组会就是全部生活。脑与认知、健康心理、心理援助。',
    gameified: {
      admission: { quota: '按导师招生,名额跟着项目走' },
      employment: { tenureYears: 5, tenureBar: '所里按项目与产出考核' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_scnu',
    name: '华南师范大学',
    unit: '心理学院',
    region: 'cn',
    city: '广州',
    tier: 'a_plus',
    domains: ['domain_cogneuro', 'domain_education', 'domain_cognition'],
    impression: '学科评估长期在最前列。教育心理与认知神经两条线都厚,南方的心理学重镇。',
    gameified: {
      admission: { quota: '统考名额相对多' },
      employment: { tenureYears: 5 },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_ecnu',
    name: '华东师范大学',
    unit: '心理与认知科学学院',
    region: 'cn',
    city: '上海',
    tier: 'a',
    domains: ['domain_education', 'domain_cogneuro', 'domain_clinical'],
    impression: '教育心理、认知神经、临床与咨询三条线都在。上海,离行业和医院都近。',
    gameified: {
      admission: { quota: '推免与统考各半' },
      employment: { tenureYears: 5 },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_swu',
    name: '西南大学',
    unit: '心理学部',
    lab: '认知与人格教育部重点实验室',
    region: 'cn',
    city: '重庆',
    tier: 'a',
    domains: ['domain_social', 'domain_cognition', 'domain_health'],
    impression: '学部建制,人格与情绪方向的传统很深。样本好收,这件事在做问卷研究的人眼里是硬指标。',
    gameified: {
      admission: { quota: '招生规模较大' },
      employment: { tenureYears: 5 },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_zju',
    name: '浙江大学',
    unit: '心理与行为科学系',
    region: 'cn',
    city: '杭州',
    tier: 'a',
    domains: ['domain_cogneuro', 'domain_cognition'],
    impression: '系在综合性大学里,交叉学科的机会多,和计算机、医学的合作是常态。',
    gameified: {
      admission: { quota: '推免为主' },
      employment: { tenureYears: 6, tenureBar: '预聘制,考核偏重代表作' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_thu',
    name: '清华大学',
    unit: '社会科学学院心理学系',
    region: 'cn',
    city: '北京',
    tier: 'b_plus',
    domains: ['domain_social', 'domain_health'],
    impression: '2008 年复系,是这张名单上最年轻的一个系。积极心理学与社会心理,平台新、人少。',
    gameified: {
      admission: { quota: '规模小,名额很少' },
      employment: { tenureYears: 6 },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_tjnu',
    name: '天津师范大学',
    unit: '心理学部',
    region: 'cn',
    city: '天津',
    tier: 'b_plus',
    domains: ['domain_cognition', 'domain_education'],
    impression: '心理学传统强校。预聘压力相对小,编制相对实——这两件事在 2014 年还没人跟你讲它们有多重要。',
    gameified: {
      admission: { quota: '统考名额较多' },
      employment: { tenured: true, teachingLoad: '年均课时偏多' },
    },
    admits: ['master', 'phd'],
  },
  {
    id: 'inst_snnu',
    name: '陕西师范大学',
    unit: '心理学院',
    region: 'cn',
    city: '西安',
    tier: 'b_plus',
    domains: ['domain_education', 'domain_development'],
    impression: '师范系统里的老牌。教育心理与发展方向稳,毕业去中小学和高校的都多。',
    gameified: {
      admission: { quota: '统考名额较多' },
      employment: { tenured: true },
    },
    admits: ['master', 'phd'],
  },
  {
    id: 'inst_lnnu',
    name: '辽宁师范大学',
    unit: '心理学院',
    region: 'cn',
    city: '大连',
    tier: 'b_plus',
    domains: ['domain_development', 'domain_education'],
    impression: '发展心理的传统很久。学校不大,但这个学科在校内位置不低。',
    gameified: {
      admission: { quota: '统考为主' },
      employment: { tenured: true },
    },
    admits: ['master', 'phd'],
  },
  {
    id: 'inst_cnu',
    name: '首都师范大学',
    unit: '心理学院',
    region: 'cn',
    city: '北京',
    tier: 'b_plus',
    domains: ['domain_education', 'domain_cognition'],
    impression: '在北京,而且是师范。这两点合起来意味着实习和兼职的机会比排名更重要。',
    gameified: {
      admission: { quota: '统考为主' },
      employment: { tenured: true },
    },
    admits: ['master', 'phd'],
  },
  {
    id: 'inst_njnu',
    name: '南京师范大学',
    unit: '心理学院',
    region: 'cn',
    city: '南京',
    tier: 'b_plus',
    domains: ['domain_education', 'domain_clinical'],
    impression: '师范传统强校,咨询与临床方向的课程体系相对完整。',
    gameified: {
      admission: { quota: '统考名额较多' },
      employment: { tenured: true },
    },
    admits: ['master', 'phd'],
  },
  {
    id: 'inst_szu',
    name: '深圳大学',
    unit: '心理学院',
    region: 'cn',
    city: '深圳',
    tier: 'b_plus',
    domains: ['domain_cogneuro', 'domain_social'],
    impression: '近年扩张最快的一批之一。平台年轻、待遇好,代价是一切都还在长,包括规矩。',
    gameified: {
      admission: { quota: '这几年招得多,名额相对宽' },
      employment: { startupFunds: [300000, 1500000], tenureYears: 6, tenureBar: '预聘期考核明确且不低', housing: '有安家补贴' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_suda',
    name: '苏州大学',
    unit: '教育学院(心理学系)',
    region: 'cn',
    city: '苏州',
    tier: 'b_plus',
    domains: ['domain_cognition', 'domain_education'],
    impression: '这几年投入大、招人多。长三角,离上海一小时。',
    gameified: {
      admission: { quota: '招生规模在扩' },
      employment: { startupFunds: [200000, 800000], tenureYears: 5, housing: '有安家补贴' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },

  // ══════════ 国内 · 医院与精神卫生(临床线目标,M4 消费)══════════
  {
    id: 'inst_pku6',
    name: '北京大学第六医院',
    unit: '北京大学精神卫生研究所',
    region: 'cn',
    city: '北京',
    tier: 'hospital',
    domains: ['domain_clinical', 'domain_health'],
    impression: '国内精神科的重镇。在这里心理学是医学的一部分,这句话的分量要待过才知道。',
    gameified: {
      admission: { quota: '名额少,竞争跨专业' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_smhc',
    name: '上海市精神卫生中心',
    unit: '临床心理科',
    region: 'cn',
    city: '上海',
    tier: 'hospital',
    domains: ['domain_clinical', 'domain_health'],
    impression: '临床与研究并重。门诊量大,这意味着案例多,也意味着时间少。',
    gameified: {
      admission: { quota: '按导师招生' },
    },
    admits: ['master', 'phd', 'postdoc'],
  },
  {
    id: 'inst_xiangya2',
    name: '中南大学湘雅二医院',
    unit: '精神卫生研究所',
    region: 'cn',
    city: '长沙',
    tier: 'hospital',
    domains: ['domain_clinical'],
    impression: '精神医学的老牌重镇,临床训练扎实。',
    gameified: {
      admission: { quota: '按导师招生' },
    },
    admits: ['master', 'phd'],
  },

  // ══════════ 海外 ══════════
  {
    id: 'inst_uva',
    name: 'University of Amsterdam',
    unit: 'Department of Psychology',
    region: 'overseas',
    city: 'Amsterdam',
    tier: 'europe',
    domains: ['domain_psychometrics', 'domain_cognition'],
    impression: '心理学方法学与贝叶斯统计的中心之一。荷兰的 PhD 是**雇员合同**,有工资、交社保、有工会。',
    gameified: {
      admission: { quota: '按项目招聘,像找工作而不是像考试' },
      employment: { startupFunds: [0, 0], housing: '住房紧张是公开问题' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_tilburg',
    name: 'Tilburg University',
    unit: 'Department of Methodology and Statistics',
    region: 'overseas',
    city: 'Tilburg',
    tier: 'europe',
    domains: ['domain_psychometrics'],
    impression: '元研究(meta-research)最集中的地方之一。研究"心理学这门学科本身出了什么问题"。',
    gameified: {
      admission: { quota: '按项目招聘' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_kuleuven',
    name: 'KU Leuven',
    unit: 'Faculty of Psychology and Educational Sciences',
    region: 'overseas',
    city: 'Leuven',
    tier: 'europe',
    domains: ['domain_psychometrics', 'domain_clinical'],
    impression: '欧洲最老的大学之一。定量心理学与临床两条线都强。',
    gameified: {
      admission: { quota: '按项目招聘' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_unc',
    name: 'University of North Carolina at Chapel Hill',
    unit: 'Department of Psychology and Neuroscience',
    lab: 'L. L. Thurstone Psychometric Laboratory',
    region: 'overseas',
    city: 'Chapel Hill',
    tier: 'r1',
    domains: ['domain_psychometrics', 'domain_cognition'],
    impression: '心理测量学的祖庭之一。美国的 PhD 是五到六年,前两年还要上课。',
    gameified: {
      admission: { quota: '每年每个方向招个位数' },
      employment: { teachingLoad: '读博期间要带课' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_mpi_cbs',
    name: 'Max Planck Institute for Human Cognitive and Brain Sciences',
    unit: 'Leipzig',
    region: 'overseas',
    city: 'Leipzig',
    tier: 'europe',
    domains: ['domain_cogneuro'],
    impression: '认知神经的顶级研究所。设备是这个星球上最好的一档,没有本科生。',
    gameified: {
      admission: { quota: '按课题组招聘' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_ucl',
    name: 'University College London',
    unit: 'Division of Psychology and Language Sciences',
    region: 'overseas',
    city: 'London',
    tier: 'europe',
    domains: ['domain_cogneuro', 'domain_cognition'],
    impression: '认知神经科学的欧洲中心之一。伦敦,生活成本是另一个课题。',
    gameified: {
      admission: { quota: '按项目招聘,自费生也收' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_mrc_cbu',
    name: 'MRC Cognition and Brain Sciences Unit',
    unit: 'University of Cambridge',
    region: 'overseas',
    city: 'Cambridge',
    tier: 'europe',
    domains: ['domain_cogneuro', 'domain_cognition'],
    impression: '英国医学研究理事会的单位,规模小、密度高。',
    gameified: {
      admission: { quota: '名额极少' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_donders',
    name: 'Donders Institute',
    unit: 'Radboud University',
    region: 'overseas',
    city: 'Nijmegen',
    tier: 'europe',
    domains: ['domain_cogneuro'],
    impression: '脑成像方法学的重镇,预处理管线的很多标准出自这里。',
    gameified: {
      admission: { quota: '按项目招聘' },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
  {
    id: 'inst_hku',
    name: 'The University of Hong Kong',
    unit: 'Department of Psychology',
    region: 'overseas',
    city: '香港',
    tier: 'hk_sg',
    domains: ['domain_social', 'domain_clinical', 'domain_cognition'],
    impression: '离家近、英文授课、体系是英美那一套。很多人把它当作出去和留下之间的中间选项。',
    gameified: {
      admission: { quota: '博士名额与奖学金绑定' },
      employment: { tenureYears: 6 },
    },
    admits: ['phd_abroad', 'postdoc'],
  },
];
