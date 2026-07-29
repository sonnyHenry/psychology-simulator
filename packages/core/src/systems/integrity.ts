import type { PaperAuditOp } from '../types/project';
import type { GameState } from '../types/state';

export function riskiestPaper(state: GameState) {
  return [...(state.papers ?? [])].sort((a, b) => b.integrityRisk - a.integrityRisk)[0];
}

export function applyPaperAuditOp(state: GameState, operation: PaperAuditOp): void {
  const paper = operation.target
    ? (state.papers ?? []).find(item => item.id === operation.target)
    : riskiestPaper(state);
  if (!paper) return;
  switch (operation.op) {
    case 'replicationFailed':
      paper.replicated = false;
      paper.auditStatus = 'questioned';
      state.flags.integrity_paper_questioned = true;
      return;
    case 'clear':
      paper.auditStatus = 'cleared';
      return;
    case 'correct':
      paper.auditStatus = 'corrected';
      return;
    case 'retract':
      paper.auditStatus = 'retracted';
      state.flags.paper_retracted = true;
      return;
  }
}
