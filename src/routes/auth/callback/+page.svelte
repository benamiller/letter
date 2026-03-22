<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { fade } from 'svelte/transition';

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			goto('/');
		} else {
			// Handle the auth callback from URL hash
			const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
			if (!error) {
				goto('/');
			} else {
				goto('/login');
			}
		}
	});
</script>

<main class="callback-page" in:fade={{ duration: 600 }}>
	<p class="ui-text">Opening your letter...</p>
</main>

<style>
	.callback-page {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	p {
		font-size: 0.8125rem;
		color: var(--text-muted);
		letter-spacing: 0.08em;
	}
</style>
