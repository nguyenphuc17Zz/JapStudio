import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '../pages/DashboardPage'
import type { LearningTodayResponse } from '../types/api'

const todayPayload: LearningTodayResponse = {
  session: {
    id: 'session-1',
    goal: 'Thi JLPT N3',
    recommended_focus: ['grammar'],
    exercises_completed: 3,
    created_at: '2026-01-01T00:00:00Z',
  },
  focus: {
    goal: 'Thi JLPT N3',
    target_jlpt: 'N3',
    daily_target: 5,
    weaknesses: ['grammar', 'naturalness'],
    strengths: ['semantic'],
    estimated_jlpt: { min_level: 'N4', max_level: 'N3', confidence: 'medium' },
    recent_trends: { overall_score: 68, improvement: 4.5, last_7d_attempts: 7 },
    evidence_count: 12,
  },
  recommendation: {
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
  },
}

const emptyTodayPayload: LearningTodayResponse = {
  session: null,
  focus: {
    goal: null,
    target_jlpt: null,
    daily_target: 3,
    weaknesses: [],
    strengths: [],
    estimated_jlpt: {},
    recent_trends: { overall_score: 0, improvement: 0, last_7d_attempts: 0 },
    evidence_count: 0,
  },
  recommendation: null,
}

const healthPayload = {
  status: 'ok',
  app: 'test-app',
  version: '0.1.0',
  environment: 'test',
  timestamp: '2026-01-01T00:00:00Z',
  database: 'ok',
}

const gamificationPayload = {
  summary: {
    level: { current_level: 3, current_xp: 250, xp_in_level: 200, xp_to_next_level: 150, progress_percent: 57 },
    current_streak: 5,
    longest_streak: 9,
    last_active_date: '2026-01-01',
    today_xp: 40,
    daily_goal: { target: 3, completed_count: 2, completed: false, progress_percent: 66 },
  },
  mission: {
    id: 'mission-1',
    mission_type: 'weakness_focus',
    title: 'Tự nhiên hóa câu văn',
    description: 'Luyện tập 3 bài để cải thiện độ tự nhiên.',
    target_count: 3,
    completed_count: 2,
    completed: false,
    focus_skills: ['naturalness'],
    topic: 'Công việc',
    register: 'casual',
    difficulty: 6,
    reason: 'Điểm tự nhiên của bạn còn thấp.',
    status: 'active',
    provider: 'fake',
    model: 'fake-model',
    prompt_version: 'daily_mission_generation:v1',
    created_at: '2026-01-01T00:00:00Z',
  },
  focus: {},
  recommendation: null,
  session_summary: null,
  encouragement: 'Cố lên! Hôm nay còn 1 bài nữa là đạt mục tiêu.',
  reminders: ['Chưa luyện tập hôm nay'],
}

const milestonesPayload = {
  items: [
    {
      id: 'm-1',
      milestone_key: 'exercises_10',
      title: '10 bài viết',
      description: 'Hoàn thành 10 bài viết được đánh giá.',
      achieved_at: '2026-01-02T00:00:00Z',
      celebration: { message: 'Chúc mừng! Bạn đã hoàn thành 10 bài viết!' },
    },
  ],
}

