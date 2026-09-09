import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WritingMasteryPanel } from '../components/mastery/WritingMasteryPanel'
import { BossAssessmentModal } from '../components/mastery/BossAssessmentModal'
import { WritingEvolutionTimeline } from '../components/mastery/WritingEvolutionTimeline'
import { api } from '../services/api'
import type {
  WritingMasteryProfile,
  BossTask,
  BossEvaluationResult,
  WritingEvolutionTimeline as TimelineType,
} from '../types/api'

// Mock API service
vi.mock('../services/api', () => ({
  api: {
    getWritingMasteryProfile: vi.fn(),
    getWritingEvolutionTimeline: vi.fn(),
    generateBossTask: vi.fn(),
    getPendingBossTask: vi.fn(),
    submitBossWritingTask: vi.fn(),
    getBossAssessmentHistory: vi.fn(),
    aiProviders: vi.fn().mockResolvedValue({ providers: [] }),
    aiModels: vi.fn().mockResolvedValue([]),
  },
}))

const mockProfile: WritingMasteryProfile = {
  overall_mastery_index: 0.82,
  mastered_count: 5,
  unstable_count: 1,
  persistent_count: 2,
  current_strengths: [
    'Ngữ pháp & Trợ từ (Độ thuần thục 88%)',
    'Văn phong & Kính ngữ (Độ thuần thục 85%)',
  ],
  current_priorities: [
    'Trợ từ に và で (grammar) — Cần củng cố ngay',
    'Dịch thô cấu trúc vì nên (naturalness)',
  ],
  next_boss_task_recommendation: {
    task_id: 'boss-101',
    title: '納期遅延のお詫び (Xin lỗi chậm tiến độ)',
    task_type: 'business_email',
    target_register: 'formal_business',
    time_limit_minutes: 15,
    status: 'pending',
  },
  dimensions: [
    {
      key: 'grammar',
      label: 'Grammar & Conjugation',
      label_vi: 'Ngữ pháp & Trợ từ',
      description_vi: 'Sử dụng trợ từ tiếng Nhật và chia thể chuẩn xác.',
      score: 0.88,
      status: 'mastered',
      confidence: 'high',
      evidence_count: 12,
      recent_trend: 'improving',
      sub_skills: [],
      criteria_proof: {
        repeated_correct_usage: true,
        repeated_correct_count: 5,
        delayed_retention: true,
        retention_days: 7.5,
        new_context_transfer: true,
        distinct_contexts_count: 4,
        free_writing_evidence: true,
        free_writing_pass_rate: 0.75,
        real_world_evidence: true,
        real_world_pass_count: 2,
        is_fully_mastered: true,
        missing_criteria: [],
      },
    },
    {
      key: 'naturalness',
      label: 'Natural Japanese Flow',
      label_vi: 'Độ tự nhiên chuẩn Nhật',
      description_vi: 'Triệt tiêu lối hành văn dịch thô từ tiếng Việt.',
      score: 0.76,
      status: 'competent',
      confidence: 'high',
      evidence_count: 8,
      recent_trend: 'stable',
      sub_skills: [],
      criteria_proof: null,
    },
  ],
}

const mockBossTask: BossTask = {
  id: 'boss-101',
  task_type: 'business_email',
  title: '納期遅延のお詫びと代替案の提案',
  situation_vi: 'Bạn là trưởng nhóm dự án IT, cần gửi email xin lỗi khách hàng Tanaka vì chậm bàn giao 3 ngày.',
  context_vi: 'Email chính thức tới Trưởng phòng Yamada.',
  audience: 'Trưởng phòng Yamada',
  relationship: 'Khách hàng B2B',
  target_register: 'formal_business',
  required_constraints: [
    'Chào hỏi theo đúng quy chuẩn email kinh doanh tiếng Nhật',
    'Nêu rõ lý do khách quan và thành thật xin lỗi',
    'Đề xuất phương án bàn giao trước bản Beta vào ngày mai',
  ],
  forbidden_patterns: ['Dùng thể thân mật'],
  target_word_count_min: 100,
  target_word_count_max: 300,
  time_limit_minutes: 15,
  target_weakness_ids: [],
  adversarial_traps: [],
  jlpt_level: 'N3',
  difficulty: 7,
  status: 'pending',
  created_at: '2026-08-24T12:00:00Z',
}

