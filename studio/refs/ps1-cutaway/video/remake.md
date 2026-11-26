---
videomd: 1
part: remake
tokens: 9008
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 10 steps as the original (narrative line under “Content and structure”)
2. **Collect material**: the real material in the picture (live footage) needs the original files, listed under “What to prepare”
3. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 8 lines with their pace in the script table under “Sound”; delivery per “Acting and emotion”
4. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
5. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
6. **Music**: find a track at the same tempo and mood (source: to confirm, about 172 BPM, F major)
7. **Sound effects**: 13; place similar ones from a library at the times under “Sound”
8. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**live action 1 shot → 1 scene, 1 camera setup; code render / screen capture 19 shots → 1 code project (2 parts)**

### Shooting scenes

Shoot every shot of one scene before moving to the next; within a scene, shoot the wider sizes first and the close-ups last so the lighting is set only once. Leave about 1s of handle at both ends of every take.

**S1**: shots #12 (1.6s on screen); backyard: wooden picket fence, pine trees, red house corner, grey metal bins, gr, low-poly, 64 px textures, nearest pixels
- Lighting: soft frontal light (flat light), key light frontal, cool (daylight / cool-white LED)
- Setup medium shot · fixed camera (tripod / mount / on the desk) · static: shots #12, 1.6s on screen, shoot about 3.6s

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #1–#11 (0.0–23.5s)
- Part 2: shots #13–#20 (25.1–43.2s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- kinetic type: Word-by-word spring() entrances (offset + scale + opacity), highlight boxes on key words; match font, size and leading from the frame
- data chart: SVG / D3 scales for axes and marks, numbers counted up with interpolate(), bars / lines grown with spring()

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #1 | 0.0–0.4s | kinetic type | Host animal in a yellow suit and red tie stands right of a wooden sign board in a sunny backyard (wooden fence, pine trees, red house corner, grey bins). White wireframe triangles flash over the host for a few frames (the mesh shown), title text top-left: three lines, middle line yellow. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | pull out 2%/s | ground #86b244 · #90b9dc #ac7245 #4b3f4a #8c8592 · drawn #2f2d35 #7b554d #97bee6 #faf6f6 | Low poly / made with visualizemy.com / Howtomake |
| #2 | 0.4–1.4s | kinetic type | Same set; the sign board's numbered lines scribble in one by one (red numerals, dark text on the brown board). Host turns toward the board. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | green, blue, orange | made with visualizemy.com / How to make |
| #3 | 1.4–6.5s | data chart | Board fills to six numbered lines; host changes pose on each phrase (point at board, arm up, shrug); a wooden crate with a blue label slides in from the left as the objection, then a fast camera swing past the host's side. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | white, green | made with visualizemy.com / BLENDER / How to make |
| #4 | 6.5–11.4s | kinetic type | The same host rebuilt smooth and glossy (high-poly, soft shading, no pixels) waving in a backyard with tall grass and bins; a typed command line appears at the top; camera pushes in twice to a big face; one-word captions. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static | ground #a0d3eb · #aaa492 #85b25e #655d45 #cdac38 · drawn #171e19 #5a5c25 #707265 #f0f3f9 | made with visualizemy.com / >makearacco / >make a raccoon explainer: / moke a raccoon explainer: / make a raccoon explainer: / 1/6 low poly:300 triangles, |
| #5 | 11.4–11.5s | kinetic type | Near-white flash frame with shards starting to fly. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static | ground #8fbc49 · #9ec4e6 #955f3a #918b9a #645a65 · drawn #444247 #715e65 #201b20 | three / flatshading / made with visualizemy.com / 1/6 low poly:300 triangles, |
| #6 | 11.5–14.6s | data chart | Hundreds of coloured triangles fly in and lock into a flat-shaded untextured low-poly host in T-pose (grey faceted head, orange box jacket, red tie, navy legs); camera orbits a few degrees; header 'k/6 rule' at the top with the numeral in yellow. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | ground #8bbb48 · #9ac5e8 #9a603a #958a98 #5f5362 · drawn #5a5863 #28242e #9e523d | flatshading / made with visualizemy.com / 1/6 low poly: 300 triangles, / 1/6 Low poly: 300 triangles, / 1/6 low poly:300 triangles, / 2/664 |
| #7 | 14.6–15.7s | kinetic type | T-pose host, header switches to the next rule number, word caption. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static | ground #8cbc49 · #97c4e9 #9a603c #9c909e #487345 · drawn #4d4f55 #9f523d #262127 #9189ac | paintedby / made with visualizemy.com / 2/664-pixeltextures, / 2/664-pixeltextures |
| #8 | 15.7–19.7s | data chart | Textures pop onto the host (striped fur, speckled jacket); the 64 px face texture is pulled out as a flat square in front of the head and shown big, then snaps back; header moves on to rule 3. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static | green, blue, orange | made with visualizemy.com / 2/664-pixeltextures, / 3/6ren / 3/6renderat270x480, / 3/6 render at 270 x 480, |
| #9 | 19.7–20.4s | kinetic type | The whole frame shrinks to a small 270 x 480 card centred on black, held, then grows back. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static | ground #080713 · #7a685d #93bb49 #b3a3af #3c393e · drawn #a1a1ce #a2b545 #f9f5f8 #73665b | 1.uop / no smoothing / made with visualizemy.com / 3/6 render at 270 x 480, |
| #10 | 20.4–21.8s | kinetic type | Extreme close-up of the host's face: square pixels clearly visible, a highlighted keyword under the header; pulls back to a medium shot. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | ground #bea0d6 · #80767c #dd9423 #af9ba0 #231f2a · drawn #251d28 #f3e1dd #594852 #ed9335 | made with visualizemy.com / 3/6render at270x480, / 3/6renderat270x480, |
| #11 | 21.8–23.5s | data chart | Medium on the host in T-pose, header rule 4; a vertical yellow line splits the frame into before (left) and after (right) with small labels at the top. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | green, orange, blue | made with visualizemy.com / 4/6 snapvertices to a grid, / 4/6 snap vertices to a grid, / 4/6snapvertices |
| #13 | 25.1–29.6s | data chart | Host in T-pose splits down the middle into two halves that slide apart; the cut faces are a dark violet fill with bright orange triangle edges; the ground under him is cut too, showing pixel dirt layers; a yellow outlined label with a thin orange leader line names the inside; host deadpans at the joke. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | green, orange, blue | NOTHING / made with visualizemy.com / 5/6sliceito / 5/6 slice itopen, / 5/6sliceitopen, / 6/6a |
| #14 | 29.6–35.0s | kinetic type | Halves close; the host strikes a different pose on every phrase: arms down, arms up in a V, hands on hips, a bow, a shrug, pointing at the viewer; camera static at medium. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | green, blue, orange | made with visualizemy.com / 6/6anewpose / makear / 6/6anewpos |
| #15 | 35.0–36.6s | kinetic type | Camera pulls back; host walks to the lower left and gets small; the evening backyard opens up behind; the command line at the top changes its keyword. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | green, blue, orange | explainer / made with visualizemy.com / makea racco / makea |
| #16 | 36.6–37.0s | kinetic type | Plain dusky purple backdrop with a low horizon; a big striped low-poly volcano cut in half shows a bright orange magma pipe from a glowing pool to the crater, pixel lava chunks flying; host at lower left raises an arm. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | red, purple, white | thing / explainer / made with visualizemy.com / make a |
| #17 | 37.0–37.7s | kinetic type | Volcano holds, then hard cut to the next example. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | purple, red | explainer / made with visualizemy.com / make a volcano / makeaheart |
| #18 | 37.7–38.3s | kinetic type | Pink backdrop; a big red faceted heart sliced open shows blue and red chambers and vessels; host at lower left touches it. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | red, white | Coffee / explaliner / made with visualizemy.com / makeaheart |
| #19 | 38.3–39.2s | kinetic type | Warm beige backdrop; a blocky machine with its front removed shows a blue water tank, a boiler, a brown portafilter and a cup; host at lower left gestures at it. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static frame, elements move inside it | orange, white | machine! / explainer / made with visualizemy.com / makea coffee machine |
| #20 | 39.2–43.2s | data chart | Back in the backyard: a big wooden board fills the upper frame with the full numbered list; the small host stands bottom right; title at the top with a yellow second line. Real-time three.js scene rendered at 270 x 480 and blown up 4x with nearest-neighbour (chunky square pixels), flat-shaded low-poly models (each face one tone), tiny 64 px textures painted by code (fabric speckle, fur stripes, grass tufts, wood grain), vertex positions snapped to the low-res grid so edges wobble a little as the camera moves, ordered dithering on gradients. | static | green, orange, blue | on every sentence / Link in bio / made with visualizemy.com / full prompt free |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #6 | 11.5–14.6s | #91c94b | #7e604a, centre (0.54, 0.53), radius 0.43 | #36343c #915a3c #766d83 | 74 | 0.01 0.01 0.98 0.80 | zoom in 2%/s, turns clockwise 0.7°/s, pans (+0.8%, -0.0%)/s, points wander |
| scene_02 | #7 | 14.6–15.7s | #91c94c | #7c5c44, centre (0.53, 0.54), radius 0.42 | #35363a #98543a #787478 | 68 | 0.01 0.01 0.98 0.82 | turns anticlockwise 0.7°/s, pans (-0.5%, -0.3%)/s, points wander |
| scene_03 | #9 | 19.7–20.4s | #09060f | #7c6f73, centre (0.50, 0.50), radius 0.20 | #a3a1d2 #95ca4f #90793e | 24 | 0.38 0.38 0.62 0.62 | — |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #1 0.0–0.4s · 0 events**

