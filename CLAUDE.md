# claude-multi

Multi-panel browser UI for running multiple Claude Code CLI instances in parallel.

## Tech Stack

- **Runtime:** Bun (v1.3.11)
- **Backend:** TypeScript (server.ts) — Bun HTTP + WebSocket server
- **Frontend:** Vanilla HTML/CSS/JS (public/index.html)
- **CLI Integration:** Spawns `claude` CLI processes with `--print` + `--output-format stream-json --verbose`

## Architecture

- `server.ts` — Bun server: static file serving, WebSocket relay, Claude CLI process management
- `public/index.html` — Single-page app with panel-based UI
- WebSocket protocol: JSON messages between browser panels and server
- Server spawns one `claude -p` process per panel, streams stdout JSON back via WS

## Build / Run

```bash
bun run server.ts        # start server on port 3456
bun --watch run server.ts # dev mode with auto-reload
```

## Conventions

- Keep it simple — minimal dependencies
- All frontend code in `public/`
- Dark theme UI with CSS custom properties
- Panel IDs are 0-indexed integers (max 6)
