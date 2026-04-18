# claude-multi

Multi-panel browser UI for running multiple Claude Code CLI instances in parallel.

## Tech Stack

| Scope | Role | Stack |
|-------|------|-------|
| Backend | Bun server | TypeScript (`server.ts`) — Bun HTTP + WebSocket + DuckDB |
| Frontend | SPA | Svelte 5 (runes) + Vite + TypeScript |
| CLI | Session management | `@anthropic-ai/claude-agent-sdk` (`unstable_v2_createSession` / `unstable_v2_resumeSession`) |
| Terminal | PTY panels | `node-pty` + xterm.js |
| Persistence | Conversation history | `@duckdb/node-api` at `~/.claude-multi/conversations.db` |

## Architecture

- `server.ts` — Bun server: WebSocket relay, Claude SDK session management, DuckDB CRUD, terminal PTY
- `src/` — Svelte 5 frontend (Vite dev server proxies `/ws` and `/api` to port 3456 in dev)
- `dist/` — Production build output served by `server.ts`
- WebSocket protocol: JSON messages between browser and server (`WsOutgoing` / `WsIncoming` in `types.ts`)

## Build / Check / Run

```bash
bun run build       # Vite build → dist/
bun run check       # svelte-check type check (must pass before merging)
bun run server.ts   # Start server on port 3456 (serves dist/)
bun --watch run server.ts  # Dev with auto-reload
# Vite dev (hot reload frontend):
bun run dev         # starts Vite dev server (proxies /api + /ws to :3456)
```

## Conventions

- **Svelte 5 runes everywhere** — `$state()`, `$derived()`, `$effect()`, `$props()`. Never `writable()` / `readable()`.
- **Store pattern** — factory function `createXxxStore()` returning plain object with getters. See `src/lib/stores/`.
- **API calls** — all relative URLs (`/api/...`). See `src/lib/api.ts` for fetch helpers.
- **No premature abstractions** — one-time logic stays inline; shared only when used in 2+ places.
- **Panel IDs** — monotonic counter (`nextPanelId++`), never reuse. Max 6 panels.
- **DuckDB queries** — use `db.runAndReadAll(sql, params)` for SELECT, `db.run(sql, params)` for mutations. `params` is an array.
- **Route handler pattern** — `if (url.pathname === "/api/..." && req.method === "GET") { try { ... return Response.json(...) } catch (err: any) { return Response.json({ error: err.message }, { status: 500 }) } }`
- **Design: "Neon Monolith"** — `var(--bg)` deep indigo (#060e20), Space Grotesk headlines, Fira Code mono, ghost borders

## Key Files

| File | Purpose |
|------|---------|
| `server.ts` | Backend — all routes, WS handler, DuckDB, PTY |
| `src/lib/stores/panels.svelte.ts` | Panel state, layout, tab groups |
| `src/lib/stores/conversations.svelte.ts` | Conversation history (DuckDB-backed) |
| `src/lib/stores/settings.svelte.ts` | Font scale, model, effort |
| `src/lib/types.ts` | All shared types and WS message shapes |
| `src/lib/api.ts` | `browse`, `validateCwd`, `fetchSkills`, `uploadImage` |
