# 《心之所向:2014》技术架构文档 v1.0

> 配套文档:[GAME_DESIGN.md](./GAME_DESIGN.md)(玩法设计)
> 2026-07-26 定稿。基线:[life-simulator-2014](../life-simulator-2014/) 的 `packages/core` + `packages/tools`(约 22.5k 行,已上线,71 轮迭代)。
> 本文档的核心是**第四节:相对前作引擎的改动清单**。其余章节说明哪些东西原样继承、不必重新设计。

---

## 一、设计原则

继承前作四条,新增一条:

| 原则 | 解决的问题 |
|---|---|
| **P1 内容即数据** | 加事件/导师/结局 = 新增数据文件,不改引擎代码 |
| **P2 引擎纯函数、零平台依赖** | 移植小程序时引擎和内容 100% 复用,只重写 UI 壳 |
| **P3 时间线配置化** | 延长年份、增删培养阶段 = 改配置,引擎里没有写死的年份 |
| **P4 一切可校验、可模拟** | 内容规模化后靠工具保平衡:静态校验防死链,批量模拟防数值失控 |
| **P5 长机制状态化(新)** | 课题、论文、个案、导师是**跨年对象**,必须进 `GameState` 成为结构化列表,不能塞进 `flags` 字典硬凑。凡是需要"有几个、每个什么阶段、哪个是哪个"的机制,都必须有自己的 state 字段和自己的 validate 规则 |
| **P6 精度分级(新)** | 学术线和临床线是一级线,做到最精;其他四条是二级线,做通即可(GAME_DESIGN 一节)。工程含义:**跨年管线机制只给一级线**——二级线只有事件 + 收入规则,没有 `Project`/`Case` 这类对象。这条原则是内容规模能收住的根本原因 |
| **P7 真实素材分层(新)** | 真实院校/机构/方向/制度/已发表文献 → 可用,且必须核对准确;**人名一律虚构**;院校待遇条款是游戏化近似并显式声明(GAME_DESIGN 十九节)。三条都由 `validate` 机械守住,不靠内容作者自觉 |

P5 是本作和前作最大的架构分歧。前作 203 个事件全部可以用 `flags: Record<string, boolean|number|string>` 表达,因为它没有需要枚举的对象集合。本作的"我手上有三个课题,第一个卡在收数据两年了"无法用扁平字典表达。

---

## 二、与前作的代码关系:Fork 独立演进

**本轮确定:fork 一份独立演进**,不抽共享包。

```
复制  life-simulator-2014/packages/core   → psychology-simulator/packages/core    (@psy-sim/core)
复制  life-simulator-2014/packages/tools  → psychology-simulator/packages/tools   (@psy-sim/tools)
参照  life-simulator-2014/packages/web    → psychology-simulator/packages/web     (@psy-sim/web,重写 screens)
新写  psychology-simulator/packages/content                                        (@psy-sim/content)
```

理由:第四节列出的引擎改动会动到 `GameState` 结构、`PhaseConfig` 形状、DSL 的 Condition/Effect 联合类型和调度器主循环。这些改动放进共享包会让前作每次都要跟着回归,而前作已经上线且在做重玩性打磨——两个项目的迭代节奏不该互相绑住。

### Fork 纪律(避免变成两份烂账)

1. **单向同步**:前作的引擎 bugfix 可以往本作搬,本作的新机制**不往前作回流**。
2. **记录 fork 点**:在 `packages/core/FORK.md` 里写清 fork 自前作哪个 commit(当前 HEAD `47cb3f4`),以及本作已经做的每一处引擎改动。搬前作补丁时先看这份清单。
3. **不改名的部分不要动**:`rng/`、`save/`、`dsl/evaluate.ts` 的求值主循环、`systems/ending.ts` 尽量保持与前作逐行一致,方便对照移植补丁。
4. `@life-sim/*` 全部改名 `@psy-sim/*`,避免 monorepo 之间误引用。

### 直接原样继承、本文不再赘述的部分

这些在前作 `TECH_ARCHITECTURE.md` 第三、五、六、七节已有完整说明,本作不改设计:

- 引擎三函数契约 `start / view / dispatch`,`dispatch` 的 clone-then-mutate 事务(含 `finally` 里回写 `rngState`)
- mulberry32 种子 RNG + 外置游标(`state.rngState`),`view()` 用一次性 `new Rng(state.rngState)` 保持纯函数
- 存档双保险:`contentVersion` 一致用 snapshot,不一致用 `seed + actionLog` 重放;`save/migrations.ts` 迁移链
- `StorageAdapter` 接口(引擎不知道 localStorage 存在)
- 导演式选择器:类别去重 ×0.35 / 近两年冷却 ×0.6 / 状态节奏 ×1.8 或 ×0.55 / 特质与目标 `poolBias` 连乘,钳位 `[0.15, 4]`;`eventMindsetValence` 自动推导情绪效价(本作改成读 `state` 值,语义不变)
- `presentationVariants`(条件化开场)、`contextLines`(Hades 式小回响)、`variantGroup`(同组同轮只抽一个)
- 结局判定:priority 升序首个命中,`early` 每轮检查,`final` 仅终局参与
- `IncomeRule` 年度被动收入(所有 `when` 成立的规则都生效)
- `moneyCost` 按余额比例扣减 DSL 与它的 validate 门禁
- 小程序移植约束:core/content 不 import 任何浏览器 API、不引入重动画库、分享卡做成纯数据 → 绘制函数

---

## 三、仓库结构

```
psychology-simulator/
├── GAME_DESIGN.md · TECH_ARCHITECTURE.md · AGENT_HANDOFF.md(逐轮变更记录,照前作格式)
├── pnpm-workspace.yaml · tsconfig.base.json(strict + noUncheckedIndexedAccess,照抄)
├── packages/
│   ├── core/                      # @psy-sim/core(fork 自前作,禁止 import react/dom/wx)
│   │   ├── FORK.md                # fork 点 + 本作引擎改动清单
│   │   └── src/
│   │       ├── types/             # dsl.ts · content.ts · state.ts · view.ts
│   │       ├── engine/            # createEngine: start/view/dispatch
│   │       ├── systems/           # scheduler · ending · project · case · advisor · allocation · inventory · jobmarket
│   │       ├── dsl/               # evaluate.ts · apply.ts
│   │       ├── rng/ · save/
│   ├── content/                   # @psy-sim/content(纯数据)
│   │   └── src/
│   │       ├── timeline/phases.ts
│   │       ├── setup/             # backgrounds · traits · applications(含学院归属)· exam
│   │       ├── courses/           # 本科课程表(真实教材)+ 两门大山的期末小测题库
│   │       ├── slots.ts           # 叙事功能位定义(每位 ≥3 候选,跨局差异的骨架)
│   │       ├── rumors/            # 情报库(原话 + 括注 + accurate,后者不进 ViewModel)
│   │       ├── advisors/          # 6 个导师原型(虚构姓名 + 真实建制)+ 关系状态机
│   │       ├── institutions/      # 真实院校/机构表 + 求职季职位表(Position)
│   │       ├── citations/         # 真实文献表 + LEDGER.md 核对台账
│   │       ├── foundations/       # 理论基础表(绑定真实重复失败年份)
│   │       ├── events/
│   │       │   ├── undergrad/     # 本科四年 · 课程 · 学院分流
│   │       │   ├── project/       # 课题管线:按阶段分文件(ideation/lit/ethics/collect/analyze/write/submit/review)
│   │       │   ├── clinical/      # 个案 · 督导 · 个人体验 · 伦理困境 · 危机
│   │       │   ├── grad/          # 硕士 · 博士 · 博后 · 申请与录取
│   │       │   ├── jobmarket/     # 教职求职季 · 预聘期 · 长聘首考(高光,密度最高)
│   │       │   ├── foundation/    # 文献可靠性:地基塌方事件(四选项)
│   │       │   ├── era/           # 时代节点(2015 重复性危机 … 2033)
│   │       │   ├── tracks/        # 二级线:医院 · 独立咨询 · 学校 · 大厂 · 测评 · 离开(粗做)
│   │       │   ├── npc/ · trait-moments/ · random/
│   │       ├── inventories/       # 量表题库(PHQ-9 / GAD-7 / MBI / SCS 简版)
│   │       ├── economy/incomes.ts
│   │       ├── endings/
│   │       ├── glossary.ts        # 术语表:正确写法 + 生效年份区间(供 validate 用)
│   │       ├── namelist.ts        # 真实研究者姓名黑名单(validate 规则 10 用)
│   │       └── fns/
│   ├── web/                       # @psy-sim/web(React 18 + Vite + Zustand)
│   └── tools/                     # @psy-sim/tools
│       └── src/  validate.ts · simulate.ts · repetition.ts · verify-content.ts
└── .claude/launch.json
```

---

## 四、引擎改动清单(相对前作的 diff)

这一节是本文档的主体。每一项都标注改动量级。

### 4.1 `GameState` 新增字段(中等改动 + 存档迁移)

```ts
interface GameState {
  // ── 前作原有字段全部保留(schemaVersion / seed / rngState / screen / phaseIndex /
  //    flowStepIndex / roundIndex / roundCounter / date / eventQueue / eventCursor /
  //    pendingOutcome / pendingFlowAdvance / forcedEndingId / pendingJumpPhaseId /
  //    exam* / traitOffer / stats / profile / flags / npcs / pendingNpcEvents /
  //    scheduled / triggeredEventIds / history / endingId / lastSettlement / yearlySnapshots)

  stats: {                          // ← 五维换血,不是加维度
    method: number;                 //   方法
    clinical: number;               //   临床
    capital: number;                //   资本
    state: number;                  //   状态(前作 mindset 的位置,含 ≤0 提前结局语义)
    money: number;
  };

  advisor: AdvisorState | null;     // ← 新:大三或研一抽卡后写入
  advisorOffer?: string[];          // ← 新:抽卡屏的候选原型 id,选完清空(照 traitOffer 的写法)

  projects: Project[];              // ← 新:课题列表(P5)
  papers: Paper[];                  // ← 新:已发表/在审论文,结局页清单的数据源
  cases: ClinicalCase[];            // ← 新:个案列表

  allocation: {                     // ← 新:本回合的年度投入分配
    slots: number;                  //   本回合精力格数(默认 3,可被事件临时改)
    picks: string[];                //   已投入项 id(可重复,长度 = slots)
  } | null;

  pendingInventory?: {              // ← 新:量表自评进行中的状态
    inventoryId: string;
    cursor: number;
    answers: number[];
  };

  rival: RivalState | null;         // ← 新:影子竞争者(4.7.3)
  favors: Favor[];                  // ← 新:人情账(4.7.3)
  rumors: Rumor[];                  // ← 新:已打听到的情报(含可靠度,玩家不可见)(4.7.3)
  advisorSwitches: number;          // ← 新:已换过几次导师,驱动成本递增曲线

  gradApplication?: GradApplicationState;  // ← 新:读研/读博/博后的申请与录取(4.7.2)
  jobMarket?: JobMarketState;       // ← 新:教职求职季的多步流程状态(4.7.2)
  institutionId?: string;           // ← 新:当前所在机构(真实院校 id),驱动事件池与文案
  advisorInstitutionId?: string;    // ← 新:导师所属机构(虚构人名 + 真实建制,见 GAME_DESIGN 19.2)
}
```

