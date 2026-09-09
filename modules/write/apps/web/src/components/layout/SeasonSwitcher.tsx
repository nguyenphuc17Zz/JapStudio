import { useState, useRef, useEffect } from 'react'
import { SEASONS, useSeason, type JapaneseSeason } from '../../context/SeasonContext'
import { sound } from '../../services/sound'

export function SeasonSwitcher({ className = '' }: { className?: string }) {
  const { season, seasonInfo, setSeason } = useSeason()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      window.addEventListener('mousedown', handleClickOutside)
    }
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (s: JapaneseSeason) => {
    setSeason(s)
    setOpen(false)
    sound.playClick()
  }

  return (
    <div ref={menuRef} className={`jw-season-switcher ${className}`} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Mùa hiện tại: ${seasonInfo.name}`}
        aria-label={`Chọn mùa: ${seasonInfo.name}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 32,
          padding: '0 8px',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--glass-border)',
          color: 'var(--color-foreground)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: 15 }} role="img" aria-hidden="true">
          {seasonInfo.icon}
        </span>
        <span style={{ fontFamily: 'var(--font-japanese)', fontSize: 12 }}>{seasonInfo.kanji}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 160,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            padding: 4,
            zIndex: 1000,
            animation: 'jw-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {(Object.keys(SEASONS) as JapaneseSeason[]).map((key) => {
            const item = SEASONS[key]
            const active = key === season
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: active ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'var(--color-foreground)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.name}</span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{item.particle}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
