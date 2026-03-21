<script lang="ts">
  import { settingsStore } from './stores/settings.svelte';
  import type { ModelId, EffortLevel, McpServerEntry } from './types';

  let open = $state(false);
  let showAddMcp = $state(false);
  let mcpName = $state('');
  let mcpCommand = $state('');
  let mcpArgs = $state('');
  let mcpEnv = $state('');

  const FONT_PRESETS = [
    { label: 'XS', scale: 0.8 },
    { label: 'S',  scale: 0.9 },
    { label: 'M',  scale: 1.0 },
    { label: 'L',  scale: 1.15 },
    { label: 'XL', scale: 1.3 },
  ];

  const MODELS: { id: ModelId; label: string }[] = [
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku' },
    { id: 'claude-sonnet-4-6',         label: 'Sonnet' },
    { id: 'claude-opus-4-6',           label: 'Opus' },
  ];

  const EFFORTS: { id: EffortLevel; label: string }[] = [
    { id: 'low',    label: 'Low' },
    { id: 'medium', label: 'Med' },
    { id: 'high',   label: 'High' },
    { id: 'max',    label: 'Max' },
  ];

  function close(e: MouseEvent) {
    if (!(e.target as Element).closest('.settings-wrap')) open = false;
  }

  let modelLabel = $derived(MODELS.find(m => m.id === settingsStore.model)?.label ?? 'Sonnet');
  let effortLabel = $derived(settingsStore.effort.charAt(0).toUpperCase() + settingsStore.effort.slice(1));

  function addMcpServer() {
    const name = mcpName.trim();
    const command = mcpCommand.trim();
    if (!name || !command) return;
    const args = mcpArgs.trim() ? mcpArgs.split(',').map(a => a.trim()).filter(Boolean) : [];
    const envPairs = mcpEnv.trim() ? mcpEnv.split('\n').reduce((acc: Record<string, string>, line) => {
      const [k, ...v] = line.split('=');
      if (k?.trim()) acc[k.trim()] = v.join('=').trim();
      return acc;
    }, {}) : {};
    settingsStore.addMcpServer({ name, command, args, env: envPairs, enabled: true });
    mcpName = ''; mcpCommand = ''; mcpArgs = ''; mcpEnv = '';
    showAddMcp = false;
  }
</script>

<svelte:window onclick={close} />

<div class="settings-wrap">
  <button class="hdr-btn cog-btn" class:active={open} onclick={() => open = !open} title="Settings">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  </button>

  {#if open}
    <div class="settings-popover">
      <div class="setting-row">
        <span class="setting-label">Font</span>
        <div class="preset-btns">
          {#each FONT_PRESETS as p}
            <button
              class="preset-btn"
              class:active={Math.abs(settingsStore.fontScale - p.scale) < 0.01}
              onclick={() => settingsStore.setFontScale(p.scale)}
            >
              {p.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">Model</span>
        <div class="preset-btns">
          {#each MODELS as m}
            <button
              class="preset-btn"
              class:active={settingsStore.model === m.id}
              onclick={() => settingsStore.setModel(m.id)}
            >
              {m.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">Effort</span>
        <div class="preset-btns">
          {#each EFFORTS as e}
            <button
              class="preset-btn"
              class:active={settingsStore.effort === e.id}
              onclick={() => settingsStore.setEffort(e.id)}
            >
              {e.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="setting-section">
        <span class="setting-label">MCP</span>
        {#if settingsStore.mcpServers.length > 0}
          <div class="mcp-list">
            {#each settingsStore.mcpServers as server}
              <div class="mcp-row">
                <span class="mcp-name">{server.name}</span>
                <span class="mcp-cmd">{server.command}</span>
                <button class="mcp-toggle" class:on={server.enabled}
                  onclick={() => settingsStore.updateMcpServer(server.name, { enabled: !server.enabled })}
                >{server.enabled ? 'ON' : 'OFF'}</button>
                <button class="mcp-remove" onclick={() => settingsStore.removeMcpServer(server.name)}>&times;</button>
              </div>
            {/each}
          </div>
        {/if}
        {#if showAddMcp}
          <div class="mcp-form">
            <input class="mcp-input" bind:value={mcpName} placeholder="name" />
            <input class="mcp-input" bind:value={mcpCommand} placeholder="command (e.g. npx)" />
            <input class="mcp-input" bind:value={mcpArgs} placeholder="args (comma separated)" />
            <textarea class="mcp-env-input" bind:value={mcpEnv} placeholder="env (KEY=VALUE per line)" rows={2}></textarea>
            <div class="mcp-form-actions">
              <button class="preset-btn active" onclick={addMcpServer}>Add</button>
              <button class="preset-btn" onclick={() => showAddMcp = false}>Cancel</button>
            </div>
          </div>
        {:else}
          <button class="preset-btn" onclick={() => showAddMcp = true}>+ Add Server</button>
        {/if}
      </div>

      <div class="model-status">
        {modelLabel} · {effortLabel}
      </div>
    </div>
  {/if}
</div>

<style>
  .settings-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
  }

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

  .hdr-btn:hover,
  .hdr-btn.active {
    border-color: var(--accent);
    color: var(--text);
    background: var(--surface-high);
  }

  .settings-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--surface-low);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius-lg);
    padding: 10px 12px;
    min-width: 220px;
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .setting-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .setting-label {
    font-size: 1rem;
    font-family: 'Fira Code', monospace;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    min-width: 44px;
  }

  .preset-btns {
    display: flex;
    gap: 4px;
  }

  .preset-btn {
    padding: 3px 7px;
    border: 1px solid var(--outline-dim);
    background: var(--surface-mid);
    color: var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 1.1rem;
    font-family: 'Fira Code', monospace;
    transition: all 0.12s;
  }

  .preset-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  .preset-btn.active {
    border-color: var(--accent);
    background: rgba(204, 151, 255, 0.12);
    color: var(--accent);
  }

  .model-status {
    font-family: 'Fira Code', monospace;
    font-size: 0.95rem;
    color: var(--text-dim);
    text-align: right;
    border-top: 1px solid var(--outline-dim);
    padding-top: 6px;
    margin-top: 2px;
  }

  /* ---- MCP Servers ---- */
  .setting-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid var(--outline-dim);
    padding-top: 8px;
    margin-top: 2px;
  }
  .mcp-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .mcp-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
  }
  .mcp-name {
    color: var(--accent);
    font-weight: 600;
    min-width: 60px;
  }
  .mcp-cmd {
    color: var(--text-dim);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mcp-toggle {
    background: none;
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
    padding: 1px 4px;
    cursor: pointer;
  }
  .mcp-toggle.on { color: var(--green); border-color: var(--green); }
  .mcp-remove {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0 2px;
    line-height: 1;
  }
  .mcp-remove:hover { color: var(--red); }
  .mcp-form {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .mcp-input {
    background: var(--surface-mid);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    color: var(--text);
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    padding: 3px 6px;
    outline: none;
  }
  .mcp-input:focus { border-color: var(--accent); }
  .mcp-input::placeholder { color: var(--outline); }
  .mcp-env-input {
    background: var(--surface-mid);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    color: var(--text);
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    padding: 3px 6px;
    outline: none;
    resize: vertical;
    min-height: 30px;
  }
  .mcp-env-input:focus { border-color: var(--accent); }
  .mcp-env-input::placeholder { color: var(--outline); }
  .mcp-form-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }
</style>
