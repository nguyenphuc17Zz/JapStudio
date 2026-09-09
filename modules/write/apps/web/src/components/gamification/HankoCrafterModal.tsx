import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { sound } from '../../services/sound'
import { api } from '../../services/api'
import { useAIProvider } from '../../context/AIProviderContext'
import type { HankoSuggestionOption, HankoSuggestionResponse } from '../../types/api'
import { TiltCard } from '../ui/TiltCard'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'

export interface HankoConfig {
  shape: 'circle' | 'square' | 'octagon'
  kanji: string
  color: string
  seal_style?: string
  philosophy?: string
}

const DEFAULT_HANKO: HankoConfig = {
  shape: 'circle',
  kanji: '筆',
  color: '#e14d3f',
  seal_style: 'Tensho-tai · Triện thư cổ',
  philosophy: 'Tâm tĩnh bút sắc, nét chữ tỏ lòng người.',
}

const COLOR_OPTIONS = [
  { label: '朱色 · Đỏ Chu Sa Hoàng Cung', value: '#e14d3f' },
  { label: '紫 · Tím Tử Đằng Quý Tộc', value: '#8b5cf6' },
  { label: '金箔 · Vàng Hoàng Kim', value: '#fbbf24' },
  { label: '翡翠 · Lục Bảo Phỉ Thúy', value: '#10b981' },
]

export interface HankoCrafterModalProps {
  open: boolean
  onClose: () => void
  onSave?: (config: HankoConfig) => void
}

