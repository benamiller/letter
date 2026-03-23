/** @vitest-environment jsdom */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('$lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

import { sendMagicLink, signOut, getSession } from '$lib/auth';
import { supabase } from '$lib/supabase';

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendMagicLink should call signInWithOtp and return no error on success', async () => {
    (supabase.auth.signInWithOtp as unknown as vi.Mock).mockResolvedValue({ error: null });

    const result = await sendMagicLink('user@example.com');

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    expect(result).toEqual({ error: null });
  });

  it('sendMagicLink should return error message on failure', async () => {
    (supabase.auth.signInWithOtp as unknown as vi.Mock).mockResolvedValue({ error: { message: 'Oops' } });

    const result = await sendMagicLink('user@example.com');

    expect(result).toEqual({ error: 'Oops' });
  });

  it('signOut should call supabase.auth.signOut', async () => {
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('getSession should return session data', async () => {
    const fakeSession = { user: { id: '1' } };
    (supabase.auth.getSession as unknown as vi.Mock).mockResolvedValue({ data: { session: fakeSession } });

    const session = await getSession();
    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(session).toEqual(fakeSession);
  });
});
