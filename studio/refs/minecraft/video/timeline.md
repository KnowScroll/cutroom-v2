---
videomd: 1
part: timeline
shots: 1
tokens: 228
---

# Timeline

One shot per line: `#<n> start-end (s) | key value | …`. A key ending in `~` is the tools' inference; keys without it are visible on screen or measured directly.
`story` job in the story and the point · `seen` what is on screen · `act` acting (emotion, strength, face) · `camera` camera move · `overlay` overlays · `made~` how it was made (inferred) · `material~` where the material came from (inferred) · `remake` remake route · `flag` needs a second look
Full detail for a shot is in `video/shots/<n>.md` (e.g. `video/shots/07.md`).

```videomd-timeline
#01 0.0-4.0 | story deliver the conclusion, A thing assembles itself… | seen One continuous real-time voxel scene (three.js, procedurally… | camera smooth move | overlay title | made~ 3D render 78% · runner-up code / template render 7% | material~ rendered by the creator | remake AI generation / 3D render · G1
```
