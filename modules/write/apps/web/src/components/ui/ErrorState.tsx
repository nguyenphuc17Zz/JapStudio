import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message: string
  /** Optional machine-readable code shown subtly; never raw backend exceptions */
  code?: string
  retryLabel?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  message,
  code,
  retryLabel = 'Thử lại',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cx('jw-error-state', className)} role="alert">
      <span className="jw-error-icon" aria-hidden="true">
        <Icon name="alert" size={20} />
      </span>
      <h3 className="jw-error-title">{title}</h3>
      <p className="jw-error-desc">{message}</p>
      {code ? <span className="jw-error-code">Mã lỗi: {code}</span> : null}
      {onRetry ? (
        <div className="jw-error-actions">
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}