import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { sound } from '../../services/sound'
import { api } from '../../services/api'
import { useAIProvider } from '../../context/AIProviderContext'
import type { HaikuGenerateResponse } from '../../types/api'
import { TiltCard } from '../ui/TiltCard'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { Badge } from '../ui/Badge'
import { analyzeHaikuMeter } from '../../services/moraMeterEngine'

export type HaikuItem = HaikuGenerateResponse

export interface DailyHaikuModalProps {
  open: boolean
  onClose: () => void
}

const THEMES = [
  { id: '🎲 Ngẫu hứng', label: '🎲 Ngẫu Hứng (Tự Do)' },
  { id: '🌸 Xuân', label: '🌸 Mùa Xuân' },
  { id: '🍃 Hạ', label: '🍃 Mùa Hạ' },
  { id: '🍁 Thu', label: '🍁 Mùa Thu' },
  { id: '❄️ Đông', label: '❄️ Mùa Đông' },
  { id: '🌙 Đêm trăng', label: '🌙 Trăng rằm' },
  { id: '✍️ Bút đạo', label: '✍️ Bút đạo' },
  { id: '🍵 Trà đạo', label: '🍵 Tĩnh lặng' },
]

export function DailyHaikuModal({ open, onClose }: DailyHaikuModalProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [selectedTheme, setSelectedTheme] = useState('🎲 Ngẫu hứng')
  const [loading, setLoading] = useState(false)
  const [haiku, setHaiku] = useState<HaikuGenerateResponse | null>(null)

  const fetchHaiku = useCallback(
    async (theme = selectedTheme) => {
      setLoading(true)
      try {
        const res = await api.generateHaiku({
          theme,
          season: theme.includes('Mùa') ? theme : undefined,
          provider: selectedProvider || undefined,
          model: selectedModel || undefined,
        })
        setHaiku(res)
      } catch {
        // Fallback
        setHaiku({
          season: '🌸 Xuân',
          kigo: '蛙 (Kawazu - Ếch xuân)',
          lines_jp: ['古池や', '蛙飛び込む', '水の音'],
          lines_reading: ['ふるいけや (Furuike ya)', 'かわずとびこむ (Kawazu tobikomu)', 'みずのおと (Mizu no oto)'],
          translation_vi: 'Ao xưa phẳng lặng như gương,\nMột chú ếch nhảy, tiếng nước buông nhẹ nhàng.',
          explanation: 'Bài thơ Haiku kinh điển nhất của Bashō về khoảnh khắc tĩnh lặng tuyệt đối và sự bừng tỉnh.',
          author_jp: '松尾芭蕉 (Matsuo Bashō)',
          author_vi: 'Bậc thầy thi ca Basho',
        })
      } finally {
        setLoading(false)
      }
    },
    [selectedTheme, selectedProvider, selectedModel],
  )

  useEffect(() => {
    if (open && !haiku) {
      void fetchHaiku(selectedTheme)
    }
  }, [open, haiku, fetchHaiku, selectedTheme])

  const meterAnalysis = useMemo(() => {
    if (!haiku) return null
    return analyzeHaikuMeter(haiku.lines_jp, haiku.lines_reading)
  }, [haiku])

  if (!open) return null

  const handleThemeChange = (t: string) => {
    setSelectedTheme(t)
    sound.playClick()
    fetchHaiku(t)
  }

  const handlePlayChime = () => {
    sound.playFurin()
  }

  const handleRegenerate = () => {
    sound.playClick()
    fetchHaiku(selectedTheme)
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Thơ Haiku AI hôm nay"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          maxHeight: '92vh',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          padding: 'var(--space-lg) var(--space-xl)',
          position: 'relative',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
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

        <span
          className="jw-badge"
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            color: 'var(--nihon-kikyo)',
            padding: '4px 12px',
          }}
        >
          📜 俳句 · THI CA HAIKU AI NHẬT BẢN
        </span>

        {/* Theme Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleThemeChange(t.id)}
              className={`jw-btn jw-btn--sm ${selectedTheme === t.id ? 'jw-btn--primary' : 'jw-btn--secondary'}`}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-full)' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Spinner size={24} />
            <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>
              Thi nhân AI đang gieo vần 5-7-5 và hòa sắc thiên nhiên...
            </span>
          </div>
        ) : haiku ? (
          <TiltCard maxRotation={6} scale={1.02}>
            <div
              style={{
                width: '100%',
                maxWidth: 380,
                background: 'linear-gradient(180deg, rgba(254, 243, 199, 0.07) 0%, rgba(254, 243, 199, 0.01) 100%)',
                border: '2px solid rgba(139, 92, 246, 0.4)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                boxShadow: '0 12px 36px rgba(139, 92, 246, 0.25)',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--nihon-yamabuki)' }}>
                  {haiku.season}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)', fontFamily: 'var(--font-japanese)' }}>
                  季語: {haiku.kigo}
                </span>
              </div>

              {/* Haiku Japanese Lines with Phonotactic Mora Badges */}
              <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {haiku.lines_jp.map((line, idx) => {
                  const lineMeter = meterAnalysis?.lines[idx]
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span style={{ fontSize: 23, fontWeight: 900, fontFamily: 'var(--font-japanese)', color: '#ffffff', letterSpacing: '0.06em' }}>
                          {line}
                        </span>
                        {lineMeter && (
                          <Badge tone={lineMeter.isExact ? 'success' : 'warning'}>
                            {lineMeter.moraCount} 拍
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--nihon-kikyo)', fontWeight: 600 }}>
                        {haiku.lines_reading[idx]}
                      </div>
                    </div>
                  )
                })}
              </div>

              {meterAnalysis && (
                <div style={{ fontSize: 11, color: 'var(--nihon-yamabuki)', marginBottom: 8, fontWeight: 600 }}>
                  ♫ {meterAnalysis.summaryVi}
                </div>
              )}

              <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.15)', paddingTop: 12, marginTop: 12 }}>
                <p style={{ fontSize: 13, color: 'var(--color-foreground)', fontStyle: 'italic', whiteSpace: 'pre-line', lineHeight: 1.5, margin: 0 }}>
                  "{haiku.translation_vi}"
                </p>
                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-foreground-secondary)' }}>
                  — {haiku.author_jp} ({haiku.author_vi})
                </div>
                <p style={{ fontSize: 10.5, color: 'var(--color-foreground-muted)', marginTop: 8, marginBottom: 0, lineHeight: 1.4 }}>
                  {haiku.explanation}
                </p>
              </div>
            </div>
          </TiltCard>
        ) : null}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="secondary" size="md" onClick={handlePlayChime}>
            Chuông Gió 🎐
          </Button>
          <Button variant="secondary" size="md" onClick={handleRegenerate} disabled={loading} icon="sparkles">
            Gieo Vần Mới 🎲
          </Button>
          <Button variant="primary" size="md" onClick={onClose}>
            Lĩnh Hội Thi Ca ✓
          </Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
