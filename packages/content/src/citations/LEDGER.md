# 文献核对台账

`Citation.verified === true` 是**进入构建的必要条件**（validate 规则 9），而这张表是它的凭据。
每一条引用在这里必须有一行，记：核对人、核对日期、核到了什么程度。

> **这张表存在的理由**：GAME_DESIGN 二十二节第 10 条——**把真实文献的结论写反是这个游戏最不能犯的错。**
> 一个讲科研诚信的游戏如果自己把文献说错了，它讲的每一句话都不成立。
> 没有台账的话，`verified: true` 就只是一个谁都能敲上去的布尔值。

## 两级核对

| 级别 | 含义 | 谁做 |
|---|---|---|
| **初核** | 作者姓氏、年份、期刊、**结论方向**四项与领域常识一致；`gist` 不含需要翻原文才能确认的精确数值 | 内容作者（本轮：Claude，依据模型知识，**未联网、未查原文**） |
| **复核** | 对照原文或权威数据库逐项确认 | **人工，尚未进行** |

**当前所有条目只过了初核。** 公开发布前需要人工复核一遍——这正是这张表要留在仓库里的原因。

### 初核实际用的标准

只收**这一行的路标性文献**：作者、年份、期刊、结论方向属于领域常识，不需要翻原文才能确认。
凡是要靠记忆去补精确细节的，一律没有收进池子——**记错一个卷期和记错一个结论，在这里是同一类错误。**

`gist` 一律写**结论方向**，不写具体数字：

- ✅「大规模重复只有一部分复现」——方向，写错了会被人一眼看出
- ❌「复现率 36%」——精确值，写错了不会被一眼看出

**不会被一眼看出的错误才是危险的**，所以这个池子里没有精确值。

## 台账

| 引用 id | 文献 | 初核人 | 初核日期 | 人工复核 |
|---|---|---|---|---|
| `cit_bem_2011` | Bem (2011), JPSP | Claude | 2026-07-27 | ☐ |
| `cit_simmons_2011` | Simmons, Nelson & Simonsohn (2011), Psychological Science | Claude | 2026-07-27 | ☐ |
| `cit_osc_2015` | Open Science Collaboration (2015), Science | Claude | 2026-07-27 | ☐ |
| `cit_ioannidis_2005` | Ioannidis (2005), PLoS Medicine | Claude | 2026-07-27 | ☐ |
| `cit_meehl_1978` | Meehl (1978), J. Consulting and Clinical Psychology | Claude | 2026-07-27 | ☐ |
| `cit_cohen_1992` | Cohen (1992), Psychological Bulletin | Claude | 2026-07-27 | ☐ |
| `cit_baron_kenny_1986` | Baron & Kenny (1986), JPSP | Claude | 2026-07-27 | ☐ |
| `cit_bh_1995` | Benjamini & Hochberg (1995), JRSS-B | Claude | 2026-07-27 | ☐ |
| `cit_carney_2010` | Carney, Cuddy & Yap (2010), Psychological Science | Claude | 2026-07-27 | ☐ |
| `cit_ranehill_2015` | Ranehill et al. (2015), Psychological Science | Claude | 2026-07-27 | ☐ |

## 加一条文献的流程

1. 逐项核对**作者姓氏 / 年份 / 期刊 / 结论方向**。四项有一项拿不准，就不要收——池子小不是问题，池子错才是。
2. `gist` 写结论方向，不写精确数值。
3. 在上表加一行，填初核人与日期。
4. 置 `verified: true`。**顺序不能反**：先有台账行，后有 `true`。

## 历史年份的额外要求

`Foundation.replicationFailure.year` **必须是真实历史年份**，不是"大概那几年"。
机制的全部说服力来自它和玩家在游戏里的时间线真的对得上——玩家 2016 年选了那个方向，
他后面几年遇到的事就该是那几年真实发生的事。年份错了，这个机制就从"真实"变成"编排"。
