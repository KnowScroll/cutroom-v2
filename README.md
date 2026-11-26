# cutroom-v2

Request in, vertical reel out. A TypeScript harness reads the request, picks a template, runs the fastreel engine (MiniMax-M3 writes, plans, draws and animates; voice, fitted music, mix; headless Chrome and FFmpeg render), checks the cut with measured gates and an M3 review, sends fixes back up to three times, and returns the best cut with a report. CLI and HTTP service.

Status: being built. Design: [docs/design.md](docs/design.md). Plan: [docs/plan.md](docs/plan.md). Agent rules: [AGENTS.md](AGENTS.md).
