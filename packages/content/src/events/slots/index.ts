import type { GameEvent } from '@psy-sim/core';

const oneOutcome = (text: string, effects: GameEvent['choices'][number]['outcomes'][number]['effects']) => [
  { weight: 1, text, effects },
];

/**
 * 叙事功能位的兄弟候选。每组三幕承担同一个叙事功能，但具体处境不同；
 * 它们不进入普通随机抽取，只有对应的 NarrativeSlot 会挑中其中一幕。
 */
export const narrativeSlotEvents: GameEvent[] = [
  // 大三第一次真实碰壁：设备、协作、手续三种版本。
  {
    id: 'ev_slot_u3_freezer', pools: ['undergrad'], category: 'lab',
    title: '冰箱门没有关严',
    text: '你到实验室时，样本冰箱的温度记录已经红了九个小时。昨晚最后离开的人不是你，但今天负责清点的人是你。',
    trigger: { year: { from: 2017, to: 2017 } },
    choices: [
      { id: 'report', text: '先封存记录，立刻告诉师姐', outcomes: oneOutcome('她看完温度曲线，删掉了两周的数据。你第一次知道“诚实记录”有时就是亲手让工作归零。', [{ stats: { method: 3, state: -2 } }]) },
      { id: 'check', text: '先补做质量检查，再决定能不能用', outcomes: oneOutcome('午后你确认只有一部分样本失效。工作保住了一半，那个上午也把“侥幸”和“核查”分开了。', [{ stats: { method: 2, state: -1 } }]) },
    ],
  },
  {
    id: 'ev_slot_u3_teammate_exit', pools: ['undergrad'], category: 'lab',
    title: '他说不做了',
    text: '正式课题刚开始收数据，与你搭档的同学说要退出实验室。考研、家里的事、还有这份没有学分的工作，他只能放掉一个。',
    trigger: { year: { from: 2017, to: 2017 } },
    choices: [
      { id: 'take_over', text: '把他那一半接过来', outcomes: oneOutcome('课题没有停。你的周五下午从此只剩下被试编号，师姐也开始把你当成真正能交付的人。', [{ stats: { capital: 3, state: -3 } }]) },
      { id: 'rescope', text: '和师姐一起缩小课题', outcomes: oneOutcome('你们砍掉一个条件。问题没有原来漂亮，但第一次按现有的人和时间真正做得完。', [{ stats: { method: 3, capital: -1 } }]) },
    ],
  },
  {
    id: 'ev_slot_u3_consent_gap', pools: ['undergrad'], category: 'lab',
    title: '少了十二张签字页',
    text: '录入到第 48 个被试时，你发现有十二份知情同意书只有编号，没有签字页。数据已经收完，人也联系不上了。',
    trigger: { year: { from: 2017, to: 2017 } },
    choices: [
      { id: 'discard', text: '把十二份数据剔除', outcomes: oneOutcome('样本量从 48 变成 36。图上的误差线立刻变宽，但每一个留下的数字都有来处。', [{ stats: { method: 4, state: -2 } }]) },
      { id: 'recontact', text: '逐个联系补手续', outcomes: oneOutcome('最后补回八份。你花了三天解释一张当初只用三十秒递出去的纸为什么重要。', [{ stats: { clinical: 2, state: -2 } }]) },
    ],
  },

  // 研二低谷：数据、导师、同门三种版本。
  {
    id: 'ev_slot_m2_drive_failure', pools: ['grad'], category: 'research',
    title: '移动硬盘只响了一声',
    text: '装着原始数据和清理日志的移动硬盘接上电脑，只响了一声。你有一份三周前的备份，之后那批被试没有。',
    trigger: { year: { from: 2020, to: 2020 } },
    choices: [
      { id: 'recover', text: '停下其他工作，做只读恢复', outcomes: oneOutcome('目录救回来大半，文件名全乱了。你用两天重新对表，也在当天晚上设好了自动备份。', [{ stats: { method: 3, state: -3 } }]) },
      { id: 'restart', text: '承认丢失，重收那批数据', outcomes: oneOutcome('你给{{advisor}}发了邮件。回复只有一句“那就重来”，但至少从这一刻起，损失不再需要藏着。', [{ stats: { capital: -2, method: 2 } }]) },
    ],
  },
  {
    id: 'ev_slot_m2_advisor_silence', pools: ['grad'], category: 'research',
    title: '三封邮件都没有回复',
    text: '你的分析卡在一个不能靠搜索解决的决定上。给{{advisor}}的三封邮件都没有回复，组会又连续取消了两次。',
    trigger: { year: { from: 2020, to: 2020 } },
    choices: [
      { id: 'ask_peer', text: '带着完整记录去问高年级同门', outcomes: oneOutcome('同门没有替你选，只指出了你漏掉的那条假设。你终于能继续，也欠下了一次认真读稿。', [{ stats: { method: 2, capital: 1 } }]) },
      { id: 'decide', text: '写下理由，自己做决定', outcomes: oneOutcome('你把取舍写进分析日志。它未必是最好的方案，却是第一次由你承担的方案。', [{ stats: { method: 3, state: -1 } }]) },
    ],
  },
  {
    id: 'ev_slot_m2_peer_published', pools: ['grad'], category: 'research',
    title: '同门的文章先出来了',
    text: '与你同年进组的人发来论文链接。题目不是你的方向，时间表却像一面镜子：ta 已经 online，你还在解释为什么分析要重跑。',
    trigger: { year: { from: 2020, to: 2020 } },
    choices: [
      { id: 'read', text: '把文章认真读完，再回一句祝贺', outcomes: oneOutcome('文章有做得很好的地方，也有你不会那样处理的地方。比较没有消失，但终于变得具体。', [{ stats: { method: 2, state: -1 } }]) },
      { id: 'close', text: '先关掉链接，完成今天的重跑', outcomes: oneOutcome('进度条走到 100% 时已经凌晨。你没有因此追上谁，只把自己的工作往前推了一步。', [{ stats: { state: 1, capital: -1 } }]) },
    ],
  },
];
