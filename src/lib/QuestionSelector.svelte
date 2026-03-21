<script lang="ts">
  import type { QuestionOption } from './types';
  import { renderMarkdown } from './markdown';

  let { question, options = [], answered = false, onAnswer }: {
    question: string;
    options: QuestionOption[];
    answered: boolean;
    onAnswer?: (answer: string) => void;
  } = $props();

  let customInput = $state('');
  let selectedKey = $state<string | null>(null);
  let showPreview = $state<string | null>(null);

  function selectOption(key: string, label: string) {
    if (answered) return;
    selectedKey = key;
    onAnswer?.(label);
  }

  function submitCustom() {
    if (answered || !customInput.trim()) return;
    selectedKey = '__custom__';
    onAnswer?.(customInput.trim());
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCustom();
    }
  }
</script>

<div class="question-selector" class:answered>
  <div class="question-icon">?</div>
  <div class="question-body">
    <div class="question-text">{@html renderMarkdown(question)}</div>

    {#if options.length > 0}
      <div class="question-options">
        {#each options as opt (opt.key)}
          <button
            class="question-option"
            class:selected={selectedKey === opt.key}
            class:disabled={answered && selectedKey !== opt.key}
            disabled={answered}
            onclick={() => selectOption(opt.key, opt.label)}
            onmouseenter={() => showPreview = opt.preview ? opt.key : null}
            onmouseleave={() => showPreview = null}
          >
            <span class="option-label">{opt.label}</span>
            {#if opt.description}
              <span class="option-desc">{opt.description}</span>
            {/if}
          </button>

          {#if showPreview === opt.key && opt.preview}
            <div class="option-preview">
              {@html opt.preview}
            </div>
          {/if}
        {/each}
      </div>
    {/if}

    {#if !answered}
      <div class="question-custom">
        <input
          type="text"
          class="custom-input"
          placeholder="Type a custom response..."
          bind:value={customInput}
          onkeydown={handleKeydown}
        />
        <button
          class="custom-submit"
          disabled={!customInput.trim()}
          onclick={submitCustom}
        >Send</button>
      </div>
    {/if}

    {#if answered && selectedKey}
      <div class="question-answered-label">
        Answered
      </div>
    {/if}
  </div>
</div>

<style>
  .question-selector {
    margin: 6px 0;
    border: 1px solid rgba(204, 151, 255, 0.25);
    border-radius: var(--radius-lg);
    padding: 10px 12px;
    background: rgba(204, 151, 255, 0.04);
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .question-selector.answered {
    opacity: 0.7;
    border-color: var(--outline-dim);
    background: transparent;
  }

  .question-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--panel-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Fira Code', monospace;
    font-weight: 800;
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .question-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .question-text {
    color: var(--text);
    font-size: 1.3rem;
    line-height: 1.4;
  }

  .question-text :global(p) {
    margin: 0;
  }

  .question-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .question-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 12px;
    background: var(--surface-low);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    cursor: pointer;
    text-align: left;
    font-family: 'Fira Code', monospace;
    transition: all 0.15s;
    color: var(--text);
  }

  .question-option:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(204, 151, 255, 0.08);
  }

  .question-option.selected {
    border-color: var(--accent);
    background: rgba(204, 151, 255, 0.15);
    color: var(--accent);
  }

  .question-option.disabled {
    opacity: 0.4;
    cursor: default;
  }

  .option-label {
    font-size: 1.2rem;
    font-weight: 600;
  }

  .option-desc {
    font-size: 1rem;
    color: var(--text-dim);
    font-weight: 400;
  }

  .option-preview {
    padding: 6px 10px;
    margin: -2px 0 2px;
    background: var(--surface-mid);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    font-size: 1rem;
    color: var(--text-dim);
    max-height: 150px;
    overflow-y: auto;
  }

  .question-custom {
    display: flex;
    gap: 6px;
    margin-top: 2px;
  }

  .custom-input {
    flex: 1;
    background: var(--surface-low);
    border: 1px solid var(--outline-dim);
    border-radius: var(--radius);
    color: var(--text);
    font-family: 'Fira Code', monospace;
    font-size: 1.1rem;
    padding: 6px 10px;
    outline: none;
    transition: border-color 0.15s;
  }

  .custom-input:focus {
    border-color: var(--accent);
  }

  .custom-input::placeholder {
    color: var(--text-dim);
    opacity: 0.5;
  }

  .custom-submit {
    background: var(--accent);
    color: var(--panel-bg);
    border: none;
    border-radius: var(--radius);
    padding: 6px 14px;
    font-family: 'Fira Code', monospace;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: opacity 0.15s;
  }

  .custom-submit:hover:not(:disabled) {
    opacity: 0.85;
  }

  .custom-submit:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .question-answered-label {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    color: var(--green);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
