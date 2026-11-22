import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { GENERIC_ERROR } from '@/lib/messages'
import * as taskService from '@/services/taskService'
import type { CareTask, TaskPayload } from '@/types/api'
import { loggedOut } from './authSlice'
import { toFailure, type Failure, type RequestStatus } from './failure'

export interface TasksState {
  /** The user's tasks that belong to no tank ("Việc chung"). */
  general: CareTask[]
  generalStatus: RequestStatus
  generalError: string | null

  /** The task shown on the edit screen. */
  current: CareTask | null
  currentStatus: RequestStatus
  currentError: string | null
  /** True when the server said the task does not exist (or belongs to someone else). */
  currentNotFound: boolean

  /** Status of the last create / update request. */
  saveStatus: RequestStatus
  saveError: string | null
  saveFieldErrors: Record<string, string>

  deleteStatus: RequestStatus
  deleteError: string | null

  /** Id of the task whose switch is being changed, so only that switch is locked. */
  togglingId: number | null
}

const initialState: TasksState = {
  general: [],
  generalStatus: 'idle',
  generalError: null,
  current: null,
  currentStatus: 'idle',
  currentError: null,
  currentNotFound: false,
  saveStatus: 'idle',
  saveError: null,
  saveFieldErrors: {},
  deleteStatus: 'idle',
  deleteError: null,
  togglingId: null,
}

type ThunkConfig = { rejectValue: Failure }

export const fetchGeneralTasks = createAsyncThunk<CareTask[], void, ThunkConfig>(
  'tasks/fetchGeneral',
  async (_, { rejectWithValue }) => {
    try {
      return await taskService.listGeneralTasks()
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const fetchTask = createAsyncThunk<CareTask, number, ThunkConfig>(
  'tasks/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      return await taskService.getTask(id)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const createTask = createAsyncThunk<CareTask, TaskPayload, ThunkConfig>(
  'tasks/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await taskService.createTask(payload)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const updateTask = createAsyncThunk<CareTask, { id: number; payload: TaskPayload }, ThunkConfig>(
  'tasks/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await taskService.updateTask(id, payload)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const setTaskEnabled = createAsyncThunk<CareTask, { id: number; enabled: boolean }, ThunkConfig>(
  'tasks/setEnabled',
  async ({ id, enabled }, { rejectWithValue }) => {
    try {
      return await taskService.setTaskEnabled(id, enabled)
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const deleteTask = createAsyncThunk<number, number, ThunkConfig>(
  'tasks/delete',
  async (id, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(id)
      return id
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearTaskState() {
      return initialState
    },
    /** Forget the result of the last delete, e.g. before opening the confirmation again. */
    clearDeleteState(state) {
      state.deleteStatus = 'idle'
      state.deleteError = null
    },
    /** Forget the loaded task and any save result, e.g. when opening the form. */
    clearCurrentTask(state) {
      state.current = null
      state.currentStatus = 'idle'
      state.currentError = null
      state.currentNotFound = false
      state.saveStatus = 'idle'
      state.saveError = null
      state.saveFieldErrors = {}
    },
  },
  extraReducers: (builder) => {
    const saving = (state: TasksState) => {
      state.saveStatus = 'loading'
      state.saveError = null
      state.saveFieldErrors = {}
    }
    const saved = (state: TasksState) => {
      state.saveStatus = 'succeeded'
    }
    const saveFailed = (state: TasksState, failure: Failure | undefined) => {
      state.saveStatus = 'failed'
      state.saveError = failure?.message ?? GENERIC_ERROR
      state.saveFieldErrors = failure?.fieldErrors ?? {}
    }

    builder
      .addCase(loggedOut, () => initialState)

      .addCase(fetchGeneralTasks.pending, (state) => {
        state.generalStatus = 'loading'
        state.generalError = null
      })
      .addCase(fetchGeneralTasks.fulfilled, (state, action) => {
        state.generalStatus = 'succeeded'
        state.general = action.payload
      })
      .addCase(fetchGeneralTasks.rejected, (state, action) => {
        state.generalStatus = 'failed'
        state.generalError = action.payload?.message ?? GENERIC_ERROR
      })

      .addCase(fetchTask.pending, (state) => {
        state.currentStatus = 'loading'
        state.currentError = null
        state.currentNotFound = false
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.currentStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(fetchTask.rejected, (state, action) => {
        state.currentStatus = 'failed'
        state.current = null
        state.currentNotFound = action.payload?.code === 'NOT_FOUND'
        state.currentError = action.payload?.message ?? GENERIC_ERROR
      })

      .addCase(createTask.pending, saving)
      .addCase(createTask.fulfilled, saved)
      .addCase(createTask.rejected, (state, action) => saveFailed(state, action.payload))

      .addCase(updateTask.pending, saving)
      .addCase(updateTask.fulfilled, saved)
      .addCase(updateTask.rejected, (state, action) => saveFailed(state, action.payload))

      .addCase(setTaskEnabled.pending, (state, action) => {
        state.togglingId = action.meta.arg.id
      })
      .addCase(setTaskEnabled.fulfilled, (state) => {
        state.togglingId = null
      })
      .addCase(setTaskEnabled.rejected, (state) => {
        state.togglingId = null
      })

      .addCase(deleteTask.pending, (state) => {
        state.deleteStatus = 'loading'
        state.deleteError = null
      })
      .addCase(deleteTask.fulfilled, (state) => {
        state.deleteStatus = 'succeeded'
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.deleteStatus = 'failed'
        state.deleteError = action.payload?.message ?? GENERIC_ERROR
      })
  },
})

export const { clearTaskState, clearCurrentTask, clearDeleteState } = tasksSlice.actions
export default tasksSlice.reducer
