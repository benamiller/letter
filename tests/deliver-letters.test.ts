import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import deliverLetters from '../../src/functions/deliver-letters/index'

const SUPABASE_URL = 'https://example.supabase.co'

describe('deliver-letters edge function', () => {
  let originalFetch: typeof fetch
  let originalDateTimeFormat: typeof Intl.DateTimeFormat

  beforeEach(() => {
    originalFetch = global.fetch
    originalDateTimeFormat = Intl.DateTimeFormat
    process.env.SUPABASE_URL = SUPABASE_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
    (Intl as any).DateTimeFormat = originalDateTimeFormat
  })

  it('returns 405 on non-POST', async () => {
    const req = new Request('https://fn', { method: 'GET' })
    const res = await deliverLetters(req)
    expect(res.status).toBe(405)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Method not allowed' })
  })

  it('returns zero when no eligible users', async () => {
    // stub fetch for users
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
    const req = new Request('https://fn', { method: 'POST' })
    const res = await deliverLetters(req)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const json = await res.json()
    expect(json).toEqual({ delivered: 0 })
  })

  it('delivers to one eligible user on Sunday 8am', async () => {
    // stub fetch: first call returns one user, second call is generate-letter
    const user = { id: 'u1', timezone: 'Europe/London', subscription_status: 'active' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([user]), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    global.fetch = fetchMock
    // stub DateTimeFormat to report Sunday 8
    (Intl as any).DateTimeFormat = class {
      constructor(_locale: string, opts: any) {
        if (opts.timeZone !== 'Europe/London') throw new RangeError()
      }
      formatToParts() {
        return [
          { type: 'weekday', value: 'Sunday' },
          { type: 'hour', value: '8' },
        ]
      }
    }
    const req = new Request('https://fn', { method: 'POST' })
    const res = await deliverLetters(req)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // first call fetch users, second call generate-letter
    expect(fetchMock.mock.calls[1][0]).toContain(`${SUPABASE_URL}/functions/v1/generate-letter`)
    const json = await res.json()
    expect(json).toEqual({ delivered: 1, total: 1 })
  })

  it('skips invalid timezone users', async () => {
    const user = { id: 'u2', timezone: 'Invalid/Zone', subscription_status: 'active' }
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([user]), { status: 200 }))
    global.fetch = fetchMock
    (Intl as any).DateTimeFormat = class {
      constructor(_locale: string, opts: any) {
        if (opts.timeZone === 'Invalid/Zone') throw new RangeError('Invalid timezone')
      }
    }
    const req = new Request('https://fn', { method: 'POST' })
    const res = await deliverLetters(req)
    expect(fetchMock).toHaveBeenCalledTimes(1) // only user fetch
    const json = await res.json()
    expect(json).toEqual({ delivered: 0, total: 0 })
  })

  it('counts partial failures correctly', async () => {
    const users = [
      { id: 'u1', timezone: 'Europe/London', subscription_status: 'active' },
      { id: 'u2', timezone: 'Europe/London', subscription_status: 'trial' },
    ]
    // first fetch returns two users, then two generate calls
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(users), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
    global.fetch = fetchMock
    (Intl as any).DateTimeFormat = class {
      constructor(_locale: string, opts: any) {}
      formatToParts() {
        return [{ type: 'weekday', value: 'Sunday' }, { type: 'hour', value: '8' }]
      }
    }
    const req = new Request('https://fn', { method: 'POST' })
    const res = await deliverLetters(req)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const json = await res.json()
    expect(json).toEqual({ delivered: 1, total: 2 })
  })
})
