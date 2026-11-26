import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, mockNetworkDown } from '@/test/mockApi'
import {
  ApiError,
  axiosClient,
  NETWORK_ERROR,
  setTokenProvider,
  setUnauthorizedHandler,
} from './axiosClient'

afterEach(() => {
  setTokenProvider(() => null)
  setUnauthorizedHandler(null)
})

describe('axiosClient', () => {
  it('uses /api as base URL', () => {
    expect(axiosClient.defaults.baseURL).toBe('/api')
  })

  it('calls the backend set in VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/api/')
    vi.resetModules()

    const { axiosClient: configured } = await import('./axiosClient')

    expect(configured.defaults.baseURL).toBe('https://api.example.com/api')
    vi.unstubAllEnvs()
  })

  it('adds the Bearer token when there is one', async () => {
    const api = mockApi({ 'GET /me': { status: 200, data: {} } })
    setTokenProvider(() => 'abc123')

    await axiosClient.get('/me')

    expect(api.calls[0].headers.get('Authorization')).toBe('Bearer abc123')
  })

  it('sends no Authorization header without a token', async () => {
    const api = mockApi({ 'GET /me': { status: 200, data: {} } })

    await axiosClient.get('/me')

    expect(api.calls[0].headers.get('Authorization')).toBeFalsy()
  })

  it('turns an error response into an ApiError with code and field errors', async () => {
    mockApi({
      'POST /auth/register': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', message: 'Invalid input', fieldErrors: { email: 'bad' } },
      },
    })

    const error = await axiosClient.post('/auth/register', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fieldErrors: { email: 'bad' } })
  })

  it('reports a missing server as NETWORK_ERROR', async () => {
    mockNetworkDown()

    const error = await axiosClient.get('/me').catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 0, code: NETWORK_ERROR })
  })

  it('calls the unauthorized handler on a 401 from a protected endpoint', async () => {
    mockApi({ 'GET /me': { status: 401, data: { code: 'UNAUTHORIZED' } } })
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await axiosClient.get('/me').catch(() => undefined)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not treat a wrong password on login as an expired session', async () => {
    mockApi({ 'POST /auth/login': { status: 401, data: { code: 'INVALID_CREDENTIALS' } } })
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    const error = await axiosClient.post('/auth/login', {}).catch((e: unknown) => e)

    expect(handler).not.toHaveBeenCalled()
    expect(error).toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})
