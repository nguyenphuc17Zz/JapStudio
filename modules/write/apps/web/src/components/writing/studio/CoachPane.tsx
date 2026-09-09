import { useState } from 'react'
import { COACH_FAILED, type CoachExchange } from '../../../hooks/useWritingSession'
import { useMediaQuery } from '../../../lib/useMediaQuery'
import type { WritingEvaluationResponse } from '../../../types/api'
import { Icon } from '../../icons/Icon'
import { SplitPane } from '../../layout/SplitPane'
import { Alert } from '../../ui/Alert'
import { Button } from '../../ui/Button'
import { YourWritingPane } from './YourWritingPane'

const COACH_PRESETS = [
  'Tại sao chỗ này nghe không tự nhiên?',
  'Làm sao để cải thiện mạch văn?',
  'Làm sao để viết gọn hơn?',
  'Ngữ điệu của mình có nhất quán không?',
  'Làm sao để sắp xếp đoạn này tốt hơn?',
]

export interface CoachPaneProps {
  evaluation: WritingEvaluationResponse
  thread: CoachExchange[]
  question: string
  onQuestionChange: (value: string) => void
  loading: boolean
  error: string | null
  onAsk: (question: string) => void
}

export function CoachPane({
  evaluation,
  thread,
  question,
  onQuestionChange,
  loading,
  error,
  onAsk,
}: CoachPaneProps) {
  return (
    <div className="jw-studio-coach">
      <div className="jw-studio-coach-context">
        <span className="jw-studio-coach-context-label">
          AI Coach đang thảo luận về bài viết này
        </span>
        <span className="jw-studio-coach-context-meta">
          Bản {evaluation.revision_number} · {evaluation.scores.overall_writing} điểm
        </span>
      </div>

      <div className="jw-studio-coach-presets">
        {COACH_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="jw-studio-coach-preset"
            onClick={() => onAsk(preset)}
            disabled={loading}
          >
            {preset}
          </button>
        ))}
      </div>

      {error ? (
        <Alert tone="error" title={COACH_FAILED}>
          {error}
        </Alert>
      ) : null}

      <div className="jw-studio-coach-thread" aria-live="polite">
        {thread.length === 0 ? (
          <p className="jw-studio-coach-empty">
            Hỏi trợ lý về cách cải thiện bài viết này. AI sẽ dựa vào bài viết của bạn để trả lời.
          </p>
        ) : (
          thread.map((exchange, index) => (
            <div key={`${exchange.question}-${index}`} className="jw-studio-coach-exchange">
              <p className="jw-studio-coach-question">
                <Icon name="help" size={13} aria-hidden="true" />
                {exchange.question}
              </p>
              <p className="jw-studio-coach-answer">{exchange.answer}</p>
              {exchange.suggestions.length > 0 ? (
                <ul className="jw-studio-coach-suggestions">
                  {exchange.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="jw-studio-coach-compose">
        <textarea
          className="jw-studio-coach-input"
          aria-label="Câu hỏi cho AI Coach"
          placeholder="Hỏi về bài viết này…"
          rows={3}
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
        />
        <div className="jw-studio-coach-actions">
          <Button
            icon="send"
            onClick={() => onAsk(question)}
            loading={loading}
            disabled={question.trim().length === 0}
          >
            {loading ? '✦ Đang suy nghĩ…' : 'Gửi câu hỏi'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CoachWorkspace(props: CoachPaneProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null)

  if (isMobile) {
    return <CoachPane {...props} />
  }

  return (
    <SplitPane
      ratio={0.4}
      left={
        <YourWritingPane
          evaluation={props.evaluation}
          selectedSentence={selectedSentence}
          onSelectSentence={setSelectedSentence}
          showMarkers={false}
        />
      }
      right={<CoachPane {...props} />}
    />
  )
}