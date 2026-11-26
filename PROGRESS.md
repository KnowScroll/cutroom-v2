# PROGRESS

Resume state for the orchestrator. Task status is in GitHub issues; this file holds only what issues cannot: what is in flight right now, user items, real-run spend, and the next action. Update it when an issue closes, when an agent starts or stops, and before context compaction.

## State

2026-11-27: preparation done (docs, labels, milestones, issues #1-#18). Implementation started. #1 merged (PR #19, 3107663). #4 merged (PR #20, 8dbef11). #3 merged (PR #21, 482a73b). #2 merged (PR #22, e0cbf2c). #12 merged (PR #23, fbdb64a). #6 merged (PR #24, 392bb28). #9 merged (PR #26, 3713298). #10 merged (PR #27, ec301b7). Session interrupted once (2026-11-27); #5, #6, #9, #10 resumed from their worktrees.

## Waiting on the user

- [x] `.env` at the repo root: `MINIMAX_API_KEY`, `OPENROUTER_API_KEY`, `CUTROOM_API_TOKEN` present (checked by name, 2026-11-27). No `ELEVENLABS_API_KEY`: eleven-v4 goes through OpenRouter.
- [ ] Voice credits (not blocking): OpenRouter has no credits yet and there is no `ELEVENLABS_API_KEY`. User ruling 2026-11-27: use the free `heygen` voice until the user adds credits; keys stay the same, so the fallback list picks the paid voices up by itself. Free models are rate-limited per day: if `heygen` is refused too, follow HANDOFF "Not escalations".
- [x] D20 confirmed by the user (2026-11-27): first cut plus up to 3 fix rounds.
- [ ] Later, not blocking: look at #13's calibration table (the orchestrator decides by design D23 and posts it).
- [x] #17: the user approved installing Node 22, FFmpeg and Chrome in WSL Ubuntu (2026-11-27).

## In flight

| issue | agent / model | branch or worktree | started | note |
|---|---|---|---|---|
| #5 | implementer / sonnet | claude/5-engine-runner (worktree) | 2026-11-27 | PR #25: fixing 2 re-review findings (SIGTERM rerun, crash-gap lock) |
| #7 | implementer / opus | claude/7-review (worktree, based on #5 branch; rebase after #25 merges) | 2026-11-27 | one real review call on import-check |
| #16 | implementer / sonnet | claude/16-open-fonts (worktree) | 2026-11-27 | PR #28 in review; 1 free resume (0 calls) |

## Real cuts (budget: 40 cuts with model calls, docs/plan.md)

Free re-renders (no model calls) not counted: #9 `--cut 3` on e2-check, `--cut 4` (empty notes) on e2-fix; two #9 failed notes reads.

| # | date | issue | purpose | voice | cost USD | run folder |
|---|---|---|---|---|---|---|
| 1 | 2026-11-27 | #2 | `--until script` import check | none | 0.0289 | var/runs/import-check |
| 2 | 2026-11-27 | #2 | full reel `--rounds 0` (resumed from script) | heygen (4.66 st) | 0.0537 (folder total 0.0826) | var/runs/import-check |
| 3 | 2026-11-27 | #9 | `--apply-notes --cut 2`, attempt 1 (shot-5 note rejected by validator; kept as reel-v2-attempt1) | heygen (4.72 st) | 0.0153 | var/runs/e2-check |
| 4 | 2026-11-27 | #9 | `--apply-notes --cut 2` rerun from cut-1 checkpoints (shot-6 note) | heygen | 0.0088 | var/runs/e2-check |
| 5 | 2026-11-27 | #9 | `--rounds 1` through the shared function | heygen | 0.0409 | var/runs/e2-rounds |

## Next action

Review + merge #5, #16 as they finish; #7 after #5; #8 after #7; #11 after #8, #10. Then #7 (after #5), #16, #8 (after #5-#7).
