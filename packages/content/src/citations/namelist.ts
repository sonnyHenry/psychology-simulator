import { citations } from './index';

/**
 * 真实人名的两份名单(validate 规则 10)。
 *
 * ## 规则要防的是什么
 *
 * GAME_DESIGN 19.2:导师六原型里有"边界感差的"——挂名、抢一作、要求陪同应酬。
 * 把这些行为安在一个真实可查的具体人身上,是对一个真实个体的诽谤,任何免责声明都豁免不了。
 * **这条对所有原型一视同仁**:不能只对负面原型虚构、对正面原型用真名,
 * 那样等于反向指认——玩家一看哪个用了真名,就知道另外几个在影射谁。
 *
 * ## 为什么是两份而不是一份
 *
 * 最初写成一份硬黑名单,结果它立刻拦下了"彭聃龄那本砖头""张厚粲。这门课决定你后面十年"。
 * 但那两句**没有把任何行为安到任何人身上**——它们在指一本教材,
 * 而用作者名指代教材是这一行学生真实的说话方式,删掉就少了一层质感。
 *
 * 所以拆开:
 *
 * | 名单 | 允许出现在正文 | 允许当人物 | 典型成员 |
 * |---|---|---|---|
 * | `researcherNameBlocklist` | ❌ | ❌ | 引用池里的作者、方法学论战里的人 |
 * | `textbookAuthorAllowlist` | ✅ **仅作为著作署名** | ❌ | 教材作者、被学生当书名用的名字 |
 *
 * 白名单那份仍然**不许当人物**:一旦某个名字后面跟了"说 / 告诉你 / 让你 / 问你",
 * 它就从"一本书"变成了"一个人",规则 10 会拦下来(见 validate)。
 * 界线就在这里:**指一本书可以,让那本书的作者在你的故事里开口不行。**
 */

/** 从 `authors` 字段里拆出姓氏:'Simmons, Nelson & Simonsohn' → 三个 */
function surnamesOf(authors: string): string[] {
  return authors
    .replace(/\bet al\.?/gi, '')
    .split(/[,&]/)
    .map(s => s.trim())
    .filter(s => s.length > 1);
}

/**
 * 手工补充的硬黑名单:没进引用池、但极可能被顺手写进文案的真实研究者。
 *
 * 收进来的判准是**"这个名字在圈里对应一个活跃的、有立场的人"**——
 * 把虚构情节挂上去会真的伤到人。学科史上已故的奠基者(冯特、艾宾浩斯)不在此列,
 * 他们已经变成了术语的一部分(韦伯定律、艾宾浩斯曲线),而术语不是人。
 */
const MANUAL_BLOCKLIST = [
  // GAME_DESIGN 19.3 种子池里点名、本轮未收进引用池的方法学人物
  'Gelman', 'Loken', 'Chambers', 'Klein', 'Hayes', 'Zhao', 'Lynch',
  'Lakens', 'Barr', 'Cumming', 'Wagenmakers', 'Nosek', 'Vazire', 'Cuddy',
];

/**
 * **方法名例外。**
 *
 * 有些姓氏已经变成了方法的名字:Baron & Kenny 的中介检验、Benjamini-Hochberg 校正、
 * Cohen's d。说"用 Baron & Kenny 还是 Bootstrap"是在说**一个统计流程**,
 * 和说"韦伯定律"一样——它没有把任何行为安到任何人身上。
 *
 * 这些名字从硬黑名单里挪到白名单:**正文里可以当方法名用,但仍然不许当人物**
 * (后面跟"说/告诉你"会被规则 10 拦下),也不许当导师或 NPC 的姓名。
 *
 * 判准很简单:**这个姓氏在正文里出现时,读者想到的是一个流程还是一个人?**
 * 想到流程的进这里,想到人的留在黑名单。
 */
const METHOD_EPONYMS = ['Baron', 'Kenny', 'Benjamini', 'Hochberg', 'Cohen'];

/** 硬黑名单:引用池里的姓氏 ∪ 手工补充,再减去方法名例外 */
export const researcherNameBlocklist: string[] = [
  ...new Set([...citations.flatMap(c => surnamesOf(c.authors)), ...MANUAL_BLOCKLIST]),
].filter(name => !METHOD_EPONYMS.includes(name));

/**
 * 著作署名白名单:**可以在正文里出现,但只能当一本书**。
 *
 * 这些名字在中文心理学学生的日常话语里已经等同于书名——
 * "啃张厚粲""彭聃龄那本砖头"是真实的说法,而且不含任何对个人的评价。
 *
 * **它们仍然不许当人物**:后面跟"说/告诉/让你/问你/看着你"这类词就会被规则 10 拦下,
 * 也不许出现在导师、NPC、竞争者的姓名字段里。
 */
export const textbookAuthorAllowlist: string[] = [
  ...METHOD_EPONYMS,
  '彭聃龄', '张厚粲', '郭秀艳', '林崇德', '黄希庭', '武志红',
  '罗杰斯', '欧文·亚隆', '弗洛伊德', '荣格',
  'Rogers', 'Yalom', 'Beck', 'Freud', 'Jung',
  'Wundt', 'Ebbinghaus', 'Weber', 'Fechner', 'Skinner',
  'Milgram', 'Zimbardo', 'Kahneman', 'Tversky', 'Bandura', 'Piaget',
];

/** 把名字变成人物的词。白名单里的名字一旦跟上这些,就不再是"一本书"了 */
export const PERSONIFYING_MARKERS = [
  '说', '告诉', '让你', '问你', '看着你', '叫住', '拍了拍', '皱眉', '点头', '回复',
];
