import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from '../../components/ui/Tabs'

const items = [
  { id: 'one', label: 'Tab một', content: 'Nội dung một.' },
  { id: 'two', label: 'Tab hai', content: 'Nội dung hai.' },
  { id: 'three', label: 'Tab ba', content: 'Nội dung ba.' },
]

describe('Tabs', () => {
  it('shows the selected tab panel', () => {
    render(<Tabs items={items} value="two" onChange={() => undefined} />)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Nội dung hai.')
  })

  it('switches panels on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={items} value="one" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Tab ba' }))
    expect(onChange).toHaveBeenCalledWith('three')
  })

  it('moves focus with arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={items} value="one" onChange={onChange} />)
    const first = screen.getByRole('tab', { name: 'Tab một' })
    first.focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('two')
  })
})