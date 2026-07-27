import { describe, expect, it } from 'vitest';
import {
  applyEffects,
  createEngine,
  createSaveFile,
  effectiveSlots,
  masteryChance,
  resolveCourses,
  ageProjects,
  thesisOf,
  advanceAttempts,
  allocationIdForProject,
  shouldAbandonBySilence,
  stageSuccessChance,
  tierForQuality,
  MIN_SETBACK_CHANCE,
  MAX_REJECTIONS,
  NEGLECT_YEARS_TO_ABANDON,
  RETAKE_FLAG,
  CURRENT_SAVE_VERSION,
  evalCondition,
  eventStateValence,
  pickRoundEvents,
  selectContextLine,
  migrateSaveFile,
  restoreSave,
  Rng,
  type ContentPack,
  type Engine,
  type GameState,
  type PlayerAction,
} from '../src/index';

/** 在 BACKGROUND_DRAW 屏按 offer 顺序选满 pickCount 个特质 */
function pickTraits(engine: Engine, state: GameState): PlayerAction {
  const view = engine.view(state);
  if (view.kind !== 'BACKGROUND_DRAW') throw new Error('expected BACKGROUND_DRAW view');
  return {
    type: 'CHOOSE_TRAITS',
    traitIds: view.traitOffer.slice(0, view.pickCount).map(t => t.id),
  };
}

function miniPack(): ContentPack {
  return {
    meta: {
      id: 'test',
      version: '0.0.1',
      title: 'test pack',
      fallbackEndingId: 'end_fallback',
      examQuestionCount: 2,
    },
    timeline: [
      {
        kind: 'flow',
        id: 'gaokao',
        label: '高考',
        date: { year: 2014, month: 6 },
        steps: ['BACKGROUND_DRAW', 'SETUP', 'EXAM', 'APPLICATION'],
        nextPhaseId: 'life',
      },
      {
        kind: 'rounds',
        id: 'life',
        label: '人生',
        date: { year: 2014, month: 9 },
        rounds: 2,
        eventSlots: 1,
        pools: ['main'],
        briefs: ['第一年', '第二年'],
        isFinal: true,
      },
    ],
    events: [
      {
        id: 'ev_a',
        pools: ['main'],
        title: '事件A',
        text: '一个测试事件',
        choices: [
          {
            id: 'x',
            text: '选X',
            outcomes: [
              {
                weight: 1,
                text: '结果X',
                effects: [{ stats: { state: -10 } }, { setFlag: 'chose_x' }],
              },
            ],
          },
          {
            id: 'y',
            text: '选Y',
            outcomes: [
              { weight: 1, text: '结果Y', effects: [{ stats: { money: 1000 } }] },
            ],
          },
        ],
      },
      {
        id: 'ev_chain',
        pools: [],
        title: '链式事件',
        text: '由 schedule 触发',
        choices: [
          { id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好的', effects: [] }] },
        ],
      },
    ],
    endings: [
      {
        id: 'end_fallback',
        title: '普通结局',
        text: '结束了',
        category: 'final',
        priority: 999,
        condition: { always: true },
      },
    ],
    examBank: [
      { id: 'q1', track: 'both', subject: '数学', text: '1+1=?', options: ['1', '2'], answerIndex: 1 },
      { id: 'q2', track: 'both', subject: '语文', text: '选对的', options: ['对', '错'], answerIndex: 0 },
      { id: 'q3', track: '理', subject: '物理', text: 'g≈?', options: ['9.8', '3.7'], answerIndex: 0 },
    ],
    backgrounds: [{ id: 'bg1', label: '普通家庭', text: '普通', initialMoney: 5000 }],
    traits: [
      { id: 'trait_a', label: '特质A', text: '测试特质A', poolBias: { career: 1.5 }, statMods: { method: 5 } },
      { id: 'trait_b', label: '特质B', text: '测试特质B' },
      { id: 'trait_c', label: '特质C', text: '测试特质C' },
    ],
    traitEvolutions: [],
    lifeGoals: [],
    applications: [
      { id: 'app1', label: '保底大学', university: '某大学', minScore: 0, majors: [{ id: 'm1', name: '某专业', college: 'science' }] },
    ],
    npcs: [],
    incomes: [],
    fns: {},
  };
}

function autoPlay(pack: ContentPack, seed: number): GameState {
  const engine = createEngine(pack);
  let state = engine.start(seed);
  let guard = 0;
  while (guard++ < 500) {
    const view = engine.view(state);
    if (view.kind === 'ENDING') return state;
    let action: PlayerAction;
    switch (view.kind) {
      case 'TITLE':
        action = { type: 'START' };
        break;
      case 'BACKGROUND_DRAW':
        action = pickTraits(engine, state);
        break;
      case 'SETUP':
        action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' };
        break;
      case 'EXAM':
        action = { type: 'ANSWER', optionIndex: 0 };
        break;
      case 'APPLICATION':
        action = { type: 'APPLY', optionId: view.options[0]!.id };
        break;
      case 'EVENT':
        action = { type: 'CHOOSE', choiceId: view.choices[0]!.id };
        break;
      default:
        action = { type: 'CONTINUE' };
    }
    state = engine.dispatch(state, action);
  }
  throw new Error('autoPlay did not finish');
}

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('produces values in [0, 1)', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('M2 flow support', () => {
  it('supports a crossroad flow step before later phases', () => {
    const pack = miniPack();
    // 往时间线中间插一个阶段:M1 之后路由是显式的,所以插入必须**同时重接两条边**。
    // 只 splice 不改 nextPhaseId 的话新阶段会被直接跳过——这正是显式路由想要的行为。
    pack.timeline.splice(1, 0, {
      kind: 'flow',
      id: 'crossroad',
      label: '三岔口',
      date: { year: 2018, month: 3 },
      steps: ['CROSSROAD'],
      nextPhaseId: 'life',
    });
    const gaokaoPhase = pack.timeline[0]!;
    gaokaoPhase.nextPhaseId = 'crossroad';
    // 岔口选项**由内容提供**(前作硬编码在引擎里的 考研/求职/考公 已经删掉了)。
    // `group` 就是岔口那个 flow 阶段的 id,所以同一个屏可以服务多个岔口。
    pack.crossroadOptions = [
      {
        id: 'go_job',
        label: '求职',
        text: '你去找工作了。',
        group: 'crossroad',
        effects: [{ setCareer: 'industry' }, { setFlag: 'took_job' }, { stats: { money: 3000 } }],
      },
      {
        id: 'go_grad',
        label: '读研',
        text: '你去读研了。',
        group: 'crossroad',
        effects: [{ setCareer: 'master' }, { stats: { method: 5 } }],
      },
    ];
    const engine = createEngine(pack);
    let state = engine.start(7);
    state = engine.dispatch(state, { type: 'START' });
    state = engine.dispatch(state, pickTraits(engine, state));
    state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    while (engine.view(state).kind === 'EXAM') {
      state = engine.dispatch(state, { type: 'ANSWER', optionIndex: 1 });
    }
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'APPLY', optionId: 'app1' });

    let view = engine.view(state);
    expect(view.kind).toBe('OUTCOME');
    state = engine.dispatch(state, { type: 'CONTINUE' });
    view = engine.view(state);
    expect(view.kind).toBe('CROSSROAD');
    if (view.kind !== 'CROSSROAD') return;
    // 只列出属于这个 group 的选项
    expect(view.group).toBe('crossroad');
    expect(view.options.map(o => o.id)).toEqual(['go_job', 'go_grad']);
    state = engine.dispatch(state, { type: 'CHOOSE_CROSSROAD', optionId: 'go_job' });
    expect(state.history.some(h => h.kind === 'crossroad' && h.optionId === 'go_job')).toBe(true);
    // 分流完全由 `effects` 决定,引擎里不再有任何按专业名分支的 if
    expect(state.profile.career).toBe('industry');
    expect(state.flags.took_job).toBe(true);
    expect(engine.view(state).kind).toBe('OUTCOME');
    state = engine.dispatch(state, { type: 'CONTINUE' });
    expect(engine.view(state).kind).toBe('BRIEF');
  });

  it('hides crossroad options whose availableWhen fails(手里没有那张牌的路径不出现在清单上)', () => {
    const pack = miniPack();
    pack.timeline.splice(1, 0, {
      kind: 'flow',
      id: 'crossroad',
      label: '三岔口',
      date: { year: 2018, month: 3 },
      steps: ['CROSSROAD'],
      nextPhaseId: 'life',
    });
    pack.timeline[0]!.nextPhaseId = 'crossroad';
    pack.crossroadOptions = [
      {
        id: 'needs_cards',
        label: '直博',
        text: '直博。',
        group: 'crossroad',
        availableWhen: { flagNum: { key: 'lab_years', op: '>=', value: 2 } },
        effects: [{ stats: { method: 1 } }],
      },
      { id: 'always', label: '就业', text: '就业。', group: 'crossroad', effects: [{ stats: { money: 1 } }] },
    ];
    const engine = createEngine(pack);
    let state = engine.start(7);
    state = engine.dispatch(state, { type: 'START' });
    state = engine.dispatch(state, pickTraits(engine, state));
    state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    state = engine.dispatch(state, { type: 'SKIP_EXAM' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'APPLY', optionId: 'app1' });
    state = engine.dispatch(state, { type: 'CONTINUE' });

    const before = engine.view(state);
    if (before.kind !== 'CROSSROAD') throw new Error('expected CROSSROAD');
    expect(before.options.map(o => o.id)).toEqual(['always']);
    // 拿不到的选项连提交都不允许,而不是静默走别的分支
    expect(() => engine.dispatch(state, { type: 'CHOOSE_CROSSROAD', optionId: 'needs_cards' })).toThrow(
      /Crossroad option not available/,
    );

    state.flags.lab_years = 2;
    const after = engine.view(state);
    if (after.kind !== 'CROSSROAD') throw new Error('expected CROSSROAD');
    expect(after.options.map(o => o.id)).toEqual(['needs_cards', 'always']);
  });

  it('schedules NPC stage events when their stage condition becomes true', () => {
    const pack = miniPack();
    const flow = pack.timeline[0]!;
    if (flow.kind !== 'flow') throw new Error('expected flow phase');
    flow.steps.push('NPC_SELECTION');
    pack.npcs = [
      {
        id: 'friend',
        name: '朋友',
        initialFavor: 10,
        initialStage: 'start',
        stages: {
          start: {
            advanceWhen: { year: { from: 2014, to: 2014 } },
            eventId: 'ev_chain',
          },
        },
      },
    ];
    const engine = createEngine(pack);
    let state = engine.start(3);
    state = engine.dispatch(state, { type: 'START' });
    state = engine.dispatch(state, pickTraits(engine, state));
    state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    while (engine.view(state).kind === 'EXAM') {
      state = engine.dispatch(state, { type: 'ANSWER', optionIndex: 1 });
    }
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'APPLY', optionId: 'app1' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    expect(engine.view(state).kind).toBe('NPC_SELECTION');
    state = engine.dispatch(state, { type: 'CHOOSE_NPCS', npcIds: ['friend'] });
    state = engine.dispatch(state, { type: 'CONTINUE' });

    const view = engine.view(state);
    expect(view.kind).toBe('EVENT');
    if (view.kind === 'EVENT') expect(view.eventId).toBe('ev_chain');
  });
});

