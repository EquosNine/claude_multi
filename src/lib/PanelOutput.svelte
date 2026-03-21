<script lang="ts">
  import type { OutputMessage } from './types';
  import { renderMarkdown } from './markdown';

  let { messages, status = 'idle' }: { messages: OutputMessage[]; status?: string } = $props();

  let outputEl: HTMLDivElement;
  let userScrolledUp = $state(false);

  function handleScroll() {
    if (!outputEl) return;
    const threshold = 60;
    const atBottom = outputEl.scrollHeight - outputEl.scrollTop - outputEl.clientHeight < threshold;
    userScrolledUp = !atBottom;
  }

  $effect(() => {
    if (messages.length && outputEl && !userScrolledUp) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  });

  function scrollToBottom() {
    if (!outputEl) return;
    userScrolledUp = false;
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  // ── Grouping ──────────────────────────────────────────────────────────────

  type ToolGroup = { kind: 'tool-group'; msgs: OutputMessage[]; id: string; isLive: boolean };
  type RegularItem = { kind: 'message'; msg: OutputMessage };
  type DisplayItem = ToolGroup | RegularItem;

  let displayItems = $derived.by((): DisplayItem[] => {
    const items: DisplayItem[] = [];
    let groupMsgs: OutputMessage[] | null = null;

    for (const msg of messages) {
      if (msg.type === 'tool' || msg.type === 'tool-result') {
        if (!groupMsgs) groupMsgs = [];
        groupMsgs.push(msg);
      } else {
        if (groupMsgs) {
          items.push({ kind: 'tool-group', msgs: groupMsgs, id: groupMsgs[0].id, isLive: false });
          groupMsgs = null;
        }
        items.push({ kind: 'message', msg });
      }
    }

    // Trailing tool group (still being populated)
    if (groupMsgs) {
      items.push({ kind: 'tool-group', msgs: groupMsgs, id: groupMsgs[0].id, isLive: status === 'running' });
    }

    return items;
  });

  function groupSummary(msgs: OutputMessage[]): string {
    const toolMsgs = msgs.filter(m => m.type === 'tool');
    const counts: Record<string, number> = {};
    for (const m of toolMsgs) {
      const name = (m.toolName || 'tool').toLowerCase();
      counts[name] = (counts[name] || 0) + 1;
    }
    const parts = Object.entries(counts).map(([name, count]) =>
      count > 1 ? `${name}(${count})` : name
    );
    const total = toolMsgs.length;
    return `${total} op${total !== 1 ? 's' : ''} — ${parts.join(', ')}`;
  }

  // ── Expansion state ───────────────────────────────────────────────────────

  let expandedGroups = $state(new Set<string>());
  let expandedResults = $state(new Set<string>());

  function toggleGroup(id: string) {
    if (expandedGroups.has(id)) expandedGroups.delete(id);
    else expandedGroups.add(id);
    expandedGroups = new Set(expandedGroups);
  }

  function toggleResult(id: string) {
    if (expandedResults.has(id)) expandedResults.delete(id);
    else expandedResults.add(id);
    expandedResults = new Set(expandedResults);
  }
</script>

<div class="panel-output" bind:this={outputEl} onscroll={handleScroll}>
  {#each displayItems as item (item.kind === 'message' ? item.msg.id : item.id)}
    {#if item.kind === 'tool-group'}
      {@const expanded = expandedGroups.has(item.id)}
      <div class="tool-group" class:live={item.isLive}>
        <button class="group-header" onclick={() => toggleGroup(item.id)}>
          <span class="group-toggle">{expanded ? '▾' : '▸'}</span>
          {#if item.isLive}
            <span class="live-dot"></span>
          {/if}
          <span class="group-summary">{groupSummary(item.msgs)}</span>
        </button>

        {#if expanded}
          <div class="group-body">
            {#each item.msgs as msg (msg.id)}
              {#if msg.type === 'tool'}
                <div class="msg msg-tool">
                  <span class="tool-name">{msg.toolName || 'tool'}</span>
                  <span class="tool-summary">{msg.text}</span>
                </div>
              {:else if msg.type === 'tool-result'}
                <button class="msg msg-tool-result-compact" onclick={() => toggleResult(msg.id)}>
                  <span class="tr-toggle">{expandedResults.has(msg.id) ? '▾' : '▸'}</span>
                  <span class="tr-label">output</span>
                  <span class="tr-preview">{msg.text.slice(0, 80)}{msg.text.length > 80 ? '…' : ''}</span>
                </button>
                {#if expandedResults.has(msg.id)}
                  <div class="msg msg-tool-result">{msg.text}</div>
                {/if}
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      {@const msg = item.msg}
      {#if msg.type === 'assistant'}
        <div class="msg msg-assistant">{@html renderMarkdown(msg.text)}</div>
      {:else}
        <div class="msg msg-{msg.type}">{msg.text}</div>
      {/if}
    {/if}
  {/each}
</div>

{#if userScrolledUp}
  <button class="scroll-bottom-btn" onclick={scrollToBottom}>
    ↓ New output
  </button>
{/if}

<style>
  .panel-output {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 1.4rem;
    line-height: 1.5;
    min-height: 0;
  }

  /* ── Tool group ── */
  .tool-group {
    margin: 3px 0;
    border-radius: 4px;
    border: 1px solid var(--outline-dim);
    overflow: hidden;
  }

  .tool-group.live {
    border-color: rgba(204, 151, 255, 0.25);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    background: var(--surface-low);
    border: none;
    padding: 4px 8px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    font-size: 1rem;
    color: var(--text-dim);
    transition: background 0.12s;
  }

  .group-header:hover {
    background: var(--surface-mid);
    color: var(--text);
  }

  .group-toggle {
    font-size: 0.8rem;
    flex-shrink: 0;
    width: 10px;
    color: var(--accent);
  }

  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--green);
    flex-shrink: 0;
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .group-summary {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1rem;
    letter-spacing: 0.2px;
  }

  .group-body {
    padding: 2px 0 4px;
    border-top: 1px solid var(--outline-dim);
  }

  /* ── Individual tool rows (inside expanded group) ── */
  .msg-tool {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 2px 10px;
    font-size: 1.1rem;
    color: var(--text-dim);
  }

  .tool-name {
    color: var(--blue);
    font-weight: 600;
    flex-shrink: 0;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .tool-summary {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .msg-tool-result-compact {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 1px 10px;
    font-size: 1rem;
    font-family: inherit;
    text-align: left;
    width: 100%;
  }

  .msg-tool-result-compact:hover { color: var(--text); }
  .tr-toggle { font-size: 0.8rem; flex-shrink: 0; width: 10px; }
  .tr-label { color: var(--green); font-size: 0.9rem; flex-shrink: 0; }
  .tr-preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.5;
  }

  .msg-tool-result {
    white-space: pre-wrap;
    font-size: 1rem;
    color: var(--text-dim);
    padding: 4px 10px;
    border-top: 1px solid var(--outline-dim);
    max-height: 300px;
    overflow-y: auto;
  }

  /* ── Other message types ── */
  .msg-assistant {
    padding: 6px 0;
    color: var(--text);
  }

  .msg-system {
    color: var(--text-dim);
    font-size: 1.1rem;
    padding: 2px 0;
    opacity: 0.7;
  }

  .msg-error {
    color: var(--red);
    font-size: 1.1rem;
    padding: 2px 0;
  }

  .msg-done {
    color: var(--green);
    font-size: 1rem;
    padding: 2px 0;
    opacity: 0.6;
  }

  .scroll-bottom-btn {
    position: absolute;
    bottom: 56px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 16px;
    padding: 4px 14px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    opacity: 0.9;
    transition: opacity 0.15s;
  }

  .scroll-bottom-btn:hover { opacity: 1; }
</style>
