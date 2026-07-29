import type { StudentOp } from '../types/student';
import type { GameState } from '../types/state';

const ORDINALS = ['第一位', '第二位', '第三位', '第四位', '第五位', '第六位'];

export function applyStudentOp(state: GameState, operation: StudentOp): void {
  if (operation.op !== 'graduate') return;
  state.students = state.students ?? [];
  const index = state.students.length;
  state.students.push({
    id: `student_${index + 1}`,
    label: `${ORDINALS[index] ?? `第 ${index + 1} 位`}毕业生`,
    graduatedYear: state.date.year,
    path: operation.path,
    note: operation.note,
  });
}
