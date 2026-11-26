# lowpoly-cutaway-explainer

## about
A PS1-style low-poly 3D explainer hosted by a cartoon animal in a suit. The engine renders real 3D at 270 x 480 and blows it up 4x with hard pixels: flat-shaded models of a few hundred triangles, 64 px textures painted by code, vertices snapped to the pixel grid (a slight wobble), dithered colour. The host stands beside the real thing the reel explains, talks to you in short first-person sentences and strikes a new pose on every sentence. The thing is explained in numbered steps: on each step it is sliced open down the middle, the halves slide apart, and ONE part inside is labelled. It opens on a promise and a common wrong idea, walks the steps, lands on the one real number, and ends where it began. For how a machine, device, organ, natural feature or building works inside, part by part (engines, appliances, gadgets, the body, volcanoes, plants, buildings). Not for stories, history, comparisons of many things, maps or data.

## look
- The engine draws the whole picture (sets, host, subjects, lighting, pixels, dither) from the plan's specs; the shots only place things and draw the header and one label. Nothing is drawn in 2D canvas: the canvas guidance in the base directions (gradients, ctx shapes, contact shadows, ink outlines) does not apply to this reel.
- Low poly, flat shading: every model is built from boxes, cylinders and cones with 4 to 10 sides, lathes, prisms and pipes, a few hundred triangles each, every triangle one tone, lit from the upper left. No outlines anywhere: shapes are told apart by facet tone and texture.
- 64 px textures, painted by code: every surface carries a small pixel texture in its own colour (fine speckle on plastic and cloth, brushed metal, a grille on vents, dense fins on coils, planks on wood, bricks, tufted grass); the texels show as chunky pixels.
- Colour is a set of OKLCH relations by role; the plan picks hex values that keep them:
  - Outdoor set: grass lightness 0.67 to 0.73, chroma about 0.15, hue about 128; sky from a blue-violet top (lightness about 0.68, chroma 0.12, hue about 265) to a soft pink bottom (lightness about 0.80, chroma 0.08, hue about 350) with pixel clouds; wood lightness 0.53 to 0.63, chroma 0.09, hue 50 to 65; pine green lightness about 0.57, chroma 0.12, hue about 144.
  - Studio set (the subject alone, big): ONE hue at least 120 degrees round the wheel from the hook's set (a cool teal or blue studio after a warm room, a warm one after the green yard), chosen for the subject's story (the reference used dusk violet for heat, pink for an organ, warm beige for a machine), the backdrop light: lightness 0.68 to 0.82, chroma 0.07 to 0.12 ("wall" a little darker than "wall2"); the floor ("ground") the same hue about 0.08 darker, never below lightness 0.58 (it carries a tiled grid). The subject's casing stands out against it (at least 0.15 lightness apart or 90 degrees of hue away).
  - Room set (a thing that lives indoors): a warm light wall (lightness 0.72 to 0.84, hue 60 to 90, never grey or purple), planks floor in wood, a window with sky, a plant, a rug in a saturated red or teal.
  - The whole reel is colourful like the reference (about 250 colours on screen, 6 colour scenes): at least four hue families across its sets (grass green, sky blue-violet, warm wood, the studio hue), never one tint over everything.
  - The host: fur and muzzle in the real animal's colours; ONE saturated suit colour (lightness 0.60 to 0.70, chroma 0.14 to 0.18) and a tie in a second hue about 40 to 140 degrees away; dark trousers (lightness about 0.35, cool); mitten hands and shoes near-black.
  - The cut: the dark cut face of a slice is deep violet (lightness about 0.17, chroma 0.04, hue about 327) with bright orange triangle edges (lightness about 0.70, chroma 0.16, hue about 50): palette "cut" and "edge".
  - Text: white (lightness 0.98) with a near-black outline (lightness about 0.15, slightly violet, palette "ink"); the header numeral and the label in a warm yellow (lightness about 0.87, chroma 0.16, hue about 90, palette "accent").
  - Inside parts: each its own clear hue (cold things blue to cyan, hot things orange to red, moving parts grey metal, fluids their real colour), never the casing's colour.
- The host is a cartoon animal in a suit that fits the brief (for example a penguin or a polar bear for something cold, a fox or a dog for a machine, an owl for a body part): never a raccoon, and never a yellow suit with a red striped tie. Big eyes with a coloured iris; a mask patch only if the real animal has one.
- Type: "Arial Rounded MT Bold", heavy, white with a thick dark outline. The step header top left: "k/N" in the yellow accent, then the step's name in white, 64 px, one or two lines.

