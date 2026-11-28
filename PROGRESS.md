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

**Voice blocked (2026-11-27 16:00 UTC):** heygen free returned HTTP 429 "free-models-per-day" (OpenRouter: add 10 credits to unlock 1000 free requests a day). No voice works until the daily reset or until the user adds credit. Full cuts reuse cached voice meanwhile.

**Voice credit (2026-11-27):** OpenRouter credit is 0 (usage 0.18 over a 0 total), so heygen-paid, minimax, gemini-tts and eleven-v* through OpenRouter will refuse. The free `heygen` voice answers (200). It ends 2026-11-30. Real runs use `--voice-model heygen`. User item: add OpenRouter credit before 2026-11-30, or the phase stops for voice.

### In flight

- Merged: #44 (PR #61, c1ceb02, QC0 done), #58 (PR #62, 8b23d5c; both vars cleaned, WSL clone at 8b23d5c), #54 (PR #64, 5eaf742).
- Merged also: #48 (PR #63, cced615; H7 holds: free re-render recipe on #48), #45 (PR #65, 5290aff; 9 script cuts to get the maths right).
- Merged also: #50 (PR #66, e2681fd), #46 (PR #67, 172e613).
- Merged also: #51 (PR #69, 3cfa79d), #52 (PR #71, 969ca15).
- Merged also: #47 (PR #68, 204ece4), #59 (PR #72, cb21389; Windows var synced), #56 (PR #75, de56474), #53 (PR #73, 240fd3a), #70 (PR #74, 4559432), #49 (PR #76, 8fbcc6d), #55 (PR #77, c6ead60), #57 (PR #78, 1eded8c). All implementation issues closed; both vars synced (WSL clone at 1eded8c).
- QC3 cuts done 2026-11-28 00:05-00:51 UTC (rows 41-46). AV: all 6 FAIL (viewer 2-3/5), report on #60 (issuecomment-7231376533). Fix issues #79 (stage), #80 (writer/plan/voice), #81 (countryball template).
- Merged: #82 (234ab2f, #81), #83 (6e412aa, #80), #84 (fbd0412, #79). #79-#81 closed and verified (cut 50; #79 by free re-render and a 43-shot replay). Both vars synced (WSL clone at fbd0412).
- QC4 stopped 2026-11-28 15:10 UTC (user ruling: the user watched the reels, judged them good, and asked to stop and wrap up). 3 of 11 QC4 reels made and reviewed (Jupiter, Olympus, Reunification: AV FAIL 2/5 each, report on #60 issuecomment-7240645554); Virus stopped at its plan, waiting on the MiniMax Token Plan quota (error 2056) since 14:03 UTC; Iceland, Louisiana, Burj, Panama, microwave, Fresnel, focus not run. QC5 not run.
- Voice blocked 2026-11-28 10:10 UTC (heygen free 429 free-models-per-day, OpenRouter credit $0). User ruling 13:00 UTC: the voices are not under test, make the videos. #85 (PR #86, 7b51d7b): `--voice-model local`, Windows built-in speech, free and offline; QC4 runs on it (robotic; pitch gate logs LOW).
- Merged: #87 (PR #88, b9f42bd): a kit-raised crash names the shot's own line; a blank shot is a failing step; kurzgesagt copies row on its big one. Both vars synced (WSL clone at b9f42bd).
- Merged: #89 (PR #90, 7baba2e): an unanswered request asks the sheet once for what it needs; the calc message says to state a compared value as a fact; globe marker keeps its screen size. Both vars synced (WSL clone at 7baba2e).
- Merged: #91 (PR #92, 572a8f4): an asset param passed as undefined is rejected; a countryball whose flag is a name paints kit.flags[p.who]. Both vars synced (WSL clone at 572a8f4). All merged branches deleted (local and GitHub); agent worktrees removed.
- Scope moves: line-note checks from #54 to #49 (engine applyNotes reuses the writer checks).

### Real cuts, phase Q (budget 80)

A cut is one engine invocation that makes model calls (`--until script` counts). Free re-renders from checkpoints are not counted.

| # | date | issue | purpose | voice | cost USD | run folder |
|---|---|---|---|---|---|---|
| 1 | 2026-11-27 | #45 | `--until script` atom brief (code before review fixes) | none (script only) | 0.0205 | var/runs/q-t1-atom |
| 2 | 2026-11-27 | #45 | `--until script` Moon brief on final PR #65 code (orchestrator) | none (script only) | 0.0260 | var/runs/q-t1-moon |
| 3 | 2026-11-27 | #45 | `--until script` Moon re-run on 92a8982 (orchestrator): false "longer than most lives" kept as a brief conflict | none (script only) | 0.0205 | var/runs/q-t1-moon2 |
| 4 | 2026-11-27 | #45 | `--until script` Moon on 78e0f34 (orchestrator): failed, no usable fact sheet (M3 kept a wrong payoff number against the neutral message) | none | ~0.008 (tokens; no cost file) | var/runs/q-t1-moon3 |
| 5 | 2026-11-27 | #45 | `--until script` Moon on 2775dc2 (orchestrator): failed, no usable fact sheet (derived facts cannot chain; bare unit in a rate rejected). The atom re-run resumed the old q-t1-atom checkpoints: 0 calls, not counted | none | ~0.0075 (tokens) | var/runs/q-t1-moon4 |
| 6 | 2026-11-27 | #45 | `--until script` Moon on cea8190: failed, no usable fact sheet (conversion calc rejected) | none | ~0.008 | var/runs/q-t1-moon5 |
| 7 | 2026-11-27 | #45 | `--until script` atom on cea8190: false sheet passed (hair fact relabelled as sand, meaningless calcs, lazy fact check) | none | 0.0166 | var/runs/q-t1-atom2 |
| 8 | 2026-11-27 | #45 | `--until script` Moon on 9875f2e: maths right (8.6 years, a fraction of a lifetime); wall 342 s | none | 0.0407 | var/runs/q-t1-moon6 |
| 9 | 2026-11-27 | #45 | `--until script` atom on 9875f2e: maths right (0.5 mm / 100 pm = 5 million) | none | 0.0438 | var/runs/q-t1-atom3 |
| 10 | 2026-11-27 | #45 | `--until script` Venus on 9875f2e: premise inverted (reference lacks the 243-day spin: T2) | none | 0.0342 | var/runs/q-t1-venus |
| 11 | 2026-11-27 | #50 | full cut on PR #66 (Moon): stopped at voice, heygen free HTTP 429 free-models-per-day | heygen (refused) | ~0.03 (script stage) | var/runs/q-t6-moon |
| 12 | 2026-11-27 | #50 | cut on PR #66 from the old Moon script (cached voice, new plan/assets/shots): 4 first-attempt shot rejections, all real; no overlaps | heygen (cached) | 0.1114 | var/runs/q-t6-moon2 |
| 13 | 2026-11-27 | #46 | `--until script` Venus on PR #67: premise kept (243-day spin vs 224.7-day year) | none | 0.0467 | var/runs/q-t2-venus |
| 14 | 2026-11-27 | #46 | `--until script` Norway on PR #67: right article, 1905 events in order | none | 0.0712 | var/runs/q-t2-norway |
| 15 | 2026-11-27 | #47 | `--until script` atom on PR #68 (T3 agent): question drifted to a volume count, answer unsaid | none | 0.0543 | var/runs/q-t3-atom |
| 16 | 2026-11-27 | #47 | `--until script` Moon on PR #68 (T3 agent): connected, right numbers; takeaway inverted | none | 0.0226 | var/runs/q-t3-moon |
| 17 | 2026-11-27 | #47 QC1 | `--until script` atom on PR #68 b69c316: ok | none | 0.0276 | var/runs/qc1-atom |
| 18 | 2026-11-27 | #47 QC1 | `--until script` moon on PR #68 b69c316: ok | none | 0.0460 | var/runs/qc1-moon |
| 19 | 2026-11-27 | #47 QC1 | `--until script` sun on PR #68 b69c316: ok | none | 0.0371 | var/runs/qc1-sun |
| 20 | 2026-11-27 | #47 QC1 | `--until script` venus on PR #68 b69c316: ok | none | 0.0398 | var/runs/qc1-venus |
| 21 | 2026-11-27 | #47 QC1 | `--until script` nemo on PR #68 b69c316: ok | none | 0.0578 | var/runs/qc1-nemo |
| 22 | 2026-11-27 | #47 QC1 | `--until script` norway on PR #68 b69c316: failed: hard payoff-number check on a date | none | ~0.024 | var/runs/qc1-norway |
| 23 | 2026-11-27 | #47 QC1 | `--until script` proxima on PR #68 b69c316: ok (new topic) | none | 0.0760 | var/runs/qc1-proxima |
| 24 | 2026-11-27 | #47 QC1 | `--until script` mariana on PR #68 b69c316: ok (new topic) | none | 0.1000 | var/runs/qc1-mariana |
| 25 | 2026-11-27 | #47 QC1 | `--until script` panama on PR #68 b69c316: failed: fit could not reach the budget (new topic) | none | ~0.021 | var/runs/qc1-panama |
| 26 | 2026-11-27 | #47 QC1 | `--until script` quit on PR #68 b69c316: ok (new topic, dan-koe) | none | 0.0403 | var/runs/qc1-quit |
| 27 | 2026-11-27 | #47 | `--until script` Norway re-run on 98449c1: completes; months out of order | none | 0.0779 | var/runs/qc1-norway2 |
| 28 | 2026-11-27 | #47 | `--until script` Panama re-run on 98449c1: completes (154 words, budget 103, warning); factcheck-2 took 551 s | none | 0.0843 | var/runs/qc1-panama2 |
| 29 | 2026-11-28 | #70 QC1b | `--until script` nemo on PR #74 cf22854 (completes, 1-3 min) | none | 0.0460 | var/runs/qc1b-nemo |
| 30 | 2026-11-28 | #70 QC1b | `--until script` venus on PR #74 cf22854 (completes, 1-3 min) | none | 0.0206 | var/runs/qc1b-venus |
| 31 | 2026-11-28 | #70 QC1b | `--until script` mariana on PR #74 cf22854 (completes, 1-3 min) | none | 0.0340 | var/runs/qc1b-mariana |
| 32 | 2026-11-28 | #70 QC1b | `--until script` proxima on PR #74 cf22854 (completes, 1-3 min) | none | 0.0329 | var/runs/qc1b-proxima |
| 33 | 2026-11-28 | #70 QC1b | `--until script` sun on PR #74 cf22854 (completes, 1-3 min) | none | 0.0309 | var/runs/qc1b-sun |
| 34 | 2026-11-28 | #70 QC1b | `--until script` quit on PR #74 cf22854 (completes, 1-3 min) | none | 0.0286 | var/runs/qc1b-quit |
| 35 | 2026-11-28 | #70 QC1c | `--until script` nemo on PR #74 6ef300c | none | 0.0447 | var/runs/qc1c-nemo |
| 36 | 2026-11-28 | #70 QC1c | `--until script` venus on PR #74 6ef300c | none | 0.0334 | var/runs/qc1c-venus |
| 37 | 2026-11-28 | #70 QC1c | `--until script` mariana on PR #74 6ef300c | none | 0.0271 | var/runs/qc1c-mariana |
| 38 | 2026-11-28 | #70 QC1c | `--until script` proxima on PR #74 6ef300c | none | 0.0388 | var/runs/qc1c-proxima |
| 39 | 2026-11-28 | #70 QC1c | `--until script` sun on PR #74 6ef300c | none | 0.0315 | var/runs/qc1c-sun |
| 40 | 2026-11-28 | #70 QC1c | `--until script` quit on PR #74 6ef300c | none | 0.0295 | var/runs/qc1c-quit |
| 41 | 2026-11-28 | #60 QC3 | full cut G atom (kurzgesagt), main 1eded8c, --rounds 0 | heygen free | 0.1421 | var/runs/qc3-atom |
| 42 | 2026-11-28 | #60 QC3 | full cut A Venus (globe-zoom), main 1eded8c, --rounds 0 | heygen free | 0.1450 | var/runs/qc3-venus |
| 43 | 2026-11-28 | #60 QC3 | full cut D Norway (countryball), 73.6 s: script 53% over budget; voice bram pitch 3.39 LOW, main 1eded8c, --rounds 0 | heygen free | 0.2741 | var/runs/qc3-norway |
| 44 | 2026-11-28 | #60 QC3 | full cut B Moon (kurzgesagt), main 1eded8c, --rounds 0 | heygen free | 0.1641 | var/runs/qc3-moon |
| 45 | 2026-11-28 | #60 QC3 | full cut C Sun (kurzgesagt), main 1eded8c, --rounds 0 | heygen free | 0.1116 | var/runs/qc3-sun |
| 46 | 2026-11-28 | #60 QC3 | full cut F Nemo (globe-zoom), main 1eded8c, --rounds 0 | heygen free | 0.1677 | var/runs/qc3-nemo |
| 47 | 2026-11-28 | #81 | `--until assets` Norway on PR #82 9538712 (template only): Sweden flag right; Norway flag spec wrong (M3), border invisible, sheet balls grey, sign word swapped | none | 0.2070 | var/runs/q-t14-norway |
| 48 | 2026-11-28 | #80 | `--until script` atom on PR #83 500cad7: sand answered ("Grain of sand" fetched: 2 mm, twenty million times) | none | 0.0231 | var/runs/q-t13-atom |
| 49 | 2026-11-28 | #80 | `--until script` Norway on PR #83 500cad7: no flagged line left; 181 words for 112 (second fit 210 -> 183). Plus 3 direct M3 fit probes outside the engine ($0.024) | none | 0.0419 | var/runs/q-t13-norway |
$1| 51 | 2026-11-28 | #60 QC4 | full cut Q1 Jupiter (kurzgesagt), main 7b51d7b, --rounds 0; script/plan/assets from the 10:10 run (stopped at voice), resumed: 47.2 s; AV FAIL 2/5 (shot 3 blank: 6 crashed attempts, #87) | local | 0.0457 + the first run's spend (not printed) | var/runs/qc4-jupiter |
| 52 | 2026-11-28 | #60 QC4 | full cut Q4 Olympus (globe-zoom), main 7b51d7b, --rounds 0: 48.5 s; AV FAIL 2/5 (no Earth comparison, marker at zoom scale) | local | 0.1833 | var/runs/qc4-olympus |
| 53 | 2026-11-28 | #87 | diagnostic redraw of qc4-jupiter shot 3 alone (copied folder, an engine copy under var/ that saves rejected code, `--apply-notes {}`): passed on attempt 3, the NaN not reproduced | local | 0.0084 | var/runs/dbg-jupiter-s3 |
| 54 | 2026-11-28 | #60 QC4 | full cut Q6 Reunification (countryball), main ef244bb (b9f42bd pulled mid-run: stage error text only), --rounds 0; first start killed at its script (log 1795872448), resumed: 60.6 s; AV FAIL 2/5 (grey balls: flag keys, #91) | local | 0.2602 + the first start's spend (not printed) | var/runs/qc4-reunification |
| 55 | 2026-11-28 | #60 QC4 | full cut Q2 virus (kurzgesagt), main b9f42bd: died at facts ("no usable fact sheet": 4 rejections of a calc using a value no fact states) | none | ~0.01 (5 facts calls, not printed) | var/runs/qc4-virus-failed1 |
| 56 | 2026-11-28 | #89 | `--until script` virus on PR #90 (engine copy saving writer answers): facts passed on the 4th try, facts-answer added the hair comparison, 98 words; QC4 virus resumes from this script | none | 0.0362 | var/runs/dbg-virus-script |
| 57 | 2026-11-28 | #60 QC4 | full cut Q2 virus resumed from row 56's script, main 7baba2e: plan#1 rejected, then MiniMax Token Plan limit (7 waits of 10 min); stopped by the user ruling, no reel | local | small (1-2 plan calls, not printed) | var/runs/qc4-virus |

## Next action

Stopped by the user (2026-11-28). If QC resumes: run the 8 QC4 reels left (scratchpad qc4.sh order: virus, iceland, louisiana, burj, panama, microwave, fresnel, focus) on `--voice-model local` or with OpenRouter credit, AV review each (av-protocol), then QC5 (5 API jobs). Open gaps: labels landing early (only lateness is checked), a historical map for countryball, fact-check misses ("thick lava", "West Berlin"), shots that ship after 3 failed attempts in single cuts. Budget: 57 of 80 cuts used.
