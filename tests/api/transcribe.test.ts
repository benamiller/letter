import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import handler from '../../src/api/transcribe'

describe('/api/transcribe', () => {
  let originalFetch: any

  beforeEach(() => {
    originalFetch = global.fetch
    vi.resetAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns 400 if no audio field in form data', async () => {
    // mock request.formData to return empty form
    const req = {
      formData: async () => ({
        get: (name: string) => null
      })
    } as any

    const res = await handler(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'Missing audio file' })
  })

  it('returns 502 if ElevenLabs API returns non-2xx', async () => {
    // mock formData with a dummy file
    const fakeFile = new Blob(['audio content'], { type: 'audio/wav' })
    const req = {
      formData: async () => ({
        get: (name: string) => name === 'audio' ? fakeFile : null
      })
    } as any

    // ElevenLabs returns 500
    ;(global.fetch as vi.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'server' })
    })

    const res = await handler(req)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/speech-to-text',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'xi-api-key': expect.any(String) }),
        body: expect.any(FormData)
      })
    )
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body).toEqual({ error: 'Failed to transcribe audio' })
  })

  it('returns text from response.text field on success', async () => {
    const fakeFile = new Blob(['audio'], { type: 'audio/mp3' })
    const req = {
      formData: async () => ({
        get: (name: string) => name === 'audio' ? fakeFile : null
      })
    } as any

    ;(global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Hello world' })
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ text: 'Hello world' })
  })

  it('falls back to response.transcription if text is missing', async () => {
    const fakeFile = new Blob(['audio'], { type: 'audio/mp3' })
    const req = {
      formData: async () => ({
        get: (name: string) => name === 'audio' ? fakeFile : null
      })
    } as any

    ;(global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ transcription: 'Fallback text' })
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ text: 'Fallback text' })
  })
})
