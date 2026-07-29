import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { Position } from '../types/institution';
import type { JobMarketState, Offer, TwoBodyResolution } from '../types/jobmarket';
import type { Rng } from '../rng/rng';
import { evalCondition } from '../dsl/evaluate';
import type { ViewModel } from '../types/view';
import { advisorDefOf } from './advisor';
import { applyFavorOp, favorTotal } from './favor';

/**
 * 教职求职季(GAME_DESIGN 九节 / TECH 4.7.2)。**全游戏的高光。**
 *
 * ## 市场松紧玩家不可见,这是整个设计的支点
 *
 * 9.3 第一条要的是"'一个都没有'必须是高概率的、有尊严的结果"。做法**不是**
 * 把命中率调低,而是让同一份履历在不同年份得到不同结果,**而玩家看不见那个年份系数**。
 *
 * 于是"要不要再等一年攒一篇一区"就成了一场真实的赌博:等下去不一定更好。
 * 一旦把 tightness 摆到屏上,这个决策立刻退化成算术题。
 *
 * ## 不写失败提示,写市场
 *
 * 全无 offer 的那一屏不许出现"你不够优秀"这类话。它写的是那一年的市场:
 * 名额缩了、去年那个岗今年不招了、同批的人也在群里问。
 * **失败是市场的属性,不是玩家的属性**——这是这一节最重要的一条文案纪律。
 */

/**
 * 市场松紧。**由种子和年份决定,与玩家的任何选择无关。**
 *
 * 范围大致 0.65–1.25:紧的年份好岗位少一半,松的年份多两成。
 * 用种子而不是即时掷骰,是为了让"今年紧不紧"在同一局里**前后一致**——
 * 玩家等一年再投,面对的必须是另一个年份的真实市场,而不是重摇一次运气。
 */
export function marketTightnessFor(seed: number, year: number): number {
  // 简单的确定性哈希:同一局的同一年永远是同一个数
  const mixed = Math.sin(seed * 0.0001 + year * 7.13) * 10000;
  const noise = mixed - Math.floor(mixed);
  return 0.65 + noise * 0.6;
}

/**
 * 推荐信的分量。**这是导师关系四到七年的一次性变现。**
 *
 * 三项相乘再加人情:原型基线 × 关系档位 + 欠你的人愿意认真写。
 * **找了大牛但他四年没见过你,信会写得很空**——所以关系差的时候,
 * 大牛的基线优势会被关系项吃掉大半,而这正是设计要的那个对比。
 */
export function letterWeightFor(state: GameState, pack: ContentPack): number {
  const def = advisorDefOf(state, pack);
  if (!def || !state.advisor) return 0.4;
  // 大牛的信在圈里分量最重,温暖型的最轻——但这只是基线
  const base =
    def.archetype === 'star' ? 1.15
    : def.archetype === 'boundary' ? 0.95
    : def.archetype === 'young_pi' ? 0.9
    : def.archetype === 'clinical' ? 0.8
    : def.archetype === 'hands_off' ? 0.75
    : 0.7;
  // 关系档位:0.55(疏远)→ 1.15(亲近)
  const relation = 0.55 + Math.min(1, state.advisor.favor / 100) * 0.6;
  // 欠你的人愿意认真写,而不是写一封模板
  const owed = Math.min(0.25, favorTotal(state, state.date.year, { direction: 'owed' }) * 0.04);
  return base * relation + owed;
}

/** 认真准备得了几份。**广投的代价是每一份都写得不够好**——所以上限很低 */
export const MAX_APPLICATIONS = 8;

/**
 * 材料质量:每多投一份,平均质量就降一点。
 *
 * 这条把 9.2 第 3 步那句话变成机制:"每一份的研究陈述都要重写一遍"。
 * 投 3 份的人每份都很扎实,投 8 份的人有一半是套模板的。
 */
export function materialQualityFor(count: number): number {
  if (count <= 0) return 0;
  return Math.max(0.45, 1.05 - (count - 3) * 0.075);
}

