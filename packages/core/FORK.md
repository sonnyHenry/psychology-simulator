# FORK.md — `@psy-sim/core` 的来历与改动清单

## Fork 点

```
来源仓库   /Users/sonny/ClaudeCode/life-simulator-2014
来源包     packages/core (@life-sim/core) · packages/tools (@life-sim/tools)
fork commit  47cb3f4  ("M5 第七十一轮:回响兜底")
fork 时间    2026-07-26(M0)
```

前作在 fork 点的状态:147 事件 / 34 结局 / 5 条职业线 / 38 个单测全绿,已上线并做完 71 轮打磨。

## 纪律(TECH_ARCHITECTURE 第二节)

1. **单向同步**:前作的引擎 bugfix 可以往本作搬;本作的新机制**不往前作回流**。
2. **搬补丁前先读本文件的改动清单**——凡是被改过的文件,前作的 diff 不能直接 apply。
3. **尽量保持逐行一致的文件**(方便对照移植):`rng/rng.ts` · `save/save.ts` · `dsl/evaluate.ts` · `dsl/apply.ts` · `systems/ending.ts` · `systems/context-lines.ts`。
   → M0 结束时六个文件与前作**逐字节相同**。
   → M1 之后 `dsl/evaluate.ts` 和 `dsl/apply.ts` 各多了纯增量的分支(见下),仍逐行对应;
     `rng/rng.ts` · `save/save.ts` · `systems/ending.ts` · `systems/context-lines.ts` 保持逐字节相同。
4. `@life-sim/*` 全部改名 `@psy-sim/*`,避免两个 monorepo 之间误引用。

---

## 已做的改动(M0)

### 1. 包名

`@life-sim/{core,tools,content}` → `@psy-sim/{core,tools,content}`。根 `package.json` 的 scripts 同步改 filter。

### 2. 五维换血(不是加维度,是整套替换)

| 前作 | 本作 | 语义变化 |
|---|---|---|
| `knowledge` 学识 | `method` 方法 | 统计/实验设计/编程/文献辨识力 |
| `mindset` 心态 | `state` 状态 | 语义位置不变,**保留 ≤0 触发提前结局的含义** |
| `network` 人脉 | `capital` 资本 | 论文 + 会议 + 人脉 + 推荐信分量,**所有门槛判定读这一维** |
| `health` 健康 | `clinical` 临床 | 语义完全不同:个案概念化/共情与技术/危机处理/评估 |
| `money` 金钱 | `money` 金钱 | 不变 |

改到的文件:

- `types/stats.ts` — `StatKey` / `Stats` 重写,字段顺序改成设计文档表格的顺序,每一维补了 jsdoc。
- `types/content.ts` — `IncomeRule.mindsetDelta` → `stateDelta`;`healthDelta` → `clinicalDelta`(语义改成"年度临床能力累积/流失":在医院或咨询室工作会自然长临床,离开会退)。`ScoringConfig.weights` 换键。
- `systems/scheduler.ts` — `eventMindsetValence` → **`eventStateValence`**(导出名变了,index.ts 同步);`LOW_MINDSET`/`HIGH_MINDSET` → `LOW_STATE`/`HIGH_STATE`(阈值 35/75 未动)。
- `engine/engine.ts` — `start()` 初始值改成 `{ method: 40, clinical: 10, capital: 5, state: 65, money: 0 }`(设计文档:资本 5、状态 65;方法与临床会在开局流程里被高考分数和背景卡覆写,40/10 只是占位)。`computeScore` 的默认权重换键并重配。
- `tools/simulate.ts` — bot 策略 `mindset` → **`state`**(CLI 参数变了:`--bot state`);所有中文输出标签换成 方法/临床/资本/状态/金钱。
- `tools/validate.ts` — `BOUNDED_STATS` 与 `setStat` 白名单换键。

**换血抓到的一个真实回归**:`test/engine.test.ts` 里 `evalCondition` 那条断言写死了 `mindset >= 70`(前作初始心态 70)。状态改成 65 之后它红了。已把断言阈值对齐到 65 并加注释说明它必须跟 `engine.start` 对齐。

### 3. 专业分流 → 学院归属

前作的 `ApplicationMajor.trackFlag`(写 `flags.major_track`,取值 cs/education/finance/…)在本作里没有意义:**所有路径都是心理学**。改成:

```ts
ApplicationMajor.college   // 写 flags.college
// science(理学院) / education(教育学院) / medical(医学院) / normal(师范)
```

改到 `types/content.ts` · `engine/engine.ts`(`handleApplication` 三处,含滑档时按同一学院归属找兜底专业)· `tools/validate.ts`(`KNOWN_TRACK_FLAGS` → `KNOWN_COLLEGES`)。

