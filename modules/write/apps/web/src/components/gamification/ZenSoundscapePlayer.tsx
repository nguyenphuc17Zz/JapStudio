import { useState, useRef, useEffect } from 'react'
import { sound, type AmbientSoundType } from '../../services/sound'

const AMBIENT_PRESETS: Array<{ type: AmbientSoundType; label: string; icon: string }> = [
  { type: 'rain', label: 'Mưa Kyoto', icon: '🌧️' },
  { type: 'shishi', label: 'Ống tre gõ nước', icon: '🎍' },
  { type: 'windchime', label: 'Chuông gió', icon: '🎐' },
  { type: 'zen', label: 'Thiền định', icon: '🧘' },
]

export function ZenSoundscapePlayer({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [activeType, setActiveType] = useState<AmbientSoundType | null>(sound.getAmbientType())
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

  const handleTogglePreset = (type: AmbientSoundType) => {
    if (activeType === type) {
      sound.stopAmbient()
      setActiveType(null)
    } else {
      sound.startAmbient(type)
      setActiveType(type)
    }
  }

  const handleStopAll = () => {
    sound.stopAmbient()
    setActiveType(null)
  }

  return (
    <div ref={menuRef} className={`jw-zen-player ${className}`} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Âm thanh thư giãn Zen Soundscapes"
        aria-label="Âm thanh thư giãn Zen Soundscapes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 8px',
          borderRadius: 8,
          background: activeType ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
          border: activeType ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
          color: activeType ? 'var(--color-accent)' : 'var(--color-foreground)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: 14 }}>{activeType ? '🎵' : '🎧'}</span>
        {activeType && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'flex-end',
              gap: 2,
              height: 12,
            }}
          >
            <span
              style={{
                width: 2,
                height: '100%',
                background: 'var(--color-accent)',
                animation: 'flamePulse 0.6s infinite ease-in-out',
              }}
            />
            <span
              style={{
                width: 2,
                height: '60%',
                background: 'var(--color-accent)',
                animation: 'flamePulse 0.8s infinite ease-in-out 0.2s',
              }}
            />
            <span
              style={{
                width: 2,
                height: '80%',
                background: 'var(--color-accent)',
                animation: 'flamePulse 0.7s infinite ease-in-out 0.4s',
              }}
            />
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 200,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
            padding: 8,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-japanese)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-foreground-muted)',
              }}
            >
              ZEN SOUNDSCAPES · 瞑想
            </span>
            {activeType && (
              <button
                type="button"
                onClick={handleStopAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-danger)',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600,
                }}
              >
                Tắt âm
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {AMBIENT_PRESETS.map((p) => {
              const active = activeType === p.type
              return (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => handleTogglePreset(p.type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
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
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  <span style={{ flex: 1 }}>{p.label}</span>
                  {active && <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>● Bật</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
