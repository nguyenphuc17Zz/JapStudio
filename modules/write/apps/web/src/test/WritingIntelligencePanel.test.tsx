import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { WritingIntelligencePanel } from '../components/writing/WritingIntelligencePanel'
import { api } from '../services/api'
import type { WritingIntelligenceSummary, WritingDiagnosisResult } from '../types/api'

vi.mock('../services/api', () => ({
  api: {
    getWritingIntelligenceSummary: vi.fn(),
    diagnoseWritingIntelligence: vi.fn(),
  },
}))

const mockSummary: WritingIntelligenceSummary = {
  top_recurring: [
    {
      id: 'w-1',
      user_id: null,
      category: 'grammar',
      subtype: 'particles',
      description: 'Sử dụng trợ từ tiếng Nhật (は, が, に, で...)',
      examples: ['猫は好きです', '学校で行きます'],
      frequency: 4,
      first_seen_at: '2026-08-20T10:00:00Z',
      last_seen_at: '2026-08-23T10:00:00Z',
      severity: 'minor',
      recurrence_count: 4,
      corrected_count: 1,
      exposure_count: 5,
      mastery_score: 0.2,
      confidence: 'high',
      status: 'persistent',
      affected_registers: ['polite'],
      affected_contexts: ['Daily'],
      affected_jlpt_levels: ['N4'],
      related_expressions: [],
      related_grammar_patterns: [],
      evidence_refs: [],
      created_at: '2026-08-20T10:00:00Z',
      updated_at: '2026-08-23T10:00:00Z',
    },
  ],
  persistent: [
    {
      id: 'w-1',
      user_id: null,
      category: 'grammar',
      subtype: 'particles',
      description: 'Sử dụng trợ từ tiếng Nhật (は, が, に, で...)',
      examples: ['猫は好きです'],
      frequency: 4,
      first_seen_at: '2026-08-20T10:00:00Z',
      last_seen_at: '2026-08-23T10:00:00Z',
      severity: 'minor',
      recurrence_count: 4,
      corrected_count: 1,
      exposure_count: 5,
      mastery_score: 0.2,
      confidence: 'high',
      status: 'persistent',
      affected_registers: ['polite'],
      affected_contexts: ['Daily'],
      affected_jlpt_levels: ['N4'],
      related_expressions: [],
      related_grammar_patterns: [],
      evidence_refs: [],
      created_at: '2026-08-20T10:00:00Z',
      updated_at: '2026-08-23T10:00:00Z',
    },
  ],
  recent_improvements: [
    {
      id: 'w-2',
      user_id: null,
      category: 'naturalness',
      subtype: 'literal_translation',
      description: 'Diễn đạt mang tính dịch thô từng chữ',
      examples: ['私の頭は痛い'],
      frequency: 3,
      first_seen_at: '2026-08-20T10:00:00Z',
      last_seen_at: '2026-08-23T10:00:00Z',
      severity: 'minor',
      recurrence_count: 1,
      corrected_count: 3,
      exposure_count: 4,
      mastery_score: 0.75,
      confidence: 'high',
      status: 'mastered',
      affected_registers: ['casual'],
      affected_contexts: ['Health'],
      affected_jlpt_levels: ['N5'],
      related_expressions: [],
      related_grammar_patterns: [],
      evidence_refs: [],
      created_at: '2026-08-20T10:00:00Z',
      updated_at: '2026-08-23T10:00:00Z',
    },
  ],
  recommended_focus: ['Grammar: Sử dụng trợ từ tiếng Nhật'],
  overall_mastery_rate: 0.5,
  active_weaknesses_count: 1,
  strongest_dimensions: ['naturalness'],
  weakest_dimensions: ['grammar'],
}

