---
name: change-run
description: Execute exactly one ready task of an OpenSpec change, verify it, and only then close its Bead and mark the checkbox. One task per invocation. Explicit invocation only.
allowed-tools: Bash(mise:*), Bash(bd:*), Bash(openspec:*), Read, Edit, Write
disable-model-invocation: true
license: MIT
compatibility: Requires openspec and bd CLIs, mise, and the harness synchronizer.
---

# /change-run

Thin orchestration that executes **one** task of a change and records evidence. All critical
logic (sync, selection, drift, progress) lives in `scripts/harness/openspec_beads_sync/` and
is reached through `mise`. **Processes a single task per invocation. No `--all`.**

Usage: `/change-run <change-name>`

Governing docs (read them; do not duplicate them here):
- `../proxima-engineering/harness/docs/policies/task-execution.md`
- `../proxima-engineering/harness/docs/completion-contract.md`
- `../proxima-engineering/harness/docs/openspec-beads-contract.md`

## Steps

1. Validate `<change-name>`.
2. Read the current OpenSpec artifacts for the change.
3. Sync: `mise run beads-sync <change>`.
4. Select one ready task: `mise run beads-next <change>`. If none, stop.
5. Show the selected task; claim it atomically in Beads (`bd ready --claim`).
6. Load only the needed context: the task, its acceptance criteria, relevant design/specs,
   and the related files.
7. Write a brief implementation plan; implement strictly within scope.
8. Run the task's `Verification` command and the applicable global checks
   (`mise run verify`, `mise run test`).
9. Compare the result against the acceptance criteria.
10. Record an evidence episode under `../proxima-engineering/harness/docs/episodes/<timestamp>-<change>-<task-id>/`
    (events, decisions, commands, check results — no private model reasoning).
11. Close the Bead **only if**: implementation complete, verification passes, applicable
    checks pass, no blocking drift, and (if `Human review: true`) a human approved.
12. Reflect progress: `mise run beads-progress <change>` (marks the checkbox).
13. Show the result and **stop**.

## Limits (per invocation)

- Max 3 implementation attempts, max 5 failed commands, max 1 task, timeouts on external ops.
- No self-approval: never close a task just because implementation "seems" done.

## On failure

Do not close the Bead, do not mark the checkbox. Leave the task `in_progress`/blocked, record
the failure and the commands run, stop, and state what needs fixing. Do not loop.
