import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { AIInsight } from '../components/ai/AIInsight'
import { KanjiStrokeModal } from '../components/gamification/KanjiStrokeModal'
import { FuriganaText } from '../components/ui/FuriganaText'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type { VocabularyFamiliarity, VocabularySourceType } from '../types/api'

const FAMILIARITY_LABELS: Record<string, string> = {
  new: 'Mới',
  learning: 'Đang học',
  familiar: 'Quen thuộc',
  strong: 'Đã nắm chắc',
}

const FAMILIARITY_TONE: Record<VocabularyFamiliarity, 'neutral' | 'accent' | 'warning' | 'success'> = {
  new: 'accent',
  learning: 'warning',
  familiar: 'neutral',
  strong: 'success',
}

const SOURCE_LABELS: Record<VocabularySourceType, string> = {
  user_answer: 'Câu trả lời của bạn',
  ai_correction: 'Bản sửa của AI',
  ai_natural: 'Cách nói tự nhiên',
  ai_native: 'Cách nói của người bản xứ',
  ai_register_variant: 'Biến thể ngữ điệu',
  ai_explanation: 'Giải thích của AI',
}

const TYPE_LABELS: Record<string, string> = {
  word: 'Từ',
  expression: 'Cụm từ',
  collocation: 'Kết hợp từ',
}

const REGISTER_LABELS: Record<string, string> = {
  casual: 'Thân mật',
  polite: 'Lịch sự',
  business: 'Kinh doanh',
  mixed: 'Hỗn hợp',
}

