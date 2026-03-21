<script lang="ts">
  import type { AgentDetail } from './types';
  import { formatTime } from './utils';

  let { agents, visible, panelRunning = false }: {
    agents: AgentDetail[];
    visible: boolean;
    panelRunning?: boolean;
  } = $props();

  let expandedId = $state<string | null>(null);

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  let runningAgents = $derived(agents.filter(a => a.status === 'running'));
  let doneAgents = $derived(agents.filter(a => a.status === 'done'));

  // Tick timer every second for running agents
  let tick = $state(0);
  $effect(() => {
    if (!visible) return;
    if (runningAgents.length === 0) return;
    const interval = setInterval(() => { tick++; }, 1000);
    return () => clearInterval(interval);
  });
</script>

{#if visible}
  <div class="agent-monitor" class:has-running={runningAgents.length > 0}>
    <div class="am-header">
      <span class="am-title">
        {#if runningAgents.length > 0}
          <span class="pulse-dot"></span>
          Sub-Agents
        {:else}
          Sub-Agents
        {/if}
      </span>
      <span class="am-count">
        {#if runningAgents.length > 0}
          <span class="count-running">{runningAgents.length} running</span>
        {:else if panelRunning}
          <span class="count-waiting">watching...</span>
        {:else if doneAgents.length > 0}
          <span class="count-done">{doneAgents.length} completed</span>
        {:else}
          <span class="count-none">none</span>
        {/if}
      </span>
    </div>

    {#if agents.length === 0}
      {#if panelRunning}
        <div class="am-empty">
          <span class="am-empty-text">No sub-agents spawned yet</span>
        </div>
      {/if}
    {:else}
      <div class="am-list">
        <!-- Running agents first -->
        {#each runningAgents as agent (agent.toolUseId)}
          {@const elapsed = formatTime(Date.now() - agent.startTime)}
          <button class="am-item running" onclick={() => toggleExpand(agent.toolUseId)}>
            <div class="am-item-header">
              <span class="am-dot running"></span>
              <span class="am-desc">{agent.description || 'Agent'}</span>
              <span class="am-time active">{elapsed}</span>
              <span class="am-expand">{expandedId === agent.toolUseId ? '▾' : '▸'}</span>
            </div>
            {#if expandedId === agent.toolUseId && agent.output}
              <div class="am-output">{agent.output}</div>
            {/if}
          </button>
        {/each}
        <!-- Done agents below -->
        {#each doneAgents as agent (agent.toolUseId)}
          <button class="am-item done" onclick={() => toggleExpand(agent.toolUseId)}>
            <div class="am-item-header">
              <span class="am-dot"></span>
              <span class="am-desc">{agent.description || 'Agent'}</span>
              <span class="am-time">done</span>
              <span class="am-expand">{expandedId === agent.toolUseId ? '▾' : '▸'}</span>
            </div>
            {#if expandedId === agent.toolUseId && agent.output}
              <div class="am-output">{agent.output}</div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .agent-monitor {
    border-top: 1px solid var(--outline-dim);
    background: rgba(26, 26, 53, 0.5);
    flex-shrink: 0;
    max-height: 200px;
    overflow-y: auto;
    transition: border-color 0.3s;
  }
  .agent-monitor.has-running {
    border-top-color: rgba(109, 254, 156, 0.3);
  }
  .agent-monitor::-webkit-scrollbar { width: 5px; }
  .agent-monitor::-webkit-scrollbar-thumb { background: var(--outline-dim); border-radius: 3px; }

  .am-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
    border-bottom: 1px solid var(--outline-dim);
  }
  .am-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--blue);
  }
  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
    animation: pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }
  .am-count {
    font-family: 'Fira Code', monospace;
    font-size: 1rem;
  }
  .count-running { color: var(--green); }
  .count-waiting { color: var(--text-dim); font-style: italic; }
  .count-done    { color: var(--text-dim); }
  .count-none    { color: var(--outline); }

  .am-empty {
    padding: 6px 10px;
  }
  .am-empty-text {
    font-family: 'Fira Code', monospace;
    font-size: 1rem;
    color: var(--outline);
    font-style: italic;
  }

  .am-list { padding: 2px 0; }

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
  .am-item.done { opacity: 0.45; }
  .am-item.running { background: rgba(109, 254, 156, 0.03); }

  .am-item-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    font-size: 1.1rem;
  }
  .am-dot {
    width: 6px;
    height: 6px;
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
    font-family: 'Fira Code', monospace;
  }
  .am-time {
    font-family: 'Fira Code', monospace;
    font-size: 1rem;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .am-time.active { color: var(--green); }
  .am-expand {
    font-size: 1rem;
    color: var(--text-dim);
    flex-shrink: 0;
    width: 12px;
    text-align: center;
  }
  .am-output {
    padding: 4px 10px 4px 28px;
    font-size: 1rem;
    font-family: 'Fira Code', monospace;
    color: var(--text-dim);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 80px;
    overflow-y: auto;
    border-top: 1px dashed var(--outline-dim);
  }
</style>
