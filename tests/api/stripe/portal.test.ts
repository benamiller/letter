import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RequestEvent } from '@sveltejs/kit'
import { POST } from '../../../src/routes/api/stripe/portal/+server'

describe('POST /api/stripe/portal', () => {
  let supabaseMock: any

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())

    supabaseMock = {
      auth: { getSession: vi.fn() },
      from: vi.fn()
    }
  })

  function makeEvent(): RequestEvent {
    return {
      request: {
        json: async () => ({}),
        headers: new Headers()
      },
      locals: { supabase: supabaseMock }
    } as unknown as RequestEvent
  }

  it('returns 401 if no session', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } })
    const res = await POST(makeEvent())
    expect(res.status).toBe(401)
  })

  it('returns 400 if profile missing stripe_customer_id', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'pr1', stripe_customer_id: '' }, error: null })
        })
      })
    }
    supabaseMock.from.mockImplementationOnce(() => builderSelect)

    const res = await POST(makeEvent())
    expect(res.status).toBe(400)
  })

  it('returns portal url on success', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u2' } } } })
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'pr2', stripe_customer_id: 'cus_123' }, error: null })
        })
      })
    }
    supabaseMock.from.mockImplementationOnce(() => builderSelect)

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://portal.session' })
    })

    const res = await POST(makeEvent())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ url: 'https://portal.session' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 502 if stripe billing portal creation fails', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u3' } } } })
    const builderSelect = {
      select: () => ({
        eq: (_: any, __: any) => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'pr3', stripe_customer_id: 'cus_456' }, error: null })
        })
      })
    }
    supabaseMock.from.mockImplementationOnce(() => builderSelect)
    ;(fetch as any).mockResolvedValueOnce({ ok: false, status: 500 })

    const res = await POST(makeEvent())
    expect(res.status).toBe(502)
  })
})
