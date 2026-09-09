import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type SpaceGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal'
  gap?: SpaceGap
  align?: 'start' | 'center' | 'between'
  children: ReactNode
}

export function Stack({
  direction = 'vertical',
  gap = 'md',
  align,
  className,
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <div
      className={cx(
        'jw-stack',
        `jw-stack--${direction}`,
        `jw-gap-${gap}`,
        align && `jw-stack--${align}`,
        className,
      )}
      style={style as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  )
}