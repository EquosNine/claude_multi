import { existsSync } from "fs";
import { spawn as spawnPty } from "node-pty";
import type { TerminalSession } from "./types";
import { broadcast } from "./utils";

const terminalSessions = new Map<number, TerminalSession>();

export function createTerminalSession(panelId: number, cwd: string, cols: number, rows: number) {
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

export function closeTerminalSession(panelId: number) {
  const term = terminalSessions.get(panelId);
  if (!term) return;
  try { term.pty.kill(); } catch {}
  terminalSessions.delete(panelId);
}

export function getTerminalSession(panelId: number) {
  return terminalSessions.get(panelId);
}

export function closeAllTerminals() {
  for (const [id] of terminalSessions) closeTerminalSession(id);
}
