# PROGRESS

Resume state for the orchestrator. Task status is in GitHub issues; this file holds only what issues cannot: what is in flight right now, user items, real-run spend, and the next action. Update it when an issue closes, when an agent starts or stops, and before context compaction.

## State

2026-11-27: preparation done (docs, labels, milestones, issues #1-#18). Implementation started. #1 merged (PR #19, 3107663). #4 merged (PR #20, 8dbef11). #3 merged (PR #21, 482a73b). #2 merged (PR #22, e0cbf2c). #12 merged (PR #23, fbdb64a). #6 merged (PR #24, 392bb28). #9 merged (PR #26, 3713298). #10 merged (PR #27, ec301b7). #5 merged (PR #25, 8fd890c). #16 merged (PR #28, 4e5b00b). #7 merged (PR #29, adc2cb2). #8 merged (PR #30, 253126b): **CP1 done** (recorded in #8). #11 merged (PR #31, 51d9c19): **CP2 done** (recorded in #11). Session interrupted once (2026-11-27); #5, #6, #9, #10 resumed from their worktrees.

## Waiting on the user

- [x] `.env` at the repo root: `MINIMAX_API_KEY`, `OPENROUTER_API_KEY`, `CUTROOM_API_TOKEN` present (checked by name, 2026-11-27). No `ELEVENLABS_API_KEY`: eleven-v4 goes through OpenRouter.
- [ ] Voice credits (not blocking): OpenRouter has no credits yet and there is no `ELEVENLABS_API_KEY`. User ruling 2026-11-27: use the free `heygen` voice until the user adds credits; keys stay the same, so the fallback list picks the paid voices up by itself. Free models are rate-limited per day: if `heygen` is refused too, follow HANDOFF "Not escalations".
- [x] D20 confirmed by the user (2026-11-27): first cut plus up to 3 fix rounds.
- [ ] Later, not blocking: look at #13's calibration table (the orchestrator decides by design D23 and posts it).
- [x] #17: the user approved installing Node 22, FFmpeg and Chrome in WSL Ubuntu (2026-11-27).

## In flight

| issue | agent / model | branch or worktree | started | note |
|---|---|---|---|---|
| #14 | implementer / sonnet | claude/14-queue (worktree) | 2026-11-27 | fakes only |
| #13 | implementer / opus | claude/13-frame-gates (worktree; rebase onto main now that #31 merged) | 2026-11-27 | calibration first; then 1 real job (CP3a) after rebase |

## Real cuts (budget: 40 cuts with model calls, docs/plan.md)

Free re-renders (no model calls) not counted: #16 radio-lp-e4 resume (fonts-radio-lp-e4); #9 `--cut 3` on e2-check, `--cut 4` (empty notes) on e2-fix; two #9 failed notes reads.

| # | date | issue | purpose | voice | cost USD | run folder |
|---|---|---|---|---|---|---|
| 1 | 2026-11-27 | #2 | `--until script` import check | none | 0.0289 | var/runs/import-check |
| 2 | 2026-11-27 | #2 | full reel `--rounds 0` (resumed from script) | heygen (4.66 st) | 0.0537 (folder total 0.0826) | var/runs/import-check |
| 3 | 2026-11-27 | #9 | `--apply-notes --cut 2`, attempt 1 (shot-5 note rejected by validator; kept as reel-v2-attempt1) | heygen (4.72 st) | 0.0153 | var/runs/e2-check |
| 4 | 2026-11-27 | #9 | `--apply-notes --cut 2` rerun from cut-1 checkpoints (shot-6 note) | heygen | 0.0088 | var/runs/e2-check |
| 5 | 2026-11-27 | #9 | `--rounds 1` through the shared function | heygen | 0.0409 | var/runs/e2-rounds |
| 6 | 2026-11-27 | #8 | CP1 `make` "lighthouse Fresnel lens" (breakdown-explainer, fit good) | heygen (4.07 st) | 0.2391 (engine 0.2313, harness 0.0078) | var/runs/20261126-225022-how-does-a-lighthouse-fresnel-lens-make |
| 7 | 2026-11-27 | #11 | CP2 job "heat pump" cut 1 (lowpoly-cutaway-explainer) | heygen | 0.1108 | var/runs/20261126-234053-how-does-a-heat-pump-pull-warmth-out-of |
| 8 | 2026-11-27 | #11 | CP2 cut 2, notes round 1 | heygen | 0.0494 | same |
| 9 | 2026-11-27 | #11 | CP2 cut 3, notes round 2 (selected) | heygen | 0.0411 | same |
| 10 | 2026-11-27 | #11 | CP2 cut 4, notes round 3 (job harness total 0.0313) | heygen (3.91 st FAIL) | 0.0523 | same |
| 11 | 2026-11-27 | #11 | template-round script: shots patch, rerun from plan.json (+ review 0.0064) | heygen | 0.1681 | var/runs/cp2-template |

## Next action

#13 (CP3a) and #14 in flight. Then #15 (CP3b), #17 (CP4), #18 (CP5).
