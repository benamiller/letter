import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/api/transcribe/+server';
import { callHandler } from '../__mocks__/sveltekit-error-helper';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('POST /api/transcribe', () => {
  it('returns 400 if no audio field', async () => {
    const request = { formData: async () => ({ get: () => null }) } as any;
    const res = await callHandler(POST, { request });
    expect(res.status).toBe(400);
  });

  it('returns 502 if ElevenLabs returns non-2xx', async () => {
    const audio = new File([new Uint8Array([1, 2, 3])], 'rec.webm', { type: 'audio/webm' });
    const request = { formData: async () => ({ get: (k: string) => k === 'audio' ? audio : null }) } as any;

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, text: async () => 'EL error' });

    const res = await callHandler(POST, { request });
    expect(res.status).toBe(502);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/speech-to-text',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns text from response.text field', async () => {
    const audio = new File([new Uint8Array([1])], 'rec.webm', { type: 'audio/webm' });
    const request = { formData: async () => ({ get: (k: string) => k === 'audio' ? audio : null }) } as any;

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: async () => ({ text: 'Hello world' })
    });

    const res = await callHandler(POST, { request });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'Hello world' });
  });

  it('falls back to response.transcription if text is missing', async () => {
    const audio = new File([new Uint8Array([1])], 'rec.webm', { type: 'audio/webm' });
    const request = { formData: async () => ({ get: (k: string) => k === 'audio' ? audio : null }) } as any;

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: async () => ({ transcription: 'Fallback text' })
    });

    const res = await callHandler(POST, { request });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'Fallback text' });
  });
});
