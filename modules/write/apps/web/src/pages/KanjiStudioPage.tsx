import { useState, useMemo, useEffect } from 'react'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { TiltCard } from '../components/ui/TiltCard'
import { KanjiStrokeModal } from '../components/gamification/KanjiStrokeModal'
import { KanjiPrerequisiteTree } from '../components/kanji'
import { kanjiService, type KanjiDetail, type KanjiMasteryState } from '../services/kanjiService'
import { sound } from '../services/sound'
import { JLPT_LEVELS } from '../constants/jlpt'
import { Stack } from '../components/layout/Stack'
import { Grid } from '../components/layout/Grid'

const JLPT_TABS = JLPT_LEVELS

export default function KanjiStudioPage() {
  const [selectedJlpt, setSelectedJlpt] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeModalKanji, setActiveModalKanji] = useState<string | null>(null)
  const [isShuffleSession, setIsShuffleSession] = useState<boolean>(false)
  const [displayLimit, setDisplayLimit] = useState<number>(60)
  const [showDAGTree, setShowDAGTree] = useState<boolean>(false)
  const [masteryData, setMasteryData] = useState<Record<string, KanjiMasteryState>>({})

  // Load mastery data from service
  const refreshMastery = () => {
    setMasteryData(kanjiService.getAllMastery())
  }

  useEffect(() => {
    refreshMastery()
  }, [])

  const debouncedSearch = useDebouncedValue(searchQuery, 250)

  // Reset pagination when search or tab changes
  useEffect(() => {
    setDisplayLimit(60)
  }, [selectedJlpt, debouncedSearch])
  // Filter Kanji list based on search and JLPT level — debounced to avoid rebuilding 2136 dict per keystroke
  const kanjiList = useMemo(() => {
    return kanjiService.searchKanji(debouncedSearch, selectedJlpt || undefined)
  }, [debouncedSearch, selectedJlpt])

  const visibleKanjiList = useMemo(() => {
    return kanjiList.slice(0, displayLimit)
  }, [kanjiList, displayLimit])

  // Compute exact Kanji count per JLPT level
  const jlptCounts = useMemo(() => {
    return {
      '': kanjiService.listAllKanji().length,
      'N5': kanjiService.listAllKanji('N5').length,
      'N4': kanjiService.listAllKanji('N4').length,
      'N3': kanjiService.listAllKanji('N3').length,
      'N2': kanjiService.listAllKanji('N2').length,
      'N1': kanjiService.listAllKanji('N1').length,
    } as Record<string, number>
  }, [])

  // Aggregate stats
  const stats = useMemo(() => {
    const all = kanjiService.listAllKanji()
    const totalCount = all.length
    let practicedCount = 0
    let totalStars = 0

    all.forEach((k) => {
      const m = masteryData[k.kanji]
      if (m && m.practicedCount > 0) {
        practicedCount++
        totalStars += m.stars
      }
    })

    return { totalCount, practicedCount, totalStars }
  }, [masteryData])

  const handleOpenPractice = (kanji: string, isShuffle = false) => {
    sound.playClick()
    setIsShuffleSession(isShuffle)
    setActiveModalKanji(kanji)
  }

  const handleStartRandomPractice = () => {
    sound.playClick()
    const randomKanji = kanjiService.getRandomKanji(selectedJlpt || undefined)
    setIsShuffleSession(true)
    setActiveModalKanji(randomKanji.kanji)
  }

  const handleCloseModal = () => {
    setActiveModalKanji(null)
    setIsShuffleSession(false)
    refreshMastery()
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Kanji Studio · Luyện viết Chữ Hán"
        description="Thực hành thứ tự từng nét bút thuận, tra cứu toàn bộ 2.136 Joyo Kanji N5 → N1, tra cứu Hán Việt, On/Kun, bộ thủ và rèn luyện thư pháp chuẩn vector KanjiVG."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Button
              variant={showDAGTree ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                sound.playClick()
                setShowDAGTree((v) => !v)
              }}
              style={{ fontWeight: 600 }}
            >
              🌳 {showDAGTree ? 'Ẩn Phả Hệ (DAG)' : 'Phả Hệ Cấu Tạo (DAG)'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartRandomPractice}
              style={{
                background: 'var(--grad-indigo)',
                border: 'none',
                boxShadow: '0 4px 14px var(--color-accent-muted)',
                fontWeight: 700,
              }}
            >
              🎲 Luyện ngẫu nhiên {selectedJlpt ? `(${selectedJlpt})` : ''}
            </Button>
            <Badge tone="accent">
              Đã luyện: {stats.practicedCount} / {stats.totalCount} chữ
            </Badge>
            <Badge tone="neutral">
              ⭐ {stats.totalStars} sao
            </Badge>
          </div>
        }
      />

      {/* JLPT Filter Tabs & Search Bar — dogfood Stack/Grid primitives */}
      <Stack gap="sm" style={{ marginBottom: 'var(--space-md)' }}>
        {/* JLPT Tabs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-xs)',
          }}
        >
          {JLPT_TABS.map((tab) => {
            const isActive = selectedJlpt === tab.id
            return (
              <Button
                key={tab.id}
                variant={isActive ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => {
                  sound.playClick()
                  setSelectedJlpt(tab.id)
                }}
                aria-pressed={isActive}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 'var(--text-caption)',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 'var(--text-micro)',
                    opacity: 0.75,
                    background: isActive ? 'var(--color-accent-muted)' : 'var(--color-surface-elevated)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {jlptCounts[tab.id] ?? 0}
                </span>
              </Button>
            )
          })}
        </div>

        {/* Search Toolbar — single random in header, search full width */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <Input
              label="Tìm kiếm chữ Hán"
              aria-label="Tìm kiếm chữ Hán"
              placeholder="Tìm theo chữ Hán, âm Hán Việt, nghĩa, âm đọc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Badge tone="neutral">
            Hiển thị {visibleKanjiList.length} / {kanjiList.length}
          </Badge>
        </div>
      </Stack>

      {/* Kanji Prerequisite DAG Tree Visualizer (Algorithm 13) */}
      {showDAGTree && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <KanjiPrerequisiteTree
            onSelectKanji={(char) => handleOpenPractice(char, false)}
          />
        </div>
      )}

      {/* Kanji Grid List */}
      {kanjiList.length > 0 ? (
        <>
          <Grid cols="auto" gap="md">
            {visibleKanjiList.map((item: KanjiDetail) => {
              const mastery = masteryData[item.kanji]
              const stars = mastery?.stars || 0
              const practiced = (mastery?.practicedCount || 0) > 0

              return (
                <TiltCard key={item.kanji} maxRotation={2} scale={1.01}>
                  <Card
                    variant="interactive"
                    role="button"
                    tabIndex={0}
                    aria-label={`Luyện viết ${item.kanji} ${item.hanViet}`}
                    onClick={() => handleOpenPractice(item.kanji, false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleOpenPractice(item.kanji, false)
                      }
                    }}
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: practiced
                        ? '4px solid var(--color-accent)'
                        : '4px solid var(--color-border-default)',
                    }}
                  >
                    <CardContent>
                      {/* Top Row: Character & Badges */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 'var(--space-xs)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 42,
                            fontFamily: 'var(--font-japanese)',
                            fontWeight: 800,
                            lineHeight: 1,
                            color: 'var(--color-foreground)',
                            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                          }}
                        >
                          {item.kanji}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <Badge tone="accent">{item.jlpt}</Badge>
                          <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                            {item.strokeCount} nét
                          </span>
                        </div>
                      </div>

                      {/* Hán Việt & Meaning */}
                      <div style={{ marginBottom: 'var(--space-sm)' }}>
                        <div
                          style={{
                            fontSize: 'var(--text-body)',
                            fontWeight: 800,
                            color: 'var(--nihon-kin)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {item.hanViet}
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--text-caption)',
                            color: 'var(--color-foreground-secondary)',
                            lineHeight: 1.4,
                            marginTop: 2,
                          }}
                        >
                          {item.meaning}
                        </div>
                      </div>

                      {/* Card Footer with Stars & Action — gọn 3 zones: char + hanViet/meaning + footer */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 'var(--space-xs)',
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ fontSize: 'var(--text-caption)', color: 'var(--nihon-kin)' }}>
                          {stars > 0 ? '⭐'.repeat(stars) : <span style={{ color: 'var(--color-foreground-muted)' }}>Chưa tập</span>}
                        </div>
                        <Button variant="ghost" size="sm">
                          Luyện viết 🖌️
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TiltCard>
              )
            })}
          </Grid>

          {/* Load More Button */}
          {visibleKanjiList.length < kanjiList.length && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDisplayLimit((prev) => prev + 60)}
              >
                Xem thêm chữ Hán ({visibleKanjiList.length} / {kanjiList.length}) ⬇
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="Không tìm thấy chữ Hán nào"
          description="Hãy thử tìm bằng từ khóa khác hoặc chuyển cấp độ JLPT."
        />
      )}

      {/* Kanji Interactive Practice Modal */}
      {activeModalKanji && (
        <KanjiStrokeModal
          open={Boolean(activeModalKanji)}
          onClose={handleCloseModal}
          kanji={activeModalKanji}
          isShuffleMode={isShuffleSession}
          jlptFilter={selectedJlpt || undefined}
        />
      )}
    </PageContainer>
  )
}
