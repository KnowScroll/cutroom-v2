---
videomd: 1
part: style
tokens: 842
---

# Visual style

Colour is written as relations (offsets from the base hue, lightness and chroma levels by role), so it works with any base hue; the hex values at the end are the original's, for reference only: do not copy them.

## Rendering (measured)

- No pixel grid (not pixel art, or a grid too fine to measure)
- Flat fills 84%, gentle gradients 8%, hard edges 4%; dark outlines on about 18% of hard edges; no checkerboard dithering
- 20 colours cover 95% of the picture; detail score 4.01 (fastreel background-detail scale: flat gradient about 0.2, six outlined boxes 1.45); repeated frames 0% (higher = held drawings, animated on twos or lower)

## Rendering (seen)

- **rendering style**: Low-poly real-time 3D rendered in code: flat-shaded faceted models, an infinite perspective grid floor, a faceted mountain ring at the horizon with a fog band, plus a 2D annotation layer of dots, traces, rings and translucent panels drawn over the scene _(agent)_
- **outlines**: No outlines on models or mountains; facets separated by tone only. Overlay graphics are thin lines (2 to 3 px at 1080 wide) and hollow circles _(agent)_
- **shading**: Flat facets in 2 to 3 tones of one neutral (light, mid, dark grey) per model; mountains in pale lavender-grey facets fading into a soft fog band; ground near-black; no gradients except the fog band and translucent sweep wedge _(agent)_
- **shape language**: Clean geometric: triangles and prisms for models, straight segment traces with small round nodes, ellipses for uncertainty regions, square corner-bracket reticles, a circle scope inset _(agent)_
- **texture**: None: clean vector surfaces, a thin grid on the floor (about 15% opacity), the only soft things are the fog band and the sweep wedge _(agent)_
- **type and UI**: Captions: left-aligned, no backing, semibold geometric sans about 50 px (at 1080 wide), cream-white, 2 lines max, low in the frame (y about 1400), one keyword per line highlighted in violet (the newly named term), the final payoff term in yellow-green, a failure term in coral red. Header: the acronym of the final method in a bold sans, cream, letters separated by small dots, on a small dark rounded plate at top centre, letters filling in as each part is named. Tiny dark rounded tag labels on objects. A rewind icon (double left arrow) at the end _(agent)_
- **motion style**: Never still: the camera keeps gliding and orbiting; every clause adds one overlay element in sync with its keyword (a dot, a trace, a ring, a gate, a panel); a translucent sweep wedge passes every 1.2 s; the end rewinds everything fast _(agent)_
- **signature traits**: "If you X, you get Y" chain where each Y is a newly named concept that becomes the X of the next sentence; overlays accumulate into one dense diagram; the acronym header fills letter by letter; a known failure mode at the end; rewind loop back to the first frame _(agent)_
- **do not copy**: The @embodied.dev watermark; the topic (radar tracking, drones, Kalman filter, JPDA, track coalescence), its words and the radar ground station _(agent)_

## Colour recipe, whole video

Ground: dark key, lightness L 0.16, chroma C 0.01, 78% of the frame, close to neutral
Contrast lightest vs ground 4.2:1; 6 main colours, 6 of them neutral

## Original colours (reference only)

#08060c 78% #161c20 7% #000000 4% #605f6f 4% #2a3338 3% #737081 2%
