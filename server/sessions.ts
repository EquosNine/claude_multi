import { unstable_v2_createSession, unstable_v2_resumeSession } from "@anthropic-ai/claude-agent-sdk";
import type { PanelSession, CreateSessionOpts } from "./types";
import { broadcast } from "./utils";
import { waitForQuestionAnswer } from "./questions";
import { handleEvent, resetTokens } from "./events";
import { expandSkill } from "./skills";

const sessions = new Map<number, PanelSession>();

export function getSession(panelId: number) {
  return sessions.get(panelId);
}

export function getAllSessions() {
  return sessions;
}

export function closeSession(panelId: number) {
  const session = sessions.get(panelId);
  if (!session) return;
  session.active = false;
  try { session.sdk.close(); } catch {}
  sessions.delete(panelId);
}

export function closeAllSessions() {
  for (const [id] of sessions) closeSession(id);
}

export function createSession(panelId: number, cwd: string, model: string, effort: string, opts: CreateSessionOpts = {}): PanelSession {
  closeSession(panelId);

  const options: Record<string, any> = {
    model,
    cwd,
    executable: "node" as const,
    effort: effort as 'low' | 'medium' | 'high' | 'max',
    promptSuggestions: true,
    agentProgressSummaries: true,
    allowedTools: [
      "Bash", "Read", "Write", "Edit", "Glob", "Grep",
      "Agent", "WebSearch", "WebFetch",
    ],
    toolConfig: {
      askUserQuestion: { previewFormat: 'html' },
    },
    canUseTool: async (toolName: string, input: Record<string, unknown>, toolOpts: { signal: AbortSignal; toolUseID: string }) => {
      if (toolName === "AskUserQuestion") {
        const question = (input.question as string) || "";
        const rawOptions = (input.options as any[]) || [];
        const questionOptions = rawOptions.map((o: any) => ({
          key: o.key || o.value || String(o),
          label: o.label || o.value || String(o),
          description: o.description || undefined,
          preview: o.preview || undefined,
        }));

        broadcast({
          type: "question",
          panelId,
          questionId: toolOpts.toolUseID,
          question,
          options: questionOptions,
        });

        const answer = await waitForQuestionAnswer(panelId, toolOpts.toolUseID);

        return {
          behavior: "deny" as const,
          message: answer,
        };
      }

      return { behavior: "allow" as const };
    },
  };

  if (opts.mcpServers && Object.keys(opts.mcpServers).length > 0) {
    options.mcpServers = opts.mcpServers;
  }

  if (opts.outputFormat) {
    options.outputFormat = opts.outputFormat;
  }

  if (opts.resumeAt) {
    options.resumeSessionAt = opts.resumeAt;
  }

  const sdk = opts.resume
    ? unstable_v2_resumeSession(opts.resume, options)
    : unstable_v2_createSession(options);

  const session: PanelSession = {
    sdk,
    cwd,
    model,
    effort,
    active: true,
    processing: false,
    messageQueue: [],
  };
  sessions.set(panelId, session);
  resetTokens(panelId);
  broadcast({ type: "session_cwd", panelId, cwd });
  return session;
}

// Send a prompt to a session — handles both fresh sends and interjections
export async function sendPrompt(panelId: number, prompt: string) {
  const session = sessions.get(panelId);
  if (!session || !session.active) return;

  const expanded = expandSkill(prompt);

  // If the session is already processing, interject directly via send()
  // The running stream loop will pick up the new events
  if (session.processing) {
    try {
      await session.sdk.send(expanded);
    } catch (err: any) {
      broadcast({ type: "error", panelId, message: `Interjection error: ${err.message}` });
    }
    return;
  }

  // Not processing — start a new turn
  session.processing = true;
  broadcast({ type: "status", panelId, status: "running" });

  try {
    const streamIter = session.sdk.stream();
    const firstChunk = streamIter.next();
    await session.sdk.send(expanded);

    const first = await firstChunk;
    if (!first.done && session.active) {
      handleEvent(panelId, first.value);
    }

    for await (const event of streamIter) {
      if (!session.active) break;
      handleEvent(panelId, event);
    }
  } catch (err: any) {
    broadcast({ type: "error", panelId, message: `Session error: ${err.message}` });
  }

  session.processing = false;

  // Process any queued messages
  if (session.active && session.messageQueue.length > 0) {
    const next = session.messageQueue.shift()!;
    sendPrompt(panelId, next);
  } else if (session.active) {
    broadcast({ type: "status", panelId, status: "idle" });
  }
}
