import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { IconButton } from '../ui/IconButton'

export interface TopBarProps {
  /** Page title — shown in the mobile top bar */
  title?: ReactNode
  /** Breadcrumb — shown on desktop */
  breadcrumb?: ReactNode
  /** Right-aligned actions (theme switcher, page actions…) */
  actions?: ReactNode
  /** Optional AI status for feature pages; not shown by default */
  aiStatus?: ReactNode
  /** Mobile menu trigger (opens the More drawer) */
  menuLabel?: string
  onMenu?: () => void
  className?: string
}

export function TopBar({
  title,
  breadcrumb,
  actions,
  aiStatus,
  menuLabel = 'Mở menu',
  onMenu,
  className,
}: TopBarProps) {
  return (
    <header className={cx('jw-topbar', className)}>
      {onMenu ? (
        <IconButton label={menuLabel} icon="menu" size="sm" className="jw-topbar-menu" onClick={onMenu} />
      ) : null}
      {title ? <div className="jw-topbar-title">{title}</div> : null}
      {breadcrumb ? <div className="jw-topbar-breadcrumb">{breadcrumb}</div> : null}
      <div className="jw-topbar-actions">
        {aiStatus ?? null}
        {actions}
      </div>
    </header>
  )
}