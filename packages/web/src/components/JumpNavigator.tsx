import { useRef, useState } from 'react';
import { devJumpTargets } from '@psy-sim/content';

export function JumpNavigator(props: {
  progressYear: number;
  onJump: (targetId: string) => boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const targets = [...devJumpTargets].sort((a, b) => a.year - b.year || a.label.localeCompare(b.label, 'zh-CN'));
  const availableCount = targets.filter(target => target.year > props.progressYear).length;
  const pendingTarget = targets.find(target => target.id === pendingTargetId);

  const requestJump = (targetId: string) => {
    setError(null);
    setPendingTargetId(targetId);
  };

  const confirmJump = () => {
    if (!pendingTarget) return;
    if (!props.onJump(pendingTarget.id)) {
      setError('跳转没有完成。这个节点可能暂时不可达，请换一个更晚的节点。');
      setPendingTargetId(null);
      return;
    }
    setError(null);
    setPendingTargetId(null);
    detailsRef.current?.removeAttribute('open');
  };

  return (
    <details
      className="jump-nav"
      ref={detailsRef}
      onToggle={event => {
        if (!event.currentTarget.open) {
          setError(null);
          setPendingTargetId(null);
        }
      }}
    >
      <summary aria-label="打开人生节点跳转面板">
        <span aria-hidden="true">↠</span>
        跳到节点
      </summary>
      <div className="jump-panel">
        <div className="jump-panel-head">
          <strong>跳到人生节点</strong>
          <span>当前进度:{props.progressYear}</span>
        </div>
        <p className="jump-panel-note">
          会按默认策略重新生成此前经历并覆盖存档。只可往后跳，已到过或同年的节点不能返回。
        </p>
        {error && <p className="jump-panel-error">{error}</p>}
        {pendingTarget && (
          <div className="jump-confirm" role="alert">
            <strong>跳到「{pendingTarget.label}」？</strong>
            <p>将覆盖当前存档；到达 {pendingTarget.year} 年后，不能再跳回更早节点。</p>
            <div className="jump-confirm-actions">
              <button type="button" onClick={() => setPendingTargetId(null)}>取消</button>
              <button type="button" className="primary" onClick={confirmJump}>
                确认跳到 {pendingTarget.year} 年
              </button>
            </div>
          </div>
        )}
        <div className="jump-grid">
          {targets.map(target => {
            const disabled = target.year <= props.progressYear;
            return (
              <button
                key={target.id}
                type="button"
                data-jump-target={target.id}
                disabled={disabled}
                title={disabled ? `当前已到 ${props.progressYear} 年，不能返回 ${target.year} 年` : undefined}
                onClick={() => requestJump(target.id)}
              >
                <span>{target.label}</span>
                <small>{disabled ? '已经过' : `${target.year}`}</small>
              </button>
            );
          })}
        </div>
        {availableCount === 0 && <p className="jump-panel-end">已经没有更晚的跳转节点。</p>}
      </div>
    </details>
  );
}
