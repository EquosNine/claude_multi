# Task 01: Project Scaffold

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Svelte 5 + Vite + TypeScript + Bun
**Creates:** 6 new files / **Modifies:** 2 existing files

## Goal
Set up the Svelte 5 + Vite project structure with TypeScript, install dependencies, create entry point and global styles, and update server.ts to serve built output from `dist/`.

## Files to Create/Modify

### 1. `package.json` (MODIFY)
Add devDependencies and scripts:
```json
{
  "name": "claude-multi",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "server": "bun run server.ts",
    "start": "bun run build && bun run server.ts"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0"
  }
}
```

### 2. `vite.config.ts` (CREATE)
```ts
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
```

### 3. `svelte.config.js` (CREATE)
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
};
```

### 4. `tsconfig.json` (CREATE)
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "types": ["svelte", "vite/client"]
  },
  "include": ["src/**/*", "src/**/*.svelte"],
  "exclude": ["node_modules", "dist"]
}
```

Note: Remove the `"extends"` line — that's for SvelteKit. This is plain Svelte.

### 5. `src/main.ts` (CREATE)
```ts
import App from './App.svelte';
import './app.css';
import { mount } from 'svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
```

### 6. `index.html` (CREATE — project root, Vite entry)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>claude-multi</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 7. `src/App.svelte` (CREATE — placeholder)
```svelte
<script lang="ts">
  // Placeholder — replaced in Task 03
</script>

<main>
  <h1>claude-multi loading...</h1>
</main>
```

### 8. `src/app.css` (CREATE)
Extract ALL global CSS from the current `public/index.html` `<style>` block. This includes:
- CSS reset (`*, *::before, *::after`)
- `:root` CSS custom properties (all theme variables)
- `html, body` base styles
- `@keyframes pulse`
- `.msg-*` message styles (system, assistant, error, tool, tool-result, done)
- Scrollbar styles
- `.btn` styles
- `.empty-state` styles
- Media queries

Component-specific styles (`.panel`, `.panel-header`, `.slash-dropdown`, etc.) will move into their respective Svelte components — do NOT include them in app.css.

### 9. `server.ts` (MODIFY)
Update the static file serving to serve from `dist/` instead of `public/`:
```ts
// Change this line:
const fullPath = join(import.meta.dir, "public", filePath);
// To:
const fullPath = join(import.meta.dir, "dist", filePath);
```

Also update the MIME map to include `.svg` with proper type (already there) and add `.woff2`:
```ts
".woff2": "font/woff2",
```

## Key Patterns to Follow
- Svelte 5 uses `mount()` instead of `new App()`
- Vite entry `index.html` goes at project root (not in `public/` or `src/`)
- `svelte.config.js` sets `compilerOptions.runes: true` to enable Svelte 5 runes globally
- Vite proxy config routes `/ws` and `/api` to the Bun backend during dev
- Keep the old `public/index.html` intact for now as a reference — don't delete it

## Verification
```bash
bun install
bun run build
bun run check
```
All three should succeed. The Vite build should output files to `dist/`.