**存档迁移**:本作 `schemaVersion` 从 1 起重新计数,`CURRENT_SAVE_VERSION = 1`。前作存档不需要兼容(不同游戏)。上线后自己的迁移链照前作的 `save/migrations.ts` 写法维护。

### 4.2 DSL 扩展(小改动,高杠杆)

**Condition 新增 6 种**:

```ts
type Condition =
  | /* …前作 15 种全部保留(always/stat/flag/year/career/background/major/
       npcFavor/npcStage/historyCount/chance/all/any/not/fn)… */

  | { flagNum: { key: string; op: Op; value: number } }        // ← 数值型 flag 的大小比较
  | { projectCount: { stage?: ProjectStage; domain?: string; op: Op; value: number } }
  | { paperCount: { tier?: PaperTier; authorship?: Authorship; replicable?: boolean;
                    op: Op; value: number } }
  | { caseCount: { status?: CaseStatus; op: Op; value: number } }
  | { advisor: { archetype?: string; stage?: string;
                 favor?: { op: Op; value: number } } }
  | { allocated: { itemId: string; op?: Op; value?: number } }   // ← 本回合投入了某项
  | { rival: { field: 'papers' | 'capital'; op: Op; value: number }
            | { aheadOfPlayer: boolean } }                       // ← 与竞争者比较
  | { favorBalance: { who?: string; direction?: 'owed' | 'owing';
                      op: Op; value: number } }                  // ← 人情账余额
  | { rumorHeard: { topic: string; accurate?: boolean } };        // ← 打听过某话题(可按真伪分支)
```

`{ flagNum }` 是**最高杠杆的一条**:前作的 `{ flag, equals }` 只能等值判断,加上大小比较后,注册小时数、督导小时数、耗竭值、诚信风险值、教学工作量这一整批累积量都能继续用 `flags` 字典承载,不必各开一个 state 字段。**只有需要枚举成列表的东西(课题/论文/个案)才真的进 P5。**

**Effect 新增 7 种**:

```ts
type Effect =
  | /* …前作 10 种全部保留(stats/moneyCost/setStat/setFlag/npcFavor/npcStage/
       schedule/setCareer/jumpToPhase/triggerEnding/fn)… */

  | { addFlag: { key: string; delta: number; min?: number; max?: number } }  // 累积量增减
  | { project: ProjectOp }        // create | advance | regress | abandon | setField | publish
  | { case: CaseOp }              // open | advance | drop | close | refer | setAlliance
  | { advisorFavor: number }
  | { advisorStage: string }
  | { extendPhase: { rounds: number } }   // ← 延毕:给当前 rounds 阶段追加轮数
  | { grantSlots: number }                // ← 临时增减本回合精力格
  | { rival: RivalOp }                    // ← nudge(改变他的成长速度)| setStage | reveal
  | { favor: { who: string; direction: 'owed' | 'owing';
               weight: number; reason: string } }   // ← 记一笔人情
  | { settleFavor: { who: string; weight?: number } } // ← 兑现/抵消一笔人情
  | { switchAdvisor: { costTier: 'early' | 'mid' | 'late' } };  // ← 换导师(重抽 + 成本)
```

`{ extendPhase }` 是延毕机制的全部实现。它读写 `state.phaseExtraRounds`(一个新增的小字段),`settleRound` 的 `roundIndex < phase.rounds` 判断改成 `< phase.rounds + (state.phaseExtraRounds ?? 0)`,阶段切换时清零。**改动只在 `settleRound` 一行 + 一个字段。**

`evaluate.ts` 和 `apply.ts` 都是扁平 if-链,新增分支是纯增量,不动已有逻辑。

### 4.3 `PhaseConfig` 扩展(小改动)

```ts
type PhaseConfig =
  | { kind: 'flow'; id; label; date; steps: ScreenId[] }
  | { kind: 'rounds'; id; label; date; rounds; eventSlots; pools; briefs;
      roundOpeners?: ScreenId[];   // ← 新:每轮开场先走这些屏(如 DESK 工作台)
      yearsPerRound?: number;      // ← 新:默认 1;设 2 则每轮推进 2 年
      allocationSlots?: number;    // ← 新:本阶段默认精力格数
      nextPhaseId?: string;        // ← 新:显式指定下一阶段,见下
      isFinal?: boolean };
```

**`nextPhaseId` 是多路径并存的必要改动。** 前作 `settleRound` 在非终局阶段的收尾是 `enterPhase(state, rng, state.phaseIndex + 1)`(`engine.ts:582`)——按数组下标顺延。前作只有一条主干,这样没问题;本作把六条培养路径并列放进 `phases` 数组后,直博阶段打完会掉进数组里紧跟其后的 `master` 阶段,而不是 `postdoc`。

修法(两行):

```ts
// settleRound 末尾
const nextIdx = phase.nextPhaseId
  ? pack.timeline.findIndex(p => p.id === phase.nextPhaseId)
  : state.phaseIndex + 1;
enterPhase(state, rng, nextIdx);
```

配套 validate 规则(M1 已落地,且**比本节原先的设想更严**):

- `nextPhaseId` 必须指向真实存在的阶段 id。
- **每个非 `isFinal` 的阶段都必须写 `nextPhaseId`,一个不许漏**——包括 `gaokao → undergrad` 这条主干。原先的设想是"主干可以靠数组顺延",但那要靠人工确认数组顺序是不是设计意图,而这件事必然出错;主干多写两行是更便宜的一边。
- `isFinal` 的阶段**不得**有 `nextPhaseId`(自相矛盾)。
- 至少存在一个 `isFinal` 阶段。
- **阶段图连通性**:每个阶段都必须能从第一个阶段到达(`nextPhaseId` ∪ `jumpToPhase` 两种边),否则是死阶段。
- **阶段图可终止性**:每个可达阶段都必须能走到某个 `isFinal`。这一条同时抓死路和"绕不出去的环"。

最后两条不在原设想里,是 M1 补的。它们才是真正防串线的那两条:漏写一条边的典型后果不是报错,而是某条路径静默地永远走不到 / 走不完,而这在 simulate 里只表现为某些结局到达率异常。

- `roundOpeners` 是**年度投入分配**的实现方式。`startRound` 里先把这些屏排进流程,走完才进 `BRIEF`。这个机制是通用的,以后想加"年度目标设定""组会汇报"都用它。
- `yearsPerRound` 支撑非学术路径 2029 之后两年一回合,让所有路线统一收在 2034。改动在 `settleRound` 的 `state.date.year += 1` 一行。
- **多个 `isFinal: true` 阶段**:前作的 `isFinal` 已经是 per-phase 标记(`settleRound` 里 `if (phase.isFinal)`),所以多条培养路径各有自己的终局阶段**不需要改引擎**——只需要在 `phases` 数组里把每条路径的最后一个阶段都标上 `isFinal`。这是前作设计里意外好用的一处。

### 4.4 新增 screen(UI 层为主)

```ts
type ScreenId =
  | 'TITLE' | 'BACKGROUND_DRAW' | 'SETUP' | 'EXAM' | 'EXAM_RESULT' | 'APPLICATION'
  | 'NPC_SELECTION' | 'LIFE_GOAL' | 'CROSSROAD' | 'BRIEF' | 'EVENT' | 'OUTCOME'
  | 'SETTLEMENT' | 'ENDING'
  | 'ADVISOR_DRAW'        // ← 导师抽卡(照 BACKGROUND_DRAW 的写法)
  | 'DESK'                // ← 工作台:年度投入分配 + 课题/个案/导师面板 + 历年流水
  | 'INVENTORY'           // ← 量表自评(多题,照 EXAM 的 cursor 写法)
  | 'GRAD_APPLY'          // ← 读研/读博/博后的真实院校清单选择(一屏三用,靠 kind 区分)
  | 'JOB_MARKET'          // ← 教职求职季(七步,内部靠 jobMarket.step 走)
  | 'TENURE_REVIEW';      // ← 长聘首考结算清单
```

对应 `PlayerAction` 新增:`DRAW_ADVISOR` / `ALLOCATE` / `DESK_ACTION` / `ANSWER_INVENTORY` / `SUBMIT_APPLICATIONS` / `JOB_MARKET_STEP` / `ASK_AROUND` / `CONTINUE`(复用)。

**`DESK` 吃掉 `ALLOCATION` 与 `PROJECT_BOARD`**(GAME_DESIGN 4.1)。这两个屏已经落地,合并的改动量比看起来小:`roundOpeners: ['ALLOCATION']` 改成 `['DESK']`,两份 ViewModel 变成 `DESK` 的两个页签块,引擎侧的分配校验与结算逻辑一行不动。`verify-jumps` 会当场变红(它盯着阶段 id 与屏 id),那是对的。

**两种动作,两条通路——这条分工要先定死:**

| | 走哪条 | 何时结算 | 例子 |
|---|---|---|---|
| **花精力格的** | `ALLOCATE`(一次原子提交) | 提交时统一结算 | 投课题、接案、寻求指导、帮导师干活、休息 |
| **不花精力格的** | `DESK_ACTION { actionId, targetId? }` | 当场生效 | 选刊、降档改投、放弃课题 |
| **纯浏览** | 不进引擎,UI 本地 state | —— | 切页签、翻「这些年」、展开一张卡 |

**理由是格数守恒只能有一个校验点。** 分配没提交之前玩家要能反复加减格子,所以花格数的动作一律不当场结算;反过来,不花格数的决策当场生效才有手感,而且它们不参与格数校验,不会把那条不变式搞乱。**新加动作时先问这一格花不花精力,答案决定它走哪条通路。**

**第三行同样要紧:切页签绝对不能走 `dispatch`。** 工作台会显著增加玩家的点击量,如果这些点击进了 `actionLog`,存档、重放和 `devJump` 产出的 action 序列都会被浏览操作淹没——**动作日志只记改变状态的事**。

**社会层三机制不需要任何新屏**:`ASK_AROUND` 挂在已有的抽卡/清单/工作台上;人情账和竞争者进度显示在工作台的桌面页签、年度回顾页和 `StatsBar` 徽章里;`SETTLEMENT` 屏改造成年度回顾页(见六节),不新增 ScreenId。这是这三个机制能便宜的原因。

`EXAM` 的多题游标逻辑和 `BACKGROUND_DRAW` 的抽卡逻辑可以直接复制给 `INVENTORY` 和 `ADVISOR_DRAW`,这两个屏的引擎侧成本很低。

`GRAD_APPLY` **一屏三用**(硕士 / 博士 / 博后),差异全在数据侧:同一份 `Institution` 表按 `kind` 过滤出不同清单、套不同的门槛条件和录取概率曲线。**这是把"四次真实院校选择"的实现成本压到一个屏的关键**——四次选择在玩家侧是四个不同的高光时刻,在代码侧是一个屏 + 四份数据。`JOB_MARKET` 是唯一必须独立实现的,因为它有七步内部流程和 offer 谈判。

