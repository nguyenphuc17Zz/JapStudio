import React, { useState } from 'react'
import type { RewriteMode, RewriteModeResult, DiffExplanation } from '../../types/api'
import { api } from '../../services/api'
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { LinguisticDiffViewer } from './LinguisticDiffViewer'
import { AIModelPicker } from '../ai/AIModelPicker'
import { sound } from '../../services/sound'

const REWRITE_MODES: Array<{
  id: RewriteMode
  label: string
  icon: string
  description: string
}> = [
  {
    id: 'minimal',
    label: 'Sửa tối thiểu (Minimal)',
    icon: '🩹',
    description: 'Chỉ sửa lỗi ngữ pháp & trợ từ, giữ nguyên tối đa từ vựng gốc.',
  },
  {
    id: 'natural',
    label: 'Thuần Nhật (Naturalization)',
    icon: '🌿',
    description: 'Lược bỏ chủ ngữ thừa, dùng danh từ hóa và diễn đạt mượt mà tự nhiên.',
  },
  {
    id: 'register',
    label: 'Chuyển văn phong (Register)',
    icon: '👔',
    description: 'Biến đổi giữa Thân mật (Casual), Lịch sự (Polite) và Kính ngữ (Keigo).',
  },
  {
    id: 'concision',
    label: 'Tinh gọn súc tích (Concision)',
    icon: '✂️',
    description: 'Rút gọn câu, loại bỏ các từ đệm và cách nói dài dòng.',
  },
  {
    id: 'expansion',
    label: 'Mở rộng biểu đạt (Expansion)',
    icon: '🎨',
    description: 'Làm phong phú câu với trạng từ miêu tả, lý do và cảm xúc sinh động.',
  },
  {
    id: 'native',
    label: 'Bản ngữ đích thực (Native)',
    icon: '🗾',
    description: 'Sử dụng quán dụng ngữ, từ tượng thanh tượng hình và lối nói bản xứ.',
  },
]

interface RewriteModesWorkspaceProps {
  initialText?: string
  onTextChange?: (text: string) => void
  onOpenRecent?: () => void
  className?: string
}

