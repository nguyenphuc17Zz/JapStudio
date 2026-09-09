import { Alert } from '../../ui/Alert'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { AIRecommendation } from '../../ai/AIRecommendation'
import { AIModelPicker } from '../../ai/AIModelPicker'
import JourneyBanner from '../../JourneyBanner'
import { LoadingSpinner } from '../../LoadingSpinner'
import type { LearningRecommendation } from '../../../types/api'

interface RecommendedPracticePaneProps {
  journeyContext: {
    loading: boolean
    error: string | null
    data: any
  }
  recommendation: {
    loading: boolean
    error: string | null
  }
  recommended: LearningRecommendation | null
  generating: boolean
  onOpenRecommended: (rec: LearningRecommendation) => void
  onRefreshRecommendation: () => void
}

export function RecommendedPracticePane({
  journeyContext,
  recommendation,
  recommended,
  generating,
  onOpenRecommended,
  onRefreshRecommendation,
}: RecommendedPracticePaneProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {journeyContext.loading ? (
        <LoadingSpinner label="Đang tải mục tiêu lộ trình..." />
      ) : journeyContext.error ? null : (
        <JourneyBanner context={journeyContext.data} />
      )}

      {/* AI Model Picker for recommendations */}
      <AIModelPicker variant="inline" label="Mô hình AI gợi ý & tạo bài" />

      {recommendation.loading ? (
        <LoadingSpinner label="Đang phân tích hồ sơ học tập..." />
      ) : recommendation.error ? (
        <Alert tone="error">Không thể tải gợi ý: {recommendation.error}</Alert>
      ) : recommended ? (
        <div>
          <AIRecommendation
            title={recommended.topic}
            description={recommended.reason}
            meta={[
              <Badge key="jlpt" tone="accent">JLPT {recommended.jlpt_level}</Badge>,
              <Badge key="register" tone="neutral">{recommended.register}</Badge>,
              <Badge key="diff" tone="neutral">Độ khó {recommended.difficulty}/10</Badge>,
            ]}
            action={
              <div className="jw-inline jw-gap-sm">
                <Button
                  onClick={() => onOpenRecommended(recommended)}
                  disabled={generating}
                  variant="primary"
                  size="md"
                  icon="practice"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-on-accent)',
                    fontWeight: 700,
                    border: 'none',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {generating ? 'Đang tạo...' : 'Luyện tập ngay'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={onRefreshRecommendation}
                  disabled={generating}
                  icon="refresh"
                  size="md"
                >
                  Gợi ý khác
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-elevated)',
            border: '1px dashed var(--glass-border)',
            textAlign: 'center',
          }}
        >
          <p className="jw-text--muted jw-text--sm jw-mb-md">
            Chưa có gợi ý nào. Hệ thống sẽ phân tích điểm yếu của bạn để chọn bài tập phù hợp nhất.
          </p>
          <Button
            onClick={onRefreshRecommendation}
            disabled={generating}
            icon="sparkles"
            variant="primary"
            size="md"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-on-accent)',
              fontWeight: 700,
              border: 'none',
            }}
          >
            {generating ? 'Đang tạo...' : 'Nhận gợi ý bài tập'}
          </Button>
        </div>
      )}
    </div>
  )
}
