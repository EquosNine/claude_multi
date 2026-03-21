<script lang="ts">
  import type { PanelState } from './types';
  import SlashDropdown from './SlashDropdown.svelte';

  let { status, onSend, onStop, panelId, cwd, onResume }: {
    status: PanelState['status'];
    onSend: (prompt: string) => void;
    onStop: () => void;
    panelId: number;
    cwd: string;
    onResume: () => void;
  } = $props();

  let inputValue = $state('');
  let textareaEl: HTMLTextAreaElement;
  let showSlash = $state(false);
  let slashFilter = $state('');
  let attachedFiles = $state<Array<{ name: string; content: string }>>([]);
  let isDragOver = $state(false);

  function handleInput() {
    textareaEl.style.height = 'auto';
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 300) + 'px';

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
    if (showSlash) {
      if (['ArrowDown', 'ArrowUp', 'Tab', 'Escape'].includes(e.key)) return;
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) return;
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const hasFiles = attachedFiles.length > 0;
    if (!inputValue.trim() && !hasFiles) return;

    let fullPrompt = inputValue.trim();
    if (hasFiles) {
      const fileContents = attachedFiles
        .map(f => `<file name="${f.name}">\n${f.content}\n</file>`)
        .join('\n\n');
      fullPrompt = fullPrompt ? `${fullPrompt}\n\n${fileContents}` : fileContents;
    }

    onSend(fullPrompt);
    inputValue = '';
    attachedFiles = [];
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

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    isDragOver = true;
  }

  function handleDragLeave(e: DragEvent) {
    // Only clear if leaving the panel-input entirely
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      isDragOver = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        attachedFiles = [...attachedFiles, { name: file.name, content }];
      } catch {
        // skip binary or unreadable files
      }
    }
    textareaEl?.focus();
  }

  function removeFile(name: string) {
    attachedFiles = attachedFiles.filter(f => f.name !== name);
  }

</script>

<div
  class="panel-input"
  class:drag-over={isDragOver}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  {#if showSlash}
    <SlashDropdown
      filter={slashFilter}
      onSelect={handleSlashSelect}
      onClose={handleSlashClose}
      {panelId}
      {cwd}
      {onResume}
    />
  {/if}

  {#if isDragOver}
    <div class="drop-overlay">Drop files to attach</div>
  {/if}

  {#if attachedFiles.length > 0}
    <div class="attached-files">
      {#each attachedFiles as file}
        <span class="file-chip">
          <span class="file-name">{file.name}</span>
          <button class="file-remove" onclick={() => removeFile(file.name)} title="Remove">&times;</button>
        </span>
      {/each}
    </div>
  {/if}

  <div class="input-row">
    <span class="prompt-char">&rsaquo;</span>
    <textarea
      bind:this={textareaEl}
      bind:value={inputValue}
      rows={3}
      placeholder="EXECUTE_CMD... (drop files to attach)"
      oninput={handleInput}
      onkeydown={handleKeydown}
      onblur={() => setTimeout(() => handleSlashClose(), 150)}
    ></textarea>
    <div class="input-actions">
      <span class="hint">ctrl+enter</span>
      <div class="btn-row">
        {#if status === 'running'}
          <button class="send-btn stop" onclick={onStop}>Stop</button>
        {/if}
        <button class="send-btn" onclick={handleSend}>
          {status === 'running' ? 'Queue' : 'Send'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .panel-input {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--outline-dim);
    flex-shrink: 0;
    position: relative;
    background: var(--panel-bg);
    transition: border-color 0.15s;
  }

  .panel-input.drag-over {
    border-color: var(--accent);
    background: rgba(204, 151, 255, 0.05);
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(204, 151, 255, 0.12);
    color: var(--accent);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    pointer-events: none;
    z-index: 10;
    border: 1px dashed var(--accent);
  }

  .attached-files {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 10px 0;
  }

  .file-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(204, 151, 255, 0.12);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    padding: 2px 6px;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--accent);
  }

  .file-name {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-remove {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .file-remove:hover { color: var(--red); }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 0;
    padding: 6px 10px;
  }

  .prompt-char {
    color: var(--accent);
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    font-weight: 700;
    padding: 0 6px 8px 0;
    flex-shrink: 0;
  }

  textarea {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text);
    padding: 4px 0;
    font-size: calc(14px * var(--font-scale));
    font-family: 'Fira Code', monospace;
    resize: none;
    outline: none;
    min-height: 54px;
    max-height: 300px;
    line-height: 1.5;
  }

  textarea:focus { border-color: transparent; }
  textarea::placeholder { color: var(--outline); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }

  .input-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    padding-bottom: 4px;
    flex-shrink: 0;
  }

  .hint {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--outline);
    white-space: nowrap;
    letter-spacing: 0.3px;
  }

  .send-btn {
    padding: 4px 10px;
    background: transparent;
    color: var(--accent);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 10px;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .send-btn:hover { border-color: var(--accent); background: rgba(204, 151, 255, 0.1); }
  .send-btn.stop { color: var(--red); border-color: var(--red-dim); }
  .send-btn.stop:hover { background: rgba(255, 110, 132, 0.1); }
  .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-row {
    display: flex;
    gap: 4px;
  }
</style>
