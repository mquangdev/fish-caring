import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { errorMessage } from '@/lib/messages'
import { clearStoredToken, getStoredToken, storeToken } from '@/lib/tokenStorage'
import * as authService from '@/services/authService'
import type { LoginPayload, RegisterPayload, User } from '@/types/api'
import { toFailure, type Failure, type RequestStatus } from './failure'

export type { RequestStatus }

export interface AuthState {
  token: string | null
  user: User | null
  /** Status of the last login / register / profile request. */
  status: RequestStatus
  error: string | null
  fieldErrors: Record<string, string>
  /** False while a stored token is still being checked with the server after a reload. */
  initialized: boolean
}

export type AuthFailure = Failure

const REGISTER_OVERRIDES = { CONFLICT: 'Email này đã được đăng ký.' }

const initialToken = getStoredToken()

const initialState: AuthState = {
  token: initialToken,
  user: null,
  status: 'idle',
  error: null,
  fieldErrors: {},
  // With no stored token there is nothing to restore.
  initialized: initialToken === null,
}

export const login = createAsyncThunk<
  { token: string; user: User },
  LoginPayload,
  { rejectValue: AuthFailure }
>('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const result = await authService.login(payload)
    storeToken(result.token)
    return result
  } catch (error) {
    return rejectWithValue(toFailure(error))
  }
})

export const register = createAsyncThunk<
  { token: string; user: User },
  RegisterPayload,
  { rejectValue: AuthFailure }
>('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const result = await authService.register(payload)
    storeToken(result.token)
    return result
  } catch (error) {
    return rejectWithValue(toFailure(error, REGISTER_OVERRIDES))
  }
})

/** After a reload: ask the server who the stored token belongs to. */
export const restoreSession = createAsyncThunk<User, void, { rejectValue: AuthFailure }>(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.fetchMe()
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

export const updateDisplayName = createAsyncThunk<User, string, { rejectValue: AuthFailure }>(
  'auth/updateDisplayName',
  async (displayName, { rejectWithValue }) => {
    try {
      return await authService.updateMe({ displayName })
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Pure state reset; use the `signOut` thunk so the stored token is cleared too. */
    loggedOut(state) {
      state.token = null
      state.user = null
      state.status = 'idle'
      state.error = null
      state.fieldErrors = {}
      state.initialized = true
    },
    clearAuthError(state) {
      state.status = 'idle'
      state.error = null
      state.fieldErrors = {}
    },
  },
  extraReducers: (builder) => {
    const pending = (state: AuthState) => {
      state.status = 'loading'
      state.error = null
      state.fieldErrors = {}
    }
    const authenticated = (state: AuthState, action: PayloadAction<{ token: string; user: User }>) => {
      state.status = 'succeeded'
      state.token = action.payload.token
      state.user = action.payload.user
      state.initialized = true
    }
    const failed = (state: AuthState, action: PayloadAction<AuthFailure | undefined>) => {
      state.status = 'failed'
      state.error = action.payload?.message ?? errorMessage(undefined)
      state.fieldErrors = action.payload?.fieldErrors ?? {}
    }

    builder
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, authenticated)
      .addCase(login.rejected, failed)
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, authenticated)
      .addCase(register.rejected, failed)

      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload
        state.initialized = true
      })
      .addCase(restoreSession.rejected, (state, action) => {
        // A 401 already signs out through the interceptor. Any other failure (server down) keeps
        // the token but we cannot show the app without a user, so treat it as signed out.
        state.token = null
        state.user = null
        state.initialized = true
        state.error = action.payload?.message ?? null
      })

      .addCase(updateDisplayName.pending, pending)
      .addCase(updateDisplayName.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
      })
      .addCase(updateDisplayName.rejected, failed)
  },
})

export const { loggedOut, clearAuthError } = authSlice.actions
export default authSlice.reducer

/** Sign out: forget the token (storage + state). */
export const signOut = () => (dispatch: (action: ReturnType<typeof loggedOut>) => void) => {
  clearStoredToken()
  dispatch(loggedOut())
}
