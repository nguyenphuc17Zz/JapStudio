import { useState } from 'react'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { Icon } from '../icons/Icon'

export function OptionalPoints({ points }: { points: string[] }) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [open, setOpen] = useState(true)
  const showToggle = isMobile && points.length > 0

  return (
    <section className="jw-rw-card jw-rw-optional" aria-label="Gợi ý thêm">
      <div className="jw-rw-card-head">
        <h3>Gợi ý thêm</h3>
        {showToggle ? (
          <button
            type="button"
            className="jw-rw-card-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Thu gọn' : 'Gợi ý thêm'}
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {!showToggle || open ? (
        <ul className="jw-rw-optional-list">
          {points.map((point, index) => (
            <li key={`${point}-${index}`}>
              <span className="jw-rw-optional-plus" aria-hidden="true">
                +
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}