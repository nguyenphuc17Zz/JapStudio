import { memo } from 'react'
import type { PersonaInfo } from '../../../hooks/useSimulationSession'
import type {
  SimulationExplainResponse,
  SimulationTurnOut,
} from '../../../types/api'
import { SimulationTurnFeedback } from './SimulationTurnFeedback'
import { FuriganaText } from '../../ui/FuriganaText'

export interface SimulationMessageProps {
  turn: SimulationTurnOut
  persona: PersonaInfo | null
  guided: boolean
  explaining: string | null
  explainResponse: SimulationExplainResponse | null
  onExplain: (turnId: string) => void
}

export const SimulationMessage = memo(function SimulationMessage({
  turn,
  persona,
  guided,
  explaining,
  explainResponse,
  onExplain,
}: SimulationMessageProps) {
  const isAi = turn.actor === 'ai'
  return (
    <div className={`jw-sim-msg jw-sim-msg--${isAi ? 'ai' : 'user'}`}>
      {isAi ? (
        <span
          className="jw-sim-monogram"
          aria-hidden="true"
          title={persona ? `${persona.name}${persona.role ? ` · ${persona.role}` : ''}` : 'AI'}
        >
          {persona?.initial ?? 'AI'}
        </span>
      ) : null}
      <div className="jw-sim-msg-main">
        <div className="jw-sim-msg-head">
          {isAi ? (
            <span className="jw-sim-msg-author">
              {persona ? persona.name : 'AI'}
              {persona?.role ? <span className="jw-sim-msg-role"> · {persona.role}</span> : null}
            </span>
          ) : (
            <span className="jw-sim-msg-author">Bạn</span>
          )}
          <span className="jw-sim-msg-turn">Lượt {turn.turn_number}</span>
        </div>
        <div className="jw-sim-msg-text jw-jp-text">
          <FuriganaText text={turn.text} />
        </div>
        {isAi ? (
          <p className="jw-sim-msg-type">
            {turn.turn_type ? `Giai đoạn: ${turn.turn_type}` : null}
          </p>
        ) : null}
        {!isAi && turn.evaluation && guided ? (
          <SimulationTurnFeedback
            feedback={turn.evaluation.feedback_vi}
            score={turn.evaluation.overall_score}
            explainResponse={explainResponse}
            explaining={explaining === turn.id}
            onExplain={() => onExplain(turn.id)}
          />
        ) : null}
        {!isAi && (
          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
            <a
              href={`/rewrite-lab?text=${encodeURIComponent(turn.text)}`}
              className="jw-issue-jump"
              title="Tinh chỉnh câu thoại trong Rewrite Lab"
              style={{ textDecoration: 'none', fontSize: '11px', padding: '2px 8px' }}
            >
              🧪 Rewrite Lab
            </a>
          </div>
        )}
      </div>
    </div>
  )
})