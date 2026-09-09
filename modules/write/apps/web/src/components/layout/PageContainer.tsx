import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { ContainerSize } from '../../navigation/config'

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Which width tier the page chooses for itself. */
  size?: ContainerSize
  children: ReactNode
}

export function PageContainer({ size = 'default', className, children, ...rest }: PageContainerProps) {
  return (
    <div
      className={cx(
        'jw-page-container',
        size !== 'default' && `jw-page-container--${size}`,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}