理由:这是本作最早的一次路线塑形(GAME_DESIGN 2.5),现在不改名,M2 就会把 `science` 写进一个叫 `major_track` 的字段里,然后一直错到最后。

### 4. `tools/verify-npcs.ts` 换掉夹具、保留性质

前作那五段断言查的是 `grinder_true_mirror` / `love_true_companion` 这类前作专属 flag,fork 后必然全红。已改写成**声明式夹具表 + 通用断言**,验证的性质一字不改:

① 达阈值时专属收束可达、flag 与终态 stage 正确;② 差一次没达阈值时专属收束**必须拿不到**、兜底路径必须存在。同时兼容"门槛做在 choice 层(`visibleIf`)"和"门槛做在 outcome 层(同一选项内按 `historyCount` 分流)"两种写法。

`fixtures` 现在是空表,工具会打印一行提示。**本作每写完一条人物线,就往表里加一行**(M4.5/M6)。

---

## 已做的改动(M1)

### 5. 阶段路由改成显式(**这是 fork 之后最重要的一处引擎改动**)

前作 `settleRound` 与 `enterFlowStep` 的收尾都是 `enterPhase(state.phaseIndex + 1)`,按 timeline **数组下标**顺延。新增:

```ts
function enterNextPhase(state, rng, phase) {
  if (phase.nextPhaseId === undefined) { enterPhase(state, rng, state.phaseIndex + 1); return; }
  const nextIdx = pack.timeline.findIndex(p => p.id === phase.nextPhaseId);
  if (nextIdx < 0) throw new Error(`phase ${phase.id} has unknown nextPhaseId: ${phase.nextPhaseId}`);
  enterPhase(state, rng, nextIdx);
}
```

配套约束**比 TECH 4.3 写的更严**:TECH 说"除 `gaokao → undergrad → crossroad` 主干外一律显式写",本作收紧成**一个不许漏**(validate 强制)。理由:主干多写两行,换掉"靠人工确认数组顺序是不是设计意图"这件必然出错的事。

多个 `isFinal` 阶段不需要引擎改动(`isFinal` 本来就是按当前阶段读的),只需把 validate 从"有且仅有一个 final"放开成"至少一个"。

### 6. `FlowStep` → `StepScreen`,flow 阶段与 rounds 阶段共用进屏逻辑

`roundOpeners` 要复用 flow 阶段那套"进屏"代码,所以:

- 类型 `FlowStep` 更名 `StepScreen`(它不再只属于 flow 阶段)。
- `enterFlowStep` → `enterStep`:flow 阶段读 `steps`,rounds 阶段读 `roundOpeners`,共用 `state.flowStepIndex` 游标;走完之后 flow 去下一阶段、rounds 去本回合的 BRIEF。
- `nextFlowStep` → `nextStep`(6 处调用点)。
- `startRound` 不再直接 `screen = 'BRIEF'`,改为走 `enterStep`;BRIEF 的设置抽成 `enterBrief`。

### 7. `PhaseConfig` 新增四个字段

`roundOpeners` · `yearsPerRound`(`settleRound` 的年份推进一行)· `allocationSlots` · `nextPhaseId`。

### 8. DSL 新增 1 条 Condition + 3 条 Effect(纯增量分支)

| 新增 | 位置 | 说明 |
|---|---|---|
| `{ flagNum: { key, op, value } }` | `dsl/evaluate.ts` | 数值型 flag 的大小比较。**最高杠杆的一条**:所有累积量继续用 `flags` 承载,不必各开 state 字段 |
| `{ addFlag: { key, delta, min?, max? } }` | `dsl/apply.ts` | 累积量增减 |
| `{ extendPhase: { rounds } }` | `dsl/apply.ts` | 延毕。写 `state.phaseExtraRounds`(累加),`enterPhase` 清零 |
| `{ grantSlots: n } ` | `dsl/apply.ts` | 本回合精力格临时增减。写 `state.grantedSlots`,`startRound` 清零 |

读取口径统一在 `readNumericFlag`(导出):缺失 → 0 · 布尔 → 1/0 · 数字 → 原值 · 字符串 → 0。`flagNum` 和 `addFlag` 共用它,保证读写对称。

`state` 新增两个可选字段:`phaseExtraRounds` · `grantedSlots`。新增 `systems/allocation.ts`,目前只导出 `effectiveSlots(state, phase)`——`grantSlots` 的唯一读取口径,`ALLOCATION` 屏(M2)直接用它。

### 9. `validate.ts` 可喂夹具 + 反例自测