const journeyPayload = {
  goal_type: 'jlpt',
  goal: 'Thi JLPT N3',
  title: 'Chinh phục JLPT N3',
  progress: 40,
  current_milestone_id: 'ms-1',
  current_objective_id: 'ob-1',
  milestones: [
    { id: 'ms-1', title: 'Giai đoạn 1', description: 'Nắm vững ngữ pháp N3.', objective_ids: ['ob-1'] },
  ],
  objectives: [
    { id: 'ob-1', title: 'Ngữ pháp câu ghép', description: 'Luyện câu ghép N3.', status: 'in_progress' },
  ],
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
      current: 45,
      baseline: 40,
      delta: 5,
      trend: 'up',
      evidence_count: 6,
      insufficient_evidence: false,
      note: null,
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

function mockFetch(options: { todayStatus?: number; todayError?: unknown } = {}) {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('/api/v1/learning/today')) {
      if (options.todayStatus && options.todayStatus >= 400) {
        return jsonResponse(options.todayError, options.todayStatus)
      }
      return jsonResponse(todayPayload)
    }
    if (url.includes('/api/v1/gamification/today')) {
      return jsonResponse(gamificationPayload)
    }
    if (url.includes('/api/v1/gamification/milestones')) {
      return jsonResponse(milestonesPayload)
    }
    if (url.includes('/api/v1/gamification/mission/regenerate')) {
      return jsonResponse(gamificationPayload.mission, 201)
    }
    if (url.includes('/api/v1/learning/next')) {
      return jsonResponse(todayPayload.recommendation, 201)
    }
    if (url.includes('/api/v1/learning/journey')) {
      return jsonResponse(journeyPayload)
    }
    if (url.includes('/health')) {
      return jsonResponse(healthPayload)
    }
    if (url.includes('/api/v1/analytics/learner-summary')) {
      return jsonResponse(learnerSummaryPayload)
    }
    return jsonResponse({ status: 'ok' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockFetch()
  })

  it('shows the greeting with streak and mission progress', async () => {
    renderPage()
    expect(
      await screen.findByText(
        (_, element) =>
          element?.className === 'jw-greet-line2' && element.textContent?.includes('ngày thứ 5') === true,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) =>
          element?.className === 'jw-greet-line2' && element.textContent?.includes('xong nhiệm vụ') === true,
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Luyện tập ngay' }).length).toBeGreaterThan(0)
  })

  it('shows the system health status', async () => {
    renderPage()
    expect(await screen.findByText(/API hoạt động bình thường/)).toBeInTheDocument()
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument()
  })

  it('shows the learner focus card', async () => {
    renderPage()
    expect(await screen.findByText('Trọng tâm AI')).toBeInTheDocument()
    expect(screen.getByText('12 bài viết')).toBeInTheDocument()
    expect(screen.getByText('Điểm trung bình')).toBeInTheDocument()
    expect(screen.getByText('68/100')).toBeInTheDocument()
    expect(screen.getByText('+4.5')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('shows the recommendation of the day with its exercise', async () => {
    renderPage()
    expect(
      await screen.findByText('Bạn cần cải thiện ngữ pháp để viết tự nhiên hơn.'),
    ).toBeInTheDocument()
    expect(screen.getByText('JLPT N3')).toBeInTheDocument()
    expect(screen.getByText('Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.')).toBeInTheDocument()
  })

  it('refreshes the recommendation via the API', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Gợi ý khác' }))
    await waitFor(() => {
      const fetchMock = vi.mocked(fetch)
      const nextCall = fetchMock.mock.calls.find(
        ([url, init]) => init?.method === 'POST' && String(url).includes('/api/v1/learning/next'),
      )
      expect(nextCall).toBeDefined()
    })
  })

  it('shows the empty state for a fresh learner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/v1/learning/today')) return jsonResponse(emptyTodayPayload)
        if (url.includes('/api/v1/gamification/today')) {
          return jsonResponse({
            ...gamificationPayload,
            summary: {
              level: { current_level: 1, current_xp: 0, xp_in_level: 0, xp_to_next_level: 100, progress_percent: 0 },
              current_streak: 0,
              longest_streak: 0,
              last_active_date: null,
              today_xp: 0,
              daily_goal: { target: 3, completed_count: 0, completed: false, progress_percent: 0 },
            },
            mission: null,
          })
        }
        if (url.includes('/api/v1/gamification/milestones')) {
          return jsonResponse({ items: [] })
        }
        if (url.includes('/health')) return jsonResponse(healthPayload)
        return jsonResponse({ status: 'ok' })
      }),
    )
    renderPage()
    expect(await screen.findByText(/Bạn chưa có bài chấm điểm nào/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Nhận gợi ý bài tập' })).toBeInTheDocument()
    expect(screen.getByText(/Hãy bắt đầu một bài tập/)).toBeInTheDocument()
  })

  it('shows the error state when the learning API fails', async () => {
    mockFetch({
      todayStatus: 502,
      todayError: { error: { code: 'adaptive_learning_error', message: 'Synthesis failed' } },
    })
    renderPage()
    expect(
      await screen.findByText(/Không thể tải hồ sơ học tập/),
    ).toBeInTheDocument()
  })

  it('shows the progress card with level, streak, XP and daily goal', async () => {
    renderPage()
    expect(await screen.findByText('Cấp 3')).toBeInTheDocument()
    expect(screen.getByText('250 XP · còn 150 XP')).toBeInTheDocument()
    expect(screen.getByText('5 ngày (kỷ lục: 9)')).toBeInTheDocument()
    expect(screen.getByText('40 XP')).toBeInTheDocument()
    expect(screen.getByText('2/3 · còn 1')).toBeInTheDocument()
  })

  it('shows the daily mission and allows regenerating it', async () => {
    renderPage()
    expect(await screen.findByText('Tự nhiên hóa câu văn')).toBeInTheDocument()
    expect(screen.getByText('Luyện tập 3 bài để cải thiện độ tự nhiên.')).toBeInTheDocument()
    expect(screen.getByText('Điểm tự nhiên của bạn còn thấp.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Đổi nhiệm vụ khác' }))
    await waitFor(() => {
      const fetchMock = vi.mocked(fetch)
      const regenerateCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          init?.method === 'POST' && String(url).includes('/mission/regenerate'),
      )
      expect(regenerateCall).toBeDefined()
    })
  })

  it('shows the journey card', async () => {
    renderPage()
    expect(await screen.findByText('Chinh phục JLPT N3')).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) =>
          element?.className === 'jw-recent-line' &&
          element.textContent?.includes('Mục tiêu hiện tại: Ngữ pháp câu ghép') === true,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem lộ trình' })).toHaveAttribute('href', '/journey')
  })

  it('shows the recent improvement card from analytics', async () => {
    renderPage()
    expect(await screen.findByText('Cải thiện gần đây')).toBeInTheDocument()
    expect(await screen.findByText('56.0/100')).toBeInTheDocument()
    expect(screen.getByText('+5.3')).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) =>
          element?.className === 'jw-recent-line' && element.textContent?.includes('Tự nhiên') === true,
      ),
    ).toBeInTheDocument()
  })

  it('shows the achievements list', async () => {
    renderPage()
    expect(await screen.findByText('Mốc thành tích')).toBeInTheDocument()
    expect(await screen.findByText('10 bài viết')).toBeInTheDocument()
    expect(screen.getByText('Hoàn thành 10 bài viết được đánh giá.')).toBeInTheDocument()
  })

  it('shows the empty mission state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/v1/learning/today')) return jsonResponse(todayPayload)
        if (url.includes('/api/v1/gamification/today')) {
          return jsonResponse({ ...gamificationPayload, mission: null })
        }
        if (url.includes('/api/v1/gamification/milestones')) {
          return jsonResponse({ items: [] })
        }
        if (url.includes('/health')) return jsonResponse(healthPayload)
        return jsonResponse({ status: 'ok' })
      }),
    )
    renderPage()
    expect(await screen.findByText(/Chưa có nhiệm vụ hôm nay/)).toBeInTheDocument()
    expect(
      await screen.findByText('Chưa có mốc nào. Hãy luyện tập để mở khóa các mốc đầu tiên!'),
    ).toBeInTheDocument()
  })
})