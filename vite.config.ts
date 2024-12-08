import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { webSocketServer } from './wsPlugin';

export default defineConfig({
	server: {
		port: 5173
	},
	preview: {
		port: 5173
	},
	plugins: [sveltekit(), webSocketServer]
});
