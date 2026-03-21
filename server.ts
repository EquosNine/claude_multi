import { type ServerWebSocket } from "bun";
import { join } from "path";
import { existsSync, statSync, readdirSync, readFileSync, mkdirSync } from "fs";
import { unstable_v2_createSession, unstable_v2_resumeSession, type SDKSession } from "@anthropic-ai/claude-agent-sdk";
import { spawn as spawnPty, type IPty } from "node-pty";

const PORT = 3456;
const MAX_PANELS = 6;
const MAX_QUEUE_SIZE = 20;

// ── Panel Session ──

interface PanelSession {
  sdk: SDKSession;
  cwd: string;
  active: boolean;
  processing: boolean;
  messageQueue: string[];
}

interface WsData {
  panelId: number;
}

const sessions = new Map<number, PanelSession>();
const sockets = new Set<ServerWebSocket<WsData>>();

// ── Terminal Sessions ──

interface TerminalSession {
  pty: IPty;
}

const terminalSessions = new Map<number, TerminalSession>();

function createTerminalSession(panelId: number, cwd: string, cols: number, rows: number) {
  // Kill existing terminal for this panel if any
  const existing = terminalSessions.get(panelId);
  if (existing) {
    try { existing.pty.kill(); } catch {}
    terminalSessions.delete(panelId);
  }

  const shell = process.platform === "win32"
    ? "powershell.exe"
    : (process.env.SHELL || "bash");

  const resolvedCwd = cwd && existsSync(cwd.replace(/\\/g, "/"))
    ? cwd.replace(/\\/g, "/")
    : (process.env.USERPROFILE || process.env.HOME || "/");

  const ptyProcess = spawnPty(shell, [], {
    name: "xterm-256color",
    cols: cols || 80,
    rows: rows || 24,
    cwd: resolvedCwd,
    env: process.env as Record<string, string>,
  });

  ptyProcess.onData((data) => {
    broadcast({ type: "terminal_output", panelId, data });
  });

  ptyProcess.onExit(({ exitCode }) => {
    broadcast({ type: "terminal_exit", panelId, code: exitCode });
    terminalSessions.delete(panelId);
  });

  terminalSessions.set(panelId, { pty: ptyProcess });
}

function closeTerminalSession(panelId: number) {
  const term = terminalSessions.get(panelId);
  if (!term) return;
  try { term.pty.kill(); } catch {}
  terminalSessions.delete(panelId);
}

function sendTo(ws: ServerWebSocket<WsData>, msg: object) {
  try { ws.send(JSON.stringify(msg)); } catch {}
}

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  for (const ws of sockets) {
    try { ws.send(data); } catch {}
  }
}

function createSession(panelId: number, cwd: string, resume?: string): PanelSession {
  // Close existing session if any
  closeSession(panelId);

  const options = {
    model: "sonnet",
    cwd,
    executable: "node" as const,
    allowedTools: [
      "Bash", "Read", "Write", "Edit", "Glob", "Grep",
      "Agent", "WebSearch", "WebFetch",
    ],
  };

  const sdk = resume
    ? unstable_v2_resumeSession(resume, options)
    : unstable_v2_createSession(options);

  const session: PanelSession = {
    sdk,
    cwd,
    active: true,
    processing: false,
    messageQueue: [],
  };
  sessions.set(panelId, session);
  return session;
}

function handleEvent(panelId: number, event: any) {
  broadcast({ type: "claude", panelId, data: event });

  // Track sub-agent tool_use / tool_result
  if (event.type === "assistant" && Array.isArray(event.message?.content)) {
    for (const block of event.message.content) {
      if (block.type === "tool_use" && block.name === "Agent" && block.id) {
        const inp = block.input || {};
        broadcast({
          type: "agent_detail",
          panelId,
          agent: {
            toolUseId: block.id,
            description: (inp.description || inp.prompt || "").slice(0, 100),
            status: "running",
          },
        });
      }
    }
  }
  if (event.type === "user" && Array.isArray(event.message?.content)) {
    for (const block of event.message.content) {
      if (block.type === "tool_result" && block.tool_use_id) {
        const output = typeof block.content === "string"
          ? block.content.slice(0, 500)
          : JSON.stringify(block.content).slice(0, 500);
        broadcast({
          type: "agent_detail",
          panelId,
          agent: {
            toolUseId: block.tool_use_id,
            description: "",
            status: "done",
            output,
          },
        });
      }
    }
  }
}

async function processQueue(panelId: number) {
  const session = sessions.get(panelId);
  if (!session || !session.active || session.processing) return;
  if (session.messageQueue.length === 0) return;

  session.processing = true;
  const prompt = session.messageQueue.shift()!;

  broadcast({ type: "status", panelId, status: "running" });

  try {
    // Start streaming first — this kicks off the subprocess
    const streamIter = session.sdk.stream();

    // Kick off the first .next() to initialize the process, concurrently with send
    const firstChunk = streamIter.next();

    // Send the prompt (process should be initializing)
    await session.sdk.send(prompt);

    // Process the first event
    const first = await firstChunk;
    if (!first.done && session.active) {
      handleEvent(panelId, first.value);
    }

    // Stream remaining events
    for await (const event of streamIter) {
      if (!session.active) break;
      handleEvent(panelId, event);
    }
  } catch (err: any) {
    broadcast({ type: "error", panelId, message: `Session error: ${err.message}` });
  }

  session.processing = false;

  // Process next queued message if any
  if (session.active && session.messageQueue.length > 0) {
    processQueue(panelId);
  } else if (session.active) {
    // Turn done — waiting for next user input
    broadcast({ type: "status", panelId, status: "idle" });
  }
}

