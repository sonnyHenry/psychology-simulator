import type { ContentPack } from '../types/content';
import type { CaseOp, CaseStatus, CaseTemplate, ClinicalCase } from '../types/case';
import type { GameState } from '../types/state';
import type { Rng } from '../rng/rng';
import { readNumericFlag } from '../dsl/evaluate';
import { evalCondition } from '../dsl/evaluate';

/**
 * 个案状态机(GAME_DESIGN 第六节 / TECH 4.6)。
 *
 * ## 骰子由引擎掷,故事由内容讲(与课题管线同一纪律)
 *
 * 每年调度器先算这一年的**联盟漂移**(临床值 × 状态 × 取向匹配 × 督导 × 投入格数),
 * 写进 `case.lastTrend`,内容用 `{ caseTrend }` 分流文案;年度结算时兑现漂移、
 * 掷脱落判定、推状态机。阶段事件只讲故事、改联盟/风险,提供"转介 / 提前结束"这类转折。
 *
 * ## 螺旋必须真的存在,也必须有出口
 *
 * **状态低 → 脱落率升 → 脱落打击状态**,这个负反馈是临床线的核心机制。
 * 出口有四个,全部做在数值里:督导(压脱落率)、个人体验(回状态)、
 * 减案量(少接就少耗)、转介(主动止损,不算脱落)。
 */

/** 分配项 id 约定:接个案 / 参加督导 / 个人体验。内容侧的 AllocationItem 必须用这些 id */
export const ALLOC_CASEWORK_ID = 'alloc_casework';
export const ALLOC_SUPERVISION_ID = 'alloc_supervision';
export const ALLOC_PERSONAL_THERAPY_ID = 'alloc_personal_therapy';

/** 本回合投在"接个案"上的格数 */
export function caseworkSlots(state: GameState): number {
  return (state.allocation?.picks ?? []).filter(p => p === ALLOC_CASEWORK_ID).length;
}

/** 本回合投在"参加督导"上的格数 */
export function supervisionSlots(state: GameState): number {
  return (state.allocation?.picks ?? []).filter(p => p === ALLOC_SUPERVISION_ID).length;
}

/** 还在谈的个案 */
export function activeCases(state: GameState): ClinicalCase[] {
  return (state.cases ?? []).filter(
    c => c.status !== 'dropped' && c.status !== 'completed' && c.status !== 'referred',
  );
}

/**
 * 每格"接个案"能同时撑起的个案数。
 *
 * 一格 = 每周固定留给个案的那半天到一天。两格三个个案已经是"主要在做咨询"的年份;
 * 不投入的年份不开新案,手上的个案也会因为你排不出时间而更容易停滞(见漂移公式)。
 */
const CASES_PER_SLOT = 2;
/** 每年最多开几个新案。案源不是水龙头,新手也消化不了 */
const MAX_NEW_CASES_PER_YEAR = 2;

/**
 * 每年长几次会谈。基数是"勉强维持的频率"(隔周,常见于停滞的个案),
 * 每格投入把它推向每周一次。**会谈次数就是注册小时数的来源**:
 * `clinical_hours` 不另行记账,直接等于所有个案的会谈数之和在长。
 */
function sessionsThisYear(state: GameState, kase: ClinicalCase): number {
  const base = kase.status === 'intake' ? 6 : 14;
  const invested = Math.min(2, caseworkSlots(state)) * 8;
  // 停滞的个案会谈变稀:他开始请假、改期、"这周有点忙"
  const plateauPenalty = kase.status === 'plateau' ? 6 : 0;
  return Math.max(4, base + invested - plateauPenalty);
}

/**
 * 一年的联盟漂移。
 *
 * 临床值是主项,但**状态值的权重被刻意抬高**——一个自己快撑不住的咨询师,
 * 手艺再好也接不住人。这不是惩罚设定,是这一行的真实物理。
 */
export function allianceDrift(state: GameState, kase: ClinicalCase): number {
  const clinicalTerm = (state.stats.clinical - 45) * 0.14;
  const stateTerm = (state.stats.state - 50) * 0.1;
  const matchTerm = (kase.orientationMatch - 50) * 0.08;
  const supervisedTerm = kase.supervised ? 3 : 0;
  const neglectTerm = caseworkSlots(state) === 0 ? -4 : 0;
  return clinicalTerm + stateTerm + matchTerm + supervisedTerm + neglectTerm;
}

/**
 * 今年脱落的概率。
 *
 * **脱落率的下限不是 0。** 联盟满分、督导齐全、状态很好——他仍然可能不再来,
 * 而且你永远不会知道为什么。这是这一行必须接受的第一课,也是门禁
 * "个案脱落率 15%–40%"(TECH 7.2)的机制来源:它不该能被优化到没有。
 */
