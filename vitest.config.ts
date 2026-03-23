import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/**/*.{spec,test}.ts', '!tests/e2e/**'],
		environment: 'jsdom',
		globals: true,
		alias: {
			$lib: '/src/lib',
			'$env/static/public': '/tests/__mocks__/env-public.ts',
			'$env/static/private': '/tests/__mocks__/env-private.ts',
			// Edge functions import Supabase from esm.sh — remap to installed package
			'https://esm.sh/@supabase/supabase-js@2': '@supabase/supabase-js'
		}
	}
});