- Ground #86b244; other main colours #90b9dc #ac7245 #4b3f4a #8c8592; drawn layer #2f2d35 #7b554d #97bee6 #faf6f6
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 4%–22%, y 18%–21% · #fdfbff · [crop](shots/shot_001_st_01.jpg)
- S2. never moves: shape / text block · x 27%–36%, y 18%–21% · #fdfcff · text “Howtomake” · [crop](shots/shot_001_st_02.jpg)
- S3. never moves: shape / text block · x 38%–60%, y 18%–21% · #fefdff · [crop](shots/shot_001_st_03.jpg)
- S4. never moves: shape / text block · x 0%–56%, y 22%–32% · #fefbff · text “low poly videos / with Claude” · [crop](shots/shot_001_st_04.jpg)
- S5. never moves: shape / text block · x 4%–20%, y 22%–26% · #f9ce3e · [crop](shots/shot_001_st_05.jpg)
- S6. never moves: shape / text block · x 44%–71%, y 22%–26% · #f7ce3e · [crop](shots/shot_001_st_06.jpg)
- S7. never moves: shape / text block · x 9%–49%, y 49%–71% · #bf8053 · text “Low poly” · [crop](shots/shot_001_st_07.jpg)
- S8. never moves: shape / text block · x 0%–2%, y 62%–71% · #8a858f · [crop](shots/shot_001_st_08.jpg)
- [crop L1](shots/shot_001_ly_01.jpg) [crop L2](shots/shot_001_ly_02.jpg) · Continuous layer: 20% of the frame moves through the whole shot (x 0%–98%, y 0%–82%), e.g. drifting gradients, particle flow, breathing glow

