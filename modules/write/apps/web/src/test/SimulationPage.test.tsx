import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SimulationPage from '../pages/SimulationPage'
import type { SimulationSessionResponse, WritingScenario } from '../types/api'

const scenario: WritingScenario = {
  id: 'sc-1',
  genre: 'customer_response',
  medium: 'chat',
  audience: 'Khách hàng',
  relationship: 'khách hàng',
  purpose: 'Xử lý khiếu nại',
  register: 'polite',
  tone: 'apologetic',
  target_length: 'multi_sentence',
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

const session: SimulationSessionResponse = {
  id: 'sim-1',
  scenario_id: 'sc-1',
  simulation_type: 'customer_service',
  mode: 'guided',
  register: 'polite',
  jlpt_level: 'N3',
  difficulty: 6,
  pressure_condition: 'Khách hàng đang gấp',
  status: 'active',
  resolution: null,
  max_turns: 10,
  current_turn: 1,
  objective_vi: 'Thuyết phục khách hàng chờ thêm 30 phút.',
  persona: { name: 'Tanaka Ken', role: 'khách hàng' },
  state: {
    objective: 'Thuyết phục khách hàng chờ',
    current_stage: 'mở đầu',
    unresolved_items: ['trấn an khách', 'hứa thời gian mới'],
    completed_items: [],
    participant_positions: {},
    facts: [],
    decisions: [],
    constraints: [],
    emotional_context: 'khách đang gấp',
    next_goal: 'mở đầu hội thoại',
  },
  meta: {},
  summary: null,
  turns: [
    {
      id: 'turn-1',
      turn_number: 1,
      actor: 'ai',
      turn_type: 'opening',
      text: 'すみません、注文した商品はまだ届いていません。',
      status: 'generated',
      created_at: '2026-01-01T00:00:00Z',
      evaluation: null,
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const afterTurn: SimulationSessionResponse = {
  ...session,
  current_turn: 3,
  turns: [
    ...session.turns,
    {
      id: 'turn-2',
      turn_number: 2,
      actor: 'user',
      turn_type: 'reply',
      text: '申し訳ございません。あと30分お待ちいただけますか。',
      status: 'submitted',
      created_at: '2026-01-01T00:00:01Z',
      evaluation: {
        overall_score: 72,
        sentence_quality: 70,
        scenario_fit: 75,
        goal_progress: 60,
        communication_effectiveness: 68,
        naturalness_score: 65,
        strengths: ['Lịch sự'],
        issues: [
          {
            category: 'tự nhiên',
            severity: 'minor',
            explanation: 'Có thể tự nhiên hơn.',
            suggested_fix: 'もう少し待っていただけますでしょうか。',
          },
        ],
        feedback_vi: 'Câu trả lời lịch sự, nhưng hơi máy móc.',
        corrections: {
          minimal_fix: 'あと30分ほどお待ちいただけますか。',
          natural_rewrite: null,
          native_rewrite: null,
        },
      },
    },
    {
      id: 'turn-3',
      turn_number: 3,
      actor: 'ai',
      turn_type: 'followup',
      text: '30分も待つんですか。困りますね。',
      status: 'generated',
      created_at: '2026-01-01T00:00:02Z',
      evaluation: null,
    },
  ],
}

const endedSession: SimulationSessionResponse = {
  ...afterTurn,
  status: 'completed',
  resolution: 'khách chấp nhận chờ',
}

const summaryPayload = {
  session_id: 'sim-1',
  summary_vi: 'Bạn xử lý tình huống khá tốt, lịch sự nhưng cần tự nhiên hơn.',
  dimensions: {
    overall_score: 72,
    sentence_quality: 70,
    scenario_fit: 75,
    goal_progress: 60,
    communication_effectiveness: 68,
    naturalness_score: 65,
  },
  strengths: ['Lịch sự', 'Giữ bình tĩnh'],
  needs_work: ['Tự nhiên hơn', 'Cung cấp phương án thay thế'],
  resolution: 'khách chấp nhận chờ',
  turn_count: 3,
  compare: null,
  suggested_challenge: null,
  ai_generated: false,
  provider: 'fake',
  model: 'fake-model',
  prompt_version: 'simulation_summary:v1',
}

const explainPayload = {
  turn_id: 'turn-2',
  corrections: { minimal_fix: null, natural_rewrite: null, native_rewrite: null },
  issues: [],
  feedback_vi: 'AI thấy câu trả lời hơi máy móc.',
  summary: 'Câu trả lời lịch sự nhưng còn chung chung.',
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

function renderPage(initialEntry = '/simulation') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SimulationPage />
    </MemoryRouter>,
  )
}

describe('SimulationPage', () => {
  beforeEach(() => {
    let createdMode: string = 'guided'
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/simulations') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { mode: string }
        createdMode = body.mode === 'immersive' ? 'immersive' : 'guided'
        return jsonResponse({ ...session, mode: createdMode }, 201)
      }
      if (url.includes('/api/v1/simulations/') && url.endsWith('/turns')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as { text: string; end_early: boolean }
          const updated = body.end_early ? endedSession : afterTurn
          return jsonResponse({ ...updated, mode: createdMode }, 201)
        }
      }
      if (url.includes('/api/v1/simulations/') && url.endsWith('/explain')) {
        return jsonResponse(explainPayload)
      }
      if (url.includes('/api/v1/simulations/') && url.endsWith('/summary')) {
        return jsonResponse(summaryPayload)
      }
      if (url.includes('/api/v1/simulations/') && !url.endsWith('/turns')) {
        return jsonResponse(endedSession)
      }
      if (url.includes('/api/v1/simulations')) {
        return jsonResponse({ items: [], total: 0 })
      }
      if (url.includes('/api/v1/scenarios/recent')) {
        return jsonResponse({
          items: [
            {
              scenario_id: 'sc-1',
              genre: 'Dịch vụ khách hàng',
              medium: 'Điện thoại',
              audience: 'Khách hàng',
              purpose: 'Xử lý khiếu nại',
              register: 'polite',
              attempt_count: 2,
              last_attempt_at: '2026-01-01T00:00:00Z',
            },
          ],
          total: 1,
        })
      }
      if (url.includes('/api/v1/scenarios/')) {
        return jsonResponse(scenario)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('shows the setup screen with mode cards and empty history', async () => {
    renderPage()
    expect(await screen.findByText('Trò chuyện trong tình huống thực tế')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Có hướng dẫn/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đắm chìm/ })).toBeInTheDocument()
    expect(await screen.findByText('Chưa có mô phỏng nào')).toBeInTheDocument()
  })

  it('starts a conversation from a scenario and submits a turn', async () => {
    renderPage('/simulation?scenario=sc-1')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Bắt đầu mô phỏng' }),
    )
    expect(
      (await screen.findAllByText('Thuyết phục khách hàng chờ thêm 30 phút.')).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('すみません、注文した商品はまだ届いていません。')).toBeInTheDocument()
    expect(
      (await screen.findAllByText('Tanaka Ken')).length,
    ).toBeGreaterThan(0)

    await userEvent.type(
      screen.getByLabelText('Câu trả lời tiếng Nhật của bạn'),
      '申し訳ございません。あと30分お待ちいただけますか。',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Gửi trả lời' }))

    expect(await screen.findByText('Câu trả lời lịch sự, nhưng hơi máy móc.')).toBeInTheDocument()
    expect(screen.getByText('72/100')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Giải thích' }))
    expect(await screen.findByText('Tại sao AI phản ứng như vậy')).toBeInTheDocument()
  })

  it('hides per-turn feedback in immersive mode', async () => {
    renderPage('/simulation?scenario=sc-1')
    await userEvent.click(await screen.findByRole('button', { name: /Đắm chìm/ }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Bắt đầu mô phỏng' }),
    )
    await userEvent.type(
      screen.getByLabelText('Câu trả lời tiếng Nhật của bạn'),
      '申し訳ございません。あと30分お待ちいただけますか。',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Gửi trả lời' }))

    expect(
      await screen.findByText('30分も待つんですか。困りますね。'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Câu trả lời lịch sự, nhưng hơi máy móc.')).not.toBeInTheDocument()
  })

  it('ends the conversation early and shows the summary', async () => {
    renderPage('/simulation?scenario=sc-1')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Bắt đầu mô phỏng' }),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Kết thúc sớm' }))
    expect(await screen.findByText('Kết thúc mô phỏng này?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Kết thúc' }))

    expect(await screen.findByText('MÔ PHỎNG HOÀN THÀNH')).toBeInTheDocument()
    expect(screen.getByText('Tổng kết buổi trò chuyện')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Bạn xử lý tình huống khá tốt, lịch sự nhưng cần tự nhiên hơn.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Lịch sự')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mô phỏng mới' })).toBeInTheDocument()
  })
})