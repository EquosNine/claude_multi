import { type ServerWebSocket } from "bun";
import { join } from "path";
import { existsSync, statSync, readdirSync } from "fs";
import { unstable_v2_createSession, unstable_v2_resumeSession, type SDKSession } from "@anthropic-ai/claude-agent-sdk";
import { spawn as spawnPty, type IPty } from "node-pty";

const PORT = 3456;
const MAX_PANELS = 6;

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

const server = Bun.serve<WsData>({
  port: PORT,

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

            // Queue message and process
            session.messageQueue.push(prompt);
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
            if (term) term.pty.write(data);
            break;
          }
          case "terminal_resize": {
            const { panelId, cols, rows } = msg;
            const term = terminalSessions.get(panelId);
            if (term) term.pty.resize(cols, rows);
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

console.log(`claude-multi running at http://localhost:${PORT}`);
