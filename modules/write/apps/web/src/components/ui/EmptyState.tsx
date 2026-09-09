import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  icon?: IconName
  className?: string
}

export function EmptyState({ title, description, action, icon = 'list', className }: EmptyStateProps) {
  return (
    <div className={cx('jw-empty', className)}>
      <span className="jw-empty-icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="jw-empty-title">{title}</h3>
      {description ? <p className="jw-empty-desc">{description}</p> : null}
      {action ? <div className="jw-empty-action">{action}</div> : null}
    </div>
  )
}