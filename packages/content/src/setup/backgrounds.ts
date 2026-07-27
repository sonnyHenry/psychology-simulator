import type { BackgroundCard } from '@psy-sim/core';

/**
 * 家庭背景抽卡(GAME_DESIGN 2.1)。
 *
 * 背景卡决定三件事:钱的起点、**临床的起点**、以及一批贯穿全局的 flag。
 * (方法的起点由高考分数 + 学院归属决定,不在这里。)
 *
 * `origin_*` 这一批 flag 是十七节那条**动机隐线**的锚点:你为什么学这个。
 * 它们在二十年里被反复读取,但从不被评价。
 */
export const backgrounds: BackgroundCard[] = [
  {
    id: 'bg_urban_middle',
    label: '城市中产双职工',
    text: '父母将信将疑地支持。"学心理学以后能干什么"这句话,你未来十年会听很多遍。',
    initialMoney: 12000,
    statMods: { capital: 2 },
    flags: { origin_urban: true },
  },
  {
    id: 'bg_county_system',
    label: '县城体制内',
    text: '父母的规划里,你毕业就该回来考编——"心理老师也算老师"。',
    initialMoney: 8000,
    statMods: { state: 3 },
    flags: { origin_county: true, family_wants_stable_job: true },
  },
  {
    id: 'bg_rural',
    label: '农村家庭',
    text: '学费和生活费都是要算的。你会比同学更早知道读博的机会成本是多少钱。',
    initialMoney: 2000,
    statMods: { state: 4, capital: -2 },
    flags: { origin_rural: true },
  },
  {
    id: 'bg_doctor_family',
    label: '医生家庭',
    text: '父母是临床医生。他们知道"心理学不是精神科",而且不太掩饰这件事。',
    initialMoney: 15000,
    statMods: { clinical: 5, capital: 4 },
    flags: { origin_medical_family: true, has_hospital_contact: true },
  },
  {
    id: 'bg_teacher_family',
    label: '教师家庭',
    text: '你熟悉教育系统怎么运转。父母能理解"编制",但理解不了"博后"。',
    initialMoney: 9000,
    statMods: { clinical: 2, capital: 2 },
    flags: { origin_teacher_family: true },
  },
  {
    id: 'bg_illness_at_home',
    label: '家里有人生病',
    text: '你选心理学的真实动机,不写在志愿表上。',
    // 本作最重要的一张卡。临床起始值高、状态起始值低,并贯穿一条隐线(十七节)。
    // 写得克制:不猎奇、不煽情、不把病人当剧情道具。这条隐线的落点不是"治好了家人",
    // 而是"你终于能分清哪些是你的问题、哪些是这门学科的问题"。
    initialMoney: 4000,
    statMods: { clinical: 12, state: -12 },
    flags: { origin_illness: true },
  },
];