export default function VocabularyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null)
  const detail = useAsync(() => api.getVocabulary(id ?? ''), [id])

  if (detail.loading) return <LoadingSpinner />

  if (detail.error || !detail.data) {
    return (
      <PageContainer size="default">
        <PageHeader title="Từ vựng" description="Chi tiết từ vựng." />
        <Alert tone="error" className="jw-mb-md">
          Không thể tải từ vựng: {detail.error ?? 'Không tìm thấy'}
        </Alert>
        <Button href="/vocabulary" variant="ghost">
          ← Quay lại ngân hàng từ vựng
        </Button>
      </PageContainer>
    )
  }

  const item = detail.data
  const alternatives = item.natural_alternatives ?? []
  const discoveries = item.discoveries ?? []

  // Extract individual Kanji characters from expression
  const kanjiChars = Array.from(
    new Set((item.expression.match(/[\u4e00-\u9faf]/g) || []))
  )

  return (
    <PageContainer size="default">
      <div className="jw-mb-md">
        <Button href="/vocabulary" variant="ghost" size="sm">
          ← Quay lại ngân hàng từ vựng
        </Button>
      </div>

      <PageHeader
        title={
          <div className="jw-inline jw-gap-sm" style={{ alignItems: 'baseline' }}>
            <span className="jw-jp-text">{item.expression}</span>
            {item.reading ? (
              <span className="jw-vocab-reading" style={{ fontSize: 'var(--text-body-sm)' }}>
                <FuriganaText text={item.expression} reading={item.reading} />
              </span>
            ) : null}
          </div>
        }
        description={item.meaning_vi}
        actions={
          kanjiChars.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                Tập viết nét:
              </span>
              {kanjiChars.map((k) => (
                <Button
                  key={k}
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedKanji(k)}
                >
                  🖌️ {k}
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />

      {/* Main card */}
      <Card className="jw-mb-lg">
        <CardContent>
          <div className="jw-inline jw-gap-xs jw-mb-md">
            {item.reading && (
              <Badge tone="neutral">
                <span className="jw-jp-text" lang="ja">{item.reading}</span>
              </Badge>
            )}
            <Badge tone="neutral">{TYPE_LABELS[item.type] ?? item.type}</Badge>
            {item.part_of_speech && <Badge tone="neutral">{item.part_of_speech}</Badge>}
            {item.estimated_jlpt_level && (
              <Badge tone="accent">{item.estimated_jlpt_level}</Badge>
            )}
            <Badge tone="neutral">Độ khó {item.difficulty}/10</Badge>
            <Badge tone="neutral">Quan trọng {item.importance}/10</Badge>
            {item.register && (
              <Badge tone="neutral">{REGISTER_LABELS[item.register] ?? item.register}</Badge>
            )}
            {item.usage_context && (
              <Badge tone="neutral">Ngữ cảnh: {item.usage_context}</Badge>
            )}
            <Badge tone={FAMILIARITY_TONE[item.familiarity as VocabularyFamiliarity] ?? 'neutral'}>
              {FAMILIARITY_LABELS[item.familiarity] ?? item.familiarity}
            </Badge>
          </div>

          {/* Kanji Stroke Practice Quick Pill Row */}
          {kanjiChars.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--color-accent-muted)',
                border: '1px solid var(--color-ai-border)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-accent)', fontWeight: 600 }}>
                🖌️ Bút thuận chữ Hán:
              </span>
              {kanjiChars.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedKanji(k)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border-hover)',
                    color: 'var(--color-foreground)',
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-body-sm)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-jp)', fontSize: '1.1em' }}>{k}</span>
                  <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-accent)', fontWeight: 600 }}>Luyện viết →</span>
                </button>
              ))}
            </div>
          )}

          <AIInsight
            title="Vì sao nên học từ này?"
            description={item.learning_reason}
            evidence={
              item.user_expression
                ? [`Bạn đã viết: 「${item.user_expression}」`]
                : undefined
            }
            className="jw-mb-lg"
          />

          <div className="jw-mb-md">
            <h3 className="jw-text--label jw-text--muted jw-mb-xs">Ví dụ</h3>
            {item.example_sentence ? (
              <div className="jw-vocab-example jw-jp-text">
                <FuriganaText text={item.example_sentence} />
              </div>
            ) : null}
          </div>

          {alternatives.length > 0 && (
            <div className="jw-mb-md">
              <h3 className="jw-text--label jw-text--muted jw-mb-xs">Những cách nói tương đương</h3>
              <ul className="jw-ai-evidence">
                {alternatives.map((alt) => (
                  <li key={alt} className="jw-jp-text">
                    <FuriganaText text={alt} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.notes && (
            <div className="jw-mb-md">
              <h3 className="jw-text--label jw-text--muted jw-mb-xs">Ghi chú</h3>
              <p className="jw-text--sm jw-text--secondary">{item.notes}</p>
            </div>
          )}

          <div className="jw-mt-lg jw-pt-sm" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <h3 className="jw-text--label jw-text--muted jw-mb-xs">Thói quen sử dụng</h3>
            <div className="jw-inline jw-gap-md jw-text--caption jw-text--muted">
              <span>Được phát hiện {item.discovered_count} lần</span>
              <span>Đã gặp {item.seen_count} lần</span>
              <span>Bạn đã dùng {item.used_count} lần</span>
              {item.incorrect_count > 0 && (
                <span className="jw-text--warning">Sai {item.incorrect_count} lần</span>
              )}
              {item.correct_usage_count > 0 && (
                <span className="jw-text--success">Dùng đúng {item.correct_usage_count} lần</span>
              )}
              {item.model && (
                <span>AI: {item.model}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discoveries */}
      <Card className="jw-mb-lg">
        <CardHeader title={`Xuất xứ (${discoveries.length})`} />
        <CardContent>
          {discoveries.length === 0 ? (
            <p className="jw-text--muted jw-text--sm">Chưa có lần phát hiện nào.</p>
          ) : (
            <ul className="jw-vocab-list">
              {discoveries.map((discovery) => (
                <li key={discovery.id}>
                  <Card variant="subtle">
                    <CardContent>
                      <p className="jw-jp-text jw-mb-xs" lang="ja" style={{ fontWeight: 500 }}>
                        「{discovery.context_snippet}」
                      </p>
                      <p className="jw-text--caption jw-text--muted jw-mb-xs">
                        Nguồn: {SOURCE_LABELS[discovery.source_type] ?? discovery.source_type}
                        {discovery.user_expression
                          ? ` — bạn viết 「${discovery.user_expression}」`
                          : ''}
                      </p>
                      <p className="jw-text--sm jw-text--secondary">{discovery.learning_reason}</p>
                      {discovery.exercise_prompt_vi && (
                        <p className="jw-text--caption jw-text--muted jw-mt-xs">
                          Bài tập lần {discovery.attempt_number}: {discovery.exercise_prompt_vi}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedKanji && (
        <KanjiStrokeModal
          open={Boolean(selectedKanji)}
          kanji={selectedKanji}
          onClose={() => setSelectedKanji(null)}
        />
      )}
    </PageContainer>
  )
}