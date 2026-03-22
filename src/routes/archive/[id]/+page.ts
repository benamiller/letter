import { supabase } from '$lib/supabase';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) throw error(401, 'Unauthorized');

	const { data: letter } = await supabase
		.from('letters')
		.select('*')
		.eq('id', params.id)
		.eq('user_id', session.user.id)
		.single();

	if (!letter) throw error(404, 'Letter not found');

	return { letter };
};