const mockBossEvaluation: BossEvaluationResult = {
  id: 'sub-201',
  task_id: 'boss-101',
  overall_score: 88,
  verdict: 'PASS',
  scores: {
    task_fulfillment: 90,
    grammar: 85,
    vocabulary: 88,
    naturalness: 82,
    register: 92,
    discourse: 85,
    clarity: 90,
    contextual_appropriateness: 92,
  },
  feedback_vi: 'Bài viết rất xuất sắc, đáp ứng chuẩn mực email kinh doanh tiếng Nhật.',
  strengths: ['Chào hỏi đúng quy chuẩn', 'Kính ngữ sonkeigo và kenjougo chuẩn xác'],
  critical_gaps: ['Cần chú ý thêm trợ từ nối câu'],
  rewrites: {
    minimal_fix: '山田部長、いつも大変お世話になっております。',
    natural_polish: '株式会社Tanaka 山田部長、平素より大変お世話になっております。',
    business_mastery: '株式会社Tanaka 営業推進部 山田部長、平素は格別のご高配を賜り...',
    polish_notes_vi: 'Bản kinh doanh cao cấp đã sử dụng đầy đủ chức danh và kính ngữ chuẩn.',
  },
  historical_comparison: {
    has_baseline: true,
    score_delta: 6.0,
    past_evaluations_count: 3,
    trajectory: 'improving',
  },
  weakness_impacts: [],
  regression_diagnoses: [],
  evaluated_at: '2026-08-24T12:15:00Z',
}

const mockTimeline: TimelineType = {
  weaknesses_eliminated: [
    {
      id: 'w1',
      category: 'grammar',
      subtype: 'particles',
      description: 'Trợ từ は và が',
      lifecycle_state: 'mastered',
      status: 'mastered',
      mastery_score: 0.95,
      days_since_last_error: 12.0,
      corrected_count: 6,
      recurrence_count: 1,
      first_seen_at: '2026-07-20T00:00:00Z',
      last_seen_at: '2026-08-12T00:00:00Z',
    },
  ],
  weaknesses_reduced: [
    {
      id: 'w2',
      category: 'register',
      subtype: 'keigo',
      description: 'Khiêm nhường ngữ 申す',
      lifecycle_state: 'improving',
      status: 'improving',
      mastery_score: 0.65,
      days_since_last_error: 2.0,
      corrected_count: 3,
      recurrence_count: 2,
      first_seen_at: '2026-08-01T00:00:00Z',
      last_seen_at: '2026-08-22T00:00:00Z',
    },
  ],
  persistent_weaknesses: [],
  newly_emerging_weaknesses: [],
  register_progress: [{ date: '2026-08-24', score: 0.85 }],
  naturalness_progress: [{ date: '2026-08-24', score: 0.80 }],
  free_writing_progress: [{ date: '2026-08-24', score: 0.88 }],
  milestone_events: [
    {
      title: 'Làm chủ hoàn toàn 1 kỹ năng trọng điểm',
      description: 'Trợ từ は và が',
      achieved_at: '2026-08-12T00:00:00Z',
      icon: 'trophy',
    },
  ],
  ai_narrative_story: 'Bạn đã đạt được những bước tiến vượt bậc trong văn phong và cấu trúc câu.',
}

