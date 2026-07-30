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
  acceptanceChance,
  institutionsFor,
  collapsingProjects,
  pickFoundation,
  admissionTierFor,
  admissionBar,
  resolveAdmission,
  tierForQuality,
  applyCaseOp,
  countCases,
  dropoutChance,
  rollCaseTrends,
  settleCaseYear,
  openNewCasesForYear,
  MIN_DROPOUT_CHANCE,
  ALLOC_CASEWORK_ID,
  meetRival,
  advanceRivalYear,
  rivalStatusLine,
  favorTotal,
  openFavors,
  settleOwingPressure,
  askableRumors,
  askRumor,
  asksLeft,
  hasHeard,
  MAX_ASKS_PER_ROUND,
  marketTightnessFor,
  spouseHireAvailable,
  letterWeightFor,
  materialQualityFor,
  buildJobMarketView,
  startJobMarket,
  buildTenureReview,
  tenurePassed,
  ALLOC_ADVISOR_CONSULT_ID,
  ADVISOR_CONSULT_FLAG,
  acceptanceChanceFor,
  targetTierOf,
  rollAdvisorConsult,
  ALLOC_SUPERVISION_ID,
  MIN_SETBACK_CHANCE,
  MAX_REJECTIONS,
  NEGLECT_YEARS_TO_ABANDON,
  RETAKE_FLAG,
  CURRENT_SAVE_VERSION,
  evalCondition,
  eventStateValence,
  pickRoundEvents,
  fillNarrativeSlots,
  selectContextLine,
  startInventory,
  answerInventory,
  migrateSaveFile,
  restoreSave,
  Rng,
  type ContentPack,
  type Engine,
  type GameState,
  type PlayerAction,
} from '../src/index';

const TEST_INVENTORY = {
  id: 'inv_test',
  name: '测试短表',
  disclaimer: '这不是诊断，也不是评估。',
  direction: 'distress' as const,
  items: Array.from({ length: 2 }, (_, index) => ({
    text: `题目 ${index + 1}`,
    options: [
      { text: '没有', score: 0 },
      { text: '经常', score: 3 },
    ],
  })),
  bands: [
    { min: 0, max: 2, label: '低', text: '低分' },
    { min: 3, max: 6, label: '高', text: '高分' },
  ],
  discrepancy: [
    { minGap: 18, text: '自报明显更好：{{score}} / {{state}}' },
    { minGap: -17, text: '大致一致' },
    { minGap: -100, text: '自报明显更差' },
  ],
};

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
    state.flags.npc_roommate_bond = true;
    state.flags.npc_teacher_closure = true;
    const view = engine.view(state);
    expect(view.kind).toBe('ENDING');
    if (view.kind !== 'ENDING') return;
    expect(view.relationships.map(relationship => relationship.npcId)).toEqual([
      'npc_advisor_to_be',
      'npc_roommate',
    ]);
    expect(view.relationships.map(relationship => relationship.title)).toEqual([
      '不必被确认的影响',
      '仍然能一起浪费时间的人',
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
    expect(outcomeView(['partner_warm']).relationshipHint).toContain('你的选择会被这段关系记住');
    expect(outcomeView(['partner_warm', 'partner_cool']).relationshipHint).toBeUndefined();
  });

  it('shows a milestone hint exactly when a route reaches its warm threshold', () => {
    expect(outcomeView(['partner_warm', 'partner_cool', 'partner_warm']).relationshipHint).toBeUndefined();
    expect(outcomeView(['partner_warm', 'partner_cool', 'partner_warm', 'partner_warm']).relationshipHint)
      .toContain('正在改变这段关系未来的走向');
    expect(outcomeView(['partner_warm', 'partner_warm', 'partner_warm', 'partner_warm']).relationshipHint)
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

/** 一个带 DESK 开场屏 + 课程的最小内容包 */
function coursePack(): ContentPack {
  const pack = miniPack();
  const life = pack.timeline[1];
  if (life?.kind !== 'rounds') throw new Error('fixture changed');
  life.rounds = 2;
  life.briefs = ['大一', '大二'];
  life.roundOpeners = ['DESK'];
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
      payoff: '1 格 = 方法 +1,学通的把握大很多',
      category: 'course',
      courseId: 'crs_stats',
      maxSlots: 2,
      perSlot: [{ stats: { method: 1 } }],
    },
    {
      id: 'alloc_lab',
      label: '进实验室搬砖',
      text: '大二就能进。',
      payoff: '1 格 = 方法 +3,实验室年数 +1',
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
      payoff: '1 格 = 临床 +4',
      category: 'counseling',
      availableWhen: { year: { from: 2015 } },
      perSlot: [{ stats: { clinical: 4 } }],
    },
    { id: 'alloc_rest', label: '休息', text: '什么都不干。', payoff: '1 格 = 状态 +5', category: 'rest', maxSlots: 4, perSlot: [{ stats: { state: 5 } }] },
  ];
  return pack;
}

