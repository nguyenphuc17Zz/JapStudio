import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function Section({ title, description, actions, className, children, ...rest }: SectionProps) {
  return (
    <section className={cx('jw-section', className)} {...rest}>
      {title || actions ? (
        <div className="jw-section-head">
          <div>
            {title ? <h2 className="jw-section-title">{title}</h2> : null}
            {description ? <p className="jw-section-desc">{description}</p> : null}
          </div>
          {actions ? <div className="jw-section-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}