---
videomd: 1
part: remake
tokens: 5964
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 7 steps as the original (narrative line under “Content and structure”)
2. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 9 lines with their pace in the script table under “Sound”
3. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
4. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
5. **Music**: find a track at the same tempo and mood (source: to confirm, about 140 BPM, A minor)
6. **Sound effects**: 15; place similar ones from a library at the times under “Sound”
7. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**code render / screen capture 16 shots → 1 code project**

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #1–#16 (0.0–37.4s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- vector shapes: SVG shapes + interpolate() / spring() keyframes, positions and timing measured from the frame
- gradients / colour fields: CSS linear / radial gradients, or a few large circles with filter: blur() drifting slowly; glass cards with backdrop-filter
- kinetic type: Word-by-word spring() entrances (offset + scale + opacity), highlight boxes on key words; match font, size and leading from the frame
- data chart: SVG / D3 scales for axes and marks, numbers counted up with interpolate(), bars / lines grown with spring()

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #1 | 0.0–3.8s | vector shapes | Extreme close-up of a stick person (head and chest fill the frame, figure drawn about 1500 px tall with feet below the frame): yellow bean torso, big white round head with a purple polka-dot bandana and a black eye patch, one eye open, smirk. Behind him a blurred (5 px) sunny deck: sky, tall cliff pillars with green tops, sea band, red railing, barrel and cannon, a second small figure far back. Slow push-in (+3.5%) with handheld drift; at 2.5 s his hand reaches up (IK) and lifts the patch with a backOut pop, revealing a healthy eye with a white 4-point sparkle; mouth turns to a grin. Captions 1-2 words at y 1345. | push in 2%/s, picture drifts left | orange, white, blue | — |
| #2 | 3.8–5.5s | vector shapes | Wide establishing view: bright sky gradient (blue top to warm cream at the horizon), large sun with additive glow and slowly turning rays, clouds, tall cliff pillars with green blob tops on the horizon, a turquoise sea band with drifting white wave dashes to the bottom; two sailing ships bob on the water; a tiny stick person swings on a rope from one ship to the other. Camera pans right and pushes in (+6%) with a warm heat glow over the frame. Whip in and whip out. | push in 3%/s, picture drifts left | white, cyan, orange | — |
| #3 | 5.5–8.2s | vector shapes | Sunny ship deck: sky with sun, cliff pillars, red railing (bulwark) across the frame at about y 900, wooden deck floor in perspective (planks from a vanishing point above, lighter toward the viewer), a mast, rigging, barrels and a crate. The red-striped stick person (red polka-dot bandana) swings in on a rope, lands with squash and two dust puffs, then squints at the sun with gritted teeth, shading his eyes, sweat drops; a warm screen-blend heat glow pulses. Camera follows and pushes in from 1.0 to 1.22. | push in 3%/s, picture drifts up | orange | — |
| #4 | 8.2–10.6s | vector shapes | Wide deck view (horizon higher): a hatch hole in the floor in perspective with a ladder top; three blue-striped crew stick people in white sailor caps idle, then panic (wide eyes, gritted teeth, raised brows, yellow '!' marks, sweat drops), run with hands up and jump down the hatch one after another (clipped at the hatch edge). The hero enters from the left edge grinning with a sword in his raised hand. Slow push-in 1.0 to 1.1, handheld drift. Hard cut out. | push in 2%/s, picture drifts up | orange | so you |
| #5 | 10.6–12.5s | vector shapes | Same deck and hatch, closer (zoom 1.15 to 1.35, camera tilting down toward the hatch): the hero runs in from the right with a determined grin, jumps (hands up, mouth O) and drops into the hatch, clipped by its front edge; a dust puff rises from the hole. Hard cut to black. | push in 4%/s, picture drifts up | orange | jump down / afterthem |
| #6 | 12.5–13.9s | gradients / colour fields | Near-black frame (L about 0.11): the hero is a black silhouette barely darker than the ground, drawn huge (about 2400 px tall) so only the head shows; only his two white eyes glow, darting left, right, then blinking; a sweat drop. Slow push-in. Whip out. | static | ground #02020a · #06060e #fcfbff · drawn #fefcfe | — |
| #7 | 13.9–15.6s | kinetic type | Diagram shot: a full-frame hot radial glow (cream centre, yellow, orange edge) with 16 slowly rotating white rays at 18%; a big outlined eye (almond shape 720 px wide, white with a teal iris of radial lines, a small black pupil, highlights, 5 lashes) with a squinting lid; above it a sun icon (outlined circle with 10 rotating rays). Zoom settles from 1.12 to 1.0 after the whip in. | static frame, elements move inside it | ground #c78936 · #fad476 #e9ba54 #fce6a2 #d7a145 · drawn #3b8ba2 #2c2524 #fdeda5 #f9f6f3 | your eyes |
| #8 | 15.6–18.5s | data chart | Continuation of the diagram: the glow turns into a dark navy radial gradient with 40 twinkling star dots; the lid opens, the sun icon shrinks away and a gold pocket stopwatch pops in (backOut) whose blue wedge fills as the minute hand sweeps; a big yellow number with a thick ink outline counts up beside it ('NN MIN', pops 25% on landing); the pupil widens slowly to most of the iris with two small yellow arrows pointing outward. Held while the line finishes. | push in 2%/s, picture drifts up | ground #0b0f25 · #0f1737 #172045 #f6f3ee #578a9c · drawn #faf4ed #428ea2 #e1c050 #bbc2d9 | — |
| #9 | 18.5–19.8s | vector shapes | Dark interior (wooden wall boards and ribs at near-black with a blue tint): two crew silhouettes sneak in from both sides holding frying pans; the hero is a silhouette with only white eyes looking left and right. Camera close (zoom 1.45 to 1.62). | static | ground #0c0a13 · #0d0d1a #0a0a19 #161420 · drawn #fdfbfd #bab7ba #7e7b7e #49464a | to get |
| #10 | 19.8–21.0s | vector shapes | First hit: a pan swings (eased arc) onto the hero's head; a yellow jagged burst with a red 'BONK!' word pops (backOut, 0.5 s), the camera shakes (30 px decaying in 0.25 s) and rotates slightly, a warm flash (35%) lights the silhouettes brown for a moment; the hero's eyes become white X marks. | static | ground #0e0a19 · #0a070f #0b0c17 #161521 · drawn #f7f3ed #f8cd41 #79726c #c8442c | people you / BONK! / smacked by |
| #11 | 21.0–21.6s | vector shapes | Second hit from the other side: another BONK burst, shake and flash; eyes become rotating spirals and three yellow stars circle the head. Whip out. | picture drifts right | ground #0d0d19 · #0a070f #594033 #f0c841 · drawn #f6cd43 #f4efe3 #807150 #d73831 | BONK! / cant see |
| #12 | 21.6–25.1s | vector shapes | Below deck in a warm light shaft (additive trapezoid from the top): the yellow-shirted insider drops in from above (arms up), lands with squash, camera punches in from 1.0 to 1.75 on him; he reaches to the patch and flips it to the other eye with a backOut snap; a white sparkle on the revealed eye, his mouth goes from smirk to grin. Hard cut out. | push in 2%/s, picture drifts up | ground #161014 · #5b4e44 #261f21 #413631 #e3a82c · drawn #ede6e2 #e3a92c #6d5e50 #7651bd | — |
| #13 | 25.1–27.3s | vector shapes | Black frame; a circular reveal opens from the centre (radial gradient mask, radius 0 to 1500 px over 2.8 s) with a faint light-blue iris ring at its edge, showing the hold in cool blue-grey: three crew members holding pans, barrels, a crate, a lantern; the reveal is an eye opening. | picture drifts down | ground #020409 · #161014 #2c1f1d #3a4157 #5e7094 · drawn #353d54 #8092b6 #515f84 #f9f7f9 | — |
| #14 | 27.3–29.0s | vector shapes | Same hold fully revealed (blue multiply tint fading to warm): the three crew members startle (wide eyes, teeth, hands up, jump 60 px, sweat drops); the hero lies knocked out on the floor with spiral eyes. Whip out. | pull out 2%/s | ground #32201b · #492e22 #91643f #c9cedb #734830 · drawn #6e503b #8697bb #d3d6e1 #344e9a | can see |
| #15 | 29.0–32.3s | kinetic type | Top view of a wooden table (horizontal boards); a cream paper card (820 x 1140, rounded, ink outline, drop shadow, tilted -2 degrees) with a two-line serif title, an underline, a doodle head and three checklist rows; green ticks pop in one by one (0.35 s apart, backOut); a big wooden rubber stamp on an ink arm slams down (easeIn), leaving a red rotated stamp word with a double border and ink-speckle holes, dust puffs, camera shake. Whip out. | pull out 2%/s, picture drifts right | ground #633823 · #714026 #efe5d1 #c3a998 #dac6b3 · drawn #f4e7d2 #ddd0bd #fef8f3 | THEORY / PLAUSIBLE / EYE PATCH / TATCH |
| #16 | 32.3–37.4s | vector shapes | Lantern-lit hold (warm additive glow): the insider stands on a treasure chest of gold coins holding a lit lantern, grinning, taps the patch and winks with a sparkle; the three crew members sit tied together with a rope, frowning; the hero lies dazed on the floor with stars circling. Opens punched in (1.6) and pulls out to 1.0, then holds. | static frame, elements move inside it | ground #2a1916 · #553220 #75472b #9b5e32 #c68444 · drawn #f8f3eb #edc351 #8f5030 #ad98b9 | — |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #6 | 12.5–13.9s | #050509 | #727174, centre (0.50, 0.49), radius 0.19 | #fefefe | 3 | 0.25 0.40 0.81 0.54 | zoom in 5%/s |
| scene_02 | #8 | 15.6–18.5s | #0c1127 | #a6a3a0, centre (0.49, 0.36), radius 0.22 | #f8f5ef #3f92a6 #e1c354 | 31 | 0.20 0.15 0.80 0.62 | zoom in 2%/s |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #1 0.0–3.8s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #2 3.8–5.5s (whip pan in) · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #3 5.5–8.2s (whip pan in) · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #4 8.2–10.6s (whip pan in) · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #5 10.6–12.5s · 0 events**

