# mirror-parable

## about
A calm second-person explainer on a dark stage, built on one idea: a small everyday version of the subject, something the viewer has seen with their own eyes, mirrors the big real thing, and seeing the small one explains the big one. It opens on the small case in a pool of light (what you see happen), looks closer at the one part that matters, then plays the small case and the real thing side by side in identical halves. Then the real thing alone at its true scale, two real numbers as glowing columns (what you would guess or what you see, then what is really there), and the reel's one moment of full colour: the hidden part of the real thing (under the surface, inside, underground, behind) lights up. It ends back on the small case, now understood, so the reel loops. Any field: nature, physics, engineering, the body, history, everyday objects, as long as a small everyday case shows the same rule as the big subject and the reference gives two real numbers.

## look
- The look is spare: a pure black frame, one soft pool of light, crisp line-art objects, one small glowing figure, a few pill labels. It overrides some base rules; where they disagree, this section wins:
  - The frame's edges and everything outside the pool are PURE BLACK (overrides "avoid pure black"). The empty black above the scene is part of the style.
  - The scene lives in one horizontal band from y 620 to 1380 (the caption sits under it at y 1500).
  - Objects are line art: dark flat fills with pale outlines, no 3-value shading, no gradients on objects, no contact-shadow ellipses (overrides the base assets section; ignore its glossy capsule example).
  - Text: chips 38 to 40 px, numbers 90 px, the big number 240 px; nothing else.
