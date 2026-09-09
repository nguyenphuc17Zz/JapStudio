import type { SimulationExplainResponse } from '../../../types/api'
import { Icon } from '../../icons/Icon'

export interface SimulationTurnFeedbackProps {
  feedback: string | null
  score: number
  explainResponse: SimulationExplainResponse | null
  explaining: boolean
  onExplain: () => void
}

export function SimulationTurnFeedback({
  feedback,
  score,
  explainResponse,
  explaining,
  onExplain,
}: SimulationTurnFeedbackProps) {
  return (
    <div className="jw-sim-feedback">
      <div className="jw-sim-feedback-row">
        <span className="jw-sim-score-chip">{score}/100</span>
        <p className="jw-sim-feedback-text">{feedback}</p>
        <button
          type="button"
          className="jw-sim-explain-toggle"
          onClick={onExplain}
          aria-expanded={explainResponse !== null}
        >
          <Icon name="help" size={13} aria-hidden="true" />
          {explaining ? 'Đang giải thích...' : 'Giải thích'}
        </button>
      </div>
      {explainResponse ? (
        <div className="jw-sim-explain">
          <div className="jw-sim-explain-block">
            <h5>Phản hồi của bạn</h5>
            <p>{explainResponse.summary}</p>
          </div>
          {explainResponse.feedback_vi ? (
            <div className="jw-sim-explain-block">
              <h5>Tại sao AI phản ứng như vậy</h5>
              <p>{explainResponse.feedback_vi}</p>
            </div>
          ) : null}
          {explainResponse.corrections ? (
            <div className="jw-sim-explain-block">
              <h5>Cách trả lời tốt hơn</h5>
              {explainResponse.corrections.natural_rewrite ? (
                <p>{explainResponse.corrections.natural_rewrite}</p>
              ) : null}
              {explainResponse.corrections.minimal_fix ? (
                <p className="jw-sim-explain-fix">
                  Sửa tối thiểu: {explainResponse.corrections.minimal_fix}
                </p>
              ) : null}
            </div>
          ) : null}
          {explainResponse.issues.length > 0 ? (
            <div className="jw-sim-explain-block">
              <h5>Điểm cần lưu ý</h5>
              <ul className="jw-sim-explain-issues">
                {explainResponse.issues.map((issue, index) => (
                  <li key={`${issue.category}-${index}`}>
                    <strong>{issue.category}:</strong> {issue.explanation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}