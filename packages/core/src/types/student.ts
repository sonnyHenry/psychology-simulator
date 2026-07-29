/** 结局页“你带过的学生”的结构化数据源。 */
export interface StudentRecord {
  id: string;
  label: string;
  graduatedYear: number;
  path: 'phd' | 'industry' | 'school' | 'practice' | 'unknown';
  note: string;
}

export type StudentOp = {
  op: 'graduate';
  path: StudentRecord['path'];
  note: string;
};
