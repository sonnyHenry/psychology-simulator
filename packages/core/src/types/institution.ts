/**
 * 真实素材层的数据模型:院校 · 职位 · 文献(GAME_DESIGN 十九节 / TECH 4.7.1)。
 *
 * 这三张表是**内容资产**,不是事件——它们量大、结构规整、需要独立校验,
 * 由事件和申请屏引用。把它们从文案里提出来做成数据层的理由是:
 * 求职季(M5)和课题管线(M3)都要读同一份院校表,先建层后面两条一级线才能同时受益。
 *
 * ## 三条不可动摇的规范(GAME_DESIGN 19.1 / 19.2)
 *
 * 1. **院校、建制、实验室、方向、制度一律用真实的。** 这些是公开事实,写准了才有共鸣。
 * 2. **所有人名一律虚构。** 导师六原型里有"边界感差的"(挂名、抢一作),
 *    把它安在真实可查的个体身上是诽谤,免责声明豁免不了。
 *    这一条对所有原型一视同仁——只对负面原型虚构等于反向指认。
 * 3. **待遇条款是游戏化近似,不是真实招聘信息。** 只用区间和量级表达,并在屏上声明一次。
 *    `validate` 规则 12 强制这条声明必须存在且非空。
 */

import type { Condition } from './dsl';

/** 机构档次。国内按学科评估口径,海外按体系分,医院和科研院所各自成档 */
export type InstitutionTier =
  | 'a_plus'
  | 'a'
  | 'b_plus'
  | 'institute'
  | 'hospital'
  | 'r1'
  | 'slac'
  | 'europe'
  | 'hk_sg';

/**
 * 游戏化条款。**每一个字段都是近似,不是真实招聘信息。**
 *
 * 金额一律用区间(`[下限, 上限]`)而不是精确值——精确数字会被读成"这个学校就是给这么多",
 * 而那既不真实也不负责任。UI 顶部的常驻声明是这条规范的第二道保险。
 */
export interface GameifiedTerms {
  /**
   * **招生侧**:一个申请读书的人会关心的。这一组会出现在 `GRAD_APPLY` 上。
   */
  admission?: {
    /** 招生指标的描述,不是名额数字 */
    quota?: string;
    /** 学制或培养年限的描述 */
    duration?: string;
    /** 资助方式:奖学金、雇员合同、有没有补助 */
    funding?: string;
  };
  /**
   * **聘用侧**:一个找教职的人才关心的。这一组只出现在求职季(M5 的 `JOB_MARKET`)。
   *
   * **分开不是洁癖,是因为混过一次。** 第一版把两类条款放在一个扁平结构里,
   * `describeTerms` 不管什么申请都全量渲染,于是**读硕的清单上印着"预聘期约 6 年、
   * 预聘期内要有代表作与主持项目"**——一个考研的人根本不该看到这行字,
   * 它属于十年之后的另一个屏。
   *
   * 拆成两组之后,这个错误在类型层面就写不出来了:`GRAD_APPLY` 拿不到 `employment`。
   */
  employment?: {
    /** 首次考核年限(预聘期) */
    tenureYears?: number;
    /** 考核指标的**描述**,不是指标本身 */
    tenureBar?: string;
    /** 启动经费区间,单位元。量级正确即可 */
    startupFunds?: [number, number];
    /** '2-2' | '3-3' | '年均 200 课时' */
    teachingLoad?: string;
    /** 是否直接给编制/长聘 */
    tenured?: boolean;
    housing?: string;
  };
}

