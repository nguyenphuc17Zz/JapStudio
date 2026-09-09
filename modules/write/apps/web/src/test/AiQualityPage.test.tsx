import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiQualityPage from '../pages/AiQualityPage'

const statusPayload = {
  enabled: true,
  tasks: ['semantic_evaluation', 'writing_evaluation'],
  criticality: { semantic_evaluation: 'critical', writing_evaluation: 'high' },
  thresholds: {
    min_confidence: 'medium',
    max_provider_disagreement: 25,
    max_retries: 2,
    verification_enabled: false,
    escalation_enabled: true,
  },
}

const telemetryPayload = {
  total_events: 3,
  overall: {
    calls: 3,
    success_rate: 1,
    avg_latency_ms: 42.5,
    fallback_rate: 0,
    quality_pass_rate: 0.6667,
    input_tokens: 100,
    output_tokens: 50,
    total_tokens: 150,
    estimated_cost_usd: 0.0001,
  },
  tasks: {
    semantic_evaluation: {
      calls: 3,
      success_rate: 1,
      avg_latency_ms: 42.5,
      fallback_rate: 0,
      quality_pass_rate: 0.6667,
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
      estimated_cost_usd: 0.0001,
    },
  },
  providers: {},
  recent_failures: [],
}

const promptsPayload = [
  {
    task: 'semantic_evaluation',
    version: 'semantic_evaluation:v1',
    description: 'Semantic equivalence stage',
    criticality: 'critical',
    cost_profile: 'quality',
    output_schema: 'SemanticEvaluation',
  },
]

const benchmarkRunPayload = {
  id: 'run-1',
  provider: 'fake',
  model: 'fake-model',
  status: 'completed',
  aggregate: {
    cases: 1,
    schema_pass_rate: 1,
    consistency_pass_rate: 1,
    expected_properties_pass_rate: 1,
    semantic_accuracy: 1,
    false_positive_grammar_rate: null,
    naturalness_agreement: 1,
    avg_latency_ms: 1.5,
    results: [
      {
        case_id: 'sem-001',
        category: 'semantic',
        task: 'semantic_evaluation',
        schema_pass: true,
        consistency_pass: true,
        expected_properties_pass: true,
        semantic_accuracy: true,
        false_positive_grammar: null,
        naturalness_agreement: true,
        latency_ms: 2,
        violations: [],
      },
    ],
  },
  created_at: '2026-01-01T00:00:00Z',
}

const benchmarkResultsPayload = [
  {
    case_id: 'sem-001',
    provider: 'fake',
    model: 'fake-model',
    schema_pass: true,
    consistency_pass: true,
    expected_properties_pass: true,
    semantic_accuracy: true,
    false_positive_grammar: null,
    naturalness_agreement: true,
    latency_ms: 2,
    token_usage: null,
    created_at: '2026-01-01T00:00:00Z',
  },
]

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => (status < 400 ? payload : { error: { message: 'Not found' } }),
  })
}

function renderPage() {
  return render(<AiQualityPage />)
}

describe('AiQualityPage', () => {
  beforeEach(() => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/ai/quality/status')) return jsonResponse(statusPayload)
      if (url.includes('/api/v1/ai/quality/telemetry')) return jsonResponse(telemetryPayload)
      if (url.includes('/api/v1/ai/quality/prompts')) return jsonResponse(promptsPayload)
      if (url.includes('/api/v1/ai/benchmark/run-1/results')) {
        return jsonResponse(benchmarkResultsPayload)
      }
      if (url.includes('/api/v1/ai/benchmark/run')) {
        if (init?.method === 'POST') return jsonResponse(benchmarkRunPayload)
        return jsonResponse(benchmarkRunPayload)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('renders registry status, telemetry and prompts', async () => {
    renderPage()
    expect(await screen.findByText('Trạng thái bộ đăng ký')).toBeInTheDocument()
    expect(await screen.findByText(/writing_evaluation/)).toBeInTheDocument()
    expect(screen.getAllByText('semantic_evaluation').length).toBeGreaterThan(0)
    expect(await screen.findByText('Đo lường từ xa')).toBeInTheDocument()
    expect(await screen.findByText('Bộ đăng ký prompt')).toBeInTheDocument()
    expect(await screen.findByText('semantic_evaluation:v1')).toBeInTheDocument()
  })

  it('runs the golden benchmark and shows aggregates', async () => {
    renderPage()
    const button = await screen.findByRole('button', { name: 'Chạy điểm chuẩn' })
    await userEvent.click(button)
    expect(await screen.findByText('Kết quả tổng hợp')).toBeInTheDocument()
    expect(screen.getAllByText('sem-001').length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(screen.getByText('Kết quả đã lưu')).toBeInTheDocument()
    })
  })

  it('shows an unavailable notice when diagnostics are gated', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Not found' } }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    expect(
      await screen.findByText(/Bảng điều khiển chất lượng AI không khả dụng/),
    ).toBeInTheDocument()
  })
})