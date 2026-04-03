<script lang="ts">
  import type { AgentDetail } from './types';
  import { formatTime } from './utils';

  let { agents, visible, panelRunning = false, onClose }: {
    agents: AgentDetail[];
    visible: boolean;
    panelRunning?: boolean;
    onClose?: () => void;
  } = $props();

  let collapsedIds = $state(new Set<string>());

  function toggleCollapse(id: string) {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    collapsedIds = next;
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
        {/if}
        Sub-Agents
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
        <!-- Running agents: expanded by default, click to collapse -->
        {#each runningAgents as agent (agent.toolUseId)}
          {@const elapsed = formatTime(Date.now() - agent.startTime)}
          {@const isCollapsed = collapsedIds.has(agent.toolUseId)}
          <div class="am-item running">
            <button class="am-item-header" onclick={() => toggleCollapse(agent.toolUseId)}>
              <span class="am-dot running"></span>
              <span class="am-desc">{agent.description || 'Agent'}</span>
              {#if agent.lastToolName}
                <span class="am-tool-badge">{agent.lastToolName}</span>
              {/if}
              <span class="am-time active">{elapsed}</span>
              <span class="am-expand">{isCollapsed ? '▸' : '▾'}</span>
            </button>
            {#if !isCollapsed}
              {#if agent.progressSummary}
                <div class="am-progress">{agent.progressSummary}</div>
              {/if}
              {#if agent.output}
                <div class="am-output">{agent.output}</div>
              {/if}
              {#if !agent.progressSummary && !agent.output}
                <div class="am-progress am-progress-waiting">Working…</div>
              {/if}
            {/if}
          </div>
        {/each}
        <!-- Done agents: collapsed by default, click to expand -->
        {#each doneAgents as agent (agent.toolUseId)}
          {@const isCollapsed = !collapsedIds.has(agent.toolUseId)}
          <div class="am-item done">
            <button class="am-item-header" onclick={() => toggleCollapse(agent.toolUseId)}>
              <span class="am-dot done-dot"></span>
              <span class="am-desc">{agent.description || 'Agent'}</span>
              <span class="am-time">done</span>
              <span class="am-expand">{isCollapsed ? '▸' : '▾'}</span>
            </button>
            {#if !isCollapsed}
              {#if agent.progressSummary}
                <div class="am-progress">{agent.progressSummary}</div>
              {/if}
              {#if agent.output}
                <div class="am-output">{agent.output}</div>
              {/if}
            {/if}
          </div>
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
    max-height: 180px;
    overflow-y: auto;
    transition: border-color 0.3s, max-height 0.3s;
  }
  .agent-monitor.has-running {
    border-top-color: rgba(109, 254, 156, 0.3);
    max-height: 320px;
  }
  .agent-monitor::-webkit-scrollbar { width: 5px; }
  .agent-monitor::-webkit-scrollbar-thumb { background: var(--outline-dim); border-radius: 3px; }

  .am-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
    border-bottom: 1px solid var(--outline-dim);
    position: sticky;
    top: 0;
    background: rgba(26, 26, 53, 0.95);
    z-index: 1;
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
    color: var(--text);
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
    width: 100%;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }
  .am-item-header:hover { background: rgba(124, 58, 237, 0.08); }

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
  .am-dot.done-dot {
    background: var(--text-dim);
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
  .am-progress {
    padding: 2px 10px 2px 28px;
    font-size: 1rem;
    font-family: 'Fira Code', monospace;
    color: var(--green);
    font-style: italic;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .am-progress-waiting {
    color: var(--text-dim);
  }
  .am-tool-badge {
    font-family: 'Fira Code', monospace;
    font-size: 0.85rem;
    color: var(--blue);
    background: rgba(93, 163, 250, 0.1);
    padding: 0 4px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .am-output {
    padding: 4px 10px 4px 28px;
    font-size: 1rem;
    font-family: 'Fira Code', monospace;
    color: var(--text-dim);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 120px;
    overflow-y: auto;
    border-top: 1px dashed var(--outline-dim);
  }
</style>
