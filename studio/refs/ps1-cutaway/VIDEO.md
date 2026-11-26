---
videomd: 1
name: ps1-cutaway
description: 'Made with (inferred): code / template render 96%, live action 4%'
source:
  file: ps1-cutaway.mp4
  sha256: 71638f1bca9fb75d3a9a2fdda6c97ee6e04457a89d399ee8eef9556efc7579ef
  duration: 43.233
  size: 720x1280
  fps: 30.0
  aspect: '9:16'
shots: 20
lang: en
made_mix:
  code_render: 0.963
  live_action: 0.037
confidence: 0.807
readers:
- tools
- agent
open_questions: 3
generator:
  name: rea-video
  version: 0.1.0
---

# ps1-cutaway.mp4

**Verdict** (inferred): Mixed production: code / template render 96% + live action 4%; overlays: text labels, static graphics, static sticker, subtitles (composited in code / an editor); real material used: live footage (1.6s); audio: voice + music 172.3BPM (to confirm, leaning stock library music) + 13 sound effects; packaging: 86 subtitle lines, text labels ×2, stickers / GIFs ×2, 11 sound effects land on text / sticker pops
**Narrative**: #01-03 grab attention → #04-05 turn → #06-08 add information → #09-10 show evidence → #11 add information → #12 show evidence → #13-14 add information → #15 turn → #16-19 show evidence → #20 call to action
**Made with** (inferred, by duration): code / template render 96%, live action 4%
**Remake**: live action 1 shot → 1 scene, 1 camera setup; code render / screen capture 19 shots → 1 code project (2 parts)
**Real material to collect**: 1 shots (4% of the duration), list in `video/remake.md`

## Next steps

- Remake: `rea-video remake <this dir>` does what can be done automatically and keeps the original elsewhere; `remake/status.md` says per shot what is left. Add incoming clips to `remake/mine.json` and run it again
- Code-rendered shots are best rebuilt in an HTML video framework (such as HyperFrames) from the rhythm and key frames in `video/rhythm.md`; `rea-video code-remake <this dir>` only makes a quick draft for particles / data-visualisation pictures

## Open questions

- Shot #12 (23.5–25.1s): Tools say live action, the image review says code / template render; on the AI / live-action axis the fusion follows the tools (eval-cali…
- No AI listened to the soundtrack (the review covered the picture only): real voice versus TTS is inferred from the waveform; the effects were found on the separ…
- music source to confirm: most likely stock library music (63%); how to check is under “Sound”

## Map

Read this page first; for detail, open only the file you need. Each line is `path | ~tokens | what is in it · when to read it`; paths are relative to this directory.

```videomd-map
video/timeline.md | 2021 | Timeline: one line per shot · what a stretch says, which shots need review, how a shot was made
video/content.md | 785 | Content and structure · what it says, the narrative line, structure, the script
video/cast.md | 290 | Cast, scenes and props · reference images for characters, first-frame prompts
video/sound.md | 852 | Sound · voice, music, sound effects, beats and sources
video/rhythm.md | 810 | Rhythm and key frames · when cuts and transitions happen, shot lengths, the change curve, key frames of each shot
video/style.md | 2349 | Visual style · how it is drawn and the colour rules: pixel grid, outlines, shading, colour relations, colour scenes
video/look.md | 1590 | Camera, lighting and editing · for filmed shots: framing, camera, lighting, kit
video/packaging.md | 3379 | Packaging · subtitles, styled text, stickers, picture-in-picture: timing and style
video/remake.md | 9019 | Remake plan · generation units, shoots, code builds, real material to collect, acting and emotion
video/shots/*.md | 651 | Per-shot detail, tokens per file on average · checking one shot: what is seen, the inference and its basis, prompts, frames
breakdown.json | 170455 | Full raw data · for programs; a model rarely needs it
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
