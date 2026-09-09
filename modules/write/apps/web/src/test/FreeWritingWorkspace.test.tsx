import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FreeWritingPage from '../pages/FreeWritingPage'
import { ToastProvider } from '../components/ui/Toast'
import type {
  Exercise,
  WritingEvaluationResponse,
  WritingSubmissionResponse,
} from '../types/api'

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

const evaluation1: WritingEvaluationResponse = {
  submission_id: 'sub-1',
  revision_number: 1,
  revision_id: 'rev-1',
  attempt_id: 'att-1',
  exercise_id: 'fw-1',
  exercise_type: 'free_writing',
  target_length: 'paragraph',
  register: 'casual',
  text: '週末は写真を撮ります。公園で撮ると楽しいです。',
  sentence_count: 2,
  scores: {
    sentence_quality: 90,
    discourse_quality: 87,
    overall_writing: 88,
    coherence_score: 90,
    cohesion_score: 85,
    organization_score: 85,
    flow_score: 85,
    style_consistency_score: 88,
    redundancy_score: 85,
  },
  strengths: ['Mạch lạc rõ ràng'],
  summary: 'Bài viết có bố cục rõ ràng.',
  issues: [
    {
      category: 'cohesion',
      severity: 'minor',
      sentence_index: 1,
      sentence_range: null,
      explanation: 'Thiếu từ nối giữa hai câu.',
      suggested_fix: 'Thêm それから ở đầu câu 2.',
    },
  ],
  sentence_scores: [],
  improved_structure: null,
  rewrites: null,
  structure_suggestion: null,
  learning_mode: { enabled: true, hints_revealed_count: 0, hints_total: 2, reveal_available: false },
  discourse_available: true,
  scenario_required_points: null,
  scenario_format_sections: null,
  scenario_unavailable: null,
  status: 'evaluated',
  created_at: '2026-01-01T00:00:00Z',
  provenance: null,
}

const evaluationAfterReveal: WritingEvaluationResponse = {
  ...evaluation1,
  rewrites: {
    minimal_fix: '週末は写真を撮ります。それから、公園で撮ると楽しいです。',
    natural_rewrite: '週末は写真を撮っています。公園で撮るのが楽しいです。',
    native_rewrite: '休日はカメラを持って公園へ。写真を撮るのが何よりの楽しみです。',
    professional_rewrite: null,
  },
  learning_mode: { enabled: true, hints_revealed_count: 2, hints_total: 2, reveal_available: true },
}

