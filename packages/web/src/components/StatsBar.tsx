import { contentPack } from '@psy-sim/content';
import type { GameState } from '@psy-sim/core';
import { STAT_LABELS } from './ui';

/**
 * 常驻状态条:年份 · 阶段 · 五维 · 已选特质。
 *
 * 五维里**状态**单独标记低位:它 ≤0 会触发提前结局(休学/退学),
 * 所以玩家需要一直看得见它在往哪走,而不是在结局页才知道。
 */
export function StatsBar(props: { game: GameState; phaseLabel: string }) {
  const { game, phaseLabel } = props;
  const traits = contentPack.traits.filter(t => Boolean(game.flags[t.id]));
  return (
    <div className="stats-bar">
      <div className="stats-row stats-head">
        <span className="stats-year">{game.date.year}</span>
        <span className="stats-phase">{phaseLabel}</span>
        {game.profile.university && (
          <span className="stats-school">
            {game.profile.university}
            {game.profile.major ? ` · ${game.profile.major}` : ''}
          </span>
        )}
      </div>
      <div className="stats-row">
        {STAT_LABELS.map(([key, label]) => {
          const value = game.stats[key];
          const low = key === 'state' && value <= 25;
          return (
            <span key={key} className={`stat ${low ? 'stat-low' : ''}`}>
              <span className="stat-label">{label}</span>
              <span className="stat-value">
                {key === 'money' ? `¥${value.toLocaleString()}` : value}
              </span>
            </span>
          );
        })}
      </div>
      {traits.length > 0 && (
        <div className="stats-row stats-traits">
          {traits.map(t => (
            <span key={t.id} className="trait-chip">
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
