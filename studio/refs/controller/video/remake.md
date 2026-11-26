---
videomd: 1
part: remake
tokens: 6110
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 7 steps as the original (narrative line under “Content and structure”)
2. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 23 lines with their pace in the script table under “Sound”
3. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
4. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
5. **Music**: find a track at the same tempo and mood (source: to confirm, about 80 BPM, F major)
6. **Sound effects**: 1; place similar ones from a library at the times under “Sound”
7. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**code render / screen capture 11 shots → 1 code project**

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #1–#11 (0.0–59.9s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- particles / point cloud: Three.js particle system (points sampled on the target shape, morph between shapes, bloom), rendered frame by frame with @remotion/three
- glow on dark: Dark ground + gradient-filled text / lines, glow from two stacked CSS drop-shadows or an SVG feGaussianBlur, brightness breathing per frame

Particle shots: what shape the particles form in each shot and how it moves decides whether the remake works; chapter cards, labels and counters go in an HTML layer on top. Build shot by shot from the table below, not one shared background.

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #1 | 0.0–26.5s | particles / point cloud | 0-26.5 s, one continuous diorama on black. A soft elliptical light pool behind a minimal level: two thin dark slabs with bright top edges at mid-frame, a dashed baseline and a thin measuring line with end ticks; a small glowing white figure (disc head, rounded bell body, arm stubs) hops along a dotted parabola and lands one step short, falling. A dark pill tag above names who plays (FRIEND, later YOU); line-art hands hold a grey device below. At 17 s the frame splits down the middle by a 2 px divider: FRIEND left, YOU right, the same failed hop replayed in both halves; under them pill chips: a bright white chip with the useful advice words on the left, a chip with the harsh words that dims to grey on the right. | static | ground #000002 · #18191c #2f2d2f · drawn #393739 #676567 #eceaec #a7a5a7 | — |
| #2 | 26.5–26.8s | glow on dark | 0.3 s fade through black from the diorama to the real-life scene. | pull out 3%/s, picture drifts down | ground #000002 · #020104 #0a080b · drawn #252325 #2a282a #c9c7c9 | — |
| #3 | 26.8–31.1s | particles / point cloud | 26.8-31.1 s: the white figure sits at a dark desk at night under a line-art desk lamp, working on a laptop; the camera pushes in from the room to the laptop screen, a dark product-editor UI with a light PUBLISH button that a cursor clicks. Props drawn as dark fills with 2 px pale outlines. | static | ground #000002 · #0f1012 #1a1d1e #282c2e #3a3d3e · drawn #3c3c3d #dbdbd9 #656564 #999999 | — |
| #4 | 31.1–39.0s | particles / point cloud | 31.1-39.0 s: a dark pill chip with a mint dot reads EXPECTATION top-left; a tilted dark plate with a faint perspective grid; a glowing mint curve rises from the left like an exponential, small nodes along it, a bold white counter with a small grey unit word riding its tip and counting up to a big round number; then the whole curve turns red from its tip and collapses down to the floor. | static | ground #000002 · #090b0f · drawn #242c2d #e3e1e3 #5c6162 #99a1a1 | — |
| #5 | 39.0–41.6s | particles / point cloud | 39.0-41.6 s: the plate tilts and turns into a dark device screen lying flat, then stands up: a huge thin-outlined numeral zero with a small uppercase unit word under it, a small header above. | static | ground #000002 · #080a0e #111316 · drawn #2e2e31 #dfdee0 #5e5e61 #9f9fa1 | ORDERS / 12AM |
| #6 | 41.6–45.6s | particles / point cloud | 41.6-45.6 s: the figure at the desk seen through a lit window at night, a warm desk lamp cone, shelves, pinned papers; the camera pulls out until the window is a small lit rectangle in a dark building facade with a grid of unlit windows. | pull out 2%/s, picture drifts down | ground #000002 · #080c11 #1f1f1f #2d2c2b #40403e · drawn #44413d #dddbda #6c6862 #a7a4a0 | — |
| #7 | 45.6–48.1s | particles / point cloud | 45.6-48.1 s: a dark device screen showing the same listing as a card: a dark picture of a rolled object, its name, a small detail line; the camera pushes into the picture. | static | ground #000002 · #0c0c12 #151519 #2a2a2f · drawn #37363a #e6e5e7 #737276 #adacaf | — |
| #8 | 48.1–48.9s | particles / point cloud | 48.1-48.9 s: push into the listing photo until it fills the frame: a dark rolled-up object on black. | push in 55%/s, picture drifts up | ground #000002 · #0b0b0f #151519 #27292d · drawn #2e2e33 #5b5b60 #e5e4e7 #a5a4a7 | Studio desk mat / First thing you'd say? |
| #9 | 48.9–55.2s | particles / point cloud | 48.9-55.2 s: the rolled object unrolls across the floor and reveals the reel's only full-colour image: a deep blue-teal field with off-white line waves and a warm ochre sun; corner brackets frame it. | static | ground #000002 · #0d0f13 #50646e #3b4b54 #202224 · drawn #303b43 #516670 #dbdcdd #929794 | — |
| #10 | 55.2–55.4s | particles / point cloud | 55.2-55.4 s: quick pull back out to the device card, its picture now the colourful reveal and a check mark line. | static frame, elements move inside it | ground #000002 · #070508 #1a1c1e #3f4041 · drawn #393739 #676567 #ebe9eb #a9a7a9 | Coverphotoupdated / You knew what to tell him. |
| #11 | 55.4–59.9s | particles / point cloud | 55.4-59.9 s: back in the opening diorama: the YOU tag, the figure at the start of the gap, a dark pill chip with the advice word above it; it waits, ready to try again. The reel ends on the hook's composition. | static | ground #000002 · #070508 · drawn #312f31 #4d4b4d #898789 #e7e5e7 | — |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #1 | 0.0–3.0s | #000000 | #171717, centre (0.46, 0.57), radius 0.28 | #393939 #787878 #e9e9e9 | 35 | 0.14 0.40 0.79 0.59 | zoom in 3%/s, turns anticlockwise 0.7°/s, pans (+1.0%, -0.2%)/s |
| scene_02 | #1 | 3.0–26.5s | #000000 | #181818, centre (0.51, 0.57), radius 0.25 | #3b3b3b #7a7a7a #e9e9e9 | 30 | 0.13 0.44 0.77 0.59 | morphs in from the last scene |
| scene_03 | #2 | 26.5–26.8s | #000000 | #090909, centre (0.49, 0.45), radius 0.24 | #303030 #dcdcdc #919191 | 1 | 0.69 0.45 0.72 0.47 | — |
| scene_04 | #3 | 26.8–31.1s | #000000 | #31322d, centre (0.44, 0.54), radius 0.34 | #414340 #747670 #c5c8c0 | 96 | 0.02 0.34 0.94 0.59 | zoom in 30%/s, pans (-6.7%, +2.6%)/s |
| scene_05 | #4 | 31.1–34.6s | #000000 | #1d1d1d, centre (0.49, 0.67), radius 0.17 | #1d2c29 #416357 #8eb4a8 | 30 | 0.12 0.28 0.78 0.54 | zoom in 2%/s |
| scene_06 | #4 | 34.6–37.4s | #000000 | #1c1c1c, centre (0.47, 0.64), radius 0.23 | #1c2e2a #396558 #92bbaf | 68 | 0.12 0.28 0.77 0.53 | morphs in from the last scene |
| scene_07 | #4 | 37.4–39.0s | #000000 | #1c1c1c, centre (0.48, 0.67), radius 0.20 | #321a1d #632f35 #c16d78 | 63 | 0.12 0.28 0.82 0.53 | morphs in from the last scene |
| scene_08 | #5 | 39.0–41.6s | #000000 | #171d1d, centre (0.49, 0.52), radius 0.26 | #2b2e2f #6c6f6f | 28 | 0.32 0.29 0.68 0.61 | zoom out 10%/s, turns anticlockwise 1.3°/s, pans (+0.5%, +0.4%)/s |
| scene_09 | #6 | 41.6–43.4s | #000000 | #575651, centre (0.40, 0.45), radius 0.22 | #44443f #d0d1ca #7c796b | 38 | 0.08 0.28 0.82 0.57 | zoom out 46%/s, pans (+7.3%, +3.6%)/s, points wander |
| scene_10 | #6 | 43.4–45.6s | #000000 | #2d2e2b, centre (0.49, 0.54), radius 0.24 | #3d3d39 #c6c5be #69665d | 21 | 0.34 0.38 0.64 0.50 | morphs in from the last scene, zoom out 10%/s |
| scene_11 | #7 | 45.6–48.1s | #000000 | #1f1f1f, centre (0.49, 0.62), radius 0.28 | #292b2c #4a4b4e | 20 | 0.32 0.29 0.68 0.57 | zoom in 17%/s, pans (-0.2%, -0.8%)/s |
| scene_12 | #8 | 48.1–48.9s | #000000 | #1a1c1d, centre (0.45, 0.57), radius 0.27 | #282a2d #414345 #6e7073 | 12 | 0.12 0.30 0.87 0.60 | zoom in 62%/s, pans (-5.9%, +1.7%)/s |
| scene_13 | #9 | 48.9–51.2s | #000000 | #161818, centre (0.48, 0.50), radius 0.29 | #2c3031 #3e4141 #535758 | 22 | 0.21 0.33 0.65 0.50 | zoom in 5%/s, pans (+1.6%, +0.7%)/s |
| scene_14 | #9 | 51.2–55.2s | #000000 | #2f4347, centre (0.49, 0.47), radius 0.23 | #30494f #5c767b #b0b096 | 50 | 0.12 0.41 0.87 0.54 | morphs in from the last scene, zoom out 14%/s, turns anticlockwise 5.8°/s, pans (-7.5%, -0.8%)/s |
| scene_15 | #10 | 55.2–55.4s | #000000 | #191f21, centre (0.49, 0.51), radius 0.27 | #2f3c3f #4d6064 | 17 | 0.32 0.29 0.68 0.61 | — |
| scene_16 | #11 | 55.4–59.9s | #000000 | #161616, centre (0.47, 0.56), radius 0.25 | #303030 #8d8d8d #f8f8f8 | 18 | 0.11 0.44 0.83 0.59 | near still |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #1 0.0–26.5s · 5 events**

