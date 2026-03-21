import type { PanelState, OutputMessage, SessionRecord, CostData, ModelId, EffortLevel, McpServerEntry } from '../types';
import { ws } from './ws.svelte';
import { settingsStore } from './settings.svelte';

const MAX_PANELS = 6;
const MAX_MESSAGES = 800;
const MAX_SESSION_HISTORY = 10;
const MAX_QUEUE_SIZE = 20;

let nextPanelId = 0;
let serverCwd = $state('');

// Fetch server working directory for panel defaults
fetch('/api/cwd').then(r => r.json()).then(d => { serverCwd = d.cwd ?? ''; }).catch(() => {});

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

// ── Panel config persistence ──
// Save panel configs as an ordered array so panel identity is preserved across restarts

interface PanelConfig {
  panelType: 'claude' | 'terminal';
  name: string;
  cwd: string;
  group: string;
  model: ModelId;
  effort: EffortLevel;
  mcpServers: string[];
  structuredOutputSchema: string;
}

function savePanelConfigs() {
  const configs: PanelConfig[] = panels.map(p => ({
    panelType: p.panelType,
    name: p.name,
    cwd: p.cwd,
    group: p.group,
    model: p.model,
    effort: p.effort,
    mcpServers: p.mcpServers,
    structuredOutputSchema: p.structuredOutputSchema,
  }));
  localStorage.setItem('panel-configs', JSON.stringify(configs));
}

// ── Panel lifecycle ──

function createPanel(panelType: 'claude' | 'terminal' = 'claude', savedConfig?: PanelConfig): PanelState | null {
  if (panels.length >= MAX_PANELS) return null;
  const id = nextPanelId++;
  const panel: PanelState = {
    id,
    panelType,
    name: savedConfig?.name ?? '',
    cwd: savedConfig?.cwd || serverCwd,
    group: savedConfig?.group ?? activeGroup,
    status: 'idle',
    model: savedConfig?.model ?? settingsStore.model,
    effort: savedConfig?.effort ?? settingsStore.effort,
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
    suggestions: [],
    mcpServers: savedConfig?.mcpServers ?? [],
    structuredOutputEnabled: false,
    structuredOutputSchema: savedConfig?.structuredOutputSchema ?? '',
  };
  panels.push(panel);
  savePanelConfigs();
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
  savePanelConfigs();
}

function restorePanels() {
  nextPanelId = 0;
  const raw = localStorage.getItem('panel-configs');
  if (raw) {
    try {
      const configs: PanelConfig[] = JSON.parse(raw);
      const n = Math.max(1, Math.min(configs.length, MAX_PANELS));
      for (let i = 0; i < n; i++) {
        createPanel(configs[i].panelType, configs[i]);
      }
      return;
    } catch {}
  }
  // Fallback: legacy format or first launch
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
  savePanelConfigs();
}

function updateCwd(panelId: number, cwd: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.cwd = cwd;
  savePanelConfigs();
}

function updateModel(panelId: number, model: ModelId) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.model = model;
  savePanelConfigs();
}

function updateEffort(panelId: number, effort: EffortLevel) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.effort = effort;
  savePanelConfigs();
}

function appendToMessage(panelId: number, msgId: string, text: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  const msg = panel.messages.find(m => m.id === msgId);
  if (msg) msg.text += text;
}

function finalizeStreamingMessage(panelId: number, msgId: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  const msg = panel.messages.find(m => m.id === msgId);
  if (msg) msg.streaming = false;
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
      progressSummary: '',
      lastToolName: '',
    });
  }

  // Clean up completed agents after 30 seconds
  const cutoff = Date.now() - 30000;
  panel.agentDetails = panel.agentDetails.filter(
    a => a.status === 'running' || a.startTime > cutoff
  );
}

function updateAgentProgress(panelId: number, toolUseId: string, summary: string, lastToolName: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  const agent = panel.agentDetails.find(a => a.toolUseId === toolUseId);
  if (agent) {
    agent.progressSummary = summary;
    agent.lastToolName = lastToolName;
  }
}

// ── Prompt suggestions ──

function setSuggestions(panelId: number, suggestions: string[]) {
  const panel = getPanel(panelId);
  if (panel) panel.suggestions = suggestions;
}

function addSuggestion(panelId: number, suggestion: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  if (!panel.suggestions.includes(suggestion)) {
    panel.suggestions = [...panel.suggestions, suggestion];
  }
}

function clearSuggestions(panelId: number) {
  const panel = getPanel(panelId);
  if (panel) panel.suggestions = [];
}

// ── MCP servers per panel ──

function updateMcpServers(panelId: number, serverNames: string[]) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.mcpServers = serverNames;
  savePanelConfigs();
}

// ── Structured output per panel ──

function setStructuredOutput(panelId: number, enabled: boolean, schema: string) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.structuredOutputEnabled = enabled;
  panel.structuredOutputSchema = schema;
  savePanelConfigs();
}

// ── Conversation branching ──

function branchFromMessage(panelId: number, messageUuid: string) {
  const panel = getPanel(panelId);
  if (!panel || !panel.sessionId) return null;
  // Store branch info — caller creates the new panel and uses this to send the first prompt
  return {
    sessionId: panel.sessionId,
    resumeAt: messageUuid,
    cwd: panel.cwd,
    model: panel.model,
    effort: panel.effort,
    name: panel.name,
  };
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

// Set absolute totals (from server-side running accumulator)
function setCost(panelId: number, cost: CostData) {
  const panel = getPanel(panelId);
  if (!panel) return;
  panel.costUsd = cost.costUsd;
  panel.inputTokens = cost.inputTokens;
  panel.outputTokens = cost.outputTokens;
  panel.cacheReadTokens = cost.cacheReadTokens;
  panel.cacheCreationTokens = cost.cacheCreationTokens;
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
  // Always sync cwd to match the conversation being resumed
  if (cwd) updateCwd(panelId, cwd);
  addMessage(panelId, {
    id: nextMsgId(),
    type: 'system',
    text: '> Resuming session...',
  });
  ws.send({ type: 'prompt', panelId, cwd: panel.cwd, prompt: 'Continue where we left off.', resume: sessionId, model: panel.model, effort: panel.effort });
}

// ── Group movement ──

function movePanel(panelId: number, targetGroup: string) {
  const panel = getPanel(panelId);
  if (!panel || !tabGroups.includes(targetGroup)) return;
  panel.group = targetGroup;
  activeGroup = targetGroup;
  saveActiveGroup();
  savePanelConfigs();
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
  appendToMessage,
  finalizeStreamingMessage,
  clearMessages,
  setStatus,
  updateName,
  updateCwd,
  updateModel,
  updateEffort,
  updateAgentDetail,
  updateAgentProgress,
  updateCost,
  setCost,
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
  setSuggestions,
  addSuggestion,
  clearSuggestions,
  updateMcpServers,
  setStructuredOutput,
  branchFromMessage,
};
