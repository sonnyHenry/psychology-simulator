import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentPack, GameEvent } from '@psy-sim/core';
import { contentPack } from '@psy-sim/content';

/**
 * validate 的反例自测:每条规则喂一个应该让它变红的内容包,断言它真的红了。
 *
 * 为什么需要这个:**从来不报错的检查和没有检查是一回事**。fork 之后前作那条
 * `NPC_TAG_PREFIXES` 完备性检查就一直在空转(本作没有那些前缀的标签),
 * 而它看起来跟别的规则一样是绿的。规则越多,这种沉默失效越难发现。
 *
 * 新增一条 validate 规则时,顺手在 `CASES` 里加一个反例。
 */

const here = fileURLToPath(new URL('.', import.meta.url));
const validateEntry = join(here, 'validate.ts');
const fixtureDir = mkdtempSync(join(tmpdir(), 'psy-validate-'));

/** 深拷贝真内容包。JSON 拷贝会丢掉 fns,所以反例里不要用 fn 条件/效果。 */
function clonePack(): ContentPack {
  return JSON.parse(JSON.stringify(contentPack)) as ContentPack;
}

function firstRoundsPhase(pack: ContentPack) {
  const phase = pack.timeline.find(p => p.kind === 'rounds');
  if (phase?.kind !== 'rounds') throw new Error('内容包里没有 rounds 阶段,反例夹具需要更新');
  return phase;
}

/** 第一个 `isFinal` 阶段。`firstRoundsPhase` 在本作里返回的是 `undergrad`,那个**不是**终局。 */
function firstFinalPhase(pack: ContentPack) {
  const phase = pack.timeline.find(p => p.kind === 'rounds' && p.isFinal);
  if (phase?.kind !== 'rounds') throw new Error('内容包里没有终局阶段,反例夹具需要更新');
  return phase;
}

function firstFlowPhase(pack: ContentPack) {
  const phase = pack.timeline.find(p => p.kind === 'flow');
  if (phase?.kind !== 'flow') throw new Error('内容包里没有 flow 阶段,反例夹具需要更新');
  return phase;
}

/** 一个数值变化可见、结构合法的最小事件,用来往内容包里塞反例 */
function stubEvent(id: string, overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id,
    pools: ['undergrad'],
    title: id,
    text: id,
    choices: [
      {
        id: 'a',
        text: 'A',
        outcomes: [{ weight: 1, text: 'A', effects: [{ stats: { state: -1 } }] }],
      },
    ],
    ...overrides,
  };
}

interface Case {
  /** 规则名,只用于输出 */
  rule: string;
  /** 把内容包改坏 */
  break: (pack: ContentPack) => void;
  /** 期望在 validate 输出里出现的片段 */
  expect: string;
}

