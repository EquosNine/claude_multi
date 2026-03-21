# claude-multi Development Master Guide

**Last Updated:** 2026-03-21

## Project Overview
Multi-panel browser UI for running multiple Claude Code CLI instances in parallel. Enables developers to work across multiple project directories simultaneously from a single dashboard.

## Architecture
| Scope | Role | Stack |
|-------|------|-------|
| claude-multi (backend) | Server | Bun + TypeScript |
| claude-multi (frontend) | UI | Svelte 5 (runes) + Vite + TypeScript |

## Current Sprint
**Focus:** UX Gaps V2 — output quality, panel management, and workflow enhancements
**Target:** 2026-03-25

| Scope | Feature | Status | Priority | Next Action |
|-------|---------|--------|----------|-------------|
| claude-multi | CSS layout + panel naming | Complete | P1 | -- |
| claude-multi | Elapsed timer | Complete | P1 | -- |
| claude-multi | RAM + agent monitoring | Complete | P1 | -- |
| claude-multi | Slash commands (66 skills) | Complete | P1 | -- |
| claude-multi | Svelte 5 migration (7 tasks) | Complete | P0 | -- |
| claude-multi | Folder picker with breadcrumbs | Complete | P1 | -- |
| claude-multi | Agent monitor (expandable) | Complete | P1 | -- |
| claude-multi | UX Gaps V2 (9 tasks) | Not Started | P0 | Execute tasks |

## Roadmap

### Now (Active)
- **UX Gaps V2** — 9 tasks across 3 phases:
  - Markdown rendering with syntax highlighting (markdown-it + highlight.js)
  - Fix panel ID collision bug
  - Show tool results with collapsible toggle
  - Cost & token usage display
  - Panel-complete flash notification
  - Full keyboard shortcuts (Ctrl+1-6, Ctrl+N/L/W/G, Ctrl+Shift+C)
  - Output copy & export (clipboard + .md download)
  - Smart grid layout for 1-6 panels

### Next (Upcoming)
- Persistent conversation sessions (--resume)
- Panel presets / saved configurations

### Later (Backlog)
- Multi-panel broadcast commands
- Light theme toggle
- Drag-to-resize panels

## Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-21 | Migrate to Svelte 5 + Vite | Component architecture needed for folder picker and agent monitor features; runes provide clean reactivity |
| 2026-03-21 | Svelte 5 runes mode globally | `compilerOptions.runes: true` — use `$state()`, `$derived()`, `$effect()`, `$props()` everywhere |
| 2026-03-21 | Vite dev proxy to Bun backend | Proxies `/ws` and `/api` to `localhost:3456` during dev; production serves from `dist/` |
| 2026-03-21 | Server `/api/browse` endpoint | Returns directory listings for folder picker; filters hidden dirs, Windows drive detection via PowerShell |
| 2026-03-21 | Agent detail broadcasting | Server sends `agent_detail` events with toolUseId, description, status, output for per-agent monitoring |
| 2026-03-21 | Slash commands as prompt translation | Avoids needing interactive CLI mode; works with existing `-p` architecture |
| 2026-03-21 | Removed `--cwd` flag | Not a valid claude CLI option; `cwd` in Bun.spawn handles it |
| 2026-03-21 | Added `--verbose` flag | Required when using `--output-format stream-json` with `-p` |
| 2026-03-21 | RAM polling via PowerShell every 3s | Low overhead, Windows-compatible, gives real-time memory visibility |
| 2026-03-21 | Track agents by tool_use_id matching | Accurate count by matching Agent tool_use to tool_result |
| 2026-03-21 | Use markdown-it + highlight.js for output | Renders Claude's markdown responses as formatted HTML; highlight.js for code block syntax coloring; `html: false` for XSS safety |
| 2026-03-21 | Monotonic panel ID counter | Fix collision bug where `panels.length` reuses IDs after panel removal |
| 2026-03-21 | In-UI flash notifications (not browser) | Visual flash on panel border when task completes; no permission dialogs, works everywhere |
| 2026-03-21 | Layout mode cycle (auto/1/2/3 col) | Auto mode adapts to panel count; manual overrides for user preference |

## Learnings
No learnings files yet. Will be created after first `/imma3-review` run.
