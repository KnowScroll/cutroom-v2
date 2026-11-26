---
videomd: 1
part: style
tokens: 875
---

# Visual style

Colour is written as relations (offsets from the base hue, lightness and chroma levels by role), so it works with any base hue; the hex values at the end are the original's, for reference only: do not copy them.

## Rendering (measured)

- No pixel grid (not pixel art, or a grid too fine to measure)
- Flat fills 89%, gentle gradients 6%, hard edges 3%; dark outlines on about 8% of hard edges; no checkerboard dithering
- 26 colours cover 95% of the picture; detail score 3.85 (fastreel background-detail scale: flat gradient about 0.2, six outlined boxes 1.45); repeated frames 48% (higher = held drawings, animated on twos or lower)

## Rendering (seen)

- **rendering style**: flat vector illustration (Kurzgesagt-like science explainer): solid fills, a few soft gradients, glow halos; code-rendered SVG _(agent)_
- **outlines**: none: shapes are separated by colour and value only, never an ink line _(agent)_
- **shading**: one light direction for everything (from the right): each body is a flat base colour with a big dark night-side ellipse over its left side in the ground hue at about 78% opacity, leaving a lit crescent on the right; a faint soft white highlight spot top-right; a blurred halo of the base colour around it _(agent)_
- **shape language**: perfect circles and ellipses, rounded pills, horizontal bands and soft blotches clipped inside circles; a tilted thin ellipse for a ring; four-point sparkles made of curved concave diamonds _(agent)_
- **texture**: none on objects; the ground is a smooth vertical gradient with a soft radial haze; texture only from the star field _(agent)_
- **type and UI**: one geometric rounded sans (Poppins): white medium-weight caption in sentence case low in the frame with a soft dark shadow; small bold labels in bright rounded pills (radius about 12 px) in each object's own saturated hue with white text (dark text on the mint pill); one bigger hot-pink answer chip with a yellow check disc, tilted -3 degrees _(agent)_
- **motion style**: things drop or slide in one at a time with a little overshoot (back.out), tags pop from scale 0 with overshoot, stars breathe in opacity, slow drift of the whole scene, and a small scale pulse when the payoff lands _(agent)_
- **signature traits**: glowing flat bodies with a dark crescent night side on a deep violet star field, each with its own bright colour tag, shown to scale on a dotted measuring line, the answer stamped by a pink check chip _(agent)_
- **do not copy**: the topic (planets stacked between Earth and the Moon), its object list, its words, numbers and distances, the Kurzgesagt name, characters (birds) and artwork; no watermark or handle seen _(agent)_

## Colour recipe, whole video

Ground: dark key, lightness L 0.22, chroma C 0.09, 89% of the frame, tinted slightly cool (-1° from the base hue)
Harmony: monochromatic; hue families (offset from the base hue):
  - 0° (base, cool): lightness 0.22–0.71, peak chroma 0.12, 95% of the frame
  - +92° (accent, warm): lightness 0.67–0.67, peak chroma 0.16, <1% of the frame
  - +161° (accent, warm): lightness 0.84–0.84, peak chroma 0.06, 2% of the frame
Vivid colours sit at lightness 0.67–0.71, chroma 0.12–0.16
Ramp: 3 steps, lightness 0.22→0.71, hue turns -8° from shadow to highlight, chroma peaks at lightness 0.71
Contrast lightest vs ground 10.5:1; 5 main colours, 0 of them neutral

## Original colours (reference only)

#140b3f 89% #4b3f68 6% #cac6a1 2% #e5616e 0% #959bf2 0%
