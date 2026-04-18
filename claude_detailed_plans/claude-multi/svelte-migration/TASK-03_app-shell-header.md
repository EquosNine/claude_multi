# Task 03: App Shell + Header Component

**Status:** Not started
**Depends on:** Task 02
**Scope:** claude-multi
**Stack:** Svelte 5 + TypeScript
**Creates:** 2 new files / **Modifies:** 1 existing file

## Goal
Create the main App.svelte layout with the panel grid container and the Header component with connection status, add panel button, and layout toggle. Wire up the WebSocket connection and message routing to the panel store.

## Files to Create/Modify

### 1. `src/App.svelte` (MODIFY — replace placeholder)
```svelte
<script lang="ts">
  import Header from './lib/Header.svelte';
  import Panel from './lib/Panel.svelte';
  import { ws } from './lib/stores/ws';
  import { panelStore } from './lib/stores/panels';
  import type { WsIncoming, ClaudeStreamEvent } from './lib/types';

  // Initialize
  panelStore.restorePanels();
  ws.connect();

  // Route incoming WS messages to panel store
  ws.subscribe((msg: WsIncoming) => {
    switch (msg.type) {
      case 'status':
        panelStore.setStatus(msg.panelId, msg.status);
        break;
      case 'stats':
        panelStore.updateStats(msg.panelId, msg.ram, msg.agents);
        break;
      case 'error':
        panelStore.addMessage(msg.panelId, {
          id: panelStore.nextMsgId(),
          type: 'error',
          text: msg.message,
        });
        break;
      case 'stderr':
        if (msg.data?.trim()) {
          panelStore.addMessage(msg.panelId, {
            id: panelStore.nextMsgId(),
            type: 'error',
            text: msg.data,
          });
        }
        break;
      case 'claude':
        handleClaudeEvent(msg.panelId, msg.data);
        break;
      case 'claude_raw':
        panelStore.addMessage(msg.panelId, {
          id: panelStore.nextMsgId(),
          type: 'system',
          text: msg.data,
        });
        break;
      case 'done':
        panelStore.addMessage(msg.panelId, {
          id: panelStore.nextMsgId(),
          type: 'done',
          text: msg.exitCode === 0 ? '--- completed ---' : `--- exited (code ${msg.exitCode}) ---`,
        });
        panelStore.updateStats(msg.panelId, 0, 0);
        break;
    }
  });

  function handleClaudeEvent(panelId: number, data: ClaudeStreamEvent) {
    if (!data?.type) return;

    switch (data.type) {
      case 'system':
        if (data.subtype === 'init') {
          panelStore.addMessage(panelId, {
            id: panelStore.nextMsgId(),
            type: 'system',
            text: `Session: ${data.session_id || 'started'}`,
          });
        }
        break;
      case 'assistant': {
        const content = data.message?.content;
        if (!content || !Array.isArray(content)) break;
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            panelStore.addMessage(panelId, {
              id: panelStore.nextMsgId(),
              type: 'assistant',
              text: block.text,
            });
          } else if (block.type === 'tool_use') {
            const inputStr = typeof block.input === 'string'
              ? block.input
              : JSON.stringify(block.input).slice(0, 200);
            panelStore.addMessage(panelId, {
              id: panelStore.nextMsgId(),
              type: 'tool',
              text: inputStr,
              toolName: block.name,
            });
          }
        }
        break;
      }
      case 'user': {
        const content = data.message?.content;
        if (!content || !Array.isArray(content)) break;
        for (const block of content) {
          if (block.type === 'tool_result') {
            const text = typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content);
            if (text?.length > 0) {
              panelStore.addMessage(panelId, {
                id: panelStore.nextMsgId(),
                type: 'tool-result',
                text: text.length > 1000 ? text.slice(0, 1000) + '...' : text,
              });
            }
          }
        }
        break;
      }
      case 'result':
        if (data.result) {
          panelStore.addMessage(panelId, {
            id: panelStore.nextMsgId(),
            type: 'assistant',
            text: data.result,
          });
        }
        break;
    }
  }

  let gridClass = $derived(
    panelStore.layout === 'grid' ? 'layout-grid' : 'layout-columns'
  );
</script>

<Header />

<div id="panels" class={gridClass}>
  {#if panelStore.panels.length === 0}
    <div class="empty-state">Click "+ Panel" to get started</div>
  {:else}
    {#each panelStore.panels as panel (panel.id)}
      <Panel {panel} />
    {/each}
  {/if}
</div>

<style>
  #panels {
    flex: 1;
    display: grid;
    gap: 1px;
    background: var(--panel-border);
    overflow: hidden;
  }
  #panels.layout-columns {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  }
  #panels.layout-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 900px) {
    #panels { grid-template-columns: 1fr !important; }
  }
</style>
```

### 2. `src/lib/Header.svelte` (CREATE)
```svelte
<script lang="ts">
  import { ws } from './stores/ws';
  import { panelStore } from './stores/panels';

  let connected = $derived(ws.connected);
  let canAdd = $derived(panelStore.panels.length < panelStore.maxPanels);
  let layoutLabel = $derived(panelStore.layout === 'columns' ? 'Grid' : 'Columns');
</script>

<header>
  <h1>claude-multi <span>/ proxy dashboard</span></h1>
  <div class="header-controls">
    <div class="conn-status">
      <div class="conn-dot" class:connected></div>
      <span>{connected ? 'connected' : 'disconnected'}</span>
    </div>
    <button class="btn" disabled={!canAdd} onclick={() => panelStore.createPanel()}>
      + Panel
    </button>
    <button class="btn" onclick={() => panelStore.toggleLayout()}>
      {layoutLabel}
    </button>
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--panel-border);
    flex-shrink: 0;
    background: var(--panel-bg);
  }
  h1 {
    font-size: 16px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: -0.5px;
  }
  h1 span { color: var(--text-dim); font-weight: 400; }
  .header-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .conn-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .conn-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--red);
    transition: background 0.3s;
  }
  .conn-dot.connected { background: var(--green); }
</style>
```

## Key Patterns to Follow
- Svelte 5: `$derived()` for computed values, `class:name` directive for conditional classes
- Svelte 5: `onclick={fn}` (not `on:click={fn}`)
- Message routing in App.svelte centralizes all WS -> store updates
- Panel component receives the `panel` state object as a prop
- Keep the `{#each}` keyed by `panel.id` for stable DOM updates

## Verification
```bash
bun run check
bun run build
```
