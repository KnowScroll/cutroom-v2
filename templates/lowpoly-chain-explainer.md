# lowpoly-chain-explainer

## about
A calm, clean, game-like low-poly 3D explainer that builds one idea out of the previous one in a chain of sentences shaped "If you [do this differently], you get [a new named thing]". One dark world (a grid floor under a ring of faceted mountains) where each named thing gets the stage to itself: one flat-shaded grey model, its path, its name and a card of its real numbers. A header at the top collects one letter per named thing. Near the end everything is compared in a row of boxes, then it rewinds to its own first frame. For families of kinds that differ by one change each (types, generations, variants), methods built step by step, and how a system's parts stack up. Not for character stories, history narratives, recipes or anatomy tours.

## look
- Clean and uncluttered above all: at any moment the screen holds the header, ONE model with its path and name, and ONE card of numbers (or, in the comparison, the boxes). Nothing else: no extra rings, brackets, insets, floating diagrams, scattered dots or labels.
- Low-poly real-time 3D, faked in 2D canvas: every model is built from flat polygons in 2 or 3 tones of one neutral, with no outlines; the facets facing up and toward the top-left are the lightest, the undersides and the right side the darkest. No gradients on models, no textures, no noise, no blur.
- Canvas helpers, exactly as the engine defines them: h.rng(seed) returns a FUNCTION (const r = h.rng(7); then r(), r(), r() give numbers from 0 to 1); never use h.rng(seed) itself as a number. h.rr(x, y, w, hgt, r) and h.poly([[x, y], ...]) take NO ctx argument and only build a path: call ctx.fill() or ctx.stroke() after them.
- Colour is a set of relations (OKLCH); keep them, whatever the topic:
  - World: ground near-black (lightness 0.15 to 0.17, chroma 0.01, a slight violet tint, hue about 290) covering most of the frame. Mountains pale grey with the same tint (lightness 0.47 to 0.80, chroma about 0.03), 2 or 3 facet tones.
  - Models: neutral light grey (lightness 0.68 to 0.85, chroma at most 0.02). Models are never coloured: colour belongs to paths, cards and text only.
  - Three accent hues about a third of the wheel apart, bright on the dark ground: the DATA hue (lightness about 0.86, chroma about 0.10) for numbers on the cards, path nodes and the fog tint; the PRIMARY hue (about 145 degrees round from the data hue, lightness about 0.68, chroma about 0.17) for the model's flight path and for anything that fails; the SECONDARY hue (about 115 degrees round the other way from the data hue, lightness about 0.70, chroma about 0.15) for the name tag text and the header letters.
  - Text: warm off-white (lightness about 0.93, chroma about 0.02); card labels the same at 65% opacity.
  - palette.accent is the SECONDARY hue (the engine colours the caption bar with it); palette.accent2 is the DATA hue.
- Backgrounds (kit.bg), one world seen from two heights:
  - "field": high camera. Horizon at y 760 to 800 (the upper part of the frame is sky, where the header and card sit). On the horizon a jagged ring of faceted mountains, clearly visible as peaks: 10 to 14 peaks across the width in two overlapping rows (back row smaller and paler). Each peak is one triangle with its apex at (x, horizon - height), height 70 to 140 px, base from x - 0.8 * height to x + 0.9 * height on the horizon, split by a line from the apex to a point on its base into a light left face (lightness about 0.75) and a darker right face (about 0.50); whole triangles, never slivers. Their bases melt into a fog band 100 to 140 px tall in the data hue mixed 70% toward the mountain grey, fading out upward and downward. Below the horizon, all the way to the bottom edge, the floor: a perspective grid clearly visible: 12 to 16 lines converging to a vanishing point on the horizon, and cross lines at y = horizon + 50 * Math.pow(k + s, 1.6) for k = 0, 1, 2 ... while y < 1920, where s = (lt * 0.25) % 1 makes them slide toward the viewer; lines 2 px at lightness about 0.50 and 25 to 35% opacity. The sky above the mountains is calm: a dark gradient getting slightly lighter toward the horizon.
  - "low": the same world from just above the floor: horizon at y 900 to 960, mountains up to 180 px tall, grid lines wider apart.
  - Apart from the mountain ring, nothing stands in the world: no platforms, slabs, terrain, buildings or extra peaks.
  - The sweep (kit.bg, both): every 4 s a wide wedge of the data hue at 8 to 12% opacity rotates across the frame in about 1 s. Subtle: it never competes with the model or the card.
- kit.panel: a dark plate (ground colour lightened to lightness 0.22, 88% opaque), corners rounded 14 px, a 2 px border at 20% of the text colour. Used for the header, the card, the name tag and the comparison boxes.
- kit.title draws text only (no box). Type: kit.font "Selawik", bold. kit.post: a very light vignette only.