### 4.5 调度器改动(中等)

`pickRoundEvents` 的优先级链在前作是:①到期 schedule → ②mandatory(variantGroup 折叠)→ ③NPC 阶段事件 → ④导演加权随机池 → 按 order 排序。

本作在 ② 和 ③ 之间插入两级,同样**不占 `eventSlots` 名额**:

```
① 到期的 scheduled
② mandatory 时代节点(variantGroup 折叠)
②' 课题管线阶段事件   ← 新:每个 active project 按当前 stage 抽 1 个阶段事件
②'' 个案阶段事件      ← 新:每个 active case 按状态抽 1 个,每轮上限 2 个
③ NPC 阶段事件(每轮上限 1,溢出进 pendingNpcEvents)
③' 导师关系阶段事件   ← 新:每轮上限 1,复用 NPC 的顺延 + stage 复核逻辑
④ 导演加权随机池填满 eventSlots
⑤ 按 order 稳定排序
```

**风险**:②'~③' 全部是"额外保证入队",一个有 3 个课题 + 2 个个案 + 1 个导师节点的博士生,单回合可能弹出 8~10 个事件,节奏会崩。对策:

- **每轮管线事件总量上限**(建议 3),超出的 project/case 本轮只做静默阶段推进(在年度结算页用一行摘要交代:"「情绪调节的年龄差异」还卡在收数据。今年招到 41 人。"),不弹事件。
- 优先级:本轮被 `allocation` 投入过的 project/case 优先弹事件。**你投了精力的那个课题才有戏**,这条规则同时解决了节奏问题和"投入分配有没有意义"的手感问题。

`directorMultiplier` 里的 `state.stats.mindset` 改成 `state.stats.state`,阈值(35 / 75)沿用。

### 4.6 新增 systems(纯新增文件)

| 文件 | 职责 |
|---|---|
| `systems/project.ts` | 课题阶段机:`advanceProject` / `regressProject` / `publishPaper`;阶段推进的成功率由方法值、导师原型、投入格数、随机数共同决定 |
| `systems/case.ts` | 个案状态机:联盟计算、脱落判定、`clinical_hours`/`supervision_hours` 累积 |
| `systems/advisor.ts` | 导师抽卡(`rng.sample`)、好感度、关系阶段推进、`poolBias` 全局改写 |
| `systems/allocation.ts` | 生成本回合可投入项(由阶段 + projects + cases + flags 动态计算)、校验提交、结算投入效果 |
| `systems/inventory.ts` | 量表计分、按真实分界值给解释、计算**自评分与 `stats.state` 的偏差**并选取对应文案 |
| `systems/burnout.ts` | 年度结算时按个案量、教学量、状态低谷累积 `burnout`,到阈值 schedule 耗竭事件链 |
| `systems/admission.ts` | `GRAD_APPLY` 一屏三用的录取判定:按 `kind` 过滤院校清单、算录取概率(资本 × 方法 × 门槛差 × 方向匹配)、实现滑档到备选批次(复用前作 `handleApplication` 的 `CHANCE_TIERS` 与滑档逻辑) |
| `systems/jobmarket.ts` | 教职求职季七步流程的状态机 + offer 生成(投递策略 × 资本 × 推荐信分量 × **市场年份松紧** × 方向匹配 × 两体约束) |
| `systems/tenure.ts` | 长聘首考清单结算 + 通过判定 |
| `systems/foundation.ts` | 文献可靠性机制:年份推进时检查所有活跃课题的 `foundationId`,命中 `replicationFailure.year` 则 schedule 塌方事件;`trait_skeptic` 的选课题提示注入 |
| `systems/rival.ts` | 影子竞争者的年度推进(~40 行)+ 五个交汇点的触发判定 + 结局页并列数据 |
| `systems/favor.ts` | 人情账的记账、按年贬值、净欠额的状态惩罚、兑现时的候选人筛选 |
| `systems/rumor.ts` | 按 `topic` + `availableWhen` 过滤可打听项、扣除代价、写入 `state.rumors`。**`accurate` 只在内容的 outcome `condition` 里被读,不进 ViewModel** |
| `systems/blackswan.ts` | 黑天鹅的配额控制:每局 1–2 次,不受方法/资本保护,不与提前结局挂钩。本质是一个独立于导演器的低频抽取器 |
| `systems/review.ts` | 年度回顾页的数据聚合(课题/论文/个案/收支/状态/竞争者进度),纯读取,不改 state |
| `systems/course.ts` | 课程三档判定(投入格数 × 属性 × 期末小测 × 随机)、能力标签写入、重修代价(4.7.5) |
| `systems/slots.ts` | 叙事功能位:按 `roundWindow` 命中、从 ≥3 个候选里导演加权抽 `fill` 个、记 `filledSlots` 防重填(4.7.4) |
| `systems/desk.ts` | 工作台的 ViewModel 聚合(纯读):把 projects / cases / advisor / 毕业进度组装成五个页签,并把所有原始数值**降级成档位**。`quality` / `alliance` / `favor` 的数字不许穿过这一层(规则 36)。「这些年」页签**直接复用 `systems/review.ts`**,不另写一套聚合 |

这些都是纯函数,输入 `(state, pack, rng)`,输出对 state 的修改。与 `scheduler.ts` 同层。

### 4.7 数据模型(新机制的 Schema)

```ts
// ── 课题与论文 ────────────────────────────────────────────
type ProjectStage = 'ideation' | 'lit' | 'ethics' | 'collect' | 'analyze'
                  | 'write' | 'submit' | 'review' | 'published' | 'abandoned';

interface Project {
  id: string;                 // 运行时生成:'proj_1'
  templateId: string;         // 指向 content 里的 ProjectTemplate(决定标题、领域、事件池)
  title: string;              // '情绪调节策略的年龄差异'
  domain: string;             // 领域标签,决定抽哪个阶段事件池
  stage: ProjectStage;
  quality: number;            // 0-100,影响可投期刊档位与拒稿率
  yearsSpent: number;
  authorship: Authorship;     // 'first' | 'co_first' | 'second' | 'middle' | 'corresponding'
  integrityRisk: number;      // 本课题累积的诚信风险,发表时结转到 Paper
  rejections: number;
  preregistered: boolean;
  startedYear: number;
  // ↓ 工作台(M4.6)新增:玩家在审稿站选的目标档位。
  //   undefined = 还没选,引擎按 quality 自动兜底(bot 与旧存档走这一条)。
  submitTier?: PaperTier;
}

type PaperTier = 'q1' | 'q2' | 'q3' | 'cssci' | 'chinese_core' | 'conference' | 'preprint';

interface Paper {
  id: string;
  title: string;
  tier: PaperTier;
  authorship: Authorship;
  year: number;
  domain: string;
  integrityRisk: number;      // 结局页"哪几篇后来重复不出来"的判定依据
  replicated?: boolean | null;// null = 从来没人试过重复(最真实的情况)
}

// ── 个案 ──────────────────────────────────────────────────
type CaseStatus = 'intake' | 'working' | 'plateau' | 'terminating'
                | 'dropped' | 'completed' | 'referred';

interface ClinicalCase {
  id: string;
  templateId: string;
  presentingIssue: string;    // 主诉
  status: CaseStatus;
  alliance: number;           // 0-100 工作联盟
  sessions: number;
  riskLevel: 'low' | 'moderate' | 'high';
  orientationMatch: number;   // 你的取向与这个个案的匹配度,影响进展速度
  startedYear: number;
  supervised: boolean;        // 这个个案是否在督导中
}

// ── 导师 ──────────────────────────────────────────────────
interface AdvisorDef {                 // content 层
  id: string;                          // 'adv_star' | 'adv_young_pi' | ...
  archetype: string;
  name: string;
  publicImpression: string;            // 抽卡屏上你能看到的
  poolBias?: Record<string, number>;   // 全局事件类别偏置
  projectModifiers?: {                 // 对课题管线各阶段成功率的修正
    [S in ProjectStage]?: number;
  };
  initialStage: string;
  initialFavor: number;
  stages: Record<string, { advanceWhen?: Condition; eventId?: string }>;
}

interface AdvisorState { id: string; favor: number; stage: string; }

// ── 年度投入项 ─────────────────────────────────────────────
// 落地时字段名与本表有出入(maxPicks → maxSlots、effectsPerSlot → perSlot,
// 另加了 category),以 types/content.ts 为准。下面两条是工作台(M4.6)新增的。
interface AllocationItem {
  id: string;
  label: string;
  text: string;                        // 一句话说明这一年具体在干什么(氛围)
  payoff: string;                      // ← 新:这一格换来什么(代价与回报,明码标价)
  availableWhen: Condition;
  maxPicks?: number;                   // 默认 slots,设 1 则不可重复投入
  effectsPerSlot: Effect[];            // 每投一格结算一次
  targets?: 'project' | 'case';        // 需要玩家再选一个具体对象
  target?: {                           // ← 新:把这一项挂到工作台的哪张卡片上
    kind: 'project' | 'case' | 'advisor';
    id?: string;                       //   省略 = 挂在该类目的面板上(如导师面板)
  };
}

// ── 量表 ──────────────────────────────────────────────────
interface Inventory {
  id: string;                          // 'phq9' | 'gad7' | 'mbi' | 'scs'
  name: string;
  disclaimer: string;                  // 每屏必带的克制提示
  items: { text: string; options: { text: string; score: number }[] }[];
  bands: { min: number; max: number; label: string; text: string }[];
  // 自评分与 stats.state 的偏差文案(本作招牌设计,见 GAME_DESIGN 十六)
  discrepancy: { minGap: number; text: string }[];
}
```

`ContentPack` 相应新增:`advisors`、`projectTemplates`、`caseTemplates`、`allocationItems`、`inventories`、`glossary`、`institutions`、`positions`、`citations`、`foundations`、`rumors`、`slots`、`courses`、`courseExamBank`。

### 4.7.1 真实素材的数据模型(院校 · 职位 · 文献)

这三张表是本作的**内容资产**,量大、结构规整、需要独立校验。它们不是事件,是事件引用的数据源(GAME_DESIGN 十九节)。