describe('event scheduling variety', () => {
  it('lets the player pick npcPickCount NPCs, with no forced romance', () => {
    const pack = miniPack();
    // **本作没有必选人物。** 前作把 `first_love` 硬编码成必选,理由是"恋人线是主线";
    // 本作认为学术生涯里"没有伴侣"和"有伴侣"是同等重要的两种真实处境,
    // 把恋人设成必选等于在设定层面否认了其中一种。
    pack.meta.npcPickCount = 2;
    pack.npcs = ['senior', 'rival', 'roommate', 'friend', 'partner', 'advisor'].map(id => ({
      id,
      name: id,
      initialFavor: 10,
      initialStage: 'start',
      stages: { start: {} },
    }));
    const flow = pack.timeline[0]!;
    if (flow.kind !== 'flow') throw new Error('expected flow phase');
    flow.steps.push('NPC_SELECTION');
    const engine = createEngine(pack);
    let state = engine.start(42);
    state.screen = 'NPC_SELECTION';
    state.phaseIndex = 0;
    state.flowStepIndex = flow.steps.length - 1;
    const view = engine.view(state);
    if (view.kind !== 'NPC_SELECTION') throw new Error('expected NPC_SELECTION view');
    expect(view.requiredNpcs).toEqual([]);
    expect(view.npcs).toHaveLength(6);
    expect(view.pickCount).toBe(2);
    state = engine.dispatch(state, {
      type: 'CHOOSE_NPCS',
      npcIds: ['partner', 'rival'],
    });
    expect(Object.keys(state.npcs).sort()).toEqual(['partner', 'rival']);
  });

  it('rejects the wrong number of NPC picks', () => {
    const pack = miniPack();
    pack.meta.npcPickCount = 2;
    pack.npcs = ['a', 'b', 'c'].map(id => ({
      id, name: id, initialFavor: 10, initialStage: 'start', stages: { start: {} },
    }));
    const flow = pack.timeline[0]!;
    if (flow.kind !== 'flow') throw new Error('expected flow phase');
    flow.steps.push('NPC_SELECTION');
    const engine = createEngine(pack);
    const state = engine.start(42);
    state.screen = 'NPC_SELECTION';
    state.phaseIndex = 0;
    state.flowStepIndex = flow.steps.length - 1;
    expect(() => engine.dispatch(state, { type: 'CHOOSE_NPCS', npcIds: ['a'] })).toThrow(
      /expects 2 distinct NPCs/,
    );
    // 重复选同一个人也不算两个
    expect(() => engine.dispatch(state, { type: 'CHOOSE_NPCS', npcIds: ['a', 'a'] })).toThrow(
      /expects 2 distinct NPCs/,
    );
  });

  it('uses the chosen life goal to score the same life differently', () => {
    const pack = miniPack();
    pack.meta.scoring = {
      weights: { method: 0.2, money: 0.2, state: 0.2, capital: 0.2, clinical: 0.2 },
      moneyFullScore: 600000,
    };
    pack.lifeGoals = [
      {
        id: 'goal_money', label: '财富', text: '财富优先',
        scoringWeights: { method: 0, money: 1, state: 0, capital: 0, clinical: 0 },
      },
      {
        id: 'goal_state', label: '状态', text: '状态优先',
        scoringWeights: { method: 0, money: 0, state: 1, capital: 0, clinical: 0 },
      },
    ];
    const engine = createEngine(pack);
    const state = engine.start(42);
    state.screen = 'ENDING';
    state.endingId = 'end_fallback';
    state.stats = { method: 0, money: 600000, state: 10, capital: 0, clinical: 0 };
    state.flags.life_goal = 'goal_money';
    const moneyView = engine.view(state);
    state.flags.life_goal = 'goal_state';
    const stateView = engine.view(state);
    expect(moneyView.kind).toBe('ENDING');
    expect(stateView.kind).toBe('ENDING');
    if (moneyView.kind !== 'ENDING' || stateView.kind !== 'ENDING') return;
    expect(moneyView.score).toBe(100);
    expect(stateView.score).toBe(10);
  });

  it('exposes completed NPC relationships on the ending view', () => {
    const pack = miniPack();
    const engine = createEngine(pack);
    const state = engine.start(42);
    state.screen = 'ENDING';
    state.endingId = 'end_fallback';
    state.flags.roommate_true_partner = true;
    state.flags.mentor_true_legacy = true;
    const view = engine.view(state);
    expect(view.kind).toBe('ENDING');
    if (view.kind !== 'ENDING') return;
    expect(view.relationships.map(relationship => relationship.npcId)).toEqual(['roommate', 'mentor']);
    expect(view.relationships.map(relationship => relationship.title)).toEqual([
      '没散的创始团队',
      '传下去的那支笔',
    ]);
  });

  it('limits eligible NPC stage events to one per round and defers the rest', () => {
    const pack = miniPack();
    pack.events = ['ev_npc_a', 'ev_npc_b', 'ev_npc_c'].map(id => ({
      id,
      pools: [],
      title: id,
      text: id,
      choices: [
        {
          id: 'ok',
          text: '好',
          outcomes: [{ weight: 1, text: '好', effects: [{ stats: { state: 1 } }] }],
        },
      ],
    }));
    pack.npcs = pack.events.map((ev, i) => ({
      id: `npc_${i}`,
      name: `NPC ${i}`,
      initialFavor: 10,
      initialStage: 'start',
      stages: {
        start: { advanceWhen: { year: { from: 2014, to: 2014 } }, eventId: ev.id },
      },
    }));
    const state = createEngine(pack).start(7);
    state.npcs = Object.fromEntries(
      pack.npcs.map(npc => [npc.id, { favor: npc.initialFavor, stage: npc.initialStage }]),
    );
    const phase = pack.timeline.find(p => p.kind === 'rounds')!;
    const picked = pickRoundEvents(state, pack, new Rng(7), phase);
    expect(picked).toHaveLength(1);
    expect(pack.events.map(e => e.id)).toContain(picked[0]);
    expect(state.pendingNpcEvents).toHaveLength(2);
  });

  it('plays deferred NPC events after their original year window instead of dropping the chain', () => {
    const pack = miniPack();
    pack.events = ['ev_npc_a', 'ev_npc_b', 'ev_npc_c'].map(id => ({
      id,
      pools: [],
      title: id,
      text: id,
      choices: [
        {
          id: 'ok',
          text: '好',
          outcomes: [{ weight: 1, text: '好', effects: [] }],
        },
      ],
    }));
    pack.npcs = pack.events.map((ev, i) => ({
      id: `npc_${i}`,
      name: `NPC ${i}`,
      initialFavor: 10,
      initialStage: 'start',
      stages: {
        start: { advanceWhen: { year: { from: 2014, to: 2014 } }, eventId: ev.id },
      },
    }));
    const state = createEngine(pack).start(7);
    state.npcs = Object.fromEntries(
      pack.npcs.map(npc => [npc.id, { favor: npc.initialFavor, stage: npc.initialStage }]),
    );
    const phase = pack.timeline.find(p => p.kind === 'rounds')!;
    const seen: string[] = [];
    for (let round = 0; round < 3; round++) {
      state.date.year = 2014 + round;
      state.roundCounter = round;
      const picked = pickRoundEvents(state, pack, new Rng(7 + round), phase);
      expect(picked).toHaveLength(1);
      seen.push(picked[0]!);
      state.triggeredEventIds.push(picked[0]!);
    }
    expect(new Set(seen)).toEqual(new Set(['ev_npc_a', 'ev_npc_b', 'ev_npc_c']));
    expect(state.pendingNpcEvents).toHaveLength(0);
  });

  it('drops a deferred NPC event when another effect has already changed that NPC stage', () => {
    const pack = miniPack();
    pack.events = [{
      id: 'ev_stale_npc', pools: [], title: '旧阶段事件', text: '不应再出现',
      choices: [{ id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [] }] }],
    }];
    pack.npcs = [{
      id: 'friend', name: '朋友', initialFavor: 10, initialStage: 'start',
      stages: {
        start: { advanceWhen: { year: { from: 2014, to: 2014 } }, eventId: 'ev_stale_npc' },
        changed: {},
      },
    }];
    const state = createEngine(pack).start(7);
    state.npcs = { friend: { favor: 10, stage: 'changed' } };
    state.pendingNpcEvents = [{ npcId: 'friend', eventId: 'ev_stale_npc' }];
    state.date.year = 2015;
    const phase = pack.timeline.find(p => p.kind === 'rounds')!;
    const picked = pickRoundEvents(state, pack, new Rng(7), phase);
    expect(picked).not.toContain('ev_stale_npc');
    expect(state.pendingNpcEvents).toHaveLength(0);
  });

  it('picks only one mandatory event from the same variant group', () => {
    const pack = miniPack();
    pack.events = [
      {
        id: 'ev_variant_a',
        pools: ['main'],
        title: '变体A',
        text: '变体A',
        mandatory: true,
        variantGroup: 'era_test',
        choices: [
          {
            id: 'ok',
            text: '好',
            outcomes: [{ weight: 1, text: '好', effects: [{ stats: { state: 1 } }] }],
          },
        ],
      },
      {
        id: 'ev_variant_b',
        pools: ['main'],
        title: '变体B',
        text: '变体B',
        mandatory: true,
        variantGroup: 'era_test',
        choices: [
          {
            id: 'ok',
            text: '好',
            outcomes: [{ weight: 1, text: '好', effects: [{ stats: { state: 1 } }] }],
          },
        ],
      },
    ];
    const state = createEngine(pack).start(7);
    const phase = pack.timeline.find(p => p.kind === 'rounds')!;
    const picked = pickRoundEvents(state, pack, new Rng(7), phase);
    expect(picked).toHaveLength(1);
    expect(['ev_variant_a', 'ev_variant_b']).toContain(picked[0]);
  });

  it('never replays a variant group in a later round once one member has fired', () => {
    // 变体的 trigger 放宽成年份窗口后,落选的同组变体会在后面的年份重新 eligible。
    // 一个 variantGroup 是"同一个节点的不同版本",整局只能出现一个。
    const pack = miniPack();
    const variant = (id: string) => ({
      id,
      pools: ['main'],
      title: id,
      text: id,
      mandatory: true,
      variantGroup: 'era_test',
      trigger: { year: { from: 2014, to: 2016 } },
      choices: [
        {
          id: 'ok',
          text: '好',
          outcomes: [{ weight: 1, text: '好', effects: [{ stats: { state: 1 } }] }],
        },
      ],
    });
    pack.events = [variant('ev_variant_a'), variant('ev_variant_b'), variant('ev_variant_c')];
    const state = createEngine(pack).start(7);
    const phase = pack.timeline.find(p => p.kind === 'rounds')!;
    const seen: string[] = [];
    for (const year of [2014, 2015, 2016]) {
      state.date.year = year;
      const picked = pickRoundEvents(state, pack, new Rng(7 + year), phase);
      seen.push(...picked);
      state.triggeredEventIds.push(...picked);
    }
    expect(seen).toHaveLength(1);
  });
});

// 前作的 `career crossroad branches` 测试组已删除。
// 它验证的是引擎里 `if (major.includes('金融'))` 那五段硬编码分流,而 M2 把岔口改成了内容驱动:
// 分流写在 `CrossroadOption.effects` 里,引擎不再知道有哪些专业。
// 等价覆盖见上面 "M2 flow support" 的两条内容驱动测试 + "M1 阶段路由" 的六路径测试。

describe('evalCondition', () => {
  const pack = miniPack();
  const engine = createEngine(pack);
  const state = engine.start(1);
  const ctx = { state, pack, rng: new Rng(1) };

  it('evaluates stat comparisons', () => {
    // 状态开局 65(GAME_DESIGN 第三节)。这里断言的阈值必须跟 engine.start 的初始值对齐,
    // 换血时前作留下的 70 就是在这里被抓到的。
    expect(evalCondition({ stat: 'state', op: '>=', value: 65 }, ctx)).toBe(true);
    expect(evalCondition({ stat: 'state', op: '<', value: 65 }, ctx)).toBe(false);
  });

  it('evaluates flag / all / any / not combinators', () => {
    state.flags['foo'] = true;
    expect(evalCondition({ flag: 'foo' }, ctx)).toBe(true);
    expect(evalCondition({ not: { flag: 'foo' } }, ctx)).toBe(false);
    expect(
      evalCondition({ all: [{ flag: 'foo' }, { stat: 'state', op: '>', value: 0 }] }, ctx),
    ).toBe(true);
    expect(evalCondition({ any: [{ flag: 'nope' }, { flag: 'foo' }] }, ctx)).toBe(true);
  });

  it('throws on unknown fn reference', () => {
    expect(() => evalCondition({ fn: 'missing' }, ctx)).toThrow(/unknown fn/);
  });
});

