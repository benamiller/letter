import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) return { letter: null };

	// Get the most recent letter
	const { data: letter } = await supabase
		.from('letters')
		.select('*')
		.eq('user_id', session.user.id)
		.order('delivered_at', { ascending: false })
		.limit(1)
		.single();

	return { letter };
};