**Motion #2 0.4–1.4s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #3 1.4–6.5s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #4 6.5–11.4s · 11 events**

- Ground #a0d3eb; other main colours #aaa492 #85b25e #655d45 #cdac38; drawn layer #171e19 #5a5c25 #707265 #f0f3f9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_004_ly_01.jpg) [crop L2](shots/shot_004_ly_02.jpg) · Continuous layer: 52% of the frame moves through the whole shot (x 0%–100%, y 1%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 6.57–8.97s · top (x 27%–78%, y 5%–12%) · changes, unfolds upward (draw-on / grow / wipe), ease-in-out · #9dd4ed · text “made with visualizemy.com” · [crop](shots/shot_004_el_01.jpg)
2. 8.70–11.37s · middle right (x 80%–100%, y 38%–41%) · appears, slides leftward, ease-in-out · #3b525e · [crop](shots/shot_004_el_02.jpg)
3. 8.83–8.97s · top left (x 0%–11%, y 12%–31%) · changes, moves upward, instant · #9dd4ed · [crop](shots/shot_004_el_03.jpg)
4. 8.90–8.97s · top left (x 0%–7%, y 4%–9%) · appears, instant · #9dd4ed · [crop](shots/shot_004_el_04.jpg)
5. 8.97–9.17s · middle right (x 82%–96%, y 62%–68%) · appears, slides leftward, ease-out · #bbac8c · [crop](shots/shot_004_el_05.jpg)
6. 10.37–11.10s · middle left (x 2%–47%, y 41%–62%) · changes, moves leftward, ease-in-out · #9d8d75 · [crop](shots/shot_004_el_06.jpg)
7. 10.43–11.03s · middle right (x 69%–100%, y 50%–68%) · changes, moves rightward, ease-in-out · #a6a168 · [crop](shots/shot_004_el_07.jpg)
8. 10.57–10.77s · top right (x 60%–100%, y 0%–9%) · changes, linear · #9dd4ed · [crop](shots/shot_004_el_08.jpg)
9. 10.57–10.77s · top (x 33%–78%, y 2%–8%) · changes, moves rightward, ease-in · #9dd4ed · [crop](shots/shot_004_el_09.jpg)
10. 10.57–10.90s · bottom (x 2%–89%, y 86%–100%) · changes, ease-in-out · #7ba04f · [crop](shots/shot_004_el_10.jpg)
11. 10.63–11.37s · top (x 4%–91%, y 16%–29%) · changes, unfolds rightward (draw-on / grow / wipe), ease-out · #9dd4ed · text “>makearacco / yellow suit, backya / yellow suit, backyard.” · [crop](shots/shot_004_el_11.jpg)

