import type { PanelState, OutputMessage, SessionRecord } from '../types';
import { ws } from './ws.svelte';

const MAX_PANELS = 6;
const MAX_MESSAGES = 800;

let nextPanelId = 0;

let panels = $state<PanelState[]>([]);
let layoutMode = $state<'auto' | '1col' | '2col' | '3col'>('auto');
let focusedPanelId = $state<number | null>(null);

// Tab groups
let tabGroups = $state<string[]>(JSON.parse(localStorage.getItem('tab-groups') || '["MAIN"]'));
let activeGroup = $state<string>(localStorage.getItem('active-group') || 'MAIN');

function saveTabGroups() {
  localStorage.setItem('tab-groups', JSON.stringify(tabGroups));
}

function saveActiveGroup() {
  localStorage.setItem('active-group', activeGroup);
}

function createGroup(name: string) {
  const upper = name.trim().toUpperCase().replace(/\s+/g, '_');
  if (!upper || tabGroups.includes(upper)) return;
  tabGroups.push(upper);
  activeGroup = upper;
  saveTabGroups();
  saveActiveGroup();
}

function removeGroup(name: string) {
  if (tabGroups.length <= 1) return; // keep at least one
  const idx = tabGroups.indexOf(name);
  if (idx === -1) return;
  // Move panels from removed group to first remaining group
  const fallback = tabGroups.find(g => g !== name) || tabGroups[0];
  for (const p of panels) {
    if (p.group === name) p.group = fallback;
  }
  tabGroups.splice(idx, 1);
  if (activeGroup === name) activeGroup = fallback;
  saveTabGroups();
  saveActiveGroup();
}

function renameGroup(oldName: string, newName: string) {
  const upper = newName.trim().toUpperCase().replace(/\s+/g, '_');
  if (!upper || tabGroups.includes(upper)) return;
  const idx = tabGroups.indexOf(oldName);
  if (idx === -1) return;
  tabGroups[idx] = upper;
  for (const p of panels) {
    if (p.group === oldName) p.group = upper;
  }
  if (activeGroup === oldName) activeGroup = upper;
  saveTabGroups();
  saveActiveGroup();
}

function setActiveGroup(name: string) {
  if (tabGroups.includes(name)) {
    activeGroup = name;
    saveActiveGroup();
  }
}

function setFocusedPanel(panelId: number | null) {
  focusedPanelId = panelId;
}

function getFocusedPanel(): PanelState | undefined {
  if (focusedPanelId === null) return panels[0];
  return panels.find(p => p.id === focusedPanelId);
}

