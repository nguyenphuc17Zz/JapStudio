import { useState, useRef, useEffect } from 'react'
import { ModeSwitchModal, type TargetModeInfo } from '../common/ModeSwitchModal'

export function ModeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [switchTarget, setSwitchTarget] = useState<TargetModeInfo | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chuyển chế độ học JapStudio"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '32px',
          padding: '0 10px',
          fontSize: 'var(--text-body-sm)',
          fontWeight: 600,
          color: 'var(--color-primary)',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary)',
            boxShadow: '0 0 6px var(--color-primary)',
          }}
        />
        <span>✍️ Luyện Viết</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: '260px',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl, 0 16px 32px rgba(0,0,0,0.35))',
            padding: '8px',
            zIndex: 1000,
            backdropFilter: 'var(--glass-blur)',
          }}
        >
          <div
            style={{
              padding: '6px 8px',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: '6px',
              fontSize: 'var(--text-micro)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-foreground-muted)',
            }}
          >
            Chế Độ JapStudio AI
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Link to Hub */}
            <a
              href="http://localhost:3000"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-foreground)',
                textDecoration: 'none',
                fontSize: 'var(--text-body-sm)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>🌐 Hub Tổng Quan</span>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>3000</span>
            </a>

            {/* Link to JapSpeak */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setSwitchTarget({
                  id: 'speak',
                  name: 'JapSpeak',
                  tag: 'Luyện nói & phản xạ',
                  port: 3000,
                  url: 'http://localhost:3000/dashboard',
                })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-foreground)',
                background: 'transparent',
                border: 'none',
                width: '100%',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 'var(--text-body-sm)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>🎙️ JapSpeak ↗</span>
                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                  Luyện nói & phản xạ
                </span>
              </div>
              <span
                style={{
                  fontSize: 'var(--text-micro)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'rgb(16, 185, 129)',
                  fontWeight: 600,
                }}
              >
                Port 3000
              </span>
            </button>

            {/* Current: JapWrite */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: 'var(--text-body-sm)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>✍️ JapWrite</span>
                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-secondary)' }}>
                  Luyện viết & 23 levels
                </span>
              </div>
              <span
                style={{
                  fontSize: 'var(--text-micro)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                Đang học
              </span>
            </div>

            {/* Link to JapImmersion */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setSwitchTarget({
                  id: 'immersion',
                  name: 'JapImmersion',
                  tag: 'Đắm chìm & Luyện đọc thực tế',
                  port: 3002,
                  url: 'http://localhost:3002/immersion',
                })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-foreground)',
                background: 'transparent',
                border: 'none',
                width: '100%',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 'var(--text-body-sm)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>🌐 JapImmersion ↗</span>
                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                  Đắm chìm & Đọc báo thực tế
                </span>
              </div>
              <span
                style={{
                  fontSize: 'var(--text-micro)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(230, 57, 70, 0.15)',
                  color: 'rgb(230, 57, 70)',
                  fontWeight: 600,
                }}
              >
                Port 3002
              </span>
            </button>

            {/* Teaser 1: JapListen */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                opacity: 0.5,
                fontSize: 'var(--text-body-sm)',
                cursor: 'not-allowed',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>🎧 JapListen</span>
                <span style={{ fontSize: 'var(--text-micro)' }}>Luyện nghe đa tốc độ</span>
              </div>
              <span style={{ fontSize: 'var(--text-micro)' }}>Sắp có</span>
            </div>

            {/* Teaser 2: JapRead */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                opacity: 0.5,
                fontSize: 'var(--text-body-sm)',
                cursor: 'not-allowed',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>📖 JapRead</span>
                <span style={{ fontSize: 'var(--text-micro)' }}>Bóc tách Kanji báo chí</span>
              </div>
              <span style={{ fontSize: 'var(--text-micro)' }}>Sắp có</span>
            </div>
          </div>
        </div>
      )}

      {/* Switch Mode Transition Modal */}
      <ModeSwitchModal
        isOpen={Boolean(switchTarget)}
        target={switchTarget}
        onClose={() => setSwitchTarget(null)}
      />
    </div>
  )
}
