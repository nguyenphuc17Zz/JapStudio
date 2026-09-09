import React, { useState } from 'react'
import type { RewriteVariants } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Alert } from '../ui/Alert'
import { AIWritingAssistantDrawer } from '../ai/AIWritingAssistantDrawer'
import { sound } from '../../services/sound'

interface RewriteComparisonCardProps {
  variants: RewriteVariants
  onCompleteSynthesis?: (sentence: string) => void
  className?: string
}

export const RewriteComparisonCard: React.FC<RewriteComparisonCardProps> = ({
  variants,
  onCompleteSynthesis,
  className = '',
}) => {
  const [synthesisText, setSynthesisText] = useState('')
  const [synthesisSubmitted, setSynthesisSubmitted] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopyText = (key: string, text: string) => {
    sound.playWashiStroke()
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1500)
  }

  const handleSynthesisSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!synthesisText.trim()) return
    sound.playSuccess()
    setSynthesisSubmitted(true)
    onCompleteSynthesis?.(synthesisText.trim())
  }

  const insertPunctuation = (char: string) => {
    sound.playWashiStroke()
    setSynthesisText((prev) => prev + char)
  }

  return (
    <Card variant="elevated" className={`jw-rewrite-comparison-card ${className}`}>
      <CardHeader
        title="Đối chiếu 4 phương án (Controlled Comparison Lab)"
        actions={<Badge tone="accent">Step 6: Controlled Reveal</Badge>}
      />
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* A. Original */}
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <Badge tone="neutral">A. Câu gốc của bạn (Original)</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyText('orig', variants.original)}
                style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
              >
                {copiedKey === 'orig' ? '✓ Đã sao chép' : '📋 Sao chép'}
              </Button>
            </div>
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 500, color: 'var(--color-foreground)' }}>
              {variants.original}
            </div>
          </div>

          {/* B. Minimal Correction */}
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <Badge tone="accent">B. Sửa tối thiểu (Minimal Correction)</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyText('min', variants.minimal_correction)}
                style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
              >
                {copiedKey === 'min' ? '✓ Đã sao chép' : '📋 Sao chép'}
              </Button>
            </div>
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-primary)', marginBottom: 'var(--space-xs)' }}>
              {variants.minimal_correction}
            </div>
            {variants.explanations?.minimal_correction && (
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                {variants.explanations.minimal_correction}
              </div>
            )}
          </div>

          {/* C. Natural Japanese */}
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'rgba(34, 197, 94, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <Badge tone="success">C. Thuần Nhật tự nhiên (Natural Japanese)</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyText('nat', variants.natural_japanese)}
                style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
              >
                {copiedKey === 'nat' ? '✓ Đã sao chép' : '📋 Sao chép'}
              </Button>
            </div>
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-success)', marginBottom: 'var(--space-xs)' }}>
              {variants.natural_japanese}
            </div>
            {variants.explanations?.natural_japanese && (
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                {variants.explanations.natural_japanese}
              </div>
            )}
          </div>

          {/* D. Formal / Business Alternative */}
          {variants.formal_business && (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'rgba(168, 85, 247, 0.05)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                <Badge tone="ai">D. Trang trọng / Thương mại (Business Formal)</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyText('biz', variants.formal_business!)}
                  style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                >
                  {copiedKey === 'biz' ? '✓ Đã sao chép' : '📋 Sao chép'}
                </Button>
              </div>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-accent)', marginBottom: 'var(--space-xs)' }}>
                {variants.formal_business}
              </div>
              {variants.explanations?.formal_business && (
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                  {variants.explanations.formal_business}
                </div>
              )}
            </div>
          )}

          {/* E. Casual Variant */}
          {variants.casual_variant && (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--color-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                <Badge tone="neutral">E. Thân mật (Casual / Conversational)</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyText('cas', variants.casual_variant!)}
                  style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                >
                  {copiedKey === 'cas' ? '✓ Đã sao chép' : '📋 Sao chép'}
                </Button>
              </div>
              <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-foreground)' }}>
                {variants.casual_variant}
              </div>
            </div>
          )}

          {/* Anti-Copy-Paste Requirement: Synthesis Prompt */}
          <div
            style={{
              marginTop: 'var(--space-sm)',
              padding: 'var(--space-md)',
              background: 'rgba(99, 102, 241, 0.04)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-primary)', marginBottom: 'var(--space-xs)' }}>
              🎯 Yêu cầu củng cố mẫu câu (Synthesis Challenge):
            </div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)', marginBottom: 'var(--space-sm)' }}>
              {variants.synthesis_prompt_vi || 'Hãy viết 1 câu tiếng Nhật mới áp dụng cấu trúc ngữ pháp vừa học.'}
            </div>

            {synthesisSubmitted ? (
              <Alert tone="success" title="Đã ghi nhận câu củng cố!">
                Bạn đã hoàn thành bước tổng hợp kiến thức từ phòng thí nghiệm viết câu.
              </Alert>
            ) : (
              <form onSubmit={handleSynthesisSubmit}>
                {/* Synthesis AI Scaffolding Drawer */}
                <AIWritingAssistantDrawer
                  title="Gợi ý Cặp Liên Từ Đối Chiếu & Tổng Hợp"
                  prompt_vi={variants.synthesis_prompt_vi || 'Viết 1 câu củng cố kiến thức từ vựng/ngữ pháp vừa học.'}
                  context_vi={`Câu gốc: ${variants.original}\nCâu sửa tự nhiên: ${variants.natural_japanese}`}
                  goldenPhrases={[
                    { japanese: '一方で、', meaning: 'Mặt khác / Ngược lại', type: 'connector' },
                    { japanese: '〜に対して、', meaning: 'Đối lập với...', type: 'connector' },
                    { japanese: 'その反面、', meaning: 'Mặt trái lại là...', type: 'connector' },
                    { japanese: '〜を踏まえて、', meaning: 'Dựa trên cơ sở...', type: 'expression' },
                    { japanese: 'それに加えて、', meaning: 'Thêm vào đó...', type: 'connector' },
                  ]}
                  onInsertPhrase={(phrase) => insertPunctuation(phrase)}
                />

                {/* Micro punctuation bar */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {['。', '、', '「', '」', '〜', '・', 'を', 'に', 'で', 'が', 'は'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => insertPunctuation(c)}
                      style={{
                        padding: '1px 6px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-japanese)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--color-foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Textarea
                  id="synthesis-sentence-input"
                  label="Câu tiếng Nhật mới của bạn"
                  value={synthesisText}
                  onChange={(e) => setSynthesisText(e.target.value)}
                  placeholder="Nhập câu mới áp dụng cùng cấu trúc..."
                  rows={2}
                  aria-label="Nhập câu mới áp dụng cùng cấu trúc"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!synthesisText.trim()}
                    aria-label="Xác nhận câu mới"
                  >
                    Xác nhận câu mới
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
