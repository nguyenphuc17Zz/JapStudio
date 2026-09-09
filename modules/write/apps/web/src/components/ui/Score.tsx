import { useEffect, useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export type ScoreConfidence = 'high' | 'medium' | 'low'

export interface ScoreProps {
  /** Numeric score, usually 0–100 */
  value: number
  label?: ReactNode
  /** Signed delta vs a previous measurement (e.g. +8) */
  trend?: number
  trendLabel?: string
  confidence?: ScoreConfidence
  confidenceLabel?: string
  className?: string
}

const CONFIDENCE_LABELS: Record<ScoreConfidence, string> = {
  high: 'Độ tin cậy cao',
  medium: 'Độ tin cậy trung bình',
  low: 'Độ tin cậy thấp',
}

export function Score({
  value,
  label,
  trend,
  trendLabel,
  confidence,
  confidenceLabel,
  className,
}: ScoreProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const target = Math.round(value)

  useEffect(() => {
    // If in test environment or server, sync immediately
    if (typeof window === 'undefined' || (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test') {
      setDisplayValue(target)
      return
    }

    let start = 0
    const duration = 600
    const startTime = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setDisplayValue(Math.round(start + (target - start) * ease))

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }, [target])

  const trendDirection = trend === undefined || trend === 0 ? 'flat' : trend > 0 ? 'up' : 'down'

  return (
    <div className={cx('jw-score', className)}>
      <span
        className="jw-score-value"
        style={{
          background: target >= 85 ? 'var(--grad-gold)' : target >= 70 ? 'var(--grad-murasaki, linear-gradient(135deg, #8b5cf6, #d946ef))' : 'var(--color-foreground)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: target >= 70 ? 'transparent' : 'inherit',
          display: 'inline-block',
          transition: 'all 0.3s ease',
        }}
      >
        {displayValue}
      </span>
      {label ? <span className="jw-score-label">{label}</span> : null}
      {(trend !== undefined || confidence) ? (
        <div className="jw-score-meta">
          {trend !== undefined ? (
            <span className={cx('jw-score-trend', `jw-score-trend--${trendDirection}`)}>
              <Icon
                name={trend > 0 ? 'arrow-up' : trend < 0 ? 'arrow-down' : 'minus'}
                size={11}
                aria-hidden="true"
              />
              {trend > 0 ? '+' : ''}
              {trend}
              {trendLabel ? ` ${trendLabel}` : ''}
            </span>
          ) : null}
          {confidence ? (
            <span className="jw-score-confidence" title={confidenceLabel ?? CONFIDENCE_LABELS[confidence]}>
              <span
                className={cx('jw-score-confidence-dot', `jw-score-confidence-dot--${confidence}`)}
                aria-hidden="true"
              />
              {confidenceLabel ?? CONFIDENCE_LABELS[confidence]}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}