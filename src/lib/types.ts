export interface PanelState {
  id: number;
  name: string;
  cwd: string;
  group: string;     // tab group this panel belongs to
  status: 'idle' | 'running' | 'error';
  messages: OutputMessage[];
  agentDetails: AgentDetail[];  // tracked agents for monitor
  startTime: number | null;     // Date.now() when started
  sessionId: string | null;     // current/last Claude session ID
  costUsd: number;              // cumulative cost in USD
  inputTokens: number;          // cumulative input tokens
  outputTokens: number;         // cumulative output tokens
  cacheReadTokens: number;      // cumulative cache-read tokens (from result events)
  cacheCreationTokens: number;  // cumulative cache-write tokens (from result events)
  lastTurnDurationMs: number | null;  // duration_ms from the most recent result event
}

export interface SessionRecord {
  id: string;        // Claude session ID
  cwd: string;       // working directory used
  timestamp: number;  // when the session started
  label: string;     // first prompt or auto-label
}

export interface ConversationRecord {
  sessionId: string;         // Claude session ID (resume token)
  label: string;             // first user prompt ≤150 chars
  cwd: string;
  panelName: string;         // panel name at conversation start
  startedAt: number;
  endedAt: number | null;    // null if interrupted
  starred: boolean;
  costUsd: number;
  messageCount: number;
  preview: string;           // last assistant snippet ≤300 chars
  durationMs: number | null;
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
  | { type: 'status'; panelId: number; status: 'running' | 'idle' | 'error' }
  | { type: 'error'; panelId: number; message: string }
  | { type: 'done'; panelId: number; exitCode: number }
  | { type: 'agent_detail'; panelId: number; agent: { toolUseId: string; description: string; status: string; output?: string } };

// WebSocket message types (client -> server)
export type WsOutgoing =
  | { type: 'prompt'; panelId: number; cwd: string; prompt: string; resume?: string }
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
      is_error?: boolean;
    }>;
  };
  result?: string;
  cost_usd?: number;
  total_cost_usd?: number;
  duration_ms?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}
