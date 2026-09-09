import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from '../pages/SettingsPage'

const providersPayload = {
  default_provider: 'groq',
  fallback_providers: ['gemini'],
  providers: [
    {
      name: 'fake',
      configured: true,
      available: true,
      default_model: 'fake-model',
      capabilities: { generate: true, generate_structured: true, stream: true },
    },
    {
      name: 'gemini',
      configured: false,
      available: false,
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
      configured: true,
      available: false,
      default_model: 'llama3.2',
      capabilities: { generate: true, generate_structured: true, stream: true },
    },
  ],
}

const configPayload = {
  gemini: { configured: false, api_key_masked: null, base_url: null, default_model: 'gemini-2.5-flash' },
  groq: { configured: true, api_key_masked: 'gsk_****1234', base_url: null, default_model: 'llama-3.3-70b-versatile' },
  ollama: { configured: true, api_key_masked: null, base_url: 'http://localhost:11434', default_model: 'llama3.2' },
}

const modelsPayload = [
  { provider: 'fake', models: [{ id: 'fake-extra-model', provider: 'fake', display_name: null, owned_by: null }], error: null },
  { provider: 'gemini', models: [], error: 'not_configured' },
  {
    provider: 'groq',
    models: [
      { id: 'llama-3.3-70b-versatile', provider: 'groq', display_name: 'Llama 3.3 70B', owned_by: 'meta' },
      { id: 'qwen/qwen3.6-27b', provider: 'groq', display_name: 'Qwen 3.6 27B', owned_by: 'qwen' },
    ],
    error: null,
  },
]

