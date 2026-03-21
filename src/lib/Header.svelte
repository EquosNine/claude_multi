<script lang="ts">
  import { ws } from './stores/ws.svelte';
  import { panelStore } from './stores/panels.svelte';
  import Settings from './Settings.svelte';
  import ConversationHistory from './ConversationHistory.svelte';

  let connected = $derived(ws.connected);
  let canAdd = $derived(panelStore.panels.length < panelStore.maxPanels);

  let layoutLabel = $derived.by(() => {
    switch (panelStore.layout) {
      case 'auto': return 'Auto';
      case '1col': return '1 Col';
      case '2col': return '2 Col';
      case '3col': return '3 Col';
      default: return 'Auto';
    }
  });

  let addingGroup = $state(false);
  let newGroupName = $state('');
  let editingGroup = $state<string | null>(null);
  let editGroupName = $state('');

  function handleAddGroup() {
    if (newGroupName.trim()) {
      panelStore.createGroup(newGroupName);
      newGroupName = '';
    }
    addingGroup = false;
  }

  function handleAddGroupKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAddGroup();
    if (e.key === 'Escape') { addingGroup = false; newGroupName = ''; }
  }

  function startRenaming(group: string) {
    editingGroup = group;
    editGroupName = group;
  }

  function handleRename() {
    if (editingGroup && editGroupName.trim()) {
      panelStore.renameGroup(editingGroup, editGroupName);
    }
    editingGroup = null;
    editGroupName = '';
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') { editingGroup = null; editGroupName = ''; }
  }

  let visibleCount = $derived(panelStore.visiblePanels.length);
  let totalCount = $derived(panelStore.panels.length);
</script>

<header>
  <div class="header-left">
    <span class="brand">CLAUDE_MULTI</span>
    <nav class="tab-nav">
      {#each panelStore.tabGroups as group}
        {#if editingGroup === group}
          <input
            class="tab-edit"
            type="text"
            bind:value={editGroupName}
            onkeydown={handleRenameKeydown}
            onblur={handleRename}
            autofocus
          />
        {:else}
          <button
            class="tab-btn"
            class:active={panelStore.activeGroup === group}
            onclick={() => panelStore.setActiveGroup(group)}
            ondblclick={() => startRenaming(group)}
            title="Click to switch, double-click to rename"
          >
            {group}
          </button>
        {/if}
      {/each}
      {#if addingGroup}
        <input
          class="tab-edit"
          type="text"
          bind:value={newGroupName}
          onkeydown={handleAddGroupKeydown}
          onblur={handleAddGroup}
          placeholder="TAB_NAME"
          autofocus
        />
      {:else}
        <button class="tab-add" onclick={() => addingGroup = true} title="Add tab group">+</button>
      {/if}
    </nav>
  </div>
  <div class="header-right">
    <div class="conn-status">
      <div class="conn-dot" class:connected></div>
    </div>
    <span class="panel-count">{visibleCount}/{totalCount}</span>
    <button class="hdr-btn" disabled={!canAdd} onclick={() => panelStore.createPanel('claude')}>
      + Panel
    </button>
    <button class="hdr-btn terminal-btn" disabled={!canAdd} onclick={() => panelStore.createPanel('terminal')}>
      + Term
    </button>
    <button class="hdr-btn" onclick={() => panelStore.toggleLayout()}>
      {layoutLabel}
    </button>
    {#if panelStore.tabGroups.length > 1}
      <button
        class="hdr-btn danger"
        onclick={() => panelStore.removeGroup(panelStore.activeGroup)}
        title="Remove this tab group"
      >
        - Tab
      </button>
    {/if}
    <ConversationHistory />
    <Settings />
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    height: 52px;
    flex-shrink: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--outline-dim);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .brand {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--accent);
    text-transform: uppercase;
    text-shadow: 0 0 12px rgba(204, 151, 255, 0.4);
    flex-shrink: 0;
  }
  .tab-nav {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .tab-btn {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 4px 12px;
    color: var(--text-dim);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .tab-btn:hover {
    color: var(--text);
  }
  .tab-btn.active {
    color: var(--green);
    border-bottom-color: var(--green);
  }
  .tab-add {
    background: none;
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .tab-add:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .tab-edit {
    background: var(--surface-mid);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    color: var(--text);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 3px 8px;
    outline: none;
    width: 100px;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .conn-status {
    display: flex;
    align-items: center;
  }
  .conn-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--red);
    transition: background 0.3s;
  }
  .conn-dot.connected {
    background: var(--green);
    box-shadow: 0 0 6px rgba(109, 254, 156, 0.4);
  }
  .panel-count {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--text-dim);
  }
  .hdr-btn {
    padding: 4px 10px;
    border: 1px solid var(--outline-dim);
    background: var(--surface-mid);
    color: var(--text);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 11px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    transition: all 0.15s;
  }
  .hdr-btn:hover { border-color: var(--accent); color: var(--accent); }
  .hdr-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .hdr-btn.danger:hover { border-color: var(--red); color: var(--red); }
  .hdr-btn.terminal-btn:hover { border-color: var(--green); color: var(--green); }
</style>
