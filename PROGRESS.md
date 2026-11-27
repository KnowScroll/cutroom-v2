# PROGRESS

Resume state for the orchestrator. Task status is in GitHub issues; this file holds only what issues cannot: what is in flight right now, user items, real-run spend, and the next action. Update it when an issue closes, when an agent starts or stops, and before context compaction.

## State

2026-11-27: preparation done (docs, labels, milestones, issues #1-#18). Implementation started. #1 merged (PR #19, 3107663). #4 merged (PR #20, 8dbef11). #3 merged (PR #21, 482a73b). #2 merged (PR #22, e0cbf2c). #12 merged (PR #23, fbdb64a). #6 merged (PR #24, 392bb28). #9 merged (PR #26, 3713298). #10 merged (PR #27, ec301b7). #5 merged (PR #25, 8fd890c). #16 merged (PR #28, 4e5b00b). #7 merged (PR #29, adc2cb2). #8 merged (PR #30, 253126b): **CP1 done** (recorded in #8). #11 merged (PR #31, 51d9c19): **CP2 done** (recorded in #11). #13 merged (PR #32, 2a63883): **CP3a done** (recorded in #13). #14 merged (PR #33, 04f16eb). #15 merged (PR #34, 0185057): **CP3b done** (recorded in #15). #17 merged (PR #35, 5445b0e): **CP4 done** (recorded in #17). #36 (found by #18) merged (PR #37, 6e99c7f). #38 (found by #18) merged (PR #39, bde64c0). #18 closed: **CP5 done** (recorded in #18, issuecomment-7212554073). After the plan, at the user's request: #40 usage guide `docs/usage.md` merged (PR #41, 661a59c).

**Complete (2026-11-27).** All issues closed (#1-#18, #36, #38), CI green on main (bde64c0), `npm run check` green in WSL (140 tests, 138 pass, 2 skipped), CP1-CP5 recorded, README covers the CLI, the API and Linux, the user has the #18 report. Session interrupted once (2026-11-27); #5, #6, #9, #10 resumed from their worktrees.

## Waiting on the user

- [x] `.env` at the repo root: `MINIMAX_API_KEY`, `OPENROUTER_API_KEY`, `CUTROOM_API_TOKEN` present (checked by name, 2026-11-27). No `ELEVENLABS_API_KEY`: eleven-v4 goes through OpenRouter.
- [ ] Voice credits (not blocking): OpenRouter has no credits yet and there is no `ELEVENLABS_API_KEY`. User ruling 2026-11-27: use the free `heygen` voice until the user adds credits; keys stay the same, so the fallback list picks the paid voices up by itself. Free models are rate-limited per day: if `heygen` is refused too, follow HANDOFF "Not escalations".
- [x] D20 confirmed by the user (2026-11-27): first cut plus up to 3 fix rounds.
- [ ] Later, not blocking: look at #13's calibration table (posted: https://github.com/KnowScroll/cutroom-v2/issues/13#issuecomment-7206270682).
- [x] #17: the user approved installing Node 22, FFmpeg and Chrome in WSL Ubuntu (2026-11-27).

- [x] Budget: 39 of 40 cuts used after #18 jobs 1-4 (16 cuts, $1.732). User ruling 2026-11-27: raise the cap to 44 and run job 5.

## In flight

Nothing.

## Real cuts (budget: 44 cuts with model calls; docs/plan.md said 40, user raised it to 44 on 2026-11-27 for #18 job 5)

Voice refusals not counted as cuts (#18): 4 eleven-v4 HTTP 402 invocations; their pre-voice spend is in the next cut's cost. Free re-renders (no model calls) not counted: #16 radio-lp-e4 resume (fonts-radio-lp-e4); #9 `--cut 3` on e2-check, `--cut 4` (empty notes) on e2-fix; two #9 failed notes reads.

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
| 12 | 2026-11-27 | #13 | CP3a job "walk to the moon" cut 1 (kurzgesagt, --template) | heygen | 0.143 | var/runs/20261127-002302-how-long-would-it-take-to-walk-to-the-mo |
| 13 | 2026-11-27 | #13 | CP3a cut 2, notes round (selected) | heygen | 0.044 | same |
| 14 | 2026-11-27 | #13 | CP3a cut 3, template round (patched var/templates/kurzgesagt.md, history 1) | heygen | 0.106 | same |
| 15 | 2026-11-27 | #13 | CP3a cut 4, notes round (job harness total ~0.03) | heygen | 0.031 | same |
| 16 | 2026-11-27 | #15 | CP3b API job "Venus day vs year" cut 1 (service killed in cut 1, restarted, resumed; incl. killed invocation) | heygen | 0.1258 | var/runs/20261127-013542-why-a-day-on-venus-is-longer-than-its-ye |
| 17 | 2026-11-27 | #15 | CP3b cut 2, notes round | heygen | 0.0517 | same |
| 18 | 2026-11-27 | #15 | CP3b cut 3, notes round | heygen | 0.0548 | same |
| 19 | 2026-11-27 | #15 | CP3b cut 4 (selected; job total 0.4103 incl. harness) | heygen | 0.1418 | same |
| 20 | 2026-11-27 | #17 | CP4 API job in WSL "how big is the Sun" 30 s, cut 1 (kurzgesagt) | heygen | 0.1305 | WSL ~/cutroom-var/runs/20261127-024513-how-big-is-the-sun |
| 21 | 2026-11-27 | #17 | CP4 cut 2 | heygen | 0.0307 | same |
| 22 | 2026-11-27 | #17 | CP4 cut 3 (selected) | heygen | 0.0271 | same |
| 23 | 2026-11-27 | #17 | CP4 cut 4 (job total 0.2477 incl. harness 0.0319) | heygen | 0.0283 | same |
| 24 | 2026-11-27 | #18 | CP5 job 1 "Norway 1905" cut 1 (countryball-map-story) | eleven-v4 | 0.3054 | WSL ~/cutroom-var/runs/20261127-031544-how-did-norway-break-away-from-sweden-in |
| 25 | 2026-11-27 | #18 | CP5 job 1 cut 2, notes (eleven-v4 402 first, resumed) | heygen-paid | 0.0782 | same |
| 26 | 2026-11-27 | #18 | CP5 job 1 cut 3, notes (selected) | heygen-paid | 0.0676 | same |
| 27 | 2026-11-27 | #18 | CP5 job 1 cut 4, notes (job total 0.5538 incl. harness) | heygen-paid | 0.0624 | same |
| 28 | 2026-11-27 | #18 | CP5 job 2 "WarmMate ad" cut 1 (script-sketch, fit none) | eleven-v4 | 0.2121 | WSL ~/cutroom-var/runs/20261127-033726-make-a-funny-30-second-ad-for-our-new-se |
| 29 | 2026-11-27 | #18 | CP5 job 2 cut 2, notes (selected) | eleven-v4 | 0.0493 | same |
| 30 | 2026-11-27 | #18 | CP5 job 2 cut 3, notes | eleven-v4 | 0.0751 | same |
| 31 | 2026-11-27 | #18 | CP5 job 2 cut 4, notes (job total 0.4056) | eleven-v4 | 0.0456 | same |
| 32 | 2026-11-27 | #18 | CP5 job 3 "microwave" cut 1 (lowpoly-cutaway-explainer; eleven-v4 402 first) | heygen-paid | 0.1739 | WSL ~/cutroom-var/runs/20261127-035843-how-does-a-microwave-oven-actually-heat |
| 33 | 2026-11-27 | #18 | CP5 job 3 cut 2, notes | heygen-paid | 0.0736 | same |
| 34 | 2026-11-27 | #18 | CP5 job 3 cut 3, notes | heygen-paid | 0.0424 | same |
| 35 | 2026-11-27 | #18 | CP5 job 3 cut 4, notes (selected; job total 0.3637) | heygen-paid | 0.0398 | same |
| 36 | 2026-11-27 | #18 | CP5 job 4 "Point Nemo" cut 1 (globe-zoom-explainer; eleven-v4 402 first) | heygen-paid | 0.1640 | WSL ~/cutroom-var/runs/20261127-042300-why-is-point-nemo-the-loneliest-place-on |
| 37 | 2026-11-27 | #18 | CP5 job 4 cut 2, notes | heygen-paid | 0.0559 | same |
| 38 | 2026-11-27 | #18 | CP5 job 4 cut 3, notes (selected) | heygen-paid | 0.0273 | same |
| 39 | 2026-11-27 | #18 | CP5 job 4 cut 4, template round (plan patch, history 1; job total 0.4090) | heygen-paid | 0.1270 | same |
| - | 2026-11-27 | #18 | CP5 job 5 first post "atom vs grain of sand": intake picked mirror-parable, engine writer gave up (no usable fact sheet, then no usable script); job `failed`, 0 cuts, not counted | none | 0.021 | WSL ~/cutroom-var/runs/20261127-055821-how-small-is-an-atom-compared-to-a-grain |
| 40 | 2026-11-27 | #18 | CP5 job 5 re-posted with `template: kurzgesagt`, cut 1 (incl. 0.0524 from a refused eleven-v4 invocation, 402 weight_exceeds_budget) | heygen-paid | 0.1027 | WSL ~/cutroom-var/runs/20261127-060125-how-small-is-an-atom-compared-to-a-grain |
| 41 | 2026-11-27 | #18 | CP5 job 5 cut 2, notes (selected) | heygen-paid | 0.0423 | same |
| 42 | 2026-11-27 | #18 | CP5 job 5 cut 3, notes | heygen-paid | 0.0417 | same |
| 43 | 2026-11-27 | #18 | CP5 job 5 cut 4, notes (job total 0.2664 incl. harness 0.0370) | heygen-paid | 0.0425 | same |

## Phase Q: reel quality (from 2026-11-27)

Plan: HANDOFF.md (T0-T11), the user's brief docs/reel-quality-brief.md, evidence docs/reel-quality-findings.md. Milestone "Q: Reel quality", issues #44-#60:
T0 #44, T1 #45, T2 #46, T3 #47, T5 #48, T5b #49, T6 #50, T4 #51, T7 #52, T8 #53, T9 #54, T10a #55, T10b #56, T10c #57, T10d #58, T10e #59, T11 #60.

User decisions 2026-11-27: D24 (repairs in cutroom-v2, fastreel frozen; #44 records it), 80-cut budget, remove script-sketch, globe-zoom supports other planets.

Preflight 2026-11-27: main clean, `npm run check` green (140 tests, 139 pass, 1 skipped), no engine.lock, WSL clone pulled to 575cabb.
QC0 items done directly: patched working copies reset (Windows globe-zoom-explainer.md and kurzgesagt.md, WSL globe-zoom-explainer.md: deleted, then `sync`; no `patched: true` left in either manifest).

**Voice credit (2026-11-27):** OpenRouter credit is 0 (usage 0.18 over a 0 total), so heygen-paid, minimax, gemini-tts and eleven-v* through OpenRouter will refuse. The free `heygen` voice answers (200). It ends 2026-11-30. Real runs use `--voice-model heygen`. User item: add OpenRouter credit before 2026-11-30, or the phase stops for voice.

### In flight

(see below, updated per merge)

### Real cuts, phase Q (budget 80)

A cut is one engine invocation that makes model calls (`--until script` counts). Free re-renders from checkpoints are not counted.

| # | date | issue | purpose | voice | cost USD | run folder |
|---|---|---|---|---|---|---|

## Next action

Phase Q: T0 doc PR, then the lanes (HANDOFF §11).