const profilePayload = {
  id: 'prof-1',
  goal: 'Thi JLPT N3',
  target_jlpt: 'N3',
  daily_target: 5,
  preferred_registers: ['casual', 'polite'],
  preferred_topics: ['Công việc', 'Du lịch'],
  native_language: 'vi',
  target_level: null,
  adaptive_state: null,
  evidence_count: 3,
  profile_version: 'learner_profile:v1',
  streak_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function jsonResponse(payload: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => payload })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/ai/providers/config')) return jsonResponse(configPayload)
      if (url.includes('/api/v1/ai/providers')) return jsonResponse(providersPayload)
      if (url.includes('/api/v1/ai/models')) return jsonResponse(modelsPayload)
      if (url.includes('/api/v1/learning/profile')) {
        if (init?.method === 'PUT') return jsonResponse(profilePayload)
        return jsonResponse(profilePayload)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
  }

  it('renders without crashing and shows title', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Cài đặt' })).toBeInTheDocument()
  })

  it('shows provider status and filters out fake provider', async () => {
    renderPage()
    expect((await screen.findAllByText('Google Gemini')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Groq')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Ollama (máy chủ cục bộ)')).length).toBeGreaterThan(0)
    // Should NOT show fake provider
    expect(screen.queryByText('fake-model')).not.toBeInTheDocument()
  })

  it('saves an API key and refreshes the status', async () => {
    renderPage()
    const keyInput = await screen.findByLabelText(/^Gemini API key \(/)
    fireEvent.change(keyInput, { target: { value: 'AIzaTestKey1234567890' } })
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
    await waitFor(() => expect(screen.getByText('Đã lưu cấu hình khóa API và mô hình.')).toBeInTheDocument())
    const fetchMock = vi.mocked(fetch)
    const putCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'PUT' && String(url).includes('/api/v1/ai/providers/config'),
    )
    expect(putCall).toBeDefined()
    const body = JSON.parse(putCall?.[1]?.body as string)
    expect(body.gemini_api_key).toBe('AIzaTestKey1234567890')
  })

  it('does not store sensitive API keys in localStorage for security (P0)', async () => {
    const firstRender = renderPage()
    const keyInput = await screen.findByLabelText(/^Gemini API key \(/)
    fireEvent.change(keyInput, { target: { value: 'AIzaPersisted123456789' } })
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
    await waitFor(() => expect(screen.getByText('Đã lưu cấu hình khóa API và mô hình.')).toBeInTheDocument())
    expect(keyInput).toHaveValue('AIzaPersisted123456789')
    // P0 Security Requirement: raw API keys must never be persisted to localStorage
    expect(localStorage.getItem('settings.geminiKey')).toBeNull()
    expect(localStorage.getItem('settings.groqKey')).toBeNull()
    firstRender.unmount()
  })

  it('toggles API key visibility', async () => {
    renderPage()
    const geminiInput = (await screen.findByLabelText(/^Gemini API key \(/)) as HTMLInputElement
    expect(geminiInput.type).toBe('password')
    await userEvent.click(screen.getByRole('button', { name: 'Hiện Gemini API key' }))
    expect(geminiInput.type).toBe('text')
    await userEvent.click(screen.getByRole('button', { name: 'Ẩn Gemini API key' }))
    expect(geminiInput.type).toBe('password')
  })

  it('defaults the Ollama server URL', async () => {
    renderPage()
    expect(await screen.findByLabelText(/^Ollama địa chỉ máy chủ \(/)).toHaveValue(
      'http://localhost:11434',
    )
  })

  it('loads and displays the model list without fake data and allows selecting a model', async () => {
    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Tải danh sách mô hình' }),
    )
    // Fake model should be excluded
    expect(screen.queryByText('fake-extra-model')).not.toBeInTheDocument()

    // Real models should be present
    expect(await screen.findByText('Chưa cấu hình khóa')).toBeInTheDocument()
    expect(await screen.findByText('qwen/qwen3.6-27b')).toBeInTheDocument()
    expect(screen.getAllByText('llama-3.3-70b-versatile').length).toBeGreaterThan(0)

    // Active model has 'Đang sử dụng' badge
    expect(screen.getByText('✓ Đang sử dụng')).toBeInTheDocument()

    // Select alternative model
    const selectBtn = screen.getByRole('button', { name: 'Chọn mô hình này' })
    await userEvent.click(selectBtn)

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch)
      const putCall = fetchMock.mock.calls.find(
        ([url, init]) => init?.method === 'PUT' && String(url).includes('/api/v1/ai/providers/config'),
      )
      expect(putCall).toBeDefined()
      const body = JSON.parse(putCall?.[1]?.body as string)
      expect(body.groq_default_model).toBe('qwen/qwen3.6-27b')
    })
  })

  it('reports errors from the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({
          error: { code: 'provider_error', message: 'AI provider is not available' },
        }),
      }),
    )
    renderPage()
    expect(await screen.findByText(/Không thể tải trạng thái nhà cung cấp/)).toBeInTheDocument()
  })

  it('loads the learning profile into the form', async () => {
    renderPage()
    const goalInput = await screen.findByLabelText('Mục tiêu học tập')
    await waitFor(() => expect(goalInput).toHaveValue('Thi JLPT N3'))
    expect(screen.getByLabelText('Mục tiêu JLPT')).toHaveValue('N3')
    expect(screen.getByLabelText('Số bài tập mỗi ngày')).toHaveValue(5)
    expect(screen.getByLabelText('Chủ đề yêu thích')).toHaveValue('Công việc, Du lịch')
    expect(screen.getByLabelText('Thân mật')).toBeChecked()
    expect(screen.getByLabelText('Lịch sự')).toBeChecked()
    expect(screen.getByLabelText('Kinh doanh')).not.toBeChecked()
  })

  it('saves the learning profile', async () => {
    renderPage()
    const goalInput = await screen.findByLabelText('Mục tiêu học tập')
    await waitFor(() => expect(goalInput).toHaveValue('Thi JLPT N3'))
    await userEvent.clear(goalInput)
    await userEvent.type(goalInput, 'Ôn thi JLPT N2')
    await userEvent.selectOptions(screen.getByLabelText('Mục tiêu JLPT'), 'N2')
    await userEvent.clear(screen.getByLabelText('Số bài tập mỗi ngày'))
    await userEvent.type(screen.getByLabelText('Số bài tập mỗi ngày'), '8')
    await userEvent.click(screen.getByLabelText('Kinh doanh'))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    await waitFor(() => expect(screen.getByText('Đã lưu hồ sơ học tập.')).toBeInTheDocument())

    const fetchMock = vi.mocked(fetch)
    const putCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'PUT' && String(url).includes('/api/v1/learning/profile'),
    )
    expect(putCall).toBeDefined()
    const body = JSON.parse(putCall?.[1]?.body as string)
    expect(body).toEqual({
      goal: 'Ôn thi JLPT N2',
      target_jlpt: 'N2',
      daily_target: 8,
      preferred_registers: ['casual', 'polite', 'business'],
      preferred_topics: ['Công việc', 'Du lịch'],
      streak_enabled: true,
      memory_enabled: true,
    })
  })

  it('toggles the streak tracking preference', async () => {
    renderPage()
    const toggle = (await screen.findByLabelText(/Ghi nhận chuỗi ngày luyện tập/)) as HTMLInputElement
    await waitFor(() => expect(toggle).toBeChecked())
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    await waitFor(() => expect(screen.getByText('Đã lưu hồ sơ học tập.')).toBeInTheDocument())
    const fetchMock = vi.mocked(fetch)
    const putCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'PUT' && String(url).includes('/api/v1/learning/profile'),
    )
    const body = JSON.parse(putCall?.[1]?.body as string)
    expect(body.streak_enabled).toBe(false)
  })

  it('toggles the memory preference', async () => {
    renderPage()
    const toggle = (await screen.findByLabelText(
      /Tự động ghi nhớ các mẫu lỗi/,
    )) as HTMLInputElement
    await waitFor(() => expect(toggle).toBeChecked())
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    await waitFor(() => expect(screen.getByText('Đã lưu hồ sơ học tập.')).toBeInTheDocument())
    const fetchMock = vi.mocked(fetch)
    const putCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'PUT' && String(url).includes('/api/v1/learning/profile'),
    )
    const body = JSON.parse(putCall?.[1]?.body as string)
    expect(body.memory_enabled).toBe(false)
  })
})