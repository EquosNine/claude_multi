# Task 04: Slash Command Autocomplete with Real Skills

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Vanilla HTML/CSS/JS
**Modifies:** 1 existing file

## Goal
Add slash command autocomplete to panel textareas. When the user types `/` at the start of input, show a categorized dropdown of all 59+ installed skills plus client-side commands. Arrow keys navigate, Enter/Tab executes.

## Files to Modify

### 1. `public/index.html`

**Command registry — define at top of `<script>`:**
```js
const SLASH_COMMANDS = [
  // Client-side
  { cmd: "/clear",    desc: "Clear panel output",      cat: "client", type: "client" },
  { cmd: "/help",     desc: "Show available commands",  cat: "client", type: "client" },

  // Dev tools
  { cmd: "/simplify",       desc: "Review code for reuse & quality",           cat: "dev", type: "skill" },
  { cmd: "/imma3-plan",     desc: "Plan features & generate tasks",            cat: "dev", type: "skill" },
  { cmd: "/imma3-execute",  desc: "Execute tasks with parallel agents",        cat: "dev", type: "skill" },
  { cmd: "/imma3-review",   desc: "Review code & capture learnings",           cat: "dev", type: "skill" },
  { cmd: "/claude-api",     desc: "Build apps with Claude API",                cat: "dev", type: "skill" },

  // EQUOS project
  { cmd: "/equos-spec-plan",    desc: "Create objective + context for a feature", cat: "equos", type: "skill" },
  { cmd: "/equos-spec-proceed", desc: "Generate task list from approved plan",    cat: "equos", type: "skill" },
  { cmd: "/equos-autopilot",    desc: "Execute tasks with parallel execution",    cat: "equos", type: "skill" },

  // SEO
  { cmd: "/seo-audit",          desc: "Full technical & on-page SEO audit",       cat: "seo", type: "skill" },
  { cmd: "/keyword-research",   desc: "Find keywords via SemRush",                cat: "seo", type: "skill" },
  { cmd: "/serp-analyzer",      desc: "Analyze Google search results",            cat: "seo", type: "skill" },
  { cmd: "/search-console",     desc: "Pull Google Search Console data",          cat: "seo", type: "skill" },
  { cmd: "/semrush-research",   desc: "SEO & competitive intelligence",           cat: "seo", type: "skill" },
  { cmd: "/backlink-audit",     desc: "Audit domain backlink profile",            cat: "seo", type: "skill" },
  { cmd: "/schema-markup",      desc: "Generate Schema.org JSON-LD",              cat: "seo", type: "skill" },
  { cmd: "/programmatic-seo",   desc: "SEO pages at scale",                       cat: "seo", type: "skill" },
  { cmd: "/seo-content-brief",  desc: "Create SEO content brief",                 cat: "seo", type: "skill" },

  // Content
  { cmd: "/write-blog",          desc: "Generate SEO-optimized blog post",        cat: "content", type: "skill" },
  { cmd: "/write-landing",       desc: "Create landing page copy",                cat: "content", type: "skill" },
  { cmd: "/copywriting",         desc: "Marketing copy for any page",             cat: "content", type: "skill" },
  { cmd: "/copy-editing",        desc: "Line-by-line copy editing",               cat: "content", type: "skill" },
  { cmd: "/content-strategy",    desc: "Build content strategy & clusters",       cat: "content", type: "skill" },
  { cmd: "/content-calendar",    desc: "Plan content & posting schedule",         cat: "content", type: "skill" },
  { cmd: "/content-gap-analysis",desc: "Find content gaps vs competitors",        cat: "content", type: "skill" },
  { cmd: "/content-repurposing", desc: "Repurpose content across formats",        cat: "content", type: "skill" },
  { cmd: "/lead-magnet",         desc: "Create lead magnets & gated content",     cat: "content", type: "skill" },
  { cmd: "/thread-writer",       desc: "Write viral threads & posts",             cat: "content", type: "skill" },

  // Ads & Paid
  { cmd: "/google-ads",         desc: "Write Google Ads copy & campaigns",        cat: "ads", type: "skill" },
  { cmd: "/google-ads-report",  desc: "Pull Google Ads performance data",         cat: "ads", type: "skill" },
  { cmd: "/facebook-ads",       desc: "Create Facebook/Meta ad campaigns",        cat: "ads", type: "skill" },
  { cmd: "/linkedin-ads",       desc: "Create LinkedIn ad campaigns",             cat: "ads", type: "skill" },
  { cmd: "/video-ad-analysis",  desc: "Analyze video ad creatives",               cat: "ads", type: "skill" },

  // Social
  { cmd: "/social-content",     desc: "Create social posts for all platforms",    cat: "social", type: "skill" },
  { cmd: "/linkedin-content",   desc: "Write LinkedIn posts & strategy",          cat: "social", type: "skill" },
  { cmd: "/bluesky",            desc: "Create Bluesky content",                   cat: "social", type: "skill" },
  { cmd: "/reddit-marketing",   desc: "Market on Reddit authentically",           cat: "social", type: "skill" },
  { cmd: "/podcast-marketing",  desc: "Plan & market a podcast",                  cat: "social", type: "skill" },
  { cmd: "/youtube-analytics",  desc: "Analyze YouTube performance",              cat: "social", type: "skill" },
  { cmd: "/newsletter",         desc: "Plan & grow email newsletter",             cat: "social", type: "skill" },

  // Marketing Strategy
  { cmd: "/competitor-analysis", desc: "Full competitor strategy breakdown",       cat: "strategy", type: "skill" },
  { cmd: "/growth-strategy",    desc: "Build growth strategy & metrics",           cat: "strategy", type: "skill" },
  { cmd: "/launch-strategy",    desc: "Plan product launch week-by-week",          cat: "strategy", type: "skill" },
  { cmd: "/demand-gen",         desc: "Build demand gen & pipeline strategy",      cat: "strategy", type: "skill" },
  { cmd: "/pricing-strategy",   desc: "Optimize pricing models & pages",           cat: "strategy", type: "skill" },
  { cmd: "/product-marketing",  desc: "Positioning, messaging, GTM",               cat: "strategy", type: "skill" },
  { cmd: "/icp-builder",        desc: "Define ideal customer profiles",            cat: "strategy", type: "skill" },
  { cmd: "/marketing-ideas",    desc: "139 proven marketing ideas",                cat: "strategy", type: "skill" },
  { cmd: "/ab-test-setup",      desc: "Design & analyze A/B tests",               cat: "strategy", type: "skill" },
  { cmd: "/brand-monitor",      desc: "Monitor brand mentions & sentiment",        cat: "strategy", type: "skill" },
  { cmd: "/referral-program",   desc: "Design referral & viral loops",             cat: "strategy", type: "skill" },
  { cmd: "/affiliate-marketing",desc: "Build affiliate program",                   cat: "strategy", type: "skill" },

  // CRO
  { cmd: "/page-cro",           desc: "Audit & optimize pages for conversion",    cat: "cro", type: "skill" },
  { cmd: "/signup-flow-cro",    desc: "Optimize signup conversion funnels",        cat: "cro", type: "skill" },
  { cmd: "/onboarding-cro",     desc: "Improve onboarding activation",            cat: "cro", type: "skill" },

  // Email
  { cmd: "/email-sequence",     desc: "Create email drip campaigns",              cat: "email", type: "skill" },
  { cmd: "/email-subject-lines",desc: "Generate & test email subjects",           cat: "email", type: "skill" },

  // Integrations
  { cmd: "/hubspot",            desc: "Manage HubSpot CRM & content",             cat: "integrations", type: "skill" },
  { cmd: "/apollo-outreach",    desc: "Research & enrich B2B leads",              cat: "integrations", type: "skill" },
  { cmd: "/google-analytics",   desc: "Pull GA4 reports & insights",              cat: "integrations", type: "skill" },
  { cmd: "/slack-bot",          desc: "Send messages to Slack",                   cat: "integrations", type: "skill" },
  { cmd: "/discord-bot",        desc: "Send content to Discord",                  cat: "integrations", type: "skill" },
  { cmd: "/telegram-bot",       desc: "Send content to Telegram",                 cat: "integrations", type: "skill" },
  { cmd: "/feishu-lark",        desc: "Send messages to Feishu/Lark",            cat: "integrations", type: "skill" },
  { cmd: "/domain-research",    desc: "WHOIS & domain marketplace lookup",        cat: "integrations", type: "skill" },
];

const CATEGORY_LABELS = {
  client: "Panel",
  dev: "Development",
  equos: "EQUOS",
  seo: "SEO",
  content: "Content",
  ads: "Ads & Paid",
  social: "Social",
  strategy: "Strategy",
  cro: "CRO",
  email: "Email",
  integrations: "Integrations",
};

const CATEGORY_COLORS = {
  client: "var(--text-dim)",
  dev: "var(--green)",
  equos: "var(--accent)",
  seo: "var(--orange)",
  content: "var(--blue)",
  ads: "#e879f9",
  social: "#22d3ee",
  strategy: "var(--orange)",
  cro: "var(--green)",
  email: "var(--blue)",
  integrations: "var(--text-dim)",
};
```

