const STORAGE_KEY = 'claude-multi-settings';

interface Settings {
  fontScale: number;
}

const DEFAULTS: Settings = {
  fontScale: 1,
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
    setFontScale(v: number) {
      s.fontScale = v;
      save();
    },
  };
}

export const settingsStore = createSettingsStore();