export const RewriteModesWorkspace: React.FC<RewriteModesWorkspaceProps> = ({
  initialText = '',
  onTextChange,
  onOpenRecent,
  className = '',
}) => {
  const [inputText, setInputText] = useState(initialText)
  const [contextVi, setContextVi] = useState('')
  const [selectedMode, setSelectedMode] = useState<RewriteMode>('natural')
  const [targetRegister, setTargetRegister] = useState<'casual' | 'polite' | 'business'>('business')
  const [aiModel, setAiModel] = useState<{ provider?: string; model?: string }>({})

  // Auto sync when parent input text changes
  React.useEffect(() => {
    if (initialText !== undefined) {
      setInputText(initialText)
    }
  }, [initialText])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RewriteModeResult | null>(null)
  const [diffResult, setDiffResult] = useState<DiffExplanation | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  const insertPunctuation = (char: string) => {
    sound.playWashiStroke()
    const nextVal = inputText + char
    setInputText(nextVal)
    onTextChange?.(nextVal)
  }

  const handleTransform = async () => {
    if (!inputText.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    setDiffResult(null)

    try {
      const res = await api.transformRewriteMode({
        text: inputText.trim(),
        mode: selectedMode,
        target_register: selectedMode === 'register' ? targetRegister : undefined,
        context_vi: contextVi.trim() || undefined,
        provider: aiModel.provider || undefined,
        model: aiModel.model || undefined,
      })
      setResult(res)
      sound.playSuccess()

      // Automatically generate diff analysis
      if (res.rewritten_text && res.rewritten_text !== inputText.trim()) {
        setDiffLoading(true)
        try {
          const diff = await api.explainSentenceDiff({
            before: inputText.trim(),
            after: res.rewritten_text,
            provider: aiModel.provider || undefined,
            model: aiModel.model || undefined,
          })
          setDiffResult(diff)
        } catch {
          // Non-blocking for diff
        } finally {
          setDiffLoading(false)
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Không thể thực hiện chuyển đổi phong cách. Vui lòng thử lại.')
      sound.playNeutral()
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setInputText('')
    setContextVi('')
    setSelectedMode('natural')
    setTargetRegister('business')
    setResult(null)
    setDiffResult(null)
    setError(null)
    sound.playNeutral()
  }

  return (
    <div className={`jw-rewrite-modes-workspace ${className}`.trim()} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {error && <Alert tone="error" title="Lỗi">{error}</Alert>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          gap: 'var(--space-md)',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Input & 6-Mode Selection Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Card variant="elevated">
            <CardHeader
              title="Phòng thí nghiệm 6 phong cách diễn đạt (6 Rewrite Modes)"
              actions={
                onOpenRecent ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenRecent}
                    aria-label="Lấy câu từ bài viết gần đây"
                  >
                    📥 Lấy câu gần đây
                  </Button>
                ) : null
              }
            />
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Quick Punctuation Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginRight: '2px', flexShrink: 0 }}>
                    Ký tự nhanh:
                  </span>
                  {['。', '、', '「', '」', '〜', '・', 'を', 'に', 'で', 'が', 'は'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => insertPunctuation(c)}
                      style={{
                        padding: '2px 7px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-japanese)',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--color-foreground)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <Textarea
                  id="rewrite-modes-input"
                  label="Câu tiếng Nhật cần biến đổi phong cách:"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value)
                    onTextChange?.(e.target.value)
                  }}
                  placeholder="Nhập câu tiếng Nhật của bạn muốn biến đổi phong cách..."
                  rows={2}
                  aria-label="Câu tiếng Nhật cần biến đổi phong cách"
                />

                {/* Mode Selection Grid */}
                <div>
                  <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-foreground-secondary)', marginBottom: 'var(--space-xs)' }}>
                    Chọn 1 trong 6 chế độ biến đổi:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {REWRITE_MODES.map((mode) => {
                      const isSelected = selectedMode === mode.id
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            sound.playWashiStroke()
                            setSelectedMode(mode.id)
                          }}
                          style={{
                            padding: '8px 10px',
                            background: isSelected ? 'rgba(99, 102, 241, 0.14)' : 'var(--color-surface)',
                            border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          aria-label={`Chọn chế độ ${mode.label}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span>{mode.icon}</span>
                            <strong style={{ fontSize: 'var(--text-body-sm)', color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground)' }}>
                              {mode.label.split(' (')[0]}
                            </strong>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', lineHeight: 1.3 }}>
                            {mode.description}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sub-option: Target Register if register mode is selected */}
                {selectedMode === 'register' && (
                  <div style={{ maxWidth: '360px' }}>
                    <Select
                      id="target-register-select"
                      label="Văn phong đích (Target Register)"
                      value={targetRegister}
                      onChange={(e) => setTargetRegister(e.target.value as 'casual' | 'polite' | 'business')}
                      aria-label="Văn phong đích"
                    >
                      <option value="casual">Thân mật (Casual / Tự nhiên hàng ngày)</option>
                      <option value="polite">Lịch sự (Polite / Thể Desu-Masu)</option>
                      <option value="business">Thương mại (Business / Keigo công sở)</option>
                    </Select>
                  </div>
                )}

                {/* AI Model Picker */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-xs)' }}>
                  <AIModelPicker
                    variant="inline"
                    value={aiModel}
                    onChange={setAiModel}
                    label="Mô hình AI biến đổi"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  aria-label="Làm mới ô nhập"
                >
                  🔄 Làm mới
                </Button>
                <Button
                  variant="primary"
                  onClick={handleTransform}
                  disabled={!inputText.trim() || loading}
                  aria-label="Thực hiện biến đổi phong cách"
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Spinner size={16} /> Đang chuyển đổi...
                    </span>
                  ) : (
                    '✨ Biến đổi câu theo phong cách này'
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* RIGHT COLUMN: Transformation Result & Linguistic Diff */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {result && (
            <Card variant="ai">
              <CardHeader
                title={`Kết quả: ${result.mode_label_vi}`}
                actions={<Badge tone="success">Hoàn thành</Badge>}
              />
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)', marginBottom: '2px' }}>
                      Câu tiếng Nhật sau khi biến đổi:
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-japanese)' }}>
                      {result.rewritten_text}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-surface-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-body-sm)',
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>Giải thích cách biến đổi:</strong> {result.explanation_vi}
                  </div>

                  {result.key_changes?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-foreground-secondary)', marginBottom: 'var(--space-xs)' }}>
                        Các thay đổi mấu chốt:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-foreground)', fontSize: 'var(--text-body-sm)' }}>
                        {result.key_changes.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Automatic Linguistic Diff */}
          {diffLoading && (
            <Card variant="subtle">
              <CardContent>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: 'var(--space-md)' }}>
                  <Spinner size={20} /> Đang tính toán Linguistic Diff...
                </div>
              </CardContent>
            </Card>
          )}
          {diffResult && <LinguisticDiffViewer diff={diffResult} />}

          {!result && !diffLoading && (
            <Card variant="subtle" style={{ border: '1px dashed var(--color-border)' }}>
              <CardContent style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-foreground-muted)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎨</div>
                <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
                  Chưa có kết quả biến đổi phong cách
                </div>
                <div style={{ fontSize: 'var(--text-caption)', marginTop: '4px' }}>
                  Nhập câu tiếng Nhật ở cột bên trái và chọn 1 trong 6 chế độ để xem sự biến chuyển sắc thái ngôn ngữ tức thì.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
