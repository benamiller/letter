<!-- Reusable full letter reading component used on / and /archive/[id] -->
<script lang="ts">
	import { fade } from 'svelte/transition';

	export let content: string;
	export let deliveredAt: string;
	export let isNew = false; // triggers arrival animation

	let showFull = !isNew;

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	const paragraphs = content.split('\n\n').filter(p => p.trim());
</script>

{#if showFull}
	<article class="letter-container" in:fade={{ duration: 1200, delay: isNew ? 0 : 100 }}>
		<header class="letter-header">
			<time class="letter-date ui-text" datetime={deliveredAt}>
				{formatDate(deliveredAt)}
			</time>
		</header>

		<div class="letter-body">
			{#each paragraphs as paragraph, i}
				<p
					in:fade={{ duration: 600, delay: 200 + i * 80 }}
				>{paragraph.trim()}</p>
			{/each}
		</div>

		<footer class="letter-footer">
			<span class="ui-text signature">— Nia</span>
		</footer>
	</article>
{/if}

<!-- Arrival sequence for new letters -->
{#if isNew && !showFull}
	<div class="arrival-overlay" in:fade={{ duration: 400 }}>
		<span class="first-word">{paragraphs[0]?.split(' ')[0] ?? ''}</span>
	</div>

	<!-- Trigger full reveal after word -->
	<svelte:head>
		<script>
			// handled via component logic
		</script>
	</svelte:head>
{/if}

<style>
	.letter-container {
		width: 100%;
		max-width: var(--max-width);
		padding: clamp(2rem, 6vw, 4rem) 0;
	}

	.letter-header {
		margin-bottom: 3rem;
	}

	.letter-date {
		font-size: 0.6875rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.letter-body {
		font-family: var(--font-letter);
		font-size: clamp(1.0625rem, 2.5vw, 1.1875rem);
		line-height: 1.85;
		color: var(--text);
	}

	.letter-body p {
		margin-bottom: 1.6em;
	}

	.letter-body p:last-child {
		margin-bottom: 0;
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

	.arrival-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
	}

	.first-word {
		font-family: var(--font-letter);
		font-size: clamp(2.5rem, 8vw, 5rem);
		color: var(--text);
		animation: arrive 2800ms ease forwards;
		opacity: 0;
	}

	@keyframes arrive {
		0% { opacity: 0; transform: translateY(8px); }
		15% { opacity: 1; transform: translateY(0); }
		75% { opacity: 1; transform: translateY(0); }
		100% { opacity: 0; transform: translateY(-6px); }
	}
</style>
