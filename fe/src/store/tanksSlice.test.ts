import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import { mockApi, mockNetworkDown } from '@/test/mockApi'
import type { Tank, TankPayload, TankSummary } from '@/types/api'
import authReducer, { loggedOut } from './authSlice'
import tanksReducer, {
  clearCurrent,
  createTank,
  deleteTank,
  fetchTank,
  fetchTanks,
  updateTank,
} from './tanksSlice'

const SUMMARY: TankSummary = {
  id: 1,
  name: 'Bể 1',
  volumeLiters: 60,
  taskCount: 0,
  nextDueAt: null,
}

const TANK: Tank = {
  id: 1,
  name: 'Bể 1',
  volumeLiters: 60,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  setupDate: null,
  note: null,
  createdAt: '2026-11-21T08:00:00',
  updatedAt: '2026-11-21T08:00:00',
  fish: [{ id: 5, speciesName: 'Neon', quantity: 10, status: 'ALIVE' }],
  tasks: [],
}

const PAYLOAD: TankPayload = {
  name: 'Bể 1',
  volumeLiters: 60,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  setupDate: null,
  note: null,
  fish: [],
}

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, tanks: tanksReducer } })
}

describe('tanksSlice', () => {
  it('fetchTanks stores the list', async () => {
    mockApi({ 'GET /tanks': { status: 200, data: [SUMMARY] } })
    const store = makeStore()

    await store.dispatch(fetchTanks())

    const state = store.getState().tanks
    expect(state.listStatus).toBe('succeeded')
    expect(state.items).toEqual([SUMMARY])
  })

  it('fetchTanks failure keeps a Vietnamese message', async () => {
    mockNetworkDown()
    const store = makeStore()

    await store.dispatch(fetchTanks())

    const state = store.getState().tanks
    expect(state.listStatus).toBe('failed')
    expect(state.listError).toBe('Không kết nối được máy chủ. Vui lòng thử lại.')
  })

  it('fetchTank stores the tank', async () => {
    mockApi({ 'GET /tanks/1': { status: 200, data: TANK } })
    const store = makeStore()

    await store.dispatch(fetchTank(1))

    expect(store.getState().tanks.current).toEqual(TANK)
    expect(store.getState().tanks.detailStatus).toBe('succeeded')
  })

  it('fetchTank marks a 404 as not found', async () => {
    mockApi({ 'GET /tanks/9': { status: 404, data: { code: 'NOT_FOUND', message: 'Tank not found' } } })
    const store = makeStore()

    await store.dispatch(fetchTank(9))

    const state = store.getState().tanks
    expect(state.detailStatus).toBe('failed')
    expect(state.detailNotFound).toBe(true)
    expect(state.current).toBeNull()
  })

  it('a network error is not reported as not found', async () => {
    mockNetworkDown()
    const store = makeStore()

    await store.dispatch(fetchTank(1))

    expect(store.getState().tanks.detailNotFound).toBe(false)
    expect(store.getState().tanks.detailError).not.toBeNull()
  })

  it('createTank stores the new tank as current', async () => {
    mockApi({ 'POST /tanks': { status: 201, data: TANK } })
    const store = makeStore()

    await store.dispatch(createTank(PAYLOAD))

    const state = store.getState().tanks
    expect(state.saveStatus).toBe('succeeded')
    expect(state.current?.id).toBe(1)
  })

  it('createTank keeps server field errors in Vietnamese', async () => {
    mockApi({
      'POST /tanks': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', fieldErrors: { name: 'must not be blank', 'fish[0].quantity': 'bad' } },
      },
    })
    const store = makeStore()

    await store.dispatch(createTank(PAYLOAD))

    const state = store.getState().tanks
    expect(state.saveStatus).toBe('failed')
    expect(state.saveFieldErrors.name).toBe('Tên bể cần từ 1 đến 100 ký tự.')
    expect(state.saveFieldErrors['fish[0].quantity']).toBe('Thông tin cá chưa hợp lệ.')
  })

  it('updateTank replaces the current tank', async () => {
    mockApi({ 'PUT /tanks/1': { status: 200, data: { ...TANK, name: 'Bể mới' } } })
    const store = makeStore()

    await store.dispatch(updateTank({ id: 1, payload: PAYLOAD }))

    expect(store.getState().tanks.current?.name).toBe('Bể mới')
    expect(store.getState().tanks.saveStatus).toBe('succeeded')
  })

  it('deleteTank removes the tank from the list and from current', async () => {
    mockApi({
      'GET /tanks': { status: 200, data: [SUMMARY, { ...SUMMARY, id: 2, name: 'Bể 2' }] },
      'GET /tanks/1': { status: 200, data: TANK },
      'DELETE /tanks/1': { status: 204 },
    })
    const store = makeStore()
    await store.dispatch(fetchTanks())
    await store.dispatch(fetchTank(1))

    await store.dispatch(deleteTank(1))

    const state = store.getState().tanks
    expect(state.deleteStatus).toBe('succeeded')
    expect(state.items.map((t) => t.id)).toEqual([2])
    expect(state.current).toBeNull()
  })

  it('a failed delete keeps the list and reports the error', async () => {
    mockApi({
      'GET /tanks': { status: 200, data: [SUMMARY] },
      'DELETE /tanks/1': { status: 500, data: { code: 'INTERNAL_ERROR' } },
    })
    const store = makeStore()
    await store.dispatch(fetchTanks())

    await store.dispatch(deleteTank(1))

    const state = store.getState().tanks
    expect(state.deleteStatus).toBe('failed')
    expect(state.deleteError).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
    expect(state.items).toHaveLength(1)
  })

  it('clearCurrent forgets the loaded tank and any save or delete result', async () => {
    mockApi({ 'GET /tanks/1': { status: 200, data: TANK } })
    const store = makeStore()
    await store.dispatch(fetchTank(1))

    store.dispatch(clearCurrent())

    const state = store.getState().tanks
    expect(state.current).toBeNull()
    expect(state.detailStatus).toBe('idle')
  })

  it('logging out wipes every tank so the next person never sees them', async () => {
    mockApi({
      'GET /tanks': { status: 200, data: [SUMMARY] },
      'GET /tanks/1': { status: 200, data: TANK },
    })
    const store = makeStore()
    await store.dispatch(fetchTanks())
    await store.dispatch(fetchTank(1))

    store.dispatch(loggedOut())

    const state = store.getState().tanks
    expect(state.items).toEqual([])
    expect(state.current).toBeNull()
    expect(state.listStatus).toBe('idle')
  })
})
