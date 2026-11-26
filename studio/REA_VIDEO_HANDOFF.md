# Prompt: turn reference reels into reusable templates with rea-video (fastreel's method)

You are setting up a "reference reel to template" workflow in my video pipeline, the way the fastreel team does it. Read this whole brief before doing anything; it holds the setup, the commands, the exact loop we run, our style-extraction add-on, and every lesson we paid for.

## 1. What this is and why

- Goal: a creator gives a reference short (a vertical reel whose look and structure they like). We take it apart once, write a reusable TEMPLATE for that kind of reel, and from then on the pipeline's own generator makes any number of new reels on new topics in that style.
- rea-video (https://github.com/JuneYaooo/rea-video, Python, Chinese-first agent docs) reverse-engineers how a video was made: cuts and transitions, per-shot keyframes, whether each shot is live action / AI / 3D / code render / 2D animation, subtitles and on-screen text timelines, voice vs music vs effects stems, rhythm, a per-shot breakdown and a compact model-readable pack (VIDEO.md + video/*.md).
- Our addition (the "style aspect"): rea-video did not describe HOW a picture is drawn or its colour rules. We added `rea_video/aspects/style.py`, which measures the art style on every shot and writes `video/style.md`. That file is the main input for the template's look.
- What we learned (three tests on the same reference and brief): the winning split is "a strong vision model (Claude) analyses the reference and WRITES the template once; the cheap generator model (MiniMax-M3 for us) makes every reel from that template". Letting the cheap model write the template, or pasting the raw VIDEO.md into the generator, both lost the look badly (smooth illustration instead of pixel art, copied topic, broken text panels). Cost for us: about $2 to $3 of Claude per reference (once), then about $0.17 to $0.24 of MiniMax per reel.

## 2. Setup

1. Clone rea-video and apply our two patches (the style aspect), which you will receive as `rea-video-patches/0001-*.patch` and `0002-*.patch`:
   ```
   git clone https://github.com/JuneYaooo/rea-video.git && cd rea-video
   git checkout -b fastreel-style
   git am ../rea-video-patches/*.patch        # adds rea_video/aspects/style.py, registers it, adds video/style.md to the pack
   ```
2. Python 3.12 venv, kept apart from your pipeline (nothing in it runs when a reel is made):
   ```
   py -3.12 -m venv .venv                                   # or python3.12 -m venv .venv
   .venv/Scripts/python -m pip install -e "./rea-video[ocr,asr]"
   .venv/Scripts/python -m pip uninstall -y opencv-python
   .venv/Scripts/python -m pip install --force-reinstall --no-deps "opencv-python-headless>=4.8,<5"
   ```
   ffmpeg must be on PATH. First run downloads about 380 MB of models (stem separation, speech recognition) to `~/.cache/rea-video/models`.
3. Windows: rea-video prints Chinese; without UTF-8 mode it crashes. Always `export PYTHONUTF8=1 PYTHONIOENCODING=utf-8` (Git Bash) before running it, and open its JSON task files with `encoding='utf-8'`.
4. Its agent guide is `rea-video/skills/rea-video/SKILL.md` (Chinese). Read it; the task JSON instructions are also in Chinese.

## 3. The analysis loop (an image-capable agent is the "eyes")

Folder layout we use: `studio/references/<ref>.mp4`, outputs in `runs/<ref>/analysis-claude/`.

Step 0, look first: a contact sheet of the reference with ffmpeg (`ffmpeg -i ref.mp4 -vf "fps=1,scale=180:-2,tile=10x6" -frames:v 1 sheet.jpg`) and a few full-resolution frames. Form your own picture before the tool's.

Step 1, survey (cuts, transitions, keyframes), answered by you:
```
.venv/Scripts/rea-video survey ref.mp4 -o runs/<ref>/analysis-claude
```
It prints `status: waiting` with task JSON files, images, and answer files to write. Look at every image, write each answer file in its compact "JEV" format, rerun the same command, repeat until `status: done` (usually 3 rounds: overview gaps, zoomed gaps, keyframes).
- Overview answers: `{"shots_estimate": {"answer": N, "range": [a, b]}, "gaps": {"g06": "transition zoom .85", "g09": "cut", "g12": "busy .7"}}`. Every gap with a red line (detector cut) must be answered. `busy` = same subject that moved or changed; `transition`/`cut` = a different subject; `unsure` = zoom in next round.
- Zoom answers add `"scenes": {"r2_01": "00 thing A, 06 thing B"}`.
- Keyframe answers: `{"look": "code_render .6", "shots": {"shot_002": {"frames": {"00": "first", "04": "framing .7"}}}}`; shots you accept need no entry.
- Watch for false cuts: in our ref2 the detector found a "cut" every 1.17 s; it was a translucent scan beam sweeping over the camera in one continuous take. Say so in the answers and in the template.

Step 2, decompose:
```
.venv/Scripts/rea-video decompose ref.mp4 -o runs/<ref>/analysis-claude --lang en
```
Produces `VIDEO.md` (read this first, about 2k tokens), `video/{timeline,content,rhythm,style,sound,packaging,cast,look,remake}.md`, `shots/*_strip.jpg` and contact sheets, `storyboard.jpg`, `stems/`, `report.html`. Do not read `breakdown.json` (100k+ tokens).

Step 3, review (you fill the judgements pixels cannot):
```
.venv/Scripts/rea-video review runs/<ref>/analysis-claude      # writes review_tasks.json + review_answers.json template
# fill review_answers.json (write it with a small Python script, utf-8)
.venv/Scripts/rea-video apply-review runs/<ref>/analysis-claude --by claude --lang en
```
Fill, for EVERY shot: `label_probs` (e.g. `{"code_render": .75, "cg_3d": .25}`), `image_source`, 2 to 3 `evidence` lines, a concrete `description` (what is on screen, sizes, colours, what moves), `narrative` (`role` one of hook / context / info / proof / turn / payoff / cta / mood, plus a one-line `point` that holds without the topic). Top level: `aspects.style` (the 9 fields below), `story` (summary, hook, 2 to 4 highlights with second marks and why they work), `cast` (characters / scenes / props), `packaging.text` kinds (subtitle, label, title, watermark ...). Look at `shots/*_strip.jpg` and take full-resolution ffmpeg crops of text, panels and subjects before you write.

## 4. The style aspect (our extractor) and how to read video/style.md

Measured by pixels on every sampled frame of every shot:
- Pixel grid: is it pixel art, and how many art pixels span the width (FFT of edge profiles; confidence about 4+ = a real grid).
- Rendering: share of flat fills / gentle gradients / hard edges; dark outlines (share of hard edges that are thin dark rims); checkerboard dithering (read on art-pixel centres); colour count covering 95%; a background-detail score (flat gradient about 0.2, six outlined boxes about 1.45); repeated frames (animation on twos).
- Palette: up to 6 colours per frame in OKLab, merged into colour scenes (stretches whose palettes stay close) and a whole-video palette.
- Written as RELATIONS, not hex: harmony type (analogous, complementary, triadic ...), each hue family's offset from the base hue, lightness and chroma by role (ground, base, support, accent), hue-shifted ramps, warm / cool split, contrast. The measured hex values are listed "for reference only". A remake picks its own base hue for its topic and keeps the relations.

Filled by the image reader (you) in `aspects.style`, because pixels cannot settle them: `render_style`, `outline`, `shading`, `shape_language`, `texture`, `type_ui`, `motion_style`, `signature`, `do_not_copy` (always list the watermark, the topic, its words and numbers).

Known blind spot: thin bright overlays (1 to 3 px lines, small dots, keyword colours) cover too few pixels to survive the palette merge; on our ref2 the palette came back all neutrals. Measure those yourself: sample saturated pixels from full-resolution frames and convert to OKLCH (a 30-line Python script with PIL), then write them as relations (lightness, chroma, hue offsets between them).

## 5. Writing the template (where the quality comes from)

Name the template by the KIND of reel, never the topic (e.g. `pixel-sim-explainer`, `lowpoly-chain-explainer`). Keep a fix log next to it (`<kind>.log`, epoch 0 = created from reference X, then one entry per fix round: what was seen, what changed).

Our template sections (adapt to your generator's steps): about (what it is for and not for), look, motion, plan (structure as beats), assets, shots, checks (machine-enforced keys), director (what the reviewer flags). Rules that made the difference:
- Never copy the reference's topic, objects, words, numbers, handle or watermark, not even as examples: the generator copies examples literally (a colour example became the on-screen labels "PINK" and "BLUE"; a "wrong/right" line example with topic words leaks the topic). Use placeholders like [named thing].
- Turn style.md into concrete numbers the generator can draw: colour as OKLCH relations by role; sizes and positions in px on the final 1080 x 1920 frame; line weights; how many of what. "A perspective grid" fails; "12 to 16 lines to a vanishing point on the horizon at y 760 to 800, cross lines at y = horizon + 50 * (k + s)^1.6, 2 px at 25 to 35% opacity" works.
- Give drawing TECHNIQUES, not adjectives: pixel art = the engine downsamples the finished frame to 180 art pixels across and scales back up, text drawn crisp after; low-poly 3D in 2D canvas = flat polygons in 3 tones of one neutral, light from top-left, no outlines; mountains = whole triangles with apex, base width from height, a light and a dark face.
- Structure from content.md / timeline.md / rhythm.md as BEATS with the topic stripped (hook, mechanism, buildup, climax ... or hook, link, twist, payoff, loop), each with its line shape and what is on screen.
- Fixed layouts with coordinates for every text element (header, data card, name tag, caption band) and exact panel geometry; text centred on its panel's centre; measure text and shrink to fit.
- Clarity beats density (our users' hardest feedback): one subject per frame; a comparison as separate boxes with identical layout; real numbers with units on screen (range, speed, size ...), the same quantities for every item, values that start with digits; no clutter.
- If your generator writes canvas code against helper functions, spell out their exact signatures in the template. Our engine's `h.rng(seed)` returns a generator FUNCTION and `h.rr` / `h.poly` take no ctx; the model guessed wrong, so mountains (NaN heights) and panels silently vanished for two rounds.
- Prefer machine checks over prose where your engine supports them (shot count, beat names, required beats, pixel grid, hero size); the model skips prose rules, validators do not.

## 6. Making reels and fixing the template (the loop)

1. Make a reel from the template with your generator (we: `node engine/asset_reel.mjs "<brief>" --template <kind> --seconds 45 --out var/runs/<slug>-e1`, about 10 to 15 min). Never run two at once.
2. Review: a frame row per shot (6 frames each), the run log (validator rejections and "shipped failing" shots), the lines, length and cost per phase.
3. Grade against the reference with rea-video on the reel, then compare the numbers (rhythm: cuts per minute, frame-to-frame change; rendering: grid, flat fills, outlines, held frames; colour: key, harmony, contrast). Use a LIGHT decompose for grading: `--no-stems --no-asr --no-speakers --no-packaging --no-ocr`; the full run (stem separation) is slow and was killed for low memory on a 16 GB machine.
4. Fix the TEMPLATE (never hand-fix the reel), log the epoch, remake. Ask a human after 3 rounds.

## 7. Using a cheaper model as the eyes (optional)

rea-video accepts any OpenAI-compatible vision model: `REA_VLM_BASE_URL`, `REA_VLM_API_KEY`, `REA_VLM_MODEL`, then `decompose ... --vlm`. We tried MiniMax-M3 through a small proxy (it stripped thinking from answers, raised the answer budget to 16000 tokens and retried once without thinking; since dropped from the repo). It costs about $0.16 per reference instead of $2, but its breakdowns produced weaker templates, so we keep Claude for analysis and template writing.

## 8. What to deliver back to me

- rea-video installed with the style patches, a run on one of my reference reels (survey to done, decompose, review applied), and its `video/style.md`.
- A first template for that reference's kind plus its log, one reel made from it, the review and grade, and a list of anything my pipeline lacks that the template needed (for us: captions with keyword colour, a measured speaking rate per voice, helper signatures in the prompts).
