# Task 06: Folder Picker

**Status:** Not started
**Depends on:** Task 04
**Scope:** claude-multi
**Stack:** Svelte 5 + TypeScript (frontend) + Bun (backend API)
**Creates:** 1 new file / **Modifies:** 2 existing files

## Goal
Add a server-side `/api/browse` endpoint that lists directories for a given path, and create a FolderPicker component with breadcrumb navigation that replaces the plain text cwd input. Users click a folder icon to open the picker, navigate via breadcrumbs or folder list, and select a directory.

## Files to Create/Modify

### 1. `server.ts` (MODIFY — add `/api/browse` route)
Add a GET endpoint that returns directory contents for a given path. Only returns directories (not files) for security.

Add this route handling inside the `fetch` handler, before the static file serving section:

```ts
// Add to fetch handler, after the WebSocket upgrade block:

// Directory browsing API
if (url.pathname === "/api/browse") {
  const dirPath = url.searchParams.get("path") || "";

  if (!dirPath) {
    // Return drive roots on Windows, or / on Unix
    if (process.platform === "win32") {
      try {
        const proc = Bun.spawn(
          ["powershell", "-NoProfile", "-Command",
           "(Get-PSDrive -PSProvider FileSystem).Root"],
          { stdout: "pipe", stderr: "ignore" }
        );
        const text = await new Response(proc.stdout).text();
        const drives = text.trim().split("\n").map(d => d.trim()).filter(Boolean);
        return Response.json({ path: "", entries: drives.map(d => ({ name: d, path: d })) });
      } catch {
        return Response.json({ path: "", entries: [] });
      }
    }
    return Response.json({ path: "/", entries: [{ name: "/", path: "/" }] });
  }

  try {
    const normalizedPath = dirPath.replace(/\\/g, "/");
    if (!existsSync(normalizedPath) || !statSync(normalizedPath).isDirectory()) {
      return Response.json({ error: "Not a directory" }, { status: 400 });
    }

    const { readdirSync } = await import("fs");
    const entries = readdirSync(normalizedPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => ({
        name: e.name,
        path: join(normalizedPath, e.name).replace(/\\/g, "/"),
      }));

    return Response.json({ path: normalizedPath, entries });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

### 2. `src/lib/FolderPicker.svelte` (CREATE)
A modal-like dropdown anchored to the cwd input area. Shows breadcrumb segments of the current path and a scrollable list of subdirectories.

```svelte
<script lang="ts">
  let { currentPath, onSelect, onClose }: {
    currentPath: string;
    onSelect: (path: string) => void;
    onClose: () => void;
  } = $props();

  interface DirEntry {
    name: string;
    path: string;
  }

  let entries = $state<DirEntry[]>([]);
  let browsePath = $state(currentPath || '');
  let loading = $state(false);
  let error = $state('');

  // Parse breadcrumb segments from the current browsePath
  let breadcrumbs = $derived.by(() => {
    if (!browsePath) return [{ label: 'Drives', path: '' }];
    const normalized = browsePath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; path: string }> = [];

    // Drive root on Windows (e.g., "C:")
    if (parts.length > 0 && parts[0].includes(':')) {
      crumbs.push({ label: parts[0], path: parts[0] + '/' });
      for (let i = 1; i < parts.length; i++) {
        crumbs.push({
          label: parts[i],
          path: parts.slice(0, i + 1).join('/') + '/',
        });
      }
    } else {
      // Unix-style
      crumbs.push({ label: '/', path: '/' });
      for (let i = 0; i < parts.length; i++) {
        crumbs.push({
          label: parts[i],
          path: '/' + parts.slice(0, i + 1).join('/'),
        });
      }
    }
    return crumbs;
  });

  async function browse(path: string) {
    loading = true;
    error = '';
    try {
      const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) {
        error = data.error;
        entries = [];
      } else {
        entries = data.entries || [];
        browsePath = data.path || path;
      }
    } catch (e: any) {
      error = e.message || 'Failed to browse';
      entries = [];
    }
    loading = false;
  }

  function selectFolder() {
    if (browsePath) onSelect(browsePath);
  }

  // Browse initial path on mount
  $effect(() => {
    browse(currentPath || '');
  });
</script>

