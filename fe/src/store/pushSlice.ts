import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as browserPush from '@/lib/browserPush'
import type { PushPermission, PushSupport } from '@/lib/browserPush'
import { GENERIC_ERROR, PUSH_MESSAGES } from '@/lib/messages'
import { isBannerDismissed, rememberBannerDismissed } from '@/lib/pushBanner'
import * as pushService from '@/services/pushService'
import { loggedOut } from './authSlice'
import { toFailure, type Failure, type RequestStatus } from './failure'

export interface PushState {
  support: PushSupport
  permission: PushPermission
  /** This browser has a push subscription (the server is kept in step by `refreshPushState`). */
  subscribed: boolean
  /** The server has VAPID keys; null until it was asked. */
  serverReady: boolean | null
  /** Status of enabling or disabling. */
  status: RequestStatus
  error: string | null
  bannerDismissed: boolean
}

const initialState: PushState = {
  support: 'unsupported',
  permission: 'default',
  subscribed: false,
  serverReady: null,
  status: 'idle',
  error: null,
  bannerDismissed: isBannerDismissed(),
}

type ThunkConfig = { rejectValue: Failure }

interface PushSnapshot {
  support: PushSupport
  permission: PushPermission
  subscribed: boolean
  serverReady: boolean | null
}

function failure(message: string, code: string): Failure {
  return { message, fieldErrors: {}, code }
}

/**
 * Looks at the browser and the server: is push supported, allowed, already on for this device, and does
 * the server have keys. A device that is subscribed is registered with the server again (it is an
 * idempotent call), so the server follows the browser after a logout or a login of another user.
 */
export const refreshPushState = createAsyncThunk<PushSnapshot, void, ThunkConfig>(
  'push/refresh',
  async (_, { rejectWithValue }) => {
    const support = browserPush.pushSupport()
    const permission = browserPush.permission()
    if (support !== 'supported') {
      return { support, permission, subscribed: false, serverReady: null }
    }
    try {
      await pushService.getPublicKey()
    } catch (error) {
      const result = toFailure(error)
      if (result.code === 'NOT_FOUND') {
        return { support, permission, subscribed: false, serverReady: false }
      }
      return rejectWithValue(result)
    }
    if (permission !== 'granted') {
      return { support, permission, subscribed: false, serverReady: true }
    }
    try {
      const subscription = await browserPush.getSubscription()
      if (subscription) {
        await pushService.subscribe(browserPush.toPayload(subscription))
      }
      return { support, permission, subscribed: subscription !== null, serverReady: true }
    } catch (error) {
      return rejectWithValue(toFailure(error))
    }
  },
)

/** Asks for permission, subscribes this browser and tells the server about it. */
export const enablePush = createAsyncThunk<PushSnapshot, void, ThunkConfig>(
  'push/enable',
  async (_, { rejectWithValue }) => {
    const permission = await browserPush.requestPermission()
    if (permission !== 'granted') {
      return rejectWithValue(failure(PUSH_MESSAGES.denied, 'PERMISSION_DENIED'))
    }
    let subscription: PushSubscription | null = null
    try {
      const publicKey = await pushService.getPublicKey()
      subscription = await browserPush.subscribe(publicKey)
      await pushService.subscribe(browserPush.toPayload(subscription))
      return { support: 'supported', permission, subscribed: true, serverReady: true }
    } catch (error) {
      if (subscription) {
        // keep the browser and the server in step: no half-enabled device
        await browserPush.unsubscribe().catch(() => false)
      }
      const result = toFailure(error)
      return rejectWithValue(result.code === 'NOT_FOUND' ? failure(PUSH_MESSAGES.serverOff, result.code) : result)
    }
  },
)

/** Tells the server to forget this device, then cancels the browser subscription. */
export const disablePush = createAsyncThunk<void, void, ThunkConfig>('push/disable', async (_, { rejectWithValue }) => {
  try {
    const subscription = await browserPush.getSubscription()
    if (subscription) {
      await pushService.unsubscribe(subscription.endpoint)
      await subscription.unsubscribe()
    }
  } catch (error) {
    return rejectWithValue(toFailure(error))
  }
})

/**
 * For logging out: the server stops sending this user's notifications to this device. The browser
 * subscription stays; the next login registers it again. A failure never blocks the logout.
 */
export const releaseDevice = createAsyncThunk<void, void>('push/release', async () => {
  try {
    if (browserPush.pushSupport() !== 'supported') return
    const subscription = await browserPush.getSubscription()
    if (subscription) {
      await pushService.unsubscribe(subscription.endpoint)
    }
  } catch {
    // best effort
  }
})

const pushSlice = createSlice({
  name: 'push',
  initialState,
  reducers: {
    dismissBanner(state) {
      state.bannerDismissed = true
      rememberBannerDismissed()
    },
  },
  extraReducers: (builder) => {
    const apply = (state: PushState, snapshot: PushSnapshot) => {
      state.support = snapshot.support
      state.permission = snapshot.permission
      state.subscribed = snapshot.subscribed
      state.serverReady = snapshot.serverReady
    }

    builder
      // the device state stays (it belongs to the browser); only what was shown about the account is dropped
      .addCase(loggedOut, (state) => {
        state.status = 'idle'
        state.error = null
        state.subscribed = false
        state.serverReady = null
      })

      .addCase(refreshPushState.fulfilled, (state, action) => {
        apply(state, action.payload)
      })
      .addCase(refreshPushState.rejected, (state, action) => {
        // keep what is known; a failed check must not turn a working setup into an error screen
        state.error = action.payload?.message ?? GENERIC_ERROR
      })

      .addCase(enablePush.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(enablePush.fulfilled, (state, action) => {
        state.status = 'succeeded'
        apply(state, action.payload)
      })
      .addCase(enablePush.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? PUSH_MESSAGES.failed
        // the user may have blocked the permission just now
        state.permission = browserPush.permission()
      })

      .addCase(disablePush.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(disablePush.fulfilled, (state) => {
        state.status = 'succeeded'
        state.subscribed = false
      })
      .addCase(disablePush.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? PUSH_MESSAGES.failed
      })
  },
})

export const { dismissBanner } = pushSlice.actions
export default pushSlice.reducer
