# studio: reference reel -> template

Turns a reference reel (a short whose look and structure we want) into a fastreel template. Claude Code is the eyes and the writer: it answers rea-video's image questions, reviews every shot and writes `templates/<kind>.md`. MiniMax-M3 makes every reel through `asset_reel.mjs`. Nothing here runs while a reel is made; the lab produces template files, and grades reels afterwards.

Why this split: three tests on the same reference and brief (2026-11-18). Claude reading the reference and writing the template, M3 making the reels, was the only one whose reel kept the reference's look (pixel grid, rendering and colour closest). M3 writing its own template copied the reference's scene and broke the engine's checks; pasting rea-video's raw VIDEO.md into the generator lost the look entirely. Claude costs about $2 to $3 per reference (once); each reel costs about $0.17 to $0.25 of MiniMax.

## Layout

```
studio/
  README.md                this file
  REA_VIDEO_HANDOFF.md     a self-contained prompt for another team to set up the same workflow
  method-results.md        the three-way test (2026-11-18) behind the Claude-writes-template, M3-makes-reels split
  rea-video/               clone of github.com/JuneYaooo/rea-video, branch fastreel-style (own git repo, not committed here)
  rea-video-patches/       our two commits on that branch as patches (the style aspect); apply with git am
  .venv/                   Python 3.12 environment for rea-video (not committed)
  references/              the reference .mp4 files (not committed)
  refs/<ref>/              committed part of each reference's analysis: breakdown.json (for grading), VIDEO.md +
                           video/*.md (what a template is written from), review_answers.json, storyboard.jpg
                           each template names its own under ## checks ("reference analysis:")
  runs/                    scratch: full analysis runs, crops, contact sheets, grades (not committed; old runs
                           archived outside the repo)
  tools/
    ref_prep.sh            contact sheet + full-resolution frames of a reference
    oklch_colours.py       colours of thin overlays (lines, dots, keywords) that rea-video's palette drops, in OKLCH
    save_ref.sh            copy a finished analysis from runs/ into refs/<ref>/
    run_reel.sh            make one reel with MiniMax, waiting while any other reel runs
    shot_rows.sh           6 frames per shot of a reel, as review sheets
    grade_reel.sh          grade a reel against its template's reference (light rea-video run + compare.py), about 1 min
    compare.py             the numbers table and rhythm / rendering / colour distances
    bg_render.mjs          render a reel's kit background alone in the engine's stage (finds drawing bugs)
    claude_cost.cjs        Claude Code token cost of a session, split into phases by marker regexes
```

## Pipeline

In Claude Code: `/new-template studio/references/<ref>.mp4 "<first brief>"` (`.claude/skills/new-template`) for a new template, `/fix-template <kind> "<brief>"` (`.claude/skills/fix-template`) for fix rounds on any template. The steps they run:

```
1. look       bash studio/tools/ref_prep.sh studio/references/<ref>.mp4
2. analyse    (from studio/, PYTHONUTF8=1)
              .venv/Scripts/rea-video survey references/<ref>.mp4 -o runs/<ref>/analysis-claude      # repeat, answering each round
              .venv/Scripts/rea-video decompose references/<ref>.mp4 -o runs/<ref>/analysis-claude --lang en
              .venv/Scripts/rea-video review runs/<ref>/analysis-claude                                  # Claude fills review_answers.json
              .venv/Scripts/rea-video apply-review runs/<ref>/analysis-claude --by claude --lang en
              python tools/oklch_colours.py runs/<ref>/crops/*.png
              bash tools/save_ref.sh <ref>
3. write      templates/<kind>.md (with "reference analysis: studio/refs/<ref>" under ## checks) and <kind>.log
4. make       bash studio/tools/run_reel.sh "<brief>" <kind> <slug>-eN
5. review     bash studio/tools/shot_rows.sh var/runs/<slug>-eN-v2 <dir>; grep "rejected|using the last" var/runs/<slug>-eN.log
              node studio/tools/bg_render.mjs var/runs/<slug>-eN-work/kit.js out.png <background>
6. grade      bash studio/tools/grade_reel.sh <slug>-eN          -> var/runs/<slug>-eN-grade.md
7. fix        edit the template, log the epoch, back to 4 (a human looks after 3 rounds)
```

