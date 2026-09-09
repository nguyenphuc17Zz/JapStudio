import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ChallengePage from '../pages/ChallengePage'
import type { Challenge, ChallengeAttempt } from '../types/api'

const challenge: Challenge = {
  id: 'ch-1',
  challenge_type: 'vocabulary',
  instruction_vi: 'Viết một câu có sử dụng từ "立て込む".',
  source_text: '今日は仕事が忙しいです。',
  target_skill: 'vocabulary',
  difficulty: 5,
  objective: 'Mở rộng vốn từ vựng',
  required_expression: '立て込む',
  exercise_id: 'ex-1',
  status: 'active',
  success_criteria: { threshold: 80 },
  xp_reward: 15,
  completed: false,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

const successAttempt: ChallengeAttempt = {
  id: 'ca-1',
  challenge_id: 'ch-1',
  attempt_id: 'at-1',
  success: true,
  score: 88,
  answer_text: '今日は仕事が立て込んでいるので、帰りが遅くなります。',
  evaluation: {
    summary: 'Bài viết tốt, sử dụng đúng từ yêu cầu.',
    issues: [],
  },
  xp_awarded: 15,
  created_at: '2026-01-01T00:00:00Z',
}

const failedAttempt: ChallengeAttempt = {
  ...successAttempt,
  id: 'ca-2',
  success: false,
  score: 64,
  xp_awarded: 0,
  evaluation: {
    summary: 'Chưa đạt yêu cầu.',
    issues: [
      {
        category: 'vocabulary',
        explanation: 'Chưa dùng đúng từ yêu cầu.',
        suggested_fix: 'Dùng "立て込む" thay cho "忙しい".',
      },
    ],
  },
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

describe('ChallengePage', () => {
  beforeEach(() => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/challenges/generate')) {
        return jsonResponse(challenge, 201)
      }
      if (url.includes('/attempts') && init?.method === 'POST') {
        return jsonResponse(successAttempt, 201)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('shows the empty state before generating', async () => {
    render(
      <MemoryRouter>
        <ChallengePage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Chưa có thử thách nào')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nhận thử thách' })).toBeInTheDocument()
  })

  it('generates a challenge and renders the landing', async () => {
    render(
      <MemoryRouter>
        <ChallengePage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Nhận thử thách' }))
    expect(await screen.findByText('THỬ THÁCH · TỪ VỰNG')).toBeInTheDocument()
    expect(
      screen.getByText('Viết một câu có sử dụng từ "立て込む".'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }))
    expect(await screen.findByText('立て込む')).toBeInTheDocument()
    expect(screen.getByText('+15 XP')).toBeInTheDocument()
  })

  it('submits an answer and shows the success result with XP', async () => {
    render(
      <MemoryRouter>
        <ChallengePage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Nhận thử thách' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
    await userEvent.type(
      await screen.findByLabelText('Câu trả lời tiếng Nhật của bạn'),
      '今日は仕事が立て込んでいるので、帰りが遅くなります。',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bài' }))
    expect(await screen.findByText('THỬ THÁCH HOÀN THÀNH')).toBeInTheDocument()
    expect(screen.getByText('+15 XP')).toBeInTheDocument()
    expect(screen.getByText('88')).toBeInTheDocument()
  })

  it('shows a friendly failure state with a retry action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/api/v1/challenges/generate')) {
          return jsonResponse(challenge, 201)
        }
        if (url.includes('/attempts') && init?.method === 'POST') {
          return jsonResponse(failedAttempt, 201)
        }
        return jsonResponse({ status: 'ok' })
      }),
    )
    render(
      <MemoryRouter>
        <ChallengePage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Nhận thử thách' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
    await userEvent.type(
      await screen.findByLabelText('Câu trả lời tiếng Nhật của bạn'),
      '今日は仕事が忙しいです。',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bài' }))
    expect(await screen.findByText('CHƯA ĐẠT NHÉ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('shows the error state when generation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/v1/challenges/generate')) {
          return jsonResponse(
            { error: { code: 'challenge_generation_error', message: 'Generation failed' } },
            502,
          )
        }
        return jsonResponse({ status: 'ok' })
      }),
    )
    render(
      <MemoryRouter>
        <ChallengePage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Nhận thử thách' }))
    expect(await screen.findByText('Không thể tạo thử thách lúc này.')).toBeInTheDocument()
    expect(screen.getByText(/Generation failed/)).toBeInTheDocument()
  })
})