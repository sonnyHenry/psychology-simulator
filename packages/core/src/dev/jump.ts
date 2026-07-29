import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { PlayerAction } from '../types/view';
import { createEngine } from '../engine/engine';

/**
 * 开发用一键跳转:从开局按**默认策略**自动打到某个人生节点(测试工具,不是玩法)。
 *
 * ## 为什么是"快进"而不是"造档"
 *
 * 直接手搓一个"2022 年的存档"永远是假的:flag、课题、个案、导师、小时数之间的
 * 不变量太多,手搓档测出来的 bug 一半是档本身的。快进走的是真实的
 * `engine.dispatch`,产出的 `actions` 就是一份合法的 actionLog——
 * 存档、重放、后续手玩全部照常成立。
 *
 * ## 为什么要重试
 *
 * 岔口有门控(直博要 lab_years ≥2 + 资本,读博要论文),默认策略不保证每个种子都攒得够。
 * 单局只有几毫秒,所以失败就换下一个种子重来,直到到达目标或用尽尝试次数。
 * **这不是掩盖问题**:如果某个目标要几十次才偶尔成功,verify-jumps 的自测会把它暴露出来。
 */

export interface DevJumpTarget {
  id: string;
  label: string;
  /** 到达这个阶段就停(停在该阶段的第一个可交互屏)。省略 = 一路打到结局屏 */
  targetPhaseId?: string;
  /**
   * 岔口偏好:group(岔口阶段 id)→ 按优先级排列的 optionId。
   * 命中不了(门控没过)就落到第一个可选项——那通常意味着走错路,由重试兜底。
   */
  crossroadPrefs?: Record<string, string[]>;
  /**
   * 分配偏好,按优先级**轮转**填格(每轮每个偏好至多加一格,直到填满)。
   * token 匹配:精确 id / category / id 前缀(如 `alloc_project_` 匹配所有课题投入项)。
   */
  allocationPrefs?: string[];
  /** 志愿填报时优先选这个学院归属的专业(science/education/medical/normal) */
  collegePref?: string;
  /** 2018 年的人生取向。省略取第一个 */
  lifeGoalId?: string;
}

export interface DevJumpResult {
  state: GameState;
  /** 从 START 起的完整操作序列。喂给存档系统,重放照常成立 */
  actions: PlayerAction[];
  seed: number;
  attempts: number;
  steps: number;
}

const MAX_STEPS_PER_RUN = 2000;

/** 录取档位从稳到悬的顺序。申请一律求稳:跳转要的是"到得了",不是"申得漂亮" */
const CHANCE_ORDER = ['稳', '较稳', '冲', '悬', '基本无望'];

function chanceRank(label: string): number {
  const index = CHANCE_ORDER.indexOf(label);
  return index < 0 ? CHANCE_ORDER.length : index;
}

/**
 * 默认策略给一个屏出一个动作。**确定性的**(同一 view 永远同一动作),
 * 跨局差异全部来自引擎种子——这样"重试换种子"才是良定义的。
 */
