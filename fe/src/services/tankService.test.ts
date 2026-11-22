import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import type { TankPayload } from '@/types/api'
import { createTank, deleteTank, getTank, listTanks, updateTank } from './tankService'

const PAYLOAD: TankPayload = {
  name: 'Bể 1',
  volumeLiters: 60,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  setupDate: null,
  note: null,
  fish: [{ speciesName: 'Neon', quantity: 10, status: 'ALIVE' }],
}

describe('tankService', () => {
  it('listTanks gets /tanks', async () => {
    const api = mockApi({ 'GET /tanks': { status: 200, data: [{ id: 1 }] } })

    expect(await listTanks()).toEqual([{ id: 1 }])
    expect(api.calls[0].method).toBe('get')
  })

  it('getTank gets /tanks/{id}', async () => {
    const api = mockApi({ 'GET /tanks/7': { status: 200, data: { id: 7 } } })

    expect(await getTank(7)).toEqual({ id: 7 })
    expect(api.calls[0].url).toBe('/tanks/7')
  })

  it('createTank posts the payload', async () => {
    const api = mockApi({ 'POST /tanks': { status: 201, data: { id: 3 } } })

    expect(await createTank(PAYLOAD)).toEqual({ id: 3 })
    expect(JSON.parse(api.calls[0].data as string)).toEqual(PAYLOAD)
  })

  it('updateTank puts the payload to /tanks/{id}', async () => {
    const api = mockApi({ 'PUT /tanks/3': { status: 200, data: { id: 3 } } })

    await updateTank(3, PAYLOAD)

    expect(api.calls[0].method).toBe('put')
    expect(JSON.parse(api.calls[0].data as string)).toEqual(PAYLOAD)
  })

  it('deleteTank deletes /tanks/{id}', async () => {
    const api = mockApi({ 'DELETE /tanks/3': { status: 204 } })

    await deleteTank(3)

    expect(api.calls[0].method).toBe('delete')
  })
})
