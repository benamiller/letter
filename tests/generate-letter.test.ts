import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

import { createClient } from '@supabase/supabase-js';
import { handler } from '../supabase/functions/generate-letter/index';

const WEEK_START = '2026-03-23';

function makeSupabaseMock(overrides: {
  profile?: any;
  profileError?: any;
  existingLetter?: any;
  entries?: any;
  entriesError?: any;
  insertedLetter?: any;
  insertError?: any;
} = {}) {
  const { profile = null, profileError = null, existingLetter = null,
    entries = [], entriesError = null, insertedLetter = null, insertError = null } = overrides;

  const fromMock = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profile, error: profileError })
          })
        })
      };
    }
    if (table === 'letters') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: existingLetter, error: null })
            })
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: insertedLetter, error: insertError })
          })
        })
      };
    }
    if (table === 'entries') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: entries, error: entriesError })
            })
          })
        })
      };
    }
    return {};
  });

  return { from: fromMock };
}

function makeRequest(body: object, auth = true) {
  return new Request('https://fn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { 'Authorization': 'Bearer service-key' } : {})
    },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.ANTHROPIC_API_KEY = 'sk_anthropic_test';
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('generate-letter handler', () => {
  it('returns 405 for non-POST', async () => {
    const res = await handler(new Request('https://fn', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('returns 401 without Bearer token', async () => {
    const res = await handler(makeRequest({ user_id: 'u1' }, false));
    expect(res.status).toBe(401);
  });

  it('returns 400 if user_id missing', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(makeSupabaseMock());
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 if profile not found', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profileError: new Error('not found') })
    );
    const res = await handler(makeRequest({ user_id: 'u1' }));
    expect(res.status).toBe(404);
  });

  it('returns 402 if subscription inactive', async () => {
    const profile = { id: 'u1', timezone: 'UTC', subscription_status: 'cancelled', trial_ends_at: null };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(makeSupabaseMock({ profile }));
    const res = await handler(makeRequest({ user_id: 'u1' }));
    expect(res.status).toBe(402);
  });

  it('returns 409 if letter already exists this week', async () => {
    const profile = { id: 'u1', timezone: 'UTC', subscription_status: 'active', trial_ends_at: null };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profile, existingLetter: { id: 'existing' } })
    );
    const res = await handler(makeRequest({ user_id: 'u1' }));
    expect(res.status).toBe(409);
  });

  it('uses fallback entry if no entries this week', async () => {
    const profile = { id: 'u1', timezone: 'UTC', subscription_status: 'active', trial_ends_at: null };
    const insertedLetter = { id: 'new-letter' };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profile, entries: [], insertedLetter })
    );
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Generated letter content.' }] })
    });

    const res = await handler(makeRequest({ user_id: 'u1' }));
    expect(res.status).toBe(200);

    // Verify the Anthropic call included the fallback text
    const [, fetchOpts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const reqBody = JSON.parse(fetchOpts.body);
    expect(reqBody.messages[0].content).toContain('Nothing shared this week');
  });

  it('returns 500 if Anthropic API fails', async () => {
    const profile = { id: 'u1', timezone: 'UTC', subscription_status: 'active', trial_ends_at: null };
    const entries = [{ content: 'Some entry', type: 'text', created_at: new Date().toISOString() }];
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profile, entries })
    );
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, text: async () => 'error' });

    const res = await handler(makeRequest({ user_id: 'u1' }));
    expect(res.status).toBe(500);
  });

  it('returns success with letter_id on happy path', async () => {
    const profile = { id: 'u1', timezone: 'UTC', subscription_status: 'active', trial_ends_at: null };
    const entries = [{ content: 'Had a great week', type: 'text', created_at: new Date().toISOString() }];
    const insertedLetter = { id: 'letter-123' };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profile, entries, insertedLetter })
    );
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Your letter this week...' }] })
    });

    const res = await handler(makeRequest({ user_id: 'u1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, letter_id: 'letter-123' });
  });
});