- Ground #000002; other main colours #18191c #2f2d2f; drawn layer #393739 #676567 #eceaec #a7a5a7
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 0.67–12.47s · middle (x 38%–58%, y 39%–43%) · disappears, unfolds rightward (draw-on / grow / wipe), ease-in-out · #454345 · [crop](shots/shot_001_el_01.jpg)
2. 17.93–18.87s · middle left (x 13%–31%, y 36%–42%) · appears, slides rightward, linear · #858385 · [crop](shots/shot_001_el_02.jpg)
3. 18.00–18.87s · middle (x 58%–76%, y 36%–42%) · appears, unfolds rightward (draw-on / grow / wipe), linear · #7b797b · text “ISUCK” · [crop](shots/shot_001_el_03.jpg)
4. 26.33–26.47s · middle (x 9%–91%, y 42%–60%) · changes, moves upward, instant · #282628 · [crop](shots/shot_001_el_04.jpg)
5. 26.40–26.47s · bottom (x 20%–78%, y 66%–70%) · disappears, instant · #6c6a6c · text “Your friend misses this jump. / Hehandsyouthecontroller / and asks,” · [crop](shots/shot_001_el_05.jpg)

**Motion #2 26.5–26.8s (fade in) · 2 events**

- Ground #000002; other main colours #020104 #0a080b; drawn layer #252325 #2a282a #c9c7c9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 26.57–26.70s · middle (x 29%–91%, y 38%–55%) · disappears, moves leftward, instant · #302e30 · [crop](shots/shot_002_el_01.jpg)
2. 26.57–26.63s · middle left (x 18%–38%, y 49%–53%) · disappears, instant · #6a686a · [crop](shots/shot_002_el_02.jpg)

