import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'
import type { BreadcrumbItem } from '../../navigation/config'

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null
  return (
    <nav className={cx('jw-breadcrumbs', className)} aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li
              key={item.route ?? item.label}
              className="jw-breadcrumb-item"
              aria-current={last ? 'page' : undefined}
            >
              {item.route && !last ? (
                <Link to={item.route}>{item.label}</Link>
              ) : (
                <span>{item.label}</span>
              )}
              {!last ? <Icon name="chevron-right" size={11} aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}