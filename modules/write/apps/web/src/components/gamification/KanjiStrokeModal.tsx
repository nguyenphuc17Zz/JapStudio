import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { sound } from '../../services/sound'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { LoadingSpinner } from '../LoadingSpinner'
import { HankoStamp } from './HankoStamp'
import { KanjiCanvas, type PracticeMode, type GridType, type InkColor } from '../kanji/KanjiCanvas'
import { KanjiInfoCard } from '../kanji/KanjiInfoCard'
import { KanjiStrokeControls } from '../kanji/KanjiStrokeControls'
import { kanjiService, type KanjiDetail } from '../../services/kanjiService'
import type { KanjiStrokeSet } from '../../services/kanjiStrokeEngine'

export interface KanjiStrokeModalProps {
  open: boolean
  onClose: () => void
  kanji?: string
  meaning?: string
  onyomi?: string
  kunyomi?: string
  jlpt?: string
  isShuffleMode?: boolean
  jlptFilter?: string
}

export function KanjiStrokeModal({
  open,
  onClose,
  kanji = '書',
  meaning,
  onyomi,
  kunyomi,
  jlpt = 'N5',
  isShuffleMode = false,
  jlptFilter,
}: KanjiStrokeModalProps) {
  const [activeKanji, setActiveKanji] = useState<string>(kanji)
  const [strokeSet, setStrokeSet] = useState<KanjiStrokeSet | null>(null)
  const [kanjiInfo, setKanjiInfo] = useState<KanjiDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Navigation History Stack
  const [history, setHistory] = useState<string[]>([kanji || '書'])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  // Session stats
  const [sessionPracticedCount, setSessionPracticedCount] = useState<number>(0)
  const [sessionStreak, setSessionStreak] = useState<number>(0)

  // Interactive Controls State
  const [mode, setMode] = useState<PracticeMode>('guide')
  const [gridType, setGridType] = useState<GridType>('nine')
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [speed, setSpeed] = useState<number>(1)
  const [inkColor, setInkColor] = useState<InkColor>('sumi')
  const [showStrokeNumbers, setShowStrokeNumbers] = useState<boolean>(true)
  const [autoAdvance, setAutoAdvance] = useState<boolean>(isShuffleMode)
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null)

  const [completionResult, setCompletionResult] = useState<{
    score: number
    stars: number
    grade: string
  } | null>(null)

  const autoAdvanceTimerRef = useRef<number | null>(null)

  // Reset initial kanji when modal open changes
  useEffect(() => {
    if (open) {
      const initial = kanji || '書'
      setActiveKanji(initial)
      setHistory([initial])
      setHistoryIndex(0)
      setSessionPracticedCount(0)
      setSessionStreak(0)
    }
  }, [open, kanji])

  // Load Kanji vector & metadata
  useEffect(() => {
    if (!open || !activeKanji) return

    let isMounted = true
    setLoading(true)
    setCompletionResult(null)
    setCurrentStep(1)
    setAutoAdvanceCountdown(null)
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
    setIsPlaying(mode === 'demo')

    async function loadData() {
      try {
        const [strokes, details] = await Promise.all([
          kanjiService.getKanjiStrokes(activeKanji),
          kanjiService.getKanjiDetails(activeKanji),
        ])

        if (isMounted) {
          setStrokeSet(strokes)
          setKanjiInfo({
            ...details,
            meaning: meaning || details.meaning,
            onyomi: onyomi ? [onyomi] : details.onyomi,
            kunyomi: kunyomi ? [kunyomi] : details.kunyomi,
            jlpt: (jlpt as KanjiDetail['jlpt']) || details.jlpt,
          })
          setLoading(false)
        }
      } catch {
        if (isMounted) setLoading(false)
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [open, activeKanji, meaning, onyomi, kunyomi, jlpt, mode])

  // Move to next random Kanji
  const handleNextRandom = useCallback(() => {
    sound.playClick()
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
    setAutoAdvanceCountdown(null)

    const nextKanjiDetail = kanjiService.getRandomKanji(
      jlptFilter || kanjiInfo?.jlpt || undefined,
      history.slice(-15)
    )

    const nextChar = nextKanjiDetail.kanji
    const newHistory = [...history.slice(0, historyIndex + 1), nextChar]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setActiveKanji(nextChar)
  }, [jlptFilter, kanjiInfo, history, historyIndex])

  // Go to previous Kanji in history
  const handlePreviousKanji = useCallback(() => {
    if (historyIndex > 0) {
      sound.playClick()
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current)
        autoAdvanceTimerRef.current = null
      }
      setAutoAdvanceCountdown(null)
      const prevIndex = historyIndex - 1
      setHistoryIndex(prevIndex)
      setActiveKanji(history[prevIndex])
    }
  }, [history, historyIndex])

  // Completion handler
  const handleComplete = (result: { score: number; stars: number; grade: string }) => {
    setCompletionResult(result)
    setSessionPracticedCount((c) => c + 1)
    if (result.score >= 70) {
      setSessionStreak((s) => s + 1)
    } else {
      setSessionStreak(0)
    }

    // Auto-advance logic
    if (autoAdvance) {
      setAutoAdvanceCountdown(2)
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        handleNextRandom()
      }, 1800)
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current)
      }
    }
  }, [])

  if (!open) return null

  const handleModeChange = (newMode: PracticeMode) => {
    setMode(newMode)
    setCompletionResult(null)
    setCurrentStep(1)
    setIsPlaying(newMode === 'demo')
  }

  const handleReset = () => {
    sound.playClick()
    setCurrentStep(1)
    setCompletionResult(null)
    setAutoAdvanceCountdown(null)
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
    setIsPlaying(mode === 'demo')
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Bút thuận chữ Hán: ${activeKanji}`}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '92vh',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1.5px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.85), 0 0 30px rgba(139, 92, 246, 0.2)',
          padding: 'var(--space-lg)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          overflowY: 'auto',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            color: 'var(--color-foreground-muted)',
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Modal Top Bar: Title & Random Next Flow Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-xs)',
            paddingRight: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="jw-badge"
              style={{
                fontFamily: 'var(--font-japanese)',
                fontSize: 12,
                letterSpacing: '0.08em',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: 'var(--nihon-kikyo)',
                padding: '4px 12px',
              }}
            >
              🖌️ 筆順 · BÚT THUẬN CHỮ HÁN
            </span>
            {sessionPracticedCount > 0 && (
              <span
                style={{
                  fontSize: 'var(--text-caption)',
                  color: 'var(--nihon-kin)',
                  fontWeight: 700,
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Đã luyện: {sessionPracticedCount} · 🔥 Chuỗi: {sessionStreak}
              </span>
            )}
          </div>

          {/* Next / Random Navigation Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousKanji}
              disabled={historyIndex <= 0}
              title="Chữ vừa luyện trước đó"
            >
              ⬅️ Chữ trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextRandom}
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(56, 189, 248, 0.25))',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                fontWeight: 700,
              }}
            >
              Chữ ngẫu nhiên khác 🎲
            </Button>
          </div>
        </div>

        {loading || !strokeSet || !kanjiInfo ? (
          <div style={{ padding: 'var(--space-2xl)', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 320px) 1fr',
              gap: 'var(--space-lg)',
              alignItems: 'start',
            }}
            className="jw-kanji-modal-grid"
          >
            {/* Left Column: Interactive Canvas & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <KanjiCanvas
                strokeSet={strokeSet}
                mode={mode}
                gridType={gridType}
                speed={speed}
                isPlaying={isPlaying}
                currentStep={currentStep}
                inkColor={inkColor}
                showStrokeNumbers={showStrokeNumbers}
                onStepChange={setCurrentStep}
                onComplete={handleComplete}
              />

              <KanjiStrokeControls
                mode={mode}
                totalStrokes={strokeSet.strokeCount}
                currentStep={currentStep}
                gridType={gridType}
                isPlaying={isPlaying}
                speed={speed}
                inkColor={inkColor}
                showStrokeNumbers={showStrokeNumbers}
                onModeChange={handleModeChange}
                onGridChange={setGridType}
                onPlayToggle={() => setIsPlaying(!isPlaying)}
                onStepChange={setCurrentStep}
                onSpeedChange={setSpeed}
                onInkColorChange={setInkColor}
                onToggleStrokeNumbers={() => setShowStrokeNumbers(!showStrokeNumbers)}
                onHint={() => {
                  // hint handled inside canvas
                }}
                onReset={handleReset}
              />

              {/* Completion Banner with Hanko Award & Random Next Prompt */}
              {completionResult && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1.5px solid rgba(16, 185, 129, 0.45)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-sm) var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                    marginTop: 'var(--space-xs)',
                    animation: 'fadeInUp 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: 'var(--text-body)' }}>
                        🎉 Hoàn thành xuất sắc!
                      </div>
                      <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                        Điểm: <strong>{completionResult.score}%</strong> · Xếp hạng:{' '}
                        <strong style={{ color: 'var(--nihon-kin)' }}>
                          {'⭐'.repeat(completionResult.stars)}
                        </strong>
                        {autoAdvanceCountdown && (
                          <span style={{ marginLeft: 6, color: 'var(--color-ai)' }}>
                            (Tự chuyển sau {autoAdvanceCountdown}s...)
                          </span>
                        )}
                      </div>
                    </div>
                    <HankoStamp
                      score={completionResult.score}
                      size={68}
                    />
                  </div>

                  {/* Primary Next Action */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleNextRandom}
                      style={{ flex: 1 }}
                    >
                      Tiếp tục chữ ngẫu nhiên khác 🎲 →
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                    >
                      Luyện lại 🔄
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Dictionary Information & Preferences */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <KanjiInfoCard
                info={kanjiInfo}
                onKanjiClick={(char) => {
                  const firstChar = char.charAt(0)
                  if (firstChar) {
                    setActiveKanji(firstChar)
                    setHistory((prev) => [...prev, firstChar])
                    setHistoryIndex((prev) => prev + 1)
                  }
                }}
              />

              {/* Bottom Row: Auto-Advance switch & Main Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'var(--space-xs)',
                  paddingTop: 'var(--space-xs)',
                  borderTop: '1px solid var(--color-border-subtle)',
                }}
              >
                <div>
                  <Switch
                    label={<span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>⚡ Tự chuyển chữ khi viết xong</span>}
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleNextRandom}
                  >
                    Chữ tiếp theo 🎲
                  </Button>
                  <Button variant="primary" size="md" onClick={onClose}>
                    Đã hiểu ✓
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
