import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AIWritingAssistantDrawer } from '../components/ai/AIWritingAssistantDrawer'
import { api } from '../services/api'

describe('AIWritingAssistantDrawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders collapsed by default and expands with static fallback when no prompt provided', async () => {
    render(<AIWritingAssistantDrawer />)

    expect(screen.getByText(/Trợ lực AI/i)).toBeInTheDocument()
    const toggleBtn = screen.getByRole('button', { name: /Xem gợi ý hướng viết & từ vựng/i })
    expect(toggleBtn).toBeInTheDocument()

    await userEvent.click(toggleBtn)
    expect(await screen.findByText(/Góc nhìn Trải nghiệm/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mẫu câu & Từ nối/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dàn ý gợi ý/i })).toBeInTheDocument()
  })

  it('switches tabs and allows inserting phrases', async () => {
    const handleInsert = vi.fn()
    render(<AIWritingAssistantDrawer onInsertPhrase={handleInsert} />)

    await userEvent.click(screen.getByRole('button', { name: /Xem gợi ý hướng viết & từ vựng/i }))

    // Click starter insert button
    const insertBtn = await screen.findByTitle(/私の経験から言うと、/i)
    await userEvent.click(insertBtn)
    expect(handleInsert).toHaveBeenCalledWith('私の経験から言うと、')

    // Switch to phrases tab
    await userEvent.click(screen.getByRole('button', { name: /Mẫu câu & Từ nối/i }))
    const phraseBtn = await screen.findByTitle(/その結果、/i)
    await userEvent.click(phraseBtn)
    expect(handleInsert).toHaveBeenCalledWith('その結果、')

    // Switch to outline tab
    await userEvent.click(screen.getByRole('button', { name: /Dàn ý gợi ý/i }))
    expect(await screen.findByText(/1\. Mở bài:/i)).toBeInTheDocument()
  })

  it('dynamically calls API and renders live AI scaffolding when prompt is provided', async () => {
    const mockScaffold = {
      outline_steps: [
        '1. Mở bài động: Giới thiệu tình huống cụ thể.',
        '2. Thân bài động: Chi tiết phân tích.',
        '3. Kết bài động: Lời cảm ơn và giải pháp.',
      ],
      idea_angles: [
        {
          title: 'Góc nhìn Doanh nghiệp AI',
          description: 'Phân tích hiệu quả kinh doanh.',
          starter: 'ビジネスの観点から申し上げますと、',
        },
      ],
      golden_phrases: [
        {
          japanese: '何卒よろしくお願い申し上げます',
          reading: 'なにとぞよろしくおねがいもうしあげます',
          meaning: 'Rất mong nhận được sự giúp đỡ',
          type: 'expression' as const,
        },
      ],
    }

    const spy = vi.spyOn(api, 'getWritingScaffold').mockResolvedValueOnce(mockScaffold)

    render(
      <AIWritingAssistantDrawer
        prompt_vi="Viết báo cáo gửi sếp"
        context_vi="Công ty IT Nhật Bản"
        jlpt_level="N2"
        register="business"
      />
    )

    const toggleBtn = screen.getByRole('button', { name: /Xem gợi ý hướng viết & từ vựng/i })
    await userEvent.click(toggleBtn)

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt_vi: 'Viết báo cáo gửi sếp',
          context_vi: 'Công ty IT Nhật Bản',
          jlpt_level: 'N2',
          register: 'business',
        })
      )
    })

    expect(await screen.findByText(/Góc nhìn Doanh nghiệp AI/i)).toBeInTheDocument()
    expect(screen.getByText(/ビジネスの観点から申し上げますと、/i)).toBeInTheDocument()
    expect(screen.getByText(/AI Động/i)).toBeInTheDocument()
  })
})
