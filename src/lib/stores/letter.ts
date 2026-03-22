import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

export interface Letter {
  id: string;
  content: string;
  delivered_at: string;
  week_start: string;
}

export const currentLetter = writable<Letter | null>(null);
export const letterLoading = writable(false);

export async function fetchLatestLetter(userId: string): Promise<void> {
  letterLoading.set(true);

  const { data } = await supabase
    .from('letters')
    .select('id, content, delivered_at, week_start')
    .eq('user_id', userId)
    .order('delivered_at', { ascending: false })
    .limit(1)
    .single();

  currentLetter.set(data ?? null);
  letterLoading.set(false);
}

export function subscribeToNewLetters(userId: string, onNew: (letter: Letter) => void) {
  return supabase
    .channel(`letters:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'letters',
        filter: `user_id=eq.${userId}`
      },
      (payload) => onNew(payload.new as Letter)
    )
    .subscribe();
}