export function HankoCrafterModal({ open, onClose, onSave }: HankoCrafterModalProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [tab, setTab] = useState<'ai' | 'manual'>('ai')
  const [nameInput, setNameInput] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [suggestions, setSuggestions] = useState<HankoSuggestionResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [config, setConfig] = useState<HankoConfig>(() => {
    try {
      const saved = localStorage.getItem('jws.custom.hanko')
      return saved ? JSON.parse(saved) : DEFAULT_HANKO
    } catch {
      return DEFAULT_HANKO
    }
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jws.custom.hanko')
      if (saved) setConfig(JSON.parse(saved))
    } catch {}
  }, [open])

  if (!open) return null

  const handleAiSuggest = async (overrideName?: string) => {
    const text = overrideName !== undefined ? overrideName : nameInput
    setLoadingAi(true)
    setErrorMsg(null)
    sound.playClick()
    try {
      const res = await api.suggestHanko({
        name: text.trim(),
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
      })
      setSuggestions(res)
      if (res.options && res.options.length > 0) {
        const first = res.options[0]
        setConfig((prev) => ({
          ...prev,
          kanji: first.kanji,
          seal_style: first.seal_style,
          philosophy: first.philosophy,
        }))
        sound.playFurin()
      }
    } catch {
      setErrorMsg('Không thể kết nối thợ khắc AI. Vui lòng kiểm tra API Key hoặc thử lại.')
    } finally {
      setLoadingAi(false)
    }
  }

  const handleSelectOption = (opt: HankoSuggestionOption) => {
    sound.playClick()
    setConfig((prev) => ({
      ...prev,
      kanji: opt.kanji,
      seal_style: opt.seal_style,
      philosophy: opt.philosophy,
    }))
  }

  const handleSave = () => {
    try {
      localStorage.setItem('jws.custom.hanko', JSON.stringify(config))
    } catch {}
    sound.playLevelUp()
    onSave?.(config)
    onClose()
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
      aria-label="Xưởng tự khắc dấu triện son Hanko"
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
            background: `${config.color}22`,
            border: `1px solid ${config.color}55`,
            color: config.color,
            padding: '4px 12px',
          }}
        >
          🈴 印鑑 · XƯỞNG KHẮC DẤU TRIỆN SON AI
        </span>

        <h2 style={{ fontSize: 'var(--text-title-lg)', fontWeight: 800, margin: 0, textAlign: 'center' }}>
          Con Dấu Triện Sơn Mài Cá Nhân
        </h2>

        {/* 3D Interactive Hanko Stamp Preview */}
        <TiltCard maxRotation={8} scale={1.05}>
          <div
            style={{
              width: 130,
              height: 130,
              margin: 'var(--space-xs) auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: config.shape === 'circle' ? '50%' : config.shape === 'square' ? '12px' : '20px',
              border: `4px solid ${config.color}`,
              background: `${config.color}15`,
              boxShadow: `0 0 24px ${config.color}44, inset 0 0 12px ${config.color}22`,
              transform: 'rotate(-4deg)',
              userSelect: 'none',
              position: 'relative',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-japanese)',
                fontWeight: 900,
                fontSize: config.kanji.length > 1 ? 34 : 48,
                color: config.color,
                lineHeight: 1,
                letterSpacing: '-0.05em',
                filter: `drop-shadow(0 0 4px ${config.color}88)`,
              }}
            >
              {config.kanji || '印'}
            </span>
          </div>
        </TiltCard>

        {config.philosophy && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-foreground-secondary)',
              fontStyle: 'italic',
              margin: 0,
              textAlign: 'center',
              maxWidth: 420,
              lineHeight: 1.4,
            }}
          >
            "{config.philosophy}"
          </p>
        )}

        {/* Mode Tabs */}
        <div className="jw-tablist jw-tablist--pills" style={{ width: '100%' }}>
          <button
            type="button"
            className={`jw-tab ${tab === 'ai' ? 'jw-tab--active' : ''}`}
            aria-selected={tab === 'ai'}
            onClick={() => setTab('ai')}
            style={{ flex: 1 }}
          >
            🪄 Thợ Khắc AI Gợi Ý
          </button>
          <button
            type="button"
            className={`jw-tab ${tab === 'manual' ? 'jw-tab--active' : ''}`}
            aria-selected={tab === 'manual'}
            onClick={() => setTab('manual')}
            style={{ flex: 1 }}
          >
            ✏️ Tự Nhập Thủ Công
          </button>
        </div>

        {/* AI Tab Content */}
        {tab === 'ai' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground-secondary)', display: 'block', marginBottom: 4 }}>
                Nhập tên / ước vọng (hoặc để trống để AI tự do sáng tác):
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="VD: Phúc, Minh, Phong (hoặc để trống)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAiSuggest()
                  }}
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleAiSuggest()}
                  disabled={loadingAi}
                  icon="sparkles"
                  style={{ flexShrink: 0 }}
                >
                  {loadingAi ? 'Đang Khắc...' : nameInput.trim() ? 'Khắc Dấu AI' : 'Tùy Duyên 🎲'}
                </Button>
              </div>
            </div>

            {loadingAi && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 0' }}>
                <Spinner size={18} />
                <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>
                  Thợ khắc AI đang tìm kiếm chữ Hán và triện văn phù hợp...
                </span>
              </div>
            )}

            {errorMsg && (
              <div style={{ fontSize: 12, color: 'var(--color-danger)', textAlign: 'center' }}>
                {errorMsg}
              </div>
            )}

            {suggestions && suggestions.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-foreground-muted)' }}>
                  CHỌN MẪU CHỮ HÁN PHÙ HỢP:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {suggestions.options.map((opt, idx) => {
                    const isSelected = config.kanji === opt.kanji
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(opt)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          border: `1.5px solid ${isSelected ? 'var(--nihon-kikyo)' : 'var(--glass-border)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 26,
                            fontFamily: 'var(--font-japanese)',
                            fontWeight: 900,
                            color: isSelected ? config.color : 'var(--color-foreground)',
                            width: 36,
                            textAlign: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {opt.kanji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-foreground)' }}>
                              {opt.meaning_vi}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--nihon-kikyo)', fontWeight: 600 }}>
                              {opt.reading}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)', margin: '2px 0 0', lineHeight: 1.35 }}>
                            {opt.philosophy}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Tab Content */}
        {tab === 'manual' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground-secondary)', display: 'block', marginBottom: 4 }}>
                Ký tự chữ Hán / Tên dấu (1-2 chữ)
              </label>
              <Input
                value={config.kanji}
                onChange={(e) => setConfig({ ...config, kanji: e.target.value.slice(0, 2) })}
                placeholder="VD: 筆, 文, 龍, 雅..."
                maxLength={2}
              />
            </div>
          </div>
        )}

        {/* Shape & Color Selection */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground-secondary)', display: 'block', marginBottom: 6 }}>
              Hình dáng phôi dấu
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'circle', label: '⭕ Tròn (丸印)' },
                { id: 'square', label: '⏹️ Vuông (角印)' },
                { id: 'octagon', label: '🛑 Bát giác (八角)' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setConfig({ ...config, shape: s.id as any })}
                  className={`jw-btn jw-btn--sm ${config.shape === s.id ? 'jw-btn--primary' : 'jw-btn--secondary'}`}
                  style={{ flex: 1, fontSize: 11.5, padding: '6px 4px' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground-secondary)', display: 'block', marginBottom: 6 }}>
              Sắc màu mực son
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setConfig({ ...config, color: c.value })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: config.color === c.value ? `${c.value}25` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${config.color === c.value ? c.value : 'rgba(255,255,255,0.08)'}`,
                    color: 'var(--color-foreground)',
                    cursor: 'pointer',
                    fontSize: 11,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.value }} />
                  {c.label.split(' · ')[1]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${config.color} 0%, #000 160%)`,
            boxShadow: `0 4px 18px ${config.color}55`,
            border: 'none',
            marginTop: 'var(--space-xs)',
          }}
        >
          Đúc Con Dấu Triện Son 🈴
        </Button>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
