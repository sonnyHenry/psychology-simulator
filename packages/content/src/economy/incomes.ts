import type { IncomeRule } from '@psy-sim/core';

/**
 * 年度收入规则。M4 先铺临床线——它是第一条真正"逐年过日子"到 2033 的路径,
 * 没有年度收入的话,督导费和个人体验会把玩家的钱单调扣到零。
 *
 * ## 收费档位:`fee_level`
 *
 * 从 200 到 800 的每一次涨价是一条真实的成长曲线,**但每一次都是一个事件,
 * 不是一个滑块**(`ev_cp_fee_*` 那几幕)。收入规则只读档位,不定义档位。
 *
 * 各档条件写成互斥(`==`),否则档位高的玩家会把每一档都拿一遍。
 * "手上有没有个案在谈"决定拿的是个案收入还是零工收入——
 * 一个整年没接个案的咨询师,收入表上不该出现"个案提成"这一行。
 */
export const incomes: IncomeRule[] = [
  {
    id: 'inc_clinical_grad',
    label: '实习津贴与兼职',
    when: {
      all: [{ career: 'clinical' }, { year: { to: 2021 } }],
    },
    amount: 9000,
  },
  {
    id: 'inc_clinical_idle',
    label: '零散的讲座和测评',
    when: {
      all: [
        { career: 'clinical' },
        { year: { from: 2022 } },
        { caseCount: { active: true, op: '==', value: 0 } },
      ],
    },
    amount: 18000,
  },
  {
    id: 'inc_clinical_fee0',
    label: '机构底薪与个案提成',
    when: {
      all: [
        { career: 'clinical' },
        { year: { from: 2022 } },
        { caseCount: { active: true, op: '>=', value: 1 } },
        { flagNum: { key: 'fee_level', op: '==', value: 0 } },
      ],
    },
    amount: 38000,
    // 在咨询室里工作,临床能力自然在长;这一行的压力也一样真实——
    // 接个案的年份没有"轻松的一年",stateDelta 是执业压力的系统性建模
    //(没有它,临床线后期的状态中位数会一路涨到 96,像退休而不是像执业)。
    clinicalDelta: 2,
    stateDelta: -2,
  },
  {
    id: 'inc_clinical_fee1',
    label: '个案收入(时薪三百上下)',
    when: {
      all: [
        { career: 'clinical' },
        { caseCount: { active: true, op: '>=', value: 1 } },
        { flagNum: { key: 'fee_level', op: '==', value: 1 } },
      ],
    },
    amount: 70000,
    clinicalDelta: 2,
    stateDelta: -2,
  },
  {
    id: 'inc_clinical_fee2',
    label: '个案收入(时薪五百上下)',
    when: {
      all: [
        { career: 'clinical' },
        { caseCount: { active: true, op: '>=', value: 1 } },
        { flagNum: { key: 'fee_level', op: '==', value: 2 } },
      ],
    },
    amount: 120000,
    clinicalDelta: 2,
    stateDelta: -2,
  },
  {
    id: 'inc_clinical_fee3',
    label: '个案收入(时薪八百,约到下个月)',
    when: {
      all: [
        { career: 'clinical' },
        { caseCount: { active: true, op: '>=', value: 1 } },
        { flagNum: { key: 'fee_level', op: '>=', value: 3 } },
      ],
    },
    amount: 190000,
    clinicalDelta: 2,
    stateDelta: -2,
  },
];
