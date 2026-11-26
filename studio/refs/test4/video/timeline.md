---
videomd: 1
part: timeline
shots: 3
tokens: 379
---

# Timeline

One shot per line: `#<n> start-end (s) | key value | …`. A key ending in `~` is the tools' inference; keys without it are visible on screen or measured directly.
`story` job in the story and the point · `seen` what is on screen · `act` acting (emotion, strength, face) · `camera` camera move · `overlay` overlays · `made~` how it was made (inferred) · `material~` where the material came from (inferred) · `remake` remake route · `flag` needs a second look
Full detail for a shot is in `video/shots/<n>.md` (e.g. `video/shots/07.md`).

```videomd-timeline
#01 0.0-9.0 | story grab attention, A superlative claim about one sp… | seen Hook: the whole globe in dark space, an inland region outlin… | camera smooth move | made~ code / template render 91% · runner-up 3D render 37% | material~ rendered by the creator | remake code render · Part 1
#02 9.0-35.9 | story add information, Measure the spot with a rolling… | seen One continuous map camera over the same globe. Overlays fade… | camera static | transition dissolve | made~ code / template render 91% · runner-up 3D render 40% | material~ rendered by the creator | remake code render · Part 1
#03 35.9-59.4 | story deliver the conclusion, A second, opposite spot … | seen Zoom out to the small whole globe, spin to the other side of… | camera static | transition zoom 0.7s | made~ code / template render 90% · runner-up 3D render 25% | material~ rendered by the creator | remake code render · Part 1
```
