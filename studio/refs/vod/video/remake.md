---
videomd: 1
part: remake
tokens: 6873
---

## Remake plan

### Step by step

This is a 3D / animation. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 26 steps as the original (narrative line under “Content and structure”)
2. **Collect material**: the real material in the picture (photo) needs the original files, listed under “What to prepare”; one reference image per character, the same one in every shot: holder flag-ball, big neighbour flag-ball, ally flag-ball, leader medallion, commander medallion, region with a face
3. **AI shots**: 45 shots (115 s) to make with a video model. Pick the model first: tell the agent which one and it plans the stretches, inputs and prompts for it (`rea-video plan <folder> --model <model>`)
4. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 44 lines with their pace in the script table under “Sound”; delivery per “Acting and emotion”
5. **Edit**: follow the order and lengths in the shot list; the original has 45 shots at 2.6s each; 18 transitions under “Edit”
6. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
7. **Music**: find a track at the same tempo and mood (source: to confirm, about 112 BPM, F major)
8. **Sound effects**: 7; place similar ones from a library at the times under “Sound”
9. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**35 2D animation shots + 10 3D render shots → 9 generation units, 9 Seedance 2.0 calls**

### Generation units

- Grouping: consecutive shots share a call where they fit, ≤15s per call; a long stretch is cut at a scene change first
- Inputs: the source stretch, subtitles erased, is the reference video; the model follows its shots, camera and pacing
- Audio: the model can generate action sound effects and ambience along with the picture; voice-over is better done as separate TTS and mixed in, so copy and timing stay editable
- Packaging: the subtitle, text label, title, sticker on the generated shots is post-production packaging: keep it out of the prompts (erased from source references) and lay it back on from the packaging timeline after generation

| Unit | Shots | Time | Length | Feed | Prompt |
|---|---|---|---|---|---|
| G1 | #1, #2 | 0.0–15.0s | 15.0s | reference video | draft |
| G2 | #3–#8 | 15.0–30.0s | 15.0s | reference video | draft |
| G3 | #9–#14 | 30.0–44.4s | 14.4s | reference video | draft |
| G4 | #15–#19 | 44.4–58.7s | 14.3s | reference video | draft |
| G5 | #20–#24 | 58.7–65.6s | 6.9s | reference video | draft |
| G6 | #25–#27 | 65.6–79.6s | 14.0s | reference video | draft |
| G7 | #28–#30 | 79.6–88.2s | 8.6s | reference video | draft |
| G8 | #31–#40 | 88.2–101.4s | 13.2s | reference video | draft |
| G9 | #41–#45 | 101.4–115.1s | 13.7s | reference video | draft |

**G1 · shots #1, #2 · 15.0s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 0.0–15.0s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #1: smug (medium) · half-closed eyes, brows flat, small closed mouth (expression in the first frame, see “Acting and emotion”)
- Acting #2: angry (medium) · brows angled down to the centre, eyes narrowed, mouth a flat line (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories). A narrow coastal region is filled green and holds a wooden plank sign on a post with the holder's name hand-lettered on it; the holder flag-ball (left, on the coast edge, about 150 px of 576) grips the post with one noodle arm; the neighbour flag-ball floats on the mainland to the right. The big country's name sits as a small letter-spaced serif map label; at 4.5 s a hand-lettered white title with the place name and a year pops in at the top. Static camera, balls bob and blink.Acting (moderate, not exaggerated): half-closed eyes, brows flat, small closed mouth; one arm holding the sign post, body bobbing
Shot 2: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories). Same composition pushed in about 15%: the two balls talk in turn (white phrase captions with a coloured dash for each speaker); the neighbour ball waves a hand, the holder ball frowns with angled brows and pulls the sign closer; a small ship crosses the sea at the left edge.Acting (moderate, not exaggerated): brows angled down to the centre, eyes narrowed, mouth a flat line; leans toward the other ball, arm tight on the sign post
```

**G2 · shots #3–#8 · 15.0s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 15.0–30.0s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #4: confused (medium) · eyes wide, one brow raised, small "?" popping above (expression in the first frame, see “Acting and emotion”)
- Acting #5: determined (medium) · brows down, mouth tight (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories). A 0.3 s transition: the whole frame washes out toward a pale desaturated tint (flashback look).
Shot 2: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), but washed out (lighter, desaturated, about 40% toward pale grey-cream) to mark the past; the holder ball speaks, the neighbour ball shows a question mark above its head.Acting (moderate, not exaggerated): eyes wide, one brow raised, small "?" popping above; tilts slightly
Shot 3: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories). Back to full colour; the plank on the sign flips from one word to a new one (hand-lettered), the holder ball hammers it with a mallet; the neighbour ball asks "since when?" with raised brows; a key word in the caption is amber.Acting (moderate, not exaggerated): brows down, mouth tight; raises a mallet arm and strikes the sign
Shot 4: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), zoomed out a little; a tiny cartoon man in a dark suit stands at a small dinner table drawn on the green region and protests; a red "!" pops above the holder ball.
Shot 5: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); the holder ball's arm reaches across and lifts the tiny man off the map.
Shot 6: Home-country map: the holder's country filled green on beige neighbours, steel-blue sea, hand-lettered country title at the top; the tiny man drops onto it. Static.
```

