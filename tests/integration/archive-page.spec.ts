import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('$lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn()
  }
}));

import { supabase } from '$lib/supabase';
import { load as loadArchive } from '../../src/routes/archive/+page';
import { load as loadLetter } from '../../src/routes/archive/[id]/+page';

describe('Archive +page load', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty letters if not authenticated', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null }
    });
    const result = await loadArchive({} as any);
    expect(result.letters).toEqual([]);
  });

  it('returns letters if authenticated', async () => {
    const letters = [
      { id: '1', content: 'Hello!', delivered_at: '2023-01-01', week_start: '2023-01-01' }
    ];
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'user1' } } }
    });
    const orderMock = vi.fn().mockResolvedValue({ data: letters });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

    const result = await loadArchive({} as any);
    expect(supabase.from).toHaveBeenCalledWith('letters');
    expect(result.letters).toEqual(letters);
  });

  it('returns empty array if DB returns null', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'user1' } } }
    });
    const orderMock = vi.fn().mockResolvedValue({ data: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

    const result = await loadArchive({} as any);
    expect(result.letters).toEqual([]);
  });
});

describe('Archive [id] +page load', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 401 if not authenticated', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null }
    });
    await expect(loadLetter({ params: { id: '1' } } as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 404 if letter not found', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'user1' } } }
    });
    const singleMock = vi.fn().mockResolvedValue({ data: null });
    const eqUserMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

    await expect(loadLetter({ params: { id: '1' } } as any)).rejects.toMatchObject({ status: 404 });
  });

  it('returns letter if found', async () => {
    const letter = { id: '1', content: 'A letter', delivered_at: '2023-01-03', week_start: '2023-01-03' };
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'user1' } } }
    });
    const singleMock = vi.fn().mockResolvedValue({ data: letter });
    const eqUserMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

    const result = await loadLetter({ params: { id: '1' } } as any);
    expect(result.letter).toEqual(letter);
  });
});
