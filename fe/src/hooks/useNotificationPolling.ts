import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { fetchUnreadCount } from '@/store/notificationsSlice'

/** How often the unread count is refreshed while the tab is visible. */
export const POLL_INTERVAL_MS = 60_000

/**
 * Keeps the unread badge fresh: loads the count now, every minute while the tab is visible, and
 * again as soon as the tab becomes visible. Nothing is requested while the tab is hidden.
 */
export function useNotificationPolling(intervalMs: number = POLL_INTERVAL_MS) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === 'visible') {
        void dispatch(fetchUnreadCount())
      }
    }
    poll()
    const timer = setInterval(poll, intervalMs)
    document.addEventListener('visibilitychange', poll)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [dispatch, intervalMs])
}
