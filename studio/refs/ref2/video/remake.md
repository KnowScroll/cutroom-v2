---
videomd: 1
part: remake
tokens: 7455
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 11 steps as the original (narrative line under “Content and structure”)
2. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 13 lines with their pace in the script table under “Sound”
3. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
4. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
5. **Music**: find a track at the same tempo and mood (source: to confirm, about 123 BPM, F major)
6. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**6 3D render shots → 1 generation unit, 1 Seedance 2.0 call; code render / screen capture 19 shots → 1 code project (2 parts)**

### Generation units

- Grouping: consecutive shots share a call where they fit, ≤15s per call; a long stretch is cut at a scene change first
- Inputs: the source stretch, subtitles erased, is the reference video; the model follows its shots, camera and pacing
- Audio: the model can generate action sound effects and ambience along with the picture; voice-over is better done as separate TTS and mixed in, so copy and timing stay editable
- Packaging: the subtitle, text label on the generated shots is post-production packaging: keep it out of the prompts (erased from source references) and lay it back on from the packaging timeline after generation

| Unit | Shots | Time | Length | Feed | Prompt |
|---|---|---|---|---|---|
| G1 | #1–#4, #22, #25 | 0.0–6.4s, 52.6–53.5s, 55.0–56.7s | 8.9s | reference video | draft |

**G1 · shots #1–#4, #22, #25 · 8.9s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 0.0–6.4s, 52.6–53.5s, 55.0–56.7s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

