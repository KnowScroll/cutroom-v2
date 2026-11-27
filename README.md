# cutroom-v2

Request in, vertical reel out. A TypeScript harness reads the request, picks a template, runs the fastreel engine (MiniMax-M3 writes, plans, draws and animates; voice, fitted music, mix; headless Chrome and FFmpeg render), checks the cut with measured gates and an M3 review, sends fixes back up to three times, and returns the best cut with a report. CLI and HTTP service.

Status: being built. Design: [docs/design.md](docs/design.md). Plan: [docs/plan.md](docs/plan.md). Agent rules: [AGENTS.md](AGENTS.md).

## Use

Setup: `npm ci`, a `.env` at the repo root (keys; for `serve` also `CUTROOM_API_TOKEN`). On Linux see [Running on Linux](#running-on-linux).

CLI (`node src/cli.ts <command>`):

```
make "<request>" [--template <kind>] [--seconds <n>]   one job in the foreground; prints the run folder and report path
serve                                                  the HTTP API and the queue worker
status <id>                                            status, stage and error of a job
sync                                                   bring var/templates in line with templates/ and print what changed
```

`serve` binds `CUTROOM_HOST:CUTROOM_PORT` (default `127.0.0.1:8080`), syncs the templates, and runs one job at a time in the order they were posted. Stopping it (Ctrl+C, SIGTERM) stops the engine's process tree; a job left running is resumed by the next `serve`.

HTTP API (every route but `/health` needs `Authorization: Bearer $CUTROOM_API_TOKEN`):

```
curl -H "Authorization: Bearer $CUTROOM_API_TOKEN" -H "content-type: application/json" \
  -d '{"request":"how big is the Sun", "seconds":45}' http://127.0.0.1:8080/reels
# 202 {"id":"20261127-101500-how-big-is-the-sun"}

curl -H "Authorization: Bearer $CUTROOM_API_TOKEN" http://127.0.0.1:8080/reels/<id>            # status, stage, cuts so far, report when finished
curl -H "Authorization: Bearer $CUTROOM_API_TOKEN" http://127.0.0.1:8080/reels/<id>/report     # run.json
curl -H "Authorization: Bearer $CUTROOM_API_TOKEN" -o reel.mp4 http://127.0.0.1:8080/reels/<id>/reel.mp4   # 404 until a cut is selected
curl http://127.0.0.1:8080/health
```

Body: `request` 1-4000 characters; `template` (optional, a name in `var/templates`, else 400); `seconds` (optional, 30-90).

## Running on Linux

Verified on Ubuntu 22.04 in WSL. Deploying to a VM (service unit, hosting) is out of scope (design D22).

### Packages

| Package          | Minimum | Notes                                                                                                                                                  |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node             | 22.18   | Runs the `.ts` files directly; no build step. Tested with 22.23.                                                                                       |
| FFmpeg + ffprobe | 5.1     | The frame audit uses `-fps_mode`. Ubuntu 22.04's apt FFmpeg is 4.4 and fails with `Unrecognized option 'fps_mode'`; use a newer build. Tested with n8.1. |
| Google Chrome    | stable  | Any current stable; tested with 158. The engine finds `/usr/bin/google-chrome`; set `CHROME_PATH` for another binary.                                  |

Install as root (only this block needs root; run everything after it as a normal user, because Chrome refuses to run as root without `--no-sandbox`, which the engine does not pass):

```sh
apt-get update && apt-get install -y curl ca-certificates gnupg git xz-utils

# Node 22.23.5, checked against the sha256 from https://nodejs.org/dist/v22.23.5/SHASUMS256.txt
curl -fsSL -o /tmp/node.tar.xz https://nodejs.org/dist/v22.23.5/node-v22.23.5-linux-x64.tar.xz
echo "cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8  /tmp/node.tar.xz" | sha256sum -c -
tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1

# FFmpeg n8.1.3 (static build, release autobuild-2026-10-31-12-59; the apt package is too old),
# sha256 from that release's checksums.sha256
curl -fsSL -o /tmp/ff.tar.xz https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/autobuild-2026-10-31-12-59/ffmpeg-n8.1.3-27-g8dca1586f4-linux64-gpl-8.1.tar.xz
echo "41e9c565594c390622cf968d82fa4135d9e9a11d06c1515644288cbc844e3380  /tmp/ff.tar.xz" | sha256sum -c -
tar -xJf /tmp/ff.tar.xz -C /tmp && cp /tmp/ffmpeg-n8.1.3-*/bin/ffmpeg /tmp/ffmpeg-n8.1.3-*/bin/ffprobe /usr/local/bin/

# Google Chrome stable
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor --yes -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt-get update && apt-get install -y google-chrome-stable
```

The fonts are in `fonts/` and the stage loads them itself; no system fonts are needed. `studio/` is not needed.

### Set up and check

Clone into the Linux filesystem (on WSL, not under `/mnt/c`):

```sh
git clone https://github.com/KnowScroll/cutroom-v2.git ~/cutroom-v2 && cd ~/cutroom-v2
npm ci
npm run check
```

### Environment

Keys live in a `.env` file, at the repo root or wherever `CUTROOM_ENV_FILE` points (on WSL the Windows file works, as `/mnt/c/.../.env`). Never copy keys into the repo. Needed: `MINIMAX_API_KEY`. Optional: `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY`. For `serve`: `CUTROOM_API_TOKEN`. Other variables: `CUTROOM_VAR` (state folder, default `<repo>/var`), `CUTROOM_HOST` and `CUTROOM_PORT` (default `127.0.0.1:8080`), `CUTROOM_VOICE_MODELS`, `CHROME_PATH`.

On WSL use a Linux `CUTROOM_VAR`: process ids differ between Windows and WSL, so the two must not share `var/engine.lock`.

```sh
export CUTROOM_ENV_FILE=/mnt/c/Users/<you>/cutroom-v2/.env   # or a .env at the repo root
export CUTROOM_VAR=$HOME/cutroom-var
```

### Make a reel

The commands and the HTTP API are under [Use](#use); on Linux they run the same way (`node src/cli.ts make "..."`, `node src/cli.ts serve`). A real job costs money and takes a while; one engine run at a time per machine (`$CUTROOM_VAR/engine.lock`).

### Where runs live

`$CUTROOM_VAR/runs/<id>/` holds one job: `run.json`, `report.md`, and per cut `reel-v<n>/reel.mp4` with the engine's `reel-work/` checkpoints. `$CUTROOM_VAR/runs/index.jsonl` has one line per finished job. Working template copies are in `$CUTROOM_VAR/templates/`, the engine's cache in `$CUTROOM_VAR/cache/`.
