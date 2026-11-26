---
videomd: 1
part: remake
tokens: 2953
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 3 steps as the original (narrative line under “Content and structure”)
2. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 13 lines with their pace in the script table under “Sound”
3. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
4. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
5. **Sound effects**: 23; place similar ones from a library at the times under “Sound”
6. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**code render / screen capture 3 shots → 1 code project**

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #1–#3 (0.0–59.4s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- vector shapes: SVG shapes + interpolate() / spring() keyframes, positions and timing measured from the frame
- data chart: SVG / D3 scales for axes and marks, numbers counted up with interpolate(), bars / lines grown with spring()

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #1 | 0.0–9.0s | vector shapes | Hook: the whole globe in dark space, an inland region outlined by a bright glowing ice-blue line with 3 to 4 fainter offset contour lines around it (distance bands), the ocean navy, the land warm dark grey with relief. The region shrinks toward one point while the camera zooms down onto it; a candy-striped red/cream pole marker with a small orange flag and a thin ellipse ring at its foot drops onto the point. The map recolours: the country containing the point fills ochre-orange with a thin light border, a neighbouring country fills pale grey, the shared border glows hot magenta; white uppercase country labels with dark shadows pop in; a two-line white title (place name, smaller second line) types in at the top (y about 15%). Word-by-word white captions at about 71% of the height. | static frame, elements move inside it | ground #312d2c · #3b3634 #a16a37 #958981 #8c5c32 · drawn #9b6637 #9b8f87 #293450 #e2d9d5 | CHINA / AOLE / EURASIAN POLE / SIAN POLE |
| #2 | 9.0–35.9s | data chart | One continuous map camera over the same globe. Overlays fade; a big rolling counter (heavy rounded sans, gold with dark outline, small 'KM' after it) appears top-left at y about 21% while a gold line grows from the marker to the nearest coast, then a gold distance circle sweeps round the marker touching the coast; the camera pulls back so the circle reads on the globe; a comparison line between two named cities (small gold node dots, white uppercase labels) gets its own counter; a short white tag ('N KM SHORT') where the line stops short of the coast. Twist: the camera pans north along the circle to a coastal water feature, its outline traced in bright cyan, an italic serif ice-blue label names it; a year ruler (ticks, decade numbers, gold pointer, the year in large orange serif) slides in at the top; the land around turns pale ice blue (the feature recounted as ocean), new contour bands appear and the marker splits into two new markers. Then an orange glowing outline of the country, orange circles with ripple nodes where they touch coasts, the counter rolls to the new value in orange. | static | ground #050719 · #3f3734 #101530 #322c2f #202446 · drawn #6a5d4e #be9a6f #222946 #d2d3d6 | 85 / 1,356 / 2,628 / 2,645 / 2,197 / 2,500 |
| #3 | 35.9–59.4s | data chart | Zoom out to the small whole globe, spin to the other side of the Earth, zoom back in on open ocean: a red/cream striped buoy marker with a white ellipse ring; a white uppercase title names the second spot; the coasts around it glow as cloud-like offset bands, then an ice-blue counter rolls up and an ice-blue circle with 3 node dots where it touches land. The gold circle of the first spot is laid over it: the two numbers sit side by side at the top (gold left, ice blue right), two nearly equal concentric rings; a cut-in to an extreme close-up of the two ring edges as two near-parallel horizontal arcs with tiny km ticks and the difference as a small counter; a pull back to the whole globe with a dashed comparison circle and a translucent filled disc overlapping the buoy's circle; ends held on the globe with both numbers on top. | static | ground #02061a · #0f1736 #2a3557 #242328 #4b5166 · drawn #2d3657 #7f7376 #a3b9d5 #ecdabb | 2,645km / AOINT NEMO / POINT NEMO / NEMO / 321 / 1,735 |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #3 | 35.9–50.6s | #080c1e | #354465, centre (0.44, 0.37), radius 0.22 | #263151 #b8c2d8 #836a7c | 91 | 0.03 0.00 0.97 0.91 | zoom in 3%/s, points wander |
| scene_02 | #3 | 50.6–53.1s | #0a0e27 | #34323f, centre (0.42, 0.35), radius 0.27 | #444449 #c6c9c5 #7d8691 | 29 | 0.02 0.40 0.98 0.47 | morphs in from the last scene, zoom out 89%/s, turns clockwise 11.2°/s, pans (-0.4%, +0.7%)/s |
| scene_03 | #3 | 53.1–59.4s | #030617 | #292846, centre (0.49, 0.47), radius 0.42 | #29375f #816978 #c0c6d6 | 105 | 0.05 0.26 0.95 0.68 | morphs in from the last scene |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #1 0.0–9.0s · 1 events**

