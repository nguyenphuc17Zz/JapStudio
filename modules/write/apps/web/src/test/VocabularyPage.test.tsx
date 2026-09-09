import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VocabularyPage from '../pages/VocabularyPage'
import type { VocabularyListItem } from '../types/api'

function makeItem(overrides: Partial<VocabularyListItem> = {}): VocabularyListItem {
  return {
    id: 'v1',
    expression: '立て込む',
    reading: 'たてこむ',
    type: 'word',
    meaning_vi: 'quá bận rộn',
    part_of_speech: '動詞',
    estimated_jlpt_level: 'N2',
    difficulty: 7,
    register: 'business',
    usage_context: 'work',
    example_sentence: '今日は仕事が立て込んでいます。',
    natural_alternatives: ['仕事が詰まっている'],
    notes: null,
    importance: 7,
    confidence: 'high',
    familiarity: 'learning',
    discovered_count: 2,
    seen_count: 2,
    used_count: 1,
    incorrect_count: 1,
    correct_usage_count: 0,
    last_seen: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <VocabularyPage />
    </MemoryRouter>,
  )
}

describe('VocabularyPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({
          items: [makeItem(), makeItem({ id: 'v2', expression: '仕事が立て込んでいる', type: 'expression' })],
          total: 2,
          skip: 0,
          limit: 50,
        }),
      ),
    )
  })

  it('renders the vocabulary bank list', async () => {
    renderPage()
    expect(await screen.findByText('立て込む')).toBeInTheDocument()
    expect(screen.getByText('仕事が立て込んでいる')).toBeInTheDocument()
    expect(screen.getAllByText('quá bận rộn').length).toBe(2)
    expect(screen.getByText('Ngân hàng từ vựng (2)')).toBeInTheDocument()
    expect(screen.getAllByText('Đang học').length).toBe(2)
  })

  it('links each item to its detail page', async () => {
    renderPage()
    const viewLinks = await screen.findAllByRole('link', { name: 'Xem' })
    expect(viewLinks[0]).toHaveAttribute('href', '/vocabulary/v1')
  })

  it('shows the empty state when the bank is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ items: [], total: 0, skip: 0, limit: 50 })),
    )
    renderPage()
    expect(await screen.findByText('Chưa có từ vựng')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ error: { code: 'internal_error', message: 'boom' } }, 500)),
    )
    renderPage()
    expect(await screen.findByText(/Không thể tải từ vựng/)).toBeInTheDocument()
  })

  it('filters by type', async () => {
    const fetchMock = vi.fn((_url: string) =>
      jsonResponse({ items: [makeItem()], total: 1, skip: 0, limit: 50 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    await screen.findByText('立て込む')

    await userEvent.selectOptions(screen.getByLabelText('Loại từ vựng'), 'expression')
    await screen.findByText('立て込む')
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
    expect(String(lastCall[0])).toContain('type=expression')
  })

  it('searches on enter', async () => {
    const fetchMock = vi.fn((_url: string) =>
      jsonResponse({ items: [makeItem()], total: 1, skip: 0, limit: 50 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    await screen.findByText('立て込む')

    const input = screen.getByLabelText('Tìm kiếm từ vựng')
    await userEvent.type(input, '立て込む{Enter}')
    await screen.findByText('立て込む')
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
    expect(String(lastCall[0])).toContain('search=%E7%AB%8B%E3%81%A6%E8%BE%BC%E3%82%80')
  })
})