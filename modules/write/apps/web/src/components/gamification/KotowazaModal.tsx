import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { sound } from '../../services/sound'
import { api } from '../../services/api'
import { useAIProvider } from '../../context/AIProviderContext'
import type { KotowazaResponse } from '../../types/api'
import { TiltCard } from '../ui/TiltCard'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'

export interface KotowazaModalProps {
  open: boolean
  onClose: () => void
}

const CATEGORIES = [
  { id: 'all', label: '🎲 Tùy Duyên (Ngẫu Nhiên)' },
  { id: 'kiên trì', label: 'Kiên trì 🏔️' },
  { id: 'trí tuệ', label: 'Trí tuệ 💡' },
  { id: 'học tập', label: 'Học tập 📖' },
  { id: 'đời sống', label: 'Đời sống 🍵' },
  { id: 'thiên nhiên', label: 'Thiên nhiên 🌸' },
]

export function KotowazaModal({ open, onClose }: KotowazaModalProps) {
  const navigate = useNavigate()
  const { selectedProvider, selectedModel } = useAIProvider()
  const [selectedCat, setSelectedCat] = useState('all')
  const [loading, setLoading] = useState(false)
  const [kotowaza, setKotowaza] = useState<KotowazaResponse | null>(null)

  const fetchKotowaza = useCallback(async (cat = selectedCat) => {
    setLoading(true)
    try {
      const res = await api.getRandomKotowaza({
        category: cat === 'all' ? undefined : cat,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
      })
      setKotowaza(res)
    } catch {
      setKotowaza({
        expression_jp: '七転び八起き',
        reading: 'ななころびやおき (Nana korobi ya oki)',
        meaning_literal: 'Bảy lần vấp ngã, tám lần đứng lên.',
        vietnamese_equivalent: 'Thất bại là mẹ thành công (Vạn sự khởi đầu nan, gian nan không nản).',
        origin_story: 'Lấy cảm hứng từ hình tượng búp bê Daruma không bao giờ ngã gục, biểu trưng cho ý chí kiên định bất khuất của văn hóa Nhật Bản.',
        example_sentence_jp: 'どんなに失敗しても諦めない。七転び八起きの精神で挑戦しよう。',
        example_sentence_vi: 'Dù thất bại bao nhiêu lần cũng không bỏ cuộc. Hãy thử thách bằng tinh thần ngã 7 lần đứng dậy 8 lần.',
        practice_prompt: 'Hãy viết 1 câu tiếng Nhật tự động viên bản thân khi gặp bài tập khó.',
        is_yojijukugo: true,
      })
    } finally {
      setLoading(false)
    }
  }, [selectedCat, selectedProvider, selectedModel])

  useEffect(() => {
    if (open && !kotowaza) {
      void fetchKotowaza(selectedCat)
    }
  }, [open, kotowaza, fetchKotowaza, selectedCat])

  if (!open) return null

  const handleCatChange = (cat: string) => {
    setSelectedCat(cat)
    sound.playClick()
    fetchKotowaza(cat)
  }

  const handleNext = () => {
    sound.playClick()
    fetchKotowaza(selectedCat)
  }

  const handleGoPractice = () => {
    sound.playLevelUp()
    onClose()
    navigate('/practice')
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
      aria-label="Ca dao tục ngữ và thành ngữ 4 chữ AI"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
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
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: 'var(--nihon-moegi)',
            padding: '4px 12px',
          }}
        >
          📖 諺 · CA DAO TỤC NGỮ & THÀNH NGỮ AI
        </span>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCatChange(c.id)}
              className={`jw-btn jw-btn--sm ${selectedCat === c.id ? 'jw-btn--primary' : 'jw-btn--secondary'}`}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-full)' }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Spinner size={24} />
            <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>
              Đang tra cứu kho tàng tục ngữ và điển tích Nhật Bản...
            </span>
          </div>
        ) : kotowaza ? (
          <TiltCard maxRotation={6} scale={1.02}>
            <div
              style={{
                width: '100%',
                maxWidth: 420,
                background: 'linear-gradient(180deg, rgba(254, 243, 199, 0.08) 0%, rgba(254, 243, 199, 0.01) 100%)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                boxShadow: '0 12px 36px rgba(16, 185, 129, 0.2)',
                textAlign: 'left',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: kotowaza.is_yojijukugo ? 'var(--nihon-yamabuki)' : 'var(--nihon-kikyo)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {kotowaza.is_yojijukugo ? '四字熟語 · Thành Ngữ 4 Chữ' : '日本の諺 · Tục Ngữ Nhật Bản'}
                </span>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    fontFamily: 'var(--font-japanese)',
                    color: '#ffffff',
                    marginTop: 4,
                    letterSpacing: '0.05em',
                  }}
                >
                  {kotowaza.expression_jp}
                </div>
                <div style={{ fontSize: 12, color: 'var(--nihon-kikyo)', fontWeight: 600, marginTop: 2 }}>
                  {kotowaza.reading}
                </div>
              </div>

              {/* Vietnamese Proverb Equivalent */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--nihon-yamabuki)', display: 'block' }}>
                  🇻🇳 TỤC NGỮ / CA DAO VIỆT NAM TƯƠNG ĐƯƠNG:
                </span>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {kotowaza.vietnamese_equivalent}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)', margin: '2px 0 0', fontStyle: 'italic' }}>
                  Nghĩa đen: {kotowaza.meaning_literal}
                </p>
              </div>

              {/* Origin Story */}
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-foreground-secondary)' }}>
                  📜 Điển tích & Nguồn gốc:
                </span>
                <p style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)', margin: '4px 0 0', lineHeight: 1.45 }}>
                  {kotowaza.origin_story}
                </p>
              </div>

              {/* Example Sentence */}
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-foreground-secondary)' }}>
                  ✍️ Ví dụ ứng dụng:
                </span>
                <div style={{ fontSize: 12.5, fontFamily: 'var(--font-japanese)', color: '#ffffff', marginTop: 4 }}>
                  {kotowaza.example_sentence_jp}
                </div>
                <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)', margin: '2px 0 0', fontStyle: 'italic' }}>
                  {kotowaza.example_sentence_vi}
                </p>
              </div>

              {/* Practice Challenge Prompt */}
              {kotowaza.practice_prompt && (
                <div
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                  }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--nihon-kikyo)' }}>
                    🎯 Thử thách viết:
                  </span>
                  <p style={{ fontSize: 11.5, color: 'var(--color-foreground)', margin: '2px 0 0', lineHeight: 1.35 }}>
                    {kotowaza.practice_prompt}
                  </p>
                </div>
              )}
            </div>
          </TiltCard>
        ) : null}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="secondary" size="md" onClick={handleNext} disabled={loading} icon="sparkles">
            Khám Phá Câu Khác 🎲
          </Button>
          <Button variant="primary" size="md" onClick={handleGoPractice} icon="practice">
            Luyện Viết Với Câu Này →
          </Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
