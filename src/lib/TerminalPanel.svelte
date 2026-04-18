<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import '@xterm/xterm/css/xterm.css';
  import { ws } from './stores/ws.svelte';

  let { panelId, cwd }: { panelId: number; cwd: string } = $props();

  const PRESETS = [
    { group: 'flutter', label: 'run web', cmd: 'flutter run -d chrome' },
    { group: 'flutter', label: 'build web', cmd: 'flutter build web' },
    { group: 'flutter', label: 'pub get', cmd: 'flutter pub get' },
    { group: 'flutter', label: 'dart fix', cmd: 'dart fix --apply' },
    { group: 'firebase', label: 'deploy', cmd: 'firebase deploy' },
    { group: 'firebase', label: 'deploy hosting', cmd: 'firebase deploy --only hosting' },
    { group: 'npm', label: 'install', cmd: 'npm install' },
    { group: 'npm', label: 'run dev', cmd: 'npm run dev' },
    { group: 'npm', label: 'run build', cmd: 'npm run build' },
    { group: 'npm', label: 'run preview', cmd: 'npm run preview' },
    { group: 'astro', label: 'dev', cmd: 'npx astro dev' },
    { group: 'astro', label: 'build', cmd: 'npx astro build' },
    { group: 'astro', label: 'preview', cmd: 'npx astro preview' },
    { group: 'astro', label: 'add', cmd: 'npx astro add ' },
    { group: 'docker', label: 'build', cmd: 'docker build -t ' },
    { group: 'docker', label: 'run', cmd: 'docker run --rm ' },
    { group: 'docker', label: 'compose up', cmd: 'docker compose up' },
    { group: 'docker', label: 'compose up --build', cmd: 'docker compose up --build' },
    { group: 'docker', label: 'compose down', cmd: 'docker compose down' },
    { group: 'docker', label: 'ps', cmd: 'docker ps' },
    { group: 'docker', label: 'images', cmd: 'docker images' },
    { group: 'docker', label: 'prune', cmd: 'docker system prune -f' },
  ];

  function runPreset(cmd: string) {
    ws.send({ type: 'terminal_input', panelId, data: cmd + '\r' });
  }

  let container: HTMLDivElement;
  let term: Terminal | null = null;
  let fitAddon: FitAddon | null = null;
  let unsubWs: (() => void) | null = null;
  let ro: ResizeObserver | null = null;
  let termReady = $state(false);

  function sendCreate() {
    requestAnimationFrame(() => {
      if (!fitAddon || !term) return;
      try { fitAddon.fit(); } catch {}
      ws.send({ type: 'terminal_create', panelId, cwd: cwd || '.', cols: term.cols, rows: term.rows });
    });
  }

  // Create/re-create terminal session whenever WS connects (initial or reconnect)
  $effect(() => {
    if (ws.connected && termReady) {
      sendCreate();
    }
  });

  onMount(() => {
    term = new Terminal({
      theme: {
        background: '#0d0d0d',
        foreground: '#e0e0e0',
        cursor: '#cc97ff',
        selectionBackground: 'rgba(204, 151, 255, 0.3)',
        black: '#1a1a1a',      brightBlack: '#4d4d4d',
        red: '#ff5c5c',        brightRed: '#ff8080',
        green: '#6dfe9c',      brightGreen: '#9effc0',
        yellow: '#ffd066',     brightYellow: '#ffe699',
        blue: '#5ea3fa',       brightBlue: '#91c2ff',
        magenta: '#cc97ff',    brightMagenta: '#e0bfff',
        cyan: '#5ee3f3',       brightCyan: '#93edfa',
        white: '#e0e0e0',      brightWhite: '#ffffff',
      },
      fontFamily: "'Fira Code', monospace",
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      allowTransparency: false,
    });

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

    term.onData((data) => {
      ws.send({ type: 'terminal_input', panelId, data });
    });

    unsubWs = ws.subscribe((msg) => {
      if (msg.type === 'terminal_output' && msg.panelId === panelId) {
        term?.write(msg.data);
      } else if (msg.type === 'terminal_exit' && msg.panelId === panelId) {
        term?.writeln('\r\n\x1b[90m[process exited — press Enter to restart]\x1b[0m');
      }
    });

    ro = new ResizeObserver(() => {
      try {
        fitAddon?.fit();
        if (term) ws.send({ type: 'terminal_resize', panelId, cols: term.cols, rows: term.rows });
      } catch {}
    });
    ro.observe(container);

    termReady = true; // triggers $effect to send terminal_create
  });

  onDestroy(() => {
    unsubWs?.();
    ro?.disconnect();
    term?.dispose();
    term = null;
    fitAddon = null;
  });
</script>

<div class="presets-bar">
  {#each PRESETS as preset, i}
    {#if i === 0 || PRESETS[i - 1].group !== preset.group}
      <span class="preset-group">{preset.group}</span>
    {/if}
    <button class="preset-chip" onclick={() => runPreset(preset.cmd)} title={preset.cmd}>
      {preset.label}
    </button>
  {/each}
</div>

<div class="terminal-wrap" bind:this={container}></div>

<style>
  .presets-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 8px;
    background: #111;
    border-bottom: 1px solid #2a2a2a;
    flex-shrink: 0;
  }
  .preset-group {
    font-family: 'Fira Code', monospace;
    font-size: 0.72rem;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0 4px 0 6px;
    align-self: center;
  }
  .preset-group:first-child {
    padding-left: 0;
  }
  .preset-chip {
    background: #1e1e1e;
    border: 1px solid #333;
    color: #a0a0a0;
    font-family: 'Fira Code', monospace;
    font-size: 0.78rem;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s;
  }
  .preset-chip:hover {
    border-color: #cc97ff;
    color: #cc97ff;
  }

  .terminal-wrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background: #0d0d0d;
    padding: 4px;
    box-sizing: border-box;
  }

  /* Make xterm fill the wrapper */
  :global(.terminal-wrap .xterm) {
    height: 100%;
  }
  :global(.terminal-wrap .xterm-viewport) {
    background: transparent !important;
  }
</style>
