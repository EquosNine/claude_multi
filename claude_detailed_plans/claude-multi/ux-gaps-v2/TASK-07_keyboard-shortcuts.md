# Task 07: Full Keyboard Shortcuts

**Status:** Not started
**Depends on:** Task 01 (panel ID stability)
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Creates:** 1 new file / **Modifies:** 3 existing files

## Goal
Add comprehensive keyboard shortcuts for panel navigation, management, and common actions. Users should be able to switch between panels, add/clear/close panels, and copy output — all without touching the mouse.

## Shortcuts to Implement

| Shortcut | Action |
|----------|--------|
| Ctrl+1 through Ctrl+6 | Focus panel N's textarea |
| Ctrl+N | Add a new panel |
| Ctrl+L | Clear the focused panel's output |
| Ctrl+W | Close/remove the focused panel |
| Ctrl+Shift+C | Copy focused panel's output to clipboard |
| Ctrl+G | Toggle grid/columns layout |

## Files to Create/Modify

### 1. `src/lib/stores/panels.svelte.ts`

Add a `focusedPanelId` state to track which panel the user is interacting with:

```typescript
let focusedPanelId = $state<number | null>(null);

function setFocusedPanel(panelId: number | null) {
  focusedPanelId = panelId;
}

function getFocusedPanel(): PanelState | undefined {
  if (focusedPanelId === null) return panels[0];
  return panels.find(p => p.id === focusedPanelId);
}

function getPanelByIndex(index: number): PanelState | undefined {
  return panels[index];
}
```

Export these in the `panelStore` object:
```typescript
export const panelStore = {
  // ... existing ...
  get focusedPanelId() { return focusedPanelId; },
  setFocusedPanel,
  getFocusedPanel,
  getPanelByIndex,
};
```

### 2. Create `src/lib/KeyboardShortcuts.svelte`

A headless component that mounts once and handles all global keyboard shortcuts:

```svelte
<script lang="ts">
  import { panelStore } from './stores/panels.svelte';
  import { copyPanelOutput } from './export';

  function handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    // Ctrl+1 through Ctrl+6 — focus panel by position
    if (e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      const panel = panelStore.getPanelByIndex(index);
      if (panel) {
        panelStore.setFocusedPanel(panel.id);
        // Focus the panel's textarea
        const textarea = document.querySelector(
          `[data-panel-id="${panel.id}"] textarea`
        ) as HTMLTextAreaElement | null;
        textarea?.focus();
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        if (!e.shiftKey) {
          e.preventDefault();
          panelStore.createPanel();
        }
        break;

      case 'l':
        if (!e.shiftKey) {
          e.preventDefault();
          const panel = panelStore.getFocusedPanel();
          if (panel) panelStore.clearMessages(panel.id);
        }
        break;

      case 'w':
        if (!e.shiftKey) {
          e.preventDefault();
          const panel = panelStore.getFocusedPanel();
          if (panel && panelStore.panels.length > 1) {
            panelStore.removePanel(panel.id);
          }
        }
        break;

      case 'c':
        if (e.shiftKey) {
          e.preventDefault();
          const panel = panelStore.getFocusedPanel();
          if (panel) copyPanelOutput(panel.messages);
        }
        break;

      case 'g':
        if (!e.shiftKey) {
          e.preventDefault();
          panelStore.toggleLayout();
        }
        break;
    }
  }

  $effect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>
```

No template needed — this is a headless (logic-only) component.

### 3. `src/lib/Panel.svelte`

Add `data-panel-id` attribute for keyboard focus targeting:

```svelte
<!-- BEFORE -->
<div class="panel {flashClass}">

<!-- AFTER -->
<div class="panel {flashClass}" data-panel-id={panel.id}>
```

Track focus on the textarea to update `focusedPanelId`:

Pass the `panelId` to PanelInput or handle focus at the panel level. Add an onfocus handler to the panel div:

```svelte
<div class="panel {flashClass}" data-panel-id={panel.id}
     onfocusin={() => panelStore.setFocusedPanel(panel.id)}>
```

This captures focus events from any child element (textarea, buttons, etc.) via event bubbling.

### 4. `src/App.svelte`

Mount the KeyboardShortcuts component:

```svelte
<script lang="ts">
  // ... existing imports ...
  import KeyboardShortcuts from './lib/KeyboardShortcuts.svelte';
</script>

<KeyboardShortcuts />
<Header />
<!-- ... rest of template -->
```

## Key Patterns to Follow
- Follow the existing global keydown listener pattern from `SlashDropdown.svelte` (lines 117-119)
- Use `data-panel-id` attribute + `querySelector` for DOM targeting (avoids passing refs through the component tree)
- `onfocusin` (not `onfocus`) on the panel div to capture child focus events via bubbling
- Ctrl+W has a special guard: don't close if only 1 panel remains
- `copyPanelOutput` is defined in Task 08 (`export.ts`) — if Task 08 isn't done yet, create a stub or implement inline
- Use `e.ctrlKey || e.metaKey` to support both Windows and Mac

## Verification
```bash
bun run check
bun run build
```

Manual test:
1. Ctrl+N — creates a new panel
2. Ctrl+1, Ctrl+2 — cursor moves to the respective panel's textarea
3. Ctrl+L — clears the focused panel's output
4. Ctrl+G — toggles between grid and column layout
5. Ctrl+Shift+C — copies output (if Task 08 is complete)
6. Ctrl+W — removes focused panel (not if it's the last one)