- these shots are separated by inserts in the cut: generate them together and put the inserts back in the edit

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (wide lit-to-shadow ramp), cool (daylight / cool-white LED), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Hook, 0.5 s: close low angle on a grey low-poly ground radar unit on legs and wheels, a red corner-bracket reticle over the horizon, a mint sweep beam crossing the frame, faceted lavender mountains and a fog band behind.
Shot 2: Fast whip up from the ground station to a high view over the dark grid floor; a circular mint scope inset top-left sweeps, a small dark label tag names the sensor, a white low-poly drone flies in from the left and a mint dot locks onto it with a thin vertical line to the scope. Caption: the first 'If you ..., you get a ...' pair.
Shot 3: The drone (light grey, flat facets) banks while a big translucent mint sweep wedge passes over the camera; a small red flag pins it as the flagged target.
Shot 4: Camera tilts down onto the drone from above; dots appear one per sweep behind it.
Shot 5: Rewind: a double-left-arrow icon appears next to the acronym; everything plays backwards fast.
Shot 6: Final: the opening composition, one drone, one echo; caption trails off with 'and...' so the loop restarts.
```

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #5–#21 (6.4–52.6s)
- Part 2: shots #23, #24 (53.5–55.0s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- particles / point cloud: Three.js particle system (points sampled on the target shape, morph between shapes, bloom), rendered frame by frame with @remotion/three
- vector shapes: SVG shapes + interpolate() / spring() keyframes, positions and timing measured from the frame

Particle shots: what shape the particles form in each shot and how it moves decides whether the remake works; chapter cards, labels and counters go in an HTML layer on top. Build shot by shot from the table below, not one shared background.

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #5 | 6.4–7.5s | particles / point cloud | Successive mint dots join into a coral red trace behind the drone; keyword 'track' highlighted. | static frame, elements move inside it | ground #090b0f · #0b0d16 #17171e #23242d · drawn #2f3139 #69646f #968f9b #c9d0ca | @embodied.dev / @lembodied.dev |
| #6 | 7.5–8.7s | particles / point cloud | Top view: the red trace extends, a second unflagged craft appears small in the distance top-left. | push in 3%/s, picture drifts left, rotates | ground #0b0d16 · #080a0e #16171f #272933 · drawn #30333a #69636d #94959e #ccd0ca | @embodied.dev |
| #7 | 8.7–9.9s | particles / point cloud | The trace projects forward along the drone's heading as a thin line; caption 'carry that track forward'. | static frame, elements move inside it | ground #0c0d15 · #05090f #12141b #191c24 #6c666d · drawn #34353b #6f686f #9f9ea3 #d4d4cf | @embodied.dev |
| #8 | 9.9–11.1s | particles / point cloud | Projected point drawn ahead of the drone; sweep wash passes. | picture drifts up | ground #0a0d14 · #08080f #12141b #191c22 #6a6a73 · drawn #6c676f #333439 #9a999f #d1d0cb | @embodied.dev |
| #9 | 11.1–12.2s | vector shapes | The projected point settles: a hollow red ring ahead of the drone; keyword 'prediction'. | push in 1%/s, picture drifts up | ground #0c0d15 · #06060e #17181d #2b2a34 #716972 · drawn #786d7b #2a2c33 #534c56 #a6adbb | you get a prediction. / @embodied.dev |
| #10 | 12.2–13.4s | particles / point cloud | Hold on the prediction ring; the second craft in the distance carries its own violet dots. | picture drifts left | ground #0d0d13 · #05090f #14161d #706f76 #27272f · drawn #706a75 #313337 #9998a0 #c9d0cc | @embodied.dev |
| #11 | 13.4–14.6s | particles / point cloud | A tall red U-shaped gate curve opens around the prediction; caption 'mark where around that prediction'. | picture drifts left, rotates | ground #05090f · #0c0c12 #14141b #2a252c #747276 · drawn #7b757e #302d32 #594d54 #bdc1c1 | @embodied.dev |
| #12 | 14.6–15.8s | particles / point cloud | The gate widens and a new mint reading appears inside it. | picture drifts left, rotates | ground #05090f · #0c0d15 #19171f #302830 #53363d · drawn #383238 #72666d #95979e #cccec9 | @embodied.dev |
| #13 | 15.8–16.9s | particles / point cloud | Hold on the gate with the reading inside; keyword 'gate'. | push in 2%/s, picture drifts left | ground #05090f · #0c0d15 #11131a #1e1b23 #533a43 · drawn #332f38 #7f7680 #624f58 #b7bec1 | @embodied.dev |
| #14 | 16.9–18.1s | particles / point cloud | The prediction ring slides toward the reading inside the gate. | push in 5%/s, picture drifts up | ground #05090f · #0c0d15 #18181f #2f2830 · drawn #302f35 #7f777f #5d4d55 #b5bec1 | @embodied.dev / @lembodied.dev |
| #15 | 18.1–19.3s | particles / point cloud | Correction animation: the ring moves part way, weighted. | push in 7%/s, picture drifts up | ground #08080f · #0c0d15 #18181f #2e282f #6a6778 · drawn #302e36 #7e7582 #5a4b56 #b6bcc0 | @lembodied.dev / @embodied.dev |
| #16 | 19.3–20.4s | particles / point cloud | The corrected point lands; keyword 'measurement'. | push in 8%/s, picture drifts up, rotates | ground #05090f · #0c0d15 #19161e #2d262e #52383c · drawn #322e38 #7b7585 #614e57 #b3b7c0 | @embodied.dev |
| #17 | 20.4–21.6s | particles / point cloud | Caption 'by how sure each one is'; the trace re-bends through the corrected point. | push in 7%/s, picture drifts up, rotates | ground #05090f · #0c0d15 #17151c #2a252c #4f333a · drawn #312d33 #7c727c #594c54 #b0b6b9 | @embodied.dev |
| #18 | 21.6–22.8s | particles / point cloud | Hold; the second craft's violet trace and its own gate appear on the right. | push in 1%/s | ground #05090f · #0c0d15 #19181f #30272f #52393f · drawn #2f2c33 #7a737e #544953 #b1b8bd | @embodied.dev |
| #19 | 22.8–24.0s | particles / point cloud | Keyword names the classic update; both traces shown side by side. | static frame, elements move inside it | ground #08080f · #0c0d15 #15151c #272028 #4a353c · drawn #2e2d35 #7d747e #594b55 #b2bac1 | @embodied.dev |
| #20 | 24.0–25.1s | particles / point cloud | The friendly craft's violet reading enters the flagged drone's red gate; the two gates overlap. | static frame, elements move inside it | ground #08080f · #0c0d15 #17171f #2d2733 #50383e · drawn #323139 #7f7584 #5c505c #b4bcc0 | @embodied.dev |
| #21 | 25.1–52.6s | vector shapes | Long 27 s build: a circular inset zooms on the overlapping gates; the acronym header appears at the top letter by letter (first the last two letters, then the first, then the second) on a small dark rounded plate; two translucent tilted diagram panels float over the mountains showing every red/violet pairing of tracks to readings as straight lines with hollow end circles; the pairings are scored and the lines thicken by probability; the final term is spoken with its keyword in yellow-green; then both craft fly close side by side, their traces merge and the last keyword (coalescence) turns red. | static | ground #172323 · #1e2b2d #595d6c #0c0f14 #364a49 · drawn #5e5f6e #807a88 #39353c #b7c1be | @embodied.dev / @lembodied.dev / D·A |
| #23 | 53.5–53.9s | particles / point cloud | Rewind continues: traces retract, gates shrink. | static frame, elements move inside it | ground #0c0d15 · #05090f #14141b #23242d · drawn #36353e #726671 #9392a3 #d2cfc6 | And ifyourewind all of it, / @embodied.dev |
| #24 | 53.9–55.0s | vector shapes | Rewind lands back on the first drone and the sensor scope with its label tag. | static frame, elements move inside it | ground #06090d · #0b0d16 #56576a #606174 #474857 · drawn #5c5b6c #3c4149 #93909d | @embodied.dev |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #5 | 6.4–7.5s | #0c0e13 | #26252a, centre (0.52, 0.67), radius 0.22 | #2c3134 #716871 | 158 | 0.03 0.17 0.98 0.98 | — |
| scene_02 | #6 | 7.5–8.7s | #0b0e13 | #242327, centre (0.50, 0.62), radius 0.20 | #2f3237 #74656e #92c2b2 | 216 | 0.09 0.00 0.99 0.90 | zoom in 6%/s, turns anticlockwise 4.4°/s, pans (-5.0%, -2.4%)/s, points wander |
| scene_03 | #7 | 8.7–9.9s | #0b0e12 | #262529, centre (0.43, 0.65), radius 0.21 | #2c3033 #6a6368 #9e8a8a | 344 | 0.05 0.00 0.98 0.89 | zoom out 6%/s, turns anticlockwise 5.3°/s, pans (+3.5%, -5.6%)/s, points wander |
| scene_04 | #8 | 9.9–11.1s | #0b0e12 | #29282d, centre (0.47, 0.62), radius 0.19 | #2b2f31 #736970 | 338 | 0.09 0.15 0.97 0.97 | zoom in 1%/s, turns anticlockwise 1.8°/s, pans (+7.9%, -7.6%)/s, points wander |
| scene_05 | #10 | 12.2–13.4s | #0b0d11 | #2f2e33, centre (0.53, 0.51), radius 0.14 | #2a2e31 #766c75 | 406 | 0.13 0.14 0.97 0.98 | zoom out 9%/s, turns anticlockwise 1.9°/s, pans (-4.2%, -5.8%)/s, points wander |
| scene_06 | #11 | 13.4–14.6s | #0b0c11 | #2a292e, centre (0.46, 0.52), radius 0.15 | #3b3034 #73797d #965360 | 160 | 0.26 0.13 0.78 0.96 | zoom out 12%/s, turns anticlockwise 2.6°/s, pans (-5.9%, -3.6%)/s, points wander |
| scene_07 | #12 | 14.6–15.8s | #0b0c11 | #28252a, centre (0.47, 0.41), radius 0.20 | #342b30 #82787d #68474e | 161 | 0.15 0.14 0.88 0.97 | zoom out 15%/s, turns anticlockwise 3.1°/s, pans (-3.0%, -2.9%)/s, points wander |
| scene_08 | #13 | 15.8–16.9s | #0b0d11 | #242126, centre (0.45, 0.42), radius 0.24 | #342f34 #7e545f #808788 | 155 | 0.14 0.14 0.83 0.97 | zoom out 12%/s, turns anticlockwise 1.2°/s, pans (-1.4%, -3.3%)/s, points wander |
| scene_09 | #14 | 16.9–18.1s | #0b0d11 | #232226, centre (0.45, 0.40), radius 0.22 | #353135 #7e6169 #8dafa5 | 165 | 0.15 0.14 0.90 0.97 | zoom out 6%/s, turns clockwise 0.5°/s, pans (+0.8%, -4.4%)/s |
| scene_10 | #15 | 18.1–19.3s | #0b0c11 | #252226, centre (0.35, 0.50), radius 0.23 | #302d31 #887e82 #664b54 | 178 | 0.10 0.14 0.89 0.97 | zoom out 5%/s, turns clockwise 1.3°/s, pans (+2.8%, -5.1%)/s, points wander |
| scene_11 | #16 | 19.3–20.4s | #0b0c10 | #272429, centre (0.32, 0.54), radius 0.21 | #2f2d32 #847a80 #664c56 | 137 | 0.08 0.14 0.87 0.97 | zoom out 5%/s, turns clockwise 1.2°/s, pans (+5.3%, -5.5%)/s, points wander |
| scene_12 | #17 | 20.4–21.6s | #0b0b10 | #262228, centre (0.34, 0.46), radius 0.14 | #342b30 #82767b #694851 | 155 | 0.09 0.15 0.87 0.96 | zoom out 6%/s, pans (+6.9%, -4.9%)/s, points wander |
| scene_13 | #18 | 21.6–22.8s | #0a0c10 | #272429, centre (0.35, 0.47), radius 0.14 | #312b30 #82767c #624952 | 201 | 0.09 0.16 0.92 0.97 | zoom out 11%/s, turns anticlockwise 2.3°/s, pans (+5.3%, -4.0%)/s, points wander |
| scene_14 | #19 | 22.8–24.0s | #0b0c10 | #272329, centre (0.39, 0.49), radius 0.14 | #2e2c30 #83787d #5f4750 | 176 | 0.08 0.16 0.90 0.97 | zoom out 12%/s, turns anticlockwise 5.1°/s, pans (+4.1%, -2.7%)/s, points wander |
| scene_15 | #20 | 24.0–25.1s | #0b0c10 | #28242a, centre (0.42, 0.55), radius 0.25 | #38343b #766170 #8d9daa | 165 | 0.10 0.16 0.82 0.95 | zoom out 15%/s, turns anticlockwise 4.1°/s, pans (+4.0%, -2.1%)/s, points wander |
| scene_16 | #23 | 53.5–53.9s | #0b0e12 | #242327, centre (0.60, 0.50), radius 0.13 | #333438 #776b71 #c5d0b8 | 214 | 0.05 0.00 0.98 0.89 | — |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #5 6.4–7.5s · 0 events**

- Ground #090b0f; other main colours #0b0d16 #17171e #23242d; drawn layer #2f3139 #69646f #968f9b #c9d0ca
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_005_ly_01.jpg) [crop L2](shots/shot_005_ly_02.jpg) · Continuous layer: 98% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #6 7.5–8.7s · 0 events**

- Ground #0b0d16; other main colours #080a0e #16171f #272933; drawn layer #30333a #69636d #94959e #ccd0ca
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_006_ly_01.jpg) [crop L2](shots/shot_006_ly_02.jpg) · Continuous layer: 97% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #7 8.7–9.9s · 0 events**

- Ground #0c0d15; other main colours #05090f #12141b #191c24 #6c666d; drawn layer #34353b #6f686f #9f9ea3 #d4d4cf
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_007_ly_01.jpg) [crop L2](shots/shot_007_ly_02.jpg) · Continuous layer: 96% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #8 9.9–11.1s · 1 events**

- Ground #0a0d14; other main colours #08080f #12141b #191c22 #6a6a73; drawn layer #6c676f #333439 #9a999f #d1d0cb
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_008_ly_01.jpg) [crop L2](shots/shot_008_ly_02.jpg) · Continuous layer: 98% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 11.03–11.10s · top right (x 71%–100%, y 11%–20%) · changes, instant · #1b2428 · text “@embodied.dev” · [crop](shots/shot_008_el_01.jpg)

**Motion #9 11.1–12.2s · 1 events**

- Ground #0c0d15; other main colours #06060e #17181d #2b2a34 #716972; drawn layer #786d7b #2a2c33 #534c56 #a6adbb
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_009_ly_01.jpg) [crop L2](shots/shot_009_ly_02.jpg) · Continuous layer: 98% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 12.13–12.20s · top right (x 67%–100%, y 1%–15%) · changes, instant · #1c262a · text “@embodied.dev” · [crop](shots/shot_009_el_01.jpg)

**Motion #10 12.2–13.4s · 0 events**

- Ground #0d0d13; other main colours #05090f #14161d #706f76 #27272f; drawn layer #706a75 #313337 #9998a0 #c9d0cc
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_010_ly_01.jpg) [crop L2](shots/shot_010_ly_02.jpg) · Continuous layer: 100% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #11 13.4–14.6s · 0 events**

- Ground #05090f; other main colours #0c0c12 #14141b #2a252c #747276; drawn layer #7b757e #302d32 #594d54 #bdc1c1
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_011_ly_01.jpg) [crop L2](shots/shot_011_ly_02.jpg) · Continuous layer: 100% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #12 14.6–15.8s · 0 events**

- Ground #05090f; other main colours #0c0d15 #19171f #302830 #53363d; drawn layer #383238 #72666d #95979e #cccec9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_012_ly_01.jpg) [crop L2](shots/shot_012_ly_02.jpg) · Continuous layer: 98% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #13 15.8–16.9s · 1 events**

- Ground #05090f; other main colours #0c0d15 #11131a #1e1b23 #533a43; drawn layer #332f38 #7f7680 #624f58 #b7bec1
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_013_ly_01.jpg) [crop L2](shots/shot_013_ly_02.jpg) · Continuous layer: 95% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 16.83–16.90s · top right (x 67%–100%, y 2%–29%) · changes, instant · #182024 · text “@embodied.dev” · [crop](shots/shot_013_el_01.jpg)

**Motion #14 16.9–18.1s · 1 events**

- Ground #05090f; other main colours #0c0d15 #18181f #2f2830; drawn layer #302f35 #7f777f #5d4d55 #b5bec1
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_014_ly_01.jpg) [crop L2](shots/shot_014_ly_02.jpg) · Continuous layer: 92% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 18.00–18.13s · top right (x 56%–100%, y 1%–22%) · changes, unfolds rightward (draw-on / grow / wipe), instant · #1b2328 · text “@embodied.dev / @lembodied.dev” · [crop](shots/shot_014_el_01.jpg)

**Motion #15 18.1–19.3s · 1 events**

- Ground #08080f; other main colours #0c0d15 #18181f #2e282f #6a6778; drawn layer #302e36 #7e7582 #5a4b56 #b6bcc0
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_015_ly_01.jpg) [crop L2](shots/shot_015_ly_02.jpg) · Continuous layer: 93% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 19.23–19.30s · top right (x 53%–100%, y 0%–14%) · changes, unfolds rightward (draw-on / grow / wipe), instant · #1a2428 · text “@lembodied.dev / @embodied.dev” · [crop](shots/shot_015_el_01.jpg)

**Motion #16 19.3–20.4s · 1 events**

- Ground #05090f; other main colours #0c0d15 #19161e #2d262e #52383c; drawn layer #322e38 #7b7585 #614e57 #b3b7c0
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_016_ly_01.jpg) [crop L2](shots/shot_016_ly_02.jpg) · Continuous layer: 96% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 20.40–20.47s · top right (x 71%–100%, y 0%–18%) · changes, instant · #1a2428 · text “@embodied.dev” · [crop](shots/shot_016_el_01.jpg)

**Motion #17 20.4–21.6s · 0 events**

- Ground #05090f; other main colours #0c0d15 #17151c #2a252c #4f333a; drawn layer #312d33 #7c727c #594c54 #b0b6b9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_017_ly_01.jpg) [crop L2](shots/shot_017_ly_02.jpg) · Continuous layer: 98% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #18 21.6–22.8s · 0 events**

- Ground #05090f; other main colours #0c0d15 #19181f #30272f #52393f; drawn layer #2f2c33 #7a737e #544953 #b1b8bd
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_018_ly_01.jpg) [crop L2](shots/shot_018_ly_02.jpg) · Continuous layer: 99% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #19 22.8–24.0s · 0 events**

- Ground #08080f; other main colours #0c0d15 #15151c #272028 #4a353c; drawn layer #2e2d35 #7d747e #594b55 #b2bac1
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_019_ly_01.jpg) [crop L2](shots/shot_019_ly_02.jpg) · Continuous layer: 98% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #20 24.0–25.1s · 1 events**

- Ground #08080f; other main colours #0c0d15 #17171f #2d2733 #50383e; drawn layer #323139 #7f7584 #5c505c #b4bcc0
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_020_ly_01.jpg) [crop L2](shots/shot_020_ly_02.jpg) · Continuous layer: 95% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 25.03–25.10s · top right (x 67%–100%, y 0%–36%) · changes, instant · #182226 · text “@embodied.dev” · [crop](shots/shot_020_el_01.jpg)

**Motion #21 25.1–52.6s · 1 events**

- Ground #172323; other main colours #1e2b2d #595d6c #0c0f14 #364a49; drawn layer #5e5f6e #807a88 #39353c #b7c1be
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_021_ly_01.jpg) [crop L2](shots/shot_021_ly_02.jpg) · Continuous layer: 5% of the frame moves through the whole shot (x 4%–89%, y 19%–78%), e.g. drifting gradients, particle flow, breathing glow
1. 31.13–52.60s · top right (x 56%–100%, y 0%–34%) · changes, unfolds downward (draw-on / grow / wipe), ease-in · #2c2a33 · text “@embodied.dev / @lembodied.dev / D-A” · [crop](shots/shot_021_el_01.jpg)

**Motion #23 53.5–53.9s · 2 events**

- Ground #0c0d15; other main colours #05090f #14141b #23242d; drawn layer #36353e #726671 #9392a3 #d2cfc6
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–22%, y 45%–68% · #0c0a11 · [crop](shots/shot_023_st_01.jpg)
- S2. never moves: shape / text block · x 0%–69%, y 62%–82% · #4f4c5f · text “And ifyourewind all of it,” · [crop](shots/shot_023_st_02.jpg)
- S3. never moves: shape / text block · x 71%–89%, y 75%–80% · #0e0c13 · [crop](shots/shot_023_st_03.jpg)
- S4. never moves: shape / text block · x 18%–33%, y 78%–86% · #07080e · [crop](shots/shot_023_st_04.jpg)
- S5. never moves: shape / text block · x 60%–73%, y 85%–95% · #0c0b12 · [crop](shots/shot_023_st_05.jpg)
- S6. never moves: shape / text block · x 31%–51%, y 88%–98% · #07080e · [crop](shots/shot_023_st_06.jpg)
- S7. never moves: shape / text block · x 0%–18%, y 90%–100% · #06070a · [crop](shots/shot_023_st_07.jpg)
- S8. never moves: shape / text block · x 89%–100%, y 92%–99% · #0d0b12 · [crop](shots/shot_023_st_08.jpg)
- [crop L1](shots/shot_023_ly_01.jpg) [crop L2](shots/shot_023_ly_02.jpg) · Continuous layer: 9% of the frame moves through the whole shot (x 0%–100%, y 12%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 53.57–53.83s · bottom (x 0%–100%, y 68%–100%) · changes, moves rightward, linear · #19171e · text “And ifyourewind all of it,” · [crop](shots/shot_023_el_01.jpg)
2. 53.57–53.70s · bottom (x 27%–40%, y 90%–96%) · appears, slides rightward, instant · #1c1b22 · [crop](shots/shot_023_el_02.jpg)

**Motion #24 53.9–55.0s · 0 events**

- Ground #06090d; other main colours #0b0d16 #56576a #606174 #474857; drawn layer #5c5b6c #3c4149 #93909d
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_024_ly_01.jpg) [crop L2](shots/shot_024_ly_02.jpg) · Continuous layer: 3% of the frame moves through the whole shot (x 0%–100%, y 16%–52%), e.g. drifting gradients, particle flow, breathing glow