/** 这一年能投的职位:硬门槛 `requires` 过了才进清单 */
export function eligiblePositions(state: GameState, pack: ContentPack, rng: Rng): Position[] {
  const ctx = { state, pack, rng };
  return (pack.positions ?? []).filter(position => evalCondition(position.requires, ctx));
}

/**
 * 进面试的概率。
 *
 * `资本 × 方向匹配 × 推荐信 × 材料质量 × 市场松紧 × 该岗位的年份偏置`——
 * 六项相乘,**而其中两项(松紧、年份偏置)玩家看不见**。
 */
export function invitationChance(
  state: GameState,
  position: Position,
  market: JobMarketState,
): number {
  const capitalTerm = 0.16 + Math.min(1, state.stats.capital / 100) * 0.55;
  const fit = position.domainFit.some(domain => Boolean(state.flags[domain])) ? 1.35 : 0.8;
  const yearBias = position.marketYearBias?.[market.year] ?? 1;
  const raw =
    capitalTerm * fit * market.letterWeight * market.materialQuality * market.marketTightness * yearBias;
  return Math.max(0.02, Math.min(0.8, raw));
}

/**
 * job talk 之后拿到 offer 的概率。
 *
 * **诚信风险在这里第一次真的咬人**:有人会在提问环节问
 * "你那篇 2019 年的,后来有人重复出来吗"。答不上来这一场就废了——
 * 而这笔账是很多年以前记下的。
 */
export function offerChance(state: GameState, market: JobMarketState): number {
  const base = 0.5 + Math.min(1, state.stats.method / 100) * 0.25;
  const stumble = market.talkStumbled ? 0.45 : 1;
  return Math.max(0.05, Math.min(0.85, base * stumble * market.marketTightness));
}

/** 诚信风险到这条线,job talk 上那个问题就会被问出来 */
export const TALK_RISK_BAR = 8;

export function willBeAskedAboutReplication(state: GameState): boolean {
  const risk = typeof state.flags.integrity_risk === 'number' ? state.flags.integrity_risk : 0;
  const shaken = (state.projects ?? []).some(project => project.foundationShaken);
  return risk >= TALK_RISK_BAR || shaken;
}

/**
 * 把一个职位实例化成一份 offer。**条款在区间里摇一次**——
 * 同一所学校的两个 offer 可以在启动经费和考核指标上差一倍(9.2 第 5 步)。
 */
export function makeOffer(
  pack: ContentPack,
  position: Position,
  rng: Rng,
  negotiated: boolean,
): Offer | null {
  const inst = (pack.institutions ?? []).find(i => i.id === position.institutionId);
  if (!inst) return null;
  const employment = inst.gameified.employment ?? {};
  const lines: string[] = [];
  // 谈成了就往区间的上半段摇
  const roll = negotiated ? 0.5 + rng.next() * 0.5 : rng.next();
  if (employment.tenureYears !== undefined) {
    lines.push(`预聘期 ${employment.tenureYears} 年,中期考核在第 ${Math.ceil(employment.tenureYears / 2)} 年`);
  }
  if (employment.tenureBar) lines.push(`首考指标:${employment.tenureBar}`);
  if (employment.startupFunds) {
    const [low, high] = employment.startupFunds;
    const funds = Math.round((low + (high - low) * roll) / 10000) * 10000;
    lines.push(`启动经费 ¥${funds.toLocaleString()}`);
  }
  if (employment.teachingLoad) lines.push(`教学工作量 ${employment.teachingLoad}`);
  if (employment.tenured) lines.push('直接给编制');
  if (employment.housing) lines.push(employment.housing);
  return {
    positionId: position.id,
    institutionName: inst.name,
    city: inst.city,
    region: inst.region,
    terms: inst.gameified,
    termLines: lines,
    negotiated,
  };
}

/** 谈条件谈崩的概率。**谈了可能拿到更好条件,也可能让对方觉得你不识好歹** */
export const NEGOTIATION_FAIL_CHANCE = 0.18;

/** 两体问题的五个归宿。有伴侣才走这一步 */
export const TWO_BODY_RESOLUTIONS: readonly TwoBodyResolution[] = [
  'apart',
  'partner_follows',
  'player_yields',
  'spouse_hire',
  'breakup',
];

