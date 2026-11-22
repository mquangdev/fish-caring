import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import type { TaskPayload } from '@/types/api'
import { createTask, deleteTask, getTask, listGeneralTasks, setTaskEnabled, updateTask } from './taskService'

const PAYLOAD: TaskPayload = {
  tankId: 7,
  type: 'FEED',
  title: 'Cho ăn',
  note: null,
  repeatType: 'DAILY',
  intervalDays: null,
  timeOfDay: '08:00',
  startDate: null,
  foodName: null,
  waterChangePercent: null,
  fertilizerMl: null,
}

describe('taskService', () => {
  it('createTask posts to /tasks with the tank in the body', async () => {
    const api = mockApi({ 'POST /tasks': { status: 201, data: { id: 1 } } })

    expect(await createTask(PAYLOAD)).toEqual({ id: 1 })
    expect(JSON.parse(api.calls[0].data as string)).toEqual(PAYLOAD)
  })

  it('createTask can create a task without a tank', async () => {
    const api = mockApi({ 'POST /tasks': { status: 201, data: { id: 2 } } })

    await createTask({ ...PAYLOAD, tankId: null })

    expect(JSON.parse(api.calls[0].data as string).tankId).toBeNull()
  })

  it('getTask gets /tasks/{id}', async () => {
    const api = mockApi({ 'GET /tasks/3': { status: 200, data: { id: 3 } } })

    expect(await getTask(3)).toEqual({ id: 3 })
    expect(api.calls[0].url).toBe('/tasks/3')
  })

  it('listGeneralTasks gets /tasks/general', async () => {
    const api = mockApi({ 'GET /tasks/general': { status: 200, data: [{ id: 5 }] } })

    expect(await listGeneralTasks()).toEqual([{ id: 5 }])
    expect(api.calls[0].url).toBe('/tasks/general')
  })

  it('updateTask puts to the task', async () => {
    const api = mockApi({ 'PUT /tasks/3': { status: 200, data: { id: 3 } } })

    expect(await updateTask(3, PAYLOAD)).toEqual({ id: 3 })
    expect(api.calls[0].url).toBe('/tasks/3')
  })

  it('setTaskEnabled patches the enabled flag', async () => {
    const api = mockApi({ 'PATCH /tasks/3/enabled': { status: 200, data: { id: 3, enabled: false } } })

    expect(await setTaskEnabled(3, false)).toEqual({ id: 3, enabled: false })
    expect(JSON.parse(api.calls[0].data as string)).toEqual({ enabled: false })
  })

  it('deleteTask deletes the task', async () => {
    const api = mockApi({ 'DELETE /tasks/3': { status: 204 } })

    await deleteTask(3)

    expect(api.calls[0].method).toBe('delete')
    expect(api.calls[0].url).toBe('/tasks/3')
  })
})
