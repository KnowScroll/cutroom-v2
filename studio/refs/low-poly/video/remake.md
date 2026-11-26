---
videomd: 1
part: remake
tokens: 1333
---

## Remake plan

### Step by step

This is a 3D / animation. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 3 steps as the original (narrative line under “Content and structure”)
2. **Collect material**: one reference image per character, the same one in every shot: the waiting animal
3. **AI shots**: 3 shots (5 s) to make with a video model. Pick the model first: tell the agent which one and it plans the stretches, inputs and prompts for it (`rea-video plan <folder> --model <model>`)
4. **Edit**: follow the order and lengths in the shot list; the original has 3 shots at 1.6s each; 2 transitions under “Edit”
5. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
6. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**3 3D render shots → 1 generation unit, 1 Seedance 2.0 call**

### Generation units

- Grouping: consecutive shots share a call where they fit, ≤15s per call; a long stretch is cut at a scene change first
- Inputs: the source stretch, subtitles erased, is the reference video; the model follows its shots, camera and pacing
- Audio: the model can generate action sound effects and ambience along with the picture
- Packaging: the subtitle on the generated shots is post-production packaging: keep it out of the prompts (erased from source references) and lay it back on from the packaging timeline after generation

| Unit | Shots | Time | Length | Feed | Prompt |
|---|---|---|---|---|---|
| G1 | #1–#3 | 0.0–4.8s | 4.8s | reference video | draft |

**G1 · shots #1–#3 · 4.8s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 0.0–4.8s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #1: expectant (light) · pixel eyes looking toward the camera and to the side, small dark nose, flat mouth line (expression in the first frame, see “Acting and emotion”)
- Acting #3 (key): patient sadness (light) · pixel eyes look to the side along the platform, eyebrows level (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; three-quarter key + fill (standard set-up), soft light (wide lit-to-shadow ramp), warm (about 3000–4000K), background slightly soft. No subtitles, captions or watermarks in the picture.
Shot 1: Medium shot, low wide-angle camera, subject centred in the middle third. The camera settles slowly toward the subject; the subject turns its head a little to the side and back, ears perk, tail wags; petals drift down; a bright light grows from the right.Acting (very subtle, barely visible): sits upright, ears perk, head turns slightly to the side and back, tail wags
Shot 2: Full-frame close foreground: the vehicle side slides from right to left past the lens, slows almost to a stop, then accelerates away to the left, revealing the scene behind.
Shot 3: Medium close shot, low wide camera pushing in slowly toward the sitting subject; the subject turns its head to look along the platform to the left, ears lower, and holds; square flakes fall in front of the lens.Acting (very subtle, barely visible): sits still, head turns to the left and tilts down slightly, ears lower, holds
```

### Acting and emotion

In a prompt, describe the visible expression and movement rather than words like “happy” or “sad”, and keep it smaller rather than bigger (strong emotion words tend to give mask faces and forced smiles); get the expression right in the first frame; for shots with lines, make the voice with its delivery first and let the picture act to it. For generated shots the Face and Movement below are already in the generation-unit prompts.

| Shot | Who | Emotion (strength) | Face | Movement / change | Delivery | How to get it |
|---|---|---|---|---|---|---|
| #1 | A | expectant (light) | pixel eyes looking toward the camera and to the side, small dark nose, flat mouth line | sits upright, head turns slightly left then back, ears perk up, tail wags, slow breathing; 0.3s ears perk, head turns slightly to the side; 1.0s head turns back to the front, looking up a little | — | expression in the first frame |
| #3 | A | patient sadness (light) ★key | pixel eyes look to the side along the platform, eyebrows level | sits still, head turns to frame left and tilts down slightly, ears lower; 0.9s head starts to turn to the left; 1.4s looking along the platform, ears lowered, holds | — | expression in the first frame |

- **expression in the first frame**: Get the expression right in the first frame; the prompt only describes the motion and the change
