# sourced-cutaway-explainer

## about
A calm, sourced documentary explainer of how a real thing is made, extracted or works: one continuous camera travels through a muted, semi-realistic CUT-AWAY of the real place (layers of ground, the inside of a plant, a machine opened up) while the narrator walks through the real steps in order. Beside the drawing, real evidence is pinned in: framed black-and-white photos of the real machines and sites (from Wikimedia Commons, credited on screen), clippings of the source's own sentences with the key words underlined, and small honest print under every picture ("Cut-away view, illustration", the source). The narrator's words appear one by one at the top, one key word in a blue selection box. Opens by correcting the picture most people have, ends by calling it back. For energy, industry, infrastructure, geology, engineering and "how does X really work / how is X made" briefs. Not for character stories, comedy, history narratives or lists of kinds.

## look
- The frame is three fixed bands, always:
  - Caption band, y 0 to 500: near-black, the host writes the narrator's words here (centred at y 360). Shots draw NOTHING in it.
  - Picture band, y 520 to 1460 (940 px tall, full width): the only place shots draw. Hard straight top and bottom edges, no border, no rounded corners.
  - Print band, y 1460 to 1920: near-black, holds only the source line (h.note, y 1512). Shots draw nothing else in it.
  - kit.bg paints all three bands every frame: the caption and print bands in the ground colour with a faint square grid (1 px lines every 48 px at 5 to 7% white, sliding up 4 px a second), then the picture band's scene for that background name, edge to edge (x 0 to 1080, y 520 to 1460).
- The ground is the KIT's job, never an asset's: kit.bg draws the cut-away layers full width, so every shot stands in the same place. Backgrounds (exactly these four names): "surface" (a dark dusk sky strip, the surface line at y 760 with a thin earth strip, the layers below it to y 1460), "section" (only the layers, filling the band: the camera is underground), "deep" (the lowest, hottest layers: the same streak texture, the bottom 30% warmed toward the amber accent at 15 to 25%), "close" (a dark soft radial gradient, lightness 0.18 at the centre to 0.12 at the edges, for close-ups of a machine, a material or a map).
- The picture band is a documentary illustration: muted, desaturated and semi-realistic, as if from a careful 3D render softened into flat paint. Soft gradients for light (top-left lighter, bottom-right darker), thin dark edges only where two surfaces meet, never thick cartoon outlines, never bright saturated fills, never cartoon faces.
- Cut-away cross-sections, the signature picture: the ground (or wall, or casing) is sliced open and seen from the side. Ground layers are horizontal bands 60 to 220 px thick, each a slightly different grey with a vertical gradient, filled with fine horizontal streaks (1 to 2 px lines, 8 to 15% lighter or darker, random lengths 40 to 400 px, drawn once with h.cache) so they read as rock strata; a slightly wavy boundary line between layers; the surface strip on top in a muted earth colour with a thin dark sky above it. Pipes, wells and shafts are thin vertical or curved double lines (outer wall light grey, a dark core) cut into the layers.
- Close-ups (a part, a material, a grain of rock) are the same thing drawn big with soft shading: rounded polygons in 3 or 4 greys with a soft light gradient, tiny pits and specks for texture, and a hair-line darker edge.
- Real evidence, drawn by the engine's helpers (never by hand): h.photo (framed photo, black and white: always {grey: 1}), h.quote (paper clipping), h.note (small print). See ## shots.
- Labels: the part's name in UPPERCASE, bold, 40 px, white, NO panel behind it (a soft dark text shadow: shadowColor rgba(0,0,0,0.85), shadowBlur 10, then reset it), with a 2 px leader line (white at 60%) from the label to the exact point it names, ending in a 6 px dot. At most 2 labels on screen, each at most 18 characters, placed where its measured width fits inside x 60 to 1020.
- Maps: always the engine's real map, never hand-drawn blobs: v = h.countryView([names], 540, 990, 960, 820) fits the named countries in the picture band; these return Path2D objects: ctx.fill(h.landPath(v), 'evenodd') for all land (lightness 0.24), ctx.fill(h.countryPath([names], v), 'evenodd') for the named countries (lightness 0.40), ctx.stroke(h.borderPath(v)) for thin borders at 25% white; each named country gets an amber dot at const [lo, la] = h.countryCentre(name), const [px, py] = h.geo(lo, la, v), with its UPPERCASE name beside it. For countries far apart (several continents), a flat world view: v = {proj: 'merc', x: 540, y: 1000, r: 170, lon0: 10, lat0: 15}.
- Numbers: one big number at a time, 96 to 120 px bold white, its unit after it at 40% of the size (for example a number then a small "KM"), centred over the picture or beside the thing it measures. Never a bar, gauge or scale unless it is filled exactly to the real value (a 0 to 20% bar showing 15% is filled three quarters); the big number alone is better.
- Colour is a set of relations (OKLCH), whatever the topic:
  - Ground (the bands, sky): near-black, lightness 0.13 to 0.16, chroma at most 0.01, hue about 280 (a hint of cool).
  - Picture: neutral to slightly cool greys, lightness 0.28 to 0.65, chroma at most 0.02; ground layers alternate between about 0.30 and 0.50; machines and pipes lighter (0.60 to 0.85).
  - Earth tint for soil, rock faces and dusk land: lightness 0.35 to 0.55, chroma 0.03 to 0.05, hue 50 to 80 (muted brown-grey).
  - ONE warm accent for what the story moves or what matters right now (heat, hot fluid, pressure, the flow): amber, lightness 0.75 to 0.80, chroma 0.08 to 0.10, hue 75 to 90. It is the only bright colour in the picture; it glows softly (the shape drawn again 1.1x larger at 25% opacity).
  - A cool second accent only when two things flow against each other (cold water in, hot water out): slate blue, lightness 0.55, chroma 0.08, hue 250 to 260.
  - Text: white (lightness 0.97); earlier caption words grey. The brightest things in the picture (labels, the big number, photo frames, the tips of growing pipes) are near-white, so the frame has strong contrast against the near-black ground (the reference measures 13 to 1).
  - palette.accent = the amber accent, palette.accent2 = the slate blue.
