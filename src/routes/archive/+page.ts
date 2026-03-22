import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) return { letters: [] };

	const { data: letters } = await supabase
		.from('letters')
		.select('id, delivered_at, week_start, content')
		.eq('user_id', session.user.id)
		.order('delivered_at', { ascending: false });

	return { letters: letters ?? [] };
};
