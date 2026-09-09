import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface WritingToolbarProps {
  children: ReactNode
  className?: string
}

export function WritingToolbar({ children, className }: WritingToolbarProps) {
  return <div className={cx('jw-editor-toolbar', className)}>{children}</div>
}