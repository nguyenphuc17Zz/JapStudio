import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from '../../components/ui/Toast'

function ToastHarness() {
  const { success, error } = useToast()
  return (
    <>
      <button type="button" onClick={() => success('Đã lưu')}>Lưu</button>
      <button type="button" onClick={() => error('Thất bại', { description: 'Chi tiết lỗi' })}>Lỗi</button>
    </>
  )
}

describe('ToastProvider', () => {
  it('shows a success toast and dismisses it', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
  })

  it('shows description on error toasts', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Lỗi' }))
    expect(screen.getByText('Thất bại')).toBeInTheDocument()
    expect(screen.getByText('Chi tiết lỗi')).toBeInTheDocument()
  })

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ToastHarness />)).toThrow('useToast must be used within a ToastProvider')
  })
})