function defaultAction(
  view: ReturnType<ReturnType<typeof createEngine>['view']>,
  pack: ContentPack,
  target: DevJumpTarget,
  answers: Map<string, number>,
): PlayerAction {
  switch (view.kind) {
    case 'TITLE':
      return { type: 'START' };
    case 'BACKGROUND_DRAW':
      return { type: 'CHOOSE_TRAITS', traitIds: view.traitOffer.slice(0, view.pickCount).map(t => t.id) };
    case 'SETUP':
      return { type: 'CHOOSE_SETUP', gender: 'male', track: '理' };
    case 'EXAM': {
      // 测试跳转全部答对:高考分数决定方法起点,而学术岔口的门控读方法值。
      // "默认值"在这里的含义是"不让答题随机性挡住目标",不是"平均水平的一次考试"。
      const answer = answers.get(view.question.id);
      return { type: 'ANSWER', optionIndex: answer ?? 0 };
    }
    case 'APPLICATION': {
      const collegeOf = new Map<string, string>();
      for (const option of pack.applications) {
        for (const major of option.majors) collegeOf.set(major.id, major.college);
      }
      // 求稳(滑档会引入噪声),在稳的里面优先目标学院归属
      const sorted = [...view.options].sort((a, b) => chanceRank(a.chanceLabel) - chanceRank(b.chanceLabel));
      for (const option of sorted) {
        const major = target.collegePref
          ? option.majors.find(m => collegeOf.get(m.id) === target.collegePref)
          : option.majors[0];
        if (major) return { type: 'APPLY', optionId: option.id, majorId: major.id };
      }
      const fallback = sorted[0] ?? view.options[0]!;
      return { type: 'APPLY', optionId: fallback.id, majorId: fallback.majors[0]?.id };
    }
    case 'NPC_SELECTION':
      return { type: 'CHOOSE_NPCS', npcIds: view.npcs.slice(0, view.pickCount).map(n => n.id) };
    case 'LIFE_GOAL': {
      const preferred = target.lifeGoalId && view.goals.find(g => g.id === target.lifeGoalId);
      return { type: 'CHOOSE_LIFE_GOAL', goalId: (preferred || view.goals[0]!).id };
    }
    case 'CROSSROAD': {
      const prefs = target.crossroadPrefs?.[view.group] ?? [];
      for (const id of prefs) {
        if (view.options.some(option => option.id === id)) {
          return { type: 'CHOOSE_CROSSROAD', optionId: id };
        }
      }
      // 偏好全被门控挡住:走第一个可选项。这多半是条岔路,让重试换个种子再攒一次
      return { type: 'CHOOSE_CROSSROAD', optionId: view.options[0]!.id };
    }
    case 'GRAD_APPLY': {
      const sorted = [...view.options].sort((a, b) => chanceRank(a.chanceLabel) - chanceRank(b.chanceLabel));
      return { type: 'APPLY_GRAD', institutionIds: sorted.slice(0, view.maxPicks).map(o => o.id) };
    }
    case 'ADVISOR_DRAW':
      return { type: 'JOIN_ADVISOR', advisorId: view.candidates[0]!.id };
    case 'DESK': {
      // 按偏好轮转填格:每轮每个 token 至多加一格。轮转而不是贪满,
      // 是为了同时攒几条线的门槛(实验室年数 + 课程 + 备考),而不是把格子全砸在第一项上。
      // **选刊不在这里做。** 跳转是路过,默认策略不替测试者做那次判断——
      // 不选就退回引擎按 quality 兜底的老路(`targetTierOf`),跳出来的档永远是"应得的那一档"。
      const used = new Map<string, number>();
      const picks: string[] = [];
      const capacity = (item: (typeof view.items)[number]): number =>
        (item.maxSlots ?? view.slots) - (used.get(item.id) ?? 0);
      const push = (id: string) => {
        picks.push(id);
        used.set(id, (used.get(id) ?? 0) + 1);
      };
      const tokens = target.allocationPrefs ?? [];
      let progressed = true;
      while (picks.length < view.slots && progressed) {
        progressed = false;
        for (const token of tokens) {
          if (picks.length >= view.slots) break;
          const item = view.items.find(
            candidate =>
              capacity(candidate) > 0 &&
              (candidate.id === token || candidate.category === token || candidate.id.startsWith(token)),
          );
          if (item) {
            push(item.id);
            progressed = true;
          }
        }
      }
      // 偏好填不满(门槛没开/没有匹配项)就按清单顺序补满
      while (picks.length < view.slots) {
        const item = view.items.find(candidate => capacity(candidate) > 0);
        if (!item) break;
        push(item.id);
      }
      return { type: 'ALLOCATE', picks };
    }
    case 'JOB_MARKET': {
      // 求职季的默认值:投满能投的,别的步取第一个选项。
      // **跳转是路过**,不替测试者做那几次判断
      if (view.step === 'targeting') {
        return {
          type: 'JOB_MARKET_STEP',
          positionIds: view.positions.slice(0, view.maxPicks).map(p => p.id),
        };
      }
      if (view.options.length === 0) return { type: 'JOB_MARKET_STEP' };
      return { type: 'JOB_MARKET_STEP', optionId: view.options[0]!.id };
    }
    case 'EVENT':
      // "默认值" = 第一个可见选项。跳转是路过,不是替测试者做戏剧选择
      return { type: 'CHOOSE', choiceId: view.choices[0]!.id };
    default:
      return { type: 'CONTINUE' };
  }
}

/** 单次尝试:一个种子从头打到目标 / 结局 / 步数上限 */
function runOnce(
  pack: ContentPack,
  target: DevJumpTarget,
  seed: number,
): { state: GameState; actions: PlayerAction[]; steps: number } | null {
  const engine = createEngine(pack);
  const answers = new Map(
    [...pack.examBank, ...(pack.courseExamBank ?? [])].map(q => [q.id, q.answerIndex]),
  );
  let state = engine.start(seed);
  const actions: PlayerAction[] = [];
  for (let step = 0; step < MAX_STEPS_PER_RUN; step++) {
    if (target.targetPhaseId !== undefined) {
      if (pack.timeline[state.phaseIndex]?.id === target.targetPhaseId) {
        return { state, actions, steps: step };
      }
      if (state.screen === 'ENDING') return null; // 没到目标就结束了:走岔了或提前结局
    } else if (state.screen === 'ENDING') {
      return { state, actions, steps: step };
    }
    const action = defaultAction(engine.view(state), pack, target, answers);
    state = engine.dispatch(state, action);
    actions.push(action);
  }
  return null;
}

/**
 * 一键跳转入口。失败自动换种子重试(默认最多 60 次)。
 * 返回 null = 用尽尝试仍未到达——目标的偏好配置多半和当前内容对不上了。
 */
export function devJump(
  pack: ContentPack,
  target: DevJumpTarget,
  options?: { seed?: number; maxAttempts?: number },
): DevJumpResult | null {
  const baseSeed = options?.seed ?? 20140607;
  const maxAttempts = options?.maxAttempts ?? 60;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = baseSeed + attempt;
    const outcome = runOnce(pack, target, seed);
    if (outcome) {
      return { ...outcome, seed, attempts: attempt + 1 };
    }
  }
  return null;
}
