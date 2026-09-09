import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'
import { IconButton } from '../ui/IconButton'

export interface AIInsightProps {
  title?: ReactNode
  description: ReactNode
  /** Optional supporting evidence shown as a quiet list */
  evidence?: ReactNode[]
  action?: ReactNode
  onDismiss?: () => void
  className?: string
}

export function AIInsight({
  title = 'AI Insight',
  description,
  evidence,
  action,
  onDismiss,
  className,
}: AIInsightProps) {
  return (
    <section className={cx('jw-ai-surface jw-ai-focus-glow', className)} aria-label="AI Insight">
      <div className="jw-ai-head">
        <Icon name="sparkles" size={14} className="jw-ai-icon" aria-hidden="true" />
        <span className="jw-ai-title">{title}</span>
        {onDismiss ? (
          <IconButton
            label="Đóng gợi ý AI"
            icon="x"
            size="sm"
            className="jw-ai-dismiss"
            onClick={onDismiss}
          />
        ) : null}
      </div>
      <div className="jw-ai-text">{description}</div>
      {evidence && evidence.length > 0 ? (
        <ul className="jw-ai-evidence">
          {evidence.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null}
      {action ? <div className="jw-ai-actions">{action}</div> : null}
    </section>
  )
}