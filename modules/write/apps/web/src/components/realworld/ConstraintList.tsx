import { useState } from 'react'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { Icon } from '../icons/Icon'

export function ConstraintList({ patterns }: { patterns: string[] }) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [open, setOpen] = useState(true)
  const showToggle = isMobile && patterns.length > 0

  if (patterns.length === 0) return null

  return (
    <section className="jw-rw-card jw-rw-constraints" aria-label="Lưu ý tránh">
      <div className="jw-rw-card-head">
        <h3>Lưu ý tránh</h3>
        {showToggle ? (
          <button
            type="button"
            className="jw-rw-card-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Thu gọn' : 'Lưu ý tránh'}
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {!showToggle || open ? (
        <ul className="jw-rw-constraint-list">
          {patterns.map((pattern, index) => (
            <li key={`${pattern}-${index}`}>
              <Icon name="alert" size={13} aria-hidden="true" />
              <span>{pattern}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}