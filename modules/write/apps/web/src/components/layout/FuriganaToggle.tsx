import { useState, useRef, useEffect } from 'react'
import {
  useFurigana,
  FURIGANA_OPTIONS,
  FURIGANA_COLORS,
  type FuriganaMode,
} from '../../context/FuriganaContext'
import { sound } from '../../services/sound'
import { cx } from '../../lib/cx'

export function FuriganaToggle() {
  const { mode, setMode, color, setColor } = useFurigana()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelectMode = (newMode: FuriganaMode) => {
    sound.playClick()
    setMode(newMode)
  }

  const handleSelectColor = (newColor: string) => {
    sound.playClick()
    setColor(newColor)
  }

  const isEnabled = mode !== 'off'

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => {
          sound.playClick()
          setOpen((prev) => !prev)
        }}
        className={cx(
          'jw-btn jw-btn--ghost jw-btn--sm',
          isEnabled && 'jw-furigana-btn--active',
        )}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          height: 32,
          padding: '0 8px',
          borderRadius: 'var(--radius-md)',
          background: isEnabled ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${isEnabled ? 'rgba(139, 92, 246, 0.35)' : 'var(--glass-border)'}`,
          boxShadow: isEnabled ? `0 0 10px ${color}44` : 'none',
          color: isEnabled ? color : 'var(--color-foreground-muted)',
          cursor: 'pointer',
          fontSize: 'var(--text-micro, 11px)',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
        title={`Furigana: ${FURIGANA_OPTIONS[mode].label}`}
        aria-label="Cài đặt Furigana toàn hệ thống"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 4,
            background: isEnabled ? color : 'rgba(255, 255, 255, 0.08)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-jp)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          振
        </span>
        <span style={{ fontSize: 11, letterSpacing: '0.02em' }}>
          {mode === 'always' ? 'Furigana' : mode === 'hover' ? 'Rê chuột' : 'Tắt'}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Cài đặt Furigana toàn hệ thống"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 240,
            background: 'var(--glass-bg, rgba(23, 27, 37, 0.95))',
            backdropFilter: 'var(--glass-blur, blur(16px))',
            WebkitBackdropFilter: 'var(--glass-blur, blur(16px))',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.2)',
            padding: '8px',
            zIndex: 1000,
            animation: 'jw-scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '4px 6px 6px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-foreground-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Chế độ hiển thị</span>
            <span style={{ fontSize: 11, color: color, fontWeight: 800 }}>
              {FURIGANA_OPTIONS[mode].icon}
            </span>
          </div>

          {/* Mode Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
            {(Object.keys(FURIGANA_OPTIONS) as FuriganaMode[]).map((key) => {
              const opt = FURIGANA_OPTIONS[key]
              const active = mode === key
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectMode(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: active ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
                    border: active ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                    color: active ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 13, marginTop: 1 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: active ? 600 : 500,
                        color: active ? 'var(--color-accent)' : 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      {opt.label}
                      {active && (
                        <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>✓</span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--color-foreground-muted)',
                        marginTop: 1,
                        lineHeight: 1.25,
                      }}
                    >
                      {opt.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Color Section */}
          <div
            style={{
              paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-foreground-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 6,
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Màu sắc Furigana</span>
              {/* Mini live preview */}
              <span className="jw-jp-text" style={{ fontSize: 12, fontWeight: 700 }}>
                <ruby className="jw-ruby">
                  漢字
                  <rt className="jw-rt" style={{ color: color, opacity: 1 }}>かんじ</rt>
                </ruby>
              </span>
            </div>

            {/* Color Palette Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 5,
                padding: '2px 4px 6px',
              }}
            >
              {FURIGANA_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.hex.toLowerCase()
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectColor(c.hex)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '4px 2px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? `1.5px solid ${c.hex}` : '1px solid var(--glass-border)',
                      boxShadow: isSelected ? `0 0 8px ${c.previewGlow}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={c.name}
                    aria-label={`Chọn màu ${c.name}`}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: c.hex,
                        boxShadow: `0 0 5px ${c.previewGlow}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-jp)',
                        fontWeight: 700,
                        color: isSelected ? c.hex : 'var(--color-foreground-muted)',
                      }}
                    >
                      {c.kanji}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Custom Color Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px 2px',
                marginTop: 2,
              }}
            >
              <label
                htmlFor="jw-furigana-custom-color"
                style={{ fontSize: 10.5, color: 'var(--color-foreground-muted)', cursor: 'pointer' }}
              >
                Mã màu tùy chỉnh:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  id="jw-furigana-custom-color"
                  type="color"
                  value={color}
                  onChange={(e) => handleSelectColor(e.target.value)}
                  style={{
                    width: 22,
                    height: 22,
                    padding: 0,
                    border: '1px solid var(--glass-border)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: 'none',
                  }}
                  title="Chọn màu tự do"
                  aria-label="Chọn mã màu tùy chỉnh cho Furigana"
                />
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: color,
                    fontWeight: 600,
                  }}
                >
                  {color.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
