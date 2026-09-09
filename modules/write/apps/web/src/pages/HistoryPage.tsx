import { useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import { Stack } from '../components/layout/Stack'

export default function HistoryPage() {
  const [displayLimit, setDisplayLimit] = useState(20)
  const history = useAsync(() => api.listLearningHistory({ limit: 50, skip: 0 }), [])

  const items = history.data?.items ?? []
  const visible = items.slice(0, displayLimit)
  const hasMore = visible.length < items.length

  return (
    <PageContainer size="wide">
      <PageHeader title="Lịch sử" description="Lịch sử luyện tập và các bài viết đã được đánh giá." />
      {history.loading ? (
        <LoadingSpinner />
      ) : history.error ? (
        <Alert tone="error">Không thể tải lịch sử: {history.error}</Alert>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="Lịch sử luyện tập" description="Toàn bộ lịch sử các bài viết, mô phỏng và thử thách của bạn được lưu tự động theo tài khoản." />
            <div className="jw-mt-md" style={{ textAlign: 'center' }}>
              <Button href="/practice" variant="primary" icon="practice">
                Bắt đầu luyện tập
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Stack gap="md">
          <div className="jw-card-eyebrow">Lịch sử ({items.length})</div>
          <ul className="jw-memory-list">
            {visible.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Badge tone="accent">{item.exercise_type}</Badge>
                      <span className="jw-text--caption jw-text--muted">{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="jw-text--sm" style={{ marginTop: 'var(--space-xs)' }}>
                      {item.topic} — {item.register} · JLPT {item.jlpt_level}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-xs)', gap: 'var(--space-sm)' }}>
                      <div className="jw-text--caption jw-text--muted">{item.reason}</div>
                      <Button
                        href={item.exercise_id ? `/practice?exercise=${item.exercise_id}` : '/practice'}
                        variant="ghost"
                        size="sm"
                        icon="practice"
                      >
                        Luyện lại
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="secondary" onClick={() => setDisplayLimit((p) => p + 20)}>
                Xem thêm ({visible.length} / {items.length})
              </Button>
            </div>
          )}
        </Stack>
      )}
    </PageContainer>
  )
}