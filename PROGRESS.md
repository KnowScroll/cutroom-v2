# PROGRESS

Resume state for the orchestrator. Task status is in GitHub issues; this file holds only what issues cannot: what is in flight right now, user items, real-run spend, and the next action. Update it when an issue closes, when an agent starts or stops, and before context compaction.

## State

2026-11-27: preparation done (docs, labels, milestones, issues #1-#18). Implementation started. #1 merged (PR #19, 3107663). #4 merged (PR #20, 8dbef11). #3 merged (PR #21, 482a73b). #2 merged (PR #22, e0cbf2c). #12 merged (PR #23, fbdb64a). Session interrupted once (2026-11-27); #5, #6, #9, #10 resumed from their worktrees.

## Waiting on the user

- [x] `.env` at the repo root: `MINIMAX_API_KEY`, `OPENROUTER_API_KEY`, `CUTROOM_API_TOKEN` present (checked by name, 2026-11-27). No `ELEVENLABS_API_KEY`: eleven-v4 goes through OpenRouter.
- [ ] Voice credits (not blocking): OpenRouter has no credits yet and there is no `ELEVENLABS_API_KEY`. User ruling 2026-11-27: use the free `heygen` voice until the user adds credits; keys stay the same, so the fallback list picks the paid voices up by itself. Free models are rate-limited per day: if `heygen` is refused too, follow HANDOFF "Not escalations".
- [x] D20 confirmed by the user (2026-11-27): first cut plus up to 3 fix rounds.
- [ ] Later, not blocking: look at #13's calibration table (the orchestrator decides by design D23 and posts it).
- [x] #17: the user approved installing Node 22, FFmpeg and Chrome in WSL Ubuntu (2026-11-27).

## In flight

| issue | agent / model | branch or worktree | started | note |
|---|---|---|---|---|
| #5 | implementer / sonnet | claude/5-engine-runner (worktree) | 2026-11-27 | parse import-check read-only |
| #6 | implementer / sonnet | claude/6-intake (worktree) | 2026-11-27 | 3 real intake calls |
| #9 | implementer / sonnet | claude/9-engine-cut-notes (worktree) | 2026-11-27 | cleared for its real runs on var/runs/e2-check, e2-rounds |
| #10 | implementer / opus | claude/10-template-store (worktree) | 2026-11-27 | |

## Real cuts (budget: 40 cuts with model calls, docs/plan.md)

| # | date | issue | purpose | voice | cost USD | run folder |
|---|---|---|---|---|---|---|
| 1 | 2026-11-27 | #2 | `--until script` import check | none | 0.0289 | var/runs/import-check |
| 2 | 2026-11-27 | #2 | full reel `--rounds 0` (resumed from script) | heygen (4.66 st) | 0.0537 (folder total 0.0826) | var/runs/import-check |
| 3 | 2026-11-27 | #9 | `--apply-notes notes-2.json --cut 2` | heygen (4.72 st) | 0.0153 | var/runs/e2-check |

## Next action

Review + merge #5, #6, #9, #10 as they finish. Then #7 (after #5), #16, #8 (after #5-#7).
