import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RewriteLabPage } from '../pages/RewriteLabPage'
import { api } from '../services/api'
import type { RewriteLabSession } from '../types/api'

vi.mock('../services/api', () => ({
  api: {
    createRewriteLabSession: vi.fn(),
    getRewriteLabSession: vi.fn(),
    submitSelfCorrectionAttempt: vi.fn(),
    revealRewriteLabVariants: vi.fn(),
    generateTransferTask: vi.fn(),
    submitTransferAttempt: vi.fn(),
    transformRewriteMode: vi.fn(),
    explainSentenceDiff: vi.fn(),
    askSocraticWritingCoach: vi.fn(),
    getRecentSnippets: vi.fn(),
  },
}))

const mockInitialSession: RewriteLabSession = {
  id: 'test-session-123',
  source_type: 'standalone',
  original_text: '私は日本語を勉強することが楽しいです。',
  context_vi: 'Tôi thấy học tiếng Nhật rất vui.',
  has_issue: true,
  issue_category: 'particle_choice',
  issue_category_name_vi: 'Lỗi trợ từ (助詞の誤用)',
  issue_explanation_vi: 'Trong tiếng Nhật, tính từ cảm xúc đi với trợ từ が và danh từ hóa の.',
  target_concept: '〜のが楽しい',
  target_segment: '勉強することが',
  current_step: 2,
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

describe('RewriteLabPage (Phase 19)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page hero and 3 main tabs', () => {
    render(
      <MemoryRouter>
        <RewriteLabPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Phòng Thí Nghiệm Sửa Câu & Diễn Đạt (Rewrite Lab)'),
    ).toBeDefined()
    expect(screen.getByRole('tab', { name: /Tự sửa lỗi/i })).toBeDefined()
    expect(screen.getByRole('tab', { name: /6 Phong cách biến đổi/i })).toBeDefined()
    expect(screen.getByRole('tab', { name: /Đấu trường chuyển giao/i })).toBeDefined()
  })

  it('starts a self-correction session and advances to ladder view', async () => {
    vi.mocked(api.createRewriteLabSession).mockResolvedValueOnce(mockInitialSession)

    render(
      <MemoryRouter>
        <RewriteLabPage />
      </MemoryRouter>,
    )

    const textInput = screen.getByLabelText(/Nhập câu tiếng Nhật của bạn/i)
    fireEvent.change(textInput, { target: { value: '私は日本語を勉強することが楽しいです。' } })

    const startBtn = screen.getByRole('button', { name: /Bắt đầu tự sửa câu này/i })
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(api.createRewriteLabSession).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText(/Lỗi trợ từ/i)).toBeDefined()
      expect(screen.getByText(/Tiến trình tự sửa lỗi/i)).toBeDefined()
    })
  })

  it('switches to rewrite modes tab and renders 6 modes', async () => {
    render(
      <MemoryRouter>
        <RewriteLabPage />
      </MemoryRouter>,
    )

    const modesTab = screen.getByRole('tab', { name: /6 Phong cách biến đổi/i })
    fireEvent.click(modesTab)

    expect(screen.getByText(/Phòng thí nghiệm 6 phong cách diễn đạt/i)).toBeDefined()
    expect(screen.getByText(/Sửa tối thiểu/i)).toBeDefined()
    expect(screen.getByText(/Thuần Nhật/i)).toBeDefined()
    expect(screen.getByText(/Chuyển văn phong/i)).toBeDefined()
    expect(screen.getByText(/Tinh gọn súc tích/i)).toBeDefined()
    expect(screen.getByText(/Mở rộng biểu đạt/i)).toBeDefined()
    expect(screen.getByText(/Bản ngữ đích thực/i)).toBeDefined()
  })

  it('switches to transfer check arena', () => {
    render(
      <MemoryRouter>
        <RewriteLabPage />
      </MemoryRouter>,
    )

    const transferTab = screen.getByRole('tab', { name: /Đấu trường chuyển giao/i })
    fireEvent.click(transferTab)

    expect(screen.getByText(/Đấu trường chuyển giao mẫu câu/i)).toBeDefined()
  })

  it('opens recent snippets modal and imports a snippet', async () => {
    vi.mocked(api.getRecentSnippets).mockResolvedValueOnce({
      snippets: [
        {
          id: 'att_1',
          text: '私は猫が好きです。',
          source_type: 'practice',
          source_title: 'Bài tập dịch',
          context_vi: 'Tôi thích mèo',
          issue_preview: null,
          created_at: '2026-08-24T00:00:00Z',
        },
      ],
      total: 1,
    })

    render(
      <MemoryRouter>
        <RewriteLabPage />
      </MemoryRouter>,
    )

    const openRecentBtn = screen.getAllByRole('button', { name: /Lấy câu từ bài viết gần đây/i })[0]
    fireEvent.click(openRecentBtn)

    await waitFor(() => {
      expect(api.getRecentSnippets).toHaveBeenCalled()
      expect(screen.getByText('私は猫が好きです。')).toBeDefined()
    })

    const snippetItem = screen.getByRole('button', { name: /Chọn câu: 私は猫が好きです。/i })
    fireEvent.click(snippetItem)

    // The text should be loaded into the input
    expect(screen.getByDisplayValue('私は猫が好きです。')).toBeDefined()
  })
})

