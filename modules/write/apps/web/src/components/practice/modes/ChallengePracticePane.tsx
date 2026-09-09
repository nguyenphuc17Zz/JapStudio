import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { ChallengeWorkspace } from '../../realworld/ChallengeWorkspace'

interface ChallengePracticePaneProps {
  challengeSession: any
  generating: boolean
  onGenerateChallenge: () => void
  onOpenChallengeFull: () => void
}

export function ChallengePracticePane({
  challengeSession,
  generating,
  onGenerateChallenge,
  onOpenChallengeFull,
}: ChallengePracticePaneProps) {
  return (
    <div>
      {challengeSession.challenge ? (
        <ChallengeWorkspace
          session={challengeSession}
          onNew={onGenerateChallenge}
        />
      ) : (
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <strong style={{ fontSize: 'var(--text-title)', color: 'var(--color-foreground)' }}>
              Thử thách viết cấp tốc
            </strong>
            <Badge tone="accent">+25 XP</Badge>
          </div>
          <p className="jw-text--muted jw-text--sm" style={{ margin: 0, lineHeight: 1.6 }}>
            Thử thách là bài viết ngắn do AI tạo dựa trên các điểm yếu bạn hay mắc phải. Hoàn thành sẽ được cộng điểm XP và tích lũy chuỗi ngày luyện tập.
          </p>
          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              onClick={onGenerateChallenge}
              disabled={generating}
              icon="flag"
              variant="primary"
              size="md"
            >
              {generating ? 'Đang tạo...' : 'Nhận thử thách'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={onOpenChallengeFull}
            >
              Mở Không gian Thử thách đầy đủ →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
