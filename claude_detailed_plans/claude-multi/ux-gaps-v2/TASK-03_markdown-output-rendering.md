# Task 03: Markdown Output Rendering

**Status:** Not started
**Depends on:** Task 02
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Modifies:** 1 existing file

## Goal
Use the `renderMarkdown()` utility from Task 02 to render assistant messages as formatted HTML in PanelOutput. Replace plain `{msg.text}` with `{@html renderMarkdown(msg.text)}` for assistant-type messages only.

## Files to Modify

### 1. `src/lib/PanelOutput.svelte`

**Import the renderer:**
```typescript
import { renderMarkdown } from './markdown';
```

**Replace the assistant message rendering (line 58):**

```svelte
<!-- BEFORE -->
{:else if msg.type === 'assistant'}
  <div class="msg msg-assistant">{msg.text}</div>

<!-- AFTER -->
{:else if msg.type === 'assistant'}
  <div class="msg msg-assistant">{@html renderMarkdown(msg.text)}</div>
```

No other message types should use markdown rendering:
- `system` messages — plain italic text, keep as-is
- `error` messages — plain red text, keep as-is
- `tool` messages — structured display, keep as-is
- `tool-result` messages — raw output, keep as-is
- `done` messages — simple status text, keep as-is

## Key Patterns to Follow
- Only assistant messages get markdown rendering — this matches Claude's actual output format
- `{@html}` is safe here because `renderMarkdown()` uses markdown-it with `html: false`, which escapes any raw HTML in the input
- The CSS styles from Task 02 target `.msg-assistant` selectors, so rendered HTML inside `.msg-assistant` divs will be styled automatically
- The existing `white-space: pre-wrap` on `.msg` class may interfere with rendered HTML — the msg-assistant class may need `white-space: normal` override (check in `.msg` definition in `src/app.css`)

**CSS adjustment if needed in `src/app.css`:**
```css
.msg-assistant { color: var(--text); white-space: normal; }
```

This overrides the `.msg` class `white-space: pre-wrap` which would break rendered HTML layout.

## Verification
```bash
bun run check
bun run build
```

Manual test: Send a prompt that asks Claude to respond with markdown (headers, code blocks, lists, links, tables). Verify output renders as formatted HTML with syntax highlighting.
