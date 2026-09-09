import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AttemptCompare } from '../../components/feedback/AttemptCompare'
import { CorrectionTabs } from '../../components/feedback/CorrectionTabs'
import { EvaluationFeedback } from '../../components/feedback/EvaluationFeedback'
import { InlineHighlights } from '../../components/feedback/InlineHighlights'
import { IssueList } from '../../components/feedback/IssueList'
import { LearningModePanel } from '../../components/feedback/LearningModePanel'
import { CompletionCard } from '../../components/feedback/CompletionCard'
import type {
  AttemptEvaluationResponse,
  Corrections,
  EvaluationIssue,
} from '../../types/api'

const corrections: Corrections = {
  correct_version: '今日は仕事が忙しいです。',
  natural_version: '今日は仕事が多くて大変です。',
  native_version: '今日は仕事が立て込んでいて、帰りが遅くなりそうです。',
  casual_version: '今日は仕事いっぱいで遅くなるかも。',
  polite_version: '今日は仕事が多く、帰りが遅くなりそうです。',
  business_version: '本日は業務が混み合っており、退社が遅れる見込みです。',
}

const issues: EvaluationIssue[] = [
  {
    category: 'grammar',
    severity: 'major',
    original_text: 'しごとがあります',
    explanation: 'Nên dùng tính từ thay vì cấu trúc danh từ.',
    suggested_fix: '仕事が忙しいです',
    reason: null,
  },
  {
    category: 'naturalness',
    severity: 'minor',
    original_text: 'たくさん',
    explanation: 'Tự nhiên hơn nếu dùng 忙しい.',
    suggested_fix: '忙しくて',
    reason: 'Người bản xứ thường dùng cách này.',
  },
  {
    category: 'vocabulary',
    severity: 'info',
    original_text: 'しごと',
    explanation: 'Có thể dùng 仕事 trực tiếp.',
    suggested_fix: '仕事',
    reason: null,
  },
]