- kit.panel: a dark plate (lightness 0.20, 85% opaque), corners 6 px, a 1 px border at 15% white. kit.title: text only, bold, white, a soft dark shadow (blur 8). kit.font: "Segoe UI". kit.post: a very light vignette and fine film grain (2% noise, seeded per frame); no colour wash.
- Canvas helpers, exactly as the engine defines them: h.rng(seed) returns a FUNCTION (const r = h.rng(7); then r(), r() give 0 to 1); never use h.rng(seed) itself as a number. h.rr(x, y, w, hgt, r) and h.poly([[x, y], ...]) take NO ctx argument and only build a path: call ctx.fill() or ctx.stroke() after them. Slow static layers (strata streaks, rock texture, a map) are drawn once with h.cache(key, w, hgt, g => ...) and placed with ctx.drawImage.

## motion
- One continuous documentary camera: the reel feels like a single take. Each shot starts where the last one ended and moves the camera once: a slow pan down from the surface into the ground, a push in on a part (scale up 1.5 to 4x around the part over 1.5 to 2.5 s, easeInOut), a pull out to the whole, or a slide along a pipe. Do the camera with ctx.translate / ctx.scale inside the picture band (clip to it with ctx.rect(0, 520, 1080, 940); ctx.clip() inside a save / restore).
- Things build themselves as they are named: a pipe or well grows down (its end moves at a steady speed with a bright tip), a crack spreads in short jagged steps, a layer fades in, a label's leader line draws itself in 0.3 s and then its text appears.
- Flow is always visible: whatever moves (water, steam, heat, fluid, electricity) is dashes or small dots travelling along its path at a steady speed, in the amber accent (hot) or slate blue (cold), never a static arrow alone.
- Slow and calm: no bounces, no overshoot, no shakes, no flashes. Arrivals easeOut over 0.4 to 0.7 s, camera moves easeInOut over 1.5 to 2.5 s. Something always moves: flow dots, the camera's slow drift, steam rising.
- A visible change every 2 to 3 s inside each shot (the reference changes picture about 27 times a minute): the camera move, then a label, then the photo or quote, then the flow starting or the number landing, each on its own word. A shot never holds one still composition for more than 3 s.
- Evidence arrives on its word: a photo rises in on the cue word that names its thing; a quote drops in at the start of the line it backs; the underline draws while that line is said.

