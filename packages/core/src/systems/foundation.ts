import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { Foundation } from '../types/institution';
import type { Project } from '../types/project';
import type { Rng } from '../rng/rng';
import { activeProjects } from './project';

/**
 * 文献可靠性机制:**你的课题地基塌了**(GAME_DESIGN 19.4)。
 *
 * 这是把真实文献变成玩法的核心设计,也是本作最有辨识度的一个机制。
 *
 * ## 它怎么运作
 *
 * 每个课题在创建时被绑上一条**理论基础**(一个真实效应 + 它的原始文献)。
 * 其中几条会在**真实的历史年份**发生重复失败。如果那一年你手上正有一个建在它之上的活跃课题,
 * 塌方事件就会砸下来——而你已经在这个课题上投了两三年。
 *
 * ## 两条配套设计,缺一个这个机制就不成立
 *
 * 1. **选课题时看不到哪条会塌。** 你只能看到当时的文献热度(`hypeYears`)。
 *    **事后看全是明牌,身处其中全是迷雾**——这是这个机制唯一想说的话。
 * 2. **怀疑主义特质在这里第一次变现。** `trait_skeptic` 的玩家能多看到一行 `skepticHint`,
 *    内容是那个当时就印在论文里、但没人在意的数字(原始研究的样本量)。
 *    **它不告诉你结论**,只是把那个数字放到你眼前。
 *
 * ## 年份一个都不许编
 *
 * 机制的全部说服力来自它和玩家的时间线真的对得上。编一个年份,
 * 这件事就从"真实"变成"编排",而它唯一的价值就是不编排。
 */

/** 这个课题建在哪条基础上 */
export function foundationOf(pack: ContentPack, project: Project): Foundation | undefined {
  if (!project.foundationId) return undefined;
  return (pack.foundations ?? []).find(f => f.id === project.foundationId);
}

/**
 * 给新课题挑一条基础。
 *
 * **按领域挑,而且不告诉玩家挑中了哪条。** 会塌的和不会塌的混在同一个池子里,
 * 抽到哪条纯看运气——这正是"身处其中全是迷雾"在数值上的样子。
 * 领域里一条都没有就返回 undefined:这个课题没有地基可塌,不是错误。
 */
export function pickFoundation(
  pack: ContentPack,
  domain: string,
  rng: Rng,
): Foundation | undefined {
  const pool = (pack.foundations ?? []).filter(
    f =>
      f.assignable !== false &&
      (f.domains.includes(`domain_${domain}`) || f.domains.includes(domain)),
  );
  if (pool.length === 0) return undefined;
  return rng.pick(pool);
}

/**
 * 今年有哪些课题的地基塌了。
 *
 * 由年度结算调用。**只看活跃课题**——已经发表或做废的课题地基塌不塌都与你无关了,
 * 而这恰好也是真实的:文章发出去之后那篇重复研究再出来,你只会在心里过一下。
 *
 * 毕业论文不参与:它是教学关,推进全部写死在内容里,砸一个塌方进去只会打乱那条线。
 */
export function collapsingProjects(
  state: GameState,
  pack: ContentPack,
): { project: Project; foundation: Foundation }[] {
  const hits: { project: Project; foundation: Foundation }[] = [];
  for (const project of activeProjects(state)) {
    if (project.isThesis) continue;
    if (project.foundationShaken) continue; // 一个课题只塌一次
    const foundation = foundationOf(pack, project);
    const failure = foundation?.replicationFailure;
    if (!foundation || !failure) continue;
    if (failure.year !== state.date.year) continue;
    hits.push({ project, foundation });
  }
  return hits;
}

/** 塌方事件的 id 约定:一条基础一个事件(validate 规则 13 查它存在且四个选项齐全) */
export function collapseEventId(foundationId: string): string {
  return `ev_collapse_${foundationId.replace(/^fnd_/, '')}`;
}

/**
 * 塌方事件必须有的四个选项(GAME_DESIGN 19.4 的表)。**四个都得在,少一个 validate 报错。**
 *
 * 因为这四个正好是现实里全部的四条路,而且**每一条都有真实代价**:
 * 硬发的会进结局页的"后来重复不出来"那一栏;改故事是正确做法但阴性结果难发;
 * 做重复是隐藏最优解但要多花一年;放弃最常见。
 * 少任何一个,这一幕就从"一个真实的两难"退化成"一个惩罚"。
 */
export const COLLAPSE_CHOICE_IDS = ['push_anyway', 'reframe', 'do_replication', 'abandon'] as const;
