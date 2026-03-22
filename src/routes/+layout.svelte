<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	const publicRoutes = ['/login', '/auth/callback'];

	onMount(() => {
		supabase.auth.onAuthStateChange((event, session) => {
			const isPublicRoute = publicRoutes.some(r => $page.url.pathname.startsWith(r));

			if (!session && !isPublicRoute) {
				goto('/login');
			}

			if (session && $page.url.pathname === '/login') {
				goto('/');
			}
		});
	});
</script>

<slot />
