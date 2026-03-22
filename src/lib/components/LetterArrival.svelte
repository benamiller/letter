<!-- The moment the letter arrives — full-screen, first word, slow reveal -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	export let content: string;

	const dispatch = createEventDispatcher();

	let stage: 'black' | 'first-word' | 'full' = 'black';
	let firstWord = '';
	let firstParagraph = '';

	onMount(() => {
		const firstPara = content.split('\n\n')[0].trim();
		const words = firstPara.split(' ');
		firstWord = words[0];
		firstParagraph = firstPara;

		// Stage 1: pure black — 600ms
		setTimeout(() => { stage = 'first-word'; }, 600);
		// Stage 2: first word — 2000ms
		setTimeout(() => { stage = 'full'; }, 2600);
		// Done — hand off to parent
		setTimeout(() => { dispatch('done'); }, 4000);
	});
</script>

<div class="arrival" class:black={stage === 'black'} class:word={stage === 'first-word'} class:full={stage === 'full'}>
	{#if stage === 'first-word'}
		<span class="first-word">{firstWord}</span>
	{/if}
	{#if stage === 'full'}
		<slot />
	{/if}
</div>

<style>
	.arrival {
		position: fixed;
		inset: 0;
		background: var(--bg);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--side-padding);
		z-index: 100;
		transition: all 1200ms ease;
	}

	.arrival.black {
		opacity: 1;
	}

	.arrival.word {
		opacity: 1;
	}

	.arrival.full {
		position: static;
		display: block;
		padding: 0;
		animation: none;
	}

	.first-word {
		font-family: var(--font-letter);
		font-size: clamp(2.5rem, 8vw, 5rem);
		font-weight: 400;
		color: var(--text);
		letter-spacing: -0.01em;
		animation: wordFade 1600ms ease forwards;
		opacity: 0;
	}

	@keyframes wordFade {
		0% { opacity: 0; transform: translateY(6px); }
		20% { opacity: 1; transform: translateY(0); }
		80% { opacity: 1; transform: translateY(0); }
		100% { opacity: 0; transform: translateY(-4px); }
	}
</style>