function makeEvaluation(overrides: Partial<AttemptEvaluationResponse> = {}): AttemptEvaluationResponse {
  return {
    id: 'att-1',
    exercise_id: 'ex-1',
    attempt_number: 1,
    answer_text: 'きょうはたくさんしごとがあります。',
    scores: {
      overall_score: 72,
      semantic_score: 80,
      grammar_score: 60,
      vocabulary_score: 75,
      naturalness_score: 55,
      context_fit_score: 85,
      register_fit_score: 50,
    },
    semantic_classification: 'mostly_equivalent',
    naturalness_classification: 'slightly_unnatural',
    issues,
    summary: 'Bài viết có vài điểm cần trau chuốt.',
    hints: [],
    learning_mode: { enabled: true, hints_revealed_count: 0, hints_total: 2, reveal_available: false },
    corrections: null,
    evaluation_metadata: { evaluation_version: 'writing_evaluation:v1', stages: [] },
    status: 'SUBMITTED',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('EvaluationFeedback', () => {
  it('shows the score with threshold label and breakdown', () => {
    render(<EvaluationFeedback evaluation={makeEvaluation()} />)
    expect(screen.getByText('72', { selector: '.jw-score-value' })).toBeInTheDocument()
    expect(screen.getByText('Cần trau chuốt')).toBeInTheDocument()
    expect(screen.getByText('Ý nghĩa: gần tương đương')).toBeInTheDocument()
    expect(screen.getByText('Hơi gượng')).toBeInTheDocument()
    expect(screen.getByText('Chấm điểm chi tiết')).toBeInTheDocument()
    expect(screen.getByText('Tự nhiên')).toBeInTheDocument()
    expect(screen.getByText('Điểm mạnh:')).toBeInTheDocument()
  })

  it('uses the low label for weak scores and high label for strong scores', () => {
    const { rerender } = render(
      <EvaluationFeedback evaluation={makeEvaluation({ scores: { ...makeEvaluation().scores, overall_score: 45 } })} />,
    )
    expect(screen.getByText('Cần cải thiện')).toBeInTheDocument()
    rerender(
      <EvaluationFeedback evaluation={makeEvaluation({ scores: { ...makeEvaluation().scores, overall_score: 88 } })} />,
    )
    expect(screen.getByText('Tốt')).toBeInTheDocument()
  })
})

describe('InlineHighlights', () => {
  it('renders the answer and highlights issue sentences', () => {
    const onSelect = vi.fn()
    render(
      <InlineHighlights
        answer="きょうはたくさんしごとがあります。"
        issues={issues}
        selectedIssueIndex={null}
        onSelectIssue={onSelect}
      />,
    )
    expect(screen.getByRole('button', { name: /Đoạn có vấn đề ngữ pháp/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('selects a sentence and marks it', () => {
    const onSelect = vi.fn()
    render(
      <InlineHighlights
        answer="きょうはたくさんしごとがあります。"
        issues={issues}
        selectedIssueIndex={0}
        onSelectIssue={onSelect}
      />,
    )
    const mark = screen.getByRole('button', { name: /Đoạn có vấn đề ngữ pháp/ })
    expect(mark).toHaveAttribute('aria-pressed', 'true')
    expect(mark).toHaveClass('jw-highlight--selected')
  })
})

describe('IssueList', () => {
  it('shows the most severe issue first and hides the rest behind a toggle', async () => {
    render(
      <IssueList issues={issues} selectedIssueIndex={null} onSelectIssue={() => {}} />,
    )
    expect(screen.getByText('Vấn đề quan trọng nhất')).toBeInTheDocument()
    expect(screen.getByText('Đáng chú ý')).toBeInTheDocument()
    expect(screen.getByText('→ 仕事が忙しいです')).toBeInTheDocument()
    expect(screen.queryByText('→ 忙しくて')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Xem tất cả phản hồi (2)' }))
    expect(screen.getByText('→ 忙しくて')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tự nhiên' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ẩn phản hồi khác' })).toBeInTheDocument()
  })

  it('reports when there are no issues', () => {
    render(<IssueList issues={[]} selectedIssueIndex={null} onSelectIssue={() => {}} />)
    expect(screen.getByText(/không có lỗi cần sửa/)).toBeInTheDocument()
  })

  it('jump buttons select the corresponding issue', async () => {
    const onSelect = vi.fn()
    render(<IssueList issues={issues} selectedIssueIndex={0} onSelectIssue={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Đang xem' }))
    expect(onSelect).toHaveBeenCalledWith(0)
  })
})

describe('AttemptCompare', () => {
  it('shows overall and per-dimension deltas', () => {
    const previous = makeEvaluation({
      id: 'att-1',
      attempt_number: 1,
      scores: { ...makeEvaluation().scores, overall_score: 60, grammar_score: 40 },
    })
    const current = makeEvaluation({
      id: 'att-2',
      attempt_number: 2,
      scores: { ...makeEvaluation().scores, overall_score: 72, grammar_score: 60 },
    })
    render(<AttemptCompare previous={previous} current={current} />)
    expect(screen.getByText(/Lần 1: 60 → Lần 2: 72/)).toBeInTheDocument()
    expect(screen.getByText('↑ +12')).toBeInTheDocument()
    expect(screen.getByText('Ngữ pháp')).toBeInTheDocument()
    expect(screen.getByText('↑ +20')).toBeInTheDocument()
  })

  it('shows "không đổi" when scores are equal', () => {
    const previous = makeEvaluation({ id: 'att-1', attempt_number: 1 })
    const current = makeEvaluation({ id: 'att-2', attempt_number: 2 })
    render(<AttemptCompare previous={previous} current={current} />)
    expect(screen.getByText('không đổi')).toBeInTheDocument()
  })
})

describe('CorrectionTabs', () => {
  it('shows all three base corrections and register variants', async () => {
    render(<CorrectionTabs corrections={corrections} />)
    expect(screen.getByText('Đáp án tham khảo')).toBeInTheDocument()
    expect(screen.getByText('Bản sửa đúng')).toBeInTheDocument()
    expect(screen.getByText('今日は仕事が忙しいです。')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Kinh doanh' }))
    expect(screen.getByText('本日は業務が混み合っており、退社が遅れる見込みです。')).toBeInTheDocument()
  })

  it('omits register variants that are null', () => {
    const partial: Corrections = { ...corrections, casual_version: null, business_version: null }
    render(<CorrectionTabs corrections={partial} />)
    expect(screen.queryByRole('tab', { name: 'Kinh doanh' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Lịch sự' })).toBeInTheDocument()
  })

  it('copies the correction text when clipboard is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    render(<CorrectionTabs corrections={corrections} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sao chép' }))
    expect(writeText).toHaveBeenCalledWith('今日は仕事が忙しいです。')
    expect(await screen.findByText('Đã sao chép')).toBeInTheDocument()
  })
})

describe('LearningModePanel', () => {
  it('shows the hint counter and asks for the first hint', () => {
    render(
      <LearningModePanel
        hintsTotal={2}
        hints={[]}
        revealAvailable={false}
        revealed={false}
        hintPending={false}
        revealPending={false}
        onNextHint={() => {}}
        onReveal={() => {}}
      />,
    )
    expect(screen.getByText('Gợi ý 0 / 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gợi ý tiếp theo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xem đáp án' })).not.toBeInTheDocument()
  })

  it('reveals the answer button only when hints are exhausted and reveal is available', () => {
    render(
      <LearningModePanel
        hintsTotal={2}
        hints={['H1', 'H2']}
        revealAvailable
        revealed={false}
        hintPending={false}
        revealPending={false}
        onNextHint={() => {}}
        onReveal={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Gợi ý tiếp theo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xem đáp án' })).toBeInTheDocument()
  })

  it('renders nothing once revealed', () => {
    const { container } = render(
      <LearningModePanel
        hintsTotal={2}
        hints={[]}
        revealAvailable
        revealed
        hintPending={false}
        revealPending={false}
        onNextHint={() => {}}
        onReveal={() => {}}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})

describe('CompletionCard', () => {
  it('shows score, XP, mission and daily goal lines', () => {
    render(
      <CompletionCard
        score={88}
        xpGained={15}
        missionCompleted
        dailyGoal={{ completed: true, completedCount: 3, target: 3 }}
        nextPending={false}
        onNext={() => {}}
        onBack={() => {}}
      />,
    )
    expect(screen.getByText('Hoàn thành bài tập')).toBeInTheDocument()
    expect(screen.getByText('88', { selector: '.jw-completion-score strong' })).toBeInTheDocument()
    expect(screen.getByText('✦ +15 XP')).toBeInTheDocument()
    expect(screen.getByText('Nhiệm vụ hôm nay đã hoàn thành')).toBeInTheDocument()
    expect(screen.getByText(/Hôm nay 3\/3 bài/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bài tập gợi ý tiếp theo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Về trang luyện tập' })).toBeInTheDocument()
  })
})