describe('engine full game', () => {
  it('plays to an ending', () => {
    const final = autoPlay(miniPack(), 99);
    expect(final.endingId).toBe('end_fallback');
    expect(final.screen).toBe('ENDING');
    expect(final.history.length).toBeGreaterThan(0);
  });

  it('is fully deterministic: same seed, same policy, same final state', () => {
    const a = autoPlay(miniPack(), 2024);
    const b = autoPlay(miniPack(), 2024);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds can draw different exam papers', () => {
    const results = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      results.add(JSON.stringify(autoPlay(miniPack(), seed).examPaper));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('same-round consequence (afterRounds: 0)', () => {
  it('appends the scheduled event to the current round queue', () => {
    const pack = miniPack();
    const evA = pack.events.find(e => e.id === 'ev_a')!;
    evA.choices[0]!.outcomes[0]!.effects.push({
      schedule: { eventId: 'ev_chain', afterRounds: 0 },
    });
    const engine = createEngine(pack);
    let state = engine.start(7);
    state = engine.dispatch(state, { type: 'START' });
    state = engine.dispatch(state, pickTraits(engine, state));
    state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    while (engine.view(state).kind === 'EXAM') {
      state = engine.dispatch(state, { type: 'ANSWER', optionIndex: 0 });
    }
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'APPLY', optionId: 'app1' });
    state = engine.dispatch(state, { type: 'CONTINUE' }); // OUTCOME → BRIEF(第一年)
    state = engine.dispatch(state, { type: 'CONTINUE' }); // BRIEF → EVENT(ev_a)
    const yearAtEvA = state.date.year;
    state = engine.dispatch(state, { type: 'CHOOSE', choiceId: 'x' }); // 触发 schedule 0
    state = engine.dispatch(state, { type: 'CONTINUE' }); // OUTCOME → 应追加 ev_chain
    const view = engine.view(state);
    expect(view.kind).toBe('EVENT');
    if (view.kind === 'EVENT') expect(view.eventId).toBe('ev_chain');
    expect(state.date.year).toBe(yearAtEvA); // 同一年内弹出
  });
});

describe('save replay & migration', () => {
  it('restores via snapshot when content version matches, replay when it differs', () => {
    const pack = miniPack();
    const engine = createEngine(pack);
    let state = engine.start(9);
    const log: PlayerAction[] = [];
    const doAct = (action: PlayerAction) => {
      log.push(action);
      state = engine.dispatch(state, action);
    };
    doAct({ type: 'START' });
    doAct(pickTraits(engine, state));
    doAct({ type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    doAct({ type: 'SKIP_EXAM' });

    const save = createSaveFile('1.0.0', state, log);
    expect(restoreSave(engine, save, '1.0.0')).toBe(save.snapshot);

    const replayed = restoreSave(engine, save, '2.0.0');
    expect(replayed).not.toBeNull();
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(state));
  });

  it('migrates v1 snapshot-only saves and refuses replaying them', () => {
    const pack = miniPack();
    const engine = createEngine(pack);
    const snapshot = autoPlay(pack, 5);
    const v1 = {
      saveVersion: 1,
      contentVersion: '0.9.0',
      savedAt: '2026-01-01T00:00:00.000Z',
      snapshot,
    };
    const migrated = migrateSaveFile(v1);
    expect(migrated).not.toBeNull();
    expect(migrated!.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(migrated!.seed).toBe(snapshot.seed);
    // 同版本 → 快照可用;换版本 → 空日志不可重放,判为不可恢复
    expect(restoreSave(engine, migrated!, '0.9.0')).toBe(migrated!.snapshot);
    expect(restoreSave(engine, migrated!, '1.0.0')).toBeNull();
  });

  it('rejects unknown or corrupted saves', () => {
    expect(migrateSaveFile(null)).toBeNull();
    expect(migrateSaveFile({ saveVersion: 99 })).toBeNull();
    expect(migrateSaveFile({ saveVersion: 2, snapshot: null, actionLog: [] })).toBeNull();
  });
});

describe('exam skip', () => {
  it('skips remaining questions and resolves a default-rate score', () => {
    const pack = miniPack();
    const engine = createEngine(pack);
    let state = engine.start(7);
    state = engine.dispatch(state, { type: 'START' });
    state = engine.dispatch(state, pickTraits(engine, state));
    state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    expect(engine.view(state).kind).toBe('EXAM');
    state = engine.dispatch(state, { type: 'SKIP_EXAM' });
    const view = engine.view(state);
    expect(view.kind).toBe('EXAM_RESULT');
    if (view.kind === 'EXAM_RESULT') {
      expect(view.score).toBeGreaterThan(330);
      expect(view.score).toBeLessThanOrEqual(750);
    }
    expect(state.stats.method).toBeGreaterThan(20);
  });
});

describe('income & scoring', () => {
  it('supports setting a stat to an exact value and reports the real delta', () => {
    const pack = miniPack();
    const evA = pack.events.find(e => e.id === 'ev_a')!;
    evA.choices[0]!.outcomes[0]!.effects = [{ setStat: 'money', value: 0 }];
    const engine = createEngine(pack);
    let state = engine.start(7);
    state = engine.dispatch(state, { type: 'START' });
    state.stats.money = 12345;
    state = engine.dispatch(state, pickTraits(engine, state));
    state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    state = engine.dispatch(state, { type: 'SKIP_EXAM' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'APPLY', optionId: 'app1' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'CHOOSE', choiceId: 'x' });
    expect(state.stats.money).toBe(0);
    expect(state.pendingOutcome?.deltas.money).toBe(-12345);
  });

  it('supports proportional money costs capped by the current balance', () => {
    const pack = miniPack();
    const evA = pack.events.find(e => e.id === 'ev_a')!;
    evA.choices[0]!.outcomes[0]!.effects = [{ moneyCost: { rate: 0.5, roundTo: 1000 } }];
    const engine = createEngine(pack);
    let state = engine.start(7);
    state = engine.dispatch(state, { type: 'START' });
    state.stats.money = 12345;
    state = engine.dispatch(state, pickTraits(engine, state));
    state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
    state = engine.dispatch(state, { type: 'SKIP_EXAM' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'APPLY', optionId: 'app1' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'CONTINUE' });
    state = engine.dispatch(state, { type: 'CHOOSE', choiceId: 'x' });
    expect(state.stats.money).toBe(6345);
    expect(state.pendingOutcome?.deltas.money).toBe(-6000);
  });

  it('applies matching income rules once per settled round', () => {
    const base = autoPlay(miniPack(), 11);
    const pack = miniPack();
    pack.incomes = [{ id: 'inc_test', label: '测试收入', when: { always: true }, amount: 1000 }];
    const withIncome = autoPlay(pack, 11);
    expect(withIncome.roundCounter).toBe(base.roundCounter);
    expect(withIncome.stats.money - base.stats.money).toBe(withIncome.roundCounter * 1000);
  });

  it('settles income on entering SETTLEMENT and exposes the breakdown in the view', () => {
    const pack = miniPack();
    pack.incomes = [{ id: 'inc_test', label: '测试收入', when: { always: true }, amount: 1000 }];
    const engine = createEngine(pack);
    let state = engine.start(11);
    let guard = 0;
    while (guard++ < 100 && engine.view(state).kind !== 'SETTLEMENT') {
      const view = engine.view(state);
      let action: PlayerAction;
      switch (view.kind) {
        case 'TITLE':
          action = { type: 'START' };
          break;
        case 'BACKGROUND_DRAW':
          action = pickTraits(engine, state);
          break;
        case 'SETUP':
          action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' };
          break;
        case 'EXAM':
          action = { type: 'SKIP_EXAM' };
          break;
        case 'APPLICATION':
          action = { type: 'APPLY', optionId: 'app1' };
          break;
        case 'EVENT':
          action = { type: 'CHOOSE', choiceId: view.choices[0]!.id };
          break;
        default:
          action = { type: 'CONTINUE' };
      }
      state = engine.dispatch(state, action);
    }
    const view = engine.view(state);
    if (view.kind !== 'SETTLEMENT') throw new Error('expected SETTLEMENT view');
    // 结算屏上的金钱已含本年收入,明细与趋势同步透出
    expect(view.incomes).toEqual([{ label: '测试收入', amount: 1000 }]);
    expect(view.moneyDelta).toBe(1000);
    expect(view.moneyTrend.length).toBe(1);
    expect(view.moneyTrend[0]!.money).toBe(view.stats.money);
  });

  it('exposes a weighted score and grade on the ending view', () => {
    const pack = miniPack();
    const engine = createEngine(pack);
    const state = autoPlay(pack, 11);
    const view = engine.view(state);
    if (view.kind !== 'ENDING') throw new Error('expected ENDING view');
    expect(view.score).toBeGreaterThanOrEqual(0);
    expect(view.score).toBeLessThanOrEqual(100);
    expect(['S', 'A', 'B', 'C', 'D']).toContain(view.grade);
  });
});

describe('traits and director', () => {
  it('offers trait candidates and applies statMods on CHOOSE_TRAITS', () => {
    const engine = createEngine(miniPack());
    let state = engine.start(7);
    state = engine.dispatch(state, { type: 'START' });
    // 抽卡阶段:只有候选,还没有特质 flag
    expect(Object.keys(state.flags).some(k => k.startsWith('trait_'))).toBe(false);
    const view = engine.view(state);
    if (view.kind !== 'BACKGROUND_DRAW') throw new Error('expected BACKGROUND_DRAW view');
    // miniPack 只有 3 张特质:offer = min(4, 3),pick = 2
    expect(view.traitOffer).toHaveLength(3);
    expect(view.pickCount).toBe(2);

    // 非法选择:数量不对 / 不在 offer 内
    expect(() =>
      engine.dispatch(state, { type: 'CHOOSE_TRAITS', traitIds: [view.traitOffer[0]!.id] }),
    ).toThrow();
    expect(() =>
      engine.dispatch(state, {
        type: 'CHOOSE_TRAITS',
        traitIds: [view.traitOffer[0]!.id, view.traitOffer[0]!.id],
      }),
    ).toThrow();
    expect(() =>
      engine.dispatch(state, {
        type: 'CHOOSE_TRAITS',
        traitIds: view.traitOffer.map(t => t.id),
      }),
    ).toThrow();
    expect(() =>
      engine.dispatch(state, { type: 'CHOOSE_TRAITS', traitIds: ['trait_nope', 'trait_nah'] }),
    ).toThrow();

    // 合法选择:写入 flags + 应用 statMods
    const chosen = view.traitOffer.slice(0, 2).map(t => t.id);
    const knowledgeBefore = state.stats.method;
    const modSum = view.traitOffer
      .slice(0, 2)
      .reduce((sum, t) => sum + (t.statMods?.method ?? 0), 0);
    state = engine.dispatch(state, { type: 'CHOOSE_TRAITS', traitIds: chosen });
    for (const id of chosen) expect(state.flags[id]).toBe(true);
    expect(state.stats.method).toBe(
      Math.max(0, Math.min(100, knowledgeBefore + modSum)),
    );
    expect(state.traitOffer).toEqual([]);
    expect(engine.view(state).kind).toBe('SETUP');
  });

  it('derives event state valence from weighted outcome deltas', () => {
    const ev = {
      id: 'ev_valence',
      pools: ['main'],
      title: 't',
      text: 't',
      choices: [
        {
          id: 'a',
          text: 'a',
          outcomes: [
            { weight: 3, text: 'good', effects: [{ stats: { state: 4 } }] },
            { weight: 1, text: 'bad', effects: [{ stats: { state: -4 } }] },
          ],
        },
        {
          id: 'b',
          text: 'b',
          outcomes: [{ weight: 1, text: 'flat', effects: [{ stats: { money: 100 } }] }],
        },
      ],
    } as const;
    // choice a: (4*3 + -4*1)/4 = 2, choice b: 0 → 平均 1
    expect(eventStateValence(ev as unknown as Parameters<typeof eventStateValence>[0])).toBe(1);
  });
});

describe('trait tag rendering', () => {
  it('tags trait-gated events and choices with the trait label', () => {
    const pack = miniPack();
    // 只放 2 个特质,抽 2 必然全中,断言不依赖随机
    pack.traits = [
      { id: 'trait_a', label: '特质A', text: 'A' },
      { id: 'trait_b', label: '特质B', text: 'B' },
    ];
    pack.events[0]!.trigger = { all: [{ flag: 'trait_a' }] };
    pack.events[0]!.choices[1]!.visibleIf = { flag: 'trait_b' };
    const engine = createEngine(pack);
    let state = engine.start(5);
    let guard = 0;
    while (guard++ < 100) {
      const view = engine.view(state);
      if (view.kind === 'EVENT') {
        expect(view.title).toBe('【特质A】事件A');
        expect(view.choices.find(c => c.id === 'y')?.text).toBe('【特质B】选Y');
        return;
      }
      let action: PlayerAction;
      switch (view.kind) {
        case 'TITLE': action = { type: 'START' }; break;
        case 'BACKGROUND_DRAW': action = pickTraits(engine, state); break;
        case 'SETUP': action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' }; break;
        case 'EXAM': action = { type: 'ANSWER', optionIndex: 0 }; break;
        case 'APPLICATION': action = { type: 'APPLY', optionId: 'app1' }; break;
        default: action = { type: 'CONTINUE' };
      }
      state = engine.dispatch(state, action);
    }
    throw new Error('never reached EVENT view');
  });
});

describe('event presentation variants', () => {
  it('uses the first matching conditional title and text without changing the event id', () => {
    const pack = miniPack();
    pack.events[0]!.presentationVariants = [
      { condition: { always: true }, title: '情境标题', text: '属于这一局的开场' },
    ];
    pack.events[0]!.contextLines = [
      { condition: { always: true }, text: '你还记得上一年的选择。' },
    ];
    const engine = createEngine(pack);
    let state = engine.start(7);
    for (let guard = 0; guard < 100; guard++) {
      const view = engine.view(state);
      if (view.kind === 'EVENT') {
        expect(view.eventId).toBe('ev_a');
        expect(view.title).toBe('情境标题');
        expect(view.text).toBe('属于这一局的开场\n\n你还记得上一年的选择。');
        return;
      }
      const action: PlayerAction = view.kind === 'TITLE' ? { type: 'START' }
        : view.kind === 'BACKGROUND_DRAW' ? pickTraits(engine, state)
        : view.kind === 'SETUP' ? { type: 'CHOOSE_SETUP', gender: 'male', track: '理' }
        : view.kind === 'EXAM' ? { type: 'ANSWER', optionIndex: 0 }
        : view.kind === 'APPLICATION' ? { type: 'APPLY', optionId: 'app1' }
        : { type: 'CONTINUE' };
      state = engine.dispatch(state, action);
    }
    throw new Error('never reached EVENT view');
  });

  it('falls back to an unconditional context line when no condition matches', () => {
    const pack = miniPack();
    pack.events[0]!.contextLines = [
      { condition: { flag: 'never_set' }, text: '条件回响' },
      { text: '兜底回响A' },
      { text: '兜底回响B' },
    ];
    const engine = createEngine(pack);
    const state = engine.start(7);
    const ctx = { state, pack, rng: new Rng(state.rngState) };
    const picked = selectContextLine(pack.events[0]!, ctx);
    expect(picked?.fallback).toBe(true);
    expect(['兜底回响A', '兜底回响B']).toContain(picked?.text);
    // 同一个 state 反复求值必须稳定:view 是纯函数,重新渲染不能换句子
    expect(selectContextLine(pack.events[0]!, ctx)?.index).toBe(picked?.index);
  });

  it('prefers a matching conditional context line over the fallbacks', () => {
    const pack = miniPack();
    pack.events[0]!.contextLines = [
      { text: '兜底回响' },
      { condition: { always: true }, text: '条件回响' },
    ];
    const state = createEngine(pack).start(7);
    const picked = selectContextLine(pack.events[0]!, { state, pack, rng: new Rng(state.rngState) });
    expect(picked?.text).toBe('条件回响');
    expect(picked?.fallback).toBe(false);
  });
});

describe('relationship outcome hints', () => {
  function outcomeView(tags: string[]) {
    const engine = createEngine(miniPack());
    const state = engine.start(7);
    state.screen = 'OUTCOME';
    state.pendingOutcome = { text: '关系结果', deltas: {} };
    state.history = tags.map((outcomeTag, index) => ({
      kind: 'event' as const,
      year: 2014 + index,
      eventId: `relationship_${index}`,
      choiceId: 'choice',
      outcomeTag,
    }));
    const view = engine.view(state);
    if (view.kind !== 'OUTCOME') throw new Error('expected OUTCOME view');
    return view;
  }

  it('explains relationship memory only on the first tagged outcome', () => {
    expect(outcomeView(['love_warm']).relationshipHint).toContain('你的选择会被这段关系记住');
    expect(outcomeView(['love_warm', 'love_cool']).relationshipHint).toBeUndefined();
  });

  it('shows a milestone hint exactly when a route reaches its warm threshold', () => {
    expect(outcomeView(['love_warm', 'love_cool', 'love_warm']).relationshipHint).toBeUndefined();
    expect(outcomeView(['love_warm', 'love_cool', 'love_warm', 'love_warm']).relationshipHint)
      .toContain('正在改变这段关系未来的走向');
    expect(outcomeView(['love_warm', 'love_warm', 'love_warm', 'love_warm']).relationshipHint)
      .toBeUndefined();
  });
});

// ============================================================================
// M1:阶段路由与 DSL 扩展
// ============================================================================

/**
 * 六条并行培养路径的路由夹具。
 *
 * `timeline` 数组的顺序是**故意排错的**,用来钉死"按下标顺延"这个 bug:
 *
 *   - `phd_direct` 的数组后继是 `master` —— 前作的 `phaseIndex + 1` 会让直博读满五年之后
 *     掉进硕士阶段,也就是 TECH 4.3 点名的那个串线。
 *   - `postdoc` 的数组后继是 `school` —— 博后做完会掉进中小学心理教师线。
 *
 * 两个陷阱都必须被 `nextPhaseId` 跨过去。
 */
function routingPack(): ContentPack {
  const path = (
    id: string,
    rounds: number,
    tail: { nextPhaseId: string } | { isFinal: true },
  ): ContentPack['timeline'][number] => ({
    kind: 'rounds',
    id,
    label: id,
    date: { year: 2018, month: 9 },
    rounds,
    eventSlots: 1,
    pools: [],
    briefs: [id],
    ...tail,
  });

  const forkChoice = (id: string, phaseId: string, flag: string) => ({
    id,
    text: id,
    outcomes: [
      {
        weight: 1,
        text: `走${id}`,
        effects: [{ setFlag: flag }, { jumpToPhase: phaseId }, { stats: { method: 1 } }],
      },
    ],
  });

  return {
    meta: { id: 'routing', version: '0.0.1', title: 'routing', fallbackEndingId: 'end_other', examQuestionCount: 1 },
    timeline: [
      // 0
      { kind: 'rounds', id: 'undergrad', label: '本科', date: { year: 2015, month: 6 },
        rounds: 1, eventSlots: 1, pools: ['fork'], briefs: ['大四'], nextPhaseId: 'phd_direct' },
      path('phd_direct', 5, { nextPhaseId: 'postdoc' }),        // 1  ← 陷阱:数组后继是 master
      path('master', 3, { nextPhaseId: 'phd_after_master' }),   // 2
      path('phd_after_master', 3, { nextPhaseId: 'postdoc' }),  // 3
      path('clinical', 4, { isFinal: true }),                   // 4
      path('postdoc', 2, { nextPhaseId: 'faculty' }),           // 5  ← 陷阱:数组后继是 school
      path('school', 3, { isFinal: true }),                     // 6
      path('industry', 3, { isFinal: true }),                   // 7
      path('faculty', 3, { isFinal: true }),                    // 8
    ],
    events: [
      {
        id: 'ev_fork',
        pools: ['fork'],
        mandatory: true,
        title: '大四三岔口',
        text: '六条路',
        choices: [
          forkChoice('go_phd_direct', 'phd_direct', 'route_phd_direct'),
          forkChoice('go_master', 'master', 'route_master'),
          forkChoice('go_clinical', 'clinical', 'route_clinical'),
          forkChoice('go_school', 'school', 'route_school'),
          forkChoice('go_industry', 'industry', 'route_industry'),
        ],
      },
    ],
    endings: [
      { id: 'end_faculty', title: '教职', text: '拿到教职', category: 'final', priority: 1,
        condition: { any: [{ flag: 'route_phd_direct' }, { flag: 'route_master' }] } },
      { id: 'end_clinical', title: '临床', text: '在医院', category: 'final', priority: 2, condition: { flag: 'route_clinical' } },
      { id: 'end_school', title: '学校', text: '在中学', category: 'final', priority: 3, condition: { flag: 'route_school' } },
      { id: 'end_industry', title: '大厂', text: '在大厂', category: 'final', priority: 4, condition: { flag: 'route_industry' } },
      { id: 'end_other', title: '其他', text: '别的', category: 'final', priority: 999, condition: { always: true } },
    ],
    examBank: [{ id: 'q1', track: 'both', subject: '数学', text: '1+1=?', options: ['1', '2'], answerIndex: 1 }],
    backgrounds: [{ id: 'bg1', label: '普通', text: '普通', initialMoney: 1000 }],
    traits: [{ id: 'trait_a', label: 'A', text: 'A' }],
    traitEvolutions: [],
    lifeGoals: [],
    applications: [{ id: 'app1', label: '兜底', university: '某大学', minScore: 0,
      majors: [{ id: 'm1', name: '心理学', college: 'science' }] }],
    npcs: [],
    incomes: [],
    fns: {},
  };
}

/** 打完一局并记录**依次进入过的阶段 id**(去掉同一阶段内的重复回合) */
function playRoute(pack: ContentPack, seed: number, forkChoiceId: string) {
  const engine = createEngine(pack);
  let state = engine.start(seed);
  const phases: string[] = [];
  const years: number[] = [];
  let guard = 0;
  while (guard++ < 500) {
    const view = engine.view(state);
    if (view.kind === 'ENDING') return { phases, years, endingId: view.endingId, state };
    const phaseId = pack.timeline[state.phaseIndex]?.id;
    if (phaseId && phases[phases.length - 1] !== phaseId) phases.push(phaseId);
    let action: PlayerAction;
    switch (view.kind) {
      case 'TITLE':
        action = { type: 'START' };
        break;
      case 'BRIEF':
        years.push(view.year);
        action = { type: 'CONTINUE' };
        break;
      case 'EVENT':
        action = { type: 'CHOOSE', choiceId: forkChoiceId };
        break;
      default:
        action = { type: 'CONTINUE' };
    }
    state = engine.dispatch(state, action);
  }
  throw new Error('playRoute did not finish');
}

describe('M1 阶段路由(六条培养路径不串线)', () => {
  const pack = routingPack();

  it('直博读满五年后进博后,不会掉进数组里紧跟其后的硕士阶段', () => {
    const run = playRoute(pack, 11, 'go_phd_direct');
    expect(run.phases).toEqual(['undergrad', 'phd_direct', 'postdoc', 'faculty']);
    // 这一条是整个 M1 的验收点:串线的表现就是 master 出现在直博的路径里
    expect(run.phases).not.toContain('master');
    expect(run.phases).not.toContain('school');
    expect(run.endingId).toBe('end_faculty');
  });

  it('先硕士后博士走完整五段,与直博汇合在同一条尾巴上', () => {
    const run = playRoute(pack, 12, 'go_master');
    expect(run.phases).toEqual(['undergrad', 'master', 'phd_after_master', 'postdoc', 'faculty']);
    expect(run.endingId).toBe('end_faculty');
  });

  it.each([
    ['go_clinical', 'clinical', 'end_clinical'],
    ['go_school', 'school', 'end_school'],
    ['go_industry', 'industry', 'end_industry'],
  ])('%s 进入自己的终局阶段 %s 并收在 %s(多个 isFinal 并存)', (choiceId, phaseId, endingId) => {
    const run = playRoute(pack, 13, choiceId);
    expect(run.phases).toEqual(['undergrad', phaseId]);
    expect(run.endingId).toBe(endingId);
  });

  it('每条路径的长度就是它自己的 rounds 之和,不受相邻阶段影响', () => {
    // 直博:本科 1 + 直博 5 + 博后 2 + 预聘 3 = 11 个回合
    expect(playRoute(pack, 14, 'go_phd_direct').years).toHaveLength(11);
    // 硕士读博:1 + 3 + 3 + 2 + 3 = 12
    expect(playRoute(pack, 14, 'go_master').years).toHaveLength(12);
    // 临床:1 + 4 = 5
    expect(playRoute(pack, 14, 'go_clinical').years).toHaveLength(5);
  });

  it('nextPhaseId 指向不存在的阶段时立刻抛错,而不是静默走到别处', () => {
    const broken = routingPack();
    const phase = broken.timeline[5];
    if (phase?.kind !== 'rounds') throw new Error('fixture changed');
    phase.nextPhaseId = 'no_such_phase';
    expect(() => playRoute(broken, 15, 'go_phd_direct')).toThrow(/unknown nextPhaseId: no_such_phase/);
  });
});

describe('M1 阶段配置扩展', () => {
  /** 一条 flow → rounds 的最小时间线,rounds 阶段可按需改造 */
  function phasePack(overrides: Partial<Extract<ContentPack['timeline'][number], { kind: 'rounds' }>>): ContentPack {
    const pack = miniPack();
    const life = pack.timeline[1];
    if (life?.kind !== 'rounds') throw new Error('fixture changed');
    Object.assign(life, overrides);
    return pack;
  }

  function drive(pack: ContentPack, seed: number) {
    const engine = createEngine(pack);
    let state = engine.start(seed);
    const briefs: { year: number }[] = [];
    const screens: string[] = [];
    let guard = 0;
    while (guard++ < 500) {
      const view = engine.view(state);
      screens.push(view.kind);
      if (view.kind === 'ENDING') return { briefs, screens, state };
      let action: PlayerAction;
      switch (view.kind) {
        case 'TITLE':
          action = { type: 'START' };
          break;
        case 'BACKGROUND_DRAW':
          action = pickTraits(engine, state);
          break;
        case 'SETUP':
          action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' };
          break;
        case 'EXAM':
          action = { type: 'ANSWER', optionIndex: 0 };
          break;
        case 'APPLICATION':
          action = { type: 'APPLY', optionId: view.options[0]!.id };
          break;
        case 'LIFE_GOAL':
          action = { type: 'CHOOSE_LIFE_GOAL', goalId: view.goals[0]!.id };
          break;
        case 'EVENT':
          action = { type: 'CHOOSE', choiceId: view.choices[0]!.id };
          break;
        case 'BRIEF':
          briefs.push({ year: view.year });
          action = { type: 'CONTINUE' };
          break;
        default:
          action = { type: 'CONTINUE' };
      }
      state = engine.dispatch(state, action);
    }
    throw new Error('drive did not finish');
  }

  it('yearsPerRound 让一个回合推进多年', () => {
    const oneYear = drive(phasePack({ rounds: 3, briefs: ['a', 'b', 'c'] }), 21);
    expect(oneYear.briefs.map(b => b.year)).toEqual([2014, 2015, 2016]);

    const twoYears = drive(phasePack({ rounds: 3, briefs: ['a', 'b', 'c'], yearsPerRound: 2 }), 21);
    expect(twoYears.briefs.map(b => b.year)).toEqual([2014, 2016, 2018]);
  });

  it('roundOpeners 每轮都先走开场屏,走完才进 BRIEF', () => {
    const pack = phasePack({ rounds: 2, briefs: ['a', 'b'], roundOpeners: ['LIFE_GOAL'] });
    pack.lifeGoals = [
      { id: 'goal_x', label: 'X', text: 'X', scoringWeights: { method: 1, clinical: 0, capital: 0, state: 0, money: 0 } },
    ];
    const run = drive(pack, 22);
    // 每一个 BRIEF 前面紧挨着一个 LIFE_GOAL,两个回合各一次
    const openerBeforeBrief = run.screens.filter((kind, i) => kind === 'LIFE_GOAL' && run.screens[i + 1] === 'BRIEF');
    expect(openerBeforeBrief).toHaveLength(2);
  });

  it('没有 roundOpeners 的阶段直接进 BRIEF(前作行为不变)', () => {
    const run = drive(phasePack({ rounds: 2, briefs: ['a', 'b'] }), 23);
    expect(run.screens).not.toContain('LIFE_GOAL');
    expect(run.briefs).toHaveLength(2);
  });
});

describe('M1 DSL:flagNum / addFlag', () => {
  const pack = miniPack();
  const engine = createEngine(pack);

  function ctxWith(flags: Record<string, boolean | number | string>) {
    const state = engine.start(31);
    Object.assign(state.flags, flags);
    return { state, pack, rng: new Rng(31) };
  }

  it('缺失的累积量读作 0,不需要内容侧先初始化', () => {
    const ctx = ctxWith({});
    expect(evalCondition({ flagNum: { key: 'burnout', op: '<', value: 1 } }, ctx)).toBe(true);
    expect(evalCondition({ flagNum: { key: 'burnout', op: '>=', value: 1 } }, ctx)).toBe(false);
  });

  it('比较数值型累积量', () => {
    const ctx = ctxWith({ clinical_hours: 120 });
    expect(evalCondition({ flagNum: { key: 'clinical_hours', op: '>=', value: 100 } }, ctx)).toBe(true);
    expect(evalCondition({ flagNum: { key: 'clinical_hours', op: '>', value: 120 } }, ctx)).toBe(false);
    expect(evalCondition({ flagNum: { key: 'clinical_hours', op: '==', value: 120 } }, ctx)).toBe(true);
  });

  it('布尔 flag 读作 1/0,字符串读作 0', () => {
    const ctx = ctxWith({ entered_lab: true, no_lab: false, college: 'science' });
    expect(evalCondition({ flagNum: { key: 'entered_lab', op: '==', value: 1 } }, ctx)).toBe(true);
    expect(evalCondition({ flagNum: { key: 'no_lab', op: '==', value: 0 } }, ctx)).toBe(true);
    expect(evalCondition({ flagNum: { key: 'college', op: '==', value: 0 } }, ctx)).toBe(true);
  });

  it('addFlag 累加、按 min/max 钳位,并与 flagNum 共用同一套读取口径', () => {
    const state = engine.start(32);
    applyEffects([{ addFlag: { key: 'supervision_hours', delta: 8 } }], state, pack);
    applyEffects([{ addFlag: { key: 'supervision_hours', delta: 8 } }], state, pack);
    expect(state.flags.supervision_hours).toBe(16);

    applyEffects([{ addFlag: { key: 'burnout', delta: 40, min: 0, max: 100 } }], state, pack);
    applyEffects([{ addFlag: { key: 'burnout', delta: 90, min: 0, max: 100 } }], state, pack);
    expect(state.flags.burnout).toBe(100);
    applyEffects([{ addFlag: { key: 'burnout', delta: -200, min: 0, max: 100 } }], state, pack);
    expect(state.flags.burnout).toBe(0);
  });

  it('addFlag 作用在非数值现值上时按 0 起算', () => {
    const state = engine.start(33);
    state.flags.integrity_risk = 'oops';
    applyEffects([{ addFlag: { key: 'integrity_risk', delta: 5 } }], state, pack);
    expect(state.flags.integrity_risk).toBe(5);
  });
});

describe('M1 延毕(extendPhase)与精力格(grantSlots)', () => {
  function extendPack(): ContentPack {
    const pack = miniPack();
    const life = pack.timeline[1];
    if (life?.kind !== 'rounds') throw new Error('fixture changed');
    life.rounds = 2;
    life.briefs = ['第一年', '第二年'];
    life.allocationSlots = 3;
    return pack;
  }

  it('extendPhase 给当前阶段追加轮数,累加而不是覆盖', () => {
    const pack = extendPack();
    const engine = createEngine(pack);
    const state = engine.start(41);
    applyEffects([{ extendPhase: { rounds: 1 } }], state, pack);
    expect(state.phaseExtraRounds).toBe(1);
    applyEffects([{ extendPhase: { rounds: 2 } }], state, pack);
    expect(state.phaseExtraRounds).toBe(3);
  });

  it('延毕真的让玩家在同一个阶段多待一年', () => {
    const pack = extendPack();
    const ev = pack.events[0]!;
    ev.mandatory = true;
    ev.once = false;
    ev.choices[0]!.outcomes[0]!.effects = [{ extendPhase: { rounds: 1 } }, { stats: { state: -5 } }];

    const engine = createEngine(pack);
    let state = engine.start(42);
    const years: number[] = [];
    let guard = 0;
    // 每年都选"延一年",但延毕只在当前阶段生效;阶段长度 2 + 追加 → 实际打满 4 年后仍会收尾
    while (guard++ < 200) {
      const view = engine.view(state);
      if (view.kind === 'ENDING') break;
      let action: PlayerAction;
      switch (view.kind) {
        case 'TITLE': action = { type: 'START' }; break;
        case 'BACKGROUND_DRAW': action = pickTraits(engine, state); break;
        case 'SETUP': action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' }; break;
        case 'EXAM': action = { type: 'ANSWER', optionIndex: 0 }; break;
        case 'APPLICATION': action = { type: 'APPLY', optionId: view.options[0]!.id }; break;
        case 'BRIEF': years.push(view.year); action = { type: 'CONTINUE' }; break;
        // 只在前两年延毕,避免无限延
        case 'EVENT':
          action = { type: 'CHOOSE', choiceId: years.length <= 2 ? view.choices[0]!.id : view.choices[1]!.id };
          break;
        default: action = { type: 'CONTINUE' };
      }
      state = engine.dispatch(state, action);
    }
    // 基础 2 轮 + 延了 2 次 = 4 年
    expect(years).toEqual([2014, 2015, 2016, 2017]);
  });

  it('进入新阶段时清零延毕轮数(延毕不跨阶段继承)', () => {
    const pack = miniPack();
    const gaokao = pack.timeline[0];
    if (gaokao?.kind !== 'flow') throw new Error('fixture changed');
    const engine = createEngine(pack);
    let state = engine.start(43);
    state = engine.dispatch(state, { type: 'START' });
    // 在开局流程里先埋一笔延毕,进入 rounds 阶段后必须被清掉
    applyEffects([{ extendPhase: { rounds: 5 } }], state, pack);
    expect(state.phaseExtraRounds).toBe(5);
    const finished = autoPlay(pack, 43);
    expect(finished.phaseExtraRounds).toBe(0);
  });

  it('grantSlots 改本回合精力格,effectiveSlots 是唯一的读取口径', () => {
    const pack = extendPack();
    const life = pack.timeline[1]!;
    const engine = createEngine(pack);
    const state = engine.start(44);
    expect(effectiveSlots(state, life)).toBe(3);

    applyEffects([{ grantSlots: -1 }], state, pack);
    expect(effectiveSlots(state, life)).toBe(2);
    applyEffects([{ grantSlots: 2 }], state, pack);
    expect(effectiveSlots(state, life)).toBe(4);

    // 被吃到负数只意味着这一年什么都推不动,不倒扣
    applyEffects([{ grantSlots: -99 }], state, pack);
    expect(effectiveSlots(state, life)).toBe(0);
  });

  it('精力格的临时增减每回合清零', () => {
    const pack = extendPack();
    const ev = pack.events[0]!;
    ev.mandatory = true;
    ev.choices[0]!.outcomes[0]!.effects = [{ grantSlots: -2 }, { stats: { state: -1 } }];
    const engine = createEngine(pack);
    let state = engine.start(45);
    let guard = 0;
    let sawGrant = false;
    while (guard++ < 200) {
      const view = engine.view(state);
      if (view.kind === 'ENDING') break;
      if ((state.grantedSlots ?? 0) !== 0) sawGrant = true;
      // 每个回合开始(BRIEF 之前)格数都该是干净的
      if (view.kind === 'BRIEF') expect(state.grantedSlots).toBe(0);
      let action: PlayerAction;
      switch (view.kind) {
        case 'TITLE': action = { type: 'START' }; break;
        case 'BACKGROUND_DRAW': action = pickTraits(engine, state); break;
        case 'SETUP': action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' }; break;
        case 'EXAM': action = { type: 'ANSWER', optionIndex: 0 }; break;
        case 'APPLICATION': action = { type: 'APPLY', optionId: view.options[0]!.id }; break;
        case 'EVENT': action = { type: 'CHOOSE', choiceId: view.choices[0]!.id }; break;
        default: action = { type: 'CONTINUE' };
      }
      state = engine.dispatch(state, action);
    }
    expect(sawGrant).toBe(true);
  });
});

// ============================================================================
// M2:投入分配与课程系统
// ============================================================================

/** 一个带 ALLOCATION 开场屏 + 课程的最小内容包 */
function coursePack(): ContentPack {
  const pack = miniPack();
  const life = pack.timeline[1];
  if (life?.kind !== 'rounds') throw new Error('fixture changed');
  life.rounds = 2;
  life.briefs = ['大一', '大二'];
  life.roundOpeners = ['ALLOCATION'];
  life.allocationSlots = 4;
  life.courseYearFrom = 1;
  pack.courses = [
    {
      id: 'crs_stats',
      label: '心理统计学',
      textbook: '张厚粲《现代心理与教育统计学》',
      year: 1,
      statKey: 'method',
      masteryFlag: 'mastered_stats',
      finalExam: { questionIds: ['cq_p' ] },
      outcomes: {
        mastered: [{ stats: { method: 6 } }],
        passed: [{ stats: { method: 2 } }],
        failed: [{ stats: { state: -5 } }, { addFlag: { key: 'retake_slots', delta: 1, min: 0, max: 3 } }],
      },
    },
    {
      id: 'crs_year2',
      label: '实验心理学',
      year: 2,
      statKey: 'method',
      outcomes: {
        mastered: [{ stats: { method: 4 } }],
        passed: [{ stats: { method: 1 } }],
        failed: [{ stats: { state: -2 } }],
      },
    },
  ];
  pack.courseExamBank = [
    {
      id: 'cq_p',
      track: 'both',
      subject: '心理统计学',
      text: 'p = .04 的正确解读是?',
      options: ['有 96% 的概率结论是对的', '假设零假设为真,得到当前或更极端结果的概率是 4%'],
      answerIndex: 1,
    },
  ];
  pack.allocationItems = [
    {
      id: 'alloc_crs_stats',
      label: '啃心理统计学',
      text: '张厚粲。',
      category: 'course',
      courseId: 'crs_stats',
      maxSlots: 2,
      perSlot: [{ stats: { method: 1 } }],
    },
    {
      id: 'alloc_lab',
      label: '进实验室搬砖',
      text: '大二就能进。',
      category: 'lab',
      // 门槛开放时间不对称:实验室 2014(第一年)就开,咨询中心要 2015
      availableWhen: { year: { from: 2014 } },
      perSlot: [
        { stats: { method: 3 } },
        { addFlag: { key: 'lab_years', delta: 1, min: 0, max: 8 } },
      ],
    },
    {
      id: 'alloc_counseling',
      label: '咨询中心值班',
      text: '大三才开门。',
      category: 'counseling',
      availableWhen: { year: { from: 2015 } },
      perSlot: [{ stats: { clinical: 4 } }],
    },
    { id: 'alloc_rest', label: '休息', text: '什么都不干。', category: 'rest', maxSlots: 4, perSlot: [{ stats: { state: 5 } }] },
  ];
  return pack;
}

/** 走到第一个 ALLOCATION 屏 */
function reachAllocation(pack: ContentPack, seed: number) {
  const engine = createEngine(pack);
  let state = engine.start(seed);
  state = engine.dispatch(state, { type: 'START' });
  state = engine.dispatch(state, pickTraits(engine, state));
  state = engine.dispatch(state, { type: 'CHOOSE_SETUP', gender: 'male', track: '理' });
  state = engine.dispatch(state, { type: 'SKIP_EXAM' });
  state = engine.dispatch(state, { type: 'CONTINUE' });
  state = engine.dispatch(state, { type: 'APPLY', optionId: 'app1' });
  state = engine.dispatch(state, { type: 'CONTINUE' });
  return { engine, state };
}

describe('M2 年度投入分配', () => {
  it('每回合开场先进 ALLOCATION,分配完才进 BRIEF', () => {
    const pack = coursePack();
    const { engine, state } = reachAllocation(pack, 51);
    const view = engine.view(state);
    expect(view.kind).toBe('ALLOCATION');
    if (view.kind !== 'ALLOCATION') return;
    expect(view.slots).toBe(4);
    expect(view.retakeSlots).toBe(0);
    // 课程项带上教材名,分配屏直接显示"张厚粲《现代心理与教育统计学》"
    expect(view.items.find(i => i.id === 'alloc_crs_stats')?.textbook).toContain('张厚粲');

    const after = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_crs_stats', 'alloc_crs_stats', 'alloc_lab', 'alloc_rest'],
    });
    expect(engine.view(after).kind).toBe('BRIEF');
    expect(after.allocation?.picks).toHaveLength(4);
  });

  it('投两格就应用两次 perSlot(今年主要就干这个,数值上真的不一样)', () => {
    const pack = coursePack();
    const { engine, state } = reachAllocation(pack, 52);
    const methodBefore = state.stats.method;
    const one = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_lab', 'alloc_rest', 'alloc_rest', 'alloc_rest'],
    });
    const two = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_lab', 'alloc_lab', 'alloc_rest', 'alloc_rest'],
    });
    expect(one.stats.method - methodBefore).toBe(3);
    expect(two.stats.method - methodBefore).toBe(6);
    expect(two.flags.lab_years).toBe(2);
  });

  it('拒绝格数不对、不存在、超过 maxSlots 的提交', () => {
    const pack = coursePack();
    const { engine, state } = reachAllocation(pack, 53);
    expect(() => engine.dispatch(state, { type: 'ALLOCATE', picks: ['alloc_rest'] })).toThrow(
      /expects exactly 4 picks/,
    );
    expect(() =>
      engine.dispatch(state, { type: 'ALLOCATE', picks: ['nope', 'alloc_rest', 'alloc_rest', 'alloc_rest'] }),
    ).toThrow(/unknown or unavailable item/);
    // 心理统计最多两格
    expect(() =>
      engine.dispatch(state, {
        type: 'ALLOCATE',
        picks: ['alloc_crs_stats', 'alloc_crs_stats', 'alloc_crs_stats', 'alloc_rest'],
      }),
    ).toThrow(/allows at most 2 slots/);
  });

  it('门槛开放时间不对称:实验室先开门整整一年', () => {
    const pack = coursePack();
    const { engine, state } = reachAllocation(pack, 54);
    const first = engine.view(state);
    if (first.kind !== 'ALLOCATION') throw new Error('expected ALLOCATION');
    const firstYearIds = first.items.map(i => i.id);
    // 第一年:实验室开着,咨询中心没开
    expect(firstYearIds).toContain('alloc_lab');
    expect(firstYearIds).not.toContain('alloc_counseling');

    // 推进到第二年
    let s = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_rest', 'alloc_rest', 'alloc_rest', 'alloc_rest'],
    });
    let guard = 0;
    while (guard++ < 50 && engine.view(s).kind !== 'ALLOCATION') {
      const v = engine.view(s);
      if (v.kind === 'ENDING') throw new Error('ended too early');
      s = engine.dispatch(
        s,
        v.kind === 'EVENT'
          ? { type: 'CHOOSE', choiceId: v.choices[0]!.id }
          : v.kind === 'EXAM'
            ? { type: 'ANSWER', optionIndex: 0 }
            : { type: 'CONTINUE' },
      );
    }
    const second = engine.view(s);
    if (second.kind !== 'ALLOCATION') throw new Error('expected second ALLOCATION');
    expect(second.items.map(i => i.id)).toContain('alloc_counseling');
  });

  it('投入分配在事件抽取之前生效(投了实验室,当年的实验室事件才该出现)', () => {
    const pack = coursePack();
    pack.events.push({
      id: 'ev_lab_only',
      pools: ['main'],
      mandatory: true,
      title: '实验室的事',
      text: '只有进了实验室才会遇到',
      trigger: { flagNum: { key: 'lab_years', op: '>=', value: 1 } },
      choices: [{ id: 'a', text: 'A', outcomes: [{ weight: 1, text: 'A', effects: [{ stats: { method: 1 } }] }] }],
    });
    const { engine, state } = reachAllocation(pack, 55);
    const withLab = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_lab', 'alloc_rest', 'alloc_rest', 'alloc_rest'],
    });
    // 这一条是 M2 抓到的真 bug:前作在 startRound 里就抽好了事件,
    // 于是本年度的投入永远影响不到本年度的事件池。
    expect(withLab.eventQueue).toContain('ev_lab_only');

    const withoutLab = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_rest', 'alloc_rest', 'alloc_rest', 'alloc_rest'],
    });
    expect(withoutLab.eventQueue).not.toContain('ev_lab_only');
  });
});

