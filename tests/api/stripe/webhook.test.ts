import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RequestEvent } from '@sveltejs/kit'
import { POST, verifyWebhook } from '../../../src/routes/api/stripe/webhook/+server'

describe('verifyWebhook', () => {
  const SECRET = 'whsec_test'
  beforeEach(() => {
    vi.restoreAllMocks()
    // stub crypto.subtle
    const subtle = {
      importKey: vi.fn().mockResolvedValue({}),
      sign: vi.fn()
    }
    vi.stubGlobal('crypto', { subtle } as any)
  })

  it('returns true for matching signature', async () => {
    const payload = JSON.stringify({ foo: 'bar' })
    const timestamp = Date.now().toString()
    // our fake signature bytes
    const sigBytes = new Uint8Array([1, 2, 3])
    // expected hex
    const hex = Array.from(sigBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    // stub sign to return sigBytes
    (crypto.subtle.sign as any).mockResolvedValue(sigBytes.buffer)
    const header = `t=${timestamp},v1=${hex}`

    const ok = await verifyWebhook(payload, header, SECRET)
    expect(ok).toBe(true)
    // importKey and sign called with correct args
    expect(crypto.subtle.importKey).toHaveBeenCalled()
    expect(crypto.subtle.sign).toHaveBeenCalled()
  })

  it('returns false if timestamp missing', async () => {
    const ok = await verifyWebhook('p', 'v1=00ff', SECRET)
    expect(ok).toBe(false)
  })

  it('returns false if v1 missing', async () => {
    const ok = await verifyWebhook('p', 't=123', SECRET)
    expect(ok).toBe(false)
  })

  it('returns false if signature mismatch', async () => {
    const payload = '{}'
    const timestamp = '123'
    const badSig = 'deadbeef'
    (crypto.subtle.sign as any).mockResolvedValue(new Uint8Array([0, 0, 0]).buffer)
    const header = `t=${timestamp},v1=${badSig}`
    const ok = await verifyWebhook(payload, header, SECRET)
    expect(ok).toBe(false)
  })
})

describe('POST /api/stripe/webhook', () => {
  let supabaseMock: any

  beforeEach(() => {
    vi.restoreAllMocks()
    // stub verifyWebhook to call real
    vi.spyOn(globalThis, 'fetch') // ensure no fetch in handler
    supabaseMock = {
      from: vi.fn()
    }
    // stub crypto so verifyWebhook runs as in tests above
    const subtle = {
      importKey: vi.fn().mockResolvedValue({}),
      sign: vi.fn().mockResolvedValue(new Uint8Array([1,2,3]).buffer)
    }
    vi.stubGlobal('crypto', { subtle } as any)
  })

  function makeEvent(body: any, sigHeader: string): RequestEvent {
    return {
      request: {
        json: async () => body,
        headers: new Headers({ 'stripe-signature': sigHeader })
      },
      locals: { supabase: supabaseMock }
    } as unknown as RequestEvent
  }

  it('returns 400 on invalid signature', async () => {
    const body = { type: 'customer.subscription.created', data: { object: {} } }
    const res = await POST(makeEvent(body, 'invalid'))
    expect(res.status).toBe(400)
  })

  it('handles subscription.created event', async () => {
    const customerId = 'cus_1'
    const evt = {
      type: 'customer.subscription.created',
      data: { object: { customer: customerId, status: 'active' } }
    }
    const header = `t=1,v1=010203`
    // stub select => find profile ID
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({ maybeSingle: () => Promise.resolve({ data: { id: 'pr1' }, error: null }) })
      })
    }
    const builderUpdate = {
      update: (_: any) => ({
        eq: (_: any, __: any) => Promise.resolve({ data: null, error: null })
      })
    }
    supabaseMock.from
      .mockImplementationOnce(() => builderSelect)
      .mockImplementationOnce(() => builderUpdate)

    const res = await POST(makeEvent(evt, header))
    expect(res.status).toBe(200)
    const b = await res.json()
    expect(b).toEqual({ received: true })
    // ensure update called
    expect(supabaseMock.from).toHaveBeenCalledTimes(2)
  })

  it('handles subscription.updated event with canceled status', async () => {
    const customerId = 'cus_2'
    const evt = {
      type: 'customer.subscription.updated',
      data: { object: { customer: customerId, status: 'canceled' } }
    }
    const header = `t=1,v1=010203`
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({ maybeSingle: () => Promise.resolve({ data: { id: 'pr2' }, error: null }) })
      })
    }
    const builderUpdate = {
      update: (_: any) => ({
        eq: (_: any, __: any) => Promise.resolve({ data: null, error: null })
      })
    }
    supabaseMock.from
      .mockImplementationOnce(() => builderSelect)
      .mockImplementationOnce(() => builderUpdate)

    const res = await POST(makeEvent(evt, header))
    expect(res.status).toBe(200)
  })

  it('handles subscription.deleted event', async () => {
    const customerId = 'cus_3'
    const evt = {
      type: 'customer.subscription.deleted',
      data: { object: { customer: customerId } }
    }
    const header = `t=1,v1=010203`
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({ maybeSingle: () => Promise.resolve({ data: { id: 'pr3' }, error: null }) })
      })
    }
    const builderUpdate = {
      update: (_: any) => ({
        eq: (_: any, __: any) => Promise.resolve({ data: null, error: null })
      })
    }
    supabaseMock.from
      .mockImplementationOnce(() => builderSelect)
      .mockImplementationOnce(() => builderUpdate)

    const res = await POST(makeEvent(evt, header))
    expect(res.status).toBe(200)
  })
})
