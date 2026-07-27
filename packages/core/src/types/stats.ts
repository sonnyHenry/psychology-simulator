// 五维(见 GAME_DESIGN 第三节)。不是在前作五维上加维度,是整套换血:
// 学识→方法 · 心态→状态 · 人脉→资本 · 健康→临床 · 金钱不变。
// 顺序按设计文档的表格排列,方便对照。
export type StatKey = 'method' | 'clinical' | 'capital' | 'state' | 'money';

export interface Stats {
  /** 方法:统计、实验设计、编程、文献辨识力。由高考分数 + 学院归属决定起点 */
  method: number;
  /** 临床:个案概念化、共情与技术、危机处理、评估。由背景卡决定起点 */
  clinical: number;
  /** 资本:论文 + 会议 + 导师人脉 + 推荐信分量。所有门槛判定读这一维,起点 5 */
  capital: number;
  /** 状态:自我状态与韧性。**≤0 触发提前结局**(休学/退学/停业),起点 65 */
  state: number;
  /** 钱:元。不设上限,由背景卡决定起点 */
  money: number;
}

export type StatDeltas = Partial<Stats>;

export type Track = '文' | '理';

export type Gender = 'male' | 'female';

export type Flags = Record<string, boolean | number | string>;
