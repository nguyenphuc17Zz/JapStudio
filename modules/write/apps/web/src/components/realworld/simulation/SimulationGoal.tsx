import { Button } from '../../ui/Button'

export interface SimulationGoalProps {
  objective: string
  completedItems: string[]
  unresolvedItems: string[]
  nextGoal: string
  progress: number
}

export function SimulationGoal({
  objective,
  completedItems,
  unresolvedItems,
  nextGoal,
  progress,
}: SimulationGoalProps) {
  return (
    <aside className="jw-sim-goal" aria-label="Mục tiêu mô phỏng">
      <div className="jw-sim-goal-head">
        <h3>Mục tiêu</h3>
        <span className="jw-sim-goal-percent">{progress}%</span>
      </div>
      <p className="jw-sim-goal-objective">{objective}</p>
      <div className="jw-sim-goal-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>

      {/* Ecosystem Shortcuts */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          margin: 'var(--space-xs) 0 var(--space-sm)',
          paddingBottom: 'var(--space-xs)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          href="/kanji"
          aria-label="Luyện Kanji trong Kanji Studio"
          style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
        >
          ✍️ Luyện Kanji
        </Button>
        <Button
          variant="ghost"
          size="sm"
          href="/vocabulary"
          aria-label="Kho từ vựng"
          style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
        >
          ✨ Kho từ vựng
        </Button>
      </div>

      {completedItems.length > 0 ? (
        <div className="jw-sim-goal-section">
          <h4>Đã đạt được</h4>
          <ul className="jw-sim-goal-done">
            {completedItems.map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {unresolvedItems.length > 0 ? (
        <div className="jw-sim-goal-section">
          <h4>Còn cần làm</h4>
          <ul className="jw-sim-goal-todo">
            {unresolvedItems.map((item) => (
              <li key={item}>
                <span aria-hidden="true">○</span> {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {nextGoal ? <p className="jw-sim-goal-next">Tiếp theo: {nextGoal}</p> : null}
    </aside>
  )
}