import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Small label rendered above the title */
  eyebrow?: ReactNode
  /** Optional breadcrumb trail rendered above the title */
  breadcrumb?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <header className={cx('jw-page-header', className)}>
      <div>
        {breadcrumb ? <div className="jw-page-header-breadcrumb">{breadcrumb}</div> : null}
        {eyebrow ? <div className="jw-page-header-eyebrow">{eyebrow}</div> : null}
        <h1 className="jw-page-header-title">{title}</h1>
        {description ? <p className="jw-page-header-desc">{description}</p> : null}
      </div>
      {actions ? <div className="jw-page-header-actions">{actions}</div> : null}
    </header>
  )
}