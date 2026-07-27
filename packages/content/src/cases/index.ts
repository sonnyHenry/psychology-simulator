import type { CaseTemplate } from '@psy-sim/core';

/**
 * 个案模板池(GAME_DESIGN 第六节)。
 *
 * ## 写主诉,不写诊断
 *
 * `presentingIssues` 里是来访者**带进门的那句话**,不是 DSM 编码。
 * "第一次惊恐发作之后不敢再坐地铁"是主诉;"惊恐障碍"是你之后才慢慢形成的概念化,
 * 而且在咨询设置里你多数时候不下诊断——《精神卫生法》把诊断留给了医院。
 *
 * ## `orientationFit` 不是门槛,是坡度
 *
 * 取向不匹配的个案照样会分给你——现实里没有人只接"顺手的"。
 * 匹配项只进联盟漂移公式:不顺手的个案走得慢、更容易停滞,但不是不能做。
 *
 * ## 高风险个案有门槛
 *
 * `availableWhen` 挡的是"机构会不会把这样的来访者分给你":
 * 有自伤史的青少年不会被排给一个没有督导记录的新手——**通常**不会。
 */
export const caseTemplates: CaseTemplate[] = [
  {
    id: 'tpl_panic',
    label: '不敢坐地铁的研究生',
    presentingIssues: [
      '第一次惊恐发作之后,他不敢再坐地铁。他随身带着一瓶没开封的水,"以防万一"。',
      '她在早高峰的车厢里突然觉得自己要死了。急诊查了心电图,什么都没有。',
    ],
    riskLevel: 'low',
    orientationFit: ['orientation_cbt', 'orientation_integrative'],
  },
  {
    id: 'tpl_breakup',
    label: '第七次分手的人',
    presentingIssues: [
      '她和同一个人分了七次手。这次她想弄明白的不是"要不要复合",是"为什么总是我先低头"。',
      '他说每段关系都死在同一个地方,像一份被复印的病历。',
    ],
    riskLevel: 'low',
    orientationFit: ['orientation_dynamic'],
  },
  {
    id: 'tpl_grief',
    label: '整理遗物的人',
    presentingIssues: [
      '母亲走了十一个月,他还没动过她的房间。家里人说"该走出来了",所以他来了。',
      '她说最难的不是想起来,是有一天发现自己想不起来声音了。',
    ],
    riskLevel: 'moderate',
    orientationFit: ['orientation_humanistic', 'orientation_dynamic'],
  },
  {
    id: 'tpl_school_refusal',
    label: '不去上学的高三男生',
    presentingIssues: [
      '开学第三周他不去了。父母试过讲道理、断网、下跪。坐在你对面的第一句话是"我没病"。',
      '他每天在家学到凌晨,就是不进那个校门。是他妈妈先来的,替他。',
    ],
    riskLevel: 'moderate',
    orientationFit: ['orientation_integrative', 'orientation_cbt'],
  },
  {
    id: 'tpl_selfharm_teen',
    label: '长袖子的女孩',
    presentingIssues: [
      '十六岁,七月还穿着长袖。学校的筛查把她转介过来,她自己没什么要谈的。',
      '她说那不是想结束什么,只是"想感觉到点什么"。这句话你在教科书里读过,从她嘴里说出来不一样。',
    ],
    riskLevel: 'high',
    // 机构不会把她排给一个没有督导记录的新手——通常不会
    availableWhen: {
      any: [
        { stat: 'clinical', op: '>=', value: 55 },
        { flagNum: { key: 'supervision_hours', op: '>=', value: 24 } },
      ],
    },
    orientationFit: ['orientation_cbt', 'orientation_integrative'],
  },
  {
    id: 'tpl_burnout_pm',
    label: '半夜发工作消息的产品经理',
    presentingIssues: [
      '他说自己"只是最近有点累"。他的体检报告、辞职冲动和凌晨三点的心跳都不同意。',
      '她管理着一个十一个人的团队,和一个每天早上不想睁眼的自己。',
    ],
    riskLevel: 'low',
    orientationFit: ['orientation_cbt', 'orientation_integrative'],
  },
  {
    id: 'tpl_marriage',
    label: '各刷各的手机的夫妻',
    presentingIssues: [
      '结婚九年。他们已经不吵了,她说不吵比吵更可怕。来的只有她一个。',
      '他说想在离婚协议签字之前"确认一下是不是真的没了"。',
    ],
    riskLevel: 'moderate',
    orientationFit: ['orientation_dynamic', 'orientation_humanistic'],
  },
  {
    id: 'tpl_retired_teacher',
    label: '只是想找个人说话的退休教师',
    presentingIssues: [
      '教了三十七年语文。退休第二年,她说家里安静得"能听见冰箱的声音"。',
      '子女给她订了十次咨询当生日礼物。她第一次来是为了不浪费钱。',
    ],
    riskLevel: 'low',
    orientationFit: ['orientation_humanistic'],
  },
];
