# Task 06: Panel-Complete Flash Notification

**Status:** Not started
**Depends on:** Task 01 (panel ID stability)
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Modifies:** 2 existing files

## Goal
Add a visual flash notification when a panel completes its task. When status transitions from `running` to `idle` (or `error`), the panel border briefly flashes green (success) or red (error) to draw attention. This is critical when running 4-6 panels in parallel — users need to see which panels have finished without checking each one.

## Files to Modify

### 1. `src/lib/Panel.svelte`

Add a reactive state to detect status transitions and trigger a flash animation:

```typescript
let flashClass = $state('');

// Detect status transitions
let prevStatus = $state<string>('idle');

$effect(() => {
  const current = panel.status;
  if (prevStatus === 'running' && current !== 'running') {
    // Panel just finished
    flashClass = current === 'error' ? 'flash-error' : 'flash-done';
    setTimeout(() => { flashClass = ''; }, 2000);
  }
  prevStatus = current;
});
```

Apply the flash class to the panel container:

```svelte
<!-- BEFORE -->
<div class="panel">

<!-- AFTER -->
<div class="panel {flashClass}">
```

### 2. `src/app.css`

Add the flash animations at the end:

```css
/* ---- Panel completion flash ---- */
@keyframes flash-done {
  0%   { box-shadow: inset 0 0 0 2px var(--green), 0 0 16px rgba(34, 197, 94, 0.3); }
  100% { box-shadow: none; }
}

@keyframes flash-error {
  0%   { box-shadow: inset 0 0 0 2px var(--red), 0 0 16px rgba(239, 68, 68, 0.3); }
  100% { box-shadow: none; }
}

.panel.flash-done {
  animation: flash-done 2s ease-out;
}

.panel.flash-error {
  animation: flash-error 2s ease-out;
}
```

**Design choice:** Using `inset box-shadow` rather than `border` to avoid layout shifts. The glow effect (outer box-shadow) provides additional visibility.

## Key Patterns to Follow
- Follow the existing `pulse` animation pattern in `src/app.css` for keyframe structure
- Use `$effect()` with cleanup for detecting transitions (pattern from `Panel.svelte` timer effect)
- The flash is temporary (2s) and auto-clears via `setTimeout` — no user action needed
- Green flash for successful completion (exitCode 0), red for errors
- The `$effect` tracks `prevStatus` to detect the transition — it only triggers on `running → idle/error`, not on initial render

## Verification
```bash
bun run check
bun run build
```

Manual test: Run a prompt in a panel and wait for completion. Verify:
1. Green glow flash appears around the panel border on success
2. Red glow flash appears on error/non-zero exit
3. Animation lasts ~2 seconds and fades out
4. Flash is visible when multiple panels are running
