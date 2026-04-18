import { join } from "path";
import { mkdirSync } from "fs";
import { DuckDBInstance } from "@duckdb/node-api";

const DB_DIR = join(process.env.USERPROFILE || process.env.HOME || "", ".claude-multi");
mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = join(DB_DIR, "conversations.db").replace(/\\/g, "/");

const dbInstance = await DuckDBInstance.create(DB_PATH);
export const db = await dbInstance.connect();

// ── Schema ──

await db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    session_id    TEXT    PRIMARY KEY,
    label         TEXT    NOT NULL DEFAULT '',
    cwd           TEXT    NOT NULL DEFAULT '',
    panel_name    TEXT    NOT NULL DEFAULT '',
    started_at    BIGINT  NOT NULL,
    ended_at      BIGINT,
    starred       INTEGER NOT NULL DEFAULT 0,
    cost_usd      REAL    NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    preview       TEXT    NOT NULL DEFAULT '',
    duration_ms   BIGINT,
    full_content  TEXT    NOT NULL DEFAULT ''
  )
`);

// ── Migrate INTEGER → BIGINT for existing tables ──
try {
  await db.run(`ALTER TABLE conversations ALTER COLUMN started_at TYPE BIGINT`);
  await db.run(`ALTER TABLE conversations ALTER COLUMN ended_at TYPE BIGINT`);
  await db.run(`ALTER TABLE conversations ALTER COLUMN duration_ms TYPE BIGINT`);
} catch {}

// ── Indexes ──
await db.run(`CREATE INDEX IF NOT EXISTS idx_conv_started ON conversations(started_at DESC)`);
await db.run(`CREATE INDEX IF NOT EXISTS idx_conv_starred ON conversations(starred, started_at DESC)`);

// ── FTS extension ──
export let ftsAvailable = false;
try {
  await db.run(`INSTALL fts; LOAD fts;`);
  await db.run(`PRAGMA create_fts_index('conversations', 'session_id', 'label', 'full_content', overwrite=1)`);
  ftsAvailable = true;
  console.log("[db] FTS index built");
} catch (err: any) {
  console.warn("[db] FTS unavailable:", err.message ?? err);
}

const FTS_REINDEX_MS = 5 * 60 * 1000;
export let ftsTimer: ReturnType<typeof setInterval> | null = null;
if (ftsAvailable) {
  ftsTimer = setInterval(async () => {
    try {
      await db.run(`PRAGMA create_fts_index('conversations', 'session_id', 'label', 'full_content', overwrite=1)`);
    } catch {}
  }, FTS_REINDEX_MS);
}

export const walTimer = setInterval(async () => {
  try { await db.run(`CHECKPOINT`); } catch {}
}, 10 * 60 * 1000);

// ── Helpers ──

export function rowToRecord(row: any): Record<string, any> {
  return {
    sessionId:    row.session_id    ?? '',
    label:        row.label         ?? '',
    cwd:          row.cwd           ?? '',
    panelName:    row.panel_name    ?? '',
    startedAt:    Number(row.started_at  ?? 0),
    endedAt:      row.ended_at != null ? Number(row.ended_at) : null,
    starred:      Boolean(row.starred),
    costUsd:      Number(row.cost_usd      ?? 0),
    messageCount: Number(row.message_count ?? 0),
    preview:      row.preview       ?? '',
    durationMs:   row.duration_ms != null ? Number(row.duration_ms) : null,
  };
}
