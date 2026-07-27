import type { Position } from '@psy-sim/core';

/**
 * 求职季职位表(TECH 4.7.1)。**M5 消费,M3.5 先把数据和校验建起来。**
 *
 * 先建表的理由和院校表一样:`JOB_MARKET` 有七步内部流程,是唯一必须独立实现的屏。
 * 把它依赖的数据提前一个里程碑做好并让 validate 开始查,
 * M5 那一轮就只用写流程,不用同时调数据。
 *
 * ## `requires` 是硬门槛,不是概率
 *
 * 命中率由资本 × 方法 × 方向匹配算,而 `requires` 是**连投都投不了**的那条线。
 * 规则 14 要求每条 `requires` 在 simulate 里至少被满足过一次——
 * 一个永远拿不到的职位等于没写,而且它会静悄悄地把清单变短。
 *
 * ## 国内 / 海外各 ≥8(规则 15)
 *
 * 低于这个数,"投国内还是投海外"就不是一个选择了。
 */

/** 学术岗的共同底线:得有博士学位这条线由阶段保证,这里只管产出 */
const HAS_PAPERS = (n: number) => ({ flagNum: { key: 'paper_count', op: '>=' as const, value: n } });

export const positions: Position[] = [
  // ══════════ 国内高校教职 ══════════
  {
    id: 'pos_bnu_faculty',
    institutionId: 'inst_bnu',
    kind: 'faculty_cn',
    domainFit: ['domain_cogneuro', 'domain_development', 'domain_psychometrics'],
    requires: { all: [HAS_PAPERS(4), { stat: 'capital', op: '>=', value: 55 }] },
    marketYearBias: { 2025: 0.9, 2026: 0.8, 2027: 0.75 },
  },
  {
    id: 'pos_pku_faculty',
    institutionId: 'inst_pku',
    kind: 'faculty_cn',
    domainFit: ['domain_cogneuro', 'domain_cognition'],
    requires: { all: [HAS_PAPERS(5), { stat: 'capital', op: '>=', value: 60 }] },
    marketYearBias: { 2026: 0.8, 2027: 0.75 },
  },
  {
    id: 'pos_scnu_faculty',
    institutionId: 'inst_scnu',
    kind: 'faculty_cn',
    domainFit: ['domain_cogneuro', 'domain_education'],
    requires: { all: [HAS_PAPERS(3), { stat: 'capital', op: '>=', value: 45 }] },
  },
  {
    id: 'pos_ecnu_faculty',
    institutionId: 'inst_ecnu',
    kind: 'faculty_cn',
    domainFit: ['domain_education', 'domain_clinical'],
    requires: { all: [HAS_PAPERS(3), { stat: 'capital', op: '>=', value: 45 }] },
  },
  {
    id: 'pos_swu_faculty',
    institutionId: 'inst_swu',
    kind: 'faculty_cn',
    domainFit: ['domain_social', 'domain_health'],
    requires: HAS_PAPERS(2),
  },
  {
    id: 'pos_szu_faculty',
    institutionId: 'inst_szu',
    kind: 'faculty_cn',
    domainFit: ['domain_cogneuro', 'domain_social'],
    requires: { all: [HAS_PAPERS(3), { stat: 'method', op: '>=', value: 60 }] },
    twoBodyFriendly: true,
  },
  {
    id: 'pos_suda_faculty',
    institutionId: 'inst_suda',
    kind: 'faculty_cn',
    domainFit: ['domain_cognition', 'domain_education'],
    requires: HAS_PAPERS(2),
    twoBodyFriendly: true,
  },
  {
    id: 'pos_tjnu_faculty',
    institutionId: 'inst_tjnu',
    kind: 'faculty_cn',
    // **编制相对实、预聘压力小。** 门槛低不等于是差选择——
    // 这一条会在十年后以完全不同的面貌回来。
    domainFit: ['domain_cognition', 'domain_education'],
    requires: HAS_PAPERS(1),
    twoBodyFriendly: true,
  },
  {
    id: 'pos_njnu_faculty',
    institutionId: 'inst_njnu',
    kind: 'faculty_cn',
    domainFit: ['domain_education', 'domain_clinical'],
    requires: HAS_PAPERS(1),
    twoBodyFriendly: true,
  },
  {
    id: 'pos_snnu_faculty',
    institutionId: 'inst_snnu',
    kind: 'faculty_cn',
    domainFit: ['domain_education', 'domain_development'],
    requires: HAS_PAPERS(1),
    twoBodyFriendly: true,
  },

  // ══════════ 国内科研院所 ══════════
  {
    id: 'pos_cas_assoc',
    institutionId: 'inst_psych_cas',
    kind: 'institute_cn',
    domainFit: ['domain_cogneuro', 'domain_health'],
    requires: { all: [HAS_PAPERS(4), { stat: 'method', op: '>=', value: 65 }] },
  },
  {
    id: 'pos_zju_faculty',
    institutionId: 'inst_zju',
    kind: 'faculty_cn',
    domainFit: ['domain_cogneuro', 'domain_cognition'],
    requires: { all: [HAS_PAPERS(4), { stat: 'capital', op: '>=', value: 50 }] },
  },

  // ══════════ 海外 ══════════
  {
    id: 'pos_unc_tt',
    institutionId: 'inst_unc',
    kind: 'tenure_track_r1',
    domainFit: ['domain_psychometrics', 'domain_cognition'],
    requires: { all: [HAS_PAPERS(5), { stat: 'method', op: '>=', value: 70 }] },
    marketYearBias: { 2026: 0.7 },
  },
  {
    id: 'pos_uva_postdoc',
    institutionId: 'inst_uva',
    kind: 'europe',
    domainFit: ['domain_psychometrics', 'domain_cognition'],
    requires: HAS_PAPERS(2),
  },
  {
    id: 'pos_tilburg_postdoc',
    institutionId: 'inst_tilburg',
    kind: 'europe',
    domainFit: ['domain_psychometrics'],
    requires: HAS_PAPERS(2),
  },
  {
    id: 'pos_kuleuven_postdoc',
    institutionId: 'inst_kuleuven',
    kind: 'europe',
    domainFit: ['domain_psychometrics', 'domain_clinical'],
    requires: HAS_PAPERS(2),
  },
  {
    id: 'pos_mpi_postdoc',
    institutionId: 'inst_mpi_cbs',
    kind: 'europe',
    domainFit: ['domain_cogneuro'],
    requires: { all: [HAS_PAPERS(3), { stat: 'method', op: '>=', value: 65 }] },
  },
  {
    id: 'pos_ucl_lecturer',
    institutionId: 'inst_ucl',
    kind: 'europe',
    domainFit: ['domain_cogneuro', 'domain_cognition'],
    requires: { all: [HAS_PAPERS(5), { stat: 'capital', op: '>=', value: 55 }] },
  },
  {
    id: 'pos_donders_postdoc',
    institutionId: 'inst_donders',
    kind: 'europe',
    domainFit: ['domain_cogneuro'],
    requires: HAS_PAPERS(3),
  },
  {
    id: 'pos_hku_ap',
    institutionId: 'inst_hku',
    kind: 'hk_sg',
    domainFit: ['domain_social', 'domain_cognition', 'domain_clinical'],
    requires: { all: [HAS_PAPERS(4), { stat: 'capital', op: '>=', value: 50 }] },
    twoBodyFriendly: true,
  },
  {
    id: 'pos_mrc_postdoc',
    institutionId: 'inst_mrc_cbu',
    kind: 'europe',
    domainFit: ['domain_cogneuro', 'domain_cognition'],
    requires: HAS_PAPERS(3),
  },

  // ══════════ 退路(学术线之外的出口,M5/M6 消费)══════════
  {
    id: 'pos_pku6_clinical',
    institutionId: 'inst_pku6',
    kind: 'backup_hospital',
    domainFit: ['domain_clinical', 'domain_health'],
    requires: { stat: 'clinical', op: '>=', value: 55 },
  },
  {
    id: 'pos_smhc_clinical',
    institutionId: 'inst_smhc',
    kind: 'backup_hospital',
    domainFit: ['domain_clinical'],
    requires: { stat: 'clinical', op: '>=', value: 45 },
  },
];