/**
 * 同校配偶岗**既真实又稀缺**。它不是玩家想选就能选的——
 * 要么对方也在学术圈、要么这所学校有这个政策。
 */
export function spouseHireAvailable(
  state: GameState,
  offer: Offer | undefined,
  pack?: Pick<ContentPack, 'positions'>,
): boolean {
  if (!offer) return false;
  if (!state.flags.partner_academic) return false;
  // 海外岗位、国内头部，或岗位数据明确声明有配偶岗政策。`twoBodyFriendly`
  // 原先只写进 Position 却从未被消费，导致六个标注岗位在游戏里仍然走不到这条路。
  const positionSupportsIt = Boolean(
    pack?.positions?.find(position => position.id === offer.positionId)?.twoBodyFriendly,
  );
  return offer.region === 'overseas' || Boolean(state.flags.offer_from_top_tier) || positionSupportsIt;
}

// ══════════════════ 七步流程 ══════════════════
//
// **七步是一个流程,不是七个屏。** 所以它们共用一个 ScreenId、一个 action
// (`JOB_MARKET_STEP`)和这一个状态机。加一步 = 在 `STEP_ORDER` 里插一个 id
// 加一个 case,而不是新开一个屏。

const STEP_ORDER: JobMarketState['step'][] = [
  'timing', 'materials', 'targeting', 'talks', 'negotiation', 'two_body', 'result',
];

/** 概率只给模糊档位,与录取屏、选刊同一口径 */
function chanceLabelOf(chance: number): string {
  if (chance >= 0.45) return '稳';
  if (chance >= 0.3) return '较稳';
  if (chance >= 0.18) return '冲';
  if (chance >= 0.08) return '悬';
  return '基本无望';
}

const POSITION_KIND_LABEL: Record<string, string> = {
  faculty_cn: '国内高校教职',
  institute_cn: '科研院所',
  tenure_track_r1: '海外 R1 预聘',
  slac: '海外文理学院',
  europe: '欧洲雇员制',
  hk_sg: '港校/新加坡',
  backup_hospital: '医院心理科',
  backup_industry: '企业用研',
  backup_clinic: '咨询机构',
  backup_school: '中小学',
};

export function startJobMarket(state: GameState, pack: ContentPack): void {
  state.jobMarket = {
    step: 'timing',
    year: state.date.year,
    marketTightness: marketTightnessFor(state.seed, state.date.year),
    letters: [],
    letterWeight: letterWeightFor(state, pack),
    materialQuality: 0.8,
    applied: [],
    invited: [],
    offers: [],
    accepted: null,
  };
}

