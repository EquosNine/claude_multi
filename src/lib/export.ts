import type { OutputMessage } from './types';

export function formatMessagesAsText(messages: OutputMessage[]): string {
  const lines: string[] = [];
  for (const msg of messages) {
    switch (msg.type) {
      case 'system':
        lines.push(msg.text);
        break;
      case 'assistant':
        lines.push(msg.text);
        lines.push('');
        break;
      case 'error':
        lines.push(`[ERROR] ${msg.text}`);
        break;
      case 'tool':
        lines.push(`[${msg.toolName || 'TOOL'}] ${msg.text}`);
        break;
      case 'tool-result':
        lines.push(`  → ${msg.text}`);
        break;
      case 'done':
        lines.push(msg.text);
        lines.push('');
        break;
    }
  }
  return lines.join('\n').trim();
}

export function formatMessagesAsMarkdown(messages: OutputMessage[], panelName?: string): string {
  const lines: string[] = [];
  if (panelName) {
    lines.push(`# ${panelName}`);
    lines.push(`_Exported: ${new Date().toLocaleString()}_`);
    lines.push('');
  }
  for (const msg of messages) {
    switch (msg.type) {
      case 'system':
        lines.push(`> ${msg.text}`);
        break;
      case 'assistant':
        lines.push(msg.text);
        lines.push('');
        break;
      case 'error':
        lines.push(`**ERROR:** ${msg.text}`);
        lines.push('');
        break;
      case 'tool':
        lines.push(`\`${msg.toolName || 'tool'}\` ${msg.text}`);
        break;
      case 'tool-result':
        lines.push('```');
        lines.push(msg.text);
        lines.push('```');
        break;
      case 'done':
        lines.push('---');
        lines.push(`_${msg.text}_`);
        lines.push('');
        break;
    }
  }
  return lines.join('\n').trim();
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
