import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RequestEvent } from '@sveltejs/kit'
import { POST } from '../../../src/routes/api/stripe/checkout/+server'

describe('POST /api/stripe/checkout', () => {
  let supabaseMock: any

  beforeEach(() => {
    vi.restoreAllMocks()
    // mock global fetch
    vi.stubGlobal('fetch', vi.fn())

    // supabase mock skeleton
    supabaseMock = {
      auth: { getSession: vi.fn() },
      from: vi.fn()
    }
  })

  function makeEvent(body: any): RequestEvent {
    return {
      request: {
        json: async () => body,
        headers: new Headers()
      },
      locals: { supabase: supabaseMock }
    } as unknown as RequestEvent
  }

  it('returns 401 if session is missing', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } })
    const res = await POST(makeEvent({ price_id: 'price_1' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 if profile not found', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    // first DB call: select profile
    const builderSelect = {
      select: () => ({ eq: (_: any, __: any) => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) })
    }
    supabaseMock.from.mockImplementation(() => builderSelect)
    const res = await POST(makeEvent({ price_id: 'price_1' }))
    expect(res.status).toBe(404)
  })

  it('creates new stripe customer when missing and returns checkout url', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    // 1st call: select profile -> no stripe_customer_id
    const fakeProfile = { id: 'pr1', stripe_customer_id: null }
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({
          maybeSingle: () => Promise.resolve({ data: fakeProfile, error: null })
        })
      })
    }
    // 2nd call: update profile with new customer id
    const builderUpdate = {
      update: (_data: any) => ({
        eq: (_: any, __: any) => Promise.resolve({ data: null, error: null })
      })
    }
    supabaseMock.from
      .mockImplementationOnce(() => builderSelect)
      .mockImplementationOnce(() => builderUpdate)

    // mock stripe create customer
    const createCus = { id: 'cus_123' }
    ;(fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => createCus })
      // mock stripe checkout session
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://checkout.session' }) })

    const res = await POST(makeEvent({ price_id: 'price_1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ url: 'https://checkout.session' })
    // ensure two fetch calls
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('uses existing stripe_customer_id and returns checkout url', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u2' } } } })
    // profile has existing stripe_customer_id
    const fakeProfile = { id: 'pr2', stripe_customer_id: 'cus_456' }
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({
          maybeSingle: () => Promise.resolve({ data: fakeProfile, error: null })
        })
      })
    }
    supabaseMock.from.mockImplementationOnce(() => builderSelect)

    // only one fetch call to create checkout
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.existing' })
    })

    const res = await POST(makeEvent({ price_id: 'price_2' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ url: 'https://checkout.existing' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 502 if stripe create customer fails', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u3' } } } })
    const fakeProfile = { id: 'pr3', stripe_customer_id: null }
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({
          maybeSingle: () => Promise.resolve({ data: fakeProfile, error: null })
        })
      })
    }
    const builderUpdate = {
      update: (_: any) => ({ eq: (_: any, __: any) => Promise.resolve({ data: null, error: null }) })
    }
    supabaseMock.from
      .mockImplementationOnce(() => builderSelect)
      .mockImplementationOnce(() => builderUpdate)

    ;(fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 500 }) // create customer fails

    const res = await POST(makeEvent({ price_id: 'price_bad' }))
    expect(res.status).toBe(502)
  })

  it('returns 502 if stripe create checkout session fails', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u4' } } } })
    const fakeProfile = { id: 'pr4', stripe_customer_id: 'cus_789' }
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({
          maybeSingle: () => Promise.resolve({ data: fakeProfile, error: null })
        })
      })
    }
    supabaseMock.from.mockImplementationOnce(() => builderSelect)

    ;(fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'cus_789' }) })
      .mockResolvedValueOnce({ ok: false, status: 500 }) // checkout fails

    const res = await POST(makeEvent({ price_id: 'price_fail' }))
    expect(res.status).toBe(502)
  })
})
