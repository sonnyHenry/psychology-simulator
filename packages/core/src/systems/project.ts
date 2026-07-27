import type { ContentPack } from '../types/content';
import type {
  Paper,
  PaperTier,
  Project,
  ProjectOp,
  ProjectStage,
  ProjectTemplate,
} from '../types/project';
import type { GameState } from '../types/state';

/**
 * 课题阶段机(GAME_DESIGN 第五节 / TECH 4.7.6)。
 *
 * 阶段推进沿模板声明的 `stageSequence` 走,**引擎不知道有哪些阶段序列**——
 * 毕业论文的裁短版和真课题的完整版用同一套代码,区别只在数据。
 *
 * ## 骰子由引擎掷,故事由内容讲(M3)
 *
 * `stageSuccessChance` 算出一次推进的成功率,调度器在挑阶段事件之前掷一次,
 * 结果写进 `project.lastRoll`,内容用 `{ projectRoll }` 条件分流文案。
 *
 * 这样拆是因为两件事都必须成立:失败率要是**系统性**的(否则调不出"高方法更快但同样会做废"),
 * 而文案又必须跟骰子结果一致(否则 simulate 的统计和玩家看到的东西对不上)。
 *
 * 毕业论文(M2.5)是唯一的例外:它的阶段推进写死在内容里,不掷骰。
 * 教学关要教流程,不要教挫败。
 */

/** 默认的终态。走完 `stageSequence` 之后落在这里 */
const COMPLETED_STAGE: ProjectStage = 'published';

/**
 * 按课题质量决定发表档位。
 *
 * 档位由 `quality` 单独决定,而 `quality` 是玩家一路上每个选择攒出来的
 * (预注册、认真写讨论、不抄别人的清理规则…)。**这条链是这个游戏对"什么叫做得好"的回答**:
 * 不是投得准,是做得扎实。
 */
export function tierForQuality(quality: number): PaperTier {
  if (quality >= 85) return 'q1';
  if (quality >= 68) return 'q2';
  if (quality >= 52) return 'q3';
  if (quality >= 36) return 'cssci';
  return 'chinese_core';
}

/** 把一个课题变成一份论文。`integrityRisk` 结转过去 */
function publishProject(state: GameState, project: Project, tier: PaperTier): void {
  state.papers = state.papers ?? [];
  state.papers.push({
    id: `paper_${state.papers.length + 1}`,
    title: project.title,
    tier,
    authorship: project.authorship,
    year: state.date.year,
    domain: project.domain,
    // **诚信风险结转到论文。** 结局页"哪几篇后来重复不出来"就是读这个值。
    integrityRisk: project.integrityRisk,
    // `null` = 从来没有人试过重复。这是最真实的情况,也是绝大多数论文的结局。
    replicated: null,
  } satisfies Paper);
  project.stage = 'published';
}

/** 阶段基准推进概率的默认值(模板没声明该阶段时用) */
export const DEFAULT_STAGE_CHANCE = 0.55;

/**
 * **失败率下限。** 无论方法多高、导师多好、投入多满,每一站都至少有这么大概率卡住。
 *
 * 这是 GAME_DESIGN 五节三条硬约束的**机制保证**:
 * "不存在稳定刷论文的最优解""高投入高方法的角色是更快更多、但同样会有做废的"。
 * 光靠内容侧的 outcome 权重做不到——权重会被后续调参一点点磨平,
 * 而这个下限是一行代码,改动它必须是一个显式的决定。
 */
export const MIN_SETBACK_CHANCE = 0.22;
const MAX_SUCCESS = 1 - MIN_SETBACK_CHANCE;

/** 方法值每高于 50 一点的加成 */
const PER_METHOD_POINT = 0.004;
/** 投稿与审稿两站,课题质量每高于 50 一点的加成 */
const PER_QUALITY_POINT = 0.006;
/** 被拒这么多次,这个课题就不再投了 */
export const MAX_REJECTIONS = 3;
/** 本年每投一格精力对**单次**成功率的加成 */
const PER_INVESTED_SLOT = 0.08;
/**
 * 每个课题每年的推进机会 = `基础 + 每格 × 投入格数`。
 *
 * **基础必须很低。** 这是标定过程里最重要的一个发现:基础给到 4 次的时候,
 * 一个一格精力都没投的课题每年也能推进将近三站——于是"投不投入"几乎没有区别,
 * 而"你只能同时认真推一两个课题"这条核心张力直接消失了。
 * (更糟的是:那时候被"烂在手里"规则杀掉的反而是**正在推进**的课题。)
 *
 * 现在的标定(方法 90、普通导师):
 * - **0 格** ≈ 0.8 站/年 → 八站要十年,等于卡死
 * - **1 格** ≈ 2.3 站/年 → 三四年一篇
 * - **2 格** ≈ 3.9 站/年 → 两年一篇
 *
 * 于是产出来自**同时推着三个**,而不是把一个推得更快。
 *
 * 三格精力、两三个课题,所以每年总有一个没人管——**而那个就是会烂掉的那个**。
 */
