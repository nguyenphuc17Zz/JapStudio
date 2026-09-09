import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WritingIntelligencePage } from '../pages/WritingIntelligencePage'
import { api } from '../services/api'
import type {
  WritingIntelligenceProfile,
  WritingIntelligenceSummary,
  WritingWeaknessListResponse,
  WritingDiagnosisResult,
} from '../types/api'

vi.mock('../services/api', () => ({
  api: {
    getWritingIntelligenceProfile: vi.fn(),
    getWritingIntelligenceSummary: vi.fn(),
    listWritingWeaknesses: vi.fn(),
    getDueRetests: vi.fn(),
    diagnoseWritingIntelligence: vi.fn(),
    getWritingMasteryProfile: vi.fn().mockResolvedValue({
      dimensions: [],
      overall_mastery_index: 0.7,
      mastered_count: 3,
      unstable_count: 0,
      persistent_count: 1,
      current_strengths: [],
      current_priorities: [],
    }),
    getBossAssessmentHistory: vi.fn().mockResolvedValue([]),
    aiProviders: vi.fn().mockResolvedValue({ providers: [] }),
    aiModels: vi.fn().mockResolvedValue([]),
  },
}))

const mockProfile: WritingIntelligenceProfile = {
  fingerprint: {
    strongest_dimensions: ['grammar'],
    weakest_dimensions: ['naturalness'],
    top_recurring: [],
    emerging: [],
    declining: [],
    persistent: [],
    register_weaknesses: [],
    naturalness_weaknesses: [],
    discourse_weaknesses: [],
    dimensions: [
      {
        category: 'grammar',
        total_weaknesses: 2,
        persistent_count: 0,
        recurring_count: 1,
        mastered_count: 0,
        average_mastery: 0.8,
      },
      {
        category: 'naturalness',
        total_weaknesses: 3,
        persistent_count: 1,
        recurring_count: 2,
        mastered_count: 0,
        average_mastery: 0.3,
      },
    ],
    total_tracked_weaknesses: 5,
    active_weakness_count: 4,
    mastered_weakness_count: 1,
    overall_mastery_rate: 0.2,
  },
  top_recurring_weaknesses: [],
  persistent_weaknesses: [],
  recent_improvements: [],
  recommended_focus: ['Naturalness: Tránh dịch thô tiếng Việt'],
  total_evaluations_analyzed: 12,
  last_analyzed_at: '2026-08-23T10:00:00Z',
}

const mockSummary: WritingIntelligenceSummary = {
  top_recurring: [],
  persistent: [],
  recent_improvements: [],
  recommended_focus: ['Ngữ pháp: Sử dụng trợ từ は vs が'],
  overall_mastery_rate: 0.65,
  active_weaknesses_count: 3,
  strongest_dimensions: ['grammar'],
  weakest_dimensions: ['naturalness'],
}

const mockWeaknessList: WritingWeaknessListResponse = {
  items: [
    {
      id: 'w-1',
      user_id: 'user-1',
      category: 'grammar',
      subtype: 'particles',
      description: 'Nhầm lẫn trợ từ は và が',
      first_seen_at: '2026-08-20T10:00:00Z',
      last_seen_at: '2026-08-23T10:00:00Z',
      frequency: 4,
      recurrence_count: 4,
      exposure_count: 4,
      corrected_count: 1,
      confidence: 'medium',
      status: 'persistent',
      lifecycle_state: 'targeted',
      mastery_score: 0.25,
      severity: 'major',
      affected_registers: ['polite'],
      affected_contexts: ['sentence_translation'],
      affected_jlpt_levels: ['N4'],
      related_expressions: [],
      related_grammar_patterns: [],
      examples: ['猫は好きです', '雨は降っています'],
      evidence_refs: [{ evaluation_id: 'eval-1' }, { evaluation_id: 'eval-2' }],
      created_at: '2026-08-20T10:00:00Z',
      updated_at: '2026-08-23T10:00:00Z',
    },
    {
      id: 'w-2',
      user_id: 'user-1',
      category: 'naturalness',
      subtype: 'literal_translation',
      description: 'Dịch nguyên văn trật tự câu tiếng Việt',
      first_seen_at: '2026-08-21T10:00:00Z',
      last_seen_at: '2026-08-23T10:00:00Z',
      frequency: 2,
      recurrence_count: 2,
      exposure_count: 2,
      corrected_count: 2,
      confidence: 'medium',
      status: 'improving',
      lifecycle_state: 'improving',
      mastery_score: 0.6,
      severity: 'minor',
      affected_registers: ['casual'],
      affected_contexts: ['sentence_translation'],
      affected_jlpt_levels: ['N5'],
      related_expressions: [],
      related_grammar_patterns: [],
      examples: ['私の頭は痛い'],
      evidence_refs: [{ evaluation_id: 'eval-3' }],
      created_at: '2026-08-21T10:00:00Z',
      updated_at: '2026-08-23T10:00:00Z',
    },
  ],
  total: 2,
  skip: 0,
  limit: 100,
}

