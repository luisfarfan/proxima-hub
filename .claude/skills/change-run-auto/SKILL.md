---
name: change-run-auto
description: Repeat /change-run's per-task procedure in a bounded loop, in one session, until an explicit stop condition (no ready task, a verification failure, a Human review gate, drift, or the per-pass cap). Reuses /change-run and `just`/`bd`; does not reimplement selection, verification, evidence, or closure. Explicit invocation only.
allowed-tools: Bash(mise:*), Bash(bd:*), Bash(openspec:*), Read, Edit, Write
disable-model-invocation: true
license: MIT
compatibility: Requires openspec and bd CLIs, mise, and the harness synchronizer. Requires /change-run.
---

# /change-run-auto

Thin orchestration that repeats the **per-task procedure of `/change-run`** in a **bounded
loop**, in one session, until an explicit stop condition. It does **not** reimplement
selection, claiming, verification, evidence, or closure — every iteration is a full
`/change-run` pass over `mise`/`bd`. See
[`policies/change-run-auto.md`](../../../../proxima-engineering/harness/docs/policies/change-run-auto.md)
for the governing policy and
[`openspec-beads-contract.md §14`](../../../../proxima-engineering/harness/docs/openspec-beads-contract.md)
for the contract this operationalizes.

Usage: `/change-run-auto <change-name> [max-tasks]`

`max-tasks` is the per-pass cap (default **3**, per policy). It bounds this invocation only
(Constitución §7 / política 05) — it is never unlimited.

Governing docs (read them; do not duplicate them here):
- `.claude/skills/change-run/SKILL.md` (the primitive this skill repeats, unchanged)
- `../proxima-engineering/harness/docs/policies/change-run-auto.md`
- `../proxima-engineering/harness/docs/policies/task-execution.md`
- `../proxima-engineering/harness/docs/completion-contract.md`
- `../proxima-engineering/harness/docs/openspec-beads-contract.md`

## Loop

1. Validate `<change-name>`. Set `done = 0`, `cap = max-tasks or 3`.
2. **Check the deterministic gate** before each iteration:
   `mise run beads-next <change>` to read `ready` and, if present, `task_id`, `bead_id`,
   and `human_review` for the next task — reachable with `just`/`bd` alone, no python
   needed by the caller.
3. **Stop now, without claiming anything, if any of these hold** (see "Stop conditions"
   below for the exact signal each one uses).
4. Otherwise, run **one full iteration of the `/change-run` procedure** for that task —
   the same 13 steps, unabridged: sync, select, claim atomically, load context, plan,
   implement in scope, run the task's verification + applicable global checks, compare to
   acceptance, record an evidence episode, close the Bead only with evidence, mark the
   OpenSpec checkbox.
5. Increment `done`. If a stop condition now holds (fresh drift, `done >= cap`, the next
   task is `ready: false` or `human_review: true`), stop. Otherwise go to step 2.

## Stop conditions (deterministic, not model judgment)

Each condition is read from a verifiable signal — never from the model's impression that
"this is probably enough":

| Condition | Signal |
|---|---|
| No ready task | `mise run beads-next <change>` reports `ready: false` |
| Verification failure | The task's verification (or an applicable global check) exits ≠ 0 |
| `Human review` gate | `mise run beads-next <change>` reports `human_review: true` for the next task — stop **before** claiming it |
| Drift | `mise run beads-verify <change>` reports any `DriftIssue` |
| Per-pass cap reached | `done >= cap` |

## On stop

- **Never** simulate success or continue as if the pass had finished when it has not.
- Report **which** condition stopped the loop, and how many tasks were completed this pass.
- State how to continue: re-invoke `/change-run-auto <change-name>` (or `/change-run
  <change-name>` for a single task) — the next invocation re-reads `next` naturally, no
  session state is required to resume.
- If the stop is `Human review`, the gated task stays unclaimed and `ready`; a human
  decides (approve and run `/change-run` on it, or review first).
- If the stop is a verification failure or drift, follow `/change-run`'s own "On failure"
  behavior for that task: do not close its Bead, do not mark its checkbox, leave it
  `in_progress`/blocked, report the failing commands.

## Per-task contract preserved intact

This skill changes **nothing** about what `/change-run` guarantees per task: atomic claim,
implementation strictly in scope, task verification + global checks, an evidence episode
per task (including the last one before a stop), closing a Bead only with sufficient
evidence, the per-task limits (max 3 implementation attempts, max 5 failed commands), and
no self-approval. The only thing this skill automates is relaunching `/change-run` between
tasks.

## Limits (per invocation)

- Per-pass cap on tasks processed (default 3, configurable via `max-tasks`).
- Every per-task limit from `/change-run` still applies inside each iteration.
- No self-approval at the task level or at the pass level: never report a pass "done" while
  a stop condition is unresolved.
