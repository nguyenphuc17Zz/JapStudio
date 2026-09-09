import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import { AIProviderProvider, useAIProvider } from '../context/AIProviderContext'

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
    {
      name: 'ollama',
      configured: false,
      available: false,
      default_model: 'qwen2.5:7b',
      capabilities: { generate: true, generate_structured: true, stream: true },
    },
  ],
}

const modelsPayload = [
  {
    provider: 'gemini',
    models: [
      { id: 'gemini-2.5-flash', provider: 'gemini', display_name: 'Gemini 2.5 Flash (Khuyên dùng)', owned_by: 'google' },
      { id: 'gemini-2.5-pro', provider: 'gemini', display_name: 'Gemini 2.5 Pro (Chuyên sâu)', owned_by: 'google' },
    ],
    error: null,
  },
  {
    provider: 'groq',
    models: [
      { id: 'llama-3.3-70b-versatile', provider: 'groq', display_name: 'Llama 3.3 70B (Khuyên dùng)', owned_by: 'meta' },
      { id: 'llama-3.1-8b-instant', provider: 'groq', display_name: 'Llama 3.1 8B Instant', owned_by: 'meta' },
    ],
    error: null,
  },
]

function jsonResponse(payload: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => payload })
}

function TestConsumer() {
  const { selectedProvider, selectedModel, setProvider, setModel } = useAIProvider()
  return (
    <div>
      <span data-testid="current-provider">{selectedProvider}</span>
      <span data-testid="current-model">{selectedModel}</span>
      <button type="button" onClick={() => void setProvider('groq')}>
        Chuyển sang Groq
      </button>
      <button type="button" onClick={() => setModel('gemini-2.5-pro')}>
        Chọn Pro
      </button>
      <AIModelPicker variant="card" label="Chọn mô hình AI" />
    </div>
  )
}

describe('AIProviderIntegration', () => {
  beforeEach(() => {
    localStorage.clear()
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/v1/ai/providers')) return jsonResponse(providersPayload)
      if (url.includes('/api/v1/ai/models')) return jsonResponse(modelsPayload)
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('initializes default provider and loads available models dynamically', async () => {
    render(
      <AIProviderProvider>
        <TestConsumer />
      </AIProviderProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-provider').textContent).toBe('gemini')
    })
    expect(screen.getByTestId('current-model').textContent).toBe('gemini-2.5-flash')
  })

  it('switches provider, dynamically fetches models and updates available model list in AIModelPicker', async () => {
    render(
      <AIProviderProvider>
        <TestConsumer />
      </AIProviderProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-provider').textContent).toBe('gemini')
    })

    const providerSelect = screen.getByLabelText('Nhà cung cấp')
    await userEvent.selectOptions(providerSelect, 'groq')

    await waitFor(() => {
      expect(screen.getByTestId('current-provider').textContent).toBe('groq')
    })
    expect(screen.getByTestId('current-model').textContent).toBe('llama-3.3-70b-versatile')
    expect(localStorage.getItem('jw:ai_selected_provider')).toBe('groq')
  })

  it('allows changing model and persists preference', async () => {
    render(
      <AIProviderProvider>
        <TestConsumer />
      </AIProviderProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-provider').textContent).toBe('gemini')
    })

    const modelSelect = screen.getByLabelText('Mô hình')
    await userEvent.selectOptions(modelSelect, 'gemini-2.5-pro')

    expect(screen.getByTestId('current-model').textContent).toBe('gemini-2.5-pro')
    expect(localStorage.getItem('jw:ai_selected_model')).toBe('gemini-2.5-pro')
  })

  it('renders compact and inline variants cleanly without fake providers', () => {
    render(
      <AIProviderProvider>
        <div data-testid="compact-wrapper">
          <AIModelPicker variant="compact" />
        </div>
        <div data-testid="inline-wrapper">
          <AIModelPicker variant="inline" label="Mô hình AI" />
        </div>
      </AIProviderProvider>,
    )

    expect(screen.getByTestId('compact-wrapper')).toBeInTheDocument()
    expect(screen.getByTestId('inline-wrapper')).toBeInTheDocument()
    // Ensure fake provider is not in any select option
    expect(screen.queryByText(/Fake/i)).toBeNull()
  })
})