- No element motion measured (still picture or only slight changes)

**Motion #6 12.5–13.9s · 3 events**

- Ground #02020a; other main colours #06060e #fcfbff; drawn layer #fefcfe
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_006_ly_01.jpg) [crop L2](shots/shot_006_ly_02.jpg) · Continuous layer: 4% of the frame moves through the whole shot (x 22%–84%, y 38%–72%), e.g. drifting gradients, particle flow, breathing glow
1. 13.00–13.80s · middle left (x 16%–44%, y 44%–55%) · changes, moves leftward, ease-in-out · #09060b · [crop](shots/shot_006_el_01.jpg)
2. 13.67–13.80s · middle (x 49%–73%, y 45%–54%) · changes, moves leftward, instant · #09060b · [crop](shots/shot_006_el_02.jpg)
3. 13.80–13.87s · middle right (x 73%–80%, y 39%–44%) · appears, instant · #3d4f5e · [crop](shots/shot_006_el_03.jpg)

**Motion #7 13.9–15.6s (whip pan in) · 8 events**

- Ground #c78936; other main colours #fad476 #e9ba54 #fce6a2 #d7a145; drawn layer #3b8ba2 #2c2524 #fdeda5 #f9f6f3
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_007_ly_01.jpg) [crop L2](shots/shot_007_ly_02.jpg) · Continuous layer: 68% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow
- In sequence: 3 same-size elements, 0.07s apart, about 0.34s each (items 3, 4, 7 below)
1. 13.97–14.10s · middle (x 20%–80%, y 46%–60%) · changes, instant · #3f99ae · [crop](shots/shot_007_el_01.jpg)
2. 14.97–15.57s · middle (x 13%–87%, y 31%–69%) · changes, moves rightward, ease-in · #c8b681 · text “coming from / bright sun / your eyes” · [crop](shots/shot_007_el_02.jpg)
3. 15.17–15.57s · top right (x 44%–96%, y 0%–19%) · changes, scales up, ease-in · #ac843e · [crop](shots/shot_007_el_03.jpg)
4. 15.23–15.57s · top left (x 0%–40%, y 0%–22%) · changes, moves rightward, ease-in · #ab833d · [crop](shots/shot_007_el_04.jpg)
5. 15.23–15.57s · bottom left (x 0%–29%, y 80%–100%) · changes, unfolds leftward (draw-on / grow / wipe), ease-in · #a17435 · [crop](shots/shot_007_el_05.jpg)
6. 15.23–15.57s · bottom (x 29%–56%, y 86%–100%) · changes, unfolds leftward (draw-on / grow / wipe), ease-in · #a47836 · [crop](shots/shot_007_el_06.jpg)
7. 15.30–15.57s · bottom right (x 62%–100%, y 80%–100%) · changes, unfolds rightward (draw-on / grow / wipe), ease-in · #a37736 · [crop](shots/shot_007_el_07.jpg)
8. 15.37–15.57s · top (x 42%–58%, y 20%–29%) · changes, ease-in · #cdb275 · [crop](shots/shot_007_el_08.jpg)