- Colour is a set of relations in OKLCH; keep them whatever the topic:
  - ground: lightness 0 (pure black). pool: neutral, lightness about 0.17 at its centre, fading to 0.
  - objects: dark fills at lightness 0.16 to 0.28 (chroma 0), outlines 2.5 px at lightness 0.82, inner details 1.5 px at lightness 0.50. The one part of the subject the eye should go to (the visible top, the moving part, the light source) is filled near-white (lightness 0.92) with a soft white glow.
  - hidden part (under the surface, inside, underground, behind): at colour 0 a fill at lightness 0.10 with a 1.5 px dashed outline (dash [6, 8]) at lightness 0.45; at colour 1 the reveal colours.
  - figure: white (lightness 0.98) with a soft glow.
  - chips: TAG chip (names a case) dark: fill lightness 0.16, 2 px border at 0.42, text 0.93. WORD chip (one key word) light: fill 0.97, no border, text 0.12.
  - first number: a cool hue (about 178, a mint teal), lightness 0.86, chroma 0.08; its glow lightness 0.58.
  - second number: about 160 degrees round the wheel from it (hue about 20, a red), lightness 0.60, chroma 0.15.
  - reveal (the reveal beat and the return only, the reel's one moment of full colour): a deep blue-teal (hue about 230, lightness 0.50, chroma 0.06) for the hidden part's body, a lighter teal (hue 215, lightness 0.70, chroma 0.07) for its lines, the warm ochre (hue about 75, lightness 0.71, chroma 0.10) for one bright spot (a sun, a light, a core). Nowhere else uses colour.
  - text: lightness 0.98.
  - Palette names: bg, pool, fill, fillLight, outline, detail, glowPart, hidden, hiddenLine, figure, chip, chipText, word, wordText, first, firstGlow, second, reveal1, reveal2, reveal3, text. palette.accent = first (the caption colours number words with it), palette.accent2 = second. Never use a colour's name as on-screen text.
- kit.bg: exactly two backgrounds, "stage" and "dim", NOT plain. Use this code as it is (it passes the engine's background checks; never add a filled ellipse, circle or any shape with a visible edge to the background):
  ```
  const r = h.rng(3), specks = [];
  for (let i = 0; i < 70; i++) specks.push({ x: 540 + (r() - 0.5) * 1000, y: r() * 640, s: 2 + r(), a: 0.2 + r() * 0.2, v: 10 + r() * 8 });
  function bg(ctx, lt, name) {
    const c = name === 'dim' ? 30 : 44;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 1080, 1920);
    const b = 1 + 0.03 * Math.sin(lt * 0.8);
    ctx.save(); ctx.translate(540, 1010); ctx.scale(1, 400 / 600);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 600 * b);
    g.addColorStop(0, `rgb(${c},${c},${c})`); g.addColorStop(0.45, `rgb(${c * 0.6 | 0},${c * 0.6 | 0},${c * 0.6 | 0})`);
    g.addColorStop(0.8, `rgb(${c * 0.22 | 0},${c * 0.22 | 0},${c * 0.22 | 0})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-700, -700, 1400, 1400); ctx.restore();
    const gx = 540 + 160 * Math.sin(lt * 0.9), gy = 1010 + 40 * Math.cos(lt * 0.7);
    const g2 = ctx.createRadialGradient(gx, gy, 0, gx, gy, 300);
    g2.addColorStop(0, 'rgba(255,255,255,0.07)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2; ctx.fillRect(gx - 300, gy - 300, 600, 600);
    for (const p of specks) { const y = 1330 - ((p.y + lt * p.v) % 640); ctx.fillStyle = `rgba(255,255,255,${p.a})`; ctx.beginPath(); ctx.arc(p.x, y, p.s, 0, Math.PI * 2); ctx.fill(); }
  }
  ```
- kit.panel(ctx, x, y, w, hgt, opts): a pill whose TOP-LEFT corner is (x, y), exactly h.rr(x, y, w, hgt, hgt / 2) then fill (and stroke): never centred on (x, y) (the shots pass the top-left corner and centre their text at (x + w / 2, y + hgt / 2); a panel drawn centred on (x, y) leaves the text hanging outside its pill). opts.style 'tag' (default): fill chip, 2 px border; 'word': fill word, no border. opts.alpha multiplies its opacity.
- kit.title(ctx, text, x, y, {size, align, color, k}): bold "Segoe UI" text, no box, no stroke, a soft black shadow (blur 8); centred on (x, y) with textBaseline 'middle'. A number k pops it in (scale 0.6 to 1 with easeBack over 0.25 s, opacity 0 to 1 over 0.15 s); a missing k shows it at once; a negative k hides it.
- kit.font "Segoe UI". kit.post: nothing (an empty function).
- Canvas helpers, exactly as the engine defines them: h.rng(seed) returns a FUNCTION (const r = h.rng(7); then r(), r(), r() give numbers from 0 to 1); never use h.rng(seed) itself as a number. h.rr(x, y, w, hgt, r) and h.poly([[x, y], ...]) take NO ctx argument and only build a path: call ctx.fill() or ctx.stroke() after them. h.asset('id', x, y, scale, params) takes NO ctx either.

## motion
- Calm, but every line changes something: each shot has a change on every line and its main change on the cue word. Nothing sits still for more than 2 s (a slow push in of 1.0 to 1.05 over the shot, the figure's small acting, glowing parts pulsing, the pool breathing).
- Things arrive with easeOut over 0.4 to 0.7 s and settle; chips pop in on their word (scale 0.6 to 1, easeBack, 0.25 s) and stay to the end of the shot.
- Anything that is the SAME in two shots (the small case in the hook, the split and the return) is drawn with the same numbers: same position, same size, same timing.
- Columns rise from the plate over 0.8 s (easeOut); their number pops in whole when the column stops (never a counter ticking through in-between values: the engine rejects any number on screen the reference does not state).
- The reveal: the thing's colour param goes from 0 to 1 over 1.0 s (easeOut) from the cue word; never a painted rectangle, panel or clip shape over it.
- Chips, columns and numbers exist only from the word that brings them in: before it nothing is drawn in their place. Never fill the whole frame after kit.bg (no fade rectangles): things fade by their own alpha.

## story
- Second person, present tense, plain spoken English: "you", short sentences, words a twelve-year-old knows.
- The small case is a real, everyday, TRUE thing the viewer has seen or can try (it is a fact, not a made-up scene): the same rule as the subject at a small scale. The reel says why the small case and the big subject are the same. The small case's fact is standard knowledge stated the way it really happens, and it must AGREE with the subject's facts: the same rule pointing the same way (if the rule makes the big thing float, rise or melt, the small one floats, rises or melts too). A small-case fact that contradicts the rule it illustrates is wrong: rewrite it.
- The fact sheet MUST hold two real numbers about the subject, each with its unit, from the reference: the first is what you see or what people guess (the visible part, the old estimate, the expected value); the second is what is really there (the hidden part, the measured value). The payoff fact is the second number. If the reference lacks them, ask for the passages in "need" (look_for words such as "percent", "about", "above", "below", "density", "measured"). Never land on a vague payoff.
- Rhythm: most lines 5 to 11 words; every shot except the two number shots has one short punch line of 2 to 5 words. A shot holds 1 or 2 lines.
- Only the two number shots say numbers; the others say none.
- The real shot says what the thing is, where it is or how big: plain facts, no "because". The reveal's cause line compares the two things that decide it, the way the reference does ("[A] is [lighter, denser, hotter, stiffer] than [B], so [the result]"); never a made-up mechanism or a cause the reference does not give.
- The brief's subject is named by its exact term in the compare shot at the latest.

## plan
- Structure: exactly 8 shots, one per beat, in this order:
  1. hook: the small case (colour 0 in the hook, closer and compare; colour 1 only in the return). Line shape: "You [do an everyday thing with the small version]." then "[What it surprisingly does, 2 to 5 words]." Screen: the small asset on the plinth in the pool, the figure beside it doing the action; the surprising thing happens on the cue word.
  2. closer: the part that matters. Line shape: "[Look closer / notice]: [the part that matters, in plain words]." then a short punch line. Screen: the hook's layout pushed in to 1.15x on the small asset's key part, the small asset still at colour 0; its hidden part shows as a dashed outline; one WORD chip naming that part.
  3. compare: small and big side by side. Line shape: "[The big subject by its exact name] does the same thing." then "[A short why question]?" Screen: the split: the small case left, the real thing right, identical layout, TAG chips naming them (words the line says), the same key part glowing in both.
  4. real: the real thing alone at true scale. Line shape: "[What the real thing is, where it is or how big, plainly]." Screen: the thing asset in monochrome (colour: 0 for the whole shot: the reveal colours appear for the first time in the reveal shot), its hidden part dashed. No figure (the figure appears only in the hook, closer and return).
  5. first: the first number. Line shape: "[What you see / what people guess] is [first number in words]." Screen: the plate with column A rising in the first hue, its number above it, a TAG chip under the plate with the line's word for it.
  6. second: the second number: the payoff. Line shape: "[What is really there] is [second number in words]." then a 3 to 6 word landing line with NO number. Screen: column B rising beside A in the second hue, its number, then the big outlined number. Hold 1 s.
  7. reveal: why. Line shape: "[The one cause, plainly, using a word from shot 2]." then a short punch line. Screen: the thing again, its hidden part floods into the reveal colours on the cue word. Hold 0.5 s.
  8. return: back to the small case. Line shape: "[Back to the small case: what it does, now explained]." Screen: exactly the hook's layout, the small asset's hidden part now in the reveal colours, a WORD chip with the answer word; it ends on the hook's first-frame composition so the reel loops.
- Every shot idea states: the background, every asset with its position, scale and params, what changes on each line and on the cue word, every chip with its exact words, style and position, and (shots 5 and 6) both numbers with their units AND both columns' heights in px, computed once with the shared scale (the larger number 420 px, the other in proportion: a number one ninth of the larger is 47 px) and written identically in both ideas, so column A is the same height in both shots.
- Chip words are cut from that shot's own spoken lines, letter for letter, drawn in UPPERCASE (text.toUpperCase()), 1 to 3 words, at most 14 characters (the engine rejects on-screen words the shot's lines do not say).
- Numbers: only shots 5 and 6 show digits: the first and second numbers exactly as the reference states them, with their unit. Nothing derived (no differences, ratios or sums) unless the brief itself states it.
- Assets: exactly 3, in this order:
  1. "thing" (scenery): the real subject at its true scale.
  2. "small" (prop): the small everyday case.
  3. "figure" (character): the small glowing figure.
- Lines: the narrator only. The script's cast is exactly {"narrator": {"voice": "jessica"}} (with the HeyGen voice engine "meredith", with Kokoro "af_sky") and every line's "who" is "narrator": never a speaker called by the voice's name (a speaker other than the narrator gets speech bubbles over the scene and no captions). The voice is a playful, bright young American woman, conversational and clear. Tones per line from curious, warm, wry, matter-of-fact, quietly, serious: the hook curious, the numbers matter-of-fact then serious, the reveal warm. Never the same tone on every line.
- Music: feel Relaxed Uplifting Calming, 75-95 bpm (the reference bed is about 80 bpm); payoff_shot is the second-number beat. Sound effects: exactly two: a soft pop when column B's number lands, a soft whoosh on the reveal. Nothing else.

## assets
- Every object is line art on black: flat dark fills (palette.fill, palette.fillLight), 2.5 px outlines in palette.outline, inner details as 1.5 px lines in palette.detail, the key visible part filled palette.glowPart with a soft glow (draw it once with ctx.shadowColor white at 60% and ctx.shadowBlur 24, then again without). No textures, no gradients except that glow. Real proportions of the real thing.
- Both "thing" and "small" have a hidden part (the part people do not see: under the waterline, inside, underground, behind a wall) and a param colour (0 to 1): at 0 the hidden part is palette.hidden with a dashed palette.hiddenLine outline; at 1 it is filled reveal1 with reveal2 lines and one reveal3 spot, lerped with h.mix. The visible part stays the same at any colour. A surface or boundary line (a waterline, the ground, a skin, a wall) is a 2 px line in palette.outline across the whole asset.
- "thing": box 900 x 760, placed at (540, 1000). The WHOLE thing, hidden part included, fits inside x -440 to 440 and y -370 to 370 of the box: scale the drawing to fit (a subject that is mostly hidden below its surface line is drawn narrower, never taller than the box; a drawing outside the box makes the engine enlarge the box, which pushes the thing out of the scene band and over the caption). It fills 80 to 95% of the box height or width. The surface line runs across the whole box width at the true level: the part drawn above it takes the real visible share of the drawing's area (when a tenth shows, the part above the line is a low cap about a tenth of the whole shape, and the part below is about nine times bigger), never a tall mountain over a shallow base. The plan's description of the thing states that share with its number. Keep the box's four corners empty (the engine rejects an asset that paints 3 or 4 corners). Params: colour (0 to 1). States: {colour: 0}, {colour: 1}.
- "small": box 520 x 560, placed at (540, 1000); it stands on the box's bottom edge (y = 280), which the shots put on the plinth's top at y 1240. Drawn straight on from the front, flat and symmetric: no perspective, no slanted sides, nothing hanging on lines. The whole everyday setup, not the object alone: its container or ground as a plain outline 280 to 360 px wide with straight vertical sides (a glass of water is a tall rectangle open at the top, a bowl a U, a patch of soil a band), the surface line across it (the water level, the ground level), and the object in its true position against that line (for example an ice cube floating with a small tip above the water level). Its hidden part is treated like the thing's. Params: colour (0 to 1), phase (0 to 1: the action of the hook, for example dropping in, tipping, filling). States: {colour: 0, phase: 1}, {colour: 1, phase: 1}.
- "figure": box 100 x 160, feet on the box's bottom edge (y = 75), about 146 px tall. Draw exactly this, in palette.figure, with the glow done by drawing it twice (shadowBlur 18, white at 60%, then shadowBlur 0): a head disc of radius 22 at (0, -49); a body bell from y -22 to 75: top width 52 with fully rounded top corners (radius 26), widening to 64 at the bottom, bottom corners radius 6; one small arm stub, a capsule 10 px wide from (20, -8) to (28, 22) on its facing side. No face, no legs, no outline, no second arm. Poses: 'stand'; 'reach' (the arm stub raised forward to (34, -14)); 'look' (head 4 px up and forward); 'step' (whole figure leaning 6 degrees forward). Params: pose, flip (faces left), alpha. States: {pose: 'stand'}, {pose: 'reach'}.
- No text inside assets.

## shots
- The small scene (hook, closer, return): background "stage". The plinth, drawn by the shot: a bevelled slab whose top edge runs from x 160 to 920 at y 1240, 30 px thick, its bottom edge 14 px shorter at each end; fill palette.fillLight, an 8 px underside strip in palette.fill, a 3 px top edge line in palette.outline; under it a dashed line (2 px, dash [8, 10], palette.detail at 50%) from x 100 to 980 at y 1290. The small asset at (600, 960) scale 1 (its bottom on y 1240). The figure at (330, 1165) scale 1 (feet on y 1240), facing right. The closer shot pushes in: ctx.translate(600, 1100); ctx.scale(s, s); ctx.translate(-600, -1100) with s from 1 to 1.15 over 0.8 s (easeInOut) after its first line starts.
- Chips: a TAG chip kit.panel(ctx, cx - w / 2, top, w, 72, {style: 'tag'}) with w = the measured text width at 38 px bold plus 56, its text with kit.title at (cx, top + 36), size 38, palette.chipText. A WORD chip: style 'word', 76 px tall, text 40 px bold in palette.wordText. In the small scene a WORD chip sits with its bottom edge 30 px above the small asset's key part, clamped inside x 80 to 1000.
- The split (compare): background "stage". A 2 px divider at x 540 from y 700 to 1300 (palette.detail). Left: a plinth from x 70 to 470 at y 1240 and the small asset at (270, 1100) scale 0.5. Right: a plinth from x 610 to 1010 at y 1240 and the thing at (810, 1040) scale 0.42. TAG chips centred at x 270 and x 810, top y 700. Both key parts pulse together in place (their own glow 20 to 60%, period 1.4 s); no rings, halos or ellipses above them.
- The real thing (real, reveal): background "dim". The thing at (540, 1000), scale 1 rising to 1.05 over the shot. No figure in these shots. A TAG chip at top y 640 only if the line says its word.
- The numbers (first, second): background "dim". The plate: a dark parallelogram, back edge y 1100 from x 220 to 860, front edge y 1240 from x 140 to 940, fill palette.fill at 60%, 2 px border palette.detail, a faint grid (6 lines back to front, 3 across, 1 px at 15%). Both numbers share ONE scale: top = the larger number; a column for value v is 420 * v / top px tall. Column A centred at x 380, column B at x 700, each a box 150 wide and 60 deep in simple 3D: front face from (x - 75, 1170) up, a top face (parallelogram offset 30 right and 18 up), a side face; fill the hue at 18%, a 3 px stroke in the hue, a glow copy (8 px stroke at 25%). A's number (90 px bold, its hue) centred 60 px above its top; B's the same. The TAG chip with the line's word for each number centred under its column at top y 1260. In the second-number shot column A is already standing from the first frame, still in the FIRST hue with its number (only B is in the second hue). 1.2 s after B's number lands, the plate, both columns, their numbers and the chips fade out COMPLETELY over 0.4 s, and only then the big number appears centred at (540, 900): B's number at 240 px as an OUTLINE only, drawn with exactly: ctx.font = kit.font(240, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = palette.text; ctx.strokeText(text, 540, 900) (no fill, no other transform), its unit word under it at y 1040 (40 px, palette.detail); it breathes (a glow copy at 1.04 scale pulsing 20 to 40%, period 1.6 s) to the end.
- Draw order: kit.bg, the plinth, assets, columns, chips, numbers.
- Text only in chips and the numbers. Never a title, heading, floating label, arrow or icon. Keep everything between x 80 and 1000 and y 600 and 1400 (the engine's caption sits at y 1440 to 1560).
- The return shot's last 0.5 s matches the hook's first frame (the same plinth, small asset, figure and positions).

## checks
shots: 8-8
beats: hook, closer, compare, real, first, second, reveal, return
required beats: hook, closer, compare, real, first, second, reveal, return
subject size: off
labels: from narration
captions: phrases
numbers: reference
reference analysis: studio/refs/controller

## director
- Flag: a hard-edged shape in the background (an oval, a disc, a band); colour anywhere except the two number hues and the reveal; objects with gradients, textures or soft blobs instead of dark fills with pale outlines; a figure bigger than about 160 px, with a face, legs or two arms; the small case drawn differently in the hook, the split and the return; a split whose halves are not laid out the same; a chip whose words its shot's lines do not say; text floating outside a chip or the numbers; digits outside the two number shots; a number not in the reference; a column that is not on the shared scale; a filled big number; a reveal without colour or with a painted rectangle; a shot where nothing changes for more than 2 s; a last shot that does not return to the hook's layout.
- Check every claim and number against the reference; remove a number rather than keep a doubtful one.
