import { useState } from 'react'
import type { WritingEvaluationResponse, WritingScores } from '../../../types/api'
import { Alert } from '../../ui/Alert'
import { Button } from '../../ui/Button'
import { SkillBar } from '../../ui/Progress'
import { Score } from '../../ui/Score'

const SCENARIO_DIMENSIONS: Array<{ key: keyof WritingScores; label: string }> = [
  { key: 'scenario_semantic_fit', label: 'Hiểu đúng tình huống' },
  { key: 'audience_fit', label: 'Đúng đối tượng' },
  { key: 'purpose_fit', label: 'Đạt mục đích' },
  { key: 'tone_fit', label: 'Đúng sắc thái' },
  { key: 'constraint_compliance', label: 'Tuân thủ lưu ý' },
]

const FORMAT_LABELS: Record<string, string> = {
  present: 'Đầy đủ',
  partial: 'Thiếu một phần',
  missing: 'Còn thiếu',
}

function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  let ok = false
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    ok = document.execCommand('copy')
  } finally {
    textarea.remove()
  }
  return ok ? Promise.resolve() : Promise.reject(new Error('clipboard unavailable'))
}

export function ScenarioResults({ evaluation }: { evaluation: WritingEvaluationResponse }) {
  const [copied, setCopied] = useState(false)
  const professional = evaluation.rewrites?.professional_rewrite ?? null

  if (evaluation.scenario_unavailable) {
    return (
      <Alert tone="info">
        Phần đánh giá tình huống chưa khả dụng cho lần viết này — điểm tổng vẫn được tính theo
        đánh giá viết chung.
      </Alert>
    )
  }

  const scores = evaluation.scores
  const fit = scores.scenario_fit

  return (
    <div className="jw-studio-scenario">
      <div className="jw-studio-pane-head">
        <h4>Phù hợp tình huống</h4>
        <span className="jw-studio-group-badge">Tình huống</span>
      </div>
      <div className="jw-studio-scenario-head">
        <Score value={fit ?? 0} label="Điểm tình huống" />
        <p className="jw-studio-summary">{evaluation.summary}</p>
      </div>
      <div className="jw-studio-dimensions">
        {SCENARIO_DIMENSIONS.map(({ key, label }) => (
          <SkillBar key={key} label={label} value={scores[key] ?? 0} tone="info" />
        ))}
      </div>

      {evaluation.scenario_required_points !== null ? (
        <div className="jw-studio-scenario-points">
          <h5>Yêu cầu bắt buộc</h5>
          <ul>
            {evaluation.scenario_required_points.map((point) => (
              <li
                key={point.id}
                className={`jw-studio-scenario-point jw-studio-scenario-point--${point.status}`}
              >
                <span className="jw-studio-scenario-point-status" aria-hidden="true">
                  {point.status === 'satisfied'
                    ? '✓'
                    : point.status === 'partially_satisfied'
                      ? '⚠'
                      : '✗'}
                </span>
                <span className="jw-studio-scenario-point-text">
                  {point.description}
                  <span className="jw-studio-scenario-point-state">
                    {FORMAT_LABELS[point.status]}
                  </span>
                </span>
                {point.explanation ? (
                  <p className="jw-studio-scenario-point-note">{point.explanation}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.scenario_format_sections !== null &&
      evaluation.scenario_format_sections.length > 0 ? (
        <div className="jw-studio-scenario-points">
          <h5>Định dạng bài viết</h5>
          <ul>
            {evaluation.scenario_format_sections.map((section) => (
              <li
                key={section.name}
                className={`jw-studio-scenario-point jw-studio-scenario-point--${section.status}`}
              >
                <span className="jw-studio-scenario-point-status" aria-hidden="true">
                  {section.status === 'present'
                    ? '✓'
                    : section.status === 'partial'
                      ? '⚠'
                      : '✗'}
                </span>
                <span className="jw-studio-scenario-point-text">
                  {section.name}
                  <span className="jw-studio-scenario-point-state">
                    {FORMAT_LABELS[section.status]}
                  </span>
                </span>
                {section.note ? (
                  <p className="jw-studio-scenario-point-note">{section.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {professional ? (
        <div className="jw-studio-card">
          <div className="jw-studio-card-head">
            <h5>Viết lại chuyên nghiệp</h5>
            <Button
              variant="ghost"
              size="sm"
              icon="copy"
              onClick={() => {
                setCopied(false)
                copyText(professional).then(
                  () => setCopied(true),
                  () => setCopied(false),
                )
              }}
            >
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </Button>
          </div>
          <p className="jw-studio-card-text">{professional}</p>
        </div>
      ) : null}
    </div>
  )
}