# AGENTS.md

Rules for every agent working in this repo. Motto: **Lightweight. Fast. Simple.**

cutroom-v2 turns a request into a vertical reel: a TypeScript harness (intake, review, up to 3 fix rounds, best cut, report) drives the fastreel engine (JavaScript, `engine/`), as a CLI and an HTTP service. Architecture and decisions: `docs/design.md` (source of truth). Order and dependencies: `docs/plan.md`. Task status: GitHub issues.

## Start with the task

- Read your issue (`gh issue view <n>`), the design sections it cites, and the files it names. Do not load whole documents or the whole tree when a section will do.
- Finalized decisions (design §1) are not yours to change. Implementation details are. If the issue conflicts with the design, or the design cannot work, stop and report it to the orchestrator with evidence; do not route around it.
- Stay in scope: the issue's "What changes". Note anything else you find in your report; do not fix it.

## Engineering standards

- New code is strict TypeScript in `src/` and `test/`. Node >= 22.18 runs `.ts` directly (type stripping): erasable syntax only (no `enum`, `namespace`, parameter properties); import with the `.ts` extension. `tsc --noEmit` is the type check; there is no build step.
- No `any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, non-null `!` or `eslint-disable` without a one-line comment saying why it is safe.
- Validate every outside input at the edge (HTTP bodies, model JSON, engine output files) with zod; trust typed values inside.
- Dependencies: runtime `zod`, `puppeteer-core` (the engine's). Dev: `typescript`, `@types/node`, `eslint`, `typescript-eslint`, `prettier`. Prefer Node built-ins (`node:http`, `node:child_process`, `node:test`, `fetch`, `process.loadEnvFile`). A new dependency needs a reason in the PR body.
- No abstractions for futures nobody asked for: no plugin systems, no generic job frameworks, no wrappers around one call.
- Comments only where the code cannot say it (a measured threshold, a reason a check exists).
- `engine/` is imported JavaScript: change it only as design §4.2 and D24 allow (D24: the issue shows run evidence of the failure, the §4.1 contract and checkpoints stay, a test, a re-render or a real run verifies it), in its existing style, no refactors, no lint or type rules applied to it.
- `templates/` holds the originals. The harness never writes there. Developers (and issues that say so) edit them.

## Checks

```
npm run format:check    prettier
npm run lint            eslint, typescript-eslint strictTypeChecked
npm run typecheck       tsc --noEmit
npm test                node --test
npm run check           all four; must pass before a PR
```
Tests check behaviour (what the harness does with real files, processes and HTTP), not internals. Fakes only at the process and network edge (`test/fixtures/`). Never weaken a test, a check or a threshold to get green. Never say a check passed unless you ran it and saw it pass.

## Failure handling

- The same approach failing twice: stop. Find the root cause (docs, an isolated test, the evidence) and decide whether it is our code or the technology.
- An unsuitable technology is replaced with a verified alternative, its other uses in the repo are checked, and the decision is recorded (a dated line in design §1 if it changes a decision; otherwise in the issue).
- No speculative fixes, silent fallbacks, retries that hide errors or temporary patches.
- A replacement that changes the architecture is escalated, not done.

## Secrets and safety

- `.env` (repo root) holds the keys. Never print, log, copy or commit it or any key; load it with `process.loadEnvFile`. The repo is **public**.
- Never commit `var/`, reference `.mp4` files, run outputs or `node_modules`.
- Kill only a PID you started, or the engine pid the harness recorded in `var/engine.lock`; kill its whole tree (`taskkill /PID <pid> /T /F` on Windows, the process group on Linux), since the engine starts Chrome. Never `pkill`, `killall` or kill by pattern.
- Real engine runs cost money and quota: one at a time on the machine (`var/engine.lock`), `--out` absolute under `$CUTROOM_VAR/runs/`, `CUTROOM_VOICE_MODELS=heygen,heygen-paid,minimax,gemini-tts,eleven-v4,eleven-v4-turbo,eleven-v3,kokoro` unless the issue says otherwise (cheap first; the harness falls back down the list, design §6.7), and every cut is logged in PROGRESS.md.
- Never `npx` a bare package name (a public npm package called `cutroom` exists); use `npm exec --no-install` or `node src/cli.ts`.

## Git and GitHub

- One issue, one branch `claude/<issue>-<short-slug>` from the latest `origin/main`, one PR to `main`. Squash merge; the branch is deleted. The only direct push to `main`: the orchestrator committing PROGRESS.md.
- Commit subject: a plain-English outcome ("Add the template sync with conflict flags"). Commits end with the attribution lines the session gives you.
- PR body:
  ```
  Closes #<n>.
  ## What changed
  ## How it was checked     (commands run and what was seen)
  ## Review                 (who reviewed, blocking findings and their fixes)
  ## Not verified           (what this PR does not prove)
  ```
- Issue body headings: `Milestone`, `Model`, `Depends on`, `What changes`, `What does not change`, `Refs`, `Deliverables`, `Done when`, `Tests`.
- Labels: `blocked` (waiting on another issue or an outside fix), `needs-user` (waiting on a user decision). Status is open / closed plus these labels; no status labels beyond them.
- Handoffs go in the issue as a comment: branch, commit, what was verified, the next action.

## Review

One fresh-context review per PR. Report blocking findings only (correctness, a broken decision, a missing acceptance criterion, a security problem); preferences are not findings. After fixes, re-review only what changed. No review rounds about reviews.

## Not part of the process

Ceremony: evidence manifests, hashes of logs, checkpoint essays, long prose in issues, PRs or docs. Short and checkable beats long and complete.