Template rules learnt the hard way (details in each template's `.log`): never copy the reference's topic, words, numbers or watermark, not even as examples (M3 copies examples); colour as OKLCH relations by role, sizes as px on 1080 x 1920; drawing techniques, not adjectives; structure as topic-free beats; one subject per frame, comparisons in identical boxes, real numbers with units on screen; spell out helper signatures M3 gets wrong (`h.rng(seed)` returns a function; `h.rr` / `h.poly` take no ctx); prefer `## checks` keys over prose.

## What we use of rea-video

| Part | Used for | When |
|---|---|---|
| `survey` | true cuts, transitions and keyframes, Claude answering its image questions instead of a vision model | once per reference |
| `decompose` | shot list, rhythm and change curve, on-screen text timeline (OCR), voice / music / effects stems, speech-to-text script, tempo, and the VIDEO.md pack | once per reference |
| our style aspect | the art style -> `video/style.md` (below) | once per reference |
| `review` + `apply-review` | Claude's per-shot judgement (how it is made, description, narrative role), story, cast, packaging and the judged style fields, merged into the breakdown | once per reference |
| `decompose --no-stems --no-asr --no-speakers --no-packaging --no-ocr` + `tools/compare.py` | grading a reel against its reference: rhythm, rendering and colour distance (0 = same) | every reel |

Not used: the VLM mode (`--vlm`), and the remake side (`plan`, `remake`, `capsule*`, `code-remake`, `drive`, `assemble`, frame `compare`): fastreel never recreates the reference, it makes new reels on new topics in its style.

## Our style aspect (`rea_video/aspects/style.py`)

Plugs into rea-video's aspect system (like `lighting` and `grade`) and measures, on every sampled frame of every shot:
- **Pixel grid:** whether it is pixel art and how many art pixels span the width (FFT of edge profiles).
- **Rendering:** shares of flat fills, gentle gradients and hard edges; dark outlines; checkerboard dithering (on art-pixel centres); colours covering 95%; fastreel's background-detail score; repeated frames (animation on twos).
- **Palette:** up to 6 colours per frame in OKLab, merged into colour scenes and a whole-video palette, written as relations that hold for any base hue: harmony, each hue family's offset from the base hue, lightness and chroma by role (ground, base, support, accent), hue-shifted ramps, warm / cool, contrast. Measured hex values are listed for reference only.

The image reader fills what pixels cannot settle (`aspects.style` in review_answers.json): render_style, outline, shading, shape_language, texture, type_ui, motion_style, signature, do_not_copy. All of it lands in `video/style.md`. Blind spot: thin bright overlays cover too few pixels to survive the palette merge; measure them with `tools/oklch_colours.py`.

## Setup (once)

```
cd studio
git clone https://github.com/JuneYaooo/rea-video.git && cd rea-video && git checkout -b fastreel-style && git am ../rea-video-patches/*.patch && cd ..
py -3.12 -m venv .venv
.venv/Scripts/python -m pip install -e "./rea-video[ocr,asr]"
.venv/Scripts/python -m pip uninstall -y opencv-python
.venv/Scripts/python -m pip install --force-reinstall --no-deps "opencv-python-headless>=4.8,<5"
```
FFmpeg on PATH. The first run downloads about 380 MB of models to `~/.cache/rea-video/models`. On Windows always `export PYTHONUTF8=1 PYTHONIOENCODING=utf-8` before rea-video (it prints Chinese). rea-video's own agent guide: `rea-video/skills/rea-video/SKILL.md` (Chinese).

## Results so far

- `pixel-sim-explainer` (reference `refs/test1`, brief "supernova explosion"): epoch 3 reel 43.8 s, $0.237, every shot passed every check; pixel grid 180 like the reference; still much less motion (frame change 0.49 vs 1.82). Later epochs: see `templates/pixel-sim-explainer.log`.
- `lowpoly-chain-explainer` (reference `refs/ref2`, brief "Types of missiles: Ballistic, Cruise, Hypersonic"): epoch 4 reel 45.4 s, $0.171: one missile per frame, a card of real numbers each, comparison in boxes; distance from the reference: rendering 0.16, colour 0.10, rhythm 0.58 (the reference never stops moving; its regular "cuts" are a scan beam).
