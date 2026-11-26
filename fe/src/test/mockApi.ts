import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { axiosClient } from '@/api/axiosClient'

/**
 * Test helper: replaces the axios adapter so no real network is used. Interceptors still run, so
 * tests exercise the real axios configuration.
 */

export interface MockReply {
  status: number
  data?: unknown
}

type Handler = MockReply | ((config: InternalAxiosRequestConfig) => MockReply | Promise<MockReply>)

const originalAdapter = axiosClient.defaults.adapter

export interface MockApi {
  /** Every request that reached the adapter, in order. */
  calls: InternalAxiosRequestConfig[]
}

/**
 * Routes are keyed like "POST /auth/login", without the "/api" prefix that every request must have; a
 * request without the prefix, or without a route, answers 404. `calls` also drops the prefix.
 */
export function mockApi(routes: Record<string, Handler>): MockApi {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    const url = config.url ?? ''
    const hasPrefix = url.startsWith('/api/')
    // a copy: the interceptors must keep seeing the real URL
    const call = { ...config, url: hasPrefix ? url.slice('/api'.length) : url }
    calls.push(call)
    const key = `${(config.method ?? 'get').toUpperCase()} ${call.url}`
    const handler = hasPrefix ? routes[key] : undefined
    const reply: MockReply = await (handler
      ? typeof handler === 'function'
        ? handler(call)
        : handler
      : { status: 404, data: { code: 'NOT_FOUND', message: 'No mock for ' + key } })
    const response: AxiosResponse = {
      data: reply.data ?? null,
      status: reply.status,
      statusText: String(reply.status),
      headers: {},
      config,
    }
    if (reply.status >= 400) {
      throw new AxiosError(`Request failed with status code ${reply.status}`, 'ERR_BAD_REQUEST', config, null, response)
    }
    return response
  }
  axiosClient.defaults.adapter = adapter
  return { calls }
}

/** Simulates the server being unreachable (no response at all). */
export function mockNetworkDown(): MockApi {
  const calls: InternalAxiosRequestConfig[] = []
  axiosClient.defaults.adapter = async (config) => {
    calls.push(config)
    throw new AxiosError('Network Error', 'ERR_NETWORK', config, null, undefined)
  }
  return { calls }
}

export function resetApi(): void {
  axiosClient.defaults.adapter = originalAdapter
}
