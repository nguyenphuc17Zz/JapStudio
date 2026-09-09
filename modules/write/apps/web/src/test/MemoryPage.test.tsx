import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MemoryPage from '../pages/MemoryPage'

const memoriesPayload = {
  items: [
    {
      id: 'mem-1',
      category: 'mistake_pattern',
      type: 'pattern',
      content: 'Hay quên trợ từ の trong cụm danh từ.',
      confidence: 'medium',
      importance: 7,
      source_type: 'evaluation',
      source_id: 'attempt-1',
      evidence: [],
      occurrence_count: 3,
      status: 'active',
      memory_class: 'stable',
      first_seen_at: '2026-08-01T00:00:00Z',
      last_seen_at: '2026-08-10T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-10T00:00:00Z',
    },
    {
      id: 'mem-2',
      category: 'preference',
      type: 'preference',
      content: 'Thích viết email công việc hơn tin nhắn.',
      confidence: 'high',
      importance: 8,
      source_type: 'user_explicit',
      source_id: null,
      evidence: [],
      occurrence_count: 1,
      status: 'archived',
      memory_class: 'stable',
      first_seen_at: '2026-08-02T00:00:00Z',
      last_seen_at: '2026-08-02T00:00:00Z',
      created_at: '2026-08-02T00:00:00Z',
      updated_at: '2026-08-02T00:00:00Z',
    },
  ],
  total: 2,
  skip: 0,
  limit: 100,
}

const refreshPayload = {
  processed_events: 3,
  created: 1,
  updated: 1,
  rejected: 1,
  expired: 0,
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })
}

describe('MemoryPage', () => {
  beforeEach(() => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes('/api/v1/learning/memory/refresh'))
        return jsonResponse(refreshPayload)
      if (String(url).includes('/api/v1/learning/memory')) {
        if (init?.method === 'POST') return jsonResponse(memoriesPayload.items[1], 201)
        if (init?.method === 'DELETE') return jsonResponse(null, 204)
        return jsonResponse(memoriesPayload)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
  }

  it('renders the page header and memory list', async () => {
    renderPage()
    expect(await screen.findByText('Trí nhớ học tập')).toBeInTheDocument()
    expect(await screen.findByText('Hay quên trợ từ の trong cụm danh từ.')).toBeInTheDocument()
    expect(screen.getAllByText('Lỗi sai').length).toBeGreaterThan(0)
    expect(screen.getByText('Từ đánh giá')).toBeInTheDocument()
    expect(screen.getByText(/Gặp 3 lần/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no memories', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ items: [], total: 0, skip: 0, limit: 100 }),
      ),
    )
    renderPage()
    expect(await screen.findByText('Chưa có ghi nhớ nào')).toBeInTheDocument()
  })

  it('creates a memory manually', async () => {
    renderPage()
    await userEvent.selectOptions(screen.getByLabelText('Loại ghi nhớ'), 'goal_memory')
    await userEvent.type(
      screen.getByLabelText('Nội dung'),
      'Mục tiêu JLPT N3 trong 6 tháng',
    )
    await userEvent.clear(screen.getByLabelText('Mức quan trọng (1–10)'))
    await userEvent.type(screen.getByLabelText('Mức quan trọng (1–10)'), '9')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ghi nhớ' }))
    await waitFor(() => expect(screen.getByText('Đã lưu ghi nhớ.')).toBeInTheDocument())
    const fetchMock = vi.mocked(fetch)
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/api/v1/learning/memory'),
    )
    expect(postCall).toBeDefined()
    expect(JSON.parse(postCall?.[1]?.body as string)).toEqual({
      category: 'goal_memory',
      content: 'Mục tiêu JLPT N3 trong 6 tháng',
      importance: 9,
    })
  })

  it('forgets a memory', async () => {
    renderPage()
    await screen.findByText('Hay quên trợ từ の trong cụm danh từ.')
    await userEvent.click(screen.getByRole('button', { name: 'Quên' }))
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true))
  })

  it('archives a memory', async () => {
    renderPage()
    await screen.findByText('Hay quên trợ từ の trong cụm danh từ.')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu trữ' }))
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([url, init]) =>
              init?.method === 'POST' && String(url).includes('/archive'),
          ),
      ).toBe(true),
    )
  })

  it('refreshes memories from recent activity', async () => {
    renderPage()
    await screen.findByText('Trí nhớ học tập')
    await userEvent.click(screen.getByRole('button', { name: 'Đồng bộ ghi nhớ' }))
    await waitFor(() =>
      expect(screen.getByText(/Đã xử lý 3 sự kiện/)).toBeInTheDocument(),
    )
  })
})