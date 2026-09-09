import React, { useState } from 'react'
import type { ExpressionRecord, CollocationSuggestionsResult } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import { Icon } from '../icons/Icon'
import { api } from '../../services/api'
import { sound } from '../../services/sound'

interface CollocationMapProps {
  records: ExpressionRecord[]
  onPracticeExpression?: (expression: string, baseWord?: string) => void
  aiModel?: { provider?: string; model?: string }
}

export const CollocationMap: React.FC<CollocationMapProps> = ({
  records,
  onPracticeExpression,
  aiModel = {},
}) => {
  const [searchWord, setSearchWord] = useState('')
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<CollocationSuggestionsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const collocationRecords = records.filter(
    (r) => r.expression_type === 'collocation' || (r.collocations && r.collocations.length > 0)
  )

  // Group tracked records by base_word
  const grouped = collocationRecords.reduce<Record<string, ExpressionRecord[]>>((acc, item) => {
    const key = item.base_word || 'Khác'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const handleFetchCollocations = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchWord.trim() || loadingSuggestions) return
    setLoadingSuggestions(true)
    setError(null)
    try {
      sound.playNeutral()
      const res = await api.getCollocationSuggestions(searchWord.trim(), {
        provider: aiModel.provider,
        model: aiModel.model,
      })
      setSuggestions(res)
      sound.playSuccess()
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Không thể tra cứu kết hợp từ.'
      setError(msg)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Base Word Collocation Explorer */}
      <Card variant="ai">
        <CardHeader
          title="Tra cứu Collocation chuẩn Nhật từ động từ/từ gốc"
          description="Học cách kết hợp từ tự nhiên trong văn viết (VD: 予定を決める thay vì 決定する)"
        />
        <CardContent>
          <form onSubmit={handleFetchCollocations} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <Input
                id="collocation-base-word"
                label="Từ gốc cần tra (Động từ / Danh từ / Tính từ)"
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                placeholder="VD: 決める, 連絡, 意見, 計画..."
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!searchWord.trim() || loadingSuggestions}
              aria-label="Tra cứu collocation tự nhiên"
            >
              {loadingSuggestions ? <Spinner size={16} /> : <Icon name="sparkles" size={14} />}
              <span>Gợi ý Collocation bản ngữ</span>
            </Button>
          </form>

          {error && (
            <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-error)', fontSize: 'var(--text-body-sm)' }}>
              {error}
            </div>
          )}

          {suggestions && (
            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-ai)', fontSize: 'var(--text-title-sm)' }}>
                  Gợi ý Collocation cho: {suggestions.base_word}
                </span>
                <Badge tone="naturalness">Chuẩn bản ngữ</Badge>
              </div>

              {suggestions.tip_vi && (
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)', marginBottom: 'var(--space-md)', fontStyle: 'italic' }}>
                  💡 {suggestions.tip_vi}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-sm)' }}>
                {suggestions.suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 'var(--space-sm)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-foreground)', fontSize: 'var(--text-body-sm)' }}>
                        ⭕ {s.collocation}
                      </span>
                      <Badge tone="neutral">{s.register}</Badge>
                    </div>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                      {s.meaning_vi}
                    </span>
                    <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', background: 'rgba(0,0,0,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      {s.example_sentence}
                    </span>
                    {onPracticeExpression && (
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPracticeExpression(s.collocation, suggestions.base_word)}
                          aria-label={`Luyện viết câu với ${s.collocation}`}
                        >
                          Luyện câu này →
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracked Collocations */}
      <Card>
        <CardHeader
          title="Collocation đã phát hiện trong bài viết của bạn"
          description="Theo dõi tần suất dùng đúng và các điểm cần thay thế theo thói quen bản xứ"
        />
        <CardContent>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
              Chưa có collocation nào được ghi nhận từ bài viết của bạn. Hãy viết thêm bài để AI tự động phân tích!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {Object.entries(grouped).map(([baseWord, items]) => (
                <div
                  key={baseWord}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--color-surface-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      Từ gốc: {baseWord}
                    </span>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
                      {items.length} cụm từ
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-xs) var(--space-sm)',
                          background: 'var(--color-surface)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          flexWrap: 'wrap',
                          gap: 'var(--space-xs)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <span style={{ fontWeight: 500 }}>{item.expression}</span>
                          {item.naturalness_avg >= 80 ? (
                            <Badge tone="success">✓ Tự nhiên ({Math.round(item.naturalness_avg)}%)</Badge>
                          ) : item.naturalness_avg >= 60 ? (
                            <Badge tone="warning">△ Chấp nhận ({Math.round(item.naturalness_avg)}%)</Badge>
                          ) : (
                            <Badge tone="error">✗ Gượng gạo ({Math.round(item.naturalness_avg)}%)</Badge>
                          )}
                          {item.native_alternatives && item.native_alternatives.length > 0 && (
                            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ai)' }}>
                              → Bản ngữ khuyên: <strong>{item.native_alternatives.join(', ')}</strong>
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                            Dùng {item.used_count} lần
                          </span>
                          {onPracticeExpression && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onPracticeExpression(item.expression, item.base_word || undefined)}
                              aria-label={`Luyện tập biểu đạt ${item.expression}`}
                            >
                              Luyện tập
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
