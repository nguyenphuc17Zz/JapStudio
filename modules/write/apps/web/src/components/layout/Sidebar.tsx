import type { ButtonHTMLAttributes, HTMLAttributes, MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'
import { IconButton } from '../ui/IconButton'
import { Tooltip } from '../ui/Tooltip'

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  brand?: ReactNode
  tagline?: ReactNode
  children: ReactNode
}

export function Sidebar({ brand, tagline, children, className, ...rest }: SidebarProps) {
  return (
    <aside className={cx('jw-sidebar', className)} {...rest}>
      {brand || tagline ? (
        <div className="jw-sidebar-header">
          {brand ? <div className="jw-sidebar-brand">{brand}</div> : null}
          {tagline ? <span className="jw-sidebar-tagline">{tagline}</span> : null}
        </div>
      ) : null}
      {children}
    </aside>
  )
}

const SECTION_KANJI: Record<string, string> = {
  'Tổng quan': '主画面',
  'Luyện viết': '執筆鍛錬',
  'Tài nguyên': '言語宝庫',
  'Hệ thống': '管理設定',
}

export function SidebarSection({
  title,
  children,
  className,
}: {
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  const kanji = typeof title === 'string' ? SECTION_KANJI[title] : null
  return (
    <div className={cx('jw-sidebar-section', className)}>
      {title ? (
        <div className="jw-sidebar-section-title">
          <span>{title}</span>
          {kanji && (
            <span style={{ fontSize: 9, opacity: 0.5, fontFamily: 'var(--font-japanese)', fontWeight: 700, marginLeft: 4 }}>
              · {kanji}
            </span>
          )}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export interface SidebarItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode
  icon?: IconName
  active?: boolean
  /** Renders a react-router <Link> instead of a <button> */
  to?: string
  /** Renders an <a> instead of a <button> */
  href?: string
  /** Icon-only mode — wraps the item in a Tooltip */
  collapsed?: boolean
  className?: string
}

export function SidebarItem({ label, icon, active, to, href, collapsed = false, className, onClick, ...rest }: SidebarItemProps) {
  const classes = cx('jw-sidebar-item', active && 'jw-sidebar-item--active', className)
  const content = (
    <>
      {icon ? <Icon name={icon} size={16} className="jw-sidebar-item-icon" aria-hidden="true" /> : null}
      <span>{label}</span>
    </>
  )
  let element: ReactNode
  if (to) {
    element = (
      <Link
        to={to}
        className={classes}
        aria-current={active ? 'page' : undefined}
        onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </Link>
    )
  } else if (href) {
    element = (
      <a
        href={href}
        className={classes}
        aria-current={active ? 'page' : undefined}
        onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </a>
    )
  } else {
    element = (
      <button type="button" className={classes} aria-current={active ? 'page' : undefined} onClick={onClick} {...rest}>
        {content}
      </button>
    )
  }
  if (collapsed && icon) {
    return (
      <Tooltip label={label} side="bottom">
        {element}
      </Tooltip>
    )
  }
  return element
}

export function SidebarFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('jw-sidebar-footer', className)}>{children}</div>
}

export interface SidebarCollapseButtonProps {
  collapsed?: boolean
  label?: string
  onClick?: () => void
}

export function SidebarCollapseButton({
  collapsed,
  label = collapsed ? 'Mở rộng menu' : 'Thu gọn menu',
  onClick,
}: SidebarCollapseButtonProps) {
  return <IconButton label={label} icon={collapsed ? 'chevron-right' : 'chevron-left'} size="sm" onClick={onClick} />
}