```ts
// ── 院校 / 机构 ────────────────────────────────────────────
interface Institution {
  id: string;                        // 'inst_bnu' | 'inst_uva' | ...
  name: string;                      // 真实名称:'北京师范大学'
  unit: string;                      // 真实建制:'心理学部'
  lab?: string;                      // 真实实验室/中心:'认知神经科学与学习国家重点实验室'
  region: 'cn' | 'overseas';
  city: string;
  tier: 'a_plus' | 'a' | 'b_plus' | 'institute' | 'hospital'
      | 'r1' | 'slac' | 'europe' | 'hk_sg';
  domains: string[];                 // 真实方向标签,用于与玩家 domain 匹配
  impression: string;                // 清单上展示的公开印象(不含个人评价)
  // 以下全部是「游戏化近似」,不是真实招聘信息 —— UI 必须声明。
  // M3.5 补丁把它拆成招生侧/聘用侧两组:读硕的人不该在清单上看到预聘条款,
  // 拆开之后这个错误在类型层面就写不出来(GRAD_APPLY 拿不到 employment)。
  gameified: {
    admission?: {                    // 招生侧:GRAD_APPLY 读这一组
      quota?: string;                // 招生指标的描述
      duration?: string;             // 学制/培养年限
      funding?: string;              // 资助方式
      // ↓ 工作台(M4.6)新增。毕业硬指标,展示文案 + 结构化版本必须一致(规则 34)
      graduationBar?: string;        // '博士毕业要求 2 篇 SCI,其中 1 篇二区以上'
      graduationReq?: { papers: number; topTier?: number; topTierLabel?: string };
    };
    employment?: {                   // 聘用侧:只出现在求职季的 JOB_MARKET
      tenureYears?: number;          // 首考年限
      tenureBar?: string;            // 考核指标描述
      startupFunds?: [number, number]; // 启动经费区间(量级,非精确)
      teachingLoad?: string;         // '2-2' | '3-3' | '年均 200 课时'
      tenured?: boolean;             // 是否直接给编制/长聘
      housing?: string;
    };
  };
}

// ── 职位(求职季清单的一行)────────────────────────────────
interface Position {
  id: string;
  institutionId: string;
  kind: 'faculty_cn' | 'institute_cn' | 'tenure_track_r1' | 'slac'
      | 'europe' | 'hk_sg' | 'backup_hospital' | 'backup_industry'
      | 'backup_clinic' | 'backup_school';
  domainFit: string[];               // 与玩家 domain 匹配则大幅提高命中率
  requires: Condition;               // 硬门槛(资本/论文/基金)
  marketYearBias?: Record<number, number>;  // 市场松紧:按年份调整命中率
  twoBodyFriendly?: boolean;         // 有无配偶岗
}

// ── 理论基础(文献可靠性机制的核心)────────────────────────
interface Foundation {
  id: string;                        // 'fnd_ego_depletion'
  label: string;                     // '自我损耗'
  domains: string[];
  origin: Citation;                  // 原始文献(真实)
  hypeYears: [number, number];       // 这个效应当年的热度区间(玩家选课题时能看到热度)
  /** 真实历史上重复失败的年份 + 那篇重复研究。null = 至今站得住 */
  replicationFailure: { year: number; citation: Citation } | null;
  /** 怀疑主义特质在选课题屏额外看到的一行(通常是原始研究的样本量) */
  skepticHint?: string;
}

interface Citation {
  authors: string;                   // 'Hagger et al.'(姓氏 + et al.,不写全名)
  year: number;
  venue: string;                     // 期刊名
  gist: string;                      // 一句话结论(必须与原文结论方向一致)
  verified: boolean;                 // ← 已人工核对过作者/年份/期刊/结论方向
}
```

**`Citation.verified` 是一个流程字段,不是装饰。** `validate` 拒绝任何 `verified: false` 的引用进入构建(GAME_DESIGN 二十二节第 10 条:把真实文献的结论写反是这个游戏最不能犯的错)。核对台账放在 `content/src/citations/LEDGER.md`,逐条记核对人与核对日期。

**`Foundation.replicationFailure.year` 必须是真实历史年份。** 机制的全部说服力来自它和玩家在游戏里的时间线真的对得上——2016 年读到那篇多实验室重复研究,是因为它 2016 年真的发表了。

### 4.7.2 求职季与申请的状态

```ts
interface JobMarketState {
  step: 'timing' | 'materials' | 'targeting' | 'talks'
      | 'negotiation' | 'two_body' | 'result';
  year: number;
  marketTightness: number;           // 该年市场松紧,开局种子 + 年份决定,玩家不可见
  letters: string[];                 // 推荐信来源:导师 / 博后 PI / 合作者
  letterWeight: number;              // 由导师原型 × 关系阶段 × 见面频次算出
  applied: string[];                 // 投递的 positionId(上限由材料准备质量决定)
  invited: string[];                 // 进入 job talk 的
  offers: Offer[];
  accepted: string | null;
}

interface Offer {
  positionId: string;
  terms: Institution['gameified'];   // 实例化后的具体条款(在区间内摇一次)
  negotiated: boolean;
  twoBodyResolution?: 'apart' | 'partner_follows' | 'player_yields'
                    | 'spouse_hire' | 'breakup';
}

// 读研/读博/博后的申请复用一套轻量结构
interface GradApplicationState {
  kind: 'master' | 'phd' | 'phd_abroad' | 'postdoc';
  shortlist: string[];               // 玩家从清单里选的目标 institutionId
  outcomes: Record<string, 'admitted' | 'rejected' | 'waitlist'>;
}
```

`marketTightness` 玩家**不可见**,这是 GAME_DESIGN 9.3 第一条("一个都没有必须是高概率的真实结果")的实现方式:同样的资本值,在紧年份和松年份的结果不同,而你只能事后从"今年大家都不好找"里推断。

### 4.7.3 社会层:竞争者 · 人情 · 情报(GAME_DESIGN 十三节)

```ts
// ── 影子竞争者 ────────────────────────────────────────────
interface RivalState {
  name: string;                      // 虚构姓名(受人名黑名单校验)
  archetype: string;                 // 'grinder' | 'lucky' | 'strategic' | 'struggling' | ...
  track: 'academic' | 'clinical' | 'industry' | 'left';
  stage: string;                     // 与玩家培养阶段平行的粗粒度进度
  papers: number;
  capital: number;
  /** 每年成长速度。基线由 archetype 定,但被玩家行为修正(帮过他/抢过他/举报过他) */
  momentum: number;
  /** 玩家对他的了解程度:0 只知道名字,3 知道他的处境。打听可提升 */
  visibility: number;
  encounters: string[];              // 已发生的交汇点 id,防重复
}
```

**竞争者不跑完整引擎**——`systems/rival.ts` 每年结算时按 `momentum` 推进 `papers`/`capital`/`stage`,约 40 行。它只需要每年产出一个可比的数字和一句处境描述。

关键实现约束:**`momentum` 必须可被玩家行为修正**(`{ rival: { op: 'nudge' } }` effect),否则他退化成一条固定难度曲线,13.1 第 1 条("他的强弱部分取决于你的选择")就落空了。

```ts
// ── 人情账 ────────────────────────────────────────────────
interface Favor {
  who: string;                       // npcId | 'advisor' | 'rival' | 'peer_generic'
  direction: 'owed' | 'owing';       // owed = 他欠我;owing = 我欠他
  weight: number;                    // 1–5
  reason: string;                    // 结算页与兑现事件里复述的具体事
  year: number;                      // 用于计算贬值
  settled?: boolean;
}
```

**贬值规则**在 `systems/favor.ts` 里:`effectiveWeight = weight × max(0.2, 1 - 0.15 × (当前年 - year))`。五年前的恩情兑现不了一封今年的推荐信。`favorBalance` 条件读的是 `effectiveWeight` 之和,不是原始值。

**净欠额吃状态**:年度结算时 `netOwing > 阈值` → 状态惩罚。这是 13.2"欠太多本身是压力"的落地。

```ts
// ── 情报 ──────────────────────────────────────────────────
interface RumorDef {                 // content 层
  id: string;
  topic: string;                     // 'advisor:adv_star' | 'foundation:fnd_ego_depletion' | 'position:pos_xx'
  source: string;                    // '师姐' | '猎头' | '同门' | '匿名论坛'
  text: string;                      // 打听到的原话
  caveat: string;                    // 括注里的那句破坏性信息('她 2016 年毕业')
  accurate: boolean;                 // ← 这条消息是否为真。玩家永远看不到
  availableWhen: Condition;
  cost: { slots?: number; network?: number };
}

interface Rumor { defId: string; year: number; }   // 玩家已听到的
```

**`accurate` 字段绝不能进 ViewModel。** 这是 13.3 全部设计的支点——玩家看到的永远只是"某人说了一句话 + 一句让人不安的括注",可靠度只能自己推断。`validate` 检查 `ViewModel` 构造路径上没有任何地方透出 `accurate`(见 7.1 规则 19)。

**打听不是一个 screen,是一个 action。** `ASK_AROUND` 挂在 `ADVISOR_DRAW` / `GRAD_APPLY` / `JOB_MARKET` / `DESK` 这几个已有的屏上,按 `topic` 过滤出可打听项。这样零新屏。

### 4.7.5 课程系统(本科四年,GAME_DESIGN 8.2)

课程**不进 `GameState` 的结构化列表**——它的产出是能力标签,而标签就是 flag。这是 P5 的反例:课程虽然跨年,但玩家不需要"我手上有哪几门课在什么阶段",所以不该占 state 字段。

```ts
interface Course {
  id: string;                    // 'crs_stats' | 'crs_exp_psy' | 'crs_abnormal' | ...
  label: string;                 // '心理统计学'
  textbook?: string;             // '张厚粲《现代心理与教育统计学》'
  year: 1 | 2 | 3 | 4;           // 开在哪一学年
  availableWhen?: Condition;     // 学院归属门控(如高等数学仅理学院)
  /** 判定时看哪个属性 */
  statKey: 'method' | 'clinical';
  /** 学通后解锁的能力标签,写进 flags */
  masteryFlag: string;           // 'mastered_stats'
  /** 是否有期末小测(仅心理统计与实验心理学为 true) */
  finalExam?: { questionIds: string[] };
  /** 三档结果各自的 effects */
  outcomes: {
    mastered: Effect[];
    passed: Effect[];
    failed: Effect[];            // 通常含 { grantSlots: -1 } 的下一年重修代价
  };
}
```

**判定公式**(`systems/course.ts`):`P(学通) = base + 0.18 × 投入格数 + (属性 - 50) × 0.006 + 期末小测加成`。小测答对 +0.15。判定在**年度结算时**做,结果显示在年度回顾页的一行里,不单独开屏。

**"点头假装听懂"选项的实现**:内容侧用 `visibleIf: { not: { flag: 'mastered_stats' } }` 给出该选项,`{ flag: 'mastered_stats' }` 给出真懂的选项。两者互斥。这是前作已有的 DSL 能力,零引擎成本。

**期末小测复用 `EXAM` 机制**:`examPaper`/`examCursor`/`examCorrect` 这套游标字段前作已有,课程小测直接复用,只是题库换成 `courseExamBank`、题量为 1。不新增 screen,不新增 state 字段。

> **本作跨度最长的一条因果链在这里**:大二期末统计课的一次判定 → `mastered_stats` flag → 2029 年某个审稿事件的可选项。`validate` 规则 4(累积量读写成对)会自动守住每个 `masteryFlag` 至少被一处条件读取。

### 4.7.6 毕业论文:课题管线的简化实例

**不新增机制**——毕业论文就是一个 `Project`,只是模板上打了 `isThesis: true`,阶段序列被裁短:

```
想法 → 收数据 → 分析 → 写作 → 答辩(复用 review 阶段的判定,换文案)
```

跳过伦理/预注册、投稿两站。`quality` 不影响后续,但 `integrityRisk` **正常累积并结转**——8.6 的 `p = .08` 就是诚信线的第一笔账。

这样做的好处:玩家在大四已经完整走过一遍管线的操作流程,研一开第一个真课题时不需要再教一次。

