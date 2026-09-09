import { useState } from 'react'
import { cx } from '../../lib/cx'
import { useMediaQuery } from '../../lib/useMediaQuery'
import type {
  ScenarioRequiredPoint,
  WritingScenarioRequirement,
} from '../../types/api'
import { Icon } from '../icons/Icon'

const STATUS_LABELS: Record<ScenarioRequiredPoint['status'], string> = {
  satisfied: 'Đã đáp ứng',
  partially_satisfied: 'Đáp ứng một phần',
  missing: 'Còn thiếu',
}

export interface RequiredPointsProps {
  points: WritingScenarioRequirement[]
  results?: ScenarioRequiredPoint[] | null
  collapsible?: boolean
}

export function RequiredPoints({ points, results, collapsible }: RequiredPointsProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [open, setOpen] = useState(true)
  const [explained, setExplained] = useState<string | null>(null)
  const showToggle = isMobile && collapsible

  const resultFor = (id: string): ScenarioRequiredPoint | undefined =>
    results?.find((result) => result.id === id)

  return (
    <section className="jw-rw-card jw-rw-required" aria-label="Yêu cầu bắt buộc">
      <div className="jw-rw-card-head">
        <h3>Yêu cầu bắt buộc</h3>
        {showToggle ? (
          <button
            type="button"
            className="jw-rw-card-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Thu gọn' : 'Yêu cầu'}
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {!showToggle || open ? (
        <ul
          className="jw-rw-required-list"
          aria-live={results ? 'polite' : undefined}
        >
          {points.map((point) => {
            const result = resultFor(point.id)
            if (results && result) {
              const expanded = explained === point.id
              return (
                <li key={point.id} className="jw-rw-required-item">
                  <button
                    type="button"
                    className={cx(
                      'jw-rw-required-result',
                      `jw-rw-required-result--${result.status}`,
                    )}
                    aria-expanded={expanded}
                    onClick={() => setExplained(expanded ? null : point.id)}
                  >
                    <span className="jw-rw-required-status" aria-hidden="true">
                      {result.status === 'satisfied' ? '✓' : result.status === 'partially_satisfied' ? '⚠' : '✗'}
                    </span>
                    <span className="jw-rw-required-text">{point.description}</span>
                    <span className="jw-rw-required-badge">
                      {STATUS_LABELS[result.status]}
                    </span>
                  </button>
                  {expanded && result.explanation ? (
                    <p className="jw-rw-required-note">{result.explanation}</p>
                  ) : null}
                </li>
              )
            }
            return (
              <li key={point.id} className="jw-rw-required-item">
                <span className="jw-rw-required-pending" aria-hidden="true">
                  ○
                </span>
                <span className="jw-rw-required-text">{point.description}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}