**CSS additions:**
```css
.panel-input { position: relative; }

.slash-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  max-height: 260px;
  overflow-y: auto;
  display: none;
  z-index: 100;
  box-shadow: 0 -4px 16px rgba(0,0,0,0.4);
  margin-bottom: 4px;
}
.slash-dropdown.visible { display: block; }
.slash-dropdown::-webkit-scrollbar { width: 5px; }
.slash-dropdown::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 3px; }

.slash-cat-label {
  padding: 4px 10px 2px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  border-top: 1px solid var(--panel-border);
}
.slash-cat-label:first-child { border-top: none; }

.slash-item {
  padding: 5px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.slash-item:hover, .slash-item.selected {
  background: rgba(124, 58, 237, 0.12);
}
.slash-item .cmd {
  font-weight: 600;
  min-width: 140px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
}
.slash-item .desc {
  color: var(--text-dim);
  font-size: 11px;
  flex: 1;
  text-align: right;
}
```

**Panel class changes:**

Add properties to constructor:
```js
this.dropdownEl = null;
this.filteredCmds = [];
this.selectedIndex = 0;
```

Add dropdown element inside `.panel-input`, before textarea:
```html
<div class="slash-dropdown"></div>
```

Query: `this.dropdownEl = div.querySelector(".slash-dropdown");`

