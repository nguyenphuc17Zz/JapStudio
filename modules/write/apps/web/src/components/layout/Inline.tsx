import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { SpaceGap } from './Stack'

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  gap?: SpaceGap
  align?: 'start' | 'center' | 'between'
  children: ReactNode
}

export function Inline({ gap = 'md', align, className, children, ...rest }: InlineProps) {
  return (
    <div
      className={cx('jw-inline', `jw-gap-${gap}`, align && `jw-inline--${align}`, className)}
      {...rest}
    >
      {children}
    </div>
  )
}