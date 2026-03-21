import type { SlashCommand } from './types';

export interface DirEntry {
  name: string;
  path: string;
}

export interface BrowseResult {
  path: string;
  entries: DirEntry[];
}

export interface SkillsResult {
  global: SlashCommand[];
  project: SlashCommand[];
  agents: SlashCommand[];
}

export interface UploadResult {
  path: string;
}

export async function browse(path: string): Promise<BrowseResult> {
  const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { path: data.path || path, entries: data.entries || [] };
}

export async function fetchSkills(cwd: string): Promise<SkillsResult> {
  const res = await fetch(`/api/skills?cwd=${encodeURIComponent(cwd)}`);
  if (!res.ok) throw new Error(`Skills fetch failed: ${res.status}`);
  return res.json();
}

export async function uploadImage(cwd: string, filename: string, data: string): Promise<UploadResult> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cwd, filename, data }),
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
