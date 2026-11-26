---
videomd: 1
part: style
tokens: 958
---

# Visual style

Colour is written as relations (offsets from the base hue, lightness and chroma levels by role), so it works with any base hue; the hex values at the end are the original's, for reference only: do not copy them.

## Rendering (measured)

- Pixel art: about 36 art pixels across the frame (each about 1/36 of the width; 30.1 px at 1080 wide); grid found in 53% of frames
- Flat fills 43%, gentle gradients 35%, hard edges 9%; dark outlines on about 20% of hard edges; no checkerboard dithering
- 109 colours cover 95% of the picture; detail score 11.03 (fastreel background-detail scale: flat gradient about 0.2, six outlined boxes 1.45); repeated frames 0% (higher = held drawings, animated on twos or lower)

## Rendering (seen)

- **rendering style**: PS1-era real-time low-poly 3D: rendered at 360x640 and shown 3x with nearest-neighbour upscaling (chunky 3 px pixels), vertices snapped to the low-res grid (slightly wobbly edges), 15-bit colour with a 4x4 Bayer ordered dither in every material, flat-shaded facets, small nearest-filtered pixel textures _(agent)_
- **outlines**: none; shapes are separated by facet tones and by dark seams painted into the textures (plank gaps, tile joints, frames) _(agent)_
- **shading**: flat per-facet Lambert shading, 2 to 3 tones per surface: tops lightest, the side toward the key mid, the far side darkest; warm hemisphere light, warm key, faint cool fill, distance fog toward warm brown; no specular, no smooth gradients except dithered bands _(agent)_
- **shape language**: boxes, 4-sided tapered frustums, cones and 6 to 8-sided cylinders; characters are stacks of blocks with triangular ears and box snouts; architecture of straight beams, posts, planks and tiles in strong one-point perspective _(agent)_
- **texture**: tiny pixel textures (16 to 32 texels, each about 9 to 15 screen px): per-texel brightness jitter of 5 to 9%, plank bands with dark gaps, tile seams, speckles, a fur texture of light jitter; checker dither visible on dark surfaces and in sky bands _(agent)_
- **type and UI**: small lowercase bold sans captions (about 50 px), bright yellow with a 3 px black outline and a short drop below, centred about two thirds down the frame (y about 1290), no box, no full stops; in-world signs use a 5x7 bitmap pixel font _(agent)_
- **motion style**: slow game camera: wide lens close to the subject, eased settle and push-in; small slow idle acting (breathing, ear perks, head turns, tail wag); drifting particles; one big foreground object passes the lens as a wipe; time passing shown by a change of season _(agent)_
- **signature traits**: chunky 3x pixels + ordered dither + flat warm facets in a cosy evening interior; a lone small character in a big place; the foreground wipe that jumps time; tiny yellow outlined captions telling a sad true story in two lines _(agent)_
- **do not copy**: the topic and every object of the story (the waiting animal, the station, the passing vehicle, the station sign and its names, the season change to flakes, the caption words and the duration); no watermark or handle is visible _(agent)_

## Colour recipe, whole video

Ground: dark key, lightness L 0.29, chroma C 0.05, 23% of the frame, tinted slightly warm (-19° from the base hue)
Harmony: monochromatic; hue families (offset from the base hue):
  - 0° (base, warm): lightness 0.29–0.89, peak chroma 0.09, 83% of the frame
  - +56° (accent, between): lightness 0.35–0.35, peak chroma 0.07, 4% of the frame
Ramp: 7 steps, lightness 0.29→0.89, hue turns +39° from shadow to highlight, chroma peaks at lightness 0.76
Contrast lightest vs ground 10.2:1; 10 main colours, 2 of them neutral

## Original colours (reference only)

#382113 23% #b1844e 20% #787031 15% #57351c 9% #674a30 8% #cda874 5% #33461b 4% #17130d 4% #5e4641 3% #ebd38e 2%
