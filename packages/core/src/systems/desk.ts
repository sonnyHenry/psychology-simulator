import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { DeskView } from '../types/view';
import type { PaperTier, Project } from '../types/project';
import type { Rng } from '../rng/rng';
import {
  activeProjects,
  currentStageIndex,
  findTemplate,
  isAtFinalStage,
  tierRank,
} from './project';
import { activeCases } from './case';
import { advisorDefOf } from './advisor';
import { availableItems, RETAKE_FLAG } from './allocation';
import { readNumericFlag } from '../dsl/evaluate';

/**
 * 工作台的 ViewModel 聚合(GAME_DESIGN 四节 / TECH 4.4)。**纯读,不改 state。**
 *
 * ## 这一层的唯一职责:把原始数值降级成档位
 *
 * `quality` / `alliance` / `favor` 的数字**不许穿过这一层**(validate 规则 36)。
 * 理由在 GAME_DESIGN 4.6 第二条"不借":给了精确数字,一屏选择就从一次判断
 * 变成一道最优化题,而那道题的答案通常很无聊。所以:
 *
 * - **阶段是事实** → 给中文站名和"第几站 / 共几站"
 * - **质量是判断** → 给三档("还有硬伤 / 看得过去 / 结实")
 * - **联盟是走向** → 给"在变好 / 有点僵",这条在结算屏上已经写死过一次
 * - **关系是四档,可及性是三档**,而且可及性的映射**必须多对一**(规则 35):
 *   学术大牛和放养型老教授都是"几乎见不到",而这两个人在关键时刻做的事完全相反。
 *
 * ## 两种动作,两条通路
 *
 * 花精力格的走 `ALLOCATE`(一次原子提交,格数守恒只能有一个校验点),
 * 不花格数的走 `DESK_ACTION` 当场生效。`deskActions` 只产出后者。
 */

// ---------- 档位映射:所有原始数值都在这里被挡住 ----------

/** 阶段的中文名。**阶段是事实**,所以这一栏给得很具体 */
const STAGE_TEXT: Record<string, string> = {
  ideation: '想法',
  lit: '文献',
  ethics: '伦理审查',
  collect: '收数据',
  analyze: '分析',
  write: '写作',
  submit: '投稿',
  review: '审稿',
  published: '已发表',
  abandoned: '做废了',
};

export function stageText(stage: string): string {
  return STAGE_TEXT[stage] ?? stage;
}

/**
 * 课题质量的三档。**这三句话是判断,不是刻度。**
 *
 * 分界点取自 `tierForQuality` 的档位边界(52 / 68),这样"看得过去"这句话
 * 和它实际能投到哪一档是对得上的——文案和数值对不上是这个项目反复付过学费的错。
 */
export function qualityLabel(quality: number): string {
  if (quality >= 68) return '结实';
  if (quality >= 52) return '看得过去';
  return '还有硬伤';
}

/** 期刊档位的中文名。选刊屏和课题卡片共用 */
export const TIER_TEXT: Record<PaperTier, string> = {
  q1: '一区',
  q2: '二区',
  q3: '三区',
  cssci: 'CSSCI',
  chinese_core: '中文核心',
  conference: '会议',
  preprint: '预印本',
};

/**
 * 选刊清单。**四档模糊提示,与录取屏同一口径**(GAME_DESIGN 五节)。
 *
 * 提示写的是这一档意味着什么,不是命中率。"悬"和"稳"这两个词在这个游戏里
 * 已经有确定含义了(录取屏用过),所以这里直接复用——玩家不需要学第二套词汇。
 */
export const SUBMIT_TIERS: { tier: PaperTier; hint: string }[] = [
  { tier: 'chinese_core', hint: '稳。发出来没有人会因此高看你一眼,但它是一篇' },
  { tier: 'q3', hint: '较稳。三区在很多单位的毕业要求里是算数的' },
  { tier: 'q2', hint: '有点冒险' },
  { tier: 'q1', hint: '悬。而且审稿周期会吃掉你一年' },
];

