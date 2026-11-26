# HANDOFF: implement cutroom-v2

Paste this file into a new Claude Code session opened in `C:\Users\XZNON\cutroom-v2`.

## Objective

Build cutroom-v2 as designed in `docs/design.md`, through the issues in GitHub `KnowScroll/cutroom-v2` (milestones M0-M6, issues #1-#18), until the completion criteria below hold. Motto: **Lightweight. Fast. Simple.**

## Your role

You are the **orchestrator**. You pick issues, brief subagents, sequence and parallelize, review results, enforce the quality gates, merge, and keep the state. You delegate implementation, testing and detailed review. You do not write product code yourself beyond trivial integration fixes. You keep going from issue to issue without asking permission; you stop only for the escalations below. The user may be away for hours (overnight runs): never wait for an answer while any other issue is eligible.

## Read first, in this order

1. `AGENTS.md`: the rules every agent follows (standards, checks, failure handling, secrets, Git and GitHub, review).
2. `docs/design.md`: the architecture. §1 (decisions) is final; the rest is the contract the issues implement.
3. `docs/plan.md`: milestones, dependencies, parallel lanes, budget, definition of done.
4. `PROGRESS.md`: what is in flight, user items, spend, next action.
5. `gh issue list --repo KnowScroll/cutroom-v2 --state all --limit 50`, then `gh issue view <n>` for the issue you start.

Read when relevant, not up front:
- `C:\Users\XZNON\fastreel` (private, read-only): the import source for #2, the engine's behaviour (`README.md`, `asset_reel.mjs`, `engine/`). Never write there.
- `KnowScroll/cutroom-test-skill` (GitHub): `director.md` (#7 review prompt), `scripts/frame_audit.py` (#12 port). Clone it into the session scratchpad; never write to it.
- Do not use anything under `C:\Users\XZNON\Cutroom` or any `cutroom-v3.1` document.

Source of truth: design §1 > the rest of `docs/design.md` > the issue > `docs/plan.md`. The conversation that produced these docs is not needed and not available.

## Preflight (before the first issue, and after any interruption)

- On `main`: `git pull`; `git status` clean apart from PROGRESS.md (commit and push it). `gh auth status` shows the `repo` and `workflow` scopes.
- `node -v` >= 22.18, `ffmpeg -version`, Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- `.env` exists at the repo root and has the key **names** in PROGRESS.md (check names only; never print values). Missing: #1 can still run; stop before #2's real run and ask the user.
- Reconcile: compare PROGRESS.md "In flight" with `gh pr list`, `git worktree list` and open issues. The repository and GitHub are the truth; a claim in a doc or an agent report is not.

## The loop

1. **Pick** an eligible issue: open, every `Depends on` issue closed, no `blocked` or `needs-user` label, lowest milestone first, then lowest number. Start independent eligible issues in parallel (plan "Parallel lanes"), at most 3-4 implementers at once.
2. **Brief** an implementer (Agent tool, `model` from the issue's `Model:` line, `isolation: "worktree"`, `run_in_background: true` when running several). The brief: the issue number (it reads the issue itself), `AGENTS.md`, the design sections the issue cites, the files it owns, and these environment facts:
   - `CUTROOM_ENV_FILE=C:\Users\XZNON\cutroom-v2\.env` and `CUTROOM_VAR=C:\Users\XZNON\cutroom-v2\var` (worktrees have no `.env`; all real runs share one var folder, cache and engine lock; removing a worktree deletes everything inside it, so nothing real lives there);
   - real engine runs: `--out` absolute under `C:\Users\XZNON\cutroom-v2\var\runs\`, `CUTROOM_VOICE_MODELS=heygen,heygen-paid,minimax,gemini-tts,eleven-v4,eleven-v4-turbo,eleven-v3,kokoro` (before #8 lands, pass the first voice model that works with the current keys to `--voice-model`), one at a time; before #5 lands, ask you before starting one; log each cut in PROGRESS.md;
   - run `npm ci` in a new worktree; run `npm run check` before opening the PR;
   - open the PR with the AGENTS.md body and report the PR number, what was checked and what was not.
   Give each agent only the context its issue needs.
3. **CI**: wait for green (`gh pr checks <pr> --watch`). Red: send it back to the same implementer (SendMessage).
4. **Review**: a fresh Opus reviewer (no implementer conclusions in its brief): the PR number, the issue, the design sections. Blocking findings only. Fixes go back to the implementer; re-review only the changed parts.
5. **Verify** the issue's `Done when` yourself or with an Opus tester for real runs. Run the checks; do not trust "it passed".
6. **Merge**: `gh pr merge <pr> --squash --delete-branch`; the issue closes from `Closes #n`. Remove the worktree. `git pull` on `main` before briefing any issue that depends on this one.
7. **Record**: a handoff comment on the issue (commit, what was verified, anything not verified), and PROGRESS.md (in flight, real runs, next action), committed and pushed straight to `main` (the ruleset lets the admin through; nothing else goes to `main` without a PR). At a checkpoint (CP1-CP5, plan.md), run the end-to-end check it names and record it in the issue.
8. Back to 1.

## Models

- **Opus** (`model: "opus"`): planning, the review prompt (#7), the template store (#10), the fix loop (#11), the frame-audit port and its calibration (#12, #13), acceptance (#18), every code review, test design, real-run verification, root-cause analysis.
- **Sonnet** (`model: "sonnet"`): the other implementation, routine code, docs updates, straightforward fixes.
- The issue's `Model:` line is the default. Sonnet failing the same problem twice: give it to Opus with the evidence. Use only these two models; never substitute another silently.

## Context and recovery

- Keep your own context small: delegate file-heavy reading; read issue bodies and design sections, not whole files.
- Persist before you lose it: update PROGRESS.md whenever an agent starts or finishes and before compaction.
- After compaction or in a fresh session: reread this file, `PROGRESS.md`, the open issues and PRs, then run the preflight reconcile. Never treat an issue as done because an earlier report said so: check that its PR is merged and its `Done when` is verifiable on `main`.

## Escalate to the user (stop that line of work; keep other eligible issues going)

- A finalized decision (design §1) would have to change, or a replacement technology changes the architecture.
- A `needs-user` item: calibration approval (#13), WSL installs (#17), VM access, `.env` keys missing, D20 if the user objects.
- Real-run budget reached.

Not escalations (handle them and keep going): a voice provider refusing (the harness, or before #8 you, moves down the voice list, design §6.7); every voice refused for now (label that issue `blocked` with the refusals, note it in PROGRESS.md, continue other issues, retry it after the next merge); MiniMax quota waits (the engine waits by itself; work on issues that need no MiniMax meanwhile).
- The same failure twice after root-cause work (AGENTS.md "Failure handling") with no verified alternative.
Ask with the evidence, the options and your recommendation, in a few lines.

## Done

All 18 issues closed with their `Done when` verified; CI green on `main`; CP1-CP5 recorded in their issues; README covers CLI, API and deploy; PROGRESS.md says complete; the user has the #18 report (results per job, spend, known issues, what to do next).
