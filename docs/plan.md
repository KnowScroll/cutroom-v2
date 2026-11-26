# cutroom-v2 implementation plan

Order, dependencies, parallel lanes and checkpoints. Task details, acceptance criteria and status live in the GitHub issues (`gh issue view <n>`); this file never repeats them. Architecture: `docs/design.md`.

## Shape

A walking skeleton first: by checkpoint CP1 one real request becomes one reel through the harness (intake, engine, basic gates, review, report). Then the fix loop, the calibrated frame gates, the service, Linux, acceptance.

## Milestones and issues

| milestone | issues | checkpoint at the end |
|---|---|---|
| M0 Foundation | #1 scaffold + CI, #2 import engine/templates/studio | the imported engine makes a reel from the new layout |
| M1 Walking skeleton | #3 config + MiniMax client, #4 run record, #5 engine runner + fake engine, #6 intake, #7 review, #8 basic gates + pipeline + `make` | **CP1**: one real request -> reel + run.json + report.md |
| M2 Fix loop | #9 engine `--cut` / `--apply-notes`, #10 template store, #11 fix loop + best cut | **CP2**: a real job runs a notes round and a template round, picks the best cut |
| M3 Frame gates | #12 frame audit port, #13 calibration (needs the user) + wiring | **CP3a**: thresholds approved by the user, frame gates blocking where approved |
| M4 Service | #14 queue + worker + recovery, #15 HTTP API + CLI | **CP3b**: a real job through the API; a killed service resumes its job |
| M5 Linux | #16 open fonts, #17 Linux run in WSL | **CP4**: tests and one real job pass in WSL Ubuntu |
| M6 Acceptance | #18 end-to-end acceptance | **CP5**: five real API jobs on Linux, run records complete, user informed |

## Dependencies

```
#1 -> #2, #3, #4, #12
#2 -> #5, #6, #9, #16      #3 -> #6, #7          #5 -> #7
#2,#3,#4,#5,#6,#7 -> #8
#2 -> #10                  #8,#9,#10 -> #11
#11,#12 -> #13             #11 -> #14 -> #15
#15,#16 -> #17             #11,#13,#15,#17 -> #18
```
Each issue body repeats its own `Depends on:` line; this graph is the overview.

## Parallel lanes

- After #1: #2, #3, #4, #12 at once (engine/templates/studio; src/config + src/minimax; src/record; src/gates/frames).
- After #2 and #3: #5, #6, #9, #10, #16 can overlap; #9 and #16 both touch `engine/` but different files (asset_reel.mjs vs stage and fonts).
- #2's run folder `$CUTROOM_VAR/runs/import-check/` is a shared read-only fixture (#5, #7). An issue that writes to an engine run folder (#9, #16) works on its own copy.
- At most 3-4 implementers at once. Each owns the files its issue names; integration happens in the dependent issue.
- Real engine runs (MiniMax, voice, render) are one at a time on the machine: `var/engine.lock` once #5 lands, the orchestrator's sequencing before that.

## Testing

- Unit and behaviour tests with `node:test` on every TypeScript issue. Fakes only at process and network edges: `test/fixtures/fake-engine.mjs` (writes realistic outputs, an ffmpeg-made mp4) and a local fake MiniMax HTTP server. No mocking of internals.
- Engine edits (#2, #9, #16, #17) are verified by real runs and a diff against fastreel that shows only the allowed edits (design §4.2).
- Each checkpoint is a real run, recorded in its issue with the run folder, the ffprobe line, the cost and what was looked at.

## Real-run budget

At most 40 cuts during implementation. A cut = one engine invocation that makes model calls; a re-render from checkpoints with no model calls is free. Dev voice list cheap first (AGENTS.md); #18 uses the production default list. Each real cut is a line in PROGRESS.md (issue, purpose, cost). Going past the budget, or ElevenLabs/OpenRouter credits running out, is a user escalation.

## Done

Every issue closed with its acceptance criteria met, CI green on `main`, CP1-CP5 recorded, README covers the CLI, the API and running on Linux, PROGRESS.md says "complete", and the user has the #18 report.
