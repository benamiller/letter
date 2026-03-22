<script lang="ts">
	import type { PageData } from './$types';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let visible = false;
	setTimeout(() => { visible = true; }, 200);

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<main class="reader">
	{#if visible}
		<article class="letter-container" in:fade={{ duration: 1000 }}>
			<header class="letter-header">
				<button class="back-btn ui-text" on:click={() => goto('/archive')}>← archive</button>
				<time class="letter-date ui-text" datetime={data.letter.delivered_at}>
					{formatDate(data.letter.delivered_at)}
				</time>
			</header>

			<div class="letter-body">
				{#each data.letter.content.split('\n\n') as paragraph}
					{#if paragraph.trim()}
						<p>{paragraph.trim()}</p>
					{/if}
				{/each}
			</div>

			<footer class="letter-footer">
				<span class="ui-text signature">— Nia</span>
			</footer>
		</article>
	{/if}
</main>

<style>
	.reader {
		min-height: 100dvh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--side-padding);
		padding-top: clamp(3rem, 8vw, 5rem);
		background: var(--bg);
	}

	.letter-container {
		width: 100%;
		max-width: var(--max-width);
		padding-bottom: 5rem;
	}

	.letter-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 3rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
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

	.letter-date {
		font-size: 0.6875rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.letter-footer {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
	}

	.signature {
		font-size: 0.875rem;
		color: var(--accent);
		letter-spacing: 0.06em;
	}
</style>
