---
videomd: 1
part: remake
tokens: 3758
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 5 steps as the original (narrative line under “Content and structure”)
2. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
3. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
4. **Music**: find a track at the same tempo and mood (source: to confirm, about 120 BPM, C major)
5. **Sound effects**: 5; place similar ones from a library at the times under “Sound”
6. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**code render / screen capture 6 shots → 1 code project**

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #1–#6 (0.0–44.0s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- particles / point cloud: Three.js particle system (points sampled on the target shape, morph between shapes, bloom), rendered frame by frame with @remotion/three
- data chart: SVG / D3 scales for axes and marks, numbers counted up with interpolate(), bars / lines grown with spring()
- vector shapes: SVG shapes + interpolate() / spring() keyframes, positions and timing measured from the frame
- gradients / colour fields: CSS linear / radial gradients, or a few large circles with filter: blur() drifting slowly; glass cards with backdrop-filter
- kinetic type: Word-by-word spring() entrances (offset + scale + opacity), highlight boxes on key words; match font, size and leading from the frame

Particle shots: what shape the particles form in each shot and how it moves decides whether the remake works; chapter cards, labels and counters go in an HTML layer on top. Build shot by shot from the table below, not one shared background.

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #1 | 0.0–18.0s | particles / point cloud | Pixel-art particle simulation on a near-black blue-tinted ground. Title "NUCLEAR FISSION" in a white bitmap font over one big glowing green nucleus (a cluster of small green balls with a soft dark-green halo), label U-235 under it, a tiny white neutron streaks in from the left. The nucleus splits into a pink (BA) and a blue (KR) nucleus that fly apart, firing 2-3 neutron dots. The view pulls back to a regular lattice of small green nuclei (each a 3-tone pixel ball, highlight top-left). A caption panel at the top and a counter panel under it (dark navy fill, 1 art-pixel green-tinted border, small corner ticks) show GENERATION n and a big splits count that doubles every half second (8, 64, 1,024, 131,072, then scientific notation 4.4x10^12 ... 6.0x10^23). Each split spawns pink and blue fragments; the lattice fills with fragment dots, a ring of orange-rimmed reacting nuclei spreads outward, and finally a dark-red then orange pixel fireball grows out of the middle. | static frame, elements move inside it | ground #150510 · #4b1013 #91220a #391f33 #161329 · drawn #3e3838 #865770 #5c9030 #d3d6cc | HUCLEAR / URANIUM-235 / CATCHES A NEUTRON / CATCHESANEUTRON / NUCLEAR FISSION / 0.1XOF MASS+ENERGY |
| #2 | 18.0–19.6s | data chart | The pixel fireball fills the frame and brightens through red, orange, amber and cream to almost white, with lighter pixel blobs boiling inside; the panels show 80 GENERATIONS IN ABOUT 1 MICROSECOND and 6.0x10^23 SPLITS, then fade as the frame whites out. | static | ground #fbe382 · #fbf9e9 #fceba5 #fcfdff #0f152d · drawn #0b1126 #fbb244 #313a41 #f8efca | 80 GENERATIONS / IN ABOUT 1 MICROSECONO |
| #3 | 19.6–20.1s | vector shapes | Pure white flash hold (about 0.5 s) between the micro and macro worlds. | static | ground #fffdff · #fdffff #fffdfe | — |
| #4 | 20.1–42.5s | data chart | Wide pixel-art desert at dusk: dark brown ground with black speckle pixels, a low purple mountain silhouette, a sky of 5 horizontal violet-to-indigo bands with stepped edges and a few star pixels. A small white-hot dome flashes on the horizon, a flat light ring races out along the ground, the dome swells into an orange fireball with a purple rim, then rises on a stem into a brown mushroom cloud made of round pixel puffs (3-4 brown tones, lighter on top, glowing red underside). A dark checkerboard-dithered shadow passes over the scene once. Caption panels at the top (dark navy fill, 1 art-pixel dusty-rose border): TRINITY TEST, 1945 / FIRST ATOMIC BOMB; PLUTONIUM FISSION 20,000+ TONS OF TNT; THE CLOUD ROSE 12 KM HIGH; ABOUT 1 GRAM OF MASS BECAME ENERGY (the big number in a larger font). Near the end the sunset glows orange-pink on the right horizon and a small sparkle twinkles on the cloud edge, then the camera starts to push in on it. | static frame, elements move inside it | ground #0a0a1d · #39261b #5d4032 #31325f #5f537f · drawn #7c656f #6d473a #e17e41 #eddabd | TRINITY TEST,1945 / FIRST ATOMIC BOMB / TRINITYTEST,1945 / PLUTONIUM FISSION / THE CLOUD ROSE / 12 KM |
| #5 | 42.5–43.0s | gradients / colour fields | Fast push-in toward the sparkle on the cloud edge: the cloud fills the frame with chunky enlarged pixels and the sparkle grows into a bright cream-orange glow disc that fills the frame. | push in 368%/s, picture drifts up | ground #52362b · #714f3c #f3a065 #d66e4b #fcce8c · drawn #fece8b #f09d63 #4c3128 #ffeec6 | — |
| #6 | 43.0–44.0s | kinetic type | Match cut from the glow disc to an extreme close-up of the green nucleus (huge pixel balls), which pulls back to the opening frame: title NUCLEAR FISSION and the U-235 nucleus on the dark ground, so the video loops seamlessly. | pull out 304%/s, picture drifts down | ground #010109 · #101914 #1a3313 #9dd45e #686a73 · drawn #b4e56c #87c540 #568136 #dcf5af | U-235 |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #1 | 0.0–3.5s | #000308 | #53832f, centre (0.49, 0.51), radius 0.14 | #7ac53b #33641c #bbf579 | 17 | 0.15 0.17 0.86 0.86 | near still |
| scene_02 | #1 | 3.5–18.0s | #000308 | #2d373e, centre (0.50, 0.23), radius 0.27 | #629f35 #3c4737 #9d6598 | 234 | 0.03 0.01 0.97 0.97 | morphs in from the last scene, zoom out 10%/s, pans (-0.4%, +0.5%)/s, points wander |
| scene_03 | #3 | 19.6–20.1s | #ffffff | — | — | — | — | — |
| scene_04 | #4 | 20.1–24.6s | #221711 | #b28b50, centre (0.50, 0.59), radius 0.16 | #73595a #f9dd75 #c4a790 | 83 | 0.02 0.18 0.97 0.80 | pans (+6.7%, +1.2%)/s |
| scene_05 | #4 | 24.6–26.8s | #221711 | #ae3a16, centre (0.51, 0.51), radius 0.33 | #bf4114 #5d4e77 #8e6c54 | 93 | 0.04 0.20 0.94 0.64 | morphs in from the last scene |
| scene_06 | #4 | 26.8–31.1s | #221711 | #443e69, centre (0.51, 0.51), radius 0.41 | #6e4f3d #5d517e | 97 | 0.03 0.23 0.96 0.66 | morphs in from the last scene, zoom in 1%/s, points wander |
| scene_07 | #4 | 31.1–42.5s | #221711 | #5b486a, centre (0.55, 0.49), radius 0.48 | #724c45 #8d6a61 #cd795c | 94 | 0.06 0.20 0.96 0.71 | morphs in from the last scene |
| scene_08 | #5 | 42.5–43.0s | #6f4e3b | #fdeec4, centre (0.57, 0.29), radius 0.32 | #f0b479 #fef0c6 #473127 | 29 | 0.03 0.07 0.87 0.79 | — |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #1 0.0–18.0s · 2 events**