/** 这一步该显示什么。**纯读** */
export function buildJobMarketView(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  notice: string,
): Extract<ViewModel, { kind: 'JOB_MARKET' }> {
  const market = state.jobMarket;
  if (!market) throw new Error('JOB_MARKET screen without jobMarket state');
  const base = {
    kind: 'JOB_MARKET' as const,
    step: market.step,
    year: market.year,
    notice,
    options: [] as { id: string; label: string; text: string; hint?: string }[],
    positions: [] as Extract<ViewModel, { kind: 'JOB_MARKET' }>['positions'],
    maxPicks: MAX_APPLICATIONS,
    offers: market.offers.map(offer => ({
      positionId: offer.positionId,
      institutionName: offer.institutionName,
      city: offer.city,
      region: offer.region,
      termLines: offer.termLines,
      negotiated: offer.negotiated,
      negotiationFailed: Boolean(offer.negotiationFailed),
    })),
    appliedCount: market.applied.length,
    invitedCount: market.invited.length,
    title: '',
    text: '',
  };

  switch (market.step) {
    case 'timing':
      return {
        ...base,
        title: '今年出去,还是再等一年',
        // **不写市场松紧的数字。** 写的是这一年的空气
        text: '博后合同还剩一年。\n\n群里已经有人在问"今年谁投了",也有人说"今年名额好像少"。\n\n**没有人知道明年会不会更好。** 你只知道再等一年,你大概能多一篇。',
        options: [
          {
            id: 'go_now',
            label: '今年就投',
            text: '手上是什么就拿什么去投。',
            hint: '市场每年都不一样,而这件事你事先看不出来',
          },
          ...(state.flags.jm_waited
            ? []
            : [
                {
                  id: 'wait_a_year',
                  label: '再等一年,攒一篇',
                  text: '续一年合同,把手上那篇推出去再说。',
                  hint: '你会多一篇,但明年的市场是另一回事',
                },
              ]),
        ],
      };
    case 'materials':
      return {
        ...base,
        title: '材料与推荐信',
        text: '研究陈述、教学陈述、代表作三篇。\n\n还有推荐信——**这是你这几年那段关系的一次性变现**。\n\n找谁写,和他到底了解你多少,是两件事。',
        options: [
          {
            id: 'letters_advisor',
            label: '请导师写',
            text: '他的名字在圈里是有分量的。',
            hint: '分量取决于他是谁,以及这几年他见过你几次',
          },
          {
            id: 'letters_pi',
            label: '请博后合作的 PI 写',
            text: '他知道你这两年具体做了什么。',
            hint: '写得实在,但名字没那么响',
          },
          {
            id: 'letters_network',
            label: '找欠着你人情的人写',
            text: '有人替你写过、审过、说过话。',
            hint: '账上还剩多少,决定这封信有多用力',
          },
        ],
      };
    case 'targeting': {
      const positions = eligiblePositions(state, pack, rng).map(position => {
        const inst = (pack.institutions ?? []).find(i => i.id === position.institutionId);
        const employment = inst?.gameified.employment ?? {};
        const terms = [
          employment.tenureYears !== undefined ? `预聘 ${employment.tenureYears} 年` : null,
          employment.tenureBar ?? null,
          employment.teachingLoad ? `教学 ${employment.teachingLoad}` : null,
          employment.tenured ? '直接给编制' : null,
        ].filter((line): line is string => Boolean(line));
        return {
          id: position.id,
          name: inst?.name ?? position.institutionId,
          unit: inst?.unit ?? '',
          city: inst?.city ?? '',
          kindLabel: POSITION_KIND_LABEL[position.kind] ?? position.kind,
          region: inst?.region ?? 'cn',
          matchedDomains: position.domainFit.filter(domain => Boolean(state.flags[domain])),
          terms,
          chanceLabel: chanceLabelOf(invitationChance(state, position, market)),
        };
      });
      return {
        ...base,
        positions,
        title: '投哪几个',
        text: `清单上有 ${positions.length} 个岗位,而你只能认真准备 ${MAX_APPLICATIONS} 份以内。\n\n**每一份的研究陈述都要重写一遍**——广投的代价是每一份都写得不够好。`,
      };
    }
    case 'talks': {
      const asked = willBeAskedAboutReplication(state);
      return {
        ...base,
        title: market.invited.length > 0 ? `${market.invited.length} 个 job talk` : '没有面试通知',
        text:
          market.invited.length === 0
            ? '投出去的材料陆续有了回音,都是同一种回音。\n\n**今年这个市场就是这样**——群里好几个人也一个面试都没有。'
            : `你要讲的是同一个东西,但要讲 ${market.invited.length} 遍,对着 ${market.invited.length} 群不同的人。\n\n提问环节永远有一个人问得比别人狠。` +
              (asked
                ? '\n\n**而你心里清楚有一个问题你答不好。**'
                : ''),
        options:
          market.invited.length === 0
            ? [{ id: 'move_on', label: '继续', text: '把这一年过完。' }]
            : [
                {
                  id: 'talk_solid',
                  label: '讲最扎实的那个',
                  text: '数据最干净、你自己最有底的那一个。',
                  hint: '不惊艳,但经得起问',
                },
                {
                  id: 'talk_flashy',
                  label: '讲最新最亮的那个',
                  text: '还没发出来,但一听就有意思。',
                  hint: '讲得好加分,被问住就很难看',
                },
                {
                  id: 'talk_fit',
                  label: '讲跟他们院最搭的那个',
                  text: '专门为这几个岗位重新组织了一遍。',
                  hint: '"你的工作和我们院怎么结合"这一问你答得上来',
                },
              ],
      };
    }
    case 'negotiation':
      return {
        ...base,
        title: market.offers.length > 0 ? '谈条件' : '结果',
        text:
          market.offers.length === 0
            ? '面试完了,回音陆续到了,没有一个是 offer。'
            : '条款发过来了。\n\n**同一所学校的两个 offer,可以在启动经费和考核指标上差一倍。**\n\n谈还是不谈——谈了可能拿到更好的条件,也可能让对方觉得你不识好歹。',
        options:
          market.offers.length === 0
            ? [{ id: 'move_on', label: '继续', text: '' }]
            : [
                {
                  id: 'negotiate',
                  label: '谈一次',
                  text: '启动经费、考核指标、招生名额,总有一条能松。',
                  hint: '多数人谈成了,少数人把关系谈僵了',
                },
                { id: 'accept_terms', label: '不谈,就这样', text: '别把人得罪了。' },
              ],
      };
    case 'two_body':
      return {
        ...base,
        title: '两个人,两座城',
        text: '你手上的 offer 在一个城市,ta 的工作在另一个。\n\n**这件事没有正确答案**,而且你们两个都知道。',
        options: [
          { id: 'apart', label: '异地', text: '先各干各的,周末飞。', hint: '六年很长' },
          { id: 'partner_follows', label: 'ta 跟你走', text: 'ta 辞掉现在的工作。', hint: '这笔账要还很多年' },
          { id: 'player_yields', label: '你去 ta 的城市', text: '换一个差一点的 offer。', hint: '你会一直知道自己让掉了什么' },
          ...(market.offers.some(offer => spouseHireAvailable(state, offer, pack))
            ? [{ id: 'spouse_hire', label: '争取同校配偶岗', text: '既真实又稀缺的那条路。', hint: '不一定谈得成' }]
            : []),
          { id: 'breakup', label: '分开', text: '谁都没有做错什么。' },
        ],
      };
    case 'result':
      return {
        ...base,
        title: market.offers.length > 0 ? '选一个' : '一个都没有',
        text:
          market.offers.length > 0
            ? '摆在你面前的就是这几份。\n\n**最好的那份不一定是最好的选择。**'
            : '这一年结束了,你手上什么都没有。\n\n**今年这个市场就是这样。** 群里有人转行了,有人去了企业,有人说明年再来一次。\n\n这不是一句关于你的判断。',
        options:
          market.offers.length > 0
            ? market.offers.map(offer => ({
                id: offer.positionId,
                label: `${offer.institutionName} · ${offer.city}`,
                text: offer.termLines.join(' · '),
              }))
            : [{ id: 'leave_academia', label: '先离开这条路', text: '不是永远,只是现在。' }],
      };
  }
}