export const MIN_DROPOUT_CHANCE = 0.05;
const MAX_DROPOUT_CHANCE = 0.55;

/** 状态低于这条线,脱落率显著上升(负反馈螺旋的"下行"半环) */
const LOW_STATE_BAR = 40;

export function dropoutChance(state: GameState, kase: ClinicalCase): number {
  const base = kase.riskLevel === 'high' ? 0.2 : kase.riskLevel === 'moderate' ? 0.14 : 0.1;
  const allianceTerm = (55 - kase.alliance) * 0.004;
  const lowStateTerm = state.stats.state < LOW_STATE_BAR ? 0.1 : 0;
  const supervisedTerm = kase.supervised ? -0.06 : 0;
  // 停滞期本来就是最常见的脱落窗口
  const plateauTerm = kase.status === 'plateau' ? 0.08 : 0;
  const raw = base + allianceTerm + lowStateTerm + supervisedTerm + plateauTerm;
  return Math.max(MIN_DROPOUT_CHANCE, Math.min(MAX_DROPOUT_CHANCE, raw));
}

/** 脱落对状态的打击。螺旋的"回击"半环:脱落本身让你更接近下一次脱落 */
const DROPOUT_STATE_HIT = -5;
/** 自然结束的回报。做完一个个案是这一行少数几种干净的好事 */
const COMPLETION_STATE_GAIN = 3;

/** 联盟达到这条线、会谈也攒够了,工作期才进入结束期 */
const TERMINATION_ALLIANCE_BAR = 62;
const TERMINATION_MIN_SESSIONS = 30;
/** 联盟跌破这条线,工作期滑入停滞 */
const PLATEAU_ALLIANCE_BAR = 42;
/** 停滞的个案联盟回到这条线,才回得到工作期 */
const RECOVER_ALLIANCE_BAR = 55;

/**
 * 耗竭的年度累积:按案量走。
 *
 * 一个个案是滋养,两个往上开始是消耗——这条曲线是"机构要求你把个案量
 * 从 15 提到 25"那一幕的数值基础。督导每格回一点(被接住的人才接得住人)。
 *
 * 斜率标定过一轮:第一版写 `(load - 2) × 4`,800 局里没有一个临床对局在终局时
 * 耗竭 ≥55——**"助人者的耗竭"这条真实死法一次都不会发生**,和 M3.1 那批死常量同病。
 * 现在满负荷(四个个案)一年 +12,休息一格 −9:不休息的人两三年就会进入
 * "恢复被掐掉"的区间(见 engine 的 settleAnnualRecovery),这才叫职业风险。
 */
export function caseloadBurnoutDelta(state: GameState): number {
  const load = activeCases(state).length;
  // 哪怕只有一个个案,情绪劳动也是真的(+2);往上每个 +4。
  // 平均并发案量其实只有两个上下(个案会结束、会脱落),所以斜率必须按这个现实定,
  // 不能按"满负荷四个"想象——那样定出来的斜率在实测里永远够不到耗竭线。
  const fromLoad = load > 0 ? load * 4 - 2 : 0;
  const fromSupervision = -3 * supervisionSlots(state);
  return fromLoad + fromSupervision;
}

