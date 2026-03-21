import type { OutputMessage } from './types';

function formatMessage(msg: OutputMessage, format: 'text' | 'markdown'): string[] {
  if (format === 'text') {
    switch (msg.type) {
      case 'system':     return [msg.text];
      case 'assistant':  return [msg.text, ''];
      case 'error':      return [`[ERROR] ${msg.text}`];
      case 'tool':       return [`[${msg.toolName || 'TOOL'}] ${msg.text}`];
      case 'tool-result':return [`  → ${msg.text}`];
      case 'done':       return [msg.text, ''];
      default:           return [];
    }
  } else {
    switch (msg.type) {
      case 'system':     return [`> ${msg.text}`];
      case 'assistant':  return [msg.text, ''];
      case 'error':      return [`**ERROR:** ${msg.text}`, ''];
      case 'tool':       return [`\`${msg.toolName || 'tool'}\` ${msg.text}`];
      case 'tool-result':return ['```', msg.text, '```'];
      case 'done':       return ['---', `_${msg.text}_`, ''];
      default:           return [];
    }
  }
}

export function formatMessagesAsText(messages: OutputMessage[]): string {
  return messages.flatMap(m => formatMessage(m, 'text')).join('\n').trim();
}

export function formatMessagesAsMarkdown(messages: OutputMessage[], panelName?: string): string {
  const header = panelName
    ? [`# ${panelName}`, `_Exported: ${new Date().toLocaleString()}_`, '']
    : [];
  return [...header, ...messages.flatMap(m => formatMessage(m, 'markdown'))].join('\n').trim();
}

export async function copyPanelOutput(messages: OutputMessage[]): Promise<boolean> {
  const text = formatMessagesAsText(messages);
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadPanelOutput(messages: OutputMessage[], panelName?: string) {
  const md = formatMessagesAsMarkdown(messages, panelName);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(panelName || 'panel-output').replace(/[^a-zA-Z0-9-_]/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
