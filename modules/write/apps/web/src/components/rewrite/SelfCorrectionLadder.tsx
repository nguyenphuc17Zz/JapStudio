import React, { useState } from 'react'
import type { RewriteLabSession, SelfCorrectionAttemptResult } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Spinner } from '../ui/Spinner'
import { RewriteComparisonCard } from './RewriteComparisonCard'
import { SocraticCoachPane } from './SocraticCoachPane'
import { sound } from '../../services/sound'

interface SelfCorrectionLadderProps {
  session: RewriteLabSession
  onSubmitAttempt: (attemptText: string) => Promise<SelfCorrectionAttemptResult | undefined>
  onReveal: () => Promise<void>
  onProceedToTransfer?: () => void
  loading?: boolean
  className?: string
}

export const SelfCorrectionLadder: React.FC<SelfCorrectionLadderProps> = ({
  session,
  onSubmitAttempt,
  onReveal,
  onProceedToTransfer,
  loading = false,
  className = '',
}) => {
  const [attemptInput, setAttemptInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [showCoach, setShowCoach] = useState(false)

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attemptInput.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await onSubmitAttempt(attemptInput.trim())
      if (res) {
        if (res.is_correct) {
          sound.playSuccess()
        } else {
          sound.playNeutral()
        }
      }
      setAttemptInput('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevealClick = async () => {
    if (revealing) return
    setRevealing(true)
    try {
      await onReveal()
      sound.playSuccess()
    } finally {
      setRevealing(false)
    }
  }

  const handleCloneOriginal = () => {
    sound.playWashiStroke()
    setAttemptInput(session.original_text)
  }

  const insertPunctuation = (char: string) => {
    sound.playWashiStroke()
    setAttemptInput((prev) => prev + char)
  }

  const isSelfCorrected = session.status === 'self_corrected'
  const isRevealed = session.status === 'revealed' || session.current_step >= 6

  return (
    <div className={`jw-self-correction-ladder ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* 1. Review Ladder Progress Bar */}
      <Card variant="subtle">
        <CardContent style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-foreground)' }}>
              Tiến trình tự sửa lỗi (Self-Correction Ladder)
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoach((v) => !v)}
                style={{ fontSize: '12px', height: '24px', padding: '0 8px' }}
              >
                {showCoach ? '✕ Đóng Socratic Coach' : '💬 Mở Socratic Coach'}
              </Button>
              <Badge tone={isSelfCorrected ? 'success' : isRevealed ? 'accent' : 'warning'}>
                {isSelfCorrected ? '✨ Đã tự sửa thành công!' : isRevealed ? 'Đã mở đáp án đối chiếu' : `Bước ${session.current_step}/6`}
              </Badge>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '4px',
              height: '6px',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              background: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const active = step <= session.current_step || isSelfCorrected
              return (
                <div
                  key={step}
                  style={{
                    background: isSelfCorrected
                      ? 'var(--color-success)'
                      : active
                      ? 'var(--color-primary)'
                      : 'rgba(255, 255, 255, 0.08)',
                    transition: 'background 0.3s ease',
                  }}
                  title={`Bước ${step}`}
                />
              )
            })}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: 'var(--text-micro)',
              color: 'var(--color-foreground-muted)',
            }}
          >
            <span>1. Phát hiện</span>
            <span>2. Giải thích</span>
            <span>3. Tự sửa</span>
            <span>4. Gợi ý</span>
            <span>5. Mẫu câu</span>
            <span>6. Đối chiếu 4 phương án</span>
          </div>
        </CardContent>
      </Card>

      {/* 2-COLUMN STUDIO LAYOUT */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          gap: 'var(--space-md)',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: REFERENCE & DIAGNOSIS & REVEALED VARIANTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Original sentence & Category Explanation (Zero Leakage) */}
          <Card variant="default">
            <CardHeader
              title="Câu cần xem xét & Chẩn đoán"
              actions={
                session.issue_category_name_vi ? (
                  <Badge tone="warning">{session.issue_category_name_vi}</Badge>
                ) : null
              }
            />
            <CardContent>
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)', marginBottom: '2px' }}>
                  Câu tiếng Nhật gốc của bạn:
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-foreground)', fontFamily: 'var(--font-japanese)' }}>
                  {session.original_text}
                </div>
                {session.context_vi && (
                  <div style={{ marginTop: '4px', fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)' }}>
                    Ý định: {session.context_vi}
                  </div>
                )}
              </div>

              {/* Issue Category Explanation (Zero Leakage) */}
              {session.issue_explanation_vi && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(234, 179, 8, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(234, 179, 8, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>💡</span>
                    <strong style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-warning)' }}>
                      Phân tích lỗi (Chưa tiết lộ lời giải):
                    </strong>
                  </div>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)', lineHeight: 1.6 }}>
                    {session.issue_explanation_vi}
                  </div>
                  {session.target_segment && (
                    <div style={{ marginTop: '6px', fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                      Khu vực cần lưu ý: <code style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{session.target_segment}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Ecosystem Quick Links */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  href={`/kanji`}
                  aria-label="Luyện Kanji trong câu"
                  style={{ fontSize: '11px', height: '26px' }}
                >
                  ✍️ Luyện Kanji
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  href={`/vocabulary`}
                  aria-label="Xem kho từ vựng"
                  style={{ fontSize: '11px', height: '26px' }}
                >
                  ✨ Kho từ vựng
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Clue (If stepped into step 4) */}
          {session.current_step >= 4 && session.clue && (
            <Card variant="subtle" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <CardHeader
                title="Gợi ý tư duy (Step 4: Clue)"
                actions={<Badge tone="accent">Gợi ý #1</Badge>}
              />
              <CardContent>
                <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)', lineHeight: 1.6 }}>
                  🔍 {session.clue}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Pattern & Example (If stepped into step 5) */}
          {session.current_step >= 5 && session.pattern && (
            <Card variant="ai" style={{ borderLeft: '4px solid var(--color-accent)' }}>
              <CardHeader
                title="Mẫu ngữ pháp (Step 5: Pattern Formulation)"
                actions={<Badge tone="ai">Mẫu câu</Badge>}
              />
              <CardContent>
                <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)', lineHeight: 1.6 }}>
                  📐 {session.pattern}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: 4-Way Controlled Comparison Card (When revealed) */}
          {isRevealed && session.revealed_variants && (
            <>
              <RewriteComparisonCard
                variants={session.revealed_variants}
                onCompleteSynthesis={() => {
                  if (onProceedToTransfer) {
                    onProceedToTransfer()
                  }
                }}
              />
              {onProceedToTransfer && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                  <Button
                    variant="secondary"
                    onClick={onProceedToTransfer}
                    aria-label="Chuyển sang bài tập chuyển giao ngữ cảnh"
                  >
                    Làm bài tập chuyển giao ngữ cảnh (Transfer Check) →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: ACTION STUDIO & ATTEMPTS & COACH */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Socratic Coach Toggleable Panel */}
          {showCoach && (
            <SocraticCoachPane session={session} />
          )}

          {/* Attempt Submission Area (When active and not yet revealed) */}
          {!isSelfCorrected && !isRevealed && (
            <Card variant="elevated">
              <CardHeader
                title={`Thử tự sửa câu (Lần thử #${session.attempts.length + 1})`}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRevealClick}
                    disabled={submitting || revealing}
                    aria-label="Xem đáp án đối chiếu"
                  >
                    {revealing ? <Spinner size={16} /> : 'Xem đáp án ngay (Reveal)'}
                  </Button>
                }
              />
              <CardContent>
                <form onSubmit={handleFormSubmit}>
                  {/* Quick Punctuation & Particle Micro-Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '8px',
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCloneOriginal}
                      style={{ fontSize: '11px', height: '22px', padding: '0 6px', marginLeft: 'auto', flexShrink: 0 }}
                      title="Chép câu gốc vào ô nhập để sửa nhanh"
                    >
                      📋 Lấy câu gốc
                    </Button>
                  </div>

                  <Textarea
                    id="self-correction-attempt-input"
                    label="Nhập câu tiếng Nhật đã được bạn tự chỉnh sửa:"
                    value={attemptInput}
                    onChange={(e) => setAttemptInput(e.target.value)}
                    placeholder="Nhập câu tiếng Nhật tự sửa..."
                    rows={3}
                    disabled={submitting || loading}
                    aria-label="Nhập câu tiếng Nhật đã được bạn tự chỉnh sửa"
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!attemptInput.trim() || submitting || loading}
                      aria-label="Kiểm tra câu tự sửa"
                    >
                      {submitting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Spinner size={16} /> Đang đánh giá...
                        </span>
                      ) : (
                        'Kiểm tra câu tự sửa'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Self-Corrected Success Banner */}
          {isSelfCorrected && (
            <Card variant="ai" style={{ border: '2px solid var(--color-success)' }}>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🎉</span>
                    <span style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-success)' }}>
                      Tự sửa lỗi thành công xuất sắc!
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)' }}>
                    Bạn đã làm chủ mẫu câu và tự nhận biết ngữ pháp. Hãy chuyển sang phòng thí nghiệm chuyển giao (Transfer Arena) để áp dụng vào ngữ cảnh hoàn toàn mới!
                  </div>
                  {onProceedToTransfer && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="primary"
                        onClick={onProceedToTransfer}
                        aria-label="Chuyển sang Transfer Check"
                      >
                        🚀 Sang Transfer Check
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real-time Feedback & Attempts Log */}
          {session.attempts.length > 0 && (
            <Card variant="subtle">
              <CardHeader title="Lịch sử các lần tự sửa của bạn" />
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {session.attempts.map((att, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: att.is_correct
                          ? 'rgba(34, 197, 94, 0.08)'
                          : 'var(--color-surface)',
                        border: `1px solid ${
                          att.is_correct
                            ? 'rgba(34, 197, 94, 0.3)'
                            : 'var(--color-border)'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                          <Badge tone={att.is_correct ? 'success' : 'neutral'}>
                            Lần #{att.attempt_number}
                          </Badge>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-body)', fontFamily: 'var(--font-japanese)' }}>{att.text}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                          <Badge tone={att.is_correct ? 'success' : 'warning'}>
                            {att.score} điểm
                          </Badge>
                          {att.quality_delta > 0 && (
                            <Badge tone="success">+{att.quality_delta} cải thiện</Badge>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)', marginTop: '4px' }}>
                        {att.feedback_vi}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
