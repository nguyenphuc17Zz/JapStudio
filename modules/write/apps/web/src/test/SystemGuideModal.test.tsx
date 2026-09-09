import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SystemGuideButton } from '../components/help/SystemGuideButton'
import { SystemGuideModal } from '../components/help/SystemGuideModal'

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

describe('SystemGuideModal & SystemGuideButton', () => {
  it('renders SystemGuideButton and opens modal upon click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SystemGuideButton />
      </MemoryRouter>
    )

    const guideBtn = screen.getByRole('button', { name: /Hướng dẫn sử dụng toàn diện/i })
    expect(guideBtn).toBeInTheDocument()

    // Click button to open modal
    await user.click(guideBtn)
    expect(screen.getByText(/CẨM NANG HƯỚNG DẪN SỬ DỤNG TOÀN DIỆN/i)).toBeInTheDocument()
    expect(screen.getByText(/Hành Trình Học Mẫu 5 Bước Hằng Ngày/i)).toBeInTheDocument()
  })

  it('switches across category tabs', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SystemGuideModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    )

    // Initially in workflow tab
    expect(screen.getByText(/Hành Trình Học Mẫu 5 Bước Hằng Ngày/i)).toBeInTheDocument()

    // Switch to Practice Studios tab
    const practiceTab = screen.getByRole('tab', { name: /Phòng Luyện Viết/i })
    await user.click(practiceTab)
    expect(screen.getByRole('heading', { name: /Luyện Tập Dịch Câu/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Phòng Sửa Câu/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Viết Tự Do/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Luyện Chữ Hán Kanji/i })).toBeInTheDocument()

    // Switch to Intelligence & Boss tab
    const intelligenceTab = screen.getByRole('tab', { name: /Đầu Não Trí Tuệ & Boss/i })
    await user.click(intelligenceTab)
    expect(screen.getByRole('heading', { name: /Đấu Trường Đánh Giá Boss/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mô Hình 8 Chiều & 5 Tiêu Chuẩn/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Kế Hoạch Viết Thích Ứng 70 \/ 20 \/ 10/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Trí Tuệ Biểu Đạt, Collocation/i })).toBeInTheDocument()

    // Switch to Zen Tools tab
    const zenTab = screen.getByRole('tab', { name: /Công Cụ Thiền Zen/i })
    await user.click(zenTab)
    expect(screen.getByRole('heading', { name: /Bộ Điều Chỉnh Furigana Toàn Cầu/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Đồng Hồ Trà Đạo/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Âm Thanh Tĩnh Tâm/i })).toBeInTheDocument()
  })

  it('filters guide items instantaneously through the search bar', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SystemGuideModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    )

    const searchInput = screen.getByLabelText(/Tìm kiếm hướng dẫn/i)

    // Search for "Boss"
    await user.type(searchInput, 'boss')
    expect(screen.getByRole('heading', { name: /Đấu Trường Đánh Giá Boss/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Luyện Chữ Hán Kanji/i })).not.toBeInTheDocument()

    // Clear search
    await user.clear(searchInput)
    await user.type(searchInput, 'kanji')
    expect(screen.getByRole('heading', { name: /Luyện Chữ Hán Kanji \(Kanji Stroke & Calligraphy Studio\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Đấu Trường Đánh Giá Boss/i })).not.toBeInTheDocument()
  })

  it('navigates to route when clicking direct action button', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    render(
      <MemoryRouter>
        <SystemGuideModal isOpen={true} onClose={handleClose} initialTab="practice" />
      </MemoryRouter>
    )

    // Click "Mở Trực Tiếp →" on first practice card
    const openBtns = screen.getAllByRole('button', { name: /Mở Trực Tiếp →/i })
    expect(openBtns.length).toBeGreaterThan(0)
    await user.click(openBtns[0])

    expect(handleClose).toHaveBeenCalled()
    expect(mockedNavigate).toHaveBeenCalledWith('/practice')
  })

  it('opens and closes via global ? shortcut and close button', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SystemGuideButton />
      </MemoryRouter>
    )

    // Trigger keydown '?'
    fireEvent.keyDown(window, { key: '?' })
    expect(await screen.findByText(/CẨM NANG HƯỚNG DẪN SỬ DỤNG TOÀN DIỆN/i)).toBeInTheDocument()

    // Close button
    const closeBtn = screen.getByRole('button', { name: /Đã Hiểu & Đóng Cẩm Nang/i })
    await user.click(closeBtn)
    expect(screen.queryByText(/CẨM NANG HƯỚNG DẪN SỬ DỤNG TOÀN DIỆN/i)).not.toBeInTheDocument()
  })
})
