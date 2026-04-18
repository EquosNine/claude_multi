---
name: imma31-review
description: Use after execution to review generated code, fix issues, capture learnings, and archive completed features. Trigger when reviewing code, fixing test issues, doing quality passes, creating learnings, or archiving plans.
---

# imma31-review

**Announce:** "Using imma31-review to review, fix, and capture learnings."

**Thinking mode:** Use ultrathink (extended thinking) for the review. Catching subtle agent mistakes requires careful cross-referencing.

## Key Terms

- **Scope**: Top-level grouping directory under `claude_detailed_plans/`.
- **complete/**: Archive at `claude_detailed_plans/complete/`. Finished features go here with date stamps.
- **Learnings**: Accumulated lessons at `claude_detailed_plans/learnings/`.

## Prerequisites

**Required:** A `CLAUDE.md` at the project root describing tech stack, conventions, and build/check command(s).

**If missing:** Stop and tell the user to create one.

---

## Phase 1: Orient

### Detect Stack and Identify Scope

1. **Read the project's CLAUDE.md** for conventions, architecture, and build commands.
2. **Detect the stack** from config files.
3. **Read the execution report** from `claude_detailed_plans/<scope>/results/`.
4. **Read the EXECUTION_TRACKER.md** for status.
5. **Read existing learnings** — avoid re-flagging addressed issues.

Build the list of: files created (full review), files modified (diff-aware review), build check results.

---

## Phase 2: Gather Issues

### If the user reports issues:

Collect everything before starting fixes — verbal list, screenshots, errors, notes.

### If first-pass review (no user testing yet):

Proceed directly to code review.

---

## Phase 3: Code Review

### File-by-File Review

Read EVERY file from the execution report. For each:

1. **Does it exist?** Missing claimed file = critical failure.

2. **Does it follow conventions?** Check against CLAUDE.md and template feature. Common issues:
   - Wrong naming conventions
   - Missing/incorrect imports
   - Wrong state management pattern
   - Hard-coded values (should use project constants/tokens)
   - Missing error handling at system boundaries
   - Incorrect API/data paths

3. **Is it complete?** All fields, methods, handlers from the task file present? Agents frequently:
   - Implement 80% of a model, miss fields in serialization
   - Create a component but forget to register/export it
   - Add a route handler but miss route registration
   - Skip edge cases from the task

4. **Cross-file consistency:**
   - Types/models consistent across all referencing files
   - Imports resolve to real exports
   - Routes reachable from navigation
   - New items in barrel files / indexes

### Duplication Scan

For each new file:
1. Catalog all functions/types/components/classes
2. Search codebase for similar names or identical logic
3. Categorize:

| Finding | Action |
|---------|--------|
| Private, used only in its file | Leave in place |
| Same logic in 2+ files | Extract to shared location |
| Generic utility | Move to common/shared |
| One-time pattern | Leave — no premature abstractions |

---

## Phase 4: Triage & Fix (Autonomous)

**This replaces the old "present triage and wait for confirmation" gate.** Categorize and act:

| Category | Action |
|----------|--------|
| **Bug** — code doesn't match plan | **Fix directly** |
| **Convention violation** — works but wrong patterns | **Fix directly** |
| **Missing behavior** — plan didn't cover this | Fix if small (<20 lines). If large, **create a follow-up TASK file** |
| **Edge case** — happy path works, edge fails | **Fix directly** |
| **Design issue** — the plan itself was wrong | **Flag in report** — don't fix without user input |
| **Duplication** — extract to shared | **Fix directly** |

### Fix Process

For small/medium fixes: fix directly, reading each file before modifying.

For large fixes spanning multiple files: dispatch fix agents using the **Executor** template from `/imma31-execute`'s `agents.md`:
- Fill `{{KNOWN_GOTCHAS}}` with the issue description
- Fill `{{TASK_CONTENTS}}` with a concise fix description

After all fixes:
1. Run build/check command
2. If build fails on small/obvious errors: fix and re-run
3. If build fails on large/ambiguous errors: note in report

### Auto-created Follow-up Tasks

When missing behavior is too large to fix inline, create `TASK-XX_fix_<name>.md` in the same feature directory with:
- Clear description of what's missing
- Reference to the original task
- Status: `Not started`

---

## Phase 5: Generate Review Report

Write to `claude_detailed_plans/<scope>/results/YYYY-MM-DD_review_report.md`:

```markdown
# Code Review Report

**Date:** YYYY-MM-DD
**Scope:** <scope>
**Feature:** <feature>
**Stack:** <detected stack>
**Files Reviewed:** N
**Issues Found:** N
**Issues Fixed:** N
**Follow-up Tasks Created:** N

## Summary

### Critical Issues (blocking)
1. [file:line] Description — **Fixed** / **Needs follow-up**

### Convention Violations
1. [file:line] Description — **Fixed**

### Duplication Found
1. Description — **Extracted to** <location> / **Left in place** (reason)

### Missing Implementations
1. Description — **Implemented** / **Created follow-up task TASK-XX**

### Design Issues (needs user input)
1. Description — **Why this needs discussion**

### Clean Files (no issues)
- file — all checks passed

## Build Check
**Before fixes:** [pass/fail]
**After fixes:** [pass/fail]

## Follow-up Tasks
[Any new TASK files created]
```

---

## Phase 6: Create/Update Learnings

**If no lessons were discovered (all issues were trivial typos), skip — don't create empty files.**

Write to `claude_detailed_plans/learnings/<scope>_<feature>_<date>.md`:

```markdown
# Learnings: [Feature Name]

**Date:** YYYY-MM-DD
**Scope:** <scope>
**Stack:** <detected stack>

## What Went Well
- [Patterns that worked, good task breakdown decisions]

## What Went Wrong
- [Specific mistakes and fixes]

## Patterns Discovered
- [New patterns future plans should follow, with file paths]

## Agent Pitfalls
- [Specific agent mistakes to anticipate in future task files]

## Convention Reminders
- [Violated conventions to restate]
- [Conventions not in CLAUDE.md that should be added]

## Recommendations
- [CLAUDE.md update suggestions]
- [Task file improvement suggestions]
```

### Learnings Rules

- Group by scope, then category
- Concise but include concrete remedy — 1-5 sentences plus optional bullet
- Remove entries older than 90 days or no longer relevant
- If a lesson recurs 3+ times, suggest promoting it to CLAUDE.md
- Deduplicate — merge entries with same root cause
- Use scope `general` for cross-scope lessons

### Update Learnings Index

Update (or create) `claude_detailed_plans/learnings/INDEX.md`:

```markdown
# Learnings Index

| Date | Scope | Feature | Key Takeaway | File |
|------|-------|---------|--------------|------|
```

---

## Phase 7: Update State & Present Summary

After the review:
- **Update MASTER_GUIDE.md** — mark feature as "Reviewed" in sprint table, add decision log entries
- **Update task files** — mark reviewed tasks with updated status
- **Update EXECUTION_TRACKER.md** — note the review pass

Present as informational summary:

```
## Review Complete: [Feature Name]

**Files reviewed:** N
**Issues found:** N (N fixed, N follow-up tasks created)
**Design issues flagged:** N (need your input — see details below)
**Build:** passing / failing
**Learnings:** captured / none needed

[If design issues exist, list them here with context]

Test the feature. If more issues, run `/imma31-review` again.
When the feature is confirmed working, say "archive [feature]" to move it to complete/.
```

### CLAUDE.md Update Suggestions

If the review revealed undocumented conventions, include them in the summary:

```
**Suggested CLAUDE.md additions:**
- [specific convention to add]
- [specific convention to add]
Say "update claude.md" if you want me to add these.
```

---

## Phase 8: Archive (On User Request Only)

Archive is triggered by the user saying "archive", "complete", or "done with [feature]" — not by a check-in question.

Move the completed feature's plan directory:

```
claude_detailed_plans/<scope>/<feature>/
  → claude_detailed_plans/complete/<scope>/<feature> [DD-MM-YY]/
```

Steps:
1. `mkdir -p claude_detailed_plans/complete/<scope>`
2. Move feature directory with date suffix
3. Move `results/` into the complete directory
4. Remove empty parent directories (only if empty)
5. Update MASTER_GUIDE.md status to Complete
6. Report what was archived and what remains pending

---

## Key Principles

- **NEVER commit to git** — the user manages their own git workflow
- **Read every file** — don't sample or skip
- **Fix, don't just report** — if the fix is clear, apply it
- **Only escalate design issues** — bugs, violations, edge cases are auto-fixed
- **Learnings are the legacy** — review report is for now, learnings are for all future work
- **Convention violations are patterns** — if agents repeat a mistake, it's a task-writing issue
- **Be surgical** — only change what needs fixing
- **Build must pass** — review isn't done until build/check succeeds
- **Archive on user request** — don't ask "is it complete?" — user will tell you
- **Auto-create follow-up tasks** — large missing behavior gets a TASK file, not a question

## Follow-up Commands

After review:
- `/imma31-plan` — plan the next feature (learnings inform better plans)
- `/imma31-execute` — execute remaining or follow-up tasks
