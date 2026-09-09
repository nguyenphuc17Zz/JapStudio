import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VocabularyDetailPage from '../pages/VocabularyDetailPage'
import type { VocabularyDetail } from '../types/api'

function makeDetail(overrides: Partial<VocabularyDetail> = {}): VocabularyDetail {
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
    notes: 'Thường dùng với 仕事が.',
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
    source_attempt_id: 'att-1',
    source_exercise_id: 'ex-1',
    user_expression: 'とても忙しい',
    learning_reason: 'Tự nhiên hơn とても忙しい trong công việc.',
    discovered_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    provider: 'fake',
    model: 'fake-model',
    prompt_version: 'vocabulary_extraction:v1',
    vocabulary_version: 'vocabulary:v1',
    discoveries: [
      {
        id: 'd1',
        attempt_id: 'att-1',
        exercise_id: 'ex-1',
        attempt_number: 1,
        exercise_prompt_vi: 'Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.',
        source_type: 'ai_natural',
        user_expression: 'とても忙しい',
        learning_reason: 'Tự nhiên hơn.',
        context_snippet: '今日は仕事が立て込んでいる。',
        example_sentence: '今日は仕事が立て込んでいます。',
        provider: 'fake',
        model: 'fake-model',
        prompt_version: 'vocabulary_extraction:v1',
        vocabulary_version: 'vocabulary:v1',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    ...overrides,
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

function renderPage(id = 'v1') {
  return render(
    <MemoryRouter initialEntries={[`/vocabulary/${id}`]}>
      <Routes>
        <Route path="/vocabulary/:id" element={<VocabularyDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VocabularyDetailPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(makeDetail())))
  })

  it('renders the full vocabulary detail', async () => {
    renderPage()
    expect(await screen.findByText('立て込む')).toBeInTheDocument()
    expect(screen.getByText('quá bận rộn')).toBeInTheDocument()
    expect(screen.getByText('Tự nhiên hơn とても忙しい trong công việc.')).toBeInTheDocument()
    expect(screen.getByText('今日は仕事が立て込んでいます。')).toBeInTheDocument()
    expect(screen.getByText('仕事が詰まっている')).toBeInTheDocument()
    expect(screen.getByText('Thường dùng với 仕事が.')).toBeInTheDocument()
  })

  it('shows usage habits and provenance', async () => {
    renderPage()
    expect(await screen.findByText('Được phát hiện 2 lần')).toBeInTheDocument()
    expect(screen.getByText('Sai 1 lần')).toBeInTheDocument()
    expect(screen.getByText('fake-model', { exact: false })).toBeInTheDocument()
  })

  it('shows discovery provenance', async () => {
    renderPage()
    expect(
      await screen.findByText('「今日は仕事が立て込んでいる。」'),
    ).toBeInTheDocument()
    expect(screen.getByText(/bạn viết/)).toBeInTheDocument()
    expect(screen.getByText(/Bài tập lần 1/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Quay lại ngân hàng từ vựng' })).toBeInTheDocument()
  })

  it('shows an error and a back link when the entry is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ error: { code: 'not_found', message: 'missing' } }, 404)),
    )
    renderPage('missing')
    expect(await screen.findByText(/Không thể tải từ vựng/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Quay lại ngân hàng từ vựng' })).toBeInTheDocument()
  })
})