describe('M2 课程三档判定', () => {
  it('masteryChance 随投入格数、属性、期末小测单调上升', () => {
    const pack = coursePack();
    const course = pack.courses![0]!;
    const engine = createEngine(pack);
    const state = engine.start(61);
    state.stats.method = 50;
    const base = masteryChance(state, course, 0, false);
    expect(masteryChance(state, course, 2, false)).toBeGreaterThan(base);
    expect(masteryChance(state, course, 0, true)).toBeCloseTo(base + 0.15, 5);
    state.stats.method = 80;
    expect(masteryChance(state, course, 0, false)).toBeGreaterThan(base);
  });

  it('只判定当前学年开设的课', () => {
    const pack = coursePack();
    const engine = createEngine(pack);
    const state = engine.start(62);
    state.phaseIndex = 1;
    state.roundIndex = 0;
    const rng = new Rng(1);
    const results = resolveCourses(state, pack, rng, 1);
    expect(results.map(r => r.courseId)).toEqual(['crs_stats']);
  });

  it('学通写入能力标签,挂科给下一年记一笔重修', () => {
    const pack = coursePack();
    const engine = createEngine(pack);
    const course = pack.courses![0]!;

    // 逼出"学通":属性拉满 + 投满 + 小测答对
    const win = engine.start(63);
    win.stats.method = 100;
    win.allocation = { slots: 4, picks: ['alloc_crs_stats', 'alloc_crs_stats'] };
    win.courseExamResults = { crs_stats: true };
    resolveCourses(win, pack, new Rng(5), 1);
    expect(win.flags[course.masteryFlag!]).toBe(true);
    expect(win.lastCourseResults?.[0]?.tier).toBe('mastered');

    // 逼出"挂了":属性极低 + 完全不投。多个种子里至少有一次挂科并记上重修。
    let sawFail = false;
    for (let seed = 1; seed <= 40 && !sawFail; seed++) {
      const lose = engine.start(64);
      lose.stats.method = 0;
      lose.allocation = { slots: 4, picks: [] };
      resolveCourses(lose, pack, new Rng(seed), 1);
      if (lose.lastCourseResults?.[0]?.tier === 'failed') {
        sawFail = true;
        expect(lose.flags[RETAKE_FLAG]).toBe(1);
      }
    }
    expect(sawFail).toBe(true);
  });

  it('重修真的吃掉下一年的一格精力', () => {
    const pack = coursePack();
    const phase = pack.timeline[1]!;
    const engine = createEngine(pack);
    const state = engine.start(65);
    expect(effectiveSlots(state, phase)).toBe(4);
    state.flags[RETAKE_FLAG] = 1;
    expect(effectiveSlots(state, phase)).toBe(3);
    state.flags[RETAKE_FLAG] = 9;
    expect(effectiveSlots(state, phase)).toBe(0);
  });

  it('两座大山的期末小测走 EXAM 屏,答完才进年度结算', () => {
    const pack = coursePack();
    const { engine, state } = reachAllocation(pack, 66);
    let s = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_crs_stats', 'alloc_crs_stats', 'alloc_rest', 'alloc_rest'],
    });
    // BRIEF → 事件 → 课程小测 → SETTLEMENT
    const screens: string[] = [];
    let guard = 0;
    while (guard++ < 60) {
      const v = engine.view(s);
      screens.push(v.kind);
      if (v.kind === 'SETTLEMENT') break;
      s = engine.dispatch(
        s,
        v.kind === 'EVENT'
          ? { type: 'CHOOSE', choiceId: v.choices[0]!.id }
          : v.kind === 'EXAM'
            ? { type: 'ANSWER', optionIndex: 1 }
            : { type: 'CONTINUE' },
      );
    }
    // 小测在年度结算之前
    expect(screens.indexOf('EXAM')).toBeGreaterThan(-1);
    expect(screens.indexOf('EXAM')).toBeLessThan(screens.indexOf('SETTLEMENT'));
    expect(s.examKind).toBe('course');
    const settlement = engine.view(s);
    if (settlement.kind !== 'SETTLEMENT') throw new Error('expected SETTLEMENT');
    // 年度回顾页给出课程判定结果
    expect(settlement.courseResults.map(c => c.label)).toEqual(['心理统计学']);
  });

  it('跳过期末小测按答错处理,不额外惩罚', () => {
    const pack = coursePack();
    const { engine, state } = reachAllocation(pack, 67);
    let s = engine.dispatch(state, {
      type: 'ALLOCATE',
      picks: ['alloc_crs_stats', 'alloc_rest', 'alloc_rest', 'alloc_rest'],
    });
    let guard = 0;
    while (guard++ < 60 && engine.view(s).kind !== 'EXAM') {
      const v = engine.view(s);
      if (v.kind === 'SETTLEMENT' || v.kind === 'ENDING') throw new Error('no course exam appeared');
      s = engine.dispatch(s, v.kind === 'EVENT' ? { type: 'CHOOSE', choiceId: v.choices[0]!.id } : { type: 'CONTINUE' });
    }
    const skipped = engine.dispatch(s, { type: 'SKIP_EXAM' });
    expect(engine.view(skipped).kind).toBe('SETTLEMENT');
    expect(skipped.courseExamResults).toEqual({});
  });
});