const BASE_ATTEMPTS_PER_YEAR = 1;
/**
 * 每投一格精力多给的推进次数。
 *
 * **必须小。** 次数一多,每年的推进站数就被大数定律钉死在上限上:
 * 六次机会、七成八成功率,结果永远正好是"顶到上限"。于是课题每年跨过的站数是个定值,
 * 奇数站(文献、收数据、写作、审稿)**一次都不会在回合边界上出现**——
 * 八百次伦理审查,一次收数据。
 *
 * 次数少,方差才在:同样是投一格,有的年份走两站,有的年份一站都没动。
 * **那个方差就是玩家会看到的全部内容。**
 */
const ATTEMPTS_PER_INVESTED_SLOT = 2;
/** 开题那一年按投了一格算(见 engine 的 settleProjectAdvances) */
export const ATTEMPTS_PER_STARTUP_SLOT = ATTEMPTS_PER_INVESTED_SLOT;

/**
 * 连续这么多年一格精力都没投,课题就烂在手里了。
 *
 * 三年。两年的时候太狠:三格精力配三个课题,本来就有一个每年轮空,
 * 两年一到就死——于是几乎没有课题能活到发表。三年给了"轮着来"一点空间,
 * 而**真正放着不管的那个仍然会烂掉**。
 */
export const NEGLECT_YEARS_TO_ABANDON = 3;
/** 做了这么多年还没写出来的课题,也算烂了 */
const MAX_YEARS_BEFORE_WRITING = 6;

/**
 * "烂在手里"判定。
 *
 * GAME_DESIGN 五节的第三条硬约束:**至少有一个课题应该在多数对局里彻底做废。
 * 做废的课题是这个职业最普遍的经验,不是惩罚。**
 *
 * 光靠内容里的"放弃"选项做不到——那需要玩家主动点一下,而**真实的做废不是一个决定,
 * 是一个你渐渐不再打开的文件夹**。所以判定读的是"连续几年没往它上面投过精力",
 * 不是"运气差":运气差只会让它慢,而慢下来的课题最后是被**忽视**杀死的。
 */
export function shouldAbandonBySilence(project: Project): boolean {
  // 投了四个刊都没中。**这是做废最常见的一种死法**,而且跟你努不努力关系不大——
  // 它跟这篇东西本身写成什么样有关,而那是很早以前就定了的。
  if (project.rejections >= MAX_REJECTIONS) return true;
  if ((project.neglectedYears ?? 0) >= NEGLECT_YEARS_TO_ABANDON) return true;
  const stillNotWriting = !['write', 'submit', 'review'].includes(project.stage);
  return stillNotWriting && project.yearsSpent >= MAX_YEARS_BEFORE_WRITING;
}

/**
 * 一个课题今年掷几次骰。
 *
 * 不投 = 2 次(一年爬一站,基本等于卡死);投满两格 = 6 次(一年走三四站)。
 * **你只能同时认真推一两个课题**,而那些你没顾上的会以看不见的方式烂在手里——
 * 这两件事都是这个公式直接产生的,不需要额外的惩罚机制。
 */
export function advanceAttempts(state: GameState, project: Project): number {
  return BASE_ATTEMPTS_PER_YEAR + ATTEMPTS_PER_INVESTED_SLOT * investedSlotsOn(state, project.id);
}

/**
 * 一个课题一年最多推进几站。**兜底用的,正常不该顶到**。
 *
 * 真正防止"硬凑过每一站"的是上面那个很小的掷骰次数;这个上限只挡住极端好运。
 * (一开始是反过来的:掷骰次数很多、靠上限压住——结果推进站数变成定值,
 * 一半的阶段内容永远不会出现。)
 *
 * 加上上限之后,课题有了一个**再多努力也压不掉的最短孕期**——八站至少四年。
 * 这件事是真的:你没法用加班把伦理审查的六周变成两天,也没法让审稿人早点回信。
 *
 * ## 上限还决定了玩家能看到多少内容
 *
 * 阶段事件是按"回合开始时课题卡在哪一站"挑的。上限设到 6 的时候,课题会从伦理审查
 * **一年直接冲到投稿**,于是收数据、分析、写作三站的事件**一次都不会出现**——
 * 八百多次伦理审查,零次收数据。这是 simulate 的事件覆盖统计抓出来的,validate 查不到。
 *
 * 所以产出不来自"把一个课题推得更快",来自**同时推着三个**。
 * 而三格精力配三个课题,意味着永远有一个在边上放着——那个就是会烂掉的那个。
 */
