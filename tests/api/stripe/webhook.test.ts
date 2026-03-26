import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { supabase } from '$lib/supabase';
import { callHandler } from '../../__mocks__/sveltekit-error-helper';
import { POST } from '../../../src/routes/api/stripe/webhook/+server';
import { verifyWebhook } from '../../../src/lib/stripe-webhook';

const SECRET = 'whsec_test_mock'; // matches env mock

async function makeStripeSignature(payload: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signed = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const hex = Array.from(new Uint8Array(sig)).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

describe('verifyWebhook', () => {
  it('returns true for a valid signature', async () => {
    const payload = JSON.stringify({ type: 'test' });
    const header = await makeStripeSignature(payload, SECRET);
    expect(await verifyWebhook(payload, header, SECRET)).toBe(true);
  });

  it('returns false for tampered payload', async () => {
    const payload = JSON.stringify({ type: 'test' });
    const header = await makeStripeSignature(payload, SECRET);
    expect(await verifyWebhook('{"tampered":true}', header, SECRET)).toBe(false);
  });

  it('returns false if timestamp missing', async () => {
    expect(await verifyWebhook('p', 'v1=00ff', SECRET)).toBe(false);
  });

  it('returns false if v1 missing', async () => {
    expect(await verifyWebhook('p', 't=123', SECRET)).toBe(false);
  });
});

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  async function makeRequest(body: object) {
    const payload = JSON.stringify(body);
    const sig = await makeStripeSignature(payload, SECRET);
    return new Request('https://test.app/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: payload
    });
  }

  it('returns 400 on invalid signature', async () => {
    const req = new Request('https://test.app/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'bad' },
      body: '{}'
    });
    const res = await callHandler(POST, { request: req } as any);
    expect(res.status).toBe(400);
  });

  it('handles subscription.created with active status', async () => {
    const event = { type: 'customer.subscription.created', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active' } } };
    const eqMock = vi.fn().mockResolvedValue({ data: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: updateMock });

    const res = await callHandler(POST, { request: await makeRequest(event) } as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(updateMock).toHaveBeenCalledWith({ stripe_subscription_id: 'sub_1', subscription_status: 'active' });
  });

  it('handles subscription.updated with canceled -> cancelled', async () => {
    const event = { type: 'customer.subscription.updated', data: { object: { id: 'sub_2', customer: 'cus_2', status: 'canceled' } } };
    const eqMock = vi.fn().mockResolvedValue({ data: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: updateMock });

    await callHandler(POST, { request: await makeRequest(event) } as any);
    expect(updateMock).toHaveBeenCalledWith({ stripe_subscription_id: 'sub_2', subscription_status: 'cancelled' });
  });

  it('handles subscription.deleted', async () => {
    const event = { type: 'customer.subscription.deleted', data: { object: { customer: 'cus_3' } } };
    const eqMock = vi.fn().mockResolvedValue({ data: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: updateMock });

    await callHandler(POST, { request: await makeRequest(event) } as any);
    expect(updateMock).toHaveBeenCalledWith({ subscription_status: 'cancelled' });
  });
});
