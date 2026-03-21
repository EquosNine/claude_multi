<script lang="ts">
  import Header from './lib/Header.svelte';
  import Panel from './lib/Panel.svelte';
  import KeyboardShortcuts from './lib/KeyboardShortcuts.svelte';
  import { ws } from './lib/stores/ws.svelte';
  import { panelStore } from './lib/stores/panels.svelte';
  import { settingsStore } from './lib/stores/settings.svelte';
  import { conversationStore } from './lib/stores/conversations.svelte';
  import type { WsIncoming, ClaudeStreamEvent, CostData } from './lib/types';

  // Initialize
  panelStore.restorePanels();
  ws.connect();

  // Apply font scale CSS variable reactively
  $effect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settingsStore.fontScale));
  });

  // Route incoming WS messages to panel store
  ws.subscribe((msg: WsIncoming) => {
    switch (msg.type) {
      case 'status':
        panelStore.setStatus(msg.panelId, msg.status);
        break;
      case 'error':
        panelStore.addMessage(msg.panelId, {
          id: panelStore.nextMsgId(),
          type: 'error',
          text: msg.message,
        });
        break;
      case 'claude':
        handleClaudeEvent(msg.panelId, msg.data);
        break;
      case 'agent_detail':
        panelStore.updateAgentDetail(msg.panelId, msg.agent);
        break;
      case 'done': {
        panelStore.addMessage(msg.panelId, {
          id: panelStore.nextMsgId(),
          type: 'done',
          text: msg.exitCode === 0 ? '--- completed ---' : `--- exited (code ${msg.exitCode}) ---`,
        });
        const donePanel = panelStore.getPanel(msg.panelId);
        if (donePanel?.sessionId) {
          const lastAssistant = [...donePanel.messages].reverse().find(m => m.type === 'assistant');
          conversationStore.finish(
            donePanel.sessionId,
            donePanel.costUsd,
            donePanel.messages.length,
            lastAssistant?.text ?? '',
            donePanel.lastTurnDurationMs,
          );
        }
        break;
      }
    }
  });

  function summarizeToolUse(name: string | undefined, input: any): string {
    if (!name) return 'unknown tool';
    const inp = typeof input === 'string' ? {} : (input || {});
    switch (name) {
      case 'Read':
        return inp.file_path || 'file';
      case 'Write':
        return inp.file_path || 'file';
      case 'Edit':
        return inp.file_path || 'file';
      case 'Bash':
        return inp.command ? inp.command.slice(0, 120) : 'command';
      case 'Grep':
        return `/${inp.pattern || '...'}/${inp.glob ? ` in ${inp.glob}` : ''}`;
      case 'Glob':
        return inp.pattern || '...';
      case 'Agent':
        return inp.description || inp.prompt?.slice(0, 80) || 'sub-agent';
      case 'WebSearch':
      case 'WebFetch':
        return inp.query || inp.url || '...';
      default:
        return typeof input === 'string' ? input.slice(0, 80) : JSON.stringify(inp).slice(0, 80);
    }
  }

  function handleClaudeEvent(panelId: number, data: ClaudeStreamEvent) {
    if (!data?.type) return;

    switch (data.type) {
      case 'system': {
        // SDK sends subtype:'status' (not 'init' like CLI stream-json)
        const sid = data.session_id || '';
        if (sid && !panelStore.getPanel(panelId)?.sessionId) {
          panelStore.addMessage(panelId, {
            id: panelStore.nextMsgId(),
            type: 'system',
            text: `Session: ${sid}`,
          });
          panelStore.setSessionId(panelId, sid);
          const panel = panelStore.getPanel(panelId);
          panelStore.saveSession(panelId, sid, panel?.cwd || '', panel?.name || `Panel ${panelId + 1}`);
          conversationStore.start(panelId, sid);
        }
        break;
      }
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
            const summary = summarizeToolUse(block.name, block.input);
            panelStore.addMessage(panelId, {
              id: panelStore.nextMsgId(),
              type: 'tool',
              text: summary,
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
            if (text && text.length > 0) {
              const isError = block.is_error === true;
              panelStore.addMessage(panelId, {
                id: panelStore.nextMsgId(),
                type: isError ? 'error' : 'tool-result',
                text: text.length > 2000 ? text.slice(0, 2000) + '...' : text,
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
        // Parse cost/token/cache/duration data
        {
          const cost: CostData = {
            costUsd: data.total_cost_usd ?? data.cost_usd ?? 0,
            inputTokens: data.usage?.input_tokens ?? 0,
            outputTokens: data.usage?.output_tokens ?? 0,
            cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
            cacheCreationTokens: data.usage?.cache_creation_input_tokens ?? 0,
            durationMs: data.duration_ms ?? null,
          };
          if (cost.costUsd > 0 || cost.inputTokens > 0 || cost.cacheReadTokens > 0 || cost.durationMs !== null) {
            panelStore.updateCost(panelId, cost);
          }
        }
        break;
    }
  }

  // Grid class based on VISIBLE panels (filtered by active tab group)
  let gridClass = $derived.by(() => {
    const n = panelStore.visiblePanels.length;
    const mode = panelStore.layout;

    let cols: number;
    if (mode === '1col') cols = 1;
    else if (mode === '2col') cols = 2;
    else if (mode === '3col') cols = 3;
    else {
      // Auto mode
      if (n <= 1) cols = 1;
      else if (n <= 3) cols = n;
      else if (n === 4) cols = 2;
      else cols = 3;
    }

    const rows = Math.ceil(n / cols) || 1;
    return `layout-${cols} rows-${rows}`;
  });

  // Aggregate stats for footer
  let runningCount = $derived(panelStore.panels.filter(p => p.status === 'running').length);
  let totalCost = $derived(panelStore.panels.reduce((sum, p) => sum + p.costUsd, 0));
  let totalCostText = $derived(
    totalCost > 0
      ? totalCost < 0.01 ? `$${(totalCost * 100).toFixed(1)}c` : `$${totalCost.toFixed(3)}`
      : '$0'
  );
</script>

<KeyboardShortcuts />
<Header />

<div id="panels" class={gridClass}>
  {#if panelStore.visiblePanels.length === 0}
    <div class="empty-state">Click "+ Panel" to add an instance</div>
  {:else}
    {#each panelStore.visiblePanels as panel (panel.id)}
      <Panel {panel} />
    {/each}
  {/if}
</div>

<footer id="status-bar">
  <div class="status-left">
    <span class="status-label">State:</span>
    <span class="status-value" class:online={runningCount > 0}>{runningCount > 0 ? 'ACTIVE' : 'IDLE'}</span>
    <span class="status-label">Panels:</span>
    <span class="status-value">{panelStore.panels.length} / {panelStore.maxPanels}</span>
  </div>
  <div class="status-right">
    <span class="status-label">Cost:</span>
    <span class="status-value cost">{totalCostText}</span>
    <span class="status-label">Tab:</span>
    <span class="status-value tab">{panelStore.activeGroup}</span>
  </div>
</footer>

<style>
  #panels {
    flex: 1;
    display: grid;
    gap: 2px;
    background: var(--outline-dim);
    overflow: hidden;
    padding: 2px;
  }
  #panels.layout-1 {
    grid-template-columns: 1fr;
  }
  #panels.layout-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  #panels.layout-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  #panels.rows-1 { grid-template-rows: 1fr; }
  #panels.rows-2 { grid-template-rows: repeat(2, 1fr); }
  #panels.rows-3 { grid-template-rows: repeat(3, 1fr); }
  @media (max-width: 900px) {
    #panels { grid-template-columns: 1fr !important; }
  }

  /* Status footer */
  #status-bar {
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: var(--surface-low);
    border-top: 1px solid var(--outline-dim);
    flex-shrink: 0;
  }
  .status-left, .status-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .status-label {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status-value {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--text);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status-value.online { color: var(--green); }
  .status-value.cost { color: var(--green); }
  .status-value.tab { color: var(--accent); }
</style>
