import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Page({ className, children, ...rest }: PageProps) {
  return (
    <div className={cx('jw-page', className)} {...rest}>
      {children}
    </div>
  )
}