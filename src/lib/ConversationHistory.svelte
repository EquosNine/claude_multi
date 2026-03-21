<script lang="ts">
  import { conversationStore } from './stores/conversations.svelte';
  import { panelStore } from './stores/panels.svelte';
  import type { ConversationRecord } from './types';

  let open = $state(false);
  let query = $state('');
  let filterStarred = $state(false);
  let selected = $state<ConversationRecord | null>(null);
  let resumePanelId = $state<number>(-1);
  let deleteConfirm = $state<string | null>(null); // sessionId awaiting confirm

  function toggle() {
    open = !open;
    if (!open) selected = null;
  }

  function closeOnBackdrop() {
    open = false;
    selected = null;
  }

  let filtered = $derived.by(() => {
    let list = conversationStore.conversations;
    if (filterStarred) list = list.filter(c => c.starred);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.cwd.toLowerCase().includes(q) ||
        c.panelName.toLowerCase().includes(q),
      );
    }
    return list;
  });

  function formatRelative(ts: number): string {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  function formatCost(usd: number): string {
    if (usd === 0) return '';
    if (usd < 0.01) return `$${(usd * 100).toFixed(1)}c`;
    return `$${usd.toFixed(3)}`;
  }

  function selectConversation(c: ConversationRecord) {
    selected = c;
    deleteConfirm = null;
    // Default resume target: first panel or focused panel
    const panels = panelStore.panels;
    resumePanelId = panels.length > 0 ? panels[0].id : -1;
  }

  function handleResume() {
    if (!selected || resumePanelId === -1) return;
    panelStore.resumeConversation(resumePanelId, selected.cwd, selected.sessionId);
    open = false;
    selected = null;
  }

  function handleStar(c: ConversationRecord, e: MouseEvent) {
    e.stopPropagation();
    if (c.starred) conversationStore.unstar(c.sessionId);
    else conversationStore.star(c.sessionId);
    // Keep selected in sync
    if (selected?.sessionId === c.sessionId) selected = c;
  }

  function handleDelete(sessionId: string, e: MouseEvent) {
    e.stopPropagation();
    if (deleteConfirm === sessionId) {
      conversationStore.remove(sessionId);
      if (selected?.sessionId === sessionId) selected = null;
      deleteConfirm = null;
    } else {
      deleteConfirm = sessionId;
    }
  }
</script>

<!-- Toggle button (rendered inline in header) -->
<button class="hdr-btn" class:active={open} onclick={toggle} title="Conversation History">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
</button>

{#if open}
  <!-- Backdrop -->
  <div class="backdrop" onclick={closeOnBackdrop} role="presentation"></div>

  <!-- Drawer -->
  <div class="drawer">
    <div class="drawer-header">
      <span class="drawer-title">History</span>
      <div class="drawer-header-right">
        <span class="count">{conversationStore.conversations.length} conversations</span>
        <button class="close-btn" onclick={toggle}>&times;</button>
      </div>
    </div>

    <div class="drawer-body">
      <!-- List pane -->
      <div class="list-pane">
        <div class="search-row">
          <input
            class="search-input"
            type="text"
            placeholder="Search..."
            bind:value={query}
            spellcheck="false"
          />
          <button
            class="filter-btn"
            class:active={filterStarred}
            onclick={() => filterStarred = !filterStarred}
            title="Show starred only"
          >★</button>
        </div>

        <div class="list">
          {#if filtered.length === 0}
            <div class="empty">
              {query || filterStarred ? 'No matches' : 'No conversations yet'}
            </div>
          {:else}
            {#each filtered as c (c.sessionId)}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div
                class="list-item"
                class:selected={selected?.sessionId === c.sessionId}
                onclick={() => selectConversation(c)}
              >
                <div class="item-top">
                  <span class="item-label" title={c.label}>{c.label}</span>
                  <button
                    class="star-btn"
                    class:starred={c.starred}
                    onclick={(e) => handleStar(c, e)}
                    title={c.starred ? 'Unstar' : 'Star'}
                  >★</button>
                </div>
                <div class="item-meta">
                  <span class="item-cwd" title={c.cwd}>{c.cwd.split(/[\\/]/).pop() || c.cwd}</span>
                  <span class="item-time">{formatRelative(c.startedAt)}</span>
                  {#if formatCost(c.costUsd)}
                    <span class="item-cost">{formatCost(c.costUsd)}</span>
                  {/if}
                  {#if !c.endedAt}
                    <span class="item-badge interrupted">interrupted</span>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Preview pane -->
      <div class="preview-pane">
        {#if selected}
          <div class="preview-header">
            <div class="preview-title">{selected.label}</div>
            <div class="preview-actions">
              <button
                class="action-btn"
                class:starred={selected.starred}
                onclick={(e) => handleStar(selected!, e)}
              >{selected.starred ? '★ Starred' : '☆ Star'}</button>
              <button
                class="action-btn danger"
                class:confirm={deleteConfirm === selected.sessionId}
                onclick={(e) => handleDelete(selected!.sessionId, e)}
              >{deleteConfirm === selected.sessionId ? 'Confirm delete' : 'Delete'}</button>
            </div>
          </div>

          <div class="preview-meta">
            <div class="meta-row">
              <span class="meta-key">Directory</span>
              <span class="meta-val mono">{selected.cwd || '—'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">Panel</span>
              <span class="meta-val">{selected.panelName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">Started</span>
              <span class="meta-val">{new Date(selected.startedAt).toLocaleString()}</span>
            </div>
            {#if selected.endedAt}
              <div class="meta-row">
                <span class="meta-key">Ended</span>
                <span class="meta-val">{new Date(selected.endedAt).toLocaleString()}</span>
              </div>
            {/if}
            {#if formatDuration(selected.durationMs)}
              <div class="meta-row">
                <span class="meta-key">Duration</span>
                <span class="meta-val">{formatDuration(selected.durationMs)}</span>
              </div>
            {/if}
            {#if selected.costUsd > 0}
              <div class="meta-row">
                <span class="meta-key">Cost</span>
                <span class="meta-val green">{formatCost(selected.costUsd)}</span>
              </div>
            {/if}
            {#if selected.messageCount > 0}
              <div class="meta-row">
                <span class="meta-key">Messages</span>
                <span class="meta-val">{selected.messageCount}</span>
              </div>
            {/if}
            <div class="meta-row">
              <span class="meta-key">Session ID</span>
              <span class="meta-val mono dim">{selected.sessionId.slice(0, 20)}...</span>
            </div>
          </div>

          {#if selected.preview}
            <div class="preview-snippet-label">Last response</div>
            <div class="preview-snippet">{selected.preview}</div>
          {:else}
            <div class="preview-snippet-label">No preview available</div>
          {/if}

          <div class="resume-row">
            <select class="panel-select" bind:value={resumePanelId}>
              {#each panelStore.panels as p}
                <option value={p.id}>{p.name || `Panel ${p.id + 1}`} {p.status === 'running' ? '(running)' : ''}</option>
              {/each}
            </select>
            <button class="resume-btn" onclick={handleResume} disabled={resumePanelId === -1}>
              Resume →
            </button>
          </div>
        {:else}
          <div class="preview-empty">
            Select a conversation to preview
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Toggle button — matches Header's .hdr-btn */
  .hdr-btn {
    padding: 0;
    border: 1px solid var(--outline-dim);
    background: var(--surface-mid);
    color: var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }
  .hdr-btn:hover, .hdr-btn.active {
    border-color: var(--accent);
    color: var(--text);
    background: var(--surface-high);
  }

  /* Backdrop */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
    background: rgba(6, 14, 32, 0.6);
  }

  /* Drawer */
  .drawer {
    position: fixed;
    top: 52px; /* header height */
    left: 0;
    bottom: 0;
    width: 700px;
    max-width: 90vw;
    z-index: 50;
    background: var(--surface-low);
    border-right: 1px solid var(--outline-dim);
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 44px;
    border-bottom: 1px solid var(--outline-dim);
    flex-shrink: 0;
    background: var(--bg);
  }
  .drawer-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--accent);
  }
  .drawer-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .count {
    font-family: 'Fira Code', monospace;
    font-size: 1rem;
    color: var(--text-dim);
  }
  .close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 1.8rem;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.12s;
  }
  .close-btn:hover { color: var(--red); }

  .drawer-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  /* ── List pane ── */
  .list-pane {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--outline-dim);
    min-height: 0;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--outline-dim);
    flex-shrink: 0;
  }
  .search-input {
    flex: 1;
    background: var(--surface-mid);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    color: var(--text);
    font-family: 'Fira Code', monospace;
    font-size: 1.1rem;
    padding: 4px 8px;
    outline: none;
  }
  .search-input:focus { border-color: var(--accent); }
  .filter-btn {
    background: var(--surface-mid);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    font-size: 1.4rem;
    padding: 3px 7px;
    transition: all 0.12s;
    line-height: 1;
  }
  .filter-btn:hover { border-color: var(--accent); color: var(--accent); }
  .filter-btn.active { border-color: var(--orange); color: var(--orange); background: rgba(255, 166, 87, 0.1); }

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
  .empty {
    padding: 20px;
    font-family: 'Fira Code', monospace;
    font-size: 1.1rem;
    color: var(--text-dim);
    text-align: center;
  }

  .list-item {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: 1px solid var(--outline-dim);
    transition: background 0.1s;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .list-item:hover { background: var(--surface-mid); }
  .list-item.selected { background: rgba(204, 151, 255, 0.08); border-left: 2px solid var(--accent); }

  .item-top {
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }
  .item-label {
    flex: 1;
    font-size: 1.2rem;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }
  .star-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--text-dim);
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.12s;
  }
  .star-btn:hover { color: var(--orange); }
  .star-btn.starred { color: var(--orange); }

  .item-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .item-cwd {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--text-dim);
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-time {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--text-dim);
  }
  .item-cost {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--green);
  }
  .item-badge {
    font-size: 0.8rem;
    padding: 1px 4px;
    border-radius: var(--radius);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .item-badge.interrupted {
    color: var(--orange);
    background: rgba(255, 166, 87, 0.1);
    border: 1px solid rgba(255, 166, 87, 0.2);
  }

  /* ── Preview pane ── */
  .preview-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Fira Code', monospace;
    font-size: 1.1rem;
    color: var(--text-dim);
  }

  .preview-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--outline-dim);
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--bg);
  }
  .preview-title {
    flex: 1;
    font-size: 1.3rem;
    color: var(--text);
    line-height: 1.4;
    word-break: break-word;
  }
  .preview-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .action-btn {
    padding: 3px 10px;
    border: 1px solid var(--outline-dim);
    background: var(--surface-mid);
    color: var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 1.1rem;
    font-family: 'Fira Code', monospace;
    transition: all 0.12s;
    white-space: nowrap;
  }
  .action-btn:hover { border-color: var(--accent); color: var(--text); }
  .action-btn.starred { color: var(--orange); border-color: var(--orange); }
  .action-btn.danger:hover { border-color: var(--red); color: var(--red); }
  .action-btn.danger.confirm { border-color: var(--red); color: var(--red); background: rgba(255, 110, 132, 0.1); }

  .preview-meta {
    padding: 12px 16px;
    border-bottom: 1px solid var(--outline-dim);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .meta-row {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }
  .meta-key {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    width: 70px;
    flex-shrink: 0;
  }
  .meta-val {
    font-size: 1.1rem;
    color: var(--text);
    word-break: break-all;
  }
  .meta-val.mono { font-family: 'Fira Code', monospace; }
  .meta-val.dim { color: var(--text-dim); }
  .meta-val.green { color: var(--green); }

  .preview-snippet-label {
    padding: 10px 16px 4px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }
  .preview-snippet {
    flex: 1;
    margin: 0 16px 12px;
    padding: 10px 12px;
    background: var(--surface-mid);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius-lg);
    font-size: 1.2rem;
    color: var(--text);
    line-height: 1.5;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 60px;
  }

  .resume-row {
    padding: 12px 16px;
    border-top: 1px solid var(--outline-dim);
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
    background: var(--bg);
  }
  .panel-select {
    flex: 1;
    background: var(--surface-mid);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    color: var(--text);
    font-family: 'Fira Code', monospace;
    font-size: 1.1rem;
    padding: 5px 8px;
    outline: none;
    cursor: pointer;
  }
  .panel-select:focus { border-color: var(--accent); }
  .resume-btn {
    padding: 6px 16px;
    background: rgba(204, 151, 255, 0.12);
    border: 1px solid var(--accent-dim);
    border-radius: var(--radius);
    color: var(--accent);
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: 0.3px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .resume-btn:hover:not(:disabled) {
    background: rgba(204, 151, 255, 0.2);
    border-color: var(--accent);
  }
  .resume-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
