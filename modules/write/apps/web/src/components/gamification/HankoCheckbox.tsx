import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { sound } from '../../services/sound'

export interface HankoCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  description?: ReactNode
  stampKanji?: string
  className?: string
}

export function HankoCheckbox({
  label,
  description,
  stampKanji = '済',
  checked,
  onChange,
  disabled,
  className,
  id,
  ...rest
}: HankoCheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      sound.playClick()
    }
    onChange?.(e)
  }

  return (
    <label
      htmlFor={inputId}
      className={`jw-check ${disabled ? 'jw-check--disabled' : ''} ${className ?? ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
      }}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="jw-sr-only"
        {...rest}
      />

      {/* Hanko Stamp Box */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          border: checked ? '2px solid #e14d3f' : '1.5px solid var(--color-border-strong)',
          background: checked
            ? 'linear-gradient(135deg, rgba(225, 77, 63, 0.25) 0%, rgba(185, 28, 28, 0.35) 100%)'
            : 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          boxShadow: checked ? '0 0 12px rgba(225, 77, 63, 0.55), inset 0 0 6px rgba(225, 77, 63, 0.3)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: checked ? 'scale(1.08) rotate(-3deg)' : 'scale(1)',
        }}
      >
        {checked && (
          <span
            style={{
              fontFamily: 'var(--font-japanese)',
              fontWeight: 900,
              fontSize: 13,
              color: '#e14d3f',
              lineHeight: 1,
              animation: 'jw-pop-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: 'drop-shadow(0 0 2px #e14d3f)',
            }}
          >
            {stampKanji}
          </span>
        )}
      </div>

      {(label || description) && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {label && <span style={{ fontWeight: checked ? 600 : 500, color: 'var(--color-foreground)' }}>{label}</span>}
          {description && <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)', marginTop: 2 }}>{description}</span>}
        </div>
      )}
    </label>
  )
}
