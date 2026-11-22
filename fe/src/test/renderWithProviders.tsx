import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, type InitialEntry } from 'react-router-dom'
import authReducer, { type AuthState } from '@/store/authSlice'
import tanksReducer, { type TanksState } from '@/store/tanksSlice'
import tasksReducer from '@/store/tasksSlice'
import type { User } from '@/types/api'

export const TEST_USER: User = { id: 1, email: 'alice@example.com', displayName: 'Alice' }

export const LOGGED_IN: AuthState = {
  token: 'test-token',
  user: TEST_USER,
  status: 'idle',
  error: null,
  fieldErrors: {},
  initialized: true,
}

export const LOGGED_OUT: AuthState = {
  token: null,
  user: null,
  status: 'idle',
  error: null,
  fieldErrors: {},
  initialized: true,
}

export const EMPTY_TANKS: TanksState = {
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

export function makeStore(auth: AuthState = LOGGED_OUT, tanks: TanksState = EMPTY_TANKS) {
  return configureStore({
    reducer: { auth: authReducer, tanks: tanksReducer, tasks: tasksReducer },
    preloadedState: { auth, tanks },
  })
}

interface Options {
  route?: InitialEntry
  auth?: AuthState
  tanks?: TanksState
}

/** Renders with a fresh store and a MemoryRouter. Returns the store so tests can inspect it. */
export function renderWithProviders(ui: ReactElement, { route = '/', auth = LOGGED_OUT, tanks = EMPTY_TANKS }: Options = {}) {
  const store = makeStore(auth, tanks)
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  )
  return { store, ...result }
}
