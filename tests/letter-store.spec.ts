import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  currentLetter,
  letterLoading,
  fetchLatestLetter,
  subscribeToNewLetters,
  type Letter
} from '$lib/stores/letter';
import { supabase } from '$lib/supabase';

vi.mock('$lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}));

describe('Letter Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset store state
    currentLetter.set(null);
    letterLoading.set(false);
  });

  it('fetchLatestLetter sets loading and currentLetter on success', async () => {
    const fakeData: Letter = {
      id: '1',
      content: 'Test content',
      delivered_at: '2023-01-01',
      week_start: '2023-01-01'
    };

    const singleMock = vi.fn().mockResolvedValue({ data: fakeData });
    const limitMock = vi.fn().mockReturnValue({ single: singleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    (supabase.from as unknown as vi.Mock).mockReturnValue({ select: selectMock });

    const loadingStates: boolean[] = [];
    letterLoading.subscribe((val) => loadingStates.push(val));

    const letters: (Letter | null)[] = [];
    currentLetter.subscribe((val) => letters.push(val));

    await fetchLatestLetter('user1');

    expect(supabase.from).toHaveBeenCalledWith('letters');
    expect(selectMock).toHaveBeenCalledWith('id, content, delivered_at, week_start');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user1');
    expect(orderMock).toHaveBeenCalledWith('delivered_at', { ascending: false });
    expect(limitMock).toHaveBeenCalledWith(1);

    expect(loadingStates).toEqual([true, false]);
    expect(letters[letters.length - 1]).toEqual(fakeData);
  });

  it('fetchLatestLetter handles no data', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null });
    const limitMock = vi.fn().mockReturnValue({ single: singleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    (supabase.from as unknown as vi.Mock).mockReturnValue({ select: selectMock });

    const loadingStates: boolean[] = [];
    letterLoading.subscribe((val) => loadingStates.push(val));

    const letters: (Letter | null)[] = [];
    currentLetter.subscribe((val) => letters.push(val));

    await fetchLatestLetter('user1');

    expect(loadingStates).toEqual([true, false]);
    expect(letters[letters.length - 1]).toBeNull();
  });

  it('subscribeToNewLetters binds and triggers onNew', () => {
    const fakeLetter: Letter = {
      id: '1',
      content: 'New arrival',
      delivered_at: '2023-01-02',
      week_start: '2023-01-02'
    };

    let capturedHandler: (payload: any) => void;
    const channelStub = {
      on: vi.fn((event, opts, handler) => {
        capturedHandler = handler;
        return channelStub;
      }),
      subscribe: vi.fn(() => 'subscribed')
    };

    (supabase.channel as unknown as vi.Mock).mockReturnValue(channelStub);

    const onNew = vi.fn();
    const sub = subscribeToNewLetters('user1', onNew);

    expect(supabase.channel).toHaveBeenCalledWith('letters:user1');
    expect(channelStub.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'letters', filter: 'user_id=eq.user1' },
      expect.any(Function)
    );
    expect(channelStub.subscribe).toHaveBeenCalled();

    // simulate a new letter arriving
    capturedHandler({ new: fakeLetter });
    expect(onNew).toHaveBeenCalledWith(fakeLetter);
    expect(sub).toBe(channelStub);
  });
});
