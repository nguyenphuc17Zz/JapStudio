import { useEffect, useRef } from 'react'
import type { PersonaInfo } from '../../../hooks/useSimulationSession'
import type {
  SimulationExplainResponse,
  SimulationSessionResponse,
} from '../../../types/api'
import { SimulationMessage } from './SimulationMessage'

export interface SimulationThreadProps {
  session: SimulationSessionResponse
  persona: PersonaInfo | null
  guided: boolean
  explaining: string | null
  explanations: Record<string, SimulationExplainResponse>
  onExplain: (turnId: string) => void
}

export function SimulationThread({
  session,
  persona,
  guided,
  explaining,
  explanations,
  onExplain,
}: SimulationThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null)
  const turnCount = session.turns.length

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [turnCount])

  const turns = [...session.turns].sort((a, b) => a.turn_number - b.turn_number)

  return (
    <div className="jw-sim-thread" role="log" aria-label="Hội thoại mô phỏng">
      {turns.map((turn) => (
        <SimulationMessage
          key={turn.id}
          turn={turn}
          persona={persona}
          guided={guided}
          explaining={explaining}
          explainResponse={explanations[turn.id] ?? null}
          onExplain={onExplain}
        />
      ))}
      {session.status === 'active' && turns.length === 0 ? (
        <p className="jw-sim-thread-empty">
          Cuộc trò chuyện bắt đầu khi AI nói lời đầu tiên.
        </p>
      ) : null}
      <div ref={endRef} />
    </div>
  )
}