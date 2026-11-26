---
videomd: 1
name: ref3
description: 'Made with (inferred): 3D render 100%'
source:
  file: ref3.mp4
  sha256: 6ccda90e2492867342463fa0b5b9844e9e9edeedc91bfe0e1e119e84feaf2b11
  duration: 34.133
  size: 576x1024
  fps: 30.0
  aspect: '9:16'
shots: 11
lang: en
made_mix:
  cg_3d: 1.0
confidence: 0.895
readers:
- tools
- agent
open_questions: 2
generator:
  name: rea-video
  version: 0.1.0
---

# ref3.mp4

**Verdict** (inferred): Mixed production: 3D render 100%; overlays: styled text, text labels, subtitles, title (composited in code / an editor); audio: music 112.3BPM (to confirm, leaning stock library music) + 2 sound effects; packaging: 53 subtitle lines, styled text ×2, text labels ×43, 1 sound effects land on text / sticker pops
**Narrative**: #01 grab attention → #02-03 add information → #04 show evidence → #05-06 add information → #07 turn → #08-10 deliver the conclusion → #11 call to action
**Made with** (inferred, by duration): 3D render 100%
**Remake**: 11 3D render shots → 3 generation units, 3 Seedance 2.0 calls

## Next steps

- Remake: `rea-video remake <this dir>` does what can be done automatically and keeps the original elsewhere; `remake/status.md` says per shot what is left. Add incoming clips to `remake/mine.json` and run it again
- AI shots: prompts are in the generation units of `video/remake.md`; for automatic generation run `rea-video remake-plan` + `remake-run --dry-run` (paid: ask the user first)

## Open questions

- No AI listened to the soundtrack (the review covered the picture only): real voice versus TTS is inferred from the waveform; the effects were found on the separ…
- music source to confirm: most likely stock library music (63%); how to check is under “Sound”

## Map

Read this page first; for detail, open only the file you need. Each line is `path | ~tokens | what is in it · when to read it`; paths are relative to this directory.

```videomd-map
video/timeline.md | 1158 | Timeline: one line per shot · what a stretch says, which shots need review, how a shot was made
video/content.md | 325 | Content and structure · what it says, the narrative line, structure, the script
video/cast.md | 183 | Cast, scenes and props · reference images for characters, first-frame prompts
video/sound.md | 565 | Sound · voice, music, sound effects, beats and sources
video/rhythm.md | 653 | Rhythm and key frames · when cuts and transitions happen, shot lengths, the change curve, key frames of each shot
video/style.md | 894 | Visual style · how it is drawn and the colour rules: pixel grid, outlines, shading, colour relations, colour scenes
video/look.md | 1151 | Camera, lighting and editing · for filmed shots: framing, camera, lighting, kit
video/packaging.md | 3637 | Packaging · subtitles, styled text, stickers, picture-in-picture: timing and style
video/remake.md | 1964 | Remake plan · generation units, shoots, code builds, real material to collect, acting and emotion
video/shots/*.md | 652 | Per-shot detail, tokens per file on average · checking one shot: what is seen, the inference and its basis, prompts, frames
breakdown.json | 117371 | Full raw data · for programs; a model rarely needs it
shots/ | - | contact sheet, first and last frame of each shot · checking by eye
storyboard.jpg | - | storyboard of the whole video · the whole video at a glance
stems/ | - | voice, music and effects stems · listening, remaking the sound
sfx/ | - | a clip of each sound effect · finding matching effects
packaging/ | - | subtitle files, packaging timeline, sticker frames · remaking subtitles and packaging
audio.png | - | waveform and beat chart · seeing the rhythm
```

## How to read

- One shot per line: `#<n> start-end (s) | key value | …`. A key ending in `~` is the tools' inference; keys without it are visible on screen or measured directly.
- `story` job in the story and the point · `seen` what is on screen · `act` acting (emotion, strength, face) · `camera` camera move · `overlay` overlays · `made~` how it was made (inferred) · `material~` where the material came from (inferred) · `remake` remake route · `flag` needs a second look
- Full detail for a shot is in `video/shots/<n>.md` (e.g. `video/shots/07.md`).
- What is “seen” can be checked against the frames; what is “inferred” is the tools' and image readers' judgement, with the basis in each shot file. When they disagree, trust the frames.