describe('Phase 23 Writing Mastery & Boss Assessment UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getWritingMasteryProfile).mockResolvedValue(mockProfile)
    vi.mocked(api.getBossAssessmentHistory).mockResolvedValue([])
    vi.mocked(api.getPendingBossTask).mockResolvedValue(mockBossTask)
    vi.mocked(api.submitBossWritingTask).mockResolvedValue(mockBossEvaluation)
    vi.mocked(api.getWritingEvolutionTimeline).mockResolvedValue(mockTimeline)
  })

  it('renders 8-dimension mastery overview and actionable callouts', async () => {
    render(<WritingMasteryPanel />)

    await waitFor(() => {
      expect(screen.getByText(/Chỉ Số Làm Chủ Tổng Hợp/i)).toBeInTheDocument()
      expect(screen.getByText('82%')).toBeInTheDocument()
      expect(screen.getByText(/Kỹ Năng Đạt Chuẩn Master/i)).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Ngữ pháp & Trợ từ')).toBeInTheDocument()
      expect(screen.getByText('Độ tự nhiên chuẩn Nhật')).toBeInTheDocument()
    })

    // Check strengths and priorities
    expect(screen.getByText(/THẾ MẠNH HIỆN TẠI ĐÃ ĐƯỢC XÁC THỰC/i)).toBeInTheDocument()
    expect(screen.getByText(/ƯU TIÊN CẦN KHẮC PHỤC NGAY/i)).toBeInTheDocument()
  })

  it('opens 5-criterion verification modal when clicking on details button', async () => {
    render(<WritingMasteryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Ngữ pháp & Trợ từ')).toBeInTheDocument()
    })

    const proofBtn = screen.getByText(/Xem 5 Tiêu Chí Master ℹ/i)
    fireEvent.click(proofBtn)

    await waitFor(() => {
      expect(screen.getByText(/Thẩm Định 5 Tiêu Chuẩn Master/i)).toBeInTheDocument()
      expect(screen.getByText(/1. Sử dụng đúng lặp lại/i)).toBeInTheDocument()
      expect(screen.getByText(/2. Ghi nhớ có độ trễ/i)).toBeInTheDocument()
      expect(screen.getByText(/3. Chuyển di bối cảnh mới/i)).toBeInTheDocument()
      expect(screen.getByText(/4. Bằng chứng Viết Tự Do/i)).toBeInTheDocument()
      expect(screen.getByText(/5. Bằng chứng Tình Huống Thực Tế/i)).toBeInTheDocument()
    })

    const closeBtn = screen.getByText('Đã Hiểu')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Thẩm Định 5 Tiêu Chuẩn Master/i)).not.toBeInTheDocument()
    })
  })

  it('renders Boss Assessment modal, types unassisted answer and submits for 8-dimension evaluation', async () => {
    const handleClose = vi.fn()
    const handleCompleted = vi.fn()

    render(
      <BossAssessmentModal
        isOpen={true}
        initialTaskId="boss-101"
        onClose={handleClose}
        onCompleted={handleCompleted}
      />
    )

    // Verify boss arena opened
    await waitFor(() => {
      expect(screen.getByText(/ĐẤU TRƯỜNG ĐÁNH GIÁ BOSS/i)).toBeInTheDocument()
      expect(screen.getByText('納期遅延のお詫びと代替案の提案')).toBeInTheDocument()
    })

    // Type text into unassisted textarea
    const textarea = screen.getByPlaceholderText(/Hãy vận dụng tư duy tiếng Nhật tự thân để viết bài/i)
    fireEvent.change(textarea, {
      target: {
        value: '山田部長、お世話になっております。納期が3日遅れる見込みとなり、大変申し訳ございません。明日にベータ版をお送りいたします。',
      },
    })

    // Submit
    const submitBtn = screen.getByText(/Nộp Bài Đánh Giá Boss/i)
    fireEvent.click(submitBtn)

    // Verify evaluation dossier rendered
    await waitFor(() => {
      expect(screen.getByText(/ĐẠT CHUẨN \(PASS\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Bảng Điểm Thẩm Định 8 Chiều Năng Lực/i)).toBeInTheDocument()
      expect(screen.getByText(/3 TẦNG VĂN BẢN MẪU NÂNG CAO/i)).toBeInTheDocument()
      expect(screen.getByText(/Sửa Lỗi Tối Thiểu/i)).toBeInTheDocument()
    })

    expect(handleCompleted).toHaveBeenCalledWith(mockBossEvaluation)
  })

  it('renders Writing Evolution Timeline with eliminated and reduced categories', async () => {
    render(<WritingEvolutionTimeline />)

    await waitFor(() => {
      expect(screen.getByText(/BẢN TƯỜNG TRÌNH TIẾN HÓA NĂNG LỰC VIẾT/i)).toBeInTheDocument()
      expect(screen.getByText(/Bạn đã đạt được những bước tiến vượt bậc/i)).toBeInTheDocument()
      expect(screen.getAllByText('Trợ từ は và が').length).toBeGreaterThanOrEqual(1)
    })

    // Switch tab to reduced
    const reducedTab = screen.getByRole('tab', { name: /Đã Giảm Nhẹ/i })
    fireEvent.click(reducedTab)

    await waitFor(() => {
      expect(screen.getByText('Khiêm nhường ngữ 申す')).toBeInTheDocument()
    })
  })
})
