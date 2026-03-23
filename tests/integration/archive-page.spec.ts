import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '$lib/supabase';
import { load as loadArchive } from '../../src/routes/archive/+page';
import { load as loadLetter } from '../../src/routes/archive/[id]/+page';

vi.mock('$lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Archive +page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty letters if not authenticated', async () => {
    const event = {
      parent: async () => ({ session: null })
    } as any;
    const result = await loadArchive(event);
    expect(result.letters).toEqual([]);
  });

  it('returns letters if authenticated', async () => {
    const letters = [
      { id: '1', content: 'Hello!', delivered_at: '2023-01-01', week_start: '2023-01-01' }
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: letters });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    (supabase.from as unknown as vi.Mock).mockReturnValue({ select: selectMock });

    const event = {
      parent: async () => ({ session: { user: { id: 'user1' } } })
    } as any;

    const result = await loadArchive(event);

    expect(supabase.from).toHaveBeenCalledWith('letters');
    expect(selectMock).toHaveBeenCalledWith('id, content, delivered_at, week_start');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user1');
    expect(orderMock).toHaveBeenCalledWith('delivered_at', { ascending: false });
    expect(result.letters).toEqual(letters);
  });
});

describe('Archive [id] +page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 401 if not authenticated', async () => {
    const event = {
      parent: async () => ({ session: null }),
      params: { id: '1' }
    } as any;

    await expect(loadLetter(event)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 404 if letter not found', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null });
    const eqUserMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock });

    (supabase.from as unknown as vi.Mock).mockReturnValue({ select: selectMock });

    const event = {
      parent: async () => ({ session: { user: { id: 'user1' } } }),
      params: { id: '1' }
    } as any;

    await expect(loadLetter(event)).rejects.toMatchObject({ status: 404 });
  });

  it('returns letter if found', async () => {
    const letter = {
      id: '1',
      content: 'Detailed letter',
      delivered_at: '2023-01-03',
      week_start: '2023-01-03'
    };

    const singleMock = vi.fn().mockResolvedValue({ data: letter });
    const eqUserMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock });

    (supabase.from as unknown as vi.Mock).mockReturnValue({ select: selectMock });

    const event = {
      parent: async () => ({ session: { user: { id: 'user1' } } }),
      params: { id: '1' }
    } as any;

    const result = await loadLetter(event);

    expect(selectMock).toHaveBeenCalledWith('id, content, delivered_at, week_start');
    expect(eqIdMock).toHaveBeenCalledWith('id', '1');
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user1');
    expect(result.letter).toEqual(letter);
  });
});
