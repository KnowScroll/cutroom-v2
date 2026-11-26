---
videomd: 1
part: style
tokens: 1921
---

# Visual style

Colour is written as relations (offsets from the base hue, lightness and chroma levels by role), so it works with any base hue; the hex values at the end are the original's, for reference only: do not copy them.

## Rendering (measured)

- Pixel art: about 180 art pixels across the frame (each about 1/180 of the width; 6.0 px at 1080 wide); grid found in 99% of frames
- Flat fills 86%, gentle gradients 6%, hard edges 3%; dark outlines on about 11% of hard edges; checkerboard dithering in 55% of frames, up to 13% of a frame's busy art pixels
- 37 colours cover 95% of the picture; detail score 3.58 (fastreel background-detail scale: flat gradient about 0.2, six outlined boxes 1.45); repeated frames 18% (higher = held drawings, animated on twos or lower)

## Rendering (seen)

- **rendering style**: Pixel art at a low fixed resolution (about 180 x 320 art pixels, scaled up by an exact factor), drawn and animated in code; retro game look _(agent)_
- **outlines**: No dark outlines; shapes are separated by colour steps. UI panels have a 1-art-pixel border in a muted tint of the scene colour _(agent)_
- **shading**: Flat fills in 3-4 step colour ramps (shadow, base, light, highlight); light from the top-left on spheres and cloud puffs; hot things glow through a red-orange-amber-cream ramp; skies are flat horizontal bands with stepped edges; dark overlays use checkerboard dithering _(agent)_
- **shape language**: Round and chunky: balls and puff clusters built from pixel circles, low flat horizon lines, silhouettes readable at tiny size; subjects small inside a big field of repeated elements, or one big subject on a wide simple scene _(agent)_
- **texture**: Hard pixel edges everywhere, scattered single-pixel specks on the ground, star pixels in the sky, checkerboard dither for passing shadows; no noise, no blur, no smooth gradients _(agent)_
- **type and UI**: Uppercase monospace bitmap (pixel) font in near-white; caption panel at the top centre (dark navy fill, 1-pixel border tinted to the scene); a second counter panel under it with GENERATION n, a large number, a unit line and small corner ticks; numbers switch to scientific notation (6.0x10^23 with superscript) when large; short labels (U-235) right under objects _(agent)_
- **motion style**: Rule-driven simulation (particles split, fly, multiply on a lattice) with a counter ticking every 0.5 s; growth effects (fireball swells, cloud rises and billows); a full-frame white flash between scale levels; one push-in at the end and a match cut back to the first frame for a seamless loop; motion is smooth but positions snap to the pixel grid _(agent)_
- **signature traits**: Low-res pixel grid on everything; near-black space ground with one bright sprite colour; HUD panels with bitmap font and live counters; micro-to-macro story with a white flash bridge; ends on its own first frame (loop) _(agent)_
- **do not copy**: The @BITWONDER watermark under the counter, the exact topic (nuclear fission, uranium, Trinity test, mushroom cloud) and its numbers _(agent)_

## Colour recipe, whole video

Ground: dark key, lightness L 0.11, chroma C 0.03, 40% of the frame, tinted slightly cool (-139° from the base hue)
Harmony: complementary with extra hues; hue families (offset from the base hue):
  - 0° (base, warm): lightness 0.49–0.83, peak chroma 0.18, 8% of the frame
  - -131° (support, cool): lightness 0.27–0.39, peak chroma 0.08, 11% of the frame
  - +37° (accent, warm): lightness 0.91–0.91, peak chroma 0.10, 1% of the frame
Vivid colours sit at lightness 0.58–0.91, chroma 0.10–0.18
Ramp: 4 steps, lightness 0.49→0.83, hue turns +27° from shadow to highlight, chroma peaks at lightness 0.58
Contrast lightest vs ground 20.5:1; 12 main colours, 5 of them neutral

## Colour scenes

The video falls into stretches whose palettes stay close; each has its own recipe:

### Scene 1: 0.6–16.3s (shot_001)

- Ground: dark key, lightness L 0.10, chroma C 0.03, 72% of the frame, tinted slightly cool (+140° from the base hue)
- Harmony: monochromatic; hue families (offset from the base hue):
  - 0° (base, between): lightness 0.59–0.79, peak chroma 0.16, 2% of the frame
