import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface ContentContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'md' | 'lg' | 'full'
  children: ReactNode
}

export function ContentContainer({ size = 'lg', className, children, ...rest }: ContentContainerProps) {
  return (
    <div className={cx('jw-content-container', size !== 'full' && `jw-content-container--${size}`, className)} {...rest}>
      {children}
    </div>
  )
}