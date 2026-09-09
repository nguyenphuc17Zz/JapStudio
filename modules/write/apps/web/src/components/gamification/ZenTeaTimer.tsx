import { useState, useEffect } from 'react'
import { sound } from '../../services/sound'
import { Button } from '../ui/Button'

export function ZenTeaTimer() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  useEffect(() => {
    if (!running) return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setRunning(false)
          sound.playFurin()
          return 25 * 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [running])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setPopoverOpen((v) => !v)}
        className="jw-btn jw-btn--ghost jw-btn--sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          height: 32,
          borderRadius: 16,
          background: running ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${running ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
          color: running ? 'var(--nihon-matcha)' : 'var(--color-foreground-secondary)',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-mono, monospace)',
        }}
        title="Đồng hồ Trà Đạo 25 phút Pomodoro"
        aria-label="Đồng hồ Trà Đạo Pomodoro"
      >
        <span className={running ? 'jw-float' : ''}>🍵</span>
        <span>{timeFormatted}</span>
      </button>

      {popoverOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 220,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
            padding: 'var(--space-md)',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            textAlign: 'center',
          }}
        >
          <span
            className="jw-badge"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--nihon-matcha)',
              padding: '2px 8px',
            }}
          >
            🍵 茶道 · TRÀ ĐẠO 25M
          </span>

          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-foreground)' }}>
            {timeFormatted}
          </div>

          <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)', margin: 0, lineHeight: 1.4 }}>
            {running ? 'Hương trà thơm ngát, tâm trí tĩnh lặng...' : 'Bắt đầu phiên viết sâu 25 phút tĩnh tâm.'}
          </p>

          <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 4 }}>
            <Button
              variant={running ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setRunning((v) => !v)}
              style={{ flex: 1 }}
            >
              {running ? 'Tạm dừng ⏸️' : 'Bắt đầu 🍵'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRunning(false)
                setSecondsLeft(25 * 60)
              }}
            >
              🔄
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
