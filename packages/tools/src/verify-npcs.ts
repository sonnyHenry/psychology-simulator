import assert from 'node:assert/strict';
import {
  applyEffects,
  createEngine,
  evalCondition,
  Rng,
  type EventChoice,
  type GameEvent,
  type GameState,
  type ChoiceOutcome,
} from '@psy-sim/core';
import { contentPack } from '@psy-sim/content';

/**
 * NPC 线路收束专项验证。
 *
 * 前作用五段手写断言覆盖了五条人物线,fork 时那些断言全部失效(它们查的是
 * `grinder_true_mirror`、`love_true_companion` 这些前作专属 flag)。这里把**验证的性质**
 * 保留下来、把**前作的夹具**换成一张声明式表:
 *
 *   ① 达到阈值时,专属收束选项/结果可见,并写入专属 flag、推进到终态 stage;
 *   ② 差一次没达到阈值时,专属收束**必须拿不到**,兜底路径必须存在。
 *
 * 第 ② 条是这个工具真正的价值:它防的是"专属收束的门槛条件写宽了",
 * 那种 bug 在 simulate 里表现为专属关系命中率偏高,但很难定位到是哪条线漏的。
 *
 * 本作的人物线见 GAME_DESIGN 第十二节,由 M4.5/M6 落地。
 * **写完一条人物线,就往 `fixtures` 里加一行**——夹具表空着的时候这个工具是绿的但没有价值。
 */
interface NpcRouteFixture {
  /** 人物线 id,须存在于 contentPack.npcs */
  npcId: string;
  /** 收束事件 id */
  eventId: string;
  /** 收束事件对应的 stage */
  stage: string;
  /** 该线的温度标签(如 `advisor_warm`),用 historyCount 累计 */
  warmTag: string;
  /** 触发专属收束所需的暖意次数 */
  threshold: number;
  /** 专属收束选项 id */
  specialChoiceId: string;
  /**
   * 未达阈值时应出现的兜底选项 id,与专属选项严格互斥。
   * 门槛做在 outcome 层(同一个选项内按 historyCount 分流)的线填 null。
   */
  fallbackChoiceId: string | null;
  /** 专属收束写入的 flag */
  specialFlag: string;
  /** 专属收束后的终态 stage */
  endStage: string;
}

const fixtures: NpcRouteFixture[] = [];

function makeState(fixture: NpcRouteFixture, warmCount: number): GameState {
  const state = createEngine(contentPack).start(53);
  const finalPhase = [...contentPack.timeline].reverse().find(p => p.kind === 'rounds' && p.isFinal);
  state.date = { year: finalPhase?.date?.year ?? 2033, month: 1 };
  state.npcs = { [fixture.npcId]: { favor: 50, stage: fixture.stage } };
  state.history = Array.from({ length: warmCount }, (_, index) => ({
    kind: 'event' as const,
    year: 2015 + index,
    eventId: `fixture_${fixture.warmTag}_${index}`,
    category: 'npc',
    choiceId: 'warm',
    outcomeTag: fixture.warmTag,
  }));
  return state;
}

function event(eventId: string): GameEvent {
  const found = contentPack.events.find(candidate => candidate.id === eventId);
  assert.ok(found, `missing event ${eventId}`);
  return found;
}

function conditionMatches(
  state: GameState,
  condition: EventChoice['visibleIf'] | ChoiceOutcome['condition'],
): boolean {
  return evalCondition(condition, { state, pack: contentPack, rng: new Rng(53) });
}

function visibleChoiceIds(eventId: string, state: GameState): string[] {
  return event(eventId)
    .choices.filter(choice => conditionMatches(state, choice.visibleIf))
    .map(choice => choice.id);
}

function resolveUniqueOutcome(eventId: string, choiceId: string, state: GameState): ChoiceOutcome {
  const choice = event(eventId).choices.find(candidate => candidate.id === choiceId);
  assert.ok(choice, `missing choice ${eventId}/${choiceId}`);
  const eligible = choice.outcomes.filter(outcome => conditionMatches(state, outcome.condition));
  assert.equal(eligible.length, 1, `${eventId}/${choiceId} should have exactly one eligible outcome`);
  return eligible[0]!;
}

function setsFlag(outcome: ChoiceOutcome, flag: string): boolean {
  return outcome.effects.some(effect => 'setFlag' in effect && effect.setFlag === flag);
}

for (const fixture of fixtures) {
  const label = `${fixture.npcId}/${fixture.eventId}`;
  assert.ok(
    contentPack.npcs.some(npc => npc.id === fixture.npcId),
    `fixture references unknown npc: ${fixture.npcId}`,
  );

  // ① 达到阈值:专属收束可达,flag 与终态 stage 正确
  const reached = makeState(fixture, fixture.threshold);
  if (fixture.fallbackChoiceId !== null) {
    const choices = visibleChoiceIds(fixture.eventId, reached);
    assert.ok(choices.includes(fixture.specialChoiceId), `${label}: 达阈值时专属选项不可见`);
    assert.ok(
      !choices.includes(fixture.fallbackChoiceId),
      `${label}: 达阈值时兜底选项仍然可见(专属与兜底必须严格互斥)`,
    );
  }
  const reachedOutcome = resolveUniqueOutcome(fixture.eventId, fixture.specialChoiceId, reached);
  assert.ok(setsFlag(reachedOutcome, fixture.specialFlag), `${label}: 专属收束没有写入 ${fixture.specialFlag}`);
  applyEffects(reachedOutcome.effects, reached, contentPack);
  assert.equal(reached.flags[fixture.specialFlag], true, `${label}: 专属 flag 未生效`);
  assert.equal(reached.npcs[fixture.npcId]?.stage, fixture.endStage, `${label}: 终态 stage 不正确`);

  // ② 差一次没达到阈值:专属收束必须拿不到,兜底路径必须存在
  const short = makeState(fixture, fixture.threshold - 1);
  if (fixture.fallbackChoiceId !== null) {
    const choices = visibleChoiceIds(fixture.eventId, short);
    assert.ok(!choices.includes(fixture.specialChoiceId), `${label}: 未达阈值却能看到专属选项`);
    assert.ok(choices.includes(fixture.fallbackChoiceId), `${label}: 未达阈值时没有兜底选项`);
  } else {
    const shortOutcome = resolveUniqueOutcome(fixture.eventId, fixture.specialChoiceId, short);
    assert.equal(
      setsFlag(shortOutcome, fixture.specialFlag),
      false,
      `${label}: 未达阈值的 outcome 也写入了 ${fixture.specialFlag}`,
    );
  }
}

if (fixtures.length === 0) {
  console.log(
    'NPC 专项验证:夹具表为空,跳过。本作人物线见 GAME_DESIGN 第十二节,写完一条就往 fixtures 加一行(M4.5/M6)。',
  );
} else {
  console.log(
    `NPC 专项验证通过:${fixtures.length} 条人物线的专属收束、兜底互斥、终态 stage 与 flag 均正确`,
  );
}
