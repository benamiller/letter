// Stripe client utilities
// Keys are PLACEHOLDER until Ben provides them

export const STRIPE_PRICE_MONTHLY = 'price_PLACEHOLDER'; // $6/month — update when keys arrive

export async function redirectToCheckout(priceId: string): Promise<void> {
	const res = await fetch('/api/stripe/checkout', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ price_id: priceId })
	});

	if (!res.ok) throw new Error('Failed to create checkout session');

	const { url } = await res.json();
	if (url) window.location.href = url;
}

export async function redirectToPortal(): Promise<void> {
	const res = await fetch('/api/stripe/portal', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!res.ok) throw new Error('Failed to open billing portal');

	const { url } = await res.json();
	if (url) window.location.href = url;
}
