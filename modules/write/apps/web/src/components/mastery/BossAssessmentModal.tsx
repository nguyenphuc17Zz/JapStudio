import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import type {
  BossTask,
  BossEvaluationResult,
  BadgeTone,
} from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Alert } from '../ui/Alert'
import { Spinner } from '../ui/Spinner'
import { Tabs } from '../ui/Tabs'
import { AIModelPicker } from '../ai/AIModelPicker'
import { Icon } from '../icons/Icon'

export interface BossAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  initialTaskId?: string
  onCompleted?: (result: BossEvaluationResult) => void
}

const GENRE_LABELS: Record<string, string> = {
  business_email: 'Email Thương Mại (Business Email)',
  absence_message: 'Tin Nhắn Báo Nghỉ (Absence Notice)',
  complaint: 'Thư Khiếu Nại (Formal Complaint)',
  explanation: 'Giải Thích Sự Cố (Incident Explanation)',
  progress_update: 'Báo Cáo Tiến Độ (Progress Report / Hou-Ren-So)',
  opinion_paragraph: 'Đoạn Văn Nghị Luận (Opinion Paragraph)',
}

function verdictTone(verdict: string): BadgeTone {
  switch (verdict) {
    case 'PASS_WITH_DISTINCTION':
      return 'success'
    case 'PASS':
      return 'success'
    case 'NEEDS_RETRY':
      return 'warning'
    case 'FAILED':
      return 'error'
    default:
      return 'neutral'
  }
}

function verdictLabelVi(verdict: string): string {
  switch (verdict) {
    case 'PASS_WITH_DISTINCTION':
      return '🏆 XUẤT SẮC (PASS WITH DISTINCTION)'
    case 'PASS':
      return '✅ ĐẠT CHUẨN (PASS)'
    case 'NEEDS_RETRY':
      return '⚠️ CẦN RÈN LUYỆN THÊM (NEEDS RETRY)'
    case 'FAILED':
      return '❌ CHƯA ĐẠT (FAILED)'
    default:
      return verdict
  }
}