`validate.ts` 顶部加了 `PSY_VALIDATE_FIXTURE` 环境变量:指向一个 JSON 化的内容包时校验那个夹具,否则校验真内容包。**只改了 import 绑定,700 行规则一行没缩进**——保持逐行结构,前作的规则补丁才还能对照移植。

新增 `tools/verify-validate.ts`:给每条新规则喂一个反例,断言它真的红了(含 1 条阳性对照,确认合法内容包不被误伤)。已并入 `pnpm test`。

写它的理由就在这份文件里:前作的 `NPC_TAG_PREFIXES` 完备性检查 fork 之后一直在空转,而它看起来跟别的规则一样是绿的。**从来不报错的检查和没有检查是一回事。**

---

## 已做的改动(M2)

### 10. 事件抽取移到开场屏之后(**M2 抓到的最重要一个 bug**)

前作 `startRound` 里直接抽事件:

```ts
function startRound(state, rng, phase) {
  state.eventQueue = pickRoundEvents(state, pack, rng, phase);  // ← 抽事件
  ...
  state.screen = 'BRIEF';
}
```

本作在 `startRound` 之后插了一个 `ALLOCATION` 开场屏。照抄前作的顺序意味着:
**玩家今年投了两格实验室,而今年的实验室事件一个都不会出现**——投入分配要等到明年才生效。

这个 bug 不报错、不崩、不影响门禁,只会让整个投入分配机制"看起来没什么用"。
是 `simulate` 的事件覆盖统计把它抓出来的:所有 `entered_lab` 门控的事件在 3000 局里一次都没触发过。

修法:`startRound` 只走开场屏,事件抽取搬进 `enterBrief`(开场屏走完才调用)。

### 11. 内容驱动的岔口、NPC 选择、学院归属

- `pack.crossroadOptions`(`CrossroadOption`):选项、门控 `availableWhen`、分流 `effects`。加一条路径 = 数据里加一行 + timeline 加一个阶段。
- `pack.meta.npcPickCount`:六位人物选两位,**没有必选人物**。
- `BackgroundCard.statMods`:临床与状态的起点由背景卡决定("家里有人生病":临床 +12、状态 −12)。
- `ApplicationMajor.effects`:学院归属的开局塑形(理学院方法 +8、教育学院 `shallow_stats_training`、医学院 `knows_no_prescription_right`)。

### 12. 课程系统与投入分配(两个新 system)

| 文件 | 职责 |
|---|---|
| `systems/course.ts` | 三档判定 `P(学通) = 0.06 + 0.18×格数 + (属性−50)×0.006 + 小测 0.15`、能力标签写入、重修记账 |
| `systems/allocation.ts` | `effectiveSlots`(阶段基准 + `grantSlots` − 重修占用)、可投入项过滤、提交校验、逐格结算 |

`Course.masteryFlag` 是**可选**的:只有真正门控后续选项的课才该有标签(15 门课里 8 门有)。
声明了就必须有人读(validate 规则 28)——这个字段的数量等于课程系统真正的因果链条数。

课程小测复用 `EXAM` 屏,靠新增的 `state.examKind` 区分高考与小测。**零新屏**。

### 13. `ScreenId` / `StepScreen` 新增 `ALLOCATION`,`PlayerAction` 新增 `ALLOCATE`

它是 `roundOpeners: ['ALLOCATION']` 的第一个真实使用者。格数为 0 时自动跳过这一屏——
不给玩家一个没有东西可点的界面。

### 14. `packages/web` 建起来了

不是整体搬前作:前作 658 行 CSS 里一多半是它专属的类(分享卡、NPC 关系台账),
**留着不用的 CSS 比重写一份更贵**——它会让人以为某个类还在被用。

新写:`store.ts`(照抄前作的双保险读档)· `StatsBar`(五维 + 状态低位红色警示)·
`Screens.tsx`(14 种 ViewModel)· `Allocation.tsx`(格数计量条 + 点选加减)· `styles.css`。
`RichText` 是一个只认 `**粗体**` 和 `> 引用行` 的极简渲染器——内容里的强调是有意的,
不能让玩家看到一堆星号,但也没必要为两种语法引一个 markdown 库。

---

## 已做的改动(M2.5)

### 15. `Project` 进 `GameState`——**P5 长机制状态化的第一个真实使用者**

```ts
projects?: Project[]          // types/project.ts
```

课题跨年,而且玩家需要随时知道"我手上有哪几个、各在什么阶段",所以它是一个真的列表,
不是一堆扁平 flag。(反例是课程:见 `types/content.ts` 的 `Course` 和 TECH 4.7.5。)