// ============================================================================
// M2.5:课题管线(毕业论文教学关)
// ============================================================================

/** 一个带课题模板的最小内容包 */
function projectPack(): ContentPack {
  const pack = miniPack();
  const life = pack.timeline[1];
  if (life?.kind !== 'rounds') throw new Error('fixture changed');
  life.rounds = 2;
  life.briefs = ['第一年', '第二年'];
  pack.projectTemplates = [
    {
      id: 'tpl_thesis',
      titles: ['论文甲', '论文乙'],
      domain: 'general',
      stageSequence: ['ideation', 'collect', 'analyze', 'write', 'review'],
      isThesis: true,
    },
    {
      id: 'tpl_real',
      titles: ['真课题'],
      domain: 'cognition',
      stageSequence: ['ideation', 'lit', 'collect'],
    },
  ];
  return pack;
}

describe('M2.5 课题状态机', () => {
  const pack = projectPack();
  const engine = createEngine(pack);

  function fresh() {
    const state = engine.start(81);
    state.date = { year: 2018, month: 6 };
    return state;
  }

  it('create 按模板初始化,并按创建顺序取标题(不消耗随机流)', () => {
    const state = fresh();
    applyEffects([{ project: { op: 'create', templateId: 'tpl_thesis' } }], state, pack);
    const thesis = thesisOf(state);
    expect(thesis?.id).toBe('proj_1');
    expect(thesis?.stage).toBe('ideation');
    expect(thesis?.isThesis).toBe(true);
    expect(thesis?.startedYear).toBe(2018);
    expect(thesis?.title).toBe('论文甲');

    // 第二个课题拿下一个标题。**标题轮取而不是随机**:applyEffects 拿不到 RNG,
    // 而引擎偷偷消耗随机流会让同种子的回放漂移。
    applyEffects([{ project: { op: 'create', templateId: 'tpl_real' } }], state, pack);
    expect(state.projects).toHaveLength(2);
    expect(state.projects?.[1]?.title).toBe('真课题');
  });

  it('advance 沿模板声明的序列走,走完落在终态', () => {
    const state = fresh();
    applyEffects([{ project: { op: 'create', templateId: 'tpl_thesis' } }], state, pack);
    const stages: string[] = [];
    for (let i = 0; i < 6; i++) {
      applyEffects([{ project: { op: 'advance', target: 'thesis' } }], state, pack);
      stages.push(thesisOf(state)!.stage);
    }
    expect(stages).toEqual(['collect', 'analyze', 'write', 'review', 'published', 'published']);
  });

  it('两个模板走两条不同的序列(引擎不知道有哪些阶段)', () => {
    const state = fresh();
    applyEffects([{ project: { op: 'create', templateId: 'tpl_real' } }], state, pack);
    applyEffects([{ project: { op: 'advance' } }], state, pack);
    expect(state.projects?.[0]?.stage).toBe('lit');
    applyEffects([{ project: { op: 'advance' } }, { project: { op: 'advance' } }], state, pack);
    // tpl_real 只有三步,推到底就是终态
    expect(state.projects?.[0]?.stage).toBe('published');
  });

  it('regress 退回一步(地基塌方 / 答辩没过)', () => {
    const state = fresh();
    applyEffects(
      [
        { project: { op: 'create', templateId: 'tpl_thesis' } },
        { project: { op: 'advance', target: 'thesis', stages: 3 } },
      ],
      state,
      pack,
    );
    expect(thesisOf(state)?.stage).toBe('write');
    applyEffects([{ project: { op: 'regress', target: 'thesis' } }], state, pack);
    expect(thesisOf(state)?.stage).toBe('analyze');
    // 退不到序列之前
    applyEffects([{ project: { op: 'regress', target: 'thesis', stages: 9 } }], state, pack);
    expect(thesisOf(state)?.stage).toBe('ideation');
  });

  it('setField 累加并钳位;abandon 直接进终态', () => {
    const state = fresh();
    applyEffects([{ project: { op: 'create', templateId: 'tpl_thesis' } }], state, pack);
    applyEffects(
      [{ project: { op: 'setField', target: 'thesis', quality: 30, integrityRisk: 20 } }],
      state,
      pack,
    );
    expect(thesisOf(state)?.quality).toBe(70);
    expect(thesisOf(state)?.integrityRisk).toBe(20);
    applyEffects([{ project: { op: 'setField', target: 'thesis', quality: 90 } }], state, pack);
    expect(thesisOf(state)?.quality).toBe(100);

    applyEffects([{ project: { op: 'abandon', target: 'thesis' } }], state, pack);
    expect(thesisOf(state)?.stage).toBe('abandoned');
  });

  it('projectCount 按阶段 / 领域 / 是否毕业论文计数', () => {
    const state = fresh();
    applyEffects(
      [
        { project: { op: 'create', templateId: 'tpl_thesis' } },
        { project: { op: 'create', templateId: 'tpl_real' } },
      ],
      state,
      pack,
    );
    const ctx = { state, pack, rng: new Rng(1) };
    expect(evalCondition({ projectCount: { op: '==', value: 2 } }, ctx)).toBe(true);
    expect(evalCondition({ projectCount: { isThesis: true, op: '==', value: 1 } }, ctx)).toBe(true);
    expect(evalCondition({ projectCount: { stage: 'ideation', op: '==', value: 2 } }, ctx)).toBe(true);
    expect(evalCondition({ projectCount: { domain: 'cognition', op: '==', value: 1 } }, ctx)).toBe(true);
    expect(evalCondition({ projectCount: { stage: 'analyze', op: '>=', value: 1 } }, ctx)).toBe(false);
  });

  it('年度结算给未终结的课题记一年,终态不再计数', () => {
    const state = fresh();
    applyEffects(
      [
        { project: { op: 'create', templateId: 'tpl_thesis' } },
        { project: { op: 'create', templateId: 'tpl_real' } },
      ],
      state,
      pack,
    );
    applyEffects([{ project: { op: 'abandon', target: 'proj_2' } }], state, pack);
    ageProjects(state);
    ageProjects(state);
    expect(state.projects?.[0]?.yearsSpent).toBe(2);
    expect(state.projects?.[1]?.yearsSpent).toBe(0);
  });

  it('create 引用不存在的模板时抛错,而不是静默什么都不做', () => {
    const state = fresh();
    expect(() =>
      applyEffects([{ project: { op: 'create', templateId: 'nope' } }], state, pack),
    ).toThrow(/unknown template: nope/);
  });
});

