---
videomd: 1
part: look
tokens: 1587
---

## Camera, lighting and editing

- Visual style: Blocky voxel world with procedural 16x16 pixel textures, daylight, saturated greens, blue sky with slab clouds, white pixel-font titles with hard dark shadows.
- Framing: shot size full shot of the build in its landscape (wide) 100%; camera angle high angle at first (about 30 degrees down), ending slightly high (about 11 degrees down); subject is the in-focus region (no face; shot size is an estimate)
- Camera: moving camera (gimbal / handheld pan) 100%; typical move push-in
- Lighting: outdoor backlight (sun or bright sky behind the subject). Key light frontal (from the camera side; both sides of the subject about equally bright), at subject height; lighting ratio about 1.1:1 (0.1 stops); soft light (almost no lit / shadow edge); colour temperature warm (about 3000–4000K); background slightly soft
- (not live footage: the above describes the light in the picture, for generation prompts, not a shooting plan)
- Grade: vintage film (lifted blacks, warm); high saturation, normal contrast, lifted blacks (greyish shadows), overall warm
- Editing: 0.0 cuts per minute, 4.0s average shot; no live-action shots
- No pixel grid (not pixel art, or a grid too fine to measure)
- Colour: analogous, mid, 1 colour scenes

**Per-item measurements and image readings (28)**

| Aspect | Item | Verdict | Sources |
|---|---|---|---|
| Framing | shot size | full shot of the build in its landscape (wide) | measured; agent review |
| Framing | camera angle | high angle at first (about 30 degrees down), ending slightly high (about 11 degrees down) | agent review |
| Framing | composition | build centred a touch left and low (x about 500), sky and title in the top third, terraces filling the bottom third; vertical | agent review |
| Camera | camera support | virtual camera (code) | measured: moving camera (gimbal / handheld pan); agent review |
| Camera | lens | virtual 45 degree vertical field of view | agent review |
| Camera | speed | normal; one continuous eased orbit, crane down and push-in, with a short shake on the last block | agent review |
| Camera | set-ups / locations | one virtual camera, one continuous move (orbit + crane down + push-in) | agent review |
| Camera | likely gear | three.js WebGL in headless Chrome, rendered frame by frame | agent review |
| Lighting | location | outdoor, daytime, virtual grassy hill | agent review |
| Lighting | key light | one sun from the upper left and in front (warm white) | agent review |
| Lighting | soft / hard | soft light (almost no lit / shadow edge) | measured; agent review: soft-edged shadow maps |
| Lighting | fill | hemisphere sky fill, bright; shadow sides only a little darker | agent review |
| Lighting | rim / backlight | none | agent review |
| Lighting | practicals | the windows and doorway glow warm orange at the end | agent review |
| Lighting | colour temperature | warm (about 3000–4000K) | measured; agent review: neutral daylight, warm interior glow at the payoff |
| Lighting | lighting set-up | sun plus sky hemisphere light, distance fog | agent review |
| Lighting | overall lighting | daylight sun from the upper left with soft shadows and strong sky fill; the payoff turns on warm interior light | agent review |
| Grade | colour grade | vintage film (lifted blacks, warm) | measured; agent review: natural, saturated greens, lifted fog toward the horizon |
| Grade | overall grade | natural, bright, saturated grass greens, blue sky, fog toward the horizon | agent review |
| Visual style | rendering style | Blocky voxel world in the look of a block-building game: every object is built from unit cubes, each face carrying a 16x16 pixel texture drawn in code and magnified without smoothing; real-time lighting with a sun, sky fill, fog and soft shadows | agent review |
| Visual style | outlines | none: cube edges read by the value step between faces (top lightest, sides darker) | agent review |
| Visual style | shading | per-face flat lighting: top faces lightest, sun-facing side mid, the far side darkest, plus soft cast shadows; texture texels vary brightness by about +-10% inside each face | agent review |
| Visual style | shape language | strictly cubic and grid-aligned: terraces stepping by one block, trees as a log column with a cross-shaped cluster of leaf cubes, clouds as flat slabs on a coarse grid, smoke and dust as small tumbling cubes | agent review |
| Visual style | texture | procedural 16x16 texels: grass top speckled 6 greens, grass side dirt with a jagged green drip fringe 3 to 5 texels deep, cobblestone as irregular grey stones with dark mortar, planks as 4 horizontal boards with darker seams and staggered butt joints, logs as vertical bark stripes with ring end grain, leaves dark speckled greens with see-through holes, glass a pale frame with diagonal glints | agent review |
| Visual style | type and UI | one lowercase white pixel-font line at the top centre (92 px, letters dropping in with 6 px steps), then a one-word payoff line at 150 px slamming in with a scale overshoot; each with a hard dark-brown drop shadow offset 7 to 10 px down-right; no panels or boxes | agent review |
| Visual style | motion style | blocks fall about 2.4 block heights in 0.2 s, scale 0.5 to 1, a small spin, then squash and stretch on landing (exponentially damped); builds in layers in sweeping order; a slow eased camera orbit and crane; the last piece slams from higher with a camera shake and a dust puff; lights switch on in steps | agent review |
| Visual style | signature traits | The thing builds itself block by block, layer by layer, and the last block landing turns on the warm light and the payoff word | agent review |
| Visual style | do not copy | the topic and objects (a house or cottage with a chimney and smoke), the words "block by block" and "home."; Mojang textures, logos and characters; there is no watermark or handle | agent review |

- Note: lighting ratio, soft / hard, colour temperature and shot size are measured on the subject's pixels (the face when there is one, otherwise the in-focus region, which is an estimate); platform transcodes crush the shadows, so hardness and fill read conservative; camera angle, light source, catchlight and rim light follow the image readers. Where measurement and readers disagree, both are listed.
