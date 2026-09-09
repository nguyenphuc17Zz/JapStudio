import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FreeWritingPage from '../pages/FreeWritingPage'
import type { Exercise, WritingScenario } from '../types/api'

const topic: Exercise = {
  id: 'fw-1',
  exercise_type: 'free_writing',
  topic: 'Hobbies',
  subtopic: 'Photography',
  context: 'Bạn vừa tham gia một câu lạc bộ nhiếp ảnh.',
  prompt_vi: 'Hãy viết khoảng 100–150 chữ tiếng Nhật kể về sở thích của bạn.',
  target_length: 'paragraph',
  register: 'casual',
  jlpt_level: 'N3',
  difficulty: 5,
  grammar_complexity: 5,
  vocabulary_complexity: 6,
  context_complexity: 7,
  naturalness_target: 8,
  status: 'pending',
  generation_metadata: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

describe('FreeWritingPage', () => {
  beforeEach(() => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/exercises') && init?.method === 'POST') {
        return jsonResponse(topic, 201)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('generates a topic and opens the writing studio', async () => {
    render(<MemoryRouter><FreeWritingPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo đề tài' }))

    expect(
      await screen.findByText('Hãy viết khoảng 100–150 chữ tiếng Nhật kể về sở thích của bạn.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Hobbies › Photography')).toBeInTheDocument()
    expect(screen.getAllByText('Đoạn văn (80–150 chữ)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Thân mật').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Bài viết tiếng Nhật của bạn')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi bài' })).toBeInTheDocument()

    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const body = JSON.parse(postCall?.[1]?.body as string)
    expect(body.exercise_type).toBe('free_writing')
  })

  it('forwards register and length preferences', async () => {
    render(<MemoryRouter><FreeWritingPage /></MemoryRouter>)
    await userEvent.selectOptions(await screen.findByLabelText('Ngữ điệu'), 'business')
    await userEvent.selectOptions(screen.getByLabelText('Độ dài'), 'long_writing')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo đề tài' }))

    await screen.findByText('Hãy viết khoảng 100–150 chữ tiếng Nhật kể về sở thích của bạn.')
    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const body = JSON.parse(postCall?.[1]?.body as string)
    expect(body.register).toBe('business')
    expect(body.target_length).toBe('long_writing')
  })

  it('shows the loading state while generating', async () => {
    let resolveGenerate!: (value: unknown) => void
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/api/v1/exercises') && init?.method === 'POST') {
          return new Promise((resolve) => {
            resolveGenerate = resolve
          })
        }
        return jsonResponse({ status: 'ok' })
      }),
    )

    render(<MemoryRouter><FreeWritingPage /></MemoryRouter>)
    const generateButton = await screen.findByRole('button', { name: 'Tạo đề tài' })
    await userEvent.click(generateButton)
    expect(generateButton).toBeDisabled()

    resolveGenerate({ ok: true, status: 201, json: async () => topic })
    expect(
      await screen.findByText('Hãy viết khoảng 100–150 chữ tiếng Nhật kể về sở thích của bạn.'),
    ).toBeInTheDocument()
  })

  it('shows the error state when generation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/api/v1/exercises') && init?.method === 'POST') {
          return jsonResponse(
            { error: { code: 'exercise_generation_error', message: 'AI is busy' } },
            502,
          )
        }
        return jsonResponse({ status: 'ok' })
      }),
    )

    render(<MemoryRouter><FreeWritingPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo đề tài' }))
    expect(await screen.findByText('Không thể tạo đề lúc này.')).toBeInTheDocument()
    expect(screen.getByText(/AI is busy/)).toBeInTheDocument()
  })

  it('loads the exercise and scenario from query parameters', async () => {
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
      optional_points: [],
      forbidden_patterns: ['Không dùng từ quá thân mật.'],
      difficulty: 6,
      difficulty_metadata: {},
      generation_metadata: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/v1/exercises/fw-1')) {
        return jsonResponse(topic)
      }
      if (url.includes('/api/v1/scenarios/sc-1')) {
        return jsonResponse(scenario)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/free-writing?exercise=fw-1&scenario=sc-1']}>
        <FreeWritingPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Hãy viết khoảng 100–150 chữ tiếng Nhật kể về sở thích của bạn.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Bạn cần gửi email xin nghỉ phép cho quản lý.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Nêu rõ lý do xin nghỉ.')).toBeInTheDocument()
    expect(screen.getAllByText('Tình huống').length).toBeGreaterThan(0)
    expect(screen.queryByText('Tạo đề tài viết')).not.toBeInTheDocument()

    const exerciseCall = fetchMock.mock.calls.find(([url]) =>
      url.includes('/api/v1/exercises/fw-1'),
    )
    expect(exerciseCall).toBeDefined()
  })
})