## story
- The reference's narration shape: plain second-person documentary voice ("You drill down to it"), short concrete sentences, the real names of real parts and places, no adjectives of wonder. Lines of 6 to 16 words; a long explaining line is followed by a short landing one.
- The question is always HOW it is made or done, and the answer is the real procedure: the steps of the MOST COMMON way it is done today, in their real order, from the reference. Never a rare, experimental or "enhanced" variant, never a list of types, kinds or technologies (naming three kinds in one line is a list, not a step).
- Hook: the picture most people have of the subject, corrected ("[The familiar thing] isn't [what most people picture]."), or a striking real fact about where it really comes from. The next line says what is really there, plainly. The question follows: "So how do you get [it] out of [where it really is]?" or "So how does [it] become [what we use]?"
- Procedure shots, 3 or 4, one PHYSICAL step each (something is drilled, rises, flashes, spins, turns, cools, goes back down): the first one's line starts with the word "First," and the others with "Then," or "Next,"; each names ONE real part by its real name and says what it does to the flow.
- The payoff is the number shot: how much of this the real world actually gets from it (the share of a named country's electricity or heating, a named site's output, how many homes, how many countries), with its real number from the reference. Never a constant of nature (the planet's total heat, a temperature gradient) as the payoff: those can be a step's fact.
- The last line calls back to the hook's picture with what we now know ("So that [familiar thing] isn't [what we pictured]. It's [what it really is].").
- Name the place: when the reference names a real site or region, the reel uses it ("Imagine driving through [real place]").

## plan
- Structure: 10 to 12 SHORT shots (the reference changes picture every 2 to 3 s; each shot is one line of 6 to 12 words, 3 to 5 s), in this order of beats:
  1. hook: the familiar picture, corrected. On screen: background "surface", the familiar thing drawn at the surface, and a real photo of it pinned beside it.
  2. truth: what is really there, and where: the camera pans down from the surface into the layers ("surface" sliding up into "section"), the place marked with a soft amber glow and its UPPERCASE label.
  3. question: "So how do you [get it / turn it into what we use]?" On screen: the whole cut-away, the shaft position marked by a dashed line, nothing built yet.
  4. place: "Imagine [standing / driving] at [the real named site or region from the reference]." On screen: that place's real photo, or the engine's real map with the site marked (see ## look Maps).
  5. to 8. step: one real step per shot (3 or 4 steps), in the real order; the FIRST step's line starts with "First,", the next ones with "Then," or "Next,". Each step BUILDS on the picture of the shot before (the shaft grows down; the flow starts; the machine appears at the surface; the flow returns) and the camera pushes in on the part doing the step; that part gets its UPPERCASE label; a real photo of that part or machine, or a quote of the reference sentence that states the step (alternate: never two photos in a row).
  9. number: the payoff, the real-world scale, with its real number and unit from the reference (the engine's real map of the named country or countries, see ## look Maps, with the big number above it, or the big number over the finished cut-away with the flow running end to end).
  10. turn (when the reference gives one): "But [a real limit or side effect]" (what runs out, what comes up with it, what it costs or where it cannot work), shown on the cut-away; skip it when the reference has none.
  11. callback: back at the surface, the hook's picture, now with the whole working cut-away under it, flow moving end to end. The line calls back to the hook.
- Evidence: 3 or 4 photos (the hook's familiar thing, then the real machines, structures or sites of the steps; Commons finds famous sites by their proper name alone, or common things by their 2-word common name) and 1 or 2 quotes of the reference's own sentences (in a step or the number shot). Never a photo and a quote in the same shot, never photos in two shots in a row.
- Every shot idea states: the camera move, what is drawn in the picture band, the label(s), the photo or quote (by id, where it sits, on which word), the flow, and the small print for h.note (honesty notes plus "Wikipedia: [article]" when the shot uses a reference fact).
- Every name, number, step and order comes from the REFERENCE. Numbers on screen are digits with their unit; in lines they are words.
- Music: feel Calming, Mysterious (the reference has NO music bed, only the voice and small sounds: keep the bed quiet and plain, a slow pulse, no drums or swells), 80 to 100 bpm; payoff_shot is the number shot (the scale lands there). Sound effects: a soft "pop" on the line where each photo, quote, label or big number appears (the reference has about one every 4 to 5 s), nothing else; never a whoosh, boom or thunder.
- Voice: one male narrator, American, quick and plain (the reference reads 3.3 to 4.4 words a second), matter-of-fact, never excited.

## assets
- 2 or 3 assets, the main drawn STRUCTURES, in the documentary illustration style (muted greys, soft gradient light from top-left, hair-line darker edges, no outlines, no faces, no text). Each is drawn on its own with nothing behind it: NO ground, rock layers, sky, box or backing rectangle inside an asset (kit.bg draws the ground under it).
  1. the shaft or well as built in the ground: a long vertical double-line pipe (outer walls light grey, a dark core, steel collars every 120 px) with its wellhead on top, about 160 px wide and 900 px tall at scale 1, a param "depth" (0 to 1: how much of it is built, growing down from the wellhead) and a param "flow" (0 to 1: hot fluid rising inside it as amber dashes moving up with p.t).
  2. the key machine the steps turn on, opened up in a 3/4 cut-away (its housing with the front cut away so the inner part shows: blades, rotor, coils), 700 to 900 px wide, with a param "spin" (0 to 1, its moving part turns with p.t when 1).
  3. optional: the familiar surface structure (the building, tower or plant people picture), a side view standing on a thin ground line, 700 to 1000 px wide, with steam or exhaust as a param.
- Descriptions give the real silhouette and proportions from the reference (how tall to how wide, where parts join, which parts sit above or below ground), the 3 or 4 greys used, and where the amber accent goes (only on the hot or moving part).
- Ground layers, pipes between assets, flows, cracks, labels, maps, numbers and dots are NOT assets: the kit draws the ground, the shots draw the rest.

## shots
- Draw only inside the picture band (x 0 to 1080, y 520 to 1460). Clip to it for camera moves. The host writes the caption at y 300 to 430: never draw there; every label, number and panel of yours sits between y 560 and 1400. Never paint a solid fill over the whole band (use kit.bg; add shapes on top).
- Layout inside the band:
  - Drawing: fills the band; its main subject 500 to 900 px tall or wide, centred or on the left two thirds when a photo sits on the right.
  - Photo inset: h.photo(id, x, 560, w, hgt, {k: lt - h.cue('word'), grey: 1}) with w 420 to 560 and hgt = w / aspect (at least 240, at most 380): top-right (x = 1020 - w) or top-left (x 60) of the band. Its credit line takes the 90 px under it: keep every label, line and drawing of yours out of the photo and that strip. Never covering the part being labelled; draw a 2 px leader line from the photo's edge to the drawn part it shows.
  - Quote: h.quote(id, 60, 540, 960, {k: lt - sh.lines[0].start}) across the top of the band, with the drawing continuing below it (from y 800); no photo in that shot.
  - Labels: left side (x 60 to 520) or beside their part, never over the photo or quote.
  - Small print: call h.note(['<1 or 2 honesty notes>'], 'Wikipedia: <article>') as the LAST thing every frame, where <article> is the title of the REFERENCE article the shot's fact comes from (listed in the request), never a description. Notes are true descriptions of the picture: 'Cut-away view, illustration', 'Not to scale', 'Depths illustrative', 'Time compressed', 'Flow shown in amber'.
- Continuity: kit.bg keeps the same layers, the shaft asset stands at the same x (about 420) and the surface line at y 760 whenever the surface is in view, from shot to shot, so the camera moves through one place. A step shot starts from the picture the shot before ended on and adds one thing.
- Every frame moves: flow dots, a slow camera drift (scale 1.00 to 1.04 over the shot), steam or heat shimmer rising, a pipe growing.
- Text: labels 40 px bold uppercase; one big number 96 to 120 px. Measure text with ctx.measureText and keep it inside x 60 to 1020.

## checks
photos: commons
captions: select
numbers: reference
beats: hook, truth, question, place, step, number, turn, callback
required beats: hook, step, number, callback
shots: 10-12
subject size: off
reference analysis: studio/refs/oil-type

## director
- Flag: anything drawn in the caption band (y 0 to 500) or the print band below y 1460 except the small print; a photo missing its frame or shown in colour; a photo that does not show what the line names; a photo or quote covering the labelled part; two photos in one shot; a label that names the wrong part; flow that does not move; cartoon outlines, saturated colours or faces; a shot whose camera jumps to an unrelated place instead of moving through the same cut-away; steps out of the real order; a number without its unit.
- Check every name, step, order and number against the reference; remove a number rather than keep a doubtful one.
