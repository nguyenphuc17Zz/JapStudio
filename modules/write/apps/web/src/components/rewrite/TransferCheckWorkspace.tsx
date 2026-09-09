import React, { useState } from 'react'
import type { RewriteLabSession, TransferTask, TransferEvaluation } from '../../types/api'
import { api } from '../../services/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Alert } from '../ui/Alert'
import { Spinner } from '../ui/Spinner'
import { sound } from '../../services/sound'

interface TransferCheckWorkspaceProps {
  session?: RewriteLabSession | null
  onTaskGenerated?: (task: TransferTask) => void
  onEvaluationCompleted?: (evalResult: TransferEvaluation) => void
  className?: string
}

export const TransferCheckWorkspace: React.FC<TransferCheckWorkspaceProps> = ({
  session,
  onTaskGenerated,
  onEvaluationCompleted,
  className = '',
}) => {
  const [task, setTask] = useState<TransferTask | null>(session?.transfer_task || null)
  const [transferInput, setTransferInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [evaluation, setEvaluation] = useState<TransferEvaluation | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const insertPunctuation = (char: string) => {
    sound.playWashiStroke()
    setTransferInput((prev) => prev + char)
  }

  const handleGenerateTask = async () => {
    if (!session?.id || generating) return
    setGenerating(true)
    setError(null)
    try {
      const generated = await api.generateTransferTask(session.id)
      setTask(generated)
      onTaskGenerated?.(generated)
      sound.playSuccess()
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Không thể tạo ngữ cảnh chuyển giao mới.')
      sound.playNeutral()
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.id || !transferInput.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const evalRes = await api.submitTransferAttempt(session.id, {
        transfer_text: transferInput.trim(),
      })
      setEvaluation(evalRes)
      onEvaluationCompleted?.(evalRes)
      if (evalRes.transferred_successfully) {
        sound.playSuccess()
      } else {
        sound.playNeutral()
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Không thể đánh giá câu chuyển giao. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setTask(null)
    setTransferInput('')
    setEvaluation(null)
    setShowHint(false)
    setError(null)
    sound.playNeutral()
  }

  return (
    <div className={`jw-transfer-check-workspace ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Header Card & Concept Summary */}
      <Card variant="elevated">
        <CardHeader
          title="Đấu trường chuyển giao mẫu câu (Transfer Check Arena)"
          actions={
            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
              {task && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  aria-label="Làm mới đề bài chuyển giao"
                >
                  🔄 Đổi đề bài khác
                </Button>
              )}
              {session?.target_concept ? (
                <Badge tone="accent">Mẫu: {session.target_concept}</Badge>
              ) : (
                <Badge tone="neutral">Transfer Challenge</Badge>
              )}
            </div>
          }
        />
        <CardContent>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)', lineHeight: 1.6 }}>
            Thử thách chuyển giao kiểm tra xem bạn có thực sự làm chủ mẫu câu để áp dụng linh hoạt vào một ngữ cảnh hoàn toàn mới hay không, tránh thói quen học vẹt hoặc sao chép nguyên xi.
          </div>

          {!task && session && (
            <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="primary"
                onClick={handleGenerateTask}
                disabled={generating}
                aria-label="Tạo đề bài ngữ cảnh mới"
              >
                {generating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Spinner size={16} /> Đang tạo ngữ cảnh mới...
                  </span>
                ) : (
                  '🎯 Tạo đề bài ngữ cảnh mới từ AI'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <Alert tone="error" title="Lỗi">{error}</Alert>}

      {/* 2-COLUMN STUDIO LAYOUT */}
      {task && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
            gap: 'var(--space-md)',
            alignItems: 'start',
          }}
        >
          {/* LEFT COLUMN: Novel Scenario & Hints */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Card variant="ai">
              <CardHeader
                title="Đề bài tình huống mới (Novel Scenario)"
                actions={<Badge tone="ai">Áp dụng: {task.required_pattern}</Badge>}
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
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)', marginBottom: '4px' }}>
                      Tình huống bằng tiếng Việt:
                    </div>
                    <div style={{ fontSize: 'var(--text-title)', fontWeight: 600, color: 'var(--color-foreground)' }}>
                      {task.scenario_prompt_vi}
                    </div>
                  </div>

                  {/* Context Hint toggle */}
                  {task.context_hint_vi && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHint(!showHint)}
                        aria-label="Xem gợi ý từ vựng"
                      >
                        {showHint ? 'Ẩn gợi ý' : '💡 Xem gợi ý từ vựng'}
                      </Button>
                      {showHint && (
                        <div
                          style={{
                            marginTop: 'var(--space-xs)',
                            padding: '10px 14px',
                            background: 'rgba(234, 179, 8, 0.08)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(234, 179, 8, 0.25)',
                            fontSize: 'var(--text-body-sm)',
                            color: 'var(--color-foreground)',
                          }}
                        >
                          {task.context_hint_vi}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Writing Form & Transfer Evaluation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Card variant="elevated">
              <CardHeader title="Viết câu áp dụng mẫu" />
              <CardContent>
                <form onSubmit={handleSubmitTransfer}>
                  {/* Quick Punctuation Bar */}
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
                  </div>

                  <Textarea
                    id="transfer-sentence-input"
                    label="Viết câu tiếng Nhật mới áp dụng đúng mẫu:"
                    value={transferInput}
                    onChange={(e) => setTransferInput(e.target.value)}
                    placeholder="Nhập câu tiếng Nhật mới..."
                    rows={3}
                    disabled={submitting}
                    aria-label="Viết câu tiếng Nhật mới áp dụng đúng mẫu"
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!transferInput.trim() || submitting}
                      aria-label="Nộp bài chuyển giao"
                    >
                      {submitting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Spinner size={16} /> Đang kiểm tra chuyển giao...
                        </span>
                      ) : (
                        'Kiểm tra khả năng chuyển giao'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Evaluation Result */}
            {evaluation && (
              <Card
                variant="elevated"
                style={{
                  border: `2px solid ${
                    evaluation.transferred_successfully ? 'var(--color-success)' : 'var(--color-warning)'
                  }`,
                }}
              >
                <CardHeader
                  title={
                    evaluation.transferred_successfully
                      ? '🎉 Chuyển giao thành công!'
                      : 'Chưa đạt chuẩn chuyển giao hoàn toàn'
                  }
                  actions={
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <Badge tone={evaluation.transferred_successfully ? 'success' : 'warning'}>
                        {evaluation.score} điểm
                      </Badge>
                      <Badge tone={evaluation.pattern_applied_correctly ? 'accent' : 'error'}>
                        {evaluation.pattern_applied_correctly ? 'Mẫu câu chính xác' : 'Mẫu câu chưa chuẩn'}
                      </Badge>
                    </div>
                  }
                />
                <CardContent>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ fontSize: 'var(--text-body)', color: 'var(--color-foreground)', lineHeight: 1.6 }}>
                      {evaluation.feedback_vi}
                    </div>

                    {evaluation.strengths?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-success)', marginBottom: '4px' }}>
                          Điểm mạnh:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: 'var(--text-body-sm)' }}>
                          {evaluation.strengths.map((s, idx) => (
                            <li key={idx} style={{ color: 'var(--color-foreground)' }}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.improvement_points?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '4px' }}>
                          Điểm cần lưu ý thêm:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: 'var(--text-body-sm)' }}>
                          {evaluation.improvement_points.map((p, idx) => (
                            <li key={idx} style={{ color: 'var(--color-foreground)' }}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.exemplar_sentence && (
                      <div
                        style={{
                          padding: '10px 14px',
                          background: 'rgba(99, 102, 241, 0.08)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}
                      >
                        <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
                          Câu mẫu chuẩn tham khảo:
                        </div>
                        <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-japanese)' }}>
                          {evaluation.exemplar_sentence}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
