import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/ui/Badge'
import { badgeToneFor } from '../../components/ui/badgeTone'
import { Chip } from '../../components/ui/Chip'
import { Alert } from '../../components/ui/Alert'

describe('Badge', () => {
  it('renders tone classes and children', () => {
    const { container } = render(<Badge tone="success">Hoàn thành</Badge>)
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument()
    expect(container.querySelector('.jw-badge--success')).not.toBeNull()
  })

  it('maps badge kinds to default tones via badgeToneFor', () => {
    expect(badgeToneFor('ai')).toBe('ai')
    expect(badgeToneFor('completed')).toBe('success')
    expect(badgeToneFor('new')).toBe('accent')
    expect(badgeToneFor('difficulty')).toBe('neutral')
    expect(badgeToneFor('difficulty', 'warning')).toBe('warning')
  })
})

describe('Chip', () => {
  it('reflects selected state via aria-pressed', () => {
    render(<Chip selected>Ngữ pháp</Chip>)
    expect(screen.getByRole('button', { name: 'Ngữ pháp' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Alert', () => {
  it('uses role alert for error tone', () => {
    render(<Alert tone="error" title="Lỗi">Nội dung</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Lỗi')
  })

  it('uses role status for info tone', () => {
    render(<Alert tone="info" title="Thông tin">Nội dung</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Thông tin')
  })
})