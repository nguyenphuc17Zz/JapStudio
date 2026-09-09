import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnalyticsPage from '../pages/AnalyticsPage'

const summaryPayload = {
  window: '30d',
  active_days: 12,
  total_attempts: 25,
  completed_exercises: 18,
  evaluation_attempts: 22,
  discourse_submissions: 3,
  simulation_sessions: 2,
  discoveries: 4,
  scenarios_created: 1,
  recommendations_completed: 2,
  memories_created: 6,
  objectives_completed: 3,
}

const learnerSummaryPayload = {
  window: '30d',
  generated_at: '2026-01-01T00:00:00Z',
  skills: [
    {
      skill: 'grammar',
      current: 68,
      baseline: 62,
      delta: 6,
      trend: 'up',
      evidence_count: 10,
      insufficient_evidence: false,
      note: null,
    },
    {
      skill: 'vocabulary',
      current: 55,
      baseline: 50,
      delta: 5,
      trend: 'up',
      evidence_count: 8,
      insufficient_evidence: false,
      note: null,
    },
    {
      skill: 'naturalness',
      current: null,
      baseline: null,
      delta: null,
      trend: null,
      evidence_count: 1,
      insufficient_evidence: true,
      note: 'not enough evidence',
    },
  ],
}

const outcomesPayload = {
  window: '30d',
  skills: [
    {
      skill: 'grammar',
      current: 70,
      baseline: 60,
      delta: 10,
      trend: 'up',
      evidence_count: 10,
      insufficient_evidence: false,
      note: null,
    },
  ],
}

const featuresPayload = {
  window: '30d',
  scenario_effectiveness: [],
  simulation_effectiveness: [],
  curriculum_effectiveness: [],
  recommendation_effectiveness: null,
  difficulty_effectiveness: [
    {
      metric_key: 'difficulty_6',
      label: 'Độ khó 6',
      value: 72,
      sample_count: 5,
      trend: null,
      insufficient_evidence: false,
    },
  ],
  vocabulary_effectiveness: [],
  memory_effectiveness: [],
}

const aiPayload = {
  window: '30d',
  overview: [
    {
      metric_key: 'overview_total_cost',
      label: 'Tổng chi phí AI',
      value: 0.001234,
      dimension: 'cost',
      dimension_value: null,
      sample_count: 22,
    },
  ],
  by_task: [
    {
      task: 'writing_evaluation',
      provider: 'fake',
      model: 'fake-model',
      calls: 22,
      success_rate: 1,
      quality_pass_rate: 0.9,
      avg_latency_ms: 42.5,
      fallback_rate: 0,
      estimated_cost_usd: 0.0012,
      prompt_version: 'writing_evaluation:v1',
    },
  ],
  by_provider: [],
  prompt_regressions: [],
  cost_by_provider: [
    {
      metric_key: 'cost_by_provider',
      label: 'Chi phí',
      value: 0.0012,
      dimension: 'provider',
      dimension_value: 'fake',
      sample_count: 22,
    },
  ],
  cost_by_task: [],
}

const calibrationPayload = {
  window: '30d',
  items: [
    {
      difficulty: 6,
      level: 'N3',
      exercise_type: 'sentence_translation',
      avg_score: 68.5,
      completion_rate: 0.9,
      attempt_count: 10,
      verdict: 'appropriate',
      note: null,
    },
  ],
}

const funnelPayload = {
  window: '30d',
  stages: [
    { stage: 'created', value: 30, conversion: null },
    { stage: 'attempted', value: 25, conversion: 0.8333 },
    { stage: 'completed', value: 18, conversion: 0.72 },
    { stage: 'evaluated', value: 18, conversion: 1 },
  ],
}

const recommendationsPayload = {
  total: 1,
  items: [
    {
      id: 'rec-1',
      area: 'curriculum_effectiveness',
      priority: 'high',
      finding: 'Độ khó 6 quá cao cho người mới.',
      recommended_action: 'Giảm độ khó bài tập đầu tiên.',
      evidence: ['data'],
      confidence: 'medium',
      inference_type: 'observation',
      source: 'curriculum_effectiveness',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      decided_at: null,
      decision_note: null,
    },
  ],
}

const analyzePayload = {
  recommendations: [],
  insights: [
    {
      area: 'curriculum_effectiveness',
      priority: 'high',
      finding: 'Độ khó 6 quá cao cho người mới.',
      recommended_action: 'Giảm độ khó bài tập đầu tiên.',
      evidence: ['data'],
      confidence: 'medium',
      inference_type: 'observation',
    },
  ],
}

const experimentsPayload = [
  {
    id: 'exp-1',
    name: 'Thử nghiệm độ khó',
    description: 'So sánh độ khó 5 và 6.',
    target: 'difficulty',
    control: { difficulty: 5 },
    variant: { difficulty: 6 },
    allocation: 50,
    status: 'active',
    metrics: ['completion_rate'],
    created_at: '2026-01-01T00:00:00Z',
  },
]

const experimentMetricsPayload = {
  experiment_id: 'exp-1',
  comparisons: [
    {
      metric: 'completion_rate',
      control_value: 0.8,
      variant_value: 0.7,
      delta: -0.1,
      sample_count: 20,
      insufficient_evidence: false,
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => (status < 400 ? payload : { error: { message: 'Not found' } }),
  })
}

