import type { PanelState, OutputMessage, SessionRecord, CostData } from '../types';
import { ws } from './ws.svelte';

const MAX_PANELS = 6;
const MAX_MESSAGES = 800;
const MAX_SESSION_HISTORY = 10;
const MAX_QUEUE_SIZE = 20;

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

// ── Core helper ──

function getPanel(panelId: number): PanelState | undefined {
  return panels.find(p => p.id === panelId);
}

// ── Tab groups ──

function createGroup(name: string) {
  const upper = name.trim().toUpperCase().replace(/\s+/g, '_');
  if (!upper || tabGroups.includes(upper)) return;
  tabGroups.push(upper);
  activeGroup = upper;
  saveTabGroups();
  saveActiveGroup();
}

function removeGroup(name: string) {
  if (tabGroups.length <= 1) return;
  const idx = tabGroups.indexOf(name);
  if (idx === -1) return;
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

// ── Focus / layout ──

function setFocusedPanel(panelId: number | null) {
  focusedPanelId = panelId;
}

function getFocusedPanel(): PanelState | undefined {
  if (focusedPanelId === null) return panels[0];
  return getPanel(focusedPanelId);
}

function getPanelByIndex(index: number): PanelState | undefined {
  return panels[index];
}

function toggleLayout() {
  const modes: Array<typeof layoutMode> = ['auto', '1col', '2col', '3col'];
  const current = modes.indexOf(layoutMode);
  layoutMode = modes[(current + 1) % modes.length];
}

// ── Message ID ──

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}`;
}

// ── Panel lifecycle ──

function savePanelCount() {
  localStorage.setItem('panel-count', String(panels.length));
}

function savePanelTypes() {
  localStorage.setItem('panel-types', JSON.stringify(panels.map(p => p.panelType)));
}

function createPanel(panelType: 'claude' | 'terminal' = 'claude'): PanelState | null {
  if (panels.length >= MAX_PANELS) return null;
  const id = nextPanelId++;
  const panel: PanelState = {
    id,
    panelType,
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
  savePanelTypes();
  return panel;
}

function removePanel(id: number) {
  const idx = panels.findIndex(p => p.id === id);
  if (idx === -1) return;
  const panel = panels[idx];
  if (panel.panelType === 'terminal') {
    ws.send({ type: 'terminal_kill', panelId: id });
  } else if (panel.status === 'running') {
    ws.send({ type: 'cancel', panelId: id });
  }
  panels.splice(idx, 1);
  savePanelCount();
  savePanelTypes();
}

function restorePanels() {
  nextPanelId = 0;
  const count = parseInt(localStorage.getItem('panel-count') || '1', 10);
  const types: string[] = JSON.parse(localStorage.getItem('panel-types') || '[]');
  const n = Math.max(1, Math.min(count, MAX_PANELS));
  for (let i = 0; i < n; i++) {
    createPanel(types[i] === 'terminal' ? 'terminal' : 'claude');
  }
}

// ── Panel state mutations ──

function addMessage(panelId: number, msg: OutputMessage) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.messages.push(msg);
  while (panel.messages.length > MAX_MESSAGES) {
    panel.messages.shift();
  }
}

function clearMessages(panelId: number) {
  const panel = getPanel(panelId);
  if (panel) panel.messages = [];
}

function setStatus(panelId: number, status: PanelState['status']) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.status = status;
  if (status === 'running') panel.startTime = Date.now();
}

function updateName(panelId: number, name: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.name = name;
  localStorage.setItem(`panel-name-${panelId}`, name);
}

function updateCwd(panelId: number, cwd: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.cwd = cwd;
  localStorage.setItem(`panel-cwd-${panelId}`, cwd);
}

function updateAgentDetail(panelId: number, agent: { toolUseId: string; description: string; status: string; output?: string }) {
  const panel = getPanel(panelId);
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

function updateCost(panelId: number, cost: CostData) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.costUsd += cost.costUsd;
  panel.inputTokens += cost.inputTokens;
  panel.outputTokens += cost.outputTokens;
  panel.cacheReadTokens += cost.cacheReadTokens;
  panel.cacheCreationTokens += cost.cacheCreationTokens;
  if (cost.durationMs !== null) panel.lastTurnDurationMs = cost.durationMs;
}

function setSessionId(panelId: number, sessionId: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.sessionId = sessionId;
}

// ── Session history ──

function saveSession(panelId: number, sessionId: string, cwd: string, label: string) {
  const key = `panel-sessions-${panelId}`;
  const raw = localStorage.getItem(key);
  const sessions: SessionRecord[] = raw ? JSON.parse(raw) : [];
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
  const panel = getPanel(panelId);
  if (!panel) return;
  if (cwd && cwd !== panel.cwd) updateCwd(panelId, cwd);
  addMessage(panelId, {
    id: nextMsgId(),
    type: 'system',
    text: '> Resuming session...',
  });
  ws.send({ type: 'prompt', panelId, cwd: cwd || panel.cwd, prompt: 'Continue where we left off.', resume: sessionId });
}

// ── Group movement ──

function movePanel(panelId: number, targetGroup: string) {
  const panel = getPanel(panelId);
  if (!panel || !tabGroups.includes(targetGroup)) return;
  panel.group = targetGroup;
  activeGroup = targetGroup;
  saveActiveGroup();
}

// ── Public store ──

export const panelStore = {
  get panels() { return panels; },
  get layout() { return layoutMode; },
  get maxPanels() { return MAX_PANELS; },
  get maxQueueSize() { return MAX_QUEUE_SIZE; },
  get focusedPanelId() { return focusedPanelId; },
  get tabGroups() { return tabGroups; },
  get activeGroup() { return activeGroup; },
  get visiblePanels() { return panels.filter(p => p.group === activeGroup); },
  getPanel,
  setFocusedPanel,
  getFocusedPanel,
  getPanelByIndex,
  createPanel,
  removePanel,
  restorePanels,
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
  movePanel,
  toggleLayout,
  nextMsgId,
  createGroup,
  removeGroup,
  renameGroup,
  setActiveGroup,
};
