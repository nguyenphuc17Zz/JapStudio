import React, { useState } from 'react'
import type { ExpressionVariationResult } from '../../types/api'
import { Dialog } from '../ui/Dialog'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { AIModelPicker } from '../ai/AIModelPicker'
import { api } from '../../services/api'
import { sound } from '../../services/sound'

interface ExpressionVariationModalProps {
  isOpen: boolean
  onClose: () => void
  initialText?: string
  initialContext?: string
}

export const ExpressionVariationModal: React.FC<ExpressionVariationModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  initialContext = '',
}) => {
  const [inputText, setInputText] = useState(initialText)
  const [contextVi, setContextVi] = useState(initialContext)
  const [aiModel, setAiModel] = useState<{ provider?: string; model?: string }>({})

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExpressionVariationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [userVariation, setUserVariation] = useState('')
  const [submittedSynthesis, setSubmittedSynthesis] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || loading) return
    setLoading(true)
    setError(null)
    setSubmittedSynthesis(false)
    setUserVariation('')
    try {
      sound.playNeutral()
      const res = await api.generateExpressionVariations({
        text: inputText.trim(),
        context_vi: contextVi.trim() || undefined,
        provider: aiModel.provider,
        model: aiModel.model,
      })
      setResult(res)
      sound.playSuccess()
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Không thể tạo biến thể biểu đạt.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSynthesisSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userVariation.trim()) return
    setSubmittedSynthesis(true)
    sound.playSuccess()
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title="Biến Thể Biểu Đạt Tự Nhiên (Expression Variation)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', minWidth: '320px', maxWidth: '680px' }}>
        <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)' }}>
          Học cách <strong>diễn đạt 1 ý nghĩa bằng 3 cách tự nhiên khác nhau</strong> trong tiếng Nhật và thử thách bản thân tự viết biến thể riêng!
        </div>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <Textarea
            id="variation-input-text"
            label="Câu hoặc biểu đạt tiếng Nhật cần tạo biến thể"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="VD: 雨が降るから行きません / 時間がないので手伝えない..."
            rows={2}
          />

          <Input
            id="variation-context-vi"
            label="Ý nghĩa tiếng Việt / Ngữ cảnh dự định (tùy chọn)"
            value={contextVi}
            onChange={(e) => setContextVi(e.target.value)}
            placeholder="VD: Từ chối khéo cuộc hẹn với đồng nghiệp..."
          />

          <div style={{ marginTop: 'var(--space-xs)' }}>
            <AIModelPicker
              variant="compact"
              value={aiModel}
              onChange={setAiModel}
            />
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
            <Button
              type="submit"
              variant="primary"
              disabled={!inputText.trim() || loading}
              aria-label="Tạo 3 cách diễn đạt tự nhiên"
            >
              {loading ? <Spinner size={16} /> : 'Tạo 3 Biến thể Tự nhiên →'}
            </Button>
          </div>
        </form>

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {result.variations.map((v, i) => (
                <div
                  key={i}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--glass-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-ai)' }}>
                      Cách {i + 1}:
                    </span>
                    <Badge tone="neutral">{v.register}</Badge>
                  </div>
                  <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-foreground)' }}>
                    ⭕ {v.text}
                  </div>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                    {v.nuance_vi}
                  </div>
                  <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-primary)' }}>
                    Cụm từ chủ đạo: <strong>{v.key_phrase}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Synthesis Challenge */}
            <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: 'var(--space-xs)' }}>
                🎯 Thử thách viết của bạn:
              </div>
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)', marginBottom: 'var(--space-sm)' }}>
                {result.synthesis_prompt_vi}
              </div>

              {!submittedSynthesis ? (
                <form onSubmit={handleSynthesisSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <Textarea
                    id="variation-synthesis-attempt"
                    label="Tự viết câu biến thể của bạn"
                    value={userVariation}
                    onChange={(e) => setUserVariation(e.target.value)}
                    placeholder="Vận dụng một trong các cách diễn đạt trên để viết một câu mới..."
                    rows={2}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="primary" size="sm" disabled={!userVariation.trim()} aria-label="Hoàn thành thử thách viết biến thể">
                      Hoàn thành thử thách ✓
                    </Button>
                  </div>
                </form>
              ) : (
                <div style={{ padding: 'var(--space-sm)', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-success)' }}>
                  <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--text-body-sm)', marginBottom: '4px' }}>
                    ✓ Đã ghi nhận câu của bạn vào ngân hàng biểu đạt:
                  </div>
                  <div style={{ fontStyle: 'italic', color: 'var(--color-foreground)' }}>
                    "{userVariation}"
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
