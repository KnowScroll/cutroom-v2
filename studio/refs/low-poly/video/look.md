---
videomd: 1
part: look
tokens: 1696
---

## Camera, lighting and editing

- Visual style: PS1-era low-poly 3D, 3x chunky pixels, ordered dither, flat warm facets, pixel textures, warm evening light
- Framing: shot size medium close shot 46%, extreme close foreground (wipe) 28%, medium shot 25%; camera angle slightly high, moving lower and closer; subject is the in-focus region (no face; shot size is an estimate)
- Camera: moving camera (gimbal / handheld pan) 100%; typical move push-in
- Lighting: three-quarter key + fill (standard set-up). Key light frame right, three-quarter front, from above (ceiling light / street lamp / high source); lighting ratio about 1.5:1 (0.6 stops); soft light (wide lit-to-shadow ramp); colour temperature warm (about 3000–4000K); background slightly soft
- (not live footage: the above describes the light in the picture, for generation prompts, not a shooting plan)
- Grade: vivid, high saturation; high saturation, normal contrast, normal blacks, overall warm
- Editing: 25.0 cuts per minute, 1.6s average shot; no live-action shots
- Pixel art: about 36 art pixels across the frame (each about 1/36 of the width; 30.1 px at 1080 wide); grid found in 53% of frames
- Colour: monochromatic, dark, 1 colour scenes

**Per-item measurements and image readings (29)**

| Aspect | Item | Verdict | Sources |
|---|---|---|---|
| Framing | shot size | medium close shot | measured; agent review |
| Framing | camera angle | slightly high, moving lower and closer | agent review |
| Framing | composition | subject centred, grows to about 40% of the frame height; sign above | agent review |
| Camera | camera support | virtual camera (3D render, not a shooting plan) | measured: moving camera (gimbal / handheld pan); agent review |
| Camera | lens | wide lens (about 52 degrees vertical) close to the subject | agent review |
| Camera | speed | slow eased push-in | agent review |
| Camera | set-ups / locations | one virtual camera in one continuous take: a slow eased settle, then a slow push-in after the wipe | agent review |
| Camera | likely gear | real-time WebGL (three.js) scene rendered at 360x640, upscaled 3x nearest-neighbour in a headless browser | agent review |
| Lighting | location | indoor-style covered platform, evening (3D render, not a shooting plan) | agent review |
| Lighting | key light | warm orange directional key from the upper right front | agent review |
| Lighting | soft / hard | soft light (wide lit-to-shadow ramp) | measured; agent review: soft, flat per-facet Lambert shading, no cast shadows except a flat 8-sided contact shadow |
| Lighting | fill | weak cool blue fill from the left; warm hemisphere light (cream from above, brown from below) | agent review |
| Lighting | rim / backlight | none | agent review |
| Lighting | catchlight | not applicable (pixel eyes) | agent review |
| Lighting | practicals | hanging lamps with green conical shades and glowing bulbs; a warm sunset through back windows | agent review |
| Lighting | colour temperature | warm (about 3000–4000K) | measured; agent review: warm |
| Lighting | lighting set-up | warm hemisphere + warm key upper right + faint cool fill left + one warm point lamp above the subject; warm brown distance fog | agent review |
| Lighting | overall lighting | warm hemisphere light (cream above, brown below), warm orange key from the upper right front, faint cool fill from the left, warm point lamps under the canopy, warm brown distance fog | agent review |
| Grade | colour grade | vivid, high saturation | measured; agent review: warm, slightly desaturated retro game look; 15-bit colour with ordered 4x4 dither visible as a fine checker on dark and gradient surfaces |
| Grade | overall grade | warm retro game look, 15-bit colour (32 levels per channel) with a 4x4 ordered dither in every material | agent review |
| Visual style | rendering style | PS1-era real-time low-poly 3D: rendered at 360x640 and shown 3x with nearest-neighbour upscaling (chunky 3 px pixels), vertices snapped to the low-res grid (slightly wobbly edges), 15-bit colour with a 4x4 Bayer ordered dither in every material, flat-shaded facets, small nearest-filtered pixel textures | measured: pixel art; agent review |
| Visual style | outlines | none; shapes are separated by facet tones and by dark seams painted into the textures (plank gaps, tile joints, frames) | agent review |
| Visual style | shading | flat per-facet Lambert shading, 2 to 3 tones per surface: tops lightest, the side toward the key mid, the far side darkest; warm hemisphere light, warm key, faint cool fill, distance fog toward warm brown; no specular, no smooth gradients except dithered bands | agent review |
| Visual style | shape language | boxes, 4-sided tapered frustums, cones and 6 to 8-sided cylinders; characters are stacks of blocks with triangular ears and box snouts; architecture of straight beams, posts, planks and tiles in strong one-point perspective | agent review |
| Visual style | texture | tiny pixel textures (16 to 32 texels, each about 9 to 15 screen px): per-texel brightness jitter of 5 to 9%, plank bands with dark gaps, tile seams, speckles, a fur texture of light jitter; checker dither visible on dark surfaces and in sky bands | agent review |
| Visual style | type and UI | small lowercase bold sans captions (about 50 px), bright yellow with a 3 px black outline and a short drop below, centred about two thirds down the frame (y about 1290), no box, no full stops; in-world signs use a 5x7 bitmap pixel font | agent review |
| Visual style | motion style | slow game camera: wide lens close to the subject, eased settle and push-in; small slow idle acting (breathing, ear perks, head turns, tail wag); drifting particles; one big foreground object passes the lens as a wipe; time passing shown by a change of season | agent review |
| Visual style | signature traits | chunky 3x pixels + ordered dither + flat warm facets in a cosy evening interior; a lone small character in a big place; the foreground wipe that jumps time; tiny yellow outlined captions telling a sad true story in two lines | agent review |
| Visual style | do not copy | the topic and every object of the story (the waiting animal, the station, the passing vehicle, the station sign and its names, the season change to flakes, the caption words and the duration); no watermark or handle is visible | agent review |

- Note: lighting ratio, soft / hard, colour temperature and shot size are measured on the subject's pixels (the face when there is one, otherwise the in-focus region, which is an estimate); platform transcodes crush the shadows, so hardness and fill read conservative; camera angle, light source, catchlight and rim light follow the image readers. Where measurement and readers disagree, both are listed.
