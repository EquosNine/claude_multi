# Task 04: Show Tool Results with Collapsible Toggle

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Modifies:** 1 existing file

## Goal
Remove the aggressive filtering that hides all non-error tool results. Currently in `App.svelte`, only tool results where `is_error === true` are shown — all successful Read, Bash, Grep outputs are invisible. The UI should show all tool results as collapsible entries (PanelOutput already has the expand/collapse UI for `tool-result` messages).

## Files to Modify

### 1. `src/App.svelte`

**Change the tool result handling in `handleClaudeEvent()` (lines 132-148):**

```typescript
// BEFORE:
case 'user': {
  const content = data.message?.content;
  if (!content || !Array.isArray(content)) break;
  for (const block of content) {
    if (block.type === 'tool_result') {
      const text = typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content);
      // Only show tool results that are errors or very short
      if (text && text.length > 0) {
        const isError = block.is_error === true;
        if (isError) {
          panelStore.addMessage(panelId, {
            id: panelStore.nextMsgId(),
            type: 'tool-result',
            text: text.length > 500 ? text.slice(0, 500) + '...' : text,
          });
        }
        // Skip verbose tool results — the tool_use summary is enough
      }
    }
  }
  break;
}

// AFTER:
case 'user': {
  const content = data.message?.content;
  if (!content || !Array.isArray(content)) break;
  for (const block of content) {
    if (block.type === 'tool_result') {
      const text = typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content);
      if (text && text.length > 0) {
        const isError = block.is_error === true;
        panelStore.addMessage(panelId, {
          id: panelStore.nextMsgId(),
          type: isError ? 'error' : 'tool-result',
          text: text.length > 2000 ? text.slice(0, 2000) + '...' : text,
        });
      }
    }
  }
  break;
}
```

**Key changes:**
1. Remove the `if (isError)` gate — show all tool results
2. Error tool results use `type: 'error'` for red styling
3. Non-error tool results use `type: 'tool-result'` which PanelOutput renders as collapsible
4. Increase truncation limit from 500 to 2000 chars — the expand/collapse UI handles long content
5. Remove the "skip verbose" comment

**No changes needed in PanelOutput.svelte** — it already has the collapsible UI:
- Shows a compact button with `▸`/`▾` toggle and preview text
- Expands to show full content on click
- Styled with `msg-tool-result-compact` and `msg-tool-result` classes

## Key Patterns to Follow
- Error tool results should visually stand out (red `msg-error` class) vs normal results (dim `msg-tool-result` class)
- PanelOutput's `expandedTools` state set already handles the toggle logic
- The collapsible preview shows first 60 chars — enough to see file paths or command output

## Verification
```bash
bun run check
bun run build
```

Manual test: Send a prompt that triggers Read, Bash, and Grep tool calls. Verify:
1. Tool use summaries appear (e.g., "READ src/lib/types.ts")
2. Tool results appear as collapsible entries below each tool use
3. Clicking expands to show full result
4. Error results appear in red
