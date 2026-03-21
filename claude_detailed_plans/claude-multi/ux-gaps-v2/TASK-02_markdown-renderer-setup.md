# Task 02: Markdown Renderer Setup

**Status:** Not started
**Depends on:** Nothing
**Scope:** claude-multi
**Stack:** Svelte 5 (runes) + Vite + TypeScript
**Creates:** 1 new file / **Modifies:** 2 existing files

## Goal
Install `markdown-it` and `highlight.js`, create a reusable markdown rendering utility, and add CSS styles for rendered markdown content and syntax-highlighted code blocks.

## Files to Create/Modify

### 1. Install packages
```bash
bun add markdown-it highlight.js
bun add -d @types/markdown-it
```

### 2. Create `src/lib/markdown.ts`

Markdown rendering utility using markdown-it with highlight.js for code blocks.

```typescript
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';

// Import only common languages to keep bundle small
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import diff from 'highlight.js/lib/languages/diff';
import shell from 'highlight.js/lib/languages/shell';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import dart from 'highlight.js/lib/languages/dart';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('zsh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('svelte', xml);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('java', java);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('kt', kotlin);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('dart', dart);

const md = new MarkdownIt({
  html: false,          // Security: disable raw HTML passthrough
  linkify: true,        // Auto-convert URLs to clickable links
  typographer: false,   // Don't replace quotes/dashes
  breaks: true,         // Convert \n to <br> (matches Claude's formatting)
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch { /* fall through */ }
    }
    // No language specified or not recognized — render as plain code block
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

// Make links open in new tab
const defaultLinkRender = md.renderer.rules.link_open ||
  function (tokens: any, idx: any, options: any, _env: any, self: any) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.link_open = function (tokens: any, idx: any, options: any, env: any, self: any) {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLinkRender(tokens, idx, options, env, self);
};

/**
 * Render a markdown string to HTML.
 * Safe to use with {@html} — raw HTML input is escaped by markdown-it.
 */
export function renderMarkdown(text: string): string {
  return md.render(text);
}
```

### 3. Modify `src/app.css`

Add styles for rendered markdown content at the end of the file. These styles scope to `.msg-assistant` to avoid affecting other UI elements.

```css
/* ---- Markdown rendered output ---- */
.msg-assistant h1,
.msg-assistant h2,
.msg-assistant h3,
.msg-assistant h4 {
  margin: 8px 0 4px;
  line-height: 1.3;
}
.msg-assistant h1 { font-size: 1.3em; color: var(--text); border-bottom: 1px solid var(--panel-border); padding-bottom: 4px; }
.msg-assistant h2 { font-size: 1.15em; color: var(--text); }
.msg-assistant h3 { font-size: 1.05em; color: var(--text-dim); }
.msg-assistant h4 { font-size: 1em; color: var(--text-dim); }

.msg-assistant p { margin: 4px 0; }

.msg-assistant ul,
.msg-assistant ol {
  margin: 4px 0;
  padding-left: 20px;
}
.msg-assistant li { margin: 2px 0; }

.msg-assistant a {
  color: var(--blue);
  text-decoration: underline;
  text-decoration-color: rgba(59, 130, 246, 0.4);
}
.msg-assistant a:hover {
  text-decoration-color: var(--blue);
}

.msg-assistant code {
  background: var(--tool-bg);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}

.msg-assistant pre.hljs {
  background: #0d1117;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin: 6px 0;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}

.msg-assistant pre.hljs code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
  color: #c9d1d9;
}

.msg-assistant blockquote {
  border-left: 3px solid var(--accent);
  padding: 2px 10px;
  margin: 6px 0;
  color: var(--text-dim);
  background: rgba(124, 58, 237, 0.05);
  border-radius: 0 4px 4px 0;
}

.msg-assistant table {
  border-collapse: collapse;
  margin: 6px 0;
  font-size: 12px;
  width: 100%;
}
.msg-assistant th,
.msg-assistant td {
  border: 1px solid var(--panel-border);
  padding: 4px 8px;
  text-align: left;
}
.msg-assistant th {
  background: var(--input-bg);
  font-weight: 600;
}

.msg-assistant hr {
  border: none;
  border-top: 1px solid var(--panel-border);
  margin: 8px 0;
}

.msg-assistant strong { font-weight: 700; }
.msg-assistant em { font-style: italic; color: var(--text-dim); }

/* highlight.js token colors (GitHub Dark inspired) */
.hljs-keyword { color: #ff7b72; }
.hljs-string { color: #a5d6ff; }
.hljs-number { color: #79c0ff; }
.hljs-comment { color: #8b949e; font-style: italic; }
.hljs-function { color: #d2a8ff; }
.hljs-title { color: #d2a8ff; }
.hljs-built_in { color: #ffa657; }
.hljs-type { color: #ffa657; }
.hljs-attr { color: #79c0ff; }
.hljs-variable { color: #ffa657; }
.hljs-params { color: #c9d1d9; }
.hljs-meta { color: #79c0ff; }
.hljs-literal { color: #79c0ff; }
.hljs-regexp { color: #7ee787; }
.hljs-symbol { color: #79c0ff; }
.hljs-addition { color: #aff5b4; background: rgba(46, 160, 67, 0.15); }
.hljs-deletion { color: #ffdcd7; background: rgba(248, 81, 73, 0.15); }
```

## Key Patterns to Follow
- Follow the existing utility module pattern from `src/lib/utils.ts` — pure function export
- CSS custom properties from `src/app.css` `:root` block for colors
- Keep the highlight.js import tree-shakeable by importing individual languages, not the full bundle

## Verification
```bash
bun run check
bun run build
```
Verify `dist/` includes the markdown-it and highlight.js code. Check bundle size hasn't exploded (highlight.js core + 17 languages should be ~60KB gzipped).
