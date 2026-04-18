# Task 01: CSS Layout Improvements + Editable Panel Names

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Vanilla HTML/CSS/JS
**Modifies:** 1 existing file

## Goal
Improve the panel grid layout with better responsive behavior, add editable panel names that persist to localStorage, and polish overall spacing/visuals.

## Files to Modify

### 1. `public/index.html`

**CSS changes:**

Add/update grid layout rules:
```css
/* Better grid: 1 panel = full width, 2 = 50/50, 3 = 33/33/33, 4+ = 2-col grid */
#panels.layout-columns { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); }
#panels.layout-grid { grid-template-columns: repeat(2, 1fr); }

/* Panel min-height so they don't collapse */
.panel { min-height: 300px; }
```

Add panel name styles:
```css
.panel-name {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  outline: none;
  min-width: 60px;
  max-width: 160px;
  flex-shrink: 1;
  cursor: text;
  transition: border-color 0.15s;
}
.panel-name:hover { border-color: var(--panel-border); }
.panel-name:focus { border-color: var(--accent); background: var(--input-bg); }
.panel-name::placeholder { color: var(--text-dim); font-weight: 400; }
```

Improve panel header spacing:
```css
.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
  min-height: 36px;
}
```

Add subtle separator between panel sections:
```css
.panel-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}
```

**HTML template changes in Panel.build():**

Update the panel header template:
```html
<div class="panel-header">
  <span class="panel-num">${this.id + 1}</span>
  <input type="text" class="panel-name" placeholder="Untitled" spellcheck="false" maxlength="30">
  <input type="text" class="cwd-input" placeholder="C:\\path\\to\\project" spellcheck="false">
  <div class="panel-meta">
    <!-- timer and status dot will go here (from other tasks) -->
    <div class="status-dot" title="idle"></div>
    <button class="panel-close" title="Remove panel">&times;</button>
  </div>
</div>
```

**Panel class changes:**

Add property: `this.nameEl = null;`

Query in build(): `this.nameEl = div.querySelector(".panel-name");`

Load/save name from localStorage:
```js
const savedName = localStorage.getItem(`panel-name-${this.id}`);
if (savedName) this.nameEl.value = savedName;

this.nameEl.addEventListener("change", () => {
  localStorage.setItem(`panel-name-${this.id}`, this.nameEl.value);
});
```

**updateGrid() changes:**

Use CSS classes instead of inline styles:
```js
function updateGrid() {
  const container = document.getElementById("panels");
  const n = panels.length;
  if (n === 0) {
    container.innerHTML = '<div class="empty-state">Click "+ Panel" to get started</div>';
    return;
  }
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();

  container.className = layout === "grid" ? "layout-grid" : "layout-columns";
}
```

## Key Patterns to Follow
- Existing Panel class pattern: DOM in build(), properties on class, localStorage for persistence
- Use CSS custom properties for all colors
- Keep panel-num badge as-is, add name input after it
- Group status indicators in a `.panel-meta` wrapper for right-alignment

## Verification
Run `bun run server.ts`, verify panels have editable names, layout responds to window resize, names persist after page reload.
