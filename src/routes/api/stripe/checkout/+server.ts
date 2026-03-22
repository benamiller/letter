import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { supabase } from '$lib/supabase';

export const POST: RequestHandler = async ({ request }) => {
	const { price_id } = await request.json();

	const { data: { session } } = await supabase.auth.getSession();
	if (!session) throw error(401, 'Unauthorized');

	const { data: profile } = await supabase
		.from('profiles')
		.select('email, stripe_customer_id')
		.eq('id', session.user.id)
		.single();

	if (!profile) throw error(404, 'Profile not found');

	// Create or retrieve Stripe customer
	let customerId = profile.stripe_customer_id;

	if (!customerId) {
		const customerRes = await fetch('https://api.stripe.com/v1/customers', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				email: profile.email,
				metadata: JSON.stringify({ user_id: session.user.id })
			})
		});

		if (!customerRes.ok) throw error(502, 'Failed to create Stripe customer');

		const customer = await customerRes.json();
		customerId = customer.id;

		await supabase
			.from('profiles')
			.update({ stripe_customer_id: customerId })
			.eq('id', session.user.id);
	}

	// Create checkout session
	const origin = request.headers.get('origin') ?? 'https://letter.app';

	const checkoutRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			customer: customerId,
			'line_items[0][price]': price_id,
			'line_items[0][quantity]': '1',
			mode: 'subscription',
			success_url: `${origin}/?subscribed=1`,
			cancel_url: `${origin}/subscribe`,
			'subscription_data[trial_period_days]': '28',
			'payment_method_collection': 'if_required'
		})
	});

	if (!checkoutRes.ok) {
		const msg = await checkoutRes.text();
		console.error('Stripe checkout error:', msg);
		throw error(502, 'Failed to create checkout session');
	}

	const session_data = await checkoutRes.json();
	return json({ url: session_data.url });
};
