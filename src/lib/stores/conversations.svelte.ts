import type { ConversationRecord } from '../types';

const STORAGE_KEY = 'claude-multi-conversations';
const MAX_CONVERSATIONS = 200;

// Stash the prompt+cwd between handleSend and the system-init event
const pending = new Map<number, { prompt: string; cwd: string; panelName: string }>();

function load(): ConversationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function createConversationsStore() {
  let list = $state<ConversationRecord[]>(load());

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function evict() {
    while (list.length > MAX_CONVERSATIONS) {
      const idx = list.findLastIndex((c: ConversationRecord) => !c.starred);
      if (idx === -1) break; // all starred — stop evicting
      list.splice(idx, 1);
    }
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

      list.unshift(record);
      evict();
      save();
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
      record.endedAt = Date.now();
      record.costUsd = costUsd;
      record.messageCount = messageCount;
      record.preview = preview.slice(0, 300);
      record.durationMs = durationMs;
      save();
    },

    star(sessionId: string) {
      const r = list.find((c: ConversationRecord) => c.sessionId === sessionId);
      if (r) { r.starred = true; save(); }
    },

    unstar(sessionId: string) {
      const r = list.find((c: ConversationRecord) => c.sessionId === sessionId);
      if (r) { r.starred = false; save(); }
    },

    remove(sessionId: string) {
      const idx = list.findIndex((c: ConversationRecord) => c.sessionId === sessionId);
      if (idx !== -1) { list.splice(idx, 1); save(); }
    },
  };
}

export const conversationStore = createConversationsStore();
