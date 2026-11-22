import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/mockApi'
import type { TaskPayload } from '@/types/api'
import authReducer, { loggedOut } from './authSlice'
import tasksReducer, {
  clearCurrentTask,
  clearTaskState,
  createTask,
  deleteTask,
  fetchGeneralTasks,
  fetchTask,
  setTaskEnabled,
  updateTask,
} from './tasksSlice'

const PAYLOAD: TaskPayload = {
  tankId: 7,
  type: 'WATER_CHANGE',
  title: 'Thay nước',
  note: null,
  repeatType: 'DAILY',
  intervalDays: null,
  timeOfDay: '08:00',
  startDate: null,
  foodName: null,
  waterChangePercent: 30,
  fertilizerMl: null,
}

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, tasks: tasksReducer } })
}

describe('tasksSlice', () => {
  it('create succeeds', async () => {
    mockApi({ 'POST /tasks': { status: 201, data: { id: 1 } } })
    const store = makeStore()

    const result = await store.dispatch(createTask(PAYLOAD))

    expect(createTask.fulfilled.match(result)).toBe(true)
    expect(store.getState().tasks.saveStatus).toBe('succeeded')
  })

  it('create keeps Vietnamese field errors from the server', async () => {
    mockApi({
      'POST /tasks': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', message: 'Invalid', fieldErrors: { waterChangePercent: 'must be <= 100' } },
      },
    })
    const store = makeStore()

    await store.dispatch(createTask(PAYLOAD))

    const state = store.getState().tasks
    expect(state.saveStatus).toBe('failed')
    expect(state.saveError).toBe('Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.')
    expect(state.saveFieldErrors.waterChangePercent).toBe('Phần trăm nước từ 1 đến 100.')
  })

  it('update goes through the same save state', async () => {
    mockApi({ 'PUT /tasks/3': { status: 200, data: { id: 3 } } })
    const store = makeStore()

    await store.dispatch(updateTask({ id: 3, payload: PAYLOAD }))

    expect(store.getState().tasks.saveStatus).toBe('succeeded')
  })

  it('locks only the toggled task while the request runs', async () => {
    let release: (() => void) | null = null
    mockApi({
      'PATCH /tasks/3/enabled': () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 200, data: { id: 3, enabled: false } })
        }),
    })
    const store = makeStore()

    const pending = store.dispatch(setTaskEnabled({ id: 3, enabled: false }))
    expect(store.getState().tasks.togglingId).toBe(3)

    // the request only reaches the (mock) server after the axios interceptors have run
    await vi.waitFor(() => expect(release).not.toBeNull())
    release!()
    await pending
    expect(store.getState().tasks.togglingId).toBeNull()
  })

  it('unlocks the switch when toggling fails', async () => {
    mockApi({
      'PATCH /tasks/3/enabled': { status: 400, data: { code: 'VALIDATION_ERROR', fieldErrors: { startDate: 'x' } } },
    })
    const store = makeStore()

    const result = await store.dispatch(setTaskEnabled({ id: 3, enabled: true }))

    expect(setTaskEnabled.rejected.match(result)).toBe(true)
    expect(store.getState().tasks.togglingId).toBeNull()
    if (setTaskEnabled.rejected.match(result)) {
      expect(result.payload?.fieldErrors.startDate).toBeTruthy()
    }
  })

  it('delete tracks status and error', async () => {
    mockApi({ 'DELETE /tasks/3': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()

    await store.dispatch(deleteTask(3))
    expect(store.getState().tasks.deleteStatus).toBe('failed')
    expect(store.getState().tasks.deleteError).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')

    mockApi({ 'DELETE /tasks/3': { status: 204 } })
    await store.dispatch(deleteTask(3))
    expect(store.getState().tasks.deleteStatus).toBe('succeeded')
  })

  it('clearTaskState and logging out reset everything', async () => {
    mockApi({ 'DELETE /tasks/3': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()
    await store.dispatch(deleteTask(3))

    store.dispatch(clearTaskState())
    expect(store.getState().tasks.deleteStatus).toBe('idle')

    await store.dispatch(deleteTask(3))
    store.dispatch(loggedOut())
    expect(store.getState().tasks.deleteStatus).toBe('idle')
    expect(store.getState().tasks.deleteError).toBeNull()
  })

  it('loads the general tasks', async () => {
    mockApi({ 'GET /tasks/general': { status: 200, data: [{ id: 5, tankId: null }] } })
    const store = makeStore()

    await store.dispatch(fetchGeneralTasks())

    expect(store.getState().tasks.generalStatus).toBe('succeeded')
    expect(store.getState().tasks.general).toHaveLength(1)
  })

  it('keeps a Vietnamese error when the general tasks cannot be loaded', async () => {
    mockApi({ 'GET /tasks/general': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()

    await store.dispatch(fetchGeneralTasks())

    expect(store.getState().tasks.generalStatus).toBe('failed')
    expect(store.getState().tasks.generalError).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  })

  it('loads one task and knows when it does not exist', async () => {
    mockApi({
      'GET /tasks/3': { status: 200, data: { id: 3 } },
      'GET /tasks/9': { status: 404, data: { code: 'NOT_FOUND' } },
    })
    const store = makeStore()

    await store.dispatch(fetchTask(3))
    expect(store.getState().tasks.current).toEqual({ id: 3 })

    await store.dispatch(fetchTask(9))
    expect(store.getState().tasks.current).toBeNull()
    expect(store.getState().tasks.currentNotFound).toBe(true)

    store.dispatch(clearCurrentTask())
    expect(store.getState().tasks.currentNotFound).toBe(false)
    expect(store.getState().tasks.currentStatus).toBe('idle')
  })
})