配套:`{ projectCount }` 条件 · `{ project: ProjectOp }` 效果 · `systems/project.ts` ·
`ProjectTemplate` 内容类型(**阶段序列写在模板里,引擎不知道有哪些序列**——
毕业论文的裁短版和 M3 真课题的完整版用同一套推进代码)。

`publish` 操作和 `Paper` 类型**留到 M3**:毕业论文不发表,现在写等于凭空猜 schema。

两处刻意的设计:

- **`create` 的标题按创建序号轮取,不随机。** `applyEffects` 拿不到 RNG,
  而引擎偷偷消耗随机流会让同种子的回放漂移。跨局差异靠候选表本身够长。
- **阶段推进不做随机判定。** 成不成功由内容侧的 outcome 权重决定,引擎只改状态——
  这样 `simulate` 的统计和玩家看到的文案永远对得上。

### 16. 修掉一处前作 bug:跳阶段时残留 `pendingFlowAdvance`

一个 flow 屏(岔口)的处理函数会同时设置 `pendingFlowAdvance = true` 和(通过 effects)
`pendingJumpPhaseId`。`continueAfterOutcome` 里跳转分支提前 `return`,**但没有清掉那个待办**:

```ts
if (state.pendingJumpPhaseId) {
  ...
  enterPhase(state, rng, idx);
  return;                        // ← pendingFlowAdvance 还是 true
}
```

后果:新阶段的下一次 OUTCOME 会误以为自己在走开场屏流程,于是
`nextStep` → `enterBrief` → **在回合中间重新抽一次事件队列**,把玩家还没看到的事件静默丢掉。

前作的三岔口不用 `jumpToPhase`(它按数组顺延),所以踩不到这一处。本作把岔口改成内容驱动、
七条路径全靠 `jumpToPhase` 分流之后,每一局都会踩。

**这个 bug 不报错、不崩、不影响任何门禁**——它的唯一表现是"这一年好像少了一个事件"。
是手写一段 trace 打印屏幕序列时发现的:同一个回合出现了两次 `BRIEF`。已加单测钉住
(断言一个回合只有一个 BRIEF、两个 mandatory 事件都被看到)。

### 17. validate 规则 1(课题阶段图无死锁)

现在可以做了(它依赖 `ProjectStage`)。四条:

1. 序列里每个阶段都必须有事件能推进出去(第一个阶段允许由"创建时顺手推进"退出);
2. `published`/`abandoned` 不许写进 `stageSequence`——它们是推进出序列之后自动落到的终态;
3. 反方向:`trigger` 读了一个没有任何模板会经过的阶段 = 拼错了;
4. 模板 id 唯一、标题非空、序列非空。

**规则 1 当场抓到了我自己刚写的 bug**——不,准确说是**没有抓到**:
毕业论文链的阶段语义差了一格(事件的 trigger 读前一个阶段),导致答辩之后课题停在 `review`
而不是终态。那是手工 trace 发现的,然后我才把它写成规则 1 的第一条反例。

**规则 2(个案状态图无死锁)** 仍然留给 M4——它依赖 `CaseStatus`。

### 18. 年度回顾页开始显示课题

`SETTLEMENT` 的 ViewModel 加了 `projects`(标题 / 阶段 / 第几年 / 是否毕业论文)。
理由很简单:**一个玩家看不见的状态字段,和一个 flag 没有区别。**
完整的年度回顾页(含论文、个案、竞争者进度)是 M4.5。

---

## 已做的改动(M3)

### 19. 骰子由引擎掷,故事由内容讲

课题推进**不再由内容决定**。调度器在挑阶段事件之前先掷骰:

```
成功率 = 阶段基准 × 导师原型修正 + (方法−50)×0.004 + 投入格数×0.08 + 质量项(仅投稿/审稿)
掷骰次数 = 1 + 2 × 投入格数        每年推进站数 = 成功次数(封顶 4)
```

结果写进 `project.lastRoll` / `lastAdvances`,内容用 `{ projectRoll: 'ok' | 'setback' }`
分流到"推进了"和"卡住了"两种文案。**阶段事件只讲故事,不推进课题。**

这样拆是因为两件事都必须成立:失败率要是**系统性**的(GAME_DESIGN 五节三条硬约束,
光靠 outcome 权重调不出"高方法更快但同样会做废"),而文案又必须跟骰子结果一致
(否则 simulate 的统计和玩家看到的东西对不上)。

`MIN_SETBACK_CHANCE = 0.22` 是那条硬约束的机制保证:**无论方法多高、导师多好、投入多满,
每一站都至少两成失败率。** 它是一行代码,改动它必须是一个显式的决定。

