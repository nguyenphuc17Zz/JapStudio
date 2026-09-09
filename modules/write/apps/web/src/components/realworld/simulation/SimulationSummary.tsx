import type { SimulationSummaryResponse } from '../../../types/api'
import { Icon } from '../../icons/Icon'
import { Button } from '../../ui/Button'
import { CompletionSummary } from '../CompletionSummary'

export interface SimulationSummaryProps {
  summary: SimulationSummaryResponse | null
  loading: boolean
  onNew: () => void
  onSuggestedChallenge: (challengeId: string) => void
}

function formatDelta(delta: number): string {
  const rounded = Math.round(delta)
  if (rounded >= 0) return `+${rounded}`
  return String(rounded)
}

export function SimulationSummary({
  summary,
  loading,
  onNew,
  onSuggestedChallenge,
}: SimulationSummaryProps) {
  if (!summary) {
    return (
      <div className="jw-sim-summary">
        <p className="jw-sim-summary-loading">
          {loading ? 'Đang tải tổng kết...' : 'Tổng kết chưa sẵn sàng.'}
        </p>
      </div>
    )
  }
  const challenge = summary.suggested_challenge
  const challengeId = challenge && typeof challenge.challenge_id === 'string' ? challenge.challenge_id : null
  const challengeReason =
    challenge && typeof challenge.reason === 'string' ? challenge.reason : null

  return (
    <div className="jw-sim-summary">
      <CompletionSummary eyebrow="Mô phỏng hoàn thành" title="Tổng kết buổi trò chuyện">
        <p className="jw-sim-summary-text">{summary.summary_vi}</p>
        <div className="jw-sim-summary-sections">
          <div className="jw-sim-summary-section">
            <h4>Điểm mạnh</h4>
            <ul className="jw-sim-summary-strengths">
              {summary.strengths.map((item, index) => (
                <li key={`${item}-${index}`}>
                  <Icon name="check" size={13} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="jw-sim-summary-section">
            <h4>Cần cải thiện</h4>
            <ul className="jw-sim-summary-needs">
              {summary.needs_work.map((item, index) => (
                <li key={`${item}-${index}`}>
                  <span className="jw-sim-summary-arrow" aria-hidden="true">
                    →
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="jw-sim-summary-section">
          <h4>Kết quả cuộc trò chuyện</h4>
          <p className="jw-sim-summary-resolution">{summary.resolution}</p>
          <p className="jw-sim-summary-meta">{summary.turn_count} lượt</p>
        </div>
        {summary.compare ? (
          <div className="jw-sim-summary-compare">
            <h4>So với buổi trước</h4>
            <ul>
              {Object.entries(summary.compare.deltas).map(([key, delta]) => (
                <li key={key}>
                  <span>{key}</span>
                  <span
                    className={
                      delta >= 0 ? 'jw-sim-summary-delta--up' : 'jw-sim-summary-delta--down'
                    }
                  >
                    {formatDelta(delta)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {challengeId ? (
          <div className="jw-sim-summary-challenge">
            <Icon name="challenge" size={15} aria-hidden="true" />
            <div>
              <strong>Thử thách đề xuất</strong>
              {challengeReason ? <p>{challengeReason}</p> : null}
            </div>
            <Button size="sm" icon="challenge" onClick={() => onSuggestedChallenge(challengeId)}>
              Thử ngay
            </Button>
          </div>
        ) : null}
      </CompletionSummary>
      <div className="jw-sim-summary-actions" style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
        <Button icon="refresh" onClick={onNew}>
          Mô phỏng mới
        </Button>
        <Button
          variant="secondary"
          icon="sparkles"
          href="/rewrite-lab"
          aria-label="Chuyển sang Rewrite Lab"
        >
          🧪 Chuyển sang Rewrite Lab
        </Button>
      </div>
    </div>
  )
}