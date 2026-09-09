import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import FreeWritingPage from '../pages/FreeWritingPage'
import { ToastProvider } from '../components/ui/Toast'
import type {
  Exercise,
  WritingEvaluationResponse,
  WritingScenario,
} from '../types/api'

const scenarioSubmission = {
  id: 'sub-1',
  exercise_id: 'fw-1',
  exercise_type: 'free_writing',
  target_length: 'paragraph',
  register: 'polite',
  topic: 'Tình huống email',
  prompt_vi: 'Viết email xin lỗi khách hàng về đơn hàng chậm.',
  mode: 'long_form',
  status: 'evaluated',
  revision_count: 1,
  revisions: [
    {
      id: 'rev-1',
      revision_number: 1,
      sentence_count: 2,
      overall_writing: 84,
      status: 'evaluated',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const scenario: WritingScenario = {
  id: 'sc-1',
  genre: 'business_email',
  medium: 'email',
  audience: 'Khách hàng',
  relationship: 'khách hàng',
  purpose: 'Xin lỗi vì sự chậm trễ',
  register: 'polite',
  tone: 'apologetic',
  target_length: 'paragraph',
  jlpt_level: 'N3',
  situation_vi: 'Khách hàng phàn nàn về đơn hàng chưa đến.',
  context_vi: 'Bạn làm ở bộ phận hỗ trợ khách hàng.',
  required_points: [
    { id: 'r1', description: 'Xin lỗi khách hàng' },
    { id: 'r2', description: 'Đề xuất thời gian mới' },
  ],
  optional_points: ['Giảm giá 10%'],
  forbidden_patterns: ['Đổ lỗi cho bên vận chuyển'],
  difficulty: 6,
  difficulty_metadata: {},
  generation_metadata: null,
  created_at: '2026-01-01T00:00:00Z',
}

const exercise: Exercise = {
  id: 'fw-1',
  exercise_type: 'free_writing',
  topic: 'Tình huống email',
  subtopic: null,
  context: 'Bạn đang phản hồi email khách hàng.',
  prompt_vi: 'Viết email xin lỗi khách hàng về đơn hàng chậm.',
  target_length: 'paragraph',
  register: 'polite',
  jlpt_level: 'N3',
  difficulty: 6,
  grammar_complexity: 6,
  vocabulary_complexity: 6,
  context_complexity: 6,
  naturalness_target: 7,
  status: 'pending',
  generation_metadata: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const scenarioEvaluation: WritingEvaluationResponse = {
  submission_id: 'sub-1',
  revision_number: 1,
  revision_id: 'rev-1',
  attempt_id: 'att-1',
  exercise_id: 'fw-1',
  exercise_type: 'free_writing',
  target_length: 'paragraph',
  register: 'polite',
  text: '件名：お詫び\n\nこの度はご迷惑をおかけし申し訳ございません。',
  sentence_count: 2,
  scores: {
    sentence_quality: 85,
    discourse_quality: 82,
    overall_writing: 84,
    coherence_score: 85,
    cohesion_score: 82,
    organization_score: 83,
    flow_score: 82,
    style_consistency_score: 84,
    redundancy_score: 82,
    scenario_fit: 84,
    scenario_semantic_fit: 86,
    audience_fit: 85,
    purpose_fit: 87,
    tone_fit: 84,
    constraint_compliance: 90,
  },
  strengths: ['Xin lỗi rõ ràng'],
  summary: 'Email lịch sự và đầy đủ các phần cần thiết.',
  issues: [],
  sentence_scores: [],
  improved_structure: null,
  rewrites: {
    minimal_fix: 'この度はご迷惑をおかけし、申し訳ございませんでした。',
    natural_rewrite: 'この度は大変ご迷惑をおかけいたしました。',
    native_rewrite: 'このたびはご迷惑をおかけしまして、誠に申し訳ございません。',
    professional_rewrite: 'このたびはご迷惑をおかけいたしまして、心よりお詫び申し上げます。',
  },
  structure_suggestion: null,
  learning_mode: { enabled: true, hints_revealed_count: 0, hints_total: 2, reveal_available: false },
  discourse_available: true,
  scenario_required_points: [
    { id: 'r1', description: 'Xin lỗi khách hàng', status: 'satisfied', explanation: 'Đã xin lỗi ngay đầu email.' },
    { id: 'r2', description: 'Đề xuất thời gian mới', status: 'missing', explanation: 'Chưa nêu thời gian giao mới.' },
  ],
  scenario_format_sections: [
    { name: 'Tiêu đề', status: 'present', note: null },
    { name: 'Phần mở đầu', status: 'present', note: null },
  ],
  scenario_unavailable: false,
  status: 'evaluated',
  created_at: '2026-01-01T00:00:00Z',
  provenance: null,
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

describe('Scenario writing studio', () => {
  beforeEach(() => {
    let todayCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const isPost = init?.method === 'POST'
        if (url.includes('/api/v1/exercises/fw-1') && !isPost) {
          return jsonResponse(exercise)
        }
        if (url.includes('/api/v1/scenarios/sc-1') && !isPost) {
          return jsonResponse(scenario)
        }
        if (url.endsWith('/api/v1/writing/submissions') && isPost) {
          return jsonResponse(scenarioEvaluation, 201)
        }
        if (url.includes('/api/v1/writing/submissions/sub-1') && !isPost) {
          return jsonResponse(scenarioSubmission)
        }
        if (url.includes('/api/v1/gamification/today')) {
          todayCalls += 1
          const xp = todayCalls === 1 ? 40 : 55
          return jsonResponse({
            summary: {
              today_xp: xp,
              daily_goal: { completed: false, completed_count: 1, target: 3 },
            },
            mission: { completed: false },
          })
        }
        return jsonResponse({ status: 'ok' })
      }),
    )
  })

  it('boots into the studio via the scenario deep link with genre fields', async () => {
    render(
      <MemoryRouter initialEntries={['/free-writing?exercise=fw-1&scenario=sc-1']}>
        <ToastProvider>
          <FreeWritingPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByLabelText('Tiêu đề email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi bài' })).toBeInTheDocument()
  })

  it('submits genre fields and renders scenario results with the completion banner', async () => {
    render(
      <MemoryRouter initialEntries={['/free-writing?exercise=fw-1&scenario=sc-1']}>
        <ToastProvider>
          <FreeWritingPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    await userEvent.type(await screen.findByLabelText('Tiêu đề email'), 'お詫び')
    await userEvent.type(
      screen.getByLabelText('Bài viết tiếng Nhật của bạn'),
      'この度はご迷惑をおかけし申し訳ございません。',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bài' }))

    expect(await screen.findByText('Phù hợp tình huống')).toBeInTheDocument()
    expect(screen.getByText('Hiểu đúng tình huống')).toBeInTheDocument()
    expect(screen.getAllByText('Đầy đủ').length).toBeGreaterThan(0)
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument()
    expect(screen.getByText('Định dạng bài viết')).toBeInTheDocument()
    expect(screen.getByText('Viết lại chuyên nghiệp')).toBeInTheDocument()
    expect(
      screen.getByText(
        'このたびはご迷惑をおかけいたしまして、心よりお詫び申し上げます。',
      ),
    ).toBeInTheDocument()

    expect(await screen.findByText('Tình huống hoàn thành')).toBeInTheDocument()
    expect(screen.getByText('84 / 100')).toBeInTheDocument()
    expect(await screen.findByText('+15 XP')).toBeInTheDocument()
  })

  it('sends the assembled email body in the submission', async () => {
    render(
      <MemoryRouter initialEntries={['/free-writing?exercise=fw-1&scenario=sc-1']}>
        <ToastProvider>
          <FreeWritingPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    await userEvent.type(await screen.findByLabelText('Tiêu đề email'), 'お詫び')
    await userEvent.type(
      screen.getByLabelText('Bài viết tiếng Nhật của bạn'),
      'この度はご迷惑をおかけし申し訳ございません。',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bài' }))

    const fetchMock = vi.mocked(fetch)
    await screen.findByText('Phù hợp tình huống')
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        init?.method === 'POST' && String(url).endsWith('/api/v1/writing/submissions'),
    )
    expect(postCall).toBeDefined()
    const body = JSON.parse(postCall?.[1]?.body as string)
    expect(body.text).toContain('件名：お詫び')
    expect(body.text).toContain('この度はご迷惑をおかけし申し訳ございません。')
  })
})