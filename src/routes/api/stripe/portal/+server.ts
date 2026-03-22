import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { supabase } from '$lib/supabase';

export const POST: RequestHandler = async ({ request }) => {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) throw error(401, 'Unauthorized');

	const { data: profile } = await supabase
		.from('profiles')
		.select('stripe_customer_id')
		.eq('id', session.user.id)
		.single();

	if (!profile?.stripe_customer_id) throw error(400, 'No Stripe customer');

	const origin = request.headers.get('origin') ?? 'https://letter.app';

	const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			customer: profile.stripe_customer_id,
			return_url: `${origin}/`
		})
	});

	if (!portalRes.ok) throw error(502, 'Failed to open portal');

	const portal = await portalRes.json();
	return json({ url: portal.url });
};
