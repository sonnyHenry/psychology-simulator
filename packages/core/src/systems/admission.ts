import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { GradApplyKind, Institution } from '../types/institution';
import type { Rng } from '../rng/rng';

/**
 * 读研 / 读博 / 博后的录取判定(TECH 4.7.2 / `systems/admission.ts`)。
 *
 * ## 一屏三用
 *
 * 三次选择在玩家侧是三个不同的高光时刻,在代码侧是**一个屏 + 三份数据**:
 * 同一张 `Institution` 表按 `kind` 过滤出不同清单,套不同的门槛与曲线。
 * 这是把"多次真实院校选择"的实现成本压到一个屏的关键。
 *
 * ## 概率不给玩家看精确值
 *
 * 清单上只显示"稳 / 较稳 / 冲 / 悬"(和高考报志愿那一屏同一套口径,复用 `CHANCE_TIERS`)。
 * 给精确概率会把这一屏变成一道最优化题,而**真实的申请里没有人知道自己的确切概率**——
 * 你只知道"这个有点冒险"。模糊本身就是这件事的一部分。
 */

/** 分档与高考报志愿同一套口径:差值越大越稳,冲高会滑档 */
export const ADMISSION_TIERS = [
  { minDiff: 18, chance: 0.94, label: '稳' },
  { minDiff: 0, chance: 0.72, label: '较稳' },
  { minDiff: -18, chance: 0.4, label: '冲' },
  { minDiff: -40, chance: 0.16, label: '悬' },
  { minDiff: -Infinity, chance: 0.04, label: '基本无望' },
] as const;

export type AdmissionTier = (typeof ADMISSION_TIERS)[number];
export interface AdmissionAssessment {
  minDiff: number;
  chance: number;
  label: AdmissionTier['label'];
}

/**
 * 顶尖单位不因为玩家数值很高就变成“稳”。名额、导师当年是否招生、方向竞争者
 * 这些清单外因素始终存在；它们不是玩家把方法和资本堆满就能消掉的。
 */
const SELECTIVITY_CEILING: Partial<Record<Institution['tier'], AdmissionTier['label']>> = {
  a_plus: '冲',
  institute: '冲',
  r1: '冲',
  hk_sg: '冲',
  a: '较稳',
  europe: '较稳',
};

/** 各档机构的门槛分。方法与资本的加权和要够到这条线才算"稳" */
const TIER_BAR: Record<Institution['tier'], number> = {
  a_plus: 78,
  a: 68,
  r1: 76,
  institute: 70,
  hospital: 62,
  europe: 66,
  hk_sg: 70,
  b_plus: 52,
  slac: 58,
};

/**
 * 不同 kind 的门槛整体平移。
 *
 * 读硕最松,读博紧一档,**出国最紧**——不是因为外国人更挑,
 * 是因为语言、推荐信、以及"没人认识你"这三件事在数值上只能合成一个门槛。
 * 博后介于两者之间:这时候看的是论文,而论文你已经有了或者没有。
 */
const KIND_BAR_SHIFT: Record<GradApplyKind, number> = {
  master: -8,
  phd: 0,
  phd_abroad: 10,
  postdoc: 4,
};

/**
 * 玩家在这次申请里的"实力分"。
 *
 * **方法是主项,资本是修正。** 这个配比是有意的:申请这件事上,
 * 你做了什么比你认识谁更重要——但认识谁仍然有用,而且在越靠上的档次越有用。
 * 论文按篇加,前两篇加得多、后面递减:第一篇论文改变的是"有没有",不是"有几篇"。
 */
export function applicantScore(state: GameState, kind: GradApplyKind): number {
  const papers = (state.papers ?? []).filter(paper => paper.tier !== 'preprint').length;
  const paperTerm = papers === 0 ? 0 : 10 + Math.min(18, (papers - 1) * 6);
  const advisorTerm = state.advisor ? Math.min(8, (state.advisor.favor - 50) / 6) : 0;
  const base = state.stats.method * 0.75 + state.stats.capital * 0.25;
  // 博后和出国看论文,读硕看基础
  const paperWeight = kind === 'master' ? 0.3 : 1;
  return base + paperTerm * paperWeight + advisorTerm;
}

/** 这个机构对这次申请的门槛分 */
export function admissionBar(inst: Institution, kind: GradApplyKind): number {
  return TIER_BAR[inst.tier] + KIND_BAR_SHIFT[kind];
}

/**
 * 方向匹配的加成。
 *
 * 玩家的 `domain_*` flag 命中机构 `domains` 就加分——**这是本科四年真正兑现的地方之一**:
 * 你大二泡在实验室里做的那个方向,四年后决定了哪几所学校会认真看你的材料。
 */
export function domainMatchBonus(state: GameState, inst: Institution): number {
  const matched = inst.domains.filter(d => Boolean(state.flags[d])).length;
  return matched === 0 ? -6 : Math.min(12, matched * 7);
}

