import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import type { AppNotification } from '@/types/api'
import authReducer, { loggedOut } from './authSlice'
import notificationsReducer, {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsSlice'

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, notifications: notificationsReducer } })
}

function item(id: number, status: AppNotification['status']): AppNotification {
  return {
    id,
    taskId: 3,
    message: `Thông báo ${id}`,
    status,
    dueAt: '2026-11-22T08:00:00',
    createdAt: '2026-11-22T07:30:00',
  }
}

const LIST = [item(3, 'UNREAD'), item(2, 'READ'), item(1, 'RESOLVED')]

async function loaded() {
  mockApi({
    'GET /notifications': { status: 200, data: LIST },
    'GET /notifications/unread-count': { status: 200, data: { count: 1 } },
  })
  const store = makeStore()
  await store.dispatch(fetchNotifications())
  await store.dispatch(fetchUnreadCount())
  return store
}

describe('notificationsSlice', () => {
  it('loads the list and the unread count', async () => {
    const store = await loaded()

    const state = store.getState().notifications
    expect(state.status).toBe('succeeded')
    expect(state.items).toHaveLength(3)
    expect(state.unreadCount).toBe(1)
  })

  it('keeps a Vietnamese error when the list fails', async () => {
    mockApi({ 'GET /notifications': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()

    await store.dispatch(fetchNotifications())

    expect(store.getState().notifications.status).toBe('failed')
    expect(store.getState().notifications.error).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  })

  it('keeps the last known count when a poll fails', async () => {
    const store = await loaded()
    mockApi({ 'GET /notifications/unread-count': { status: 500, data: { code: 'INTERNAL_ERROR' } } })

    await store.dispatch(fetchUnreadCount())

    expect(store.getState().notifications.unreadCount).toBe(1)
  })

  it('marks one unread notification read and lowers the count, never below zero', async () => {
    const store = await loaded()
    mockApi({ 'POST /notifications/3/read': { status: 204 }, 'POST /notifications/2/read': { status: 204 } })

    await store.dispatch(markNotificationRead(3))
    expect(store.getState().notifications.items[0].status).toBe('READ')
    expect(store.getState().notifications.unreadCount).toBe(0)

    // an already read one changes nothing
    await store.dispatch(markNotificationRead(2))
    expect(store.getState().notifications.unreadCount).toBe(0)
  })

  it('does not touch a resolved notification when marking read', async () => {
    const store = await loaded()
    mockApi({ 'POST /notifications/1/read': { status: 204 } })

    await store.dispatch(markNotificationRead(1))

    expect(store.getState().notifications.items[2].status).toBe('RESOLVED')
    expect(store.getState().notifications.unreadCount).toBe(1)
  })

  it('marks everything read but keeps the resolved ones', async () => {
    const store = await loaded()
    mockApi({ 'POST /notifications/read-all': { status: 204 } })

    await store.dispatch(markAllNotificationsRead())

    const state = store.getState().notifications
    expect(state.unreadCount).toBe(0)
    expect(state.items.map((i) => i.status)).toEqual(['READ', 'READ', 'RESOLVED'])
    expect(state.markingAll).toBe(false)
  })

  it('unlocks the button when marking all fails', async () => {
    const store = await loaded()
    mockApi({ 'POST /notifications/read-all': { status: 500, data: { code: 'INTERNAL_ERROR' } } })

    await store.dispatch(markAllNotificationsRead())

    expect(store.getState().notifications.markingAll).toBe(false)
    expect(store.getState().notifications.unreadCount).toBe(1)
  })

  it('forgets everything when the user logs out', async () => {
    const store = await loaded()

    store.dispatch(loggedOut())

    expect(store.getState().notifications.items).toEqual([])
    expect(store.getState().notifications.unreadCount).toBe(0)
    expect(store.getState().notifications.status).toBe('idle')
  })
})
