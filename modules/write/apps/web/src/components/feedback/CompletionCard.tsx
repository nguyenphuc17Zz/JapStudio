import { Button } from '../ui/Button'
import { Icon } from '../icons/Icon'
import type { DailyGoalInfo } from '../../hooks/usePracticeSession'

export interface CompletionCardProps {
  score: number
  xpGained: number | null
  missionCompleted: boolean
  dailyGoal: DailyGoalInfo | null
  nextPending: boolean
  onNext: () => void
  onBack: () => void
}

export function CompletionCard({
  score,
  xpGained,
  missionCompleted,
  dailyGoal,
  nextPending,
  onNext,
  onBack,
}: CompletionCardProps) {
  return (
    <div
      className="jw-completion jw-card"
      role="status"
      style={{
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-default)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div>
            <div className="jw-completion-head" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="check" size={20} aria-hidden="true" style={{ color: 'var(--color-success)' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--text-title)', fontWeight: 800 }}>
                Hoàn thành bài tập
              </h3>
            </div>
            <p className="jw-completion-score" style={{ margin: '4px 0 0', fontSize: 'var(--text-body)' }}>
              Điểm: <strong style={{ fontSize: '22px', color: score >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>{score}</strong>/100
            </p>
          </div>
        </div>

        {/* XP & Rewards */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {xpGained !== null && xpGained > 0 && (
            <span className="jw-xp-line">✦ +{xpGained} XP</span>
          )}
          {missionCompleted && (
            <span className="jw-xp-line">
              <Icon name="trophy" size={14} aria-hidden="true" /> Nhiệm vụ hôm nay đã hoàn thành
            </span>
          )}
        </div>
      </div>

      {dailyGoal && (
        <p className="jw-goal-line" style={{ margin: 0, fontSize: '13px', color: 'var(--color-foreground-secondary)' }}>
          Hôm nay {dailyGoal.completedCount}/{dailyGoal.target} bài
          {dailyGoal.completed ? ' — đã hoàn thành mục tiêu!' : ''}
        </p>
      )}

      <div
        className="jw-completion-actions"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: 'var(--space-sm)',
          marginTop: 'var(--space-xs)',
        }}
      >
        <Button variant="secondary" onClick={onBack} size="md">
          Về trang luyện tập
        </Button>
        <Button
          onClick={onNext}
          loading={nextPending}
          variant="primary"
          size="md"
          icon="sparkles"
        >
          Bài tập gợi ý tiếp theo
        </Button>
      </div>
    </div>
  )
}