### 20. `Paper` / 发表 / 结局页三份清单的第一份

推过序列最后一站自动发表,档位由 `quality` 决定(`tierForQuality`)。
`integrityRisk` **结转到论文**——结局页"哪几篇后来重复不出来"读的就是这个值。
`replicated: null` 是默认值,意思是"从来没有人试过重复",而**这是绝大多数论文的真实结局**。

结局页现在有 `papers` 和 `abandonedProjects` 两份清单。做废的课题和论文清单一样重要:
做废是这个职业最普遍的经验,不该只体现为"结局页少了一行"。

### 21. 导师系统:`archetype` 绝不进 ViewModel

六个原型,姓名全部虚构、建制真实。抽卡屏**只投影 `publicImpression`**。

这不是防剧透的小心思,是"换导师窗口逐年关闭"那个张力的全部前提:
**你什么都不知道的时候可以换,等你什么都知道了就走不了了。** 有一条单测专门断言
序列化后的 ViewModel 里不含任何 archetype 字符串。

`projectModifiers` 是六个原型在机制上真正不同的地方,而且它是**乘数**——
放养型导师让每一站都按比例变难,这件事不是多投两格精力能补上的。

### 22. 调度器新增两级(TECH 4.5 的 ②' 和 ③')

课题管线阶段事件(每轮上限 3,**本轮投入过精力的课题优先**)+ 导师关系阶段事件(每轮上限 1)。
都不占 `eventSlots`。新增 `state.eventProjects` 记录"这个事件是替哪个课题弹的"——
没有它的话,一个手上三个课题的博士生会看到"我在推 A,结果 C 推进了"。

### 23. 文案参数化(M7.5 的纪律,提前兑现)

`renderText` 支持 `{{project}}` / `{{years}}` / `{{advisor}}`。所有阶段事件的文案从第一版起就是参数化的。
**事后补参数化的成本是当初就那么写的三到五倍**——前作补了九轮变体池,那就是学费。

### 24. 年度状态回复,由耗竭决定

```ts
耗竭 ≥55 → +0    耗竭 ≥30 → +1    否则 → +3
```

没有这一层的时候状态是单调下降的(研究生阶段几乎每个事件都扣状态,唯一回血是"休息"那一格),
结果 **22% 的学术线对局在读博途中触发提前结局**——那不是"耗竭螺旋",那是"所有人最后都会死"。

现在的耗竭螺旋是:它不直接扣你的状态,**它掐掉你的恢复能力**。

---

## 已做的改动(M4)

### 25. 个案状态机(`systems/case.ts` + `types/case.ts`)

P5 的第三个使用者。与课题的关键差别:**课题的序列在模板里,个案的状态机在引擎里**——
初始访谈 → 工作期 ↔ 停滞 → 结束期,任何个案走同一张图,差别只在走多快、在哪一站脱落
(`dropped` / `completed` / `referred` 三个终态)。没有"裁短版个案"这种东西。

沿用"骰子由引擎掷,故事由内容讲":调度器每年先算联盟漂移(临床 × 状态 × 取向匹配 ×
督导 × 投入),写 `lastTrend`,内容用 `{ caseTrend }` 分流文案;年度结算兑现漂移、
掷脱落、推状态机、累积 `clinical_hours` / `supervision_hours`(这两个是**引擎写内容读**,
在 validate 的 `ENGINE_HANDLED_NUMERIC_FLAGS` 里豁免)。

**脱落螺旋两个半环都在数值里**:状态 <40 → 脱落率 +0.10;脱落 → 状态 −5。
出口也全在数值里:督导(−0.06)、个人体验(状态与耗竭)、少接(容量随格数)、转介(不算脱落)。
**脱落率下限 0.05**:联盟满分、督导齐全,他仍然可能不再来——这是这一行的第一课。

### 26. 调度器第三级(TECH 4.5 的 ②'')

每个活跃个案按当前状态挑 1 幕,每轮上限 **2**(比课题低:个案事件都是一场会谈的特写,
连看三场分量就掉了)。初始访谈期优先,高风险个案其次。`state.eventCases` + 按个案 `seenEventIds`
去重,与课题同构。`{{case}}` / `{{issue}}` / `{{caseYears}}` 进 `renderText`。

### 27. 督导按年生效、按年清零

`supervised` 每年由"本年有没有督导格"重置。去年做过督导不等于今年还在做;
内容侧年中把个案带进督导(`setField supervised`)仍然有效,因为脱落判定在年末。

