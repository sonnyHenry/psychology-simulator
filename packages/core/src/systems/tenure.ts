import type { ContentPack } from '../types/content';
import type { GameState } from '../types/state';
import type { TenureReviewLine } from '../types/jobmarket';
import { readNumericFlag } from '../dsl/evaluate';
import { countPapers } from './project';

/**
 * 长聘首考(GAME_DESIGN 十节)。**它不是一个数值阈值,是一张清单。**
 *
 * 六年结束,把你这六年做的事逐行摆出来,然后给结果。
 * 清单式呈现和录取屏、毕业进度行是同一套语言:**只列事实,不算总分**。
 *
 * ## 通过率设计在 30%–50%,因为这个数字应该是真实的
 *
 * 由 simulate 门禁守住。**不通过不等于人生失败**——它通向"离开学术界"的结局群,
 * 和九节的"一个都没有"共用一部分回响。
 *
 * ## 人际那一行不参与判定
 *
 * "与院长关系一般 · 系里有人认为你不合作"是**陈述**,不是扣分项。
 * 把它做成判定项就变成了"会来事的人过,老实人不过",而那是一句廉价的犬儒;
 * 把它完全删掉又不真实——真实的情况是它确实在那儿,而且你说不清它起了多大作用。
 */

/**
 * 首考要几篇高档论文。院里的口径,不同档次的学校不一样。
 *
 * ## 这几条线是按**预聘期实际能投的格数**定的,不是按想象定的
 *
 * 预聘期六年、两年一回合、每回合两格 = **一共只有六格**。
 * 第一版按"六年应该能做很多事"写了 3 篇二区 + 教学 + 2 个学生,
 * 结果通过率是 0%——六格根本同时买不起那么多行。
 * **每一条线都要放回预算里核一遍够不够得到**(M4 那条阈值纪律的第三次应用)。
 */
function paperBarFor(state: GameState): { topTier: number; total: number } {
  // 顶尖院校的首考更狠。这条读的是你当年接了哪一份 offer
  if (state.flags.offer_from_top_tier) return { topTier: 2, total: 4 };
  return { topTier: 1, total: 3 };
}

/** 教学工作量的及格线。一格 +3,所以这是两格 */
const TEACHING_BAR = 3;
/** 带出来的学生数。六格的预算里,带学生最多买得起一个 */
const STUDENT_BAR = 1;

export function buildTenureReview(state: GameState, pack: ContentPack): TenureReviewLine[] {
  const bar = paperBarFor(state);
  const q1 = countPapers(state, { tier: 'q1' });
  const q2 = countPapers(state, { tier: 'q2' });
  const q3 = countPapers(state, { tier: 'q3' });
  const chinese = countPapers(state, { tier: 'cssci' }) + countPapers(state, { tier: 'chinese_core' });
  const top = q1 + q2;
  const total = (state.papers ?? []).length;
  const grant = Boolean(state.flags.got_young_grant);
  const teaching = readNumericFlag(state.flags.teaching_load);
  const students = readNumericFlag(state.flags.students_graduated);
  const service = readNumericFlag(state.flags.service_load);

  const lines: TenureReviewLine[] = [
    {
      label: '论文',
      actual: [q1 > 0 ? `一区 ${q1}` : null, q2 > 0 ? `二区 ${q2}` : null, q3 > 0 ? `三区 ${q3}` : null,
        chinese > 0 ? `中文 ${chinese}` : null]
        .filter(Boolean)
        .join(' · ') || '一篇都没有',
      required: `二区以上 ${bar.topTier} 篇,或总数 ${bar.total} 篇`,
      met: top >= bar.topTier || total >= bar.total,
    },
    {
      label: '基金',
      actual: grant ? '国自然青年 中了' : '国自然青年 没有中',
      // **硬指标,没有直接不过**(GAME_DESIGN 十节的原话)
      required: '青年基金(硬指标)',
      met: grant,
    },
    {
      label: '教学',
      actual: teaching > 0 ? `年均 ${teaching * 36} 课时` : '几乎没有上过课',
      required: '完成规定教学工作量',
      met: teaching >= TEACHING_BAR,
    },
    {
      label: '学生',
      actual: students > 0 ? `硕士 ${students} 名毕业` : '还没有学生毕业',
      required: `带出 ${STUDENT_BAR} 名`,
      met: students >= STUDENT_BAR,
    },
    {
      label: '其他',
      actual:
        service > 0 ? `院里的 ${service} 个行政岗、新课大纲、教学竞赛` : '没有承担院里的事务',
      // 没有硬指标——它只是陈述
      required: null,
      met: true,
    },
  ];

  // **人际那一行不参与判定。** 它在那儿,而且你说不清它起了多大作用
  const relationLine = state.flags.endured_advisor
    ? '与院长关系一般 · 系里有人觉得你不太合作'
    : state.flags.got_a_real_letter
      ? '有人替你说过话 · 系里对你评价不错'
      : '与院里的人相处平平 · 没有人特别支持你,也没有人反对';
  lines.push({ label: '人际', actual: relationLine, required: null, met: true });

  void pack;
  return lines;
}

/**
 * 过不过。**硬指标(基金)没有就直接不过**,其余按"满足几条"判。
 *
 * 不用加权总分,是因为十节写的就是一张清单:
 * 每一条是一个是非题,而不是一个可以互相抵消的分数。
 */
export function tenurePassed(lines: TenureReviewLine[]): boolean {
  const grant = lines.find(line => line.label === '基金');
  if (grant && !grant.met) return false;
  const judged = lines.filter(line => line.required !== null);
  const met = judged.filter(line => line.met).length;
  // 除基金外的三条硬线里至少过两条
  return met >= judged.length - 1;
}
