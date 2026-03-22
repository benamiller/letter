<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { redirectToCheckout, redirectToPortal, STRIPE_PRICE_MONTHLY } from '$lib/stripe';

	let loading = false;
	let errorMsg = '';

	async function startSubscription() {
		loading = true;
		errorMsg = '';
		try {
			await redirectToCheckout(STRIPE_PRICE_MONTHLY);
		} catch {
			errorMsg = 'Something went wrong. Try again.';
			loading = false;
		}
	}

	async function manageSubscription() {
		loading = true;
		try {
			await redirectToPortal();
		} catch {
			errorMsg = 'Could not open billing portal.';
			loading = false;
		}
	}
</script>

<main class="subscribe-page">
	<div class="subscribe-container" in:fade={{ duration: 700 }}>

		<header class="subscribe-header">
			<button class="back-btn ui-text" on:click={() => goto('/')}>← back</button>
		</header>

		<div class="subscribe-content">
			<h1 class="subscribe-title">Continue reading.</h1>

			<div class="details">
				<p class="price ui-text">$6 / month</p>
				<ul class="features ui-text">
					<li>One letter, every Sunday</li>
					<li>Archive of every letter, forever</li>
					<li>Gets better the longer you stay</li>
					<li>Cancel anytime — archive stays yours</li>
				</ul>
				<p class="trial-note ui-text">4 weeks free to start. No card required.</p>
			</div>

			{#if errorMsg}
				<p class="error-msg ui-text" in:fade={{ duration: 300 }}>{errorMsg}</p>
			{/if}

			<div class="actions">
				<button
					class="subscribe-btn ui-text"
					on:click={startSubscription}
					disabled={loading}
				>
					{loading ? 'opening...' : 'start free trial'}
				</button>

				<button
					class="portal-btn ui-text"
					on:click={manageSubscription}
					disabled={loading}
				>
					manage subscription
				</button>
			</div>
		</div>

	</div>
</main>

<style>
	.subscribe-page {
		min-height: 100dvh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--side-padding);
		padding-top: clamp(3rem, 8vw, 5rem);
		background: var(--bg);
	}

	.subscribe-container {
		width: 100%;
		max-width: 480px;
	}

	.subscribe-header {
		margin-bottom: 3rem;
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: 0.8125rem;
		font-weight: 300;
		letter-spacing: 0.04em;
		cursor: pointer;
		padding: 0;
		transition: color 300ms ease;
	}

	.back-btn:hover {
		color: var(--accent);
	}

	.subscribe-content {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.subscribe-title {
		font-family: var(--font-letter);
		font-size: clamp(1.75rem, 5vw, 2.5rem);
		font-weight: 400;
		color: var(--text);
		line-height: 1.2;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.price {
		font-size: 1.5rem;
		color: var(--accent);
		letter-spacing: 0.02em;
	}

	.features {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.features li {
		font-size: 0.875rem;
		color: var(--text-muted);
		letter-spacing: 0.02em;
		padding-left: 1rem;
		position: relative;
	}

	.features li::before {
		content: '·';
		position: absolute;
		left: 0;
		color: var(--accent-dim);
	}

	.trial-note {
		font-size: 0.8125rem;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
	}

	.error-msg {
		font-size: 0.75rem;
		color: #c97b4c;
		letter-spacing: 0.04em;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.subscribe-btn {
		width: 100%;
		background: transparent;
		border: 1px solid var(--accent-dim);
		color: var(--accent);
		font-family: var(--font-ui);
		font-size: 0.875rem;
		font-weight: 300;
		letter-spacing: 0.08em;
		padding: 0.875rem 1rem;
		border-radius: 1px;
		cursor: pointer;
		transition: background 300ms ease, opacity 300ms ease;
	}

	.subscribe-btn:hover:not(:disabled) {
		background: rgba(201, 168, 76, 0.06);
	}

	.subscribe-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.portal-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 300;
		letter-spacing: 0.06em;
		cursor: pointer;
		padding: 0.5rem 0;
		text-align: center;
		transition: color 300ms ease;
	}

	.portal-btn:hover:not(:disabled) {
		color: var(--text);
	}

	.portal-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