**Motion #3 26.8–31.1s (fade in) · 5 events**

- Ground #000002; other main colours #0f1012 #1a1d1e #282c2e #3a3d3e; drawn layer #3c3c3d #dbdbd9 #656564 #999999
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_003_ly_01.jpg) [crop L2](shots/shot_003_ly_02.jpg) · Continuous layer: 15% of the frame moves through the whole shot (x 2%–98%, y 32%–61%), e.g. drifting gradients, particle flow, breathing glow
1. 27.97–30.03s · middle (x 2%–91%, y 29%–48%) · changes, moves leftward, linear · #161719 · text “Firstdeskmat / First desk mat / PUBLISH” · [crop](shots/shot_003_el_01.jpg)
2. 27.97–29.37s · middle (x 36%–62%, y 39%–44%) · disappears, moves leftward, ease-in-out · #090807 · text “Firstdeskmat / First desk mat” · [crop](shots/shot_003_el_02.jpg)
3. 28.10–29.23s · middle left (x 0%–11%, y 42%–54%) · appears, slides downward, linear · #272626 · [crop](shots/shot_003_el_03.jpg)
4. 28.23–29.97s · middle (x 0%–100%, y 55%–62%) · appears, slides rightward, ease-in-out · #202021 · [crop](shots/shot_003_el_04.jpg)
5. 29.70–29.77s · bottom (x 22%–76%, y 66%–70%) · changes, instant · #0d0b0d · text “You spend a month making / your first desk mat. / You put it up for sale.” · [crop](shots/shot_003_el_05.jpg)

