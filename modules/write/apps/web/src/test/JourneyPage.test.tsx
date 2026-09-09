import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JourneyPage from '../pages/JourneyPage'
import type { JourneyStatusResponse } from '../types/api'

const journeyPayload: JourneyStatusResponse = {
  journey_id: 'journey-1',
  status: 'active',
  goal_type: 'business',
  goal: 'Giao tiếp công việc bằng tiếng Nhật',
  title: 'Lộ trình học tiếng Nhật (Tiếng Nhật công việc)',
  overview_vi: null,
  progress: 33,
  source: 'deterministic',
  current_milestone_id: 'milestone-1',
  current_objective_id: 'objective-2',
  explanation: null,
  started_at: '2026-01-01T00:00:00Z',
  completed_at: null,
  milestones: [
    {
      id: 'milestone-1',
      position: 1,
      title: 'Nền tảng công việc',
      description: 'Xây dựng nền tảng cho giao tiếp công việc.',
      status: 'active',
      unlocked_at: '2026-01-01T00:00:00Z',
      completed_at: null,
    },
    {
      id: 'milestone-2',
      position: 2,
      title: 'Kỹ năng chuyên sâu',
      description: 'Chuyên sâu hơn theo công việc.',
      status: 'locked',
      unlocked_at: null,
      completed_at: null,
    },
  ],
  objectives: [
    {
      id: 'objective-1',
      milestone_id: 'milestone-1',
      position: 1,
      title: 'Viết email giới thiệu',
      description: 'Viết email giới thiệu bản thân.',
      target_competencies: ['professional_writing'],
      target_skills: ['naturalness', 'register_fit'],
      exercise_modes: ['email_writing'],
      target_level: 'N3',
      priority: 80,
      status: 'completed',
      unlocked_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-02T00:00:00Z',
    },
    {
      id: 'objective-2',
      milestone_id: 'milestone-1',
      position: 2,
      title: 'Viết email báo cáo',
      description: 'Viết email báo cáo công việc.',
      target_competencies: ['professional_writing'],
      target_skills: ['naturalness', 'register_fit'],
      exercise_modes: ['email_writing'],
      target_level: 'N3',
      priority: 80,
      status: 'active',
      unlocked_at: '2026-01-02T00:00:00Z',
      completed_at: null,
    },
    {
      id: 'objective-3',
      milestone_id: 'milestone-2',
      position: 1,
      title: 'Viết báo cáo dự án',
      description: 'Viết báo cáo tiến độ dự án.',
      target_competencies: ['professional_writing'],
      target_skills: ['naturalness'],
      exercise_modes: ['report_writing'],
      target_level: 'N3',
      priority: 80,
      status: 'locked',
      unlocked_at: null,
      completed_at: null,
    },
  ],
  objectives_progress: {
    'objective-1': {
      skill_evidence: { naturalness: { score: 82, count: 3 } },
      mastery_state: 'proficient',
      exercises_completed: 3,
      attempts_submitted: 4,
      average_score: 82,
      best_score: 90,
    },
    'objective-2': {
      skill_evidence: {},
      mastery_state: 'introduced',
      exercises_completed: 1,
      attempts_submitted: 1,
      average_score: 70,
      best_score: 70,
    },
  },
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

describe('JourneyPage', () => {
  beforeEach(() => {
    let current: JourneyStatusResponse | null = null
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/learning/journey')) {
        if (init?.method === 'POST') {
          current = journeyPayload
          return jsonResponse(journeyPayload, 201)
        }
        return jsonResponse(current)
      }
      if (url.includes('/explanation')) {
        return jsonResponse({
          objective_id: 'objective-2',
          summary_vi: 'Tóm tắt mục tiêu.',
          recommended_focus_vi: 'Tập trung vào độ tự nhiên.',
          source: 'deterministic',
        })
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <JourneyPage />
      </MemoryRouter>,
    )
  }

  it('shows the create form when no journey exists', async () => {
    renderPage()
    expect(await screen.findByText('Bắt đầu một lộ trình học')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo lộ trình' })).toBeInTheDocument()
  })

  it('creates a journey and renders milestones and objectives', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo lộ trình' }))
    expect(await screen.findByText('Nền tảng công việc')).toBeInTheDocument()
    expect(screen.getByText('Viết email giới thiệu')).toBeInTheDocument()
    expect(screen.getByText('Viết email báo cáo')).toBeInTheDocument()
    expect(screen.getByText('Viết báo cáo dự án')).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/journey'),
    )
    expect(postCall).toBeDefined()
    const body = JSON.parse(postCall?.[1]?.body as string)
    expect(body).toEqual({ goal_type: 'general', force_regenerate: false })
  })

  it('marks the current objective and shows mastery labels', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo lộ trình' }))
    expect(await screen.findByText('đang luyện')).toBeInTheDocument()
    expect(screen.getByText('82/100')).toBeInTheDocument()
    expect(screen.getByText('Thành thục')).toBeInTheDocument()
    expect(screen.getByText('Đã làm quen')).toBeInTheDocument()
  })

  it('regenerates the journey with force_regenerate', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo lộ trình' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo lại lộ trình' }))
    await waitFor(() => {
      const fetchMock = vi.mocked(fetch)
      const calls = fetchMock.mock.calls.filter(
        ([url, init]) => init?.method === 'POST' && String(url).includes('/journey'),
      )
      expect(calls.length).toBeGreaterThanOrEqual(2)
      const last = JSON.parse(calls[calls.length - 1]?.[1]?.body as string)
      expect(last.force_regenerate).toBe(true)
    })
  })
})