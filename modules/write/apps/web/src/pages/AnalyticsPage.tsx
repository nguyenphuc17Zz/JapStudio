import { useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import { useAIProvider } from '../context/AIProviderContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type {
  AnalyticsAnalyzeResponse,
  AnalyticsCalibrationItem,
  AnalyticsExperiment,
  AnalyticsFunnelStage,
  AnalyticsRecommendation,
  AnalyticsSkillOutcome,
  AnalyticsSummary,
  AnalyticsTelemetryRow,
  AnalyticsWindow,
} from '../types/api'

const WINDOW_LABELS: Record<AnalyticsWindow, string> = {
  '7d': '7 ngày',
  '14d': '14 ngày',
  '30d': '30 ngày',
  '90d': '90 ngày',
  all_time: 'Tất cả thời gian',
}

const SKILL_LABELS: Record<string, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  semantic: 'Đúng nghĩa',
  naturalness: 'Tự nhiên',
  context_fit: 'Hợp ngữ cảnh',
  register_fit: 'Đúng phong cách',
  coherence: 'Mạch lạc',
  cohesion: 'Liên kết',
  organization: 'Bố cục',
  flow: 'Trôi chảy',
  scenario_fit: 'Khớp kịch bản',
  communication_effectiveness: 'Hiệu quả giao tiếp',
}

const VERDICT_LABELS: Record<string, string> = {
  too_easy: 'Quá dễ',
  too_hard: 'Quá khó',
  appropriate: 'Phù hợp',
  mixed: 'Trộn lẫn',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  accepted: 'Đã chấp nhận',
  rejected: 'Đã bác bỏ',
  implemented: 'Đã triển khai',
}

function formatValue(value: number | null, digits = 1): string {
  if (value === null) return '—'
  return value.toFixed(digits)
}

