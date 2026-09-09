import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExerciseView from '../components/ExerciseView'
import type {
  AttemptEvaluationResponse,
  AttemptListItem,
  AttemptVocabularyItem,
  Corrections,
  Exercise,
  HintResponse,
  RevealResponse,
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

const corrections: Corrections = {
  correct_version: '今日は仕事が忙しいです。',
  natural_version: '今日は仕事が多くて大変です。',
  native_version: '今日は仕事が立て込んでいて、帰りが遅くなりそうです。',
  casual_version: '今日は仕事いっぱいで遅くなるかも。',
  polite_version: '今日は仕事が多く、帰りが遅くなりそうです。',
  business_version: '本日は業務が混み合っており、退社が遅れる見込みです。',
}

function makeEvaluation(overrides: Partial<AttemptEvaluationResponse> = {}): AttemptEvaluationResponse {
  return {
    id: 'att-1',
    exercise_id: 'ex-1',
    attempt_number: 1,
    answer_text: 'きょうはたくさんしごとがあります。',
    scores: {
      overall_score: 90,
      semantic_score: 95,
      grammar_score: 88,
      vocabulary_score: 92,
      naturalness_score: 86,
      context_fit_score: 90,
      register_fit_score: 80,
    },
    semantic_classification: 'fully_equivalent',
    naturalness_classification: 'acceptable',
    issues: [
      {
        category: 'grammar',
        severity: 'major',
        original_text: 'しごとがあります',
        explanation: 'Nên dùng tính từ thay vì cấu trúc danh từ.',
        suggested_fix: '仕事が忙しいです',
        reason: null,
      },
    ],
    summary: 'Câu trả lời truyền đạt đúng ý, còn vài lỗi ngữ pháp nhẹ.',
    hints: ['Hãy xem lại cách dùng が và は', 'Thử dùng 忙しい', 'Câu này thường kết thúc bằng です'],
    learning_mode: { enabled: true, hints_revealed_count: 0, hints_total: 3, reveal_available: false },
    corrections: null,
    evaluation_metadata: { evaluation_version: 'writing_evaluation:v1', stages: [] },
    status: 'SUBMITTED',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
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

interface MockOptions {
  submitStatus?: number
  submitError?: unknown
  history?: AttemptListItem[]
  singleAttempt?: AttemptEvaluationResponse
  hintQueue?: HintResponse[]
  reveal?: RevealResponse
  attemptVocabulary?: AttemptVocabularyItem[]
  todayXp?: number
  missionCompleted?: boolean
  goal?: { target: number; completed_count: number }
}

function mockFetch(options: MockOptions = {}) {
  const hints = options.hintQueue ?? [
    { hint: 'H1', hints_revealed_count: 1, hints_total: 3, reveal_available: false },
    { hint: 'H2', hints_revealed_count: 2, hints_total: 3, reveal_available: false },
    { hint: 'H3', hints_revealed_count: 3, hints_total: 3, reveal_available: true },
  ]
  const reveal: RevealResponse = options.reveal ?? {
    attempt_id: 'att-1',
    attempt_number: 1,
    corrections,
    revealed: true,
  }
  const vocabulary: AttemptVocabularyItem[] = options.attemptVocabulary ?? []
  const goal = options.goal ?? { target: 3, completed_count: 1 }
  const todayXp = options.todayXp ?? 30
  let gamificationCalls = 0
  const today = {
    ...gamificationToday,
    summary: {
      ...gamificationToday.summary,
      today_xp: 30,
      daily_goal: { ...goal, completed: goal.completed_count >= goal.target, progress_percent: 0 },
    },
    mission: options.missionCompleted
      ? {
          id: 'm-1',
          mission_type: 'practice',
          title: 'Luyện 3 bài dịch',
          description: 'Hoàn thành 3 bài dịch tiếng Nhật.',
          target_count: 3,
          completed_count: 3,
          completed: true,
          focus_skills: ['grammar'],
          topic: 'Work',
          register: 'casual',
          difficulty: 6,
          reason: 'Ngữ pháp đang cần chú ý.',
          status: 'completed',
          provider: 'test',
          model: 'test',
          prompt_version: 'v1',
          created_at: '2026-08-20T00:00:00Z',
        }
      : null,
  }
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.includes('/gamification/today')) {
      gamificationCalls += 1
      return jsonResponse({
        ...today,
        summary: {
          ...today.summary,
          today_xp: gamificationCalls > 1 ? todayXp : 30,
        },
      })
    }
    if (url.includes('/hint')) {
      return jsonResponse(hints.shift() ?? { hint: '', hints_revealed_count: 3, hints_total: 3, reveal_available: true })
    }
    if (url.includes('/reveal')) {
      return jsonResponse(reveal)
    }
    if (url.includes('/vocabulary')) {
      return jsonResponse({ items: vocabulary, total: vocabulary.length, skip: 0, limit: 50 })
    }
    if (url.includes('/attempts') && init?.method === 'POST') {
      if (options.submitStatus && options.submitStatus >= 400) {
        return jsonResponse(options.submitError, options.submitStatus)
      }
      return jsonResponse(options.singleAttempt ?? makeEvaluation(), 201)
    }
    if (url.includes('/attempts/')) {
      return jsonResponse(options.singleAttempt ?? makeEvaluation())
    }
    if (url.includes('/attempts')) {
      return jsonResponse({
        items: options.history ?? [],
        total: options.history?.length ?? 0,
        skip: 0,
        limit: 50,
      })
    }
    return jsonResponse({ status: 'ok' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const onBack = vi.fn()
const onNext = vi.fn()

function renderView() {
  return render(
    <MemoryRouter>
      <ExerciseView exercise={exercise} onBack={onBack} onNext={onNext} nextPending={false} />
    </MemoryRouter>,
  )
}

async function submitAnswer(answer = 'きょうはたくさんしごとがあります。') {
  await userEvent.type(screen.getByLabelText('Câu trả lời tiếng Nhật của bạn'), answer)
  await userEvent.click(screen.getByRole('button', { name: 'Gửi bài' }))
}

describe('ExerciseView', () => {
  beforeEach(() => {
    mockFetch()
    localStorage.clear()
    onBack.mockClear()
    onNext.mockClear()
  })

  it('renders the exercise prompt, chips, details and editor', async () => {
    renderView()
    expect(screen.getByText(exercise.prompt_vi)).toBeInTheDocument()
    expect(screen.getByText('Dịch câu')).toBeInTheDocument()
    expect(screen.getByText('JLPT N3')).toBeInTheDocument()
    expect(screen.getByText('Thân mật')).toBeInTheDocument()
    expect(screen.getByText('Độ khó 6/10')).toBeInTheDocument()
    expect(screen.getByLabelText('Câu trả lời tiếng Nhật của bạn')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Chủ đề: Work › Overtime')
    expect(screen.getByRole('dialog')).toHaveTextContent('Độ dài mục tiêu: 1 câu')
  })

  it('submits an answer and shows the full evaluation', async () => {
    renderView()
    await submitAnswer()

    expect(await screen.findByText('90', { selector: '.jw-score-value' })).toBeInTheDocument()
    expect(screen.getByText('Tốt')).toBeInTheDocument()
    expect(screen.getByText(/truyền đạt đúng ý/)).toBeInTheDocument()
    expect(screen.getByText('Ngữ pháp', { selector: '.score-label' })).toBeInTheDocument()
    expect(screen.getByText('Tự nhiên', { selector: '.score-label' })).toBeInTheDocument()
    expect(screen.getByText('Vấn đề quan trọng nhất')).toBeInTheDocument()
    expect(screen.getByText(/しごとがあります/, { selector: '.jw-fb-issue-original' })).toBeInTheDocument()
    expect(screen.getByText('→ 仕事が忙しいです')).toBeInTheDocument()
    expect(screen.getByText('Đáng chú ý')).toBeInTheDocument()

    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes('/attempts') && !String(url).includes('/vocabulary') && init?.method === 'POST',
    )
    expect(postCall).toBeDefined()
    const body = JSON.parse(postCall?.[1]?.body as string)
    expect(body).toEqual({ answer_text: 'きょうはたくさんしごとがあります。' })
  })

  it('does not leak hints or corrections before they are requested', async () => {
    renderView()
    await submitAnswer()

    expect(
      await screen.findByText("Chưa có gợi ý nào. Nhấn 'Gợi ý tiếp theo' để nhận gợi ý đầu tiên."),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gợi ý tiếp theo' })).toBeInTheDocument()
    expect(screen.queryByText('Bản sửa đúng')).not.toBeInTheDocument()
  })

  it('walks through progressive hints and reveals the answer', async () => {
    renderView()
    await submitAnswer()

    for (const expected of ['H1', 'H2']) {
      await userEvent.click(await screen.findByRole('button', { name: 'Gợi ý tiếp theo' }))
      expect(screen.getByText(expected)).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Xem đáp án' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Gợi ý tiếp theo' }))
    expect(await screen.findByText('H3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gợi ý tiếp theo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xem đáp án' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Xem đáp án' }))
    expect(await screen.findByText('Bản sửa đúng')).toBeInTheDocument()
    expect(screen.getByText('今日は仕事が忙しいです。')).toBeInTheDocument()
    expect(screen.getByText('Bản như người bản xứ')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Kinh doanh' }))
    expect(screen.getByText('本日は業務が混み合っており、退社が遅れる見込みです。')).toBeInTheDocument()
  })

  it('shows corrections immediately when learning mode is off', async () => {
    mockFetch({
      hintQueue: [],
      singleAttempt: makeEvaluation({
        learning_mode: { enabled: false, hints_revealed_count: 0, hints_total: 3, reveal_available: true },
        corrections,
      }),
    })
    renderView()
    await submitAnswer()

    expect(await screen.findByText('Bản sửa đúng')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xem đáp án' })).not.toBeInTheDocument()
  })

  it('shows a submit error and allows retrying without losing the answer', async () => {
    let postCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/gamification/today')) return jsonResponse(gamificationToday)
        if (url.includes('/attempts') && init?.method === 'POST') {
          postCount += 1
          if (postCount === 1) {
            return jsonResponse(
              { error: { code: 'evaluation_error', message: 'AI evaluation failed' } },
              502,
            )
          }
          return jsonResponse(makeEvaluation(), 201)
        }
        if (url.includes('/attempts/')) return jsonResponse(makeEvaluation())
        if (url.includes('/attempts')) {
          return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
        }
        return jsonResponse({ status: 'ok' })
      }),
    )

    renderView()
    await submitAnswer()

    expect(await screen.findByText('Không thể hoàn tất đánh giá AI')).toBeInTheDocument()
    expect(screen.getByText(/Bài viết của bạn vẫn được giữ lại/)).toBeInTheDocument()
    expect(screen.getByLabelText('Câu trả lời tiếng Nhật của bạn')).toHaveValue(
      'きょうはたくさんしごとがあります。',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('90', { selector: '.jw-score-value' })).toBeInTheDocument()
  })

  it('shows the error back action and calls onBack', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/gamification/today')) return jsonResponse(gamificationToday)
        if (url.includes('/attempts') && init?.method === 'POST') {
          return jsonResponse({ error: { code: 'evaluation_error', message: 'x' } }, 502)
        }
        if (url.includes('/attempts')) {
          return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
        }
        return jsonResponse({ status: 'ok' })
      }),
    )
    renderView()
    await submitAnswer()

    await userEvent.click(await screen.findByRole('button', { name: 'Lưu và quay lại' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('retries create a new attempt and shows the comparison', async () => {
    let postCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/gamification/today')) return jsonResponse(gamificationToday)
        if (url.includes('/attempts') && init?.method === 'POST') {
          postCount += 1
          const attempt = makeEvaluation(
            postCount === 1
              ? { id: 'att-1', attempt_number: 1 }
              : {
                  id: 'att-2',
                  attempt_number: 2,
                  scores: { ...makeEvaluation().scores, overall_score: 91 },
                },
          )
          return jsonResponse(attempt, 201)
        }
        if (url.includes('/attempts/')) return jsonResponse(makeEvaluation())
        if (url.includes('/attempts')) {
          return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
        }
        return jsonResponse({ status: 'ok' })
      }),
    )

    renderView()
    await submitAnswer()
    await screen.findByText('90', { selector: '.jw-score-value' })

    await userEvent.click(screen.getByRole('button', { name: 'Sửa câu trả lời' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bài' }))
    expect(await screen.findByText('91', { selector: '.jw-score-value' })).toBeInTheDocument()
    expect(screen.getByText(/Lần 1: 90 → Lần 2: 91/)).toBeInTheDocument()
    expect(screen.getByText('↑ +1')).toBeInTheDocument()
  })

  it('shows previous attempt note when history exists on mount', async () => {
    mockFetch({
      history: [
        {
          id: 'att-old',
          attempt_number: 1,
          answer_text: 'はたらきます。',
          overall_score: 72,
          status: 'SUBMITTED',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      singleAttempt: makeEvaluation({ id: 'att-old', attempt_number: 1, answer_text: 'はたらきます。' }),
    })
    renderView()

    expect(
      await screen.findByText('Lần thử trước: 90/100 (lần 1). Bạn có thể sửa tiếp và gửi lại.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi bài' })).toBeInTheDocument()
  })

  it('shows vocabulary learned from the attempt', async () => {
    mockFetch({
      attemptVocabulary: [
        {
          id: 'vocab-1',
          expression: '立て込む',
          reading: 'たてこむ',
          type: 'word',
          meaning_vi: 'quá bận rộn',
          estimated_jlpt_level: 'N2',
          difficulty: 7,
          importance: 7,
          confidence: 'high',
          source_type: 'ai_natural',
          user_expression: 'とても忙しい',
          learning_reason: 'Tự nhiên hơn とても忙しい trong công việc.',
          example_sentence: '今日は仕事が立て込んでいます。',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    renderView()
    await submitAnswer()

    expect(await screen.findByText('✨ Từ vựng đáng học')).toBeInTheDocument()
    expect(screen.getByText('立て込む')).toBeInTheDocument()
    expect(screen.getByText('quá bận rộn')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem toàn bộ từ vựng →' })).toHaveAttribute(
      'href',
      '/vocabulary',
    )
  })

  it('completes the exercise and shows the completion card', async () => {
    mockFetch({ todayXp: 60, goal: { target: 3, completed_count: 2 } })
    renderView()
    await submitAnswer()

    await screen.findByText('90', { selector: '.jw-score-value' })
    expect(await screen.findByText('✦ +30 XP')).toBeInTheDocument()
    expect(await screen.findByText('Hôm nay 2/3 bài')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành' }))
    expect(await screen.findByText('Hoàn thành bài tập')).toBeInTheDocument()
    expect(screen.getByText('✦ +30 XP')).toBeInTheDocument()
    expect(screen.getByText('Hôm nay 2/3 bài')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Bài tập gợi ý tiếp theo' }))
    expect(onNext).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Về trang luyện tập' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('saves the draft and clears it after a successful submission', async () => {
    const { unmount } = renderView()
    await userEvent.type(screen.getByLabelText('Câu trả lời tiếng Nhật của bạn'), 'テスト')
    expect(localStorage.getItem('draft:practice:ex-1')).toBe('テスト')
    unmount()

    mockFetch()
    renderView()
    expect(screen.getByLabelText('Câu trả lời tiếng Nhật của bạn')).toHaveValue('テスト')
    await submitAnswer('テスト')
    await screen.findByText('90', { selector: '.jw-score-value' })
    expect(localStorage.getItem('draft:practice:ex-1')).toBeNull()
  })
})