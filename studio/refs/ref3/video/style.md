---
videomd: 1
part: style
tokens: 883
---

# Visual style

Colour is written as relations (offsets from the base hue, lightness and chroma levels by role), so it works with any base hue; the hex values at the end are the original's, for reference only: do not copy them.

## Rendering (measured)

- No pixel grid (not pixel art, or a grid too fine to measure)
- Flat fills 63%, gentle gradients 15%, hard edges 12%; dark outlines on about 18% of hard edges; no checkerboard dithering
- 300 colours cover 95% of the picture; detail score 9.91 (fastreel background-detail scale: flat gradient about 0.2, six outlined boxes 1.45); repeated frames 0% (higher = held drawings, animated on twos or lower)

## Rendering (seen)

- **rendering style**: Toon-shaded 3D rendered at about 190 pixels across and scaled up (chunky pixels, stair-stepped edges), with crisp 2D HUD and callouts on top _(agent)_
- **outlines**: Thin dark rim outline (one art pixel) on model edges; HUD plates have dark ink borders _(agent)_
- **shading**: Cel bands: base, a darker shadow band and a light top-left band per surface, with checker-dithered transitions; translucent shells as a pale outline with low-opacity fill _(agent)_
- **shape language**: Chunky rounded machine parts (cylinders, blocks, rods, teeth) at exaggerated close-up scale; the HUD is a row of badge, semicircle dial and digit counter over a wide placard _(agent)_
- **texture**: Dithering in shadows; huge out-of-focus shapes of the surroundings behind the parts; thin concentric vibration rings _(agent)_
- **type and UI**: Placard: cream plate, dark ink border, striped end caps, headline in a heavy slab serif dark ink, subline bold sans in red; step number in a red circle badge on its top-left corner; speed badge (red REAL SPEED, blue NNx SLOWER, x2 FASTER flash) top-left; semicircle dial top centre; label plus 4 digit cells counter top-right; callouts: small cream tag, dark caps text, thin leader line ending in a small square on the part; a big red pop word on each action _(agent)_
- **motion style**: Never still: the mechanism always runs at the current slowdown; each speed step flashes the badge and swings the dial needle; parts move with motion-blur smears at higher speeds _(agent)_
- **signature traits**: The speed HUD: time slowed 256x and doubled back to real speed step by step while the counter shows the real rate divided by the slowdown; a numbered walk down the chain of parts, each answering what drives the last; x-ray pull-back; loops to the first frame _(agent)_
- **do not copy**: The @engineeredwithin1 watermark; the topic (the hand device, the shop, the head, the blades, the specific numbers and words) _(agent)_

## Colour recipe, whole video

Ground: dark key, lightness L 0.27, chroma C 0.05, 33% of the frame, tinted slightly cool (-110° from the base hue)
Harmony: complementary with extra hues; hue families (offset from the base hue):
  - 0° (base, warm): lightness 0.60–0.72, peak chroma 0.18, 15% of the frame
  - +41° (accent, warm): lightness 0.68–0.89, peak chroma 0.10, 6% of the frame
  - -110° (support, cool): lightness 0.27–0.27, peak chroma 0.05, 33% of the frame
  - +168° (accent, cool): lightness 0.59–0.59, peak chroma 0.07, 3% of the frame
Vivid colours sit at lightness 0.60–0.89, chroma 0.10–0.18
Contrast lightest vs ground 12.5:1; 12 main colours, 5 of them neutral

## Original colours (reference only)

#1d1d3c 33% #3f3b50 12% #eae1cc 10% #cda680 8% #49485e 7% #f3624b 6% #fdd166 4% #65606e 3% #398990 3% #8083a6 2% #c55a4b 2% #b58153 2%
