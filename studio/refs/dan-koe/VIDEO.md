---
videomd: 1
name: dan-koe
description: 'Made with (inferred): code / template render 100%'
source:
  file: dan-koe.mp4
  sha256: 2a23890133623c3f323afc65d8e3a62e605410ae3c24861ca424faf13930ff3a
  duration: 4.0
  size: 1080x1920
  fps: 30.0
  aspect: '9:16'
shots: 1
lang: en
made_mix:
  code_render: 1.0
confidence: 0.93
readers:
- tools
- agent
open_questions: 0
generator:
  name: rea-video
  version: 0.1.0
---

# dan-koe.mp4

**Verdict** (inferred): code / template render 100%
**Narrative**: #01 deliver the conclusion
**Made with** (inferred, by duration): code / template render 100%
**Remake**: code render / screen capture 1 shot → 1 code project

## Next steps

- Remake: `rea-video remake <this dir>` does what can be done automatically and keeps the original elsewhere; `remake/status.md` says per shot what is left. Add incoming clips to `remake/mine.json` and run it again
- Code-rendered shots are best rebuilt in an HTML video framework (such as HyperFrames) from the rhythm and key frames in `video/rhythm.md`; `rea-video code-remake <this dir>` only makes a quick draft for particles / data-visualisation pictures

## Open questions

- None

## Map

Read this page first; for detail, open only the file you need. Each line is `path | ~tokens | what is in it · when to read it`; paths are relative to this directory.

```videomd-map
video/timeline.md | 235 | Timeline: one line per shot · what a stretch says, which shots need review, how a shot was made
video/content.md | 163 | Content and structure · what it says, the narrative line, structure, the script
video/cast.md | 148 | Cast, scenes and props · reference images for characters, first-frame prompts
video/sound.md | 18 | Sound · voice, music, sound effects, beats and sources
video/rhythm.md | 140 | Rhythm and key frames · when cuts and transitions happen, shot lengths, the change curve, key frames of each shot
video/style.md | 689 | Visual style · how it is drawn and the colour rules: pixel grid, outlines, shading, colour relations, colour scenes
video/look.md | 712 | Camera, lighting and editing · for filmed shots: framing, camera, lighting, kit
video/packaging.md | 153 | Packaging · subtitles, styled text, stickers, picture-in-picture: timing and style
video/remake.md | 1574 | Remake plan · generation units, shoots, code builds, real material to collect, acting and emotion
video/shots/*.md | 1081 | Per-shot detail, tokens per file on average · checking one shot: what is seen, the inference and its basis, prompts, frames
breakdown.json | 10605 | Full raw data · for programs; a model rarely needs it
shots/ | - | contact sheet, first and last frame of each shot · checking by eye
storyboard.jpg | - | storyboard of the whole video · the whole video at a glance
packaging/ | - | subtitle files, packaging timeline, sticker frames · remaking subtitles and packaging
frames/ | - | picture scenes: full-size frames, the drawn layer cut out and sampled, measurements · remaking rendered pictures
```

## How to read

- One shot per line: `#<n> start-end (s) | key value | …`. A key ending in `~` is the tools' inference; keys without it are visible on screen or measured directly.
- `story` job in the story and the point · `seen` what is on screen · `act` acting (emotion, strength, face) · `camera` camera move · `overlay` overlays · `made~` how it was made (inferred) · `material~` where the material came from (inferred) · `remake` remake route · `flag` needs a second look
- Full detail for a shot is in `video/shots/<n>.md` (e.g. `video/shots/07.md`).
- What is “seen” can be checked against the frames; what is “inferred” is the tools' and image readers' judgement, with the basis in each shot file. When they disagree, trust the frames.
