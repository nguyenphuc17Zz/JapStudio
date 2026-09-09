import type { DailyMission } from '../../types/api'
import { Button } from '../ui/Button'
import { StreakPill } from '../gamification/StreakPill'

export interface GreetingHeaderProps {
  streak: number
  mission: DailyMission | null
  missionCompleted: boolean
  onOpenKotowazaExternal?: boolean
}

function greetingWord(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Chào buổi sáng.'
  if (hour >= 12 && hour < 18) return 'Chào buổi chiều.'
  if (hour >= 18 && hour < 22) return 'Chào buổi tối.'
  return 'Chào khuya.'
}

export default function GreetingHeader({ streak, mission, missionCompleted }: GreetingHeaderProps) {
  const word = greetingWord(new Date().getHours())

  const missionRemaining = mission
    ? Math.max(0, mission.target_count - mission.completed_count)
    : null

  return (
    <header
      className="jw-dash-greet jw-card jw-mb-lg"
      style={{
        padding: 'var(--space-lg) var(--space-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
      }}
      aria-label="Lời chào"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', minWidth: 260, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <h1
            className="jw-greet-line1"
            style={{
              fontSize: 'var(--text-h2)',
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.02em',
              color: 'var(--color-foreground)',
            }}
          >
            {word}
          </h1>
          {streak > 0 && <StreakPill streak={streak} />}
        </div>
        <p
          className="jw-greet-line2"
          style={{
            margin: 0,
            fontSize: 'var(--text-body-sm)',
            color: 'var(--color-foreground-secondary)',
            lineHeight: 1.5,
          }}
        >
          {streak > 0 && `Hôm nay là ngày thứ ${streak} liên tiếp của bạn. `}
          {missionCompleted ? (
            'Bạn đã hoàn thành nhiệm vụ hôm nay.'
          ) : missionRemaining !== null && missionRemaining > 0 ? (
            <>
              Còn <strong>{missionRemaining} bài</strong> nữa là xong nhiệm vụ hôm nay.
            </>
          ) : (
            'Hãy bắt đầu luyện tập hôm nay cùng trợ lý AI!'
          )}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Button href="/practice" variant="primary" size="md" icon="practice">
          Luyện tập ngay
        </Button>
      </div>
    </header>
  )
}