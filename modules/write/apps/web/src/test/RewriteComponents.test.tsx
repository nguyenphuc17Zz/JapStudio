import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  LinguisticDiffViewer,
  RewriteComparisonCard,
  SelfCorrectionLadder,
  SocraticCoachPane,
} from '../components/rewrite'
import type {
  DiffExplanation,
  RewriteLabSession,
  RewriteVariants,
} from '../types/api'
import { api } from '../services/api'

vi.mock('../services/api', () => ({
  api: {
    askSocraticWritingCoach: vi.fn(),
    generateTransferTask: vi.fn(),
    submitTransferAttempt: vi.fn(),
  },
}))

describe('LinguisticDiffViewer', () => {
  const mockDiff: DiffExplanation = {
    before: '私は日本語を勉強することが楽しいです。',
    after: '日本語を勉強するのが楽しいです。',
    chunks: [
      {
        type: 'delete',
        before_text: '私は',
        after_text: '',
        rationale_vi: 'Lược bỏ đại từ nhân xưng thừa.',
      },
      {
        type: 'equal',
        before_text: '日本語を勉強',
        after_text: '日本語を勉強',
        rationale_vi: '',
      },
      {
        type: 'replace',
        before_text: 'すること',
        after_text: 'するの',
        rationale_vi: 'Danh từ hóa bằng の tự nhiên hơn.',
      },
      {
        type: 'equal',
        before_text: 'が楽しいです。',
        after_text: 'が楽しいです。',
        rationale_vi: '',
      },
    ],
    improvement_status: 'significantly_improved',
    quality_delta: 25,
    summary_rationale_vi: 'Lược bỏ từ thừa và chọn từ danh từ hóa tự nhiên hơn.',
  }

  it('renders diff chunks and grammatical rationales', () => {
    render(<LinguisticDiffViewer diff={mockDiff} />)
    expect(screen.getByText(/Phân tích biến đổi & Ngữ pháp/i)).toBeDefined()
    expect(screen.getByText('+25 điểm chất lượng')).toBeDefined()
    expect(screen.getByText(/Lược bỏ đại từ nhân xưng thừa/i)).toBeDefined()
    expect(screen.getByText(/Danh từ hóa bằng の tự nhiên hơn/i)).toBeDefined()
  })
})

describe('RewriteComparisonCard', () => {
  const mockVariants: RewriteVariants = {
    original: '私は日本語を勉強することが楽しいです。',
    minimal_correction: '私は日本語を勉強するのが楽しいです。',
    natural_japanese: '日本語を勉強するのが楽しいです。',
    formal_business: '日本語の学習を大変楽しく感じております。',
    synthesis_prompt_vi: 'Hãy viết 1 câu mới áp dụng cùng cấu trúc.',
    explanations: {
      minimal_correction: 'Sửa こと thành の.',
      natural_japanese: 'Lược bỏ 私は.',
    },
  }

  it('renders 4-way comparison variants and requires synthesis sentence', () => {
    const onComplete = vi.fn()
    render(
      <RewriteComparisonCard
        variants={mockVariants}
        onCompleteSynthesis={onComplete}
      />,
    )

    expect(screen.getByText('B. Sửa tối thiểu (Minimal Correction)')).toBeDefined()
    expect(screen.getByText('C. Thuần Nhật tự nhiên (Natural Japanese)')).toBeDefined()
    expect(screen.getByText('D. Trang trọng / Thương mại (Business Formal)')).toBeDefined()

    const input = screen.getByLabelText(/Câu tiếng Nhật mới của bạn/i)
    fireEvent.change(input, { target: { value: '料理を作るのが楽しいです。' } })

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận câu mới/i })
    fireEvent.click(confirmBtn)

    expect(onComplete).toHaveBeenCalledWith('料理を作るのが楽しいです。')
  })
})

describe('SelfCorrectionLadder', () => {
  const mockSession: RewriteLabSession = {
    id: 'test-session-ladder',
    source_type: 'standalone',
    original_text: '私は日本語を勉強することが楽しいです。',
    context_vi: 'Tôi thấy học tiếng Nhật rất vui.',
    has_issue: true,
    issue_category: 'particle_choice',
    issue_category_name_vi: 'Lỗi trợ từ (助詞の誤用)',
    issue_explanation_vi: 'Trong tiếng Nhật, tính từ cảm xúc đi với trợ từ が.',
    target_concept: '〜のが楽しい',
    target_segment: '勉強することが',
    current_step: 3,
    status: 'active',
    clue: null,
    pattern: null,
    attempts: [],
    revealed_variants: null,
    transfer_task: null,
    transfer_attempts: [],
    created_at: '2026-08-24T00:00:00Z',
    updated_at: '2026-08-24T00:00:00Z',
  }

  it('allows typing and submitting attempt', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      is_correct: true,
      score: 95,
      feedback_vi: 'Chính xác!',
      quality_delta: 25,
    })
    const onReveal = vi.fn()

    render(
      <SelfCorrectionLadder
        session={mockSession}
        onSubmitAttempt={onSubmit}
        onReveal={onReveal}
      />,
    )

    const input = screen.getByLabelText(/Nhập câu tiếng Nhật đã được bạn tự chỉnh sửa/i)
    fireEvent.change(input, { target: { value: '日本語を勉強するのが楽しいです。' } })

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra câu tự sửa/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('日本語を勉強するのが楽しいです。')
    })
  })
})

describe('SocraticCoachPane', () => {
  it('renders socratic coach panel and allows asking questions', async () => {
    vi.mocked(api.askSocraticWritingCoach).mockResolvedValueOnce({
      answer: 'Khi diễn đạt sở thích hay cảm xúc, người Nhật dùng V-dictionary + の + が + Tính từ.',
      pattern_highlight: '[V-dict + の] + が + [Tính từ]',
      suggestions: ['Tại sao không dùng こと?'],
    })

    render(<SocraticCoachPane />)

    expect(screen.getByText('Trợ lý sư phạm Socratic (AI Writing Coach)')).toBeDefined()

    const input = screen.getByLabelText(/Hỏi huấn luyện viên AI/i)
    fireEvent.change(input, { target: { value: 'Mẫu câu này có quy tắc gì?' } })

    const askBtn = screen.getByRole('button', { name: /Gửi câu hỏi/i })
    fireEvent.click(askBtn)

    await waitFor(() => {
      expect(api.askSocraticWritingCoach).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText(/Khi diễn đạt sở thích hay cảm xúc/i)).toBeDefined()
      expect(screen.getByText(/Điểm ngữ pháp/i)).toBeDefined()
    })
  })
})
