import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from '../../components/ui/Select'
import { Combobox } from '../../components/ui/Combobox'

describe('Select', () => {
  it('renders options and selects a value', async () => {
    const user = userEvent.setup()
    render(
      <Select label="Trình độ">
        <option value="n5">N5</option>
        <option value="n3">N3</option>
      </Select>,
    )
    const select = screen.getByLabelText('Trình độ')
    await user.selectOptions(select, 'n3')
    expect(select).toHaveValue('n3')
  })
})

describe('Combobox', () => {
  const options = [
    { value: 'daily', label: 'Đời sống' },
    { value: 'work', label: 'Công việc' },
    { value: 'travel', label: 'Du lịch' },
  ]

  it('filters options by query and selects one', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Combobox label="Chủ đề" value="" onChange={onChange} options={options} />)
    const input = screen.getByLabelText('Chủ đề')
    await user.click(input)
    await user.type(input, 'công')
    expect(screen.getByText('Công việc')).toBeInTheDocument()
    expect(screen.queryByText('Đời sống')).not.toBeInTheDocument()
    await user.click(screen.getByText('Công việc'))
    expect(onChange).toHaveBeenCalledWith('work')
  })

  it('shows the empty state when nothing matches', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Chủ đề" value="" onChange={() => undefined} options={options} />)
    await user.type(screen.getByLabelText('Chủ đề'), 'zzz')
    expect(screen.getByText('Không có lựa chọn phù hợp')).toBeInTheDocument()
  })
})