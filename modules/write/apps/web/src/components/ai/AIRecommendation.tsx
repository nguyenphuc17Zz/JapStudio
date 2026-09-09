import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface AIRecommendationProps {
  title?: ReactNode
  description: ReactNode
  /** Short metadata chips, e.g. ['Difficulty 6', 'Business', 'N3'] */
  meta?: ReactNode[]
  action?: ReactNode
  className?: string
}

export function AIRecommendation({
  title = 'AI Recommended',
  description,
  meta,
  action,
  className,
}: AIRecommendationProps) {
  return (
    <section className={cx('jw-ai-surface', className)} aria-label="AI Recommendation">
      <div className="jw-ai-head">
        <Icon name="sparkles" size={14} className="jw-ai-icon" aria-hidden="true" />
        <span className="jw-ai-title">{title}</span>
      </div>
      <div className="jw-ai-text">{description}</div>
      {meta && meta.length > 0 ? (
        <div className="jw-inline jw-gap-sm" style={{ marginTop: 'var(--space-sm)' }}>
          {meta.map((item, index) => (
            <span key={index} className="jw-badge jw-badge--ai">
              {item}
            </span>
          ))}
        </div>
      ) : null}
      {action ? <div className="jw-ai-actions">{action}</div> : null}
    </section>
  )
}