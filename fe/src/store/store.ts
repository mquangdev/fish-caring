import { configureStore } from '@reduxjs/toolkit'

// Feature slices (auth, tanks, tasks, notifications) are registered here as they are added.
export const store = configureStore({
  reducer: {},
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