这些都在 `engine/engine.ts` 里——**它们是前作的设计债:内容被写进了引擎**。M0 刻意没有动它们,因为前作那 38 个单测正是靠它们才能验证 fork 是干净的(拆掉就等于同时删掉 6 个测试,也就同时失去了"fork 没搞坏东西"的证据)。

| 位置 | 内容 | 状态 |
|---|---|---|
| ~~`CROSSROAD_OPTIONS`(考研/求职/考公)~~ | 岔口改成内容驱动(`pack.crossroadOptions`),选项、门控、分流全在数据里 | ✅ **M2 已清** |
| ~~`handleCrossroad` 里按专业名分流的五段 `if`~~ | 分流写在 `CrossroadOption.effects` 的 `{ jumpToPhase }` 里,引擎不再知道有哪些专业 | ✅ **M2 已清** |
| ~~`REQUIRED_NPC_ID = 'first_love'` + `OPTIONAL_NPC_COUNT`~~ | 改成 `pack.meta.npcPickCount`,**没有必选人物**(恋人线不强制) | ✅ **M2 已清** |
| ~~`tools/validate.ts` 的 `EXHAUSTIVE_CONTEXT_EVENTS` 白名单~~ | 清空重开(前作那两个 id 在本作不存在) | ✅ **M1 已清** |
| `RELATIONSHIP_WARM_MILESTONES`(love/roommate/mentor/grinder/hometown) | 换成本作的人物线 | **M4.5** |
| `view()` ENDING 分支里的 `relationshipDefinitions`(6 段前作 NPC 收束文案) | 本作结局页是**三份清单**(论文/学生/来访者),且不该硬编码在引擎里 | **M7** |
| `MONEY_MILESTONES`(十万/五十万/一百万) | 本作钱的戏剧性在**机会成本**不在资产(GAME_DESIGN 3.5) | **M4.5**(SETTLEMENT 改造成年度回顾页时) |
| `tools/simulate.ts` 的 `CAREER_LABELS`(cs/finance/medicine…) | 换成本作七条路径 | **M6** |
| `tools/validate.ts` 的 `NPC_TAG_PREFIXES`(grinder/hometown/roommate/love/mentor) | 换成本作人物线前缀。**现在它是空转的**:本作没有这些前缀的标签,这条检查等于没跑 | **M4.5** |

> 清理这张表的时候,**顺手把内容搬出引擎**,不要原地改字符串。前作在这里踩的坑就是"先硬编码一版,以后再抽出来",结果七十一轮之后还在引擎里。

---

## 还没做、但已知需要注意的地方

**`validate.ts` 不是一个可被单测调用的函数。** 它是一串顶层语句 + `process.exit`,所以 `verify-validate.ts` 只能把它当子进程 spawn(靠 `PSY_VALIDATE_FIXTURE` 喂夹具)。这样做的好处是 700 行规则保持逐行结构、前作补丁还能对照移植;代价是自测慢(每个反例一次进程启动)。

反例数量涨到几十条之后再考虑重构成 `runValidate(pack): Issue[]`。**在那之前不要因为"顺手"就重构**——它一缩进,前作的规则 diff 就再也贴不上来了。

**`{ addFlag }` 不算"可见数值变化"。** validate 要求每个 outcome 至少有一处 `stats`/`moneyCost`/`setStat`,纯 `addFlag` 的 outcome 会报错。这是**故意的**:OUTCOME 屏目前只展示 `stats` 变化,一个只涨 `clinical_hours` 的选项在玩家眼里是"点了没反应"。等 UI 能展示累积量变化(M2)再决定是否放开。

---

## 验收记录

### M0

```
pnpm typecheck                → 3 个包全绿
pnpm test                     → core 38/38 绿 · verify-npcs 空表跳过
pnpm validate                 → 0 errors, 0 warnings
pnpm simulate -- -n 500       → 500/500 局跑完,事件覆盖 3/3,6 张背景卡都被抽到
pnpm simulate -- --exam-skill 1  → 会做题的 bot 方法 42 → 83,高考分数确实驱动方法起点
pnpm repetition -- -n 60      → 工具可运行(3 个事件,重合率必然 100%,符合预期)
```

### M1

```
pnpm typecheck   → 3 个包全绿
pnpm test        → core 58/58 绿(M0 的 38 条 + M1 新增 20 条)
                   verify-validate 14/14(每条新规则都在反例上变红,含 1 条阳性对照)
pnpm validate    → 0 errors, 0 warnings
pnpm simulate    → 1000/1000 局跑完
```

### M2

