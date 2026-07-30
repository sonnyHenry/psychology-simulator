import type { NarrativeSlot } from '@psy-sim/core';
import { advisorArchetypeEventIds } from '../events/advisor/archetypes';
import { m8AdvisorEventIdsByBand } from '../events/m8';
import { gradPacingEventIds } from '../events/slots';

const advisorSlot = (
  id: string,
  phaseId: string,
  roundWindow: [number, number],
): NarrativeSlot => ({
  id,
  label: '这一阶段的导师处境',
  phaseId,
  roundWindow,
  fill: 1,
  candidates: advisorArchetypeEventIds,
  candidateMode: 'conditional',
});

const configuredAdvisorSlot = (
  id: string,
  phaseId: string,
  round: number,
  candidates: string[],
): NarrativeSlot => ({
  id,
  label: '这一阶段的导师构筑回响',
  phaseId,
  roundWindow: [round, round],
  fill: 1,
  candidates,
  candidateMode: 'conditional',
});

const pacingSlot = (
  id: string,
  label: string,
  phaseId: string,
  round: number,
  candidates: readonly string[],
): NarrativeSlot => ({
  id,
  label,
  phaseId,
  roundWindow: [round, round],
  fill: 1,
  candidates: [...candidates],
});

export const narrativeSlots: NarrativeSlot[] = [
  {
    id: 'slot_undergrad3_first_setback',
    label: '大三第一次真实碰壁',
    phaseId: 'undergrad',
    roundWindow: [2, 2],
    fill: 1,
    candidates: ['ev_slot_u3_freezer', 'ev_slot_u3_teammate_exit', 'ev_slot_u3_consent_gap'],
  },
  {
    id: 'slot_master2_low_point',
    label: '研二的低谷',
    phaseId: 'master',
    roundWindow: [1, 1],
    fill: 1,
    candidates: ['ev_slot_m2_drive_failure', 'ev_slot_m2_advisor_silence', 'ev_slot_m2_peer_published'],
  },

  // 学术培养的年级主线。课题管线仍负责每个具体研究的成败；这些功能位保证
  // 玩家能感到“这一年主要在学什么”，并用三种等价场景降低跨局重复。
  pacingSlot('slot_grad_entry_master', '培养第一年：文献与组会', 'master', 0, gradPacingEventIds.entry),
  pacingSlot('slot_grad_entry_direct', '培养第一年：文献与组会', 'phd_direct', 0, gradPacingEventIds.entry),
  pacingSlot('slot_grad_entry_overseas', '培养第一年：文献与组会', 'overseas_phd', 0, gradPacingEventIds.entry),
  pacingSlot('slot_grad_setback_master', '培养第二年：第一次研究受挫', 'master', 1, gradPacingEventIds.setback),
  pacingSlot('slot_grad_setback_direct', '培养第二年：第一次研究受挫', 'phd_direct', 1, gradPacingEventIds.setback),
  pacingSlot('slot_grad_setback_overseas', '培养第二年：第一次研究受挫', 'overseas_phd', 1, gradPacingEventIds.setback),
  pacingSlot('slot_grad_writing_master', '培养第三年：第一篇论文', 'master', 2, gradPacingEventIds.writing),
  pacingSlot('slot_grad_writing_direct', '培养第三年：第一篇论文', 'phd_direct', 2, gradPacingEventIds.writing),
  pacingSlot('slot_grad_writing_overseas', '培养第三年：第一篇论文', 'overseas_phd', 2, gradPacingEventIds.writing),

  pacingSlot('slot_phd_proposal_after_master', '博士开题', 'phd_after_master', 0, gradPacingEventIds.proposal),
  pacingSlot('slot_phd_proposal_direct', '博士开题', 'phd_direct', 3, gradPacingEventIds.proposal),
  pacingSlot('slot_grad_conference_after_master', '培养后段：海外学术交流', 'phd_after_master', 1, gradPacingEventIds.conference),
  pacingSlot('slot_grad_conference_direct', '培养后段：海外学术交流', 'phd_direct', 3, gradPacingEventIds.conference),
  pacingSlot('slot_grad_conference_overseas', '培养后段：国际学术交流', 'overseas_phd', 3, gradPacingEventIds.conference),
  pacingSlot('slot_phd_graduation_after_master', '博士毕业准备', 'phd_after_master', 2, gradPacingEventIds.graduation),
  pacingSlot('slot_phd_graduation_direct', '博士毕业准备', 'phd_direct', 4, gradPacingEventIds.graduation),
  pacingSlot('slot_phd_graduation_overseas', '博士毕业准备', 'overseas_phd', 5, gradPacingEventIds.graduation),

  // 原有导师专属内容不与公共 grad 池抢两格预算；每个学术阶段抽一幕，
  // 六原型共 30 个兄弟候选按当前导师过滤，跨局轮换。
  advisorSlot('slot_advisor_master', 'master', [0, 2]),
  advisorSlot('slot_advisor_phd_direct', 'phd_direct', [0, 4]),
  advisorSlot('slot_advisor_phd_after_master', 'phd_after_master', [0, 2]),
  advisorSlot('slot_advisor_overseas', 'overseas_phd', [0, 5]),
  advisorSlot('slot_advisor_postdoc', 'postdoc', [0, 1]),
  advisorSlot('slot_advisor_tenure', 'tenure_track', [0, 2]),

  // M8 四个年份带各自独立占一个功能位。每组在当前构筑下只剩一位导师的
  // 那一幕可选，因此不会被“阶段首年先填槽”吃掉后续三幕。
  configuredAdvisorSlot('slot_m8_advisor_early_master', 'master', 0, m8AdvisorEventIdsByBand.early),
  configuredAdvisorSlot('slot_m8_advisor_early_direct', 'phd_direct', 0, m8AdvisorEventIdsByBand.early),
  configuredAdvisorSlot('slot_m8_advisor_early_overseas', 'overseas_phd', 0, m8AdvisorEventIdsByBand.early),
  configuredAdvisorSlot('slot_m8_advisor_middle_phd', 'phd_after_master', 0, m8AdvisorEventIdsByBand.middle),
  configuredAdvisorSlot('slot_m8_advisor_middle_direct', 'phd_direct', 3, m8AdvisorEventIdsByBand.middle),
  configuredAdvisorSlot('slot_m8_advisor_middle_overseas', 'overseas_phd', 3, m8AdvisorEventIdsByBand.middle),
  configuredAdvisorSlot('slot_m8_advisor_late_postdoc', 'postdoc', 0, m8AdvisorEventIdsByBand.late),
  configuredAdvisorSlot('slot_m8_advisor_late_tenure', 'tenure_track', 0, m8AdvisorEventIdsByBand.late),
  configuredAdvisorSlot('slot_m8_advisor_final_postdoc', 'postdoc', 1, m8AdvisorEventIdsByBand.final),
  configuredAdvisorSlot('slot_m8_advisor_final_tenure', 'tenure_track', 0, m8AdvisorEventIdsByBand.final),
];
