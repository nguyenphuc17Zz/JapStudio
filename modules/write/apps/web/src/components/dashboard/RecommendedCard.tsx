import type { LearningRecommendation } from '../../types/api'
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { AIRecommendation } from '../ai/AIRecommendation'

export interface RecommendedCardProps {
  recommendation: LearningRecommendation | null
  refreshing: boolean
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export default function RecommendedCard({
  recommendation,
  refreshing,
  loading,
  error,
  onRefresh,
}: RecommendedCardProps) {
  return (
    <Card className="jw-dash-card--recommended">
      <CardHeader
        title={
          <div className="jw-card-eyebrow-group">
            <span className="jw-card-eyebrow">Bài tập gợi ý</span>
          </div>
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon="refresh"
            loading={refreshing}
            onClick={onRefresh}
            aria-label="Gợi ý khác"
          />
        }
      />
      <CardContent>
        {loading ? (
          <Skeleton variant="card" />
        ) : error ? (
          <p className="jw-text--muted jw-text--sm">Không thể tải gợi ý lúc này.</p>
        ) : recommendation ? (
          <>
            <AIRecommendation
              title={recommendation.topic}
              description={recommendation.reason}
              meta={[
                <Badge key="jlpt" tone="accent">JLPT {recommendation.jlpt_level}</Badge>,
                <Badge key="register" tone="neutral">{recommendation.register}</Badge>,
                <Badge key="difficulty" tone="neutral">Độ khó {recommendation.difficulty}/10</Badge>,
              ]}
            />
            {recommendation.exercise?.prompt_vi && (
              <p className="jw-text--sm jw-text--secondary jw-mt-sm" style={{ fontStyle: 'italic' }}>
                {recommendation.exercise.prompt_vi}
              </p>
            )}
          </>
        ) : (
          <div>
            <p className="jw-text--muted jw-text--sm jw-mb-sm">
              Hãy bắt đầu một bài tập để hệ thống ghi nhận năng lực và gợi ý phù hợp.
            </p>
            <Button
              onClick={onRefresh}
              loading={refreshing}
              size="sm"
            >
              Nhận gợi ý bài tập
            </Button>
          </div>
        )}
      </CardContent>
      {!loading && !error && recommendation && (
        <CardFooter>
          <Button href="/practice?mode=recommended" variant="primary" size="sm" icon="practice">
            Bắt đầu
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}