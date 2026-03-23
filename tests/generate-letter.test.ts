import { describe, it, expect, beforeEach, vi } from 'vitest'
import handler from '../generate-letter.ts'
import { createClient } from '@supabase/supabase-js'
import { getWeekStart } from '../utils'

// Mock Supabase client
const profileBuilder: any = {}
const lettersBuilder: any = {}
const entriesBuilder: any = {}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))
vi.mock('../utils', () => ({
  getWeekStart: vi.fn()
}))

beforeEach(() => {
  vi.resetAllMocks()

  // reset getWeekStart
  ;(getWeekStart as vi.Mock).mockReturnValue('WEEK_START')

  // Profile query builder: .select().eq().maybeSingle()
  profileBuilder.select = vi.fn().mockReturnValue(profileBuilder)
  profileBuilder.eq = vi.fn().mockReturnValue(profileBuilder)
  profileBuilder.maybeSingle = vi.fn()

  // Letters builder: .select().eq().eq().maybeSingle() and .insert()
  lettersBuilder.select = vi.fn().mockReturnValue(lettersBuilder)
  lettersBuilder.eq = vi.fn().mockReturnValue(lettersBuilder)
  lettersBuilder.maybeSingle = vi.fn()
  lettersBuilder.insert = vi.fn()

  // Entries builder: .select().eq().gte().lte().order() thenable
  entriesBuilder.select = vi.fn().mockReturnValue(entriesBuilder)
  entriesBuilder.eq = vi.fn().mockReturnValue(entriesBuilder)
  entriesBuilder.gte = vi.fn().mockReturnValue(entriesBuilder)
  entriesBuilder.lte = vi.fn().mockReturnValue(entriesBuilder)
  entriesBuilder.order = vi.fn().mockReturnValue(entriesBuilder)
  entriesBuilder.then = vi.fn()

  // Mock createClient to return our builders based on table name
  ;(createClient as vi.Mock).mockReturnValue({
    from: (table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'letters') return lettersBuilder
      if (table === 'entries') return entriesBuilder
      throw new Error(`Unexpected table ${table}`)
    }
  })

  // Mock global fetch for Anthropic API
  vi.stubGlobal('fetch', vi.fn())
})

describe('generate-letter edge function', () => {
  it('returns 405 for non-POST methods', async () => {
    const res = await handler(new Request('https://test', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('returns 401 if missing Authorization header', async () => {
    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 if user_id is missing in body', async () => {
    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({})
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 if profile not found', async () => {
    profileBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    expect(profileBuilder.select).toHaveBeenCalledWith('*')
    expect(res.status).toBe(404)
  })

  it('returns 402 if subscription is inactive', async () => {
    // profile exists but inactive
    profileBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'u1', subscription_status: 'inactive', trial_ends_at: null, timezone: 'UTC' },
      error: null
    })
    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    expect(res.status).toBe(402)
  })

  it('returns 409 if a letter already exists this week', async () => {
    // active subscription
    profileBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'u1', subscription_status: 'active', trial_ends_at: null, timezone: 'UTC' },
      error: null
    })
    // duplicate letter found
    lettersBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: 'l1' }, error: null })
    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    expect(getWeekStart).toHaveBeenCalledWith('UTC')
    expect(lettersBuilder.select).toHaveBeenCalled()
    expect(res.status).toBe(409)
  })

  it('uses fallback content if no entries and succeeds', async () => {
    // profile ok
    profileBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'u1', subscription_status: 'active', trial_ends_at: null, timezone: 'UTC' },
      error: null
    })
    // no existing letter
    lettersBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    // no entries
    entriesBuilder.then.mockResolvedValueOnce({ data: [], error: null })
    // fetch to Anthropic OK
    ;(fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ completion: 'Generated Letter' })
    })
    // insert letter
    lettersBuilder.insert.mockResolvedValueOnce({ data: [{ id: 'newLetter' }], error: null })

    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }),
        body: expect.stringContaining('Nothing shared this week')
      })
    )
    expect(lettersBuilder.insert).toHaveBeenCalled()
    expect(body).toEqual({ success: true, letter_id: 'newLetter' })
  })

  it('returns 500 if Anthropic API fails', async () => {
    profileBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'u1', subscription_status: 'active', trial_ends_at: null, timezone: 'UTC' },
      error: null
    })
    lettersBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    entriesBuilder.then.mockResolvedValueOnce({ data: [], error: null })
    ;(fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 502, text: () => Promise.resolve('Bad') })

    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 if DB insert fails', async () => {
    profileBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'u1', subscription_status: 'active', trial_ends_at: null, timezone: 'UTC' },
      error: null
    })
    lettersBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    entriesBuilder.then.mockResolvedValueOnce({ data: [], error: null })
    ;(fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ completion: 'Hello' })
    })
    lettersBuilder.insert.mockResolvedValueOnce({ data: null, error: new Error('DB error') })

    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    expect(res.status).toBe(500)
  })

  it('succeeds with actual entries and inserts', async () => {
    profileBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'u1', subscription_status: 'active', trial_ends_at: null, timezone: 'UTC' },
      error: null
    })
    lettersBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    entriesBuilder.then.mockResolvedValueOnce({
      data: [{ content: 'One' }, { content: 'Two' }],
      error: null
    })
    ;(fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ completion: 'Letter from entries' })
    })
    lettersBuilder.insert.mockResolvedValueOnce({ data: [{ id: 'L123' }], error: null })

    const req = new Request('https://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ user_id: 'u1' })
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ body: expect.stringContaining('One') })
    )
    expect(body).toEqual({ success: true, letter_id: 'L123' })
  })
})
