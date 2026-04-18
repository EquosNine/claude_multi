# Svelte Migration + QoL Features

**Project:** claude-multi
**Scope:** claude-multi
**Stack:** Bun + TypeScript backend, Svelte 5 (runes) + Vite frontend
**Build command:** `bun run build` (vite build) / `bun run dev` (vite dev)
**Template feature:** Current `public/index.html` Panel class
**Status:** Not Started
**Priority:** P0
**Last Updated:** 2026-03-21

## Vision
Migrate the monolithic vanilla HTML/CSS/JS frontend to a Svelte 5 component architecture with Vite bundling, then add folder picker and sub-agent monitoring features. The Bun WebSocket backend stays as-is with minor API additions.

## Current State
- ~1100 line monolithic `public/index.html` with inline CSS + JS
- Panel class handles all UI state imperatively
- All features working: timer, RAM badges, agent count, slash commands, editable names
- Backend: `server.ts` with WS relay + process management + RAM polling + agent tracking

## Roadmap

### Phase 1: Svelte Migration (Target: 2026-03-22)
- [ ] Task 01 - Project scaffold (Vite + Svelte 5 + TypeScript config)
- [ ] Task 02 - Types, stores, WebSocket client
- [ ] Task 03 - App shell + Header component
- [ ] Task 04 - Panel component (output, input, timer, stats)
- [ ] Task 05 - Slash command dropdown component

### Phase 2: New Features (Target: 2026-03-23)
- [ ] Task 06 - Folder picker (server API + breadcrumb component)
- [ ] Task 07 - Agent monitor (enhanced tracking + expandable panel section)

## Dependencies
- **Requires:** Bun runtime, existing server.ts
- **Blocks:** Nothing

## Technical Notes
- Svelte 5 runes: `$state()`, `$derived()`, `$effect()` for reactivity
- Vite dev server proxies `/ws` and `/api/*` to Bun backend (port 3456)
- Keep Bun backend serving built Svelte output in production
- Global CSS variables preserved from current theme
- localStorage persistence for panel names/cwds carried over

## Open Questions
- None
