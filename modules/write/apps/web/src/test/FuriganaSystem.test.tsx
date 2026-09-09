import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  FuriganaProvider,
  useFurigana,
  FURIGANA_COLORS,
  DEFAULT_FURIGANA_COLOR,
  FURIGANA_STORAGE_KEY,
  FURIGANA_COLOR_STORAGE_KEY,
} from '../context/FuriganaContext'
import { FuriganaToggle } from '../components/layout/FuriganaToggle'

function TestConsumer() {
  const { mode, color, setMode, setColor } = useFurigana()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="color">{color}</span>
      <button onClick={() => setMode('hover')}>Set Hover</button>
      <button onClick={() => setMode('off')}>Set Off</button>
      <button onClick={() => setColor('#f472b6')}>Set Sakura</button>
    </div>
  )
}

describe('Furigana System & Customization', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-furigana')
    document.documentElement.style.removeProperty('--furigana-color')
  })

  it('provides default mode and color and synchronizes with documentElement', () => {
    render(
      <FuriganaProvider>
        <TestConsumer />
      </FuriganaProvider>,
    )

    expect(FURIGANA_COLORS.length).toBeGreaterThan(0)
    expect(screen.getByTestId('mode')).toHaveTextContent('always')
    expect(screen.getByTestId('color')).toHaveTextContent(DEFAULT_FURIGANA_COLOR)
    expect(document.documentElement.getAttribute('data-furigana')).toBe('always')
    expect(document.documentElement.style.getPropertyValue('--furigana-color')).toBe(DEFAULT_FURIGANA_COLOR)
  })

  it('changes mode and saves to localStorage', () => {
    render(
      <FuriganaProvider>
        <TestConsumer />
      </FuriganaProvider>,
    )

    fireEvent.click(screen.getByText('Set Hover'))
    expect(screen.getByTestId('mode')).toHaveTextContent('hover')
    expect(document.documentElement.getAttribute('data-furigana')).toBe('hover')
    expect(localStorage.getItem(FURIGANA_STORAGE_KEY)).toBe('hover')

    fireEvent.click(screen.getByText('Set Off'))
    expect(screen.getByTestId('mode')).toHaveTextContent('off')
    expect(document.documentElement.getAttribute('data-furigana')).toBe('off')
    expect(localStorage.getItem(FURIGANA_STORAGE_KEY)).toBe('off')
  })

  it('changes color and updates CSS variable and localStorage', () => {
    render(
      <FuriganaProvider>
        <TestConsumer />
      </FuriganaProvider>,
    )

    fireEvent.click(screen.getByText('Set Sakura'))
    expect(screen.getByTestId('color')).toHaveTextContent('#f472b6')
    expect(document.documentElement.style.getPropertyValue('--furigana-color')).toBe('#f472b6')
    expect(localStorage.getItem(FURIGANA_COLOR_STORAGE_KEY)).toBe('#f472b6')
  })

  it('renders FuriganaToggle with mode items and color buttons', () => {
    render(
      <FuriganaProvider>
        <FuriganaToggle />
      </FuriganaProvider>,
    )

    const toggleBtn = screen.getByRole('button', { name: /Cài đặt Furigana/i })
    expect(toggleBtn).toBeInTheDocument()

    // Open menu
    fireEvent.click(toggleBtn)

    // Check modes
    expect(screen.getByText('Khi rê chuột')).toBeInTheDocument()
    expect(screen.getByText('Tắt hoàn toàn')).toBeInTheDocument()

    // Check color palette exists
    const sakuraColorBtn = screen.getByLabelText(/Chọn màu Hồng Anh Đào/i)
    expect(sakuraColorBtn).toBeInTheDocument()

    fireEvent.click(sakuraColorBtn)
    expect(document.documentElement.style.getPropertyValue('--furigana-color')).toBe('#f472b6')
  })
})
