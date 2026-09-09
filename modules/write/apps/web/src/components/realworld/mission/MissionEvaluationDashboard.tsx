import React, { useState } from 'react'
import type { MissionEvaluationResponse, Mission10Dimensions, MissionDimensionScore } from '../../../types/api'
import { Card, CardContent, CardHeader } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Alert } from '../../ui/Alert'

interface MissionEvaluationDashboardProps {
  evaluation: MissionEvaluationResponse
  learnerText: string
  onTransitionToSimulation: () => void
  onTransitionToRewriteLab: () => void
  onRetry: () => void
  isTransitioning?: boolean
}

interface DimensionMeta {
  key: keyof Mission10Dimensions
  label_vi: string
  label_ja: string
  icon: string
}

const DIMENSIONS_LIST: DimensionMeta[] = [
  { key: 'task_completion', label_vi: 'Mục tiêu giao tiếp', label_ja: 'タスク達成', icon: '' },
  { key: 'factual_completeness', label_vi: 'Đầy đủ thông tin', label_ja: '情報完全性', icon: '' },
  { key: 'naturalness', label_vi: 'Độ tự nhiên', label_ja: '自然さ', icon: '' },
  { key: 'grammar', label_vi: 'Ngữ pháp & Trợ từ', label_ja: '文法・助詞', icon: '' },
  { key: 'vocabulary', label_vi: 'Từ vựng & Thuật ngữ', label_ja: '語彙', icon: '' },
  { key: 'register', label_vi: 'Văn phong (Register)', label_ja: '文体・位相', icon: '' },
  { key: 'politeness', label_vi: 'Mức độ lịch thiệp (Keigo)', label_ja: '丁寧さ・敬語', icon: '' },
  { key: 'tone', label_vi: 'Sắc thái cảm xúc (Tone)', label_ja: 'トーン・ニュアンス', icon: '' },
  { key: 'clarity', label_vi: 'Độ sáng sủa & Mạch lạc', label_ja: '明瞭さ', icon: '' },
  { key: 'discourse', label_vi: 'Bố cục & Cấu trúc (Discourse)', label_ja: '構成・談話', icon: '' },
]

