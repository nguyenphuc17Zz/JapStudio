import { useState } from 'react'
import { sound } from '../../services/sound'

export function AudioToggle({ className = '' }: { className?: string }) {
  const [muted, setMuted] = useState(() => sound.isMuted())

  const handleToggle = () => {
    const next = sound.toggleMute()
    setMuted(next)
    if (!next) {
      sound.playClick()
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`jw-audio-toggle ${className}`}
      title={muted ? 'Bật âm thanh hiệu ứng' : 'Tắt âm thanh'}
      aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        background: 'transparent',
        border: '1px solid var(--color-border-subtle)',
        color: muted ? 'var(--color-foreground-muted)' : 'var(--color-accent)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{ fontSize: 14 }}>{muted ? '🔇' : '🔔'}</span>
    </button>
  )
}
