import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn()
  }
}));

import { supabase } from '$lib/supabase';
import { POST } from '../../../src/routes/api/stripe/checkout/+server';
import { callHandler } from '../../__mocks__/sveltekit-error-helper';

function makeRequest(body: any) {
  return new Request('https://test.app/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'https://test.app' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns 401 if session is missing', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { session: null } });
    const res = await callHandler(POST, { request: makeRequest({ price_id: 'price_1' }) } as any);
    expect(res.status).toBe(401);
  });

  it('returns 404 if profile not found', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } }
    });
    const singleMock = vi.fn().mockResolvedValue({ data: null });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

    const res = await callHandler(POST, { request: makeRequest({ price_id: 'price_1' }) } as any);
    expect(res.status).toBe(404);
  });

  it('creates new stripe customer and returns checkout url', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } }
    });
    const profile = { email: 'u@test.com', stripe_customer_id: null };
    const singleMock = vi.fn().mockResolvedValue({ data: profile });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null }) });
    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ update: updateMock });

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'cus_new' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://checkout.session' }) });

    const res = await callHandler(POST, { request: makeRequest({ price_id: 'price_1' }) } as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.session' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses existing stripe_customer_id', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u2' } } }
    });
    const profile = { email: 'u@test.com', stripe_customer_id: 'cus_456' };
    const singleMock = vi.fn().mockResolvedValue({ data: profile });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true, json: async () => ({ url: 'https://checkout.existing' })
    });

    const res = await callHandler(POST, { request: makeRequest({ price_id: 'price_2' }) } as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.existing' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns 502 if stripe create customer fails', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u3' } } }
    });
    const profile = { email: 'u@test.com', stripe_customer_id: null };
    const singleMock = vi.fn().mockResolvedValue({ data: profile });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, text: async () => 'error' });

    const res = await callHandler(POST, { request: makeRequest({ price_id: 'p' }) } as any);
    expect(res.status).toBe(502);
  });

  it('returns 502 if checkout session creation fails', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u4' } } }
    });
    const profile = { email: 'u@test.com', stripe_customer_id: 'cus_789' };
    const singleMock = vi.fn().mockResolvedValue({ data: profile });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, text: async () => 'fail' });

    const res = await callHandler(POST, { request: makeRequest({ price_id: 'p' }) } as any);
    expect(res.status).toBe(502);
  });
});
