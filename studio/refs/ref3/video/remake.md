---
videomd: 1
part: remake
tokens: 1952
---

## Remake plan

### Step by step

This is a 3D / animation. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 7 steps as the original (narrative line under “Content and structure”)
2. **AI shots**: 11 shots (34 s) to make with a video model. Pick the model first: tell the agent which one and it plans the stretches, inputs and prompts for it (`rea-video plan <folder> --model <model>`)
3. **Edit**: follow the order and lengths in the shot list; the original has 11 shots at 3.1s each; 8 transitions under “Edit”
4. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
5. **Music**: find a track at the same tempo and mood (source: to confirm, about 112 BPM, F major)
6. **Sound effects**: 2; place similar ones from a library at the times under “Sound”
7. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**11 3D render shots → 3 generation units, 3 Seedance 2.0 calls**

### Generation units

- Grouping: consecutive shots share a call where they fit, ≤15s per call; a long stretch is cut at a scene change first
- Inputs: the source stretch, subtitles erased, is the reference video; the model follows its shots, camera and pacing
- Audio: the model can generate action sound effects and ambience along with the picture
- Packaging: the text label, subtitle, styled text on the generated shots is post-production packaging: keep it out of the prompts (erased from source references) and lay it back on from the packaging timeline after generation

| Unit | Shots | Time | Length | Feed | Prompt |
|---|---|---|---|---|---|
| G1 | #1–#3 | 0.0–14.9s | 14.9s | reference video | draft |
| G2 | #4–#7 | 14.9–24.7s | 9.7s | reference video | draft |
| G3 | #8–#11 | 24.7–34.1s | 9.5s | reference video | draft |

**G1 · shots #1–#3 · 14.9s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 0.0–14.9s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), cool (daylight / cool-white LED), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Hook at real speed: back of a seated figure's head in a warm teal shop interior (mirror, round bulbs, striped pole), the device pressed against the neck. Top HUD: red 'REAL SPEED' badge left, a cream semicircle speed dial centre, a counter with 4 digit cells right showing the real rate; a cream title placard with striped end caps asks 'HOW DOES A ... WORK?' with a red subline giving the real rate and per-second count.
Shot 2: Push in to the device's working end at real speed; placard corrects a common belief about a visible part, a callout gives a real size; then 'TOO FAST TO SEE' over a blurred working end; the badge switches to 256x SLOWER, the dial needle drops left, the counter drops to the rate divided by 256; step badge 1: the two working parts move against each other, callouts name which moves and which stays still; a big 'SNIP!' pop at each action; then x2 FASTER flash, 128x: every gap is a little pair, a single strand is shown being cut.
Shot 3: Camera moves down the chain to the next part: step badge 2 'WHAT MOVES IT?' with the answer as subline; 64x SLOWER; a white link piece with an off-centre pin on a motor shaft, callouts with leader lines name the pin, the link and the motor; the pin circles while the link slides side to side; '1 TURN = 2 ...' callout; then 32x, step 3 'WHY A SLOT?' top view, dashed motion path of the pin inside the slot, two callouts contrast sideways (pushes) and up-down (just slides).
```

**G2 · shots #4–#7 · 9.7s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 14.9–24.7s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), cool (daylight / cool-white LED), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Front view, 32x: a placard turns an offset into a travel distance ('2 MM OFF CENTER = A 4 MM SLIDE') with a dimension marker on the teeth; x2 FASTER; step 4 'WHAT SPINS THE PIN?'.
Shot 2: 16x SLOWER: the motor can goes translucent, showing the copper coil and magnets (callouts); pan down to the power cell with glowing current rings, callouts name motor and battery; x2 FASTER; step 5 'BATTERY TO BLADE': the placard subline becomes a row of chips naming the parts in order, each lighting red as the energy passes.
Shot 3: Very short: swing back up to the link and working end with the chips still lit.
Shot 4: 8x SLOWER, step 6 'SAFE BY DESIGN': the moving part's tips sit behind the still part's tips; two callouts name still tips and moving tips with a real offset in millimetres.
```

**G3 · shots #8–#11 · 9.5s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 24.7–34.1s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), cool (daylight / cool-white LED), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Pull back to the whole device in x-ray: translucent shell, every inner part in its order, concentric thin vibration rings behind; left-side callouts name the parts top to bottom; the speed doubles 8x, 4x, 2x with 'x2 FASTER' flashes; the placard counts actions per second at each speed (30, 60, 120), sublines 'every part, twice as fast', 'twice the pulses, an octave higher'; one callout 'PULSE = 16 ...'.
Shot 2: REAL SPEED: the x-ray device fades to its closed shell; placard 'REAL SPEED' with the per-second count.
Shot 3: The closed device at real speed, then pull back to the neck; subline gives the real reversals per second and the force.
Shot 4: Pull back to the opening composition: the head in the shop, title placard 'HOW DOES A ... WORK?' again, so the reel loops.
```