describe('M2.5 跳阶段时不能残留 pendingFlowAdvance', () => {
  it('岔口 jumpToPhase 之后,新阶段不会在回合中间重抽事件队列', () => {
    // 前作的一处交互:flow 屏的处理函数会同时设置 pendingFlowAdvance 和(通过 effects)
    // pendingJumpPhaseId。跳转提前 return 时如果不清掉那个待办,它会残留到新阶段,
    // 让下一次 OUTCOME 误走 nextStep → enterBrief → **在回合中间重新抽一次事件队列**,
    // 把玩家还没看到的事件静默丢掉。
    const pack = miniPack();
    pack.timeline = [
      {
        kind: 'flow',
        id: 'gaokao',
        label: '开局',
        date: { year: 2014, month: 6 },
        steps: ['BACKGROUND_DRAW', 'SETUP', 'EXAM', 'APPLICATION', 'CROSSROAD'],
        nextPhaseId: 'life',
      },
      {
        kind: 'rounds',
        id: 'life',
        label: '人生',
        date: { year: 2018, month: 9 },
        rounds: 1,
        eventSlots: 2,
        pools: ['main'],
        briefs: ['那一年'],
        isFinal: true,
      },
    ];
    pack.crossroadOptions = [
      {
        id: 'jump',
        label: '跳过去',
        text: '跳。',
        group: 'gaokao',
        effects: [{ stats: { method: 1 } }, { jumpToPhase: 'life' }],
      },
    ];
    // 两个 mandatory 事件:如果队列被重抽,第二个就再也见不到了
    pack.events = [
      {
        id: 'ev_first',
        pools: ['main'],
        mandatory: true,
        order: 1,
        title: '第一件事',
        text: '第一件事',
        choices: [{ id: 'a', text: 'A', outcomes: [{ weight: 1, text: 'A', effects: [{ stats: { method: 1 } }] }] }],
      },
      {
        id: 'ev_second',
        pools: ['main'],
        mandatory: true,
        order: 2,
        title: '第二件事',
        text: '第二件事',
        choices: [{ id: 'a', text: 'A', outcomes: [{ weight: 1, text: 'A', effects: [{ stats: { method: 1 } }] }] }],
      },
    ];

    const engine = createEngine(pack);
    let state = engine.start(91);
    const seenEvents: string[] = [];
    const briefCount = { value: 0 };
    let guard = 0;
    while (guard++ < 200) {
      const view = engine.view(state);
      if (view.kind === 'ENDING') break;
      if (view.kind === 'BRIEF') briefCount.value += 1;
      if (view.kind === 'EVENT') seenEvents.push(view.eventId);
      let action: PlayerAction;
      switch (view.kind) {
        case 'TITLE': action = { type: 'START' }; break;
        case 'BACKGROUND_DRAW': action = pickTraits(engine, state); break;
        case 'SETUP': action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' }; break;
        case 'EXAM': action = { type: 'SKIP_EXAM' }; break;
        case 'APPLICATION': action = { type: 'APPLY', optionId: view.options[0]!.id }; break;
        case 'CROSSROAD': action = { type: 'CHOOSE_CROSSROAD', optionId: 'jump' }; break;
        case 'EVENT': action = { type: 'CHOOSE', choiceId: view.choices[0]!.id }; break;
        default: action = { type: 'CONTINUE' };
      }
      state = engine.dispatch(state, action);
    }
    // 一个回合只该有一个 BRIEF
    expect(briefCount.value).toBe(1);
    // 两个 mandatory 事件都要被看到
    expect(seenEvents).toEqual(['ev_first', 'ev_second']);
    expect(state.pendingFlowAdvance).toBe(false);
  });
});

