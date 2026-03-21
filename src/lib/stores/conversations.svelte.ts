import type { ConversationRecord } from '../types';

// Stash the prompt+cwd between handleSend and the system-init event
const pending = new Map<number, { prompt: string; cwd: string; panelName: string }>();

async function fetchConversations(): Promise<ConversationRecord[]> {
  try {
    const res = await fetch('/api/conversations?limit=500');
    if (!res.ok) return [];
    const { conversations } = await res.json();
    return conversations ?? [];
  } catch {
    return [];
  }
}

function createConversationsStore() {
  let list = $state<ConversationRecord[]>([]);

  // Hydrate from server on store creation
  fetchConversations().then(records => {
    list = records;
  });

  // ── API helpers ──

  async function apiPost(body: object): Promise<void> {
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {}
  }

  async function apiPatch(sessionId: string, body: object): Promise<void> {
    try {
      await fetch(`/api/conversations/${encodeURIComponent(sessionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {}
  }

  async function apiDelete(sessionId: string): Promise<void> {
    try {
      await fetch(`/api/conversations/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });
    } catch {}
  }

  return {
    get conversations() { return list; },

    /** Called from Panel.svelte handleSend — captures prompt before session_id arrives */
    setPending(panelId: number, prompt: string, cwd: string, panelName: string) {
      pending.set(panelId, { prompt, cwd, panelName });
    },

    /** Called from App.svelte on system-init event */
    start(panelId: number, sessionId: string) {
      if (!sessionId) return;
      // Resuming an existing session — don't create a duplicate record
      if (list.some((c: ConversationRecord) => c.sessionId === sessionId)) return;

      const p = pending.get(panelId);
      pending.delete(panelId);

      const record: ConversationRecord = {
        sessionId,
        label: (p?.prompt ?? 'Session started').slice(0, 150),
        cwd: p?.cwd ?? '',
        panelName: p?.panelName ?? `Panel ${panelId + 1}`,
        startedAt: Date.now(),
        endedAt: null,
        starred: false,
        costUsd: 0,
        messageCount: 0,
        preview: '',
        durationMs: null,
      };

      // Optimistic local update
      list.unshift(record);

      // Persist to server
      apiPost({
        sessionId: record.sessionId,
        label: record.label,
        cwd: record.cwd,
        panelName: record.panelName,
        startedAt: record.startedAt,
        endedAt: record.endedAt,
      });
    },

    /** Called from App.svelte on done event — stamps final stats */
    finish(
      sessionId: string,
      costUsd: number,
      messageCount: number,
      preview: string,
      durationMs: number | null,
    ) {
      const record = list.find((c: ConversationRecord) => c.sessionId === sessionId);
      if (!record) return;

      // Optimistic local update
      record.endedAt = Date.now();
      record.costUsd = costUsd;
      record.messageCount = messageCount;
      record.preview = preview.slice(0, 300);
      record.durationMs = durationMs;

      // Persist to server
      apiPatch(sessionId, {
        endedAt: record.endedAt,
        costUsd,
        messageCount,
        preview: record.preview,
        durationMs,
      });
    },

    star(sessionId: string) {
      const r = list.find((c: ConversationRecord) => c.sessionId === sessionId);
      if (!r) return;
      r.starred = true;
      apiPatch(sessionId, { starred: true });
    },

    unstar(sessionId: string) {
      const r = list.find((c: ConversationRecord) => c.sessionId === sessionId);
      if (!r) return;
      r.starred = false;
      apiPatch(sessionId, { starred: false });
    },

    remove(sessionId: string) {
      const idx = list.findIndex((c: ConversationRecord) => c.sessionId === sessionId);
      if (idx !== -1) list.splice(idx, 1);
      apiDelete(sessionId);
    },

    /** Refresh from server — called after FTS search returns results */
    async refresh() {
      const records = await fetchConversations();
      list = records;
    },
  };
}

export const conversationStore = createConversationsStore();