// ── Skill Expansion ──

function expandSkill(prompt: string): string {
  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const globalSkillsDir = join(homeDir, ".claude", "skills");

  // Match /skillname at start of string or after whitespace, capturing the prefix
  return prompt.replace(/(^|\s)\/([a-zA-Z0-9][a-zA-Z0-9_-]*)/g, (match, prefix, skillName) => {
    const skillPath = join(globalSkillsDir, skillName, "SKILL.md");
    if (!existsSync(skillPath)) return match;

    let content = readFileSync(skillPath, "utf-8");
    // Strip YAML frontmatter
    content = content.replace(/^---[\s\S]*?---\s*\n/, "").trim();
    return prefix + content;
  });
}

function closeSession(panelId: number) {
  const session = sessions.get(panelId);
  if (!session) return;
  session.active = false;
  try { session.sdk.close(); } catch {}
  sessions.delete(panelId);
}

// ── MIME types ──

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// ── HTTP + WebSocket Server ──

function findPort(preferred: number): number {
  for (let p = preferred; p < preferred + 10; p++) {
    try {
      const test = Bun.listen({ hostname: "0.0.0.0", port: p, socket: {
        data() {}, open() {}, close() {}, error() {},
      }});
      test.stop(true);
      return p;
    } catch {}
  }
  return preferred;
}

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

    // Upload API — save pasted images to disk so Claude can read them
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

    // Skills API — global ~/.claude/skills/ + project-level commands/agents
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

    // Static file serving from dist/
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const fullPath = join(import.meta.dir, "dist", filePath);

    // Check if file exists before serving
    if (!existsSync(fullPath)) {
      return new Response("Not found", { status: 404 });
    }

    const file = Bun.file(fullPath);
    const ext = filePath.substring(filePath.lastIndexOf("."));

    return new Response(file, {
      headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
    });
  },

  websocket: {
    open(ws) {
      sockets.add(ws);
      // Send current status of all active sessions
      for (const [panelId, session] of sessions) {
        sendTo(ws, { type: "status", panelId, status: session.processing ? "running" : "idle" });
      }
    },

    async message(ws, message) {
      try {
        const msg = JSON.parse(String(message));

        switch (msg.type) {
          case "prompt": {
            const { panelId, cwd, prompt, resume } = msg;
            if (panelId < 0 || panelId >= MAX_PANELS) return;
            if (!cwd || !prompt) {
              sendTo(ws, { type: "error", panelId, message: "Missing cwd or prompt" });
              return;
            }

            const normalizedCwd = cwd.replace(/\\/g, "/");

            // Get existing session or create new one
            let session = sessions.get(panelId);

            if (session && session.active) {
              // Session alive — if cwd changed, restart (ignore resume when continuing existing session)
              if (session.cwd !== normalizedCwd) {
                closeSession(panelId);
                session = createSession(panelId, normalizedCwd);
              }
            } else {
              // New session — resume from prior session ID if provided
              session = createSession(panelId, normalizedCwd, resume);
            }

            // Queue message and process (expand skill/slash commands server-side)
            if (session.messageQueue.length >= MAX_QUEUE_SIZE) {
              sendTo(ws, { type: "error", panelId, message: "Message queue full — wait for current tasks to complete." });
              return;
            }
            session.messageQueue.push(expandSkill(prompt));
            processQueue(panelId);
            break;
          }
          case "cancel": {
            const { panelId } = msg;
            closeSession(panelId);
            broadcast({ type: "done", panelId, exitCode: 0 });
            broadcast({ type: "status", panelId, status: "idle" });
            break;
          }
          case "terminal_create": {
            const { panelId, cwd, cols, rows } = msg;
            createTerminalSession(panelId, cwd, cols, rows);
            break;
          }
          case "terminal_input": {
            const { panelId, data } = msg;
            const term = terminalSessions.get(panelId);
            if (term) {
              try { term.pty.write(data); } catch { terminalSessions.delete(panelId); }
            }
            break;
          }
          case "terminal_resize": {
            const { panelId, cols, rows } = msg;
            const term = terminalSessions.get(panelId);
            if (term) {
              try { term.pty.resize(cols, rows); } catch { terminalSessions.delete(panelId); }
            }
            break;
          }
          case "terminal_kill": {
            const { panelId } = msg;
            closeTerminalSession(panelId);
            break;
          }
        }
      } catch (err: any) {
        sendTo(ws, { type: "error", panelId: -1, message: `Invalid message: ${err.message}` });
      }
    },

    close(ws) {
      sockets.delete(ws);
    },
  },
});

// ── Graceful shutdown & crash protection ──

function cleanup() {
  for (const [id] of terminalSessions) closeTerminalSession(id);
  for (const [id] of sessions) closeSession(id);
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