## motion
- A new pose on every sentence: the host snaps (0.16 s) into a different pose at the start of each sentence of the narration and holds it, while the engine breathes it, blinks it and moves its mouth with the voice. The pose acts the sentence: point or present at the part being explained, shrug at a wrong idea, count for a number, shiver or fan for cold or heat, think at a question, arms_up at the payoff, wave to open and close.
- The slice: on the word that names what is inside, the casing splits down the middle and the two halves slide apart over 0.6 s (easeOut) and stay open; the inside parts stay in place. The label pops 0.3 s later on the word that names the part and holds to the end of the shot.
- The part at work glows (glow on that inside part) while the line says what it does: heat, cold, current, flow.
- Cut like the reference (about 25 cuts a minute): a NEW camera setup on every sentence, together with the new pose (wide, then part or subject, then face; never the same setup twice in a row). Within a setup the camera never stands still: a slow orbit of 6 to 12 degrees (angle animated with lt) and a gentle push-in.
- Between steps the subject stays where it was (same set, same place); the slice closes again at the start of the next step shot and reopens on its word, so every step has its own reveal.

## story
- The host IS the narrator: it talks to "you" in the first person ("watch me open it", "see this coil?"). Playful, quick, concrete; one idea per sentence.
- Short sentences: 3 to 11 words, two or three per shot. Every sentence ends with a period, question mark or exclamation mark (each sentence gets its own pose).
- Shape of the reel (the reference's): a promise with a count ("[The subject], in [N] parts."), then the common wrong idea knocked down in one blunt sentence, then numbered steps, each opening with its number word and the part's name ("Two: the [part]."), then what that part does in one sentence with one concrete fact, then the payoff with the one real number, then a callback to the opening.
- Numbers are said as words; at most one number per step; the payoff number is made felt next to something the viewer knows.

## plan
- Structure: 6 to 9 shots, one beat each, in this order:
  1. hook: the subject whole and closed in the place it really lives, the host in front of it waving. Lines: the promise with the count of steps ("[subject], in [N] parts.", N = the number of step shots exactly) or a question the steps answer. Header: the subject's name, no number.
  2. myth: the common wrong idea, knocked down (the host shrugs, then facepalms or crosses its arms). Lines: "[the wrong idea]? Nope." then the true one in a few words, without its number. Same set as the hook, camera "host" or "face". Header: "It doesn't [wrong idea]" (2 to 5 words), no number.
  3. step (3 to 5 of them, one shot each, in the real order the thing works): the subject in its studio set (or where it lives), the slice opening on the part's word, the ONE label on that inside part, the part glowing while it works, the host beside it pointing. Lines: the FIRST words of the shot are its number word and the part's name ("Two: the [part]."), never a link word before them; then what it does, with one concrete fact (a link word such as "so" or "which means" goes in this second sentence). Header: "k/N [the part's name]", where k counts the steps only (1 for the first step shot, N = the number of step shots).
  4. payoff: the subject open, every inside part glowing one after another in the real order, the host arms_up; the label on the part the answer turns on. Lines: the whole process in one sentence, then the one real number made felt (a real figure from the reference: how much heat, how many degrees, how long, how much energy, next to something the viewer knows). Header: the answer in 2 to 5 words, no number.
  5. loop: back to the hook's place and framing, the subject closed, the host waving; one short line that calls back to the hook.
- The steps are the real parts in the real order: each step's part is a PHYSICAL part you could point at inside the thing (a noun: the antenna, the tuning coil, the compressor, the valve), never a process or function (filtering, demodulation, compression, cooling); the step's line says what that part does. Each is one of the subject's "parts", named exactly as in the reference, and the label text is that name (1 to 3 words) as the line says it. Every word on screen (header and label) is a word that shot's line says (the engine checks it): one step shot per part, and the shot's line names its part.
- Sets: 2 or 3: the outdoor yard (green grass, blue-violet to pink sky, fence, pines, house, bushes, hills) for the hook, myth and loop, or a room if the thing only lives indoors; and a studio for the steps (the subject alone, big). A thing that is two units in two places (inside and outside) may use both places instead of the studio.
- Assets: the host FIRST (look3d), then the subject, and a second subject only if the real thing is two separate units. The subject is TALL so it fills a vertical frame: 1.4 to 2.2 m high (taller than the 1.3 m host), its width at most 1.3 times its height. A thing that is really wide and flat is shown in its upright version or form (the tall unit, the standing model, the cabinet), or scaled so its height reaches 1.4 m. Each subject's "parts" are the inside parts the steps label, in step order.
- Each shot idea gives: the set; the subject's place (x, z, y if it hangs) and the host's place beside it; the camera per sentence; the host's pose AND expression for every sentence (all different within the shot); the slice word and the label part and text; the glowing part; the header text.
- Lines: one narrator, a young, energetic man (liam on ElevenLabs, lucian on HeyGen, English_expressive_narrator on MiniMax), quick, about 2.6 words a second. Each line's tone: playful, surprised, deadpan or proud, varied.
- Music: feel Bouncy Bright Humorous, 80-95 bpm (the reference bed runs at 172 bpm, felt as 86 in half time); payoff_shot is the payoff shot. Sound effects: a pop when each step header and each label appears, a whoosh when a slice opens. Nothing else.

## assets
- The host has no drawing step: the engine builds it from look3d (an animal of about 300 triangles in a suit). Choose ears, snout, tail, stripe, fur, fur2, mask and eye for the real animal; jacket, shirt, tie, tie2, trousers, shoes, hands for the suit.
- Each subject is built from low-poly parts by the modeller: a real outer casing with its true silhouette and proportions (the shape you recognise from outside), and the inside parts at their real places, each its own clear colour, big enough to fill most of the inside. The description gives the casing in simple shapes with proportions, its texture, then each inside part's shape, colour and place (left or right, top or bottom, front or back, as fractions of the size).
- The inside is the explanation: every part the steps name is inside the casing and named exactly; pipes and wires that join them run between them where they really run.

## shots
- Layouts (1080 x 1920; the picture band is y 380 to 1460, the header above it, the captions below):
  - Header: kit.header(ctx, k, N, text) in every step shot (k = the step's number among the steps, N = the number of steps); the hook, myth, payoff and loop use kit.header(ctx, null, 0, text) (no number).
  - Words on screen: ONLY kit.header and h.d3.label. Never kit.panel, kit.title plaques, ctx.fillText or ctx.strokeText: the base directions' label recipe (a panel sized to its text) does not apply to this reel; the engine draws the label with its leader line.
  - Wide (the default): the presenter layout: the subject behind and to the right (x 0.3, z -0.6; or hung on the room's wall at y 1.4 to 2.0, z -2.8), the host IN FRONT of its left corner (x -0.75, z 0.5), face 15, so the two overlap in depth like a presenter beside a big exhibit; camera "wide" fill 0.95. The subject fills 55 to 80% of the frame width; the host stands lower left, 30 to 45% of the frame height (the reference's example frames).
  - Host: camera "host" (fill 0.8) or "face" for the myth and reactions: the host full length, centred.
  - Inside: after the slice opens, camera "part" on the labelled part (fill 0.7) or "subject" (fill 0.9), so the open halves, the part and its label fill the band.
- A step shot is one setup per sentence: wide while the step is named, then "part" (fill 0.75) on the labelled part once the slice is open, then "subject" or "face" if there is a third sentence.
- The label: exactly one per step and payoff shot, on an inside part that is visible (the slice open), its text the part's name as the line says it; never a label in the hook, myth or loop.
- Always place the host (it may be small or partly off frame in a "part" camera); never inside the subject. The host faces the camera (face 0 to 30 degrees toward the subject): never its back or a flat side view; its point and present poses reach toward the subject by themselves.
- Use only the h.d3 options of this reel (the engine rejects others): thing {x, z, y, rot, scale, slice, glow, params, id}; actor {x, z, y, face, at, pose, expr, turn, nod, tilt}.

## checks
renderer: lowpoly
captions: words
beats: hook, myth, step, payoff, loop
required beats: hook, step, payoff
shots: 6-9
slice beats: step, payoff
closed beats: hook, myth, loop
labels: from narration
reference analysis: studio/refs/ps1-cutaway

## director
- Flag: a host pose that does not change from one sentence to the next; the host inside or overlapping the subject; a subject that does not look like the real thing from outside (wrong silhouette or proportions); inside parts in the wrong place, missing, or in the casing's colour; a step whose label names a different part than its line, or more than one label on screen; a label while the subject is closed; a step shot without its "k/N" header; the slice never opening in a step; text outside x 60 to 1020 or below y 1460; a raccoon host or a yellow suit with a red striped tie.
- Check every part name, what it does, its order and the number against the reference and standard knowledge; a part the reference does not have must not be shown.