export function BossAssessmentModal({
  isOpen,
  onClose,
  initialTaskId,
  onCompleted,
}: BossAssessmentModalProps) {
  const [task, setTask] = useState<BossTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Writing state
  const [learnerText, setLearnerText] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60)
  const [timerActive, setTimerActive] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)

  // Evaluation state
  const [submitting, setSubmitting] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<BossEvaluationResult | null>(null)
  const [selectedRewriteTab, setSelectedRewriteTab] = useState<'minimal' | 'natural' | 'business'>('natural')

  // AI Provider state
  const [aiProvider, setAiProvider] = useState<string | undefined>()
  const [aiModel, setAiModel] = useState<string | undefined>()

  // Fetch or generate task
  const initTask = useCallback(async () => {
    setLoading(true)
    setError(null)
    setEvaluationResult(null)
    setLearnerText('')
    try {
      if (initialTaskId) {
        const pending = await api.getPendingBossTask()
        if (pending && pending.id === initialTaskId) {
          setTask(pending)
          setSecondsRemaining((pending.time_limit_minutes || 15) * 60)
          setTimerActive(true)
          return
        }
      }
      const pending = await api.getPendingBossTask()
      if (pending) {
        setTask(pending)
        setSecondsRemaining((pending.time_limit_minutes || 15) * 60)
        setTimerActive(true)
      } else {
        const newTask = await api.generateBossTask()
        setTask(newTask)
        setSecondsRemaining((newTask.time_limit_minutes || 15) * 60)
        setTimerActive(true)
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể khởi tạo bài kiểm tra Boss.')
    } finally {
      setLoading(false)
    }
  }, [initialTaskId])

  useEffect(() => {
    if (isOpen) {
      void initTask()
    } else {
      setTimerActive(false)
      setTask(null)
      setEvaluationResult(null)
    }
  }, [isOpen, initTask])

  // Timer countdown
  useEffect(() => {
    if (!timerActive || !task || evaluationResult) return
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
      setDurationSeconds((d) => d + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerActive, task, evaluationResult])

  // Generate new task
  const handleGenerateNew = async (genre?: string) => {
    setGenerating(true)
    setError(null)
    setEvaluationResult(null)
    setLearnerText('')
    try {
      const newTask = await api.generateBossTask({
        task_type: genre,
        provider: aiProvider,
        model: aiModel,
      })
      setTask(newTask)
      setSecondsRemaining((newTask.time_limit_minutes || 15) * 60)
      setDurationSeconds(0)
      setTimerActive(true)
    } catch (err: any) {
      setError(err?.message || 'Không thể sinh đề Boss mới.')
    } finally {
      setGenerating(false)
    }
  }

  // Submit writing
  const handleSubmit = async () => {
    if (!task || !learnerText.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.submitBossWritingTask(task.id, {
        text: learnerText.trim(),
        duration_seconds: durationSeconds,
        provider: aiProvider,
        model: aiModel,
      })
      setEvaluationResult(result)
      setTimerActive(false)
      if (onCompleted) {
        onCompleted(result)
      }
    } catch (err: any) {
      setError(err?.message || 'Chấm bài thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const charCount = learnerText.trim().length
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="jw-drill-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose()
        }
      }}
    >
      <div
        className="jw-drill-modal-content"
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-md) var(--space-lg)',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="target" size={16} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  ĐẤU TRƯỜNG ĐÁNH GIÁ BOSS (WRITING MASTERY BOSS ASSESSMENT)
                </h2>
                <Badge tone="error">KHÔNG TRỢ GIÚP</Badge>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-foreground-secondary)', margin: '2px 0 0' }}>
                Thử thách năng lực viết tiếng Nhật thực tế không gợi ý, không từ điển dịch ngữ.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {!evaluationResult && task && (
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: secondsRemaining < 120 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${secondsRemaining < 120 ? '#ef4444' : 'var(--color-border)'}`,
                  color: secondsRemaining < 120 ? '#ef4444' : 'var(--color-foreground)',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="clock" size={14} />
                <span>{formatTime(secondsRemaining)}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label="Đóng" />
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {error && (
            <Alert tone="error" title="Thông báo lỗi">
              {error}
            </Alert>
          )}

          {loading ? (
            <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Spinner size={32} />
              <span style={{ fontSize: 13, color: 'var(--color-foreground-secondary)' }}>
                Đang chuẩn bị đề thi Boss từ kho bối cảnh thực tế...
              </span>
            </div>
          ) : !evaluationResult && task ? (
            /* Writing Phase */
            <>
              {/* Scenario Context Card */}
              <Card variant="default">
                <CardHeader
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      <Badge tone="accent">{GENRE_LABELS[task.task_type] || task.task_type}</Badge>
                      <Badge tone="neutral">JLPT {task.jlpt_level}</Badge>
                      <Badge tone="register">Văn phong: {task.target_register}</Badge>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{task.title}</h3>
                    </div>
                  }
                />
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <div>
                    <span className="jw-card-eyebrow">Tình huống thực tế</span>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, lineHeight: 1.6 }}>{task.situation_vi}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                      <span className="jw-card-eyebrow">Đối tượng tiếp nhận</span>
                      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>{task.audience}</p>
                    </div>
                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                      <span className="jw-card-eyebrow">Quan hệ giao tiếp</span>
                      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>{task.relationship}</p>
                    </div>
                  </div>

                  {/* Required Constraints */}
                  <div>
                    <span className="jw-card-eyebrow">Các ràng buộc bắt buộc (Required Constraints)</span>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {task.required_constraints.map((req, idx) => (
                        <li key={idx} style={{ color: 'var(--color-foreground)' }}>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {task.forbidden_patterns && task.forbidden_patterns.length > 0 && (
                    <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>⚠️ ĐIỀU CẤM KỴ / TRÁNH DÙNG:</span>
                      <span style={{ fontSize: 12.5, color: 'var(--color-foreground)', marginLeft: 8 }}>
                        {task.forbidden_patterns.join(' • ')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Editor Shell */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="boss-editor-textarea" style={{ fontSize: 13, fontWeight: 700 }}>
                    Khu vực viết tiếng Nhật (Không gợi ý):
                  </label>
                  <span
                    style={{
                      fontSize: 12,
                      color:
                        charCount < task.target_word_count_min
                          ? 'var(--color-warning)'
                          : charCount > task.target_word_count_max
                          ? 'var(--color-danger)'
                          : 'var(--color-success)',
                      fontWeight: 600,
                    }}
                  >
                    {charCount} / {task.target_word_count_min}-{task.target_word_count_max} ký tự
                  </span>
                </div>

                <Textarea
                  id="boss-editor-textarea"
                  value={learnerText}
                  onChange={(e) => setLearnerText(e.target.value)}
                  placeholder="Hãy vận dụng tư duy tiếng Nhật tự thân để viết bài hoàn chỉnh theo các ràng buộc trên..."
                  rows={8}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14.5,
                    lineHeight: 1.7,
                    padding: 'var(--space-md)',
                  }}
                />
              </div>

              {/* AI Config & Submit bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-md)',
                  paddingTop: 'var(--space-sm)',
                  borderTop: '1px solid var(--color-border-subtle)',
                }}
              >
                <div style={{ minWidth: 260 }}>
                  <AIModelPicker
                    variant="compact"
                    value={{ provider: aiProvider, model: aiModel }}
                    onChange={({ provider, model }) => {
                      setAiProvider(provider)
                      setAiModel(model)
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={generating}
                    onClick={() => void handleGenerateNew()}
                  >
                    Đổi Đề Khác
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon="send"
                    loading={submitting}
                    disabled={charCount === 0 || submitting}
                    onClick={() => void handleSubmit()}
                  >
                    Nộp Bài Đánh Giá Boss
                  </Button>
                </div>
              </div>
            </>
          ) : evaluationResult ? (
            /* Post-Evaluation Dossier */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {/* Verdict Banner */}
              <div
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-lg)',
                  background:
                    evaluationResult.overall_score >= 75
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
                  border: `1px solid ${
                    evaluationResult.overall_score >= 75 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-md)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <Badge tone={verdictTone(evaluationResult.verdict)}>
                      {verdictLabelVi(evaluationResult.verdict)}
                    </Badge>
                    {evaluationResult.historical_comparison.has_baseline && (
                      <Badge tone={evaluationResult.historical_comparison.score_delta >= 0 ? 'success' : 'warning'}>
                        {evaluationResult.historical_comparison.score_delta >= 0 ? '+' : ''}
                        {evaluationResult.historical_comparison.score_delta} so với bài trước
                      </Badge>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--color-foreground)' }}>
                    {evaluationResult.feedback_vi}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: evaluationResult.overall_score >= 75 ? 'var(--nihon-moegi, #10b981)' : '#ef4444' }}>
                    {Math.round(evaluationResult.overall_score)}
                    <span style={{ fontSize: 16, color: 'var(--color-foreground-secondary)' }}>/100</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>Điểm Thẩm Định Boss</span>
                </div>
              </div>

              {/* 8-Dimension Scores Grid */}
              <div>
                <span className="jw-card-eyebrow">Bảng Điểm Thẩm Định 8 Chiều Năng Lực</span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'var(--space-sm)',
                    marginTop: 'var(--space-xs)',
                  }}
                >
                  {Object.entries(evaluationResult.scores).map(([dimKey, scoreVal]) => (
                    <div
                      key={dimKey}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--color-foreground-secondary)' }}>{dimKey}</span>
                        <span style={{ fontWeight: 700, color: scoreVal >= 75 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                          {Math.round(scoreVal)}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${scoreVal}%`,
                            height: '100%',
                            background: scoreVal >= 75 ? 'var(--nihon-moegi, #10b981)' : 'var(--nihon-yamabuki, #f59e0b)',
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Critical Gaps */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                <div style={{ padding: 'var(--space-md)', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>✦ ĐIỂM SÁNG ĐÃ THỂ HIỆN:</span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {evaluationResult.strengths.map((str, sIdx) => (
                      <li key={sIdx}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>✦ LỖ HỔNG CẦN KHẮC PHỤC:</span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {evaluationResult.critical_gaps.map((gap, gIdx) => (
                      <li key={gIdx}>{gap}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Regression Alerts if any */}
              {evaluationResult.regression_diagnoses && evaluationResult.regression_diagnoses.length > 0 && (
                <div style={{ padding: 'var(--space-md)', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                    ⚠️ CẢNH BÁO THOÁI TRÀO (REGRESSION DETECTED):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {evaluationResult.regression_diagnoses.map((diag, dIdx) => (
                      <p key={dIdx} style={{ margin: 0, fontSize: 13 }}>
                        <strong>[{diag.category} / {diag.weakness_subtype}]:</strong> {diag.diagnosis_vi}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 3-Tier Native Model Rewrites Tabs */}
              <Card variant="ai">
                <CardHeader
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <Icon name="sparkles" size={16} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        3 TẦNG VĂN BẢN MẪU NÂNG CAO (NATIVE REWRITE LADDER)
                      </span>
                    </div>
                  }
                />
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <Tabs
                    variant="pills"
                    items={[
                      { id: 'minimal', label: '1. Sửa Lỗi Tối Thiểu (Minimal Fix)' },
                      { id: 'natural', label: '2. Tự Nhiên Chuẩn Nhật (Native Polish)' },
                      { id: 'business', label: '3. Kính Ngữ Thương Mại (Business Keigo)' },
                    ]}
                    value={selectedRewriteTab}
                    onChange={(val) => setSelectedRewriteTab(val as any)}
                  />

                  <div
                    style={{
                      padding: 'var(--space-md)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-subtle)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedRewriteTab === 'minimal'
                      ? evaluationResult.rewrites.minimal_fix
                      : selectedRewriteTab === 'natural'
                      ? evaluationResult.rewrites.natural_polish
                      : evaluationResult.rewrites.business_mastery}
                  </div>

                  {evaluationResult.rewrites.polish_notes_vi && (
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-foreground-secondary)', fontStyle: 'italic' }}>
                      💡 {evaluationResult.rewrites.polish_notes_vi}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Action Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                <Button variant="secondary" onClick={() => void handleGenerateNew()}>
                  Thử Thách Đề Boss Khác
                </Button>
                <Button variant="primary" onClick={onClose}>
                  Hoàn Tất & Xem Bảng Làm Chủ
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
