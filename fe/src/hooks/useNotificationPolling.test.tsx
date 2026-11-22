import { act, render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeStore } from '@/test/renderWithProviders'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN } from '@/test/renderWithProviders'
import { POLL_INTERVAL_MS, useNotificationPolling } from './useNotificationPolling'

function Probe() {
  useNotificationPolling()
  return null
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

function countCalls(api: ReturnType<typeof mockApi>) {
  return api.calls.filter((call) => call.url === '/notifications/unread-count').length
}

describe('useNotificationPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  })
  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  })

  function mount() {
    const api = mockApi({ 'GET /notifications/unread-count': { status: 200, data: { count: 2 } } })
    const store = makeStore(LOGGED_IN)
    const view = render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    )
    return { api, store, view }
  }

  it('loads the count when mounted and then every minute', async () => {
    const { api, store } = mount()
    await act(async () => {})
    expect(countCalls(api)).toBe(1)
    expect(store.getState().notifications.unreadCount).toBe(2)

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS)
    })
    expect(countCalls(api)).toBe(2)

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS)
    })
    expect(countCalls(api)).toBe(3)
  })

  it('asks nothing while the tab is hidden and asks again when it becomes visible', async () => {
    const { api } = mount()
    await act(async () => {})
    expect(countCalls(api)).toBe(1)

    setVisibility('hidden')
    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 3)
    })
    expect(countCalls(api)).toBe(1)

    await act(async () => {
      setVisibility('visible')
    })
    expect(countCalls(api)).toBe(2)
  })

  it('stops when it is unmounted', async () => {
    const { api, view } = mount()
    await act(async () => {})

    view.unmount()
    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 2)
      setVisibility('visible')
    })

    expect(countCalls(api)).toBe(1)
  })
})
