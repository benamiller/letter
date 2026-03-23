import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/**/*.{spec,test}.ts', '!tests/e2e/**'],
		environment: 'jsdom',
		globals: true,
		alias: {
			$lib: '/src/lib',
			'$env/static/public': '/tests/__mocks__/env-public.ts',
			'$env/static/private': '/tests/__mocks__/env-private.ts'
		}
	}
});
