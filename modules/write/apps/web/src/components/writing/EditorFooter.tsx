import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface EditorFooterProps {
  left?: ReactNode
  right?: ReactNode
  className?: string
}

export function EditorFooter({ left, right, className }: EditorFooterProps) {
  return (
    <div className={cx('jw-editor-footer', className)}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}