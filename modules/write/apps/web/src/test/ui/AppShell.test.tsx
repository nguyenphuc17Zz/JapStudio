import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { ToastProvider } from '../../components/ui/Toast'
import AppShell from '../../layouts/AppShell'
import ScenarioPage from '../../pages/ScenarioPage'
import { Brand } from '../../components/layout/Brand'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageContainer } from '../../components/layout/PageContainer'
import { TopBar } from '../../components/layout/TopBar'
import { NavigationDrawer } from '../../components/layout/NavigationDrawer'
import { ConnectionStatus } from '../../components/layout/ConnectionStatus'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { getLibraryDrawerItems, NAV_SECTIONS, SETTINGS_ITEM } from '../../navigation/config'
import { registerCommand, listCommands, availableCommands, registerRouteCommand } from '../../commands/registry'

const gamificationPayload = {
  summary: {
    level: { current_level: 3, current_xp: 40, xp_in_level: 40, xp_to_next_level: 60, progress_percent: 40 },
    current_streak: 5,
    longest_streak: 9,
    last_active_date: null,
    today_xp: 12,
    daily_goal: { target: 3, completed_count: 1, completed: false, progress_percent: 33 },
  },
  mission: null,
  focus: {},
  recommendation: null,
  session_summary: null,
  encouragement: null,
  reminders: [],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

function renderShell(initialEntry = '/') {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<div>Nội dung bảng điều khiển</div>} />
              <Route path="practice" element={<div>Nội dung luyện tập</div>} />
              <Route path="scenario" element={<ScenarioPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="*" element={<div>Không tìm thấy</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>,
  )
}

const mediaQueryList = {
  matches: false,
  media: '',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}

function stubMatchMedia(match: (query: string) => boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({ ...mediaQueryList, media: query, matches: match(query) })))
}

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    stubMatchMedia(() => false)
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/v1/gamification/today')) return jsonResponse(gamificationPayload)
        return jsonResponse({ status: 'ok' })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the sidebar with sections and an active item', () => {
    renderShell('/')
    expect(screen.getByText('Japanese Writing Studio')).toBeInTheDocument()
    expect(screen.getByText('Luyện viết tiếng Nhật cùng AI')).toBeInTheDocument()

    for (const section of NAV_SECTIONS) {
      expect(screen.getByText(section.label)).toBeInTheDocument()
    }

    const dashboard = screen.getByRole('link', { name: 'Bảng điều khiển' })
    expect(dashboard).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: SETTINGS_ITEM.label })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thu gọn menu' })).toBeInTheDocument()
  })

  it('shows the gamification footer when the API answers', async () => {
    renderShell('/')
    expect(await screen.findByText(/Cấp 3 · 40 XP/)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('navigates via sidebar links', async () => {
    const user = userEvent.setup()
    renderShell('/')
    await user.click(screen.getByRole('link', { name: 'Luyện tập' }))
    expect(await screen.findByText('Nội dung luyện tập')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Luyện tập' })).toHaveAttribute('aria-current', 'page')
  })

  it('collapses and persists the preference', async () => {
    const user = userEvent.setup()
    const { container } = renderShell('/')
    await user.click(screen.getByRole('button', { name: 'Thu gọn menu' }))
    expect(container.querySelector('.jw-app-shell')).toHaveClass('jw-app-shell--collapsed')
    expect(window.localStorage.getItem('jws.sidebar.collapsed')).toBe('1')
    expect(screen.getByRole('button', { name: 'Mở rộng menu' })).toBeInTheDocument()
  })

  it('reads the persisted collapsed preference on mount', () => {
    window.localStorage.setItem('jws.sidebar.collapsed', '1')
    const { container } = renderShell('/')
    expect(container.querySelector('.jw-app-shell')).toHaveClass('jw-app-shell--collapsed')
  })

  it('renders icon-only items with tooltips when collapsed', () => {
    window.localStorage.setItem('jws.sidebar.collapsed', '1')
    renderShell('/')
    const practiceLink = screen.getByRole('link', { name: 'Luyện tập' })
    expect(practiceLink.closest('.jw-tooltip')).not.toBeNull()
    expect(within(practiceLink.closest('.jw-tooltip')!).getByRole('tooltip')).toHaveTextContent('Luyện tập')
  })

  it('redirects /dashboard to the dashboard', async () => {
    renderShell('/dashboard')
    expect(await screen.findByText('Nội dung bảng điều khiển')).toBeInTheDocument()
  })

  it('renders the scenario route', async () => {
    renderShell('/scenario')
    expect(await screen.findByRole('button', { name: 'Khởi tạo Nhiệm vụ Giao tiếp 🚀' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mô phỏng' })).toBeInTheDocument()
  })

  it('sets document.title from route metadata', () => {
    renderShell('/practice')
    expect(document.title).toBe('Luyện tập — Japanese Writing Studio')
  })

  it('forces the sidebar collapsed on tablet', () => {
    stubMatchMedia((query) => query.includes('1023px'))
    const { container } = renderShell('/')
    expect(container.querySelector('.jw-app-shell')).toHaveClass('jw-app-shell--collapsed')
    expect(screen.queryByRole('button', { name: 'Thu gọn menu' })).not.toBeInTheDocument()
  })

  it('switches to the mobile shell with bottom nav on small screens', async () => {
    stubMatchMedia((query) => query.includes('767px'))
    const user = userEvent.setup()
    const { container } = renderShell('/')
    expect(container.querySelector('.jw-app-sidebar')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('link', { name: 'Luyện tập' }))
    expect(await screen.findByText('Nội dung luyện tập')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Luyện tập' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens the library drawer from the mobile bottom nav', async () => {
    stubMatchMedia((query) => query.includes('767px'))
    const user = userEvent.setup()
    renderShell('/')
    await user.click(screen.getByRole('button', { name: /Thư viện/ }))
    expect(await screen.findByRole('dialog', { name: 'Thư viện' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trí nhớ' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Trí nhớ' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('NavigationDrawer', () => {
  beforeEach(() => {
    stubMatchMedia(() => false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('closes on Escape and restores focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <ThemeProvider>
        <MemoryRouter>
          <NavigationDrawer open onClose={onClose} title="Thư viện" items={getLibraryDrawerItems()} currentPath="/" />
        </MemoryRouter>
      </ThemeProvider>,
    )
    const trigger = document.body.appendChild(document.createElement('button'))
    trigger.textContent = 'trigger'
    trigger.focus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <ThemeProvider>
        <MemoryRouter>
          <NavigationDrawer open={false} onClose={onClose} title="Thư viện" items={getLibraryDrawerItems()} currentPath="/" />
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})

describe('Brand / TopBar / PageHeader / PageContainer / Breadcrumbs', () => {
  beforeEach(() => {
    stubMatchMedia(() => false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Brand hides the wordmark when collapsed', () => {
    const { container } = render(<Brand collapsed />)
    expect(container.querySelector('.jw-brand')).toHaveClass('jw-brand--collapsed')
  })

  it('TopBar shows title, breadcrumb and actions', () => {
    render(
      <MemoryRouter>
        <TopBar title="Luyện tập" breadcrumb={<Breadcrumbs items={[{ label: 'Từ vựng', route: '/vocabulary' }, { label: 'Chi tiết' }]} />} actions={<span>Hành động</span>} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Luyện tập')).toBeInTheDocument()
    expect(screen.getByText('Hành động')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Từ vựng' })).toBeInTheDocument()
    expect(screen.getByText('Chi tiết').closest('li')).toHaveAttribute('aria-current', 'page')
  })

  it('PageHeader renders eyebrow, breadcrumb and actions', () => {
    render(
      <MemoryRouter>
        <PageHeader eyebrow="Hôm nay" breadcrumb={<Breadcrumbs items={[{ label: 'Luyện tập', route: '/practice' }, { label: 'Bài tập 12' }]} />} title="Bài tập 12" actions={<button type="button">Lưu</button>} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Hôm nay')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Luyện tập' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument()
  })

  it('PageContainer applies the size class', () => {
    const { container } = render(<PageContainer size="wide">Nội dung</PageContainer>)
    expect(container.firstElementChild).toHaveClass('jw-page-container--wide')
  })
})

describe('ConnectionStatus', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  it('shows nothing while online', () => {
    render(<ConnectionStatus />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the offline banner when the connection drops', async () => {
    render(<ConnectionStatus />)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    window.dispatchEvent(new Event('offline'))
    expect(await screen.findByRole('status')).toHaveTextContent('Kết nối bị gián đoạn')
  })

  it('shows the degraded banner while online', () => {
    render(<ConnectionStatus degraded />)
    expect(screen.getByRole('status')).toHaveTextContent('Một số dịch vụ đang gặp sự cố')
  })

  it('useOnlineStatus flips back when the connection returns', async () => {
    let captured: boolean | null = null
    function Probe() {
      captured = useOnlineStatus()
      return null
    }
    render(<Probe />)
    expect(captured).toBe(true)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    window.dispatchEvent(new Event('offline'))
    await waitFor(() => expect(captured).toBe(false))
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    window.dispatchEvent(new Event('online'))
    await waitFor(() => expect(captured).toBe(true))
  })
})

describe('CommandRegistry', () => {
  it('registers, lists and unregisters commands', () => {
    const unregister = registerCommand({ id: 'open-settings', title: 'Mở cài đặt', route: '/settings' })
    expect(listCommands().some((command) => command.id === 'open-settings')).toBe(true)
    unregister()
    expect(listCommands().some((command) => command.id === 'open-settings')).toBe(false)
  })

  it('filters by availability guard', () => {
    registerRouteCommand('nav-practice', 'Đi luyện tập', '/practice', ['bài tập'])
    const unregister = registerCommand({ id: 'hidden', title: 'Ẩn', isAvailable: () => false })
    expect(availableCommands().some((command) => command.id === 'hidden')).toBe(false)
    expect(availableCommands().some((command) => command.id === 'nav-practice')).toBe(true)
    unregister()
  })

  it('later registration wins for the same id', () => {
    registerRouteCommand('dup', 'Phiên bản 1', '/a')
    registerRouteCommand('dup', 'Phiên bản 2', '/b')
    expect(availableCommands().filter((command) => command.id === 'dup')).toHaveLength(1)
    expect(availableCommands().find((command) => command.id === 'dup')?.route).toBe('/b')
  })
})