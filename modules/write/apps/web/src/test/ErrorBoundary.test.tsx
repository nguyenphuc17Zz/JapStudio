import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../components/ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>ok content</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('ok content')).toBeInTheDocument()
  })

  it('catches render errors and offers a retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Thử lại')).toBeInTheDocument()
  })
})