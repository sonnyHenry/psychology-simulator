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
| `cit_baumeister_1998` | Baumeister, Bratslavsky, Muraven & Tice (1998), JPSP | Claude | 2026-07-27 | ☐ |
| `cit_vohs_2021` | Vohs et al. (2021), Psychological Science | Claude | 2026-07-27 | ☐ |
| `cit_bargh_1996` | Bargh, Chen & Burrows (1996), JPSP | Claude | 2026-07-27 | ☐ |
| `cit_ml2_2018` | Klein et al. (2018), AMPPS(Many Labs 2) | Claude | 2026-07-27 | ☐ |
| `cit_blackwell_2007` | Blackwell, Trzesniewski & Dweck (2007), Child Development | Claude | 2026-07-27 | ☐ |
| `cit_yeager_2019` | Yeager et al. (2019), Nature | Claude | 2026-07-27 | ☐ |
| `cit_vul_2009` | Vul, Harris, Winkielman & Pashler (2009), Perspectives on Psychological Science | Claude | 2026-07-27 | ☐ |
| `cit_marek_2022` | Marek et al. (2022), Nature | Claude | 2026-07-27 | ☐ |
| `cit_cepeda_2006` | Cepeda et al. (2006), Psychological Bulletin | Claude | 2026-07-27 | ☐ |
| `cit_carney_2010` | Carney, Cuddy & Yap (2010), Psychological Science | Claude | 2026-07-27 | ☐ |
| `cit_ranehill_2015` | Ranehill et al. (2015), Psychological Science | Claude | 2026-07-27 | ☐ |
| `cit_bordin_1979` | Bordin (1979), Psychotherapy: Theory, Research & Practice | Claude | 2026-07-28 | ☐ |
| `cit_cps_ethics_2018` | 中国心理学会《临床与咨询心理学工作伦理守则(第二版)》(2018) | Claude | 2026-07-28 | ☐ |
| `cit_mental_health_law_2013` | 《中华人民共和国精神卫生法》(2013 年施行) | Claude | 2026-07-28 | ☐ |

## M4 追加的三条:临床线的两块地基

**`cit_bordin_1979` 是 `alliance` 变量的理论出处。** GAME_DESIGN 19.3 明确要求:
"机制不是凭空设计的,这一点应该在游戏里被一个督导事件点出来"——那个事件是
`ev_cs2_bordin`(督导在白板上写下任务/目标/纽带)。**事件文案不写姓氏**
(引用池作者自动进人名黑名单),只写"1979 年就有人把它拆开了"。

**后两条是制度文献,不是实证文献。** 初核口径相应调整:核对的是**颁布主体、
年份、关键条款的方向**(伦理守则第二版 2018 年发布;精神卫生法 2013 年 5 月施行,
其中"心理咨询人员不得从事心理治疗或者精神障碍的诊断、治疗"是临床线
"咨询师不下诊断"这批文案的法律依据)。同样只写方向,不引条文原文。

## 加一条文献的流程

1. 逐项核对**作者姓氏 / 年份 / 期刊 / 结论方向**。四项有一项拿不准，就不要收——池子小不是问题，池子错才是。
2. `gist` 写结论方向，不写精确数值。
3. 在上表加一行，填初核人与日期。
4. 置 `verified: true`。**顺序不能反**：先有台账行，后有 `true`。

## 历史年份的额外要求

`Foundation.replicationFailure.year` **必须是真实历史年份**，不是"大概那几年"。
机制的全部说服力来自它和玩家在游戏里的时间线真的对得上——玩家 2016 年选了那个方向，
他后面几年遇到的事就该是那几年真实发生的事。年份错了，这个机制就从"真实"变成"编排"。

## M3.6 追加的九条:为什么是这几篇

文献可靠性机制(19.4)要求塌方年份是**真实历史年份**,而且要落在课题活着的那几年
(2019–2024)。所以这一批不是按"哪篇有名"挑的,是按**"它的重复失败发生在玩家在场的时候"**挑的:

| 基础 | 原始 | 重复失败 | 落点 |
|---|---|---|---|
| 自我损耗 | Baumeister et al. 1998 | Vohs et al. **2021** | 读研中段 |
| 成长型思维 | Blackwell et al. 2007 | Yeager et al. **2019** | 研一 |
| 小样本脑—行为相关 | Vul et al. 2009 | Marek et al. **2022** | 读博 |
| 行为启动 | Bargh et al. 1996 | Klein et al. **2018** | 课题窗口之前,不分配 |
| 高权力姿势 | Carney et al. 2010 | Ranehill et al. **2015** | 课题窗口之前,不分配 |

后两条 `assignable: false`——它们塌的时候玩家手上还没有能被砸中的东西,
所以它们的位置是**时代节点**(你读到了那篇),不是"你的地基塌了"。

### 两条需要说明的

**`cit_yeager_2019` 的方向不是"塌了",是"比所有人以为的小得多"。** `gist` 严格照这个写:
效应真实、但很小、且集中在特定学生群体。事件文案也照这个写——把它说成"成长型思维是假的"
就是把文献结论写反,而那正是这个游戏最不能犯的错。

**`fnd_small_n_brain` 的 `origin` 是一篇批评文章,不是一个效应的原始文献。**
因为这一条的"地基"是**一套做法**(小样本脑—行为相关),不是某个具体效应。
对一套做法来说,最早系统指出它有问题的那篇就是这场争论的起点。
这是这张表里唯一一处 `origin` 的语义偏离,单独记在这里。
