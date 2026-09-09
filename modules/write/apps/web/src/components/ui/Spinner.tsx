import { cx } from '../../lib/cx'

export interface SpinnerProps {
  size?: number
  label?: string
  className?: string
}

export function Spinner({ size = 18, label, className }: SpinnerProps) {
  return (
    <span className={cx('jw-spinner-wrap', className)} role="status">
      <span className="jw-spinner" style={{ width: size, height: size }} aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="jw-sr-only">Đang tải…</span>}
    </span>
  )
}