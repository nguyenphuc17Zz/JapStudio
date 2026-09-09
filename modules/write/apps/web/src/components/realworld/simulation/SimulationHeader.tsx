import type { PersonaInfo } from '../../../hooks/useSimulationSession'

export interface SimulationHeaderProps {
  persona: PersonaInfo | null
  objective: string
  stage: string
  turn: number
  maxTurns: number
  goalProgress: number
  pressure: string
}

export function SimulationHeader({
  persona,
  objective,
  stage,
  turn,
  maxTurns,
  goalProgress,
  pressure,
}: SimulationHeaderProps) {
  return (
    <header className="jw-sim-header">
      <div className="jw-sim-header-persona">
        <span className="jw-sim-monogram jw-sim-monogram--header" aria-hidden="true">
          {persona?.initial ?? 'AI'}
        </span>
        <div className="jw-sim-header-persona-text">
          <strong>{persona ? persona.name : 'Người đối thoại'}</strong>
          {persona?.role ? <span>{persona.role}</span> : null}
          {pressure ? <span className="jw-sim-header-pressure">{pressure}</span> : null}
        </div>
      </div>
      <div className="jw-sim-header-goal">
        <p className="jw-sim-header-goal-text">{objective}</p>
        <div className="jw-sim-header-goal-meta">
          <span>Lượt {turn} / {maxTurns}</span>
          <span>Giai đoạn: {stage}</span>
          <span className="jw-sim-header-progress" aria-label={`Tiến độ mục tiêu ${goalProgress}%`}>
            <span
              className="jw-sim-header-progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, goalProgress))}%` }}
            />
            <span className="jw-sim-header-progress-label">{goalProgress}%</span>
          </span>
        </div>
      </div>
    </header>
  )
}