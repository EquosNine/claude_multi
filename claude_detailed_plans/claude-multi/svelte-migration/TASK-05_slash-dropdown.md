# Task 05: Slash Command Dropdown

**Status:** Not started
**Depends on:** Task 02, Task 04
**Scope:** claude-multi
**Stack:** Svelte 5 + TypeScript
**Creates:** 1 new file

## Goal
Create the SlashDropdown component — a categorized autocomplete overlay that appears above the input when the user types `/`. Supports keyboard navigation (Arrow Up/Down, Enter/Tab to select, Escape to close) and mouse click selection. Handles client-side commands (/clear, /help) locally and sends skill commands as prompts.

## Files to Create

### 1. `src/lib/SlashDropdown.svelte`
Positioned absolutely above the panel input. Filters SLASH_COMMANDS by the current input, groups by category with colored labels, highlights the selected item.

```svelte
<script lang="ts">
  import { SLASH_COMMANDS, CATEGORY_LABELS, CATEGORY_COLORS } from './commands';
  import { panelStore } from './stores/panels';
  import type { SlashCommand } from './types';

  let { filter, onSelect, onClose, panelId, cwd }: {
    filter: string;
    onSelect: (prompt: string) => void;
    onClose: () => void;
    panelId: number;
    cwd: string;
  } = $props();

  let selectedIndex = $state(0);
  let dropdownEl: HTMLDivElement;

  let filteredCmds = $derived.by(() => {
    const query = filter.toLowerCase().slice(1); // remove leading /
    return SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(query));
  });

  // Reset selection when filter changes
  $effect(() => {
    filter; // track
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
        onSelect(''); // close without sending
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
        onSelect(''); // close without sending
        return;
      }
    }

    // Skill command — send as prompt
    if (!cwd.trim()) {
      panelStore.addMessage(panelId, {
        id: panelStore.nextMsgId(),
        type: 'system',
        text: 'Set a project directory first.',
      });
      onSelect('');
      return;
    }
    // Show user's command in output, then send
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

  // Attach keyboard handler to the parent input's keydown
  // The parent PanelInput component should forward keydown events here.
  // We use window-level keydown as a fallback since the dropdown is open.
  $effect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // Group commands by category for rendering
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
      <div
        class="slash-item"
        class:selected={item.index === selectedIndex}
        onmousedown|preventDefault={() => executeCmd(item.cmd!)}
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
    font-size: 10px;
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
    font-size: 13px;
  }
  .slash-item:hover, .slash-item.selected {
    background: rgba(124, 58, 237, 0.12);
  }
  .slash-item .cmd {
    font-weight: 600;
    min-width: 140px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
  }
  .slash-item .desc {
    color: var(--text-dim);
    font-size: 11px;
    flex: 1;
    text-align: right;
  }
</style>
```

## Key Patterns to Follow
- Svelte 5: `$derived.by()` for computed values that need function bodies
- Svelte 5: `$effect()` for registering/cleaning up window event listeners
- `onmousedown|preventDefault` prevents blur on the textarea which would close the dropdown prematurely
- `onmouseenter` updates the selected index for hover highlighting
- Commands array from `src/lib/commands.ts` (all 66 commands copied in Task 02)
- Category labels and colors from `src/lib/commands.ts`
- Client commands (/clear, /help) are handled locally without WS
- Skill commands are sent as `"${cmd.cmd} ${cmd.desc}"` prompt via onSelect callback
- The parent PanelInput controls visibility via `showSlash` state

## Verification
```bash
bun run check
bun run build
```
