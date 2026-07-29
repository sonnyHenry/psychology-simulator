import assert from 'node:assert/strict';
import { devJump } from '@psy-sim/core';
import { contentPack, devJumpTargets } from '@psy-sim/content';

/**
 * 一键跳转的可达性自测(与 verify-validate 同一哲学:**到不了的跳转和没有跳转是一回事**)。
 *
 * 跳转目标表引用阶段 id、岔口 optionId、分配项 id——这三样都会随里程碑演进,
 * 而引用错了不报错,只表现为"按钮点了跳不过去"。所以每个目标在这里真的跑一遍。
 *
 * 顺带盯一个数:**尝试次数**。某个目标要几十个种子才偶尔成功,说明它的门控和
 * 默认策略已经对不上了(比如岔口门槛调高了),要修偏好而不是调大重试上限。
 */

const MAX_ACCEPTABLE_ATTEMPTS = 20;

let worst = 0;
for (const target of devJumpTargets) {
  const result = devJump(contentPack, target, { seed: 20260728 });
  assert.ok(result, `跳转目标不可达: ${target.id}(${target.label})——偏好配置和当前内容对不上了`);
  if (target.targetPhaseId !== undefined) {
    const phase = contentPack.timeline[result.state.phaseIndex];
    assert.equal(
      phase?.id,
      target.targetPhaseId,
      `跳转目标停错了阶段: ${target.id} 停在 ${phase?.id}`,
    );
  } else {
    assert.equal(result.state.screen, 'ENDING', `跳转目标没有停在结局屏: ${target.id}`);
  }
  assert.equal(
    result.state.date.year,
    target.year,
    `跳转目标年份不一致: ${target.id} 目标 ${target.year},实际 ${result.state.date.year}`,
  );
  assert.ok(
    result.attempts <= MAX_ACCEPTABLE_ATTEMPTS,
    `跳转目标太难到达(${result.attempts} 次尝试 > ${MAX_ACCEPTABLE_ATTEMPTS}): ${target.id}——门控和默认策略对不上了,修偏好而不是调重试上限`,
  );
  worst = Math.max(worst, result.attempts);
  console.log(
    `✅ ${target.label.padEnd(16, ' ')} 种子 ${result.seed} · 第 ${result.attempts} 次尝试 · ${result.steps} 步 · ` +
      `${result.state.date.year} 年 · ${result.state.screen}` +
      (result.state.endingId ? `(${result.state.endingId})` : ''),
  );
}
console.log(`一键跳转自测通过:${devJumpTargets.length} 个目标全部可达(最坏 ${worst} 次尝试)`);
