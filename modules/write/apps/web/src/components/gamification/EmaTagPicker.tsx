import { sound } from '../../services/sound'

export interface EmaTagItem {
  id: string
  label: string
  kanji?: string
  count?: number
  color?: string
}

export interface EmaTagPickerProps {
  items: EmaTagItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function EmaTagPicker({ items, value, onChange, className }: EmaTagPickerProps) {
  const handleSelect = (id: string) => {
    sound.playClick()
    onChange(id)
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        flexWrap: 'wrap',
        padding: '6px 0',
      }}
      role="radiogroup"
      aria-label="Thẻ lọc Ema"
    >
      {items.map((item) => {
        const isSelected = item.id === value
        const tagColor = item.color ?? '#8b5cf6'

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            role="radio"
            aria-checked={isSelected}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: '6px 6px 10px 10px',
              background: isSelected
                ? `linear-gradient(145deg, #78350f 0%, #451a03 100%)`
                : 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: isSelected
                ? '1.5px solid #d97706'
                : '1px solid var(--glass-border)',
              boxShadow: isSelected
                ? '0 6px 18px rgba(217, 119, 6, 0.4), inset 0 1px 2px rgba(254, 243, 199, 0.3)'
                : '0 2px 6px rgba(0, 0, 0, 0.2)',
              color: isSelected ? '#fef3c7' : 'var(--color-foreground-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              position: 'relative',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isSelected ? 'translateY(-2px)' : 'none',
              userSelect: 'none',
            }}
          >
            {/* Hanging String Hole */}
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: isSelected ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(0,0,0,0.4)',
                marginRight: 2,
              }}
            />

            {item.kanji && (
              <span
                style={{
                  fontFamily: 'var(--font-japanese)',
                  fontWeight: 900,
                  fontSize: 12,
                  color: isSelected ? '#fbbf24' : tagColor,
                }}
              >
                {item.kanji}
              </span>
            )}

            <span>{item.label}</span>

            {typeof item.count === 'number' && (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: isSelected ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: isSelected ? '#fef3c7' : 'var(--color-foreground-muted)',
                  fontWeight: 800,
                }}
              >
                {item.count}
              </span>
            )}

            {isSelected && (
              <span
                style={{
                  fontSize: 10,
                  color: '#e14d3f',
                  fontFamily: 'var(--font-japanese)',
                  fontWeight: 900,
                  border: '1px solid #e14d3f',
                  padding: '0 2px',
                  borderRadius: 2,
                  lineHeight: 1.1,
                }}
              >
                済
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
