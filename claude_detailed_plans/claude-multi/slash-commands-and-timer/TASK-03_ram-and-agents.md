# Task 03: RAM Monitoring + Sub-Agent Tracking

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Bun + TypeScript (server), Vanilla HTML/CSS/JS (client)
**Modifies:** 2 existing files

## Goal
Monitor RAM usage per Claude process and track active sub-agent count by parsing stream-json output. Display both in the panel header as live-updating badges.

## Files to Modify

### 1. `server.ts` — Server-side stats collection

**Add stats tracking per panel:**
```ts
const panelStats = new Map<number, { ram: number; agents: number; pid: number | null }>();
```

**Add RAM polling function:**
```ts
async function pollProcessRam(pid: number): Promise<number> {
  try {
    const proc = Bun.spawn(
      ["powershell", "-NoProfile", "-Command",
       `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).WorkingSet64`],
      { stdout: "pipe", stderr: "ignore" }
    );
    const text = await new Response(proc.stdout).text();
    const bytes = parseInt(text.trim(), 10);
    return isNaN(bytes) ? 0 : bytes;
  } catch {
    return 0;
  }
}
```

**Add periodic stats broadcaster:**
```ts
setInterval(async () => {
  for (const [panelId, entry] of processes) {
    const pid = entry.proc.pid;
    if (!pid) continue;

    const ram = await pollProcessRam(pid);
    const stats = panelStats.get(panelId) || { ram: 0, agents: 0, pid: null };
    stats.ram = ram;
    stats.pid = pid;
    panelStats.set(panelId, stats);

    broadcast({ type: "stats", panelId, ram, agents: stats.agents });
  }
}, 3000); // Poll every 3 seconds
```

**Track sub-agents in readStream():**

When parsing stdout lines, after the existing JSON parse, count Agent tool_use events:
```ts
// Inside the stdout line parsing, after `const parsed = JSON.parse(line);`
if (parsed.type === "assistant" && Array.isArray(parsed.message?.content)) {
  for (const block of parsed.message.content) {
    if (block.type === "tool_use" && block.name === "Agent") {
      const stats = panelStats.get(panelId) || { ram: 0, agents: 0, pid: null };
      stats.agents++;
      panelStats.set(panelId, stats);
      broadcast({ type: "stats", panelId, ram: stats.ram, agents: stats.agents });
    }
  }
}
if (parsed.type === "user" && Array.isArray(parsed.message?.content)) {
  for (const block of parsed.message.content) {
    if (block.type === "tool_result" && block.tool_use_id) {
      // Agent completed — decrement (but floor at 0)
      const stats = panelStats.get(panelId);
      if (stats && stats.agents > 0) {
        stats.agents--;
        broadcast({ type: "stats", panelId, ram: stats.ram, agents: stats.agents });
      }
    }
  }
}
```

Note: The tool_result decrement is approximate since we can't perfectly match Agent tool_use_id to tool_result. A simpler approach: just count tool_use with name "Agent" and decrement on any tool_result. This gives a reasonable approximation. Alternatively, track tool_use IDs in a Set per panel.

**Better approach — track by tool_use_id:**
```ts
const activeAgentIds = new Map<number, Set<string>>(); // panelId -> Set of tool_use_ids

// On tool_use with name "Agent":
if (block.type === "tool_use" && block.name === "Agent" && block.id) {
  if (!activeAgentIds.has(panelId)) activeAgentIds.set(panelId, new Set());
  activeAgentIds.get(panelId)!.add(block.id);
  const count = activeAgentIds.get(panelId)!.size;
  const stats = panelStats.get(panelId) || { ram: 0, agents: 0, pid: null };
  stats.agents = count;
  panelStats.set(panelId, stats);
  broadcast({ type: "stats", panelId, ram: stats.ram, agents: count });
}

// On tool_result:
if (block.type === "tool_result" && block.tool_use_id) {
  const ids = activeAgentIds.get(panelId);
  if (ids) {
    ids.delete(block.tool_use_id);
    const count = ids.size;
    const stats = panelStats.get(panelId) || { ram: 0, agents: 0, pid: null };
    stats.agents = count;
    panelStats.set(panelId, stats);
    broadcast({ type: "stats", panelId, ram: stats.ram, agents: count });
  }
}
```

**Clean up on process exit:**
```ts
// In the proc.exited.then callback:
panelStats.delete(panelId);
activeAgentIds.delete(panelId);
broadcast({ type: "stats", panelId, ram: 0, agents: 0 });
```

### 2. `public/index.html` — Client-side stats display

**CSS additions:**
```css
.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--text-dim);
  background: var(--input-bg);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.panel-badge.ram { color: var(--orange); }
.panel-badge.agents { color: var(--blue); }
.panel-badge.hidden { display: none; }
```

**Panel class changes:**

Add properties:
```js
this.ramEl = null;
this.agentsEl = null;
```

Add badge elements inside `.panel-meta` (before timer):
```html
<span class="panel-badge ram hidden" title="RAM usage">0 MB</span>
<span class="panel-badge agents hidden" title="Active sub-agents">0 agents</span>
```

Query them:
```js
this.ramEl = div.querySelector(".panel-badge.ram");
this.agentsEl = div.querySelector(".panel-badge.agents");
```

Add method:
```js
updateStats(ram, agents) {
  if (ram > 0) {
    const mb = (ram / 1024 / 1024).toFixed(0);
    this.ramEl.textContent = `${mb} MB`;
    this.ramEl.classList.remove("hidden");
  } else {
    this.ramEl.classList.add("hidden");
  }
  if (agents > 0) {
    this.agentsEl.textContent = `${agents} agent${agents > 1 ? 's' : ''}`;
    this.agentsEl.classList.remove("hidden");
  } else {
    this.agentsEl.classList.add("hidden");
  }
}
```

**Add to WS message handler:**
```js
case "stats":
  if (panel) panel.updateStats(msg.ram, msg.agents);
  break;
```

**Reset on done:**
In the existing `case "done":` handler, add: `panel.updateStats(0, 0);`

## Key Patterns to Follow
- Server: follow existing `broadcast()` pattern for sending stats
- Server: follow existing `readStream()` pattern for parsing JSON lines
- Client: follow existing `.status-dot` pattern for header badges
- Use CSS custom properties, `.hidden` class for show/hide
- Clean up stats on process exit and panel remove

## Verification
Run `bun run server.ts`, send a prompt, verify RAM badge appears and updates every ~3 seconds while running, disappears when done. If the prompt triggers Agent tool calls, verify agent count increments/decrements.