const mockDiagnosis: WritingDiagnosisResult = {
  overall_assessment_vi: 'Bạn có xu hướng tư duy câu phức tiếng Việt trước khi dịch.',
  strengths_assessment_vi: 'Từ vựng và ngữ pháp câu đơn chắc chắn.',
  root_causes: [
    {
      category: 'grammar',
      subtype: 'particles',
      root_cause_vi: 'Nhầm lẫn chủ ngữ tiếng Việt với trợ từ は.',
      japanese_pattern_tip: 'Dùng が với tính từ chỉ sở thích.',
      example_bad_vs_good: '❌ 猫は好きです -> ⭕ 猫が好きです',
    },
  ],
  action_plan_vi: [
    'Luyện tập trợ từ は/が/に/で theo ngữ cảnh.',
    'Viết câu ngắn trước khi nối câu phức.',
  ],
  recommended_grammar_focus: ['Trợ từ は vs が', 'Mẫu câu 〜ので vs 〜から'],
  encouragement_vi: 'Cố lên bạn nhé, viết càng nhiều câu sẽ càng mượt mà!',
  estimated_writing_level: 'N4',
}

const mockEmptySummary: WritingIntelligenceSummary = {
  top_recurring: [],
  persistent: [],
  recent_improvements: [],
  recommended_focus: [],
  overall_mastery_rate: 0.0,
  active_weaknesses_count: 0,
  strongest_dimensions: [],
  weakest_dimensions: [],
}

describe('WritingIntelligencePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially then populates data', async () => {
    vi.mocked(api.getWritingIntelligenceSummary).mockResolvedValue(mockSummary)

    render(<WritingIntelligencePanel />)

    await waitFor(() => {
      expect(screen.getByText('Writing Intelligence')).toBeInTheDocument()
      expect(screen.getByText('particles')).toBeInTheDocument()
    })

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Gợi ý ưu tiên khắc phục')).toBeInTheDocument()
    expect(screen.getByText(/Ngữ pháp: Sử dụng trợ từ tiếng Nhật/i)).toBeInTheDocument()
  })

  it('renders empty state when learner has no tracked weaknesses', async () => {
    vi.mocked(api.getWritingIntelligenceSummary).mockResolvedValue(mockEmptySummary)

    render(<WritingIntelligencePanel />)

    await waitFor(() => {
      expect(screen.getByText('Chưa ghi nhận điểm yếu tái diễn')).toBeInTheDocument()
    })
  })

  it('allows switching tabs and expanding weakness examples', async () => {
    render(<WritingIntelligencePanel initialSummary={mockSummary} />)

    expect(screen.getByText('Writing Intelligence')).toBeInTheDocument()
    expect(screen.getByText('particles')).toBeInTheDocument()

    // Switch to recent improvements tab
    const impTab = screen.getByText(/Tiến bộ gần đây/)
    fireEvent.click(impTab)

    expect(screen.getByText('literal translation')).toBeInTheDocument()
    expect(screen.getByText('Đã làm chủ')).toBeInTheDocument()

    // Expand weakness to view examples
    fireEvent.click(screen.getByText('literal translation'))
    expect(screen.getByText('Ví dụ thực tế đã gặp:')).toBeInTheDocument()
    expect(screen.getByText('私の頭は痛い')).toBeInTheDocument()
  })

  it('runs AI diagnosis and renders root causes with contrast pairs and action plan', async () => {
    vi.mocked(api.diagnoseWritingIntelligence).mockResolvedValue(mockDiagnosis)

    render(<WritingIntelligencePanel initialSummary={mockSummary} />)

    const diagnoseBtn = screen.getByRole('button', { name: /AI Chẩn đoán/i })
    fireEvent.click(diagnoseBtn)

    await waitFor(() => {
      expect(screen.getByText('Báo Cáo Chẩn Đoán AI (Root-Cause Diagnosis)')).toBeInTheDocument()
    })

    expect(screen.getByText('Bạn có xu hướng tư duy câu phức tiếng Việt trước khi dịch.')).toBeInTheDocument()
    expect(screen.getByText('Nhầm lẫn chủ ngữ tiếng Việt với trợ từ は.')).toBeInTheDocument()
    expect(screen.getByText('❌ 猫は好きです')).toBeInTheDocument()
    expect(screen.getByText('⭕ 猫が好きです')).toBeInTheDocument()
    expect(screen.getByText(/Luyện tập trợ từ/i)).toBeInTheDocument()

    // Close diagnosis
    fireEvent.click(screen.getByText('Đóng'))
    expect(screen.queryByText('Báo Cáo Chẩn Đoán AI (Root-Cause Diagnosis)')).not.toBeInTheDocument()
  })
})
