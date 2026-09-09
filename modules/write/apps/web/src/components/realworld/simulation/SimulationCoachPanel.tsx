import { useState } from 'react'
import type { SimulationCoachResponse } from '../../../types/api'
import { Button } from '../../ui/Button'
import { Icon } from '../../icons/Icon'

export interface SimulationCoachPanelProps {
  answer: SimulationCoachResponse | null
  loading: boolean
  error: string | null
  onAsk: (question: string) => void
}

const COACH_PRESETS = [
  'Tại sao khách hàng phản ứng như vậy?',
  'Tôi có quá thẳng thắn không?',
  'Làm sao đàm phán tốt hơn?',
  'Làm sao hỏi rõ tự nhiên hơn?',
]

export function SimulationCoachPanel({
  answer,
  loading,
  error,
  onAsk,
}: SimulationCoachPanelProps) {
  const [question, setQuestion] = useState('')

  const ask = () => {
    const trimmed = question.trim()
    if (!trimmed || loading) return
    onAsk(trimmed)
    setQuestion('')
  }

  return (
    <div className="jw-sim-coach">
      <div className="jw-sim-coach-head">
        <Icon name="sparkles" size={14} aria-hidden="true" />
        <h4>AI Coach</h4>
      </div>
      <div className="jw-sim-coach-presets">
        {COACH_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="jw-sim-coach-preset"
            onClick={() => {
              setQuestion(preset)
            }}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="jw-sim-coach-row">
        <input
          className="jw-sim-coach-input"
          aria-label="Câu hỏi cho AI Coach"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Hỏi bất kỳ điều gì về cuộc trò chuyện..."
        />
        <Button size="sm" onClick={ask} loading={loading} disabled={!question.trim()}>
          Hỏi
        </Button>
      </div>
      {error ? <p className="jw-sim-coach-error">{error}</p> : null}
      {answer ? (
        <div className="jw-sim-coach-answer">
          <p>{answer.answer}</p>
          {answer.suggestions.length > 0 ? (
            <ul className="jw-sim-coach-suggestions">
              {answer.suggestions.map((suggestion, index) => (
                <li key={`${suggestion}-${index}`}>{suggestion}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}