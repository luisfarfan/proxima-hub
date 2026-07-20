---
name: change-review
description: Independent review of an OpenSpec change — the third role (reviewer), distinct from planner and implementer. Runs the mechanical checks (= /opsx:verify), delegates the 5-axis quality judgment to the code-reviewer, and records a registered verdict (APPROVED / CHANGES_REQUESTED) as a review episode. Never implements, closes Beads, or archives. Explicit invocation only.
allowed-tools: Bash(mise:*), Bash(bd:*), Bash(openspec:*), Bash(git:*), Read, Write
disable-model-invocation: true
license: MIT
compatibility: Requires openspec and bd CLIs, mise, and the harness synchronizer. Requires agent-skills:code-reviewer for the 5-axis judgment.
---

# /change-review

Thin orchestration for the **reviewer** role (Constitución §8 — "no agent approves its own
implementation"). It does **not** reimplement `/opsx:verify`'s mechanical checks or the
code-reviewer's 5-axis judgment — it composes both and records a registered verdict. See
[`policies/change-review.md`](../../../../proxima-engineering/harness/docs/policies/change-review.md) for the
governing policy this operationalizes.

Usage: `/change-review <change-name>`

Governing docs (read them; do not duplicate them here):
- `../proxima-engineering/harness/docs/policies/change-review.md`
- `../proxima-engineering/harness/docs/policies/04-openspec-changes.md`
- `../proxima-engineering/harness/docs/openspec-beads-contract.md`
- `../proxima-engineering/DECISIONS.md` §7, §8, §9, §10

## Steps

1. Validate `<change-name>`; load its OpenSpec artifacts (`proposal.md`, `design.md`,
   `specs/**`, `tasks.md`) and the real diff/content of what was implemented.
2. **Mechanical part** (= what `/opsx:verify` does): all tasks complete, requirements/
   scenarios covered, and the applicable checks/tests/drift green — `mise run verify`,
   `mise run test` (or `mise run test` for product changes), `openspec validate <change>
   --strict`, `mise run beads-verify <change>`. If any of this is red, the verdict cannot be
   `APPROVED` regardless of code quality — record `CHANGES_REQUESTED` with the failing
   commands as findings.
3. **Judgment** (5 axes): delegate to `agent-skills:code-reviewer` (or `/code-review`) over
   the change's diff — correctness, readability, architecture, security, performance — plus
   a check for coherence with the Constitution and the harness policies. Do not reimplement
   this judgment inline.
4. Declare exactly which files were reviewed (`reviewed_files`): the set of paths actually
   inspected for this verdict (implementation + tests + relevant docs/policies). This is a
   deliberate declaration, not an automatic inference — see `change-review.md` for why.
5. Emit a **verdict** — `APPROVED` or `CHANGES_REQUESTED` — with `findings[]` (empty only if
   `APPROVED` with no observations).
6. Record a **review episode** at
   `../proxima-engineering/harness/docs/episodes/<timestamp>-<change>-review/episode.json` with the fields
   `change`, `verdict`, `reviewer_actor` (a non-empty value distinct from `"implementer"`),
   `reviewed_files` (`{path: sha256_of_content}`), `reviewed_state_hash` (sha256 over the
   sorted JSON of `reviewed_files`), `findings`, `timestamp_utc`, `agent`. Format detail in
   `change-review.md`.
7. Report the verdict and, if `CHANGES_REQUESTED`, the findings the programmer needs to
   address. **Stop.**

## What this skill does NOT do

- Does not implement fixes for its own findings (`CHANGES_REQUESTED` → the programmer runs
  `/change-run(-auto)` to address them, then a new `/change-review` invocation re-reviews).
- Does not close Beads and does not mark OpenSpec checkboxes.
- Does not archive (`/opsx:archive`) — it only produces the evidence
  `mise run beads-review-gate <change>` requires before archiving can proceed.
- Does not reimplement `/opsx:verify`'s checks or the code-reviewer's 5-axis analysis inline;
  it runs/delegates to them and records the outcome.

## Bounded re-review loop (Constitución §7 / política 05)

`CHANGES_REQUESTED` → findings go to the programmer → fix via `/change-run(-auto)` → new
`/change-review` invocation (a new episode, a new verdict). **Max 3 rounds** by default,
matching the rest of the harness's bounded loops; whoever orchestrates the loop tracks the
round count (not persisted in code, same as `/change-run-auto`'s `cap`/`done`). At the limit
without `APPROVED`, do not simulate approval — escalate to a human decision.

## Gate this feeds

`mise run beads-review-gate <change>` (used by policy 04 before `/opsx:archive`) reads the most
recent review episode for `<change>` and requires: `verdict == APPROVED`, `reviewed_state_hash`
still matching the current content of the declared `reviewed_files` (not stale — nothing
changed since approval), and `reviewer_actor` distinct from `"implementer"`.

## Limits (per invocation)

- Exactly one change reviewed per invocation; one verdict, one episode.
- No self-approval: never record `APPROVED` because the mechanical part passed alone — the
  5-axis judgment step is mandatory even when checks are green.
- Never simulate a review that did not actually run the mechanical checks or the
  code-reviewer delegation.
