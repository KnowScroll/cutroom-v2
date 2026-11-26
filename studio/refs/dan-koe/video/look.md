---
videomd: 1
part: look
tokens: 701
---

## Camera, lighting and editing

- Visual style: Pure black ground, hairline white strokes, solid white dots, one lowercase sans line; no colour
- Editing: 0.0 cuts per minute, 4.0s average shot; no live-action shots
- No pixel grid (not pixel art, or a grid too fine to measure)
- Colour: neutral, dark, 1 colour scenes

**Per-item measurements and image readings (9)**

| Aspect | Item | Verdict | Sources |
|---|---|---|---|
| Visual style | rendering style | Minimal black-and-white hairline line art drawn by code on a 2D canvas: pure black ground, thin white strokes, solid white dots, nothing filled except the dots | agent review |
| Visual style | outlines | Strokes only, no outlines around shapes: everything is a line (1 to 3 px, thinner level by level) or a solid dot | agent review |
| Visual style | shading | None: no gradients, no glow, no shadows; depth only by line weight and opacity (finished lines dim to about 50% while the dots stay at full white) | agent review |
| Visual style | shape language | Straight segments and circles; a binary branching tree (two children per tip, length ratio about 0.75, split angle about 0.27 to 0.44 rad); one thin ring; tiny round specks | agent review |
| Visual style | texture | None; the only grain is a scatter of small drifting dots (radius 3 to 5 px) that fade to grey | agent review |
| Visual style | type and UI | One lowercase line, centred, near-white, regular weight geometric sans (Poppins 400), 44 px on 1080 wide, centre at y about 262, ending with a full stop; it swaps to a second line in one frame at the payoff; no boxes, no stroke, no shadow | agent review |
| Visual style | motion style | Calm and procedural: a dot appears, a line draws out of it with easeOut-cubic (0.27 s per segment), one new level every 0.25 s, so growth reads as a steady doubling; at completion a small bounce of the tip dots, a one-shot expanding ring, a slow damped sway; camera locked | agent review |
| Visual style | signature traits | One white dot on pure black turning into many: hairlines that split in two at every step with a dot riding each tip, and one quiet lowercase line that changes when the drawing completes | agent review |
| Visual style | do not copy | The two lines of text (its words), the tree as the only motif, the exact seed shape; named after a creator style, no handle or watermark in the frame | agent review |

- Note: lighting ratio, soft / hard, colour temperature and shot size are measured on the subject's pixels (the face when there is one, otherwise the in-focus region, which is an estimate); platform transcodes crush the shadows, so hardness and fill read conservative; camera angle, light source, catchlight and rim light follow the image readers. Where measurement and readers disagree, both are listed.
