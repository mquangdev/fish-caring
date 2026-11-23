import { configureStore } from '@reduxjs/toolkit'
import { setTokenProvider, setUnauthorizedHandler } from '@/api/axiosClient'
import authReducer, { signOut } from './authSlice'
import tanksReducer from './tanksSlice'
import logsReducer from './logsSlice'
import notificationsReducer from './notificationsSlice'
import pushReducer from './pushSlice'
import tasksReducer from './tasksSlice'
import todayReducer from './todaySlice'

// Feature slices (auth, tanks, tasks, notifications) are registered here as they are added.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    tanks: tanksReducer,
    tasks: tasksReducer,
    today: todayReducer,
    logs: logsReducer,
    notifications: notificationsReducer,
    push: pushReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Connect the HTTP client to the store without the client importing it.
setTokenProvider(() => store.getState().auth.token)
setUnauthorizedHandler(() => {
  store.dispatch(signOut())
})
