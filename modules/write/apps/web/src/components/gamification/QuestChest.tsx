import { useState } from 'react'
import { sound } from '../../services/sound'

export interface QuestChestProps {
  completed: boolean
  claimed?: boolean
  xpReward?: number
  onClaim?: () => void
  className?: string
}

export function QuestChest({
  completed,
  claimed: initialClaimed = false,
  xpReward = 50,
  onClaim,
  className = '',
}: QuestChestProps) {
  const [claimed, setClaimed] = useState(initialClaimed)
  const [popping, setPopping] = useState(false)

  const handleClaim = () => {
    if (!completed || claimed) return
    setClaimed(true)
    setPopping(true)
    sound.playLevelUp()
    if (onClaim) onClaim()
  }

  return (
    <div
      className={`jw-quest-chest ${completed ? 'jw-quest-chest--ready' : ''} ${claimed ? 'jw-quest-chest--claimed' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={handleClaim}
        disabled={!completed || claimed}
        className="jw-chest-btn"
        title={claimed ? 'Đã nhận thưởng' : completed ? `Mở rương nhận +${xpReward} EXP!` : 'Hoàn thành nhiệm vụ để mở rương'}
        aria-label={claimed ? 'Đã nhận thưởng' : completed ? `Mở rương nhận +${xpReward} EXP` : 'Rương khóa'}
        style={{
          background: completed && !claimed ? 'var(--grad-gold)' : 'var(--color-surface-elevated)',
          border: completed && !claimed ? '1px solid var(--nihon-kin)' : '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: completed && !claimed ? 'pointer' : 'default',
          boxShadow: completed && !claimed ? '0 0 16px var(--nihon-yamabuki-glow)' : 'none',
          animation: completed && !claimed ? 'flamePulse 1.8s infinite' : 'none',
          color: completed && !claimed ? '#111118' : 'var(--color-foreground-muted)',
          fontWeight: 700,
          fontSize: 13,
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: 18 }} role="img" aria-hidden="true">
          {claimed ? '✨' : completed ? '🎁' : '🔒'}
        </span>
        <span>
          {claimed ? 'Đã nhận +EXP' : completed ? `Mở rương (+${xpReward} EXP)` : `Thưởng +${xpReward} EXP`}
        </span>
      </button>

      {popping && (
        <span
          style={{
            position: 'absolute',
            top: -24,
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 800,
            fontSize: 14,
            color: 'var(--nihon-yamabuki)',
            animation: 'xpFloatUp 1.2s forwards ease-out',
            pointerEvents: 'none',
            textShadow: '0 0 8px rgba(245, 166, 35, 0.8)',
          }}
        >
          +{xpReward} EXP! 🌟
        </span>
      )}
    </div>
  )
}
