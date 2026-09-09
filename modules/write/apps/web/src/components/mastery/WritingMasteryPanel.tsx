import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import type {
  WritingMasteryProfile,
  WritingMasteryDimension,
  BossHistoryItem,
  BadgeTone,
} from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { Tabs } from '../ui/Tabs'
import { Icon } from '../icons/Icon'
import { BossAssessmentModal } from './BossAssessmentModal'
import { WritingEvolutionTimeline } from './WritingEvolutionTimeline'

export interface WritingMasteryPanelProps {
  onStartDrill?: (weaknessId?: string) => void
}

function dimensionTone(status: string): BadgeTone {
  switch (status.toLowerCase()) {
    case 'mastered':
      return 'success'
    case 'competent':
      return 'accent'
    case 'developing':
      return 'warning'
    case 'regressed':
      return 'error'
    default:
      return 'neutral'
  }
}

function statusLabelVi(status: string): string {
  switch (status.toLowerCase()) {
    case 'mastered':
      return 'Làm Chủ'
    case 'competent':
      return 'Thành Thục'
    case 'developing':
      return 'Đang Phát Triển'
    case 'emerging':
      return 'Mới Xuất Hiện'
    case 'regressed':
      return '⚠️ Thoái Trào'
    default:
      return status
  }
}

