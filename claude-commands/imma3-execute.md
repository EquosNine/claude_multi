---
name: imma3-execute
description: Execute implementation tasks from claude_detailed_plans/ using parallel agents. Scans for TASK files, builds a dependency graph, dispatches agents to implement code, verifies and refactors outputs, and generates execution reports. Use whenever the user wants to execute planned tasks, implement features, run the next batch of work, or says "execute", "implement", "build it", or "run the tasks". Works with any tech stack.
---

# imma3-execute

**Announce:** "Using imma3-execute to implement tasks from claude_detailed_plans/."

## Key Terms

- **Scope**: Top-level grouping directory under `claude_detailed_plans/`. Derived from the task file's `Scope` field or directory structure. Legacy `Submodule:` or `Module:` fields are equivalent.
- **Task file**: A `TASK-XX_<name>.md` file containing one independently-executable unit of work.
- **complete/**: Archive directory at `claude_detailed_plans/complete/`. Excluded from discovery scans.
- **Build/check command**: The verification command(s) from `CLAUDE.md`. If multiple are listed, run all in order.

---

## Phase 1: Discover and Prepare

### Detect the Stack

1. **Read the project's CLAUDE.md** (and any submodule-level CLAUDE.md) for architecture, conventions, and build commands.
2. **Detect the stack** by scanning for config files (`go.mod`, `package.json`, `pubspec.yaml`, `Cargo.toml`, `pyproject.toml`, etc.).
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

Recursively scan `claude_detailed_plans/` (excluding `complete/`) for all `TASK-*.md` files. Read each and filter to Status: `Not started` or `In Progress`.

- **`Not started`** tasks: execute normally
- **`In Progress`** tasks: treat as not started (re-execute from scratch — partial work may exist, agents will read current state before writing)

For each, extract:
- **Scope** (top-level directory under claude_detailed_plans/)
- **Feature** (second-level directory)
- **Task number and name** (from filename)
- **Stack** (from the Stack field, or infer from scope)
- **Status** (from the Status field)
- **Dependencies** (from the Depends on field)
- **Affected files** (file paths mentioned)

If none found: "No pending tasks. Use `/imma3-plan` to create task plans first."

### Read Learnings

Read `claude_detailed_plans/learnings/` if it exists. Filter entries:
- Include entries whose scope matches the target scope(s)
- Include entries scoped to `general` or `cross-cutting`
- Exclude entries for unrelated scopes

These feed into the `KNOWN GOTCHAS` placeholder in the Executor template.

---

## Phase 2: Build Execution Plan

### Create the Tracker

Write a tracker to `claude_detailed_plans/<scope>/<feature>/EXECUTION_TRACKER.md`:

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
<consolidated list — used by Verifier and Refactorer>

## Build Check Results
<output of build/check command after each group>

## Lessons (for learnings)
<evidence from agent deviations, errors, and surprises>
```

### Parse Dependencies and Group

- Parse the `Depends on` field of each task
- Group into parallel batches: tasks whose dependencies are all satisfied can run together
- A task is "satisfied" when its dependencies are `Complete` or `Nothing`

### Present and Confirm

Show the user:
- All pending tasks organized by scope/feature
- Dependency graph and parallel groups
- Build/check command

Ask: **"Ready to execute? I'll dispatch N agents for Group 1."**

**Do NOT proceed without user confirmation.**

---

## Phase 3: Execute

### Read Agent Templates

Read `agents.md` in this skill's directory for the Executor, Verifier, and Refactorer prompt templates. Fill the placeholders before dispatching.

### Check for Previous Work

If execution reports exist in `claude_detailed_plans/<scope>/results/`, dispatch a **Verifier** agent to confirm previous work is solid before building on top.

### Dispatch Agents

For each parallel group, dispatch all agents in the group simultaneously:

```
Agent(
  subagent_type: "general-purpose",
  description: "<scope>/<feature> TASK-XX",
  prompt: "<Executor template from agents.md, with placeholders filled>"
)
```

**Fill these placeholders in the Executor template:**
- `{{CLAUDE_MD}}` → contents of the project's CLAUDE.md
- `{{KNOWN_GOTCHAS}}` → filtered lessons from learnings, or `"None"`
- `{{TASK_CONTENTS}}` → full text of the assigned task file
- `{{SCOPE_PATH}}` → the scope directory path
- `{{BUILD_COMMAND}}` → the build/check command

**Dispatch rules:**
- **Max 3 agents at a time**
- Agents from different scopes/features can always run in parallel
- Agents within the same feature can run in parallel ONLY if they touch different files
- Sequential dependencies must run in order

### Compact After Each Task

**Critical for long executions.** After EACH agent returns:

1. **Extract key facts**: status, files changed, one-sentence summary, errors/deviations
2. **Write to EXECUTION_TRACKER.md immediately** — do not batch tracker writes
3. If the agent reported errors, deviations, or unexpected fixes — note them in the tracker's **Lessons** section. This preserves evidence before verbose output is discarded.
4. **Discard the full agent output** from working memory. The tracker is the persistent record.
5. **Re-read files** that subsequent tasks will modify (ensures fresh state)

```
task completes → extract key facts → write to tracker → discard verbose output
```

After a full group completes:
```
all tasks compacted → check file conflicts → run build check → re-read files for next group → dispatch next group
```

### After Each Group

1. Check for file conflicts (multiple agents editing the same file)
2. If conflicts exist, read both versions and merge manually
3. Run the build/check command from CLAUDE.md
4. Update task file statuses to `Complete` or `Failed`
5. Print: **"Group N complete (N agents, N files changed). Moving to Group N+1."**

---

## Phase 4: Verify

Dispatch a verification agent using the **Verifier** template from `agents.md`:
- Fill `{{FILE_LIST}}` with the "Files Changed" list from the tracker
- Fill `{{BUILD_COMMAND}}` with the build/check command
- Fill `{{CLAUDE_MD}}` with project conventions
- Fill `{{TASK_CONTEXT}}` with the feature's README.md (Task Summary + Key Patterns sections) so the verifier understands what was intended

---

## Phase 5: Refactor

Dispatch a quality pass agent using the **Refactorer** template from `agents.md`:
- Same placeholder fills as Verifier (including task context)

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
**Files created:** ...
**Files modified:** ...
**Deviations:** ...

## Verification Results
<output from verifier agent>

## Quality Check Results
<output from refactorer agent>

## Build Check
<final build/check output>

## Remaining Work
<any tasks not completed>

## Next Steps
<recommendations>
```

---

## Phase 7: Update State and Hand Off

After execution:
- Update EXECUTION_TRACKER.md with final statuses
- Mark completed tasks in original TASK files (update Status field)
- **Update MASTER_GUIDE.md** — move the feature status forward

Tell the user:
- Summary of what was built (tasks completed, files changed)
- Build/check status
- "Test the feature manually. When you find issues, use `/imma3-review` to fix them and capture learnings."

**Do NOT archive plans yet** — the feature isn't done until the user has tested and confirmed.

---

## Error Recovery

**Agent failure** (crashes or returns with errors preventing task completion):
1. Record failure in the tracker with error details
2. Mark the task as `Failed`
3. Ask user: **retry** (re-dispatch), **skip** (mark blocked dependents), or **abort** (stop execution, write partial report)
4. If skip: automatically mark all tasks that depend on the failed task as `Blocked`

**Build check failure:**
1. List the specific errors
2. Ask user: **fix now** (fix directly, re-run build check) or **note for later** (record in report, continue)

**File conflict** (two agents edited the same file):
1. Read both versions
2. Merge the changes manually
3. Re-run build check before continuing

---

## Key Principles

- **NEVER commit to git** — the user manages their own git workflow
- **Detect, don't assume** — discover the stack and conventions from project files
- **CLAUDE.md is king** — the project's CLAUDE.md defines conventions; pass them to agents
- **User confirms before execution** — always show the plan first
- **Compact aggressively** — write to tracker after each agent, do not carry verbose output forward
- **Respect dependencies** — blocked tasks wait for their blockers
- **Isolate agents** — each agent works within its scope boundary
- **Honest reporting** — partial completions and failures are noted, not hidden
- **Read before writing** — agents must read current file state before modifying
- **Follow existing patterns** — agents match code style of surrounding files exactly
- **Max 3 parallel agents** — keep system load manageable
- **Central plans directory** — all plans and results live in `claude_detailed_plans/`

## Follow-up Commands

After execution:
- `/imma3-review` — review generated code, fix issues, capture learnings
- `/imma3-plan` — plan the next feature