/**
 * 师生关系四档。**不给数字**——与个案联盟同一条纪律:
 * 把关系变成进度条,恰好毁掉它想说的事(GAME_DESIGN 七节)。
 */
export function relationLabel(favor: number): string {
  if (favor >= 78) return '亲近';
  if (favor >= 58) return '熟络';
  if (favor >= 32) return '一般';
  return '疏远';
}

/**
 * 可及性三档的展示文案。映射在 `AdvisorDef.availability` 上,由内容声明,
 * **validate 规则 35 强制每一档至少落 2 个原型**——一对一就等于把原型印在面板上。
 */
const AVAILABILITY_TEXT: Record<string, string> = {
  rare: '几乎见不到',
  monthly: '一月一次',
  weekly: '每周都问',
};

export function availabilityLabel(availability: string): string {
  return AVAILABILITY_TEXT[availability] ?? availability;
}

const RISK_TEXT: Record<string, string> = { low: '低风险', moderate: '需要留意', high: '高风险' };
const CASE_STATUS_TEXT: Record<string, string> = {
  intake: '初始访谈',
  working: '工作期',
  plateau: '停滞',
  terminating: '结束期',
  dropped: '脱落',
  completed: '已结束',
  referred: '已转介',
};

// ---------- 毕业进度(GAME_DESIGN 4.3)----------

/**
 * 现在这个培养阶段挂在哪所院校上。
 *
 * 读 `admissions`:读博阶段看 `phd`(海外博士看 `phd_abroad`),硕士阶段看 `master`。
 * **不按当前 `profile.university` 反查**——那是一个展示字段,改名之后就对不上了。
 */
function currentInstitutionId(state: GameState): string | null {
  const admissions = state.admissions ?? {};
  if (state.flags.track_phd || admissions.phd || admissions.phd_abroad) {
    return admissions.phd ?? admissions.phd_abroad ?? null;
  }
  return admissions.master ?? null;
}

/** 论文算不算"达到 topTier 档"。二区以上 = q1/q2,SSCI 口径同理 */
function meetsTopTier(tier: string, topTierLabel: string | undefined): boolean {
  if (topTierLabel === '中文核心') return true; // 任何正式发表都够
  if (topTierLabel === '三区') return tier === 'q1' || tier === 'q2' || tier === 'q3';
  return tier === 'q1' || tier === 'q2';
}

/**
 * 毕业进度行。`null` = 这个阶段没有毕业硬指标(本科、非学术路径、内容没配)。
 *
 * **只列清单,不算总分。** 真实的说法就是"两篇 SCI 其中一篇二区",
 * 折成一个综合积分反而不像话——这也和长聘首考那一屏的写法保持一致。
 */