export function WritingMasteryPanel({ onStartDrill }: WritingMasteryPanelProps) {
  const [profile, setProfile] = useState<WritingMasteryProfile | null>(null)
  const [bossHistory, setBossHistory] = useState<BossHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sub-tab: 'matrix' | 'evolution' | 'history'
  const [subTab, setSubTab] = useState<'matrix' | 'evolution' | 'history'>('matrix')

  // Boss modal state
  const [bossModalOpen, setBossModalOpen] = useState(false)
  const [activeBossTaskId, setActiveBossTaskId] = useState<string | undefined>()

  // 5-Criterion detail modal/popover
  const [selectedProofDim, setSelectedProofDim] = useState<WritingMasteryDimension | null>(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [profData, histData] = await Promise.all([
        api.getWritingMasteryProfile(),
        api.getBossAssessmentHistory(10),
      ])
      setProfile(profData)
      setBossHistory(histData)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải hồ sơ năng lực làm chủ viết.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={32} />
        <span style={{ fontSize: 13, color: 'var(--color-foreground-secondary)' }}>
          Đang tính toán chỉ số làm chủ 8 chiều & thẩm định 5 tiêu chuẩn...
        </span>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: 13 }}>
        {error || 'Chưa có dữ liệu năng lực làm chủ.'}
      </div>
    )
  }

  const overallMasteryPct = Math.round(profile.overall_mastery_index * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* 1. Top Mastery Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        <Card>
          <CardContent style={{ padding: 'var(--space-md)' }}>
            <span className="jw-card-eyebrow">Chỉ Số Làm Chủ Tổng Hợp</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: overallMasteryPct >= 75 ? 'var(--nihon-moegi, #10b981)' : 'var(--color-primary)' }}>
                {overallMasteryPct}%
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>qua 8 chiều</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${overallMasteryPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6, #10b981)',
                  borderRadius: 3,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 'var(--space-md)' }}>
            <span className="jw-card-eyebrow">Kỹ Năng Đạt Chuẩn Master</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--nihon-moegi, #10b981)' }}>
                {profile.mastered_count}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>kỹ năng</span>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)', marginTop: 4, display: 'block' }}>
              Đạt đủ 5/5 tiêu chí thẩm định khắt khe
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 'var(--space-md)' }}>
            <span className="jw-card-eyebrow">Kỹ Năng Không Ổn Định / Thoái Trào</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: profile.unstable_count > 0 ? '#ef4444' : 'var(--color-success)' }}>
                {profile.unstable_count}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>cần ôn tập</span>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)', marginTop: 4, display: 'block' }}>
              {profile.unstable_count > 0 ? 'Tái phát hoặc tái diễn gần đây' : 'Không có kỹ năng thoái trào'}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 'var(--space-md)' }}>
            <span className="jw-card-eyebrow">Điểm Yếu Dai Dẳng</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: profile.persistent_count > 0 ? 'var(--nihon-yamabuki, #f59e0b)' : 'var(--color-foreground)' }}>
                {profile.persistent_count}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>mục tiêu trọng điểm</span>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)', marginTop: 4, display: 'block' }}>
              Ưu tiên hàng đầu trong lộ trình thích ứng
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 2. Hero Boss Assessment Callout Banner */}
      <Card
        variant="default"
        style={{
          padding: 'var(--space-md) var(--space-lg)',
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
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="target" size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                {profile.next_boss_task_recommendation
                  ? `Đang có bài Boss chờ thực hiện: ${profile.next_boss_task_recommendation.title}`
                  : 'Thử Thách Đánh Giá Boss Không Trợ Giúp (Boss Writing Arena)'}
              </h3>
              <Badge tone="neutral">KHÔNG GỢI Ý</Badge>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-foreground-secondary)', margin: '4px 0 0', maxWidth: 640 }}>
              Đo lường năng lực viết độc lập trong bối cảnh thực tế mới lạ, chấm điểm 8 chiều và so sánh tương quan tiến bộ với bài trước.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Button
            variant="primary"
            size="md"
            icon="sparkles"
            onClick={() => {
              setActiveBossTaskId(profile.next_boss_task_recommendation?.task_id)
              setBossModalOpen(true)
            }}
          >
            {profile.next_boss_task_recommendation ? 'Tiếp Tục Làm Bài Boss' : 'Bước Vào Đấu Trường Boss'}
          </Button>
        </div>
      </Card>

      {/* 3. Strengths & Priorities Actionable Callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
        <div
          style={{
            padding: 'var(--space-md)',
            background: 'rgba(16, 185, 129, 0.04)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 700, fontSize: 13 }}>
            <span>✦</span>
            <span>THẾ MẠNH HIỆN TẠI ĐÃ ĐƯỢC XÁC THỰC</span>
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {profile.current_strengths.map((str, idx) => (
              <li key={idx} style={{ color: 'var(--color-foreground)' }}>
                {str}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            padding: 'var(--space-md)',
            background: 'rgba(239, 68, 68, 0.04)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
            <span>⚡</span>
            <span>ƯU TIÊN CẦN KHẮC PHỤC NGAY</span>
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {profile.current_priorities.map((pri, idx) => (
              <li key={idx} style={{ color: 'var(--color-foreground)' }}>
                {pri}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Sub-Navigation Tabs */}
      <div className="jw-mb-xs">
        <Tabs
          variant="pills"
          items={[
            { id: 'matrix', label: 'Ma Trận 8 Chiều Năng Lực' },
            { id: 'evolution', label: 'Dòng Thời Gian Tiến Hóa Viết' },
            { id: 'history', label: `Lịch Sử Đánh Giá Boss (${bossHistory.length})` },
          ]}
          value={subTab}
          onChange={(val) => setSubTab(val as any)}
        />
      </div>

      {/* 5. Sub-Views */}
      {subTab === 'matrix' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            {profile.dimensions.map((dim) => {
              const scorePct = Math.round(dim.score * 100)
              return (
                <div
                  key={dim.key}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 'var(--space-md)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{dim.label_vi}</div>
                      <Badge tone={dimensionTone(dim.status)}>{statusLabelVi(dim.status)}</Badge>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-foreground-secondary)', lineHeight: 1.5 }}>
                      {dim.description_vi}
                    </p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--color-foreground-muted)' }}>
                        Độ thuần thục: <strong>{scorePct}%</strong> ({dim.evidence_count} mẫu)
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color:
                            dim.recent_trend === 'improving'
                              ? 'var(--color-success)'
                              : dim.recent_trend === 'declining'
                              ? 'var(--color-danger)'
                              : 'var(--color-foreground-muted)',
                        }}
                      >
                        {dim.recent_trend === 'improving' ? '▲ Đang tiến bộ' : dim.recent_trend === 'declining' ? '▼ Đang giảm' : '● Ổn định'}
                      </span>
                    </div>

                    <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${scorePct}%`,
                          height: '100%',
                          background:
                            dim.status === 'regressed'
                              ? '#ef4444'
                              : scorePct >= 75
                              ? 'var(--nihon-moegi, #10b981)'
                              : 'var(--color-primary)',
                          borderRadius: 3,
                        }}
                      />
                    </div>

                    {dim.criteria_proof && (
                      <div style={{ marginTop: 'var(--space-sm)', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProofDim(dim)}
                        >
                          Xem 5 Tiêu Chí Master ℹ
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : subTab === 'evolution' ? (
        <WritingEvolutionTimeline
          onPracticeWeakness={(weaknessId) => {
            if (onStartDrill) onStartDrill(weaknessId)
          }}
        />
      ) : (
        /* Boss Assessment History View */
        <Card>
          <CardHeader title={<span style={{ fontWeight: 700, fontSize: 14 }}>Lịch Sử Các Bài Đánh Giá Boss Đã Nộp</span>} />
          <CardContent>
            {bossHistory.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-foreground-muted)', fontSize: 13 }}>
                Chưa có bài thi Boss nào được nộp. Hãy nhấp vào nút "Bước Vào Đấu Trường Boss" để bắt đầu thử thách đầu tiên!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {bossHistory.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 'var(--space-sm)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <Badge tone={item.overall_score >= 75 ? 'success' : 'warning'}>
                          {item.verdict}
                        </Badge>
                        <span style={{ fontWeight: 700, fontSize: 13.5 }}>{item.task_title}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)', marginTop: 3 }}>
                        {item.task_type} • {item.target_register} • {item.character_count} ký tự • {Math.floor(item.duration_seconds / 60)} phút làm bài • Ngày: {new Date(item.evaluated_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    <div style={{ fontSize: 20, fontWeight: 800, color: item.overall_score >= 75 ? 'var(--color-success)' : '#ef4444' }}>
                      {Math.round(item.overall_score)}
                      <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>/100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. 5-Criterion Verification Proof Popover/Modal */}
      {selectedProofDim && selectedProofDim.criteria_proof && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 7, 15, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProofDim(null)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Thẩm Định 5 Tiêu Chuẩn Master: {selectedProofDim.label_vi}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--color-foreground-secondary)', margin: '2px 0 0' }}>
                  Kỹ năng chỉ đạt Master khi vượt qua toàn bộ 5 điều kiện độc lập dưới đây.
                </p>
              </div>
              <Button variant="ghost" size="sm" icon="x" onClick={() => setSelectedProofDim(null)} aria-label="Đóng" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '10px 12px', background: selectedProofDim.criteria_proof.repeated_correct_usage ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: `1px solid ${selectedProofDim.criteria_proof.repeated_correct_usage ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>1. Sử dụng đúng lặp lại (Repeated Correct Usage)</span>
                  <span>{selectedProofDim.criteria_proof.repeated_correct_usage ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>
                  Đã sử dụng đúng: {selectedProofDim.criteria_proof.repeated_correct_count}/3 lần tối thiểu
                </span>
              </div>

              <div style={{ padding: '10px 12px', background: selectedProofDim.criteria_proof.delayed_retention ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: `1px solid ${selectedProofDim.criteria_proof.delayed_retention ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>2. Ghi nhớ có độ trễ (Delayed Retention)</span>
                  <span>{selectedProofDim.criteria_proof.delayed_retention ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>
                  Khoảng cách không mắc lỗi: {selectedProofDim.criteria_proof.retention_days} ngày (yêu cầu $\ge 3-5$ ngày)
                </span>
              </div>

              <div style={{ padding: '10px 12px', background: selectedProofDim.criteria_proof.new_context_transfer ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: `1px solid ${selectedProofDim.criteria_proof.new_context_transfer ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>3. Chuyển di bối cảnh mới (New-Context Transfer)</span>
                  <span>{selectedProofDim.criteria_proof.new_context_transfer ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>
                  Đã vượt qua ở {selectedProofDim.criteria_proof.distinct_contexts_count}/3 bối cảnh khác nhau
                </span>
              </div>

              <div style={{ padding: '10px 12px', background: selectedProofDim.criteria_proof.free_writing_evidence ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: `1px solid ${selectedProofDim.criteria_proof.free_writing_evidence ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>4. Bằng chứng Viết Tự Do (Free-Writing Evidence)</span>
                  <span>{selectedProofDim.criteria_proof.free_writing_evidence ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>
                  Tỷ lệ đạt trong viết tự do không cấu trúc: {Math.round(selectedProofDim.criteria_proof.free_writing_pass_rate * 100)}% (yêu cầu $\ge 50\%$)
                </span>
              </div>

              <div style={{ padding: '10px 12px', background: selectedProofDim.criteria_proof.real_world_evidence ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: `1px solid ${selectedProofDim.criteria_proof.real_world_evidence ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>5. Bằng chứng Tình Huống Thực Tế / Thử Thách Boss</span>
                  <span>{selectedProofDim.criteria_proof.real_world_evidence ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}</span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)' }}>
                  Số lần thể hiện thành công: {selectedProofDim.criteria_proof.real_world_pass_count} lần
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <Button variant="primary" size="sm" onClick={() => setSelectedProofDim(null)}>
                Đã Hiểu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Boss Assessment Modal */}
      <BossAssessmentModal
        isOpen={bossModalOpen}
        initialTaskId={activeBossTaskId}
        onClose={() => {
          setBossModalOpen(false)
          void fetchData()
        }}
        onCompleted={() => {
          void fetchData(true)
        }}
      />
    </div>
  )
}
