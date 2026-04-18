import type { ModelId, EffortLevel, McpServerEntry } from '../types';

const STORAGE_KEY = 'claude-multi-settings';

interface Settings {
  fontScale: number;
  model: ModelId;
  effort: EffortLevel;
  mcpServers: McpServerEntry[];
}

const DEFAULTS: Settings = {
  fontScale: 1,
  model: 'claude-sonnet-4-6',
  effort: 'high',
  mcpServers: [
    {
      name: 'playwright',
      command: 'npx',
      args: ['@anthropic-ai/mcp-server-playwright'],
      env: {},
      enabled: true,
    },
  ],
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function createSettingsStore() {
  let s = $state<Settings>(load());

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  return {
    get fontScale() { return s.fontScale; },
    get model() { return s.model; },
    get effort() { return s.effort; },
    get mcpServers() { return s.mcpServers; },
    setFontScale(v: number) {
      s.fontScale = v;
      save();
    },
    setModel(v: ModelId) {
      s.model = v;
      save();
    },
    setEffort(v: EffortLevel) {
      s.effort = v;
      save();
    },
    addMcpServer(entry: McpServerEntry) {
      s.mcpServers = [...s.mcpServers, entry];
      save();
    },
    removeMcpServer(name: string) {
      s.mcpServers = s.mcpServers.filter(m => m.name !== name);
      save();
    },
    updateMcpServer(name: string, updates: Partial<McpServerEntry>) {
      s.mcpServers = s.mcpServers.map(m => m.name === name ? { ...m, ...updates } : m);
      save();
    },
  };
}

export const settingsStore = createSettingsStore();
