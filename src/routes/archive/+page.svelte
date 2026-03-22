<script lang="ts">
	import type { PageData } from './$types';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';

	export let data: PageData;

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function excerpt(content: string, maxLen = 120): string {
		if (content.length <= maxLen) return content;
		return content.slice(0, maxLen).trimEnd() + '…';
	}
</script>

<main class="archive-page">
	<div class="archive-container" in:fade={{ duration: 800 }}>
		<header class="archive-header">
			<button class="back-btn ui-text" on:click={() => goto('/')}>← back</button>
			<h1 class="archive-title ui-text">archive</h1>
		</header>

		{#if data.letters.length === 0}
			<p class="empty ui-text">No letters yet. Your first arrives Sunday.</p>
		{:else}
			<ol class="letter-list">
				{#each data.letters as letter, i}
					<li in:fade={{ duration: 400, delay: i * 60 }}>
						<a href="/archive/{letter.id}" class="letter-entry">
							<time class="entry-date ui-text" datetime={letter.delivered_at}>
								{formatDate(letter.delivered_at)}
							</time>
							<p class="entry-excerpt letter-body">{excerpt(letter.content)}</p>
						</a>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</main>

<style>
	.archive-page {
		min-height: 100dvh;
		display: flex;
		justify-content: center;
		padding: var(--side-padding);
		padding-top: clamp(3rem, 8vw, 5rem);
		background: var(--bg);
	}

	.archive-container {
		width: 100%;
		max-width: var(--max-width);
	}

	.archive-header {
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

	.archive-title {
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.empty {
		font-size: 0.875rem;
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	.letter-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.letter-entry {
		display: block;
		text-decoration: none;
		padding: 1.75rem 0;
		border-bottom: 1px solid var(--border);
		transition: opacity 300ms ease;
	}

	.letter-entry:hover {
		opacity: 0.75;
	}

	.entry-date {
		display: block;
		font-size: 0.6875rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 0.75rem;
	}

	.entry-excerpt {
		font-size: 1rem;
		line-height: 1.65;
		color: var(--text-muted);
	}
</style>
