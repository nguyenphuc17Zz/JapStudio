import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { SpaceGap } from './Stack'

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 2 | 3 | 4 | 'auto'
  gap?: SpaceGap
  children: ReactNode
}

export function Grid({ cols = 2, gap = 'lg', className, children, ...rest }: GridProps) {
  return (
    <div className={cx('jw-grid', `jw-grid--cols-${cols}`, `jw-gap-${gap}`, className)} {...rest}>
      {children}
    </div>
  )
}