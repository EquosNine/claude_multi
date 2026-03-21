<script lang="ts">
  import type { PanelState, SessionRecord } from './types';
  import { panelStore } from './stores/panels.svelte';
  import { conversationStore } from './stores/conversations.svelte';
  import { ws } from './stores/ws.svelte';
  import { formatTime } from './utils';
  import { copyPanelOutput, downloadPanelOutput } from './export';
  import PanelOutput from './PanelOutput.svelte';
  import PanelInput from './PanelInput.svelte';
  import FolderPicker from './FolderPicker.svelte';
  import AgentMonitor from './AgentMonitor.svelte';
  import TerminalPanel from './TerminalPanel.svelte';

  let { panel }: { panel: PanelState } = $props();

  let flashClass = $state('');
  let prevStatus = $state<string>('idle');

  $effect(() => {
    const current = panel.status;
    if (prevStatus === 'running' && current !== 'running') {
      flashClass = current === 'error' ? 'flash-error' : 'flash-done';
      setTimeout(() => { flashClass = ''; }, 2000);
    }
    prevStatus = current;
  });

  let showFolderPicker = $state(false);
  let showAgentMonitor = $state(false);
  let showSessionPicker = $state(false);
  let sessions = $state<SessionRecord[]>([]);

  function handleFolderSelect(path: string) {
    panelStore.updateCwd(panel.id, path);
    showFolderPicker = false;
  }

  let timerText = $state('--:--');
  let timerInterval: ReturnType<typeof setInterval> | null = null;

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
      // Show actual Claude duration from SDK result event when idle
      if (panel.lastTurnDurationMs !== null) {
        timerText = formatTime(panel.lastTurnDurationMs);
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

  function handleSend(prompt: string, resume?: string) {
    if (!prompt.trim()) return;
    if (!panel.cwd.trim()) {
      panelStore.addMessage(panel.id, {
        id: panelStore.nextMsgId(),
        type: 'system',
        text: 'Set a project directory first.',
      });
      return;
    }
    if (!resume) {
      conversationStore.setPending(
        panel.id,
        prompt,
        panel.cwd,
        panel.name || `Panel ${panel.id + 1}`,
      );
    }
    panelStore.addMessage(panel.id, {
      id: panelStore.nextMsgId(),
      type: 'system',
      text: panel.status === 'running' ? `> ${prompt} [queued]` : `> ${prompt}`,
    });
    ws.send({ type: 'prompt', panelId: panel.id, cwd: panel.cwd, prompt, ...(resume ? { resume } : {}) });
  }

  function handleStop() {
    ws.send({ type: 'cancel', panelId: panel.id });
  }

  function openSessionPicker() {
    sessions = panelStore.getSessions(panel.id);
    if (sessions.length === 0) {
      panelStore.addMessage(panel.id, {
        id: panelStore.nextMsgId(),
        type: 'system',
        text: 'No previous sessions found for this panel.',
      });
      return;
    }
    showSessionPicker = true;
  }

  function resumeSession(session: SessionRecord) {
    showSessionPicker = false;
    handleSend('Continue where we left off.', session.id);
  }

  let copyFeedback = $state('');

  async function handleCopy() {
    const ok = await copyPanelOutput(panel.messages);
    copyFeedback = ok ? 'Copied!' : 'Failed';
    setTimeout(() => { copyFeedback = ''; }, 1500);
  }

  function handleExport() {
    downloadPanelOutput(panel.messages, panel.name || `Panel ${panel.id + 1}`);
  }

  let activeAgentCount = $derived(panel.agentDetails.filter(a => a.status === 'running').length);
  let agentsText = $derived(
    activeAgentCount > 0 ? `${activeAgentCount} agent${activeAgentCount > 1 ? 's' : ''}` : ''
  );

  function formatTokenCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

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

  let cacheText = $derived(
    panel.cacheReadTokens > 0
      ? `${formatTokenCount(panel.cacheReadTokens)} cached`
      : ''
  );

  let statusColor = $derived.by(() => {
    switch (panel.status) {
      case 'running': return 'var(--green)';
      case 'error': return 'var(--red)';
      default: return 'var(--text-dim)';
    }
  });
</script>

<div class="panel {flashClass}" data-panel-id={panel.id} onfocusin={() => panelStore.setFocusedPanel(panel.id)}>
  <!-- Compact title bar -->
  <div class="panel-titlebar">
    <div class="titlebar-left">
      <span class="status-dot" style="background: {statusColor}" class:pulse={panel.status === 'running'}></span>
      <input
        type="text"
        class="panel-name"
        placeholder="UNTITLED"
        spellcheck="false"
        maxlength={30}
        value={panel.name}
        onchange={handleNameChange}
      />
    </div>
    <div class="titlebar-right">
      {#if panel.panelType !== 'terminal'}
        {#if agentsText}
          <button class="badge agents" onclick={() => showAgentMonitor = !showAgentMonitor}>
            {agentsText}
          </button>
        {/if}
        {#if costText}
          <span class="badge cost">{costText}</span>
        {/if}
        {#if tokensText}
          <span class="badge tokens">{tokensText}</span>
        {/if}
        {#if cacheText}
          <span class="badge cache" title="Cache-read tokens (billed at ~10%)">{cacheText}</span>
        {/if}
        <span class="timer" class:active={panel.status === 'running'}>{timerText}</span>
        <button class="action-btn" title="Copy output" onclick={handleCopy}>
          {copyFeedback || 'CP'}
        </button>
        <button class="action-btn" title="Download .md" onclick={handleExport}>DL</button>
      {/if}
      <button class="close-btn" title="Remove panel" onclick={handleClose}>&times;</button>
    </div>
  </div>

  <!-- CWD bar -->
  <div class="cwd-bar">
    <input
      type="text"
      class="cwd-input"
      placeholder="C:\path\to\project"
      spellcheck="false"
      value={panel.cwd}
      onchange={handleCwdChange}
    />
    <button class="cwd-browse" title="Browse folders" onclick={() => showFolderPicker = !showFolderPicker}>
      ...
    </button>
    {#if showFolderPicker}
      <FolderPicker
        currentPath={panel.cwd}
        onSelect={handleFolderSelect}
        onClose={() => showFolderPicker = false}
      />
    {/if}
  </div>

  <!-- Content -->
  {#if panel.panelType === 'terminal'}
    <TerminalPanel panelId={panel.id} cwd={panel.cwd} />
  {:else}
    <PanelOutput messages={panel.messages} status={panel.status} />
    <AgentMonitor
      agents={panel.agentDetails}
      visible={showAgentMonitor || panel.status === 'running' || panel.agentDetails.some(a => a.status === 'running')}
      panelRunning={panel.status === 'running'}
    />

    {#if showSessionPicker}
      <div class="session-picker">
        <div class="sp-header">
          <span class="sp-title">Resume Session</span>
          <button class="sp-close" onclick={() => showSessionPicker = false}>&times;</button>
        </div>
        <div class="sp-list">
          {#each sessions as session}
            <button class="sp-item" onclick={() => resumeSession(session)}>
              <span class="sp-id">{session.id.slice(0, 12)}...</span>
              <span class="sp-label">{session.label}</span>
              <span class="sp-time">{new Date(session.timestamp).toLocaleString()}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <PanelInput status={panel.status} onSend={handleSend} onStop={handleStop} panelId={panel.id} cwd={panel.cwd} onResume={openSessionPicker} />
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    position: relative;
    border: 1px solid var(--outline-dim);
  }

  /* ---- Title bar ---- */
  .panel-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 10px;
    background: var(--surface-low);
    border-bottom: 1px solid var(--outline-dim);
    flex-shrink: 0;
  }
  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background 0.3s;
  }
  .status-dot.pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }
  .panel-name {
    background: transparent;
    border: none;
    color: var(--text);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 0;
    outline: none;
    min-width: 0;
    max-width: 200px;
    cursor: text;
  }
  .panel-name::placeholder { color: var(--text-dim); font-weight: 400; }
  .panel-name:focus { color: var(--accent); }
  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .panel:hover .titlebar-right,
  .panel:focus-within .titlebar-right {
    opacity: 1;
  }
  .badge {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--text-dim);
    background: var(--surface-mid);
    padding: 1px 5px;
    border-radius: var(--radius);
    white-space: nowrap;
    border: none;
  }
  .badge.agents { color: var(--blue); cursor: pointer; }
  .badge.agents:hover { opacity: 0.8; }
  .badge.cost { color: var(--green); }
  .badge.tokens { color: var(--text-dim); }
  .badge.cache { color: var(--accent); }
  .timer {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--text-dim);
    min-width: 36px;
    text-align: center;
  }
  .timer.active { color: var(--green); }
  .action-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    padding: 0 2px;
    text-transform: uppercase;
    transition: color 0.15s;
  }
  .action-btn:hover { color: var(--accent); }
  .close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
    line-height: 1;
    transition: color 0.15s;
  }
  .close-btn:hover { color: var(--red); }

  /* ---- CWD bar ---- */
  .cwd-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 10px;
    height: 26px;
    background: var(--surface-low);
    border-bottom: 1px solid var(--outline-dim);
    flex-shrink: 0;
    position: relative;
  }
  .cwd-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    padding: 0;
    outline: none;
    min-width: 0;
  }
  .cwd-input:focus { color: var(--text); }
  .cwd-input::placeholder { color: var(--outline); }
  .cwd-browse {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    padding: 2px 4px;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .cwd-browse:hover { color: var(--accent); }

  /* ---- Session picker ---- */
  .session-picker {
    border-top: 1px solid var(--outline-dim);
    background: var(--surface-high);
    flex-shrink: 0;
    max-height: 200px;
    overflow-y: auto;
  }
  .sp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid var(--outline-dim);
  }
  .sp-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--accent);
  }
  .sp-close {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
  }
  .sp-close:hover { color: var(--red); }
  .sp-list { padding: 2px 0; }
  .sp-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 10px;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    font-size: 12px;
    text-align: left;
  }
  .sp-item:hover { background: rgba(204, 151, 255, 0.08); }
  .sp-id {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--accent);
    flex-shrink: 0;
  }
  .sp-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sp-time {
    font-size: 10px;
    color: var(--text-dim);
    flex-shrink: 0;
  }
</style>
