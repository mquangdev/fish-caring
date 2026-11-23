import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { getPublicKey, subscribe, unsubscribe } from './pushService'

describe('pushService', () => {
  it('getPublicKey returns the key of /push/public-key', async () => {
    mockApi({ 'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } } })

    expect(await getPublicKey()).toBe('BKey')
  })

  it('subscribe posts the endpoint and the keys', async () => {
    const api = mockApi({ 'POST /push/subscribe': { status: 204 } })
    const payload = { endpoint: 'https://push.example.com/x', keys: { p256dh: 'p', auth: 'a' } }

    await subscribe(payload)

    expect(api.calls[0].method).toBe('post')
    expect(JSON.parse(api.calls[0].data as string)).toEqual(payload)
  })

  it('unsubscribe deletes with the endpoint in the body', async () => {
    const api = mockApi({ 'DELETE /push/subscribe': { status: 204 } })

    await unsubscribe('https://push.example.com/x')

    expect(api.calls[0].method).toBe('delete')
    expect(JSON.parse(api.calls[0].data as string)).toEqual({ endpoint: 'https://push.example.com/x' })
  })
})
