import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { ToastProvider } from '../../components/ui/Toast'
import DesignSystemPage from '../../pages/DesignSystemPage'

function renderPage() {
  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter>
            <DesignSystemPage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>,
    ),
  }
}

describe('DesignSystemPage', () => {
  it('renders the main showcase sections', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Design System' })).toBeInTheDocument()
    expect(screen.getByText('Typography')).toBeInTheDocument()
    expect(screen.getByText('AI components')).toBeInTheDocument()
    expect(screen.getByText('Writing editor')).toBeInTheDocument()
    expect(screen.getByText('Layout primitives')).toBeInTheDocument()
  })

  it('opens and closes the sample dialog', async () => {
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Dialog' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Dialog mẫu')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows toasts from the demo button', async () => {
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Toast' }))
    expect(screen.getByText('Đã lưu bài viết')).toBeInTheDocument()
  })
})