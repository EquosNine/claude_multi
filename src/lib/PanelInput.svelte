<script lang="ts">
  import type { PanelState } from './types';
  import type { SlashCommand } from './types';
  import SlashDropdown from './SlashDropdown.svelte';
  import { fetchSkills, uploadImage } from './api';

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
  let dynamicCmds = $state<SlashCommand[]>([]);

  $effect(() => {
    fetchSkills(cwd)
      .then(data => { dynamicCmds = [...data.global, ...data.project, ...data.agents]; })
      .catch(() => {});
  });
  let showSlash = $state(false);
  let slashFilter = $state('');
  let attachedFiles = $state<Array<{ name: string; content: string; path?: string; isImage?: boolean; preview?: string }>>([]);
  let isDragOver = $state(false);

  function handleInput() {
    textareaEl.style.height = 'auto';
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 300) + 'px';

    const val = inputValue;
    const slashMatch = /(?:^|\s)(\/\S*)$/.exec(val);
    if (slashMatch) {
      slashFilter = slashMatch[1];
      showSlash = true;
    } else {
      showSlash = false;
      slashFilter = '';
    }
  }

  function handleSlashInsert(cmdText: string) {
    const startPos = inputValue.length - slashFilter.length;
    inputValue = inputValue.slice(0, startPos) + cmdText + ' ';
    showSlash = false;
    slashFilter = '';
    requestAnimationFrame(() => {
      if (textareaEl) {
        textareaEl.style.height = 'auto';
        textareaEl.style.height = Math.min(textareaEl.scrollHeight, 300) + 'px';
        textareaEl.focus();
        textareaEl.setSelectionRange(inputValue.length, inputValue.length);
      }
    });
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
        .map(f => f.isImage
          ? `[Image saved to: ${f.path} — use the Read tool to view it]`
          : `<file name="${f.name}">\n${f.content}\n</file>`)
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

  async function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          const filename = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`;
          uploadImage(cwd, filename, base64)
            .then(data => {
              attachedFiles = [...attachedFiles, { name: filename, content: '', path: data.path, isImage: true, preview: dataUrl }];
            })
            .catch(() => {});
        };
        reader.readAsDataURL(blob);
      }
    }
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
      onInsert={handleSlashInsert}
      onClose={handleSlashClose}
      {panelId}
      {cwd}
      {onResume}
      extraCmds={dynamicCmds}
    />
  {/if}

  {#if isDragOver}
    <div class="drop-overlay">Drop files to attach</div>
  {/if}

  {#if attachedFiles.length > 0}
    <div class="attached-files">
      {#each attachedFiles as file}
        {#if file.isImage && file.preview}
          <span class="image-preview-chip">
            <img src={file.preview} alt={file.name} class="preview-thumb" />
            <button class="preview-remove" onclick={() => removeFile(file.name)} title="Remove">&times;</button>
          </span>
        {:else}
          <span class="file-chip">
            <span class="file-name">{file.name}</span>
            <button class="file-remove" onclick={() => removeFile(file.name)} title="Remove">&times;</button>
          </span>
        {/if}
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
      onpaste={handlePaste}
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
    font-size: 1.1rem;
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
    font-size: 1rem;
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
    font-size: 1.3rem;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .file-remove:hover { color: var(--red); }

  .image-preview-chip {
    position: relative;
    display: inline-flex;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid rgba(93, 163, 250, 0.4);
  }

  .preview-thumb {
    display: block;
    height: 64px;
    width: auto;
    max-width: 120px;
    object-fit: cover;
  }

  .preview-remove {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    padding: 0;
  }

  .preview-remove:hover { background: rgba(255, 80, 80, 0.8); }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 0;
    padding: 6px 10px;
  }

  .prompt-char {
    color: var(--accent);
    font-family: 'Fira Code', monospace;
    font-size: 1.4rem;
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
    font-size: 1.4rem;
    font-family: 'Fira Code', monospace;
    resize: none;
    outline: none;
    min-height: 54px;
    max-height: 300px;
    line-height: 1.5;
  }

  textarea:focus { border-color: transparent; }
  textarea::placeholder { color: var(--outline); text-transform: uppercase; font-size: 1rem; letter-spacing: 0.5px; }

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
    font-size: 0.9rem;
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
    font-size: 1rem;
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