### 4.7.4 叙事功能位(跨局差异的内容组织单位)

GAME_DESIGN 20.3② 的实现。这是**内容组织方式的改变,不是引擎机制的改变**——功能位不进 `GameState`,它只影响调度器怎么抽事件。

```ts
interface NarrativeSlot {
  id: string;                  // 'slot_phd2_setback' | 'slot_undergrad3_tension'
  label: string;               // '博二的低谷'
  phaseId: string;             // 属于哪个阶段
  roundWindow: [number, number];  // 该阶段第几轮到第几轮之间(含年份抖动)
  fill: number;                // 本槽每局填几个(通常 1)
  candidates: string[];        // ≥3 个候选 eventId(validate 规则 23)
}
```

调度器改动(`pickRoundEvents` 第 ② 步之后):**功能位按 `roundWindow` 命中后,从 `candidates` 里取出所有 `trigger` 满足的,导演加权抽 `fill` 个。** 一个功能位每局只填一次(记在 `state.filledSlots: string[]`)。

三点设计约束:

1. **功能位不替代随机池,是在它之上的一层。** 随机池继续存在,负责填补 `eventSlots` 剩余名额。功能位保证"这一年一定有一次课题挫折",随机池保证"其余的不可预测"。
2. **候选事件之间必须是叙事上等价的**(都能承担"博二低谷"这个功能),但处境完全不同。这是内容作者的责任,validate 只能守数量。
3. **候选的 `trigger` 要有交集**——如果 3 个候选的触发条件互斥,那实际上每局仍然只有 1 个可选,超配就白做了。`simulate` 报每个功能位各候选的实际命中分布,任一候选 <15% 说明条件写窄了。

`state` 只多一个 `filledSlots: string[]` 字段,引擎侧成本很低。

### 4.8 改动量级汇总

| 模块 | 改动 |
|---|---|
| `types/state.ts` | 中:五维换名 + 7 个新字段 |
| `types/dsl.ts` | 小:Condition +6、Effect +7(纯增量联合分支) |
| `types/content.ts` | 中:PhaseConfig +3 字段,新增 6 类 Schema |
| `dsl/evaluate.ts` `dsl/apply.ts` | 小:扁平 if-链纯增量 |
| `engine/engine.ts` | 中:新 screen 分支、`roundOpeners`、`yearsPerRound`、`nextPhaseId` 路由、`extendPhase`、五维改名 |
| `systems/scheduler.ts` | 中:优先级链插两级 + 管线事件上限 + 投入优先规则 |
| `systems/*` 新增 8 个文件 | 大:全新,但都是纯函数,可单测 |
| `rng/` `save/` `systems/ending.ts` | 无:原样继承 |
| `packages/web` | 大:6 个新屏,但沿用前作的 CSS 变量纸墨配色与单列移动优先布局 |
| `packages/tools` | 中:见第七节 |

---

## 五、时间线配置

多条培养路径靠 `jumpToPhase`(前作已有)在 `phases` 数组里跳转,每条路径的末阶段各自标 `isFinal`。

```ts
export const phases: PhaseConfig[] = [
  { kind: 'flow',   id: 'gaokao',      date: { year: 2014, month: 6 },
    steps: ['BACKGROUND_DRAW', 'SETUP', 'EXAM', 'APPLICATION', 'NPC_SELECTION'] },

  { kind: 'rounds', id: 'undergrad',   date: { year: 2014, month: 9 },
    rounds: 4, eventSlots: 3, allocationSlots: 3, roundOpeners: ['DESK'],
    pools: ['undergrad', 'course', 'npc', 'era', 'random'], briefs: [/* 4 */] },
    // ADVISOR_DRAW 由大三的 mandatory 事件触发进入实验室时才发生,不占 roundOpeners

  { kind: 'flow',   id: 'crossroad',   date: { year: 2018, month: 3 },
    steps: ['LIFE_GOAL', 'CROSSROAD'] },   // CROSSROAD 的 effect 用 jumpToPhase 分流

  // ── 学术路径(全部显式写 nextPhaseId)──
  { kind: 'rounds', id: 'phd_direct',  rounds: 5, nextPhaseId: 'postdoc',     /* 2018–2023 直博 */ },
  { kind: 'rounds', id: 'master',      rounds: 3, nextPhaseId: 'master_fork', /* 2018–2021 */ },
  { kind: 'flow',   id: 'master_fork', steps: ['CROSSROAD'] },                // 再次 jumpToPhase 分流
  { kind: 'rounds', id: 'phd',         rounds: 3, nextPhaseId: 'postdoc',     /* 2021–2024,可 extendPhase */ },
  { kind: 'rounds', id: 'phd_abroad',  rounds: 6, nextPhaseId: 'postdoc',     /* 2018–2024 海外 */ },
  { kind: 'rounds', id: 'postdoc',     rounds: 3, nextPhaseId: 'job_market',  /* 第2年可选出去找工作 */ },
  { kind: 'flow',   id: 'job_market',  steps: ['JOB_MARKET'] },               // 无 offer → jumpToPhase 到某条 track
  { kind: 'rounds', id: 'tenure_track', rounds: 3, yearsPerRound: 2, nextPhaseId: 'tenure' /* 6 年 */ },
  { kind: 'flow',   id: 'tenure',      steps: ['TENURE_REVIEW'], isFinal: true },

  // ── 非学术路径(各自 isFinal,统一收在 2034)──
  { kind: 'rounds', id: 'track_clinical', /* 前期 1 年/轮 */ nextPhaseId: 'track_clinical_late' },
  { kind: 'rounds', id: 'track_clinical_late', yearsPerRound: 2, isFinal: true },
  { kind: 'rounds', id: 'track_hospital', isFinal: true },
  { kind: 'rounds', id: 'track_school',   isFinal: true },
  { kind: 'rounds', id: 'track_industry', isFinal: true },
  { kind: 'rounds', id: 'track_left',     isFinal: true },
];
```

三处需要注意的路由细节:

- `CROSSROAD` / `master_fork` / `job_market` 这三个 flow 阶段的出口全部靠 `jumpToPhase` effect,不靠下标顺延。
- 教职求职季"一个 offer 都没有"的分支,用 `jumpToPhase` 打回 `postdoc`(续博后再战)或跳到某条 `track_*`(转行),**不是终局**。
- 博后第 2 年选择出去找工作,用 `extendPhase: { rounds: -1 }` 提前收尾比较别扭;更干净的做法是 `postdoc` 配 `rounds: 2`,第 3 年靠一个"再续一年"的选项用 `extendPhase: { rounds: 1 }` 加回来。**默认走短路径,延长要玩家主动选**,这也更符合"你在赌市场明年会不会更好"的叙事。

> 一条路径需要"前期一年一轮、后期两年一轮"时,拆成两个连续的 `rounds` 阶段(`yearsPerRound` 分别为 1 和 2),只有后一个标 `isFinal`。

**「延长/缩短某条路径」= 改 `rounds` + 补 `briefs`,引擎零改动。** 这是 P3 在本作最需要用到的地方,因为培养年限是设计中最可能被反复调的参数。

---

## 六、UI 层

React 18 + Vite + TypeScript + Zustand(仅 UI 壳,真状态在 `GameState`),`screens/` 下每种 `ViewModel.kind` 一个组件,沿用前作的手写 CSS + `:root` 自定义属性 + 620px 单列移动优先布局。

六个新屏的设计要点:

| 屏 | 要点 |
|---|---|
| `ADVISOR_DRAW` | 只展示公开信息(主页、论文数、师兄师姐一句话),**不展示真实原型**。真实体验在后续两三年里逐步揭示 |
| `DESK`(工作台) | **本作的主界面**,五个页签:桌面 / 课题 / 个案 / 导师 / 这些年(GAME_DESIGN 四节)。要点见下 |
| `INVENTORY` | 一次一题,照 `EXAM` 的游标;结果页给得分 + 分界解释 + 偏差文案 + 免责提示 |
| `GRAD_APPLY` | 院校清单卡片流:真实校名 + 建制 + 实验室 + 方向 + 虚构导师印象 + 游戏化条款。多选投递、显示"有点冒险 / 稳"的模糊提示而非精确概率。**顶部常驻游戏化声明** |
| `JOB_MARKET` | 七步流程,每步一屏。"投递策略"复用 `GRAD_APPLY` 的卡片流并加国内/海外分组切换;**"谈条件"那一屏做成真的合同条款排版**(等宽字体、条目编号、区间数字);"两体问题"那一屏只有文字和四五个选项,不要任何数值提示 |
| `TENURE_REVIEW` | 清单式结算(见 GAME_DESIGN 十节),逐行渐显,最后给结果 |
| `SETTLEMENT`(改造) | **年度回顾页**:课题 / 论文 / 个案 / 收支 / 状态与耗竭 / 竞争者进度,清单式排版,只陈述不评价。这是全作出现次数最多的一屏(约 18 次),值得单独打磨排版 |

**`DESK` 的五个页签**(GAME_DESIGN 4.1–4.3、七节):

| 页签 | 排版要点 |
|---|---|
| 桌面 | 顶部一行毕业/考核进度(清单式,**不算总分**)· 格数计量条 · 每个对象一行摘要 + 挂在上面的 [投 N 格] 按钮 · "休息"是一等公民,不塞在末尾 |
| 课题 | 一卡一课题,看起来像实验室白板。**六站走到哪是事实,质量只给档位**("还有硬伤 / 看得过去 / 结实")· 到审稿站时出现选刊(四档模糊提示,与 `GRAD_APPLY` 同一口径) |
| 个案 | 一卡一个案。**联盟只给走向**("在变好 / 在变僵"),数值不进 ViewModel——这条在 `view.ts` 里已经写死过一次,工作台不许绕过 |
| 导师 | 公开印象(那句抽卡时的话,永远留着)· 关系四档 · 可及性三档(**映射必须多对一**,见规则 35)· 他上次说的那句话 · 两到三个动作 |
| 这些年 | `yearlySnapshots` 的流水,可以往回翻。纯读,零机制 |

**每个动作按钮下面都要有一行明码标价**(`AllocationItem.payoff`):花几格、换来什么、风险在哪。氛围文案留在上面一行。**不写清楚不是含蓄,是让玩家瞎猜**(GAME_DESIGN 4.6)。

**打听按钮的呈现**:挂在 `ADVISOR_DRAW`/`GRAD_APPLY`/`JOB_MARKET`/`DESK` 上的一个次要入口。打听结果用**引文 + 灰色括注**两行排版——正文是那个人的原话,括注是那句让人不安的补充。**括注永远不评价可靠性**,只给一个事实(她哪年毕业的、他没说什么)。

`StatsBar` 常驻展示:年份 · 阶段 · 五维 · 已选特质 · 导师(抽卡后)· 课题数/论文数/个案数的小徽章。

> **`SETTLEMENT` 与 `DESK` 的分工**:结算屏是那一年结束时的一次正式回顾(一次性、有仪式感),工作台的「这些年」是它的存档(随时可翻)。两者读同一份 `yearlySnapshots`,不要各写一套聚合。

---

## 七、质量工具链