## motion
- One thing at a time. Each shot starts with the previous shot's model flying out to the right (0.4 s, easeIn), then the new model glides in from the left (0.7 s, easeOut) to the centre, where it keeps cruising: a gentle bank and bob (2 to 4 degrees, 2.5 s period) and a soft dark ellipse shadow on the floor under it.
- Its flight path draws itself behind it in the primary hue as the line says how it flies (0.8 to 1.2 s): one smooth curve with 4 to 6 small nodes in the data hue (8 px), true to the real path (a high arc, a low level line, a flat fast glide with a dip, a zigzag).
- On the word that names it, its name tag appears under it (pop, 0.2 s) and its header letter pops in. Then the card's rows appear one by one, 0.4 s apart, and stay to the end of the shot.
- The header keeps every letter named so far: letters named in earlier shots are fully shown from the shot's first frame (no k, no entrance); only the new letter pops in (scale 0.6 to 1 with easeBack over 0.25 s). The plate is drawn only once it holds at least one letter, already at the width of the full final header.
- The comparison: its boxes slide in from the left one after another, 0.4 s apart, and hold still and readable for the rest of the shot.
- The rewind (last shot): a double-left-arrow icon beside the header; in 1.5 s the boxes slide out in reverse order except the first, which grows back into the hook's layout (first model alone, its card, its tag), and the header goes back to its first letter.
- Easing: easeOut for things arriving, easeIn for leaving, easeInOut for cruising.

