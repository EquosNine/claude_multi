# Task 02: Types, Stores, WebSocket Client

**Status:** Not started
**Depends on:** Task 01
**Scope:** claude-multi
**Stack:** Svelte 5 + TypeScript
**Creates:** 4 new files

## Goal
Create TypeScript type definitions for all data structures, the slash command registry, and Svelte 5 reactive stores for WebSocket connection and panel state management.

## Files to Create

### 1. `src/lib/types.ts`
All TypeScript interfaces and types used across the app:

```ts
export interface PanelState {
  id: number;
  name: string;
  cwd: string;
  status: 'idle' | 'running' | 'error';
  messages: OutputMessage[];
  ram: number;       // bytes, 0 when not running
  agents: number;    // active agent count
  agentDetails: AgentDetail[];  // tracked agents for monitor
  startTime: number | null;     // Date.now() when started
}

export interface OutputMessage {
  id: string;         // unique ID for keyed rendering
  type: 'user' | 'system' | 'assistant' | 'error' | 'tool' | 'tool-result' | 'done';
  text: string;
  toolName?: string;  // for tool type
}

export interface AgentDetail {
  toolUseId: string;
  description: string;
  status: 'running' | 'done';
  startTime: number;
  output: string;     // accumulated result text
}

export interface SlashCommand {
  cmd: string;
  desc: string;
  cat: string;
  type: 'client' | 'skill';
}

// WebSocket message types (server -> client)
export type WsIncoming =
  | { type: 'claude'; panelId: number; data: ClaudeStreamEvent }
  | { type: 'claude_raw'; panelId: number; data: string }
  | { type: 'stderr'; panelId: number; data: string }
  | { type: 'status'; panelId: number; status: 'running' | 'idle' | 'error' }
  | { type: 'error'; panelId: number; message: string }
  | { type: 'stats'; panelId: number; ram: number; agents: number }
  | { type: 'done'; panelId: number; exitCode: number }
  | { type: 'agent_detail'; panelId: number; agent: { toolUseId: string; description: string; status: string; output?: string } };

// WebSocket message types (client -> server)
export type WsOutgoing =
  | { type: 'prompt'; panelId: number; cwd: string; prompt: string }
  | { type: 'cancel'; panelId: number };

// Claude stream-json event (subset we care about)
export interface ClaudeStreamEvent {
  type: string;
  subtype?: string;
  session_id?: string;
  message?: {
    content: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: any;
      id?: string;
      content?: string | any;
      tool_use_id?: string;
    }>;
  };
  result?: string;
}
```

### 2. `src/lib/commands.ts`
Move the SLASH_COMMANDS registry, CATEGORY_LABELS, and CATEGORY_COLORS from the current index.html. Export them as typed constants:

```ts
import type { SlashCommand } from './types';

export const SLASH_COMMANDS: SlashCommand[] = [
  // Copy the entire array from public/index.html lines 444-532
  // ... all 66 commands ...
];

export const CATEGORY_LABELS: Record<string, string> = {
  // Copy from public/index.html lines 534-546
};

export const CATEGORY_COLORS: Record<string, string> = {
  // Copy from public/index.html lines 548-560
};
```

Copy the COMPLETE arrays from `public/index.html` — do not abbreviate.

### 3. `src/lib/stores/ws.ts`
WebSocket connection store using Svelte 5 runes:

```ts
import type { WsIncoming, WsOutgoing } from '../types';

let socket: WebSocket | null = $state(null);
let connected = $state(false);

type MessageHandler = (msg: WsIncoming) => void;
const handlers = new Set<MessageHandler>();

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.onopen = () => {
    socket = ws;
    connected = true;
  };

  ws.onclose = () => {
    socket = null;
    connected = false;
    setTimeout(connect, 2000);
  };

  ws.onerror = () => {};

  ws.onmessage = (event) => {
    try {
      const msg: WsIncoming = JSON.parse(event.data);
      for (const handler of handlers) {
        handler(msg);
      }
    } catch {}
  };
}

function send(msg: WsOutgoing) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function subscribe(handler: MessageHandler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export const ws = {
  get connected() { return connected; },
  connect,
  send,
  subscribe,
};
```

### 4. `src/lib/stores/panels.ts`
Panel state management with Svelte 5 runes:

```ts
import type { PanelState, OutputMessage, AgentDetail } from '../types';
import { ws } from './ws';

const MAX_PANELS = 6;
const MAX_MESSAGES = 800;

let panels = $state<PanelState[]>([]);
let layout = $state<'columns' | 'grid'>('columns');

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}`;
}

function createPanel(): PanelState | null {
  if (panels.length >= MAX_PANELS) return null;
  const id = panels.length;
  const panel: PanelState = {
    id,
    name: localStorage.getItem(`panel-name-${id}`) || '',
    cwd: localStorage.getItem(`panel-cwd-${id}`) || '',
    status: 'idle',
    messages: [],
    ram: 0,
    agents: 0,
    agentDetails: [],
    startTime: null,
  };
  panels.push(panel);
  savePanelCount();
  return panel;
}

function removePanel(id: number) {
  const idx = panels.findIndex(p => p.id === id);
  if (idx === -1) return;
  const panel = panels[idx];
  if (panel.status === 'running') {
    ws.send({ type: 'cancel', panelId: id });
  }
  panels.splice(idx, 1);
  savePanelCount();
}

function addMessage(panelId: number, msg: OutputMessage) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.messages.push(msg);
  while (panel.messages.length > MAX_MESSAGES) {
    panel.messages.shift();
  }
}

function clearMessages(panelId: number) {
  const panel = panels.find(p => p.id === panelId);
  if (panel) panel.messages = [];
}

function setStatus(panelId: number, status: PanelState['status']) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.status = status;
  if (status === 'running') {
    panel.startTime = Date.now();
  }
}

function updateStats(panelId: number, ram: number, agents: number) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.ram = ram;
  panel.agents = agents;
}

function updateName(panelId: number, name: string) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.name = name;
  localStorage.setItem(`panel-name-${panelId}`, name);
}

function updateCwd(panelId: number, cwd: string) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.cwd = cwd;
  localStorage.setItem(`panel-cwd-${panelId}`, cwd);
}

function toggleLayout() {
  layout = layout === 'columns' ? 'grid' : 'columns';
}

function savePanelCount() {
  localStorage.setItem('panel-count', String(panels.length));
}

function restorePanels() {
  const count = parseInt(localStorage.getItem('panel-count') || '1', 10);
  const n = Math.max(1, Math.min(count, MAX_PANELS));
  for (let i = 0; i < n; i++) createPanel();
}

export const panelStore = {
  get panels() { return panels; },
  get layout() { return layout; },
  get maxPanels() { return MAX_PANELS; },
  createPanel,
  removePanel,
  addMessage,
  clearMessages,
  setStatus,
  updateStats,
  updateName,
  updateCwd,
  toggleLayout,
  restorePanels,
  nextMsgId,
};
```

## Key Patterns to Follow
- Svelte 5 runes: `$state()` for reactive variables, module-level exports as getters
- Types match the WS protocol in server.ts exactly
- Copy the COMPLETE SLASH_COMMANDS array — all 66 entries
- Stores are module-level singletons (not class instances)
- localStorage keys match the existing format (`panel-name-N`, `panel-cwd-N`, `panel-count`)

## Verification
```bash
bun run check
```
TypeScript should compile without errors.
