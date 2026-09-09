import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { useTheme } from '../../theme/useTheme'

function ThemeHarness() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <>
      <span data-testid="mode">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme('light')}>Sáng</button>
      <button type="button" onClick={() => setTheme('dark')}>Tối</button>
      <button type="button" onClick={() => setTheme('system')}>Hệ thống</button>
    </>
  )
}

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.restoreAllMocks()
})

describe('ThemeProvider', () => {
  it('defaults to dark when nothing is stored', () => {
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('mode')).toHaveTextContent('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('persists the selected theme and applies it to the document', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Sáng' }))
    expect(screen.getByTestId('mode')).toHaveTextContent('light')
    expect(localStorage.getItem('jws.theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('resolves system theme to dark when prefers-color-scheme is dark', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('restores a stored light theme on mount', () => {
    localStorage.setItem('jws.theme', 'light')
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('mode')).toHaveTextContent('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})