Add methods:
```js
showDropdown(filter) {
  const query = filter.toLowerCase().slice(1);
  this.filteredCmds = SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(query));
  if (this.filteredCmds.length === 0) { this.hideDropdown(); return; }
  this.selectedIndex = 0;
  this.renderDropdown();
  this.dropdownEl.classList.add("visible");
}

hideDropdown() {
  this.dropdownEl.classList.remove("visible");
  this.filteredCmds = [];
  this.selectedIndex = 0;
}

renderDropdown() {
  let html = "";
  let lastCat = "";
  this.filteredCmds.forEach((c, i) => {
    if (c.cat !== lastCat) {
      lastCat = c.cat;
      const color = CATEGORY_COLORS[c.cat] || "var(--text-dim)";
      html += `<div class="slash-cat-label" style="color:${color}">${CATEGORY_LABELS[c.cat] || c.cat}</div>`;
    }
    html += `<div class="slash-item${i === this.selectedIndex ? ' selected' : ''}" data-index="${i}">
      <span class="cmd" style="color:${CATEGORY_COLORS[c.cat] || 'var(--accent)'}">${esc(c.cmd)}</span>
      <span class="desc">${esc(c.desc)}</span>
    </div>`;
  });
  this.dropdownEl.innerHTML = html;

  this.dropdownEl.querySelectorAll(".slash-item").forEach(el => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.executeSlashCmd(this.filteredCmds[parseInt(el.dataset.index)]);
    });
  });

  // Scroll selected into view
  const sel = this.dropdownEl.querySelector(".selected");
  if (sel) sel.scrollIntoView({ block: "nearest" });
}

executeSlashCmd(cmd) {
  this.hideDropdown();
  this.inputEl.value = "";
  this.inputEl.style.height = "auto";

  if (cmd.type === "client") {
    if (cmd.cmd === "/clear") this.clear();
    if (cmd.cmd === "/help") {
      this.appendSystem("Available commands (type / to search):");
      let lastCat = "";
      for (const c of SLASH_COMMANDS) {
        if (c.cat !== lastCat) {
          lastCat = c.cat;
          this.appendSystem(`\n  [${CATEGORY_LABELS[c.cat] || c.cat}]`);
        }
        this.appendSystem(`    ${c.cmd.padEnd(24)} ${c.desc}`);
      }
    }
    return;
  }

  // Skill commands — send the slash command as the prompt
  // Claude Code skills are invoked by sending the command name
  const cwd = this.cwdEl.value.trim();
  if (!cwd) {
    this.appendSystem("Set a project directory first.");
    this.cwdEl.focus();
    return;
  }
  this.appendUser(cmd.cmd);
  // Send skill name as prompt — claude -p will interpret it
  this.sendWs({ type: "prompt", panelId: this.id, cwd, prompt: `${cmd.cmd} ${cmd.desc}` });
}
```

**Update input event listeners in build():**

Replace existing `input` handler:
```js
this.inputEl.addEventListener("input", () => {
  this.inputEl.style.height = "auto";
  this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + "px";
  const val = this.inputEl.value;
  if (val.startsWith("/") && !val.includes("\n")) {
    this.showDropdown(val);
  } else {
    this.hideDropdown();
  }
});
```

Replace existing `keydown` handler:
```js
this.inputEl.addEventListener("keydown", (e) => {
  if (this.dropdownEl.classList.contains("visible")) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCmds.length - 1);
      this.renderDropdown();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderDropdown();
      return;
    }
    if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      if (this.filteredCmds[this.selectedIndex]) {
        this.executeSlashCmd(this.filteredCmds[this.selectedIndex]);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      this.hideDropdown();
      return;
    }
  }
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    this.handleSend();
  }
});
```

Add blur handler:
```js
this.inputEl.addEventListener("blur", () => {
  setTimeout(() => this.hideDropdown(), 150);
});
```

## Key Patterns to Follow
- Follow existing Panel class pattern: DOM in build(), methods on class
- Use `esc()` helper for all text in innerHTML
- Category labels with colored separators for scannable dropdown
- Dropdown positioned absolutely above the input area
- Keyboard nav: Arrow up/down, Enter/Tab to select, Escape to close

## Verification
Run `bun run server.ts`, type `/` in a panel — see all commands grouped by category. Type `/seo` — see only SEO commands. Arrow down, press Enter — command executes. Type `/clear` — panel output clears. Type `/help` — shows full command list.