**G3 · shots #9–#14 · 14.4s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 30.0–44.4s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #10: annoyed (medium) · eyelids half down, mouth flat (expression in the first frame, see “Acting and emotion”)
- Acting #13: awkward (medium) · eyes looking away, brows raised in the middle (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); many small sign icons pop onto the region one after another while the line counts the years.
Shot 2: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), closer inland view: the neighbour ball rises at the top looking annoyed, small "closed" signs on posts and a tiny truck stopped at them.Acting (moderate, not exaggerated): eyelids half down, mouth flat; arms hanging, slight sigh bob
Shot 3: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), wider; thin dashed arrows slide in toward the region from the mainland and the sea; the holder ball looks around nervously.
Shot 4: Continent map (whole region, all land beige, sea steel blue); the holder ball travels from the coast toward its home across the map.
Shot 5: Island-country map: the ally's country filled red, neighbours beige; the ally flag-ball sits on its country, the holder ball below it holds up a paper treaty with a red seal; dialogue in turns; the neighbour ball waves from a top corner.Acting (moderate, not exaggerated): eyes looking away, brows raised in the middle; arm raised as if declining
Shot 6: Same island map; the holder ball lifts another document (a paper with a red seal and a hand-lettered short name).
```

**G4 · shots #15–#19 · 14.3s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 44.4–58.7s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #15: worried (medium) · eyes looking up, brows tilted up in the middle, mouth small (expression in the first frame, see “Acting and emotion”)
- Acting #17: calm (medium) · big round eyes, small smile (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Same island map; the ally ball points a long noodle arm upward/away while explaining; the holder ball looks up worried.Acting (moderate, not exaggerated): eyes looking up, brows tilted up in the middle, mouth small; holding the paper close
Shot 2: Same island map; the holder ball's sign plank now reads a two-word official term; it bounces as the word appears.
Shot 3: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); the neighbour ball scales up to about 3x (fills about 40% of the frame width) while the holder ball shrinks; a red "!" pops; a hand-lettered title with the ratio appears at the top; the ratio words are amber in the caption.Acting (moderate, not exaggerated): big round eyes, small smile; looms over the small ball
Shot 4: Home-country map zoomed out to the continent: a circular portrait medallion (a real black-and-white photo in a green and cream ring, name hand-lettered under it) sits on the home country; a small rolled telegram scroll travels along a dotted line to the colony.
Shot 5: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), wide; the local commander's portrait medallion sits on the sea beside the coast; a hand-lettered two-line title with the order pops in at the top.
```

**G5 · shots #20–#24 · 6.9s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 58.7–65.6s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Same wide coast with the medallion and the title held.
Shot 2: Home-country map with the leader's medallion, 0.3 s.
Shot 3: Home-country map, leader medallion centred; a two-line hand-lettered quote title pops in at the top; the quote words are amber in the caption.
Shot 4: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); giant neighbour ball beside the tiny holder ball and the sign; the quote title at the top; a red hand-drawn stroke crosses out its first word.
Shot 5: Home-country map with the leader medallion.
```

**G6 · shots #25–#27 · 14.0s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 65.6–79.6s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #27: resentful (medium) · brows angled down, mouth turned down (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), wide; commander medallion on the sea; title with a number of days at the top.
Shot 2: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); the holder ball and its sign; then a crowd of small neighbour balls with green helmets marches across the region; later two hand-lettered labels on either side: one word near the neighbour ball and the opposite word near the holder ball, a dashed arrow between them.
Shot 3: Close-up of the green region (fills most of the frame on the orange mainland): a cartoon face and two small hands appear on it, first neutral, then frowning.Acting (moderate, not exaggerated): brows angled down, mouth turned down; small fists
```

