import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient, ApiError } from '../lib/api'
import { config } from '../lib/config'

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockResponse(payload: unknown, status = 200, ok = status < 400) {
  return {
    ok,
    status,
    json: async () => payload,
    headers: { get: () => null },
  }
}

describe('ApiClient', () => {
  it('uses the configured base URL for requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ hello: 'world' }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient({ baseUrl: 'http://example.test' })
    await client.get('/health')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://example.test/health',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('sends JSON bodies on POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ created: true }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient({ baseUrl: 'http://example.test' })
    await client.post('/things', { name: 'abc' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBe(JSON.stringify({ name: 'abc' }))
    expect(init.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }))
  })

  it('attaches a request id to every request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ hello: 'world' }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient({ baseUrl: 'http://example.test' })
    await client.get('/health')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['X-Request-ID']).toMatch(/\S+/)
  })

  it('throws ApiError with the backend error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({ error: { code: 'not_found', message: 'Không tìm thấy' } }, 404),
      ),
    )

    const client = new ApiClient({ baseUrl: 'http://example.test' })
    const promise = client.get('/missing')
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({ status: 404, code: 'not_found', message: 'Không tìm thấy' })
  })

  it('re-throws AbortError without 408 conversion when aborted by caller signal', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      }),
    )

    const client = new ApiClient({ baseUrl: 'http://example.test' })
    controller.abort()
    const promise = client.get('/cancelled', undefined, { signal: controller.signal })
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('converts to 408 timeout when internal timeout occurs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url, init) =>
          new Promise((_, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('timeout')
              err.name = 'AbortError'
              reject(err)
            })
          }),
      ),
    )

    const client = new ApiClient({ baseUrl: 'http://example.test', timeoutMs: 50 })
    const promise = client.get('/slow')
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({ status: 408, code: 'timeout' })
  })
})

describe('frontend configuration', () => {
  it('exposes an API base URL', () => {
    expect(config.apiBaseUrl).toBeTruthy()
    expect(config.apiBaseUrl).toMatch(/^https?:\/\//)
  })
})