function SkillGrid({ skills }: { skills: AnalyticsSkillOutcome[] }) {
  if (skills.length === 0) {
    return <p className="jw-text--muted jw-text--sm">Chưa có đủ dữ liệu để tính điểm kỹ năng.</p>
  }
  return (
    <div className="jw-improvement-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
      {skills.map((skill) => (
        <Card variant="subtle" key={skill.skill}>
          <CardContent>
            <div className="jw-inline jw-gap-xs jw-mb-xs" style={{ justifyContent: 'space-between' }}>
              <strong className="jw-text--body-sm">{SKILL_LABELS[skill.skill] ?? skill.skill}</strong>
              <span className="jw-text--caption jw-text--muted">{skill.evidence_count} bài</span>
            </div>
            {skill.insufficient_evidence ? (
              <span className="jw-text--caption jw-text--muted">Chưa đủ dữ liệu</span>
            ) : (
              <div className="jw-inline jw-gap-sm" style={{ alignItems: 'baseline' }}>
                <span className="jw-text--lg jw-text--accent" style={{ fontWeight: 700 }}>
                  {formatValue(skill.current)}/100
                </span>
                {skill.delta !== null && (
                  <span
                    className={
                      skill.delta > 0
                        ? 'jw-text--success jw-text--caption'
                        : 'jw-text--muted jw-text--caption'
                    }
                    style={{ fontWeight: 600 }}
                  >
                    {skill.delta > 0 ? '+' : ''}{formatValue(skill.delta)}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SummaryChips({ summary }: { summary: AnalyticsSummary }) {
  const chips: Array<[string, number | string]> = [
    ['Ngày hoạt động', summary.active_days],
    ['Tổng bài tập', summary.total_attempts],
    ['Bài hoàn thành', summary.completed_exercises],
    ['Bài được chấm', summary.evaluation_attempts],
    ['Bài viết tự do', summary.discourse_submissions],
    ['Phiên mô phỏng', summary.simulation_sessions],
    ['Khám phá từ vựng', summary.discoveries],
    ['Kịch bản tạo mới', summary.scenarios_created],
    ['Khuyến nghị xong', summary.recommendations_completed],
    ['Trí nhớ tạo mới', summary.memories_created],
    ['Mục tiêu hoàn thành', summary.objectives_completed],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-sm)' }}>
      {chips.map(([label, value]) => (
        <Card variant="subtle" key={label}>
          <CardContent style={{ padding: 'var(--space-sm)' }}>
            <span className="jw-text--lg jw-text--accent" style={{ fontWeight: 700, display: 'block' }}>
              {value}
            </span>
            <span className="jw-text--caption jw-text--muted">{label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FunnelTable({ stages }: { stages: AnalyticsFunnelStage[] }) {
  if (stages.length === 0) {
    return <p className="jw-text--muted jw-text--sm">Chưa có dữ liệu kênh chuyển đổi.</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table aria-label="Bảng kênh chuyển đổi" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu kênh chuyển đổi</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Giai đoạn</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Số lượng</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Tỷ lệ chuyển đổi</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.stage} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <td style={{ padding: 'var(--space-sm)' }}>{stage.stage}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{stage.value}</td>
              <td style={{ padding: 'var(--space-sm)' }}>
                {stage.conversion !== null ? `${(stage.conversion * 100).toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CalibrationTable({ items }: { items: AnalyticsCalibrationItem[] }) {
  if (items.length === 0) {
    return <p className="jw-text--muted jw-text--sm">Chưa có dữ liệu hiệu chuẩn độ khó.</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table aria-label="Bảng hiệu chuẩn độ khó" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu hiệu chuẩn độ khó</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Độ khó</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Cấp</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Loại bài</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Điểm TB</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Hoàn thành</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Số lần thử</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Nhận định</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.difficulty}-${item.exercise_type ?? ''}`} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <td style={{ padding: 'var(--space-sm)' }}>{item.difficulty}/10</td>
              <td style={{ padding: 'var(--space-sm)' }}>{item.level ?? '—'}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{item.exercise_type ?? '—'}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{formatValue(item.avg_score)}</td>
              <td style={{ padding: 'var(--space-sm)' }}>
                {item.completion_rate !== null ? `${(item.completion_rate * 100).toFixed(0)}%` : '—'}
              </td>
              <td style={{ padding: 'var(--space-sm)' }}>{item.attempt_count}</td>
              <td style={{ padding: 'var(--space-sm)' }}>
                <Badge tone={item.verdict === 'appropriate' ? 'success' : 'warning'}>
                  {VERDICT_LABELS[item.verdict] ?? item.verdict}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExperimentsCard({ experiments }: { experiments: AnalyticsExperiment[] }) {
  if (experiments.length === 0) {
    return <p className="jw-text--muted jw-text--sm">Chưa có thử nghiệm nào.</p>
  }
  return (
    <ul className="jw-vocab-list">
      {experiments.map((exp) => (
        <li key={exp.id}>
          <Card variant="subtle">
            <CardContent>
              <div className="jw-inline jw-gap-xs jw-mb-xs">
                <strong className="jw-text--body-sm">{exp.name}</strong>
                <Badge tone="accent">{exp.status}</Badge>
              </div>
              <p className="jw-text--sm jw-text--secondary jw-mb-xs">{exp.description}</p>
              <div className="jw-inline jw-gap-xs">
                {exp.metrics.map((m) => (
                  <Badge key={m} tone="neutral">{m}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function AiTable({ rows }: { rows: AnalyticsTelemetryRow[] }) {
  if (rows.length === 0) {
    return <p className="jw-text--muted jw-text--sm">Chưa có dữ liệu đo lường AI.</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table aria-label="Bảng dữ liệu" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Tác vụ</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Nhà cung cấp</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Lượt gọi</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Thành công</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Vượt chất lượng</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Độ trễ TB</th>
            <th scope="col" style={{ padding: 'var(--space-sm)' }}>Chi phí ước tính</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.task}-${row.provider}-${index}`} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <td style={{ padding: 'var(--space-sm)' }}>{row.task}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{row.provider}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{row.calls}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{row.success_rate !== null ? `${(row.success_rate * 100).toFixed(1)}%` : '—'}</td>
              <td style={{ padding: 'var(--space-sm)' }}>
                {row.quality_pass_rate !== null ? `${(row.quality_pass_rate * 100).toFixed(1)}%` : '—'}
              </td>
              <td style={{ padding: 'var(--space-sm)' }}>{row.avg_latency_ms !== null ? `${row.avg_latency_ms.toFixed(0)} ms` : '—'}</td>
              <td style={{ padding: 'var(--space-sm)' }}>${row.estimated_cost_usd.toFixed(6)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalyticsPage() {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [window, setWindow] = useState<AnalyticsWindow>('30d')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyticsAnalyzeResponse | null>(null)
  const [decidingId, setDecidingId] = useState<string | null>(null)

  const summary = useAsync(() => api.analyticsSummary(window), [window])
  const learner = useAsync(() => api.analyticsLearnerSummary(window), [window])
  const outcomes = useAsync(() => api.analyticsLearningOutcomes(window), [window])
  const ai = useAsync(() => api.analyticsAi(window), [window])
  const calibration = useAsync(() => api.analyticsCalibration(window), [window])
  const funnel = useAsync(() => api.analyticsFunnel(window), [window])
  const experiments = useAsync(() => api.analyticsListExperiments(), [])
  const recommendations = useAsync(() => api.analyticsRecommendations(), [])

  const gated =
    summary.error !== null || learner.error !== null || recommendations.error !== null

  const decide = async (recommendation: AnalyticsRecommendation, decision: 'accept' | 'reject' | 'implement') => {
    setDecidingId(recommendation.id)
    try {
      await api.analyticsDecision(recommendation.id, { decision })
      await recommendations.run()
    } finally {
      setDecidingId(null)
    }
  }

  const runAnalyze = async () => {
    setAnalyzing(true)
    setAnalyzeResult(null)
    setAnalyzeError(null)
    try {
      const result = await api.analyticsAnalyze({
        window,
        ...(selectedProvider ? { provider: selectedProvider } : {}),
        ...(selectedModel ? { model: selectedModel } : {}),
      })
      setAnalyzeResult(result)
      await recommendations.run()
    } catch (err) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : 'Không thể thực hiện phân tích. Vui lòng kiểm tra dữ liệu bài tập hoặc kết nối AI.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  if (gated) {
    return (
      <PageContainer size="wide">
        <PageHeader title="Phân tích học tập" description="Thống kê và khuyến nghị dựa trên dữ liệu luyện tập." />
        <Card>
          <CardContent>
            <Alert tone="warning" title="Bảng phân tích học tập không khả dụng">
              {summary.error ?? learner.error ?? recommendations.error ?? 'Chỉ bật khi tính năng phân tích được kích hoạt.'}
            </Alert>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const learnerSkills = learner.data?.skills ?? []
  const outcomeSkills = outcomes.data?.skills ?? []

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Phân tích học tập"
        description="Thống kê hoạt động, kết quả học tập và khuyến nghị cải thiện."
      />

      {/* Time window selector */}
      <div className="jw-inline jw-gap-md jw-mb-lg" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 220 }}>
          <Select
            id="analytics-window"
            label="Chọn giai đoạn"
            value={window}
            onChange={(event) => setWindow(event.target.value as AnalyticsWindow)}
          >
            {Object.entries(WINDOW_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Summary */}
      <Card className="jw-mb-lg">
        <CardHeader title="Tổng quan hoạt động" />
        <CardContent>
          {summary.loading ? (
            <LoadingSpinner label="Đang tải tổng quan..." />
          ) : summary.data ? (
            <SummaryChips summary={summary.data} />
          ) : null}
        </CardContent>
      </Card>

      {/* Skills Profile */}
      <Card className="jw-mb-lg">
        <CardHeader
          title="Hồ sơ kỹ năng"
          description="Điểm trung bình từ các bài được chấm trong giai đoạn đã chọn."
        />
        <CardContent>
          {learner.loading ? (
            <LoadingSpinner label="Đang tải hồ sơ kỹ năng..." />
          ) : (
            <SkillGrid skills={learnerSkills} />
          )}
        </CardContent>
      </Card>

      {/* Learning Outcomes */}
      <Card className="jw-mb-lg">
        <CardHeader
          title="Mức độ tiến bộ"
          description="So sánh nửa đầu và nửa cuối giai đoạn để đo mức tiến bộ của từng kỹ năng."
        />
        <CardContent>
          {outcomes.loading ? (
            <LoadingSpinner label="Đang tải kết quả học tập..." />
          ) : (
            <SkillGrid skills={outcomeSkills} />
          )}
        </CardContent>
      </Card>

      {/* Calibration Table */}
      <Card className="jw-mb-lg">
        <CardHeader title="Hiệu chuẩn độ khó" />
        <CardContent>
          {calibration.loading ? (
            <LoadingSpinner label="Đang tải hiệu chuẩn..." />
          ) : calibration.data ? (
            <CalibrationTable items={calibration.data.items} />
          ) : null}
        </CardContent>
      </Card>

      {/* Funnel Table */}
      <Card className="jw-mb-lg">
        <CardHeader title="Kênh chuyển đổi" />
        <CardContent>
          {funnel.loading ? (
            <LoadingSpinner label="Đang tải kênh chuyển đổi..." />
          ) : funnel.data ? (
            <FunnelTable stages={funnel.data.stages} />
          ) : null}
        </CardContent>
      </Card>

      {/* Experiments */}
      <Card className="jw-mb-lg">
        <CardHeader title="Thử nghiệm A/B" />
        <CardContent>
          {experiments.loading ? (
            <LoadingSpinner label="Đang tải thử nghiệm..." />
          ) : experiments.data ? (
            <ExperimentsCard experiments={experiments.data} />
          ) : null}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card className="jw-mb-lg">
        <CardHeader
          title="Khuyến nghị AI"
          description="Phân tích chỉ số thực tế để đưa ra đề xuất tối ưu hóa hành trình luyện tập."
          actions={
            <Button
              onClick={() => void runAnalyze()}
              loading={analyzing}
              size="sm"
              icon="sparkles"
            >
              Chạy phân tích mới
            </Button>
          }
        />
        <CardContent>
          <div className="jw-mb-md">
            <AIModelPicker variant="inline" label="Mô hình AI phân tích" />
          </div>

          {analyzeError && (
            <Alert tone="error" className="jw-mb-md" title="Phân tích chưa thành công">
              {analyzeError}
            </Alert>
          )}

          {analyzeResult && analyzeResult.insights.length > 0 && (
            <div className="jw-mb-md">
              <Alert tone="success" className="jw-mb-sm" title="Phân tích hoàn tất">
                AI đã phân tích dữ liệu giai đoạn {WINDOW_LABELS[window]} và ghi nhận {analyzeResult.recommendations.length} khuyến nghị tối ưu mới.
              </Alert>
              <h3 className="jw-card-eyebrow jw-mb-xs">Kết quả phân tích</h3>
              <ul className="jw-ai-evidence">
                {analyzeResult.insights.map((insight, index) => (
                  <li key={`${insight.area}-${index}`}>
                    <strong>{insight.finding}:</strong> {insight.recommended_action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.data?.items && recommendations.data.items.length > 0 ? (
            <ul className="jw-vocab-list">
              {recommendations.data.items.map((rec) => (
                <li key={rec.id}>
                  <Card variant="subtle">
                    <CardContent>
                      <div className="jw-inline jw-gap-xs jw-mb-xs">
                        <Badge tone="accent">
                          {PRIORITY_LABELS[rec.priority] ?? rec.priority}
                        </Badge>
                        <Badge tone="neutral">
                          {STATUS_LABELS[rec.status] ?? rec.status}
                        </Badge>
                        <strong className="jw-text--body-sm">{rec.finding}</strong>
                      </div>
                      <p className="jw-text--sm jw-text--secondary jw-mb-sm">
                        {rec.recommended_action} ({rec.area})
                      </p>
                      {rec.status === 'pending' && (
                        <div className="jw-inline jw-gap-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={decidingId === rec.id}
                            onClick={() => void decide(rec, 'accept')}
                          >
                            Chấp nhận
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={decidingId === rec.id}
                            onClick={() => void decide(rec, 'reject')}
                          >
                            Bác bỏ
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={decidingId === rec.id}
                            onClick={() => void decide(rec, 'implement')}
                          >
                            Triển khai
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="jw-text--muted jw-text--sm">
              Chưa có khuyến nghị nào. Hãy nhấn 'Chạy phân tích mới' để AI tạo đề xuất.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Telemetry */}
      <Card className="jw-mb-lg">
        <CardHeader title="Hiệu quả AI & Chi phí" />
        <CardContent>
          {ai.loading ? (
            <LoadingSpinner label="Đang tải dữ liệu AI..." />
          ) : ai.data ? (
            <AiTable rows={ai.data.by_task} />
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  )
}