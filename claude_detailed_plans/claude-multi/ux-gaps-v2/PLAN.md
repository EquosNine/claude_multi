# UX Gaps V2 — Development Plan

**Project:** claude-multi
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + Vite + TypeScript frontend, Bun + TypeScript backend
**Build command:** `bun run build`
**Check command:** `bun run check`
**Template feature:** `src/lib/` — existing Svelte component architecture
**Status:** Not Started
**Priority:** P0–P2 (mixed)
**Last Updated:** 2026-03-21

## Vision
Close all 8 identified UI/UX gaps from the gap analysis: markdown rendering, panel ID collision, tool result visibility, completion notifications, keyboard shortcuts, cost/token display, output copy/export, and smart grid layout. Transform claude-multi from a functional prototype into a polished multi-panel IDE-like experience.

## Current State
- Svelte 5 migration complete with component architecture (Panel, PanelOutput, PanelInput, SlashDropdown, FolderPicker, AgentMonitor)
- Output renders as plain text — no markdown
- Panel IDs assigned as `panels.length`, causing collisions after removal
- Successful tool results completely suppressed
- No notification when panels complete
- No keyboard shortcuts for panel navigation
- No cost/token tracking
- No output copy/export
- Grid layout doesn't adapt well for 4-6 panels

## Roadmap

### Phase 1: Foundations (no dependencies)
- [ ] Task 01 — Fix panel ID collision (monotonic counter)
- [ ] Task 02 — Install markdown-it + highlight.js, create renderer utility + CSS

### Phase 2: Output Quality (Task 03 depends on 02; others standalone)
- [ ] Task 03 — Markdown rendering in PanelOutput
- [ ] Task 04 — Show tool results with collapsible toggle
- [ ] Task 05 — Cost & token tracking and display

### Phase 3: UX Enhancements (all standalone, depend on Task 01)
- [ ] Task 06 — Panel-complete flash notification
- [ ] Task 07 — Full keyboard shortcuts
- [ ] Task 08 — Output copy & export
- [ ] Task 09 — Smart grid layout for 1-6 panels

## Dependencies
- **Requires:** `markdown-it`, `highlight.js` (npm packages)
- **Blocks:** Nothing

## Technical Notes
- Markdown rendered via `{@html}` in Svelte — markdown-it with `html: false` prevents XSS from raw HTML injection; code highlighting via highlight.js `highlight` callback
- Panel IDs: monotonic counter (`let nextId = 0`) ensures session-unique IDs; localStorage keys unchanged on reload since counter resets
- Cost data parsed from Claude stream-json `result` events which include `cost_usd`, `input_tokens`, `output_tokens`
- Grid layout uses CSS `grid-template-columns` with panel-count-based classes
- Keyboard shortcuts via a global Svelte component with `window` keydown listener
- All notifications are in-UI only (CSS animation flash on panel border/header)

## Open Questions
- None — all decisions made
