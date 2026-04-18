import type { ServerWebSocket } from "bun";
import type { SDKSession } from "@anthropic-ai/claude-agent-sdk";
import type { IPty } from "node-pty";

export const PORT = 3456;
export const MAX_PANELS = 6;
export const MAX_QUEUE_SIZE = 20;

export interface TokenTotals {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  durationMs: number | null;
}

export interface PanelSession {
  sdk: SDKSession;
  cwd: string;
  model: string;
  effort: string;
  active: boolean;
  processing: boolean;
  messageQueue: string[];
}

export interface WsData {
  panelId: number;
}

export interface CreateSessionOpts {
  resume?: string;
  resumeAt?: string;
  mcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>;
  outputFormat?: { type: 'json_schema'; schema: Record<string, unknown> };
}

export interface TerminalSession {
  pty: IPty;
}

export const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