const CASES: Case[] = [
  // ── 真实素材层(M3.5,规则 9–15)──────────────────────────────
  //
  // 这七条守的是**内容真实性**,它们能拦住的错误都不会崩、不会红、玩家也不会立刻发现,
  // 但发布出去伤的是真实的人或真实的文献。**所以它们比别的规则更需要反例证明自己活着。**
  {
    rule: '规则 9:引用没核对就进构建',
    break: pack => {
      const cit = pack.citations?.[0];
      if (!cit) throw new Error('引用池是空的,反例夹具需要更新');
      cit.verified = false;
    },
    expect: '引用未核对',
  },
  {
    rule: '规则 9:引用在 LEDGER.md 里没有条目',
    break: pack => {
      const cit = pack.citations?.[0];
      if (!cit) throw new Error('引用池是空的');
      cit.id = 'cit_not_in_ledger';
    },
    expect: '没有核对条目',
  },
  {
    rule: '规则 10:正文出现真实研究者姓名',
    break: pack => {
      const ev = pack.events[0];
      if (!ev) throw new Error('事件池是空的');
      ev.text = `${ev.text}\n\n那天 Wagenmakers 在推特上说了一句话。`;
    },
    expect: '正文出现真实研究者姓名',
  },
  {
    rule: '规则 10:白名单人名被当成人物(书名可以,让作者开口不行)',
    break: pack => {
      const ev = pack.events[0];
      if (!ev) throw new Error('事件池是空的');
      ev.text = `${ev.text}\n\n张厚粲说你这个设计有问题。`;
    },
    expect: '被当成人物使用',
  },
  {
    rule: '规则 11:导师姓名命中真实人名',
    break: pack => {
      const adv = pack.advisors?.[0];
      if (!adv) throw new Error('导师表是空的');
      adv.name = 'Wagenmakers';
    },
    expect: '导师姓名命中真实人名',
  },
  {
    rule: '规则 11:导师挂在不存在的机构上',
    break: pack => {
      const adv = pack.advisors?.[0];
      if (!adv) throw new Error('导师表是空的');
      adv.institutionId = 'inst_nowhere';
    },
    expect: 'institutionId 指向不存在的机构',
  },
  {
    rule: '规则 12:游戏化条款声明被删掉',
    break: pack => {
      pack.gameifiedTermsNotice = '   ';
    },
    expect: '没有 gameifiedTermsNotice',
  },
  {
    rule: '规则 13:有 GRAD_APPLY 步骤却没写 gradApplyKind',
    break: pack => {
      const phase = pack.timeline.find(p => p.kind === 'flow' && p.steps.includes('GRAD_APPLY'));
      if (phase?.kind !== 'flow') throw new Error('没有 GRAD_APPLY 阶段');
      delete phase.gradApplyKind;
    },
    expect: '没写 gradApplyKind',
  },
  {
    rule: '规则 14:机构的 domain 不在注册表里',
    break: pack => {
      const inst = pack.institutions?.[0];
      if (!inst) throw new Error('院校表是空的');
      inst.domains = ['domain_typo'];
    },
    expect: 'domain 不在注册表里',
  },
  {
    rule: '规则 14:职位挂在不存在的机构上',
    break: pack => {
      const pos = pack.positions?.[0];
      if (!pos) throw new Error('职位表是空的');
      pos.institutionId = 'inst_nowhere';
    },
    expect: '指向不存在的机构',
  },
  {
    rule: '规则 15:某种申请的可选院校不足 8 所',
    break: pack => {
      for (const inst of pack.institutions ?? []) {
        inst.admits = inst.admits.filter(k => k !== 'master');
      }
      const keep = (pack.institutions ?? []).slice(0, 3);
      for (const inst of keep) inst.admits = [...inst.admits, 'master'];
    },
    expect: '清单选择退化成没得选',
  },

  // ── 阶段路由(M1)────────────────────────────────────────────
  {
    rule: '非终局阶段漏写 nextPhaseId',
    break: pack => {
      delete firstFlowPhase(pack).nextPhaseId;
    },
    expect: '阶段路由必须显式声明',
  },
  {
    rule: 'nextPhaseId 指向不存在的阶段',
    break: pack => {
      firstFlowPhase(pack).nextPhaseId = 'no_such_phase';
    },
    expect: 'unknown nextPhaseId: no_such_phase',
  },
  {
    rule: '终局阶段不该有 nextPhaseId',
    break: pack => {
      firstFinalPhase(pack).nextPhaseId = 'gaokao';
    },
    expect: 'must not have nextPhaseId',
  },
  {
    rule: '没有任何终局阶段',
    break: pack => {
      // 本作有七个终局阶段(七条路径各一个),所以要摘掉**全部**才构成"没有终局"。
      // 同时都接上路由,否则会先被"漏写 nextPhaseId"那条抓到。
      for (const phase of pack.timeline) {
        if (phase.kind !== 'rounds') continue;
        delete phase.isFinal;
        phase.nextPhaseId = phase.nextPhaseId ?? 'undergrad';
      }
    },
    expect: 'timeline has no final phase',
  },
  {
    rule: '存在不可达的死阶段',
    break: pack => {
      pack.timeline.push({
        kind: 'rounds',
        id: 'orphan',
        label: '孤岛',
        date: { year: 2020, month: 9 },
        rounds: 1,
        eventSlots: 1,
        pools: ['undergrad'],
        briefs: ['孤岛'],
        isFinal: true,
      });
    },
    expect: 'phase is unreachable',
  },
  {
    rule: '存在走不到终局的阶段(两阶段互指成环)',
    break: pack => {
      // 终局阶段照旧存在,只是这个环绕不到它。靠 jumpToPhase 让环变成可达的,
      // 否则会先被"不可达死阶段"那条抓到 —— 两条规则查的是相反的方向,不能互相遮蔽。
      for (const id of ['loop_a', 'loop_b'] as const) {
        pack.timeline.push({
          kind: 'rounds',
          id,
          label: id,
          date: { year: 2020, month: 9 },
          rounds: 1,
          eventSlots: 1,
          pools: ['undergrad'],
          briefs: [id],
          nextPhaseId: id === 'loop_a' ? 'loop_b' : 'loop_a',
        });
      }
      // 事件的池子必须和某个阶段对得上,否则这条 jump 边不存在(边模型按池子归属)
      pack.events.push(
        stubEvent('ev_jump_into_loop', {
          pools: ['undergrad'],
          choices: [
            {
              id: 'a',
              text: 'A',
              outcomes: [
                { weight: 1, text: 'A', effects: [{ stats: { state: -1 } }, { jumpToPhase: 'loop_a' }] },
              ],
            },
          ],
        }),
      );
    },
    expect: 'can never reach a final phase',
  },

  // ── 规则 4:累积量读写成对 ──────────────────────────────────
  {
    rule: '累积量只写不读',
    break: pack => {
      // key 要选一个真内容包里**没人读**的。用 `burnout` 不行——M2 起它已经有读取点了。
      pack.events.push(
        stubEvent('ev_write_only', {
          choices: [
            {
              id: 'a',
              text: 'A',
              outcomes: [
                {
                  weight: 1,
                  text: 'A',
                  effects: [{ stats: { state: -1 } }, { addFlag: { key: 'nobody_reads_this', delta: 10 } }],
                },
              ],
            },
          ],
        }),
      );
    },
    expect: '被写入但从来没有条件读它',
  },
  {
    rule: '累积量只读不写(key 拼错)',
    break: pack => {
      pack.events.push(
        stubEvent('ev_read_only', { trigger: { flagNum: { key: 'clincal_hours', op: '>=', value: 100 } } }),
      );
    },
    expect: '被条件读取但从来没有人写它',
  },
  {
    rule: '累积量读写成对时不该报错(阳性对照)',
    break: pack => {
      pack.events.push(
        stubEvent('ev_paired_write', {
          choices: [
            {
              id: 'a',
              text: 'A',
              outcomes: [
                {
                  weight: 1,
                  text: 'A',
                  effects: [{ stats: { state: -1 } }, { addFlag: { key: 'paired_key', delta: 10 } }],
                },
              ],
            },
          ],
        }),
        stubEvent('ev_paired_read', { trigger: { flagNum: { key: 'paired_key', op: '>=', value: 60 } } }),
      );
    },
    expect: '', // 空字符串 = 期望 0 errors
  },

  // ── 规则 3:危机内容规范 ────────────────────────────────────
  {
    rule: '危机事件没有照规程走的选项',
    break: pack => {
      pack.events.push(stubEvent('ev_crisis_no_protocol', { category: 'crisis' }));
    },
    expect: "缺少 outcomeTag: 'protocol' 的选项",
  },
  {
    rule: '危机事件的规程选项数值期望为负',
    break: pack => {
      pack.events.push(
        stubEvent('ev_crisis_bad_protocol', {
          category: 'crisis',
          choices: [
            {
              id: 'protocol',
              text: '按规程上报并转介',
              outcomes: [
                {
                  weight: 1,
                  text: '你按规程做了',
                  outcomeTag: 'protocol',
                  effects: [{ stats: { state: -8, capital: -3 } }],
                },
              ],
            },
          ],
        }),
      );
    },
    expect: '等于在教玩家别按规范做',
  },

  // ── DSL 参数合法性 ─────────────────────────────────────────
  {
    rule: 'addFlag delta 为 0',
    break: pack => {
      pack.events.push(
        stubEvent('ev_noop_addflag', {
          choices: [
            {
              id: 'a',
              text: 'A',
              outcomes: [
                {
                  weight: 1,
                  text: 'A',
                  effects: [{ stats: { state: -1 } }, { addFlag: { key: 'burnout', delta: 0 } }],
                },
              ],
            },
          ],
        }),
        stubEvent('ev_noop_reader', { trigger: { flagNum: { key: 'burnout', op: '>=', value: 1 } } }),
      );
    },
    expect: 'no-op addFlag',
  },
  {
    rule: 'extendPhase 轮数非正',
    break: pack => {
      pack.events.push(
        stubEvent('ev_bad_extend', {
          choices: [
            {
              id: 'a',
              text: 'A',
              outcomes: [
                {
                  weight: 1,
                  text: 'A',
                  effects: [{ stats: { state: -1 } }, { extendPhase: { rounds: 0 } }],
                },
              ],
            },
          ],
        }),
      );
    },
    expect: 'non-positive extendPhase rounds',
  },
  {
    rule: 'yearsPerRound 小于 1',
    break: pack => {
      firstRoundsPhase(pack).yearsPerRound = 0;
    },
    expect: 'invalid yearsPerRound',
  },

  // ── 规则 28–32:课程系统与本科纪律(M2)────────────────────
  {
    rule: '能力标签没有任何条件读它(规则 28)',
    break: pack => {
      pack.courses = [
        ...(pack.courses ?? []),
        {
          id: 'crs_orphan',
          label: '没人读的课',
          year: 1,
          statKey: 'method',
          masteryFlag: 'mastered_orphan',
          outcomes: {
            mastered: [{ stats: { method: 1 } }],
            passed: [{ stats: { method: 1 } }],
            failed: [{ stats: { state: -1 } }],
          },
        },
      ];
    },
    expect: '没有任何条件读它',
  },
  {
    rule: '"假装听懂"选项没有成对(规则 29)',
    break: pack => {
      pack.events.push(
        stubEvent('ev_no_counterpart', {
          choices: [
            {
              id: 'only_if_mastered',
              text: '只有学通的人能选',
              visibleIf: { flag: 'mastered_stats' },
              outcomes: [{ weight: 1, text: 'A', effects: [{ stats: { method: 1 } }] }],
            },
          ],
        }),
      );
    },
    expect: '没有 not(mastered_stats) 的对应选项',
  },
  {
    rule: '两座大山以外的课有期末小测(规则 30)',
    break: pack => {
      const course = (pack.courses ?? []).find(c => c.id === 'crs_abnormal');
      if (!course) throw new Error('反例夹具需要更新:内容包里没有 crs_abnormal');
      course.finalExam = { questionIds: ['cq_stats_pvalue'] };
    },
    expect: '只有心理统计与实验心理学允许有期末小测',
  },
  {
    rule: '危机事件进了变体池(规则 32)',
    break: pack => {
      const crisis = pack.events.find(e => e.category === 'crisis');
      if (!crisis) throw new Error('反例夹具需要更新:内容包里没有 crisis 事件');
      crisis.variantGroup = 'some_group';
    },
    expect: '危机事件不得进变体池',
  },
  {
    rule: '变体池成员少于 3 个(规则 24)',
    break: pack => {
      pack.events.push(stubEvent('ev_lonely_variant', { variantGroup: 'lonely_group' }));
    },
    expect: '只有 1 个成员(要求 ≥3)',
  },
  // ── 规则 1:课题阶段图无死锁(M2.5)──────────────────────
  {
    rule: '课题阶段死锁:序列最后一个阶段没有出口(规则 1)',
    break: pack => {
      // 这正是 M2.5 真实踩到的那个 off-by-one:答辩事件的 trigger 读的是前一个阶段,
      // 于是没有任何事件读最后那个阶段,课题永远停在那里。
      const template = (pack.projectTemplates ?? [])[0];
      if (!template) throw new Error('反例夹具需要更新:内容包里没有课题模板');
      template.stageSequence = [...template.stageSequence, 'submit'];
    },
    expect: '课题阶段死锁',
  },
  {
    rule: '课题阶段有出口事件但那个事件不会推进(规则 1)',
    break: pack => {
      const template = (pack.projectTemplates ?? [])[0];
      if (!template) throw new Error('反例夹具需要更新:内容包里没有课题模板');
      // 把答辩那一步的 advance 全删掉:trigger 还在,但它推不动课题
      const defense = pack.events.find(e => e.id === 'ev_thesis_defense');
      if (!defense) throw new Error('反例夹具需要更新:找不到 ev_thesis_defense');
      for (const choice of defense.choices) {
        for (const outcome of choice.outcomes) {
          outcome.effects = outcome.effects.filter(e => !('project' in e));
        }
      }
    },
    expect: '课题阶段死锁',
  },
  {
    rule: '终态被写进了 stageSequence(规则 1)',
    break: pack => {
      const template = (pack.projectTemplates ?? [])[0];
      if (!template) throw new Error('反例夹具需要更新:内容包里没有课题模板');
      template.stageSequence = [...template.stageSequence, 'published'];
    },
    expect: '把终态 published 写进了 stageSequence',
  },
  {
    rule: 'trigger 读了一个没有模板会经过的阶段(规则 1 反方向)',
    break: pack => {
      pack.events.push(
        stubEvent('ev_bad_stage', {
          trigger: { projectCount: { stage: 'ethics', op: '>=', value: 1 } },
        }),
      );
    },
    expect: '没有任何课题模板会经过',
  },
  {
    rule: '引擎驱动的课题模板有一站完全没有内容(规则 1,M3 口径)',
    break: pack => {
      const template = (pack.projectTemplates ?? []).find(t => !t.isThesis);
      if (!template) throw new Error('反例夹具需要更新:没有引擎驱动的课题模板');
      // 加一站没有任何阶段事件的:玩家在这一年只会看到年度回顾页的一行摘要
      template.stageSequence = [...template.stageSequence, 'submit'];
    },
    expect: '课题阶段无内容',
  },
  {
    rule: 'mandatory 时代节点用 chance 分流(规则 24)',
    break: pack => {
      const era = pack.events.find(e => e.category === 'era' && e.mandatory);
      if (!era) throw new Error('反例夹具需要更新:内容包里没有 mandatory 时代节点');
      era.trigger = { all: [{ year: { from: 2016, to: 2016 } }, { chance: 0.5 }] };
    },
    expect: '不得用 chance 分流',
  },
];

