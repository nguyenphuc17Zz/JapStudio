import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'
import { sound } from '../../services/sound'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Renders an inline <a> instead of a <button> */
  href?: string
  target?: string
  loading?: boolean
  icon?: IconName
  fullWidth?: boolean
  children?: ReactNode
  className?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  target,
  loading = false,
  icon,
  fullWidth,
  disabled,
  children,
  className,
  type = 'button',
  onClick,
  ...rest
}: ButtonProps) {
  const classes = cx(
    'jw-btn',
    `jw-btn--${variant}`,
    `jw-btn--${size}`,
    loading && 'jw-btn--loading',
    fullWidth && 'jw-btn--full',
    className,
  )

  const handleClick = (e: React.MouseEvent<HTMLButtonElement & HTMLAnchorElement>) => {
    if (!disabled && !loading) {
      sound.playClick()
    }
    onClick?.(e as any)
  }

  const content = (
    <>
      {loading ? <span className="jw-btn-spinner" aria-hidden="true" /> : null}
      {!loading && icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} aria-hidden="true" /> : null}
      <span>{children}</span>
    </>
  )

  if (href) {
    return (
      <a href={href} target={target} className={classes} aria-disabled={disabled || loading} onClick={handleClick}>
        {content}
      </a>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} onClick={handleClick} {...rest}>
      {content}
    </button>
  )
}