**Motion #8 15.6–18.5s (dissolve in) · 0 events**

- Ground #0b0f25; other main colours #0f1737 #172045 #f6f3ee #578a9c; drawn layer #faf4ed #428ea2 #e1c050 #bbc2d9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 24%–31%, y 49%–51% · #fbf7f1 · [crop](shots/shot_008_st_01.jpg)
- S2. never moves: shape / text block · x 69%–76%, y 49%–51% · #fbf7f1 · [crop](shots/shot_008_st_02.jpg)
- S3. never moves: shape / text block · x 69%–80%, y 51%–57% · #fbf7f1 · [crop](shots/shot_008_st_03.jpg)
- S4. never moves: shape / text block · x 20%–24%, y 52%–55% · #fbf7f1 · [crop](shots/shot_008_st_04.jpg)
- S5. never moves: shape / text block · x 27%–31%, y 55%–58% · #fbf7f1 · [crop](shots/shot_008_st_05.jpg)
- [crop L1](shots/shot_008_ly_01.jpg) [crop L2](shots/shot_008_ly_02.jpg) · Continuous layer: 12% of the frame moves through the whole shot (x 16%–93%, y 11%–72%), e.g. drifting gradients, particle flow, breathing glow

**Motion #9 18.5–19.8s · 2 events**

