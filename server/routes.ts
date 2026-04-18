import { join } from "path";
import { existsSync, statSync, readdirSync, readFileSync, mkdirSync } from "fs";
import { db, ftsAvailable, rowToRecord } from "./db";
import { MIME } from "./types";

export async function handleHttpRequest(req: Request): Promise<Response | undefined> {
  const url = new URL(req.url);

  // Server working directory
  if (url.pathname === "/api/cwd") {
    return Response.json({ cwd: process.cwd() });
  }

  // Directory browsing API
  if (url.pathname === "/api/browse") {
    const dirPath = url.searchParams.get("path") || "";

    if (!dirPath) {
      if (process.platform === "win32") {
        try {
          const proc = Bun.spawn(
            ["powershell", "-NoProfile", "-Command",
             "(Get-PSDrive -PSProvider FileSystem).Root"],
            { stdout: "pipe", stderr: "ignore" }
          );
          const text = await new Response(proc.stdout).text();
          const drives = text.trim().split("\n").map(d => d.trim()).filter(Boolean);
          return Response.json({ path: "", entries: drives.map(d => ({ name: d, path: d })) });
        } catch {
          return Response.json({ path: "", entries: [] });
        }
      }
      return Response.json({ path: "/", entries: [{ name: "/", path: "/" }] });
    }

    try {
      const normalizedPath = dirPath.replace(/\\/g, "/");
      if (!existsSync(normalizedPath) || !statSync(normalizedPath).isDirectory()) {
        return Response.json({ error: "Not a directory" }, { status: 400 });
      }

      const entries = readdirSync(normalizedPath, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(e => ({
          name: e.name,
          path: join(normalizedPath, e.name).replace(/\\/g, "/"),
        }));

      return Response.json({ path: normalizedPath, entries });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  // Upload API
  if (url.pathname === "/api/upload" && req.method === "POST") {
    try {
      const body = await req.json() as { cwd: string; filename: string; data: string };
      const { cwd, filename, data } = body;
      const uploadDir = join(cwd.replace(/\\/g, "/"), ".claude-uploads");
      mkdirSync(uploadDir, { recursive: true });
      const filePath = join(uploadDir, filename).replace(/\\/g, "/");
      await Bun.write(filePath, Buffer.from(data, "base64"));
      return Response.json({ path: filePath });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  // Skills API
  if (url.pathname === "/api/skills") {
    const cwd = url.searchParams.get("cwd") || "";
    const homeDir = process.env.USERPROFILE || process.env.HOME || "";
    const globalSkillsDir = join(homeDir, ".claude", "skills");

    function parseDesc(mdPath: string): string {
      try {
        const content = readFileSync(mdPath, "utf-8");
        for (const line of content.split("\n")) {
          const t = line.trim();
          if (t && !t.startsWith("#") && !t.startsWith("---")) return t.slice(0, 80);
        }
      } catch {}
      return "";
    }

    const global: object[] = [];
    if (existsSync(globalSkillsDir)) {
      for (const e of readdirSync(globalSkillsDir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          const desc = parseDesc(join(globalSkillsDir, e.name, "SKILL.md"));
          global.push({ cmd: `/${e.name}`, desc, cat: "my-skills" });
        }
      }
    }

    const project: object[] = [];
    const agents: object[] = [];
    if (cwd) {
      const norm = cwd.replace(/\\/g, "/");
      const commandsDir = join(norm, ".claude", "commands");
      const agentsDir = join(norm, ".claude", "agents");
      if (existsSync(commandsDir)) {
        for (const e of readdirSync(commandsDir, { withFileTypes: true })) {
          if (e.isFile() && e.name.endsWith(".md")) {
            const name = e.name.replace(/\.md$/, "");
            project.push({ cmd: `/${name}`, desc: parseDesc(join(commandsDir, e.name)), cat: "project-cmds" });
          }
        }
      }
      if (existsSync(agentsDir)) {
        for (const e of readdirSync(agentsDir, { withFileTypes: true })) {
          if (e.isFile() && e.name.endsWith(".md")) {
            const name = e.name.replace(/\.md$/, "");
            agents.push({ cmd: `/${name}`, desc: parseDesc(join(agentsDir, e.name)), cat: "project-agents" });
          }
        }
      }
    }

    return Response.json({ global, project, agents });
  }

  // ── Conversations API ──

  if (url.pathname === "/api/conversations" && req.method === "GET") {
    try {
      const q = url.searchParams.get("q")?.trim() ?? "";
      const starred = url.searchParams.get("starred") === "1";
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "500", 10), 1000);
      const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

      let sql: string;
      let params: any[];

      if (q && ftsAvailable) {
        sql = `SELECT session_id, label, cwd, panel_name, started_at, ended_at, starred,
                      cost_usd, message_count, preview, duration_ms
               FROM conversations
               WHERE fts_main_conversations.match_bm25(session_id, ?) IS NOT NULL
               ${starred ? "AND starred = 1" : ""}
               ORDER BY started_at DESC LIMIT ? OFFSET ?`;
        params = [q, limit, offset];
      } else if (q) {
        const pattern = '%' + q + '%';
        sql = `SELECT session_id, label, cwd, panel_name, started_at, ended_at, starred,
                      cost_usd, message_count, preview, duration_ms
               FROM conversations
               WHERE (label ILIKE ? OR preview ILIKE ?)
               ${starred ? "AND starred = 1" : ""}
               ORDER BY started_at DESC LIMIT ? OFFSET ?`;
        params = [pattern, pattern, limit, offset];
      } else {
        sql = `SELECT session_id, label, cwd, panel_name, started_at, ended_at, starred,
                      cost_usd, message_count, preview, duration_ms
               FROM conversations
               ${starred ? "WHERE starred = 1" : ""}
               ORDER BY started_at DESC LIMIT ? OFFSET ?`;
        params = [limit, offset];
      }

      const result = await db.runAndReadAll(sql, params);
      const conversations = result.getRowObjects().map(rowToRecord);
      return Response.json({ conversations });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (url.pathname === "/api/conversations/search" && req.method === "GET") {
    try {
      const q = url.searchParams.get("q")?.trim() ?? "";
      if (!q) return Response.json({ conversations: [] });

      const cols = `session_id, label, cwd, panel_name, started_at, ended_at, starred,
                    cost_usd, message_count, preview, duration_ms`;
      let result;
      if (ftsAvailable) {
        result = await db.runAndReadAll(
          `SELECT ${cols} FROM conversations
           WHERE fts_main_conversations.match_bm25(session_id, ?) IS NOT NULL
           ORDER BY started_at DESC LIMIT 50`,
          [q]
        );
      } else {
        const pattern = '%' + q + '%';
        result = await db.runAndReadAll(
          `SELECT ${cols} FROM conversations
           WHERE (label ILIKE ? OR preview ILIKE ?)
           ORDER BY started_at DESC LIMIT 50`,
          [pattern, pattern]
        );
      }
      return Response.json({ conversations: result.getRowObjects().map(rowToRecord) });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (url.pathname === "/api/conversations" && req.method === "POST") {
    try {
      const body = await req.json() as any;
      await db.run(
        `INSERT INTO conversations
           (session_id, label, cwd, panel_name, started_at, ended_at, starred,
            cost_usd, message_count, preview, duration_ms, full_content)
         VALUES (?, ?, ?, ?, ?, NULL, 0, 0, 0, '', NULL, '')
         ON CONFLICT(session_id) DO NOTHING`,
        [body.sessionId, body.label ?? '', body.cwd ?? '',
         body.panelName ?? '', body.startedAt ?? Date.now()]
      );
      return Response.json({ ok: true });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  const convMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
  if (convMatch && req.method === "PATCH") {
    try {
      const sessionId = decodeURIComponent(convMatch[1]);
      const body = await req.json() as Record<string, any>;

      const colMap: Record<string, string> = {
        endedAt: "ended_at", costUsd: "cost_usd", messageCount: "message_count",
        preview: "preview", durationMs: "duration_ms", starred: "starred",
        label: "label", cwd: "cwd", panelName: "panel_name",
      };

      const sets: string[] = [];
      const vals: any[] = [];
      for (const [k, v] of Object.entries(body)) {
        const col = colMap[k];
        if (col) { sets.push(`${col} = ?`); vals.push(v); }
      }
      if (sets.length === 0) return Response.json({ ok: true });
      vals.push(sessionId);
      await db.run(`UPDATE conversations SET ${sets.join(", ")} WHERE session_id = ?`, vals);
      return Response.json({ ok: true });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }
  if (convMatch && req.method === "DELETE") {
    try {
      const sessionId = decodeURIComponent(convMatch[1]);
      await db.run(`DELETE FROM conversations WHERE session_id = ?`, [sessionId]);
      return Response.json({ ok: true });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  // Static file serving from dist/
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = join(import.meta.dir, "..", "dist", filePath);

  if (!existsSync(fullPath)) {
    return new Response("Not found", { status: 404 });
  }

  const file = Bun.file(fullPath);
  const ext = filePath.substring(filePath.lastIndexOf("."));

  return new Response(file, {
    headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
  });
}
