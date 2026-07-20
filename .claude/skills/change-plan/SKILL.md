---
name: change-plan
description: Plan an OpenSpec change and publish its tasks to Beads (dry-run + explicit confirmation + sync). Does not implement or close tasks. Explicit invocation only.
allowed-tools: Bash(mise:*), Bash(openspec:*), Read
disable-model-invocation: true
license: MIT
compatibility: Requires openspec and bd CLIs, mise, and the harness synchronizer.
---

# /change-plan

Thin orchestration over OpenSpec + the OpenSpec↔Beads synchronizer. **This skill never
implements tasks, never closes Beads, and never invokes `/change-run`.** All critical logic
lives in `scripts/harness/openspec_beads_sync/` and is reached only through `mise`.

Usage: `/change-plan <change-name> [description]`

Governing docs (read them; do not duplicate them here):
- `../proxima-engineering/harness/docs/openspec-beads-contract.md`
- `../proxima-engineering/harness/docs/policies/change-planning.md`
- `../proxima-engineering/harness/docs/task-format.md`
- `AGENTS.md`, `../proxima-engineering/DECISIONS.md`

## Steps

1. Validate `<change-name>` (kebab-case; the synchronizer also validates it).
2. Read `AGENTS.md`, the constitution and the relevant docs for context.
3. Inspect current repo state and existing `openspec/changes/<change>/`.
4. Create or continue the change with the OpenSpec flow (`/opsx:propose` or `/opsx:continue`),
   producing `proposal.md`, specs, `design.md`, `tasks.md`. Use the `change-with-execution`
   schema so `tasks.md` uses stable `Txxx` IDs and structured fields.
5. Validate the task format: `mise run verify`.
6. Preview the sync plan: `mise run beads-sync-dry <change>`.
7. Show the user: new tasks, updated tasks, dependencies, and any drift.
8. **Ask for explicit confirmation** before mutating Beads.
9. On confirmation: `mise run beads-sync <change>`.
10. Show the final report.

## Guardrails

- Do not implement any task. Do not close any Bead. Do not call `/change-run`.
- Never sync without a dry-run and explicit confirmation first.
- If the dry-run reports blocking drift, stop and surface it — no silent repairs.
