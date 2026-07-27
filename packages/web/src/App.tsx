import { contentPack } from '@psy-sim/content';
import { StatsBar } from './components/StatsBar';
import { AllocationScreen } from './screens/Allocation';
import { GradApplyScreen, GradResultScreen } from './screens/GradApply';
import {
  AdvisorDrawScreen,
  ApplicationScreen,
  BackgroundScreen,
  BriefScreen,
  CrossroadScreen,
  EndingScreen,
  EventScreen,
  ExamResultScreen,
  ExamScreen,
  LifeGoalScreen,
  NpcSelectionScreen,
  OutcomeScreen,
  ProjectBoardScreen,
  SettlementScreen,
  SetupScreen,
  TitleScreen,
} from './screens/Screens';
import { useGame } from './store';

/** 当前阶段的 label,给 StatsBar 用。开局(phaseIndex < 0)时显示年份含义。 */
function phaseLabelOf(phaseIndex: number): string {
  return contentPack.timeline[phaseIndex]?.label ?? '开局';
}

export default function App() {
  const { game, view, act, hasSave, continueGame, newGame } = useGame();
  const showStats = view.kind !== 'TITLE' && view.kind !== 'ENDING';

  return (
    <div className="app">
      {showStats && <StatsBar game={game} phaseLabel={phaseLabelOf(game.phaseIndex)} />}
      <main className="stage">
        {(() => {
          switch (view.kind) {
            case 'TITLE':
              return <TitleScreen view={view} act={act} hasSave={hasSave} onContinue={continueGame} />;
            case 'BACKGROUND_DRAW':
              // key 让每次抽卡都重置本地选择状态,否则上一局的勾选会残留
              return <BackgroundScreen key={view.card.id} view={view} act={act} />;
            case 'SETUP':
              return <SetupScreen view={view} act={act} />;
            case 'EXAM':
              return <ExamScreen view={view} act={act} isCourseExam={game.examKind === 'course'} />;
            case 'EXAM_RESULT':
              return <ExamResultScreen view={view} act={act} />;
            case 'APPLICATION':
              return <ApplicationScreen view={view} act={act} />;
            case 'NPC_SELECTION':
              return <NpcSelectionScreen view={view} act={act} />;
            case 'LIFE_GOAL':
              return <LifeGoalScreen view={view} act={act} />;
            case 'CROSSROAD':
              return <CrossroadScreen view={view} act={act} />;
            case 'GRAD_APPLY':
              // key 用阶段年份:三次申请复用同一个组件,换屏时要清掉上一次的勾选
              return <GradApplyScreen key={`${view.applyKind}-${view.year}`} view={view} act={act} />;
            case 'GRAD_RESULT':
              return <GradResultScreen view={view} act={act} />;
            case 'ADVISOR_DRAW':
              return <AdvisorDrawScreen view={view} act={act} />;
            case 'PROJECT_BOARD':
              return <ProjectBoardScreen view={view} act={act} />;
            case 'ALLOCATION':
              // key 用年份:每年重新分配时清空上一年的本地勾选
              return (
                <AllocationScreen
                  key={view.year}
                  view={view}
                  onSubmit={picks => act({ type: 'ALLOCATE', picks })}
                />
              );
            case 'BRIEF':
              return <BriefScreen view={view} act={act} />;
            case 'EVENT':
              return <EventScreen key={view.eventId} view={view} act={act} />;
            case 'OUTCOME':
              return <OutcomeScreen view={view} act={act} />;
            case 'SETTLEMENT':
              return <SettlementScreen view={view} act={act} />;
            case 'ENDING':
              return <EndingScreen view={view} onRestart={() => newGame()} />;
          }
        })()}
      </main>
    </div>
  );
}