export const MAX_ADVANCES_PER_YEAR = 4;
/** 开题那一年最多推进几站。低于常规上限:立项那年不可能已经在收数据了 */
export const MAX_STARTUP_ADVANCES = 2;

/** 投入项 id 的约定式命名:一个活跃课题一个 */
export function allocationIdForProject(projectId: string): string {
  return `alloc_project_${projectId}`;
}

/** 本回合投在某个课题上的格数 */
export function investedSlotsOn(state: GameState, projectId: string): number {
  const id = allocationIdForProject(projectId);
  return (state.allocation?.picks ?? []).filter(pick => pick === id).length;
}

/** 还在推进中的课题 */
export function activeProjects(state: GameState): Project[] {
  return (state.projects ?? []).filter(p => p.stage !== 'published' && p.stage !== 'abandoned');
}

/**
 * 一次阶段推进的成功率:`阶段基准 × 导师原型修正 + 方法加成 + 本年投入加成`,
 * 钳到 `[0.05, 1 − 失败下限]`。
 *
 * **导师是乘数,方法和投入是加数。** 这不是随手定的:放养型导师让每一站都变难(×0.85),
 * 而这件事不是多投两格精力能补上的——它按比例吃掉你所有的努力。
 * 这正是"导师是本作最大的随机变量"在数值上的样子。
 */
export function stageSuccessChance(state: GameState, pack: ContentPack, project: Project): number {
  const template = findTemplate(pack, project.templateId);
  const base = template?.stageChance?.[project.stage] ?? DEFAULT_STAGE_CHANCE;
  const advisorDef = (pack.advisors ?? []).find(a => a.id === state.advisor?.id);
  const modifier = advisorDef?.projectModifiers?.[project.stage] ?? 1;
  // **投稿和审稿这两站看的是课题质量,不是你今年多努力。**
  // 稿子写成什么样在投出去之前就定了——这是 `quality` 唯一真正致命的地方,
  // 而 `quality` 是前面每一个"要不要做扎实一点"的选择攒出来的。
  const qualityTerm =
    project.stage === 'review' || project.stage === 'submit'
      ? (project.quality - 50) * PER_QUALITY_POINT
      : 0;
  const raw =
    base * modifier +
    (state.stats.method - 50) * PER_METHOD_POINT +
    investedSlotsOn(state, project.id) * PER_INVESTED_SLOT +
    qualityTerm;
  return Math.max(0.05, Math.min(MAX_SUCCESS, raw));
}

export function findTemplate(pack: ContentPack, templateId: string): ProjectTemplate | undefined {
  return (pack.projectTemplates ?? []).find(t => t.id === templateId);
}

/** 本局的毕业论文(至多一个) */
export function thesisOf(state: GameState): Project | undefined {
  return (state.projects ?? []).find(p => p.isThesis);
}

/**
 * 解析 `ProjectOp.target`。
 *
 * `'thesis'` = 毕业论文;`'latest'`(或省略)= 最近创建的那个;其余按课题 id 匹配。
 */
export function resolveTarget(state: GameState, target?: string): Project | undefined {
  const projects = state.projects ?? [];
  if (target === 'thesis') return thesisOf(state);
  if (target !== undefined && target !== 'latest' && target !== 'current') {
    return projects.find(p => p.id === target);
  }
  // 省略 target 时优先取"当前事件绑定的课题"。
  // 一个博士生手上三个课题,管线阶段事件如果全部作用在最新那个上,
  // 玩家会看到"我在推 A,结果 C 推进了"。
  if (target !== 'latest' && state.currentProjectId) {
    const bound = projects.find(p => p.id === state.currentProjectId);
    if (bound) return bound;
  }
  return projects[projects.length - 1];
}

export function currentStageIndex(template: ProjectTemplate, project: Project): number {
  return template.stageSequence.indexOf(project.stage);
}

function clamp01to100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * 应用一次课题操作。返回被操作的课题(create 时是新建的那个),没命中目标时返回 undefined。
 *
 * 调用方是 `dsl/apply.ts` 的 `{ project }` 分支。这里**不做任何随机判定**——
 * 阶段推进成不成功由内容侧的 outcome 权重决定,引擎只负责改状态。
 * (把随机性留在内容层,是为了让 `simulate` 的统计和玩家看到的文案永远对得上。)
 */
