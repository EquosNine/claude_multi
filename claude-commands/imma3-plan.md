---
name: imma3-plan
description: Plan features and generate implementation tasks for any project. Auto-detects tech stack from config files and CLAUDE.md. Creates PLAN.md with phased roadmaps, gets user approval, then generates independently-executable TASK files in claude_detailed_plans/. Maintains MASTER_GUIDE.md. Use whenever the user mentions planning a feature, creating tasks, breaking down work, designing implementation, or brainstorming what to build next.
---

# imma3-plan

**Announce:** "Using imma3-plan to design and break down this feature."

**Thinking mode:** Use ultrathink (extended thinking) for all planning work. Deep analysis of architecture, dependencies, and cross-scope impacts is essential.

## Key Terms

- **Scope**: Top-level grouping directory under `claude_detailed_plans/`. For monorepos, this is the submodule name (e.g., `equos_app`). For single-module projects, use the project name or a descriptive grouping.
- **Feature**: The specific feature directory under scope (e.g., `notifications`, `pdf-generator`).
- **Task file**: A `TASK-XX_<name>.md` file containing one independently-executable unit of work.
- **complete/**: Archive directory at `claude_detailed_plans/complete/` — holds finished plans. Excluded from discovery scans.
- **Build/check command**: The verification command from `CLAUDE.md`. If multiple are listed, run all in order.
- **Template feature**: The most architecturally similar existing feature in the codebase — used as a pattern reference.

## Prerequisites

**Required:** A `CLAUDE.md` at the project root (or submodule root) describing:
- Tech stack and language
- Coding conventions and patterns
- Build/check/lint command(s)

**If `CLAUDE.md` is missing:** Stop and tell the user: "This project needs a `CLAUDE.md` before imma3-plan can run. It should describe your tech stack, coding conventions, and build/check command. Create one and re-invoke."

**Created automatically if missing:**
- `claude_detailed_plans/` directory

---

## Phase 1: Orient

### Detect the Project and Stack

Do not assume a tech stack — discover it:

1. **Read the project's CLAUDE.md** (and any submodule-level CLAUDE.md files). This is the primary source of truth for architecture, conventions, and data flow.

2. **Detect the stack** by scanning for config files in the working directory and parent directories:

   | File | Stack Signal |
   |------|-------------|
   | `go.mod` | Go |
   | `pubspec.yaml` | Flutter/Dart |
   | `package.json` + `svelte.config.*` | SvelteKit / Svelte |
   | `package.json` + `astro.config.*` | Astro |
   | `package.json` + `next.config.*` | Next.js |
   | `package.json` + `nuxt.config.*` | Nuxt |
   | `Cargo.toml` | Rust |
   | `pyproject.toml` / `requirements.txt` | Python |
   | `pom.xml` / `build.gradle` | Java/Kotlin |
   | `*.csproj` / `*.sln` | .NET / C# |

   Read the config file to identify frameworks, build tools, and dependencies. If the project is a monorepo, identify which submodule you're working in.

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

### Record the Stack Profile

After detection, note:
- **Project name** and root path
- **Scope** (submodule name if monorepo, or project name)
- **Stack**: language + framework + key libraries
- **Build/check command**: what verifies the code compiles
- **Test command**: how to run tests (if discoverable)
- **Key conventions**: from CLAUDE.md or observed patterns

### Check Existing State

- Read `MASTER_GUIDE.md` at the project root if it exists
- Scan existing plans in `claude_detailed_plans/` (excluding `complete/`) — check if a plan for this feature already exists
- Read `claude_detailed_plans/learnings/` if it exists — filter entries matching the target scope. For each relevant entry:
  - Surface it in your Clarify message: "Past builds found: [lesson]. Does this affect our plan?"
  - Embed it as a warning in the relevant TASK file's "Key Patterns to Follow" section
- Run `git log --oneline -5` for recent momentum

### Handle Empty/New Codebases

If the target submodule has no source code yet (only config files), note this in the Stack Profile. The plan should start from scaffold tasks (project structure, initial routing, base layout) before feature tasks. Reference a sibling submodule with a similar stack as the template instead.

---

## Phase 2: Clarify

Based on what you learned in Orient, ask the user **only the questions that are genuinely ambiguous** — in a single message. Common questions include:

- What scope/submodule does this feature belong to? (if the project has multiple)
- What's the user-facing goal?
- MVP or full-featured?
- Dependencies on other features or modules?
- Priority level? (P0-critical, P1-high, P2-medium, P3-low)

If the user already provided enough context in their initial message, skip redundant questions. Only ask about genuine ambiguities.

**Do NOT proceed until the user answers.**

---

## Phase 3: Deep Explore

After the user answers, explore the codebase in depth:

- Find the target feature area
- Study the most architecturally similar existing feature as a **template** — read its complete structure:
  - File organization and naming
  - Data models / types
  - State management patterns
  - Routing / navigation approach
  - Service / API patterns
  - UI component structure
- Read shared infrastructure the new feature depends on
- Identify available packages/modules

---

## Phase 4: Design the Plan

Write `claude_detailed_plans/<scope>/<feature>/PLAN.md`:

```markdown
# [Feature Name] Development Plan

**Project:** <project name>
**Scope:** <scope name>
**Stack:** <detected stack>
**Build command:** <detected build/check command>
**Template feature:** <path to the sibling feature used as reference>
**Status:** Not Started
**Priority:** P0 | P1 | P2 | P3
**Last Updated:** YYYY-MM-DD

## Vision
[2-3 sentences: What does this feature do? Why does it matter?]

## Current State
[What exists now? What works? What's broken or missing?]
[If empty/new submodule, note scaffold work needed first]

## Roadmap

### Phase 1: [Name] (Target: YYYY-MM-DD)
- [ ] Task 1 - Brief description
- [ ] Task 2 - Brief description

### Phase 2: [Name] (Target: YYYY-MM-DD)
- [ ] Task 1 - Brief description

## Dependencies
- **Requires:** [Other features/modules this depends on]
- **Blocks:** [Features waiting on this]

## Technical Notes
[Architecture decisions, patterns to follow, gotchas]
[Reference the template feature and its patterns]

## Open Questions
- [ ] Question 1?
```

---

## Phase 5: Approve

This is a hard gate — do NOT skip it.

Present the plan using this exact format:

```
## Plan: [Feature Name]

**Stack:** [detected stack]
**Build:** [build/check command]
**Template:** [template feature path]
**Phases:** [N]
**Total tasks:** [estimated count]

Phase 1: [Name]
  - Task 1: ...
  - Task 2: ...

Phase 2: [Name]
  - Task 3: ...

Dependencies: [list]

**Approve this plan? (Y to proceed / N to amend)**
```

- If **Y** → proceed to Phase 6
- If **N** or amendments → update the plan, re-present, ask again
- If partial approval (e.g., "just Phase 1") → note the scope and proceed with only that scope

---

## Phase 6: Generate Task Files

### Plan the Task Breakdown

Study the template feature's architecture for the correct layer ordering. General principle: data/types first, then services/logic, then UI/routes, then wiring.

Common orderings (adapt to what you observe):

- **Backend (Go, Rust, Python, Java):** Models → Database/migrations → Repositories/services → Handlers/controllers → Routes → Config
- **Frontend SPA (Svelte, React, Vue):** Types → State/stores → Services → Layout → Pages → Components → Route wiring
- **Mobile (Flutter, React Native):** Models → Data services → State management → Widgets/components → Screens → Navigation
- **Static sites (Astro, Next SSG):** Types/data → CMS integration → Layouts → Pages → Interactive components → Build config

### Create Task Files

One `TASK-XX_<name>.md` per independently-executable unit in `claude_detailed_plans/<scope>/<feature>/`:

```markdown
# Task XX: <Title>

**Status:** Not started
**Depends on:** <task numbers or "Nothing">
**Scope:** <scope name>
**Stack:** <detected stack>
**Creates:** N new files  /  **Modifies:** N existing files

## Goal
<one paragraph — what this task accomplishes>

## Files to Create/Modify

### 1. `<relative/path/to/file>`
<description of what this file contains>
<complete code outline with all imports>

## Key Patterns to Follow
<bullet list referencing the template feature's patterns by file path>
<warnings from learnings if applicable>

## Verification
<the build/check command for this stack>
```

**Task file rules:**
- One task per architectural layer
- Data-layer code must be COMPLETE — not pseudocode
- UI tasks: structural outline with state fields, component tree, action handlers
- Every file path verified against the actual codebase via Glob/Grep
- Follow natural stack ordering (data types → data layer → logic → presentation → wiring)
- Each task must compile/build independently after its dependencies are done
- Include ALL imports each file needs
- Reference the template feature file by path for each pattern used
- **Status values:** `Not started`, `In Progress`, `Complete`, `Failed`, `Blocked`

### Create the README

Create a `README.md` in the same directory — the master guide for this feature:

```markdown
# <Feature Name> — Implementation Guide

## Overview
<what is being built and why>

## Project & Stack
<project, scope, detected tech stack>

## Architecture
<directory tree of all files to be created/modified>

## Task Execution Order
<ASCII dependency graph showing parallel opportunities>

## Task Summary
| # | Task | Creates/Modifies | Depends On |
|---|------|-----------------|------------|

## Key Patterns
<patterns from the template feature that MUST be followed>

## Reference Files
| Pattern | Reference File |
|---------|---------------|

## Dependencies
<packages needed — which are already present vs need adding>
```

---

## Phase 7: Update MASTER_GUIDE

After generating tasks, **always** update `MASTER_GUIDE.md` at the project root. Create it if it doesn't exist.

```markdown
# [Project Name] Development Master Guide

**Last Updated:** YYYY-MM-DD

## Project Overview
[Core value proposition in 2-3 sentences]

## Architecture
| Scope | Role | Stack |
|-------|------|-------|
[auto-populated from detected stacks]

## Current Sprint
**Focus:** [Current priority area]
**Target:** [Sprint end date]

| Scope | Feature | Status | Priority | Next Action |
|-------|---------|--------|----------|-------------|

## Roadmap

### Now (Active)
### Next (Upcoming)
### Later (Backlog)

## Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|

## Learnings
[Link to learnings files — critical for avoiding repeated mistakes]
```

**Aggressive updates** — update on every run:
- **Current Sprint table** — add/update the feature you just planned
- **Roadmap** — move items between Now/Next/Later as priorities shift
- **Decision Log** — record any architectural decisions made during planning
- **Last Updated** date

---

## Phase 8: Validate

Review all generated files:

1. Can each task be given to an agent with only `CLAUDE.md` as additional context?
2. Are all data paths, import paths, file paths correct?
3. Do names avoid conflicts with existing code?
4. Are route paths unique and follow existing conventions?
5. No gaps in the dependency chain?

Check for common gaps:
- Database migrations or schema changes?
- Config / environment variable updates?
- Route registration or navigation wiring?
- Type exports or barrel file updates?
- Build config changes?

Present a summary:
- Total tasks, new files, modified files
- Dependency graph and parallel groups
- Ask if any tasks should be split or merged

---

## Key Principles

- **NEVER commit to git** — the user manages their own git workflow
- **Detect, don't assume** — always discover the stack from project files
- **CLAUDE.md is king** — the project's CLAUDE.md defines conventions; follow them
- **Read before writing** — understand existing code before planning new code
- **Follow existing patterns** — use the template feature as the source of truth
- **Approval gate** — never generate tasks without user sign-off on the plan
- **Actionable tasks** — each task completable in one session (1-4 hours max)
- **Central storage** — all plans live in `claude_detailed_plans/`
- **No guessing** — verify every file path, import, and data path against the actual codebase
- **Learnings feed forward** — past mistakes inform better plans

## Follow-up Commands

After planning:
- `/imma3-execute` — execute tasks using parallel agents
- `/imma3-review` — review generated code and capture learnings
