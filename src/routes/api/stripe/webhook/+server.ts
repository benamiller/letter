import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { supabase } from '$lib/supabase';

export async function verifyWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
	const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
		const [k, v] = part.split('=');
		acc[k] = v;
		return acc;
	}, {});

	const timestamp = parts['t'];
	const sigHash = parts['v1'];

	if (!timestamp || !sigHash) return false;

	const signedPayload = `${timestamp}.${payload}`;
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
	const expected = Array.from(new Uint8Array(sig))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');

	return expected === sigHash;
}

export const POST: RequestHandler = async ({ request }) => {
	const signature = request.headers.get('stripe-signature') ?? '';
	const body = await request.text();

	const valid = await verifyWebhook(body, signature, STRIPE_WEBHOOK_SECRET);
	if (!valid) throw error(400, 'Invalid signature');

	const event = JSON.parse(body);

	switch (event.type) {
		case 'customer.subscription.created':
		case 'customer.subscription.updated': {
			const sub = event.data.object;
			const customerId = sub.customer;
			const status = sub.status; // active, trialing, past_due, canceled, etc.

			const subscriptionStatus =
				status === 'active' || status === 'trialing' ? 'active' : 'cancelled';

			await supabase
				.from('profiles')
				.update({
					stripe_subscription_id: sub.id,
					subscription_status: subscriptionStatus
				})
				.eq('stripe_customer_id', customerId);

			break;
		}

		case 'customer.subscription.deleted': {
			const sub = event.data.object;

			await supabase
				.from('profiles')
				.update({ subscription_status: 'cancelled' })
				.eq('stripe_customer_id', sub.customer);

			break;
		}
	}

	return json({ received: true });
};