## plan
- Structure: for N named things, N + 3 shots in exactly this order: hook, link (one per further thing), twist, payoff, loop. Nothing after the payoff except the loop. One line per shot; every line is one link of the chain:
  1. hook: the first named thing alone, big and clear, with its card. Line: "If you [what defines the first thing], you get a [FIRST NAMED THING]."
  2. link: "If you [do ONE thing differently from what we just got], you get a [NEXT NAMED THING]." The next thing alone, its card.
  3. link: the same pattern, the next named thing alone, its card.
  4. link: the same pattern again (for a family of three kinds: the other real sub-kind of the last kind, by its real name; if there is none, leave this beat out and use 6 shots).
  5. twist: "But if you [push it further], you get [the real problem, named]." The last thing alone with the problem shown on it in the primary hue, and a card of the problem's real numbers.
  6. payoff, the comparison: "If you [put them side by side], you get [the one real takeaway]." The takeaway is concrete and true (which one is fastest, longest-ranged or hardest to stop, and why), never vague like "a clear distinction". One box per thing named in the hook and link shots, and only those (the twist's problem gets no box), with the same 3 rows as their cards.
  7. loop: "If you [turn it all back / play it backwards], you get a [first named thing again] and" while everything rewinds to the hook's layout; the line ends on "and" so the reel replays into line 1.
- The grammar is strict: the named thing ALWAYS comes after "you get", as the last words of the line, and it is a real name (a kind, a part, a step, a known effect). The "If you" part only describes an action or a change, never the name itself. Wrong: "If you use a [named thing], you get [a description of what it does]." Right: "If you [describe what defines it], you get a [named thing]."
- For a family of kinds, each "If you" names the ONE real change that turns the previous kind into the next (how it is powered, where it moves, how fast, how it is guided). Every kind in the brief gets its own shot. For a method or system, each "you get" is the real name of the next step or part, in the real order.
- The card is the information: every named thing gets exactly 3 rows of real NUMBERS, the SAME 3 quantities with the SAME labels in the SAME order for every thing so they can be compared (the ones that differ most between them: speed, range, size, weight, power, altitude, payload, accuracy, cost, year in service...). Each row is a short label (at most 12 characters, UPPERCASE) and a value that starts with digits and has its unit (at most 14 characters, for example a value like 2,500 KM written the way people read it). A word as a value ("FAST", a type name, "POWERED", "YES") is wrong: pick a quantity that has a number. Write every card's 3 rows in the shot's idea. Typical real values for the kind, from the REFERENCE; if a value is not known, choose another quantity that is, never invent one. The twist's card gives the real numbers of the problem.
- The header: single capital letters separated by small dots, one per named thing of the hook and link shots only (the real acronym of the final result if it has one, otherwise the initials), 3 to 5 letters; the twist adds no letter. The hook shot draws the header (plate and first letter together) only from the word that names its thing. Write the full header in the payoff's idea; every other idea states which letters are showing.
- Every name, number and step must be real and come from the REFERENCE. Numbers in spoken lines are written as words; numbers on cards are digits.
- Lines: one narrator, am_michael. 15 to 17 words each. Say the brief's subject by its exact term in line 1 or 2. Never repeat a named thing except in the loop line.
- Assets are MODELS only, 2 or 3, each a low-poly flat-shaded object seen from the side and slightly above, nose to the right, with a param "bank" (-1 to 1, a small roll). For a family of kinds: one asset per kind, in the order they are named. For a method or system: the main object first, then a distinct second object. Never a terrain, landscape, platform, launch pad, building or scenery asset. Paths, nodes, tags, cards, boxes, the header and the rewind icon are drawn by the shots.
- Asset descriptions give the silhouette as polygons: body length to height, where the wings or fins join along the body (as a fraction from the nose), the nose shape, which facets are light, mid and dark. The real proportions of the real object.
- Each shot "idea" gives: the model on stage, its path shape, its tag text, the header letters showing, and the card's 3 rows (label and value); for the payoff, every box's name and 3 rows.
- Music: feel Bright Driving Uplifting, 110-130 bpm (the reference bed is 123 bpm under the whole reel); payoff_shot is the payoff (comparison) shot. Sound effects: a soft pop when each tag appears and on each card row, a whoosh on the rewind. Nothing else.

## assets
- Models are low-poly: 8 to 20 flat polygons each, every vertex a hard corner. 3 tones of neutral grey per model (light top facets, mid sides, dark underside), no dark outlines, no gradients.
- Seen from the side and slightly above, nose to the right, so the whole silhouette reads; p.bank rolls it slightly by shifting the tones and squashing the far wing.
- Fill the box: the model's length is 85 to 95% of the box width. No floor shadow inside the asset (the shots draw it).
- Outlines are made of long straight edges: a clear body, a sharp or clearly shaped nose, and wings, fins or parts as thin flat polygons sticking out of it. Never a lumpy, rock-like, box-like or boulder shape; the body is no taller than a third of its length unless the real thing is stubby.
- Every model has the true silhouette of its real thing (proportions, wing or fin layout, nose shape, engine), clearly different from the other models at 300 px wide.
- No text, no colour, no markings inside assets.

## shots
- Fixed layout, the same in every single-thing shot, so the eye always knows where to look:
  - Header: centred at the top, letters 64 px bold. Its plate is kit.panel(ctx, 540 - w / 2, 200, w, 104) with w = the measured width of the FULL final header text plus 56; each letter drawn with kit.title at y 252 at the x it has in the full text, so letters never move.
  - Card: kit.panel(ctx, 90, 340, 900, 360), drawn in the same frames as its first row (never empty). Three rows at y 400, 520 and 640 (centres), each: the label left-aligned at x 130 (40 px, off-white at 65%) and the value right-aligned at x 950 (64 px bold, data hue). A 2 px divider at 15% between rows. Nothing else in the card.
  - Model: the one model on stage, 560 to 720 px long, centred x 540, y 1020 to 1120, fully inside x 60 to 1020, with its floor shadow and its path behind it. Never two models in the same shot (except the comparison and the moment one leaves as the next arrives, without overlapping).
  - Name tag: 1 to 3 words (at most 18 characters), 44 px, on a kit.panel as wide as the measured text plus 48 and 72 px tall, centred at x 540, top at y 1250, text at the plate's exact centre (540, y + 36).
  - Nothing below y 1400 (the caption lives there).
- The comparison: the header, then one box per named thing stacked down the frame from y 330 to 1400 with 24 px gaps (3 boxes: each about 340 px tall; 4 boxes: about 250 px tall), each kit.panel(ctx, 70, top, 940, height). Inside every box at the same positions: the name (40 px bold, secondary hue) top-left at x 100; the model on the left half (centred x 290, 300 to 360 px long); the same 3 rows on the right half, each label (36 px, off-white at 65%) at x 560 and value (44 px bold, data hue) right-aligned at x 980, rows evenly spaced inside the box. Boxes never overlap, every number stays inside its box.
- Text sizes and lengths: measure every text with ctx.measureText before drawing and shrink the font (never under 36 px) until it fits its plate with 24 px to spare on each side.
- Every frame moves: the grid slides, the model cruises and banks, path nodes pulse (scale plus or minus 8%, 1.2 s period). Calm, never busy.
- Draw order: kit.bg, the model's floor shadow, its path, the model, the tag, the card, the header. Never paint a solid fill over the background.
- The last shot's final second matches the hook's layout (first model, its card, its tag, the header showing only the first letter).

## checks
beats: hook, link, twist, payoff, loop
required beats: hook, link, payoff, loop
reference analysis: studio/refs/ref2

## director
- Flag: a card row whose value is a word instead of a number; a comparison box for anything that is not one of the named kinds; shots after the payoff other than the loop; clutter (anything on screen beyond the header, one model with its path and tag, and one card; or, in the comparison, the boxes); two models overlapping or sharing the stage; a card that is missing, empty, has fewer or more than 3 rows, or shows words instead of numbers with units; cards whose quantities differ from thing to thing; comparison boxes that overlap or put their numbers in different places; a header that differs from shot to shot, shows words or has no plate; mountains missing on the horizon; a grid floor too faint to see; coloured or textured models; dark outlines; lumpy or box-like models; a line whose named thing is not after "you get"; anything important below y 1400; an ending that does not return to the hook's layout.
- Check every name, kind, change, number and step against the reference and standard knowledge; remove a number rather than keep a doubtful one.
