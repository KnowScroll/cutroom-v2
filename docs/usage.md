# Using cutroom-v2

How to make a reel, what you can ask for, where the output lands and how to read it. Setup and Linux installs: [README](../README.md). Architecture: [design.md](design.md).

## What a job does

One request becomes one job:

1. **Intake** (one MiniMax-M3 call) reads the request and picks a template. It also sets the audience, goal, tone and target length.
2. **Cut 1:** the engine writes, draws, voices, scores and renders the reel.
3. **Gates and review:** 12 measured gates check the mp4, then an M3 vision review grades it.
4. **Fix rounds** run if the cut is not approved, up to 3, and each one makes a new cut:
   - a *notes* round re-runs from the engine's checkpoints with the review's fixes;
   - a *template* round patches the working template (the job undoes the patch when it ends if the next cut was not better);
   - a *voice* round switches voice;
   - an *intake* round (at most once, only when you did not name the template) picks another template when the review finds the template cannot show the subject, and starts the reel over.
5. **The best cut** is selected and the job writes `run.json` and `report.md`. Best means approved first, then no fact error found by the review, then the fewest blocking gate FAILs, then the highest review score, then the later cut.

A job ends `done` even when no cut is approved: you still get the best cut and a report that says why it was not approved. It ends `failed` when an error stops it: the engine exits non-zero twice on a cut, the writer gives up, or every voice is refused. Cuts made before the error stay recorded, and the best of them is still selected and served (report.md flags the failure).

**Cost and time.** The five CP5 jobs (2026-11-27, four cuts each) took 10-24 minutes and cost $0.27-0.55 each. Real jobs cost money: there is one engine run at a time per machine (`$CUTROOM_VAR/engine.lock`), and other jobs wait their turn.

## Make a reel

### From the CLI

```sh
node src/cli.ts make "How does a microwave oven actually heat your food?"
node src/cli.ts make "Why is Point Nemo so remote?" --template globe-zoom-explainer --seconds 40
```

`make` runs in the foreground, prints progress, and ends with the run folder and the report path. Exit code 0 means the job is done; 1 means it failed (the error is printed).

Other commands:

| command                       | what it does                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `node src/cli.ts status <id>` | Prints the job's status, stage, error and folder.                                   |
| `node src/cli.ts sync`        | Brings `$CUTROOM_VAR/templates` in line with `templates/` and prints what changed.  |
| `node src/cli.ts serve`       | Starts the HTTP API and the queue worker.                                           |

Never run a bare `npx cutroom`: that name belongs to an unrelated public npm package.

### From the HTTP API

Start `node src/cli.ts serve`. It needs `CUTROOM_API_TOKEN` and listens on `CUTROOM_HOST:CUTROOM_PORT`, by default `127.0.0.1:8080`. Every route except `/health` needs `Authorization: Bearer <token>`.

```sh
T="Authorization: Bearer $CUTROOM_API_TOKEN"
curl -H "$T" -H "content-type: application/json" \
  -d '{"request":"How small is an atom compared to a grain of sand?","template":"kurzgesagt","seconds":45}' \
  http://127.0.0.1:8080/reels
# 202 {"id":"20261127-060125-how-small-is-an-atom-compared-to-a-grain"}

curl -H "$T" http://127.0.0.1:8080/reels/<id>                  # poll: status, stage, cuts so far
curl -H "$T" http://127.0.0.1:8080/reels/<id>/report           # the full run.json
curl -H "$T" -o reel.mp4 http://127.0.0.1:8080/reels/<id>/reel.mp4
curl http://127.0.0.1:8080/health                              # {"ok":true}, no token
```

**`POST /reels` body:** JSON, at most 32 KB, no other fields allowed.

