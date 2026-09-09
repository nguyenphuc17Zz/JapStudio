import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CharacterCounter } from '../../components/writing/CharacterCounter'
import { WritingEditorShell } from '../../components/writing/WritingEditorShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'

describe('CharacterCounter', () => {
  it('reports below target', () => {
    const { container } = render(<CharacterCounter current={30} targetMin={80} targetMax={120} />)
    expect(container.querySelector('.jw-char-counter--below')).not.toBeNull()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('reports within target', () => {
    const { container } = render(<CharacterCounter current={95} targetMin={80} targetMax={120} />)
    expect(container.querySelector('.jw-char-counter--within')).not.toBeNull()
  })

  it('reports above target', () => {
    const { container } = render(<CharacterCounter current={140} targetMin={80} targetMax={120} />)
    expect(container.querySelector('.jw-char-counter--above')).not.toBeNull()
  })
})

describe('WritingEditorShell', () => {
  it('renders a labeled textarea bound to value', () => {
    render(<WritingEditorShell value="日本語" onChange={() => undefined} />)
    const area = screen.getByLabelText(/Bài viết tiếng Nhật/)
    expect(area).toHaveValue('日本語')
  })
})

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState title="Chưa có bài viết" description="Hãy viết bài đầu tiên." action={<button type="button">Viết bài</button>} />,
    )
    expect(screen.getByText('Chưa có bài viết')).toBeInTheDocument()
    expect(screen.getByText('Hãy viết bài đầu tiên.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Viết bài' })).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders message and code in an alert', () => {
    render(<ErrorState message="Không tải được dữ liệu." code="E_1024" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được dữ liệu.')
    expect(screen.getByText('Mã lỗi: E_1024')).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('renders a loading status', () => {
    render(<Skeleton variant="text" lines={2} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Đang tải')
  })
})