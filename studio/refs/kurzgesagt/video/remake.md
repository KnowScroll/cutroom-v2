---
videomd: 1
part: remake
tokens: 1965
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 1 steps as the original (narrative line under “Content and structure”)
2. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
3. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
4. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

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
- data chart: SVG / D3 scales for axes and marks, numbers counted up with interpolate(), bars / lines grown with spring()

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #1 | 0.0–4.0s | data chart | One continuous flat-vector space scene on a deep violet-navy vertical gradient with a soft purple haze in the middle, about 170 small star dots (violet and pale lavender, 1 to 4 px, some breathing in opacity) and about 14 four-point sparkles. A tiny Earth (blue disc with green land blotches) sits near the top at x 540, y 390; a dotted violet measuring line runs straight down to a tiny Moon at y 1360, each with a rounded colour tag to the right ("Earth" blue, a long distance tag violet). From 0.45 s the bodies slide in one at a time every 0.29 s from alternate sides (left, right) with a rotation that unwinds and a small overshoot, stacking to scale in a column on the line: three tiny rocky bodies share one grey tag on the left, then a huge banded orange-cream body, a banded cream body with a tilted ring, a cyan body and a blue body; each body is a flat disc with darker bands or blotches clipped inside, a large dark night-side ellipse over its left part leaving a lit crescent on the right, a faint soft highlight top-right and a blurred halo of its own colour. Each body gets a pill tag in its own saturated hue that pops in (scale 0 to 1 with overshoot) 0.2 s after it lands. At 2.53 s (payoff) the last body lands, the scene pulses (scale 1.035 then settles), the measuring line turns mint green, a mint bracket marks the spare gap with a mint tag holding a number with its unit, and a hot-pink chip with a yellow check disc pops in at the top, tilted -3 degrees. One white caption line (about 46 px, medium weight, sentence case, soft dark shadow) sits low at y about 1435 and swaps in place three times: question part 1, question part 2, answer. | static | ground #160d42 · #443a67 #e7d0a7 #6b5d73 #c89b7d · drawn #e9d6bb #655d83 #699dde #df856d | Mercury,Venus,Mars / Jupiter / Saturn / Uranus / Earth / They all fit |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #1 | 0.0–1.5s | #120737 | #3b2a69, centre (0.64, 0.72), radius 0.17 | #504192 #382e64 #878cb8 | 195 | 0.01 0.01 0.99 0.96 | near still |
| scene_02 | #1 | 1.5–4.0s | #110737 | #7a6d74, centre (0.53, 0.42), radius 0.30 | #e6d7a8 #d3816f #696287 | 129 | 0.23 0.13 0.77 0.66 | morphs in from the last scene |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #1 0.0–4.0s · 7 events**

- Ground #160d42; other main colours #443a67 #e7d0a7 #6b5d73 #c89b7d; drawn layer #e9d6bb #655d83 #699dde #df856d
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_001_ly_01.jpg) [crop L2](shots/shot_001_ly_02.jpg) · Continuous layer: 8% of the frame moves through the whole shot (x 7%–82%, y 0%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 0.27–0.47s · top (x 53%–64%, y 19%–23%) · appears, linear · #2c89f0 · text “Earth” · [crop](shots/shot_001_el_01.jpg)
2. 0.27–0.53s · bottom right (x 53%–89%, y 69%–73%) · appears, slides rightward, linear · #8b7cf9 · text “Moon, 406,700 km away / Moon,406,700 km away / Moon,406,700kmaway” · [crop](shots/shot_001_el_02.jpg)
3. 1.33–1.47s · top right (x 69%–100%, y 21%–42%) · changes, moves leftward, instant · #6b555e · text “Jupiter” · [crop](shots/shot_001_el_03.jpg)
4. 1.33–1.93s · middle (x 20%–82%, y 24%–55%) · appears, unfolds downward (draw-on / grow / wipe), ease-in-out · #504163 · text “Mercury,Venus,Mars / Jupiter / Saturn” · [crop](shots/shot_001_el_04.jpg)
5. 1.67–3.00s · middle (x 0%–71%, y 39%–71%) · changes, unfolds rightward (draw-on / grow / wipe), instant · #c4a97f · text “Saturn / Moon, 406,700 km away / Moon,406,700 km away” · [crop](shots/shot_001_el_05.jpg)
6. 1.93–2.00s · middle right (x 87%–100%, y 54%–64%) · changes, instant · #120939 · [crop](shots/shot_001_el_06.jpg)
7. 2.53–3.00s · middle (x 16%–80%, y 12%–54%) · changes, moves leftward, linear · #d27273 · text “Earth / Mercury,Venus,Mars / Jupiter” · [crop](shots/shot_001_el_07.jpg)
