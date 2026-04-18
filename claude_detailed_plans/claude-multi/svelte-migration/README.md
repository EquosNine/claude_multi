# Svelte Migration + QoL Features — Implementation Guide

## Overview
Migrate the monolithic vanilla HTML/CSS/JS frontend (`public/index.html`, ~1106 lines) to a Svelte 5 component architecture with Vite bundling. Then add two new features: a folder picker with breadcrumb navigation for selecting project directories, and a sub-agent monitor with expandable per-agent detail within each panel.

## Project & Stack
- **Project:** claude-multi
- **Scope:** claude-multi
- **Backend:** Bun + TypeScript (`server.ts`) — unchanged except API additions
- **Frontend:** Svelte 5 (runes) + Vite + TypeScript
- **Build:** `bun run build` (vite build) → outputs to `dist/`
- **Check:** `bun run check` (svelte-check)

## Architecture

```
claude-multi/
├── index.html                    # Vite entry (root)
├── vite.config.ts                # Vite + Svelte plugin config
├── svelte.config.js              # Svelte 5 runes mode
├── tsconfig.json                 # TypeScript config
├── server.ts                     # Bun backend (modified)
├── package.json                  # Updated with Svelte/Vite deps
├── public/
│   └── index.html                # OLD — kept as reference
├── src/
│   ├── main.ts                   # Svelte mount entry
│   ├── app.css                   # Global styles (extracted from old index.html)
│   ├── App.svelte                # Root component — WS routing, layout
│   └── lib/
│       ├── types.ts              # All TypeScript interfaces
│       ├── commands.ts           # 66 slash commands + category data
│       ├── stores/
│       │   ├── ws.ts             # WebSocket connection store
│       │   └── panels.ts         # Panel state management store
│       ├── Header.svelte         # Connection status, +Panel, layout toggle
│       ├── Panel.svelte          # Panel shell: header, timer, badges, close
│       ├── PanelOutput.svelte    # Scrollable message list with auto-scroll
│       ├── PanelInput.svelte     # Textarea + send/stop button
│       ├── SlashDropdown.svelte  # Categorized command autocomplete
│       ├── FolderPicker.svelte   # Breadcrumb directory browser
│       └── AgentMonitor.svelte   # Expandable sub-agent detail section
└── dist/                         # Built output (gitignored)
```

## Task Execution Order

```
TASK-01 (scaffold)
    │
    ▼
TASK-02 (types + stores)
    │
    ├──────────────────┐
    ▼                  ▼
TASK-03 (App+Header)  TASK-04 (Panel components)
                       │
                ┌──────┼──────┐
                ▼      ▼      ▼
          TASK-05   TASK-06  TASK-07
          (slash)   (folder) (agents)
```

## Task Summary

| # | Task | Creates/Modifies | Depends On |
|---|------|-----------------|------------|
| 01 | Project scaffold | 6 new, 2 mod | Nothing |
| 02 | Types, stores, WS client | 4 new | Task 01 |
| 03 | App shell + Header | 1 new, 1 mod | Task 02 |
| 04 | Panel component | 3 new | Task 02, 03 |
| 05 | Slash command dropdown | 1 new | Task 02, 04 |
| 06 | Folder picker | 1 new, 2 mod | Task 04 |
| 07 | Agent monitor | 1 new, 3 mod | Task 02, 04 |

## Key Patterns
- **Svelte 5 runes:** `$state()`, `$derived()`, `$effect()`, `$props()` — no legacy `let`/`export let`
- **Event handlers:** `onclick={fn}` not `on:click={fn}`
- **Conditional classes:** `class:name={condition}`
- **Stores:** Module-level singletons with getter exports, not class instances
- **Keyed each:** `{#each items as item (item.id)}` for stable DOM
- **Component composition:** Panel → PanelOutput + AgentMonitor + PanelInput

## Reference Files
| Pattern | Reference File |
|---------|---------------|
| Panel UI structure | `public/index.html` lines 562-977 (Panel class) |
| Slash commands data | `public/index.html` lines 444-560 |
| CSS theme variables | `public/index.html` lines 8-25 |
| WS message protocol | `server.ts` lines 108-180 |
| Agent tracking | `server.ts` lines 134-160 |

## Dependencies
| Package | Status |
|---------|--------|
| svelte ^5.0.0 | New — add |
| @sveltejs/vite-plugin-svelte ^5.0.0 | New — add |
| svelte-check ^4.0.0 | New — add |
| typescript ^5.5.0 | New — add |
| vite ^6.0.0 | New — add |
| bun | Existing — runtime |
