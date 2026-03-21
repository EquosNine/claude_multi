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
  html: true,
  linkify: true,
  typographer: false,
  breaks: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch { /* fall through */ }
    }
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

const htmlCache = new Map<string, string>();

export function renderMarkdown(text: string, skipCache = false): string {
  if (!skipCache) {
    const cached = htmlCache.get(text);
    if (cached !== undefined) return cached;
  }
  const html = md.render(text);
  if (!skipCache) {
    if (htmlCache.size > 500) {
      const iter = htmlCache.keys();
      for (let i = 0; i < 100; i++) {
        const r = iter.next();
        if (r.done) break;
        htmlCache.delete(r.value);
      }
    }
    htmlCache.set(text, html);
  }
  return html;
}