**Motion #5 11.4–11.5s (fade in) · 0 events**

- Ground #8fbc49; other main colours #9ec4e6 #955f3a #918b9a #645a65; drawn layer #444247 #715e65 #201b20
- No element motion measured (still picture or only slight changes)

**Motion #6 11.5–14.6s (flash cut: the picture opens bright and settles in 0.0s) · 2 events**

- Ground #8bbb48; other main colours #9ac5e8 #9a603a #958a98 #5f5362; drawn layer #5a5863 #28242e #9e523d
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_006_ly_01.jpg) [crop L2](shots/shot_006_ly_02.jpg) · Continuous layer: 40% of the frame moves through the whole shot (x 0%–100%, y 0%–85%), e.g. drifting gradients, particle flow, breathing glow
1. 11.57–11.77s · bottom (x 0%–100%, y 62%–100%) · changes, moves upward, ease-out · #90be47 · text “triangles / flat / shading” · [crop](shots/shot_006_el_01.jpg)
2. 13.43–14.57s · bottom (x 0%–100%, y 55%–92%) · changes, moves downward, ease-in-out · #90723d · text “triangles / flat / shading” · [crop](shots/shot_006_el_02.jpg)

**Motion #7 14.6–15.7s · 0 events**

- Ground #8cbc49; other main colours #97c4e9 #9a603c #9c909e #487345; drawn layer #4d4f55 #9f523d #262127 #9189ac
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–100%, y 0%–36% · #97c4eb · text “made with visualizemy.com / 2/664-pixeltextures / 2/664-pixeltextures,” · [crop](shots/shot_007_st_01.jpg)
- S2. never moves: shape / text block · x 9%–24%, y 25%–41% · #97c4eb · [crop](shots/shot_007_st_02.jpg)
- S3. never moves: shape / text block · x 80%–91%, y 40%–49% · #9b613e · [crop](shots/shot_007_st_03.jpg)
- S4. never moves: shape / text block · x 11%–22%, y 41%–52% · #9b613e · [crop](shots/shot_007_st_04.jpg)
- S5. never moves: shape / text block · x 16%–84%, y 52%–64% · #f29b1d · [crop](shots/shot_007_st_05.jpg)
- S6. never moves: shape / text block · x 11%–22%, y 57%–66% · #9b613e · [crop](shots/shot_007_st_06.jpg)
- S7. never moves: shape / text block · x 42%–64%, y 65%–69% · #ad7012 · [crop](shots/shot_007_st_07.jpg)
- S8. never moves: shape / text block · x 38%–62%, y 79%–83% · #251e26 · [crop](shots/shot_007_st_08.jpg)
- [crop L1](shots/shot_007_ly_01.jpg) [crop L2](shots/shot_007_ly_02.jpg) · Continuous layer: 4% of the frame moves through the whole shot (x 0%–100%, y 10%–72%), e.g. drifting gradients, particle flow, breathing glow

**Motion #8 15.7–19.7s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #9 19.7–20.4s (zoom in) · 2 events**

