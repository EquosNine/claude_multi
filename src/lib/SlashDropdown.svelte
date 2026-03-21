<script lang="ts">
  import { SLASH_COMMANDS, CATEGORY_LABELS, CATEGORY_COLORS } from './commands';
  import { panelStore } from './stores/panels.svelte';
  import type { SlashCommand } from './types';

  let { filter, onSelect, onClose, panelId, cwd, onResume }: {
    filter: string;
    onSelect: (prompt: string) => void;
    onClose: () => void;
    panelId: number;
    cwd: string;
    onResume: () => void;
  } = $props();

  let selectedIndex = $state(0);
  let dropdownEl: HTMLDivElement;

  let filteredCmds = $derived.by(() => {
    const query = filter.toLowerCase().slice(1);
    return SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(query));
  });

  // Reset selection when filter changes
  $effect(() => {
    filter;
    selectedIndex = 0;
  });

  // Close if no results
  $effect(() => {
    if (filteredCmds.length === 0) onClose();
  });

  function executeCmd(cmd: SlashCommand) {
    if (cmd.type === 'client') {
      if (cmd.cmd === '/clear') {
        panelStore.clearMessages(panelId);
        onSelect('');
        return;
      }
      if (cmd.cmd === '/resume') {
        onResume();
        onSelect('');
        return;
      }
      if (cmd.cmd === '/help') {
        panelStore.addMessage(panelId, {
          id: panelStore.nextMsgId(),
          type: 'system',
          text: 'Available commands (type / to search):',
        });
        let lastCat = '';
        for (const c of SLASH_COMMANDS) {
          if (c.cat !== lastCat) {
            lastCat = c.cat;
            panelStore.addMessage(panelId, {
              id: panelStore.nextMsgId(),
              type: 'system',
              text: `\n  [${CATEGORY_LABELS[c.cat] || c.cat}]`,
            });
          }
          panelStore.addMessage(panelId, {
            id: panelStore.nextMsgId(),
            type: 'system',
            text: `    ${c.cmd.padEnd(24)} ${c.desc}`,
          });
        }
        onSelect('');
        return;
      }
    }

    if (!cwd.trim()) {
      panelStore.addMessage(panelId, {
        id: panelStore.nextMsgId(),
        type: 'system',
        text: 'Set a project directory first.',
      });
      onSelect('');
      return;
    }
    panelStore.addMessage(panelId, {
      id: panelStore.nextMsgId(),
      type: 'system',
      text: `> ${cmd.cmd}`,
    });
    onSelect(`${cmd.cmd} ${cmd.desc}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredCmds.length - 1);
      scrollSelectedIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      scrollSelectedIntoView();
    } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      if (filteredCmds[selectedIndex]) {
        executeCmd(filteredCmds[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  function scrollSelectedIntoView() {
    requestAnimationFrame(() => {
      const sel = dropdownEl?.querySelector('.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    });
  }

  $effect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  interface GroupedItem {
    kind: 'label' | 'cmd';
    cat?: string;
    cmd?: SlashCommand;
    index?: number;
  }

  let groupedItems = $derived.by(() => {
    const items: GroupedItem[] = [];
    let lastCat = '';
    filteredCmds.forEach((cmd, i) => {
      if (cmd.cat !== lastCat) {
        lastCat = cmd.cat;
        items.push({ kind: 'label', cat: cmd.cat });
      }
      items.push({ kind: 'cmd', cmd, index: i });
    });
    return items;
  });
</script>

<div class="slash-dropdown visible" bind:this={dropdownEl}>
  {#each groupedItems as item}
    {#if item.kind === 'label'}
      <div
        class="slash-cat-label"
        style="color: {CATEGORY_COLORS[item.cat!] || 'var(--text-dim)'}"
      >
        {CATEGORY_LABELS[item.cat!] || item.cat}
      </div>
    {:else if item.cmd}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="slash-item"
        class:selected={item.index === selectedIndex}
        onmousedown={(e) => { e.preventDefault(); executeCmd(item.cmd!); }}
        onmouseenter={() => { selectedIndex = item.index!; }}
      >
        <span class="cmd" style="color: {CATEGORY_COLORS[item.cmd.cat] || 'var(--accent)'}">
          {item.cmd.cmd}
        </span>
        <span class="desc">{item.cmd.desc}</span>
      </div>
    {/if}
  {/each}
</div>

<style>
  .slash-dropdown {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    max-height: 260px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.4);
    margin-bottom: 4px;
  }
  .slash-dropdown::-webkit-scrollbar { width: 5px; }
  .slash-dropdown::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 3px; }
  .slash-cat-label {
    padding: 4px 10px 2px;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-dim);
    border-top: 1px solid var(--panel-border);
  }
  .slash-cat-label:first-child { border-top: none; }
  .slash-item {
    padding: 5px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.3rem;
  }
  .slash-item:hover, .slash-item.selected {
    background: rgba(124, 58, 237, 0.12);
  }
  .slash-item .cmd {
    font-weight: 600;
    min-width: 140px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 1.2rem;
  }
  .slash-item .desc {
    color: var(--text-dim);
    font-size: 1.1rem;
    flex: 1;
    text-align: right;
  }
</style>