| field      | required | rules                                                                      |
| ---------- | -------- | -------------------------------------------------------------------------- |
| `request`  | yes      | 1-4000 characters, passed to the engine word for word                      |
| `template` | no       | a template name (see [Templates](#templates)); an unknown name returns 400 |
| `seconds`  | no       | 30-90                                                                      |

**`GET /reels/<id>`** returns `id`, `status`, `stage`, `created`, `started`, `finished` and `error`.
- **`cuts`:** one entry per cut made so far, with `n`, `template`, `film_s`, `wall_s`, `usd`, `blocking_fails` and `review {approve, scores}`.
- **`report`:** null until the job ends, then `approved`, `selected`, `loop_end`, `totals` and `error`.

**`GET /reels/<id>/reel.mp4`** serves the selected cut. It returns 404 until a cut is selected.

**Status codes:**

| code | meaning                                                    |
| ---- | ---------------------------------------------------------- |
| 202  | job queued                                                 |
| 400  | bad body, with the reason in `error`                       |
| 401  | missing or wrong token                                     |
| 404  | unknown id, or no report or reel yet                       |
| 413  | body over 32 KB                                            |
| 500  | internal error; the details go to the server's stderr only |

**Job states:**
- **`status`** is `queued`, `running`, `done` or `failed`.
- **`stage`** says where a running job is: `queued`, `sync`, `intake`, `cut-<n>`, `gates`, `review-<n>`, `round-<n>`, then `done` or `failed`.

Jobs run one at a time in the order they were posted. Ctrl+C or SIGTERM on `serve` kills the engine's process tree. After a crash of `serve` itself, the engine can keep running (and spending) until the next `serve` or `make` takes `engine.lock`, which kills the orphaned engine first. The next `serve` resumes the job that was running, from its last checkpoint.

## Writing a good request

- **One subject, one question.** "Why is a day on Venus longer than its year?" works better than a list of topics.
- **Say what kind of reel you want** when it isn't obvious: "a funny 30-second sketch about...", "explain to a 10-year-old...". Intake reads the audience, goal and tone from the request.
- **Name a template when you know which one fits.** Intake picks one otherwise, and sometimes picks badly. In CP5 it routed a scale question to mirror-parable and the engine failed; the same request with `template: kurzgesagt` worked.
- **Length:** the CLI clamps `--seconds` to 30-90; the API returns 400 outside 30-90. Without a length, intake uses one the request states, else picks 30-90 s for the subject (45 s if it gives none).
- **Fit:** check the intake's `fit` in the report. `none` means no template really suits the request, and the report flags it (the CP5 ad request got script-sketch with fit `none`). Rephrase the request or name a template.
- **Plain text only.** The request goes into the engine as the brief, so put no instructions to the harness in it.

## Templates

These are the originals in `templates/`. A job always uses the working copy in `$CUTROOM_VAR/templates/`.

| template                        | use it for                                                                                  | not for                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `breakdown-explainer`           | one real physical thing (organ, machine, device, structure) or a procedure, part by part    | abstract ideas, stories, history, comedy                  |
| `comic-story`                   | a character living through a real experience (a condition, habit, job), with true facts     | machines or anatomy part by part                          |
| `countryball-map-story`         | wars, independence, borders, empires, treaties: countries on a map                          | machines, biology, personal stories                       |
| `dan-koe`                       | ideas, principles, mental models, habits, life and work lessons (minimal line art)          | machines, history, news, products, data, stories          |
| `globe-zoom-explainer`          | places, distances and extremes on Earth: coordinates, routes, time zones, map distortion    | machines, history without a map, biology                  |
| `kurzgesagt`                    | sizes, distances and numbers in space, nature, the body, physics: how big, small, far, many | history, people, machines, procedures                     |
| `low-poly`                      | true, emotional or strange stories of animals, people, places, odd events (PS1 look)        | mechanism explainers, data, lists, how-tos                |
| `lowpoly-chain-explainer`       | families of kinds that differ by one change each, methods built step by step                | character stories, history, recipes, anatomy              |
| `lowpoly-cutaway-explainer`     | how a machine, device, organ, natural feature or building works inside                      | stories, history, many-thing comparisons, maps            |
| `minecraft`                     | how a thing is built or grew in stages, block by block                                      | comparisons, history with no physical result, ideas       |
| `mirror-parable`                | an everyday small case that mirrors and explains a big real thing                           | (no exclusions listed)                                    |
| `pixel-sim-explainer`           | explosions, collapses, chain reactions, outbreaks: a micro cause with a macro effect        | anatomy, procedures, history, stories                     |
| `script-sketch`                 | comedy sketches, parodies, dramatic scenes, dialogues                                       | explainers, facts                                         |
| `sourced-cutaway-explainer`     | energy, industry, infrastructure, geology: "how does X really work / how is X made"         | stories, comedy, history, lists of kinds                  |
| `speedramp-mechanism-explainer` | machines whose cycle is too fast to see (motors, pumps, printers, screens)                  | slow processes, history, biology                          |
| `stick-figure`                  | everyday "why do people...?", myths with a real reason, body quirks, "what would happen if" | machine breakdowns, many-item comparisons, long stories   |
| `toon3d-story`                  | funny true anecdotes with a twist (a loophole, a lucky deal, an odd bet), real 3D toon look | mechanism explainers, lists, data, sad stories            |
| `toon3d-story-2d`               | the same stories in a toon-shaded cartoon look                                              | mechanism explainers, lists, data, sad stories            |

Each template's `## about` section in `templates/<name>.md` is the full description, and it is what intake reads when it chooses.

**Working copies and patches.** The harness never writes to `templates/`. A template round patches the working copy and keeps the version before the patch in `$CUTROOM_VAR/templates/history/<name>/<k>.md`, with `<k>.json` holding the patch, its reason and before/after grades. Later jobs on that var use the patched copy. To go back to the original, delete `$CUTROOM_VAR/templates/<name>.md` and run `node src/cli.ts sync`: a missing copy is copied fresh from the original.

**Sync.**
- **New original:** copied into the var.
- **Changed original, copy never patched:** the copy is replaced.
- **Changed original, copy patched or edited:** reported as a `conflict`, and the copy is kept. `sync` exits 1, and `serve` logs the conflict.

New templates and fixes to originals are developer work in Claude Code: the `/new-template` and `/fix-template` skills.

## Voices

The engine picks a voice from `CUTROOM_VOICE_MODELS`, a comma-separated list tried in order. If a voice is refused (no credit, rate limit) or fails the pitch gate, the job moves to the next one.

| key                       | model                                  | billed to                                                    |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `eleven-v4`, `eleven-v3`  | ElevenLabs v4 / v3                     | ElevenLabs if `ELEVENLABS_API_KEY` is set, else OpenRouter   |
| `eleven-v4-turbo`         | ElevenLabs v4 turbo                    | OpenRouter                                                   |
| `heygen-paid`             | HeyGen Voice 1 Turbo                   | OpenRouter (cheap)                                           |
| `heygen`                  | HeyGen Voice 1 Turbo, free tier        | free, rate-limited per day; **the free tier ends 2026-11-30** |
| `minimax`                 | MiniMax speech 2.8 turbo               | OpenRouter                                                   |
| `gemini-tts`              | Gemini 3.8 Flash TTS                   | OpenRouter                                                   |
| `kokoro`                  | Kokoro 82M                             | OpenRouter (very cheap)                                      |

- **Production default** (when `CUTROOM_VOICE_MODELS` is unset): `eleven-v4, heygen-paid, heygen, minimax, gemini-tts, eleven-v4-turbo, eleven-v3, kokoro`.
- **Development list,** cheap first: `heygen,heygen-paid,minimax,gemini-tts,eleven-v4,eleven-v4-turbo,eleven-v3,kokoro`.
- **Kokoro** stays last because it never passes `voice_pitch`, so a Kokoro cut is never approved. It is there so a job still returns a cut.

## Where the output goes

Everything a job writes is under `$CUTROOM_VAR` (default `<repo>/var`, never committed):

```
$CUTROOM_VAR/
  runs/
    index.jsonl                 one line per finished job: id, date, template, fit, cuts, selected, approved, cost, time
    <id>/                       one job; <id> = <yyyymmdd-hhmmss>-<request slug>
      report.md                 read this first: verdict, selected cut, intake, cuts table, gates, fixes, costs
      run.json                  the full record (design §7): every cut, gate, review, round, voice switch, cost
      job.json                  status, stage, timestamps, error (what the API's status route reads)
      reel-v<n>/reel.mp4        cut n: 1080x1920, 30 fps, AAC; the selected one is named in report.md
      reel-v<n>/CREDITS.md      the sources and licences used in that cut
      reel-v<n>/audio.json      voice and music measures (pitch spread, music fit, voice over music)
      review-<n>/shot<k>.jpg    the frames the review looked at
      review-<n>.json           the review: approve, scores, fixes
      notes-<n>.json            the fixes sent into cut n
      engine-<n>.log            the engine's log for cut n
      calls-<n>.json            the engine's model calls and token costs for cut n
      events.jsonl              every harness event, in order
      loop.json                 the fix loop's saved state (for resume)
      brief.txt                 the brief passed to the engine
      reel-work/                the engine's checkpoints (plan, script, assets, shots, music)
  templates/                    working copies, manifest.json, history/, sync.log
  cache/                        the engine's cache (voice clips, music)
  engine.lock                   present only while an engine runs
```

With the API, `reel.mp4` and `report` serve the same files, so you never need the folder. With the CLI, `make` prints the folder.

## Reading the result

**`report.md`**, from the top:
- **Flags:** not approved, intake fit `none`, a review that found the template wrong, sync conflicts, a failure, no cut produced.
- **Selected cut:** which cut, why it was picked, its template, voice and film length, and the review's summary.
- **Loop:** why the fix rounds stopped.
- **Intake:** the template, fit, audience, goal, tone and target length.
- **Cuts:** one row per cut with template, voice, score sum, blocking FAILs, fact errors, approved, film, wall time and cost.
- **Fix rounds:** one line per round.
- **Scores and gates:** the review's scores and the gate table for the selected cut.
- **Still wrong:** for the selected cut, its failing gates, its fact errors, the steps shipped failing (with the cut they first failed in), and the review's fixes that were not applied.
- **Voice switches, credits, cost and time.**

**Gates.** Gates are measured in code. A `block` gate that fails stops a cut from being approved. An `info` gate is reported only. The first 5 gates are always `block` at the thresholds shown. The 7 frame gates (`same_view` to `alive`) can be set per template by `gate <name>: off | info | <threshold>` lines in its `## checks`; the thresholds shown are their defaults.

| gate               | passes when                                                                     |
| ------------------ | ------------------------------------------------------------------------------- |
| `format`           | 1080x1920, 30 fps, has audio, length = timeline +-0.1 s                         |
| `shipped_failing`  | no shot or asset shipped after failing the engine's own validator, in this cut or unchanged since an earlier one |
| `voice_pitch`      | the voice's pitch spread is at least 4 semitones (not monotone)                 |
| `music_fit`        | the engine's music fit check passed                                             |
| `voice_over_music` | the voice sits 10-14 dB over the music                                          |
| `same_view`        | no view is held longer than 14 s                                                |
| `frame0`           | the first frame has detail (frame 0 shows the subject)                          |
| `blank`            | no blank frames (the 0.2 s cut transitions are not counted)                     |
| `balance`          | at least 33% of the detail is in the lower half, its centre at 0.42-0.62 height |
| `flat`             | at most 60% of the frame is flat colour                                         |
| `static_band`      | neither the top nor the bottom band stays still longer than 14 s                |
| `alive`            | no still gap over 3 s, and at most 20% of the reel is still                     |

**Approved** means the review approved the cut and no blocking gate failed. In CP5, no cut of 20 was approved: the gates and the review are strict and found real faults. The selected cut is still the best of the job.

## Rules for anyone running it

- **Keys** live only in `.env` (at the repo root, or wherever `CUTROOM_ENV_FILE` points). Never print, copy or commit them; the repo is public.
- **Never commit** `var/`, reels, run outputs or reference videos.
- **One engine at a time per machine.** On WSL use a Linux `CUTROOM_VAR` (for example `~/cutroom-var`) so it does not share a lock with Windows.
- **To stop a job,** stop `serve` (Ctrl+C or SIGTERM). Never kill Chrome or node by name. To stop one process tree by hand, use only the engine pid recorded in `$CUTROOM_VAR/engine.lock`, with `taskkill /PID <pid> /T /F` on Windows or the process group on Linux.
- **`templates/`** is edited by developers only.

## Troubleshooting

| symptom                                                          | cause and fix                                                                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing MINIMAX_API_KEY` / `missing CUTROOM_API_TOKEN`          | The key is not in `.env`, or `CUTROOM_ENV_FILE` points at the wrong file.                                                                      |
| A job stays `queued`                                             | The worker is busy with an earlier job, or no `serve` is running on this `CUTROOM_VAR`. (A job waiting for another process's engine shows `running`, stage `cut-<n>`, with `engine.wait` in events.jsonl.) |
| `HTTP 402` ... `budget` in `engine-<n>.log`                      | The voice provider is out of credit. The job falls back to the next voice; top up OpenRouter or add `ELEVENLABS_API_KEY`.                      |
| Job `failed`: "no usable script" / "no usable fact sheet"        | The engine's writer could not fit the request to the template. Re-post naming a better template, or narrow the request.                        |
| `Unrecognized option 'fps_mode'`                                 | FFmpeg is older than 5.1 (Ubuntu 22.04's apt build). Install the build in the README.                                                          |
| `sync` prints `conflict:`                                        | The original changed and the working copy was patched. Compare `templates/<name>.md` with `$CUTROOM_VAR/templates/<name>.md`, then keep it or delete the copy and `sync`. |
| A template got worse after a template round                      | Look at `$CUTROOM_VAR/templates/history/<name>/`; reset by deleting the working copy and running `sync`.                                       |
