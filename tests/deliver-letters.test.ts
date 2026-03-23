import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock @supabase/supabase-js before importing the handler
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

import { createClient } from '@supabase/supabase-js';
import { handler } from '../supabase/functions/deliver-letters/index';

const SUPABASE_URL = 'https://example.supabase.co';

beforeEach(() => {
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('deliver-letters handler', () => {
  it('returns 405 on non-POST', async () => {
    const req = new Request('https://fn', { method: 'GET' });
    const res = await handler(req);
    expect(res.status).toBe(405);
  });

  it('returns { delivered: 0 } when no eligible users', async () => {
    const inMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const selectMock = vi.fn().mockReturnValue({ in: inMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    const req = new Request('https://fn', { method: 'POST' });
    const res = await handler(req);
    const json = await res.json();
    expect(json).toEqual({ delivered: 0 });
  });

  it('delivers to eligible user on Sunday 8am', async () => {
    const users = [{ id: 'u1', timezone: 'Europe/London' }];
    const inMock = vi.fn().mockResolvedValue({ data: users, error: null });
    const selectMock = vi.fn().mockReturnValue({ in: inMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    // Stub Intl.DateTimeFormat to report Sunday 8am
    const origFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = class {
      formatToParts() {
        return [{ type: 'weekday', value: 'Sun' }, { type: 'hour', value: '8' }];
      }
    };

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('https://fn', { method: 'POST' });
    const res = await handler(req);
    const json = await res.json();

    expect(json.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/generate-letter'),
      expect.any(Object)
    );

    (Intl as any).DateTimeFormat = origFormat;
  });

  it('skips users with invalid timezone', async () => {
    const users = [{ id: 'u2', timezone: 'Bad/Zone' }];
    const inMock = vi.fn().mockResolvedValue({ data: users, error: null });
    const selectMock = vi.fn().mockReturnValue({ in: inMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });

    const origFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = class {
      constructor(_locale: string, opts: any) {
        if (opts?.timeZone === 'Bad/Zone') throw new RangeError('Invalid timezone');
      }
      formatToParts() { return []; }
    };

    const req = new Request('https://fn', { method: 'POST' });
    const res = await handler(req);
    const json = await res.json();
    expect(json).toEqual({ delivered: 0 });

    (Intl as any).DateTimeFormat = origFormat;
  });
});