- Ground #150510; other main colours #4b1013 #91220a #391f33 #161329; drawn layer #3e3838 #865770 #5c9030 #d3d6cc
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_001_ly_01.jpg) [crop L2](shots/shot_001_ly_02.jpg) · Continuous layer: 8% of the frame moves through the whole shot (x 0%–100%, y 5%–98%), e.g. drifting gradients, particle flow, breathing glow
1. 7.40–8.20s · top (x 18%–84%, y 22%–36%) · changes, ease-in-out · #0c112b · text “GENERATION3 / SPLITS / @BITWONDER” · [crop](shots/shot_001_el_01.jpg)
2. 12.00–17.93s · middle (x 2%–98%, y 2%–94%) · appears, slides downward, linear · #eb7619 · text “HHUCLEAR / FISSIOH / U-235” · [crop](shots/shot_001_el_02.jpg)

**Motion #2 18.0–19.6s (dissolve in) · 1 events**

- Ground #fbe382; other main colours #fbf9e9 #fceba5 #fcfdff #0f152d; drawn layer #0b1126 #fbb244 #313a41 #f8efca
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_002_ly_01.jpg) [crop L2](shots/shot_002_ly_02.jpg) · Continuous layer: 92% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 19.30–19.50s · top (x 16%–84%, y 22%–36%) · disappears, moves downward, ease-in · #0c112b · text “GEHERRTION BO / 6.0x1023 / SFLITS” · [crop](shots/shot_002_el_01.jpg)

