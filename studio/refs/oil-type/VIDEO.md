---
videomd: 1
name: oil-type
description: 'Made with (inferred): code / template render 75%, 3D render 25%'
source:
  file: oil-type.mp4
  sha256: ac7352896f2860f89c2aeac27f736d835bb884479e2de1454caebc81bca7077d
  duration: 130.433
  size: 464x832
  fps: 30.0
  aspect: '9:16'
shots: 60
lang: en
made_mix:
  code_render: 0.7465
  cg_3d: 0.2535
confidence: 0.915
readers:
- tools
- agent
open_questions: 6
generator:
  name: rea-video
  version: 0.1.0
---

# oil-type.mp4

**Verdict** (inferred): Mixed production: code / template render 75% + 3D render 25%; overlays: styled text, text labels, subtitles, title (composited in code / an editor); real material used: photo (31.5s), screen recording (1.9s); audio: voice + 28 sound effects; packaging: 281 subtitle lines, styled text ×1, text labels ×41, 15 sound effects land on text / sticker pops
**Narrative**: #01-03 grab attention → #04-05 set the scene → #06 turn → #07 add information → #08-09 show evidence → #10-12 set the scene → #13-25 add information → #26-27 turn → #28-31 add information → #32-33 show evidence → #34-46 add information → #47-51 turn → #52-53 show evidence → #54-58 deliver the conclusion → #59-60 call to action
**Made with** (inferred, by duration): code / template render 75%, 3D render 25%
**Remake**: 14 3D render shots → 3 generation units, 3 Seedance 2.0 calls; code render / screen capture 46 shots → 1 code project (10 parts)
**Real material to collect**: 11 shots (26% of the duration), list in `video/remake.md`

## Next steps

- Remake: `rea-video remake <this dir>` does what can be done automatically and keeps the original elsewhere; `remake/status.md` says per shot what is left. Add incoming clips to `remake/mine.json` and run it again
- Code-rendered shots are best rebuilt in an HTML video framework (such as HyperFrames) from the rhythm and key frames in `video/rhythm.md`; `rea-video code-remake <this dir>` only makes a quick draft for particles / data-visualisation pictures
- AI shots: prompts are in the generation units of `video/remake.md`; for automatic generation run `rea-video remake-plan` + `remake-run --dry-run` (paid: ask the user first)

## Open questions

- Shot #26 (59.3–60.0s): embedded video clip: real material or generated, to confirm
- Shot #27 (60.0–60.8s): photo / image: real material or generated, to confirm
- Shot #34 (71.4–76.4s): embedded video clip: real material or generated, to confirm
- Shot #39 (78.8–80.3s): photo / image: real material or generated, to confirm
- Shot #44 (91.0–92.2s): photo / image: real material or generated, to confirm
- No AI listened to the soundtrack (the review covered the picture only): real voice versus TTS is inferred from the waveform; the effects were found on the separ…

## Map

Read this page first; for detail, open only the file you need. Each line is `path | ~tokens | what is in it · when to read it`; paths are relative to this directory.

```videomd-map
video/timeline.md | 4763 | Timeline: one line per shot · what a stretch says, which shots need review, how a shot was made
video/content.md | 1981 | Content and structure · what it says, the narrative line, structure, the script
video/cast.md | 291 | Cast, scenes and props · reference images for characters, first-frame prompts
video/sound.md | 730 | Sound · voice, music, sound effects, beats and sources
video/rhythm.md | 3250 | Rhythm and key frames · when cuts and transitions happen, shot lengths, the change curve, key frames of each shot
video/style.md | 717 | Visual style · how it is drawn and the colour rules: pixel grid, outlines, shading, colour relations, colour scenes
video/look.md | 1186 | Camera, lighting and editing · for filmed shots: framing, camera, lighting, kit
video/packaging.md | 4488 | Packaging · subtitles, styled text, stickers, picture-in-picture: timing and style
video/remake.md | 28322 | Remake plan · generation units, shoots, code builds, real material to collect, acting and emotion
video/shots/*.md | 527 | Per-shot detail, tokens per file on average · checking one shot: what is seen, the inference and its basis, prompts, frames
breakdown.json | 531658 | Full raw data · for programs; a model rarely needs it
shots/ | - | contact sheet, first and last frame of each shot · checking by eye
storyboard.jpg | - | storyboard of the whole video · the whole video at a glance
stems/ | - | voice, music and effects stems · listening, remaking the sound
sfx/ | - | a clip of each sound effect · finding matching effects
packaging/ | - | subtitle files, packaging timeline, sticker frames · remaking subtitles and packaging
frames/ | - | picture scenes: full-size frames, the drawn layer cut out and sampled, measurements · remaking rendered pictures
audio.png | - | waveform and beat chart · seeing the rhythm
```

## How to read

- One shot per line: `#<n> start-end (s) | key value | …`. A key ending in `~` is the tools' inference; keys without it are visible on screen or measured directly.
- `story` job in the story and the point · `seen` what is on screen · `act` acting (emotion, strength, face) · `camera` camera move · `overlay` overlays · `made~` how it was made (inferred) · `material~` where the material came from (inferred) · `remake` remake route · `flag` needs a second look
- Full detail for a shot is in `video/shots/<n>.md` (e.g. `video/shots/07.md`).
- What is “seen” can be checked against the frames; what is “inferred” is the tools' and image readers' judgement, with the basis in each shot file. When they disagree, trust the frames.
