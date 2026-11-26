# PROGRESS

Resume state for the orchestrator. Task status is in GitHub issues; this file holds only what issues cannot: what is in flight right now, user items, real-run spend, and the next action. Update it when an issue closes, when an agent starts or stops, and before context compaction.

## State

2026-11-27: preparation done (docs, labels, milestones, issues #1-#18). Implementation started. #1 merged (PR #19, 3107663). #4 merged (PR #20, 8dbef11).

## Waiting on the user

- [x] `.env` at the repo root: `MINIMAX_API_KEY`, `OPENROUTER_API_KEY`, `CUTROOM_API_TOKEN` present (checked by name, 2026-11-27). No `ELEVENLABS_API_KEY`: eleven-v4 goes through OpenRouter.
- [ ] Voice credits (not blocking): OpenRouter has no credits yet and there is no `ELEVENLABS_API_KEY`. User ruling 2026-11-27: use the free `heygen` voice until the user adds credits; keys stay the same, so the fallback list picks the paid voices up by itself. Free models are rate-limited per day: if `heygen` is refused too, follow HANDOFF "Not escalations".
- [x] D20 confirmed by the user (2026-11-27): first cut plus up to 3 fix rounds.
- [ ] Later, not blocking: look at #13's calibration table (the orchestrator decides by design D23 and posts it).
- [x] #17: the user approved installing Node 22, FFmpeg and Chrome in WSL Ubuntu (2026-11-27).

## In flight

| issue | agent / model | branch or worktree | started | note |
|---|---|---|---|---|
| #2 | implementer / sonnet | claude/2-import (worktree) | 2026-11-27 | cleared for its 2 real runs (import-check) |
| #3 | implementer / sonnet | claude/3-config-minimax (worktree) | 2026-11-27 | PR #21 in review |
| #12 | implementer / opus | claude/12-frame-audit (worktree) | 2026-11-27 | parity on 3 fastreel reels |

## Real cuts (budget: 40 cuts with model calls, docs/plan.md)

| # | date | issue | purpose | voice | cost USD | run folder |
|---|---|---|---|---|---|---|

## Next action

Review + merge #2, #3, #4, #12 as they finish. Then #5, #6, #9, #10, #16 (after #2 and #3).
