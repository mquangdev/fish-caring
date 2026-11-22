import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationService'

describe('notificationService', () => {
  it('listNotifications gets /notifications', async () => {
    const api = mockApi({ 'GET /notifications': { status: 200, data: [{ id: 1 }] } })

    expect(await listNotifications()).toEqual([{ id: 1 }])
    expect(api.calls[0].url).toBe('/notifications')
  })

  it('getUnreadCount returns the number from /notifications/unread-count', async () => {
    mockApi({ 'GET /notifications/unread-count': { status: 200, data: { count: 3 } } })

    expect(await getUnreadCount()).toBe(3)
  })

  it('markNotificationRead posts to /notifications/{id}/read', async () => {
    const api = mockApi({ 'POST /notifications/5/read': { status: 204 } })

    await markNotificationRead(5)

    expect(api.calls[0].method).toBe('post')
    expect(api.calls[0].url).toBe('/notifications/5/read')
  })

  it('markAllNotificationsRead posts to /notifications/read-all', async () => {
    const api = mockApi({ 'POST /notifications/read-all': { status: 204 } })

    await markAllNotificationsRead()

    expect(api.calls[0].url).toBe('/notifications/read-all')
  })
})
