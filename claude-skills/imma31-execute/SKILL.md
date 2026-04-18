---
name: imma31-execute
description: Use when the user wants to execute planned tasks, implement features, run the next batch of work, or says "execute", "implement", "build it", or "run the tasks". Autonomous execution with minimal check-ins.
---

# imma31-execute

**Announce:** "Using imma31-execute to implement tasks from claude_detailed_plans/."

## Key Terms

- **Scope**: Top-level grouping directory under `claude_detailed_plans/`.
- **Task file**: A `TASK-XX_<name>.md` file — one independently-executable unit of work.
- **complete/**: Archive at `claude_detailed_plans/complete/`. Excluded from scans.
- **Build/check command**: From `CLAUDE.md`. If multiple, run all in order.

---

## Phase 1: Discover and Prepare

### Detect the Stack

1. **Read the project's CLAUDE.md** for architecture, conventions, and build commands.
2. **Detect the stack** from config files (`go.mod`, `package.json`, `pubspec.yaml`, `Cargo.toml`, `pyproject.toml`, etc.).
3. **Identify the build/check command** — from CLAUDE.md if specified, otherwise infer:

   | Stack Signal | Default Check Command |
   |-------------|----------------------|
   | `go.mod` | `go vet ./...` |
   | `pubspec.yaml` | `flutter analyze` |
   | `svelte.config.*` | `npm run check` |
   | `astro.config.*` | `npm run build` |
   | `next.config.*` | `npm run build` |
   | `Cargo.toml` | `cargo check` |
   | `pyproject.toml` | `ruff check .` or `python -m py_compile` |

### Scan for Task Files

Recursively scan `claude_detailed_plans/` (excluding `complete/`) for all `TASK-*.md` files. Filter to Status: `Not started` or `In Progress`.

- **`Not started`** → execute normally
- **`In Progress`** → re-execute from scratch (agents read current state)

Extract from each: scope, feature, task number/name, stack, status, dependencies, affected files.

If none found: "No pending tasks. Use `/imma31-plan` to create task plans first."

### Read Learnings

Read `claude_detailed_plans/learnings/` if it exists. Filter to entries matching target scope(s) plus `general`/`cross-cutting`. Feed into `{{KNOWN_GOTCHAS}}` placeholder.

---

## Phase 2: Build Execution Plan & Proceed

### Create the Tracker

Write tracker to `claude_detailed_plans/<scope>/<feature>/EXECUTION_TRACKER.md`:

```markdown
# Execution Tracker

**Started:** YYYY-MM-DD HH:MM
**Feature:** <feature>
**Scope:** <scope>
**Build command:** <from CLAUDE.md>
**Status:** In Progress

## Discovered Tasks

| # | Scope | Feature | Stack | Status | Depends On |
|---|-------|---------|-------|--------|------------|

## Dependency Graph
<which tasks block which>

## Parallel Groups
<tasks grouped by what can run simultaneously>

## Task Results

| Task | Status | Summary | Files Changed | Errors |
|------|--------|---------|---------------|--------|

## Files Changed (all tasks)
<consolidated list>

## Build Check Results
<output after each group>

## Lessons (for learnings)
<evidence from agent deviations, errors, surprises>
```

### Parse Dependencies and Group

- Parse `Depends on` field of each task
- Group into parallel batches: tasks whose dependencies are all satisfied run together
- A task is "satisfied" when its dependencies are `Complete` or `Nothing`

### Present and Proceed

Show the execution plan — then **immediately start executing**. Do NOT wait for confirmation. The user invoked execute; that IS the confirmation.

```
Executing [Feature Name]:
  Group 1 (parallel): TASK-01, TASK-02, TASK-03
  Group 2 (sequential after G1): TASK-04
  Group 3 (parallel after G2): TASK-05, TASK-06
  Build command: <command>

Dispatching Group 1 now...
```

---

## Phase 3: Execute

### Read Agent Templates

Read `agents.md` in this skill's directory for the Executor, Verifier, and Refactorer prompt templates. Fill placeholders before dispatching.

### Check for Previous Work

If execution reports exist in `claude_detailed_plans/<scope>/results/`, dispatch a **Verifier** agent to confirm previous work before building on top.

### Dispatch Agents

For each parallel group, dispatch all agents simultaneously:

```
Agent(
  subagent_type: "general-purpose",
  description: "<scope>/<feature> TASK-XX",
  prompt: "<Executor template with placeholders filled>"
)
```

**Placeholder fills:**
- `{{CLAUDE_MD}}` → project's CLAUDE.md contents
- `{{KNOWN_GOTCHAS}}` → filtered learnings, or `"None"`
- `{{TASK_CONTENTS}}` → full text of the task file
- `{{SCOPE_PATH}}` → scope directory path
- `{{BUILD_COMMAND}}` → build/check command

**Dispatch rules:**
- **Max 3 agents at a time**
- Different scopes/features can always run in parallel
- Same feature can run in parallel ONLY if touching different files
- Sequential dependencies run in order

### Compact After Each Task

**Critical for long executions.** After EACH agent returns:

1. **Extract key facts**: status, files changed, one-sentence summary, errors/deviations
2. **Write to EXECUTION_TRACKER.md immediately** — don't batch
3. If errors/deviations/unexpected fixes — note in tracker's **Lessons** section
4. **Discard full agent output** from working memory. Tracker is the persistent record.
5. **Re-read files** that subsequent tasks will modify

### After Each Group

1. Check for file conflicts (multiple agents editing same file)
2. If conflicts: read both versions, merge manually
3. Run build/check command
4. Update task file statuses to `Complete` or `Failed`
5. Print: **"Group N complete (N agents, N files changed). Dispatching Group N+1."**

---

## Phase 4: Verify

Dispatch verification agent using **Verifier** template from `agents.md`:
- `{{FILE_LIST}}` → "Files Changed" from tracker
- `{{BUILD_COMMAND}}` → build/check command
- `{{CLAUDE_MD}}` → project conventions
- `{{TASK_CONTEXT}}` → feature's README.md (Task Summary + Key Patterns)

---

## Phase 5: Refactor

Dispatch quality pass agent using **Refactorer** template from `agents.md`:
- Same placeholder fills as Verifier

---

## Phase 6: Report

Write to `claude_detailed_plans/<scope>/results/YYYY-MM-DD_execution_report.md`:

```markdown
# Execution Report

**Date:** YYYY-MM-DD
**Feature:** <feature>
**Scope:** <scope>
**Stack:** <detected stack>
**Tasks Executed:** N of M
**Build Command:** <from CLAUDE.md>

## Summary
| Task | Status | Files Changed |
|------|--------|---------------|

## Details
### TASK-XX: <Title>
**Status:** Complete | Failed | Partial
**Files created/modified:** ...
**Deviations:** ...

## Verification Results
<from verifier agent>

## Quality Check Results
<from refactorer agent>

## Build Check
<final build/check output>

## Remaining Work
<tasks not completed>

## Next Steps
<recommendations>
```

---

## Phase 7: Update State and Present Summary

After execution:
- Update EXECUTION_TRACKER.md with final statuses
- Mark completed tasks in original TASK files
- **Update MASTER_GUIDE.md** — move feature status forward

Present as informational summary — not a question:

```
## Execution Complete: [Feature Name]

**Tasks:** N/M completed
**Files:** N created, N modified
**Build:** passing / failing (details)
**Verification:** N issues found and fixed / clean
**Quality:** N extractions / clean

Test the feature. If issues, use `/imma31-review`.
```

---

## Error Recovery (Autonomous)

**Agent failure:**
1. Record failure in tracker with error details
2. **Auto-retry once** with the same task — agents sometimes fail on transient issues
3. If retry fails: mark task as `Failed`, automatically mark dependent tasks as `Blocked`
4. **Continue with remaining non-blocked tasks** — don't stop the whole run
5. Report all failures in the final summary

Only escalate to user if **>50% of tasks in a group fail** — that suggests a systemic problem:
```
Multiple failures in Group N (3/4 tasks failed). Common error: [pattern].
This looks systemic. Options:
A) Fix the root cause and re-run (recommended)
B) Skip this group and continue
C) Abort
```

**Build check failure:**
1. Read the specific errors
2. If errors are small/obvious (missing import, typo, unused variable): **fix directly and re-run**
3. If errors are large/ambiguous (architectural mismatch, missing dependency): note in report and continue to next group
4. Only ask user if build failure blocks ALL remaining tasks

**File conflict:**
1. Read both versions
2. Merge changes automatically
3. Re-run build check
4. If merge is ambiguous (both agents changed the same lines), pick the version from the higher-numbered task (later in dependency order) and note it in the report

---

## Key Principles

- **NEVER commit to git** — the user manages their own git workflow
- **Detect, don't assume** — discover stack and conventions from project files
- **CLAUDE.md is king** — pass conventions to every agent
- **Invoking execute IS confirmation** — don't ask "ready?" — just go
- **Auto-recover from failures** — retry once, fix obvious errors, continue with non-blocked tasks
- **Compact aggressively** — tracker is the persistent record, discard verbose output
- **Respect dependencies** — blocked tasks wait for blockers
- **Isolate agents** — each works within scope boundary
- **Honest reporting** — failures noted, not hidden
- **Max 3 parallel agents** — keep system load manageable
- **Only escalate systemic failures** — individual task failures are auto-handled

## Follow-up Commands

After execution:
- `/imma31-review` — review generated code, fix issues, capture learnings
- `/imma31-plan` — plan the next feature
