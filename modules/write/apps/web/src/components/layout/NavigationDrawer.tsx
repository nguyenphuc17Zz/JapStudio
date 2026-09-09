import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'
import { Drawer } from '../ui/Drawer'
import type { NavigationItem } from '../../navigation/config'

export interface NavigationDrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  items: NavigationItem[]
  /** Current pathname — used to mark the active item */
  currentPath: string
  className?: string
}

/** Accessible bottom-sheet navigation drawer. Focus trap, Escape,
 *  click-outside close, scroll lock and focus restoration come from Drawer. */
export function NavigationDrawer({
  open,
  onClose,
  title,
  items,
  currentPath,
  className,
}: NavigationDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={title} side="bottom" className={cx('jw-nav-drawer', className)}>
      <div className="jw-nav-drawer-list">
        {items.map((item) => {
          const active =
            currentPath === item.route || currentPath.startsWith(`${item.route}/`)
          return (
            <Link
              key={item.id}
              to={item.route}
              className={cx('jw-nav-drawer-item', active && 'jw-nav-drawer-item--active')}
              aria-current={active ? 'page' : undefined}
              onClick={onClose}
            >
              <Icon name={item.icon} size={16} aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </Drawer>
  )
}