- Ground #312d2c; other main colours #3b3634 #a16a37 #958981 #8c5c32; drawn layer #9b6637 #9b8f87 #293450 #e2d9d5
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–8%, y 99%–100% · #060b1b · [crop](shots/shot_001_st_01.jpg)
- [crop L1](shots/shot_001_ly_01.jpg) [crop L2](shots/shot_001_ly_02.jpg) · Continuous layer: 8% of the frame moves through the whole shot (x 0%–100%, y 15%–99%), e.g. drifting gradients, particle flow, breathing glow
1. 7.07–8.40s · middle (x 11%–82%, y 18%–86%) · changes, moves leftward, linear · #9f7971 · text “Did you know / this is the / furthest you can” · [crop](shots/shot_001_el_01.jpg)

**Motion #2 9.0–35.9s (dissolve in) · 0 events**

- Ground #050719; other main colours #3f3734 #101530 #322c2f #202446; drawn layer #6a5d4e #be9a6f #222946 #d2d3d6
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_002_ly_01.jpg) [crop L2](shots/shot_002_ly_02.jpg) · Continuous layer: 4% of the frame moves through the whole shot (x 0%–100%, y 4%–80%), e.g. drifting gradients, particle flow, breathing glow

**Motion #3 35.9–59.4s (zoom in) · 10 events**

- Ground #02061a; other main colours #0f1736 #2a3557 #242328 #4b5166; drawn layer #2d3657 #7f7376 #a3b9d5 #ecdabb
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_003_ly_01.jpg) [crop L2](shots/shot_003_ly_02.jpg) · Continuous layer: 3% of the frame moves through the whole shot (x 16%–84%, y 20%–74%), e.g. drifting gradients, particle flow, breathing glow
1. 35.95–53.35s · bottom (x 0%–100%, y 60%–89%) · changes, unfolds downward (draw-on / grow / wipe), ease-in-out · #14192c · text “You've probably / heardofPoint / Nemo” · [crop](shots/shot_003_el_01.jpg)
2. 36.02–53.28s · top (x 0%–100%, y 1%–31%) · changes, unfolds upward (draw-on / grow / wipe), ease-out · #1d233b · text “AOINT NEMO / POINT NEMO / NEMO” · [crop](shots/shot_003_el_02.jpg)
3. 37.55–51.62s · middle (x 38%–80%, y 26%–45%) · changes, unfolds downward (draw-on / grow / wipe), ease-in-out · #2a2f53 · text “2.688km” · [crop](shots/shot_003_el_03.jpg)
4. 38.02–53.22s · top (x 0%–100%, y 1%–12%) · disappears, moves leftward, ease-out · #10142c · [crop](shots/shot_003_el_04.jpg)
5. 40.35–53.22s · top (x 0%–98%, y 0%–11%) · disappears, moves rightward, ease-in-out · #1e1d2c · [crop](shots/shot_003_el_05.jpg)
6. 50.35–50.95s · middle (x 9%–80%, y 26%–67%) · changes, moves upward, ease-in · #14183b · text “2.688km / 2,645km” · [crop](shots/shot_003_el_06.jpg)
7. 50.42–53.22s · bottom (x 0%–100%, y 82%–100%) · changes, moves leftward, ease-in-out · #040516 · [crop](shots/shot_003_el_07.jpg)
8. 53.08–53.22s · top (x 0%–100%, y 0%–10%) · changes, moves leftward, instant · #040518 · [crop](shots/shot_003_el_08.jpg)
9. 56.75–56.82s · middle (x 31%–69%, y 38%–57%) · changes, instant · #2f385e · text “2.688km / 2,645km” · [crop](shots/shot_003_el_09.jpg)
10. 57.75–58.42s · middle (x 9%–80%, y 19%–71%) · changes, unfolds upward (draw-on / grow / wipe), ease-in · #575a6d · text “You've probably / heardofPoint / AOINT NEMO” · [crop](shots/shot_003_el_10.jpg)
