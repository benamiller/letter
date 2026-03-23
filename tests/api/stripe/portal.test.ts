import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn()
  }
}));

import { supabase } from '$lib/supabase';
import { POST } from '../../../src/routes/api/stripe/portal/+server';
import { callHandler } from '../../__mocks__/sveltekit-error-helper';

function makeRequest() {
  return new Request('https://test.app/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'https://test.app' },
    body: '{}'
  });
}

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns 401 if no session', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { session: null } });
    const res = await callHandler(POST, { request: makeRequest() } as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 if profile has no stripe_customer_id', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } }
    });
    const singleMock = vi.fn().mockResolvedValue({ data: { stripe_customer_id: null } });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) });

    const res = await callHandler(POST, { request: makeRequest() } as any);
    expect(res.status).toBe(400);
  });

  it('returns portal url on success', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u2' } } }
    });
    const singleMock = vi.fn().mockResolvedValue({ data: { stripe_customer_id: 'cus_123' } });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true, json: async () => ({ url: 'https://billing.portal' })
    });

    const res = await callHandler(POST, { request: makeRequest() } as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://billing.portal' });
  });

  it('returns 502 if Stripe portal creation fails', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u3' } } }
    });
    const singleMock = vi.fn().mockResolvedValue({ data: { stripe_customer_id: 'cus_456' } });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });

    const res = await callHandler(POST, { request: makeRequest() } as any);
    expect(res.status).toBe(502);
  });
});
