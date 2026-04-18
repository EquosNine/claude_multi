# Task 09: Smart Grid Layout for 1-6 Panels

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Modifies:** 3 existing files

## Goal
Replace the current two fixed layout modes (auto-fit columns / 2-column grid) with a smart grid system that adapts based on panel count. Add a layout cycle button that rotates through sensible options. Ensure panels are always large enough to be usable.

## Layout Rules

| Panels | Default Layout | Options |
|--------|---------------|---------|
| 1 | 1 column, full width | — |
| 2 | 2 columns | 1 col (stacked) |
| 3 | 3 columns | 2+1, 1 col |
| 4 | 2x2 grid | 4 cols, 1 col |
| 5 | 3+2 grid (3 cols) | 2+2+1, 1 col |
| 6 | 3x2 grid (3 cols) | 2x3, 1 col |

## Files to Modify

### 1. `src/lib/stores/panels.svelte.ts`

Replace the simple `'columns' | 'grid'` layout with a layout cycle:

```typescript
// Replace existing layout state
let layoutMode = $state<'auto' | '1col' | '2col' | '3col'>('auto');

function toggleLayout() {
  const modes: Array<typeof layoutMode> = ['auto', '1col', '2col', '3col'];
  const current = modes.indexOf(layoutMode);
  layoutMode = modes[(current + 1) % modes.length];
}

// Replace in panelStore export:
export const panelStore = {
  // ... existing ...
  get layout() { return layoutMode; },
  toggleLayout,
};
```

### 2. `src/App.svelte`

Replace the `gridClass` derived value with a smarter class that considers both panel count and layout mode:

```typescript
let gridClass = $derived.by(() => {
  const n = panelStore.panels.length;
  const mode = panelStore.layout;

  if (mode === '1col') return 'layout-1';
  if (mode === '2col') return 'layout-2';
  if (mode === '3col') return 'layout-3';

  // Auto mode: pick the best layout for the panel count
  if (n <= 1) return 'layout-1';
  if (n === 2) return 'layout-2';
  if (n === 3) return 'layout-3';
  if (n === 4) return 'layout-2'; // 2x2
  return 'layout-3'; // 5-6: 3-column grid
});
```

**Update the CSS in `<style>` block of App.svelte:**

```css
#panels {
  flex: 1;
  display: grid;
  gap: 1px;
  background: var(--panel-border);
  overflow: hidden;
}

#panels.layout-1 {
  grid-template-columns: 1fr;
}

#panels.layout-2 {
  grid-template-columns: repeat(2, 1fr);
}

#panels.layout-3 {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 900px) {
  #panels {
    grid-template-columns: 1fr !important;
  }
}
```

Remove the old `layout-columns` and `layout-grid` classes and the `grid-auto-rows: 1fr` / `grid-template-rows: 1fr` rules. The new approach uses only `grid-template-columns`, and CSS grid will auto-create rows as needed with equal height via the `flex: 1` on `#panels`.

### 3. `src/lib/Header.svelte`

Update the layout button to show the current mode and cycle through options:

```typescript
let layoutLabel = $derived.by(() => {
  switch (panelStore.layout) {
    case 'auto': return 'Auto';
    case '1col': return '1 Col';
    case '2col': return '2 Col';
    case '3col': return '3 Col';
    default: return 'Auto';
  }
});
```

Update the button text:
```svelte
<button class="btn" onclick={() => panelStore.toggleLayout()}>
  {layoutLabel}
</button>
```

## Key Patterns to Follow
- Follow the existing CSS grid pattern in `App.svelte` `<style>` block
- The `auto` mode should be the default and smartest — it adapts to panel count
- Manual overrides (`1col`, `2col`, `3col`) let users force a layout regardless of count
- Keep the mobile breakpoint at 900px — always stack to 1 column on narrow screens
- CSS `grid-template-columns` handles the column layout; rows auto-fill with equal distribution
- No need for explicit row templates — CSS grid auto-creates rows

## Verification
```bash
bun run check
bun run build
```

Manual test:
1. Start with 1 panel — verify full width
2. Add panels up to 6 — verify auto layout adapts (2-col at 4, 3-col at 5-6)
3. Click layout button — verify it cycles through Auto → 1 Col → 2 Col → 3 Col
4. Verify responsive: resize window below 900px — all panels stack to 1 column
