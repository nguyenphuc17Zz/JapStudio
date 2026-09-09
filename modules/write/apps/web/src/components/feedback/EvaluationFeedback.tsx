import { useMemo } from 'react'
import { Score } from '../ui/Score'
import { Badge } from '../ui/Badge'
import { ProgressBar } from '../ui/Progress'
import { CyberRadar } from '../gamification/CyberRadar'
import type { AttemptEvaluationResponse } from '../../types/api'
import { DIMENSION_ORDER } from './labels'

export interface EvaluationFeedbackProps {
  evaluation: AttemptEvaluationResponse
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  fully_equivalent: 'Ý nghĩa: tương đương',
  mostly_equivalent: 'Ý nghĩa: gần tương đương',
  partially_equivalent: 'Ý nghĩa: một phần',
  meaning_changed: 'Ý nghĩa: bị thay đổi',
  natural: 'Tự nhiên',
  acceptable: 'Chấp nhận được',
  slightly_unnatural: 'Hơi gượng',
  unnatural: 'Không tự nhiên',
  very_unnatural: 'Rất không tự nhiên',
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Tốt'
  if (score >= 60) return 'Cần trau chuốt'
  return 'Cần cải thiện'
}

export function EvaluationFeedback({ evaluation }: EvaluationFeedbackProps) {
  const scores = evaluation.scores
  const strengths = useMemo(
    () =>
      DIMENSION_ORDER.filter((dimension) => scores[dimension.key] >= 70)
        .sort((a, b) => scores[b.key] - scores[a.key])
        .slice(0, 2),
    [scores],
  )

  const radarSkills = useMemo(
    () =>
      DIMENSION_ORDER.map((d) => ({
        key: d.key,
        label: d.label,
        value: scores[d.key],
      })),
    [scores],
  )

  return (
    <div className="jw-fb-pane">
      <div className="jw-fb-score-head" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Score
            value={scores.overall_score}
            label={scoreLabel(scores.overall_score)}
            className="jw-fb-score"
          />
          <div className="jw-fb-score-meta">
            <div className="jw-inline jw-gap-xs">
              <Badge tone="accent">
                {CLASSIFICATION_LABELS[evaluation.semantic_classification] ??
                  evaluation.semantic_classification}
              </Badge>
              <Badge tone="neutral">
                {CLASSIFICATION_LABELS[evaluation.naturalness_classification] ??
                  evaluation.naturalness_classification}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Cyber Radar Skill Web */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-sm) 0' }}>
        <CyberRadar skills={radarSkills} size={220} />
      </div>

      {evaluation.summary ? <p className="jw-fb-summary">{evaluation.summary}</p> : null}

      <h3 className="jw-card-eyebrow jw-mb-xs">Chấm điểm chi tiết</h3>
      <div className="jw-fb-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {DIMENSION_ORDER.map(({ key, label }) => (
          <ProgressBar
            key={key}
            label={label}
            value={scores[key]}
            tone={scores[key] >= 80 ? 'success' : scores[key] >= 60 ? 'accent' : 'warning'}
            size="sm"
            showValue
          />
        ))}
      </div>

      {strengths.length > 0 ? (
        <p className="jw-text--caption jw-text--muted jw-mt-sm">
          <strong>Điểm mạnh:</strong>{' '}
          {strengths.map((dimension) => `${dimension.label} (${scores[dimension.key]})`).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}