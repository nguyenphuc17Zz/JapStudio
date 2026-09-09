import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AIInsight } from '../../components/ai/AIInsight'
import { AIRecommendation } from '../../components/ai/AIRecommendation'
import { AIHint } from '../../components/ai/AIHint'
import { AIStatus } from '../../components/ai/AIStatus'
import { AIThinking } from '../../components/ai/AIThinking'
import { AICoachMessage } from '../../components/ai/AICoachMessage'

describe('AIInsight', () => {
  it('renders description and evidence', () => {
    render(<AIInsight description="Nên dùng て-form." evidence={['2 lần lặp']} />)
    expect(screen.getByText('Nên dùng て-form.')).toBeInTheDocument()
    expect(screen.getByText('2 lần lặp')).toBeInTheDocument()
  })

  it('dismisses on close button', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<AIInsight description="Nội dung" onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: 'Đóng gợi ý AI' }))
    expect(onDismiss).toHaveBeenCalled()
  })
})

describe('AIRecommendation', () => {
  it('renders meta chips', () => {
    render(<AIRecommendation description="Tập trung kính ngữ." meta={['N3', 'Business']} />)
    expect(screen.getByText('N3')).toBeInTheDocument()
    expect(screen.getByText('Business')).toBeInTheDocument()
  })
})

describe('AIHint', () => {
  it('renders hint index and dots', () => {
    const { container } = render(<AIHint hint="Thử dùng 〜そうです。" index={2} total={3} />)
    expect(screen.getByText(/Hint 2 \/ 3/)).toBeInTheDocument()
    expect(container.querySelectorAll('.jw-ai-dot')).toHaveLength(3)
  })

  it('fires onMore', async () => {
    const user = userEvent.setup()
    const onMore = vi.fn()
    render(<AIHint hint="Gợi ý." index={1} total={2} onMore={onMore} />)
    await user.click(screen.getByRole('button', { name: 'Another hint' }))
    expect(onMore).toHaveBeenCalled()
  })
})

describe('AIStatus', () => {
  it('announces thinking state', () => {
    render(<AIStatus state="thinking" />)
    expect(screen.getByRole('status')).toHaveTextContent('Thinking…')
  })
})

describe('AIThinking', () => {
  it('renders a status with default label', () => {
    render(<AIThinking />)
    expect(screen.getByRole('status')).toHaveTextContent('Thinking…')
  })
})

describe('AICoachMessage', () => {
  it('renders ai message with suggestions', () => {
    render(
      <AICoachMessage role="ai" suggestions={['Giải thích thêm']}>
        Bài viết khá tốt.
      </AICoachMessage>,
    )
    expect(screen.getByText('Bài viết khá tốt.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Giải thích thêm/ })).toBeInTheDocument()
  })

  it('shows thinking state while loading', () => {
    render(<AICoachMessage role="ai" loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Thinking…')
  })

  it('shows error alert', () => {
    render(<AICoachMessage role="ai" error="Không kết nối được AI." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Không kết nối được AI.')
  })
})