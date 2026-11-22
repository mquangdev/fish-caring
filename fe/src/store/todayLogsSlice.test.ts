import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/mockApi'
import authReducer, { loggedOut } from './authSlice'
import logsReducer, { fetchGeneralLogs, fetchTankLogs } from './logsSlice'
import todayReducer, { completeTask, fetchToday, snoozeTask } from './todaySlice'

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, today: todayReducer, logs: logsReducer } })
}

const ITEM = { id: 3, title: 'Cho ăn', nextDueAt: '2026-11-21T08:00:00' }

describe('todaySlice', () => {
  it('loads the two groups', async () => {
    mockApi({ 'GET /today': { status: 200, data: { due: [ITEM], upcoming: [{ ...ITEM, id: 4 }] } } })
    const store = makeStore()

    await store.dispatch(fetchToday())

    const state = store.getState().today
    expect(state.status).toBe('succeeded')
    expect(state.due).toHaveLength(1)
    expect(state.upcoming[0].id).toBe(4)
  })

  it('keeps a Vietnamese error when loading fails', async () => {
    mockApi({ 'GET /today': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()

    await store.dispatch(fetchToday())

    expect(store.getState().today.status).toBe('failed')
    expect(store.getState().today.error).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  })

  it('locks only the card being acted on while complete runs', async () => {
    let release: (() => void) | null = null
    mockApi({
      'POST /tasks/3/complete': () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 200, data: { id: 3 } })
        }),
    })
    const store = makeStore()

    const pending = store.dispatch(completeTask(3))
    expect(store.getState().today.actingId).toBe(3)
    await vi.waitFor(() => expect(release).not.toBeNull())
    release!()
    await pending

    expect(store.getState().today.actingId).toBeNull()
  })

  it('unlocks the card and words the 409 for a turned-off task', async () => {
    mockApi({ 'POST /tasks/3/snooze': { status: 409, data: { code: 'CONFLICT', message: 'Task is turned off' } } })
    const store = makeStore()

    const result = await store.dispatch(snoozeTask(3))

    expect(snoozeTask.rejected.match(result)).toBe(true)
    if (snoozeTask.rejected.match(result)) {
      expect(result.payload?.message).toBe('Lịch này đang tắt nên không thể thực hiện.')
    }
    expect(store.getState().today.actingId).toBeNull()
  })

  it('forgets everything when the user logs out', async () => {
    mockApi({ 'GET /today': { status: 200, data: { due: [ITEM], upcoming: [] } } })
    const store = makeStore()
    await store.dispatch(fetchToday())

    store.dispatch(loggedOut())

    expect(store.getState().today.due).toEqual([])
    expect(store.getState().today.status).toBe('idle')
  })
})

describe('logsSlice', () => {
  it('loads the history of a tank', async () => {
    mockApi({ 'GET /tanks/7/logs': { status: 200, data: [{ id: 1 }] } })
    const store = makeStore()

    await store.dispatch(fetchTankLogs(7))

    const state = store.getState().logs
    expect(state.tankStatus).toBe('succeeded')
    expect(state.tankLogsFor).toBe(7)
    expect(state.tankLogs).toHaveLength(1)
  })

  it('does not keep the history of another tank while a new one loads', async () => {
    mockApi({ 'GET /tanks/7/logs': { status: 200, data: [{ id: 1 }] }, 'GET /tanks/8/logs': () => new Promise(() => {}) })
    const store = makeStore()
    await store.dispatch(fetchTankLogs(7))

    void store.dispatch(fetchTankLogs(8))

    expect(store.getState().logs.tankLogsFor).toBe(8)
    expect(store.getState().logs.tankLogs).toEqual([])
    expect(store.getState().logs.tankStatus).toBe('loading')
  })

  it('keeps a Vietnamese error when the tank history fails', async () => {
    mockApi({ 'GET /tanks/7/logs': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()

    await store.dispatch(fetchTankLogs(7))

    expect(store.getState().logs.tankStatus).toBe('failed')
    expect(store.getState().logs.tankError).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  })

  it('loads the history of the tasks without a tank and resets on logout', async () => {
    mockApi({ 'GET /tasks/general/logs': { status: 200, data: [{ id: 2 }] } })
    const store = makeStore()

    await store.dispatch(fetchGeneralLogs())
    expect(store.getState().logs.generalLogs).toHaveLength(1)

    store.dispatch(loggedOut())
    expect(store.getState().logs.generalLogs).toEqual([])
    expect(store.getState().logs.generalStatus).toBe('idle')
  })
})
