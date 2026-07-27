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
  const papers = (state.papers ?? []).length;
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
): AdmissionTier {
  const diff = applicantScore(state, kind) + domainMatchBonus(state, inst) - admissionBar(inst, kind);
  const tier = ADMISSION_TIERS.find(t => diff >= t.minDiff);
  if (!tier) throw new Error('unreachable: admission tier not found');
  return tier;
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
  /** 最终去了哪。**一个都没中是高概率的真实结果**(GAME_DESIGN 9.3),所以允许 null */
  landed: string | null;
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
  return { outcomes, landed: admitted[0]?.id ?? null };
}
