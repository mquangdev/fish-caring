import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorBody } from '@/types/api'

/**
 * The only place axios is configured. Services import `axiosClient`; nothing else talks to the
 * network. The token and the "session expired" reaction are injected by the store (see
 * `setTokenProvider` / `setUnauthorizedHandler`) so this file never imports the store.
 */

export const NETWORK_ERROR = 'NETWORK_ERROR'
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

/** Every failed request is rejected with this error, whatever the cause. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string>

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

type TokenProvider = () => string | null
type UnauthorizedHandler = () => void

let tokenProvider: TokenProvider = () => null
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

/** A 401 from these endpoints means "wrong credentials", not "your session expired". */
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register']

function isPublicAuthRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = config?.url ?? ''
  return PUBLIC_AUTH_PATHS.some((path) => url.startsWith(path))
}

export const axiosClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  const token = tokenProvider()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new ApiError(0, UNKNOWN_ERROR, 'Unexpected error'))
    }
    if (!error.response) {
      return Promise.reject(new ApiError(0, NETWORK_ERROR, error.message))
    }
    const { status, data } = error.response
    const body = (data ?? {}) as ApiErrorBody
    if (status === 401 && !isPublicAuthRequest(error.config)) {
      unauthorizedHandler?.()
    }
    return Promise.reject(
      new ApiError(status, body.code ?? UNKNOWN_ERROR, body.message ?? error.message, body.fieldErrors ?? {}),
    )
  },
)