function clampAlliance(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function findCaseTemplate(pack: ContentPack, templateId: string): CaseTemplate | undefined {
  return (pack.caseTemplates ?? []).find(t => t.id === templateId);
}

/**
 * 玩家取向与模板的匹配度。
 *
 * 命中 72 / 有取向但不命中 46 / 还没有取向 55(中性——没立场的人做什么都不顺手,
 * 但也没有"用错工具"的代价)。**不命中不是不能做,是慢**:匹配项只进漂移公式,
 * 不挡开案。
 */
export function orientationMatchFor(state: GameState, template: CaseTemplate): number {
  const playerOrientations = Object.keys(state.flags).filter(
    key => key.startsWith('orientation_') && Boolean(state.flags[key]),
  );
  if (playerOrientations.length === 0) return 55;
  return playerOrientations.some(o => template.orientationFit.includes(o)) ? 72 : 46;
}

/**
 * 解析 `CaseOp.target`。省略 = 当前事件绑定的个案,兜底最近开的那个。
 * (与 `resolveTarget` 同一约定,理由也相同:阶段事件必须作用在"它在说的那个"上。)
 */
export function resolveCaseTarget(state: GameState, target?: string): ClinicalCase | undefined {
  const cases = state.cases ?? [];
  if (target !== undefined && target !== 'latest') {
    return cases.find(c => c.id === target);
  }
  if (target !== 'latest' && state.currentCaseId) {
    const bound = cases.find(c => c.id === state.currentCaseId);
    if (bound) return bound;
  }
  return cases[cases.length - 1];
}

/** 终结一个个案的公共账:脱落/结束/转介各自的状态影响都从这里走 */
function closeCase(state: GameState, kase: ClinicalCase, status: CaseStatus): void {
  kase.status = status;
  if (status === 'dropped') {
    kase.droppedAtSession = kase.sessions;
    state.stats.state = Math.max(0, Math.min(100, state.stats.state + DROPOUT_STATE_HIT));
    state.flags.burnout = Math.max(0, Math.min(100, readNumericFlag(state.flags.burnout) + 3));
  }
  if (status === 'completed') {
    state.stats.state = Math.max(0, Math.min(100, state.stats.state + COMPLETION_STATE_GAIN));
    state.stats.clinical = Math.max(0, Math.min(100, state.stats.clinical + 2));
  }
  // 转介不奖不罚:它是professional 的止损,代价(关系断在你手里)由内容侧的文案承担
}

/**
 * 应用一次个案操作。调用方是 `dsl/apply.ts` 的 `{ case }` 分支。
 * 这里**不做任何随机判定**——理由与 `applyProjectOp` 相同:`applyEffects` 拿不到 RNG,
 * 引擎也不该偷偷消耗随机流。
 */
export function applyCaseOp(
  state: GameState,
  pack: ContentPack,
  operation: CaseOp,
): ClinicalCase | undefined {
  state.cases = state.cases ?? [];

  if (operation.op === 'open') {
    const template = findCaseTemplate(pack, operation.templateId);
    if (!template) throw new Error(`case open references unknown template: ${operation.templateId}`);
    const issue =
      template.presentingIssues[state.cases.length % template.presentingIssues.length] ??
      template.label;
    const kase: ClinicalCase = {
      id: `case_${state.cases.length + 1}`,
      templateId: template.id,
      presentingIssue: issue,
      label: template.label,
      status: 'intake',
      // 初始联盟不高:第一次坐在你对面的人还什么都没决定
      alliance: 45,
      sessions: 0,
      riskLevel: template.riskLevel,
      orientationMatch: orientationMatchFor(state, template),
      startedYear: state.date.year,
      supervised: false,
    };
    state.cases.push(kase);
    return kase;
  }

  const kase = resolveCaseTarget(state, operation.target);
  if (!kase) return undefined;

  switch (operation.op) {
    case 'setStatus':
      kase.status = operation.status;
      return kase;
    case 'drop':
      closeCase(state, kase, 'dropped');
      return kase;
    case 'complete':
      closeCase(state, kase, 'completed');
      return kase;
    case 'refer':
      closeCase(state, kase, 'referred');
      return kase;
    case 'adjustAlliance':
      kase.alliance = clampAlliance(kase.alliance + operation.delta);
      return kase;
    case 'setField': {
      if (operation.supervised !== undefined) kase.supervised = operation.supervised;
      if (operation.riskLevel !== undefined) kase.riskLevel = operation.riskLevel;
      return kase;
    }
  }
}

/**
 * 回合开始时开新案(调度器调用,在挑个案阶段事件**之前**)。
 *
 * 数量由本年的"接个案"格数决定:容量 = 2 × 格数,缺口内每年最多补两个。
 * 模板按 `availableWhen` 过滤(高风险个案要临床值或督导记录才会分给你),
 * 已经在谈的模板不重复开——同一间咨询室里坐着两个一模一样的来访者不是真实,是复读。
 */
export function openNewCasesForYear(state: GameState, pack: ContentPack, rng: Rng): void {
  const slots = caseworkSlots(state);
  if (slots <= 0) return;
  const active = activeCases(state);
  const capacity = slots * CASES_PER_SLOT;
  const shortfall = Math.min(MAX_NEW_CASES_PER_YEAR, capacity - active.length);
  if (shortfall <= 0) return;
  const activeTemplates = new Set(active.map(c => c.templateId));
  const ctx = { state, pack, rng };
  const eligible = (pack.caseTemplates ?? []).filter(
    t => !activeTemplates.has(t.id) && evalCondition(t.availableWhen, ctx),
  );
  for (let i = 0; i < shortfall && eligible.length > 0; i++) {
    const template = rng.pick(eligible);
    eligible.splice(eligible.indexOf(template), 1);
    const opened = applyCaseOp(state, pack, { op: 'open', templateId: template.id });
    if (opened && template.onOpen) {
      // onOpen 的效果在这里直接生效(不走 applyEffects 的 deltas 展示——开案是静默的)
      for (const effect of template.onOpen) {
        if ('setFlag' in effect) state.flags[effect.setFlag] = effect.value ?? true;
        if ('addFlag' in effect) {
          const { key, delta, min = -Infinity, max = Infinity } = effect.addFlag;
          state.flags[key] = Math.max(min, Math.min(max, readNumericFlag(state.flags[key]) + delta));
        }
      }
    }
  }
}

/**
 * 回合开始时给每个活跃个案掷这一年的联盟走向(调度器调用,在挑阶段事件之前)。
 *
 * 漂移量 = 系统项 + 噪声。**噪声必须在**:同样的配置,有的年份就是更难,
 * 这不是设计的仁慈或恶意,是这一行的方差。
 */
export function rollCaseTrends(state: GameState, rng: Rng): void {
  // 本年参加了督导,活跃个案都算"在督导中"——督导是一种按年的工作方式,不是逐案购买的服务。
  // **也是按年清零的**:去年做过督导不等于今年还在做。内容侧年中把某个个案带进督导
  // (`setField supervised`)仍然有效,因为脱落判定在年末才读这个字段。
  const supervised = supervisionSlots(state) > 0;
  for (const kase of activeCases(state)) {
    kase.supervised = supervised;
    const drift = allianceDrift(state, kase) + rng.int(-6, 6);
    kase.pendingDrift = Math.round(drift);
    kase.lastTrend = drift >= 0 ? 'warm' : 'strained';
  }
}

/**
 * 年度结算:兑现漂移、长会谈、掷脱落、推状态机、记小时数。
 * 引擎在 `enterSettlement` 里调用(排在耗竭回复判定之前——今年的案量影响今年的恢复)。
 */
export function settleCaseYear(state: GameState, rng: Rng): void {
  const supervisedThisYear = supervisionSlots(state) > 0;
  for (const kase of activeCases(state)) {
    // 1. 会谈与小时数。注册系统的表格上,这个数字一小时一小时地涨。
    const sessions = sessionsThisYear(state, kase);
    kase.sessions += sessions;
    state.flags.clinical_hours = Math.min(
      5000,
      readNumericFlag(state.flags.clinical_hours) + sessions,
    );

    // 2. 兑现联盟漂移
    kase.alliance = clampAlliance(kase.alliance + (kase.pendingDrift ?? 0));
    kase.pendingDrift = 0;

    // 3. 脱落判定。**每年一掷,任何个案都可能停在这里。**
    if (rng.chance(dropoutChance(state, kase))) {
      closeCase(state, kase, 'dropped');
      continue;
    }

    // 4. 状态机推进
    switch (kase.status) {
      case 'intake':
        // 初始访谈期一年内自然过渡:留下来的都进了工作期
        kase.status = 'working';
        break;
      case 'working':
        if (kase.alliance >= TERMINATION_ALLIANCE_BAR && kase.sessions >= TERMINATION_MIN_SESSIONS) {
          kase.status = 'terminating';
        } else if (kase.alliance < PLATEAU_ALLIANCE_BAR) {
          kase.status = 'plateau';
        }
        break;
      case 'plateau':
        if (kase.alliance >= RECOVER_ALLIANCE_BAR) kase.status = 'working';
        break;
      case 'terminating':
        // 结束期做满一年就是自然结束。**"好好告别"本身要花时间**,这不是拖延
        closeCase(state, kase, 'completed');
        break;
      default:
        break;
    }
  }

  // 5. 督导小时数(有没有个案都算——督导里谈的不只是个案,也是你自己)。
  // 每格 20:一格 ≈ 每两周一次的固定督导,一年二十来个小时。
  // 第一版写 12,结果注册心理师的督导门槛在整条时间线里都够不到(死内容)。
  if (supervisedThisYear) {
    state.flags.supervision_hours = Math.min(
      2000,
      readNumericFlag(state.flags.supervision_hours) + 20 * supervisionSlots(state),
    );
  }

  // 6. 案量的耗竭账
  const burnoutDelta = caseloadBurnoutDelta(state);
  if (burnoutDelta !== 0) {
    state.flags.burnout = Math.max(
      0,
      Math.min(100, readNumericFlag(state.flags.burnout) + burnoutDelta),
    );
  }
}

/** 统计满足条件的个案数,给 `{ caseCount }` 条件用 */
export function countCases(
  state: GameState,
  query: { status?: CaseStatus; riskLevel?: ClinicalCase['riskLevel']; active?: boolean },
): number {
  return (state.cases ?? []).filter(kase => {
    if (query.status !== undefined && kase.status !== query.status) return false;
    if (query.riskLevel !== undefined && kase.riskLevel !== query.riskLevel) return false;
    if (query.active !== undefined) {
      const isActive =
        kase.status !== 'dropped' && kase.status !== 'completed' && kase.status !== 'referred';
      if (isActive !== query.active) return false;
    }
    return true;
  }).length;
}