```
pnpm typecheck                4 个包全绿(含 web)
pnpm test                     core 69/69 绿 · verify-validate 20/20 反例全变红
pnpm validate                 0 errors, 0 warnings(51 事件 / 9 结局 / 15 课程)
pnpm simulate -- -n 3000 --check   ✅ 全覆盖 51/51 · 七条路径全可达 · 结局分布达标
pnpm repetition -- -n 400     学院归属不同学院成对重合率 46.8%(标准 <60%)
pnpm build                    web 构建通过
```

M2 起 `simulate --check` **正式生效**(M0/M1 时只有一个结局,门禁必然红)。

### M3

```
pnpm typecheck   4 个包全绿
pnpm test        core 91/91 · verify-validate 25/25 反例全变红
pnpm validate    0 errors, 0 warnings(83 事件 / 13 结局 / 6 导师 / 4 课题模板)
pnpm simulate -- -n 3000 --check   ✅ 覆盖 83/83
```

#### 标定结果(四种 bot,各 3000 局)

| bot | 平均论文 | 清单为空 | 至少一个课题做废 |
|---|---|---|---|
| `score`(集中投入) | **2.46**(p50=3) | **1.3%** | **76.4%** |
| `random`(平均分散) | 1.49 | 12.6% | 89.4% |
| `money` / `state` | ~1.1 | ~26% | ~96% |

**"至少一个课题彻底做废"在四种打法下全部 ≥70%** —— GAME_DESIGN 五节那条硬约束真正落地了:
做废不是惩罚,是这个职业最普遍的经验,**好玩家也躲不掉**。

而论文数的梯度(2.46 vs 1.1)说明另一件事:
**会不会分配精力,就是"会不会做研究"在这个游戏里的全部含义。**

#### 已知差距

TECH 7.2 的"每局平均论文数 3–9"目前只在中位数上达到(`--bot score` 的 p50 = 3),均值是 2.46。
差的那部分在**博后**(M5)——那是真实世界里产出最高的两三年。M5 做完之后重新量这个数。

#### 标定过程里发现的四个真问题

这四个都**不报错、不崩、validate 也查不出来**,全部是 `simulate` 的统计抓出来的:

1. **每个课题白搭一年。** 课题在事件阶段创建,而掷骰在回合开始时就做完了,
   于是开题那一年永远是 0 推进。修法:开题那年补一次掷骰,并**按投了一格算**
   ——分配屏在这个课题存在之前就结束了,但你显然是花了力气才把它开起来的。
2. **"烂在手里"杀错了对象。** 判定原本读"今年推进了几站",而基础掷骰次数给到 4 次的时候,
   一个一格都没投的课题每年也能推进近三站——于是被杀掉的反而是**正在推进**的课题。
   改成读"连续几年没投过精力",并把基础次数压到 1。
3. **一半的阶段内容永远不会出现。** 每年推进站数上限设到 6 的时候,课题从伦理审查
   **一年直接冲到投稿**:八百次伦理审查事件,零次收数据事件。
   而把上限压到 2 之后更糟——掷骰次数多、成功率高,推进站数变成**定值 2**,
   于是奇数站(文献、收数据、写作、审稿)一次都不出现。
   **真正的修法是减少掷骰次数而不是加上限**:次数少,方差才在,而那个方差就是玩家会看到的全部内容。
4. **九站的管线塞不进五年的学制。** 阶段事件按"回合开始时卡在哪一站"挑,所以每年只能走一两站;
   九站 × 一两站 = 六到八年一篇,而硕博一共只有五六年。
   落地时合成六站(**伦理并进文献,投稿并进写作**),两站的内容都没丢,只是挂到了相邻的站上。

第 3 条值得单独记住:**"上限 + 大量掷骰"会把随机机制悄悄变成确定机制**,
而确定的推进速度意味着一半的内容永远见不到光。这个坑在任何"每年掷 N 次、封顶 M 站"的设计里都在。


### M2.5

```
pnpm typecheck   4 个包全绿
pnpm test        core 78/78 · verify-validate 24/24 反例全变红
pnpm validate    0 errors, 0 warnings(57 事件 / 1 课题模板)
pnpm simulate -- -n 3000 --check   ✅ 覆盖 57/57
```

毕业论文管线的实测分布(2000 局,随机 bot):

| | |
|---|---|
| 走完五个阶段 | **97.9%**(剩下的是状态 ≤0 的提前结局) |
| 照实写"未达显著" | **57.9%** |
| 先定清理规则再动数据 | 49.5% |
| 边跑边调(倒着找规则) | 33.2% |
| HARKing | 17.1% |
| optional stopping | 15.4% |
| 导师说"再调一调" | 8.6% |
| `integrity_risk` 结转非零 | **76.7%** |

