# AGENTS: Parallel Work Protocol

This file defines how the coding agent should split work into parallel subagents so tasks finish faster without file conflicts.

## Goal

- Break assignments into `X` independent parts when possible.
- Run those parts concurrently.
- Merge safely with deterministic file ownership and a final integration pass.
- Default to `X = 3` unless there is a strong reason to use a different split.

## When To Parallelize

Parallelize when a task has 2+ independent streams, for example:

- UI component changes in different files
- API/data layer updates in separate modules
- Docs/checklist updates separate from code changes
- Test additions separate from feature implementation

Do not parallelize tightly coupled edits in the same small file unless one agent is designated as integrator for that file.

## Core Rules

1. **Single-writer per file**: only one subagent owns a file at a time.
2. **Shared-file lock list**: define contested files up front (for example `src/app/page.tsx`) and assign a single owner.
3. **No overlapping edits**: if two workstreams need the same file, split by sequence, not by concurrency.
4. **Integrator required**: one agent (or main agent) merges all outputs and resolves conflicts.
5. **Verify once at end**: run lint/build/tests after merge.

## Standard Parallel Workflow (X Parts)

1. **Plan**
   - Decompose task into `X` workstreams.
   - Create a file ownership table.
   - Mark shared files and assign owner.

2. **Dispatch Subagents**
   - Launch `X` subagents concurrently.
   - Each subagent receives:
     - exact objective
     - owned file list
     - forbidden files
     - required validation command(s)

3. **Collect Outputs**
   - Each subagent returns:
     - changed files
     - summary of edits
     - validation results
     - risks/open items

4. **Integrate**
   - Integrator applies changes in deterministic order:
     1) schema/types
     2) data/API
     3) UI
     4) docs
   - Resolve any collisions manually.

5. **Validate + Ship**
   - Run `pnpm lint` then `pnpm build`.
   - Smoke-check critical routes.
   - Push/deploy only after integration checks pass.

## Conflict Handling

If overlap is unavoidable:

- Keep one **primary owner** for the file.
- Other subagents submit patch intent (not direct edits) for that file.
- Primary owner/integrator applies those intents in one final edit.

## Suggested Concurrency Levels

- Default task split: `X = 3`
- Small task: `X = 2-3`
- Medium task: `X = 3-4`
- Large task: `X = 5-6` (only with clean file boundaries)

Prefer fewer agents with clean boundaries over many agents with merge churn.

## Example Assignment Split

- **Agent A**: Globe rendering (`src/components/Globe.tsx`)
- **Agent B**: Panels/UI (`src/components/EventListPanel.tsx`, `src/components/EventDetailView.tsx`)
- **Agent C**: Auth/API (`src/lib/auth.ts`, `src/app/api/events/route.ts`)
- **Integrator**: shared shell + docs (`src/app/page.tsx`, `README.md`, `CLAUDE.md`)

## Implementation Note

GitHub helps with history and review, but conflict prevention should happen before edits via file ownership. Use GitHub as the audit trail, not as the primary conflict-resolution strategy.