**Motion #4 31.1–39.0s · 6 events**

- Ground #000002; other main colours #090b0f; drawn layer #242c2d #e3e1e3 #5c6162 #99a1a1
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 35.03–38.57s · middle right (x 60%–82%, y 29%–40%) · changes, unfolds upward (draw-on / grow / wipe), ease-out · #160407 · text “609orders / 826orders / 965orders” · [crop](shots/shot_004_el_01.jpg)
2. 35.50–38.37s · middle right (x 73%–91%, y 65%–68%) · disappears, ease-in-out · #2f2d2f · [crop](shots/shot_004_el_02.jpg)
3. 35.50–38.37s · middle left (x 7%–24%, y 65%–68%) · disappears, ease-in-out · #626062 · [crop](shots/shot_004_el_03.jpg)
4. 38.23–38.90s · middle (x 16%–84%, y 38%–59%) · changes, moves leftward, ease-in · #090b0e · text “4orders / 18orders / 44orders” · [crop](shots/shot_004_el_04.jpg)
5. 38.37–38.43s · bottom (x 29%–69%, y 65%–71%) · changes, instant · #000000 · text “You can already / picture launch day. / The orders just keep coming.” · [crop](shots/shot_004_el_05.jpg)
6. 38.43–38.83s · middle left (x 11%–42%, y 54%–59%) · changes, unfolds upward (draw-on / grow / wipe), linear · #010001 · [crop](shots/shot_004_el_06.jpg)

**Motion #5 39.0–41.6s · 3 events**

