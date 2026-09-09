import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PracticePage from '../pages/PracticePage'
import type {
  Exercise,
  ExerciseListResponse,
  LearningRecommendation,
  WritingScenario,
} from '../types/api'

const exercise: Exercise = {
  id: 'ex-1',
  exercise_type: 'sentence_translation',
  topic: 'Work',
  subtopic: 'Overtime',
  context: 'Một ngày làm việc khá bận rộn.',
  prompt_vi: 'Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.',
  target_length: 'sentence',
  register: 'casual',
  jlpt_level: 'N3',
  difficulty: 6,
  grammar_complexity: 5,
  vocabulary_complexity: 5,
  context_complexity: 6,
  naturalness_target: 7,
  status: 'pending',
  generation_metadata: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const recommendation: LearningRecommendation = {
  id: 'rec-1',
  strategy: 'targeted',
  exercise_type: 'sentence_translation',
  topic: 'Work',
  register: 'casual',
  jlpt_level: 'N3',
  difficulty: 6,
  target_length: 'sentence',
  focus_skills: ['grammar'],
  reason: 'Bạn cần cải thiện ngữ pháp để viết tự nhiên hơn.',
  explanation: null,
  status: 'recommended',
  exercise_id: 'ex-1',
  exercise: {
    id: 'ex-1',
    exercise_type: 'sentence_translation',
    topic: 'Work',
    prompt_vi: 'Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.',
    context: 'Một ngày làm việc khá bận rộn.',
    target_length: 'sentence',
    register: 'casual',
    jlpt_level: 'N3',
    difficulty: 6,
  },
  scenario_genre: null,
  created_at: '2026-01-01T00:00:00Z',
}

const listPayload: ExerciseListResponse = {
  items: [exercise],
  total: 1,
  skip: 0,
  limit: 50,
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

const gamificationToday = {
  summary: {
    level: { current_level: 3, current_xp: 240, xp_in_level: 200, xp_to_next_level: 160, progress_percent: 25 },
    current_streak: 2,
    longest_streak: 5,
    last_active_date: '2026-08-20T00:00:00Z',
    today_xp: 30,
    daily_goal: { target: 3, completed_count: 1, completed: false, progress_percent: 33 },
  },
  mission: null,
  focus: {},
  recommendation: null,
  session_summary: null,
  encouragement: null,
  reminders: [],
}

function mockFetch(options: {
  generateStatus?: number
  generateError?: unknown
  recommendation: LearningRecommendation | null
}) {
  let current = options.recommendation
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.includes('/api/v1/learning/recommendation')) {
      return jsonResponse(current)
    }
    if (url.includes('/api/v1/learning/next')) {
      current = recommendation
      return jsonResponse(recommendation, 201)
    }
    if (url.includes('/api/v1/learning/journey/objective/context')) {
      return jsonResponse(null)
    }
    if (url.includes('/api/v1/gamification/today')) {
      return jsonResponse(gamificationToday)
    }
    if (url.includes('/attempts')) {
      return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
    }
    if (url.includes('/api/v1/exercises') && init?.method === 'POST') {
      if (options.generateStatus && options.generateStatus >= 400) {
        return jsonResponse(options.generateError, options.generateStatus)
      }
      return jsonResponse(exercise, 201)
    }
    if (url.includes('/api/v1/exercises')) {
      return jsonResponse(listPayload)
    }
    return jsonResponse({ status: 'ok' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('PracticePage', () => {
  beforeEach(() => {
    mockFetch({ recommendation: null })
  })

  it('loads and displays the saved exercise list', async () => {
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    expect(await screen.findByText('Work')).toBeInTheDocument()
    expect(screen.getByText('› Overtime')).toBeInTheDocument()
    expect(
      screen.getByText(/Hôm nay nhiều việc quá nên chắc tui sẽ về muộn/),
    ).toBeInTheDocument()
  })

  it('shows the empty state when no exercises exist', async () => {
    mockFetch({ recommendation: null }).mockImplementation((url: string) =>
      jsonResponse(
        url.includes('/api/v1/learning/recommendation')
          ? null
          : url.includes('/api/v1/exercises')
            ? { items: [], total: 0, skip: 0, limit: 50 }
            : url.includes('/api/v1/gamification/today')
              ? gamificationToday
              : { status: 'ok' },
      ),
    )
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    expect(await screen.findByText('Chưa có bài tập nào')).toBeInTheDocument()
  })

  it('generates a custom exercise and renders prompt with editor', async () => {
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /Tùy chỉnh/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bài tập' }))

    expect(await screen.findByText('Bài tập của bạn')).toBeInTheDocument()
    expect(screen.getAllByText(exercise.prompt_vi).length).toBeGreaterThan(0)
    expect(screen.getByText('Độ khó 6/10')).toBeInTheDocument()
    expect(screen.getAllByText('JLPT N3').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Câu trả lời tiếng Nhật của bạn')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi bài' })).toBeInTheDocument()

    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/exercises'),
    )
    expect(postCall).toBeDefined()
  })

  it('sends selected preferences with the generation request', async () => {
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /Tùy chỉnh/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Tùy chọn nâng cao' }))
    await userEvent.selectOptions(await screen.findByLabelText('Loại bài tập'), 'free_writing')
    await userEvent.selectOptions(screen.getByLabelText('Ngữ điệu'), 'business')
    await userEvent.selectOptions(screen.getByLabelText('Trình độ JLPT'), 'N2')
    await userEvent.selectOptions(screen.getByLabelText('Độ khó'), '8')
    await userEvent.selectOptions(screen.getByLabelText('Độ dài'), 'paragraph')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bài tập' }))

    await screen.findByText('Bài tập của bạn')
    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/exercises'),
    )
    const body = JSON.parse(postCall?.[1]?.body as string)
    expect(body).toEqual({
      exercise_type: 'free_writing',
      register: 'business',
      jlpt_level: 'N2',
      difficulty: 8,
      target_length: 'paragraph',
    })
  })

  it('shows the loading state while generating', async () => {
    let resolveGenerate!: (value: unknown) => void
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/learning/recommendation')) {
        return jsonResponse(null)
      }
      if (url.includes('/api/v1/learning/journey/objective/context')) {
        return jsonResponse(null)
      }
      if (url.includes('/api/v1/gamification/today')) {
        return jsonResponse(gamificationToday)
      }
      if (url.includes('/attempts')) {
        return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
      }
      if (url.includes('/api/v1/exercises') && init?.method === 'POST') {
        return new Promise((resolve) => {
          resolveGenerate = resolve
        })
      }
      if (url.includes('/api/v1/exercises')) {
        return jsonResponse(listPayload)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /Tùy chỉnh/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bài tập' }))
    expect(await screen.findByText('Đang tạo...')).toBeInTheDocument()

    resolveGenerate({ ok: true, status: 201, json: async () => exercise })
    expect(await screen.findByText('Bài tập của bạn')).toBeInTheDocument()
  })

  it('shows the error state and allows retrying', async () => {
    let postCount = 0
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/learning/recommendation')) {
        return jsonResponse(null)
      }
      if (url.includes('/api/v1/learning/journey/objective/context')) {
        return jsonResponse(null)
      }
      if (url.includes('/api/v1/gamification/today')) {
        return jsonResponse(gamificationToday)
      }
      if (url.includes('/attempts')) {
        return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
      }
      if (url.includes('/api/v1/exercises') && init?.method === 'POST') {
        postCount += 1
        if (postCount === 1) {
          return jsonResponse(
            {
              error: { code: 'exercise_generation_error', message: 'AI generation failed' },
            },
            502,
          )
        }
        return jsonResponse(exercise, 201)
      }
      if (url.includes('/api/v1/exercises')) {
        return jsonResponse(listPayload)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /Tùy chỉnh/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bài tập' }))

    expect(await screen.findByText(/Không thể tạo bài tập/)).toBeInTheDocument()
    expect(screen.getByText(/AI generation failed/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tạo bài tập' }))
    expect(await screen.findByText('Bài tập của bạn')).toBeInTheDocument()
    expect(screen.queryByText(/Không thể tạo bài tập/)).not.toBeInTheDocument()
  })

  it('shows the recommendation in the recommended mode by default', async () => {
    mockFetch({ recommendation })
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    expect(
      await screen.findByText('Bạn cần cải thiện ngữ pháp để viết tự nhiên hơn.'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Luyện tập ngay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gợi ý khác' })).toBeInTheDocument()
  })

  it('opens the recommended exercise directly', async () => {
    mockFetch({ recommendation })
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Luyện tập ngay' }))
    expect(await screen.findByText('Bài tập của bạn')).toBeInTheDocument()
    expect(screen.getAllByText(exercise.prompt_vi).length).toBeGreaterThan(0)
  })

  it('creates a recommendation when none exists yet', async () => {
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Nhận gợi ý bài tập' }))
    expect(
      await screen.findByText('Bạn cần cải thiện ngữ pháp để viết tự nhiên hơn.'),
    ).toBeInTheDocument()
    const fetchMock = vi.mocked(fetch)
    const nextCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/learning/next'),
    )
    expect(nextCall).toBeDefined()
  })

  it('refreshes the recommendation with a new one', async () => {
    mockFetch({ recommendation })
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Gợi ý khác' }))
    expect(
      await screen.findByText('Bạn cần cải thiện ngữ pháp để viết tự nhiên hơn.'),
    ).toBeInTheDocument()
    const fetchMock = vi.mocked(fetch)
    const nextCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/api/v1/learning/next'),
    )
    expect(nextCall).toBeDefined()
  })

  it('generates a random exercise with an empty request', async () => {
    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /Ngẫu nhiên/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bài tập ngẫu nhiên' }))

    expect(await screen.findByText('Bài tập của bạn')).toBeInTheDocument()
    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/exercises'),
    )
    expect(postCall).toBeDefined()
    const body = JSON.parse(postCall?.[1]?.body as string)
    expect(body).toEqual({})
  })

  it('creates a challenge in challenge mode', async () => {
    const challengePayload = {
      id: 'ch-1',
      challenge_type: 'naturalness',
      instruction_vi: 'Viết lại câu sau cho tự nhiên hơn.',
      source_text: '私の仕事は忙しい。',
      target_skill: 'naturalness',
      difficulty: 5,
      objective: 'Cải thiện độ tự nhiên',
      required_expression: null,
      exercise_id: 'ex-9',
      status: 'active',
      success_criteria: { threshold: 80 },
      xp_reward: 15,
      completed: false,
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/v1/challenges/generate')) {
        return jsonResponse(challengePayload, 201)
      }
      if (url.includes('/api/v1/learning/recommendation')) {
        return jsonResponse(null)
      }
      if (url.includes('/api/v1/learning/journey/objective/context')) {
        return jsonResponse(null)
      }
      if (url.includes('/api/v1/gamification/today')) {
        return jsonResponse(gamificationToday)
      }
      if (url.includes('/attempts')) {
        return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
      }
      if (url.includes('/api/v1/exercises')) {
        return jsonResponse(listPayload)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><PracticePage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /Thử thách/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Nhận thử thách' }))
    expect(await screen.findByText('Viết lại câu sau cho tự nhiên hơn.')).toBeInTheDocument()
    expect(screen.getByText('私の仕事は忙しい。')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }))
    expect(await screen.findByLabelText('Câu trả lời tiếng Nhật của bạn')).toBeInTheDocument()
  })

  it('generates a scenario and starts writing from it', async () => {
    const scenario: WritingScenario = {
      id: 'sc-1',
      genre: 'business_email',
      medium: 'email',
      audience: 'manager',
      relationship: 'professional',
      purpose: 'request',
      register: 'business',
      tone: 'professional',
      target_length: 'paragraph',
      jlpt_level: 'N3',
      situation_vi: 'Bạn cần gửi email xin nghỉ phép cho quản lý.',
      context_vi: 'Tuần sau bạn có việc gia đình cần về quê 2 ngày.',
      required_points: [
        { id: 'rp-1', description: 'Nêu rõ lý do xin nghỉ.' },
        { id: 'rp-2', description: 'Đề xuất cách bàn giao công việc.' },
      ],
      optional_points: ['Hứa hoàn thành việc quan trọng trước khi nghỉ.'],
      forbidden_patterns: ['Không dùng từ quá thân mật.'],
      difficulty: 6,
      difficulty_metadata: {},
      generation_metadata: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes('/api/v1/scenarios/generate')) {
        return jsonResponse(scenario, 201)
      }
      if (String(url).includes('/api/v1/scenarios/recent')) {
        return jsonResponse({ items: [], total: 0 })
      }
      if (String(url).includes('/api/v1/scenarios') && String(url).endsWith('/exercise')) {
        return jsonResponse(exercise, 201)
      }
      if (url.includes('/api/v1/learning/recommendation')) {
        return jsonResponse(null)
      }
      if (url.includes('/api/v1/exercises')) {
        return jsonResponse(listPayload)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/practice']}>
        <Routes>
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/free-writing" element={<div>free-writing-page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Tình huống' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tình huống mới' }))

    expect(
      await screen.findByText('Bạn cần gửi email xin nghỉ phép cho quản lý.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Nêu rõ lý do xin nghỉ.')).toBeInTheDocument()
    expect(screen.getByText('Email công việc')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu viết' }))
    expect(await screen.findByText('free-writing-page')).toBeInTheDocument()

    const exerciseCall = fetchMock.mock.calls.find(
      ([url]) => String(url).includes('/api/v1/scenarios/sc-1/exercise'),
    )
    expect(exerciseCall).toBeDefined()
  })

  it('deletes a single exercise immediately when trash button is clicked', async () => {
    const fetchMock = mockFetch({ recommendation: null })
    render(
      <MemoryRouter>
        <PracticePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Work')).toBeInTheDocument()

    const deleteBtn = screen.getByRole('button', { name: 'Xóa bài tập này' })
    await userEvent.click(deleteBtn)

    const deleteCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'DELETE' && String(url).includes('/exercises/ex-1'),
    )
    expect(deleteCall).toBeDefined()
  })

  it('deletes all exercises after confirming the dialog', async () => {
    const fetchMock = mockFetch({ recommendation: null })
    render(
      <MemoryRouter>
        <PracticePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Work')).toBeInTheDocument()

    const deleteAllBtn = screen.getByRole('button', { name: 'Xóa tất cả' })
    await userEvent.click(deleteAllBtn)

    // Confirm dialog should appear
    expect(await screen.findByText('Xóa toàn bộ lịch sử bài tập?')).toBeInTheDocument()

    // The dialog button with destructive variant
    const dialogConfirmBtns = screen.getAllByRole('button', { name: 'Xóa tất cả' })
    await userEvent.click(dialogConfirmBtns[dialogConfirmBtns.length - 1])

    const deleteAllCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'DELETE' && String(url).endsWith('/exercises'),
    )
    expect(deleteAllCall).toBeDefined()
  })
})

