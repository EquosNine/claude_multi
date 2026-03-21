# Task 02: Elapsed Time Indicator

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Vanilla HTML/CSS/JS
**Modifies:** 1 existing file

## Goal
Add a live elapsed time display to each panel that starts counting when a Claude process is running and shows the final elapsed time when it completes.

## Files to Modify

### 1. `public/index.html`

**CSS additions:**
```css
.panel-timer {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 11px;
  color: var(--text-dim);
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 42px;
  text-align: center;
  transition: color 0.2s;
}
.panel-timer.active {
  color: var(--green);
}
```

**Panel class changes:**

Add properties to constructor:
```js
this.timerEl = null;
this.timerInterval = null;
this.startTime = null;
```

Add timer element inside `.panel-meta` (before status-dot) in build() template:
```html
<span class="panel-timer" title="Elapsed time">--:--</span>
```

Query: `this.timerEl = div.querySelector(".panel-timer");`

Add methods:
```js
startTimer() {
  this.stopTimer();
  this.startTime = Date.now();
  this.timerEl.classList.add("active");
  this.timerEl.textContent = "00:00";
  this.timerInterval = setInterval(() => {
    this.timerEl.textContent = this.formatTime(Date.now() - this.startTime);
  }, 1000);
}

stopTimer() {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
  this.timerEl.classList.remove("active");
}

formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
```

Modify `setStatus(status)` — add timer calls:
```js
setStatus(status) {
  this.status = status;
  this.statusEl.className = "status-dot " + status;
  this.statusEl.title = status;
  if (status === "running") {
    this.sendBtn.textContent = "Stop";
    this.sendBtn.classList.add("stop");
    this.startTimer();
  } else {
    this.sendBtn.textContent = "Send";
    this.sendBtn.classList.remove("stop");
    this.stopTimer();
  }
}
```

Modify `remove()` — add `this.stopTimer();`

## Key Patterns to Follow
- Timer element goes inside `.panel-meta` wrapper (from Task 01)
- If Task 01 not yet applied, place after status-dot in panel-header
- Use CSS custom properties for colors
- Clean up interval on remove()

## Verification
Run `bun run server.ts`, send a prompt, verify timer counts up while running, stops and shows final time on completion.