**一个随机 bot 有 76.7% 的对局带着一笔诚信账毕业。** 这个数字不是调出来的,
是四个选项各自的 outcome 权重自然形成的——而它大概比很多人愿意承认的更接近真实。

**M2 期间抓到的三类真 bug**,都是 simulate 的覆盖统计发现的、validate 查不出来的:

1. **事件抽取早于开场屏**(见上面第 10 条)——投入分配整年失效。
2. **恒假的 trigger**:`{ year: 2016 } + { flag: 'mastered_stats' }`,而统计的判定在**学年末**才写入这个 flag。
3. **变体池的窗口错配**:一个变体的门控条件永远晚于它所在变体池的触发窗口,于是同组别的变体先触发、把整组关掉,它永远等不到自己的窗口。**这一类不报错,只表现为"这个变体从来没人见过"。**

第 3 类值得单独记住:它是变体池最容易出的一种 bug,而 M7.5 要把二十个时代节点全部转成变体池。
**给变体池选门控条件的纪律:门控要么在窗口之前就已定(背景卡、特质、学院归属),要么这个变体等不到。**

M1 的核心验收是**六条培养路径不串线**。夹具 `routingPack()` 的 timeline 顺序是故意排错的:

- `phd_direct` 的数组后继是 `master` → 前作代码会让直博读满五年掉进硕士阶段
- `postdoc` 的数组后继是 `school` → 前作代码会让博后做完掉进中小学心理教师线

两个陷阱都由 `nextPhaseId` 跨过去,并且断言写成了直接形式:`expect(run.phases).not.toContain('master')`。

顺带被这次改动抓到的回归:三个前作单测靠 `timeline.splice(1, 0, ...)` 往中间插阶段、依赖数组顺延。显式路由之后它们全红了——**这正是想要的行为**(插阶段必须同时重接两条边),已改成显式重接并加注释说明。

`pnpm simulate -- --check` **在 M0/M1 都不适用**:门禁要求所有结局可达且单个结局占比 ≤40%,而骨架包只有一个结局(必然 100%)。这套门禁从 **M2** 起生效。

---

## M4.6:工作台(DESK)吃掉分配屏与课题看板

**`ScreenId` 少了两个、多了一个**:`ALLOCATION` + `PROJECT_BOARD` → `DESK`。
前作没有这一层(它每回合直接进事件),所以这里没有可对照的移植关系,只有一条纪律值得记下来:

**两种动作走两条通路,因为格数守恒只能有一个校验点。**

| | 走哪条 | 何时结算 |
|---|---|---|
| 花精力格的 | `ALLOCATE`(一次原子提交) | 提交时统一结算 |
| 不花精力格的 | `DESK_ACTION`(当场生效,不换屏) | 立刻 |
| 纯浏览(切页签) | **不进 `dispatch`** | —— |

分配没提交之前玩家要能反复加减格子,所以花格数的动作一律不当场结算;
反过来,不花格数的决策当场生效才有手感,而且它们不参与格数校验,不会把那条不变式搞乱。

第三行同样要紧:`DESK_ACTION` **不推进屏幕**,所以任何自动驱动它的代码
(simulate 的 bot、`devJump` 的默认策略)必须自己保证收敛。bot 靠的是
"降档只降到 `tierForQuality` 应得的那一档为止",不是计数器——**用规则收敛,不用计数器兜底**。

### 聚合层单独一个文件的理由

`systems/desk.ts` 是纯读的 ViewModel 聚合。把它单独拎出来不是分层洁癖,是为了让
"原始数值不许穿过去"这条检查**有一个可以静态扫描的落点**(validate 规则 36):
`quality` / `alliance` / `favor` 的数字只能喂给档位函数,不能直接往外塞。
查产出的那一半在单测里(序列化后找不到那三个数)。**两头都要**——
静态检查抓"有人绕过了档位函数",单测抓"档位函数本身漏了一个字段"。

### `acceptanceChance` 分叉成两个函数

`acceptanceChanceFor` 在 `acceptanceChance` 之上加"目标档位比应得的高几级"的惩罚,
玩家没选过刊时**原样退回**旧函数。这样 bot、旧存档、以及玩家干脆不管的课题
走的仍然是 M4.6 之前那条路,回归面收窄到"玩家真的选了刊"这一种情况。

顺带一条测出来的边界:**失败率下限会吃掉"稳一稳"的加成。** 一篇好稿子的基准接收率
已经顶在 `1 − MIN_SETBACK_CHANCE` 上,这时候投得再稳也压不掉那 22%。
这不是漏洞,是五节那条硬约束("不存在稳定刷论文的最优解")照常生效——选刊不该是它的后门。
单测把这条钉住了。
