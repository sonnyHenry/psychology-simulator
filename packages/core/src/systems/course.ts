import type { ContentPack, Course } from '../types/content';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';
import { applyEffects } from '../dsl/apply';

/**
 * 课程系统(GAME_DESIGN 8.2 / TECH 4.7.5)。
 *
 * 这个系统的**全部意义是能力标签**,不是属性。心理统计只是"过了"的角色,
 * 在后面所有涉及中介分析、混合线性模型、贝叶斯因子的事件里,只能选「点头,假装听懂了」。
 *
 * 而 `mastered_stats` 会在十年后的某个审稿事件里救你一命——这是全作跨度最长的一条因果链:
 * **大二期末的一次判定,在 2029 年兑现。**
 */

export type CourseTier = 'mastered' | 'passed' | 'failed';

/** 基础"学通"概率。什么都不投也有一点机会,但很小 */
const BASE_MASTERY = 0.06;
/** 每投一格精力的加成 */
const PER_SLOT = 0.18;
/** 相关属性每高于 50 一点的加成 */
const PER_STAT_POINT = 0.006;
/** 期末小测答对的加成 */
const EXAM_BONUS = 0.15;
/** "过了"与"挂了"的分界:没学通时再掷一次,低于此值算挂 */
const FAIL_RATE_WITHOUT_INVESTMENT = 0.35;
const FAIL_RATE_WITH_INVESTMENT = 0.08;

/** 该学年开设、且学院归属门控通过的课程 */
export function coursesForYear(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  year: 1 | 2 | 3 | 4,
): Course[] {
  const ctx = { state, pack, rng };
  return (pack.courses ?? []).filter(
    course => course.year === year && evalCondition(course.availableWhen, ctx),
  );
}

/** 本回合投在某门课上的格数(`allocation.picks` 里同一项可重复出现) */
export function slotsOnCourse(state: GameState, courseId: string): number {
  const picks = state.allocation?.picks ?? [];
  const items = picks.filter(id => id === allocationIdForCourse(courseId));
  return items.length;
}

/** 课程对应的投入项 id。约定式命名,内容侧和引擎侧共用同一个函数,避免两边写错 */
export function allocationIdForCourse(courseId: string): string {
  return `alloc_${courseId}`;
}

export function masteryChance(
  state: GameState,
  course: Course,
  slots: number,
  examCorrect: boolean,
): number {
  const stat = state.stats[course.statKey];
  const raw =
    BASE_MASTERY +
    PER_SLOT * slots +
    (stat - 50) * PER_STAT_POINT +
    (examCorrect ? EXAM_BONUS : 0);
  return Math.max(0.02, Math.min(0.95, raw));
}

/**
 * 年度结算时判定本学年所有课程,写入能力标签与三档效果。
 *
 * 重修代价(`{ grantSlots: -1 }`)在 `failed` 的 effects 里,但它作用于**下一年**——
 * 而 `grantedSlots` 每回合清零。所以重修用一个累积量记账,由下一年的分配屏读取。
 */
export function resolveCourses(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  year: 1 | 2 | 3 | 4,
): { courseId: string; label: string; tier: CourseTier }[] {
  const results: { courseId: string; label: string; tier: CourseTier }[] = [];
  for (const course of coursesForYear(state, pack, rng, year)) {
    const slots = slotsOnCourse(state, course.id);
    const examCorrect = state.courseExamResults?.[course.id] === true;
    const tier: CourseTier = rng.chance(masteryChance(state, course, slots, examCorrect))
      ? 'mastered'
      : rng.chance(slots > 0 ? FAIL_RATE_WITH_INVESTMENT : FAIL_RATE_WITHOUT_INVESTMENT)
        ? 'failed'
        : 'passed';
    if (tier === 'mastered' && course.masteryFlag) state.flags[course.masteryFlag] = true;
    applyEffects(course.outcomes[tier], state, pack);
    results.push({ courseId: course.id, label: course.label, tier });
  }
  state.lastCourseResults = results;
  state.courseExamResults = {};
  return results;
}

/**
 * 本学年需要考的期末小测:有 `finalExam` 的课程。
 *
 * **不要求玩家投入过这门课才考**——两座大山是必修,不投入也要考,
 * 只是不投入的人答对的概率低而已(而且答对也救不了没投入的判定)。
 */
export function pendingCourseExams(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  year: 1 | 2 | 3 | 4,
): { courseId: string; questionId: string }[] {
  const pending: { courseId: string; questionId: string }[] = [];
  for (const course of coursesForYear(state, pack, rng, year)) {
    const ids = course.finalExam?.questionIds ?? [];
    if (ids.length === 0) continue;
    pending.push({ courseId: course.id, questionId: rng.pick(ids) });
  }
  return pending;
}
