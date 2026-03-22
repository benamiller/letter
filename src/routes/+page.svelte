<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { signOut } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { subscribeToNewLetters, type Letter } from '$lib/stores/letter';

	export let data: PageData;

	let letter = data.letter;
	let visible = false;
	let arriving = false;
	let showNav = false;
	let mouseTimeout: ReturnType<typeof setTimeout>;
	let realtimeChannel: ReturnType<typeof subscribeToNewLetters> | null = null;

	onMount(async () => {
		setTimeout(() => { visible = true; }, 300);

		const { data: { session } } = await supabase.auth.getSession();
		if (!session) return;

		// Listen for new letter arriving in real time
		realtimeChannel = subscribeToNewLetters(session.user.id, (newLetter: Letter) => {
			arriving = true;
			setTimeout(() => {
				letter = newLetter;
				arriving = false;
			}, 600);
		});
	});

	onDestroy(() => {
		if (realtimeChannel) {
			supabase.removeChannel(realtimeChannel);
		}
		clearTimeout(mouseTimeout);
	});

	function handleMouseMove() {
		showNav = true;
		clearTimeout(mouseTimeout);
		mouseTimeout = setTimeout(() => { showNav = false; }, 2000);
	}

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<svelte:window on:mousemove={handleMouseMove} />

<main class="reader" role="main">
	{#if letter && visible && !arriving}
		<article class="letter-container" in:fade={{ duration: 1400, delay: 100 }}>
			<header class="letter-header">
				<time class="letter-date ui-text" datetime={letter.delivered_at}>
					{formatDate(letter.delivered_at)}
				</time>
			</header>

			<div class="letter-body">
				{#each letter.content.split('\n\n') as paragraph}
					{#if paragraph.trim()}
						<p>{paragraph.trim()}</p>
					{/if}
				{/each}
			</div>

			<footer class="letter-footer">
				<span class="ui-text signature">— Nia</span>
			</footer>
		</article>
	{:else if !letter && visible}
		<div class="no-letter" in:fade={{ duration: 800 }}>
			<p class="waiting ui-text">Your first letter arrives on Sunday.</p>
			<a href="/share" class="share-link ui-text">Share something with Nia →</a>
		</div>
	{/if}

	<!-- Ghost nav -->
	<nav class="ghost-nav ui-text" class:visible={showNav} aria-label="Navigation">
		<a href="/archive">archive</a>
		<a href="/share">share</a>
		<button on:click={handleSignOut}>leave</button>
	</nav>
</main>

<style>
	.reader {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--side-padding);
		background: var(--bg);
		position: relative;
	}

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

	.no-letter {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
	}

	.waiting {
		font-size: 0.875rem;
		color: var(--text-muted);
		letter-spacing: 0.06em;
	}

	.share-link {
		font-size: 0.8125rem;
		color: var(--accent);
		text-decoration: none;
		letter-spacing: 0.06em;
		transition: opacity var(--transition-medium);
	}

	.share-link:hover {
		opacity: 0.7;
	}

	.ghost-nav {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		display: flex;
		gap: 1.5rem;
		align-items: center;
		opacity: 0;
		transition: opacity 600ms ease;
		pointer-events: none;
	}

	.ghost-nav.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.ghost-nav a,
	.ghost-nav button {
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 300;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		text-decoration: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 300ms ease;
	}

	.ghost-nav a:hover,
	.ghost-nav button:hover {
		color: var(--accent);
	}
</style>
