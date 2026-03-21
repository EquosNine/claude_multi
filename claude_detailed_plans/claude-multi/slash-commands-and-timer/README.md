# Slash Commands, Monitoring & UI — Implementation Guide

## Overview
Enhance the claude-multi dashboard with real slash commands (59+ skills), per-panel RAM monitoring, sub-agent tracking, editable panel names, elapsed timers, and improved layout.

## Project & Stack
- **Project:** claude-multi
- **Scope:** claude-multi
- **Stack:** Bun + TypeScript backend, Vanilla HTML/CSS/JS frontend

## Architecture
```
server.ts           ← Task 03 modifies (RAM polling, agent tracking)
public/
  index.html        ← Tasks 01-04 all modify this file
```

## Task Execution Order
```
TASK-01 (layout + naming) ──┐
TASK-02 (timer)             ├── All independent, can run in parallel
TASK-03 (RAM + agents)      │   (but all touch index.html so merge carefully)
TASK-04 (slash commands) ───┘
```

## Task Summary
| # | Task | Creates/Modifies | Depends On |
|---|------|-----------------|------------|
| 01 | CSS layout + panel naming | public/index.html | Nothing |
| 02 | Elapsed time indicator | public/index.html | Nothing |
| 03 | RAM + sub-agent monitoring | server.ts, public/index.html | Nothing |
| 04 | Slash command autocomplete | public/index.html | Nothing |

## Key Patterns
- Panel class in `public/index.html` — all UI state as class properties, DOM built in `build()`
- CSS custom properties in `:root` for theming
- WebSocket messages as JSON `{ type, panelId, ... }`
- localStorage for persisting panel names and cwd paths

## Reference Files
| Pattern | Reference File |
|---------|---------------|
| Panel class structure | `public/index.html` lines 326-554 |
| CSS theming | `public/index.html` lines 8-25 |
| WS message handling | `public/index.html` lines 639-669 |
| Stream parsing | `server.ts` lines 87-130 |
| Process management | `server.ts` lines 47-85 |
