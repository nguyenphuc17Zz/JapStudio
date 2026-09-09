import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface AIExplanationProps {
  title?: ReactNode
  children: ReactNode
  className?: string
}

export function AIExplanation({ title = 'AI Explanation', children, className }: AIExplanationProps) {
  return (
    <div className={cx('jw-ai-explanation', className)}>
      <div className="jw-ai-explanation-head">
        <Icon name="sparkles" size={13} aria-hidden="true" />
        <span className="jw-ai-title">{title}</span>
      </div>
      {children}
    </div>
  )
}