三件工具照抄前作再加规则。**这是最不该重写、也最有价值的部分**——它是 470+ 事件、24 所院校、几十条真实引用这个规模下唯一的保险。

> **第四件工具(M1 新增):`verify-validate.ts`——validate 的反例自测。**
> 每条规则配一个应该让它变红的内容包夹具,断言它真的红了(外加一条阳性对照,确认合法内容包不被误伤)。
> 理由:**从来不报错的检查和没有检查是一回事**。fork 之后前作那条 `NPC_TAG_PREFIXES` 完备性检查一直在空转(本作没有那些前缀的标签),而它看起来跟别的规则一样绿。规则越多,这种沉默失效越难发现。
> **本节每新增一条规则,同时往 `verify-validate.ts` 加一个反例。** 下面的规则编号就是反例的清单。

### 7.1 `pnpm validate` 新增规则

继承前作全部规则(id 唯一、悬空引用、outcome 必须有可见数值变化、正权重、大额固定扣款门禁、特质前缀与 `poolBias` 范围、NPC 温度标签完备性、互斥词表)。本作新增:

1. **课题阶段图无死锁**:每个 `ProjectStage` 至少有一个内容事件能推进出去;`abandoned`/`published` 是唯一允许的终态。
   → M2.5 落地。做成四条:①每个阶段都要有出口(序列第一个阶段允许由"创建时顺手推进"退出);②终态不许写进 `stageSequence`;③反方向:`trigger` 读了一个没有模板会经过的阶段 = 拼错了;④模板 id 唯一、标题与序列非空。
   **写这条规则的直接原因**:毕业论文链的阶段语义差了一格(事件的 trigger 读前一个阶段),课题永远停在 `review`。那次是手工 trace 发现的——所以它现在是规则 1 的第一个反例。
2. **个案状态图无死锁**:同上。
3. **危机内容规范**(GAME_DESIGN 六节):`category: 'crisis'` 的事件必须至少有一个 `outcomeTag: 'protocol'` 的 choice,且该 choice 的 outcome 数值变化不得整体为负。
4. **累积量读写成对**:任何被 `addFlag` 写入的 key,必须至少有一处 `flagNum` 条件读它。防止埋了累积量却从来不结算(前作 `() => false` 死结局的同类问题)。
   → M1 落地时做成了**双向**:反方向"被 `flagNum` 读的 key 必须有人写"抓的是 **key 拼错**——`clincal_hours` 这种 typo 会让整条支线永久不触发,而且因为条件恒假,simulate 里连异常都看不到。两个方向的漏检代价一样大。
5. **诚信线必须有回收**:`integrity_risk` 的每一次增量事件,内容库里必须存在读取该值的后期事件。
6. **术语与时代一致性**(本作特色,读 `glossary.ts`):
   - 每个术语有正确写法 + 生效年份区间。`心理咨询师二级` 在 2017 年之后的事件文本里出现 → error。
   - `心理咨询师` / `心理治疗师` / `精神科医生` 不得混用;咨询师文本中不得出现开处方。
   - 量表、期刊、分区、职称的写法必须与术语表一致(`WAIS-IV` 不是 `韦氏四`)。
   - 这条规则直接保护"圈内向不解释术语"的产品定位——写错术语比不写更伤沉浸感。
7. **领域/取向 flag 必须在注册表内**,防止手写 typo 导致整条支线永久不触发。
8. **投入项可达性**:每个 `AllocationItem` 的 `availableWhen` 在 simulate 中至少被满足过一次。

真实素材专属规则(GAME_DESIGN 十九节):

9. **引用必须已核对**:任何 `Citation.verified !== true` → **error**,构建失败。核对台账 `content/src/citations/LEDGER.md` 里必须有对应条目(引用 id + 核对人 + 日期)。这是二十二节第 10 条"把真实文献的结论写反是最不能犯的错"的机械保障。
10. **人名黑名单**:维护一份真实心理学研究者姓名表(取自 `Citation.authors` 的姓氏集合 + 手工补充)。这些姓名**只允许出现在 `Citation` 结构里**,一旦出现在 `GameEvent.title/text`、导师定义、NPC 定义、结局文案中 → error。防止虚构行为被挂到真实可查个体身上。
11. **导师必须虚构 + 必须挂真实建制**:`AdvisorDef` 的姓名不得命中人名黑名单;其 `institutionId` 必须指向真实存在的 `Institution` 条目。两条一起,才是 19.2 的完整落地。
12. **院校条款声明存在**:`GRAD_APPLY` 与 `JOB_MARKET` 的 ViewModel 必须携带非空的游戏化声明文案,`validate` 检查该文案存在且非空。
13. **`Foundation` 时间线一致性**:
    - `replicationFailure.year` 必须落在游戏时间线内(2014–2034),否则该 foundation 永远不会塌,机制形同虚设 → warning。
    - 每个会塌的 foundation 必须存在对应的塌方事件(四个选项齐全:硬发 / 改故事 / 做重复 / 放弃),缺任一选项 → error。
    - `origin.year < replicationFailure.year`,且两条引用都必须 `verified`。
14. **院校数据完整性**:每个 `Institution` 的 `domains` 必须与领域注册表对齐;每个 `Position.requires` 在 simulate 中至少被满足过一次(否则这个职位永远拿不到)。
15. **清单规模下限**:`GRAD_APPLY` 的每种 `kind` 至少 8 个可选机构,`JOB_MARKET` 至少 20 个 `Position` 且国内/海外各 ≥8。低于此数则清单选择退化成"没得选"。

社会层与 drama 专属规则(GAME_DESIGN 十三、十四节):

16. **竞争者交汇点齐全**:`RivalState.encounters` 里声明的五个交汇点,每一个都必须有对应的内容事件;缺任一 → error。且每个交汇点的事件必须存在"他领先"与"你领先"两种版本(用 `{ rival: { aheadOfPlayer } }` 条件)。
17. **人情必须能兑现**:每种 `Favor.direction` 至少有一处 `settleFavor` 的兑现事件读它。只能欠不能还的人情账是死机制(与规则 4 同源)。
18. **`RumorDef` 真伪配比**:每个 `topic` 下的情报,`accurate: true` 与 `false` 的比例必须落在 40%–70% 之间。全真 = 情报变成攻略;全假 = 玩家学会无视它。
19. **`accurate` 不得泄漏**:静态检查 `view()` 及其调用链上没有任何路径把 `RumorDef.accurate` 写进 ViewModel。这条是 13.3 的支点,必须机械守住。
20. **Drama 事件"两边都有道理"**:`category: 'drama'` 的事件,**每个 choice 的 outcome 数值变化必须有正有负**(不允许存在一个纯优势选项)。这是 14.1 第 1 条的机械化版本——如果一个选项明显正确,它就不是 drama,是道德测试题。
21. **黑天鹅配额与处置空间**:`category: 'blackswan'` 的事件必须 ≥2 个真实可行的选项,且不得包含 `triggerEnding` effect(14.4 第 2、3 条)。
22. **换导师窗口必须一直开着**:`switchAdvisor` 至少有一个 `costTier: 'late'` 的入口存在,否则"代价极高但始终可行"就变成了"后期不可行"。

跨局差异规则(GAME_DESIGN 二十节):

23. **叙事功能位候选数下限**:每个 `slot` 至少 3 个候选事件(3 倍超配),不足 → error。功能位是新增的内容组织单位,见 4.7.4。
24. **强制时代节点必须是变体池**:`mandatory: true` 且无 `variantGroup` 的事件 → error。每个 `variantGroup` 至少 3 个成员,**且成员的 `trigger` 不得全部只靠 `{ chance }` 区分**——必须至少有 2 个成员按真实处境(领域/导师/路径/背景/特质)分流。这条守的是"按处境分流,不是随机换皮"。
25. **构筑维度专属事件配额**(GAME_DESIGN 20.3③):每个研究领域 ≥6、每个临床取向 ≥5、每个导师原型 ≥8、每个学院归属 ≥4(本科阶段)、每个培养路径 ≥10。统计方式是"`trigger` 或 `visibleIf` 中必然要求该维度"的事件数,复用前作 `requiredTraitLabel` 的条件树静态分析。
26. **管线阶段的领域覆盖**:课题管线的 `collect` / `analyze` 两个阶段,每个研究领域至少各有 2 个专属事件。这两个阶段是领域差异最能体现的地方(fMRI 抢机时 vs 问卷星 vs 幼儿园排期),不允许全领域共用一套文案。
27. **参数化文案纪律**(半自动):管线阶段事件的正文若不含任何插值占位符(课题名 / 年数 / 导师 / 竞争者),报 **warning** 并列入待改清单。这是 20.2"文案必须写成参数化的"的机械提醒——它是本作对抗重复感最便宜的一层,不能靠自觉。

本科与课程规则(GAME_DESIGN 八节):

28. **能力标签必须被读**:每个 `Course.masteryFlag` 至少有一处 `{ flag }` 条件读它(规则 4 的特例,但要单独报,因为课程系统的全部意义就在这里)。
29. **"假装听懂"选项成对**:任何用 `{ flag: 'mastered_*' }` 做 `visibleIf` 的选项,同一事件必须有一个用 `{ not: { flag: 同一个 } }` 的对应选项。**不允许出现"没学通就没得选"的事件**——现实里那些人也在做决定。
30. **两座大山有小测,其余没有**:`finalExam` 只允许出现在心理统计与实验心理学两门课上。这条防的是"每门课都考一道"的蔓延(GAME_DESIGN 8.2 的节奏决定)。
31. **门槛时间不对称必须成立**:实验室投入项的 `availableWhen` 必须在大二开放,咨询中心必须在大三,且各自要求对应的 `masteryFlag` 或修课记录。这条把 8.3 的核心设计固定下来,防止后续调参时被无意抹平。
32. **本科危机事件唯一性**:标记 `once: true` 且不得有 `variantGroup`,不得进任何随机池或功能位候选(GAME_DESIGN 8.9)。它是全局唯一一次。

工作台规则(GAME_DESIGN 四节、七节):

33. **每个 `AllocationItem` 必须有非空 `payoff`**。这一格花什么、换什么、风险在哪,必须写出来(4.6 借来的那一条)。落地时是一次性的内容补齐,项数不多。
34. **毕业指标的两种写法必须一致**:`graduationBar` 与 `graduationReq` 要么都有要么都无;`graduationReq.papers` / `topTier` 的数字必须在 `graduationBar` 文案里出现。**两份数据说两件事,是这一行最容易写出来又最难发现的错。**
35. **原型的两条防泄漏检查**(GAME_DESIGN 七节。配套沿用已有的"`archetype` 不进 ViewModel"单测——**三条缺一不可:一条防直接泄漏,两条防间接指认**):
    - **可及性档位的映射必须多对一**:三档里每一档至少落 2 个原型。否则玩家看一眼面板就知道抽到了谁。
    - **每个原型的「寻求指导」结果 ≥2 种,且至少一种与另一个原型的某种结果同属一类**(用 `outcomeTag` 标类)。一次问出结论,换导师窗口那个张力就没了——这一格是渐进揭示通道,不是揭示按钮。
