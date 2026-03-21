<script lang="ts">
  import type { AgentDetail } from './types';
  import { formatTime } from './utils';

  let { agents, visible }: {
    agents: AgentDetail[];
    visible: boolean;
  } = $props();

  let expandedId = $state<string | null>(null);

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  // Tick timer every second for running agents
  let tick = $state(0);
  $effect(() => {
    if (!visible) return;
    const hasRunning = agents.some(a => a.status === 'running');
    if (!hasRunning) return;
    const interval = setInterval(() => { tick++; }, 1000);
    return () => clearInterval(interval);
  });
</script>

{#if visible && agents.length > 0}
  <div class="agent-monitor">
    <div class="am-header">
      <span class="am-title">Sub-Agents</span>
      <span class="am-count">{agents.filter(a => a.status === 'running').length} active</span>
    </div>
    <div class="am-list">
      {#each agents as agent (agent.toolUseId)}
        {@const elapsed = formatTime(Date.now() - agent.startTime)}
        <button class="am-item" class:done={agent.status === 'done'} onclick={() => toggleExpand(agent.toolUseId)}>
          <div class="am-item-header">
            <span class="am-dot" class:running={agent.status === 'running'}></span>
            <span class="am-desc">{agent.description || 'Agent'}</span>
            <span class="am-time">{agent.status === 'running' ? elapsed : 'done'}</span>
            <span class="am-expand">{expandedId === agent.toolUseId ? '▾' : '▸'}</span>
          </div>
          {#if expandedId === agent.toolUseId && agent.output}
            <div class="am-output">{agent.output}</div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .agent-monitor {
    border-top: 1px solid var(--panel-border);
    background: rgba(26, 26, 53, 0.5);
    flex-shrink: 0;
    max-height: 200px;
    overflow-y: auto;
  }
  .agent-monitor::-webkit-scrollbar { width: 5px; }
  .agent-monitor::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 3px; }
  .am-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
    border-bottom: 1px solid var(--panel-border);
  }
  .am-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--blue);
  }
  .am-count {
    font-size: 10px;
    color: var(--text-dim);
  }
  .am-list {
    padding: 2px 0;
  }
  .am-item {
    width: 100%;
    background: none;
    border: none;
    color: var(--text);
    padding: 0;
    cursor: pointer;
    text-align: left;
  }
  .am-item:hover { background: rgba(124, 58, 237, 0.06); }
  .am-item.done { opacity: 0.5; }
  .am-item-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    font-size: 11px;
  }
  .am-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--text-dim);
    flex-shrink: 0;
  }
  .am-dot.running {
    background: var(--green);
    animation: pulse 1.5s ease-in-out infinite;
  }
  .am-desc {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  }
  .am-time {
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 10px;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .am-expand {
    font-size: 10px;
    color: var(--text-dim);
    flex-shrink: 0;
    width: 12px;
    text-align: center;
  }
  .am-output {
    padding: 4px 10px 4px 28px;
    font-size: 10px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    color: var(--text-dim);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 80px;
    overflow-y: auto;
    border-top: 1px dashed var(--panel-border);
  }
</style>
