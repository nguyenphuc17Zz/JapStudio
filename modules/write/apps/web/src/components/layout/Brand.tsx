import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface BrandProps {
  collapsed?: boolean
  className?: string
}

export function Brand({ collapsed = false, className }: BrandProps) {
  return (
    <span className={cx('jw-brand', collapsed && 'jw-brand--collapsed', className)}>
      <span
        className="jw-brand-mark"
        aria-hidden="true"
        style={{
          background: 'var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          width: 28,
          height: 28,
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="sparkles" size={14} />
      </span>
      <span className="jw-brand-text" style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em' }}>
        Japanese Writing Studio
      </span>
    </span>
  )
}