import { describe, expect, it } from 'vitest'
import { scanAndAnnotateFurigana } from '../lib/globalFurigana'

describe('globalFurigana', () => {
  it('detects and annotates Japanese text in DOM container', () => {
    const container = document.createElement('div')
    const p = document.createElement('p')
    p.textContent = '日本語'
    container.appendChild(p)
    document.body.appendChild(container)

    scanAndAnnotateFurigana(container)

    const rubies = container.querySelectorAll('ruby')
    expect(rubies.length).toBeGreaterThan(0)

    document.body.removeChild(container)
  })

  it('skips inputs and textareas', () => {
    const container = document.createElement('div')
    const input = document.createElement('input')
    input.value = '日本語'
    container.appendChild(input)
    document.body.appendChild(container)

    scanAndAnnotateFurigana(container)

    const rubies = container.querySelectorAll('ruby')
    expect(rubies.length).toBe(0)

    document.body.removeChild(container)
  })

  it('skips elements with data-no-furigana', () => {
    const container = document.createElement('div')
    container.setAttribute('data-no-furigana', 'true')
    const p = document.createElement('p')
    p.textContent = '漢字'
    container.appendChild(p)
    document.body.appendChild(container)

    scanAndAnnotateFurigana(container)

    const rubies = container.querySelectorAll('ruby')
    expect(rubies.length).toBe(0)

    document.body.removeChild(container)
  })
})
