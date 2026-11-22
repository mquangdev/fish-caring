import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { GENERIC_ERROR } from '@/lib/messages'
import * as logService from '@/services/logService'
import type { CareLog } from '@/types/api'
import { loggedOut } from './authSlice'
import { toFailure, type Failure, type RequestStatus } from './failure'

export interface LogsState {
  /** History of the tank on screen (`tankLogsFor` tells which tank), newest first. */
  tankLogs: CareLog[]
  tankLogsFor: number | null
  tankStatus: RequestStatus
  tankError: string | null

  /** History of the tasks that belong to no tank, newest first. */
  generalLogs: CareLog[]
  generalStatus: RequestStatus
  generalError: string | null
}

const initialState: LogsState = {
  tankLogs: [],
  tankLogsFor: null,
  tankStatus: 'idle',
  tankError: null,
  generalLogs: [],
  generalStatus: 'idle',
  generalError: null,
}

type ThunkConfig = { rejectValue: Failure }

export const fetchTankLogs = createAsyncThunk<CareLog[], number, ThunkConfig>(
  'logs/fetchTank',
  async (tankId, { rejectWithValue }) => {
    try {
      return await logService.getTankLogs(tankId)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const fetchGeneralLogs = createAsyncThunk<CareLog[], void, ThunkConfig>(
  'logs/fetchGeneral',
  async (_, { rejectWithValue }) => {
    try {
      return await logService.getGeneralLogs()
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loggedOut, () => initialState)

      .addCase(fetchTankLogs.pending, (state, action) => {
        // another tank's history must not show while this one loads
        if (state.tankLogsFor !== action.meta.arg) state.tankLogs = []
        state.tankLogsFor = action.meta.arg
        state.tankStatus = 'loading'
        state.tankError = null
      })
      .addCase(fetchTankLogs.fulfilled, (state, action) => {
        if (state.tankLogsFor !== action.meta.arg) return
        state.tankStatus = 'succeeded'
        state.tankLogs = action.payload
      })
      .addCase(fetchTankLogs.rejected, (state, action) => {
        if (state.tankLogsFor !== action.meta.arg) return
        state.tankStatus = 'failed'
        state.tankError = action.payload?.message ?? GENERIC_ERROR
      })

      .addCase(fetchGeneralLogs.pending, (state) => {
        state.generalStatus = 'loading'
        state.generalError = null
      })
      .addCase(fetchGeneralLogs.fulfilled, (state, action) => {
        state.generalStatus = 'succeeded'
        state.generalLogs = action.payload
      })
      .addCase(fetchGeneralLogs.rejected, (state, action) => {
        state.generalStatus = 'failed'
        state.generalError = action.payload?.message ?? GENERIC_ERROR
      })
  },
})

export default logsSlice.reducer
