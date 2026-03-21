<script lang="ts">
  import { settingsStore } from './stores/settings.svelte';

  let open = $state(false);

  const PRESETS = [
    { label: 'XS', scale: 0.8 },
    { label: 'S',  scale: 0.9 },
    { label: 'M',  scale: 1.0 },
    { label: 'L',  scale: 1.15 },
    { label: 'XL', scale: 1.3 },
  ];

  function close(e: MouseEvent) {
    if (!(e.target as Element).closest('.settings-wrap')) open = false;
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
        <span class="setting-label">Font Size</span>
        <div class="preset-btns">
          {#each PRESETS as p}
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
    </div>
  {/if}
</div>

<style>
  .settings-wrap {
    position: relative;
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
    min-width: 200px;
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
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
</style>