let failures = 0;
for (const [index, testCase] of CASES.entries()) {
  const pack = clonePack();
  testCase.break(pack);
  const fixture = join(fixtureDir, `case-${index}.json`);
  writeFileSync(fixture, JSON.stringify(pack), 'utf-8');

  let output = '';
  let exitCode = 0;
  try {
    output = execFileSync('npx', ['tsx', validateEntry], {
      env: { ...process.env, PSY_VALIDATE_FIXTURE: fixture },
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    exitCode = e.status ?? 1;
    output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }

  if (testCase.expect === '') {
    // 阳性对照:合法的内容包不该被这些新规则误伤
    if (exitCode !== 0) {
      failures++;
      console.log(`❌ ${testCase.rule}:合法内容包被误判成错误\n${output}`);
    } else {
      console.log(`✅ ${testCase.rule}`);
    }
    continue;
  }

  if (exitCode === 0) {
    failures++;
    console.log(`❌ ${testCase.rule}:validate 没有报错(规则空转)`);
  } else if (!output.includes(testCase.expect)) {
    failures++;
    console.log(`❌ ${testCase.rule}:报错了但不是预期的那条\n  期望片段: ${testCase.expect}\n${output}`);
  } else {
    console.log(`✅ ${testCase.rule}`);
  }
}

console.log('');
if (failures > 0) {
  console.log(`validate 反例自测失败:${failures}/${CASES.length}`);
  process.exit(1);
}
console.log(`validate 反例自测通过:${CASES.length} 条规则都会在反例上变红(含 1 条阳性对照)`);
