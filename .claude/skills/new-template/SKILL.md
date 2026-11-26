---
name: new-template
description: Make a new fastreel reel template from a reference reel (an .mp4): Claude Code analyses it with rea-video and writes templates/<kind>.md, MiniMax-M3 makes the reels with asset_reel.mjs, then fix rounds until it is right. Use when the user gives a reference video and wants "a template like this", "reels in this style", or runs /new-template <ref.mp4> "<first brief>".
---

# new-template: reference reel -> template -> reels

Division of work: YOU (Claude Code) are the eyes and the writer: you answer rea-video's questions by looking at images, and you write the template. MiniMax-M3 makes every reel (`asset_reel.mjs`). Never call a model API yourself for this. Existing templates stay as they are; a new template is a new pair of files.

Inputs: a reference `studio/references/<ref>.mp4` and a first brief. If either is missing, ask.

## Read first (every time)
- `studio/README.md` (tools, commands), `studio/method-results.md` (why this method)
- `templates/_base.md` (what every reel already gets) and one finished template with its log: `templates/lowpoly-chain-explainer.md` + `.log` and/or `templates/pixel-sim-explainer.md` + `.log` (every lesson so far)
- `engine/prompts/facts.txt`, `spine.txt`, `script.txt` (the writer, `engine/writer.mjs`), `plan.txt`, `kit.txt`, `draw.txt`, `shot.txt` (what M3 is told) and the `
- `studio/rea-video/skills/rea-video/SKILL.md` (rea-video's own agent guide, Chinese)

rea-video runs from `studio/` with `export PYTHONUTF8=1 PYTHONIOENCODING=utf-8` (else it crashes printing Chinese); read its JSON with `encoding='utf-8'`.

## 1. Look
`bash studio/tools/ref_prep.sh studio/references/<ref>.mp4`, then Read `studio/runs/<ref>/sheets/contact.jpg` and a few `crops/*.png`. Note the look, the structure, the text and what moves before any tool tells you.

## 2. rea-video analysis (you answer every round)
From `studio/`:
1. `.venv/Scripts/rea-video survey references/<ref>.mp4 -o runs/<ref>/analysis-claude`. While `status` is `waiting`: Read each task JSON's instructions and images, write each answer file in the JEV format the task asks for, rerun. Detector "cuts" at a steady interval may be a periodic effect (a scan beam, a flash) in one continuous take: answer `busy` and say so later.
2. `.venv/Scripts/rea-video decompose references/<ref>.mp4 -o runs/<ref>/analysis-claude --lang en` (run in the background; several minutes).
3. `.venv/Scripts/rea-video review runs/<ref>/analysis-claude`. Fill `review_answers.json` with a Python script you save with Write (utf-8): every shot (`label_probs`, `image_source`, `evidence`, a concrete `description`, `narrative.role` one of hook/context/info/proof/turn/payoff/cta/mood + topic-free `point`), `aspects.style` (render_style, outline, shading, shape_language, texture, type_ui, motion_style, signature, do_not_copy: always the watermark/handle and the topic), `story`, `cast`, `packaging.text` kinds. Look at `shots/*_strip.jpg` and full-resolution ffmpeg crops of text, panels and subjects first.
4. `.venv/Scripts/rea-video apply-review runs/<ref>/analysis-claude --by claude --lang en`.
5. `python studio/tools/oklch_colours.py <crops>`: the style aspect's palette drops thin bright lines, dots and keyword colours; measure them here.
6. `bash studio/tools/save_ref.sh <ref>` (committed copy in `studio/refs/<ref>/`).

Read `refs/<ref>/VIDEO.md`, then `video/style.md` (our style extractor: pixel grid, rendering shares, outlines, dithering, detail, held frames, colour as relations), `content.md`, `timeline.md`, `rhythm.md`, `sound.md`, `packaging.md`.

## 3. Write the template
`templates/<kind>.md`, named by the KIND of reel, never the topic. Sections: about, look, motion, story (optional: this kind's writing rules: the reference's narration shape, line lengths, how it hooks and lands), plan, assets, shots, checks, director (see README for what each feeds). Under `## checks` add `reference analysis: studio/refs/<ref>` plus any engine keys that fit (beats, required beats, shots, hero width, pixel grid ...).
Rules that decided quality so far:
- Never copy the reference's topic, objects, words, numbers, handle or watermark, not even as examples: M3 copies examples literally. Use placeholders like [named thing].
- Colour as OKLCH relations by role (ground, models, accents and their hue offsets, text), never hex; sizes and positions as px on 1080 x 1920.
- Drawing techniques, not adjectives (a formula for a grid, triangle geometry for mountains, the engine's pixel grid for pixel art).
- Structure as beats with the topic stripped, each with its line shape and what is on screen.
- Clarity first (user's standing preference): one subject per frame; comparisons as separate boxes with identical layout; real numbers with units on screen, the same quantities for every item; a fixed layout with exact panel geometry; no clutter.
- State helper signatures M3 gets wrong: `h.rng(seed)` returns a FUNCTION (`const r = h.rng(7); r()`), `h.rr(x, y, w, hgt, r)` and `h.poly([[x, y], ...])` take no ctx.
- Prefer `## checks` keys over prose where the engine can enforce it.
- Sound, from `video/sound.md` (the engine does voice, music and mix the cutroom way, `engine/audio.mjs`): in `## plan` write a `Music:` line with 2 or 3 library feel words (Bright, Driving, Uplifting, Epic, Intense, Action, Bouncy, Humorous, Calming, Relaxed, Suspenseful, Mysterious, Dark, Somber ...), a bpm band of about +-10 around the measured tempo, and which beat is the payoff_shot (the track is fitted to peak there); the narrator's kind of voice (male or female, accent, pace) in the voice line; the sound-effect density from the effects count. A reference with no voice still gets a narrator.
Then `templates/<kind>.log`: "epoch 0" = made from which reference, what was taken, engine limits met.

## 4. Reels and fix rounds (MiniMax makes, you fix)
1. `bash studio/tools/run_reel.sh "<brief>" <kind> <slug>-e1` in the background (waits for any other reel; 10 to 15 min, about $0.17 to $0.25).
2. Review: `bash studio/tools/shot_rows.sh var/runs/<slug>-e1-v2 <scratchpad dir>` and Read a.png / b.png; the lines (`var/runs/<slug>-e1-v2/timeline.json`); rejections and "using the last" in `var/runs/<slug>-e1.log`.
3. Grade: `bash studio/tools/grade_reel.sh <slug>-e1` (writes `var/runs/<slug>-e1-grade.md`: rhythm, rendering and colour distance from the reference).
4. If something looks wrong in the backgrounds: `node studio/tools/bg_render.mjs var/runs/<slug>-e1-work/kit.js <png> <bg name>` shows what kit.bg really paints.
5. Fix the TEMPLATE (never the reel), add an epoch to the log (what the reel got right, each flaw -> fix), run `-e2`. Ask the user before going past 3 rounds.

## 5. Report
Each reel: length, MiniMax cost per phase (`var/runs/<slug>-eN-cost.txt`), the grade distances, what improved and what is still wrong, the contact rows. Name engine changes the template needed (engine files: asset_reel.mjs, stage_asset.html, asset_*_prompt.txt, templates/_base.md, README.md) and ask before touching them. Do not commit unless asked.