const submission1: WritingSubmissionResponse = {
  id: 'sub-1',
  exercise_id: 'fw-1',
  exercise_type: 'free_writing',
  target_length: 'paragraph',
  register: 'casual',
  topic: 'Hobbies',
  prompt_vi: topic.prompt_vi,
  mode: 'long_form',
  status: 'evaluated',
  revision_count: 1,
  revisions: [
    {
      id: 'rev-1',
      revision_number: 1,
      sentence_count: 2,
      overall_writing: 88,
      status: 'evaluated',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const evaluation2: WritingEvaluationResponse = {
  ...evaluation1,
  revision_number: 2,
  revision_id: 'rev-2',
  attempt_id: 'att-2',
  text: '週末は写真を撮ります。それから、公園で撮ると楽しいです。',
  sentence_count: 2,
  scores: {
    sentence_quality: 93,
    discourse_quality: 91,
    overall_writing: 93,
    coherence_score: 92,
    cohesion_score: 92,
    organization_score: 90,
    flow_score: 90,
    style_consistency_score: 92,
    redundancy_score: 88,
  },
  strengths: ['Liên kết câu tốt hơn'],
  summary: 'Bản 2 mạch lạc hơn nhờ thêm từ nối.',
  issues: [],
  created_at: '2026-01-01T00:01:00Z',
}

const submission2: WritingSubmissionResponse = {
  ...submission1,
  revision_count: 2,
  revisions: [
    ...submission1.revisions,
    {
      id: 'rev-2',
      revision_number: 2,
      sentence_count: 2,
      overall_writing: 93,
      status: 'evaluated',
      created_at: '2026-01-01T00:01:00Z',
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

describe('FreeWritingPage writing studio', () => {
  beforeEach(() => {
    let currentSubmission = submission1
    let currentEvaluation = evaluationAfterReveal
    let hintCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const isPost = init?.method === 'POST'
        if (url.includes('/api/v1/exercises') && isPost) {
          return jsonResponse(topic, 201)
        }
        if (url.endsWith('/api/v1/writing/submissions') && isPost) {
          return jsonResponse(evaluation1, 201)
        }
        if (url.includes('/api/v1/writing/submissions/sub-1/revisions') && isPost) {
          currentSubmission = submission2
          currentEvaluation = evaluation2
          return jsonResponse({ ...evaluation2, scores: evaluation2.scores }, 201)
        }
        if (url.endsWith('/api/v1/writing/submissions/sub-1/hint') && isPost) {
          hintCount += 1
          return jsonResponse({
            hint: 'Hãy thêm từ nối ở đầu câu 2.',
            hints_revealed_count: hintCount,
            hints_total: 2,
            reveal_available: hintCount >= 2,
          })
        }
        if (url.endsWith('/api/v1/writing/submissions/sub-1/reveal') && isPost) {
          return jsonResponse({
            submission_id: 'sub-1',
            revision_number: 1,
            rewrites: evaluationAfterReveal.rewrites,
            revealed: true,
          })
        }
        if (url.endsWith('/api/v1/writing/submissions/sub-1/coach') && isPost) {
          return jsonResponse({
            answer: 'Hãy thêm từ nối như それから giữa các câu.',
            suggestions: ['Dùng それから khi thêm ý liên tiếp.'],
          })
        }
        if (url.includes('/api/v1/writing/submissions/sub-1/evaluation')) {
          return jsonResponse(currentEvaluation)
        }
        if (url.includes('/api/v1/writing/submissions/sub-1/compare')) {
          return jsonResponse({
            submission_id: 'sub-1',
            from_revision: 1,
            to_revision: 2,
            deltas: { overall_writing: 5, sentence_quality: 3, discourse_quality: 4 },
            sentence_diff: {
              added: ['それで、帰りが遅くなりました。'],
              removed: ['だから、帰りが遅くなりました。'],
              changed: [],
            },
            guidance: 'Bản 2 mạch lạc hơn.',
            guidance_version: 'v1',
          })
        }
        if (url.includes('/api/v1/writing/submissions/sub-1')) {
          return jsonResponse(currentSubmission)
        }
        return jsonResponse({ status: 'ok' })
      }),
    )
  })

  const generateTopic = async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo đề tài' }))
    await screen.findByText('Hãy viết khoảng 100–150 chữ tiếng Nhật kể về sở thích của bạn.')
  }

  const submitDraft = async (text: string) => {
    const editor = screen.getByLabelText('Bài viết tiếng Nhật của bạn')
    await userEvent.type(editor, text)
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bài' }))
  }

  it('submits the draft and renders the evaluation with revision history', async () => {
    render(<MemoryRouter><ToastProvider><FreeWritingPage /></ToastProvider></MemoryRouter>)
    await generateTopic()
    await submitDraft('週末は写真を撮ります。公園で撮ると楽しいです。')

    expect(await screen.findByText('88', { selector: '.jw-score-value' })).toBeInTheDocument()
    expect(screen.getByText('Chất lượng mạch văn: 87')).toBeInTheDocument()
    expect(screen.getByText(/Mạch lạc rõ ràng/)).toBeInTheDocument()
    expect(screen.getByText('Thiếu từ nối giữa hai câu.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Bản sửa' }))
    expect(await screen.findByRole('button', { name: 'Bản 1 · 88' })).toBeInTheDocument()

    const fetchMock = vi.mocked(fetch)
    const createCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/api/v1/writing/submissions'),
    )
    const body = JSON.parse(createCall?.[1]?.body as string)
    expect(body.exercise_id).toBe('fw-1')
    expect(body.text).toBe('週末は写真を撮ります。公園で撮ると楽しいです。')
  }, 15000)

  it('reveals hints then the rewrite after reveal', async () => {
    render(<MemoryRouter><ToastProvider><FreeWritingPage /></ToastProvider></MemoryRouter>)
    await generateTopic()
    await submitDraft('週末は写真を撮ります。公園で撮ると楽しいです。')

    await screen.findByText('88', { selector: '.jw-score-value' })
    await userEvent.click(screen.getByRole('button', { name: 'Gợi ý tiếp theo' }))
    expect(await screen.findByText('Hãy thêm từ nối ở đầu câu 2.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xem bản viết lại' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Gợi ý tiếp theo' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Xem bản viết lại' }))
    expect(await screen.findByText('Bản viết lại tham khảo')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sửa tối thiểu' })).toBeInTheDocument()
    expect(screen.getByText(/それから、公園で撮ると楽しいです/)).toBeInTheDocument()
  }, 15000)

  it('revises the draft and compares revisions', async () => {
    render(<MemoryRouter><ToastProvider><FreeWritingPage /></ToastProvider></MemoryRouter>)
    await generateTopic()
    await submitDraft('週末は写真を撮ります。公園で撮ると楽しいです。')

    await screen.findByText('88', { selector: '.jw-score-value' })
    await userEvent.click(screen.getByRole('button', { name: 'Viết lại' }))

    const editor = screen.getByLabelText('Bài viết tiếng Nhật của bạn')
    await userEvent.clear(editor)
    await userEvent.type(editor, '週末は写真を撮ります。それから、公園で撮ると楽しいです。')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bản sửa' }))

    expect((await screen.findAllByText('93', { selector: '.jw-score-value' })).length).toBeGreaterThan(0)
    expect(screen.getByText(/Liên kết câu tốt hơn/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Bản sửa' }))
    expect(await screen.findByRole('button', { name: 'Bản 1 · 88' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bản 2 · 93' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Bản 1 · 88' }))
    expect(await screen.findByText('So sánh bản 1 → bản 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Điểm tổng: +5')).toBeInTheDocument()
    expect(screen.getByLabelText('Chất lượng câu: +3')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Đã thêm: それで、帰りが遅くなりました。'),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Đã bỏ: だから、帰りが遅くなりました。'),
    ).toBeInTheDocument()
    expect(screen.getByText('Bản 2 mạch lạc hơn.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Về bản mới nhất' }))
    expect(await screen.findByText(/Liên kết câu tốt hơn/)).toBeInTheDocument()
  }, 15000)

  it('answers coach questions from the AI Coach tab', async () => {
    render(<MemoryRouter><ToastProvider><FreeWritingPage /></ToastProvider></MemoryRouter>)
    await generateTopic()
    await submitDraft('週末は写真を撮ります。公園で撮ると楽しいです。')

    await userEvent.click(await screen.findByRole('tab', { name: 'AI Coach' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Tại sao chỗ này nghe không tự nhiên?' }),
    )
    expect(await screen.findByText(/Hãy thêm từ nối như それから/)).toBeInTheDocument()
    expect(screen.getByText('Dùng それから khi thêm ý liên tiếp.')).toBeInTheDocument()
  })

  it('saves the draft to localStorage and restores it', async () => {
    const draftText = 'Nháp được lưu tự động.'
    localStorage.setItem(`draft:free-writing:${topic.id}`, draftText)

    render(<MemoryRouter><ToastProvider><FreeWritingPage /></ToastProvider></MemoryRouter>)
    await generateTopic()

    const editor = screen.getByLabelText('Bài viết tiếng Nhật của bạn') as HTMLTextAreaElement
    expect(editor).toHaveValue(draftText)

    await userEvent.clear(editor)
    await userEvent.type(editor, 'Bản sửa mới.')

    await vi.waitFor(() => {
      expect(localStorage.getItem(`draft:free-writing:${topic.id}`)).toBe('Bản sửa mới.')
    })

    await userEvent.clear(editor)
    await vi.waitFor(() => {
      expect(localStorage.getItem(`draft:free-writing:${topic.id}`)).toBeNull()
    })
  })

  it('shows the error state when submission fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/api/v1/exercises') && init?.method === 'POST') {
          return jsonResponse(topic, 201)
        }
        if (url.endsWith('/api/v1/writing/submissions') && init?.method === 'POST') {
          return jsonResponse(
            {
              error: {
                code: 'validation_error',
                message: 'Bài viết phải có ít nhất 2 câu.',
              },
            },
            422,
          )
        }
        return jsonResponse({ status: 'ok' })
      }),
    )

    render(<MemoryRouter><ToastProvider><FreeWritingPage /></ToastProvider></MemoryRouter>)
    await generateTopic()
    await submitDraft('週末は写真を撮ります。')

    expect(await screen.findByText('Không thể đánh giá bài viết.')).toBeInTheDocument()
    expect(screen.getByText(/Bài viết phải có ít nhất 2 câu/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})