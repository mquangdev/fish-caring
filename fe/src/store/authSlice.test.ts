import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import { getStoredToken, storeToken } from '@/lib/tokenStorage'
import { mockApi, mockNetworkDown } from '@/test/mockApi'
import authReducer, {
  login,
  register,
  restoreSession,
  signOut,
  updateDisplayName,
  type AuthState,
} from './authSlice'

const USER = { id: 1, email: 'a@example.com', displayName: 'A' }

function makeStore(preloaded?: Partial<AuthState>) {
  const base: AuthState = {
    token: null,
    user: null,
    status: 'idle',
    error: null,
    fieldErrors: {},
    initialized: true,
  }
  return configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...base, ...preloaded } } })
}

describe('authSlice', () => {
  it('login success stores the token and user', async () => {
    mockApi({ 'POST /auth/login': { status: 200, data: { token: 'tok', user: USER } } })
    const store = makeStore()

    await store.dispatch(login({ email: 'a@example.com', password: 'secret-pass' }))

    const state = store.getState().auth
    expect(state.status).toBe('succeeded')
    expect(state.token).toBe('tok')
    expect(state.user).toEqual(USER)
    expect(getStoredToken()).toBe('tok')
  })

  it('login failure shows a Vietnamese message and keeps the user signed out', async () => {
    mockApi({ 'POST /auth/login': { status: 401, data: { code: 'INVALID_CREDENTIALS' } } })
    const store = makeStore()

    await store.dispatch(login({ email: 'a@example.com', password: 'wrong' }))

    const state = store.getState().auth
    expect(state.status).toBe('failed')
    expect(state.error).toBe('Email hoặc mật khẩu không đúng.')
    expect(state.token).toBeNull()
    expect(getStoredToken()).toBeNull()
  })

  it('login reports an unreachable server', async () => {
    mockNetworkDown()
    const store = makeStore()

    await store.dispatch(login({ email: 'a@example.com', password: 'secret-pass' }))

    expect(store.getState().auth.error).toBe('Không kết nối được máy chủ. Vui lòng thử lại.')
  })

  it('register success signs the user in', async () => {
    mockApi({ 'POST /auth/register': { status: 201, data: { token: 'tok', user: USER } } })
    const store = makeStore()

    await store.dispatch(register({ email: 'a@example.com', password: 'secret-pass', displayName: 'A' }))

    expect(store.getState().auth.user).toEqual(USER)
    expect(getStoredToken()).toBe('tok')
  })

  it('register with a taken email says the email is registered', async () => {
    mockApi({ 'POST /auth/register': { status: 409, data: { code: 'CONFLICT', message: 'Email is already registered' } } })
    const store = makeStore()

    await store.dispatch(register({ email: 'a@example.com', password: 'secret-pass', displayName: 'A' }))

    expect(store.getState().auth.error).toBe('Email này đã được đăng ký.')
  })

  it('register keeps server field errors in Vietnamese', async () => {
    mockApi({
      'POST /auth/register': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', fieldErrors: { password: 'size must be between 8 and 72' } },
      },
    })
    const store = makeStore()

    await store.dispatch(register({ email: 'a@example.com', password: 'x', displayName: 'A' }))

    expect(store.getState().auth.fieldErrors.password).toBe('Mật khẩu cần từ 8 đến 72 ký tự.')
  })

  it('restoreSession loads the user for a stored token', async () => {
    mockApi({ 'GET /me': { status: 200, data: USER } })
    const store = makeStore({ token: 'tok', initialized: false })

    await store.dispatch(restoreSession())

    const state = store.getState().auth
    expect(state.user).toEqual(USER)
    expect(state.initialized).toBe(true)
  })

  it('restoreSession with a rejected token ends signed out', async () => {
    mockApi({ 'GET /me': { status: 401, data: { code: 'UNAUTHORIZED' } } })
    const store = makeStore({ token: 'stale', initialized: false })

    await store.dispatch(restoreSession())

    const state = store.getState().auth
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.initialized).toBe(true)
  })

  it('updateDisplayName replaces the user', async () => {
    mockApi({ 'PATCH /me': { status: 200, data: { ...USER, displayName: 'New' } } })
    const store = makeStore({ token: 'tok', user: USER })

    await store.dispatch(updateDisplayName('New'))

    expect(store.getState().auth.user?.displayName).toBe('New')
    expect(store.getState().auth.status).toBe('succeeded')
  })

  it('signOut clears the stored token and the state', () => {
    storeToken('tok')
    const store = makeStore({ token: 'tok', user: USER })

    store.dispatch(signOut())

    const state = store.getState().auth
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(getStoredToken()).toBeNull()
  })
})
