import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { getGeneralLogs, getTankLogs } from './logService'
import { completeTask, snoozeTask } from './taskService'
import { getToday } from './todayService'

describe('todayService', () => {
  it('getToday gets /today', async () => {
    const api = mockApi({ 'GET /today': { status: 200, data: { due: [], upcoming: [] } } })

    expect(await getToday()).toEqual({ due: [], upcoming: [] })
    expect(api.calls[0].url).toBe('/today')
  })
})

describe('logService', () => {
  it('getTankLogs gets the logs of the tank', async () => {
    const api = mockApi({ 'GET /tanks/7/logs': { status: 200, data: [{ id: 1 }] } })

    expect(await getTankLogs(7)).toEqual([{ id: 1 }])
    expect(api.calls[0].url).toBe('/tanks/7/logs')
  })

  it('getGeneralLogs gets the logs of the tasks without a tank', async () => {
    const api = mockApi({ 'GET /tasks/general/logs': { status: 200, data: [{ id: 2 }] } })

    expect(await getGeneralLogs()).toEqual([{ id: 2 }])
    expect(api.calls[0].url).toBe('/tasks/general/logs')
  })
})

describe('taskService complete and snooze', () => {
  it('completeTask posts to /tasks/{id}/complete', async () => {
    const api = mockApi({ 'POST /tasks/3/complete': { status: 200, data: { id: 3 } } })

    expect(await completeTask(3)).toEqual({ id: 3 })
    expect(api.calls[0].method).toBe('post')
  })

  it('snoozeTask posts to /tasks/{id}/snooze', async () => {
    const api = mockApi({ 'POST /tasks/3/snooze': { status: 200, data: { id: 3 } } })

    expect(await snoozeTask(3)).toEqual({ id: 3 })
    expect(api.calls[0].url).toBe('/tasks/3/snooze')
  })
})