<div class="folder-picker-overlay" onclick={onClose}></div>
<div class="folder-picker">
  <div class="fp-header">
    <div class="fp-breadcrumbs">
      {#each breadcrumbs as crumb, i}
        {#if i > 0}<span class="fp-sep">/</span>{/if}
        <button class="fp-crumb" onclick={() => browse(crumb.path)}>
          {crumb.label}
        </button>
      {/each}
    </div>
    <button class="fp-select-btn" onclick={selectFolder} disabled={!browsePath}>
      Select
    </button>
    <button class="fp-close-btn" onclick={onClose}>&times;</button>
  </div>

  {#if loading}
    <div class="fp-loading">Loading...</div>
  {:else if error}
    <div class="fp-error">{error}</div>
  {:else if entries.length === 0}
    <div class="fp-empty">No subdirectories</div>
  {:else}
    <div class="fp-list">
      {#each entries as entry}
        <button class="fp-item" ondblclick={() => { onSelect(entry.path); }} onclick={() => browse(entry.path)}>
          <span class="fp-folder-icon">📁</span>
          <span class="fp-name">{entry.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .folder-picker-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
  }
  .folder-picker {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    max-height: 300px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .fp-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--panel-border);
    flex-shrink: 0;
  }
  .fp-breadcrumbs {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 2px;
    overflow-x: auto;
    min-width: 0;
  }
  .fp-sep {
    color: var(--text-dim);
    font-size: 11px;
  }
  .fp-crumb {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 12px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    white-space: nowrap;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  }
  .fp-crumb:hover { background: rgba(124, 58, 237, 0.15); }
  .fp-select-btn {
    padding: 3px 10px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .fp-select-btn:hover { background: var(--accent-hover); }
  .fp-select-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .fp-close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
  }
  .fp-close-btn:hover { color: var(--red); }
  .fp-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
  .fp-list::-webkit-scrollbar { width: 5px; }
  .fp-list::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 3px; }
  .fp-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    font-size: 12px;
    width: 100%;
    text-align: left;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  }
  .fp-item:hover { background: rgba(124, 58, 237, 0.1); }
  .fp-folder-icon { font-size: 14px; }
  .fp-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .fp-loading, .fp-error, .fp-empty {
    padding: 16px;
    text-align: center;
    font-size: 12px;
    color: var(--text-dim);
  }
  .fp-error { color: var(--red); }
</style>
```

### 3. `src/lib/Panel.svelte` (MODIFY — add folder picker button)
Add a folder icon button next to the cwd input that toggles the FolderPicker. Add state and handler:

In the `<script>` section, add:
```ts
import FolderPicker from './FolderPicker.svelte';

let showFolderPicker = $state(false);

function handleFolderSelect(path: string) {
  panelStore.updateCwd(panel.id, path);
  showFolderPicker = false;
}
```

In the template, wrap the cwd input area in a container and add the folder button + picker:
```svelte
<!-- Replace the plain cwd-input with this: -->
<div class="cwd-wrapper">
  <input
    type="text"
    class="cwd-input"
    placeholder="C:\path\to\project"
    spellcheck="false"
    value={panel.cwd}
    onchange={handleCwdChange}
  />
  <button class="cwd-browse-btn" title="Browse folders" onclick={() => showFolderPicker = !showFolderPicker}>
    📂
  </button>
  {#if showFolderPicker}
    <FolderPicker
      currentPath={panel.cwd}
      onSelect={handleFolderSelect}
      onClose={() => showFolderPicker = false}
    />
  {/if}
</div>
```

Add these styles to Panel.svelte's `<style>`:
```css
.cwd-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.cwd-browse-btn {
  background: none;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  cursor: pointer;
  padding: 3px 6px;
  font-size: 14px;
  flex-shrink: 0;
  transition: border-color 0.15s;
}
.cwd-browse-btn:hover {
  border-color: var(--accent);
}
```

## Key Patterns to Follow
- Server API returns only directories (not files) for security
- Hidden directories (starting with `.`) are filtered out
- Windows drive detection via PowerShell `Get-PSDrive`
- Breadcrumbs parse the path into clickable segments
- Single click navigates into a folder; double-click selects it
- "Select" button confirms the currently browsed directory
- Overlay click closes the picker
- Vite dev proxy handles `/api` routing to the Bun backend
- Add `/api` handling in server.ts BEFORE the static file serving block

## Verification
```bash
bun run check
bun run build
```