**G7 · shots #28–#30 · 8.6s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 79.6–88.2s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), wide; a duration title at the top; the green region shrinks to a dot; the commander medallion slides to a small port town marked by a tiny flag on a pole and a serif label.
Shot 2: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); a cluster of small cartoon houses appears beside the town flag.
Shot 3: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); the commander medallion next to the town, a telegram icon is ignored; the town flag changes to a white flag.
```

**G8 · shots #31–#40 · 13.2s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 88.2–101.4s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #34: stern (light) · neutral faces, eyes level (expression in the first frame, see “Acting and emotion”)
- Acting #35: stern (light) · neutral faces, eyes level (expression in the first frame, see “Acting and emotion”)
- Acting #37: stern (light) · neutral faces, eyes level (expression in the first frame, see “Acting and emotion”)
- Acting #38: stern (light) · neutral faces, eyes level (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: 3D night scene from above: a car with headlights in a dark field, figures standing in the light cone
Shot 2: 3D close view of a car's two round headlights glowing in the dark, dust in the beams
Shot 3: 3D night: soldiers seen from behind in the headlight glow
Shot 4: 3D: one officer salutes another in front of the car. Acting (very subtle, barely visible): neutral faces, eyes level; formal stance, salute or still
Shot 5: 3D close-up of a stern officer in a peaked cap and khaki uniform. Acting (very subtle, barely visible): neutral faces, eyes level; formal stance, salute or still
Shot 6: 3D: the officer hands a paper to the other officer
Shot 7: 3D close-up: the receiving officer holds the paper and does not salute. Acting (very subtle, barely visible): neutral faces, eyes level; formal stance, salute or still
Shot 8: 3D close-up of the receiving officer standing still, expressionless. Acting (very subtle, barely visible): neutral faces, eyes level; formal stance, salute or still
Shot 9: 3D medium shot of both officers facing each other in silence
Shot 10: 3D top view of the scene with radiating headlight beams, then an iris wipe begins
```

**G9 · shots #41–#45 · 13.7s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 101.4–115.1s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #45 (key): resigned (medium) · eyelids half down, mouth turned down (expression in the first frame, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Iris wipe from the dark scene into the home-country map; the holder ball with a green helmet holds a dismissal paper; the commander medallion beside it.
Shot 2: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories); a ruler-like timeline bar at the top fills left to right while the sign stands on the region.
Shot 3: Home-country map; many small flags pop up over the green home country; the holder ball wears a helmet.
Shot 4: Home-country map; the holder ball hands a rank paper back to the commander medallion.
Shot 5: flat 2D cut-out animation on a paper-textured real map (steel-blue sea, saturated orange focus country, beige other land, flag-coloured highlighted territories), the opening composition again; the holder ball hands a signed paper to the neighbour ball; a hand-lettered title states the result at the top; the plank on the sign changes to the neighbour's name; the holder ball looks deflated, the neighbour ball content.Acting (moderate, not exaggerated): eyelids half down, mouth turned down; slumped, arm handing over the paper
```

### Real material in the picture (the original files are needed)

2 shots, 4.6s (4%) contain real material (screen recordings, screenshots, photos, embedded video); a model cannot stand in for them:

- **photo** (part of the frame): shots #18, #19, 4.6s in all

### Acting and emotion

In a prompt, describe the visible expression and movement rather than words like “happy” or “sad”, and keep it smaller rather than bigger (strong emotion words tend to give mask faces and forced smiles); get the expression right in the first frame; for shots with lines, make the voice with its delivery first and let the picture act to it. For generated shots the Face and Movement below are already in the generation-unit prompts.

**all 14 shots**

| Shot | Who | Emotion (strength) | Face | Movement / change | Delivery | How to get it |
|---|---|---|---|---|---|---|
| #1 | A (holder flag-ball) | smug (medium) | half-closed eyes, brows flat, small closed mouth | one arm holding the sign post, body bobbing | — | expression in the first frame |
| #2 | A (holder flag-ball) | angry (medium) | brows angled down to the centre, eyes narrowed, mouth a flat line | leans toward the other ball, arm tight on the sign post | — | expression in the first frame |
| #4 | B (big neighbour flag-ball) | confused (medium) | eyes wide, one brow raised, small "?" popping above | tilts slightly | — | expression in the first frame |
| #5 | A (holder flag-ball) | determined (medium) | brows down, mouth tight | raises a mallet arm and strikes the sign | — | expression in the first frame |
| #10 | B (big neighbour flag-ball) | annoyed (medium) | eyelids half down, mouth flat | arms hanging, slight sigh bob | — | expression in the first frame |
| #13 | C (ally flag-ball) | awkward (medium) | eyes looking away, brows raised in the middle | arm raised as if declining | — | expression in the first frame |
| #15 | A (holder flag-ball) | worried (medium) | eyes looking up, brows tilted up in the middle, mouth small | holding the paper close | — | expression in the first frame |
| #17 | B (big neighbour flag-ball) | calm (medium) | big round eyes, small smile | looms over the small ball | — | expression in the first frame |
| #27 | H (region with a face) | resentful (medium) | brows angled down, mouth turned down | small fists | — | expression in the first frame |
| #34 | I (officers) | stern (light) | neutral faces, eyes level | formal stance, salute or still | — | expression in the first frame |
| #35 | I (officers) | stern (light) | neutral faces, eyes level | formal stance, salute or still | — | expression in the first frame |
| #37 | I (officers) | stern (light) | neutral faces, eyes level | formal stance, salute or still | — | expression in the first frame |
| #38 | I (officers) | stern (light) | neutral faces, eyes level | formal stance, salute or still | — | expression in the first frame |
| #45 | A (holder flag-ball) | resigned (medium) ★key | eyelids half down, mouth turned down | slumped, arm handing over the paper | — | expression in the first frame |

- **expression in the first frame**: Get the expression right in the first frame; the prompt only describes the motion and the change
