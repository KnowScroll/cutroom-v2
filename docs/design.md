# cutroom-v2 design

Source of truth for the architecture. Later sections never override §1; a change to a decision in §1 needs the user's approval and a dated line here.

Motto: **Lightweight. Fast. Simple.**

## 1. Decisions

2026-11-27. D1-D13, D20-D23: the user's answers (D20 confirmed 2026-11-27). D14-D19: defaults proposed to the user, then accepted with "yes to all" on 2026-11-27.

| id | decision |
|---|---|
| D1 | One engine: fastreel's (`KnowScroll/fastreel`, private), imported into this repo. Its creative steps, prompts, validators and render are not improved or redesigned. |
| D2 | From `KnowScroll/cutroom-test-skill` take only: the director rubric (hook, clarity, visual, pacing, audio, fit, 1-5), its JSON decision style, the rule that a measured gate FAIL is never approved, the mp4-level frame audit, and its "read the request" questions for intake. Not its HyperFrames build, style kits or agent skill. |
| D3 | The harness is a custom TypeScript program (no pi, no agent framework). MiniMax-M3 is called only at fixed points with fixed prompts and schema-checked JSON answers; everything else is code. |
| D4 | Templates: developers write originals in `templates/` with Claude Code (`studio/`, `/new-template`, `/fix-template`). The harness never writes there. It keeps working copies (read-write) and may patch them while fixing a reel (§5). |
| D5 | Sync: a new original is copied into the working folder; otherwise nothing changes (refined by D15-D16). |
| D6 | Both a CLI and an HTTP API; the API runs as its own service on a Linux VM. |
| D7 | When the fix rounds run out without approval: return the best cut plus a report. Every run keeps complete logs and metadata (§7). |
| D8 | Keys live in `.env` at the repo root only. Never printed, copied or committed. |
| D9 | New code is strict TypeScript with lint, typecheck and tests. The engine stays JavaScript; it gets only the edits in §4.2. |
| D10 | VM OS is Linux. Open fonts are bundled and loaded by the stage; templates name the new fonts (§4.3). Dev machine and VM render with the same fonts. |
| D11 | The repo `KnowScroll/cutroom-v2` stays public and imports everything, including `studio/refs` (user's explicit choice). `.env`, keys, reference `.mp4` files and run outputs are never committed. |
| D12 | API output: job id, poll, download. Bearer token. Files on the VM's disk. |
| D13 | No template creation by the harness, ever. |
| D14 | fastreel's `classic/` pipelines are not imported. |
| D15 | Sync detail: an original that changed while its working copy was never patched replaces the working copy; if both changed, the working copy stays and a conflict is logged and flagged in reports. A deleted original leaves its working copy in place (logged). |
| D16 | The harness may not patch `## about`, `## checks`, `## director` or `_base.md`. |
| D17 | No template fits the request: use the closest one and flag it (`fit: none`) in the report. |
| D18 | One reel at a time (parallel runs slow every MiniMax call): a FIFO queue with one worker. |
| D19 | The working folder is not in Git; the template edit history (§5.3) is the trail. |
| D20 | "max 3" = the first cut plus at most 3 fix rounds (at most 4 cuts per job), from "review, re send with fixes (max-3)". A constant (`MAX_FIX_ROUNDS`), so a different answer is a one-line change. |
| D21 | Voice is not locked to one model or provider (user, 2026-11-27): an ordered list of every engine voice model, with fallback (§6.7). Keys for OpenRouter and ElevenLabs are both optional; a job needs at least one voice that works. |
| D22 | Deploying to the VM is out of scope for now (user, 2026-11-27). Linux is verified in WSL Ubuntu only; D6 and D10 still shape the code. |
| D23 | Frame-gate calibration is decided by a fixed rule, not by the user (user, 2026-11-27): for each template and each frame gate, if more than half of that template's existing fastreel reels (every `reel.mp4` cut on disk) fail the gate at cutroom's threshold, the gate is `info` for that template (a `gate <name>: info` line in its `## checks`); otherwise the gate is `block` at cutroom's threshold. A template with no reel on disk gets cutroom's thresholds. The orchestrator applies it and posts the table for the user to look at later. |

## 2. Scope

In: request in, reel out. Intake, one engine, measured gates, an M3 review, up to 3 fix rounds, best cut, report, run record. CLI and HTTP service. Template working copies with sync and patching. A Linux run verified in WSL Ubuntu.

Out: new templates or new styles (developer work in `studio/`); improving the engine's prompts, drawing, voice or music; a web UI; multiple workers; object storage; user accounts; deploying to the VM (D22).

## 3. Layout

```
AGENTS.md  CLAUDE.md  HANDOFF.md  PROGRESS.md  README.md
docs/design.md  docs/plan.md
engine/        fastreel engine, JS (asset_reel.mjs + fastreel's engine/* + prompts/), package-local paths only
templates/     ORIGINAL templates: _base.md, <kind>.md, <kind>.log (developer-owned)
studio/        developer-only: fastreel reference-lab (README, method-results, REA_VIDEO_HANDOFF, tools/, refs/,
               rea-video-patches/), briefs/; .claude/skills/new-template, fix-template point here
fonts/         bundled open fonts + their licences
src/           TypeScript: harness and service
test/          node:test tests, fixtures (fake engine, fake MiniMax server)
var/           runtime, gitignored (CUTROOM_VAR): templates/, runs/, cache/, engine.lock
```

## 4. Engine

### 4.1 Contract (after the edits in 4.2)

```
node engine/asset_reel.mjs --brief-file <run>/brief.txt --template <kind> --seconds <n> --rounds 0 --out <run>/reel --cut <n> [--voice-model <m>]
node engine/asset_reel.mjs ... same flags ... --apply-notes <run>/notes-<n>.json
env: CUTROOM_TEMPLATE_DIR (var/templates), CUTROOM_ENV_FILE (repo .env), CUTROOM_VAR (cache in $CUTROOM_VAR/cache)
```
- Writes `<out>-v<n>/` (reel.mp4 1080x1920 30 fps, timeline.json, plan.json with every asset and shot's code, audio.json, CREDITS.md, assets*.jpg), `<out>-work/` (checkpoints: reference.txt, facts.json, spine.json, script.json, script.md, plan.json, poses.json, kit.js, asset_*, sheet-review*.json, photos.json, shot_*.js, music.json, calls.json, rejected_*.js), `<out>-summary.json`, `<out>-cost.txt`. Stdout is the run log; the harness saves it per invocation.
- Rerunning with the same `--out` resumes from checkpoints. Each checkpoint file is restored on its own (kit.js, asset_*.js and shot_*.js do not check what came before them), so rebuilding a step means deleting its checkpoint and every later one (§5.4). `--out` is always an absolute path under `$CUTROOM_VAR/runs/`.
- The engine waits by itself when the MiniMax Token Plan quota runs out (error 2056), up to 24 h.

### 4.2 Allowed engine edits (the only ones)

- E1 Paths: the engine lives in `engine/`; templates, keys and the var folder come from the env vars above (defaults: `<repo>/templates`, `<repo>/.env`, `<repo>/var`); the cache is `$CUTROOM_VAR/cache` and a run without `--out` goes to `$CUTROOM_VAR/runs/<slug>-<stamp>` (never `<repo>/reels/`). Replaces the hard-coded `C:/Users/XZNON/cutroom-v2/.env` and `FASTREEL_ENV_FILE`.
- E2 `--cut <n>` names the output `<out>-v<n>`. `--apply-notes <file>` restores the checkpoints, applies a notes file exactly as fastreel's director round does today (same schema, same speaker mapping, same `h.cue` re-timing rule, `script: yes` ignores line notes), saves the redrawn assets and shots and the changed lines (the work folder's `plan.json`) back to the checkpoints, then renders cut n. The director-round body becomes one function used by both `--rounds` and `--apply-notes`; `--rounds` keeps working for developers.
- E3 Fonts (§4.3): `@font-face` for the bundled fonts in the stage, and a wait for `document.fonts` before validation and render.
- E4 Linux: anything else that breaks on Linux (found in M5), fixed minimally.

Any other engine change is an architecture change: escalate.

### 4.3 Fonts

Windows fonts in templates, prompts and stages today: Segoe UI (21 uses), Georgia (17), Arial (12, stage_asset.html and the 3D stages), Consolas (7), Bahnschrift (6), Arial Rounded MT Bold (3), Times New Roman, Segoe UI Black, Impact, Courier New, Century Gothic, Trebuchet MS. Replace each with an open (OFL or Apache) font with close metrics, vendored in `fonts/` with its licence; candidates: Selawik for Segoe UI (Microsoft's open, metric-compatible fallback), Gelasio for Georgia, Arimo for Arial, Cascadia Mono for Consolas, Tinos for Times New Roman, Cousine for Courier New, Anton for Impact; Bahnschrift, Century Gothic, Arial Rounded MT Bold and Trebuchet MS need a pick by look. The stage loads them with `@font-face`; templates and prompts name the new families. Verify per replaced font: "before" = frames of an existing fastreel reel; "after" = the same reel's work folder copied, the font names in its code rewritten to the new families, and re-rendered from checkpoints (no model calls).

## 5. Templates

### 5.1 Folders

Originals: `templates/` (git, developer-owned, read-only to the harness). Working copies: `var/templates/` (`CUTROOM_TEMPLATE_DIR`), read by the engine and the harness. `_base.md` is copied too but never patched. `.log` files are not copied.

### 5.2 Sync

Runs at service start and before each job. `var/templates/manifest.json` records per file: `source_sha256` (original at last copy), `working_sha256`, `patched` (bool). Rules: D5, D15. Every sync action is a line in the job's events and in `var/templates/sync.log`.

### 5.3 Patches

A review may return `template_patch` (§6.4). The harness applies it only if:
- the section is one of `story`, `plan`, `sound`, `look`, `motion`, `assets`, `shots` (D16);
- `op` is `append` (a new bullet at the end of the section) or `replace` (an `old` string that occurs exactly once in the section);
- the text holds no content word of the request (no topic words: M3 copies examples literally).

Before applying: snapshot to `var/templates/history/<kind>/<k>.md` and write `<k>.json` (job, cut, round, patch, reason, gates and scores of the cut that triggered it; the next cut's gates and scores are added when it is reviewed). The manifest marks the template `patched`. A patched copy is used by all later jobs.

### 5.4 Rerun after a patch

The harness deletes the checkpoints from the earliest step that reads the patched section, then reruns the engine (resume):

| section | read by (verified in fastreel at asset_reel.mjs:351, 580, 674, 775; writer.mjs:125, 185) | delete from |
|---|---|---|
| story | facts, spine, script | facts.json |
| plan, sound | spine, script, production plan | spine.json |
| look, motion, assets, shots | production plan, kit, assets, shots | plan.json |

"Delete from X" means X and every checkpoint after it in the chain of §4.1 (the implementer confirms whether music.json must go too). The implementer re-verifies this table against the imported code.

2026-11-27 (#10, re-verified in the imported engine): the readers and the "delete from" column are right; the sheet review (asset_reel.mjs:633) also reads look, assets and the director (732) reads every section but writes no checkpoint. Correction to the chain: music.json goes with the script, not after the shots. The track is picked for the script's music field (writer.mjs:409, 429, copied into the plan unchanged at asset_reel.mjs:365) and reused while music.json exists (audio.mjs:335-338); the plan step changes no line, music or payoff, so a plan.json rerun keeps it. Exact sets in `src/templates.ts`: from facts.json: facts.json, then the spine.json set; from spine.json: spine.json, script.json, script.md, music.json, music_lyria.mp3, music_synth.wav, then the plan.json set; from plan.json: plan.json, poses.json, photos.json, photos/, kit.js, asset_*, sheet*.jpg, sheet-review*.json, shot_<n>.js, rejected_*.js. Never deleted: reference.txt (from the brief; the facts step only adds articles to it) and calls.json (the live cost log, never read back).

## 6. Harness

### 6.1 Flow of one job

```
sync templates -> intake (M3) -> cut 1 (engine) -> gates -> review (M3)
  -> approved and no blocking FAIL: done
  -> else, rounds < 3: fix round (notes -> --apply-notes, or template patch -> invalidate + rerun) -> cut n -> gates -> review -> ...
  -> select best cut -> report -> done
```
- A review that approves while a blocking gate FAILs is asked once more with the FAIL lines ("approve is not allowed"); still no fixes: the loop stops.
- A round is either a notes round or a template round, never both (a patch makes the shots regenerate anyway).
- The last cut is reviewed too (its scores grade it); its fixes are recorded, not applied.
- Engine crash: rerun the same command once (it resumes). Second crash: the job fails with the error; the report covers what exists. A voice refusal is not a crash: it switches the voice (§6.7) and does not count as a fix round.

### 6.2 Intake

One M3 call, thinking off. Input: the request, the optional `template` and `seconds`, and every working template's name and `## about`. Prompt adds cutroom's read-the-request questions (audience, goal, tone, subject kind). Output (zod-checked, one retry on bad JSON):
`{ template: string, fit: "good" | "partial" | "none", reason: string, audience: string, goal: string, tone: string, seconds: number }`.
A request that names a template uses it (fit is still judged). `brief.txt` = the request verbatim + three lines (audience, goal, tone); always passed with `--brief-file`.

### 6.3 Gates

Code only. Each gate: `{ name, value, threshold, pass, mode: "block" | "info" }`.
- `format`: ffprobe 1080x1920, 30 fps, an audio stream, duration = timeline total +-0.1 s. block.
- `shipped_failing`: engine log lines `using the last` (a shot or asset shipped failing its validator). block.
- `voice_pitch` (>= 4 st), `music_fit` (engine PASS), `voice_over_music` (10-14 dB): from `audio.json`. block. Kokoro cannot pass `voice_pitch` (measured 2.2-3.9 st on 10 fastreel reels; it ignores tone tags), so a reel voiced by Kokoro can never be approved; it stays in the voice list as the last resort so a job still returns a cut (§6.7).
- Frame audit, ported from cutroom `scripts/frame_audit.py` (v1.7): `same_view` <= 14 s, `frame0` detail >= 0.05, `blank` none, `balance`, `flat` <= 60%, `static_band` <= 14 s, `alive` gap <= 3 s and still <= 20%. Caption band left out per the template's `captions:` check. Fastreel's looks differ from cutroom's (dan-koe is flat by design), so per-template modes are set from the 42 local fastreel reels by the rule in D23. Per-template overrides are developer lines in the template's `## checks`: `gate <name>: off | info | <threshold>`.
  2026-11-27 (#13): the D23 rule set the modes. Each template's `info` gates are `gate <name>: info` lines in its original; every other frame gate is `block` at the thresholds above (table in #13). `blank` does not count a sample inside the engine's 0.2 s cut transition at the start of a shot after the first (orchestrator ruling, a measurement fix).
- Length against the target is passed to the review, not gated.

### 6.4 Review

One M3 vision call per cut, separate from every maker call (it sees only the packet). Packet, as fastreel's `review()` builds it today: brief, target and actual length, the story's question and answer, the asset sheets, and per shot its point, storyboard, lines with times and three frames (20%, 55%, 92%); plus the gate lines, the engine's rejections, and the fact sheet. System prompt: fastreel `prompts/director.txt` + the template's sections (as `guide(...SECTIONS)`) + cutroom director.md items that apply to canvas reels (picture says what the words say; nothing clipped, overlapping, unreadable or under a caption; frame 0 is the subject; name test; on-screen text is true and the right way round; filler is a defect; the ending shows the payoff and holds >= 2 s; at most 6 fixes, each where / what / do). Output (zod):
```
{ approve: boolean, summary: string,
  scores: { hook, clarity, visual, pacing, audio, fit },          // 1-5
  notes: { lines?: { [shot]: { who, text, tone? }[] }, assets?: { [id]: string }, shots?: { [shot]: string } },
  template_patch?: { section, op: "append" | "replace", old?: string, text: string, reason: string }[] }
```
`notes` is exactly fastreel's director schema, so `--apply-notes` takes it unchanged. The prompt asks for a template patch only for a flaw the template's directions cause (it would come back on any topic); reel notes otherwise.

### 6.5 Best cut

Order: fewest blocking FAILs, then highest score sum, then the later cut. Approved with no blocking FAIL ends the job early with that cut.

### 6.6 MiniMax client

`fetch` to `https://api.minimax.io/anthropic/v1/messages`, Bearer `MINIMAX_API_KEY`, streamed like the engine's `m3Request` (no header timeout), retries network errors with growing waits, waits on quota error 2056, returns text + usage; price from the engine (`in 0.30, cached 0.06, out 1.20` USD per M tokens). No SDK.

### 6.7 Voice fallback

Every engine voice goes through OpenRouter (`/audio/speech`), except ElevenLabs, which the engine calls directly when `ELEVENLABS_API_KEY` is set. Any provider can be out of credits, so the voice is an ordered list, `CUTROOM_VOICE_MODELS` (engine `--voice-model` keys; default `eleven-v4, heygen-paid, heygen, minimax, gemini-tts, eleven-v4-turbo, eleven-v3, kokoro`; development starts with the free `heygen`, AGENTS.md). Measured pitch spread: eleven-v4 4.6-6.4 st, heygen 4.45-4.57, kokoro 2.2-3.9 (fails the gate); minimax and gemini-tts not measured yet.
- A cut runs with the first model not yet ruled out for this job.
- The engine stops with a voice refusal: its log's `FAILED` line matches `(OpenRouter|ElevenLabs) speech <id> HTTP 4xx` (the engine's own error format, `engine/audio.mjs`; a 429 counts too, because the engine retries 429 itself before it stops). That model is ruled out for this job only; every new job starts from the top of the list again, so credits added later are picked up with no config change (the keys stay the same). The same cut reruns with the next model (the engine resumes from its checkpoints and voices again). This is not a fix round.
- A blocking `voice_pitch` FAIL: the next fix round also switches to the next model not yet tried (the voice cannot be fixed by notes).
- No model left: the job fails with every refusal listed. Never a silent default.
- The model of every cut, and every switch and why, go into events and run.json.
- Music needs no change: the engine already falls back from the library to Lyria (OpenRouter) to its procedural synth.

## 7. Run record

`var/runs/<job-id>/` (job id: `YYYYMMDD-HHMMSS-<slug>`):
- `job.json`: request, status (`queued | running | done | failed`), stage, timestamps, error.
- `brief.txt`, `notes-<n>.json`, `review-<n>.json`, `engine-<n>.log`, engine outputs (`reel-v<n>/`, `reel-work/`, `reel-summary-<n>.json`).
- `events.jsonl`: one line per event `{ t, stage, event, data }` (sync, intake, engine start/end, gate results, review, patch, selection, errors).
- `run.json`: everything needed later to find what failed and where: request, intake, git commit, template name + working sha per cut, per cut (dir, film_s, wall_s, engine cost and tokens by phase from the summary, gates, review scores, summary, notes or patch applied, engine rejections), harness calls (step, tokens, USD), selected cut and why, totals.
- `report.md`: the human summary of run.json (selected cut, why, scores, gates, what is still wrong, cost, time, credits line, flags such as `fit: none` or a sync conflict).

`var/runs/index.jsonl`: one line per finished job (id, date, template, sha, fit, cuts, selected, approved, blocking FAILs, cost, wall) for cross-run analysis. Developers read these and `var/templates/history/` when improving originals with `/fix-template`.

## 8. Service

- CLI (`npm exec --no-install cutroom -- <cmd>` or `node src/cli.ts`): `make "<request>" [--template k] [--seconds n]` (runs one job in the foreground, same code path), `serve`, `status <id>`, `sync`.
- HTTP (`node:http`, no framework): `POST /reels {request, template?, seconds?}` -> 202 `{id}`; `GET /reels/:id` -> job status, stage, cuts so far, report when done; `GET /reels/:id/reel.mp4` (selected cut); `GET /reels/:id/report` (run.json); `GET /health`. Bearer `CUTROOM_API_TOKEN`; binds `CUTROOM_HOST:CUTROOM_PORT` (default 127.0.0.1:8080).
- Queue: jobs are files in `var/runs`; one worker takes the oldest `queued`. On start, a job left `running` is resumed (the engine resumes from checkpoints).
- `var/engine.lock` keeps every CLI and service process to one engine run at a time on a machine. It records the harness pid and the engine child's pid; it is stale only when the engine pid is gone. On shutdown the harness stops its engine's process tree; on start, a live engine pid in the lock was started by a harness, so its tree is stopped (`taskkill /PID <pid> /T /F` on Windows, the process group on Linux, where the engine is spawned detached) before the job resumes. Two writers never share one `--out`.
- Voice: `CUTROOM_VOICE_MODELS` (§6.7).

## 9. Linux

Node 22 LTS (>= 22.18, runs `.ts` by type stripping, no build step), FFmpeg, Google Chrome (`CHROME_PATH`), the bundled fonts, `npm ci`, `.env` at the repo root (or `CUTROOM_ENV_FILE`). Verified in WSL Ubuntu on the dev machine. `studio/` is not needed to run. Deploying to the VM (service unit, hosting) is out of scope for now (D22).

## 10. Known risks

- Self-review: M3 reviewing M3 tends to approve. Guard: gates the review cannot waive; the review sees only the packet.
- Template drift: patches change every later reel. Guards: D16, the topic-word check, the history with before/after grades, sync conflict flags.
- A template round from the script costs about one full reel (fastreel: $0.25-0.35, 10-15 min); worst case 4 cuts per job.
- Frame-audit thresholds come from cutroom's looks. 2026-11-27 (#13): per-template modes were set by the D23 rule on the 42 fastreel reels. A template with few reels (2 for most) or none (toon3d-story-2d) may still block on a look it was designed for; the guard is a developer `gate` line.
