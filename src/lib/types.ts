export type ModelId = 'claude-sonnet-4-6' | 'claude-opus-4-6' | 'claude-haiku-4-5-20251001';
export type EffortLevel = 'low' | 'medium' | 'high' | 'max';

export interface PanelState {
  id: number;
  panelType: 'claude' | 'terminal';
  name: string;
  cwd: string;
  group: string;     // tab group this panel belongs to
  status: 'idle' | 'running' | 'error';
  model: ModelId;               // per-panel model override
  effort: EffortLevel;          // per-panel effort override
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
  suggestions: string[];              // prompt suggestions from SDK
  mcpServers: string[];               // names of enabled MCP servers for this panel
  structuredOutputEnabled: boolean;   // whether structured output mode is on
  structuredOutputSchema: string;     // raw JSON schema string for structured output
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

export interface QuestionOption {
  key: string;
  label: string;
  description?: string;
  preview?: string;    // HTML or markdown preview content
}

export interface OutputMessage {
  id: string;         // unique ID for keyed rendering
  type: 'user' | 'system' | 'assistant' | 'error' | 'tool' | 'tool-result' | 'done' | 'question';
  text: string;
  toolName?: string;  // for tool type
  uuid?: string;      // SDK message UUID for conversation branching
  isStructuredOutput?: boolean;  // true if this is structured JSON output
  questionId?: string;           // request ID for AskUserQuestion
  questionOptions?: QuestionOption[];  // selectable options
  questionAnswered?: boolean;    // true once user has responded
  streaming?: boolean;           // true while text is being streamed token-by-token
}

export interface AgentDetail {
  toolUseId: string;
  description: string;
  status: 'running' | 'done';
  startTime: number;
  output: string;           // accumulated result text
  progressSummary: string;  // latest AI-generated progress summary
  lastToolName: string;     // last tool used by this agent
}

export interface CostData {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  durationMs: number | null;
}

export interface SlashCommand {
  cmd: string;
  desc: string;
  cat: string;
  type?: 'client' | 'skill';
}

export interface McpServerEntry {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
}

// WebSocket message types (server -> client)
export type WsIncoming =
  | { type: 'claude'; panelId: number; data: ClaudeStreamEvent }
  | { type: 'status'; panelId: number; status: 'running' | 'idle' | 'error' }
  | { type: 'error'; panelId: number; message: string }
  | { type: 'done'; panelId: number; exitCode: number }
  | { type: 'agent_detail'; panelId: number; agent: { toolUseId: string; description: string; status: string; output?: string } }
  | { type: 'agent_progress'; panelId: number; toolUseId: string; summary: string; lastToolName: string }
  | { type: 'token_update'; panelId: number; costUsd: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number; durationMs: number | null }
  | { type: 'prompt_suggestion'; panelId: number; suggestion: string }
  | { type: 'structured_output'; panelId: number; data: unknown }
  | { type: 'session_cwd'; panelId: number; cwd: string }
  | { type: 'question'; panelId: number; questionId: string; question: string; options: QuestionOption[] }
  | { type: 'text_stream_start'; panelId: number; uuid?: string }
  | { type: 'text_delta'; panelId: number; text: string }
  | { type: 'text_stream_end'; panelId: number }
  | { type: 'terminal_output'; panelId: number; data: string }
  | { type: 'terminal_exit'; panelId: number; code: number };

// WebSocket message types (client -> server)
export type WsOutgoing =
  | { type: 'prompt'; panelId: number; cwd: string; prompt: string; resume?: string; resumeAt?: string; model?: string; effort?: string; mcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>; outputFormat?: { type: 'json_schema'; schema: Record<string, unknown> } }
  | { type: 'cancel'; panelId: number }
  | { type: 'question_response'; panelId: number; questionId: string; answer: string }
  | { type: 'terminal_create'; panelId: number; cwd: string; cols: number; rows: number }
  | { type: 'terminal_input'; panelId: number; data: string }
  | { type: 'terminal_resize'; panelId: number; cols: number; rows: number }
  | { type: 'terminal_kill'; panelId: number };

// Claude stream-json event (subset we care about)
export interface ClaudeStreamEvent {
  type: string;
  subtype?: string;
  session_id?: string;
  uuid?: string;              // message UUID for conversation branching
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
  structured_output?: unknown; // parsed structured output when outputFormat is set
  suggestion?: string;         // prompt suggestion text
  cost_usd?: number;
  total_cost_usd?: number;
  duration_ms?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  // Agent progress fields
  task_id?: string;
  tool_use_id?: string;
  description?: string;
  summary?: string;
  last_tool_name?: string;
}