export function graduationProgress(state: GameState, pack: ContentPack): DeskView['graduation'] {
  const instId = currentInstitutionId(state);
  if (!instId) return null;
  const inst = (pack.institutions ?? []).find(i => i.id === instId);
  const admission = inst?.gameified.admission;
  if (!inst || !admission?.graduationBar || !admission.graduationReq) return null;

  const req = admission.graduationReq;
  const papers = state.papers ?? [];
  const counts = new Map<string, number>();
  for (const paper of papers) {
    const label = TIER_TEXT[paper.tier] ?? paper.tier;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const inReview = activeProjects(state).filter(p => !p.isThesis && p.stage === 'review').length;
  const have = [...counts.entries()].map(([label, n]) => `${label} ${n}`);
  if (inReview > 0) have.push(`在审 ${inReview}`);
  if (have.length === 0) have.push('还没有');

  const topCount = papers.filter(p => meetsTopTier(p.tier, req.topTierLabel)).length;
  const missingTotal = Math.max(0, req.papers - papers.length);
  const missingTop = Math.max(0, (req.topTier ?? 0) - topCount);
  const gaps: string[] = [];
  if (missingTop > 0) gaps.push(`${missingTop} 篇${req.topTierLabel ?? ''}`);
  // 总篇数的缺口扣掉高档缺口:还差 1 篇二区 + 总共还差 2 篇 = "1 篇二区、1 篇"
  const restGap = Math.max(0, missingTotal - missingTop);
  if (restGap > 0) gaps.push(`${restGap} 篇`);
  const met = missingTotal === 0 && missingTop === 0;

  return {
    institution: inst.name,
    bar: admission.graduationBar,
    have,
    remaining: met ? null : `还差 ${gaps.join('、')}`,
    met,
  };
}

// ---------- 不花精力格的当场动作(TECH 4.4 的第二条通路)----------

export interface DeskActionDef {
  id: string;
  label: string;
  hint: string;
  targetId?: string;
  value?: string;
}

/**
 * 当前可做的 `DESK_ACTION`。**这里面没有一条会花精力格**——
 * 花格数的一律走 `ALLOCATE`,这条分工由 validate 规则 37 机械守住。
 */
export function deskActions(state: GameState, pack: ContentPack): DeskActionDef[] {
  const actions: DeskActionDef[] = [];
  for (const project of activeProjects(state)) {
    if (project.isThesis) continue;
    const template = findTemplate(pack, project.templateId);
    const atSubmit = Boolean(template && isAtFinalStage(template, project));
    if (atSubmit) {
      // 选刊:投稿阶段唯一由玩家直接决定的事。已经选过的档位不再列出来
      for (const entry of SUBMIT_TIERS) {
        if (project.submitTier === entry.tier) continue;
        // 被拒之后只能往下降,不能原地换一家同档的——那等于免费重投
        if (project.submitTier && tierRank(entry.tier) >= tierRank(project.submitTier)) continue;
        actions.push({
          id: project.submitTier ? 'desk_resubmit_lower' : 'desk_choose_tier',
          label: project.submitTier
            ? `「${project.title}」降到${TIER_TEXT[entry.tier]}改投`
            : `「${project.title}」投${TIER_TEXT[entry.tier]}`,
          hint: entry.hint,
          targetId: project.id,
          value: entry.tier,
        });
      }
    }
    actions.push({
      id: 'desk_abandon_project',
      label: `放弃「${project.title}」`,
      hint: '这个文件夹你已经很久没打开了。放弃不要精力,但它就到此为止了',
      targetId: project.id,
    });
  }
  return actions;
}

/**
 * 执行一次 `DESK_ACTION`。返回 false = 这个动作在当前状态下不可做(引擎据此报错)。
 *
 * **当场生效**是这条通路的全部意义:不花格数的决策当场落地才有手感,
 * 而且它们不参与格数校验,不会把"提交前可以反复加减格子"那条不变式搞乱。
 */
export function applyDeskAction(
  state: GameState,
  pack: ContentPack,
  actionId: string,
  targetId: string | undefined,
  value: string | undefined,
): boolean {
  const allowed = deskActions(state, pack).some(
    a => a.id === actionId && a.targetId === targetId && a.value === value,
  );
  if (!allowed) return false;
  const project = (state.projects ?? []).find(p => p.id === targetId);
  if (!project) return false;
  switch (actionId) {
    case 'desk_choose_tier':
    case 'desk_resubmit_lower':
      project.submitTier = value as PaperTier;
      return true;
    case 'desk_abandon_project':
      project.stage = 'abandoned';
      return true;
    default:
      return false;
  }
}

// ---------- 工作台的 ViewModel ----------

export function buildDeskView(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  options: {
    phaseLabel: string;
    coursebookOf: (courseId: string) => string | undefined;
    render: (text: string) => string;
  },
): DeskView {
  const advisorDef = advisorDefOf(state, pack);
  const items = availableItems(state, pack, rng).map(item => {
    const textbook = item.courseId ? options.coursebookOf(item.courseId) : undefined;
    return {
      id: item.id,
      label: item.label,
      text: options.render(item.text),
      payoff: item.payoff,
      category: item.category,
      maxSlots: item.maxSlots ?? null,
      ...(textbook === undefined ? {} : { textbook }),
      ...(item.target === undefined ? {} : { target: item.target }),
    };
  });

  return {
    kind: 'DESK',
    year: state.date.year,
    phaseLabel: options.phaseLabel,
    slots: state.allocation?.slots ?? 0,
    retakeSlots: readNumericFlag(state.flags[RETAKE_FLAG]),
    graduation: graduationProgress(state, pack),
    items,
    projects: activeProjects(state).map(project => {
      const template = findTemplate(pack, project.templateId);
      const index = template ? currentStageIndex(template, project) : -1;
      return {
        id: project.id,
        title: project.title,
        stage: stageText(project.stage),
        stageIndex: index + 1,
        stageTotal: template?.stageSequence.length ?? 0,
        yearsSpent: project.yearsSpent,
        authorship: project.authorship,
        isThesis: Boolean(project.isThesis),
        // **原始 quality 到这里为止。** 下游拿到的是一句判断,不是一个可以优化的刻度
        qualityLabel: qualityLabel(project.quality),
        rejections: project.rejections,
        atSubmitStage: Boolean(template && isAtFinalStage(template, project)) && !project.isThesis,
        submitTierLabel: project.submitTier ? (TIER_TEXT[project.submitTier] ?? null) : null,
        ...foundationHintOf(state, project, pack),
      };
    }),
    papers: (state.papers ?? []).map(paper => ({
      title: paper.title,
      tier: paper.tier,
      authorship: paper.authorship,
      year: paper.year,
    })),
    cases: activeCases(state).map(kase => ({
      id: kase.id,
      label: kase.label,
      presentingIssue: kase.presentingIssue,
      status: CASE_STATUS_TEXT[kase.status] ?? kase.status,
      sessions: kase.sessions,
      // **联盟的数值不进来,只给走向。** 与结算屏同一条纪律
      trend: kase.lastTrend ?? null,
      supervised: kase.supervised,
      riskLabel: RISK_TEXT[kase.riskLevel] ?? kase.riskLevel,
    })),
    clinicalHours: readNumericFlag(state.flags.clinical_hours),
    supervisionHours: readNumericFlag(state.flags.supervision_hours),
    advisor:
      advisorDef && state.advisor
        ? {
            name: advisorDef.name,
            // 抽卡那天你读到的那句话,永远留在面板上。几年之后再读它会有别的味道
            publicImpression: options.render(advisorDef.publicImpression),
            relationLabel: relationLabel(state.advisor.favor),
            availabilityLabel: availabilityLabel(advisorDef.availability),
            lastLine: state.advisor.lastLine ?? null,
          }
        : null,
    years: (state.yearlySnapshots ?? []).map(snapshot => ({
      year: snapshot.year,
      phaseLabel: snapshot.phaseLabel ?? null,
      money: snapshot.money,
      state: snapshot.state ?? null,
      papers: snapshot.papers ?? [],
      notes: snapshot.notes ?? [],
    })),
    actions: deskActions(state, pack).map(action => ({
      id: action.id,
      label: action.label,
      hint: action.hint,
      ...(action.targetId === undefined ? {} : { targetId: action.targetId }),
      ...(action.value === undefined ? {} : { value: action.value }),
    })),
  };
}

/**
 * 怀疑主义特质在这里第二次变现(GAME_DESIGN 19.4)。
 * 多给一行原始研究的样本量——**它不告诉你结论**,只是把数字放到你眼前。
 */
function foundationHintOf(
  state: GameState,
  project: Project,
  pack: ContentPack,
): { foundationHint?: string } {
  if (!state.flags.trait_skeptic || !project.foundationId) return {};
  const hint = (pack.foundations ?? []).find(f => f.id === project.foundationId)?.skepticHint;
  return hint === undefined ? {} : { foundationHint: hint };
}
