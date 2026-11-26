---
videomd: 1
part: style
tokens: 941
---

# Visual style

Colour is written as relations (offsets from the base hue, lightness and chroma levels by role), so it works with any base hue; the hex values at the end are the original's, for reference only: do not copy them.

## Rendering (measured)

- No pixel grid (not pixel art, or a grid too fine to measure)
- Flat fills 34%, gentle gradients 26%, hard edges 8%; dark outlines on about 74% of hard edges; no checkerboard dithering
- 82 colours cover 95% of the picture; detail score 7.16 (fastreel background-detail scale: flat gradient about 0.2, six outlined boxes 1.45); repeated frames 0% (higher = held drawings, animated on twos or lower)

## Rendering (seen)

- **rendering style**: Blocky voxel world in the look of a block-building game: every object is built from unit cubes, each face carrying a 16x16 pixel texture drawn in code and magnified without smoothing; real-time lighting with a sun, sky fill, fog and soft shadows _(agent)_
- **outlines**: none: cube edges read by the value step between faces (top lightest, sides darker) _(agent)_
- **shading**: per-face flat lighting: top faces lightest, sun-facing side mid, the far side darkest, plus soft cast shadows; texture texels vary brightness by about +-10% inside each face _(agent)_
- **shape language**: strictly cubic and grid-aligned: terraces stepping by one block, trees as a log column with a cross-shaped cluster of leaf cubes, clouds as flat slabs on a coarse grid, smoke and dust as small tumbling cubes _(agent)_
- **texture**: procedural 16x16 texels: grass top speckled 6 greens, grass side dirt with a jagged green drip fringe 3 to 5 texels deep, cobblestone as irregular grey stones with dark mortar, planks as 4 horizontal boards with darker seams and staggered butt joints, logs as vertical bark stripes with ring end grain, leaves dark speckled greens with see-through holes, glass a pale frame with diagonal glints _(agent)_
- **type and UI**: one lowercase white pixel-font line at the top centre (92 px, letters dropping in with 6 px steps), then a one-word payoff line at 150 px slamming in with a scale overshoot; each with a hard dark-brown drop shadow offset 7 to 10 px down-right; no panels or boxes _(agent)_
- **motion style**: blocks fall about 2.4 block heights in 0.2 s, scale 0.5 to 1, a small spin, then squash and stretch on landing (exponentially damped); builds in layers in sweeping order; a slow eased camera orbit and crane; the last piece slams from higher with a camera shake and a dust puff; lights switch on in steps _(agent)_
- **signature traits**: The thing builds itself block by block, layer by layer, and the last block landing turns on the warm light and the payoff word _(agent)_
- **do not copy**: the topic and objects (a house or cottage with a chimney and smoke), the words "block by block" and "home."; Mojang textures, logos and characters; there is no watermark or handle _(agent)_

## Colour recipe, whole video

Ground: mid key, lightness L 0.61, chroma C 0.13, 36% of the frame, tinted slightly between (+1° from the base hue)
Harmony: analogous; hue families (offset from the base hue):
  - 0° (base, between): lightness 0.42–0.70, peak chroma 0.13, 67% of the frame
  - -69° (support, warm): lightness 0.35–0.43, peak chroma 0.05, 14% of the frame
  - +121° (support, cool): lightness 0.83–0.83, peak chroma 0.06, 15% of the frame
Vivid colours sit at lightness 0.51–0.61, chroma 0.11–0.13
Ramp: 4 steps, lightness 0.42→0.70, hue turns +16° from shadow to highlight, chroma peaks at lightness 0.61
Contrast lightest vs ground 3.1:1; 8 main colours, 1 of them neutral

## Original colours (reference only)

#5d953d 36% #517730 16% #aec8ed 15% #335c1d 12% #4e3720 10% #604d31 4% #ebedf1 4% #7eab81 3%
