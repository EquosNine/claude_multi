Generate a comprehensive, independently-executable task guide for implementing a feature in the equos_v3 project.

**Thinking mode:** Use ultrathink (extended thinking) for all task generation work. Deep reasoning is required to study sibling features, map dependencies, produce complete code outlines, and validate correctness — do not shortcut the reasoning.

Feature: $ARGUMENTS

---

## Phase 1: Orient

1. Detect the current submodule and tech stack from the working directory:

   | Submodule | Role | Stack |
   |-----------|------|-------|
   | `equos_server/` | Backend microservices | **Go + Gin** |
   | `equos_website/` | Marketing pages | **Astro + Svelte islands** |
   | `equos_subscriber_console/` | Subscriber portal SPA | **Svelte 5 + Vite + Tailwind** |
   | `equos_academy/` | LMS + docs SPA | **Svelte 5 + Vite** |
   | `3quos_admin_server_console/` | Internal admin SPA | **Svelte 5 + Vite + Tailwind** |
   | `equos_app/` | Main application | **Flutter (Dart) monorepo** |
   | `secure_doc_delivery/` | Doc sharing service | **Go backend + Svelte 5 frontend** |

2. Read that submodule's `CLAUDE.md` or `GUIDE.md` if it exists.
3. Read existing plans in `claude_detailed_plans/<submodule>/` to understand roadmap context.
4. Run `git log --oneline -5` for recent momentum.

---

## Phase 2: Deep Explore

5. **Find the target feature directory** — use Glob to find the feature path matching $ARGUMENTS. If the feature doesn't exist yet, identify the parent module.

6. **Study sibling features** — find the most architecturally similar feature already built in the same submodule. This is the TEMPLATE. Read its complete structure using the stack-appropriate checklist:

   ### Go (equos_server/)
   - Structs (fields, JSON tags, DB tags, validation tags)
   - Handlers (Gin handler funcs, request binding, response format)
   - Repositories (pgx queries, scan patterns, transaction usage)
   - Workers (Faktory job handlers, payload parsing, retry config)
   - Routes (router group registration, middleware chains)
   - Migrations (SQL files, up/down patterns)

   ### Astro (equos_website/)
   - Pages (`.astro` files, frontmatter data fetching, layout usage)
   - Layouts (slot patterns, SEO component usage, theme integration)
   - Astro components (server-rendered, no JS shipped)
   - Svelte islands (interactive components using `client:*` directives)
   - Data files (`src/data/*.ts` — static content, typed exports)
   - Strapi integration (client usage, type generation, dynamic routes)

   ### Svelte 5 (consoles + SPAs)
   - Pages/routes (`+page.svelte`, `+page.ts` load functions)
   - Components (props with `$props()`, events, slots)
   - Stores (`$state`, `$derived`, `$effect` runes — NOT legacy `writable`/`readable`)
   - Types (`types.ts` — TypeScript interfaces)
   - Services (HTTP fetch wrappers, Firebase client calls)
   - Layouts (`+layout.svelte`, shared chrome, sidebar patterns)
   - Tailwind usage (utility classes, `@apply` in component styles)

   ### Flutter (equos_app/)
   - Models (fields, `fromDoc()`, `toMap()`, `copyWith()`)
   - Services (Firestore CRUD, `FirestoreRefs`, dot-notation updates)
   - Providers (Riverpod: `StreamProvider.family`, `AsyncNotifierProvider`, `NotifierProvider`)
   - Screens (layout structure, GoRouter navigation)
   - Widgets (`ConsumerWidget`/`ConsumerStatefulWidget`, design tokens)
   - Shared packages (`equos_design/`, `data/`)

7. **Check for reference implementations** — search the codebase for any existing implementation of this feature or related features in other submodules. Read relevant files completely.

8. **Read shared infrastructure** — read files the new feature will depend on:

   | Stack | Key infrastructure to read |
   |-------|---------------------------|
   | Go | `config/`, `factory/`, `db.go`, `go.mod`, SQL migrations, Dockerfile |
   | Astro | `astro.config.mjs`, `src/lib/strapi.ts`, `src/layouts/`, `src/data/` |
   | Svelte 5 | `vite.config.ts`, `src/lib/`, `src/routes/+layout.svelte`, `tailwind.config.*` |
   | Flutter | `pubspec.yaml`, `lib/src/common/`, `lib/src/router/`, `firestore_refs.dart` |

9. **Identify dependencies** — list packages/modules already available that apply.

---

## Phase 3: Clarify

10. Before generating any task files, identify ambiguities in $ARGUMENTS. Ask the user ALL questions in a single message:
    - Scope: MVP or full-featured?
    - Data model fields unclear?
    - UI requirements unclear?
    - Integration points with other features or submodules?
    - Any existing patterns to port vs. skip?

