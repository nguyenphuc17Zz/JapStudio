import { useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type {
  BenchmarkAggregate,
  BenchmarkResult,
  QualityStatusResponse,
  QualityTelemetryResponse,
} from '../types/api'

const CATEGORY_LABELS: Record<string, string> = {
  semantic: 'Đánh giá ngữ nghĩa',
  grammar_vocabulary: 'Ngữ pháp & từ vựng',
  naturalness: 'Tự nhiên & ngữ vực',
  writing: 'Đánh giá bài viết',
  exercise: 'Sinh bài tập',
  vocabulary: 'Tách từ vựng',
  learner: 'Hồ sơ học viên',
  scenario: 'Kịch bản',
  discourse: 'Diễn ngôn',
  simulation: 'Mô phỏng',
  gamification: 'Gamification',
}

const CRITICALITY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
}

const COST_LABELS: Record<string, string> = {
  cheap: 'Rẻ',
  balanced: 'Cân bằng',
  quality: 'Chất lượng',
  critical: 'Nghiêm trọng',
}

function percent(value: number | null): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

function rateCell(passed: boolean): string {
  return passed ? '✓' : '✗'
}

function AggregateView({ aggregate }: { aggregate: BenchmarkAggregate }) {
  return (
    <div className="jw-mt-md">
      <h3 className="jw-card-eyebrow jw-mb-xs">Kết quả tổng hợp</h3>
      <div style={{ overflowX: 'auto' }}>
        <table aria-label="Bảng dữ liệu" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu</caption>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
              <th scope="col" style={{ padding: 'var(--space-sm)' }}>Trường hợp</th>
              <th scope="col" style={{ padding: 'var(--space-sm)' }}>Schema</th>
              <th scope="col" style={{ padding: 'var(--space-sm)' }}>Nhất quán</th>
              <th scope="col" style={{ padding: 'var(--space-sm)' }}>Thuộc tính</th>
              <th scope="col" style={{ padding: 'var(--space-sm)' }}>Ngữ nghĩa</th>
              <th scope="col" style={{ padding: 'var(--space-sm)' }}>Ngữ vực</th>
              <th scope="col" style={{ padding: 'var(--space-sm)' }}>Độ trễ TB</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <td style={{ padding: 'var(--space-sm)' }}>{aggregate.cases}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{percent(aggregate.schema_pass_rate)}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{percent(aggregate.consistency_pass_rate)}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{percent(aggregate.expected_properties_pass_rate)}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{percent(aggregate.semantic_accuracy)}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{percent(aggregate.naturalness_agreement)}</td>
              <td style={{ padding: 'var(--space-sm)' }}>{aggregate.avg_latency_ms !== null ? `${aggregate.avg_latency_ms} ms` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {aggregate.results.length > 0 && (
        <div className="jw-mt-md" style={{ overflowX: 'auto' }}>
          <table aria-label="Bảng dữ liệu" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu</caption>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
                <th scope="col" style={{ padding: 'var(--space-sm)' }}>ID</th>
                <th scope="col" style={{ padding: 'var(--space-sm)' }}>Loại</th>
                <th scope="col" style={{ padding: 'var(--space-sm)' }}>Schema</th>
                <th scope="col" style={{ padding: 'var(--space-sm)' }}>Nhất quán</th>
                <th scope="col" style={{ padding: 'var(--space-sm)' }}>Vi phạm</th>
              </tr>
            </thead>
            <tbody>
              {aggregate.results.map((result) => (
                <tr key={result.case_id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: 'var(--space-sm)' }}>{result.case_id}</td>
                  <td style={{ padding: 'var(--space-sm)' }}>{result.task}</td>
                  <td style={{ padding: 'var(--space-sm)' }}>{rateCell(result.schema_pass)}</td>
                  <td style={{ padding: 'var(--space-sm)' }}>{rateCell(result.consistency_pass)}</td>
                  <td style={{ padding: 'var(--space-sm)' }}>{result.violations.join('; ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AiQualityPage() {
  const status = useAsync(() => api.qualityStatus())
  const telemetry = useAsync(() => api.qualityTelemetry())
  const prompts = useAsync(() => api.qualityPrompts())

  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('20')
  const [benchmarkRunning, setBenchmarkRunning] = useState(false)
  const [benchmark, setBenchmark] = useState<BenchmarkAggregate | null>(null)
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[] | null>(null)
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null)

  const isGated = (error: string | null) => error !== null

  const runBenchmark = async () => {
    setBenchmarkRunning(true)
    setBenchmark(null)
    setBenchmarkResults(null)
    setBenchmarkError(null)
    try {
      const categories = category ? [category] : undefined
      const run = await api.runBenchmark({
        categories,
        limit: Number(limit) || undefined,
      })
      setBenchmark(run.aggregate)
      setBenchmarkResults(await api.getBenchmarkResults(run.id))
    } catch (err) {
      setBenchmarkError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi chạy benchmark')
    } finally {
      setBenchmarkRunning(false)
    }
  }

  if (isGated(status.error) || isGated(telemetry.error) || isGated(prompts.error)) {
    return (
      <PageContainer size="wide">
        <PageHeader title="Chất lượng AI" description="Công cụ chẩn đoán nội bộ dành cho nhà phát triển." />
        <Card>
          <CardContent>
            <Alert tone="warning" title="Bảng điều khiển chất lượng AI không khả dụng">
              Chỉ bật khi chẩn đoán được kích hoạt và không phải môi trường production.
            </Alert>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const statusData = status.data as QualityStatusResponse | null
  const telemetryData = telemetry.data as QualityTelemetryResponse | null
  const taskRows = telemetryData
    ? Object.entries(telemetryData.tasks).sort(([a], [b]) => a.localeCompare(b))
    : []

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Chất lượng AI"
        description="Trạng thái bộ đăng ký chất lượng, đo lường từ xa và điểm chuẩn vàng dành cho nhà phát triển."
      />

      <Card className="jw-mb-lg">
        <CardHeader title="Trạng thái bộ đăng ký" />
        <CardContent>
          {status.loading ? (
            <LoadingSpinner label="Đang tải trạng thái..." />
          ) : statusData ? (
            <div>
              <div className="jw-inline jw-gap-xs jw-mb-sm">
                <Badge tone={statusData.enabled ? 'success' : 'neutral'}>
                  {statusData.enabled ? 'Đã bật' : 'Đã tắt'}
                </Badge>
                <span className="jw-text--sm jw-text--muted">
                  Số tác vụ: <strong>{statusData.tasks.length}</strong>
                </span>
              </div>
              <p className="jw-text--caption jw-text--muted jw-mb-md">
                Ngưỡng: độ tin cậy tối thiểu <strong>{String(statusData.thresholds.min_confidence)}</strong>,
                bất đồng tối đa <strong>{String(statusData.thresholds.max_provider_disagreement)}</strong>,
                thử lại tối đa <strong>{String(statusData.thresholds.max_retries)}</strong>.
              </p>
              <div className="jw-inline jw-gap-xs" style={{ flexWrap: 'wrap' }}>
                {statusData.tasks.map((task) => (
                  <Badge key={task} tone="neutral">
                    {task} ({CRITICALITY_LABELS[statusData.criticality[task]] ?? statusData.criticality[task]})
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="jw-mb-lg">
        <CardHeader title="Đo lường từ xa" />
        <CardContent>
          {telemetry.loading ? (
            <LoadingSpinner label="Đang tải đo lường từ xa..." />
          ) : telemetryData ? (
            <div>
              <div className="jw-inline jw-gap-md jw-mb-md" style={{ flexWrap: 'wrap' }}>
                <span className="jw-text--sm">Tổng sự kiện: <strong>{telemetryData.total_events}</strong></span>
                <span className="jw-text--sm">Tỷ lệ thành công: <strong>{percent(telemetryData.overall.success_rate)}</strong></span>
                <span className="jw-text--sm">Chất lượng: <strong>{percent(telemetryData.overall.quality_pass_rate)}</strong></span>
                <span className="jw-text--sm">Chi phí ước tính: <strong>${telemetryData.overall.estimated_cost_usd.toFixed(6)}</strong></span>
              </div>
              {taskRows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table aria-label="Bảng dữ liệu" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu</caption>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
                        <th scope="col" style={{ padding: 'var(--space-sm)' }}>Tác vụ</th>
                        <th scope="col" style={{ padding: 'var(--space-sm)' }}>Lượt gọi</th>
                        <th scope="col" style={{ padding: 'var(--space-sm)' }}>Thành công</th>
                        <th scope="col" style={{ padding: 'var(--space-sm)' }}>Chất lượng</th>
                        <th scope="col" style={{ padding: 'var(--space-sm)' }}>Độ trễ TB</th>
                        <th scope="col" style={{ padding: 'var(--space-sm)' }}>Dự phòng</th>
                        <th scope="col" style={{ padding: 'var(--space-sm)' }}>Chi phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskRows.map(([task, health]) => (
                        <tr key={task} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td style={{ padding: '8px', fontWeight: 500 }}>{task}</td>
                          <td style={{ padding: 'var(--space-sm)' }}>{health.calls}</td>
                          <td style={{ padding: 'var(--space-sm)' }}>{percent(health.success_rate)}</td>
                          <td style={{ padding: 'var(--space-sm)' }}>{percent(health.quality_pass_rate)}</td>
                          <td style={{ padding: 'var(--space-sm)' }}>{health.avg_latency_ms !== null ? `${health.avg_latency_ms} ms` : '—'}</td>
                          <td style={{ padding: 'var(--space-sm)' }}>{percent(health.fallback_rate)}</td>
                          <td style={{ padding: 'var(--space-sm)' }}>${health.estimated_cost_usd.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="jw-text--muted jw-text--sm">Chưa có dữ liệu đo lường nào.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="jw-mb-lg">
        <CardHeader
          title="Điểm chuẩn vàng"
          description="Chạy bộ dữ liệu vàng qua lớp chất lượng (chỉ kiểm tra xác định, không gọi AI)."
        />
        <CardContent>
          <div className="jw-inline jw-gap-md jw-mb-md" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Select
                id="benchmark-category"
                label="Nhóm tác vụ"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Tất cả</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ width: 120 }}>
              <Input
                id="benchmark-limit"
                label="Giới hạn"
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
            </div>
            <Button
              onClick={() => void runBenchmark()}
              loading={benchmarkRunning}
              icon="sparkles"
            >
              Chạy điểm chuẩn
            </Button>
          </div>

          {benchmarkError && <Alert tone="error">{benchmarkError}</Alert>}
          {benchmark && <AggregateView aggregate={benchmark} />}

          {benchmarkResults && benchmarkResults.length > 0 && (
            <div className="jw-mt-lg">
              <h3 className="jw-card-eyebrow jw-mb-xs">Kết quả đã lưu</h3>
              <div style={{ overflowX: 'auto' }}>
                <table aria-label="Bảng dữ liệu" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu</caption>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
                      <th scope="col" style={{ padding: 'var(--space-sm)' }}>ID</th>
                      <th scope="col" style={{ padding: 'var(--space-sm)' }}>Schema</th>
                      <th scope="col" style={{ padding: 'var(--space-sm)' }}>Nhất quán</th>
                      <th scope="col" style={{ padding: 'var(--space-sm)' }}>Thuộc tính</th>
                      <th scope="col" style={{ padding: 'var(--space-sm)' }}>Độ trễ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkResults.map((result) => (
                      <tr key={result.case_id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td style={{ padding: 'var(--space-sm)' }}>{result.case_id}</td>
                        <td style={{ padding: 'var(--space-sm)' }}>{rateCell(result.schema_pass)}</td>
                        <td style={{ padding: 'var(--space-sm)' }}>{rateCell(result.consistency_pass)}</td>
                        <td style={{ padding: 'var(--space-sm)' }}>{rateCell(result.expected_properties_pass)}</td>
                        <td style={{ padding: 'var(--space-sm)' }}>{result.latency_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="jw-mb-lg">
        <CardHeader title="Bộ đăng ký prompt" />
        <CardContent>
          {prompts.loading ? (
            <LoadingSpinner label="Đang tải bộ đăng ký prompt..." />
          ) : prompts.data ? (
            <div style={{ overflowX: 'auto' }}>
              <table aria-label="Bảng dữ liệu" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
        <caption className="jw-sr-only">Bảng dữ liệu</caption>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Tác vụ</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Phiên bản</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Mô tả</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Mức độ nghiêm trọng</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Chi phí</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Schema đầu ra</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.data.map((entry) => (
                    <tr key={entry.task} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}>{entry.task}</td>
                      <td style={{ padding: 'var(--space-sm)' }}>{entry.version}</td>
                      <td style={{ padding: 'var(--space-sm)' }}>{entry.description}</td>
                      <td style={{ padding: 'var(--space-sm)' }}>
                        <Badge tone="neutral">{CRITICALITY_LABELS[entry.criticality] ?? entry.criticality}</Badge>
                      </td>
                      <td style={{ padding: 'var(--space-sm)' }}>
                        <Badge tone="neutral">{COST_LABELS[entry.cost_profile] ?? entry.cost_profile}</Badge>
                      </td>
                      <td style={{ padding: '8px', color: 'var(--color-foreground-muted)' }}>{entry.output_schema ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  )
}