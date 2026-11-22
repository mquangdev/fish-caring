import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { GENERIC_ERROR } from '@/lib/messages'
import * as notificationService from '@/services/notificationService'
import type { AppNotification } from '@/types/api'
import { loggedOut } from './authSlice'
import { toFailure, type Failure, type RequestStatus } from './failure'

export interface NotificationsState {
  /** The list on the notifications page, newest first. */
  items: AppNotification[]
  status: RequestStatus
  error: string | null
  /** Unread notifications, shown as the badge on the bell (kept up to date by polling). */
  unreadCount: number
  /** True while "Đánh dấu đã đọc tất cả" is being sent. */
  markingAll: boolean
}

const initialState: NotificationsState = {
  items: [],
  status: 'idle',
  error: null,
  unreadCount: 0,
  markingAll: false,
}

type ThunkConfig = { rejectValue: Failure }

export const fetchNotifications = createAsyncThunk<AppNotification[], void, ThunkConfig>(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await notificationService.listNotifications()
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const fetchUnreadCount = createAsyncThunk<number, void, ThunkConfig>(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      return await notificationService.getUnreadCount()
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const markNotificationRead = createAsyncThunk<number, number, ThunkConfig>(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await notificationService.markNotificationRead(id)
      return id
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const markAllNotificationsRead = createAsyncThunk<void, void, ThunkConfig>(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllNotificationsRead()
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // another person may log in on this device: never keep the previous user's notifications
      .addCase(loggedOut, () => initialState)

      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? GENERIC_ERROR
      })

      // a failed poll keeps the last known count instead of hiding the badge
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })

      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find((notification) => notification.id === action.payload)
        if (item && item.status === 'UNREAD') {
          item.status = 'READ'
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })

      .addCase(markAllNotificationsRead.pending, (state) => {
        state.markingAll = true
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.markingAll = false
        state.unreadCount = 0
        for (const item of state.items) {
          if (item.status === 'UNREAD') item.status = 'READ'
        }
      })
      .addCase(markAllNotificationsRead.rejected, (state) => {
        state.markingAll = false
      })
  },
})

export default notificationsSlice.reducer
