import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

const mediaQueryList = {
  matches: false,
  media: '',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    ...mediaQueryList,
    media: query,
  })),
)

const healthPayload = {
  status: 'ok',
  app: 'test-app',
  version: '0.1.0',
  environment: 'test',
  timestamp: '2026-01-01T00:00:00Z',
  database: 'ok',
}

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => healthPayload,
  }),
)