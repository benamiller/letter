import { sveltekit } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
			manifest: {
				name: 'Letter',
				short_name: 'Letter',
				description: 'A weekly letter written just for you.',
				theme_color: '#0d0c0b',
				background_color: '#0d0c0b',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				navigateFallback: null,
				runtimeCaching: [
					{
						// Google Fonts CSS — 1 year cache
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
						}
					},
					{
						// Google Fonts files — 1 year cache
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
						}
					},
					{
						// Archive pages — stale while revalidate (read offline, fresh when possible)
						urlPattern: /^https?:\/\/[^/]+\/archive.*/i,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'archive-cache',
							expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 90 }
						}
					}
				]
			}
		})
	]
});
