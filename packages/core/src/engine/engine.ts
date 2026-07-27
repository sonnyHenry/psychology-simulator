import type { ContentPack, ExamQuestion, PhaseConfig } from '../types/content';
import type { GameifiedTerms, GradApplyKind } from '../types/institution';
import type { Condition, Effect } from '../types/dsl';
import type { GameState } from '../types/state';
import type { PlayerAction, ViewModel } from '../types/view';
import type { StatDeltas, StatKey } from '../types/stats';
import { Rng, randomSeed } from '../rng/rng';
import { applyEffects } from '../dsl/apply';
import { evalCondition } from '../dsl/evaluate';
import { pickRoundEvents } from '../systems/scheduler';
import { findEnding } from '../systems/ending';
import { selectContextLine } from '../systems/context-lines';
import {
  availableItems,
  effectiveSlots,
  RETAKE_FLAG,
  settleAllocation,
  validateAllocation,
} from '../systems/allocation';
import { pendingCourseExams, resolveCourses } from '../systems/course';
import {
  ageProjects,
  activeProjects,
  allocationIdForProject,
  applyProjectOp,
  findTemplate,
  isAtFinalStage,
  tierForQuality,
  advanceAttempts,
  ATTEMPTS_PER_STARTUP_SLOT,
  investedSlotsOn,
  shouldAbandonBySilence,
  stageSuccessChance,
  acceptanceChance,
  MAX_STARTUP_ADVANCES,
} from '../systems/project';
import { advisorDefOf, drawAdvisorOffer, joinAdvisor } from '../systems/advisor';
import { admissionTierFor, institutionsFor, MAX_SHORTLIST, resolveAdmission } from '../systems/admission';
import { collapseEventId, collapsingProjects, foundationOf, pickFoundation } from '../systems/foundation';
import { readNumericFlag } from '../dsl/evaluate';

export interface Engine {
  start(seed?: number): GameState;
  view(state: GameState): ViewModel;
  dispatch(state: GameState, action: PlayerAction): GameState;
}

const EXAM_BASE_SCORE = 330;
const EXAM_SCORE_RANGE = 270;
const EXAM_SKIP_RATE = 0.55;
const TRAIT_OFFER_COUNT = 4;
const TRAIT_PICK_COUNT = 2;
/** 导师抽卡亮几张。三张够挑,又不至于变成一张清单 */
const ADVISOR_OFFER_COUNT = 3;
/** 同期人物默认选几位。**本作恋人线不强制**,所以没有"必选人物"这个概念(前作有) */
const DEFAULT_NPC_PICK_COUNT = 2;

const RELATIONSHIP_WARM_MILESTONES: Readonly<Record<string, number>> = {
  love: 3,
  roommate: 3,
  mentor: 2,
  grinder: 3,
  hometown: 2,
};

