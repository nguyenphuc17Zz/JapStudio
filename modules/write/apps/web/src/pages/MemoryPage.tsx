import { useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { AIInsight } from '../components/ai/AIInsight'
import { FuriganaText } from '../components/ui/FuriganaText'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type { LearnerMemory, MemoryCategory, MemoryConfidence } from '../types/api'

const CATEGORY_LABELS: Record<string, string> = {
  preference: 'Sở thích',
  learning_pattern: 'Cách học',
  mistake_pattern: 'Lỗi sai',
  successful_pattern: 'Điểm mạnh',
  vocabulary_memory: 'Từ vựng',
  expression_memory: 'Cách diễn đạt',
  scenario_memory: 'Tình huống',
  simulation_memory: 'Mô phỏng',
  goal_memory: 'Mục tiêu',
  style_preference: 'Phong cách',
  milestone_memory: 'Cột mốc',
}

const TYPE_LABELS: Record<string, string> = {
  semantic: 'Ngữ nghĩa',
  episodic: 'Sự kiện',
  pattern: 'Khuôn mẫu',
  preference: 'Sở thích',
}

const CONFIDENCE_LABELS: Record<MemoryConfidence, string> = {
  high: 'Chắc chắn',
  medium: 'Khá chắc',
  low: 'Còn mơ hồ',
}

const CONFIDENCE_TONE: Record<MemoryConfidence, 'success' | 'neutral' | 'warning'> = {
  high: 'success',
  medium: 'neutral',
  low: 'warning',
}

const SOURCE_LABELS: Record<string, string> = {
  user_explicit: 'Bạn tạo',
  evaluation: 'Từ đánh giá',
  vocabulary: 'Từ từ vựng',
  scenario: 'Từ tình huống',
  simulation: 'Từ mô phỏng',
}

export default function MemoryPage() {
  const memories = useAsync(() => api.listMemories({ limit: 100 }), [])
  const [displayLimit, setDisplayLimit] = useState(20)

  const [category, setCategory] = useState<MemoryCategory>('preference')
  const [content, setContent] = useState('')
  const [importance, setImportance] = useState('7')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const createMemory = async () => {
    if (!content.trim()) return
    setCreating(true)
    setCreated(false)
    setCreateError(null)
    try {
      await api.createMemory({
        category: category || 'preference',
        content: content.trim(),
        importance: Math.min(10, Math.max(1, Number(importance) || 7)),
      })
      setContent('')
      setCreated(true)
      await memories.run()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Không thể lưu ghi nhớ')
    } finally {
      setCreating(false)
    }
  }

  const forget = async (memory: LearnerMemory) => {
    setActionError(null)
    try {
      await api.forgetMemory(memory.id)
      await memories.run()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể xóa ghi nhớ')
    }
  }

  const archive = async (memory: LearnerMemory) => {
    setActionError(null)
    try {
      await api.archiveMemory(memory.id)
      await memories.run()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể lưu trữ ghi nhớ')
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    setRefreshResult(null)
    try {
      const result = await api.refreshMemories()
      setRefreshResult(
        `Đã xử lý ${result.processed_events} sự kiện · tạo ${result.created} · cập nhật ${result.updated} · loại ${result.rejected} · hết hạn ${result.expired}`,
      )
      await memories.run()
    } catch (err) {
      setRefreshResult(null)
      setActionError(err instanceof Error ? err.message : 'Không thể làm mới ghi nhớ')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Trí nhớ học tập"
        description="Hệ thống trí nhớ cá nhân hoá — AI tự động ghi nhớ từ đánh giá, từ vựng, tình huống và mô phỏng."
      />

      {/* Add memory card */}
      <Card className="jw-memory-add-card">
        <CardHeader title="Thêm ghi nhớ thủ công" />
        <CardContent>
          <AIInsight
            title="Ghi nhớ do bạn tạo"
            description="Ghi nhớ bạn tự tạo luôn có quyền ưu tiên cao nhất và không bị hệ thống thay đổi."
            className="jw-mb-md"
          />
          <div className="jw-memory-form">
            <Select
              id="memory-category"
              label="Loại ghi nhớ"
              value={category}
              onChange={(event) => setCategory(event.target.value as MemoryCategory)}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Input
              id="memory-content"
              label="Nội dung"
              maxLength={500}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="VD: Tôi muốn tập trung vào viết email công việc"
            />
            <Input
              id="memory-importance"
              label="Mức quan trọng (1–10)"
              type="number"
              min={1}
              max={10}
              value={importance}
              onChange={(event) => setImportance(event.target.value)}
            />
          </div>
          {created && (
            <Alert tone="success" className="jw-mt-sm">Đã lưu ghi nhớ.</Alert>
          )}
          {createError && (
            <Alert tone="error" className="jw-mt-sm">{createError}</Alert>
          )}
          <div className="jw-mt-md">
            <Button
              onClick={() => void createMemory()}
              loading={creating}
              disabled={!content.trim()}
              icon="save"
            >
              Lưu ghi nhớ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memory list controls */}
      <Card className="jw-memory-controls-card">
        <CardHeader
          title={
            <span>
              Ghi nhớ của tôi
              {memories.data ? (
                <span className="jw-text--muted jw-text--sm"> ({memories.data.total})</span>
              ) : null}
            </span>
          }
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon="refresh"
              loading={refreshing}
              onClick={() => void refresh()}
            >
              Đồng bộ ghi nhớ
            </Button>
          }
        />
        {refreshResult && (
          <CardContent>
            <Alert tone="success">{refreshResult}</Alert>
          </CardContent>
        )}
        {actionError && (
          <CardContent>
            <Alert tone="error">{actionError}</Alert>
          </CardContent>
        )}
      </Card>

      {/* Memory list — paginated displayLimit like Kanji/Vocabulary */}
      {memories.loading ? (
        <LoadingSpinner />
      ) : memories.error ? (
        <Alert tone="error">Không thể tải ghi nhớ: {memories.error}</Alert>
      ) : memories.data && memories.data.total > 0 ? (
        <ul className="jw-memory-list">
          {memories.data.items.slice(0, displayLimit).map((memory) => (
            <li key={memory.id}>
              <Card className="jw-memory-entry">
                <CardContent>
                  <div className="jw-memory-entry-head">
                    <div className="jw-memory-entry-badges">
                      <Badge tone="neutral">
                        {CATEGORY_LABELS[memory.category] ?? memory.category}
                      </Badge>
                      <Badge tone="neutral">
                        {TYPE_LABELS[memory.type] ?? memory.type}
                      </Badge>
                      <Badge tone={CONFIDENCE_TONE[memory.confidence] ?? 'neutral'}>
                        {CONFIDENCE_LABELS[memory.confidence] ?? memory.confidence}
                      </Badge>
                      {memory.status !== 'active' && (
                        <Badge tone="warning">
                          {memory.status === 'archived' ? 'Đã lưu trữ' : 'Đã hết hạn'}
                        </Badge>
                      )}
                    </div>
                    <span className="jw-text--caption jw-text--muted">
                      Quan trọng {memory.importance}/10
                    </span>
                  </div>
                  <div className="jw-memory-content">
                    <FuriganaText text={memory.content} />
                  </div>
                  <div className="jw-memory-entry-foot">
                    <div className="jw-text--caption jw-text--muted jw-inline jw-gap-xs">
                      <span>{SOURCE_LABELS[memory.source_type] ?? memory.source_type}</span>
                      <span>·</span>
                      <span>Gặp {memory.occurrence_count} lần</span>
                      <span>·</span>
                      <span>{new Date(memory.first_seen_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {memory.status === 'active' && (
                      <div className="jw-memory-entry-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="bookmark"
                          onClick={() => void archive(memory)}
                        >
                          Lưu trữ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="trash"
                          onClick={() => void forget(memory)}
                        >
                          Quên
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Chưa có ghi nhớ nào"
          description="Hoàn thành một bài luyện tập, tình huống hoặc mô phỏng — AI sẽ tự động ghi nhớ những điều đáng chú ý về cách học của bạn."
        />
      )}
      {memories.data && memories.data.items.length > displayLimit && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
          <Button variant="secondary" onClick={() => setDisplayLimit((p) => p + 20)}>
            Xem thêm ({Math.min(displayLimit, memories.data!.items.length)} / {memories.data!.items.length}) ⬇
          </Button>
        </div>
      )}
    </PageContainer>
  )
}