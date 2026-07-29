import type { GameifiedTerms } from './institution';

/**
 * 教职求职季与长聘首考(GAME_DESIGN 九节、十节 / TECH 4.7.2)。
 *
 * **这是全游戏的高光。** 它对应前作"2016 买不买房"的地位——单一影响最大的决策群,
 * 而且它是一个**七步流程**,不是一个事件。
 *
 * ## 三条硬设计约束,全部落在这个文件的类型里
 *
 * 1. **"一个都没有"必须是高概率的、有尊严的结果**(门禁 20%–40%)。
 *    实现方式是 `marketTightness` **玩家不可见**:同样的资本值,在紧年份和松年份
 *    的结果不同,而你只能事后从"今年大家都不好找"里推断。
 *    **不写失败提示,写市场。**
 * 2. **最好的 offer 不一定是最好的选择。** 所以 `Offer.terms` 是在区间里摇过一次的
 *    **具体条款**,而不是一个总分:A+ 高校的苛刻预聘和双非的直接编制之间
 *    不该有一个透明最优解。
 * 3. **地理位置是真实变量。** 城市进 `Offer`,而且两体问题读它。
 */

/** 七步。**每一步是一屏**,靠 `JobMarketState.step` 走 */
export type JobMarketStep =
  /** ① 时机:再等一年攒一篇,还是今年就出去。市场松紧每年不同且不由你决定 */
  | 'timing'
  /** ② 材料:代表作选哪三篇、**推荐信找谁写**(导师关系四到七年的一次性变现) */
  | 'materials'
  /** ③ 投递策略:只能认真准备 6–8 份,广投的代价是每一份都写得不够好 */
  | 'targeting'
  /** ④ Job talk:有人会问"你那篇 2019 年的,后来有人重复出来吗" */
  | 'talks'
  /** ⑤ 谈条件:做成真的合同条款排版。谈了可能更好,也可能让对方觉得你不识好歹 */
  | 'negotiation'
  /** ⑥ 两体问题:四个方向都有专属后续,**没有正确答案** */
  | 'two_body'
  /** ⑦ 结果 */
  | 'result';

/**
 * 两体问题的五个归宿(GAME_DESIGN 9.2 第 6 步)。
 *
 * **没有正确答案**,而且门禁要求每一种都 ≥5%——
 * 一个只有一条路走得通的"选择"不是选择。
 */
export type TwoBodyResolution =
  /** 异地六年 */
  | 'apart'
  /** ta 放弃工作跟你走 */
  | 'partner_follows'
  /** 你放弃更好的 offer 去 ta 的城市 */
  | 'player_yields'
  /** 同校配偶岗——既真实又稀缺 */
  | 'spouse_hire'
  | 'breakup';

export interface Offer {
  positionId: string;
  institutionName: string;
  /** 城市。**地理位置是真实变量**,两体问题和结局文案都读它 */
  city: string;
  region: 'cn' | 'overseas';
  /** 实例化后的具体条款(在区间内摇过一次)。**不是一个总分** */
  terms: GameifiedTerms;
  /** 这一份的条款清单,直接给合同排版那一屏 */
  termLines: string[];
  negotiated: boolean;
  /** 谈崩了。谈条件是有风险的,这一条就是那个风险 */
  negotiationFailed?: boolean;
}

export interface JobMarketState {
  step: JobMarketStep;
  year: number;
  /**
   * 该年市场松紧。开局种子 + 年份决定,**玩家不可见**。
   *
   * 这是 9.3 第一条的实现方式。它绝不进 ViewModel(validate 规则 38)——
   * 一旦玩家能看见它,"要不要再等一年"就从一次赌博变成一道算术题,
   * 而那道题的答案很无聊。
   */
  marketTightness: number;
  /** 推荐信来源:导师 / 博后 PI / 合作者 */
  letters: string[];
  /**
   * 推荐信的分量。由**导师原型 × 关系档位 × 人情账**算出。
   *
   * 找了大牛但他四年没见过你,信会写得很空——而这件事在面试时会露出来。
   * 这是导师关系四到七年的**一次性变现**。
   */
  letterWeight: number;
  /** 材料准备的充分程度,决定投递上限 */
  materialQuality: number;
  applied: string[];
  invited: string[];
  offers: Offer[];
  accepted: string | null;
  twoBody?: TwoBodyResolution;
  /** job talk 上被问到重复性问题、而你答不上来 */
  talkStumbled?: boolean;
}

/**
 * 长聘首考的一行(GAME_DESIGN 十节)。
 *
 * **它不是一个数值阈值,是一张清单。** 逐行渲染,最后给结果——
 * 而"通过率 30%–50%"这个数字应该是真实的。
 */
export interface TenureReviewLine {
  label: string;
  /** 你的实际情况 */
  actual: string;
  /** 院里要的。`null` = 这一行没有硬指标,只是陈述 */
  required: string | null;
  met: boolean;
}
