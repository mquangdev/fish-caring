import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as tankService from '@/services/tankService'
import type { Tank, TankPayload, TankSummary } from '@/types/api'
import { loggedOut } from './authSlice'
import { toFailure, type Failure, type RequestStatus } from './failure'

export interface TanksState {
  /** The tank list (newest first). */
  items: TankSummary[]
  listStatus: RequestStatus
  listError: string | null

  /** The tank shown on the detail and edit screens. */
  current: Tank | null
  detailStatus: RequestStatus
  detailError: string | null
  /** True when the server said the tank does not exist (or belongs to someone else). */
  detailNotFound: boolean

  /** Status of the last create / update request. */
  saveStatus: RequestStatus
  saveError: string | null
  saveFieldErrors: Record<string, string>

  deleteStatus: RequestStatus
  deleteError: string | null
}

const initialState: TanksState = {
  items: [],
  listStatus: 'idle',
  listError: null,
  current: null,
  detailStatus: 'idle',
  detailError: null,
  detailNotFound: false,
  saveStatus: 'idle',
  saveError: null,
  saveFieldErrors: {},
  deleteStatus: 'idle',
  deleteError: null,
}

type ThunkConfig = { rejectValue: Failure }

export const fetchTanks = createAsyncThunk<TankSummary[], void, ThunkConfig>(
  'tanks/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await tankService.listTanks()
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const fetchTank = createAsyncThunk<Tank, number, ThunkConfig>(
  'tanks/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      return await tankService.getTank(id)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const createTank = createAsyncThunk<Tank, TankPayload, ThunkConfig>(
  'tanks/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await tankService.createTank(payload)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const updateTank = createAsyncThunk<Tank, { id: number; payload: TankPayload }, ThunkConfig>(
  'tanks/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await tankService.updateTank(id, payload)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const deleteTank = createAsyncThunk<number, number, ThunkConfig>(
  'tanks/delete',
  async (id, { rejectWithValue }) => {
    try {
      await tankService.deleteTank(id)
      return id
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

const tanksSlice = createSlice({
  name: 'tanks',
  initialState,
  reducers: {
    /** Forget the loaded tank and any save/delete result, e.g. when opening another screen. */
    clearCurrent(state) {
      state.current = null
      state.detailStatus = 'idle'
      state.detailError = null
      state.detailNotFound = false
      state.saveStatus = 'idle'
      state.saveError = null
      state.saveFieldErrors = {}
      state.deleteStatus = 'idle'
      state.deleteError = null
    },
    clearSaveError(state) {
      state.saveStatus = 'idle'
      state.saveError = null
      state.saveFieldErrors = {}
    },
  },
  extraReducers: (builder) => {
    builder
      // another person may log in on this device: never keep the previous user's tanks
      .addCase(loggedOut, () => initialState)

      .addCase(fetchTanks.pending, (state) => {
        state.listStatus = 'loading'
        state.listError = null
      })
      .addCase(fetchTanks.fulfilled, (state, action) => {
        state.listStatus = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchTanks.rejected, (state, action) => {
        state.listStatus = 'failed'
        state.listError = action.payload?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.'
      })

      .addCase(fetchTank.pending, (state) => {
        state.detailStatus = 'loading'
        state.detailError = null
        state.detailNotFound = false
      })
      .addCase(fetchTank.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(fetchTank.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.current = null
        state.detailNotFound = action.payload?.code === 'NOT_FOUND'
        state.detailError = action.payload?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.'
      })

      .addCase(createTank.pending, (state) => {
        state.saveStatus = 'loading'
        state.saveError = null
        state.saveFieldErrors = {}
      })
      .addCase(createTank.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(createTank.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.'
        state.saveFieldErrors = action.payload?.fieldErrors ?? {}
      })

      .addCase(updateTank.pending, (state) => {
        state.saveStatus = 'loading'
        state.saveError = null
        state.saveFieldErrors = {}
      })
      .addCase(updateTank.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(updateTank.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.'
        state.saveFieldErrors = action.payload?.fieldErrors ?? {}
      })

      .addCase(deleteTank.pending, (state) => {
        state.deleteStatus = 'loading'
        state.deleteError = null
      })
      .addCase(deleteTank.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded'
        state.items = state.items.filter((tank) => tank.id !== action.payload)
        if (state.current?.id === action.payload) {
          state.current = null
        }
      })
      .addCase(deleteTank.rejected, (state, action) => {
        state.deleteStatus = 'failed'
        state.deleteError = action.payload?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.'
      })
  },
})

export const { clearCurrent, clearSaveError } = tanksSlice.actions
export default tanksSlice.reducer