export function admissionTierFor(
  state: GameState,
  inst: Institution,
  kind: GradApplyKind,
): AdmissionAssessment {
  const diff = applicantScore(state, kind) + domainMatchBonus(state, inst) - admissionBar(inst, kind);
  const raw = ADMISSION_TIERS.find(t => diff >= t.minDiff);
  if (!raw) throw new Error('unreachable: admission tier not found');
  const ceilingLabel = SELECTIVITY_CEILING[inst.tier];
  if (!ceilingLabel) return raw;
  const ceiling = ADMISSION_TIERS.find(t => t.label === ceilingLabel)!;
  // 标签还要表达模型里没有的风险（名额、导师是否招生、临场竞争），因此顶尖单位
  // 最多显示到“冲”。但抽签概率继续使用已经标定过的实力曲线；否则仅仅修正文案
  // 就会把强申请者大量送去调剂，并连带改写后续培养要求和结局分布。
  return raw.chance > ceiling.chance ? { ...raw, label: ceiling.label } : raw;
}

/** 这次申请的候选清单:按 `admits` 过滤,顺序按门槛从高到低——清单本身就是一张梯度表 */
export function institutionsFor(pack: ContentPack, kind: GradApplyKind): Institution[] {
  return (pack.institutions ?? [])
    .filter(inst => inst.admits.includes(kind))
    .sort((a, b) => admissionBar(b, kind) - admissionBar(a, kind));
}

/**
 * 投递上限。**不能全投。**
 *
 * 三所是有意压得紧的:申请材料是要一份份写的,而"给每个学校都写一份诚恳的套磁信"
 * 在现实里就是做不到。这个上限逼玩家真的排序,而不是把清单全勾上等结果。
 */
export const MAX_SHORTLIST = 3;

export interface AdmissionResult {
  outcomes: Record<string, 'admitted' | 'rejected'>;
  /** 想去的那几个里中了的最高一所。**全没中是常见结果**,所以允许 null */
  landed: string | null;
  /** 一个都没中,最后被兜底接住(调剂)。`landed` 这时是兜底那所 */
  viaAdjustment: boolean;
}

/**
 * 兜底(调剂)。**升学不该有"什么都没发生"这个结果。**
 *
 * `resolveAdmission` 允许全军覆没,那是它该有的样子——但如果游戏就此把玩家
 * 原样送进硕士阶段,那是在撒谎:他一所都没考上,却出现在了研一的组会上。
 *
 * 现实里这一步叫调剂,而它的质感恰恰是这条线最真实的部分之一:
 * **你最后去的是一个你本来根本没考虑过的地方**,而且你会在那里待三年。
 * 所以兜底取的是清单上门槛最低的那一所,并留下 `went_through_adjustment`,
 * 让后面的内容能读到"你是调剂来的"这件事。
 *
 * 求职季(M5)不适用这条:那里"一个 offer 都没有"是设计明确要的结果(GAME_DESIGN 9.3),
 * 因为找工作真的没有调剂。
 */
export function adjustmentTarget(
  pack: ContentPack,
  kind: GradApplyKind,
  exclude: string[],
): Institution | undefined {
  const list = institutionsFor(pack, kind).filter(i => !exclude.includes(i.id));
  return list[list.length - 1];
}

/**
 * 逐所判定,然后在录取的里面取门槛最高的那所。
 *
 * **一个都没中不是 bug。** 全冲高的人有相当的概率什么都拿不到,
 * 而那正是这一屏要教的事——它不会在屏上告诉你,它让你自己经历一次。
 * 落榜之后的去向由内容侧的事件接手(调剂、二战、或者不读了)。
 */
export function resolveAdmission(
  state: GameState,
  pack: ContentPack,
  kind: GradApplyKind,
  shortlist: string[],
  rng: Rng,
): AdmissionResult {
  const outcomes: Record<string, 'admitted' | 'rejected'> = {};
  const all = pack.institutions ?? [];
  for (const id of shortlist) {
    const inst = all.find(i => i.id === id);
    if (!inst) continue;
    outcomes[id] = rng.chance(admissionTierFor(state, inst, kind).chance) ? 'admitted' : 'rejected';
  }
  const admitted = Object.entries(outcomes)
    .filter(([, v]) => v === 'admitted')
    .map(([id]) => all.find(i => i.id === id))
    .filter((i): i is Institution => i !== undefined)
    .sort((a, b) => admissionBar(b, kind) - admissionBar(a, kind));
  if (admitted[0]) return { outcomes, landed: admitted[0].id, viaAdjustment: false };
  const fallback = adjustmentTarget(pack, kind, shortlist);
  return { outcomes, landed: fallback?.id ?? null, viaAdjustment: fallback !== undefined };
}
