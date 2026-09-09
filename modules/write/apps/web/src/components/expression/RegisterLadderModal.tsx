import React, { useState } from 'react'
import type { RegisterTransformationResult } from '../../types/api'
import { Dialog } from '../ui/Dialog'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { AIModelPicker } from '../ai/AIModelPicker'
import { api } from '../../services/api'
import { sound } from '../../services/sound'

interface RegisterLadderModalProps {
  isOpen: boolean
  onClose: () => void
  initialText?: string
  initialSourceRegister?: string
  initialTargetRegister?: string
}

const REGISTER_LEVELS = [
  { value: 'casual', label: '1. Thân mật (ため口 / Plain)' },
  { value: 'polite', label: '2. Lịch sự tiêu chuẩn (丁寧語 / です・ます)' },
  { value: 'formal', label: '3. Trang trọng văn viết (改まった書き言葉 / 論文)' },
  { value: 'business', label: '4. Kính ngữ công việc (ビジネス敬語 / 社外向け)' },
  { value: 'highly_formal', label: '5. Cực kỳ trang trọng (最上級敬語 / 式典・役員向け)' },
]

export const RegisterLadderModal: React.FC<RegisterLadderModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  initialSourceRegister = 'polite',
  initialTargetRegister = 'business',
}) => {
  const [sourceText, setSourceText] = useState(initialText)
  const [sourceReg, setSourceReg] = useState(initialSourceRegister)
  const [targetReg, setTargetReg] = useState(initialTargetRegister)
  const [userAttempt, setUserAttempt] = useState('')
  const [aiModel, setAiModel] = useState<{ provider?: string; model?: string }>({})

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RegisterTransformationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTransform = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceText.trim() || !userAttempt.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      sound.playNeutral()
      const res = await api.transformRegisterLadder({
        text: sourceText.trim(),
        source_register: sourceReg,
        target_register: targetReg,
        provider: aiModel.provider,
        model: aiModel.model,
      })
      setResult(res)
      sound.playSuccess()
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Không thể biến đổi ngữ vực.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setUserAttempt('')
    setError(null)
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title="Thang Biến Đổi Ngữ Vực 5 Cấp (Register Ladder)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', minWidth: '320px', maxWidth: '680px' }}>
        <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)' }}>
          Luyện viết lại cùng một ý tưởng qua 5 cấp độ trang trọng khác nhau của tiếng Nhật. Bạn phải <strong>tự viết bản chuyển đổi</strong> của mình trước khi AI đối chiếu!
        </div>

        <form onSubmit={handleTransform} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Select
              id="source-register-select"
              label="Ngữ vực gốc"
              value={sourceReg}
              onChange={(e) => setSourceReg(e.target.value)}
            >
              {REGISTER_LEVELS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Select
              id="target-register-select"
              label="Ngữ vực đích cần viết lại"
              value={targetReg}
              onChange={(e) => setTargetReg(e.target.value)}
            >
              {REGISTER_LEVELS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            id="source-text-input"
            label="Câu tiếng Nhật gốc"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="VD: これを見てください / 明日行きます..."
            rows={2}
          />

          <div style={{ padding: 'var(--space-sm)', background: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-ai)' }}>
            <Textarea
              id="user-attempt-input"
              label={`Bản viết lại của bạn ở cấp độ: ${REGISTER_LEVELS.find((l) => l.value === targetReg)?.label || targetReg}`}
              value={userAttempt}
              onChange={(e) => setUserAttempt(e.target.value)}
              placeholder="Hãy tự vận dụng kính ngữ / từ vựng trang trọng để viết lại câu này..."
              rows={3}
            />
          </div>

          <div style={{ marginTop: 'var(--space-xs)' }}>
            <AIModelPicker
              variant="compact"
              value={aiModel}
              onChange={setAiModel}
            />
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            {result && (
              <Button type="button" variant="ghost" onClick={handleReset}>
                Thử câu khác
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={!sourceText.trim() || !userAttempt.trim() || loading}
              aria-label="Nộp bài và xem đối chiếu của AI"
            >
              {loading ? <Spinner size={16} /> : 'Nộp bài & Đối chiếu AI →'}
            </Button>
          </div>
        </form>

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-ai)', fontSize: 'var(--text-title-sm)' }}>
                Bản đối chiếu chuẩn AI
              </span>
              <Badge tone="naturalness">{result.target_register}</Badge>
            </div>

            <div style={{ padding: 'var(--space-sm)', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', marginBottom: '2px' }}>
                Bản viết của bạn:
              </div>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{userAttempt}</div>
            </div>

            <div style={{ padding: 'var(--space-sm)', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-success)' }}>
              <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-success)', marginBottom: '2px', fontWeight: 600 }}>
                ⭕ Bản chuẩn của chuyên gia bản ngữ:
              </div>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-foreground)' }}>
                {result.transformed_text}
              </div>
            </div>

            {result.key_changes && result.key_changes.length > 0 && (
              <div style={{ fontSize: 'var(--text-caption)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Các chuyển đổi cốt lõi:</span>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {result.key_changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.explanation_vi && (
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                💡 Giải thích: {result.explanation_vi}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
