import { PORT } from "./server/types";
import type { WsData } from "./server/types";
import { findPort } from "./server/utils";
import { db, ftsTimer, walTimer } from "./server/db";
import { closeAllSessions } from "./server/sessions";
import { closeAllTerminals } from "./server/terminal";
import { contentBuffer } from "./server/events";
import { handleHttpRequest } from "./server/routes";
import { wsHandlers } from "./server/ws";

// ── HTTP + WebSocket Server ──

const ACTUAL_PORT = findPort(PORT);

const server = Bun.serve<WsData>({
  port: ACTUAL_PORT,
  reusePort: true,

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const success = server.upgrade(req, { data: { panelId: -1 } });
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return handleHttpRequest(req);
  },

  websocket: wsHandlers,
});

// ── Graceful shutdown & crash protection ──

function cleanup() {
  if (ftsTimer) clearInterval(ftsTimer);
  clearInterval(walTimer);

  closeAllTerminals();
  closeAllSessions();

  for (const [panelId, content] of contentBuffer) {
    if (content) {
      console.warn(`[db] Discarding unflushed content for panel ${panelId} (${content.length} chars)`);
    }
  }
  contentBuffer.clear();

  try { db.close(); } catch {}
  try { server.stop(true); } catch {}
}

process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (kept alive):", err.message);
});
process.on("unhandledRejection", (err: any) => {
  console.error("Unhandled rejection (kept alive):", err?.message || err);
});

console.log(`claude-multi running at http://localhost:${ACTUAL_PORT}`);