export function applyProjectOp(
  state: GameState,
  pack: ContentPack,
  operation: ProjectOp,
): Project | undefined {
  state.projects = state.projects ?? [];

  if (operation.op === 'create') {
    const template = findTemplate(pack, operation.templateId);
    if (!template) throw new Error(`project create references unknown template: ${operation.templateId}`);
    const firstStage = template.stageSequence[0];
    if (!firstStage) throw new Error(`project template has an empty stageSequence: ${template.id}`);
    // 标题从候选里按序号轮取而不是随机:`applyEffects` 拿不到 RNG,而**引擎不该偷偷消耗随机流**
    // (那会让同一个种子的回放漂移)。跨局差异靠候选表本身够长 + 玩家的创建顺序不同。
    const title = template.titles[state.projects.length % template.titles.length] ?? template.id;
    const project: Project = {
      id: `proj_${state.projects.length + 1}`,
      templateId: template.id,
      title,
      domain: template.domain,
      stage: firstStage,
      quality: 40,
      yearsSpent: 0,
      authorship: 'first',
      integrityRisk: 0,
      rejections: 0,
      preregistered: false,
      startedYear: state.date.year,
      ...(template.isThesis ? { isThesis: true } : {}),
    };
    state.projects.push(project);
    return project;
  }

  const project = resolveTarget(state, operation.target);
  if (!project) return undefined;
  const template = findTemplate(pack, project.templateId);
  if (!template) throw new Error(`project references unknown template: ${project.templateId}`);

  switch (operation.op) {
    case 'advance': {
      const steps = operation.stages ?? 1;
      const index = currentStageIndex(template, project);
      // 已经在终态上的课题不再推进
      if (index < 0) return project;
      const next = template.stageSequence[index + steps];
      if (next !== undefined) {
        project.stage = next;
        return project;
      }
      // 推过了最后一站 = 走完了。
      // 毕业论文不产出论文对象——它是一次教学关,不是一篇文章。
      if (project.isThesis) {
        project.stage = COMPLETED_STAGE;
        return project;
      }
      publishProject(state, project, tierForQuality(project.quality));
      return project;
    }
    case 'regress': {
      const steps = operation.stages ?? 1;
      const index = currentStageIndex(template, project);
      if (index < 0) return project;
      project.stage = template.stageSequence[Math.max(0, index - steps)] ?? project.stage;
      return project;
    }
    case 'abandon':
      project.stage = 'abandoned';
      return project;
    case 'publish':
      publishProject(state, project, operation.tier);
      return project;
    case 'setField': {
      if (operation.quality !== undefined) {
        project.quality = clamp01to100(project.quality + operation.quality);
      }
      if (operation.integrityRisk !== undefined) {
        project.integrityRisk = clamp01to100(project.integrityRisk + operation.integrityRisk);
      }
      if (operation.authorship !== undefined) project.authorship = operation.authorship;
      if (operation.preregistered !== undefined) project.preregistered = operation.preregistered;
      return project;
    }
  }
}

/** 年度结算时给所有未终结的课题记一年 */
export function ageProjects(state: GameState): void {
  for (const project of state.projects ?? []) {
    if (project.stage === 'published' || project.stage === 'abandoned') continue;
    project.yearsSpent += 1;
  }
}

/** 统计满足条件的论文数,给 `{ paperCount }` 条件用 */
export function countPapers(
  state: GameState,
  query: { tier?: Paper['tier']; authorship?: Paper['authorship'] },
): number {
  return (state.papers ?? []).filter(paper => {
    if (query.tier !== undefined && paper.tier !== query.tier) return false;
    if (query.authorship !== undefined && paper.authorship !== query.authorship) return false;
    return true;
  }).length;
}

/** 统计满足条件的课题数,给 `{ projectCount }` 条件用 */
export function countProjects(
  state: GameState,
  query: { stage?: ProjectStage; domain?: string; isThesis?: boolean; active?: boolean },
): number {
  return (state.projects ?? []).filter(project => {
    if (query.stage !== undefined && project.stage !== query.stage) return false;
    if (query.domain !== undefined && project.domain !== query.domain) return false;
    if (query.isThesis !== undefined && Boolean(project.isThesis) !== query.isThesis) return false;
    if (query.active !== undefined) {
      const isActive = project.stage !== 'published' && project.stage !== 'abandoned';
      if (isActive !== query.active) return false;
    }
    return true;
  }).length;
}
