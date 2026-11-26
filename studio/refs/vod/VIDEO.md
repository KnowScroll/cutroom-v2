---
videomd: 1
name: vod
description: 'Made with (inferred): 2D animation 88%, 3D render 12%'
source:
  file: vod.mp4
  sha256: 0483e962d7e0bb776a8a3b688827a517efdcf23b20eccda6a29429b40285217b
  duration: 115.1
  size: 576x1024
  fps: 30.0
  aspect: '9:16'
shots: 45
lang: en
made_mix:
  anim_2d: 0.885
  cg_3d: 0.115
confidence: 0.721
readers:
- tools
- agent
open_questions: 37
generator:
  name: rea-video
  version: 0.1.0
---

# vod.mp4

**Verdict** (inferred): Mixed production: 2D animation 89% + 3D render 11% (89% of the duration lacks evidence for live action vs AI, to confirm); overlays: text labels, static graphics, static sticker, subtitles, title (composited in code / an editor); real material used: photo (4.6s); audio: voice + music 112.3BPM (to confirm, leaning stock library music) + 7 sound effects; packaging: 117 subtitle lines, title ×10, text labels ×25, stickers / GIFs ×1, 3 sound effects land on text / sticker pops
**Narrative**: #01 grab attention → #02 set the scene → #03 set the mood → #04 set the scene → #05-10 add information → #11 turn → #12 add information → #13 turn → #14 add information → #15 turn → #16 add information → #17 show evidence → #18-22 add information → #23 turn → #24-25 add information → #26 show evidence → #27-29 add information → #30 deliver the conclusion → #31-33 set the mood → #34 deliver the conclusion → #35 set the mood → #36 deliver the conclusion → #37-38 turn → #39-40 set the mood → #41-44 add information → #45 deliver the conclusion
**Made with** (inferred, by duration): 2D animation 88%, 3D render 12%
**Remake**: 35 2D animation shots + 10 3D render shots → 9 generation units, 9 Seedance 2.0 calls
**Real material to collect**: 2 shots (4% of the duration), list in `video/remake.md`

## Next steps

- Remake: `rea-video remake <this dir>` does what can be done automatically and keeps the original elsewhere; `remake/status.md` says per shot what is left. Add incoming clips to `remake/mine.json` and run it again
- AI shots: prompts are in the generation units of `video/remake.md`; for automatic generation run `rea-video remake-plan` + `remake-run --dry-run` (paid: ask the user first)

## Open questions

- Shot #1 (0.0–9.4s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion g…
- Shot #2 (9.4–15.0s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion …
- Shot #3 (15.0–15.3s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion…
- Shot #4 (15.3–17.5s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion…
- Shot #5 (17.5–23.2s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion…
- Shot #6 (23.2–26.5s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion…
- Shot #7 (26.5–28.1s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion…
- Shot #8 (28.1–30.0s): 2D animation rests on a single image reader (the tools cannot measure this class): 2D animation is easily confused with code-driven motion…
- 29 more, see the `flag` lines in `video/timeline.md`

## Map

Read this page first; for detail, open only the file you need. Each line is `path | ~tokens | what is in it · when to read it`; paths are relative to this directory.

```videomd-map
video/timeline.md | 4321 | Timeline: one line per shot · what a stretch says, which shots need review, how a shot was made
video/content.md | 2627 | Content and structure · what it says, the narrative line, structure, the script
video/cast.md | 682 | Cast, scenes and props · reference images for characters, first-frame prompts
video/sound.md | 878 | Sound · voice, music, sound effects, beats and sources
video/rhythm.md | 2327 | Rhythm and key frames · when cuts and transitions happen, shot lengths, the change curve, key frames of each shot
video/style.md | 1755 | Visual style · how it is drawn and the colour rules: pixel grid, outlines, shading, colour relations, colour scenes
video/look.md | 1358 | Camera, lighting and editing · for filmed shots: framing, camera, lighting, kit
video/packaging.md | 4585 | Packaging · subtitles, styled text, stickers, picture-in-picture: timing and style
video/remake.md | 6885 | Remake plan · generation units, shoots, code builds, real material to collect, acting and emotion
video/shots/*.md | 621 | Per-shot detail, tokens per file on average · checking one shot: what is seen, the inference and its basis, prompts, frames
breakdown.json | 296579 | Full raw data · for programs; a model rarely needs it
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
