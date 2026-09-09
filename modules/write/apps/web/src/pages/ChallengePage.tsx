import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChallengeWorkspace } from '../components/realworld/ChallengeWorkspace'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import { useAIProvider } from '../context/AIProviderContext'
import { useChallengeSession } from '../hooks/useChallengeSession'

export default function ChallengePage() {
  const { selectedProvider, selectedModel } = useAIProvider()
  const session = useChallengeSession()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const challengeId = searchParams.get('challenge')
    if (!challengeId) return
    let cancelled = false
    void session.load(challengeId).then(() => {
      if (cancelled) session.reset()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleGenerate = () => {
    void session.generate({ provider: selectedProvider, model: selectedModel })
  }

  const generating = session.phase === 'submitting' && !session.challenge

  return (
    <PageContainer size="default">
      <PageHeader
        title="Thử thách"
        description="Thử thách viết do AI tạo dựa trên điểm yếu của bạn — hoàn thành để nhận XP."
      />

      {session.error && !session.challenge ? (
        <Card className="jw-mb-lg">
          <CardContent>
            <Alert tone="error" title="Không thể tạo thử thách lúc này." className="jw-mb-md">
              {session.error}
            </Alert>
            <Button variant="ghost" size="sm" onClick={handleGenerate} icon="refresh">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {generating ? (
        <div className="jw-page-loading">
          <Spinner size={32} />
          <p className="jw-text--muted jw-text--sm">AI đang tạo thử thách phù hợp với điểm yếu của bạn...</p>
        </div>
      ) : session.challenge ? (
        <ChallengeWorkspace session={session} onNew={handleGenerate} />
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              title="Chưa có thử thách nào"
              description="Nhấn 'Nhận thử thách' để AI tạo thử thách phù hợp với điểm yếu của bạn. Hoàn thành thử thách sẽ được cộng XP."
            />
            
            {/* Feature Highlights Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                margin: 'var(--space-md) 0',
              }}
            >
              <Badge tone="warning">Thưởng +15 XP / thử thách</Badge>
              <Badge tone="accent">AI thích ứng theo điểm yếu</Badge>
              <Badge tone="neutral">Từ vựng · Kính ngữ · Ngữ pháp</Badge>
            </div>

            <div className="jw-mt-md" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <AIModelPicker variant="inline" label="Mô hình AI tạo & chấm điểm thử thách" />
              <Button icon="flag" onClick={handleGenerate} loading={generating}>
                {generating ? 'Đang tạo...' : 'Nhận thử thách'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}