export interface Institution {
  id: string;
  /** 真实名称 */
  name: string;
  /** 真实建制:'心理学部' / '心理与认知科学学院' */
  unit: string;
  /** 真实实验室或中心。没有公开的就不写——**不许编** */
  lab?: string;
  region: 'cn' | 'overseas';
  city: string;
  tier: InstitutionTier;
  /** 真实方向标签,用于和玩家的 `domain_*` flag 匹配 */
  domains: string[];
  /**
   * 清单上展示的公开印象。
   *
   * **不含对具体个人的评价**,也不含"这里的老师怎么样"这类无法核实的话。
   * 只写建制、方向、体量这些公开事实,以及一句这个地方在圈里的位置。
   */
  impression: string;
  gameified: GameifiedTerms;
  /**
   * 这个机构出现在哪几次申请的清单里。**一屏三用靠的就是这个字段。**
   *
   * 不用 `region`/`tier` 反推:那样"深圳大学收不收博后"会变成一条藏在过滤器里的规则,
   * 改起来得读代码。写成数据,清单构成一眼可查,validate 也能直接数每种 kind 够不够 8 条。
   */
  admits: GradApplyKind[];
}

/** 求职季清单的一行。M5 消费,M3.5 先把数据和校验建起来 */
export type PositionKind =
  | 'faculty_cn'
  | 'institute_cn'
  | 'tenure_track_r1'
  | 'slac'
  | 'europe'
  | 'hk_sg'
  | 'backup_hospital'
  | 'backup_industry'
  | 'backup_clinic'
  | 'backup_school';

export interface Position {
  id: string;
  institutionId: string;
  kind: PositionKind;
  /** 与玩家 domain 匹配则大幅提高命中率 */
  domainFit: string[];
  /** 硬门槛(资本 / 论文 / 基金) */
  requires: Condition;
  /** 市场松紧:按年份调整命中率 */
  marketYearBias?: Record<number, number>;
  twoBodyFriendly?: boolean;
}

/**
 * 已发表文献的引用。
 *
 * `verified` **是一个流程字段,不是装饰**:validate 拒绝任何 `verified !== true` 的引用进入构建
 * (规则 9)。核对台账在 `content/src/citations/LEDGER.md`,逐条记核对人与核对日期。
 *
 * 理由是 GAME_DESIGN 二十二节第 10 条:**把真实文献的结论写反是这个游戏最不能犯的错。**
 * 一个讲科研诚信的游戏如果自己把文献说错了,它讲的每一句都不成立。
 */
export interface Citation {
  id: string;
  /** '姓氏 et al.' —— 不写全名,也不写名 */
  authors: string;
  year: number;
  venue: string;
  /** 一句话结论。**必须与原文结论方向一致** */
  gist: string;
  verified: boolean;
}

/**
 * 理论基础。文献可靠性机制的核心(M3.6 消费,M3.5 先建数据)。
 *
 * `replicationFailure.year` **必须是真实历史年份**——机制的全部说服力来自
 * 它和玩家在游戏里的时间线真的对得上:2015 年读到那篇大规模重复研究,
 * 是因为它 2015 年真的发表了。
 */
export interface Foundation {
  id: string;
  label: string;
  domains: string[];
  origin: Citation;
  /** 这个效应当年的热度区间 */
  hypeYears: [number, number];
  /** null = 至今站得住 */
  replicationFailure: { year: number; citation: Citation } | null;
  /** 怀疑主义特质在选课题屏额外看到的一行(通常是原始研究的样本量) */
  skepticHint?: string;
}

/**
 * 读研 / 读博 / 博后的申请状态。**一屏三用**(TECH 4.7.2)。
 *
 * 三次选择在玩家侧是三个不同的高光时刻,在代码侧是一个屏 + 三份数据:
 * 同一份 `Institution` 表按 `kind` 过滤出不同清单、套不同门槛和录取曲线。
 */
export type GradApplyKind = 'master' | 'phd' | 'phd_abroad' | 'postdoc';

export interface GradApplicationState {
  kind: GradApplyKind;
  /** 玩家从清单里选的目标 */
  shortlist: string[];
  outcomes: Record<string, 'admitted' | 'rejected' | 'waitlist'>;
  /** 最终去了哪。null = 一个都没中 */
  landed: string | null;
}
