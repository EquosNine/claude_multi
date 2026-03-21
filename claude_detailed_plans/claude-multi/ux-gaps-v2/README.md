# UX Gaps V2 — Implementation Guide

## Overview
Close 8 identified UI/UX gaps in claude-multi: markdown rendering, panel ID collision, tool result visibility, completion notifications, keyboard shortcuts, cost/token display, output copy/export, and smart grid layout.

## Project & Stack
- **Project:** claude-multi
- **Scope:** claude-multi (frontend)
- **Stack:** Svelte 5 (runes mode) + Vite + TypeScript
- **Backend:** Bun + TypeScript (server.ts — no changes in this plan)
- **Build:** `bun run build`
- **Check:** `bun run check`

## Architecture

```
src/
├── main.ts                          (no changes)
├── app.css                          [MODIFY] add markdown styles, flash animations
├── App.svelte                       [MODIFY] tool result filtering, cost parsing, grid class, mount KeyboardShortcuts
├── lib/
│   ├── markdown.ts                  [CREATE] markdown-it + highlight.js renderer
│   ├── export.ts                    [CREATE] copy/download utilities
│   ├── KeyboardShortcuts.svelte     [CREATE] global keyboard shortcut handler
│   ├── Panel.svelte                 [MODIFY] cost badges, copy/export buttons, flash animation, data-panel-id
│   ├── PanelOutput.svelte           [MODIFY] {@html renderMarkdown()} for assistant msgs
│   ├── Header.svelte                [MODIFY] layout cycle button label
│   ├── types.ts                     [MODIFY] add cost fields to PanelState, ClaudeStreamEvent
│   ├── stores/
│   │   └── panels.svelte.ts         [MODIFY] fix panel ID, add cost/focus/layout actions
│   ├── PanelInput.svelte            (no changes)
│   ├── SlashDropdown.svelte         (no changes)
│   ├── FolderPicker.svelte          (no changes)
│   ├── AgentMonitor.svelte          (no changes)
│   ├── commands.ts                  (no changes)
│   └── utils.ts                     (no changes)
```

## Task Execution Order

```
Phase 1 (parallel — no dependencies):
  ┌── TASK-01 (panel ID fix)
  └── TASK-02 (markdown-it setup)

Phase 2 (after Phase 1):
  ┌── TASK-03 (markdown rendering)  ← depends on 02
  ├── TASK-04 (tool results)         ← standalone
  └── TASK-05 (cost/tokens)          ← standalone

Phase 3 (after Task 01):
  ┌── TASK-06 (flash notification)   ← standalone
  ├── TASK-07 (keyboard shortcuts)   ← needs export.ts from 08
  ├── TASK-08 (copy/export)          ← standalone
  └── TASK-09 (grid layout)          ← standalone
```

**Maximum parallelism:** Tasks 01 + 02 together, then 03 + 04 + 05 together, then 06 + 07 + 08 + 09 together. Task 07 imports from Task 08's `export.ts` — execute 08 before 07, or create a stub.

## Task Summary

| # | Task | Creates/Modifies | Depends On |
|---|------|-----------------|------------|
| 01 | Fix panel ID collision | M: panels.svelte.ts | Nothing |
| 02 | Markdown renderer setup | C: markdown.ts, M: app.css, package.json | Nothing |
| 03 | Markdown output rendering | M: PanelOutput.svelte | 02 |
| 04 | Show tool results with toggle | M: App.svelte | Nothing |
| 05 | Cost & token display | M: types.ts, panels.svelte.ts, App.svelte, Panel.svelte | Nothing |
| 06 | Panel-complete notification | M: Panel.svelte, app.css | 01 |
| 07 | Keyboard shortcuts | C: KeyboardShortcuts.svelte, M: panels.svelte.ts, Panel.svelte, App.svelte | 01, 08 |
| 08 | Output copy & export | C: export.ts, M: Panel.svelte | Nothing |
| 09 | Smart grid layout | M: panels.svelte.ts, App.svelte, Header.svelte | Nothing |

## Key Patterns
- **Svelte 5 runes:** `$state()`, `$derived()`, `$effect()`, `$props()` — no legacy Svelte 4 syntax
- **Store pattern:** Module-scoped `$state` + exported object with getters (see `panels.svelte.ts`)
- **Component pattern:** `let { prop }: { prop: Type } = $props();`
- **Effect cleanup:** Return cleanup function from `$effect()` for intervals/listeners
- **CSS variables:** All colors via `--var` from `:root` in `app.css`
- **Monospace font:** `'Cascadia Code', 'Fira Code', 'Consolas', monospace`

## Reference Files

| Pattern | Reference File |
|---------|---------------|
| Store with reactive state | `src/lib/stores/panels.svelte.ts` |
| Component with props | `src/lib/Panel.svelte` |
| Utility module (pure functions) | `src/lib/utils.ts` |
| Global CSS variables | `src/app.css` |
| Global keydown listener | `src/lib/SlashDropdown.svelte` (lines 117-119) |
| Badge styling | `src/lib/Panel.svelte` (`.panel-badge` class) |

## Dependencies

| Package | Status | Purpose |
|---------|--------|---------|
| `markdown-it` | **NEW** | Markdown → HTML rendering |
| `@types/markdown-it` | **NEW** (devDep) | TypeScript types |
| `highlight.js` | **NEW** | Code syntax highlighting |
| `svelte` | Existing | UI framework |
| `vite` | Existing | Build tool |
