import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyLookupProvider, useVocabularyLookup } from '../context/VocabularyLookupContext'
import { AIProviderProvider } from '../context/AIProviderContext'
import { AIVocabularyLookupBox } from '../components/vocabulary/AIVocabularyLookupBox'
import type { VocabLookupResponse } from '../types/api'

const mockLookupResponse: VocabLookupResponse = {
  query: 'bàn bạc lại',
  detected_direction: 'vi_to_ja',
  context_used: 'Tôi muốn bàn bạc lại về tiến độ dự án',
  best_match: {
    expression: 'すり合わせる',
    reading: 'すりあわせる',
    meaning_vi: 'Bàn bạc, đối chiếu, thống nhất ý kiến',
    part_of_speech: '動詞',
    estimated_jlpt_level: 'N2',
    difficulty: 6,
    register: 'business',
    nuance_explanation: 'Trong môi trường công sở, すり合わせる thể hiện việc các bên cùng ngồi lại đối chiếu, điều chỉnh để đi đến một thống nhất chung.',
    usage_collocation: 'スケジュールをすり合わせる',
    example_sentence: '進捗に遅れが出ているため、一度スケジュールをすり合わせましょう。',
    example_sentence_vi: 'Vì tiến độ đang bị trễ, chúng ta hãy cùng bàn bạc đối chiếu lại lịch trình một lần nhé.',
  },
  alternatives: [
    {
      expression: '再調整する',
      reading: 'さいちょうせいする',
      meaning_vi: 'Điều chỉnh lại',
      estimated_jlpt_level: 'N2',
      register: 'business',
      difference_explanation: 'Nhấn mạnh vào việc sắp xếp, thay đổi lại các mốc thời gian hoặc kế hoạch cụ thể.',
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => payload,
    headers: { get: () => null },
  })
}


function TestTrigger() {
  const { openLookup } = useVocabularyLookup()
  return (
    <div>
      <button
        type="button"
        onClick={() => openLookup({ query: 'bàn bạc lại', context: 'Tôi muốn bàn bạc lại về tiến độ dự án' })}
      >
        Mở Tra Cứu AI
      </button>
    </div>
  )
}

function renderLookupApp() {
  return render(
    <AIProviderProvider>
      <VocabularyLookupProvider>
        <TestTrigger />
        <AIVocabularyLookupBox />
      </VocabularyLookupProvider>
    </AIProviderProvider>,
  )
}


const providersPayload = {
  default_provider: 'gemini',
  fallback_providers: ['groq'],
  providers: [
    {
      name: 'gemini',
      configured: true,
      available: true,
      default_model: 'gemini-2.5-flash',
      capabilities: { generate: true, generate_structured: true, stream: true },
    },
    {
      name: 'groq',
      configured: true,
      available: true,
      default_model: 'llama-3.3-70b-versatile',
      capabilities: { generate: true, generate_structured: true, stream: true },
    },
  ],
}

const modelsPayload = [
  {
    provider: 'gemini',
    models: [
      { id: 'gemini-2.5-flash', provider: 'gemini', display_name: 'Gemini 2.5 Flash', owned_by: 'google' },
    ],
    error: null,
  },
]

describe('AI Contextual Vocabulary Lookup System', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/v1/vocabulary/ai-lookup')) {
          return jsonResponse(mockLookupResponse)
        }
        if (url.includes('/api/v1/vocabulary/save-lookup')) {
          return jsonResponse({
            entry_id: 'vocab-saved-123',
            is_new: true,
            message: 'Đã thêm từ vựng mới vào sổ tay',
          })
        }
        if (url.includes('/api/v1/ai/models')) {
          return jsonResponse(modelsPayload)
        }
        if (url.includes('/api/v1/ai/providers')) {
          return jsonResponse(providersPayload)
        }
        return jsonResponse({})
      }),
    )
  })


  it('opens lookup box and performs contextual AI search', async () => {
    const user = userEvent.setup()
    renderLookupApp()

    // 1. Click trigger
    const openBtn = screen.getByRole('button', { name: /Mở Tra Cứu AI/i })
    await user.click(openBtn)

    // 2. Lookup box should appear
    expect(screen.getByText(/Tra Cứu Từ Vựng AI Theo Ngữ Cảnh/i)).toBeInTheDocument()

    // 3. Click search button
    const searchBtn = screen.getByRole('button', { name: /Tra AI/i })
    await user.click(searchBtn)

    // 4. Search query and result
    await waitFor(() => {
      expect(screen.getByText(/Bàn bạc, đối chiếu, thống nhất/i)).toBeInTheDocument()
    })

    // 5. Nuance explanation and collocation
    expect(screen.getByText(/Trong môi trường công sở/i)).toBeInTheDocument()
    expect(screen.getByText(/スケジュールをすり合わせる/i)).toBeInTheDocument()

    // 6. Alternatives
    expect(screen.getByText(/Điều chỉnh lại/i)).toBeInTheDocument()
  })

  it('can save the looked-up word into vocabulary bank', async () => {
    const user = userEvent.setup()
    renderLookupApp()

    await user.click(screen.getByRole('button', { name: /Mở Tra Cứu AI/i }))

    const searchBtn = screen.getByRole('button', { name: /Tra AI/i })
    await user.click(searchBtn)

    await waitFor(() => {
      expect(screen.getByText(/Bàn bạc, đối chiếu, thống nhất/i)).toBeInTheDocument()
    })

    const saveBtn = screen.getByRole('button', { name: /Lưu từ vựng/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText(/Đã thêm từ vựng mới vào sổ tay/i)).toBeInTheDocument()
    })
  })

  it('automatically executes search API when opened with a query without requiring extra clicks', async () => {
    const user = userEvent.setup()
    renderLookupApp()

    const openBtn = screen.getByRole('button', { name: /Mở Tra Cứu AI/i })
    await user.click(openBtn)

    // Should immediately fire search and render results automatically
    await waitFor(() => {
      expect(screen.getByText(/Bàn bạc, đối chiếu, thống nhất/i)).toBeInTheDocument()
    })
  })
})


