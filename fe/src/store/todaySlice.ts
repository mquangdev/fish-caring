import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { GENERIC_ERROR } from '@/lib/messages'
import * as taskService from '@/services/taskService'
import * as todayService from '@/services/todayService'
import type { CareTask, Today, TodayItem } from '@/types/api'
import { loggedOut } from './authSlice'
import { toFailure, type Failure, type RequestStatus } from './failure'

export interface TodayState {
  due: TodayItem[]
  upcoming: TodayItem[]
  status: RequestStatus
  error: string | null
  /** Id of the task whose Hoàn thành / Hoãn button was just pressed, so only that card is locked. */
  actingId: number | null
}

const initialState: TodayState = {
  due: [],
  upcoming: [],
  status: 'idle',
  error: null,
  actingId: null,
}

type ThunkConfig = { rejectValue: Failure }

/** A turned-off task cannot be completed or snoozed (the list was out of date). */
const ACTION_OVERRIDES = { CONFLICT: 'Lịch này đang tắt nên không thể thực hiện.' }

export const fetchToday = createAsyncThunk<Today, void, ThunkConfig>('today/fetch', async (_, { rejectWithValue }) => {
  try {
    return await todayService.getToday()
  } catch (error) {
    return rejectWithValue(toFailure(error))
  }
})

export const completeTask = createAsyncThunk<CareTask, number, ThunkConfig>(
  'today/complete',
  async (id, { rejectWithValue }) => {
    try {
      return await taskService.completeTask(id)
    } catch (error) {
      return rejectWithValue(toFailure(error, ACTION_OVERRIDES))
    }
  },
)

export const snoozeTask = createAsyncThunk<CareTask, number, ThunkConfig>(
  'today/snooze',
  async (id, { rejectWithValue }) => {
    try {
      return await taskService.snoozeTask(id)
    } catch (error) {
      return rejectWithValue(toFailure(error, ACTION_OVERRIDES))
    }
  },
)

const todaySlice = createSlice({
  name: 'today',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const acting = (state: TodayState, action: { meta: { arg: number } }) => {
      state.actingId = action.meta.arg
    }
    const done = (state: TodayState) => {
      state.actingId = null
    }

    builder
      // another person may log in on this device: never keep the previous user's list
      .addCase(loggedOut, () => initialState)

      .addCase(fetchToday.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchToday.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.due = action.payload.due
        state.upcoming = action.payload.upcoming
      })
      .addCase(fetchToday.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? GENERIC_ERROR
      })

      .addCase(completeTask.pending, acting)
      .addCase(completeTask.fulfilled, done)
      .addCase(completeTask.rejected, done)
      .addCase(snoozeTask.pending, acting)
      .addCase(snoozeTask.fulfilled, done)
      .addCase(snoozeTask.rejected, done)
  },
})

export default todaySlice.reducer
