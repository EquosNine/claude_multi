# Task 08: Output Copy & Export

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + TypeScript
**Creates:** 1 new file / **Modifies:** 1 existing file

## Goal
Add the ability to copy panel output to clipboard and download it as a markdown file. Add action buttons to the panel header for copy and export. Also create a utility module for formatting messages, which is shared with the keyboard shortcuts (Task 07).

## Files to Create/Modify

### 1. Create `src/lib/export.ts`

Utility functions for formatting panel output:

```typescript
import type { OutputMessage } from './types';

/**
 * Format panel messages as plain text for clipboard copy.
 */
export function formatMessagesAsText(messages: OutputMessage[]): string {
  const lines: string[] = [];

  for (const msg of messages) {
    switch (msg.type) {
      case 'system':
        lines.push(msg.text);
        break;
      case 'assistant':
        lines.push(msg.text);
        lines.push('');
        break;
      case 'error':
        lines.push(`[ERROR] ${msg.text}`);
        break;
      case 'tool':
        lines.push(`[${msg.toolName || 'TOOL'}] ${msg.text}`);
        break;
      case 'tool-result':
        lines.push(`  → ${msg.text}`);
        break;
      case 'done':
        lines.push(msg.text);
        lines.push('');
        break;
    }
  }

  return lines.join('\n').trim();
}

/**
 * Format panel messages as markdown for export.
 */
export function formatMessagesAsMarkdown(messages: OutputMessage[], panelName?: string): string {
  const lines: string[] = [];

  if (panelName) {
    lines.push(`# ${panelName}`);
    lines.push(`_Exported: ${new Date().toLocaleString()}_`);
    lines.push('');
  }

  for (const msg of messages) {
    switch (msg.type) {
      case 'system':
        lines.push(`> ${msg.text}`);
        break;
      case 'assistant':
        lines.push(msg.text);
        lines.push('');
        break;
      case 'error':
        lines.push(`**ERROR:** ${msg.text}`);
        lines.push('');
        break;
      case 'tool':
        lines.push(`\`${msg.toolName || 'tool'}\` ${msg.text}`);
        break;
      case 'tool-result':
        lines.push('```');
        lines.push(msg.text);
        lines.push('```');
        break;
      case 'done':
        lines.push('---');
        lines.push(`_${msg.text}_`);
        lines.push('');
        break;
    }
  }

  return lines.join('\n').trim();
}

/**
 * Copy text to clipboard. Returns true on success.
 */
export async function copyPanelOutput(messages: OutputMessage[]): Promise<boolean> {
  const text = formatMessagesAsText(messages);
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download messages as a .md file.
 */
export function downloadPanelOutput(messages: OutputMessage[], panelName?: string) {
  const md = formatMessagesAsMarkdown(messages, panelName);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(panelName || 'panel-output').replace(/[^a-zA-Z0-9-_]/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 2. `src/lib/Panel.svelte`

Add copy and export buttons to the panel header, in the `panel-meta` div:

**Import:**
```typescript
import { copyPanelOutput, downloadPanelOutput } from './export';
```

**Add state for copy feedback:**
```typescript
let copyFeedback = $state('');

async function handleCopy() {
  const ok = await copyPanelOutput(panel.messages);
  copyFeedback = ok ? 'Copied!' : 'Failed';
  setTimeout(() => { copyFeedback = ''; }, 1500);
}

function handleExport() {
  downloadPanelOutput(panel.messages, panel.name || `Panel ${panel.id + 1}`);
}
```

**Add buttons in the template, inside `.panel-meta` before the timer:**
```svelte
<div class="panel-meta">
  {#if ramText}
    <span class="panel-badge ram" title="RAM usage">{ramText}</span>
  {/if}
  {#if agentsText}
    <button class="panel-badge agents" ...>{agentsText}</button>
  {/if}
  {#if costText}
    <span class="panel-badge cost" title="Cost">{costText}</span>
  {/if}

  <!-- Copy/export actions -->
  <button class="panel-action" title="Copy output" onclick={handleCopy}>
    {copyFeedback || '\u{2398}'}
  </button>
  <button class="panel-action" title="Download as .md" onclick={handleExport}>
    \u{2913}
  </button>

  <span class="panel-timer" ...>{timerText}</span>
  <!-- ... status dot, close button ... -->
</div>
```

**Add CSS for the action buttons:**
```css
.panel-action {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 14px;
  padding: 0 3px;
  line-height: 1;
  transition: color 0.15s;
  flex-shrink: 0;
}
.panel-action:hover { color: var(--text); }
```

Unicode characters used:
- `\u{2398}` = ⎘ (copy symbol, or use a simpler alternative like the word "Copy" if rendering is inconsistent)
- `\u{2913}` = ⤓ (download arrow, or use ↓)

**Alternative:** If unicode symbols render inconsistently, use simple text labels:
```svelte
<button class="panel-action" title="Copy output" onclick={handleCopy}>
  {copyFeedback || 'cp'}
</button>
<button class="panel-action" title="Download .md" onclick={handleExport}>
  dl
</button>
```

## Key Patterns to Follow
- Follow the existing `panel-close` button styling pattern for action buttons
- Use `navigator.clipboard.writeText()` for copy — works in all modern browsers on HTTPS/localhost
- Blob + object URL pattern for file downloads — no server needed
- Copy feedback uses a temporary state that auto-clears after 1.5s (same pattern as timer cleanup)
- `formatMessagesAsText` is imported by Task 07's `KeyboardShortcuts.svelte` — keep the function signature stable

## Verification
```bash
bun run check
bun run build
```

Manual test:
1. Run a prompt, wait for output
2. Click copy button — verify clipboard contains formatted text
3. Click download button — verify .md file downloads with panel name
4. Verify copy feedback shows "Copied!" briefly
