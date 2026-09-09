import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'
import { Drawer } from '../ui/Drawer'

export interface MobileNavItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode
  icon: IconName
  active?: boolean
  /** Renders a react-router <Link> instead of a <button> */
  to?: string
  /** Renders an <a> instead of a <button> */
  href?: string
  className?: string
}

export function MobileNavItem({ label, icon, active, to, href, className, onClick, ...rest }: MobileNavItemProps) {
  const classes = cx('jw-mobile-nav-item', active && 'jw-mobile-nav-item--active', className)
  const content = (
    <>
      <Icon name={icon} size={18} aria-hidden="true" />
      <span>{label}</span>
    </>
  )
  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        aria-current={active ? 'page' : undefined}
        onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a
        href={href}
        className={classes}
        aria-current={active ? 'page' : undefined}
        onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </a>
    )
  }
  return (
    <button type="button" className={classes} aria-current={active ? 'page' : undefined} onClick={onClick} {...rest}>
      {content}
    </button>
  )
}

export function MobileBottomNav({ children, className }: { children: ReactNode; className?: string }) {
  return <nav className={cx('jw-mobile-nav', className)}>{children}</nav>
}

export interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function MobileDrawer({ open, onClose, title, children, footer }: MobileDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={title} side="bottom" footer={footer}>
      {children}
    </Drawer>
  )
}