const mockDiagnosisResult: WritingDiagnosisResult = {
  overall_assessment_vi: 'Kỹ năng viết câu đơn của bạn rất tốt, diễn đạt gãy gọn.',
  strengths_assessment_vi: 'Phản xạ dùng từ vựng sinh hoạt phong phú.',
  root_causes: [
    {
      category: 'grammar',
      subtype: 'particles',
      root_cause_vi: 'Tư duy chủ ngữ tiếng Việt thay vì xác định trợ từ tiếng Nhật.',
      japanese_pattern_tip: 'Với tính từ 好き, đối tượng luôn đi với が.',
      example_bad_vs_good: '❌ 猫は好きです -> ⭕ 猫が好きです',
    },
  ],
  action_plan_vi: [
    'Luyện tập phân biệt は và が.',
    'Lược bỏ đại từ 私は khi ngữ cảnh đã rõ.',
  ],
  recommended_grammar_focus: ['Trợ từ は vs が', 'Mệnh đề phụ thể ngắn'],
  encouragement_vi: 'Cố gắng lên nhé!',
  estimated_writing_level: 'N4',
}

describe('WritingIntelligencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getWritingIntelligenceProfile).mockResolvedValue(mockProfile)
    vi.mocked(api.getWritingIntelligenceSummary).mockResolvedValue(mockSummary)
    vi.mocked(api.listWritingWeaknesses).mockResolvedValue(mockWeaknessList)
    vi.mocked(api.getDueRetests).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(api.diagnoseWritingIntelligence).mockResolvedValue(mockDiagnosisResult)
  })

  it('renders page header, metrics row and 5-dimension skill map', async () => {
    render(
      <MemoryRouter>
        <WritingIntelligencePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Studio Trí Tuệ Viết Tiếng Nhật')).toBeInTheDocument()
      expect(screen.getByText('Bản Đồ 5 Chiều Năng Lực Viết')).toBeInTheDocument()
    })

    expect(screen.getByText('Ngữ pháp & Chia thể')).toBeInTheDocument()
    expect(screen.getByText('Từ vựng & Cụm từ')).toBeInTheDocument()
    expect(screen.getByText('Độ tự nhiên chuẩn Nhật')).toBeInTheDocument()
    expect(screen.getByText('Văn phong & Kính ngữ')).toBeInTheDocument()
    expect(screen.getByText('Bố cục & Mạch lạc')).toBeInTheDocument()
  })

  it('filters weakness list by category when clicking a dimension card', async () => {
    render(
      <MemoryRouter>
        <WritingIntelligencePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('particles')).toBeInTheDocument()
      expect(screen.getByText('literal translation')).toBeInTheDocument()
    })

    // Click on grammar dimension card to filter
    fireEvent.click(screen.getByText('Ngữ pháp & Chia thể'))

    expect(screen.getByText('particles')).toBeInTheDocument()
    expect(screen.queryByText('literal translation')).not.toBeInTheDocument()

    // Clear filter
    fireEvent.click(screen.getByText('Xem tất cả chiều kỹ năng ✕'))
    expect(screen.getByText('literal translation')).toBeInTheDocument()
  })

  it('allows live keyword search across weaknesses', async () => {
    render(
      <MemoryRouter>
        <WritingIntelligencePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('particles')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Tìm kiếm điểm yếu, trợ từ, lỗi...')
    fireEvent.change(searchInput, { target: { value: 'trật tự câu' } })

    expect(screen.queryByText('particles')).not.toBeInTheDocument()
    expect(screen.getByText('literal translation')).toBeInTheDocument()
  })

  it('runs AI diagnosis and renders root causes and contrast pairs', async () => {
    render(
      <MemoryRouter>
        <WritingIntelligencePage />
      </MemoryRouter>,
    )

    const diagBtn = await screen.findByRole('button', { name: /AI Chẩn Đoán Toàn Diện/i })
    fireEvent.click(diagBtn)

    await waitFor(() => {
      expect(screen.getByText('BÁO CÁO CHẨN ĐOÁN AI (ROOT-CAUSE DIAGNOSIS)')).toBeInTheDocument()
    })

    expect(screen.getByText('Kỹ năng viết câu đơn của bạn rất tốt, diễn đạt gãy gọn.')).toBeInTheDocument()
    expect(screen.getByText('Tư duy chủ ngữ tiếng Việt thay vì xác định trợ từ tiếng Nhật.')).toBeInTheDocument()
    expect(screen.getByText('❌ 猫は好きです')).toBeInTheDocument()
    expect(screen.getByText('⭕ 猫が好きです')).toBeInTheDocument()
  })

  it('switches to mastery tab and renders WritingMasteryPanel', async () => {
    render(
      <MemoryRouter>
        <WritingIntelligencePage />
      </MemoryRouter>,
    )

    const masteryTab = screen.getByRole('tab', { name: /Làm Chủ & Boss Assessment/i })
    fireEvent.click(masteryTab)

    await waitFor(() => {
      expect(screen.getByText(/Chỉ Số Làm Chủ Tổng Hợp/i)).toBeInTheDocument()
    })
  })
})