- Ground #0c0a13; other main colours #0d0d1a #0a0a19 #161420; drawn layer #fdfbfd #bab7ba #7e7b7e #49464a
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_009_ly_01.jpg) [crop L2](shots/shot_009_ly_02.jpg) · Continuous layer: 13% of the frame moves through the whole shot (x 0%–100%, y 0%–94%), e.g. drifting gradients, particle flow, breathing glow
1. 18.67–19.73s · middle left (x 0%–51%, y 29%–50%) · changes, unfolds rightward (draw-on / grow / wipe), ease-in-out · #0d0c1a · [crop](shots/shot_009_el_01.jpg)
2. 19.80–19.87s · bottom right (x 60%–87%, y 62%–76%) · appears, instant · #08090c · [crop](shots/shot_009_el_02.jpg)

**Motion #10 19.8–21.0s (flash cut: the picture opens bright and settles in 0.1s) · 1 events**

- Ground #0e0a19; other main colours #0a070f #0b0c17 #161521; drawn layer #f7f3ed #f8cd41 #79726c #c8442c
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 20.23–20.90s · middle (x 27%–100%, y 26%–74%) · changes, unfolds leftward (draw-on / grow / wipe), linear · #0d0c1a · text “smacked by / people you” · [crop](shots/shot_010_el_01.jpg)

**Motion #11 21.0–21.6s (flash cut: the picture opens bright and settles in 0.1s) · 0 events**

- Ground #0d0d19; other main colours #0a070f #594033 #f0c841; drawn layer #f6cd43 #f4efe3 #807150 #d73831
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_011_ly_01.jpg) [crop L2](shots/shot_011_ly_02.jpg) · Continuous layer: 6% of the frame moves through the whole shot (x 20%–96%, y 20%–54%), e.g. drifting gradients, particle flow, breathing glow

