---
videomd: 1
name: low-poly
description: 'Made with (inferred): 3D render 100%'
source:
  file: low-poly.mp4
  sha256: 43da54b0ea4daa8f397a1c4548ae9f90529b9319551b3b856e9b6dae4bf3c72b
  duration: 4.8
  size: 1080x1920
  fps: 30.0
  aspect: '9:16'
shots: 3
lang: en
made_mix:
  cg_3d: 1.0
confidence: 0.788
readers:
- tools
- agent
open_questions: 0
generator:
  name: rea-video
  version: 0.1.0
---

# low-poly.mp4

**Verdict** (inferred): Mixed production: 3D render 100%; overlays: text labels, subtitles, title (composited in code / an editor); packaging: 6 subtitle lines
**Narrative**: #01 set the scene → #02 set the mood → #03 deliver the conclusion
**Made with** (inferred, by duration): 3D render 100%
**Remake**: 3 3D render shots → 1 generation unit, 1 Seedance 2.0 call

## Next steps

- Remake: `rea-video remake <this dir>` does what can be done automatically and keeps the original elsewhere; `remake/status.md` says per shot what is left. Add incoming clips to `remake/mine.json` and run it again
- AI shots: prompts are in the generation units of `video/remake.md`; for automatic generation run `rea-video remake-plan` + `remake-run --dry-run` (paid: ask the user first)

## Open questions

- None

## Map

Read this page first; for detail, open only the file you need. Each line is `path | ~tokens | what is in it · when to read it`; paths are relative to this directory.

```videomd-map
video/timeline.md | 443 | Timeline: one line per shot · what a stretch says, which shots need review, how a shot was made
video/content.md | 220 | Content and structure · what it says, the narrative line, structure, the script
video/cast.md | 275 | Cast, scenes and props · reference images for characters, first-frame prompts
video/sound.md | 18 | Sound · voice, music, sound effects, beats and sources
video/rhythm.md | 225 | Rhythm and key frames · when cuts and transitions happen, shot lengths, the change curve, key frames of each shot
video/style.md | 969 | Visual style · how it is drawn and the colour rules: pixel grid, outlines, shading, colour relations, colour scenes
video/look.md | 1708 | Camera, lighting and editing · for filmed shots: framing, camera, lighting, kit
video/packaging.md | 466 | Packaging · subtitles, styled text, stickers, picture-in-picture: timing and style
video/remake.md | 1345 | Remake plan · generation units, shoots, code builds, real material to collect, acting and emotion
video/shots/*.md | 827 | Per-shot detail, tokens per file on average · checking one shot: what is seen, the inference and its basis, prompts, frames
breakdown.json | 29036 | Full raw data · for programs; a model rarely needs it
shots/ | - | contact sheet, first and last frame of each shot · checking by eye
storyboard.jpg | - | storyboard of the whole video · the whole video at a glance
packaging/ | - | subtitle files, packaging timeline, sticker frames · remaking subtitles and packaging
```

## How to read

- One shot per line: `#<n> start-end (s) | key value | …`. A key ending in `~` is the tools' inference; keys without it are visible on screen or measured directly.
- `story` job in the story and the point · `seen` what is on screen · `act` acting (emotion, strength, face) · `camera` camera move · `overlay` overlays · `made~` how it was made (inferred) · `material~` where the material came from (inferred) · `remake` remake route · `flag` needs a second look
- Full detail for a shot is in `video/shots/<n>.md` (e.g. `video/shots/07.md`).
- What is “seen” can be checked against the frames; what is “inferred” is the tools' and image readers' judgement, with the basis in each shot file. When they disagree, trust the frames.
