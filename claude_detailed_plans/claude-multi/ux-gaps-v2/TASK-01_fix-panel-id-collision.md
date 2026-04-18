# Task 01: Fix Panel ID Collision

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Modifies:** 1 existing file

## Goal
Fix the bug where panel IDs collide after removing and re-adding panels. Currently `panels.svelte.ts` assigns `id = panels.length`, so removing panel 1 from [0,1,2] then adding a new panel creates another panel with `id = 2`, causing WebSocket message routing collisions and localStorage overwrites.

## Files to Modify

### 1. `src/lib/stores/panels.svelte.ts`

Replace the panel ID assignment with a monotonic counter that guarantees unique IDs within a session.

**Changes:**

1. Add a module-level counter:
```typescript
let nextPanelId = 0;
```

2. In `createPanel()`, change:
```typescript
// BEFORE (line 17):
const id = panels.length;

// AFTER:
const id = nextPanelId++;
```

3. In `restorePanels()`, reset the counter before creating panels so IDs start at 0 on page load (preserving localStorage key compatibility):
```typescript
function restorePanels() {
  nextPanelId = 0; // Reset so restored panels get 0-based IDs
  const count = parseInt(localStorage.getItem('panel-count') || '1', 10);
  const n = Math.max(1, Math.min(count, MAX_PANELS));
  for (let i = 0; i < n; i++) createPanel();
}
```

No other files need changes — `panel.id` is already used everywhere as the routing key.

## Key Patterns to Follow
- Follow the existing `$state` reactivity pattern in `panels.svelte.ts`
- The counter is module-scoped, not reactive (it doesn't need to trigger UI updates)
- localStorage keys use `panel-cwd-${id}` and `panel-name-${id}` — on reload, `restorePanels` resets the counter so keys match

## Verification
```bash
bun run check
bun run build
```

Manual test: Create 3 panels, remove panel 2, add a new panel. Verify the new panel gets a unique ID and messages route correctly.
