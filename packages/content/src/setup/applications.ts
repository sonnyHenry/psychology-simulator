import type { ApplicationOption } from '@psy-sim/core';

/**
 * 志愿填报 + 学院归属分流(GAME_DESIGN 2.5)。
 * 本作所有路径都是心理学,真正的分流是**心理学系挂在哪个学院下面**:
 * 学位、课程结构、后续哪条线顺畅,全由这一步决定。
 *
 * 院校名仍用占位标签。真实院校名要等 M3.5 建 `Institution` 表和 `LEDGER.md` 核对台账之后
 * 再落地——真实素材必须可核对,不能先散在文案里(见 TECH 19.1 / validate 规则 9–15)。
 *
 * 最后一档必须 `minScore: 0`,它是滑档兜底,引擎强依赖(handleApplication 找不到兜底会抛错)。
 * **滑档到二本不是失败**,它开启的是"从二本考到 985 读研"这条最有共鸣的翻身线之一。
 */
/**
 * 学院归属的开局塑形(GAME_DESIGN 2.5 的"后续影响"一列)。
 *
 * - **理学院**:方法起点最高(高数 + 编程 + 脑电室),临床资源最少
 * - **教育学院**:临床与教育线顺,**统计教得浅**——这个亏要在读研时才还
 * - **医学院**:临床起点最高、有精神科见习;但**没有处方权**这件事会反复扎你
 * - **师范**:兼有,顺带拿教师资格证
 *
 * 这不是四个等价的开局,是四张不同的牌。
 */
const collegeEffects = {
  science: [
    { stats: { method: 8, clinical: -3 } },
    { setFlag: 'college_science' },
  ],
  education: [
    { stats: { clinical: 5, method: -4 } },
    { setFlag: 'college_education' },
    // 统计教得浅。这个 flag 在读研的第一次组会上兑现。
    { setFlag: 'shallow_stats_training' },
  ],
  medical: [
    { stats: { clinical: 9, method: -2 } },
    { setFlag: 'college_medical' },
    // 没有处方权。这件事会在医院线反复扎你。
    { setFlag: 'knows_no_prescription_right' },
  ],
  normal: [
    { stats: { clinical: 3, capital: 3 } },
    { setFlag: 'college_normal' },
    { setFlag: 'teacher_cert_track' },
  ],
} as const;

export const applications: ApplicationOption[] = [
  {
    id: 'app_985',
    label: '冲一冲:某 985 综合院校',
    university: '某 985 综合院校',
    minScore: 640,
    effects: [{ setFlag: 'university_tier', value: '985' }],
    failEffects: [{ stats: { state: -6 } }],
    majors: [
      {
        id: 'm_985_science',
        name: '心理学(理学院)',
        college: 'science',
        effects: [...collegeEffects.science],
      },
      {
        id: 'm_985_medical',
        name: '心理学(医学院/精神卫生)',
        college: 'medical',
        effects: [...collegeEffects.medical],
      },
    ],
  },
  {
    id: 'app_211_normal',
    label: '稳一稳:某 211 师范大学',
    university: '某 211 师范大学',
    minScore: 590,
    effects: [{ setFlag: 'university_tier', value: '211' }],
    failEffects: [{ stats: { state: -4 } }],
    majors: [
      {
        id: 'm_211_normal',
        name: '心理学(师范类)',
        college: 'normal',
        effects: [...collegeEffects.normal],
      },
      {
        id: 'm_211_education',
        name: '应用心理学(教育学院)',
        college: 'education',
        effects: [...collegeEffects.education],
      },
    ],
  },
  {
    id: 'app_first_tier',
    label: '保底:某省属一本',
    university: '某省属一本',
    minScore: 520,
    effects: [{ setFlag: 'university_tier', value: '一本' }],
    majors: [
      {
        id: 'm_first_education',
        name: '应用心理学(教育学院)',
        college: 'education',
        effects: [...collegeEffects.education],
      },
      {
        id: 'm_first_science',
        name: '心理学(理学院)',
        college: 'science',
        effects: [...collegeEffects.science],
      },
    ],
  },
  {
    id: 'app_second_tier',
    label: '二本:某地方本科院校',
    university: '某地方本科院校',
    minScore: 0,
    effects: [{ setFlag: 'university_tier', value: '二本' }],
    majors: [
      {
        id: 'm_second_education',
        name: '应用心理学(教育学院)',
        college: 'education',
        effects: [...collegeEffects.education],
      },
      {
        id: 'm_second_normal',
        name: '心理学(师范类)',
        college: 'normal',
        effects: [...collegeEffects.normal],
      },
      {
        id: 'm_second_science',
        name: '心理学(理学院)',
        college: 'science',
        effects: [...collegeEffects.science],
      },
      {
        id: 'm_second_medical',
        name: '应用心理学(医学院)',
        college: 'medical',
        effects: [...collegeEffects.medical],
      },
    ],
  },
];
