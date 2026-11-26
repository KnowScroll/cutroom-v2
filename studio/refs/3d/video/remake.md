---
videomd: 1
part: remake
tokens: 5251
---

## Remake plan

### Step by step

This is a 3D / animation. Do the steps in this order; the detail for each is in the matching subsection below.

1. **Write the content**: write yours in the same 12 steps as the original (narrative line under “Content and structure”)
2. **Collect material**: the real material in the picture (UI screenshot) needs the original files, listed under “What to prepare”; one reference image per character, the same one in every shot: hero, teller, manager
3. **AI shots**: 26 shots (64 s) to make with a video model. Pick the model first: tell the agent which one and it plans the stretches, inputs and prompts for it (`rea-video plan <folder> --model <model>`)
4. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 19 lines with their pace in the script table under “Sound”; delivery per “Acting and emotion”
5. **Edit**: follow the order and lengths in the shot list; the original has 26 shots at 2.5s each; 4 transitions under “Edit”
6. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
7. **Sound effects**: 42; place similar ones from a library at the times under “Sound”
8. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**26 3D render shots → 5 generation units, 5 Seedance 2.0 calls**

### Generation units

- Grouping: consecutive shots share a call where they fit, ≤15s per call; a long stretch is cut at a scene change first
- Inputs: the source stretch, subtitles erased, is the reference video; the model follows its shots, camera and pacing
- Audio: the model can generate action sound effects and ambience along with the picture; voice-over is better done as separate TTS and mixed in, so copy and timing stay editable
- Packaging: the subtitle, text label, styled text, counter on the generated shots is post-production packaging: keep it out of the prompts (erased from source references) and lay it back on from the packaging timeline after generation

| Unit | Shots | Time | Length | Feed | Prompt |
|---|---|---|---|---|---|
| G1 | #1–#7 | 0.0–13.9s | 13.9s | reference video | draft |
| G2 | #8–#13 | 13.9–27.5s | 13.6s | reference video | draft |
| G3 | #14–#17 | 27.5–41.6s | 14.0s | reference video | draft |
| G4 | #18–#25 | 41.6–54.2s | 12.7s | reference video | draft |
| G5 | #26 | 54.2–63.8s | 9.6s | reference video | draft |

**G1 · shots #1–#7 · 13.9s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 0.0–13.9s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #1: sly (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #3 (key): surprised (strong) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #4: glum (light) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #5: curious (light) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #6: curious (light) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #7: amused (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Bank lobby, medium wide from a low three-quarter angle: the ball-headed hero (huge cream sphere head, teal cap with a side brim, red tube body, black stick legs with ball shoes) stands beside a dark green cash machine on the left edge, hand to mouth, then lowers it with a sly look; cream striped wallpaper with a navy band, two yellow cone lamps hang from a wood-beamed ceiling, red runner carpet on a plank floor. Slow push-in. One-word white captions with a black outline at about 73% of the frame height.Acting (moderate, not exaggerated): hero: sly
Shot 2: Insert close-up of the cash machine screen over the hero's shoulder (his cap and head a big cropped sphere on the left edge): a green sign on top, a green screen whose text changes from a deposit prompt to a balance that counts up to a five-figure dollar amount, a keypad below; a wall calendar card at top left shows month, year and day number.
Shot 3: Back to the lobby medium shot: the hero jolts, eyes pop into white circles with tiny pupils, mouth an open o, sweat drops appear; caption shows the dollar figure as digits.Acting (openly expressed, features stay natural): hero: surprised
Shot 4: Home room wide: teal-green striped upper wall, red wainscot, cream rails, plank floor with a teal rug and a yellow border stripe, a red cone lamp over a cream desk, a wall clock, a shelf of coloured binders. The hero sits at the desk holding up a bank statement with a small balance printed on it next to his glum face.Acting (very subtle, barely visible): hero: glum
Shot 5: Whip pan to a closer angle of the same room: the hero at the desk looks up brightly; a tear-off wall calendar shows the year in big digits.Acting (very subtle, barely visible): hero: curious
Shot 6: Wide of the room from another side: a brown door with a brass letter slot on the left, junk-mail flyers lie on the mat; the hero at the desk turns toward them.Acting (very subtle, barely visible): hero: curious
Shot 7: Whip pan to the hero at the desk facing camera, holding up a garish yellow flyer and a sample cheque beside his face.Acting (moderate, not exaggerated): hero: amused
```

**G2 · shots #8–#13 · 13.6s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 13.9–27.5s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #8: happy (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #10: smug (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #12 (key): surprised (strong) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Close-up: the hero's huge face (closed happy eyes as arcs, stubble dots, small smile) fills the top of the frame, he holds a white cheque across the lower frame; its amount sits on a yellow highlight box.Acting (moderate, not exaggerated): hero: happy
Shot 2: Extreme close-up of the cheque filling the frame, the face cropped at the top: a company name, pay-to line with a handwritten YOU, the written amount line, and the fine-print word that gets a yellow highlight when it is read.
Shot 3: Close-up: the hero flips the cheque and draws a blue smiley face on the endorsement line on the back, smug half-lidded eyes.Acting (moderate, not exaggerated): hero: smug
Shot 4: Over-the-shoulder insert of the cash machine: the deposit prompt, an arrow to the slot, then a thank-you message.
Shot 5: Lobby medium shot, a week later: the hero checks the machine, does a slow double take, eyes pop, sweat drops.Acting (openly expressed, features stay natural): hero: surprised
Shot 6: Whip pan to the machine screen: the full balance in yellow digits.
```

