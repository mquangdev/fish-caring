import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { fetchMe, login, register, updateMe } from './authService'

const USER = { id: 1, email: 'a@example.com', displayName: 'A' }

describe('authService', () => {
  it('register posts the payload to /auth/register and returns the body', async () => {
    const api = mockApi({ 'POST /auth/register': { status: 201, data: { token: 't', user: USER } } })

    const result = await register({ email: 'a@example.com', password: 'secret-pass', displayName: 'A' })

    expect(result).toEqual({ token: 't', user: USER })
    expect(api.calls[0].method).toBe('post')
    expect(JSON.parse(api.calls[0].data as string)).toEqual({
      email: 'a@example.com',
      password: 'secret-pass',
      displayName: 'A',
    })
  })

  it('login posts credentials to /auth/login', async () => {
    const api = mockApi({ 'POST /auth/login': { status: 200, data: { token: 't', user: USER } } })

    const result = await login({ email: 'a@example.com', password: 'secret-pass' })

    expect(result.token).toBe('t')
    expect(JSON.parse(api.calls[0].data as string)).toEqual({ email: 'a@example.com', password: 'secret-pass' })
  })

  it('fetchMe gets /me', async () => {
    const api = mockApi({ 'GET /me': { status: 200, data: USER } })

    expect(await fetchMe()).toEqual(USER)
    expect(api.calls[0].method).toBe('get')
  })

  it('updateMe patches /me with the display name', async () => {
    const api = mockApi({ 'PATCH /me': { status: 200, data: { ...USER, displayName: 'B' } } })

    const result = await updateMe({ displayName: 'B' })

    expect(result.displayName).toBe('B')
    expect(JSON.parse(api.calls[0].data as string)).toEqual({ displayName: 'B' })
  })
})
