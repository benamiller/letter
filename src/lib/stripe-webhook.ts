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
