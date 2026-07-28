import { useState } from 'react';
import type { PlayerAction, ViewModel } from '@psy-sim/core';
import { devJumpTargets } from '@psy-sim/content';
import { Card, ChoiceButton, ContinueButton, DeltaChips, MoneyTrend, RichText } from '../components/ui';

type Act = (action: PlayerAction) => void;
type Of<K extends ViewModel['kind']> = Extract<ViewModel, { kind: K }>;

/** 开发面板开关:dev server 下常开,构建版加 `?dev` 才出现。测试工具不给普通玩家看 */
const DEV_PANEL_ENABLED =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev'));

export function TitleScreen(props: {
  view: Of<'TITLE'>;
  act: Act;
  hasSave: boolean;
  onContinue: () => void;
  onDevJump?: (targetId: string) => boolean;
}) {
  return (
    <Card className="title">
      <h1>{props.view.title}</h1>
      <p className="title-sub">2014 年 6 月。志愿表上那一行,你还没有填。</p>
      <ContinueButton onClick={() => props.act({ type: 'START' })} label="开始新的一局" />
      {props.hasSave && <ContinueButton onClick={props.onContinue} label="继续上一局" />}
      {DEV_PANEL_ENABLED && props.onDevJump && (
        <details className="dev-jump">
          <summary>测试:一键跳到人生节点</summary>
          <p className="dev-jump-note">
            自动快进到目标节点,路上的选择按默认策略做(答题全对、岔口按目标选、精力按目标线投)。
            每次跳转是一局新种子;跳完照常存档,可以从那里继续手玩。
          </p>
          <div className="dev-jump-grid">
            {devJumpTargets.map(target => (
              <button
                key={target.id}
                className="choice-btn"
                onClick={() => {
                  if (!props.onDevJump!(target.id)) {
                    alert(`跳转失败:${target.label}(见 verify-jumps)`);
                  }
                }}
              >
                {target.label}
              </button>
            ))}
          </div>
        </details>
      )}
      <p className="disclaimer">
        本作是一个游戏。它使用真实量表的题目形态和真实的行业制度来做叙事,但不提供任何诊断或评估。
        如果你或你身边的人需要帮助:全国心理援助热线 <strong>12356</strong>。
      </p>
    </Card>
  );
}