**G3 · shots #14–#17 · 14.0s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 27.5–41.6s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #14: cheerful (light) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #15: determined (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #16: neutral (light) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #17: smug (light) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Over-the-shoulder at the teller window: the hero's head a huge cropped sphere on the left, behind the glass a teller with a ginger cap and blue shirt smiles and nods; a TELLER sign in a frame on the wall.Acting (very subtle, barely visible): teller: cheerful
Shot 2: Home desk, front: flyers for a sports car and a yacht lie on the desk; the hero scratches his head, then folds his arms with a firm frown and closed eyes.Acting (moderate, not exaggerated): hero: determined
Shot 3: Back at the teller window over the shoulder: the teller hands over a paper.Acting (very subtle, barely visible): teller: neutral
Shot 4: Safe-deposit room: an amber wall of numbered lockers, a green cone lamp over a green table; the hero puts a long grey box on the table, smug and calm.Acting (very subtle, barely visible): hero: smug
```

**G4 · shots #18–#25 · 12.7s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 41.6–54.2s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #18: angry (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #21: stunned (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #22 (key): nervous (strong) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #23: smug (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)
- Acting #25: smug (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Lobby: a bald bank manager (grey side hair, round glasses, mustache, dark suit, red tie) stands glaring; a wall calendar flips from one month to the next.Acting (moderate, not exaggerated): manager: angry
Shot 2: Whip pan to the machine screen with the balance.
Shot 3: The screen flips to a light-blue ACCOUNT FROZEN message with snowflakes.
Shot 4: Lobby: the hero at the machine, his card is swallowed; stunned look.Acting (moderate, not exaggerated): hero: stunned
Shot 5: Safe-deposit room two-shot: hero and manager side by side behind the green table, the manager holds a yellow drill toward the box; the hero's eyes pop, sweat drops.Acting (openly expressed, features stay natural): hero: nervous
Shot 6: Home desk: the hero raises one finger, smug half-lidded eyes, knowing smile.Acting (moderate, not exaggerated): hero: smug
Shot 7: Cheque close-up again, the fine-print word highlighted in yellow.
Shot 8: Close-up of the back of the cheque with the smiley, the hero's smug face above.Acting (moderate, not exaggerated): hero: smug
```

**G5 · shots #26 · 9.6s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 54.2–63.8s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |
- Acting #26 (key): smug (medium) · simple toon face: dot or ring eyes, thick brow bars, small mouth (voice first, then drive, see “Acting and emotion”)

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; soft frontal light (flat light), soft light (almost no lit / shadow edge), warm (about 3000–4000K), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Safe-deposit room two-shot, long hold: the box open, a cashier's cheque with the amount lies on the table; the hero is calm and smug, the manager goes from angry to defeated with sweat drops.Acting (moderate, not exaggerated): hero: smug
```

### Real material in the picture (the original files are needed)

3 shots, 14.5s (23%) contain real material (screen recordings, screenshots, photos, embedded video); a model cannot stand in for them:

- **UI screenshot** (part of the frame x0% y34% w100% h31%): shots #17, 2.9s in all
- **UI screenshot** (part of the frame x0% y34% w100% h30%): shots #22, 2.0s in all
- **UI screenshot** (part of the frame x0% y33% w100% h34%): shots #26, 9.6s in all

### Acting and emotion

In a prompt, describe the visible expression and movement rather than words like “happy” or “sad”, and keep it smaller rather than bigger (strong emotion words tend to give mask faces and forced smiles); get the expression right in the first frame; for shots with lines, make the voice with its delivery first and let the picture act to it. For generated shots the Face and Movement below are already in the generation-unit prompts.

**all 19 shots**

| Shot | Who | Emotion (strength) | Face | Movement / change | Delivery | How to get it |
|---|---|---|---|---|---|---|
| #1 | hero | sly (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #3 | hero | surprised (strong) ★key | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #4 | hero | glum (light) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #5 | hero | curious (light) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #6 | hero | curious (light) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #7 | hero | amused (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #8 | hero | happy (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #10 | hero | smug (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #12 | hero | surprised (strong) ★key | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #14 | teller | cheerful (light) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #15 | hero | determined (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #16 | teller | neutral (light) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #17 | hero | smug (light) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #18 | manager | angry (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #21 | hero | stunned (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #22 | hero | nervous (strong) ★key | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #23 | hero | smug (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #25 | hero | smug (medium) | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |
| #26 | hero | smug (medium) ★key | simple toon face: dot or ring eyes, thick brow bars, small mouth | small stick-limbed body, gestures with ball hands | narration only, fast deadpan male voice-over | voice first, then drive |

- **voice first, then drive**: Speaking: make the voice with its delivery first (TTS with tone tags only where the emotion turns, or a real recording), then drive mouth and face from that audio (Kling Avatar, OmniHuman); with a video model that makes sound itself, put the line and its delivery in the prompt together
