# Task 04: Panel Component

**Status:** Not started
**Depends on:** Task 02, Task 03
**Scope:** claude-multi
**Stack:** Svelte 5 + TypeScript
**Creates:** 3 new files

## Goal
Create the Panel component split into three sub-components: Panel (shell + header with editable name, cwd, timer, badges, status dot, close button), PanelOutput (scrollable message list with auto-scroll), and PanelInput (textarea with send/stop toggle). Wire everything to the panel store and WebSocket.

## Files to Create

### 1. `src/lib/Panel.svelte`
The main panel wrapper — renders the header bar and composes PanelOutput + PanelInput.

```svelte
<script lang="ts">
  import type { PanelState } from './types';
  import { panelStore } from './stores/panels';
  import { ws } from './stores/ws';
  import PanelOutput from './PanelOutput.svelte';
  import PanelInput from './PanelInput.svelte';

  let { panel }: { panel: PanelState } = $props();

  let timerText = $state('--:--');
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  $effect(() => {
    if (panel.status === 'running' && panel.startTime) {
      timerText = '00:00';
      timerInterval = setInterval(() => {
        timerText = formatTime(Date.now() - panel.startTime!);
      }, 1000);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  function handleNameChange(e: Event) {
    panelStore.updateName(panel.id, (e.target as HTMLInputElement).value);
  }

  function handleCwdChange(e: Event) {
    panelStore.updateCwd(panel.id, (e.target as HTMLInputElement).value);
  }

  function handleClose() {
    panelStore.removePanel(panel.id);
  }

  function handleSend(prompt: string) {
    if (panel.status === 'running') {
      ws.send({ type: 'cancel', panelId: panel.id });
      return;
    }
    if (!prompt.trim()) return;
    if (!panel.cwd.trim()) {
      panelStore.addMessage(panel.id, {
        id: panelStore.nextMsgId(),
        type: 'system',
        text: 'Set a project directory first.',
      });
      return;
    }
    panelStore.addMessage(panel.id, {
      id: panelStore.nextMsgId(),
      type: 'system',
      text: `> ${prompt}`,
    });
    ws.send({ type: 'prompt', panelId: panel.id, cwd: panel.cwd, prompt });
  }

  let ramText = $derived(
    panel.ram > 0 ? `${(panel.ram / 1024 / 1024).toFixed(0)} MB` : ''
  );
  let agentsText = $derived(
    panel.agents > 0 ? `${panel.agents} agent${panel.agents > 1 ? 's' : ''}` : ''
  );
</script>

<div class="panel">
  <div class="panel-header">
    <span class="panel-num">{panel.id + 1}</span>
    <input
      type="text"
      class="panel-name"
      placeholder="Untitled"
      spellcheck="false"
      maxlength={30}
      value={panel.name}
      onchange={handleNameChange}
    />
    <input
      type="text"
      class="cwd-input"
      placeholder="C:\path\to\project"
      spellcheck="false"
      value={panel.cwd}
      onchange={handleCwdChange}
    />
    <div class="panel-meta">
      {#if ramText}
        <span class="panel-badge ram" title="RAM usage">{ramText}</span>
      {/if}
      {#if agentsText}
        <span class="panel-badge agents" title="Active sub-agents">{agentsText}</span>
      {/if}
      <span class="panel-timer" class:active={panel.status === 'running'} title="Elapsed time">
        {timerText}
      </span>
      <div
        class="status-dot"
        class:running={panel.status === 'running'}
        class:error={panel.status === 'error'}
        title={panel.status}
      ></div>
      <button class="panel-close" title="Remove panel" onclick={handleClose}>&times;</button>
    </div>
  </div>
  <PanelOutput messages={panel.messages} />
  <PanelInput status={panel.status} onSend={handleSend} panelId={panel.id} cwd={panel.cwd} />
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    min-width: 0;
    min-height: 300px;
    overflow: hidden;
  }
  .panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--panel-border);
    flex-shrink: 0;
    min-height: 36px;
  }
  .panel-num {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    background: rgba(124, 58, 237, 0.15);
    padding: 2px 7px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .panel-name {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    padding: 2px 6px;
    outline: none;
    min-width: 60px;
    max-width: 160px;
    flex-shrink: 1;
    cursor: text;
    transition: border-color 0.15s;
  }
  .panel-name:hover { border-color: var(--panel-border); }
  .panel-name:focus { border-color: var(--accent); background: var(--input-bg); }
  .panel-name::placeholder { color: var(--text-dim); font-weight: 400; }
  .cwd-input {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    color: var(--text);
    padding: 4px 8px;
    font-size: 12px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    outline: none;
    min-width: 0;
  }
  .cwd-input:focus { border-color: var(--accent); }
  .cwd-input::placeholder { color: var(--text-dim); }
  .panel-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    flex-shrink: 0;
  }
  .panel-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    color: var(--text-dim);
    background: var(--input-bg);
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .panel-badge.ram { color: var(--orange); }
  .panel-badge.agents { color: var(--blue); }
  .panel-timer {
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    color: var(--text-dim);
    padding: 2px 6px;
    border-radius: 4px;
    min-width: 42px;
    text-align: center;
    transition: color 0.2s;
  }
  .panel-timer.active { color: var(--green); }
  .status-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--text-dim);
    flex-shrink: 0;
    transition: background 0.3s;
  }
  .status-dot.running {
    background: var(--green);
    animation: pulse 1.5s ease-in-out infinite;
  }
  .status-dot.error { background: var(--red); }
  .panel-close {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
  }
  .panel-close:hover { color: var(--red); }
</style>
```

