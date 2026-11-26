---
videomd: 1
name: 3d
description: 'Made with (inferred): 3D render 100%'
source:
  file: 3d.mp4
  sha256: c5cfd3e5c2c4586fcbab45daa20e389ca28178dc16d8d74ddd2b4512b7b5d387
  duration: 63.833
  size: 720x1280
  fps: 30.0
  aspect: '9:16'
shots: 26
lang: en
made_mix:
  cg_3d: 1.0
confidence: 0.727
readers:
- tools
- agent
open_questions: 1
generator:
  name: rea-video
  version: 0.1.0
---

# 3d.mp4

**Verdict** (inferred): Mixed production: 3D render 100%; overlays: styled text, text labels, static graphics, subtitles, title (composited in code / an editor); real material used: UI screenshot (14.5s); audio: voice + 42 sound effects; packaging: 60 subtitle lines, styled text ×14, text labels ×78, 27 sound effects land on text / sticker pops
**Narrative**: #01 grab attention → #02 show evidence → #03 grab attention → #04-06 set the scene → #07-11 add information → #12 turn → #13 show evidence → #14 add information → #15 turn → #16-17 add information → #18-22 turn → #23-26 deliver the conclusion
**Made with** (inferred, by duration): 3D render 100%
**Remake**: 26 3D render shots → 5 generation units, 5 Seedance 2.0 calls
**Real material to collect**: 3 shots (23% of the duration), list in `video/remake.md`

## Next steps

- Remake: `rea-video remake <this dir>` does what can be done automatically and keeps the original elsewhere; `remake/status.md` says per shot what is left. Add incoming clips to `remake/mine.json` and run it again
- AI shots: prompts are in the generation units of `video/remake.md`; for automatic generation run `rea-video remake-plan` + `remake-run --dry-run` (paid: ask the user first)

## Open questions

- No AI listened to the soundtrack (the review covered the picture only): real voice versus TTS is inferred from the waveform; the effects were found on the separ…

## Map

Read this page first; for detail, open only the file you need. Each line is `path | ~tokens | what is in it · when to read it`; paths are relative to this directory.

```videomd-map
video/timeline.md | 2540 | Timeline: one line per shot · what a stretch says, which shots need review, how a shot was made
video/content.md | 1428 | Content and structure · what it says, the narrative line, structure, the script
video/cast.md | 458 | Cast, scenes and props · reference images for characters, first-frame prompts
video/sound.md | 794 | Sound · voice, music, sound effects, beats and sources
video/rhythm.md | 1431 | Rhythm and key frames · when cuts and transitions happen, shot lengths, the change curve, key frames of each shot
video/style.md | 834 | Visual style · how it is drawn and the colour rules: pixel grid, outlines, shading, colour relations, colour scenes
video/look.md | 1124 | Camera, lighting and editing · for filmed shots: framing, camera, lighting, kit
video/packaging.md | 4554 | Packaging · subtitles, styled text, stickers, picture-in-picture: timing and style
video/remake.md | 5263 | Remake plan · generation units, shoots, code builds, real material to collect, acting and emotion
video/shots/*.md | 682 | Per-shot detail, tokens per file on average · checking one shot: what is seen, the inference and its basis, prompts, frames
breakdown.json | 255508 | Full raw data · for programs; a model rarely needs it
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