**Motion #12 21.6–25.1s (whip pan in) · 2 events**

- Ground #161014; other main colours #5b4e44 #261f21 #413631 #e3a82c; drawn layer #ede6e2 #e3a92c #6d5e50 #7651bd
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 75%–78%, y 83%–88% · #150f0e · [crop](shots/shot_012_st_01.jpg)
- S2. never moves: shape / text block · x 7%–13%, y 84%–91% · #140e0d · [crop](shots/shot_012_st_02.jpg)
- S3. never moves: shape / text block · x 82%–100%, y 84%–100% · #120a0e · [crop](shots/shot_012_st_03.jpg)
- S4. never moves: shape / text block · x 19%–23%, y 86%–91% · #120c0c · [crop](shots/shot_012_st_04.jpg)
- S5. never moves: shape / text block · x 1%–6%, y 87%–90% · #191213 · [crop](shots/shot_012_st_05.jpg)
- S6. never moves: shape / text block · x 0%–56%, y 88%–100% · #120b0e · [crop](shots/shot_012_st_06.jpg)
- S7. never moves: shape / text block · x 58%–84%, y 89%–99% · #150d0f · [crop](shots/shot_012_st_07.jpg)
- S8. never moves: shape / text block · x 58%–64%, y 98%–99% · #130b0f · [crop](shots/shot_012_st_08.jpg)
- [crop L1](shots/shot_012_ly_01.jpg) [crop L2](shots/shot_012_ly_02.jpg) · Continuous layer: 26% of the frame moves through the whole shot (x 0%–100%, y 0%–89%), e.g. drifting gradients, particle flow, breathing glow
1. 21.67–22.60s · middle (x 0%–100%, y 0%–85%) · appears, slides leftward, ease-in-out · #4c4134 · text “buddy with / the eye / patch just” · [crop](shots/shot_012_el_01.jpg)
2. 21.67–21.73s · bottom (x 20%–91%, y 91%–100%) · changes, instant · #0e080b · [crop](shots/shot_012_el_02.jpg)

**Motion #13 25.1–27.3s · 0 events**

- Ground #020409; other main colours #161014 #2c1f1d #3a4157 #5e7094; drawn layer #353d54 #8092b6 #515f84 #f9f7f9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_013_ly_01.jpg) [crop L2](shots/shot_013_ly_02.jpg) · Continuous layer: 19% of the frame moves through the whole shot (x 18%–87%, y 34%–73%), e.g. drifting gradients, particle flow, breathing glow

**Motion #14 27.3–29.0s (wipe in) · 0 events**

- Ground #32201b; other main colours #492e22 #91643f #c9cedb #734830; drawn layer #6e503b #8697bb #d3d6e1 #344e9a
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_014_ly_01.jpg) [crop L2](shots/shot_014_ly_02.jpg) · Continuous layer: 100% of the frame moves through the whole shot (x 0%–100%, y 0%–100%), e.g. drifting gradients, particle flow, breathing glow

**Motion #15 29.0–32.3s (whip pan in) · 0 events**

- Ground #633823; other main colours #714026 #efe5d1 #c3a998 #dac6b3; drawn layer #f4e7d2 #ddd0bd #fef8f3
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_015_ly_01.jpg) [crop L2](shots/shot_015_ly_02.jpg) · Continuous layer: 23% of the frame moves through the whole shot (x 0%–100%, y 12%–75%), e.g. drifting gradients, particle flow, breathing glow

**Motion #16 32.3–37.4s (whip pan in) · 0 events**

- Ground #2a1916; other main colours #553220 #75472b #9b5e32 #c68444; drawn layer #f8f3eb #edc351 #8f5030 #ad98b9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–2%, y 90%–92% · #271713 · [crop](shots/shot_016_st_01.jpg)
- S2. never moves: shape / text block · x 33%–100%, y 90%–100% · #271713 · [crop](shots/shot_016_st_02.jpg)
- [crop L1](shots/shot_016_ly_01.jpg) [crop L2](shots/shot_016_ly_02.jpg) · Continuous layer: 27% of the frame moves through the whole shot (x 0%–100%, y 0%–86%), e.g. drifting gradients, particle flow, breathing glow
