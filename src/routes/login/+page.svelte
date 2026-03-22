<script lang="ts">
	import { sendMagicLink } from '$lib/auth';
	import { fade } from 'svelte/transition';

	let email = '';
	let state: 'idle' | 'sending' | 'sent' | 'error' = 'idle';
	let errorMsg = '';

	async function handleSubmit() {
		if (!email || state === 'sending') return;

		state = 'sending';
		errorMsg = '';

		const { error } = await sendMagicLink(email);

		if (error) {
			errorMsg = error;
			state = 'error';
		} else {
			state = 'sent';
		}
	}
</script>

<main class="login-page">
	<div class="login-container" in:fade={{ duration: 800 }}>
		<header class="login-header">
			<h1 class="wordmark">Letter</h1>
			<p class="tagline ui-text">A weekly letter written just for you.</p>
		</header>

		{#if state !== 'sent'}
			<form class="login-form" on:submit|preventDefault={handleSubmit}>
				<label for="email" class="sr-only">Email address</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="your@email.com"
					autocomplete="email"
					autocapitalize="off"
					spellcheck="false"
					disabled={state === 'sending'}
					class="email-input ui-text"
					required
				/>

				<button
					type="submit"
					class="submit-btn ui-text"
					disabled={state === 'sending' || !email}
				>
					{state === 'sending' ? 'sending...' : 'send link'}
				</button>

				{#if state === 'error'}
					<p class="error-msg ui-text" in:fade={{ duration: 300 }}>{errorMsg}</p>
				{/if}
			</form>
		{:else}
			<div class="sent-state" in:fade={{ duration: 600 }}>
				<p class="sent-msg ui-text">Check your inbox.</p>
				<p class="sent-detail ui-text">A link is waiting for you at {email}.</p>
			</div>
		{/if}

		<footer class="login-footer">
			<p class="ui-text">$6/month · 4 weeks free · no card required</p>
		</footer>
	</div>
</main>

<style>
	.login-page {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--side-padding);
		background: var(--bg);
	}

	.login-container {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.login-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.wordmark {
		font-family: var(--font-letter);
		font-size: clamp(2.5rem, 8vw, 3.5rem);
		font-weight: 400;
		color: var(--text);
		letter-spacing: -0.01em;
		line-height: 1;
	}

	.tagline {
		font-size: 0.8125rem;
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.email-input {
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text);
		font-family: var(--font-ui);
		font-size: 0.9375rem;
		font-weight: 300;
		letter-spacing: 0.02em;
		padding: 0.875rem 1rem;
		border-radius: 2px;
		transition: border-color var(--transition-medium);
		outline: none;
	}

	.email-input::placeholder {
		color: var(--text-muted);
	}

	.email-input:focus {
		border-color: var(--accent-dim);
	}

	.email-input:disabled {
		opacity: 0.5;
	}

	.submit-btn {
		width: 100%;
		background: transparent;
		border: 1px solid var(--accent-dim);
		color: var(--accent);
		font-family: var(--font-ui);
		font-size: 0.8125rem;
		font-weight: 300;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		padding: 0.875rem 1rem;
		border-radius: 2px;
		cursor: pointer;
		transition: background var(--transition-medium), opacity var(--transition-medium);
	}

	.submit-btn:hover:not(:disabled) {
		background: rgba(201, 168, 76, 0.06);
	}

	.submit-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.error-msg {
		font-size: 0.75rem;
		color: #c97b4c;
		letter-spacing: 0.04em;
	}

	.sent-state {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sent-msg {
		font-family: var(--font-letter);
		font-size: 1.25rem;
		color: var(--text);
	}

	.sent-detail {
		font-size: 0.8125rem;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}

	.login-footer {
		border-top: 1px solid var(--border);
		padding-top: 1.5rem;
	}

	.login-footer p {
		font-size: 0.6875rem;
		color: var(--text-muted);
		letter-spacing: 0.06em;
	}
</style>
