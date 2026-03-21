<script lang="ts">
  let { currentPath, onSelect, onClose }: {
    currentPath: string;
    onSelect: (path: string) => void;
    onClose: () => void;
  } = $props();

  interface DirEntry {
    name: string;
    path: string;
  }

  let entries = $state<DirEntry[]>([]);
  let browsePath = $state('');
  let loading = $state(false);
  let error = $state('');

  let breadcrumbs = $derived.by(() => {
    if (!browsePath) return [{ label: 'Drives', path: '' }];
    const normalized = browsePath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; path: string }> = [];

    if (parts.length > 0 && parts[0].includes(':')) {
      crumbs.push({ label: parts[0], path: parts[0] + '/' });
      for (let i = 1; i < parts.length; i++) {
        crumbs.push({
          label: parts[i],
          path: parts.slice(0, i + 1).join('/') + '/',
        });
      }
    } else {
      crumbs.push({ label: '/', path: '/' });
      for (let i = 0; i < parts.length; i++) {
        crumbs.push({
          label: parts[i],
          path: '/' + parts.slice(0, i + 1).join('/'),
        });
      }
    }
    return crumbs;
  });

  async function browse(path: string) {
    loading = true;
    error = '';
    try {
      const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) {
        error = data.error;
        entries = [];
      } else {
        entries = data.entries || [];
        browsePath = data.path || path;
      }
    } catch (e: any) {
      error = e.message || 'Failed to browse';
      entries = [];
    }
    loading = false;
  }

  function selectFolder() {
    if (browsePath) onSelect(browsePath);
  }

  $effect(() => {
    browse(currentPath || '');
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="folder-picker-overlay" role="presentation" onclick={onClose}></div>
<div class="folder-picker">
  <div class="fp-header">
    <div class="fp-breadcrumbs">
      {#each breadcrumbs as crumb, i}
        {#if i > 0}<span class="fp-sep">/</span>{/if}
        <button class="fp-crumb" onclick={() => browse(crumb.path)}>
          {crumb.label}
        </button>
      {/each}
    </div>
    <button class="fp-select-btn" onclick={selectFolder} disabled={!browsePath}>
      Select
    </button>
    <button class="fp-close-btn" onclick={onClose}>&times;</button>
  </div>

  {#if loading}
    <div class="fp-loading">Loading...</div>
  {:else if error}
    <div class="fp-error">{error}</div>
  {:else if entries.length === 0}
    <div class="fp-empty">No subdirectories</div>
  {:else}
    <div class="fp-list">
      {#each entries as entry}
        <button class="fp-item" ondblclick={() => { onSelect(entry.path); }} onclick={() => browse(entry.path)}>
          <span class="fp-folder-icon">📁</span>
          <span class="fp-name">{entry.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .folder-picker-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
  }
  .folder-picker {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    max-height: 300px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .fp-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--panel-border);
    flex-shrink: 0;
  }
  .fp-breadcrumbs {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 2px;
    overflow-x: auto;
    min-width: 0;
  }
  .fp-sep {
    color: var(--text-dim);
    font-size: 1.1rem;
  }
  .fp-crumb {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    white-space: nowrap;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  }
  .fp-crumb:hover { background: rgba(124, 58, 237, 0.15); }
  .fp-select-btn {
    padding: 3px 10px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  .fp-select-btn:hover { background: var(--accent-hover); }
  .fp-select-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .fp-close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 1.6rem;
    padding: 0 4px;
    line-height: 1;
  }
  .fp-close-btn:hover { color: var(--red); }
  .fp-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
  .fp-list::-webkit-scrollbar { width: 5px; }
  .fp-list::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 3px; }
  .fp-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    font-size: 1.2rem;
    width: 100%;
    text-align: left;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  }
  .fp-item:hover { background: rgba(124, 58, 237, 0.1); }
  .fp-folder-icon { font-size: 1.4rem; }
  .fp-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .fp-loading, .fp-error, .fp-empty {
    padding: 16px;
    text-align: center;
    font-size: 1.2rem;
    color: var(--text-dim);
  }
  .fp-error { color: var(--red); }
</style>
