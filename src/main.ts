import App from './App.svelte';
import './app.css';
import { mount } from 'svelte';
import { ws } from './lib/stores/ws.svelte';

// ── Splash screen progress ──
const splash = document.getElementById('splash');
const stepAssets = document.getElementById('splash-step-assets');
const stepConnect = document.getElementById('splash-step-connect');
const stepReady = document.getElementById('splash-step-ready');
const bar = document.getElementById('splash-bar');

function splashProgress(pct: number) {
  if (bar) bar.style.width = `${pct}%`;
}

function markDone(el: HTMLElement | null) {
  el?.classList.remove('active');
  el?.classList.add('done');
}

function markActive(el: HTMLElement | null) {
  el?.classList.add('active');
}

// Step 1: Assets loaded (we're executing, so JS bundle is parsed)
splashProgress(33);
markDone(stepAssets);
markActive(stepConnect);

// Step 2: Mount the app
const app = mount(App, {
  target: document.getElementById('app')!,
});

splashProgress(50);

// Step 3: Wait for WebSocket connection, then dismiss
const checkConnection = setInterval(() => {
  if (ws.connected) {
    clearInterval(checkConnection);
    markDone(stepConnect);
    markActive(stepReady);
    splashProgress(100);

    setTimeout(() => {
      markDone(stepReady);
    }, 200);

    setTimeout(() => {
      splash?.classList.add('fade-out');
    }, 600);

    setTimeout(() => {
      splash?.remove();
    }, 1100);
  }
}, 100);

// Safety: remove splash after 8s regardless
setTimeout(() => {
  clearInterval(checkConnection);
  splash?.classList.add('fade-out');
  setTimeout(() => splash?.remove(), 500);
}, 8000);

export default app;
