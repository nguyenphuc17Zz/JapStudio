import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AdaptiveCurriculumPanel } from '../components/curriculum/AdaptiveCurriculumPanel'
import { api } from '../services/api'
import type { DailyPlan, WeaknessPriorityResponse, SessionDoneResult } from '../types/api'

vi.mock('../services/api', () => ({
  api: {
    getCurriculumDailyPlan: vi.fn(),
    getCurriculumPriorities: vi.fn(),
    markCurriculumSessionDone: vi.fn(),
  },
}))

const mockDailyPlan: DailyPlan = {
  plan_date: '2026-08-24',
  tasks: [
    {
      task_id: 't-1',
      task_type: 'targeted_drill',
      weakness_id: 'w-1',
      category: 'register',
      subtype: 'keigo',
      context_type: 'business',
      task_description: 'Viết email thông báo nghỉ phép bằng kính ngữ Keigo, 3 câu.',
      reason: 'Lỗi kính ngữ đã tái diễn 4 lần trong các bài viết gần đây.',
      register: 'business',
      jlpt_level: 'N3',
      bucket: 'persistent',
    },
    {
      task_id: 't-2',
      task_type: 'self_correction',
      weakness_id: 'w-2',
      category: 'grammar',
      subtype: 'particles',
      context_type: 'sentence',
      task_description: 'Tự sửa câu chứa lỗi trợ từ は/が.',
      reason: 'Củng cố nhận thức về sự khác biệt giữa は và が.',
      register: 'polite',
      jlpt_level: 'N4',
      bucket: 'persistent',
    },
    {
      task_id: 't-3',
      task_type: 'real_world_writing',
      weakness_id: 'w-3',
      category: 'naturalness',
      subtype: 'literal_translation',
      context_type: 'paragraph',
      task_description: 'Viết đoạn văn ngắn giới thiệu món ăn Việt Nam bằng cách diễn đạt thuần Nhật.',
      reason: 'Luyện tránh dịch thô từng chữ sang tiếng Nhật.',
      register: 'polite',
      jlpt_level: 'N4',
      bucket: 'reinforcement',
    },
    {
      task_id: 't-4',
      task_type: 'exploration',
      weakness_id: null,
      category: null,
      subtype: null,
      context_type: 'free_writing',
      task_description: 'Viết tự do về sở thích hoặc chuyến đi gần nhất.',
      reason: 'Mở rộng vốn từ vựng và tự do thể hiện suy nghĩ.',
      register: 'casual',
      jlpt_level: 'N4',
      bucket: 'exploration',
    },
  ],
  total_tasks: 4,
  bucket_breakdown: {
    persistent: 2,
    reinforcement: 1,
    exploration: 1,
  },
  generated_at: '2026-08-24T06:00:00Z',
  enriched: true,
}

const mockPriorities: WeaknessPriorityResponse = {
  items: [
    {
      weakness_id: 'w-1',
      category: 'register',
      subtype: 'keigo',
      description: 'Lẫn lộn thể Sonkeigo và Kenjougo trong giao tiếp công sở',
      priority_score: 92.5,
      priority_reason: 'Trong 4 bài gần nhất bạn vẫn trộn lẫn Sonkeigo và Kenjougo.',
      lifecycle_state: 'targeted',
      next_context_type: 'business',
      severity: 'critical',
      recurrence_count: 5,
      mastery_score: 0.15,
    },
    {
      weakness_id: 'w-2',
      category: 'grammar',
      subtype: 'particles',
      description: 'Nhầm lẫn trợ từ は và が',
      priority_score: 78.0,
      priority_reason: 'Lỗi trợ từ tái diễn 3 lần.',
      lifecycle_state: 'recurring',
      next_context_type: 'sentence',
      severity: 'major',
      recurrence_count: 3,
      mastery_score: 0.4,
    },
  ],
  total: 2,
  enriched: true,
}

describe('AdaptiveCurriculumPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getCurriculumDailyPlan).mockResolvedValue(mockDailyPlan)
    vi.mocked(api.getCurriculumPriorities).mockResolvedValue(mockPriorities)
  })

  it('renders daily plan tasks and 70/20/10 allocation philosophy', async () => {
    render(<AdaptiveCurriculumPanel />)

    await waitFor(() => {
      expect(screen.getByText('Chương trình Viết Thích nghi 2.0')).toBeInTheDocument()
    })

    // Philosophy badges
    expect(screen.getByText(/70% Điểm yếu dai dẳng/)).toBeInTheDocument()
    expect(screen.getByText(/20% Củng cố/)).toBeInTheDocument()
    expect(screen.getByText(/10% Khám phá viết/)).toBeInTheDocument()

    // Tasks rendered
    expect(screen.getByText('Viết email thông báo nghỉ phép bằng kính ngữ Keigo, 3 câu.')).toBeInTheDocument()
    expect(screen.getByText('Lỗi kính ngữ đã tái diễn 4 lần trong các bài viết gần đây.')).toBeInTheDocument()
    expect(screen.getByText('Viết tự do về sở thích hoặc chuyến đi gần nhất.')).toBeInTheDocument()
  })

  it('toggles task completion and finishes session with debrief', async () => {
    const mockSessionDone: SessionDoneResult = {
      completed_count: 2,
      contexts_advanced: ['w-1', 'w-2'],
      session_debrief: 'Hôm nay bạn đã hoàn thành xuất sắc 2 nhiệm vụ trọng điểm.',
    }
    vi.mocked(api.markCurriculumSessionDone).mockResolvedValue(mockSessionDone)

    render(<AdaptiveCurriculumPanel />)

    await waitFor(() => {
      expect(screen.getByText('Nhiệm vụ #1')).toBeInTheDocument()
    })

    const markDoneBtns = screen.getAllByRole('button', { name: /Đánh dấu xong/i })
    expect(markDoneBtns.length).toBeGreaterThanOrEqual(2)

    // Mark task 1 as done
    fireEvent.click(markDoneBtns[0])

    // Progress updates
    expect(screen.getByText(/1 \/ 4 nhiệm vụ/)).toBeInTheDocument()

    // Finish session button becomes active
    const finishBtn = screen.getByRole('button', { name: /Hoàn thành & Nhận Đánh giá Phiên/i })
    expect(finishBtn).not.toBeDisabled()

    fireEvent.click(finishBtn)

    await waitFor(() => {
      expect(screen.getByText(/Hôm nay bạn đã hoàn thành xuất sắc 2 nhiệm vụ trọng điểm./)).toBeInTheDocument()
    })
  })

  it('switches to priorities sub-tab and displays ranked weaknesses', async () => {
    render(<AdaptiveCurriculumPanel />)

    await waitFor(() => {
      expect(screen.getByText('Kế hoạch hôm nay (4)')).toBeInTheDocument()
    })

    const prioritiesBtn = screen.getByRole('button', { name: /Bảng ưu tiên/i })
    fireEvent.click(prioritiesBtn)

    await waitFor(() => {
      expect(screen.getByText('Xếp hạng Ưu tiên Điểm yếu (8 Tín hiệu Đa chiều)')).toBeInTheDocument()
      expect(screen.getByText('Lẫn lộn thể Sonkeigo và Kenjougo trong giao tiếp công sở')).toBeInTheDocument()
      expect(screen.getByText('92.5')).toBeInTheDocument()
      expect(screen.getByText(/Trong 4 bài gần nhất bạn vẫn trộn lẫn Sonkeigo và Kenjougo/)).toBeInTheDocument()
    })
  })
})