36. **工作台不得泄漏精确数值**:`DESK` 的 ViewModel 序列化后不得含 `quality` / `alliance` / `favor` 的原始数字。照 M3.5 那条"不含 `"chance": 0.x`"的单测写法,静态检查 `systems/desk.ts` 的出参。
37. **`DESK_ACTION` 不许花精力格**:每个 `actionId` 都要有处理分支,且其 effects 不得包含 `grantSlots` 或写 `allocation.picks`。**花格数的一律走 `ALLOCATE`**(4.4 那张分工表的机械保障)。


### 7.2 `pnpm simulate -n 10000 --check` 新增门禁

继承前作门禁(全事件覆盖、全结局可达、无结局 >40%、兜底 ≤35%、提前结局 ≤10%、NPC 激活与完成率)。本作新增:

| 门禁 | 阈值 | 理由 |
|---|---|---|
| 六条路径均可达 | 每条 ≥3% | 防止某条线因门槛写高而实际无人能走(前作金融/心理线被 bot 采样不足的教训) |
| 长聘首考通过率 | 30%–50% | 真实感;过高则失去分量,过低则学术线不可玩 |
| 教职求职"全无 offer"率 | 20%–40% | 这是高概率的真实结果,必须真的会发生 |
| 每局平均产出论文数 | 学术线 3–9 篇 | 过少说明管线太难,过多说明可以刷 |
| | → M3 实测:`--bot score` 中位数 3(达标)、均值 2.46;`--bot random` 1.49。差的部分在博后(M5),那是真实世界产出最高的两三年。`--check` 的回归门禁按随机 bot 定在 1.2–9。 | |
| 至少一个课题彻底做废 | ≥70% 的学术线对局 | GAME_DESIGN 五节的硬约束 |
| | → M3 实测:**四种 bot 全部 ≥70%**(集中 76.4% / 分散 89.4% / 卷钱 95% / 保状态 97%)。好玩家也躲不掉,这正是这条约束想说的。 | |
| 无稳定通关策略 | 任何单一投入策略的课题失败率 ≥25% | 用 `--strategy` bot 对比验证 |
| 个案脱落率 | 15%–40% | 真实区间 |
| 耗竭提前结局率 | ≤8% | 螺旋要真的存在但不能是主要死法 |
| 撤稿结局率 | ≤3% | 诚信线终局应稀有 |
| 论文清单非空率 | 学术线 ≥95% | 结局页招牌不能开天窗 |
| **地基塌方命中率** | ≥45% 的学术线对局至少遇到 1 次 | 文献可靠性机制(19.4)是一级线机制,不能是稀有彩蛋 |
| 塌方后四选项使用分布 | 每个选项 ≥8% | "做重复实验"是隐藏最优解,但不能因门槛过高而无人可选 |
| **每个院校被选中率** | 每个 `Institution` ≥0.5% | 清单里有 24 所但实际只有 3 所可达 = 数据白做 |
| 国内 / 海外 offer 分布 | 两边各 ≥15% | 双市场必须真的都是活路,不能有一边是装饰 |
| 两体问题五种归宿分布 | 每种 ≥5%(在有伴侣的对局中) | 9.2 第 6 步"四个方向都有专属结局"的验收 |
| 市场松紧的影响幅度 | 最松年 vs 最紧年的 offer 率差 ≥15 个百分点 | 让"你只能事后推断今年行情"这件事真的有分量 |
| **玩家论文数超过竞争者** | 35%–65% 的对局 | 13.1 第 2 条:不能总赢也不能总输。偏向任一端都说明 `momentum` 基线错了 |
| 竞争者交汇点命中数 | 每局平均 ≥2.5 个 | 有对手但一年也遇不上,等于没有 |
| 人情账年均记账笔数 | 3–8 笔 | 太少则机制无感,太多则变成记账游戏 |
| 人情兑现率 | 40%–75% | 攒了一堆用不掉 = 机制空转 |
| 打听使用率 | ≥60% 的对局至少打听 3 次 | 代价定太贵就没人用;这条守的是定价 |
| **听到假消息后做错决定** | 15%–35% 的对局至少一次 | 13.3 的乐趣来源。为 0 说明假消息写得太容易识破 |
| 黑天鹅命中 | 每局 1–2 次,>2 次的对局 ≤5% | 14.4 第 1 条 |
| Drama 事件覆盖 | 每局平均 ≥3 个,且学术/临床各 ≥1 | 高强度内容不能只有少数对局能看到 |

工作台门禁(M4.6):

| 门禁 | 阈值 | 理由 |
|---|---|---|
| 「寻求指导」使用率 | 有导师的对局中 ≥60% 至少用过一次 | 三格经济里 1 格很贵。**这条守的是定价**——没人用说明标价错了,不是玩家不感兴趣 |
| 六原型的指导结果 | 每种命中 ≥1% | 那张分流表是六原型第一次被玩家主动感知到,有一格走不到就是白写 |
| 局终师生关系档位 | 最高档 ≤50% | 关系不是可以刷满的资源条。全员"亲近"= 这个面板退化成一条进度条 |
| 选刊各档使用率 | 每档 ≥10% | 有一档没人选说明档位设计或提示文案有问题 |
| 降档改投发生率 | 15%–40% | 太低 = 这个决策不存在;太高 = "一路降到能中为止"的刷法生效了 |
| 毕业指标达成率的院校分层差 | A+ 校 vs 双非 ≥15 个百分点 | 否则毕业要求只是一行装饰文案,那 27 所院校的差异仍然只活在录取那一屏 |
| 论文产出分布(选刊落地后) | 重跑一遍 7.2 里的"平均论文数"与"课题做废率" | **选刊把档位从引擎判定改成玩家判定,必然动到产出分布。** M3.3 的教训:改这类东西要配完整标定,不能只看门禁绿不绿 |

新增 bot 策略:`method`(方法优先)/ `clinical`(临床优先)/ `capital`(履历优先)/ `balanced`/ `rest`(经常休息)。**`rest` bot 必须能走完全程且拿到一个体面结局**——这是"休息是真实有效选项"的验收方式。

### 7.3 `pnpm repetition -n 300` 与内容验证

`repetition` 原样继承(相邻局 Jaccard、节奏重合、3 局独有事件比例、高频事件榜、回响命中统计),但**换主指标**(GAME_DESIGN 20.1)。

**新主指标:渲染三元组重现率。** 前作第 48 轮已经开始记录实际命中的 `presentationVariants` / `contextLines` 索引(用与 `engine.view` 相同的 `rngState` 和求值顺序),本作在此基础上把"主要处境"也记进指纹:

```
fingerprint = (eventId, presentationVariantIndex, 处境摘要)
处境摘要 = 领域 | 导师原型 | 培养路径 | 该事件针对的对象阶段(课题阶段/个案状态)
```

统计相邻两局的三元组重合率,目标 **≤15%**。这是唯一能反映玩家真实感知的指标——同一个 `eventId` 在两局里如果处境不同,不计入重复。

`repetition --check` 的门禁(全部来自 GAME_DESIGN 20.4):

| 指标 | 阈值 |
|---|---|
| **渲染三元组重现率** | **≤15%** |
| 相邻两局事件 ID 重合率(去 mandatory) | ≤30% |
| 连续 3 局独有事件比例 | ≥40% |
| **相同配置 vs 不同配置的重合率差** | **≥20 个百分点** |
| 单局内容覆盖率 | 20%–30% |
| 出现率 ≥50% 的事件有 ≥3 个感知变体 | 100% |
| 每局回响命中数 | ≥6 |
| 每个功能位各候选的命中分布 | 任一候选 ≥15% |

> "相同配置 vs 不同配置的重合率差 ≥20pp" 是本作最重要的一条重玩性门禁:**如果换了导师、换了领域、换了路径,两局的重合率没有明显下降,那所有构筑维度都是装饰。** 前作已经有"相同/不同职业+NPC 配置差异"的统计,本作把它从诊断信息提升为验收门禁,并把维度扩展到 导师原型 × 研究领域 × 临床取向 × 培养路径 × 学院归属。

本作额外统计:

- **导师原型 × 培养路径 × 领域标签**的组合覆盖率——这是本作重玩性的主要来源,应该像前作统计"职业 + NPC 配置"那样单独一栏。
- 课题管线的**阶段事件重复度**:同一个 `collect` 阶段在一局里可能被访问 6 次,阶段事件池必须足够大或有足够变体,否则"招不到被试"这一条会连着看六年。

`verify-content.ts`(照前作 `verify-npcs.ts`)接进 `pnpm test`:断言导师六原型的关系状态机各阶段可达、课题模板的领域标签合法、量表计分与分界值正确、危机事件的 protocol 选项存在且非劣势。

### 7.4 测试

vitest 单测,重点覆盖:课题阶段机的推进/回退/放弃、个案联盟与脱落、导师抽卡确定性、投入分配的校验与结算、`extendPhase` 延毕、`yearsPerRound` 年份推进、量表计分与偏差文案选取、多 `isFinal` 阶段的终局判定、同种子完整对局复现、存档重放。

前作 `packages/core/test/engine.test.ts` 有 1003 行 38 个用例,其中 RNG 确定性、DSL 求值、flow 步骤、变体组单次触发、存档迁移这几组可以直接搬。

### 7.5 CI

照前作 `.github/workflows/deploy.yml`:`typecheck && test && validate && simulate -n 10000 --check` → 构建 web → 部署 GitHub Pages。**n=10000 不要下调**,前作的注释解释了原因:0.1% 量级的稀有结局在 n≤3000 时会被泊松漏检。

---

## 八、扩展操作手册

