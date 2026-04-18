# Slash Commands, Session Timer & Monitoring

**Project:** claude-multi
**Scope:** claude-multi
**Stack:** Bun + TypeScript backend, Vanilla HTML/CSS/JS frontend
**Build command:** `bun run server.ts`
**Template feature:** Current Panel class in `public/index.html`
**Status:** Not Started
**Priority:** P1
**Last Updated:** 2026-03-21

## Vision
Enhance the multi-panel dashboard with real slash commands from the user's 59+ installed skills, per-panel RAM monitoring, sub-agent tracking, editable panel names, elapsed time indicators, and improved CSS layout.

## Current State
- Panels can send prompts and display streamed responses
- Status dot shows running/idle/error but no timing, RAM, or agent info
- No slash command or autocomplete support
- Panel headers show only a number, not editable names
- Grid layout is basic

## Roadmap

### Phase 1: MVP (Target: 2026-03-21)
- [ ] Task 01 - CSS layout improvements + editable panel names
- [ ] Task 02 - Elapsed time indicator
- [ ] Task 03 - Server-side process stats (RAM + sub-agent tracking)
- [ ] Task 04 - Slash command autocomplete with real installed skills

## Dependencies
- **Task 01, 02, 04:** Frontend only — independent of each other
- **Task 03:** Server + frontend — independent of others
- All tasks modify `public/index.html`; Task 03 also modifies `server.ts`

## Technical Notes
- RAM monitoring: server polls process memory via PowerShell, sends stats over WS
- Sub-agent tracking: parse stream-json for `tool_use` blocks with `name === "Agent"`, count active agents
- Slash commands: 59 real skills organized by category (dev, marketing, SEO, content, social, etc.) plus EQUOS project commands
- Panel names saved to localStorage