function mockFetch() {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('/api/v1/analytics/summary')) return jsonResponse(summaryPayload)
    if (url.includes('/api/v1/analytics/learner-summary')) return jsonResponse(learnerSummaryPayload)
    if (url.includes('/api/v1/analytics/learning-outcomes')) return jsonResponse(outcomesPayload)
    if (url.includes('/api/v1/analytics/features')) return jsonResponse(featuresPayload)
    if (url.includes('/api/v1/analytics/ai')) return jsonResponse(aiPayload)
    if (url.includes('/api/v1/analytics/calibration')) return jsonResponse(calibrationPayload)
    if (url.includes('/api/v1/analytics/funnel')) return jsonResponse(funnelPayload)
    if (url.includes('/api/v1/analytics/analyze')) return jsonResponse(analyzePayload)
    if (url.includes('/api/v1/analytics/recommendations/rec-1/decision')) {
      return jsonResponse(recommendationsPayload.items[0])
    }
    if (url.includes('/api/v1/analytics/recommendations')) {
      return jsonResponse(recommendationsPayload)
    }
    if (url.includes('/api/v1/analytics/experiments/exp-1/metrics')) {
      return jsonResponse(experimentMetricsPayload)
    }
    if (url.includes('/api/v1/analytics/experiments')) return jsonResponse(experimentsPayload)
    return jsonResponse({ status: 'ok' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    mockFetch()
  })

  it('renders summary chips, skill grid and calibration', async () => {
    render(<AnalyticsPage />)
    expect(await screen.findByText('Tổng quan hoạt động')).toBeInTheDocument()
    expect(await screen.findByText('Ngày hoạt động')).toBeInTheDocument()
    expect(await screen.findByText('Hồ sơ kỹ năng')).toBeInTheDocument()
    expect(screen.getAllByText('Ngữ pháp').length).toBeGreaterThan(0)
    expect(await screen.findByText('68.0/100')).toBeInTheDocument()
    expect(screen.getByText('Chưa đủ dữ liệu')).toBeInTheDocument()
    expect(await screen.findByText('Hiệu chuẩn độ khó')).toBeInTheDocument()
    expect(await screen.findByText('Phù hợp')).toBeInTheDocument()
    expect(await screen.findByText('Kênh chuyển đổi')).toBeInTheDocument()
    expect(await screen.findByText('attempted')).toBeInTheDocument()
  })

  it('re-fetches data when the window changes', async () => {
    const fetchMock = mockFetch()
    render(<AnalyticsPage />)
    const select = await screen.findByLabelText('Chọn giai đoạn')
    await userEvent.selectOptions(select, '7d')
    await waitFor(() => {
      const summaryCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/api/v1/analytics/summary'),
      )
      expect(summaryCalls.length).toBe(2)
      expect(String(summaryCalls[1][0])).toContain('window=7d')
    })
  })

  it('shows an unavailable notice when analytics are gated', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Not found' } }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<AnalyticsPage />)
    expect(
      await screen.findByText(/Bảng phân tích học tập không khả dụng/),
    ).toBeInTheDocument()
  })

  it('runs analysis and shows insights', async () => {
    render(<AnalyticsPage />)
    const button = await screen.findByRole('button', { name: 'Chạy phân tích mới' })
    await userEvent.click(button)
    expect(await screen.findByText('Kết quả phân tích')).toBeInTheDocument()
    expect(
      screen.getAllByText(/Độ khó 6 quá cao cho người mới/).length,
    ).toBeGreaterThan(0)
  })

  it('shows error alert when AI analysis fails', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/v1/analytics/analyze')) {
        return jsonResponse({ error: { message: 'Chưa có đủ dữ liệu bài tập trong giai đoạn này' } }, 422)
      }
      if (url.includes('/api/v1/analytics/summary')) return jsonResponse(summaryPayload)
      if (url.includes('/api/v1/analytics/learner-summary')) return jsonResponse(learnerSummaryPayload)
      if (url.includes('/api/v1/analytics/learning-outcomes')) return jsonResponse(outcomesPayload)
      if (url.includes('/api/v1/analytics/features')) return jsonResponse(featuresPayload)
      if (url.includes('/api/v1/analytics/ai')) return jsonResponse(aiPayload)
      if (url.includes('/api/v1/analytics/calibration')) return jsonResponse(calibrationPayload)
      if (url.includes('/api/v1/analytics/funnel')) return jsonResponse(funnelPayload)
      if (url.includes('/api/v1/analytics/recommendations')) return jsonResponse(recommendationsPayload)
      if (url.includes('/api/v1/analytics/experiments')) return jsonResponse(experimentsPayload)
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AnalyticsPage />)
    const button = await screen.findByRole('button', { name: 'Chạy phân tích mới' })
    await userEvent.click(button)
    expect(await screen.findByText('Phân tích chưa thành công')).toBeInTheDocument()
  })

  it('resolves a pending recommendation with a decision', async () => {
    const fetchMock = mockFetch()
    render(<AnalyticsPage />)
    const acceptButton = await screen.findByRole('button', { name: 'Chấp nhận' })
    await userEvent.click(acceptButton)
    await waitFor(() => {
      const decisionCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/recommendations/rec-1/decision'),
      )
      expect(decisionCalls.length).toBe(1)
    })
  })

  it('shows experiment metrics', async () => {
    render(<AnalyticsPage />)
    expect(await screen.findByText('Thử nghiệm A/B')).toBeInTheDocument()
    expect(await screen.findByText('Thử nghiệm độ khó')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('completion_rate')).toBeInTheDocument()
    })
  })
})
