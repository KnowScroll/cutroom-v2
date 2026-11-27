# cutroom-v2

Request in, vertical reel out. A TypeScript harness reads the request, picks a template, runs the fastreel engine (MiniMax-M3 writes, plans, draws and animates; voice, fitted music, mix; headless Chrome and FFmpeg render), checks the cut with measured gates and an M3 review, sends fixes back up to three times, and returns the best cut with a report. CLI and HTTP service.

Status: being built. Design: [docs/design.md](docs/design.md). Plan: [docs/plan.md](docs/plan.md). Agent rules: [AGENTS.md](AGENTS.md).

## Use

Setup: `npm ci`, a `.env` at the repo root (keys; for `serve` also `CUTROOM_API_TOKEN`). Linux notes come with #17.

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