export function BackgroundScreen(props: { view: Of<'BACKGROUND_DRAW'>; act: Act }) {
  const { view, act } = props;
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < view.pickCount ? [...prev, id] : prev,
    );
  return (
    <Card>
      <div className="screen-head">
        <h2>{view.card.label}</h2>
      </div>
      <RichText text={view.card.text} />
      <p className="screen-sub">
        初始资金 ¥{view.card.initialMoney.toLocaleString()}
      </p>
      <div className="section-label">选 {view.pickCount} 张特质(整局不变)</div>
      {view.traitOffer.map(trait => (
        <div
          key={trait.id}
          className={`pick-card ${picked.includes(trait.id) ? 'pick-card-on' : ''}`}
          onClick={() => toggle(trait.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && toggle(trait.id)}
        >
          <div className="pick-card-label">{trait.label}</div>
          <div className="pick-card-text">{trait.text}</div>
          {trait.statMods && (
            <div className="pick-card-mods">
              {Object.entries(trait.statMods).map(([k, v]) => (
                <span key={k} className={`chip ${(v ?? 0) > 0 ? 'chip-up' : 'chip-down'}`}>
                  {STAT_NAME[k] ?? k} {(v ?? 0) > 0 ? '+' : ''}
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
      <ContinueButton
        onClick={() => act({ type: 'CHOOSE_TRAITS', traitIds: picked })}
        disabled={picked.length !== view.pickCount}
        label={picked.length === view.pickCount ? '就这两张' : `再选 ${view.pickCount - picked.length} 张`}
      />
    </Card>
  );
}

const STAT_NAME: Record<string, string> = {
  method: '方法',
  clinical: '临床',
  capital: '资本',
  state: '状态',
  money: '金钱',
};

export function SetupScreen(props: { view: Of<'SETUP'>; act: Act }) {
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  return (
    <Card>
      <div className="screen-head">
        <h2>填表之前</h2>
        <p className="screen-sub">性别不影响任何数值,只影响叙述里的称呼。</p>
      </div>
      <div className="inline-picks">
        {props.view.genders.map(g => (
          <button
            key={g}
            className={`inline-pick ${gender === g ? 'inline-pick-on' : ''}`}
            onClick={() => setGender(g)}
          >
            {g === 'male' ? '男' : '女'}
          </button>
        ))}
      </div>
      <div className="section-label">文理分科(影响你能报哪些学院)</div>
      {props.view.tracks.map(track => (
        <ChoiceButton
          key={track}
          onClick={() => props.act({ type: 'CHOOSE_SETUP', gender: gender ?? 'male', track })}
        >
          {track}科
        </ChoiceButton>
      ))}
    </Card>
  );
}

export function ExamScreen(props: { view: Of<'EXAM'>; act: Act; isCourseExam: boolean }) {
  const { view, act, isCourseExam } = props;
  return (
    <Card>
      <div className="screen-head">
        <h2>{isCourseExam ? `${view.question.subject} 期末小测` : '2014 年 6 月 · 高考'}</h2>
        <p className="screen-sub">
          {view.question.subject} · 第 {view.index + 1} / {view.total} 题
        </p>
      </div>
      <RichText text={view.question.text} />
      {view.question.options.map((option, index) => (
        <ChoiceButton key={index} onClick={() => act({ type: 'ANSWER', optionIndex: index })}>
          {String.fromCharCode(65 + index)}. {option}
        </ChoiceButton>
      ))}
      <button className="skip-btn" onClick={() => act({ type: 'SKIP_EXAM' })}>
        {isCourseExam ? '不答了' : '跳过剩下的题'}
      </button>
    </Card>
  );
}

export function ExamResultScreen(props: { view: Of<'EXAM_RESULT'>; act: Act }) {
  return (
    <Card>
      <div className="screen-head">
        <h2>出分了</h2>
      </div>
      <p className="big-number">{props.view.score}</p>
      <p className="screen-sub">
        答对 {props.view.correct} / {props.view.total} 题
      </p>
      <ContinueButton onClick={() => props.act({ type: 'CONTINUE' })} label="去填志愿" />
    </Card>
  );
}

export function ApplicationScreen(props: { view: Of<'APPLICATION'>; act: Act }) {
  const { view, act } = props;
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Card>
      <div className="screen-head">
        <h2>填志愿</h2>
        <p className="screen-sub">
          你的分数:{view.score}。心理学在不同学校挂在不同学院下,
          <strong>学位和课程结构完全不同</strong>——这是你要做的第一次真正的选择。
        </p>
      </div>
      {view.options.map(option => (
        <div key={option.id} className="app-option">
          <button className="app-option-head" onClick={() => setOpenId(openId === option.id ? null : option.id)}>
            <span>{option.label}</span>
            <span className={`chance chance-${option.risky ? 'risky' : 'safe'}`}>{option.chanceLabel}</span>
          </button>
          {openId === option.id && (
            <div className="app-majors">
              {option.majors.map(major => (
                <ChoiceButton
                  key={major.id}
                  onClick={() => act({ type: 'APPLY', optionId: option.id, majorId: major.id })}
                >
                  {major.name}
                </ChoiceButton>
              ))}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

export function NpcSelectionScreen(props: { view: Of<'NPC_SELECTION'>; act: Act }) {
  const { view, act } = props;
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < view.pickCount ? [...prev, id] : prev,
    );
  return (
    <Card>
      <div className="screen-head">
        <h2>接下来这些年会反复遇到的人</h2>
        <p className="screen-sub">
          选 {view.pickCount} 位。<strong>没有必选项。</strong>
        </p>
      </div>
      {view.npcs.map(npc => (
        <div
          key={npc.id}
          className={`pick-card ${picked.includes(npc.id) ? 'pick-card-on' : ''}`}
          onClick={() => toggle(npc.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && toggle(npc.id)}
        >
          <div className="pick-card-label">{npc.name}</div>
          <div className="pick-card-text">{npc.description}</div>
        </div>
      ))}
      <ContinueButton
        onClick={() => act({ type: 'CHOOSE_NPCS', npcIds: picked })}
        disabled={picked.length !== view.pickCount}
        label={picked.length === view.pickCount ? '就这些人' : `再选 ${view.pickCount - picked.length} 位`}
      />
    </Card>
  );
}

export function LifeGoalScreen(props: { view: Of<'LIFE_GOAL'>; act: Act }) {
  return (
    <Card>
      <div className="screen-head">
        <h2>你到底想要什么</h2>
        <p className="screen-sub">它改变你后面会更常遇到什么事,也改变最后怎么算这一生。</p>
      </div>
      {props.view.goals.map(goal => (
        <ChoiceButton
          key={goal.id}
          sub={goal.text}
          onClick={() => props.act({ type: 'CHOOSE_LIFE_GOAL', goalId: goal.id })}
        >
          {goal.label}
        </ChoiceButton>
      ))}
    </Card>
  );
}

export function CrossroadScreen(props: { view: Of<'CROSSROAD'>; act: Act }) {
  const { view, act } = props;
  return (
    <Card>
      <div className="screen-head">
        <h2>{view.year} 年三月</h2>
        <p className="screen-sub">
          {view.university} · {view.major}。
          <strong>手里的牌决定你能去哪</strong>——够不到的路不会出现在这张清单上。
        </p>
      </div>
      {view.options.map(option => (
        <ChoiceButton
          key={option.id}
          sub={option.hint}
          onClick={() => act({ type: 'CHOOSE_CROSSROAD', optionId: option.id })}
        >
          {option.label}
        </ChoiceButton>
      ))}
    </Card>
  );
}

const TIER_NAME: Record<string, string> = {
  q1: '一区',
  q2: '二区',
  q3: '三区',
  cssci: 'CSSCI',
  chinese_core: '中文核心',
  conference: '会议',
  preprint: '预印本',
};

const AUTHORSHIP_NAME: Record<string, string> = {
  first: '一作',
  co_first: '共同一作',
  second: '二作',
  middle: '中间',
  corresponding: '通讯',
};

export function AdvisorDrawScreen(props: { view: Of<'ADVISOR_DRAW'>; act: Act }) {
  return (
    <Card>
      <div className="screen-head">
        <h2>{props.view.year} 年 · 进组</h2>
        <p className="screen-sub">
          你能看到的只有主页、论文数,和师兄师姐的一句话。
          <strong>剩下的要两三年才知道。</strong>
        </p>
      </div>
      {props.view.candidates.map(advisor => (
        <ChoiceButton
          key={advisor.id}
          sub={advisor.publicImpression}
          onClick={() => props.act({ type: 'JOIN_ADVISOR', advisorId: advisor.id })}
        >
          {advisor.name}
        </ChoiceButton>
      ))}
    </Card>
  );
}

export function BriefScreen(props: { view: Of<'BRIEF'>; act: Act }) {
  return (
    <Card className="brief">
      <div className="screen-head">
        <h2>
          {props.view.year} 年 · {props.view.phaseLabel}
        </h2>
      </div>
      <RichText text={props.view.text} />
      <ContinueButton onClick={() => props.act({ type: 'CONTINUE' })} label="这一年开始了" />
    </Card>
  );
}

export function EventScreen(props: { view: Of<'EVENT'>; act: Act }) {
  const { view, act } = props;
  return (
    <Card className={view.major ? 'event event-major' : 'event'}>
      {view.major && <div className="major-tag">关键节点</div>}
      <div className="screen-head">
        <h2>{view.title}</h2>
      </div>
      <RichText text={view.text} />
      <div className="choices">
        {view.choices.map(choice => (
          <ChoiceButton key={choice.id} onClick={() => act({ type: 'CHOOSE', choiceId: choice.id })}>
            {choice.text}
          </ChoiceButton>
        ))}
      </div>
    </Card>
  );
}

export function OutcomeScreen(props: { view: Of<'OUTCOME'>; act: Act }) {
  return (
    <Card className="outcome">
      <RichText text={props.view.text} />
      <DeltaChips deltas={props.view.deltas} />
      {props.view.relationshipHint && <p className="hint">{props.view.relationshipHint}</p>}
      <ContinueButton onClick={() => props.act({ type: 'CONTINUE' })} />
    </Card>
  );
}

const TIER_LABEL = { mastered: '学通了', passed: '过了', failed: '挂了' } as const;

/** 阶段的中文名。引擎里是英文 id,展示层才翻译——内容和引擎都不该知道 UI 用什么词 */
const STAGE_LABEL: Record<string, string> = {
  ideation: '想法',
  lit: '文献',
  ethics: '伦理审查',
  collect: '收数据',
  analyze: '分析',
  write: '写作',
  submit: '投稿',
  review: '在审',
  published: '完成',
  abandoned: '放弃了',
};

/** 个案状态的中文名。措辞是行话:脱落不是"流失",结束不是"痊愈" */
const CASE_STATUS_LABEL: Record<string, string> = {
  intake: '初始访谈',
  working: '工作期',
  plateau: '停滞',
  terminating: '结束期',
  dropped: '脱落',
  completed: '结束',
  referred: '转介',
};

export function SettlementScreen(props: { view: Of<'SETTLEMENT'>; act: Act }) {
  const { view, act } = props;
  return (
    <Card className="settlement">
      <div className="screen-head">
        <h2>{view.year} 年</h2>
        <p className="screen-sub">这一年的账。只陈述,不评价。</p>
      </div>

      {view.courseResults.length > 0 && (
        <div className="review-block">
          <div className="review-label">课程</div>
          {view.courseResults.map((course, i) => (
            <div key={i} className={`review-row tier-${course.tier}`}>
              <span>{course.label}</span>
              <span className="review-value">{TIER_LABEL[course.tier]}</span>
            </div>
          ))}
        </div>
      )}

      {view.projects.length > 0 && (
        <div className="review-block">
          <div className="review-label">课题</div>
          {view.projects.map((project, i) => (
            <div key={i} className="review-row">
              <span>
                「{project.title}」{project.isThesis && <span className="thesis-tag">毕业论文</span>}
              </span>
              <span className="review-value">
                {STAGE_LABEL[project.stage] ?? project.stage}
                {project.yearsSpent > 0 && ` · 第 ${project.yearsSpent + 1} 年`}
              </span>
            </div>
          ))}
        </div>
      )}

      {view.cases.length > 0 && (
        <div className="review-block">
          <div className="review-label">个案</div>
          {view.cases
            .filter(kase => kase.status !== 'completed' && kase.status !== 'referred')
            .map((kase, i) => (
              <div key={i} className="review-row">
                <span>「{kase.label}」</span>
                <span className="review-value">
                  {kase.status === 'dropped'
                    ? `脱落(第 ${kase.droppedAtSession ?? kase.sessions} 次)`
                    : (CASE_STATUS_LABEL[kase.status] ?? kase.status) +
                      // 联盟数值刻意不给,只给走向——把关系变成进度条,机制就毁了
                      (kase.trend === 'warm' ? ' · 在变好' : kase.trend === 'strained' ? ' · 有点僵' : '')}
                </span>
              </div>
            ))}
          {view.clinicalHours > 0 && (
            <div className="review-row">
              <span>注册小时数</span>
              <span className="review-value">
                {view.clinicalHours}
                {view.supervisionHours > 0 && ` · 督导 ${view.supervisionHours}`}
              </span>
            </div>
          )}
        </div>
      )}

      {view.incomes.length > 0 && (
        <div className="review-block">
          <div className="review-label">收支</div>
          {view.incomes.map((income, i) => (
            <div key={i} className="review-row">
              <span>{income.label}</span>
              <span className="review-value">
                {income.amount >= 0 ? '+' : ''}¥{income.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="review-block">
        <div className="review-label">数值</div>
        <div className="review-row">
          <span>方法 / 临床 / 资本 / 状态</span>
          <span className="review-value">
            {view.stats.method} / {view.stats.clinical} / {view.stats.capital} / {view.stats.state}
          </span>
        </div>
        <div className="review-row">
          <span>钱</span>
          <span className="review-value">¥{view.stats.money.toLocaleString()}</span>
        </div>
      </div>

      <MoneyTrend trend={view.moneyTrend} />
      {view.milestone && <p className="hint">{view.milestone}</p>}
      <ContinueButton onClick={() => act({ type: 'CONTINUE' })} label="翻过这一年" />
    </Card>
  );
}

export function EndingScreen(props: { view: Of<'ENDING'>; onRestart: () => void }) {
  const { view } = props;
  return (
    <Card className="ending">
      <div className="screen-head">
        <div className="ending-label">结局</div>
        <h2>{view.title}</h2>
      </div>
      <RichText text={view.text} />
      <div className="review-block">
        <div className="review-label">最终数值</div>
        <div className="review-row">
          <span>方法 / 临床 / 资本 / 状态</span>
          <span className="review-value">
            {view.stats.method} / {view.stats.clinical} / {view.stats.capital} / {view.stats.state}
          </span>
        </div>
        <div className="review-row">
          <span>钱</span>
          <span className="review-value">¥{view.stats.money.toLocaleString()}</span>
        </div>
        <div className="review-row">
          <span>评分</span>
          <span className="review-value">
            {view.score} · {view.grade}
          </span>
        </div>
      </div>
      {view.papers.length > 0 && (
        <div className="review-block">
          <div className="review-label">你的论文</div>
          {view.papers.map((paper, i) => (
            <div key={i} className="review-row">
              <span>
                「{paper.title}」
                {/* null = 从来没有人试过重复。**这是绝大多数论文的真实结局**,
                    所以它不显示任何标记——只有真的被试过的才标。 */}
                {paper.replicated === false && <span className="not-replicated">没有被重复出来</span>}
              </span>
              <span className="review-value">
                {paper.year} · {TIER_NAME[paper.tier] ?? paper.tier} ·{' '}
                {AUTHORSHIP_NAME[paper.authorship] ?? paper.authorship}
              </span>
            </div>
          ))}
        </div>
      )}
      {view.abandonedProjects.length > 0 && (
        <div className="review-block">
          <div className="review-label">没做完的</div>
          {view.abandonedProjects.map((project, i) => (
            <div key={i} className="review-row">
              <span>「{project.title}」</span>
              <span className="review-value">{project.yearsSpent} 年</span>
            </div>
          ))}
        </div>
      )}
      {view.cases.length > 0 && (
        <div className="review-block">
          <div className="review-label">你的来访者们</div>
          {view.cases.map((kase, i) => (
            <div key={i} className="review-row">
              <span>「{kase.label}」</span>
              <span className="review-value">
                {kase.status === 'dropped'
                  ? `在第 ${kase.droppedAtSession ?? kase.sessions} 次之后没有再来`
                  : kase.status === 'completed'
                    ? `${kase.sessions} 次 · 好好告别了`
                    : kase.status === 'referred'
                      ? '转介给了更合适的人'
                      : '还在谈'}
              </span>
            </div>
          ))}
          {/* 后来怎么样了?**你不知道。咨询结束之后就不该知道了。** */}
          <p className="hint">他们后来怎么样了,你多数不知道。咨询结束之后,就不该知道了。</p>
        </div>
      )}
      <MoneyTrend trend={view.moneyTrend} />
      <p className="share-tagline">{view.shareCard.tagline}</p>
      <p className="disclaimer">
        本作是一个游戏,不提供任何诊断或评估。如果你或你身边的人需要帮助:
        全国心理援助热线 <strong>12356</strong>。
      </p>
      <ContinueButton onClick={props.onRestart} label="再来一局" />
    </Card>
  );
}