Do NOT proceed past this step until the user answers.

---

## Phase 4: Generate Task Files

11. **Create the output directory**: `claude_detailed_plans/<submodule>/<feature>/`

    Examples:
    - `claude_detailed_plans/equos_app/inventory/`
    - `claude_detailed_plans/equos_server/freight-tracking/`
    - `claude_detailed_plans/equos_academy/course-catalog/`
    - `claude_detailed_plans/equos_website/pricing-page/`

12. **Plan the task breakdown** using the stack-appropriate ordering:

    ### Go
    1. Structs/models → Migrations → Repositories → Services/workers → Handlers → Routes → Config/wiring

    ### Astro
    1. Types/data → Strapi client/types → Layouts → Pages (static first) → Interactive islands → SEO/feeds → Build/deploy config

    ### Svelte 5
    1. Types → Stores/state → Services → Layout → Pages → Components → Route wiring

    ### Flutter
    1. Models → Firestore refs → Services → Providers → Widgets → Screens → Routes & wiring

13. **Generate numbered task files** — create one `TASK-XX_<name>.md` for each independently executable unit. Every task file MUST contain:

    ```markdown
    # Task XX: <Title>

    **Status:** Not started
    **Depends on:** <list task numbers or "Nothing">
    **Submodule:** <submodule name>
    **Stack:** <Go | Astro | Svelte 5 | Flutter>
    **Creates:** <N> new files  OR  **Modifies:** <N> existing files

    ## Goal
    <one paragraph — what this task accomplishes>

    ## Files to Create/Modify
    ### 1. `<relative/path/to/file>`
    <description of what this file contains>
    <complete code outline or full implementation>

    ## Key Patterns to Follow
    <bullet list of patterns from the template sibling feature>

    ## Verification
    <stack-appropriate check command: go vet | npm run check | flutter analyze>
    ```

    **Critical rules for task files:**
    - Each task must compile/build independently after its dependencies are done
    - Include ALL imports each file needs
    - Show FULL data-layer code (not pseudocode) — agents need exact patterns
    - For UI, show the structural outline with key component tree, state fields, and all action handlers
    - Reference the template sibling feature file by path for each pattern used
    - Specify exact file paths relative to the submodule root
    - Use the correct verification command for the stack

14. **Generate the README.md** — the master guide that ties everything together:

    ```markdown
    # <Feature Name> — Implementation Guide

    ## Overview
    <what is being built and why>

    ## Submodule & Stack
    <which submodule, which tech stack>

    ## Architecture
    <directory tree of all files to be created>

    ## Task Execution Order
    <ASCII dependency graph showing which tasks can run in parallel>

    ## Task Summary
    <table: # | Task | Creates/Modifies | Depends On>

    ## Key Patterns
    <patterns from the template feature that MUST be followed>

    ## Reference Files
    <table: Pattern | Reference File path>

    ## Dependencies
    <packages needed, which are already present vs need adding>
    ```

---

## Phase 5: Validate

15. Review every generated task file for completeness:
    - Does each task have clear dependencies?
    - Can each task be handed to an agent with no additional context?
    - Are all data paths (Firestore, DB, API, Strapi) specified?
    - Are all import/module paths correct for the submodule structure?
    - Do names avoid conflicts with existing code?
    - Are route paths unique and follow existing conventions?

16. Check for gaps:
    - Go: migration files? config env vars? Dockerfile updates? factory worker registration?
    - Astro: SEO meta? layout integration? Strapi content type setup?
    - Svelte 5: type exports? store initialization? layout slot wiring? Tailwind classes?
    - Flutter: Firestore rules? route registration in both `routes.dart` AND `router.dart`? provider barrel exports?

17. Present a summary to the user:
    - Total tasks, new files, modified files
    - Dependency graph
    - Which tasks can run in parallel
    - Ask if any tasks should be split further or merged

---

## Guidelines

- **Task granularity**: One task per architectural layer. Don't combine layers unless trivial (< 50 lines total).
- **Code completeness**: Data layer code should be COMPLETE. UI tasks can use structural outlines if >200 lines, but must show state fields, component tree, and all action handlers.
- **No guessing**: Every file path, import, name, and data path must be verified against the actual codebase. Use Glob/Grep to confirm.
- **Stack fidelity**: Follow the conventions of the submodule's stack exactly. Go code looks like Go. Svelte 5 uses runes, not legacy stores. Astro separates server components from islands. Flutter uses Riverpod, not raw setState.
- **Output location**: All task files go in `claude_detailed_plans/<submodule>/<feature>/` — NOT inside the submodule source tree.
