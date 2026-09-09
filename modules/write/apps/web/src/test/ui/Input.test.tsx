import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'

describe('Input', () => {
  it('links label, input and error message', () => {
    render(<Input label="Email" error="Không hợp lệ" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Không hợp lệ')
  })

  it('wires the invalid flag to aria-invalid', () => {
    render(<Input label="Số ký tự" invalid />)
    expect(screen.getByLabelText('Số ký tự')).toHaveAttribute('aria-invalid', 'true')
  })

  it('updates value on typing', async () => {
    const user = userEvent.setup()
    render(<Input label="Tên" />)
    const input = screen.getByLabelText('Tên')
    await user.type(input, '日本語')
    expect(input).toHaveValue('日本語')
  })
})

describe('Textarea', () => {
  it('renders with placeholder and counter', () => {
    render(<Textarea label="Bài viết" counter="42 / 120" placeholder="Viết…" />)
    const area = screen.getByLabelText('Bài viết')
    expect(area).toHaveAttribute('placeholder', 'Viết…')
    expect(screen.getByText('42 / 120')).toBeInTheDocument()
  })
})