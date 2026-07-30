import type { TraitCard } from '@psy-sim/core';

/**
 * 特质构筑:抽 4 选 2,整局不变(GAME_DESIGN 2.2)。
 * 九张卡的 statMods 直接照抄设计文档的表格,不做二次平衡。
 *
 * statMods 决定开局偏移；少数特质还用 poolBias 改变导演式随机池的相对权重。
 * poolBias 必须引用真实存在的事件 category，validate 会检查。
 */
export const traits: TraitCard[] = [
  {
    id: 'trait_rigorous',
    label: '强迫型严谨',
    text: '会为了 counterbalance 没做对而重跑整个实验。别人觉得你较真,你觉得别人在糊弄。',
    statMods: { method: 8, state: -5 },
  },
  {
    id: 'trait_empathic',
    label: '高共情',
    text: '你能接住别人的情绪,代价是那些情绪也留在你身上。',
    statMods: { clinical: 9, state: -6 },
  },
  {
    id: 'trait_quant',
    label: '数据癖',
    text: 'R 学得快,看到什么都想先画个图。',
    statMods: { method: 10, clinical: -5 },
  },
  {
    id: 'trait_pleaser',
    label: '边界弱',
    text: '什么活都接,导师喜欢你。一作变二作的时候你也不会说什么。',
    statMods: { capital: 8, state: -6 },
  },
  {
    id: 'trait_skeptic',
    label: '怀疑主义',
    text: '组会上你会问"这个效应量有多大"。问完之后场面通常会安静几秒。',
    statMods: { method: 7, capital: -5 },
  },
  {
    id: 'trait_communicator',
    label: '表达欲',
    text: '你会讲课,也会写科普。你讲的时候别人听得懂,这在这一行里比想象中稀缺。',
    statMods: { capital: 6, method: -4 },
  },
  {
    id: 'trait_resilient',
    label: '钝感力',
    text: '审稿人骂完照样睡得着。代价是来访者皱一下眉,你也可能没看见。',
    statMods: { state: 12, clinical: -6 },
  },
  {
    id: 'trait_perfectionist',
    label: '完美主义',
    text: '产出慢,但拿出手的东西挑不出毛病。稿子会在你硬盘里躺很久。',
    statMods: { method: 6, state: -4 },
  },
  {
    id: 'trait_curious',
    label: '好奇心',
    text: '每个答案都会再长出一个问题。你容易找到别人没追下去的岔路，也容易同时打开太多扇门。',
    statMods: { method: 5, clinical: 3, state: -3 },
    poolBias: { method: 1.2, research: 1.25 },
  },
];