- Vivid colours sit at lightness 0.59–0.79, chroma 0.12–0.16
- Contrast lightest vs ground 10.8:1; 6 main colours, 3 of them neutral
- Original colours (reference only): #01020a 72% (neutral, L 0.10) #191024 12% (neutral, L 0.19) #3b1829 6% (neutral, L 0.29) #54842b 1% (lime, L 0.59) #649a36 1% (lime, L 0.63) #93cc51 0% (lime, L 0.79)

### Scene 2: 17.4–19.5s (shot_001, shot_002)

- Ground: mid key, lightness L 0.71, chroma C 0.17, 16% of the frame, tinted slightly warm (+2° from the base hue)
- Harmony: analogous; hue families (offset from the base hue):
  - 0° (base, warm): lightness 0.43–0.83, peak chroma 0.18, 56% of the frame
  - +43° (support, warm): lightness 0.92–0.92, peak chroma 0.11, 16% of the frame
- Vivid colours sit at lightness 0.43–0.92, chroma 0.11–0.18
- Ramp: 4 steps, lightness 0.43→0.83, hue turns +44° from shadow to highlight, chroma peaks at lightness 0.58
- Contrast lightest vs ground 2.6:1; 8 main colours, 3 of them neutral
- Original colours (reference only): #f17e20 16% (orange, L 0.71) #fde58c 16% (amber, L 0.92) #f9b84c 15% (amber, L 0.83) #cd4910 14% (red, L 0.58) #fffbee 13% (neutral, L 0.98) #151628 11% (neutral, L 0.20) #90230a 10% (red, L 0.43) #646a7a 3% (neutral, L 0.51)

### Scene 3: 19.6–20.0s (shot_003)

- Ground: light key, lightness L 1.00, chroma C 0.00, 100% of the frame, close to neutral
- Contrast lightest vs ground 1.0:1; 1 main colours, 1 of them neutral
- Original colours (reference only): #fffdff 100% (neutral, L 1.00)

### Scene 4: 20.8–43.0s (shot_004, shot_005)

- Ground: dark key, lightness L 0.25, chroma C 0.03, 31% of the frame, tinted slightly warm (-20° from the base hue)
- Harmony: complementary; hue families (offset from the base hue):
  - 0° (base, warm): lightness 0.49–0.80, peak chroma 0.12, 11% of the frame
  - -130° (support, cool): lightness 0.27–0.39, peak chroma 0.08, 21% of the frame
- Vivid colours sit at lightness 0.56–0.80, chroma 0.12–0.12
- Ramp: 4 steps, lightness 0.49→0.80, hue turns +15° from shadow to highlight, chroma peaks at lightness 0.80
- Contrast lightest vs ground 9.5:1; 9 main colours, 3 of them neutral
- Original colours (reference only): #251613 31% (neutral, L 0.25) #070714 22% (neutral, L 0.14) #423f6f 13% (violet, L 0.39) #4f342a 9% (neutral, L 0.36) #1e1e47 8% (violet, L 0.27) #775441 8% (orange, L 0.49) #e08558 2% (orange, L 0.71) #f0b554 1% (orange, L 0.80) #a95433 0% (red, L 0.56)

### Scene 5: 43.1–44.0s (shot_006)

- Ground: dark key, lightness L 0.09, chroma C 0.03, 60% of the frame, tinted slightly cool (+136° from the base hue)
- Harmony: monochromatic; hue families (offset from the base hue):
  - 0° (base, between): lightness 0.32–0.95, peak chroma 0.17, 26% of the frame
- Vivid colours sit at lightness 0.50–0.95, chroma 0.11–0.17
- Ramp: 7 steps, lightness 0.32→0.95, hue turns -15° from shadow to highlight, chroma peaks at lightness 0.75
- Contrast lightest vs ground 18.6:1; 9 main colours, 2 of them neutral
- Original colours (reference only): #01020a 60% (neutral, L 0.09) #0d180a 13% (neutral, L 0.20) #87c83e 7% (lime, L 0.75) #bfeb7a 6% (lime, L 0.87) #1d3a12 6% (green, L 0.32) #36671c 3% (lime, L 0.50) #528e25 2% (lime, L 0.62) #61a12b 2% (lime, L 0.64) #e2fdab 0% (lime, L 0.95)

## Original colours (reference only)

#01020a 40% #251613 18% #423f6f 7% #0b0b23 6% #4f342a 5% #775441 4% #1e1e47 4% #fffdff 2% #f17e20 2% #fde58c 1% #f9b84c 1% #cd4910 1%
