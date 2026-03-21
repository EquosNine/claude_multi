<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import '@xterm/xterm/css/xterm.css';
  import { ws } from './stores/ws.svelte';

  let { panelId, cwd }: { panelId: number; cwd: string } = $props();

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

<div class="terminal-wrap" bind:this={container}></div>

<style>
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
