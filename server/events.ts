import type { TokenTotals } from "./types";
import { broadcast } from "./utils";
import { db } from "./db";

// Buffer assistant text per panel during streaming
export const contentBuffer = new Map<number, string>();

// Running token/cost accumulators per panel (reset on new session)
const panelTokens = new Map<number, TokenTotals>();

// Track which panels are currently streaming a text content block
const streamingTextBlock = new Map<number, boolean>();

export function resetTokens(panelId: number) {
  panelTokens.set(panelId, {
    costUsd: 0, inputTokens: 0, outputTokens: 0,
    cacheReadTokens: 0, cacheCreationTokens: 0, durationMs: null,
  });
}

export function handleEvent(panelId: number, event: any) {
  // Don't broadcast raw stream_events — send parsed text deltas instead
  if (event.type !== 'stream_event') {
    broadcast({ type: "claude", panelId, data: event });
  }

  // ── Token-level text streaming ──
  if (event.type === 'stream_event' && event.event) {
    const se = event.event;
    if (se.type === 'content_block_start') {
      if (se.content_block?.type === 'text') {
        streamingTextBlock.set(panelId, true);
        broadcast({ type: 'text_stream_start', panelId, uuid: event.uuid });
      } else {
        streamingTextBlock.set(panelId, false);
      }
    } else if (se.type === 'content_block_delta' && se.delta?.type === 'text_delta' && streamingTextBlock.get(panelId)) {
      broadcast({ type: 'text_delta', panelId, text: se.delta.text });
    } else if (se.type === 'content_block_stop' && streamingTextBlock.get(panelId)) {
      streamingTextBlock.set(panelId, false);
      broadcast({ type: 'text_stream_end', panelId });
    }
  }

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
          ? block.content.slice(0, 2000)
          : JSON.stringify(block.content).slice(0, 2000);
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

  // Prompt suggestions
  if (event.type === "prompt_suggestion" && event.suggestion) {
    broadcast({ type: "prompt_suggestion", panelId, suggestion: event.suggestion });
  }

  // Agent progress summaries
  if (event.type === "system" && event.subtype === "task_progress") {
    broadcast({
      type: "agent_progress",
      panelId,
      toolUseId: event.tool_use_id || event.task_id || "",
      summary: event.summary || "",
      lastToolName: event.last_tool_name || "",
    });
  }

  // Structured output from result
  if (event.type === "result" && event.structured_output != null) {
    broadcast({ type: "structured_output", panelId, data: event.structured_output });
  }

  // Accumulate assistant text for full_content DB storage
  if (event.type === "assistant" && Array.isArray(event.message?.content)) {
    for (const block of event.message.content) {
      if (block.type === "text" && typeof block.text === "string") {
        contentBuffer.set(panelId, (contentBuffer.get(panelId) ?? "") + block.text + "\n");
      }
    }
  }

  // On result event — accumulate tokens from all agents (including sub-agents)
  if (event.type === "result") {
    if (!panelTokens.has(panelId)) resetTokens(panelId);
    const t = panelTokens.get(panelId)!;
    t.costUsd += event.cost_usd ?? 0;
    t.inputTokens += event.usage?.input_tokens ?? 0;
    t.outputTokens += event.usage?.output_tokens ?? 0;
    t.cacheReadTokens += event.usage?.cache_read_input_tokens ?? 0;
    t.cacheCreationTokens += event.usage?.cache_creation_input_tokens ?? 0;
    if (event.duration_ms != null) t.durationMs = event.duration_ms;
    broadcast({ type: "token_update", panelId, ...t });
  }

  // On result event — flush buffered content to DB
  if (event.type === "result" && event.session_id) {
    const content = contentBuffer.get(panelId) ?? "";
    if (content) {
      db.run(
        `UPDATE conversations SET full_content = full_content || ? WHERE session_id = ?`,
        [content, event.session_id]
      ).then(() => {
        contentBuffer.delete(panelId);
      }).catch((err: any) => {
        console.error(`[db] Failed to flush content for panel ${panelId}:`, err.message ?? err);
      });
    } else {
      contentBuffer.delete(panelId);
    }
  }
}
