import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface AIReasonProps {
  children: ReactNode
  className?: string
}

export function AIReason({ children, className }: AIReasonProps) {
  return (
    <div className={cx('jw-ai-reason', className)}>
      <Icon name="sparkles" size={13} className="jw-ai-reason-icon" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}