| 我想…… | 要做的事 | 动到的层 |
|---|---|---|
| 加一个事件 | 对应池文件加 `GameEvent` → `validate` → `simulate` | 内容 |
| 加一个课题模板 | `projectTemplates` 加一条 + 相关阶段事件挂 `domain` 条件 | 内容 |
| 加一个课题阶段 | `ProjectStage` 加枚举 + `systems/project.ts` 转移规则 + 该阶段事件池 + validate 死锁检查会自动守 | 引擎(小)+ 内容 |
| 加一个导师原型 | `advisors/` 加 `AdvisorDef` + 关系状态机事件 + 可选专属结局 | 内容 |
| 加一个个案 | `caseTemplates` 加一条 + 其阶段事件 | 内容 |
| 加一条职业路径 | 新 `rounds` 阶段(标 `isFinal`)+ 事件池 + `incomes.ts` 收入规则 + 结局 + `CROSSROAD` 加一个 `jumpToPhase` 选项 | 内容 |
| 改培养年限 | 改对应阶段的 `rounds` + 补 `briefs` | 内容 |
| 加一个投入项 | `allocationItems` 加一条 `AllocationItem`,**必须写 `payoff`**(规则 33);要挂到某张卡片上就写 `target` | 内容 |
| 给工作台加一个动作 | 先问**这一格花不花精力**:花 → `allocationItems` 加一条(走 `ALLOCATE`);不花 → 加一个 `DESK_ACTION` 的 actionId + 处理分支(当场结算) | 内容(+引擎小) |
| 给某所院校配毕业要求 | `Institution.gameified.admission` 补 `graduationBar` + `graduationReq`,**两者数字必须一致**(规则 34) | 内容 |
| 加一份量表 | `inventories/` 加一条 + 触发它的 mandatory 事件 | 内容 |
| 加一个累积量 | 直接用 `addFlag` + `flagNum`,**不要**加 state 字段 | 内容 |
| 加一条情报 | `rumors/` 加 `RumorDef`(原话 + 括注 + `accurate`),注意守住该 topic 的真伪配比 40%–70% | 内容 |
| 加一个竞争者交汇点 | `systems/rival.ts` 加触发判定 + 两个版本的事件("他领先"/"你领先") | 引擎(小)+ 内容 |
| 加一个 drama 事件 | `category: 'drama'`,**每个选项都要有正有负**(validate 规则 20 会拦纯优势选项) | 内容 |
| 加一个黑天鹅 | `category: 'blackswan'`,≥2 个可行处置、禁用 `triggerEnding` | 内容 |
| 加一门课 | `courses/` 加 `Course`(真实教材名 + `masteryFlag` + 三档 outcomes),并确保至少一处条件读它的 `masteryFlag` | 内容 |
| 加一个叙事功能位 | `slots.ts` 加 `NarrativeSlot` + **≥3 个叙事等价、处境不同**的候选事件 | 内容 |
| 给时代节点补变体 | 同 `variantGroup` 加成员,且新成员的 `trigger` 要按处境分流(领域/导师/路径),不能只靠 `chance` | 内容 |
| 降低重玩重复感 | 先跑 `repetition --check` 看是哪一项超标,再定是补变体、补配额还是补参数化。**不要直接加新事件** | 内容 |
| 加一所院校 | `institutions.ts` 加一条 `Institution`(真实名称/建制/方向 + 游戏化条款区间)+ 若干 `Position` | 内容 |
| 加一篇真实文献 | `citations/` 加 `Citation`,**逐项核对作者/年份/期刊/结论方向后**置 `verified: true` 并在 `LEDGER.md` 留痕 | 内容 |
| 加一个会塌方的理论基础 | `foundations.ts` 加 `Foundation`(真实历史失败年份)+ 四选项塌方事件 + 绑定若干 `projectTemplates` | 内容 |
| 加一类跨年对象 | 才需要走 P5:新 state 字段 + 新 system + 新 DSL 分支 + 新 validate 规则 | 引擎(大) |
| 加结局 | `EndingDef` 一条,注意 priority 排位 → simulate 看到达率 | 内容 |
| 调事件节奏 | 改 `scheduler.ts` 导演系数或管线事件上限,跑 `simulate -n 10000 --check` 守覆盖 | 引擎 |
| 移植小程序 | Taro 壳 + `WxStorageAdapter` + screens 适配(前作已验证 core/content 100% 复用) | 平台层 |

---

## 九、实施里程碑

> **进度**:M0 / M1 / M2 / M2.5 / M3(含 M3.1–M3.3 实机修复)/ M3.5 / M3.6 / M4 / M4.6 / M4.5 / M5 已完成。逐轮的做了什么、抓到了什么 bug、接手要注意什么,
> 见 [AGENT_HANDOFF.md](./AGENT_HANDOFF.md);引擎相对前作的每一处改动见 [packages/core/FORK.md](./packages/core/FORK.md)。

| 里程碑 | 内容 | 验收标准 |
|---|---|---|
| **M0 fork 与骨架** | 复制 core/tools、改包名、写 `FORK.md`、五维换血、最小内容包(3 事件 1 结局)跑通 `simulate` | 命令行能自动打完一局;前作 38 个单测里可搬的部分全绿 |
| **M1 DSL 与阶段扩展** | `flagNum`/`addFlag`/`extendPhase`/`grantSlots` + `roundOpeners`/`yearsPerRound`/`nextPhaseId` + 多 `isFinal` | 单测覆盖(重点:六条路径的阶段路由不串线);validate 新增阶段路由规则 + 规则 3、4 |
| **M2 开局与本科(地基)** | 背景卡 6 张 + 特质 8 张抽 4 选 2 + 高考 + 志愿(含学院归属)+ 本科 4 年(4 格精力)+ `ALLOCATION` 屏 + **课程系统三档判定与能力标签** + 两门大山期末小测 + 学院归属四套专属事件 + 社会层三颗种子 + 本科五个时代节点(各 ≥3 变体) | 浏览器里能玩到 2018 大四三岔口;每个 `masteryFlag` 都有条件读它;四种学院归属的本科事件重合率 <60% |
| **M2.5 毕业论文教学关** | `isThesis` 简化管线(想法→收数据→分析→写作→答辩)+ `p = .08` 埋点 + `integrity_risk` 首次记账 | 玩家在大四走完一遍管线操作流程;诚信线首笔账可被后期事件读取 |
| **M3 课题管线(一级)** | `Project`/`Paper` + `systems/project.ts` + 9 个阶段事件池 + `PROJECT_BOARD` + 导师抽卡与六原型(虚构名 + 真实建制) | 能玩到博士毕业并拿到一份论文清单;simulate 报出平均论文数与做废率 |
| | → 落地时管线**合成六站**(伦理并进文献、投稿并进写作)。原因是时间预算:阶段事件按"回合开始时卡在哪一站"挑,每年只能走一两站,九站放不进五六年的硕博学制。两站的内容都没丢,挂到了相邻的站上。 | |
| **M3.5 真实素材层** | `Institution` 24 条 + `Position` 20 条 + `Citation` 种子池 + `LEDGER.md` 核对台账 + `GRAD_APPLY` 一屏三用 + `systems/admission.ts` | validate 规则 9–15 全绿;读研/读博/博后三次清单选择可玩;每所院校被选中率 ≥0.5% |
| **M3.6 文献可靠性机制** | `Foundation` ≥6 条(其中 ≥3 条在时间线内塌方)+ `systems/foundation.ts` + 四选项塌方事件 + `trait_skeptic` 提示注入 | 塌方命中率 ≥45%;四选项使用分布每个 ≥8% |
| **M4 临床线(一级)** | `ClinicalCase` + 个案/督导/个人体验/伦理/危机事件 + 危机内容规范与 validate 规则 + 真实量表与伦理守则引用 | 临床路径可完整通关;个案脱落率进入门禁区间 |
| **M5 求职季与学术终局(高光)** | 博后 + `JOB_MARKET` 七步 + **国内/海外双市场** + 市场松紧 + 推荐信分量 + offer 谈判 + 两体问题五归宿 + 预聘期 + `TENURE_REVIEW` + 学术线 9 结局 | 长聘通过率 30%–50%;"全无 offer" 20%–40%;国内/海外 offer 各 ≥15%;两体五归宿各 ≥5% |
| **M6 二级线(粗做)** | 医院 15 + 学校 8 + 大厂 8 + 体制与离开 8 事件 + 各自收入规则与 2–3 结局。**不做跨年管线** | 六条路径可达率均 ≥3%;离开学术的结局里至少 3 个是好结局 |
| **M4.6 工作台(DESK)** | `ALLOCATION` + `PROJECT_BOARD` 合并成五页签工作台 · 投入项挂到对象卡片上(`target` + `payoff`)· **导师面板 + 两到三个主动动作(六原型分流)** · 毕业进度行(`graduationBar`)· 选刊与降档改投 · 「这些年」流水 · `systems/desk.ts` | validate 规则 33–37 全绿(配反例);寻求指导使用率 ≥60%;六原型结果各 ≥1%;局终关系最高档 ≤50%;选刊各档 ≥10%;**`DESK` ViewModel 不含任何原始数值**(单测);论文产出分布重新标定 |
| **M4.5 社会层(v1 必做)** | `RivalState` + `systems/rival.ts` + 五个交汇点 · `Favor` + 贬值与净欠额惩罚 · `RumorDef` + `ASK_AROUND` action · **`SETTLEMENT` 改造成年度回顾页** · 换导师窗口与成本曲线 | validate 规则 16–22 全绿;玩家胜出率 35%–65%;打听使用率 ≥60%;假消息误导率 15%–35% |
| **M7 元玩法与隐线** | 量表自评 4 份 + 诚信线 audit 事件链 + `origin` 隐线回响 + 结局三份清单(论文/学生/来访者)+ **drama 与黑天鹅内容** | 量表偏差文案命中;撤稿结局率 ≤3%;论文清单非空率 ≥95%;每局 drama ≥3 个、黑天鹅 1–2 次 |
| **M7.5 跨局差异** | 叙事功能位(3 倍超配)+ 20 个时代节点全部转变体池 + 构筑维度专属事件配额 + 管线文案参数化 + `repetition` 换主指标 | validate 规则 23–27 全绿;渲染三元组重现率 ≤15%;**相同 vs 不同配置重合率差 ≥20pp**;单局覆盖率 20%–30% |
| **M8 打磨** | 内容填充至约 471 事件 / 34–38 结局 + `repetition` 驱动变体补齐 + 术语与时代一致性校验全绿 + 移动端适配 | 全门禁绿;可公开上线 |

> **M7.5 不是"最后再优化重玩性"**。它列在 M8 之前,但它的两条纪律必须**从 M2 就开始遵守**:①管线阶段文案一律参数化(引用课题名/年数/导师/竞争者);②每个 mandatory 时代节点从写第一版起就是变体池。事后补参数化和事后拆变体池的成本,是当初就那么写的三到五倍——前作在第 41 至 49 轮补了九轮变体池,就是这笔学费。

> **M3.5 和 M3.6 是本轮新增的两个里程碑**,把"真实院校/文献"从文案素材提升为独立的数据层和独立的机制层。它们排在临床线之前,因为求职季(M5)和课题管线(M3)都依赖 `Institution` 表和 `Foundation` 表——先建数据层,后面两个一级线才能同时受益。

> **M4.6 的编号在 M4.5 后面,但建议先做 M4.6。** 工作台是壳,社会层是往壳里填的东西:竞争者进度和人情账要显示在工作台的桌面页签上、年度回顾页的存档就是「这些年」这个页签、打听入口也挂在这一屏。反过来做的话,`SETTLEMENT` 和分配屏都要被改造两遍。**编号只是标签,顺序按依赖走。**
>
> 这条同样适用于 M5:求职季会新增 `JOB_MARKET` 七步流程,工作台先把"卡片流 + 明码标价 + 模糊档位"这套排版语言定下来,那七步就是照着抄。

---

## 十、技术选型与非目标

选型与前作完全一致:TypeScript(strict + `noUncheckedIndexedAccess`)· pnpm workspace · React 18 + Vite · Zustand · zod · vitest · mulberry32 · GitHub Pages。理由见前作 `TECH_ARCHITECTURE.md` 第九节,不重复论证。

**非目标(明确不做)**:后端与账号系统 · 运行时 LLM 调用 · 多语言 · 移动原生 App · 真实心理测评服务 · 任何形式的诊断功能。

最后一条是硬红线:本作使用真实量表的**题目形态**来做叙事,但它是一个游戏。所有量表屏必须带免责提示,首屏与结局页各放一次真实求助信息,`validate` 检查这两处文案存在。
