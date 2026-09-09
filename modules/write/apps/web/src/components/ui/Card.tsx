import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'subtle' | 'ai'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  children: ReactNode
}

export function Card({ variant = 'default', className, children, ...rest }: CardProps) {
  return (
    <div className={cx('jw-card', variant !== 'default' && `jw-card--${variant}`, className)} {...rest}>
      {children}
    </div>
  )
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function CardHeader({ title, description, actions, className, ...rest }: CardHeaderProps) {
  return (
    <div className={cx('jw-card-header', className)} {...rest}>
      <div>
        {title ? <div className="jw-card-header-title">{title}</div> : null}
        {description ? <div className="jw-card-header-desc">{description}</div> : null}
      </div>
      {actions ? <div className="jw-card-header-actions">{actions}</div> : null}
    </div>
  )
}

export function CardContent({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('jw-card-content', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('jw-card-footer', className)} {...rest}>
      {children}
    </div>
  )
}