# Task 07: Agent Monitor

**Status:** Not started
**Depends on:** Task 02, Task 04
**Scope:** claude-multi
**Stack:** Svelte 5 + TypeScript (frontend) + Bun (backend)
**Creates:** 1 new file / **Modifies:** 3 existing files

## Goal
Add enhanced sub-agent tracking on the server (broadcasting individual agent details) and create an AgentMonitor component — an expandable section within each panel that shows per-agent status, description, elapsed time, and accumulated output. Clicking the agents badge toggles the monitor section.

## Files to Modify

### 1. `server.ts` (MODIFY — broadcast agent_detail messages)
Enhance the agent tracking to broadcast individual agent detail events so the frontend can display per-agent information.

In the `readStream` function, update the agent tracking blocks:

```ts
// In the tool_use Agent tracking block, after adding to activeAgentIds:
if (block.type === "tool_use" && block.name === "Agent" && block.id) {
  if (!activeAgentIds.has(panelId)) activeAgentIds.set(panelId, new Set());
  activeAgentIds.get(panelId)!.add(block.id);
  const count = activeAgentIds.get(panelId)!.size;
  const stats = panelStats.get(panelId) || { ram: 0, agents: 0, pid: null };
  stats.agents = count;
  panelStats.set(panelId, stats);
  broadcast({ type: "stats", panelId, ram: stats.ram, agents: count });

  // NEW: Broadcast agent detail
  const description = typeof block.input === "string"
    ? block.input.slice(0, 100)
    : (block.input?.description || block.input?.prompt || JSON.stringify(block.input)).slice(0, 100);
  broadcast({
    type: "agent_detail",
    panelId,
    agent: {
      toolUseId: block.id,
      description,
      status: "running",
    },
  });
}

// In the tool_result block, after removing from activeAgentIds:
if (block.type === "tool_result" && block.tool_use_id) {
  const ids = activeAgentIds.get(panelId);
  if (ids && ids.delete(block.tool_use_id)) {
    const count = ids.size;
    const stats = panelStats.get(panelId) || { ram: 0, agents: 0, pid: null };
    stats.agents = count;
    panelStats.set(panelId, stats);
    broadcast({ type: "stats", panelId, ram: stats.ram, agents: count });

    // NEW: Broadcast agent done
    const output = typeof block.content === "string"
      ? block.content.slice(0, 500)
      : JSON.stringify(block.content).slice(0, 500);
    broadcast({
      type: "agent_detail",
      panelId,
      agent: {
        toolUseId: block.tool_use_id,
        description: "",
        status: "done",
        output,
      },
    });
  }
}
```

### 2. `src/lib/stores/panels.ts` (MODIFY — handle agent_detail updates)
Add a method to update agent details in the panel state:

```ts
function updateAgentDetail(panelId: number, agent: { toolUseId: string; description: string; status: string; output?: string }) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;

  const existing = panel.agentDetails.find(a => a.toolUseId === agent.toolUseId);
  if (existing) {
    existing.status = agent.status as 'running' | 'done';
    if (agent.output) existing.output = agent.output;
  } else {
    panel.agentDetails.push({
      toolUseId: agent.toolUseId,
      description: agent.description,
      status: agent.status as 'running' | 'done',
      startTime: Date.now(),
      output: agent.output || '',
    });
  }

  // Clean up completed agents after 30 seconds
  const cutoff = Date.now() - 30000;
  panel.agentDetails = panel.agentDetails.filter(
    a => a.status === 'running' || a.startTime > cutoff
  );
}
```

Add `updateAgentDetail` to the panelStore export object.

### 3. `src/App.svelte` (MODIFY — route agent_detail messages)
Add a case in the WS message switch to handle agent_detail:

```ts
case 'agent_detail':
  panelStore.updateAgentDetail(msg.panelId, msg.agent);
  break;
```

### 4. `src/lib/AgentMonitor.svelte` (CREATE)
An expandable section within the panel that shows active and recently completed agents.

```svelte
<script lang="ts">
  import type { AgentDetail } from './types';

  let { agents, visible }: {
    agents: AgentDetail[];
    visible: boolean;
  } = $props();

  function formatElapsed(startTime: number): string {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

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
        {@const elapsed = formatElapsed(agent.startTime)}
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
```

### 5. `src/lib/Panel.svelte` (MODIFY — integrate AgentMonitor)
Add the AgentMonitor between PanelOutput and PanelInput:

In the `<script>` section, add:
```ts
import AgentMonitor from './AgentMonitor.svelte';

let showAgentMonitor = $state(false);
```

Make the agents badge clickable to toggle the monitor:
```svelte
<!-- Replace the static agents badge with a clickable one: -->
{#if agentsText}
  <button class="panel-badge agents" title="Active sub-agents" onclick={() => showAgentMonitor = !showAgentMonitor}>
    {agentsText}
  </button>
{/if}
```

Add AgentMonitor in the template between PanelOutput and PanelInput:
```svelte
<PanelOutput messages={panel.messages} />
<AgentMonitor agents={panel.agentDetails} visible={showAgentMonitor || panel.agents > 0} />
<PanelInput status={panel.status} onSend={handleSend} panelId={panel.id} cwd={panel.cwd} />
```

## Key Patterns to Follow
- Svelte 5: `$props()`, `$state()`, `$derived()`, `$effect()` for reactivity
- Server broadcasts `agent_detail` events with `toolUseId`, `description`, `status`, `output`
- Agent descriptions extracted from the `block.input` (Agent tool's description/prompt field)
- Completed agents cleaned up after 30 seconds to prevent unbounded growth
- Agent monitor auto-shows when agents > 0, badge click toggles manual visibility
- Timer ticks via `$effect` with `setInterval` only when monitor is visible and agents are running
- Each agent row is expandable — click to reveal output
- The `@const` directive computes elapsed time per render

## Verification
```bash
bun run check
bun run build
```
