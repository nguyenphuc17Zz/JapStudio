import type { ReactNode } from 'react'
import { ScoreRing } from '../ui/Progress'

export interface CompletionSummaryProps {
  eyebrow: string
  title: string
  score?: number
  scoreLabel?: string
  xp?: number
  children?: ReactNode
}

export function CompletionSummary({
  eyebrow,
  title,
  score,
  scoreLabel,
  xp,
  children,
}: CompletionSummaryProps) {
  return (
    <section className="jw-rw-complete" aria-label={title}>
      <p className="jw-rw-eyebrow">{eyebrow.toUpperCase()}</p>
      <div className="jw-rw-complete-head">
        {score !== undefined ? (
          <ScoreRing
            value={score}
            size={96}
            tone="accent"
            label={scoreLabel}
            caption={`${Math.round(score)} / 100`}
          />
        ) : null}
        <div className="jw-rw-complete-main">
          <h2>{title}</h2>
          {xp !== undefined && xp > 0 ? (
            <p className="jw-rw-complete-xp">
              <span aria-hidden="true">✦</span> +{xp} XP
            </p>
          ) : null}
        </div>
      </div>
      {children ? <div className="jw-rw-complete-body">{children}</div> : null}
    </section>
  )
}