/** 与 dsl/apply.ts 的 clampStat 同一口径:钱只有下限,其余 0–100 */
function clampStatValue(key: StatKey, value: number): number {
  if (key === 'money') return Math.max(0, Math.round(value));
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addDeltas(target: StatDeltas, source: StatDeltas): void {
  for (const [key, value] of Object.entries(source) as [StatKey, number][]) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function invalid(state: GameState, action: PlayerAction): never {
  throw new Error(`Invalid action ${action.type} on screen ${state.screen}`);
}

export function createEngine(pack: ContentPack): Engine {
  const eventsById = new Map(pack.events.map(e => [e.id, e]));
  // 高考题与课程小测题共用 EXAM 屏,所以查表要合并两个题库
  const questionsById = new Map(
    [...pack.examBank, ...(pack.courseExamBank ?? [])].map(q => [q.id, q]),
  );
  const coursesById = new Map((pack.courses ?? []).map(c => [c.id, c]));

  function phaseAt(index: number): PhaseConfig {
    const phase = pack.timeline[index];
    if (!phase) throw new Error(`Timeline has no phase at index ${index}`);
    return phase;
  }

  function admissionScore(state: GameState): number {
    return state.profile.examScore ?? 0;
  }

  // 面向玩家的文案占位符替换:{{ta}} = 恋人第三人称(与玩家性别相反)。
  // 女玩家 → 恋人是男性 → '他';其余(男玩家/未设置的旧存档)→ '她'。
  // 纯函数,不读写 state/RNG,仅在 view() 投影文案时调用,不影响存档回放。
  function renderText(text: string, state: GameState): string {
    const partner = state.flags.player_gender === 'female' ? '他' : '她';
    const project = state.projects?.find(p => p.id === state.currentProjectId);
    const advisor = advisorDefOf(state, pack);
    // 管线阶段文案**一律参数化**(TECH 第九节 M7.5 的两条纪律之一)。
    // 事后补参数化的成本是当初就那么写的三到五倍——前作补了九轮变体池,那就是学费。
    return text
      .replace(/\{\{ta\}\}/g, partner)
      .replace(/\{\{project\}\}/g, project?.title ?? '你的课题')
      .replace(/\{\{years\}\}/g, String((project?.yearsSpent ?? 0) + 1))
      .replace(/\{\{advisor\}\}/g, advisor?.name ?? '你导师');
  }

  const traitLabelById = new Map(pack.traits.map(t => [t.id, t.label]));

  // 特质门控的选项/事件在 UI 上打【特质名】标签,让玩家看见"这是我的特质带来的"。
  // 只识别"必然要求某特质"的条件(顶层 flag 或 all 分支),any 里的备选不算必需。
  function requiredTraitLabel(cond: Condition | undefined): string | null {
    if (!cond) return null;
    if ('flag' in cond && cond.flag.startsWith('trait_')) {
      if (cond.equals === undefined || cond.equals === true) {
        return traitLabelById.get(cond.flag) ?? null;
      }
      return null;
    }
    if ('all' in cond) {
      for (const child of cond.all) {
        const label = requiredTraitLabel(child);
        if (label) return label;
      }
    }
    return null;
  }

  function withTraitTag(text: string, cond: Condition | undefined): string {
    const label = requiredTraitLabel(cond);
    return label ? `【${label}】${text}` : text;
  }

  // 录取概率按(加成后分数 - 批次线)分段:冲高批次可能滑档
  const CHANCE_TIERS = [
    { minDiff: 20, chance: 1, label: '稳' },
    { minDiff: 0, chance: 0.9, label: '较稳' },
    { minDiff: -20, chance: 0.45, label: '冲' },
    { minDiff: -45, chance: 0.18, label: '悬' },
    { minDiff: -Infinity, chance: 0.05, label: '基本无望' },
  ] as const;

  function admissionTier(diff: number) {
    const tier = CHANCE_TIERS.find(t => diff >= t.minDiff);
    if (!tier) throw new Error('unreachable: admission tier not found');
    return tier;
  }

  /** 当前阶段声明的申请种类。声明了 GRAD_APPLY 步骤就必须写(validate 规则 13) */
  function gradApplyKindOf(state: GameState): GradApplyKind | undefined {
    const phase = phaseAt(state.phaseIndex);
    return phase.kind === 'flow' ? phase.gradApplyKind : undefined;
  }

  /**
   * `GRAD_APPLY` 上的条款行。**只读招生侧。**
   *
   * 第一版把 `gameified` 的所有字段一股脑渲染出来,于是**读硕的清单上印着
   * "预聘期约 6 年 · 预聘期内要有代表作与主持项目"**——一个考研的人不该看到这行字,
   * 那是十年之后求职季才关心的东西,放在这里既没用又误导。
   *
   * 现在聘用条款在类型上就够不着:`gameified.employment` 由 M5 的 `JOB_MARKET` 消费。
   */
  function describeTerms(inst: { gameified: GameifiedTerms }): string[] {
    const a = inst.gameified.admission;
    if (!a) return [];
    return [a.quota, a.duration, a.funding].filter((x): x is string => Boolean(x));
  }

  /**
   * 当前在哪个岔口。岔口是 flow 阶段,分组名就用阶段 id——
   * 于是"大四三岔口"和"硕士岔口"共用同一个屏,靠内容的 `group` 区分。
   */
  function crossroadGroup(state: GameState): string {
    return phaseAt(state.phaseIndex).id;
  }

  /**
   * 这个事件在说哪个课题。
   *
   * 优先用调度器写下的绑定;**被 `schedule` 排进来的阶段事件没有绑定**
   * (创建课题时顺手排一个想法阶段的事件就是这种情况),这时按事件声明的阶段
   * 去找最近一个正卡在那一站的课题。找不到就不绑——文案会退回"你的课题"。
   */
  function boundProjectId(state: GameState, ev: { id: string; projectStage?: string }): string | undefined {
    const explicit = state.eventProjects?.[ev.id];
    if (explicit) return explicit;
    if (!ev.projectStage) return undefined;
    const match = [...activeProjects(state)].reverse().find(p => p.stage === ev.projectStage);
    return match?.id;
  }

  /** 当前学年(1–4)。阶段没声明 `courseYearFrom` 就是没有课的阶段 */
  function currentCourseYear(state: GameState): 1 | 2 | 3 | 4 | null {
    const phase = phaseAt(state.phaseIndex);
    if (phase.kind !== 'rounds' || phase.courseYearFrom === undefined) return null;
    const year = phase.courseYearFrom + state.roundIndex;
    return year >= 1 && year <= 4 ? (year as 1 | 2 | 3 | 4) : null;
  }

  function start(seed?: number): GameState {
    const actualSeed = seed ?? randomSeed();
    const npcs: GameState['npcs'] = {};
    return {
      schemaVersion: 1,
      seed: actualSeed,
      rngState: actualSeed,
      screen: 'TITLE',
      phaseIndex: -1,
      flowStepIndex: 0,
      roundIndex: 0,
      roundCounter: 0,
      date: { year: 2014, month: 6 },
      currentBrief: null,
      eventQueue: [],
      eventCursor: 0,
      pendingOutcome: null,
      pendingFlowAdvance: false,
      forcedEndingId: null,
      pendingJumpPhaseId: null,
      examPaper: [],
      examCursor: 0,
      examCorrect: 0,
      examEarnedPoints: 0,
      // 方法与临床的真实起点在开局流程里被覆写:
      // 方法 ← resolveExamScore(高考分数)+ 学院归属;临床 ← 背景卡。这里只给一个不影响判定的占位。
      stats: { method: 40, clinical: 10, capital: 5, state: 65, money: 0 },
      profile: {
        background: null,
        track: null,
        examScore: null,
        university: null,
        major: null,
        career: null,
      },
      flags: {},
      npcs,
      pendingNpcEvents: [],
      scheduled: [],
      triggeredEventIds: [],
      history: [],
      endingId: null,
      lastSettlement: null,
      yearlySnapshots: [],
    };
  }

  function view(state: GameState): ViewModel {
    switch (state.screen) {
      case 'TITLE':
        return { kind: 'TITLE', title: pack.meta.title };
      case 'BACKGROUND_DRAW': {
        const card = pack.backgrounds.find(b => b.id === state.profile.background);
        if (!card) throw new Error('BACKGROUND_DRAW screen without a drawn card');
        const offer = (state.traitOffer ?? [])
          .map(id => pack.traits.find(t => t.id === id))
          .filter((t): t is NonNullable<typeof t> => Boolean(t));
        return {
          kind: 'BACKGROUND_DRAW',
          card,
          traitOffer: offer,
          pickCount: Math.min(TRAIT_PICK_COUNT, offer.length),
        };
      }
      case 'SETUP':
        return { kind: 'SETUP', genders: ['male', 'female'], tracks: ['文', '理'] };
      case 'EXAM': {
        const qid = state.examPaper[state.examCursor];
        const q = qid ? questionsById.get(qid) : undefined;
        if (!q) throw new Error('EXAM screen without a current question');
        return {
          kind: 'EXAM',
          index: state.examCursor,
          total: state.examPaper.length,
          question: { id: q.id, subject: q.subject, text: q.text, options: q.options },
        };
      }
      case 'EXAM_RESULT':
        return {
          kind: 'EXAM_RESULT',
          score: state.profile.examScore ?? 0,
          correct: state.examCorrect,
          total: state.examPaper.length,
        };
      case 'APPLICATION':
        return {
          kind: 'APPLICATION',
          score: state.profile.examScore ?? 0,
          options: pack.applications.map(opt => {
            const tier = admissionTier(admissionScore(state) - opt.minScore);
            return {
              id: opt.id,
              label: opt.label,
              university: opt.university,
              chanceLabel: tier.label,
              risky: tier.chance < 1,
              majors: opt.majors.map(m => ({ id: m.id, name: m.name })),
            };
          }),
        };
      case 'NPC_SELECTION':
        // 本作没有必选人物:恋人线不强制,`requiredNpcs` 恒为空数组(字段保留给 UI 兼容)
        return {
          kind: 'NPC_SELECTION',
          requiredNpcs: [],
          npcs: pack.npcs.map(npc => ({
            id: npc.id,
            name: npc.name,
            description: npc.description ?? '',
          })),
          pickCount: Math.min(pack.meta.npcPickCount ?? DEFAULT_NPC_PICK_COUNT, pack.npcs.length),
        };
      case 'LIFE_GOAL':
        return {
          kind: 'LIFE_GOAL',
          goals: pack.lifeGoals.map(goal => ({ id: goal.id, label: goal.label, text: goal.text })),
        };
      case 'GRAD_APPLY': {
        const kind = gradApplyKindOf(state) ?? 'master';
        return {
          kind: 'GRAD_APPLY',
          year: state.date.year,
          applyKind: kind,
          notice: pack.gameifiedTermsNotice ?? '',
          maxPicks: MAX_SHORTLIST,
          options: institutionsFor(pack, kind).map(inst => ({
            id: inst.id,
            name: inst.name,
            unit: inst.unit,
            ...(inst.lab ? { lab: inst.lab } : {}),
            city: inst.city,
            impression: inst.impression,
            matchedDomains: inst.domains.filter(d => Boolean(state.flags[d])),
            terms: describeTerms(inst),
            chanceLabel: admissionTierFor(state, inst, kind).label,
          })),
        };
      }
      case 'GRAD_RESULT': {
        const app = state.gradApplication;
        const all = pack.institutions ?? [];
        const landed = all.find(i => i.id === app?.landed);
        const results = (app?.shortlist ?? []).map(id => {
          const inst = all.find(i => i.id === id);
          return {
            name: inst?.name ?? id,
            unit: inst?.unit ?? '',
            admitted: app?.outcomes[id] === 'admitted',
          };
        });
        const anyAdmitted = results.some(r => r.admitted);
        return {
          kind: 'GRAD_RESULT',
          year: state.date.year,
          applyKind: app?.kind ?? 'master',
          results,
          landedName: landed?.name ?? null,
          landedUnit: landed?.unit ?? null,
          viaAdjustment: app?.viaAdjustment ?? false,
          text: anyAdmitted
            ? '你把那个页面刷新了好几遍。'
            : app?.viaAdjustment
              ? '想去的那几个,一个都没有。\n\n**你是在调剂系统里找到下家的**——那几天你把从没考虑过的学校名字念了一遍又一遍,然后填了一个。\n\n你会在那里待三年。'
              : '想去的那几个,一个都没有。',
        };
      }
      case 'CROSSROAD': {
        const group = crossroadGroup(state);
        const rng = new Rng(state.rngState);
        const ctx = { state, pack, rng };
        return {
          kind: 'CROSSROAD',
          year: state.date.year,
          university: state.profile.university ?? '这所大学',
          major: state.profile.major ?? '你的专业',
          group,
          options: (pack.crossroadOptions ?? [])
            .filter(opt => opt.group === group && evalCondition(opt.availableWhen, ctx))
            .map(opt => ({
              id: opt.id,
              label: opt.label,
              text: renderText(opt.text, state),
              ...(opt.hint === undefined ? {} : { hint: opt.hint }),
            })),
        };
      }
      case 'ADVISOR_DRAW': {
        const candidates = (state.advisorOffer ?? [])
          .map(id => (pack.advisors ?? []).find(a => a.id === id))
          .filter((a): a is NonNullable<typeof a> => Boolean(a));
        return {
          kind: 'ADVISOR_DRAW',
          year: state.date.year,
          // **只投影公开印象。** archetype 不进 ViewModel——这是七节那个信息差的机制保证,
          // 一旦漏出去,"你什么都不知道的时候可以换"就不成立了。
          candidates: candidates.map(a => ({
            id: a.id,
            name: a.name,
            publicImpression: renderText(a.publicImpression, state),
          })),
        };
      }
      case 'PROJECT_BOARD':
        return {
          kind: 'PROJECT_BOARD',
          year: state.date.year,
          projects: activeProjects(state).map(p => ({
            id: p.id,
            title: p.title,
            stage: p.stage,
            yearsSpent: p.yearsSpent,
            authorship: p.authorship,
            isThesis: Boolean(p.isThesis),
            // **怀疑主义特质在这里第一次变现**(GAME_DESIGN 19.4)。
            // 多给一行原始研究的样本量——那个当时就印在论文里、但没人在意的数字。
            // **它不告诉你结论**,只是把数字放到你眼前;要不要往下想是你的事。
            ...(state.flags.trait_skeptic
              ? { foundationHint: foundationOf(pack, p)?.skepticHint }
              : {}),
          })),
          papers: (state.papers ?? []).map(paper => ({
            title: paper.title,
            tier: paper.tier,
            authorship: paper.authorship,
            year: paper.year,
          })),
          advisorName: advisorDefOf(state, pack)?.name ?? null,
        };
      case 'ALLOCATION': {
        const phase = phaseAt(state.phaseIndex);
        const rng = new Rng(state.rngState);
        return {
          kind: 'ALLOCATION',
          year: state.date.year,
          phaseLabel: phase.label,
          slots: state.allocation?.slots ?? 0,
          retakeSlots: readNumericFlag(state.flags[RETAKE_FLAG]),
          items: availableItems(state, pack, rng).map(item => {
            const textbook = item.courseId ? coursesById.get(item.courseId)?.textbook : undefined;
            return {
              id: item.id,
              label: item.label,
              text: renderText(item.text, state),
              category: item.category,
              maxSlots: item.maxSlots ?? null,
              ...(textbook === undefined ? {} : { textbook }),
            };
          }),
        };
      }
      case 'BRIEF': {
        const phase = phaseAt(state.phaseIndex);
        return {
          kind: 'BRIEF',
          phaseLabel: phase.label,
          year: state.date.year,
          text: renderText(state.currentBrief ?? '', state),
        };
      }
      case 'EVENT': {
        const evId = state.eventQueue[state.eventCursor];
        const ev = evId ? eventsById.get(evId) : undefined;
        if (!ev) throw new Error('EVENT screen without a current event');
        const rng = new Rng(state.rngState);
        // `view()` 是纯函数,不能改 state。但 `{{project}}` 和 `visibleIf` 里的
        // `{ projectRoll }` 都需要知道这个事件绑定的是哪个课题,所以在**投影用的副本**上绑定。
        const bound = boundProjectId(state, ev);
        const state2 = bound ? { ...state, currentProjectId: bound } : state;
        const ctx = { state: state2, pack, rng };
        const presentation = ev.presentationVariants?.find(variant =>
          evalCondition(variant.condition, ctx),
        );
        const contextLine = selectContextLine(ev, ctx);
        const visible = ev.choices.filter(c =>
          evalCondition(c.visibleIf, ctx),
        );
        return {
          kind: 'EVENT',
          eventId: ev.id,
          title: withTraitTag(renderText(presentation?.title ?? ev.title, state2), ev.trigger),
          text: [presentation?.text ?? ev.text, contextLine?.text]
            .filter((part): part is string => Boolean(part))
            .map(part => renderText(part, state2))
            .join('\n\n'),
          major: ev.tier === 'major',
          choices: visible.map(c => ({
            id: c.id,
            text: withTraitTag(renderText(c.text, state2), c.visibleIf),
          })),
        };
      }
      case 'OUTCOME':
        const latestEntry = state.history[state.history.length - 1];
        const relationshipTag = latestEntry?.kind === 'event' ? latestEntry.outcomeTag : undefined;
        const relationshipMatch = relationshipTag?.match(/^([a-z]+)_(warm|cool)$/);
        let relationshipHint: string | undefined;
        if (relationshipMatch) {
          const prefix = relationshipMatch[1]!;
          const temperature = relationshipMatch[2]!;
          const relationshipEntries = state.history.filter(entry =>
            entry.kind === 'event' && entry.outcomeTag?.startsWith(`${prefix}_`),
          );
          if (relationshipEntries.length === 1) {
            relationshipHint = '你的选择会被这段关系记住，并可能影响多年后的相处。';
          } else if (temperature === 'warm') {
            const warmCount = relationshipEntries.filter(entry =>
              entry.kind === 'event' && entry.outcomeTag === `${prefix}_warm`,
            ).length;
            if (warmCount === RELATIONSHIP_WARM_MILESTONES[prefix]) {
              relationshipHint = '一路积累的默契，正在改变这段关系未来的走向。';
            }
          }
        }
        return {
          kind: 'OUTCOME',
          text: renderText(state.pendingOutcome?.text ?? '', state),
          deltas: state.pendingOutcome?.deltas ?? {},
          relationshipHint,
        };
      case 'SETTLEMENT':
        return {
          kind: 'SETTLEMENT',
          year: state.date.year,
          stats: state.stats,
          incomes: state.lastSettlement?.incomes ?? [],
          moneyDelta: state.lastSettlement?.moneyDelta ?? 0,
          milestone: state.lastSettlement?.milestone ?? null,
          moneyTrend: state.yearlySnapshots ?? [],
          courseResults: (state.lastCourseResults ?? []).map(({ label, tier }) => ({ label, tier })),
          projects: (state.projects ?? []).map(project => ({
            title: project.title,
            stage: project.stage,
            yearsSpent: project.yearsSpent,
            isThesis: Boolean(project.isThesis),
          })),
        };
      case 'ENDING': {
        const ending = pack.endings.find(e => e.id === state.endingId);
        if (!ending) throw new Error(`ENDING screen with unknown ending: ${state.endingId}`);
        const { score, grade } = computeScore(state);
        const goal = pack.lifeGoals.find(item => item.id === state.flags.life_goal);
        const relationshipDefinitions = [
          {
            flag: 'love_true_companion', tagPrefix: 'love', npcId: 'first_love', name: '初恋', title: '一起抵达的人',
            text: '异地、车票和等待都没有被浪漫化，但你们还是把“以后”过成了共同生活。',
          },
          {
            flag: 'love_history_closure', tagPrefix: 'love', npcId: 'first_love', name: '初恋', title: '认真告别的人',
            text: '你们认真爱过，所以最后的不打扰不是逃避，而是替那段感情守住边界。',
          },
          {
            flag: 'grinder_true_mirror', tagPrefix: 'grinder', npcId: 'grinder', name: '卷王同学', title: '真正的镜子',
            text: '你们互相追赶了十年，也在对方跑不动的时候，成为那个没有走开的人。',
          },
          {
            flag: 'hometown_true_friend', tagPrefix: 'hometown', npcId: 'hometown_friend', name: '县城发小', title: '没有走散的人',
            text: '你们走上不同的路，却仍能在多年以后接住十年前没有说完的半句话。',
          },
          {
            flag: 'roommate_true_partner', tagPrefix: 'roommate', npcId: 'roommate', name: '创业室友', title: '没散的创始团队',
            text: '第一家公司早就倒了，但一起冒过险、收过场的人，始终留在彼此的人生里。',
          },
          {
            flag: 'mentor_true_legacy', tagPrefix: 'mentor', npcId: 'mentor', name: '职场贵人', title: '传下去的那支笔',
            text: '他曾经替你圈出真正属于你的判断；后来，你也成为了能接住别人的人。',
          },
        ];
        return {
          kind: 'ENDING',
          endingId: ending.id,
          title: ending.title,
          text: renderText(ending.text, state),
          stats: state.stats,
          score,
          grade,
          historyLength: state.history.length,
          papers: (state.papers ?? []).map(paper => ({
            title: paper.title,
            tier: paper.tier,
            authorship: paper.authorship,
            year: paper.year,
            replicated: paper.replicated ?? null,
          })),
          // **做废的课题和论文清单一样重要。** 做废是这个职业最普遍的经验,不是惩罚,
          // 所以它不该只体现为"结局页少了一行"。
          abandonedProjects: (state.projects ?? [])
            .filter(p => p.stage === 'abandoned')
            .map(p => ({ title: p.title, stage: p.stage, yearsSpent: p.yearsSpent })),
          moneyTrend: state.yearlySnapshots ?? [],
          relationships: relationshipDefinitions
            .filter(relationship => Boolean(state.flags[relationship.flag]))
            .map(({ flag: _flag, tagPrefix, ...relationship }) => {
              const entries = state.history.filter(entry =>
                entry.kind === 'event' && entry.outcomeTag?.startsWith(`${tagPrefix}_`),
              );
              return {
                ...relationship,
                warmCount: entries.filter(entry => entry.kind === 'event' && entry.outcomeTag === `${tagPrefix}_warm`).length,
                coolCount: entries.filter(entry => entry.kind === 'event' && entry.outcomeTag === `${tagPrefix}_cool`).length,
                moments: entries.slice(-3).map(entry => {
                  if (entry.kind !== 'event') return '';
                  return pack.events.find(event => event.id === entry.eventId)?.title ?? entry.eventId;
                }).filter(Boolean),
              };
            }),
          shareCard: {
            title: ending.title,
            tagline: ending.shareCard?.tagline ?? '普通人的十二年，也有自己的重量。',
            tone: ending.shareCard?.tone ?? 'warm',
            seed: state.seed,
            years: '2014-2026',
            traits: pack.traits.filter(t => Boolean(state.flags[t.id])).map(t => t.label),
            traitEvolutions: pack.traitEvolutions
              .filter(evolution => Boolean(state.flags[evolution.id]))
              .map(evolution => evolution.label),
            relationships: relationshipDefinitions
              .filter(relationship => Boolean(state.flags[relationship.flag]))
              .map(relationship => `${relationship.name}·${relationship.title}`),
            goal: goal?.label,
          },
        };
      }
    }
  }

  function computeScore(state: GameState): { score: number; grade: 'S' | 'A' | 'B' | 'C' | 'D' } {
    const baseScoring = pack.meta.scoring ?? {
      weights: { method: 0.25, clinical: 0.2, capital: 0.25, state: 0.2, money: 0.1 },
      moneyFullScore: 600000,
    };
    const goal = pack.lifeGoals.find(item => item.id === state.flags.life_goal);
    const scoring = goal ? { ...baseScoring, weights: goal.scoringWeights } : baseScoring;
    const raw = (Object.entries(scoring.weights) as [StatKey, number][]).reduce(
      (sum, [key, weight]) => {
        const statScore =
          key === 'money'
            ? Math.min(100, (state.stats.money / scoring.moneyFullScore) * 100)
            : state.stats[key];
        return sum + statScore * weight;
      },
      0,
    );
    const score = Math.max(0, Math.min(100, Math.round(raw)));
    const grade = score >= 92 ? 'S' : score >= 82 ? 'A' : score >= 64 ? 'B' : score >= 45 ? 'C' : 'D';
    return { score, grade };
  }

  /**
   * 阶段路由的唯一入口。`nextPhaseId` 优先,没写才退回数组下标顺延。
   *
   * 前作只有一条主干,所以到处直接写 `state.phaseIndex + 1`。本作六条培养路径并列,
   * 按下标顺延会串线,所以下标顺延只保留给"确实就是数组后继"的情况,
   * 而 validate 强制每个非终局阶段都必须显式写 `nextPhaseId`——也就是说这条兜底正常永远走不到。
   */
  function enterNextPhase(state: GameState, rng: Rng, phase: PhaseConfig): void {
    if (phase.nextPhaseId === undefined) {
      enterPhase(state, rng, state.phaseIndex + 1);
      return;
    }
    const nextIdx = pack.timeline.findIndex(p => p.id === phase.nextPhaseId);
    if (nextIdx < 0) {
      throw new Error(`phase ${phase.id} has unknown nextPhaseId: ${phase.nextPhaseId}`);
    }
    enterPhase(state, rng, nextIdx);
  }

  function enterPhase(state: GameState, rng: Rng, index: number): void {
    state.phaseIndex = index;
    const phase = phaseAt(index);
    // 省略 date 的阶段沿用当前日期。**被多个岔口共用的阶段必须这么写**——
    // 否则从硕士毕业(2021)走进"大厂用研"会把时钟拨回 2019。
    if (phase.date) state.date = { ...phase.date };
    // 延毕的追加轮数只属于它被授予的那个阶段
    state.phaseExtraRounds = 0;
    if (phase.kind === 'flow') {
      state.flowStepIndex = 0;
      enterStep(state, rng);
    } else {
      state.roundIndex = 0;
      startRound(state, rng, phase);
    }
  }

  /**
   * 走"当前阶段的第 flowStepIndex 个屏"。flow 阶段读 `steps`,rounds 阶段读 `roundOpeners`,
   * 两者共用同一个游标和同一套进屏逻辑;走完之后各自去自己的下一站
   * (flow → 下一阶段,rounds → 本回合的 BRIEF)。
   */
  function enterStep(state: GameState, rng: Rng): void {
    const phase = phaseAt(state.phaseIndex);
    const steps = phase.kind === 'flow' ? phase.steps : (phase.roundOpeners ?? []);
    const step = steps[state.flowStepIndex];
    if (!step) {
      if (phase.kind === 'flow') enterNextPhase(state, rng, phase);
      else enterBrief(state, rng, phase);
      return;
    }
    switch (step) {
      case 'BACKGROUND_DRAW': {
        const card = rng.pick(pack.backgrounds);
        state.profile.background = card.id;
        state.stats.money = card.initialMoney;
        // 临床与状态的起点由背景卡决定("家里有人生病":临床高、状态低)
        for (const [key, delta] of Object.entries(card.statMods ?? {}) as [StatKey, number][]) {
          state.stats[key] = clampStatValue(key, state.stats[key] + delta);
        }
        Object.assign(state.flags, card.flags ?? {});
        // 特质候选随背景一起亮出(抽 4 选 2),玩家用 CHOOSE_TRAITS 提交后才写 flags
        state.traitOffer = rng.sample(pack.traits, TRAIT_OFFER_COUNT).map(t => t.id);
        state.screen = 'BACKGROUND_DRAW';
        break;
      }
      case 'SETUP':
        state.screen = 'SETUP';
        break;
      case 'EXAM': {
        const track = state.profile.track;
        const bank = pack.examBank.filter(q => q.track === 'both' || q.track === track);
        state.examPaper = rng.sample(bank, pack.meta.examQuestionCount).map(q => q.id);
        state.examCursor = 0;
        state.examCorrect = 0;
        state.examEarnedPoints = 0;
        state.examKind = 'gaokao';
        state.courseExamCourseIds = [];
        state.screen = 'EXAM';
        break;
      }
      case 'APPLICATION':
        state.screen = 'APPLICATION';
        break;
      case 'NPC_SELECTION':
        state.screen = 'NPC_SELECTION';
        break;
      case 'LIFE_GOAL':
        state.screen = 'LIFE_GOAL';
        break;
      case 'CROSSROAD':
        state.screen = 'CROSSROAD';
        break;
      case 'GRAD_APPLY': {
        const kind = gradApplyKindOf(state);
        // 清单为空(内容还没给这一种申请配院校)就直接跳过,不要卡住玩家
        if (!kind || institutionsFor(pack, kind).length === 0) {
          nextStep(state, rng);
          return;
        }
        state.gradApplication = { kind, shortlist: [], outcomes: {}, landed: null };
        state.screen = 'GRAD_APPLY';
        break;
      }
      case 'ADVISOR_DRAW': {
        state.advisorOffer = drawAdvisorOffer(state, pack, rng, ADVISOR_OFFER_COUNT);
        if (state.advisorOffer.length === 0) {
          nextStep(state, rng);
          return;
        }
        state.screen = 'ADVISOR_DRAW';
        break;
      }
      case 'PROJECT_BOARD': {
        // 手上什么都没有的时候不给玩家一块空白板
        if (activeProjects(state).length === 0 && (state.papers ?? []).length === 0) {
          nextStep(state, rng);
          return;
        }
        state.screen = 'PROJECT_BOARD';
        break;
      }
      case 'ALLOCATION': {
        const slots = effectiveSlots(state, phase);
        state.allocation = { slots, picks: [] };
        if (slots <= 0) {
          // 格子被重修或事件吃光了。不要给玩家一个没有东西可点的屏,直接跳过。
          // 这一年你什么都推不动,这件事由年度回顾页交代。
          nextStep(state, rng);
          return;
        }
        state.screen = 'ALLOCATION';
        break;
      }
    }
  }

  function nextStep(state: GameState, rng: Rng): void {
    state.flowStepIndex += 1;
    enterStep(state, rng);
  }

  /**
   * 开场屏走完之后才抽本回合的事件。
   *
   * **顺序很重要**:前作没有开场屏,所以它在 `startRound` 里直接抽事件。本作如果照抄,
   * 投入分配写下的 flag(`entered_lab` 之类)就赶不上**当年**的事件抽取——
   * 玩家今年投了两格实验室,而今年的实验室事件一个都不会出现,要等到明年。
   *
   * 这个 bug 不会报错,只会让整个投入分配机制看起来"没什么用"。
   * simulate 的事件覆盖统计是这么把它抓出来的:所有 `entered_lab` 门控的事件在 3000 局里
   * 一次都没触发过。
   */
  function enterBrief(
    state: GameState,
    rng: Rng,
    phase: Extract<PhaseConfig, { kind: 'rounds' }>,
  ): void {
    state.eventQueue = pickRoundEvents(state, pack, rng, phase);
    state.eventCursor = 0;
    state.currentBrief =
      phase.briefs[state.roundIndex % Math.max(1, phase.briefs.length)] ?? '';
    state.screen = 'BRIEF';
  }

  function startRound(
    state: GameState,
    rng: Rng,
    phase: Extract<PhaseConfig, { kind: 'rounds' }>,
  ): void {
    // 精力格的临时增减只影响当年
    state.grantedSlots = 0;
    // 先走开场屏(年度投入分配),走完在 enterBrief 里才抽事件
    state.flowStepIndex = 0;
    enterStep(state, rng);
  }

  function finishWithEnding(state: GameState, endingId: string): void {
    state.endingId = endingId;
    state.screen = 'ENDING';
  }

  const MONEY_MILESTONES: { threshold: number; label: string }[] = [
    { threshold: 1_000_000, label: '资产第一次站上一百万。当年那个数着生活费过月的人,大概不敢想。' },
    { threshold: 500_000, label: '资产突破五十万。你开始理解"积累"这两个字的分量。' },
    { threshold: 100_000, label: '存款第一次突破十万。你截了个图,又默默删掉了。' },
  ];

  /**
   * 进入年度结算屏:先结算收入并把明细写入 lastSettlement,
   * 玩家在结算页看到的是入账后的数字和收入构成。
   * 提前结局检查仍在玩家点"翻过这一年"后的 settleRound 里做。
   */
  /**
   * 年度兑现课题推进。
   *
   * 调度器给**每个**活跃课题掷了 `2 + 2×投入格数` 次骰,成功几次就推进几站;
   * 这里统一兑现。**阶段事件不负责推进**——它只讲这一年的故事。
   *
   * 这样拆的好处是失败率完全系统化:没轮到事件的课题不会因此免费停一年
   * (否则"手上课题越多越安全"),而抽到事件的课题也不会因为某个 outcome 权重
   * 意外变得容易。玩家在年度回顾页看到的是"还卡在收数据"——
   * 这正是一个你今年没怎么碰的课题该有的样子。
   */
  function settleProjectAdvances(state: GameState, rng: Rng): void {
    for (const project of activeProjects(state)) {
      // **今年新开的课题也要掷一次骰。**
      //
      // 调度器是在回合开始时掷骰的,而新课题是在这一年的事件里创建的——
      // 如果不在这里补一次,每个课题都会白白损失开题的那一年,
      // 于是"两年一篇"变成"三年一篇",一个五年的博士只发得出两篇。
      // (这个 bug 不报错,只表现为"论文数怎么都上不去",是逐年打印课题状态才看出来的。)
      // **地基在这里分配,不在创建时。** `applyEffects` 拿不到 RNG(那会让同一个种子的回放漂移),
      // 所以和"开题那年补一次掷骰"用同一个位置。玩家看不到分到了哪条——
      // 会塌的和不会塌的混在一个池子里,抽到哪条纯看运气。
      if (!project.foundationId && !project.isThesis) {
        const picked = pickFoundation(pack, project.domain, rng);
        if (picked) project.foundationId = picked.id;
      }
      if (project.lastAdvances === undefined && !project.isThesis) {
        // 开题那一年**按投了一格算**。
        //
        // 分配屏在这个课题存在之前就结束了,所以它今年拿不到任何格子;
        // 但你显然是花了力气才把它开起来的。不给这一格的话,每个课题都要白搭一年,
        // 一个五年的博士只发得出两篇——而这个偏差不报错,只表现为"论文数怎么都上不去"。
        const attempts = advanceAttempts(state, project) + ATTEMPTS_PER_STARTUP_SLOT;
        const chance = stageSuccessChance(state, pack, project);
        let advances = 0;
        for (let i = 0; i < attempts; i++) if (rng.chance(chance)) advances += 1;
        // 开题那一年的推进单独设一个更低的上限。
        //
        // 不设的话,新课题会在创建当年直接冲过 想法/文献/伦理 三站——
        // 于是这三站的事件**一次都不会被玩家看到**(simulate 的覆盖统计就是这么发现的)。
        // 而且它也不真实:立项那年你不可能已经在收数据了。
        project.lastAdvances = Math.min(advances, MAX_STARTUP_ADVANCES);
      }
    }
    for (const project of activeProjects(state)) {
      // 毕业论文的推进全部写死在内容里(教学关要教流程,不掷骰)
      if (project.isThesis) continue;
      const advances = project.lastAdvances ?? 0;
      const template = findTemplate(pack, project.templateId);
      // **站在最后一站(投稿/审稿)的课题,今年掷的是"接不接收",不是"推不推进"。**
      //
      // 推进已经在 applyProjectOp 里被卡在最后一站了,所以到这里的课题是
      // **上一年就投出去、等了一年审稿意见的那些**。成功即接收,全败即被拒一次;
      // 被拒够 MAX_REJECTIONS 次就不再投了(shouldAbandonBySilence)。
      //
      // 这一支是"投了四个刊都没中"的唯一来源——在它之前,课题到达审稿的那一年
      // 只要成功一次就直接发出去了,`rejections` 永远加不上去。
      if (advances > 0 && !(template && isAtFinalStage(template, project))) {
        applyProjectOp(state, pack, { op: 'advance', target: project.id, stages: advances });
      }
      // **站在最后一站(投稿/审稿)的课题,每年掷一次"接不接收"。**
      //
      // 这一掷发生在**到达审稿的当年**,不额外吃掉一年——学制只有六年,
      // 强制等一年审稿会让论文数从 1.7 掉到 1.0(量过)。
      // 接收即发表;被拒就留在审稿上,明年再投一家。被拒够 MAX_REJECTIONS 次就不投了。
      //
      // **只掷一次,而且不随投入格数增长。** 推进可以靠多投精力加速,审稿不行:
      // 投出去之后你能做的事很少,接不接收由文章本身的质量和运气决定。
      // 沿用推进那套骰子的话,"多投两格"就能把审稿刷过去,`MAX_REJECTIONS` 形同虚设。
      if (template && isAtFinalStage(template, project)) {
        if (rng.chance(acceptanceChance(state, pack, project))) {
          applyProjectOp(state, pack, { op: 'publish', target: project.id, tier: tierForQuality(project.quality) });
        } else {
          project.rejections += 1;
        }
      }
      project.neglectedYears =
        investedSlotsOn(state, project.id) > 0 ? 0 : (project.neglectedYears ?? 0) + 1;
      project.lastAdvances = 0;
      project.lastRoll = undefined;
    }
    // **地基塌方**(GAME_DESIGN 19.4)。排在做废判定之前:
    // 一个今年地基塌了的课题,应该先让玩家做那个四选一,而不是无声地烂掉。
    for (const { project, foundation } of collapsingProjects(state, pack)) {
      project.foundationShaken = true;
      state.eventProjects = { ...(state.eventProjects ?? {}), [collapseEventId(foundation.id)]: project.id };
      state.scheduled.push({ eventId: collapseEventId(foundation.id), dueRound: state.roundCounter + 1 });
    }
    // **烂在手里。** 真实的做废不是一个决定,是一个你渐渐不再打开的文件夹,
    // 所以它是无声的——玩家只会在结局页的"做废的课题"那一栏里再看到它。
    for (const project of activeProjects(state)) {
      if (project.isThesis) continue;
      if (shouldAbandonBySilence(project)) {
        applyProjectOp(state, pack, { op: 'abandon', target: project.id });
      }
    }
  }

  /**
   * 年度状态回复,由**耗竭**决定还剩多少。
   *
   * 没有这一层的时候,状态是单调下降的:研究生阶段几乎每个事件都扣状态,
   * 而唯一的回血是"休息"那一格。结果是 22% 的学术线对局在读博途中触发提前结局——
   * 那不是"耗竭螺旋",那是"所有人最后都会死"。
   *
   * 现在:耗竭低的人每年自然回一点(假期、周末、一件顺利的事),
   * **耗竭高的人回不了**——这才是螺旋:它不是直接扣你的状态,是**掐掉你的恢复能力**。
   */
  function settleAnnualRecovery(state: GameState): void {
    const burnout = readNumericFlag(state.flags.burnout);
    const recovery = burnout >= 55 ? 0 : burnout >= 30 ? 1 : 3;
    if (recovery > 0) {
      state.stats.state = Math.max(0, Math.min(100, state.stats.state + recovery));
    }
  }

  function enterSettlement(state: GameState, rng: Rng): void {
    const ctx = { state, pack, rng };
    settleProjectAdvances(state, rng);
    settleAnnualRecovery(state);
    // 未终结的课题记一年。"第 3 年"这个数字是课题管线里最有分量的一个,
    // 因为它是玩家自己看着它一年一年涨上去的。
    ageProjects(state);
    const moneyBefore = state.stats.money;
    const incomes: { label: string; amount: number }[] = [];
    for (const rule of pack.incomes) {
      if (!evalCondition(rule.when, ctx)) continue;
      state.stats.money = Math.max(0, Math.round(state.stats.money + rule.amount));
      if (rule.stateDelta) {
        state.stats.state = Math.max(0, Math.min(100, state.stats.state + rule.stateDelta));
      }
      if (rule.clinicalDelta) {
        state.stats.clinical = Math.max(0, Math.min(100, state.stats.clinical + rule.clinicalDelta));
      }
      if (rule.amount !== 0) incomes.push({ label: rule.label, amount: rule.amount });
    }
    const snapshots = state.yearlySnapshots ?? [];
    const prevMoney = snapshots.length > 0 ? snapshots[snapshots.length - 1]!.money : null;
    const milestone =
      prevMoney === null
        ? null
        : (MONEY_MILESTONES.find(
            m => prevMoney < m.threshold && state.stats.money >= m.threshold,
          )?.label ?? null);
    state.lastSettlement = {
      incomes,
      moneyDelta: state.stats.money - moneyBefore,
      milestone,
    };
    state.yearlySnapshots = [...snapshots, { year: state.date.year, money: state.stats.money }];
    state.screen = 'SETTLEMENT';
  }

  /**
   * 本学年还有没有期末小测要考。有就进 EXAM 屏,没有就直接年度结算。
   *
   * 小测**只给两座大山**(心理统计、实验心理学)。把仪式感留给最重要的两门课,不拖节奏——
   * 每门课都考一道会把本科变成半个答题游戏。
   */
  function enterCourseExamsOrSettle(state: GameState, rng: Rng): void {
    const year = currentCourseYear(state);
    const pending = year === null ? [] : pendingCourseExams(state, pack, rng, year);
    if (pending.length === 0) {
      resolveCoursesAndSettle(state, rng);
      return;
    }
    state.examPaper = pending.map(p => p.questionId);
    state.courseExamCourseIds = pending.map(p => p.courseId);
    state.examCursor = 0;
    state.examCorrect = 0;
    state.examEarnedPoints = 0;
    state.examKind = 'course';
    state.screen = 'EXAM';
  }

  function resolveCoursesAndSettle(state: GameState, rng: Rng): void {
    const year = currentCourseYear(state);
    if (year !== null) resolveCourses(state, pack, rng, year);
    else state.lastCourseResults = [];
    enterSettlement(state, rng);
  }

  function settleRound(state: GameState, rng: Rng): void {
    const phase = phaseAt(state.phaseIndex);
    if (phase.kind !== 'rounds') throw new Error('settleRound outside rounds phase');
    const earlyAfterSettle = findEnding(state, pack, rng, ['early']);
    if (earlyAfterSettle) {
      finishWithEnding(state, earlyAfterSettle.id);
      return;
    }
    state.roundIndex += 1;
    state.roundCounter += 1;
    // 延毕:`{ extendPhase }` 追加的轮数算在本阶段的长度里
    if (state.roundIndex < phase.rounds + (state.phaseExtraRounds ?? 0)) {
      state.date.year += phase.yearsPerRound ?? 1;
      startRound(state, rng, phase);
      return;
    }
    if (phase.isFinal) {
      const ending = findEnding(state, pack, rng, ['early', 'final']);
      finishWithEnding(state, ending?.id ?? pack.meta.fallbackEndingId);
      return;
    }
    enterNextPhase(state, rng, phase);
  }

  function resolveExamScore(state: GameState, rng: Rng): void {
    const maxPoints = Math.max(
      1,
      state.examPaper.reduce((sum, qid) => sum + (questionsById.get(qid)?.difficulty ?? 1), 0),
    );
    const rate = state.examEarnedPoints / maxPoints;
    const raw = Math.round(EXAM_BASE_SCORE + rate * EXAM_SCORE_RANGE + rng.int(-18, 18));
    state.profile.examScore = Math.max(0, Math.min(750, raw));
    state.stats.method = Math.round(20 + rate * 55);
    state.screen = 'EXAM_RESULT';
  }

  function handleApplication(state: GameState, rng: Rng, optionId: string, majorId?: string): void {
    const option = pack.applications.find(o => o.id === optionId);
    if (!option) throw new Error(`Unknown application option: ${optionId}`);
    const major = option.majors.find(m => m.id === majorId) ?? option.majors[0];
    if (!major) throw new Error(`Application option has no majors: ${optionId}`);
    const diff = admissionScore(state) - option.minScore;
    const admitted = rng.chance(admissionTier(diff).chance);
    const deltas: StatDeltas = {};
    let text: string;
    if (admitted) {
      state.profile.university = option.university;
      state.profile.major = major.name;
      state.flags['college'] = major.college;
      if (option.effects) addDeltas(deltas, applyEffects(option.effects, state, pack).deltas);
      // 学院归属的开局塑形:理学院的方法起点确实更高,教育学院的统计教得浅
      if (major.effects) addDeltas(deltas, applyEffects(major.effects, state, pack).deltas);
      text =
        diff < 0
          ? `录取结果出来了：${option.university} · ${major.name}。你压着线冲了进去——查到结果那一刻，你把页面刷新了三遍才敢相信，班主任在电话里连说了三个“好”。后来你才知道，那年这个专业的最后一名，就是你。`
          : `录取结果出来了：${option.university} · ${major.name}。志愿表上的一行字，从今天起变成了你接下来四年的城市、同学和专业。`;
    } else {
      // 滑档:落到分数够线的最高批次(排除刚冲失败的那个)
      const fallback = pack.applications
        .filter(o => o.id !== option.id && admissionScore(state) >= o.minScore)
        .sort((a, b) => b.minScore - a.minScore)[0];
      if (!fallback) throw new Error('No fallback application option; content must provide one');
      const fbMajor = fallback.majors.find(m => m.college === major.college) ?? fallback.majors[0];
      if (!fbMajor) throw new Error(`Fallback option has no majors: ${fallback.id}`);
      state.profile.university = fallback.university;
      state.profile.major = fbMajor.name;
      state.flags['college'] = fbMajor.college;
      state.flags['slipped'] = true;
      if (fbMajor.effects) addDeltas(deltas, applyEffects(fbMajor.effects, state, pack).deltas);
      if (option.failEffects) addDeltas(deltas, applyEffects(option.failEffects, state, pack).deltas);
      if (fallback.effects) addDeltas(deltas, applyEffects(fallback.effects, state, pack).deltas);
      text = `滑档了。「${option.label}」的投档线比往年又涨了一截，你的名字不在这一批任何一张录取名单上。那几天家里安静得可怕，爸爸在阳台抽了半包烟，妈妈把“复读”两个字含在嘴里又咽了回去。直到征集志愿的最后一轮，${fallback.university}把你接住——${fbMajor.name}。去报到那天，爸爸只说了一句：“去了，就好好念。”十八岁的夏天你第一次知道：人生的考卷不止一张，但那年夏天，它看起来就像是唯一的一张。`;
    }
    state.history.push({
      kind: 'application',
      year: state.date.year,
      optionId: option.id,
      admitted,
    });
    state.pendingOutcome = { text, deltas };
    state.pendingFlowAdvance = true;
    state.screen = 'OUTCOME';
  }

  /**
   * 岔口分流。**完全内容驱动**:选项文案、门控、去哪条路径都在 `CrossroadOption.effects` 里
   * (通常含一个 `{ jumpToPhase }`)。
   *
   * 前作这里是按专业名 if-else 五段(`major.includes('计算机')` … ),
   * 也就是把内容写进了引擎。本作不再有那种分支——加一条路径只需要往内容里加一行。
   */
  function handleCrossroad(state: GameState, rng: Rng, optionId: string): void {
    const group = crossroadGroup(state);
    const ctx = { state, pack, rng };
    const option = (pack.crossroadOptions ?? []).find(
      opt => opt.id === optionId && opt.group === group && evalCondition(opt.availableWhen, ctx),
    );
    if (!option) throw new Error(`Crossroad option not available: ${optionId} in ${group}`);
    const { deltas } = applyEffects(option.effects, state, pack);
    state.history.push({ kind: 'crossroad', year: state.date.year, optionId });
    state.pendingOutcome = { text: option.text, deltas };
    state.pendingFlowAdvance = true;
    state.screen = 'OUTCOME';
  }

  function resolveChoice(state: GameState, rng: Rng, choiceId: string): void {
    const evId = state.eventQueue[state.eventCursor];
    const ev = evId ? eventsById.get(evId) : undefined;
    if (!ev) throw new Error('CHOOSE without a current event');
    // 管线阶段事件是替某个具体课题弹出来的。绑定要在求值**之前**设好:
    // `{ projectRoll }` 条件和 `{{project}}` 文案都靠它找到"这个事件在说哪个课题"。
    state.currentProjectId = boundProjectId(state, ev);
    const ctx = { state, pack, rng };
    const choice = ev.choices.find(
      c => c.id === choiceId && evalCondition(c.visibleIf, ctx),
    );
    if (!choice) throw new Error(`Choice not available: ${choiceId} on ${ev.id}`);
    const eligible = choice.outcomes.filter(o => evalCondition(o.condition, ctx));
    const outcomePool = eligible.length > 0 ? eligible : choice.outcomes;
    const outcome = rng.weightedPick(outcomePool, o => o.weight);
    const { deltas } = applyEffects(outcome.effects, state, pack);
    state.triggeredEventIds.push(ev.id);
    state.history.push({
      kind: 'event',
      year: state.date.year,
      eventId: ev.id,
      category: ev.category,
      choiceId: choice.id,
      outcomeTag: outcome.outcomeTag,
    });
    state.pendingOutcome = { text: outcome.text, deltas };
    state.screen = 'OUTCOME';
  }

  function continueAfterOutcome(state: GameState, rng: Rng): void {
    state.pendingOutcome = null;
    if (state.forcedEndingId) {
      finishWithEnding(state, state.forcedEndingId);
      return;
    }
    if (state.pendingJumpPhaseId) {
      const idx = pack.timeline.findIndex(p => p.id === state.pendingJumpPhaseId);
      if (idx < 0) throw new Error(`jumpToPhase target not found: ${state.pendingJumpPhaseId}`);
      state.pendingJumpPhaseId = null;
      // **必须同时清掉 pendingFlowAdvance。**
      //
      // 一个 flow 屏(岔口)的处理函数会同时设置 `pendingFlowAdvance = true` 和
      // (通过 effects)`pendingJumpPhaseId`。跳转在这里提前 return,如果不清掉那个待办,
      // 它就会残留到**新阶段**里:新阶段的下一次 OUTCOME 会误以为自己在走开场屏流程,
      // 于是 `nextStep` → `enterBrief` → **在回合中间重新抽一次事件队列**,
      // 把玩家还没看到的事件静默丢掉。
      //
      // 这是前作留下的一处交互,本作是第一个真正踩到的:前作的三岔口用不到 jumpToPhase。
      state.pendingFlowAdvance = false;
      enterPhase(state, rng, idx);
      return;
    }
    const early = findEnding(state, pack, rng, ['early']);
    if (early) {
      finishWithEnding(state, early.id);
      return;
    }
    // `{ drawAdvisor }` 只标记"该抽了"(effects 没有 RNG),真正的抽样在这里做
    if (state.pendingAdvisorDraw) {
      const count = state.pendingAdvisorDraw;
      state.pendingAdvisorDraw = 0;
      state.advisorOffer = drawAdvisorOffer(state, pack, rng, count);
      if ((state.advisorOffer ?? []).length > 0) {
        state.screen = 'ADVISOR_DRAW';
        return;
      }
    }
    if (state.pendingFlowAdvance) {
      state.pendingFlowAdvance = false;
      nextStep(state, rng);
      return;
    }
    state.eventCursor += 1;
    if (state.eventCursor >= state.eventQueue.length) {
      // 年内后果:本回合中 schedule(afterRounds: 0)的事件,追加到当年队列末尾弹出
      const due = state.scheduled.filter(s => s.dueRound <= state.roundCounter);
      if (due.length > 0) {
        state.scheduled = state.scheduled.filter(s => s.dueRound > state.roundCounter);
        for (const d of due) {
          if (
            !state.eventQueue.includes(d.eventId) &&
            !state.triggeredEventIds.includes(d.eventId)
          ) {
            state.eventQueue.push(d.eventId);
          }
        }
      }
    }
    if (state.eventCursor < state.eventQueue.length) {
      state.screen = 'EVENT';
    } else {
      enterCourseExamsOrSettle(state, rng);
    }
  }

  function handle(state: GameState, action: PlayerAction, rng: Rng): void {
    switch (state.screen) {
      case 'TITLE':
        if (action.type !== 'START') invalid(state, action);
        enterPhase(state, rng, 0);
        return;
      case 'BACKGROUND_DRAW': {
        if (action.type !== 'CHOOSE_TRAITS') invalid(state, action);
        const offer = state.traitOffer ?? [];
        const expected = Math.min(TRAIT_PICK_COUNT, offer.length);
        const chosen = [...new Set(action.traitIds)];
        if (action.traitIds.length !== expected || chosen.length !== expected) {
          throw new Error(`CHOOSE_TRAITS expects ${expected} distinct traits`);
        }
        for (const id of chosen) {
          if (!offer.includes(id)) throw new Error(`CHOOSE_TRAITS trait not in offer: ${id}`);
        }
        for (const id of chosen) {
          state.flags[id] = true;
          const mods = pack.traits.find(t => t.id === id)?.statMods;
          for (const [key, delta] of Object.entries(mods ?? {}) as [StatKey, number][]) {
            const next = state.stats[key] + delta;
            state.stats[key] = key === 'money' ? Math.max(0, next) : Math.max(0, Math.min(100, next));
          }
        }
        state.traitOffer = [];
        nextStep(state, rng);
        return;
      }
      case 'SETUP': {
        if (action.type !== 'CHOOSE_SETUP') invalid(state, action);
        // 容错默认 male:旧 actionLog 回放时 gender 可能缺失,不抛错
        state.flags.player_gender = action.gender === 'female' ? 'female' : 'male';
        state.profile.track = action.track;
        nextStep(state, rng);
        return;
      }
      case 'EXAM': {
        const isCourseExam = state.examKind === 'course';
        if (action.type === 'SKIP_EXAM') {
          if (isCourseExam) {
            // 跳过期末小测 = 全部按答错处理。不惩罚,只是拿不到那 +0.15
            state.examCursor = state.examPaper.length;
            resolveCoursesAndSettle(state, rng);
            return;
          }
          // 跳过剩余题目,按默认得分率(55%)折算,相当于发挥平平的一次考试
          const remaining = state.examPaper.slice(state.examCursor);
          const remainingPoints = remaining.reduce(
            (sum, qid) => sum + (questionsById.get(qid)?.difficulty ?? 1),
            0,
          );
          state.examCorrect += Math.round(remaining.length * EXAM_SKIP_RATE);
          state.examEarnedPoints += remainingPoints * EXAM_SKIP_RATE;
          state.examCursor = state.examPaper.length;
          resolveExamScore(state, rng);
          return;
        }
        if (action.type !== 'ANSWER') invalid(state, action);
        const qid = state.examPaper[state.examCursor];
        const q: ExamQuestion | undefined = qid ? questionsById.get(qid) : undefined;
        if (!q) throw new Error('ANSWER without a current question');
        const correct = action.optionIndex === q.answerIndex;
        if (correct) {
          state.examCorrect += 1;
          state.examEarnedPoints += q.difficulty ?? 1;
        }
        if (isCourseExam) {
          const courseId = state.courseExamCourseIds?.[state.examCursor];
          if (courseId) {
            state.courseExamResults = { ...(state.courseExamResults ?? {}), [courseId]: correct };
          }
        }
        state.examCursor += 1;
        if (state.examCursor < state.examPaper.length) return;
        if (isCourseExam) resolveCoursesAndSettle(state, rng);
        else resolveExamScore(state, rng);
        return;
      }
      case 'EXAM_RESULT':
        if (action.type !== 'CONTINUE') invalid(state, action);
        nextStep(state, rng);
        return;
      case 'APPLICATION':
        if (action.type !== 'APPLY') invalid(state, action);
        handleApplication(state, rng, action.optionId, action.majorId);
        return;
      case 'NPC_SELECTION': {
        if (action.type !== 'CHOOSE_NPCS') invalid(state, action);
        // 没有必选人物:6 位里选 npcPickCount 位。恋人线不强制。
        const expected = Math.min(
          pack.meta.npcPickCount ?? DEFAULT_NPC_PICK_COUNT,
          pack.npcs.length,
        );
        const chosen = [...new Set(action.npcIds)];
        if (action.npcIds.length !== expected || chosen.length !== expected) {
          throw new Error(`CHOOSE_NPCS expects ${expected} distinct NPCs`);
        }
        const defsById = new Map(pack.npcs.map(npc => [npc.id, npc]));
        state.npcs = {};
        for (const id of chosen) {
          const npc = defsById.get(id);
          if (!npc) throw new Error(`CHOOSE_NPCS unknown NPC: ${id}`);
          state.npcs[id] = { favor: npc.initialFavor, stage: npc.initialStage };
        }
        nextStep(state, rng);
        return;
      }
      case 'LIFE_GOAL': {
        if (action.type !== 'CHOOSE_LIFE_GOAL') invalid(state, action);
        if (!pack.lifeGoals.some(goal => goal.id === action.goalId)) {
          throw new Error(`CHOOSE_LIFE_GOAL unknown goal: ${action.goalId}`);
        }
        state.flags.life_goal = action.goalId;
        nextStep(state, rng);
        return;
      }
      case 'CROSSROAD':
        if (action.type !== 'CHOOSE_CROSSROAD') invalid(state, action);
        handleCrossroad(state, rng, action.optionId);
        return;
      case 'GRAD_APPLY': {
        if (action.type !== 'APPLY_GRAD') invalid(state, action);
        const kind = gradApplyKindOf(state);
        if (!kind) invalid(state, action);
        const listed = new Set(institutionsFor(pack, kind).map(i => i.id));
        const picks = [...new Set(action.institutionIds)].filter(id => listed.has(id));
        if (picks.length === 0 || picks.length > MAX_SHORTLIST) {
          throw new Error(`APPLY_GRAD needs 1-${MAX_SHORTLIST} listed institutions`);
        }
        const result = resolveAdmission(state, pack, kind, picks, rng);
        state.gradApplication = {
          kind,
          shortlist: picks,
          outcomes: result.outcomes,
          landed: result.landed,
          viaAdjustment: result.viaAdjustment,
        };
        // **停在结果屏,不直接进下一阶段。** "查结果那一刻"是这条线上最有分量的时刻之一,
        // 做成一次静默的状态变更等于把整个申请屏的意义抹掉一半。
        state.screen = 'GRAD_RESULT';
        return;
      }
      case 'GRAD_RESULT': {
        if (action.type !== 'CONTINUE') invalid(state, action);
        const app = state.gradApplication;
        if (app?.landed) {
          const inst = (pack.institutions ?? []).find(i => i.id === app.landed);
          if (inst) {
            // **头部要跟着换。** 不换的话玩家读到研一那一屏,顶上还挂着本科那所学校。
            state.profile.university = inst.name;
            state.profile.major = inst.unit;
          }
          // 去向写成 flag,内容侧就能直接门控("你在北师大"这件事要能被事件读到)
          state.flags[`admitted_${app.landed}`] = true;
          if (app.viaAdjustment) state.flags.went_through_adjustment = true;
        } else {
          state.flags.admission_shutout = true;
        }
        state.admissions = { ...(state.admissions ?? {}), [app?.kind ?? 'master']: app?.landed ?? null };
        nextStep(state, rng);
        return;
      }
      case 'ADVISOR_DRAW': {
        if (action.type !== 'JOIN_ADVISOR') invalid(state, action);
        if (!(state.advisorOffer ?? []).includes(action.advisorId)) {
          throw new Error(`JOIN_ADVISOR advisor not in offer: ${action.advisorId}`);
        }
        joinAdvisor(state, pack, action.advisorId);
        nextStep(state, rng);
        return;
      }
      case 'PROJECT_BOARD':
        if (action.type !== 'CONTINUE') invalid(state, action);
        nextStep(state, rng);
        return;
      case 'ALLOCATION': {
        if (action.type !== 'ALLOCATE') invalid(state, action);
        const slots = state.allocation?.slots ?? 0;
        const failure = validateAllocation(state, pack, rng, action.picks, slots);
        if (failure) throw new Error(failure.message);
        state.allocation = { slots, picks: [...action.picks] };
        // 投入效果**当场生效**,这样本年度的事件可以读到它写下的 flag
        // (投了两年实验室的人,今年的实验室事件才该出现)
        settleAllocation(state, pack, rng, action.picks);
        nextStep(state, rng);
        return;
      }
      case 'BRIEF':
        if (action.type !== 'CONTINUE') invalid(state, action);
        if (state.eventQueue.length > 0) {
          state.screen = 'EVENT';
        } else {
          enterCourseExamsOrSettle(state, rng);
        }
        return;
      case 'EVENT':
        if (action.type !== 'CHOOSE') invalid(state, action);
        resolveChoice(state, rng, action.choiceId);
        return;
      case 'OUTCOME':
        if (action.type !== 'CONTINUE') invalid(state, action);
        continueAfterOutcome(state, rng);
        return;
      case 'SETTLEMENT':
        if (action.type !== 'CONTINUE') invalid(state, action);
        settleRound(state, rng);
        return;
      case 'ENDING':
        invalid(state, action);
    }
  }

  function dispatch(state: GameState, action: PlayerAction): GameState {
    const next = clone(state);
    const rng = new Rng(next.rngState);
    try {
      handle(next, action, rng);
    } finally {
      next.rngState = rng.state;
    }
    return next;
  }

  return { start, view, dispatch };
}