function getPanelByIndex(index: number): PanelState | undefined {
  return panels[index];
}

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}`;
}

function createPanel(): PanelState | null {
  if (panels.length >= MAX_PANELS) return null;
  const id = nextPanelId++;
  const panel: PanelState = {
    id,
    name: localStorage.getItem(`panel-name-${id}`) || '',
    cwd: localStorage.getItem(`panel-cwd-${id}`) || '',
    group: activeGroup,
    status: 'idle',
    messages: [],
    agentDetails: [],
    startTime: null,
    sessionId: null,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    lastTurnDurationMs: null,
  };
  panels.push(panel);
  savePanelCount();
  return panel;
}

function removePanel(id: number) {
  const idx = panels.findIndex(p => p.id === id);
  if (idx === -1) return;
  const panel = panels[idx];
  if (panel.status === 'running') {
    ws.send({ type: 'cancel', panelId: id });
  }
  panels.splice(idx, 1);
  savePanelCount();
}

function addMessage(panelId: number, msg: OutputMessage) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.messages.push(msg);
  while (panel.messages.length > MAX_MESSAGES) {
    panel.messages.shift();
  }
}

function clearMessages(panelId: number) {
  const panel = panels.find(p => p.id === panelId);
  if (panel) panel.messages = [];
}

function setStatus(panelId: number, status: PanelState['status']) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.status = status;
  if (status === 'running') {
    panel.startTime = Date.now();
  }
}


function updateName(panelId: number, name: string) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.name = name;
  localStorage.setItem(`panel-name-${panelId}`, name);
}

function updateCwd(panelId: number, cwd: string) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.cwd = cwd;
  localStorage.setItem(`panel-cwd-${panelId}`, cwd);
}

function updateAgentDetail(panelId: number, agent: { toolUseId: string; description: string; status: string; output?: string }) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;

  const existing = panel.agentDetails.find(a => a.toolUseId === agent.toolUseId);
  if (existing) {
    existing.status = agent.status as 'running' | 'done';
    if (agent.output) existing.output = agent.output;
  } else {
    panel.agentDetails.push({
      toolUseId: agent.toolUseId,
      description: agent.description,
      status: agent.status as 'running' | 'done',
      startTime: Date.now(),
      output: agent.output || '',
    });
  }

  // Clean up completed agents after 30 seconds
  const cutoff = Date.now() - 30000;
  panel.agentDetails = panel.agentDetails.filter(
    a => a.status === 'running' || a.startTime > cutoff
  );
}

function updateCost(
  panelId: number,
  costUsd: number,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
  durationMs: number | null,
) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.costUsd += costUsd;
  panel.inputTokens += inputTokens;
  panel.outputTokens += outputTokens;
  panel.cacheReadTokens += cacheReadTokens;
  panel.cacheCreationTokens += cacheCreationTokens;
  if (durationMs !== null) panel.lastTurnDurationMs = durationMs;
}

function setSessionId(panelId: number, sessionId: string) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.sessionId = sessionId;
}

const MAX_SESSION_HISTORY = 10;

function saveSession(panelId: number, sessionId: string, cwd: string, label: string) {
  const key = `panel-sessions-${panelId}`;
  const raw = localStorage.getItem(key);
  const sessions: SessionRecord[] = raw ? JSON.parse(raw) : [];

  // Don't duplicate
  if (sessions.some(s => s.id === sessionId)) return;

  sessions.unshift({ id: sessionId, cwd, timestamp: Date.now(), label });
  while (sessions.length > MAX_SESSION_HISTORY) sessions.pop();
  localStorage.setItem(key, JSON.stringify(sessions));
}

function getSessions(panelId: number): SessionRecord[] {
  const raw = localStorage.getItem(`panel-sessions-${panelId}`);
  return raw ? JSON.parse(raw) : [];
}

function resumeConversation(panelId: number, cwd: string, sessionId: string) {
  const panel = panels.find(p => p.id === panelId);
  if (!panel) return;
  if (cwd && cwd !== panel.cwd) updateCwd(panelId, cwd);
  addMessage(panelId, {
    id: nextMsgId(),
    type: 'system',
    text: '> Resuming session...',
  });
  ws.send({ type: 'prompt', panelId, cwd: cwd || panel.cwd, prompt: 'Continue where we left off.', resume: sessionId });
}

function toggleLayout() {
  const modes: Array<typeof layoutMode> = ['auto', '1col', '2col', '3col'];
  const current = modes.indexOf(layoutMode);
  layoutMode = modes[(current + 1) % modes.length];
}

function savePanelCount() {
  localStorage.setItem('panel-count', String(panels.length));
}

function restorePanels() {
  nextPanelId = 0;
  const count = parseInt(localStorage.getItem('panel-count') || '1', 10);
  const n = Math.max(1, Math.min(count, MAX_PANELS));
  for (let i = 0; i < n; i++) createPanel();
}

export const panelStore = {
  get panels() { return panels; },
  get layout() { return layoutMode; },
  get maxPanels() { return MAX_PANELS; },
  get focusedPanelId() { return focusedPanelId; },
  get tabGroups() { return tabGroups; },
  get activeGroup() { return activeGroup; },
  get visiblePanels() { return panels.filter(p => p.group === activeGroup); },
  setFocusedPanel,
  getFocusedPanel,
  getPanelByIndex,
  createPanel,
  removePanel,
  addMessage,
  clearMessages,
  setStatus,
  updateName,
  updateCwd,
  updateAgentDetail,
  updateCost,
  setSessionId,
  saveSession,
  getSessions,
  resumeConversation,
  toggleLayout,
  restorePanels,
  nextMsgId,
  createGroup,
  removeGroup,
  renameGroup,
  setActiveGroup,
};