// ============================================================================
// M3:课题管线一级精度(掷骰、发表、导师)
// ============================================================================

describe('M3 阶段推进的掷骰', () => {
  const pack = projectPack();

  function stateWith(method: number, slots: number, advisorId?: string) {
    const engine = createEngine(pack);
    const state = engine.start(101);
    state.stats.method = method;
    state.projects = [
      {
        id: 'proj_1', templateId: 'tpl_real', title: 't', domain: 'cognition',
        stage: 'collect', quality: 40, yearsSpent: 1, authorship: 'first',
        integrityRisk: 0, rejections: 0, preregistered: false, startedYear: 2019,
      },
    ];
    state.allocation = {
      slots: 3,
      picks: Array.from({ length: slots }, () => allocationIdForProject('proj_1')),
    };
    if (advisorId) state.advisor = { id: advisorId, favor: 50, stage: 'joined' };
    return state;
  }

  it('成功率随方法与投入格数上升,但**永远留着失败的余地**', () => {
    const low = stageSuccessChance(stateWith(30, 0), pack, stateWith(30, 0).projects![0]!);
    const mid = stateWith(70, 0);
    const high = stateWith(95, 2);
    expect(stageSuccessChance(mid, pack, mid.projects![0]!)).toBeGreaterThan(low);
    expect(stageSuccessChance(high, pack, high.projects![0]!)).toBeGreaterThan(
      stageSuccessChance(mid, pack, mid.projects![0]!),
    );
    // 这一条是 GAME_DESIGN 五节第一条硬约束的机制保证:不存在稳定刷论文的最优解
    expect(stageSuccessChance(high, pack, high.projects![0]!)).toBeLessThanOrEqual(
      1 - MIN_SETBACK_CHANCE,
    );
  });

  it('导师原型是乘数:放养型让每一站都按比例变难', () => {
    const packWithAdvisors: ContentPack = {
      ...pack,
      advisors: [
        {
          id: 'adv_ok', archetype: 'x', name: 'A', publicImpression: '',
          initialStage: 's', initialFavor: 50, stages: { s: {} },
        },
        {
          id: 'adv_bad', archetype: 'y', name: 'B', publicImpression: '',
          projectModifiers: { collect: 0.6 },
          initialStage: 's', initialFavor: 50, stages: { s: {} },
        },
      ],
    };
    const good = stateWith(70, 1, 'adv_ok');
    const bad = stateWith(70, 1, 'adv_bad');
    expect(stageSuccessChance(bad, packWithAdvisors, bad.projects![0]!)).toBeLessThan(
      stageSuccessChance(good, packWithAdvisors, good.projects![0]!),
    );
  });

  it('投入格数决定一年掷几次骰', () => {
    expect(advanceAttempts(stateWith(70, 0), stateWith(70, 0).projects![0]!)).toBeLessThan(
      advanceAttempts(stateWith(70, 2), stateWith(70, 2).projects![0]!),
    );
  });

  it('连续几年没投过精力的课题会烂在手里', () => {
    const state = stateWith(70, 0);
    const project = state.projects![0]!;
    expect(shouldAbandonBySilence(project)).toBe(false);
    project.neglectedYears = NEGLECT_YEARS_TO_ABANDON;
    expect(shouldAbandonBySilence(project)).toBe(true);
  });

  it('投稿被拒够多次也算烂了', () => {
    const state = stateWith(70, 1);
    const project = state.projects![0]!;
    project.rejections = MAX_REJECTIONS;
    expect(shouldAbandonBySilence(project)).toBe(true);
  });

  it('投稿与审稿这两站看课题质量,别的站不看', () => {
    const low = stateWith(70, 1);
    const high = stateWith(70, 1);
    low.projects![0]!.quality = 20;
    high.projects![0]!.quality = 90;
    // collect 站不看质量
    expect(stageSuccessChance(low, pack, low.projects![0]!)).toBeCloseTo(
      stageSuccessChance(high, pack, high.projects![0]!),
      5,
    );
    low.projects![0]!.stage = 'review';
    high.projects![0]!.stage = 'review';
    expect(stageSuccessChance(high, pack, high.projects![0]!)).toBeGreaterThan(
      stageSuccessChance(low, pack, low.projects![0]!),
    );
  });
});