**Motion #3 19.6–20.1s (fade in) · 2 events**

- Ground #fffdff; other main colours #fdffff #fffdfe
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 19.63–19.70s · bottom (x 0%–100%, y 80%–100%) · disappears, instant · #fffae9 · [crop](shots/shot_003_el_01.jpg)
2. 19.70–19.77s · top (x 0%–100%, y 0%–21%) · disappears, instant · #fffbea · [crop](shots/shot_003_el_02.jpg)

**Motion #4 20.1–42.5s (fade in) · 1 events**

- Ground #0a0a1d; other main colours #39261b #5d4032 #31325f #5f537f; drawn layer #7c656f #6d473a #e17e41 #eddabd
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_004_ly_01.jpg) [crop L2](shots/shot_004_ly_02.jpg) · Continuous layer: 6% of the frame moves through the whole shot (x 9%–100%, y 25%–69%), e.g. drifting gradients, particle flow, breathing glow
1. 20.13–20.47s · top (x 0%–100%, y 10%–31%) · changes, moves leftward, ease-in-out · #0b0b23 · text “TRINITY TEST,1945 / FIRST ATOMIC BOMB / TRINITYTEST,1945” · [crop](shots/shot_004_el_01.jpg)

**Motion #5 42.5–43.0s (zoom in) · 4 events**

- Ground #52362b; other main colours #714f3c #f3a065 #d66e4b #fcce8c; drawn layer #fece8b #f09d63 #4c3128 #ffeec6
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 49%–58%, y 32%–38% · #ffeec8 · [crop](shots/shot_005_st_01.jpg)
- S2. never moves: shape / text block · x 0%–7%, y 69%–74% · #52362b · [crop](shots/shot_005_st_02.jpg)
- [crop L1](shots/shot_005_ly_01.jpg) [crop L2](shots/shot_005_ly_02.jpg) · Continuous layer: 36% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 42.57–42.90s · top left (x 0%–20%, y 0%–8%) · appears, slides rightward, ease-in-out · #734f3b · [crop](shots/shot_005_el_01.jpg)
2. 42.57–42.90s · bottom left (x 0%–49%, y 69%–94%) · changes, moves rightward, ease-in · #f39f61 · [crop](shots/shot_005_el_02.jpg)
3. 42.63–42.97s · top right (x 40%–100%, y 0%–21%) · changes, moves leftward, ease-in-out · #fecf8c · [crop](shots/shot_005_el_03.jpg)
4. 42.63–42.97s · top (x 31%–40%, y 1%–6%) · appears, ease-out · #f3a262 · [crop](shots/shot_005_el_04.jpg)

**Motion #6 43.0–44.0s · 1 events**

- Ground #010109; other main colours #101914 #1a3313 #9dd45e #686a73; drawn layer #b4e56c #87c540 #568136 #dcf5af
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_006_ly_01.jpg) [crop L2](shots/shot_006_ly_02.jpg) · Continuous layer: 9% of the frame moves through the whole shot (x 9%–89%, y 11%–71%), e.g. drifting gradients, particle flow, breathing glow
1. 43.10–43.63s · middle (x 0%–100%, y 0%–100%) · disappears, moves upward, ease-out · #86c83b · text “U-235” · [crop](shots/shot_006_el_01.jpg)