export interface JobMarketOutcome {
  /** 走完了。`accepted` 有值 = 接了一个 offer;null = 一个都没有 */
  done: boolean;
  accepted: string | null;
}

/**
 * 走一步。返回是否已经走完整个求职季。
 *
 * **每一步都可能提前结束**:没有面试就没有 talk,没有 offer 就没有谈判和两体问题。
 * 所以这里不是简单地 `step + 1`,而是每次都往前找到下一个"有内容的"步骤。
 */
export function advanceJobMarketStep(
  state: GameState,
  pack: ContentPack,
  rng: Rng,
  action: { optionId?: string; positionIds?: string[] },
): JobMarketOutcome {
  const market = state.jobMarket;
  if (!market) throw new Error('JOB_MARKET_STEP without jobMarket state');

  switch (market.step) {
    case 'timing': {
      if (action.optionId === 'wait_a_year') {
        // **等一年不一定更好。** 你多一篇,但面对的是另一年的市场
        state.flags.jm_waited = true;
        market.year += 1;
        state.date = { year: market.year, month: state.date.month };
        market.marketTightness = marketTightnessFor(state.seed, market.year);
        state.stats.method = Math.min(100, state.stats.method + 3);
        state.stats.capital = Math.min(100, state.stats.capital + 4);
        state.stats.state = Math.max(0, state.stats.state - 4);
      }
      break;
    }
    case 'materials': {
      if (action.optionId === 'letters_pi') {
        market.letters = ['postdoc_pi'];
        market.letterWeight = 0.9;
      } else if (action.optionId === 'letters_network') {
        market.letters = ['network'];
        const owed = favorTotal(state, state.date.year, { direction: 'owed' });
        market.letterWeight = 0.6 + Math.min(0.6, owed * 0.1);
        // 用掉了。**人情兑现在推荐信上,是设计里点名的第一个兑现点**
        applyFavorOp(state, state.date.year, { op: 'settle', direction: 'owed', weight: 3 });
      } else {
        market.letters = ['advisor'];
        market.letterWeight = letterWeightFor(state, pack);
      }
      break;
    }
    case 'targeting': {
      const picks = (action.positionIds ?? []).slice(0, MAX_APPLICATIONS);
      market.applied = picks;
      market.materialQuality = materialQualityFor(picks.length);
      const byId = new Map(eligiblePositions(state, pack, rng).map(p => [p.id, p]));
      market.invited = picks.filter(id => {
        const position = byId.get(id);
        if (!position) return false;
        return rng.chance(invitationChance(state, position, market));
      });
      break;
    }
    case 'talks': {
      if (market.invited.length > 0) {
        const risky = willBeAskedAboutReplication(state);
        // **诚信风险在这里第一次真的咬人。** 讲最炫的那个会把它放大
        const stumbleChance = risky ? (action.optionId === 'talk_flashy' ? 0.75 : 0.45) : 0.08;
        market.talkStumbled = rng.chance(stumbleChance);
        if (action.optionId === 'talk_fit') state.stats.capital = Math.min(100, state.stats.capital + 2);
        const byId = new Map(eligiblePositions(state, pack, rng).map(p => [p.id, p]));
        for (const id of market.invited) {
          const position = byId.get(id);
          if (!position) continue;
          if (!rng.chance(offerChance(state, market))) continue;
          const offer = makeOffer(pack, position, rng, false);
          if (offer) market.offers.push(offer);
        }
      }
      break;
    }
    case 'negotiation': {
      if (action.optionId === 'negotiate' && market.offers.length > 0) {
        for (const offer of market.offers) {
          if (rng.chance(NEGOTIATION_FAIL_CHANCE)) {
            offer.negotiationFailed = true;
            continue;
          }
          const position = (pack.positions ?? []).find(p => p.id === offer.positionId);
          const better = position ? makeOffer(pack, position, rng, true) : null;
          if (better) {
            offer.termLines = better.termLines;
            offer.negotiated = true;
          }
        }
        // 谈崩的那几份直接没了。**这就是"不识好歹"的代价**
        market.offers = market.offers.filter(offer => !offer.negotiationFailed);
      }
      break;
    }
    case 'two_body': {
      const resolution = action.optionId as TwoBodyResolution | undefined;
      if (resolution) {
        market.twoBody = resolution;
        state.flags[`two_body_${resolution}`] = true;
      }
      break;
    }
    case 'result': {
      if (action.optionId && action.optionId !== 'leave_academia') {
        market.accepted = action.optionId;
      }
      return { done: true, accepted: market.accepted };
    }
  }

  market.step = nextMeaningfulStep(state, market);
  return { done: false, accepted: null };
}

/** 往前找到下一个"有内容的"步骤。没有面试就没有 talk,没有 offer 就没有谈判 */
function nextMeaningfulStep(state: GameState, market: JobMarketState): JobMarketState['step'] {
  let index = STEP_ORDER.indexOf(market.step) + 1;
  while (index < STEP_ORDER.length) {
    const step = STEP_ORDER[index]!;
    if (step === 'negotiation' && market.offers.length === 0) index += 1;
    else if (step === 'two_body' && (market.offers.length === 0 || !state.flags.has_partner)) index += 1;
    else return step;
  }
  return 'result';
}