export const MissionEvaluationDashboard: React.FC<MissionEvaluationDashboardProps> = ({
  evaluation,
  learnerText,
  onTransitionToSimulation,
  onTransitionToRewriteLab,
  onRetry,
  isTransitioning = false,
}) => {
  const [selectedDimension, setSelectedDimension] = useState<keyof Mission10Dimensions | null>(null)

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'var(--color-success)'
    if (score >= 70) return 'var(--color-accent)'
    if (score >= 50) return 'var(--color-warning)'
    return 'var(--color-error)'
  }

  const getStatusBadge = (status: MissionDimensionScore['status']) => {
    switch (status) {
      case 'excellent':
        return { text: 'Xuất sắc', bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' }
      case 'good':
        return { text: 'Tốt', bg: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)' }
      case 'needs_work':
        return { text: 'Cần sửa', bg: 'rgba(234, 179, 8, 0.15)', color: 'var(--color-warning)' }
      default:
        return { text: 'Chưa đạt', bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)' }
    }
  }

  return (
    <div className="mission-evaluation-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Overview Score Banner */}
      <Card variant="ai">
        <CardContent>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: 'var(--radius-full)',
                  background: `conic-gradient(${getScoreColor(evaluation.overall_score)} ${evaluation.overall_score * 3.6}deg, rgba(255, 255, 255, 0.08) 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, color: getScoreColor(evaluation.overall_score) }}>
                    {evaluation.overall_score}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-foreground-muted)' }}>/ 100</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-title)', fontWeight: 700 }}>
                    {evaluation.passed ? '🎉 Hoàn thành Nhiệm vụ' : '⚡ Cần hoàn thiện thêm'}
                  </h3>
                  <span
                    style={{
                      fontSize: 'var(--text-micro)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: evaluation.passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                      color: evaluation.passed ? 'var(--color-success)' : 'var(--color-warning)',
                    }}
                  >
                    {evaluation.passed ? 'ĐẠT YÊU CẦU' : 'CẦN CHỈNH SỬA'}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                  Đã đánh giá toàn diện trên 10 tiêu chuẩn ngôn ngữ & giao tiếp thực tế Nhật Bản.
                </div>
              </div>
            </div>

            {/* Quick Transition Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="md"
                onClick={onTransitionToSimulation}
                disabled={isTransitioning}
              >
                💬 Chuyển sang Đối thoại Mô phỏng
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={onTransitionToRewriteLab}
              >
                🧪 Sửa câu tại Rewrite Lab
              </Button>

              <Button
                variant="ghost"
                size="md"
                onClick={onRetry}
              >
                Viết lại bài này
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learner's Submitted Text Review */}
      <Card variant="subtle">
        <CardContent>
          <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Bài viết tiếng Nhật bạn đã gửi:
          </div>
          <div style={{ fontSize: '15px', color: 'var(--color-foreground)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap' }}>
            {learnerText}
          </div>
        </CardContent>
      </Card>

      {/* Weakness Mastery Updated Banner */}
      {evaluation.weakness_mastery_updated && (
        <Alert
          tone="success"
          title="Đã ghi nhận tiến bộ điểm yếu (Weakness Mastery Progress)"
        >
          {evaluation.weakness_feedback_summary ||
            'Hệ thống AI Writing Intelligence đã cập nhật chỉ số cải thiện kỹ năng của bạn dựa trên kết quả bài viết này.'}
        </Alert>
      )}

      {/* 10-Dimensional Breakdown Grid */}
      <Card variant="default">
        <CardHeader
          title="Bảng điểm 10 Chiều (10-Dimensional Communicative & Linguistic Scores)"
        />
        <CardContent>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-sm)',
            }}
          >
            {DIMENSIONS_LIST.map((dim) => {
              const dimScore = evaluation.dimensions[dim.key]
              if (!dimScore) return null
              const isSelected = selectedDimension === dim.key
              const badge = getStatusBadge(dimScore.status)

              return (
                <div
                  key={dim.key}
                  onClick={() => setSelectedDimension(isSelected ? null : dim.key)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-surface-subtle)',
                    border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-caption)', color: 'var(--color-foreground)' }}>
                        {dim.label_vi}
                      </span>
                      <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                        ({dim.label_ja})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.text}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)', color: getScoreColor(dimScore.score) }}>
                        {dimScore.score}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: '5px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                      marginBottom: '6px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${dimScore.score}%`,
                        background: getScoreColor(dimScore.score),
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>

                  {/* Feedback Snippet */}
                  <div
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-foreground-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {dimScore.feedback_vi}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Required Points & Constraints Verification */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        {/* Required Points Checklist */}
        <Card variant="default">
          <CardHeader
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>
                  Kiểm tra các điểm thông tin bắt buộc
                </span>
              </div>
            }
          />
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {evaluation.required_points.map((rp) => {
                const isSatisfied = rp.status === 'satisfied'
                const isPartial = rp.status === 'partially_satisfied'
                return (
                  <div
                    key={rp.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSatisfied
                        ? 'rgba(34, 197, 94, 0.06)'
                        : isPartial
                        ? 'rgba(234, 179, 8, 0.06)'
                        : 'rgba(239, 68, 68, 0.06)',
                      border: `1px solid ${
                        isSatisfied ? 'rgba(34, 197, 94, 0.2)' : isPartial ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span>{isSatisfied ? '✅' : isPartial ? '⚠️' : '❌'}</span>
                      <strong style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground)' }}>
                        {rp.description}
                      </strong>
                    </div>
                    <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-secondary)', paddingLeft: '22px' }}>
                      {rp.explanation_vi}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Strengths & Improvements */}
        <Card variant="default">
          <CardHeader
            title="Điểm mạnh & Hướng khắc phục"
          />
          <CardContent>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-caption)', color: 'var(--color-success)', marginBottom: '4px' }}>
                Điểm làm tốt:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: 'var(--text-caption)', lineHeight: 1.5 }}>
                {evaluation.strengths_vi.map((s, i) => (
                  <li key={i} style={{ color: 'var(--color-foreground)', marginBottom: '2px' }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-caption)', color: 'var(--color-warning)', marginBottom: '4px' }}>
                Gợi ý hoàn thiện:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: 'var(--text-caption)', lineHeight: 1.5 }}>
                {evaluation.improvements_vi.map((imp, i) => (
                  <li key={i} style={{ color: 'var(--color-foreground)', marginBottom: '2px' }}>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Native Model Rewrite & Cultural Tip */}
      <Card variant="ai">
        <CardHeader
          title="Bản viết mẫu chuẩn bản xứ (Native Speaker Model Rewrite)"
        />
        <CardContent>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--color-foreground)',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'pre-wrap',
              marginBottom: '12px',
            }}
          >
            {evaluation.native_model_rewrite}
          </div>

          <div
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--color-foreground-secondary)',
              lineHeight: 1.5,
              marginBottom: '8px',
            }}
          >
            <strong style={{ color: 'var(--color-foreground)' }}>Phân tích sắc thái & từ vựng đắt giá: </strong>
            {evaluation.rewrite_nuances_vi}
          </div>

          {evaluation.cultural_discourse_tip_vi && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                fontSize: 'var(--text-caption)',
                color: 'var(--color-foreground)',
                lineHeight: 1.5,
              }}
            >
              <strong>Văn hóa giao tiếp Nhật Bản: </strong>
              {evaluation.cultural_discourse_tip_vi}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