/** 走到第一个 DESK 屏 */
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
  it('每回合开场先进 DESK,分配完才进 BRIEF', () => {
    const pack = coursePack();
    const { engine, state } = reachAllocation(pack, 51);
    const view = engine.view(state);
    expect(view.kind).toBe('DESK');
    if (view.kind !== 'DESK') return;
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
    if (first.kind !== 'DESK') throw new Error('expected DESK');
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
    while (guard++ < 50 && engine.view(s).kind !== 'DESK') {
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
    if (second.kind !== 'DESK') throw new Error('expected second DESK');
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
    // tpl_real 只有三步。**真课题推到底会停在最后一站等接收判定**,不会自动发表;
    // 毕业论文(上一条用例)才是推过最后一站就直接完成——它是教学关,不投稿。
    expect(state.projects?.[0]?.stage).toBe('collect');
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
          id: 'adv_ok', archetype: 'x', availability: 'rare', name: 'A', publicImpression: '',
          initialStage: 's', initialFavor: 50, stages: { s: {} },
        },
        {
          id: 'adv_bad', archetype: 'y', availability: 'rare', name: 'B', publicImpression: '',
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

  it('推进只推到最后一站为止,发表由接收判定决定', () => {
    // **契约在 M3.3 变了。** 原来是"推过最后一站就自动发表",后果是课题从来不会
    // 停在审稿上:到达那一年的骰子成功一次就直接发出去了,于是 `rejections`
    // 一次都加不上去(3000 局里分布是 `{0: 323, 1: 1}`)。
    // 现在推进被卡在最后一站,能不能发由每年一次的接收判定决定。
    const state = engine.start(111);
    state.date = { year: 2023, month: 6 };
    applyEffects([{ project: { op: 'create', templateId: 'tpl_real' } }], state, pack);
    const project = state.projects![0]!;
    project.quality = 90;
    project.integrityRisk = 30;
    applyEffects([{ project: { op: 'advance', stages: 5 } }], state, pack);
    // 推 5 站也只停在最后一站,不会越过它
    expect(project.stage).toBe('collect');
    expect(state.papers ?? []).toHaveLength(0);
    // 显式发表(接收判定成功走的就是这一条)才产出论文
    applyEffects([{ project: { op: 'publish', tier: 'q1' } }], state, pack);
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
      { id: 'a1', archetype: 'star', availability: 'rare', name: '甲老师', publicImpression: '主页上三十篇一区。', initialStage: 'joined', initialFavor: 30, stages: { joined: {} } },
      { id: 'a2', archetype: 'warm', availability: 'rare', name: '乙老师', publicImpression: '师兄师姐都夸。', initialStage: 'joined', initialFavor: 65, stages: { joined: {} } },
      { id: 'a3', archetype: 'boundary', availability: 'rare', name: '丙老师', publicImpression: '横向做得很大。', initialStage: 'joined', initialFavor: 40, stages: { joined: {} } },
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

/**
 * M3.3 让"投稿被拒"这条死法真的会开火。
 *
 * 在此之前它是一条**死规则**:3000 局里 `rejections` 的分布是 `{0: 323, 1: 1}`,
 * 而所有门禁都是绿的——因为课题从来不会停在审稿上,到达那一年就直接发出去了。
 */
describe('M3.3 接收判定', () => {
  const pack = projectPack();

  it('接收率不随投入格数增长,而且质量的斜率比推进陡一倍', () => {
    const engine = createEngine(pack);
    function at(quality: number, slots: number) {
      const state = engine.start(77);
      applyEffects([{ project: { op: 'create', templateId: 'tpl_real' } }], state, pack);
      const project = state.projects![0]!;
      project.quality = quality;
      project.stage = 'collect'; // tpl_real 的最后一站
      state.allocation = {
        slots: 3,
        picks: Array.from({ length: slots }, () => allocationIdForProject(project.id)),
      };
      return { state, project };
    }
    // **多投精力不能把审稿刷过去。** 推进那边投入是加数,这边完全不进公式——
    // 投出去之后你能做的事很少,这条差别就是这个职业最不讲理的地方。
    const lean = at(50, 0);
    const heavy = at(50, 2);
    expect(acceptanceChance(heavy.state, pack, heavy.project)).toBeCloseTo(
      acceptanceChance(lean.state, pack, lean.project),
      5,
    );
    expect(stageSuccessChance(heavy.state, pack, heavy.project)).toBeGreaterThan(
      stageSuccessChance(lean.state, pack, lean.project),
    );

    // 质量在接收上的斜率是推进上的两倍:立论不结实的文章,再努力也只是被拒得慢一点
    const weak = at(20, 0);
    const strong = at(80, 0);
    const acceptSpread =
      acceptanceChance(strong.state, pack, strong.project) - acceptanceChance(weak.state, pack, weak.project);
    const advanceSpread =
      stageSuccessChance(strong.state, pack, strong.project) - stageSuccessChance(weak.state, pack, weak.project);
    expect(acceptSpread).toBeGreaterThan(advanceSpread);
  });

  it('被拒够 MAX_REJECTIONS 次就不再投了', () => {
    const engine = createEngine(pack);
    const state = engine.start(78);
    applyEffects([{ project: { op: 'create', templateId: 'tpl_real' } }], state, pack);
    const project = state.projects![0]!;
    project.stage = 'collect';
    project.rejections = MAX_REJECTIONS - 1;
    expect(shouldAbandonBySilence(project)).toBe(false);
    project.rejections = MAX_REJECTIONS;
    expect(shouldAbandonBySilence(project)).toBe(true);
  });
});

/**
 * M3.5 真实素材层。
 *
 * 这一组盯的不是数值,是**内容真实性的机制保障**:
 * 概率不给精确值、清单按 kind 过滤、一个都没中是允许的结果。
 */
describe('M3.5 录取判定', () => {
  /**
   * **core 不许 import content**(引擎不知道内容存在),所以这里用夹具。
   * "真内容里每种 kind 够 8 所"由 validate 规则 15 守,那是内容的事,不是引擎的事。
   */
  function applyPack(): ContentPack {
    const pack = projectPack();
    pack.gameifiedTermsNotice = '条款为游戏化设定。';
    pack.institutions = [
      {
        id: 'inst_top', name: '甲大学', unit: '心理学部', region: 'cn', city: 'A',
        tier: 'a_plus', domains: ['domain_cogneuro'], impression: '强',
        gameified: {}, admits: ['master', 'phd'],
      },
      {
        id: 'inst_mid', name: '乙大学', unit: '心理学院', region: 'cn', city: 'B',
        tier: 'b_plus', domains: ['domain_social'], impression: '稳',
        gameified: { admission: { quota: '统考为主' }, employment: { tenured: true } },
        admits: ['master', 'phd'],
      },
      {
        id: 'inst_abroad', name: 'C University', unit: 'Dept', region: 'overseas', city: 'C',
        tier: 'europe', domains: ['domain_cogneuro'], impression: '远',
        gameified: {}, admits: ['phd_abroad'],
      },
    ];
    const flow = pack.timeline.find(p => p.kind === 'flow');
    if (flow?.kind !== 'flow') throw new Error('fixture changed');
    flow.steps = ['GRAD_APPLY'];
    flow.gradApplyKind = 'master';
    return pack;
  }

  function applicant(pack: ContentPack, method: number, capital: number, domains: string[] = []) {
    const state = createEngine(pack).start(301);
    state.stats.method = method;
    state.stats.capital = capital;
    for (const d of domains) state.flags[d] = true;
    return state;
  }

  it('清单按 kind 过滤:出国那份不混进国内院校', () => {
    const pack = applyPack();
    expect(institutionsFor(pack, 'master').map(i => i.id)).toEqual(['inst_top', 'inst_mid']);
    expect(institutionsFor(pack, 'phd_abroad').map(i => i.id)).toEqual(['inst_abroad']);
  });

  it('方向对得上会改善档位——本科四年在这里兑现', () => {
    const pack = applyPack();
    const target = pack.institutions![0]!;
    const blind = applicant(pack, 62, 45);
    const matched = applicant(pack, 62, 45, ['domain_cogneuro']);
    expect(admissionTierFor(matched, target, 'master').chance).toBeGreaterThan(
      admissionTierFor(blind, target, 'master').chance,
    );
  });

  it('出国的门槛比读硕高:语言、推荐信、没人认识你,合成一个门槛', () => {
    const pack = applyPack();
    const inst = pack.institutions![2]!;
    expect(admissionBar(inst, 'phd_abroad')).toBeGreaterThan(admissionBar(inst, 'master'));
  });

  it('**全冲高:想去的一个都不中是高概率结果**,而这不是 bug', () => {
    // GAME_DESIGN 9.3 第一条:"一个都没有"必须是高概率的真实结果。
    // 这条断言存在的意义是防止后人把它"修好"——落榜是这一屏要教的东西。
    const pack = applyPack();
    const weak = applicant(pack, 40, 15);
    let allRejected = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = resolveAdmission(weak, pack, 'master', ['inst_top'], new Rng(seed));
      if (Object.values(r.outcomes).every(v => v === 'rejected')) allRejected += 1;
    }
    expect(allRejected).toBeGreaterThan(100);
  });

  it('想去的都没中时由调剂接住——升学不该有"什么都没发生"这个结果', () => {
    // 全灭之后如果游戏原样把玩家送进硕士阶段,那是在撒谎:
    // 他一所都没考上,却出现在了研一的组会上。现实里这一步叫调剂,
    // 而它的质感恰恰最真实:**你最后去的是一个你本来根本没考虑过的地方。**
    const pack = applyPack();
    const weak = applicant(pack, 40, 15);
    const r = resolveAdmission(weak, pack, 'master', ['inst_top'], new Rng(2));
    if (Object.values(r.outcomes).every(v => v === 'rejected')) {
      expect(r.viaAdjustment).toBe(true);
      expect(r.landed).not.toBeNull();
      // 兜底取清单上门槛最低的那所,而且不会是他投过的那所
      expect(r.landed).not.toBe('inst_top');
    }
  });

  it('结果屏之后头部换成新学校,而且能读到去向 flag', () => {
    // 实机反馈:选完院校直接进了研一,既没有结果屏,顶上还挂着本科那所学校。
    const pack = applyPack();
    const engine = createEngine(pack);
    let state = applicant(pack, 80, 60, ['domain_cogneuro']);
    state.phaseIndex = pack.timeline.findIndex(p => p.kind === 'flow');
    state.screen = 'GRAD_APPLY';
    state.profile.university = '某地方本科院校';
    state = engine.dispatch(state, { type: 'APPLY_GRAD', institutionIds: ['inst_top'] });
    // **投完必须停在结果屏**,不能直接进下一阶段
    expect(engine.view(state).kind).toBe('GRAD_RESULT');
    state = engine.dispatch(state, { type: 'CONTINUE' });
    const landed = state.gradApplication?.landed;
    expect(landed).toBeTruthy();
    expect(state.profile.university).toBe(pack.institutions!.find(i => i.id === landed)!.name);
    expect(state.flags[`admitted_${landed}`]).toBe(true);
  });

  it('中了多所时去门槛最高的那所', () => {
    const pack = applyPack();
    const strong = applicant(pack, 99, 95, ['domain_cogneuro', 'domain_social']);
    const result = resolveAdmission(strong, pack, 'master', ['inst_mid', 'inst_top'], new Rng(9));
    if (result.outcomes.inst_top === 'admitted') expect(result.landed).toBe('inst_top');
  });

  it('ViewModel 只给模糊档位,不给精确概率', () => {
    const pack = applyPack();
    const engine = createEngine(pack);
    const state = applicant(pack, 70, 55, ['domain_social']);
    state.phaseIndex = pack.timeline.findIndex(p => p.kind === 'flow');
    state.screen = 'GRAD_APPLY';
    const view = engine.view(state);
    if (view.kind !== 'GRAD_APPLY') throw new Error('expected GRAD_APPLY view');
    expect(view.notice.trim().length).toBeGreaterThan(0);
    // 真实的申请里没有人知道自己的确切概率。给了数字,这一屏就变成一道最优化题,
    // 而那道题的答案是全投稳的——恰好把这件事最真实的部分抹掉了。
    expect(JSON.stringify(view)).not.toMatch(/"chance":\s*0\./);
    expect(view.options.every(o => ['稳', '较稳', '冲', '悬', '基本无望'].includes(o.chanceLabel))).toBe(true);
  });

  it('**读硕的清单上不许出现聘用条款**', () => {
    // 第一版把 gameified 的所有字段一股脑渲染,于是考研那一屏印着
    // "预聘期约 6 年 · 预聘期内要有代表作与主持项目"——那是十年后求职季才关心的东西。
    // 玩家一眼就看出来了,而所有门禁都是绿的:没有任何检查知道"这行字不该出现在这里"。
    const pack = applyPack();
    pack.institutions![1]!.gameified.employment = {
      tenureYears: 6, tenureBar: '要有代表作', tenured: true, housing: '有安家补贴',
      startupFunds: [300000, 1500000], teachingLoad: '2-2',
    };
    const engine = createEngine(pack);
    const state = applicant(pack, 70, 55);
    state.phaseIndex = pack.timeline.findIndex(p => p.kind === 'flow');
    state.screen = 'GRAD_APPLY';
    const view = engine.view(state);
    if (view.kind !== 'GRAD_APPLY') throw new Error('expected GRAD_APPLY view');
    const allTerms = view.options.flatMap(o => o.terms).join(' ');
    for (const leak of ['预聘', '代表作', '安家', '启动经费', '2-2', '编制']) {
      expect(allTerms).not.toContain(leak);
    }
    // 招生侧仍然要有内容,否则卡片就空了
    expect(view.options.some(o => o.terms.length > 0)).toBe(true);
  });
});

/**
 * M3.6 文献可靠性机制。
 *
 * 这一组盯的是**这个机制会不会静默失效**——它最容易的死法不是报错,
 * 是塌方年份挑得不对,于是一次都不触发,而所有门禁都是绿的。
 */
describe('M3.6 地基塌方', () => {
  function fndPack(): ContentPack {
    const pack = projectPack();
    const cit = (id: string, year: number) => ({
      id, authors: 'A et al.', year, venue: 'V', gist: 'g', verified: true,
    });
    pack.foundations = [
      {
        id: 'fnd_falls', label: '会塌的', domains: ['domain_cognition'],
        origin: cit('c_o', 2000), hypeYears: [2000, 2020],
        replicationFailure: { year: 2021, citation: cit('c_f', 2021) },
        skepticHint: '原始研究只有 20 个人。',
      },
      {
        id: 'fnd_stands', label: '站得住的', domains: ['domain_cognition'],
        origin: cit('c_s', 2006), hypeYears: [2006, 2024], replicationFailure: null,
      },
      {
        id: 'fnd_early', label: '塌得太早', domains: ['domain_cognition'],
        origin: cit('c_e', 1996), hypeYears: [1996, 2012],
        // **不进分配池**:它塌的时候玩家手上还没有能被砸中的课题
        assignable: false,
        replicationFailure: { year: 2015, citation: cit('c_ef', 2015) },
      },
    ];
    return pack;
  }

  function projectOn(pack: ContentPack, foundationId: string, year: number) {
    const state = createEngine(pack).start(5);
    state.date = { year, month: 6 };
    state.projects = [{
      id: 'proj_1', templateId: 'tpl_real', title: 't', domain: 'cognition',
      stage: 'lit', quality: 50, yearsSpent: 2, authorship: 'first',
      integrityRisk: 0, rejections: 0, preregistered: false, startedYear: year - 2,
      foundationId,
    }];
    return state;
  }

  it('塌方只在真实的那一年、只砸活跃课题', () => {
    const pack = fndPack();
    expect(collapsingProjects(projectOn(pack, 'fnd_falls', 2021), pack)).toHaveLength(1);
    // 早一年晚一年都不算——年份是这个机制唯一的说服力来源
    expect(collapsingProjects(projectOn(pack, 'fnd_falls', 2020), pack)).toHaveLength(0);
    expect(collapsingProjects(projectOn(pack, 'fnd_stands', 2021), pack)).toHaveLength(0);
  });

  it('一个课题只塌一次', () => {
    const pack = fndPack();
    const state = projectOn(pack, 'fnd_falls', 2021);
    state.projects![0]!.foundationShaken = true;
    expect(collapsingProjects(state, pack)).toHaveLength(0);
  });

  it('**塌在课题窗口之前的基础不进分配池**——否则会造出一个永不触发的机制', () => {
    const pack = fndPack();
    const rng = new Rng(1);
    const picked = new Set<string>();
    for (let i = 0; i < 200; i++) picked.add(pickFoundation(pack, 'cognition', rng)!.id);
    expect(picked.has('fnd_early')).toBe(false);
    // 会塌的和不会塌的必须混在同一个池子里:抽到哪条纯看运气,
    // 这正是"事后看全是明牌,身处其中全是迷雾"在数值上的样子
    expect(picked.has('fnd_falls')).toBe(true);
    expect(picked.has('fnd_stands')).toBe(true);
  });

  it('怀疑主义特质才看得到样本量那一行,别人看不到', () => {
    const pack = fndPack();
    const engine = createEngine(pack);
    function boardHint(skeptic: boolean): string | undefined {
      const state = projectOn(pack, 'fnd_falls', 2021);
      if (skeptic) state.flags.trait_skeptic = true;
      // 工作台读阶段名(顶上那一行),所以要落在一个真的 rounds 阶段上
      state.phaseIndex = 1;
      state.screen = 'DESK';
      state.allocation = { slots: 1, picks: [] };
      const view = engine.view(state);
      if (view.kind !== 'DESK') throw new Error('expected DESK');
      return view.projects[0]?.foundationHint;
    }
    expect(boardHint(true)).toBe('原始研究只有 20 个人。');
    // **不是隐藏一个提示,是这条信息对别人根本不存在。**
    // 它给的只是一个当时就印在论文里的数字,不告诉你结论——要不要往下想是你的事。
    expect(boardHint(false)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// M4 个案状态机(临床线骨架)
// ─────────────────────────────────────────────────────────────

function casePack(): ContentPack {
  const pack = miniPack();
  pack.caseTemplates = [
    {
      id: 'tpl_low',
      label: '低风险个案',
      presentingIssues: ['主诉一', '主诉二'],
      riskLevel: 'low',
      orientationFit: ['orientation_cbt'],
    },
    {
      id: 'tpl_dyn',
      label: '动力学顺手的个案',
      presentingIssues: ['主诉甲'],
      riskLevel: 'moderate',
      orientationFit: ['orientation_dynamic'],
    },
    {
      id: 'tpl_high',
      label: '高风险个案',
      presentingIssues: ['主诉危'],
      riskLevel: 'high',
      // 机构不会把高风险个案分给没有底子的新手
      availableWhen: { stat: 'clinical', op: '>=', value: 55 },
      orientationFit: ['orientation_cbt'],
    },
  ];
  pack.events.push(
    {
      id: 'ev_case_w1',
      pools: [],
      caseStatus: 'working',
      once: false,
      title: '会谈',
      text: '「{{case}}」',
      choices: [
        { id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [{ stats: { clinical: 1 } }] }] },
      ],
    },
    {
      id: 'ev_case_w2',
      pools: [],
      caseStatus: 'working',
      once: false,
      title: '会谈二',
      text: '{{issue}}',
      choices: [
        { id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [{ stats: { clinical: 1 } }] }] },
      ],
    },
    {
      id: 'ev_case_w3',
      pools: [],
      caseStatus: 'working',
      once: false,
      title: '会谈三',
      text: '第三幕',
      choices: [
        { id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [{ stats: { clinical: 1 } }] }] },
      ],
    },
  );
  return pack;
}

describe('M4 个案状态机', () => {
  const pack = casePack();
  const engine = createEngine(pack);

  function fresh() {
    const state = engine.start(4242);
    state.date = { year: 2022, month: 7 };
    state.stats.clinical = 50;
    return state;
  }

  it('open 按模板初始化,主诉轮取,取向匹配分三档', () => {
    const state = fresh();
    // 没有取向:中性 55
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    expect(state.cases?.[0]?.id).toBe('case_1');
    expect(state.cases?.[0]?.status).toBe('intake');
    expect(state.cases?.[0]?.presentingIssue).toBe('主诉一');
    expect(state.cases?.[0]?.orientationMatch).toBe(55);

    // 有取向且命中:72;有取向不命中:46。**不命中不是不能做,是慢**——匹配只进漂移公式。
    state.flags.orientation_cbt = true;
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    expect(state.cases?.[1]?.presentingIssue).toBe('主诉二');
    expect(state.cases?.[1]?.orientationMatch).toBe(72);
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_dyn' });
    expect(state.cases?.[2]?.orientationMatch).toBe(46);
  });

  it('caseCount 与 caseTrend 条件', () => {
    const state = fresh();
    const rng = new Rng(1);
    const ctx = { state, pack, rng };
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_dyn' });
    expect(countCases(state, { active: true })).toBe(2);
    expect(evalCondition({ caseCount: { status: 'intake', op: '==', value: 2 } }, ctx)).toBe(true);
    applyCaseOp(state, pack, { op: 'drop', target: 'case_2' });
    expect(evalCondition({ caseCount: { status: 'dropped', op: '==', value: 1 } }, ctx)).toBe(true);
    expect(countCases(state, { active: true })).toBe(1);

    // caseTrend 读"当前事件绑定的那个个案"的走向
    state.cases![0]!.lastTrend = 'strained';
    state.currentCaseId = 'case_1';
    expect(evalCondition({ caseTrend: 'strained' }, ctx)).toBe(true);
    expect(evalCondition({ caseTrend: 'warm' }, ctx)).toBe(false);
  });

  it('drop 记下第几次会谈并打击状态;complete 是干净的好事', () => {
    const state = fresh();
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    state.cases![0]!.sessions = 8;
    const stateBefore = state.stats.state;
    applyCaseOp(state, pack, { op: 'drop' });
    // **脱落打击状态**——螺旋的"回击"半环。第 8 次这个数字结局页还会用。
    expect(state.cases![0]!.droppedAtSession).toBe(8);
    expect(state.stats.state).toBe(stateBefore - 5);

    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_dyn' });
    const clinicalBefore = state.stats.clinical;
    applyCaseOp(state, pack, { op: 'complete' });
    expect(state.stats.clinical).toBe(clinicalBefore + 2);
  });

  it('脱落概率有下限;督导压脱落;低状态抬脱落(螺旋的下行半环)', () => {
    const state = fresh();
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    const kase = state.cases![0]!;
    // 联盟满、有督导、状态很好——**他仍然可能不再来,而且你永远不会知道为什么**
    kase.alliance = 100;
    kase.supervised = true;
    state.stats.state = 80;
    expect(dropoutChance(state, kase)).toBe(MIN_DROPOUT_CHANCE);

    kase.supervised = false;
    const unsupervised = dropoutChance(state, kase);
    kase.supervised = true;
    expect(dropoutChance(state, kase)).toBeLessThanOrEqual(unsupervised);

    // 状态跌破 40,脱落率 +0.10:状态低 → 脱落 → 状态更低。这个螺旋必须真的存在。
    kase.alliance = 50;
    kase.supervised = false;
    state.stats.state = 60;
    const okState = dropoutChance(state, kase);
    state.stats.state = 30;
    expect(dropoutChance(state, kase)).toBeCloseTo(okState + 0.1, 5);
  });

  it('年度结算:会谈长小时数(在脱落判定之前),督导长督导小时,案量记耗竭账', () => {
    const state = fresh();
    state.allocation = { slots: 3, picks: [ALLOC_CASEWORK_ID, ALLOC_CASEWORK_ID, ALLOC_SUPERVISION_ID] };
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_dyn' });
    for (const kase of state.cases!) {
      kase.status = 'working';
      kase.alliance = 58;
    }
    rollCaseTrends(state, new Rng(9));
    // 督导按年生效:本年有督导格,所有活跃个案都算在督导中
    expect(state.cases!.every(c => c.supervised)).toBe(true);
    settleCaseYear(state, new Rng(9));
    // 会谈数在脱落判定**之前**入账(工作期 14 + 2 格投入 ×8 = 30/个案),
    // 所以哪怕年底脱落,那些小时也是真实发生过的。
    expect(state.flags.clinical_hours).toBe(60);
    expect(state.flags.supervision_hours).toBe(20);
    // 案量的耗竭账:2 个个案 = 2×4−2 = 6,督导一格 −3
    expect(state.flags.burnout).toBe(3);
  });

  it('督导按年清零:去年做过督导不等于今年还在做', () => {
    const state = fresh();
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    state.cases![0]!.supervised = true;
    state.allocation = { slots: 3, picks: [] };
    rollCaseTrends(state, new Rng(3));
    expect(state.cases![0]!.supervised).toBe(false);
  });

  it('状态机:工作期只会走向 结束期/停滞/脱落 之一,结束期一年后自然收束', () => {
    // 脱落判定有随机性,所以按种子集合验证:所有落点都必须在合法集合里,
    // 且"联盟高会谈够 → 结束期"这条主路真的会发生。
    const landed = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const state = fresh();
      state.allocation = { slots: 3, picks: [ALLOC_CASEWORK_ID] };
      applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
      const kase = state.cases![0]!;
      kase.status = 'working';
      kase.alliance = 80;
      kase.sessions = 40;
      settleCaseYear(state, new Rng(seed));
      landed.add(kase.status);
    }
    expect([...landed].every(s => ['terminating', 'dropped'].includes(s))).toBe(true);
    expect(landed.has('terminating')).toBe(true);

    const finished = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const state = fresh();
      state.allocation = { slots: 3, picks: [] };
      applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
      const kase = state.cases![0]!;
      kase.status = 'terminating';
      kase.alliance = 80;
      kase.sessions = 50;
      settleCaseYear(state, new Rng(seed));
      finished.add(kase.status);
    }
    expect([...finished].every(s => ['completed', 'dropped'].includes(s))).toBe(true);
    expect(finished.has('completed')).toBe(true);
  });

  it('开新案由"接个案"的格数决定容量,高风险模板有门槛', () => {
    const state = fresh();
    state.stats.clinical = 40; // 够不到 tpl_high 的门槛
    state.allocation = { slots: 3, picks: [ALLOC_CASEWORK_ID] };
    openNewCasesForYear(state, pack, new Rng(11));
    // 一格 = 容量 2,每年最多补 2 个
    expect(countCases(state, { active: true })).toBe(2);
    expect(state.cases!.every(c => c.templateId !== 'tpl_high')).toBe(true);
    // 容量满了就不再开
    openNewCasesForYear(state, pack, new Rng(12));
    expect(countCases(state, { active: true })).toBe(2);
    // 不投入的年份不开新案
    const idle = fresh();
    idle.allocation = { slots: 3, picks: [] };
    openNewCasesForYear(idle, pack, new Rng(11));
    expect(idle.cases ?? []).toHaveLength(0);
  });

  it("调度器 ②'':按个案状态挑事件、绑定、按个案去重、每轮上限 2", () => {
    const state = fresh();
    const phase = pack.timeline[1];
    if (phase?.kind !== 'rounds') throw new Error('fixture changed');
    state.phaseIndex = 1;
    state.allocation = { slots: 3, picks: [] };
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_low' });
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_dyn' });
    applyCaseOp(state, pack, { op: 'open', templateId: 'tpl_high' });
    for (const kase of state.cases!) kase.status = 'working';

    const picked = pickRoundEvents(state, pack, new Rng(21), phase);
    const caseEvents = picked.filter(id => id.startsWith('ev_case_w'));
    // 三个个案也只放两幕:个案事件几乎都是一场会谈的特写,连看三场分量就掉了
    expect(caseEvents).toHaveLength(2);
    for (const id of caseEvents) {
      const boundCase = state.eventCases?.[id];
      expect(boundCase).toBeDefined();
      const kase = state.cases!.find(c => c.id === boundCase);
      expect(kase?.seenEventIds).toContain(id);
    }
    // 掷骰也发生了:每个活跃个案都有今年的走向
    expect(state.cases!.every(c => c.lastTrend === 'warm' || c.lastTrend === 'strained')).toBe(true);

    // 同一个个案不重复看同一幕(跨年去重记在个案上,不在全局)
    const seenBefore = state.cases!.map(c => [...(c.seenEventIds ?? [])]);
    const again = pickRoundEvents(state, pack, new Rng(22), phase);
    for (const [index, kase] of state.cases!.entries()) {
      for (const id of seenBefore[index]!) {
        expect((kase.seenEventIds ?? []).filter(e => e === id)).toHaveLength(1);
      }
    }
    void again;
  });

  it('个案阶段事件不进普通池:没有个案时它一个都不该出现', () => {
    const state = fresh();
    const phase = pack.timeline[1];
    if (phase?.kind !== 'rounds') throw new Error('fixture changed');
    state.phaseIndex = 1;
    const picked = pickRoundEvents(state, pack, new Rng(5), phase);
    expect(picked.some(id => id.startsWith('ev_case_w'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// M4.6 工作台(DESK)
// ─────────────────────────────────────────────────────────────

describe('M4.6 工作台', () => {
  /** 一个手上有课题、有个案、有导师、挂着毕业指标的工作台状态 */
  function deskPack(): ContentPack {
    const pack = coursePack();
    pack.projectTemplates = [
      {
        id: 'tpl_real',
        titles: ['情绪调节的年龄差异'],
        domain: 'cognition',
        stageSequence: ['ideation', 'collect', 'review'],
      },
    ];
    pack.advisors = [
      {
        id: 'a1',
        archetype: 'star',
        availability: 'rare',
        name: '甲老师',
        publicImpression: '主页上三十篇一区。',
        consultResponses: [
          { id: 'star_unavailable', outcomeTag: 'unavailable', eventId: 'ev_x' },
          { id: 'star_resource', outcomeTag: 'resource', eventId: 'ev_y' },
        ],
        initialStage: 'joined',
        initialFavor: 90,
        stages: { joined: {} },
      },
    ];
    pack.institutions = [
      {
        id: 'inst_x',
        name: '某大学',
        unit: '心理学院',
        region: 'cn',
        city: '某市',
        tier: 'a_plus',
        domains: ['domain_cognition'],
        impression: '一所学校。',
        gameified: {
          admission: {
            graduationBar: '毕业要求 2 篇论文,其中 1 篇二区以上',
            graduationReq: { papers: 2, topTier: 1, topTierLabel: '二区' },
          },
        },
        admits: ['phd'],
      },
    ];
    return pack;
  }

  function deskState(pack: ContentPack) {
    const engine = createEngine(pack);
    const state = engine.start(77);
    state.phaseIndex = 1;
    state.screen = 'DESK';
    state.allocation = { slots: 3, picks: [] };
    state.admissions = { phd: 'inst_x' };
    state.advisor = { id: 'a1', favor: 90, stage: 'joined', lastLine: '"你自己看着办。"' };
    state.projects = [
      {
        id: 'proj_1',
        templateId: 'tpl_real',
        title: '情绪调节的年龄差异',
        domain: 'cognition',
        stage: 'review',
        quality: 73,
        yearsSpent: 2,
        authorship: 'first',
        integrityRisk: 0,
        rejections: 0,
        preregistered: false,
        startedYear: 2014,
      },
    ];
    state.cases = [
      {
        id: 'case_1',
        templateId: 'tpl_low',
        presentingIssue: '睡不着',
        label: '一个来访者',
        status: 'working',
        alliance: 71,
        sessions: 12,
        riskLevel: 'low',
        orientationMatch: 64,
        startedYear: 2014,
        supervised: true,
        lastTrend: 'warm',
      },
    ];
    return { engine, state };
  }

  it('原始数值不许穿过工作台:序列化后找不到 quality / alliance / favor 的数字', () => {
    const pack = deskPack();
    const { engine, state } = deskState(pack);
    const view = engine.view(state);
    if (view.kind !== 'DESK') throw new Error('expected DESK');
    const serialized = JSON.stringify(view);
    // **这三个数字一个都不能出现。** 给了数字,一屏选择就从一次判断变成一道最优化题,
    // 而那道题的答案通常很无聊(GAME_DESIGN 4.6 第二条"不借")。
    expect(serialized).not.toContain('73'); // quality
    expect(serialized).not.toContain('71'); // alliance
    expect(serialized).not.toContain('90'); // favor
    // 取而代之的是档位
    expect(view.projects[0]?.qualityLabel).toBe('结实');
    expect(view.cases[0]?.trend).toBe('warm');
    expect(view.advisor?.relationLabel).toBe('亲近');
  });

  it('导师面板给档位,不给真实原型', () => {
    const pack = deskPack();
    const { engine, state } = deskState(pack);
    const view = engine.view(state);
    if (view.kind !== 'DESK') throw new Error('expected DESK');
    // 可及性三档说的是"他忙不忙",不是"他是谁"——这条映射多对一由 validate 规则 35 守着
    expect(view.advisor?.availabilityLabel).toBe('几乎见不到');
    expect(JSON.stringify(view)).not.toContain('star');
    expect(view.advisor?.lastLine).toBe('"你自己看着办。"');
  });

  it('毕业进度只列清单、不算总分,而且会告诉你还差什么', () => {
    const pack = deskPack();
    const { engine, state } = deskState(pack);
    state.papers = [
      { id: 'p1', title: 'x', tier: 'chinese_core', authorship: 'first', year: 2014, domain: 'cognition', integrityRisk: 0 },
    ];
    const view = engine.view(state);
    if (view.kind !== 'DESK') throw new Error('expected DESK');
    expect(view.graduation?.bar).toBe('毕业要求 2 篇论文,其中 1 篇二区以上');
    expect(view.graduation?.have).toContain('中文核心 1');
    // 手上那个课题正卡在审稿:这一行是事实,不是评价
    expect(view.graduation?.have).toContain('在审 1');
    expect(view.graduation?.met).toBe(false);
    expect(view.graduation?.remaining).toContain('二区');
  });

  it('还差什么用一句话说完,不拆成顿号清单', () => {
    const pack = deskPack();
    // 这一条的门槛按三篇来测(截图里那句坏文案就是三篇要求下出来的)
    const req = pack.institutions![0]!.gameified.admission!;
    req.graduationBar = '毕业要求 3 篇论文,其中 1 篇二区以上';
    req.graduationReq = { papers: 3, topTier: 1, topTierLabel: '二区' };
    const { engine, state } = deskState(pack);
    const paper = (tier: string, id: string) => ({
      id, title: id, tier, authorship: 'first', year: 2014, domain: 'cognition', integrityRisk: 0,
    }) as NonNullable<typeof state.papers>[number];

    const remainingWith = (tiers: string[]): string | null | undefined => {
      state.papers = tiers.map((tier, i) => paper(tier, `p${i}`));
      const view = engine.view(state);
      if (view.kind !== 'DESK') throw new Error('expected DESK');
      return view.graduation?.remaining;
    };

    // 一篇 CSSCI:总共还差 2 篇,其中 1 篇得是二区。
    // **不是"还差 1 篇二区、1 篇"**——那个孤零零的"1 篇"读起来像被截断了。
    expect(remainingWith(['cssci'])).toBe('还差 2 篇,其中 1 篇二区');
    // 只差高档那一篇的时候不再报总数
    expect(remainingWith(['q2', 'cssci'])).toBe('还差 1 篇');
    expect(remainingWith(['cssci', 'cssci', 'cssci'])).toBe('还差 1 篇二区');
    // 够了就不说话
    expect(remainingWith(['q2', 'cssci', 'cssci'])).toBeNull();
  });

  it('选刊当场生效,而且不离开工作台;降档只能往下走一格', () => {
    const pack = deskPack();
    const { engine, state } = deskState(pack);
    const view = engine.view(state);
    if (view.kind !== 'DESK') throw new Error('expected DESK');
    expect(view.projects[0]?.atSubmitStage).toBe(true);
    const pick = view.actions.find(a => a.id === 'desk_choose_tier' && a.value === 'q1');
    expect(pick).toBeDefined();
    const after = engine.dispatch(state, {
      type: 'DESK_ACTION',
      actionId: 'desk_choose_tier',
      targetId: 'proj_1',
      value: 'q1',
    });
    // **不花精力格的动作当场生效,而且留在这一屏**——玩家选完刊要能接着分配格子
    expect(after.screen).toBe('DESK');
    expect(after.projects?.[0]?.submitTier).toBe('q1');
    const view2 = engine.view(after);
    if (view2.kind !== 'DESK') throw new Error('expected DESK');
    // 选过之后只剩"降一档改投",而且不能原地换一家同档的(那等于免费重投)
    expect(view2.actions.some(a => a.id === 'desk_choose_tier')).toBe(false);
    const lower = view2.actions.filter(a => a.id === 'desk_resubmit_lower').map(a => a.value);
    expect(lower).toContain('q2');
    expect(lower).not.toContain('q1');
  });

  it('冲高降低接收率,稳一稳提高它', () => {
    const pack = deskPack();
    const { state } = deskState(pack);
    const project = state.projects![0]!;
    // 挑一个基准不顶到上限的课题:顶到上限的时候"稳一稳"是加不上去的(见下一条)
    state.stats.method = 50;
    project.quality = 60;
    const base = acceptanceChance(state, pack, project);
    expect(tierForQuality(project.quality)).toBe('q3');
    project.submitTier = 'q1';
    expect(acceptanceChanceFor(state, pack, project)).toBeLessThan(base);
    project.submitTier = 'chinese_core';
    expect(acceptanceChanceFor(state, pack, project)).toBeGreaterThan(base);
    // 没选过 = 引擎按 quality 兜底,和 M4.6 之前完全一致
    delete project.submitTier;
    expect(acceptanceChanceFor(state, pack, project)).toBe(base);
    expect(targetTierOf(project)).toBe('q3');
  });

  it('失败率下限吃掉"稳一稳"的加成:再稳也不保证中', () => {
    const pack = deskPack();
    const { state } = deskState(pack);
    const project = state.projects![0]!;
    // 好稿子 + 高方法,基准已经顶在 1 − MIN_SETBACK_CHANCE 上
    state.stats.method = 95;
    project.quality = 95;
    const base = acceptanceChance(state, pack, project);
    expect(base).toBeCloseTo(1 - MIN_SETBACK_CHANCE, 6);
    project.submitTier = 'chinese_core';
    // **投得再稳也压不掉那 22%。** 这不是选刊机制的漏洞,是五节那条硬约束
    // ("不存在稳定刷论文的最优解")在这里照常生效——选刊不该是它的后门。
    expect(acceptanceChanceFor(state, pack, project)).toBeCloseTo(base, 6);
  });

  it('「寻求指导」投了才掷,没投就把上一年的结果清掉', () => {
    const pack = deskPack();
    const { state } = deskState(pack);
    state.allocation = { slots: 3, picks: [ALLOC_ADVISOR_CONSULT_ID, 'alloc_rest', 'alloc_rest'] };
    rollAdvisorConsult(state, pack, new Rng(3));
    const hit = state.flags[ADVISOR_CONSULT_FLAG];
    expect(['star_unavailable', 'star_resource']).toContain(hit);
    // 今年没问 = 那一幕不该重播。**不清掉的话它会年年出现**,而玩家一格都没花
    state.allocation = { slots: 3, picks: ['alloc_rest', 'alloc_rest', 'alloc_rest'] };
    rollAdvisorConsult(state, pack, new Rng(3));
    expect(state.flags[ADVISOR_CONSULT_FLAG]).toBeUndefined();
  });

  it('「这些年」读的是结算写下的快照,不另写一套聚合', () => {
    const pack = deskPack();
    const { engine, state } = deskState(pack);
    state.yearlySnapshots = [
      { year: 2014, money: 1000, phaseLabel: '本科', state: 60, papers: [], notes: ['「情绪调节的年龄差异」审稿,第 2 年'] },
    ];
    const view = engine.view(state);
    if (view.kind !== 'DESK') throw new Error('expected DESK');
    expect(view.years).toHaveLength(1);
    expect(view.years[0]?.notes[0]).toContain('审稿');
    // 旧存档只有 {year, money},少显示几行,但不能崩
    state.yearlySnapshots = [{ year: 2013, money: 500 }];
    const view2 = engine.view(state);
    if (view2.kind !== 'DESK') throw new Error('expected DESK');
    expect(view2.years[0]?.notes).toEqual([]);
    expect(view2.years[0]?.phaseLabel).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// M4.5 社会层:竞争者 · 人情账 · 情报
// ─────────────────────────────────────────────────────────────

describe('M4.5 社会层', () => {
  describe('影子竞争者', () => {
    function rivalPack(): ContentPack {
      const pack = miniPack();
      pack.rivalArchetypes = [
        { archetype: 'grinder', name: '郑允之', impression: '他每天最后一个走。' },
      ];
      return pack;
    }

    it('`meet` 只标记意图,真正抽样在有 RNG 的地方', () => {
      const pack = rivalPack();
      const state = createEngine(pack).start(1);
      // **applyEffects 没有 RNG,也不该有**——引擎偷偷消耗随机流会让同种子的回放漂移
      applyEffects([{ rival: { op: 'meet' } }], state, pack);
      expect(state.rival).toBeUndefined();
      expect(state.pendingRivalMeet).toBe(true);
      meetRival(state, pack, new Rng(7));
      expect(state.rival?.name).toBe('郑允之');
      expect(state.rival?.visibility).toBe(0);
    });

    it('本科那几年他不发论文,2019 起才开始出东西', () => {
      const pack = rivalPack();
      const state = createEngine(pack).start(2);
      meetRival(state, pack, new Rng(7));
      state.date = { year: 2017, month: 6 };
      for (let i = 0; i < 30; i++) advanceRivalYear(state, new Rng(i));
      // **对手领先的那几篇不能从一个玩家根本没有参赛的赛段里来**
      expect(state.rival!.papers).toBe(0);
      state.date = { year: 2021, month: 6 };
      for (let i = 0; i < 60; i++) advanceRivalYear(state, new Rng(i + 100));
      expect(state.rival!.papers).toBeGreaterThan(0);
    });

    it('玩家行为能改他的成长速度——不能改的话他就是一条固定难度曲线', () => {
      const pack = rivalPack();
      const state = createEngine(pack).start(3);
      meetRival(state, pack, new Rng(7));
      const before = state.rival!.momentum;
      applyEffects([{ rival: { op: 'nudge', momentum: 0.2 } }], state, pack);
      expect(state.rival!.momentum).toBeCloseTo(before + 0.2, 6);
      // 钳位:上不封顶的对手不好玩,压到 0 的对手不真实
      applyEffects([{ rival: { op: 'nudge', momentum: -99 } }], state, pack);
      expect(state.rival!.momentum).toBeGreaterThan(0);
    });

    it('处境那一行按 visibility 分层:不打听就只知道名字', () => {
      const pack = rivalPack();
      const state = createEngine(pack).start(4);
      meetRival(state, pack, new Rng(7));
      state.rival!.papers = 4;
      // 只知道名字的时候,**他几篇这件事你根本不知道**
      expect(rivalStatusLine(state)).not.toContain('4');
      applyEffects([{ rival: { op: 'reveal', visibility: 3 } }], state, pack);
      expect(rivalStatusLine(state)).toContain('4');
    });
  });

  describe('人情账', () => {
    function favorState() {
      const pack = miniPack();
      const state = createEngine(pack).start(11);
      state.date = { year: 2020, month: 6 };
      return { pack, state };
    }

    it('人情会贬值:五年前的恩情兑现不了一封今年的推荐信', () => {
      const { pack, state } = favorState();
      applyEffects(
        [{ favor: { op: 'add', who: 'advisor', direction: 'owed', weight: 4, reason: '你替他赶完了本子' } }],
        state,
        pack,
      );
      expect(favorTotal(state, 2020, { direction: 'owed' })).toBeCloseTo(4, 6);
      // 五年后只剩一小半
      const aged = favorTotal(state, 2025, { direction: 'owed' });
      expect(aged).toBeLessThan(2);
      // **但它不会归零。** 十年前那件事的分量很小,可它没有消失
      expect(favorTotal(state, 2040, { direction: 'owed' })).toBeGreaterThan(0);
    });

    it('记账年份由引擎填,内容不需要知道今年是哪年', () => {
      const { pack, state } = favorState();
      applyEffects(
        [{ favor: { op: 'add', who: 'rival', direction: 'owing', weight: 2, reason: '他替你说了话' } }],
        state,
        pack,
      );
      expect(state.favors?.[0]?.year).toBe(2020);
    });

    it('兑现按贬值后的分量从高到低结,结不满就结到没有为止', () => {
      const { pack, state } = favorState();
      applyEffects(
        [
          { favor: { op: 'add', who: 'a', direction: 'owed', weight: 1, reason: '小忙' } },
          { favor: { op: 'add', who: 'b', direction: 'owed', weight: 4, reason: '大忙' } },
        ],
        state,
        pack,
      );
      applyEffects([{ favor: { op: 'settle', direction: 'owed', weight: 3 } }], state, pack);
      // 先结掉分量大的那笔
      expect(state.favors?.find(f => f.who === 'b')?.settled).toBe(true);
      expect(state.favors?.find(f => f.who === 'a')?.settled).toBeUndefined();
      // **人情不够用是常态,不是错误**:结不满不报错
      applyEffects([{ favor: { op: 'settle', direction: 'owed', weight: 99 } }], state, pack);
      expect(openFavors(state)).toHaveLength(0);
    });

    it('欠太多本身是压力,而且扣了多少要说得出来', () => {
      const { pack, state } = favorState();
      for (let i = 0; i < 4; i++) {
        applyEffects(
          [{ favor: { op: 'add', who: `p${i}`, direction: 'owing', weight: 3, reason: '一件事' } }],
          state,
          pack,
        );
      }
      const before = state.stats.state;
      const hit = settleOwingPressure(state, 2020);
      expect(hit).toBeGreaterThan(0);
      expect(state.stats.state).toBe(before - hit);
      // 欠得不多的时候不该有任何惩罚——欠一两笔是这一行的常态
      const light = favorState();
      applyEffects(
        [{ favor: { op: 'add', who: 'x', direction: 'owing', weight: 2, reason: '小事' } }],
        light.state,
        light.pack,
      );
      expect(settleOwingPressure(light.state, 2020)).toBe(0);
    });
  });

  describe('情报', () => {
    function rumorPack(): ContentPack {
      const pack = miniPack();
      pack.rumors = [
        {
          id: 'rum_a', topic: 'advisor:a1', source: '师姐',
          text: '"老师人挺好的。"', caveat: '她 2016 年毕业。', accurate: false,
        },
        {
          id: 'rum_b', topic: 'advisor:a1', source: '师兄',
          text: '"他很忙。"', caveat: '他是组里第七个学生。', accurate: true,
        },
        {
          id: 'rum_c', topic: 'advisor:a2', source: '同门',
          text: '"那个组在上升期。"', caveat: '这条只发过一次。', accurate: false,
        },
      ];
      return pack;
    }

    it('可靠度不进任何出参——这是 13.3 全部设计的支点', () => {
      const pack = rumorPack();
      const state = createEngine(pack).start(21);
      const options = askableRumors(state, pack, new Rng(1), ['advisor:a1']);
      expect(options).toHaveLength(2);
      // **`accurate` 一个字都不许出去。** 可靠度只能由玩家自己推断
      expect(JSON.stringify(options)).not.toContain('accurate');
      const heard = askRumor(state, pack, 'rum_a');
      expect(JSON.stringify(heard)).not.toContain('accurate');
      // 括注给的是一个事实,不是"这条可能不准"
      expect(heard?.caveat).toBe('她 2016 年毕业。');
    });

    it('听过的不再列出来:同一个人不会把同一句话说两遍', () => {
      const pack = rumorPack();
      const state = createEngine(pack).start(22);
      askRumor(state, pack, 'rum_a');
      const options = askableRumors(state, pack, new Rng(1), ['advisor:a1']);
      expect(options.map(o => o.id)).toEqual(['rum_b']);
      expect(hasHeard(state, 'rum_a')).toBe(true);
    });

    it('打听次数每回合有限,而且只列这一屏的话题', () => {
      const pack = rumorPack();
      const state = createEngine(pack).start(23);
      expect(asksLeft(state)).toBe(MAX_ASKS_PER_ROUND);
      askRumor(state, pack, 'rum_a');
      expect(asksLeft(state)).toBe(MAX_ASKS_PER_ROUND - 1);
      // 别的导师的话题不该出现在这一屏上
      expect(askableRumors(state, pack, new Rng(1), ['advisor:a1']).map(o => o.id)).not.toContain('rum_c');
    });
  });
});

// ─────────────────────────────────────────────────────────────
// M5 求职季与长聘首考
// ─────────────────────────────────────────────────────────────

describe('M5 求职季', () => {
  it('市场松紧由种子和年份决定,同一局的同一年永远一样', () => {
    const a = marketTightnessFor(12345, 2027);
    const b = marketTightnessFor(12345, 2027);
    expect(a).toBe(b);
    // **等一年面对的是另一年的真实市场,不是重摇一次运气**
    expect(marketTightnessFor(12345, 2028)).not.toBe(a);
    // 别的种子是别的世界
    expect(marketTightnessFor(999, 2027)).not.toBe(a);
  });

  it('市场松紧不进 ViewModel:它只能事后推断', () => {
    const pack = miniPack();
    const engine = createEngine(pack);
    const state = engine.start(31);
    state.phaseIndex = 1;
    state.screen = 'JOB_MARKET';
    startJobMarket(state, pack);
    const view = engine.view(state);
    if (view.kind !== 'JOB_MARKET') throw new Error('expected JOB_MARKET');
    // 一旦摆到屏上,"要不要再等一年"就从一次赌博变成一道算术题
    expect(JSON.stringify(view)).not.toContain('marketTightness');
    expect(JSON.stringify(view)).not.toContain(String(state.jobMarket!.marketTightness));
  });

  it('推荐信的分量是关系的变现:同一个大牛,关系差的时候写不出重的信', () => {
    const pack = miniPack();
    pack.advisors = [
      {
        id: 'a_star', archetype: 'star', availability: 'rare', name: '沈某',
        publicImpression: '很忙。', initialStage: 'joined', initialFavor: 30, stages: { joined: {} },
      },
    ];
    const state = createEngine(pack).start(32);
    state.advisor = { id: 'a_star', favor: 90, stage: 'joined' };
    const close = letterWeightFor(state, pack);
    state.advisor.favor = 10;
    const distant = letterWeightFor(state, pack);
    // **找了大牛但他四年没见过你,信会写得很空**
    expect(close).toBeGreaterThan(distant * 1.4);
  });

  it('广投的代价是每一份都写得不够好', () => {
    expect(materialQualityFor(3)).toBeGreaterThan(materialQualityFor(8));
    // 但也有地板:投八份不等于八份都是废纸
    expect(materialQualityFor(8)).toBeGreaterThan(0.4);
  });

  it('同校配偶岗读取岗位的 twoBodyFriendly，而不是只认海外或头部硬编码', () => {
    const pack = miniPack();
    pack.positions = [{
      id: 'pos_partner_friendly', institutionId: 'inst_test', kind: 'faculty_cn',
      domainFit: [], requires: { always: true }, twoBodyFriendly: true,
    }];
    const state = createEngine(pack).start(35);
    state.flags.partner_academic = true;
    const offer = {
      positionId: 'pos_partner_friendly', institutionName: '测试大学', city: '测试市',
      region: 'cn' as const, terms: {} as never, termLines: [], negotiated: false,
    };

    expect(spouseHireAvailable(state, offer, pack)).toBe(true);
    pack.positions[0]!.twoBodyFriendly = false;
    expect(spouseHireAvailable(state, offer, pack)).toBe(false);

    // 不能只看 offers[0]：最前面的 offer 不支持、第二份支持时，这条路仍应出现。
    pack.positions[0]!.twoBodyFriendly = true;
    const firstOffer = { ...offer, positionId: 'pos_other' };
    state.jobMarket = {
      step: 'two_body', year: 2027, marketTightness: 1, letters: [], letterWeight: 1,
      materialQuality: 1, applied: [], invited: [], offers: [firstOffer, offer], accepted: null,
    };
    const view = buildJobMarketView(state, pack, new Rng(1), '');
    expect(view.options.map(option => option.id)).toContain('spouse_hire');
  });

  it('接受备份岗后进入离开学术界结局，不会误入预聘期', () => {
    const pack = miniPack();
    pack.timeline = [
      {
        kind: 'flow', id: 'job_market', label: '求职季', date: { year: 2027, month: 9 },
        steps: ['JOB_MARKET'], nextPhaseId: 'tenure_track',
      },
      {
        kind: 'rounds', id: 'tenure_track', label: '预聘期', rounds: 1,
        eventSlots: 0, pools: [], briefs: ['预聘'], isFinal: true,
      },
      {
        kind: 'rounds', id: 'left_academia', label: '离开学术界', rounds: 1,
        eventSlots: 0, pools: [], briefs: ['离开'], isFinal: true,
      },
    ];
    pack.institutions = [{
      id: 'inst_backup', name: '测试医院', region: 'cn', city: '测试市',
      tier: 'hospital', domains: [], unit: '心理科', impression: '测试机构',
      gameified: {}, admits: [],
    }];
    pack.positions = [{
      id: 'pos_backup', institutionId: 'inst_backup', kind: 'backup_hospital',
      domainFit: [], requires: { always: true },
    }];

    const engine = createEngine(pack);
    let state = engine.start(36);
    state.phaseIndex = 0;
    state.flowStepIndex = 0;
    state.screen = 'JOB_MARKET';
    state.jobMarket = {
      step: 'result', year: 2027, marketTightness: 1, letters: [], letterWeight: 1,
      materialQuality: 1, applied: ['pos_backup'], invited: ['pos_backup'],
      offers: [{
        positionId: 'pos_backup', institutionName: '测试医院', city: '测试市', region: 'cn',
        terms: {} as never, termLines: [], negotiated: false,
      }],
      accepted: null,
    };

    state = engine.dispatch(state, { type: 'JOB_MARKET_STEP', optionId: 'pos_backup' });
    expect(pack.timeline[state.phaseIndex]?.id).toBe('left_academia');
    expect(state.flags.took_backup_job).toBe(true);
    expect(state.flags.took_faculty_job).toBe(false);
  });

  it('首考是一张清单,而基金那一行是硬指标', () => {
    const pack = miniPack();
    const state = createEngine(pack).start(33);
    state.papers = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`, title: `t${i}`, tier: 'q1', authorship: 'first',
      year: 2030, domain: 'cognition', integrityRisk: 0,
    })) as NonNullable<typeof state.papers>;
    state.flags.teaching_load = 12;
    state.flags.students_graduated = 3;
    // 论文、教学、学生全都超额,**但基金没中**
    const denied = buildTenureReview(state, pack);
    expect(tenurePassed(denied)).toBe(false);
    state.flags.got_young_grant = true;
    expect(tenurePassed(buildTenureReview(state, pack))).toBe(true);
  });

  it('人际那一行不参与判定:它是陈述,不是扣分项', () => {
    const pack = miniPack();
    const state = createEngine(pack).start(34);
    state.flags.endured_advisor = true;
    const lines = buildTenureReview(state, pack);
    const relation = lines.find(line => line.label === '人际');
    expect(relation).toBeDefined();
    // 没有"要求"那一栏 = 不判定。**把它做成判定项就变成了"会来事的人过"**
    expect(relation!.required).toBeNull();
    expect(relation!.met).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// M7 量表、诚信清单与黑天鹅配额
// ─────────────────────────────────────────────────────────────

describe('M7 元玩法', () => {
  it('叙事功能位从三倍候选中抽一幕，实际处理后才记入存档状态', () => {
    const pack = miniPack();
    for (const id of ['ev_slot_a', 'ev_slot_b', 'ev_slot_c']) {
      pack.events.push({
        id, pools: ['main'], title: id, text: id,
        choices: [{ id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [] }] }],
      });
    }
    pack.narrativeSlots = [{
      id: 'slot_test', label: '测试功能', phaseId: 'life', roundWindow: [0, 0], fill: 1,
      candidates: ['ev_slot_a', 'ev_slot_b', 'ev_slot_c'],
    }];
    pack.timeline = [{
      kind: 'rounds', id: 'life', label: '人生', date: { year: 2020, month: 1 },
      rounds: 1, eventSlots: 1, pools: ['main'], briefs: ['这一年'], isFinal: true,
    }];
    const engine = createEngine(pack);
    let state = engine.start(40);
    const phase = pack.timeline[0];
    if (!phase || phase.kind !== 'rounds') throw new Error('expected rounds phase');

    const first = fillNarrativeSlots(state, pack, new Rng(7), phase, new Set());
    expect(first).toHaveLength(1);
    expect(first[0]!.events).toHaveLength(1);
    expect(pack.narrativeSlots[0]!.candidates).toContain(first[0]!.events[0]!.id);
    expect(state.filledSlots).toEqual([]);

    state = engine.dispatch(state, { type: 'START' });
    expect(state.eventQueue).toHaveLength(1);
    expect(pack.narrativeSlots[0]!.candidates).toContain(state.eventQueue[0]);
    state = engine.dispatch(state, { type: 'CONTINUE' });
    const view = engine.view(state);
    if (view.kind !== 'EVENT') throw new Error('expected EVENT');
    state = engine.dispatch(state, { type: 'CHOOSE', choiceId: view.choices[0]!.id });
    expect(state.filledSlots).toEqual(['slot_test']);
  });

  it('功能位事件占普通事件预算，不会在同年额外塞满随机池', () => {
    const pack = miniPack();
    for (const id of ['ev_slot_a', 'ev_slot_b', 'ev_slot_c']) {
      pack.events.push({
        id, pools: ['main'], title: id, text: id,
        choices: [{ id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [] }] }],
      });
    }
    pack.narrativeSlots = [{
      id: 'slot_test', label: '测试功能', phaseId: 'life', roundWindow: [0, 0], fill: 1,
      candidates: ['ev_slot_a', 'ev_slot_b', 'ev_slot_c'],
    }];
    const state = createEngine(pack).start(41);
    state.phaseIndex = 1;
    state.roundIndex = 0;
    const phase = pack.timeline[1];
    if (!phase || phase.kind !== 'rounds') throw new Error('expected rounds phase');

    const picked = pickRoundEvents(state, pack, new Rng(9), phase);
    expect(picked).toHaveLength(1);
    expect(pack.narrativeSlots[0]!.candidates).toContain(picked[0]);
  });

  it('功能位未选中的兄弟候选不会再次混入普通随机池', () => {
    const pack = miniPack();
    for (const id of ['ev_slot_a', 'ev_slot_b', 'ev_slot_c', 'ev_regular_a', 'ev_regular_b']) {
      pack.events.push({
        id, pools: ['main'], title: id, text: id,
        choices: [{ id: 'ok', text: '好', outcomes: [{ weight: 1, text: '好', effects: [] }] }],
      });
    }
    pack.narrativeSlots = [{
      id: 'slot_test', label: '测试功能', phaseId: 'life', roundWindow: [0, 0], fill: 1,
      candidates: ['ev_slot_a', 'ev_slot_b', 'ev_slot_c'],
    }];
    pack.timeline = [{
      kind: 'rounds', id: 'life', label: '人生', date: { year: 2020, month: 1 },
      rounds: 1, eventSlots: 3, pools: ['main'], briefs: ['这一年'], isFinal: true,
    }];
    const state = createEngine(pack).start(42);
    const phase = pack.timeline[0];
    if (!phase || phase.kind !== 'rounds') throw new Error('expected rounds phase');

    const picked = pickRoundEvents(state, pack, new Rng(10), phase);
    const slotPicks = picked.filter(id => pack.narrativeSlots![0]!.candidates.includes(id));
    expect(slotPicks).toHaveLength(1);
    expect(picked).toEqual(expect.arrayContaining(['ev_regular_a', 'ev_regular_b']));
  });

  it('量表按方向计分，选择偏差文案，并只给很小的状态修复', () => {
    const pack = miniPack();
    pack.inventories = [TEST_INVENTORY];
    const state = createEngine(pack).start(41);
    state.stats.state = 20;
    startInventory(state, pack, TEST_INVENTORY.id);

    expect(answerInventory(state, pack, 0)).toBeNull();
    const result = answerInventory(state, pack, 0);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(0);
    expect(result!.bandLabel).toBe('低');
    expect(result!.discrepancyKind).toBe('defensive');
    expect(result!.discrepancyText).toContain('0 / 20');
    expect(state.stats.state).toBe(22);
    expect(state.inventoryResults).toHaveLength(1);
  });

  it('量表从事件结果岔出，答完后回到原事件游标继续结算', () => {
    const pack = miniPack();
    pack.inventories = [TEST_INVENTORY];
    const engine = createEngine(pack);
    let state = engine.start(42);
    state.phaseIndex = 1;
    state.screen = 'OUTCOME';
    state.eventQueue = ['ev_a'];
    state.eventCursor = 0;
    state.pendingOutcome = { text: '先填表', deltas: {} };
    startInventory(state, pack, TEST_INVENTORY.id);

    state = engine.dispatch(state, { type: 'CONTINUE' });
    expect(state.screen).toBe('INVENTORY');
    state = engine.dispatch(state, { type: 'ANSWER_INVENTORY', optionIndex: 1 });
    state = engine.dispatch(state, { type: 'ANSWER_INVENTORY', optionIndex: 0 });
    expect(engine.view(state).kind).toBe('INVENTORY');
    state = engine.dispatch(state, { type: 'CONTINUE' });
    expect(state.eventCursor).toBe(1);
    expect(state.screen).toBe('SETTLEMENT');
  });

  it('论文审计状态与毕业学生都写进结构化清单', () => {
    const pack = miniPack();
    const state = createEngine(pack).start(43);
    state.date.year = 2031;
    state.papers = [
      { id: 'p1', title: '低风险', tier: 'q2', authorship: 'first', year: 2025, domain: 'x', integrityRisk: 3 },
      { id: 'p2', title: '高风险', tier: 'q1', authorship: 'first', year: 2026, domain: 'x', integrityRisk: 40 },
    ];
    applyEffects([
      { paperAudit: { op: 'replicationFailed' } },
      { paperAudit: { op: 'correct' } },
      { student: { op: 'graduate', path: 'industry', note: '去了企业' } },
    ], state, pack);
    expect(state.papers[1]!.replicated).toBe(false);
    expect(state.papers[1]!.auditStatus).toBe('corrected');
    expect(state.students).toEqual([
      expect.objectContaining({ label: '第一位毕业生', graduatedYear: 2031, path: 'industry' }),
    ]);
  });

  it('黑天鹅只走独立配额，达到配额后不会混进普通随机槽', () => {
    const pack = miniPack();
    pack.events.push({
      id: 'ev_bs_test', pools: ['main'], category: 'blackswan', title: '意外', text: '意外发生',
      choices: [
        { id: 'a', text: 'A', outcomes: [{ weight: 1, text: 'A', effects: [{ stats: { state: -1 } }] }] },
        { id: 'b', text: 'B', outcomes: [{ weight: 1, text: 'B', effects: [{ stats: { method: 1 } }] }] },
      ],
    });
    const state = createEngine(pack).start(44);
    state.phaseIndex = 1;
    state.date.year = 2025;
    state.blackSwanQuota = 1;
    const phase = pack.timeline[1];
    if (!phase || phase.kind !== 'rounds') throw new Error('expected rounds phase');

    const first = pickRoundEvents(state, pack, new Rng(7), phase);
    expect(first).toContain('ev_bs_test');
    // 调度不提前消费配额；真正处理事件时 engine.resolveChoice 才 +1。
    expect(state.blackSwanCount).toBe(0);
    state.triggeredEventIds.push('ev_bs_test');
    state.blackSwanCount = 1;
    const second = pickRoundEvents(state, pack, new Rng(8), phase);
    expect(second).not.toContain('ev_bs_test');
    expect(state.blackSwanCount).toBe(1);
  });
});
