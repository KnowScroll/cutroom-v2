---
name: fix-template
description: Run fix rounds on an existing fastreel template (any of templates/*.md, old or new): MiniMax-M3 makes a reel with asset_reel.mjs, Claude Code reviews it, grades it against the template's reference reel and fixes the template, logging each epoch. Use when the user wants a template improved, a reel from a template reviewed, or runs /fix-template <kind> "<brief>".
---

# fix-template: make, review, grade, fix

Claude Code reviews and edits the template; MiniMax-M3 makes the reels. Never hand-fix a reel: every fix goes into `templates/<kind>.md` so all future reels get it.

Read first: `templates/<kind>.md` and its `.log` (what was already tried), `templates/_base.md`, and the M3 prompts (the writer: `engine/prompts/facts.txt`, `spine.txt`, `script.txt`, `viewer.txt`, `factcheck.txt`; then `plan.txt`, `kit.txt`, `draw.txt`, `shot.txt`). If the template has `reference analysis:` under `## checks`, read that folder's `VIDEO.md` and `video/style.md`.

One round:
1. Make: `bash studio/tools/run_reel.sh "<brief>" <kind> <slug>-eN` in the background (it waits while any other reel runs; never two at once).
2. Review:
   - `bash studio/tools/shot_rows.sh var/runs/<slug>-eN-v2 <scratchpad dir>`, Read a.png and b.png (6 frames per shot).
   - The story: `var/runs/<slug>-eN-work/script.md` (question, answer, each shot's point, facts, link, device, lines, cue, hold, the test viewer's scores and the fact check). Story flaws (a list of facts, a hook that gives the answer away, a vague payoff, a shot the viewer got lost in) are fixed in the template's `## story` or `## plan` beat directions, or need a writer check (describe it to the user). Iterate on the story alone with `node engine/asset_reel.mjs "<brief>" --template <kind> --out var/runs/<slug>-sN --until script` (a few cents).
   - The lines and lengths: `var/runs/<slug>-eN-v2/timeline.json`; the plan: `var/runs/<slug>-eN-work/plan.json`.
   - Validator rejections and shots shipped failing: grep `rejected|using the last` in `var/runs/<slug>-eN.log`. A rejection that repeats across rounds is a template (or engine) problem, not bad luck.
   - Background bugs: `node studio/tools/bg_render.mjs var/runs/<slug>-eN-work/kit.js <png> <bg name>`.
   - Audio, by its measured numbers (nobody can listen): `var/runs/<slug>-eN-v2/audio.json` and the `voice:` / `music:` log lines. Gates: narrator pitch spread >= 4 semitones (3.5 for a calm style), music fit PASS (builds into the payoff, peak within 6 s of it, quiet intro <= 4 s), voice 10 to 14 dB over the music during speech. A music fail that repeats is fixed in the template's `Music:` line (feel words, bpm band, payoff_shot); a flat voice in its voice and tone directions.
3. Grade (only for templates with a reference): `bash studio/tools/grade_reel.sh <slug>-eN` -> `var/runs/<slug>-eN-grade.md`.
4. Fix: edit the template for each flaw (concrete px numbers, layouts, techniques, helper signatures; never topic words or examples M3 could copy). Append an epoch to `templates/<kind>.log`: the reel, its cost and length, what it got right, each flaw -> fix.
5. Ask the user before going past 3 rounds. Report each reel's length, cost per phase (`var/runs/<slug>-eN-cost.txt`) and grade.

Do not edit engine files (asset_reel.mjs, engine/*, templates/_base.md, README.md) or other templates without asking; describe the engine change instead. Do not commit unless asked.