- Ground #000002; other main colours #080a0e #111316; drawn layer #2e2e31 #dfdee0 #5e5e61 #9f9fa1
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 39.03–39.50s · middle (x 20%–84%, y 32%–60%) · changes, moves downward, linear · #090b0e · text “11:58PM / LAUNCHDAY / ORDERS” · [crop](shots/shot_005_el_01.jpg)
2. 41.43–41.57s · middle (x 4%–69%, y 31%–61%) · changes, moves leftward, instant · #161416 · text “11:58PM / LAUNCHDAY / ORDERS” · [crop](shots/shot_005_el_02.jpg)
3. 41.57–41.63s · bottom (x 13%–84%, y 66%–70%) · changes, instant · #484648 · text “Zero orders. / And the first thing you say is, / "Man.Who did I think I was?"” · [crop](shots/shot_005_el_03.jpg)

**Motion #6 41.6–45.6s (zoom in) · 4 events**

- Ground #000002; other main colours #080c11 #1f1f1f #2d2c2b #40403e; drawn layer #44413d #dddbda #6c6862 #a7a4a0
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_006_ly_01.jpg) [crop L2](shots/shot_006_ly_02.jpg) · Continuous layer: 15% of the frame moves through the whole shot (x 7%–93%, y 26%–61%), e.g. drifting gradients, particle flow, breathing glow
1. 41.70–43.63s · middle (x 2%–82%, y 34%–59%) · changes, moves rightward, linear · #111218 · text “Yourlisting / Studiodeskmat / Stitched edge” · [crop](shots/shot_006_el_01.jpg)
2. 41.77–43.50s · middle (x 0%–100%, y 24%–63%) · changes, moves upward, ease-out · #18191c · text “11:58 / Yourlisting / Studiodeskmat” · [crop](shots/shot_006_el_02.jpg)
3. 43.03–44.23s · middle (x 38%–60%, y 38%–44%) · disappears, moves upward, ease-in-out · #252220 · [crop](shots/shot_006_el_03.jpg)
4. 44.17–44.23s · bottom (x 11%–87%, y 65%–72%) · changes, instant · #484648 · text “"Man. Who did I think I was?" / "Man. Who did I thinkI was?" / Now imagine your friend sends” · [crop](shots/shot_006_el_04.jpg)

**Motion #7 45.6–48.1s (dissolve in) · 2 events**

- Ground #000002; other main colours #0c0c12 #151519 #2a2a2f; drawn layer #37363a #e6e5e7 #737276 #adacaf
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 42%–54%, y 39%–43% · #212225 · [crop](shots/shot_007_st_01.jpg)
- Continuous layer: 1% of the frame moves through the whole shot (x 36%–69%, y 32%–61%), e.g. drifting gradients, particle flow, breathing glow
1. 47.17–48.10s · middle (x 20%–80%, y 28%–62%) · changes, moves upward, linear · #0d0e14 · text “11:58 / Yourlisting / Studiodeskmat” · [crop](shots/shot_007_el_01.jpg)
2. 47.77–47.83s · bottom (x 11%–87%, y 65%–72%) · changes, instant · #000000 · text “Now imagine your friend sends / you that exact same listing. / First thing you'd say?” · [crop](shots/shot_007_el_02.jpg)

**Motion #8 48.1–48.9s (zoom in) · 0 events**

- Ground #000002; other main colours #0b0b0f #151519 #27292d; drawn layer #2e2e33 #5b5b60 #e5e4e7 #a5a4a7
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 38%–58%, y 38%–43% · #212226 · [crop](shots/shot_008_st_01.jpg)
- S2. never moves: shape / text block · x 23%–63%, y 66%–70% · #d5d3d5 · text “First thing you'd say?” · [crop](shots/shot_008_st_02.jpg)
- S3. never moves: shape / text block · x 63%–75%, y 67%–70% · #cbc9cb · [crop](shots/shot_008_st_03.jpg)
- Continuous layer: 2% of the frame moves through the whole shot (x 13%–87%, y 30%–62%), e.g. drifting gradients, particle flow, breathing glow

**Motion #9 48.9–55.2s (dissolve in) · 4 events**