### 2. `src/lib/PanelOutput.svelte`
Scrollable output area that renders messages by type with auto-scroll.

```svelte
<script lang="ts">
  import type { OutputMessage } from './types';

  let { messages }: { messages: OutputMessage[] } = $props();

  let outputEl: HTMLDivElement;

  $effect(() => {
    // Trigger on messages array length change — scroll to bottom
    if (messages.length && outputEl) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  });
</script>

<div class="panel-output" bind:this={outputEl}>
  {#each messages as msg (msg.id)}
    {#if msg.type === 'tool'}
      <div class="msg msg-tool">
        <span class="tool-name">{msg.toolName || 'tool'}</span> {msg.text}
      </div>
    {:else if msg.type === 'tool-result'}
      <div class="msg msg-tool-result">{msg.text}</div>
    {:else}
      <div class="msg msg-{msg.type}">{msg.text}</div>
    {/if}
  {/each}
</div>

<style>
  .panel-output {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12.5px;
    line-height: 1.5;
    scroll-behavior: smooth;
  }
  .panel-output::-webkit-scrollbar { width: 6px; }
  .panel-output::-webkit-scrollbar-track { background: transparent; }
  .panel-output::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 3px; }
  .panel-output::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }
</style>
```

Note: The `.msg-*` type styles (msg-system, msg-assistant, msg-error, msg-tool, msg-tool-result, msg-done) are defined in `src/app.css` (global styles extracted in Task 01).

### 3. `src/lib/PanelInput.svelte`
Textarea input with send/stop button toggle and auto-resize. Emits `onSend` callback.

```svelte
<script lang="ts">
  import type { PanelState } from './types';
  import SlashDropdown from './SlashDropdown.svelte';

  let { status, onSend, panelId, cwd }: {
    status: PanelState['status'];
    onSend: (prompt: string) => void;
    panelId: number;
    cwd: string;
  } = $props();

  let inputValue = $state('');
  let textareaEl: HTMLTextAreaElement;
  let showSlash = $state(false);
  let slashFilter = $state('');

  function handleInput() {
    // Auto-resize
    textareaEl.style.height = 'auto';
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + 'px';

    const val = inputValue;
    if (val.startsWith('/') && !val.includes('\n')) {
      slashFilter = val;
      showSlash = true;
    } else {
      showSlash = false;
      slashFilter = '';
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Slash dropdown handles its own keys via the SlashDropdown component
    if (showSlash) {
      if (['ArrowDown', 'ArrowUp', 'Tab', 'Escape'].includes(e.key)) return;
      if (e.key === 'Enter' && !e.shiftKey) return; // let dropdown handle
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (status === 'running') {
      onSend(''); // signals cancel
      return;
    }
    if (!inputValue.trim()) return;
    onSend(inputValue.trim());
    inputValue = '';
    if (textareaEl) textareaEl.style.height = 'auto';
  }

  function handleSlashSelect(prompt: string) {
    showSlash = false;
    slashFilter = '';
    inputValue = '';
    if (textareaEl) textareaEl.style.height = 'auto';
    if (prompt) onSend(prompt);
  }

  function handleSlashClose() {
    showSlash = false;
    slashFilter = '';
  }

  let btnText = $derived(status === 'running' ? 'Stop' : 'Send');
  let btnClass = $derived(status === 'running' ? 'send-btn stop' : 'send-btn');
</script>

<div class="panel-input">
  {#if showSlash}
    <SlashDropdown
      filter={slashFilter}
      onSelect={handleSlashSelect}
      onClose={handleSlashClose}
      {panelId}
      {cwd}
    />
  {/if}
  <textarea
    bind:this={textareaEl}
    bind:value={inputValue}
    rows={1}
    placeholder="Send a prompt... (Enter to send, Shift+Enter for newline)"
    oninput={handleInput}
    onkeydown={handleKeydown}
    onblur={() => setTimeout(() => handleSlashClose(), 150)}
  ></textarea>
  <button class={btnClass} onclick={handleSend}>{btnText}</button>
</div>

<style>
  .panel-input {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--panel-border);
    flex-shrink: 0;
    position: relative;
  }
  textarea {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    color: var(--text);
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    outline: none;
    min-height: 38px;
    max-height: 120px;
    line-height: 1.4;
  }
  textarea:focus { border-color: var(--accent); }
  textarea::placeholder { color: var(--text-dim); }
  .send-btn {
    padding: 8px 14px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .send-btn:hover { background: var(--accent-hover); }
  .send-btn.stop { background: var(--red); }
  .send-btn.stop:hover { background: #dc2626; }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
```

## Key Patterns to Follow
- Svelte 5: `$props()` for component props, `$state()` for local state, `$derived()` for computed
- Svelte 5: `$effect()` for side effects (timer interval, auto-scroll)
- Svelte 5: `bind:this` for DOM refs, `bind:value` for two-way binding
- Svelte 5: `onclick={fn}` not `on:click={fn}`, `onchange={fn}` not `on:change={fn}`
- Svelte 5: `class:name={condition}` for conditional CSS classes
- Timer runs via `$effect` watching `panel.status` and `panel.startTime`
- PanelInput owns the textarea state; sends finished prompt up via `onSend` callback
- PanelOutput uses keyed `{#each}` on `msg.id` for stable DOM updates
- Message type CSS classes (`msg-system`, `msg-assistant`, etc.) are global in app.css

## Verification
```bash
bun run check
bun run build
```
