# 心理学模拟器

从 2014 年高考报志愿开始,一路走到教职或长聘的心理学从业者生涯模拟器。

学术线与临床线是两条一级精度的线;其余路径(医院、独立咨询、学校心理教师、大厂用研/产品、离开这一行)粗做但可达。

- 玩法与内容设计:[GAME_DESIGN.md](./GAME_DESIGN.md)
- 技术架构与里程碑:[TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md)
- 引擎的来历与改动清单:[packages/core/FORK.md](./packages/core/FORK.md)
- 逐轮开发交接记录:[AGENT_HANDOFF.md](./AGENT_HANDOFF.md) ← **后续模型接手时先读这个**

引擎 fork 自前作《2014:我的十二年》(`life-simulator-2014`)的 `47cb3f4`,之后独立演进。

## 结构

- `packages/core` — 游戏引擎(纯 TS,零平台依赖,禁止 import react/dom/wx)
- `packages/content` — 游戏内容(纯数据)
- `packages/tools` — 校验与模拟 CLI
- `packages/web` — Web 前端(React 18 + Vite + Zustand)

## 命令

```bash
pnpm install
pnpm dev                         # 启动 Web 开发服务器 http://localhost:5173
pnpm typecheck                   # 三个包的 tsc --noEmit
pnpm test                        # core 单测 + NPC 线路专项验证
pnpm validate                    # 内容包静态校验
pnpm simulate -- -n 500          # 批量自动打局,输出结局分布与数值分位
pnpm simulate -- --verbose --seed 7   # 打一局并打印全过程
pnpm repetition -- -n 60         # 跨局重复度看板
```

`pnpm simulate -- --check`(分布与可达性门禁)从 M2 起生效。

## 当前进度

**M0 → M3 完成**。现在可以从 2014 年 6 月填志愿一路玩到**博士毕业**,并拿到一份自己的论文清单。

- 引擎 fork 干净、五维换血、阶段路由显式(七条路径不串线)、多终局并存
- DSL:`flagNum` / `addFlag` / `extendPhase` / `grantSlots`
- **本科四年**:四格精力的年度投入分配 · 15 门课的三档判定与能力标签 · 两座大山的期末小测
  · 门槛开放时间不对称(实验室比咨询中心早开一年)· 51 个本科事件
- **大四三岔口**:人生取向五选一 + 七条路径,门控读本科四年攒下的东西
- **毕业论文**:课题管线的教学关(想法 → 收数据 → 分析 → 写作 → 答辩),
  含那个 `p = .08` 的决定和诚信线的第一笔账
- **课题管线**:六站的跨年课题对象、17 个阶段事件、自动发表与论文档位;
  推进由引擎掷骰(方法 × 导师 × 投入格数),**每一站至少两成失败率**——课题不能被稳定通关
- **导师**:六个原型,抽卡时只给公开印象,真实体验要两三年才揭示完
- **硕士 3 年 → 硕士岔口 → 博士 3 年,或直博 5 年**,六个博士毕业结局
- 91 个单测 · validate 反例自测 25/25 · `simulate --check` 全绿 · web 可玩

下一步 M3.5:真实素材层(`Institution` 24 条 + `Citation` 核对台账 + `GRAD_APPLY` 一屏三用)。
