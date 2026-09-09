import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ToastProvider } from '../components/ui/Toast'

const gamificationPayload = {
  summary: {
    level: { current_level: 1, current_xp: 0, xp_in_level: 0, xp_to_next_level: 100, progress_percent: 0 },
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    today_xp: 0,
    daily_goal: { target: 3, completed_count: 0, completed: false, progress_percent: 0 },
  },
  mission: null,
  focus: {},
  recommendation: null,
  session_summary: null,
  encouragement: null,
  reminders: [],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

function renderApp(initialEntry: string) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App />
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>,
  )
}

describe('App', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/v1/learning/today')) {
          return jsonResponse({
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
          })
        }
        if (url.includes('/api/v1/gamification/today')) return jsonResponse(gamificationPayload)
        if (url.includes('/api/v1/gamification/milestones')) {
          return jsonResponse({ items: [] })
        }
        if (url.includes('/health')) {
          return jsonResponse({
            status: 'ok',
            app: 'test-app',
            version: '0.1.0',
            environment: 'test',
            timestamp: '2026-01-01T00:00:00Z',
            database: 'ok',
          })
        }
        if (url.includes('/api/v1/exercises')) {
          return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
        }
        if (url.includes('/api/v1/learning/recommendation')) return jsonResponse(null)
        if (url.includes('/api/v1/learning/profile')) {
          return jsonResponse({
            id: 'p-1',
            goal: null,
            target_jlpt: null,
            daily_target: 3,
            preferred_registers: null,
            preferred_topics: null,
            native_language: 'vi',
            target_level: null,
            adaptive_state: {},
            evidence_count: 0,
            profile_version: 'learner_profile:v1',
            streak_enabled: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          })
        }
        if (url.includes('/api/v1/ai/providers')) {
          return jsonResponse({
            default_provider: 'fake',
            fallback_providers: [],
            providers: [],
          })
        }
        if (url.includes('/api/v1/vocabulary/some-id') || url.includes('/api/v1/vocabulary/')) {
          return jsonResponse({
            id: 'some-id',
            expression: '日本語',
            reading: 'にほんご',
            type: 'word',
            meaning_vi: 'Tiếng Nhật',
            part_of_speech: 'Danh từ',
            estimated_jlpt_level: 'N5',
            difficulty: 2,
            importance: 5,
            register: 'polite',
            familiarity: 'familiar',
            learning_reason: 'Từ vựng quan trọng',
            example_sentence: '日本語を勉強します。',
            natural_alternatives: [],
            discoveries: [],
            seen_count: 5,
            used_count: 3,
            discovered_count: 1,
            incorrect_count: 0,
            correct_usage_count: 3,
            model: 'gemini-2.0-flash',
          })
        }
        if (url.includes('/api/v1/vocabulary')) {
          return jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })
        }
        return jsonResponse({ status: 'ok' })
      }),
    )
  })

  it('renders the application shell with navigation', () => {
    renderApp('/')
    expect(screen.getByText('Japanese Writing Studio')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Luyện tập' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Từ vựng' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trí nhớ' })).toBeInTheDocument()
  })

  it('renders the dashboard by default', async () => {
    renderApp('/')
    expect(
      await screen.findByText('Trung tâm học tập hằng ngày — nhiệm vụ, trọng tâm và bài tập gợi ý cho bạn.'),
    ).toBeInTheDocument()
    expect(await screen.findByText(/API hoạt động bình thường/)).toBeInTheDocument()
  })

  it('routes to the practice page', async () => {
    renderApp('/practice')
    expect(
      await screen.findByText('Thực hành dịch Việt – Nhật với các bài tập do AI tạo.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('routes to the free writing page', async () => {
    renderApp('/free-writing')
    expect(
      await screen.findByText('Nhận đề tài từ AI và luyện viết tiếng Nhật tự do.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('routes to the challenge page', async () => {
    renderApp('/challenge')
    expect(
      await screen.findByText(
        'Thử thách viết do AI tạo dựa trên điểm yếu của bạn — hoàn thành để nhận XP.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })

  it('routes to the vocabulary page', async () => {
    renderApp('/vocabulary')
    expect(
      await screen.findByText(
        'Ngân hàng từ vựng cá nhân, tự động tích lũy từ các bài viết được AI đánh giá.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })

  it('routes to the vocabulary detail page', async () => {
    renderApp('/vocabulary/some-id')
    expect(await screen.findByText('Thói quen sử dụng', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('routes to the history page', async () => {
    renderApp('/history')
    expect(
      await screen.findByText('Lịch sử luyện tập và các bài viết đã được đánh giá.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('routes to the settings page', async () => {
    renderApp('/settings')
    expect(
      await screen.findByText('Tùy chỉnh hồ sơ, trình độ và cấu hình ứng dụng.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('routes to the memory page', async () => {
    renderApp('/memory')
    expect(await screen.findByText('Trí nhớ học tập', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('routes to the scenario page', async () => {
    renderApp('/scenario')
    expect(
      await screen.findByText(
        'Nhiệm vụ Viết Thực tế (Real-World Writing Missions)',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })

  it('routes to the kanji studio page', async () => {
    renderApp('/kanji')
    expect(
      await screen.findByText('Kanji Studio · Luyện viết Chữ Hán', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('redirects /dashboard to the dashboard', async () => {
    renderApp('/dashboard')
    expect(
      await screen.findByText('Trung tâm học tập hằng ngày — nhiệm vụ, trọng tâm và bài tập gợi ý cho bạn.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('redirects unknown routes to the dashboard', () => {
    renderApp('/does-not-exist')
    expect(screen.getByText('Trạng thái hệ thống')).toBeInTheDocument()
  })
})