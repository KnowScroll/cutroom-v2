---
videomd: 1
part: timeline
shots: 3
tokens: 428
---

# Timeline

One shot per line: `#<n> start-end (s) | key value | …`. A key ending in `~` is the tools' inference; keys without it are visible on screen or measured directly.
`story` job in the story and the point · `seen` what is on screen · `act` acting (emotion, strength, face) · `camera` camera move · `overlay` overlays · `made~` how it was made (inferred) · `material~` where the material came from (inferred) · `remake` remake route · `flag` needs a second look
Full detail for a shot is in `video/shots/<n>.md` (e.g. `video/shots/07.md`).

```videomd-timeline
#01 0.0-1.2 | story set the scene, The character alone in its place,… | seen A warm covered station-style platform at evening, seen by a … | act expectant (light) · pixel eyes looking t… | camera smooth move | overlay subtitle, text, title | made~ 3D render 77% · runner-up AI-generated video 8% | material~ rendered by the creator | remake AI generation / 3D render · G1
#02 1.2-2.6 | story set the mood, Something big passes in front of t… | seen A foreground wipe: a long vehicle body passes from right to … | camera smooth move | transition wipe | overlay subtitle | made~ 3D render 83% · runner-up code / template render 7% | material~ rendered by the creator | remake AI generation / 3D render · G1
#03 2.6-4.8 | story deliver the conclusion, The character is still t… | seen The same platform after the wipe: the vehicle's tail leaves … | act patient sadness (light) · pixel eyes loo… | camera smooth move | transition wipe 0.2s | overlay text, title | made~ 3D render 77% · runner-up AI-generated video 7% | material~ rendered by the creator | remake AI generation / 3D render · G1
```
