import type { GlossaryEntry } from '@psy-sim/core';

/**
 * 专业术语唯一写法。
 *
 * 这里不收“所有心理学名词”，只收一旦写错就会破坏职业/时代真实性的高风险项。
 * `aliases` 不是同义词展示，而是 validate 必须拦截并提示替换的正文写法。
 */
export const glossary: GlossaryEntry[] = [
  {
    id: 'term_wais_iv',
    canonical: 'WAIS-IV',
    definition: '韦氏成人智力量表第四版。版本号统一使用半角罗马字母。',
    aliases: ['WAIS-Ⅳ', 'WAIS Ⅳ', '韦氏四'],
  },
  {
    id: 'term_registered_psychologist',
    canonical: '注册心理师',
    definition: '中国心理学会临床与咨询心理学专业机构和专业人员注册系统的专业人员称谓。',
    aliases: ['注册心理咨询师'],
  },
  {
    id: 'term_registered_supervisor',
    canonical: '注册督导师',
    definition: '中国心理学会注册系统的督导师称谓。',
    aliases: ['注册心理督导师'],
  },
  {
    id: 'term_national_counselor_level_2',
    canonical: '心理咨询师二级',
    definition: '已经退出国家职业资格目录的原国家职业资格称谓；不得写成取消后仍可报考。',
    validThroughYear: 2017,
  },
  {
    id: 'term_national_counselor_level_3',
    canonical: '心理咨询师三级',
    definition: '已经退出国家职业资格目录的原国家职业资格称谓；不得写成取消后仍可报考。',
    validThroughYear: 2017,
  },
  {
    id: 'role_counselor',
    canonical: '心理咨询师',
    definition: '提供心理咨询服务；不得被写成能够诊断、治疗精神障碍或开具处方。',
  },
  {
    id: 'role_psychotherapist',
    canonical: '心理治疗师',
    definition: '在医疗机构建制内从事心理治疗的卫生专业技术人员，不等同于心理咨询师。',
  },
  {
    id: 'role_psychiatrist',
    canonical: '精神科医生',
    definition: '具有医学教育和执业医师资质，可依法进行精神障碍诊疗及处方。',
  },
  {
    id: 'role_ambiguous_psych_doctor',
    canonical: '心理咨询师 / 心理治疗师 / 精神科医生（按实际建制选用）',
    definition: '“心理医生”无法区分咨询、治疗与医学角色，正文不得用它代替具体职业。',
    aliases: ['心理医生'],
  },
];
