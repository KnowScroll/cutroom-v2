---
videomd: 1
part: style
tokens: 678
---

# Visual style

Colour is written as relations (offsets from the base hue, lightness and chroma levels by role), so it works with any base hue; the hex values at the end are the original's, for reference only: do not copy them.

## Rendering (measured)

- No pixel grid (not pixel art, or a grid too fine to measure)
- Flat fills 96%, gentle gradients 0%, hard edges 3%; dark outlines on about 26% of hard edges; no checkerboard dithering
- 1 colours cover 95% of the picture; detail score 1.98 (fastreel background-detail scale: flat gradient about 0.2, six outlined boxes 1.45); repeated frames 29% (higher = held drawings, animated on twos or lower)

## Rendering (seen)

- **rendering style**: Minimal black-and-white hairline line art drawn by code on a 2D canvas: pure black ground, thin white strokes, solid white dots, nothing filled except the dots _(agent)_
- **outlines**: Strokes only, no outlines around shapes: everything is a line (1 to 3 px, thinner level by level) or a solid dot _(agent)_
- **shading**: None: no gradients, no glow, no shadows; depth only by line weight and opacity (finished lines dim to about 50% while the dots stay at full white) _(agent)_
- **shape language**: Straight segments and circles; a binary branching tree (two children per tip, length ratio about 0.75, split angle about 0.27 to 0.44 rad); one thin ring; tiny round specks _(agent)_
- **texture**: None; the only grain is a scatter of small drifting dots (radius 3 to 5 px) that fade to grey _(agent)_
- **type and UI**: One lowercase line, centred, near-white, regular weight geometric sans (Poppins 400), 44 px on 1080 wide, centre at y about 262, ending with a full stop; it swaps to a second line in one frame at the payoff; no boxes, no stroke, no shadow _(agent)_
- **motion style**: Calm and procedural: a dot appears, a line draws out of it with easeOut-cubic (0.27 s per segment), one new level every 0.25 s, so growth reads as a steady doubling; at completion a small bounce of the tip dots, a one-shot expanding ring, a slow damped sway; camera locked _(agent)_
- **signature traits**: One white dot on pure black turning into many: hairlines that split in two at every step with a dot riding each tip, and one quiet lowercase line that changes when the drawing completes _(agent)_
- **do not copy**: The two lines of text (its words), the tree as the only motif, the exact seed shape; named after a creator style, no handle or watermark in the frame _(agent)_

## Colour recipe, whole video

Ground: dark key, lightness L 0.00, chroma C 0.00, 94% of the frame, close to neutral
Contrast lightest vs ground 1.0:1; 1 main colours, 1 of them neutral

## Original colours (reference only)

#000000 94%