- Ground #080713; other main colours #7a685d #93bb49 #b3a3af #3c393e; drawn layer #a1a1ce #a2b545 #f9f5f8 #73665b
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 28%–36%, y 12%–14% · #7f7b86 · [crop](shots/shot_009_st_01.jpg)
- S2. never moves: shape / text block · x 37%–44%, y 12%–14% · #847f8b · [crop](shots/shot_009_st_02.jpg)
- S3. never moves: shape / text block · x 45%–72%, y 12%–14% · #7c7883 · text “made with visualizemy.com” · [crop](shots/shot_009_st_03.jpg)
- S4. never moves: shape / text block · x 4%–39%, y 16%–20% · #fae1e8 · [crop](shots/shot_009_st_04.jpg)
- S5. never moves: shape / text block · x 40%–66%, y 16%–20% · #fdfbff · text “3/6 render at 270 x 480,” · [crop](shots/shot_009_st_05.jpg)
- S6. never moves: shape / text block · x 67%–81%, y 16%–20% · #fdfaff · [crop](shots/shot_009_st_06.jpg)
- S7. never moves: shape / text block · x 29%–60%, y 21%–25% · #fffcff · text “no smoothing” · [crop](shots/shot_009_st_07.jpg)
- S8. never moves: shape / text block · x 17%–24%, y 22%–24% · #fefcff · [crop](shots/shot_009_st_08.jpg)
1. 19.80–19.87s · middle (x 18%–82%, y 19%–81%) · changes, instant · #0a0611 · text “3/6 render at 270 x 480, / no smoothing / 1.uop” · [crop](shots/shot_009_el_01.jpg)
2. 20.20–20.27s · middle (x 33%–67%, y 34%–78%) · changes, instant · #909a59 · text “1.uop” · [crop](shots/shot_009_el_02.jpg)

**Motion #10 20.4–21.8s (zoom in) · 2 events**

- Ground #bea0d6; other main colours #80767c #dd9423 #af9ba0 #231f2a; drawn layer #251d28 #f3e1dd #594852 #ed9335
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_010_ly_01.jpg) [crop L2](shots/shot_010_ly_02.jpg) · Continuous layer: 93% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
1. 21.57–21.77s · bottom right (x 76%–100%, y 81%–91%) · changes, moves rightward, ease-in · #9f7736 · [crop](shots/shot_010_el_01.jpg)
2. 21.63–21.77s · bottom left (x 0%–24%, y 81%–91%) · changes, moves leftward, instant · #9b6436 · [crop](shots/shot_010_el_02.jpg)

**Motion #11 21.8–23.5s (zoom in) · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #13 25.1–29.6s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #14 29.6–35.0s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #15 35.0–36.6s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #16 36.6–37.0s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #17 37.0–37.7s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #18 37.7–38.3s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #19 38.3–39.2s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #20 39.2–43.2s · 0 events**

- No element motion measured (still picture or only slight changes)

### Real material in the picture (the original files are needed)

1 shots, 1.6s (4%) contain real material (screen recordings, screenshots, photos, embedded video); a model cannot stand in for them:

- **live footage** (whole frame): shots #12, 1.6s in all

### Acting and emotion

In a prompt, describe the visible expression and movement rather than words like “happy” or “sad”, and keep it smaller rather than bigger (strong emotion words tend to give mask faces and forced smiles); get the expression right in the first frame; for shots with lines, make the voice with its delivery first and let the picture act to it. For generated shots the Face and Movement below are already in the generation-unit prompts.

**all 18 shots**

| Shot | Who | Emotion (strength) | Face | Movement / change | Delivery | How to get it |
|---|---|---|---|---|---|---|
| #1 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #2 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #3 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #4 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #6 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #7 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #8 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #10 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #11 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #12 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | actor plays it |
| #13 | A | playful (medium) ★key | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #14 | A | playful (medium) ★key | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #15 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #16 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #17 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #18 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #19 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |
| #20 | A | playful (medium) | big round eyes, open mouth on stressed words, smirk and half-closed eyes on jokes | a new arm pose on every sentence: T-pose, wave, point at the thing, arms up, hands on hips, shrug, bow | — | expression in the first frame |

- **expression in the first frame**: Get the expression right in the first frame; the prompt only describes the motion and the change
- **actor plays it**: Filmed: hand the face, movement and delivery to the actor as direction, and rehearse the pauses and tone against the original once
