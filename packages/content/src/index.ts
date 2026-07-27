import type { ContentPack } from '@psy-sim/core';
import { timeline } from './timeline/phases';
import { backgrounds } from './setup/backgrounds';
import { traits } from './setup/traits';
import { applications } from './setup/applications';
import { examBank } from './setup/exam';
import { allocationItems } from './setup/allocation';
import { crossroadOptions, lifeGoals, masterCrossroadOptions } from './setup/crossroad';
import { courses } from './courses';
import { projectTemplates } from './projects';
import { advisors } from './advisors';
import { foundationEvents } from './events/foundation';
import { GAMEIFIED_TERMS_NOTICE, institutions } from './institutions';
import { positions } from './institutions/positions';
import { citations, foundations } from './citations';
import { researcherNameBlocklist, textbookAuthorAllowlist } from './citations/namelist';
import { gradAllocationItems } from './setup/grad-allocation';
import { courseExamBank } from './courses/exams';
import { npcs } from './npcs';
import { year1Events } from './events/undergrad/year1';
import { year2Events } from './events/undergrad/year2';
import { year3Events } from './events/undergrad/year3';
import { year4Events } from './events/undergrad/year4';
import { collegeEvents } from './events/undergrad/college';
import { socialSeedEvents } from './events/undergrad/social';
import { crisisEvents } from './events/undergrad/crisis';
import { masteryEvents } from './events/undergrad/mastery';
import { thesisEvents } from './events/undergrad/thesis';
import { gradEvents } from './events/grad';
import { projectStageEvents } from './events/project/stages';
import { endings } from './endings';

/**
 * 《心理学模拟器》内容包。
 *
 * M2 状态:2014 年 6 月填志愿 → 本科四年(四格精力 + 课程三档判定 + 两座大山期末小测)
 * → 2018 年三月大四三岔口 → 七条路径各自的第一年。
 *
 * 目标规模见 GAME_DESIGN 第二十三节:约 478 事件 / 34–38 结局。
 *
 * `version` 语义沿用前作:版本号变了,存档就走 `seed + actionLog` 重放而不是 snapshot。
 */
export const contentPack: ContentPack = {
  meta: {
    id: 'psy-sim-2014',
    version: '0.3.0',
    title: '心理学模拟器',
    fallbackEndingId: 'end_m2_fallback',
    examQuestionCount: 6,
    // 六位人物里选两位。**恋人线不强制**——没有"必选人物"这个概念。
    npcPickCount: 2,
    // 默认权重。选了人生取向之后由 `LifeGoal.scoringWeights` 覆盖。
    scoring: {
      weights: { method: 0.25, clinical: 0.2, capital: 0.25, state: 0.2, money: 0.1 },
      moneyFullScore: 400000,
    },
  },
  timeline,
  events: [
    ...year1Events,
    ...year2Events,
    ...year3Events,
    ...year4Events,
    ...collegeEvents,
    ...socialSeedEvents,
    ...crisisEvents,
    ...masteryEvents,
    ...thesisEvents,
    ...gradEvents,
    ...projectStageEvents,
    ...foundationEvents,
  ],
  incomes: [],
  endings,
  examBank,
  courseExamBank,
  courses,
  projectTemplates,
  allocationItems: [...allocationItems, ...gradAllocationItems],
  crossroadOptions: [...crossroadOptions, ...masterCrossroadOptions],
  advisors,
  institutions,
  positions,
  citations,
  foundations,
  gameifiedTermsNotice: GAMEIFIED_TERMS_NOTICE,
  researcherNameBlocklist,
  textbookAuthorAllowlist,
  backgrounds,
  traits,
  traitEvolutions: [],
  lifeGoals,
  applications,
  npcs,
  fns: {},
};

export const CONTENT_VERSION = contentPack.meta.version;
