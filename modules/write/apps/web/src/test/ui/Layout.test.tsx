import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { ToastProvider } from '../../components/ui/Toast'
import { ThemeSwitcher } from '../../components/layout/ThemeSwitcher'
import { Sidebar, SidebarSection, SidebarItem, SidebarFooter, SidebarCollapseButton } from '../../components/layout/Sidebar'
import { SplitPane } from '../../components/layout/SplitPane'
import { MobileNavItem, MobileBottomNav } from '../../components/layout/MobileNav'

describe('ThemeSwitcher', () => {
  it('switches the active theme', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ToastProvider>
          <ThemeSwitcher />
        </ToastProvider>
      </ThemeProvider>,
    )
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1])
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Sidebar', () => {
  it('marks the active item', () => {
    render(
      <Sidebar brand="Test">
        <SidebarSection title="Chính">
          <SidebarItem label="Bảng điều khiển" icon="dashboard" active />
        </SidebarSection>
      </Sidebar>,
    )
    const item = screen.getByRole('button', { name: 'Bảng điều khiển' })
    expect(item).toHaveAttribute('aria-current', 'page')
  })

  it('collapses via the collapse button', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <SidebarFooter>
        <SidebarCollapseButton collapsed={false} onClick={onClick} />
      </SidebarFooter>,
    )
    await user.click(screen.getByRole('button', { name: 'Thu gọn menu' }))
    expect(onClick).toHaveBeenCalled()
  })
})

describe('SplitPane', () => {
  it('renders both panes', () => {
    render(<SplitPane left={<div>Trái</div>} right={<div>Phải</div>} />)
    expect(screen.getByText('Trái')).toBeInTheDocument()
    expect(screen.getByText('Phải')).toBeInTheDocument()
  })
})

describe('MobileNav', () => {
  it('renders items with aria-current on active', () => {
    render(
      <MobileBottomNav>
        <MobileNavItem label="Trang chủ" icon="dashboard" active />
      </MobileBottomNav>,
    )
    expect(screen.getByRole('button', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page')
  })
})