import { join } from "path";
import { existsSync, readFileSync } from "fs";

export function expandSkill(prompt: string): string {
  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const globalSkillsDir = join(homeDir, ".claude", "skills");

  return prompt.replace(/(^|\s)\/([a-zA-Z0-9][a-zA-Z0-9_-]*)/g, (match, prefix, skillName) => {
    const skillPath = join(globalSkillsDir, skillName, "SKILL.md");
    if (!existsSync(skillPath)) return match;

    let content = readFileSync(skillPath, "utf-8");
    content = content.replace(/^---[\s\S]*?---\s*\n/, "").trim();
    return prefix + content;
  });
}
