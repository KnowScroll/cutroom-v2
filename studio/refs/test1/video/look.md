---
videomd: 1
part: look
tokens: 865
---

## Camera, lighting and editing

- Visual style: Low-res pixel art (about 180 px wide), near-black space ground with bright sprite colours, then a dusk desert in violet bands and warm browns; bitmap-font HUD panels
- Editing: 6.8 cuts per minute, 7.33s average shot; no live-action shots
- Pixel art: about 180 art pixels across the frame (each about 1/180 of the width; 6.0 px at 1080 wide); grid found in 99% of frames
- Colour: complementary with extra hues, dark, 5 colour scenes

**Per-item measurements and image readings (9)**

| Aspect | Item | Verdict | Sources |
|---|---|---|---|
| Visual style | rendering style | Pixel art at a low fixed resolution (about 180 x 320 art pixels, scaled up by an exact factor), drawn and animated in code; retro game look | measured: pixel art; agent review |
| Visual style | outlines | No dark outlines; shapes are separated by colour steps. UI panels have a 1-art-pixel border in a muted tint of the scene colour | agent review |
| Visual style | shading | Flat fills in 3-4 step colour ramps (shadow, base, light, highlight); light from the top-left on spheres and cloud puffs; hot things glow through a red-orange-amber-cream ramp; skies are flat horizontal bands with stepped edges; dark overlays use checkerboard dithering | agent review |
| Visual style | shape language | Round and chunky: balls and puff clusters built from pixel circles, low flat horizon lines, silhouettes readable at tiny size; subjects small inside a big field of repeated elements, or one big subject on a wide simple scene | agent review |
| Visual style | texture | Hard pixel edges everywhere, scattered single-pixel specks on the ground, star pixels in the sky, checkerboard dither for passing shadows; no noise, no blur, no smooth gradients | agent review |
| Visual style | type and UI | Uppercase monospace bitmap (pixel) font in near-white; caption panel at the top centre (dark navy fill, 1-pixel border tinted to the scene); a second counter panel under it with GENERATION n, a large number, a unit line and small corner ticks; numbers switch to scientific notation (6.0x10^23 with superscript) when large; short labels (U-235) right under objects | agent review |
| Visual style | motion style | Rule-driven simulation (particles split, fly, multiply on a lattice) with a counter ticking every 0.5 s; growth effects (fireball swells, cloud rises and billows); a full-frame white flash between scale levels; one push-in at the end and a match cut back to the first frame for a seamless loop; motion is smooth but positions snap to the pixel grid | agent review |
| Visual style | signature traits | Low-res pixel grid on everything; near-black space ground with one bright sprite colour; HUD panels with bitmap font and live counters; micro-to-macro story with a white flash bridge; ends on its own first frame (loop) | agent review |
| Visual style | do not copy | The @BITWONDER watermark under the counter, the exact topic (nuclear fission, uranium, Trinity test, mushroom cloud) and its numbers | agent review |

- Note: lighting ratio, soft / hard, colour temperature and shot size are measured on the subject's pixels (the face when there is one, otherwise the in-focus region, which is an estimate); platform transcodes crush the shadows, so hardness and fill read conservative; camera angle, light source, catchlight and rim light follow the image readers. Where measurement and readers disagree, both are listed.