- Ground #000002; other main colours #0d0f13 #50646e #3b4b54 #202224; drawn layer #303b43 #516670 #dbdcdd #929794
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- Continuous layer: 3% of the frame moves through the whole shot (x 20%–76%, y 38%–69%), e.g. drifting gradients, particle flow, breathing glow
1. 50.67–51.80s · middle (x 47%–67%, y 34%–38%) · disappears, unfolds downward (draw-on / grow / wipe), ease-out · #26282c · text “Yourlisting” · [crop](shots/shot_009_el_01.jpg)
2. 51.87–55.13s · middle left (x 27%–38%, y 36%–41%) · appears, slides leftward, ease-out · #101b1e · [crop](shots/shot_009_el_02.jpg)
3. 53.80–53.87s · bottom (x 16%–82%, y 66%–70%) · changes, instant · #4b494b · text “"Wait, is that the only picture? / Dude, unroll it. / I wanna see the design.” · [crop](shots/shot_009_el_03.jpg)
4. 54.93–55.13s · middle (x 2%–98%, y 28%–62%) · changes, moves leftward, ease-in · #0d0e14 · text “11:58 / Yourlisting / Studiodeskmat” · [crop](shots/shot_009_el_04.jpg)

**Motion #10 55.2–55.4s (zoom in) · 1 events**

- Ground #000002; other main colours #070508 #1a1c1e #3f4041; drawn layer #393739 #676567 #ebe9eb #a9a7a9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: horizontal line · x 33%–67%, y 34%–35% · #121319 · [crop](shots/shot_010_st_01.jpg)
- S2. never moves: shape / text block · x 49%–53%, y 40%–41% · #141e26 · [crop](shots/shot_010_st_02.jpg)
- S3. never moves: horizontal line · x 47%–66%, y 53%–54% · #18191f · text “Studiodeskmat” · [crop](shots/shot_010_st_03.jpg)
- S4. never moves: shape / text block · x 27%–70%, y 66%–69% · #d2d0d2 · text “You knew what to tell him.” · [crop](shots/shot_010_st_04.jpg)
- S5. never moves: shape / text block · x 70%–82%, y 66%–69% · #c8c6c8 · [crop](shots/shot_010_st_05.jpg)
- S6. never moves: shape / text block · x 16%–26%, y 67%–69% · #cccacc · [crop](shots/shot_010_st_06.jpg)
1. 55.27–55.33s · middle (x 27%–73%, y 28%–62%) · changes, instant · #0d0e14 · text “11:58 / Yourlisting / Studiodeskmat” · [crop](shots/shot_010_el_01.jpg)

**Motion #11 55.4–59.9s (dissolve in) · 3 events**

- Ground #000002; other main colours #070508; drawn layer #312f31 #4d4b4d #898789 #e7e5e7
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 45%–54%, y 33%–36% · #6a686a · text “YOU” · [crop](shots/shot_011_st_01.jpg)
- S2. never moves: shape / text block · x 8%–38%, y 47%–50% · #272527 · [crop](shots/shot_011_st_02.jpg)
- S3. never moves: shape / text block · x 67%–73%, y 47%–50% · #353335 · [crop](shots/shot_011_st_03.jpg)
- S4. never moves: shape / text block · x 39%–62%, y 52%–60% · #474547 · [crop](shots/shot_011_st_04.jpg)
1. 57.90–58.17s · middle (x 33%–40%, y 42%–49%) · disappears, ease-in-out · #656365 · [crop](shots/shot_011_el_01.jpg)
2. 58.77–59.57s · middle (x 53%–60%, y 42%–50%) · appears, slides upward, ease-in-out · #333133 · [crop](shots/shot_011_el_02.jpg)
3. 58.90–58.97s · bottom (x 27%–71%, y 66%–70%) · disappears, instant · #838183 · text “Try saying it to yourself. / Then press retry.” · [crop](shots/shot_011_el_03.jpg)
