import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3456',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3456',
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