describe('M3 发表与论文清单', () => {
  const pack = projectPack();
  const engine = createEngine(pack);

  it('推过最后一站就自动变成一篇论文,档位由质量决定', () => {
    const state = engine.start(111);
    state.date = { year: 2023, month: 6 };
    applyEffects([{ project: { op: 'create', templateId: 'tpl_real' } }], state, pack);
    const project = state.projects![0]!;
    project.quality = 90;
    project.integrityRisk = 30;
    applyEffects([{ project: { op: 'advance', stages: 5 } }], state, pack);
    expect(project.stage).toBe('published');
    expect(state.papers).toHaveLength(1);
    const paper = state.papers![0]!;
    expect(paper.tier).toBe('q1');
    expect(paper.year).toBe(2023);
    // **诚信风险结转到论文。** 结局页"哪几篇后来重复不出来"读的就是这个值。
    expect(paper.integrityRisk).toBe(30);
    // null = 从来没有人试过重复。这是绝大多数论文的真实结局,也是默认值。
    expect(paper.replicated).toBeNull();
  });

  it('毕业论文走完管线不产出论文对象(它是教学关,不是一篇文章)', () => {
    const state = engine.start(112);
    applyEffects([{ project: { op: 'create', templateId: 'tpl_thesis' } }], state, pack);
    applyEffects([{ project: { op: 'advance', target: 'thesis', stages: 9 } }], state, pack);
    expect(thesisOf(state)?.stage).toBe('published');
    expect(state.papers ?? []).toHaveLength(0);
  });

  it('tierForQuality 单调', () => {
    expect(tierForQuality(95)).toBe('q1');
    expect(tierForQuality(70)).toBe('q2');
    expect(tierForQuality(55)).toBe('q3');
    expect(tierForQuality(10)).toBe('chinese_core');
  });

  it('paperCount 按档位与作者位次计数', () => {
    const state = engine.start(113);
    state.papers = [
      { id: 'p1', title: 'a', tier: 'q1', authorship: 'first', year: 2022, domain: 'x', integrityRisk: 0 },
      { id: 'p2', title: 'b', tier: 'q3', authorship: 'second', year: 2023, domain: 'x', integrityRisk: 0 },
    ];
    const ctx = { state, pack, rng: new Rng(1) };
    expect(evalCondition({ paperCount: { op: '==', value: 2 } }, ctx)).toBe(true);
    expect(evalCondition({ paperCount: { tier: 'q1', op: '==', value: 1 } }, ctx)).toBe(true);
    expect(evalCondition({ paperCount: { authorship: 'first', op: '>=', value: 1 } }, ctx)).toBe(true);
    expect(evalCondition({ paperCount: { tier: 'q2', op: '>=', value: 1 } }, ctx)).toBe(false);
  });
});

describe('M3 导师', () => {
  function advisorPack(): ContentPack {
    const pack = miniPack();
    const flow = pack.timeline[0]!;
    if (flow.kind !== 'flow') throw new Error('fixture changed');
    flow.steps.push('ADVISOR_DRAW');
    pack.advisors = [
      { id: 'a1', archetype: 'star', name: '甲老师', publicImpression: '主页上三十篇一区。', initialStage: 'joined', initialFavor: 30, stages: { joined: {} } },
      { id: 'a2', archetype: 'warm', name: '乙老师', publicImpression: '师兄师姐都夸。', initialStage: 'joined', initialFavor: 65, stages: { joined: {} } },
      { id: 'a3', archetype: 'boundary', name: '丙老师', publicImpression: '横向做得很大。', initialStage: 'joined', initialFavor: 40, stages: { joined: {} } },
    ];
    return pack;
  }

  it('抽卡屏**只给公开印象**,真实原型不进 ViewModel', () => {
    const pack = advisorPack();
    const engine = createEngine(pack);
    const state = engine.start(121);
    state.screen = 'ADVISOR_DRAW';
    state.phaseIndex = 0;
    state.advisorOffer = ['a1', 'a2', 'a3'];
    const view = engine.view(state);
    if (view.kind !== 'ADVISOR_DRAW') throw new Error('expected ADVISOR_DRAW');
    expect(view.candidates).toHaveLength(3);
    // 这一条是七节那个信息差的机制保证:archetype 一旦漏进 ViewModel,
    // "你什么都不知道的时候可以换"就不成立了。
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('star');
    expect(serialized).not.toContain('boundary');
    expect(serialized).toContain('主页上三十篇一区');
  });

  it('JOIN_ADVISOR 只接受候选池里的人', () => {
    const pack = advisorPack();
    const engine = createEngine(pack);
    const state = engine.start(122);
    state.screen = 'ADVISOR_DRAW';
    state.phaseIndex = 0;
    state.flowStepIndex = 4;
    state.advisorOffer = ['a1', 'a2'];
    expect(() => engine.dispatch(state, { type: 'JOIN_ADVISOR', advisorId: 'a3' })).toThrow(
      /not in offer/,
    );
    const joined = engine.dispatch(state, { type: 'JOIN_ADVISOR', advisorId: 'a2' });
    expect(joined.advisor).toEqual({ id: 'a2', favor: 65, stage: 'joined' });
    expect(joined.advisorOffer).toEqual([]);
  });

  it('{ advisor } 条件能按原型 / 阶段 / 好感度分支', () => {
    const pack = advisorPack();
    const engine = createEngine(pack);
    const state = engine.start(123);
    state.advisor = { id: 'a3', favor: 20, stage: 'joined' };
    const ctx = { state, pack, rng: new Rng(1) };
    expect(evalCondition({ advisor: {} }, ctx)).toBe(true);
    expect(evalCondition({ advisor: { archetype: 'boundary' } }, ctx)).toBe(true);
    expect(evalCondition({ advisor: { archetype: 'warm' } }, ctx)).toBe(false);
    expect(evalCondition({ advisor: { favor: { op: '<', value: 30 } } }, ctx)).toBe(true);
    expect(evalCondition({ advisor: { stage: 'known' } }, ctx)).toBe(false);

    applyEffects([{ advisorFavor: 15 }, { advisorStage: 'known' }], state, pack);
    expect(state.advisor?.favor).toBe(35);
    expect(state.advisor?.stage).toBe('known');
    // 没有导师时,条件恒假,效果静默无操作
    const noAdvisor = engine.start(124);
    expect(evalCondition({ advisor: {} }, { state: noAdvisor, pack, rng: new Rng(1) })).toBe(false);
    expect(() => applyEffects([{ advisorFavor: 5 }], noAdvisor, pack)).not.toThrow();
  });
});

/**
 * 这一轮是玩家实际打通一局之后报回来的七个问题。**七个里有六个静态检查都查不出来**——
 * 它们要么是"某一屏上多了一项"、要么是"同一幕放了两遍",只有把游戏当成时间线整体看才成立。
 * 所以每一条都在这里钉一颗钉子。
 */
describe('M3.1 实机反馈修复', () => {
  it('省略 date 的阶段沿用当前日期,不把时钟拨回去', () => {
    // 硕士毕业(2021)走进"大厂用研"时看到"2019 年",因为那个阶段的 date 写死成 2019。
    // 这几个阶段有两个入口(大四岔口和硕士岔口),写死年份必然让其中一个入口时间倒流。
    const pack = miniPack();
    pack.timeline = [
      { ...pack.timeline[0]! },
      {
        kind: 'rounds', id: 'life', label: '人生', date: { year: 2020, month: 9 },
        rounds: 1, eventSlots: 0, pools: [], briefs: ['第一年'], nextPhaseId: 'tail',
      },
      // 不写 date:该沿用走到这里时的年份
      {
        kind: 'rounds', id: 'tail', label: '之后', rounds: 1, eventSlots: 0,
        pools: [], briefs: ['之后'], isFinal: true,
      },
    ];
    const engine = createEngine(pack);
    let state = engine.start(7);
    const seen: number[] = [];
    for (let guard = 0; guard < 200; guard++) {
      const view = engine.view(state);
      if (view.kind === 'ENDING') break;
      seen.push(state.date.year);
      let action: PlayerAction;
      switch (view.kind) {
        case 'TITLE': action = { type: 'START' }; break;
        case 'BACKGROUND_DRAW': action = pickTraits(engine, state); break;
        case 'SETUP': action = { type: 'CHOOSE_SETUP', gender: 'male', track: '理' }; break;
        case 'EXAM': action = { type: 'ANSWER', optionIndex: 0 }; break;
        case 'APPLICATION': action = { type: 'APPLY', optionId: view.options[0]!.id }; break;
        case 'EVENT': action = { type: 'CHOOSE', choiceId: view.choices[0]!.id }; break;
        default: action = { type: 'CONTINUE' };
      }
      state = engine.dispatch(state, action);
    }
    // 走到过那个没写 date 的阶段,而且年份只允许递增。**这就是那个 bug 的全部内容。**
    expect(seen.some(y => y >= 2020)).toBe(true);
    for (let i = 1; i < seen.length; i++) expect(seen[i]!).toBeGreaterThanOrEqual(seen[i - 1]!);
  });

  it('同一个课题不会两年收到同一幕阶段事件', () => {
    // 卡在收数据的课题连着两年收到同一封"被试招不满",文案里还写着"这是第 2 年"。
    // 阶段事件全是 once:false(要能跨课题复用),所以全局那条去重管不到它。
    const pack = projectPack();
    pack.projectTemplates = [{
      id: 'tpl_t', titles: ['课题'], domain: 'social',
      stageSequence: ['collect', 'write'],
    }];
    pack.events = [...pack.events, {
      id: 'ev_stage_only', pools: [], projectStage: 'collect', once: false,
      title: '唯一的一幕', text: '收数据',
      choices: [{ id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [] }] }],
    }];
    const engine = createEngine(pack);
    const state = engine.start(11);
    state.projects = [{
      id: 'proj_1', templateId: 'tpl_t', title: '课题', domain: 'social',
      stage: 'collect', quality: 40, yearsSpent: 1, authorship: 'first',
      integrityRisk: 0, rejections: 0, preregistered: false, startedYear: 2019,
    }];
    const project = state.projects[0]!;
    const roundsPhase = pack.timeline.find(ph => ph.kind === 'rounds')!;
    if (roundsPhase.kind !== 'rounds') throw new Error('fixture changed');
    const rng = new Rng(3);
    // 连挑三年。**课题一直卡在 collect**,而池子里只有这一幕。
    const rounds = [0, 1, 2].map(() => {
      project.stage = 'collect';
      return pickRoundEvents(state, pack, rng, roundsPhase).includes('ev_stage_only');
    });
    expect(rounds[0]).toBe(true);
    expect(rounds.slice(1)).toEqual([false, false]);
    expect(project.seenEventIds).toEqual(['ev_stage_only']);
  });
});
