import type { ServerWebSocket } from "bun";
import { existsSync, statSync } from "fs";
import type { WsData, CreateSessionOpts } from "./types";
import { MAX_PANELS, MAX_QUEUE_SIZE } from "./types";
import { sendTo, broadcast, registerSocket, unregisterSocket } from "./utils";
import { getSession, getAllSessions, createSession, closeSession, sendPrompt } from "./sessions";
import { resolveQuestion } from "./questions";
import { createTerminalSession, closeTerminalSession, getTerminalSession } from "./terminal";
import { expandSkill } from "./skills";

export const wsHandlers = {
  open(ws: ServerWebSocket<WsData>) {
    registerSocket(ws);
    for (const [panelId, session] of getAllSessions()) {
      sendTo(ws, { type: "status", panelId, status: session.processing ? "running" : "idle" });
    }
  },

  async message(ws: ServerWebSocket<WsData>, message: string | Buffer) {
    try {
      const msg = JSON.parse(String(message));

      switch (msg.type) {
        case "prompt": {
          const { panelId, cwd, prompt, resume, resumeAt, mcpServers, outputFormat } = msg;
          const model = msg.model || "claude-sonnet-4-6";
          const effort = msg.effort || "high";
          if (panelId < 0 || panelId >= MAX_PANELS) return;
          if (!cwd || !prompt) {
            sendTo(ws, { type: "error", panelId, message: "Missing cwd or prompt" });
            return;
          }

          const normalizedCwd = cwd.replace(/\\/g, "/");

          if (!existsSync(normalizedCwd) || !statSync(normalizedCwd).isDirectory()) {
            sendTo(ws, { type: "error", panelId, message: `Invalid directory: ${cwd}` });
            return;
          }

          const sessionOpts: CreateSessionOpts = { resume, resumeAt, mcpServers, outputFormat };

          let session = getSession(panelId);

          if (session && session.active) {
            // Session alive — restart if cwd, model, or effort changed
            if (session.cwd !== normalizedCwd || session.model !== model || session.effort !== effort) {
              closeSession(panelId);
              session = createSession(panelId, normalizedCwd, model, effort, sessionOpts);
            }
          } else {
            session = createSession(panelId, normalizedCwd, model, effort, sessionOpts);
          }

          // Send prompt directly — handles interjection if already processing
          sendPrompt(panelId, prompt);
          break;
        }
        case "cancel": {
          const { panelId } = msg;
          closeSession(panelId);
          broadcast({ type: "done", panelId, exitCode: 0 });
          broadcast({ type: "status", panelId, status: "idle" });
          break;
        }
        case "question_response": {
          const { panelId, questionId, answer } = msg;
          resolveQuestion(panelId, questionId, answer);
          break;
        }
        case "terminal_create": {
          const { panelId, cwd, cols, rows } = msg;
          createTerminalSession(panelId, cwd, cols, rows);
          break;
        }
        case "terminal_input": {
          const { panelId, data } = msg;
          const term = getTerminalSession(panelId);
          if (term) {
            try { term.pty.write(data); } catch {}
          }
          break;
        }
        case "terminal_resize": {
          const { panelId, cols, rows } = msg;
          const term = getTerminalSession(panelId);
          if (term) {
            try { term.pty.resize(cols, rows); } catch {}
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

  close(ws: ServerWebSocket<WsData>) {
    unregisterSocket(ws);
  },
};
