import { configureStore } from '@reduxjs/toolkit'
import { setTokenProvider, setUnauthorizedHandler } from '@/api/axiosClient'
import authReducer, { signOut } from './authSlice'
import tanksReducer from './tanksSlice'
import tasksReducer from './tasksSlice'

// Feature slices (auth, tanks, tasks, notifications) are registered here as they are added.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    tanks: tanksReducer,
    tasks: tasksReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Connect the HTTP client to the store without the client importing it.
setTokenProvider(() => store.getState().auth.token)
setUnauthorizedHandler(() => {
  store.dispatch(signOut())
})
