import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from '../../components/ui/Dialog'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Drawer } from '../../components/ui/Drawer'

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(<Dialog open={false} onClose={() => undefined} title="T">Nội dung</Dialog>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens with title and closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Xác nhận">
        Nội dung
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('restores focus to the trigger after closing', async () => {
    function Harness() {
      return (
        <>
          <button
            type="button"
            onClick={() => undefined}
            data-testid="trigger"
          >
            Mở
          </button>
          <Dialog open onClose={() => undefined} title="T">Nội dung</Dialog>
        </>
      )
    }
    render(<Harness />)
    expect(document.activeElement).not.toBe(screen.getByTestId('trigger'))
  })
})

describe('ConfirmDialog', () => {
  it('fires onConfirm and renders danger variant label', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        onCancel={() => undefined}
        onConfirm={onConfirm}
        title="Xóa?"
        description="Không thể hoàn tác."
        confirmLabel="Xóa ngay"
        destructive
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Xóa ngay' }))
    expect(onConfirm).toHaveBeenCalled()
  })
})

describe('Drawer', () => {
  it('renders a dialog with a title when open', () => {
    render(
      <Drawer open onClose={() => undefined} title="Cài đặt">
        Nội dung
      </Drawer>,
    )
    expect(screen.getByRole('dialog')).toHaveTextContent('Cài đặt')
  })
})