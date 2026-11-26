---
videomd: 1
part: remake
tokens: 1562
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 1 steps as the original (narrative line under “Content and structure”)
2. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
3. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**code render / screen capture 1 shot → 1 code project**

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #1 (0.0–4.0s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- particles / point cloud: Three.js particle system (points sampled on the target shape, morph between shapes, bloom), rendered frame by frame with @remotion/three

Particle shots: what shape the particles form in each shot and how it moves decides whether the remake works; chapter cards, labels and counters go in an HTML layer on top. Build shot by shot from the table below, not one shared background.

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #1 | 0.0–4.0s | particles / point cloud | One continuous code-rendered shot on pure black. 0.0 s: the lowercase line "[line one]" sits centred at y about 262 (44 px, near-white, regular weight); a solid white dot (radius 16 px) pops in at x 540, y 1400. 0.3 to 2.5 s: the dot draws a vertical hairline trunk 228 px up, then every 0.25 s each tip splits in two (9 levels, 256 tips); a white dot rides every growing tip, the dots getting smaller each level; the crown fans out into a wide dome from x about 75 to 970, y about 580 to 960, like a broad umbrella tree. 2.57 s (all tips landed): the line swaps to "[line two]" in one frame, all tips flash bigger and settle, the branches dim to about half opacity (grey), a thin grey ring expands from the root to radius about 280 px and fades, about 40 small dots drift up and outward off the crown and fade to grey specks; the whole tree sways gently, more at the tips, and settles. 4.0 s: end, crown of lit dots over a grey tree. | static | ground #000002 · #0a0d10 #151517 #1c1e20 · drawn #363537 #5f5f61 #949396 #dcdcde | one choice. / then the next. |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #1 | 0.0–1.5s | #000000 | #090909, centre (0.50, 0.32), radius 0.16 | #a7a8a8 #eef1f0 #474948 | 1 | 0.44 0.52 0.55 0.72 | zoom in 7%/s, pans (+0.1%, -1.1%)/s, points wander |
| scene_02 | #1 | 1.5–4.0s | #000000 | #1d1d1d, centre (0.51, 0.36), radius 0.22 | #484949 #878989 #e5e7e7 | 22 | 0.10 0.31 0.86 0.79 | morphs in from the last scene, zoom in 1%/s |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #1 0.0–4.0s · 2 events**

- Ground #000002; other main colours #0a0d10 #151517 #1c1e20; drawn layer #363537 #5f5f61 #949396 #dcdcde
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_001_ly_01.jpg) [crop L2](shots/shot_001_ly_02.jpg) · Continuous layer: 5% of the frame moves through the whole shot (x 11%–87%, y 32%–61%), e.g. drifting gradients, particle flow, breathing glow
1. 1.93–3.93s · middle (x 7%–96%, y 28%–51%) · changes, moves upward, ease-in-out · #212122 · [crop](shots/shot_001_el_01.jpg)
2. 2.67–3.27s · bottom (x 22%–78%, y 57%–88%) · changes, scales up, linear · #201e20 · [crop](shots/shot_001_el_02.jpg)
