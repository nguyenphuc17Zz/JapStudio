import { useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { KanjiStrokeModal } from '../components/gamification/KanjiStrokeModal'
import { FuriganaText } from '../components/ui/FuriganaText'
import { useAsync } from '../hooks/useAsync'
import { useVocabularyLookup } from '../context/VocabularyLookupContext'
import { api } from '../services/api'

import type {
  JlptLevel,
  Register,
  VocabularyFamiliarity,
  VocabularyListParams,
  VocabularyType,
} from '../types/api'

const EMPTY = ''

const FAMILIARITY_LABELS: Record<VocabularyFamiliarity, string> = {
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

const TYPE_LABELS: Record<VocabularyType, string> = {
  word: 'Từ',
  expression: 'Cụm từ',
  collocation: 'Kết hợp từ',
}

export default function VocabularyPage() {
  const [type, setType] = useState<VocabularyType | ''>(EMPTY)
  const [jlptLevel, setJlptLevel] = useState<JlptLevel | ''>(EMPTY)
  const [register, setRegister] = useState<Register | ''>(EMPTY)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [kanjiModalChar, setKanjiModalChar] = useState<string | null>(null)
  const [displayLimit, setDisplayLimit] = useState(50)
  const [allItems, setAllItems] = useState<import('../types/api').VocabularyListItem[]>([])
  const [total, setTotal] = useState(0)

  const params = (): VocabularyListParams => {
    const result: VocabularyListParams = { limit: 50, skip: 0 }
    if (type) result.type = type
    if (jlptLevel) result.jlpt_level = jlptLevel
    if (register) result.register = register
    if (debouncedSearch.trim()) result.search = debouncedSearch.trim()
    return result
  }

  const vocabulary = useAsync(
    async () => {
      const res = await api.listVocabulary({ ...params(), skip: 0 })
      setAllItems(res.items)
      setTotal(res.total)
      setDisplayLimit(50)
      return res
    },
    [type, jlptLevel, register, debouncedSearch],
  )

  const runSearch = () => setDebouncedSearch(search)

  const hasMore = allItems.length < total
  const visibleItems = allItems.slice(0, displayLimit)

  const loadMore = async () => {
    if (!hasMore) return
    const nextOffset = allItems.length
    const res = await api.listVocabulary({ ...params(), skip: nextOffset, limit: 50 })
    setAllItems((prev) => {
      const seen = new Set(prev.map((i) => i.id))
      return [...prev, ...res.items.filter((i) => !seen.has(i.id))]
    })
    setTotal(res.total)
    setDisplayLimit((prev) => prev + 50)
  }

  let openLookup: ((options?: { query?: string }) => void) | undefined
  try {
    const ctx = useVocabularyLookup()
    openLookup = ctx.openLookup
  } catch {
    // outside provider
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Từ vựng"
        description="Ngân hàng từ vựng cá nhân, tự động tích lũy từ các bài viết được AI đánh giá."
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {openLookup && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openLookup({ query: search || undefined })}
                icon="sparkles"
              >
                Tra Cứu AI
              </Button>
            )}
          </div>
        }
      />

      <div className="jw-vocab-toolbar">
        <div className="jw-vocab-search">
          <Input
            aria-label="Tìm kiếm từ vựng"
            placeholder="Tìm theo từ, âm đọc hoặc nghĩa..."
            value={search}
            onChange={(event) => {
              const val = event.target.value
              setSearch(val)
              if (!val.trim()) {
                setDebouncedSearch('')
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch()
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={runSearch}
            disabled={search === debouncedSearch}
          >
            Tìm
          </Button>
        </div>
        <div className="jw-vocab-filters">
          <Select
            aria-label="Loại từ vựng"
            value={type}
            onChange={(event) => setType(event.target.value as VocabularyType | '')}
          >
            <option value="">Mọi loại từ</option>
            <option value="word">Từ vựng đơn</option>
            <option value="expression">Cụm diễn đạt</option>
            <option value="collocation">Kết hợp từ</option>
          </Select>
          <Select
            aria-label="Trình độ JLPT"
            value={jlptLevel}
            onChange={(event) => setJlptLevel(event.target.value as JlptLevel | '')}
          >
            <option value="">Mọi trình độ</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </Select>
          <Select
            aria-label="Ngữ điệu"
            value={register}
            onChange={(event) => setRegister(event.target.value as Register | '')}
          >
            <option value="">Mọi ngữ điệu</option>
            <option value="casual">Thân mật</option>
            <option value="polite">Lịch sự</option>
            <option value="business">Kinh doanh</option>
            <option value="mixed">Hỗn hợp</option>
          </Select>
        </div>
      </div>

      {vocabulary.loading ? (
        <LoadingSpinner />
      ) : vocabulary.error ? (
        <p className="jw-text--muted jw-text--sm">Không thể tải từ vựng: {vocabulary.error}</p>
      ) : total > 0 ? (
        <div className="jw-vocab-list-header">
          <h2 className="jw-card-eyebrow">Ngân hàng từ vựng ({total})</h2>
        </div>
      ) : null}

      {!vocabulary.loading &&
        !vocabulary.error &&
        total > 0 ? (
          <ul className="jw-vocab-list">
            {visibleItems.map((item) => {
              return (
                <li key={item.id}>
                  <Card
                    className="jw-vocab-entry"
                    variant="interactive"
                  >
                    <CardContent>
                      <div className="jw-vocab-entry-main">
                        <div className="jw-vocab-entry-head">
                          <span className="jw-vocab-expression jw-jp-text" lang="ja">
                            {item.expression}
                          </span>
                          {item.reading ? (
                            <span className="jw-vocab-reading">
                              <FuriganaText text={item.expression} reading={item.reading} />
                            </span>
                          ) : null}
                        </div>
                        <div className="jw-vocab-entry-badges">
                          <Badge tone="neutral">{TYPE_LABELS[item.type] ?? item.type}</Badge>
                          {item.estimated_jlpt_level && (
                            <Badge tone="accent">{item.estimated_jlpt_level}</Badge>
                          )}
                          <Badge
                            tone={FAMILIARITY_TONE[item.familiarity] ?? 'neutral'}
                          >
                            {FAMILIARITY_LABELS[item.familiarity] ?? item.familiarity}
                          </Badge>
                        </div>
                      </div>
                      <p className="jw-vocab-meaning">{item.meaning_vi}</p>
                      {item.example_sentence && (
                        <div className="jw-vocab-example jw-jp-text">
                          <FuriganaText text={item.example_sentence} />
                        </div>
                      )}
                      <div className="jw-vocab-entry-foot">
                        <span className="jw-text--caption jw-text--muted">
                          Gặp {item.seen_count} lần · dùng {item.used_count} lần
                          {item.incorrect_count > 0 ? ` · sai ${item.incorrect_count} lần` : ''}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {item.expression && /[\u4e00-\u9faf]/.test(item.expression) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const match = item.expression.match(/[\u4e00-\u9faf]/)
                                if (match) setKanjiModalChar(match[0])
                              }}
                              title="Tập viết chữ Hán trong từ này"
                            >
                              🖌️
                            </Button>
                          )}
                          <Button
                            href={`/vocabulary/${item.id}`}
                            variant="ghost"
                            size="sm"
                            icon="arrow-right"
                            className="jw-vocab-view-btn"
                          >
                            Xem
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        ) : !vocabulary.loading && !vocabulary.error ? (
          <EmptyState
            title="Chưa có từ vựng"
            description="Viết và gửi một bài luyện tập, AI sẽ tự động trích xuất những từ và cách diễn đạt đáng học cho bạn."
          />
        ) : null}

      {hasMore && !vocabulary.loading && !vocabulary.error && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
          <Button variant="secondary" size="md" onClick={() => void loadMore()}>
            Xem thêm ({visibleItems.length} / {total}) ⬇
          </Button>
        </div>
      )}


      {kanjiModalChar && (
        <KanjiStrokeModal
          open={Boolean(kanjiModalChar)}
          kanji={kanjiModalChar}
          onClose={() => setKanjiModalChar(null)}
        />
      )}
    </PageContainer>
  )
}