# Task 05: Cost & Token Display

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Modifies:** 4 existing files

## Goal
Parse cost and token usage from Claude CLI stream-json `result` events and display them as badges in the panel header. Each panel shows its cumulative cost and token counts.

## Files to Modify

### 1. `src/lib/types.ts`

Add cost/token fields to `PanelState`:

```typescript
export interface PanelState {
  // ... existing fields ...
  costUsd: number;         // cumulative cost in USD
  inputTokens: number;     // cumulative input tokens
  outputTokens: number;    // cumulative output tokens
}
```

Update `ClaudeStreamEvent` to include cost fields (these appear on `result` type events):

```typescript
export interface ClaudeStreamEvent {
  // ... existing fields ...
  cost_usd?: number;
  total_cost_usd?: number;
  duration_ms?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}
```

### 2. `src/lib/stores/panels.svelte.ts`

Add initial values in `createPanel()`:

```typescript
const panel: PanelState = {
  // ... existing ...
  costUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
};
```

Add `updateCost` function:

```typescript
function updateCost(panelId: number, costUsd: number, inputTokens: number, outputTokens: number) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.costUsd += costUsd;
  panel.inputTokens += inputTokens;
  panel.outputTokens += outputTokens;
}
```

Also add a `resetCost` for when `/clear` is used (optional — user may want cumulative across clears):

```typescript
function resetCost(panelId: number) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.costUsd = 0;
  panel.inputTokens = 0;
  panel.outputTokens = 0;
}
```

Export both in the `panelStore` object.

### 3. `src/App.svelte`

In `handleClaudeEvent()`, parse cost data from `result` events:

```typescript
case 'result':
  if (data.result) {
    panelStore.addMessage(panelId, {
      id: panelStore.nextMsgId(),
      type: 'assistant',
      text: data.result,
    });
  }
  // Parse cost/token data
  {
    const cost = data.total_cost_usd ?? data.cost_usd ?? 0;
    const inputTok = data.usage?.input_tokens ?? 0;
    const outputTok = data.usage?.output_tokens ?? 0;
    if (cost > 0 || inputTok > 0) {
      panelStore.updateCost(panelId, cost, inputTok, outputTok);
    }
  }
  break;
```

### 4. `src/lib/Panel.svelte`

Add derived values for cost display:

```typescript
let costText = $derived(
  panel.costUsd > 0
    ? panel.costUsd < 0.01
      ? `$${(panel.costUsd * 100).toFixed(1)}c`
      : `$${panel.costUsd.toFixed(3)}`
    : ''
);

let tokensText = $derived(
  (panel.inputTokens + panel.outputTokens) > 0
    ? `${formatTokenCount(panel.inputTokens + panel.outputTokens)} tok`
    : ''
);
```

Add a helper function (either inline or in utils.ts):

```typescript
function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}
```

Add badges to the panel-meta section (after the agents badge, before timer):

```svelte
{#if costText}
  <span class="panel-badge cost" title="Cumulative cost">{costText}</span>
{/if}
{#if tokensText}
  <span class="panel-badge tokens" title="Total tokens">{tokensText}</span>
{/if}
```

Add CSS for the new badges:

```css
.panel-badge.cost { color: var(--green); }
.panel-badge.tokens { color: var(--text-dim); }
```

## Key Patterns to Follow
- Follow the existing badge pattern (`.panel-badge.ram`, `.panel-badge.agents`) in `Panel.svelte`
- Cost is cumulative across prompts in the same panel — not reset on each new prompt
- Use `total_cost_usd` from Claude's result event (preferred) with fallback to `cost_usd`
- Token formatting: show "1.2k tok" or "1.5M tok" for readability
- Cost formatting: show "$0.042" for amounts >= 1 cent, "4.2c" for sub-cent

## Verification
```bash
bun run check
bun run build
```

Manual test: Send a prompt to a panel. After completion, verify:
1. Cost badge appears in panel header (e.g., "$0.003")
2. Token badge appears (e.g., "1.2k tok")
3. Running a second prompt adds to the cumulative total
