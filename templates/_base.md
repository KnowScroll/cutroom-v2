# _base: directions every reel gets, whatever its template

Sections are added to the matching step: look (kit, assets, shots, plan, director), motion (kit, shots, plan, director),
story (the writer's facts, spine and script steps, director), plan (writer, plan, director), sound (writer, plan, director),
assets (assets, plan, director), shots (shots, plan, director), director (director).
The writer (engine/writer.mjs) writes the script first (facts, spine, script, a test viewer and a fact check); the plan step then adds
the art direction and the storyboard to that finished script. A template's "## plan" structure and "Line:" shapes reach both.

## story
- One question, one answer. The hook opens a question the viewer wants answered (a surprising true fact, a strange image, a "why" or "how"); it never gives the answer. The payoff shot answers it with a concrete number, comparison or result; the last shot calls back to the hook.
- Say the brief's subject by its name (the exact term from the brief) within the first two lines. Never open with a dictionary definition; define the subject in the next line.
- Teach in order: before the answer, the viewer learns the 2 to 4 things it rests on, each in its own shot, simplest first. Never use a term before it has been shown or explained.
- Each shot makes ONE point the viewer did not know a shot ago. Two shots with the same point: merge them. A shot with no new point: cut it. Never say the same fact twice in different words (for example where something is, or what touches what); only the last shot may call one back.
- Shots follow from each other: "but" (a turn, a problem) or "so", "which means", "because" (a consequence, a cause), "then" for the steps of a real procedure. A run of "and" is a list of facts, not a story.
- One number per line at most, made felt: next to something the viewer knows (a person, a bus, a football pitch, a city, a lifetime) or against the other number. A bare big number is forgotten.
- Concrete beats abstract: a real thing, a real place, a real number, never "an astonishing story", "an incredible journey", "a remarkable feat". No hype words (astonishing, incredible, amazing, remarkable, unbelievable, mind-blowing, insane, fascinating, staggering, crazy).
- Spoken, not written: short common words, active voice, one idea per sentence, "you" where it fits. Vary the line length: a line that explains, then a short one (3 to 7 words) that lands.
- Silence is a tool: a short pause before a reveal (gap_before) and a silent hold after the answer let them land; never on every shot.
- Never fill a beat with an invented fact. If the topic has no true twist, conflict or number for a beat, skip that beat (unless the template requires it; then use the plainest true fact).

## look
- Backgrounds are calm but never flat: a clear brightness range across the frame (a glow or light pool at least twice as bright as the darkest corners, plus a vignette), texture or shapes visible at full-frame size, and continuous motion (drifting particles, a breathing glow, slowly sliding layers) so two frames 1.5 s apart visibly differ. Faint means 10 to 20% opacity, not 2 to 5%.
- Only use the style's palette colours (and darker or lighter mixes of them). Avoid pure black and pure white except for ink and tiny highlights.
- Outline weight is part of the style: keep it consistent everywhere (for example 4 px ink outlines on everything, or no outlines at all, never a mix).
- Typography: at most two text sizes per shot. Headlines 72 to 140 px, labels 40 to 60 px, never under 36 px.
- On-screen words are plain nouns, names and real numbers: no callout chips or hype words ("83x growth", "insane", "game changer") and no em dashes.
- Text always sits on a contrasting backing (panel, shadow or stroke) and fully inside the frame (x 60 to 1020).

## plan
- When a REFERENCE is given, it wins over your memory. Take names, positions, sizes, proportions, dates and the order of steps from it. In every asset description, state the silhouette with the reference's numbers wherever it gives them (relative sizes, where a joining part sits along the parts it joins, at which level something lies), so the artist draws the real shape.
- Numbers are real: every number on screen or in a line comes from the brief, the reference or standard knowledge. Never invent data points, growth figures or in-between values; when only a start and an end are known, show just those two.
- Facts cover asset descriptions as much as spoken lines: every position, shape, proportion and count in a description must be correct, because the artist draws exactly what you describe.
- Every asset description starts with its silhouette in simple geometric terms: which basic shapes, their proportions, and where and how they join. The artist builds the outline from this, so a vague description gives a wrong-looking drawing.

## sound
- Voice, music and the mix are judged on measured numbers (the engine measures them; nobody listens). Your part is the choices below.
- Music feel by kind of reel (pick 2 or 3 feel words and a bpm band): explainers (mechanism, breakdown, how it works, data) are curious with a pulse: Bright, Driving or Uplifting, 90 to 115 bpm, never a sleepy pad (the bed sits 10 to 14 dB under the voice and must still be heard). Stories: tension (Suspenseful, Mysterious, Dark) or light (Bouncy, Humorous, Bright), matching the story. Comedy: Humorous, Bouncy. Motivation or a speech: Epic, Driving, Intense, pumping from the first second.
- payoff_shot is the shot the whole reel lands on (the answer, the turn, the reveal, the call to action). The engine starts the track at the point where it builds into that shot and peaks there, so choose it carefully.
- Tone per line (when the voice engine takes tones): the hook is curious or urgent, facts are matter-of-fact or warm, a reveal is grave, awed or slow, a joke is wry or deadpan. Vary it with the story; never the same tone on every line.
- Sound effects: a few accents only, each exactly on a visual hit (an impact, a reveal, a number popping in); never one on every line.

## motion
- Nothing teleports: use easing (easeOut to arrive, easeIn to leave, easeInOut for travel) over 0.3 to 0.8 s.
- Anticipation before big moves (a small pull-back), overshoot on arrival (easeBack), then settle, unless the template asks for calm motion.
- Secondary motion: attached things keep moving after the main move (antenna wobble, cloth flap, suspension bounce).
- Speed reads through motion lines, slight stretch in the direction of travel, and blur trails (draw the object 3 to 5 times behind itself with falling opacity).
- Hold every payoff (a number, a reveal, a punchline) still and readable for at least 0.8 s.

## assets
- Silhouette first: a big, simple, instantly readable outer shape. Then add detail inside it.
- Every surface gets 3 values: base colour, a shadow tone (darker, slightly cooler) on the bottom/right, and a highlight (lighter, slightly warmer) on the top/left. Light always comes from the top-left.
- Use gradients sparingly: one soft gradient per large surface is enough. Never a flat single-colour blob for a hero object.
- Add small "read" details that sell the object: seams, panel lines, bolts, stitching, texture strokes, reflections, a specular highlight streak on glossy things.
- Ground every object that sits on a surface with a soft contact shadow (dark ellipse at 25 to 35% opacity).
- Example of the rendering level expected (a glossy capsule with base, shadow, highlight, outline and contact shadow):
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 70, 150, 18, 0, 0, Math.PI * 2); ctx.fill();   // contact shadow
  const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, kit.palette.accent); g.addColorStop(1, h.mix(kit.palette.accent, '#000000', 0.35));
  ctx.fillStyle = g; h.rr(-140, -60, 280, 120, 60); ctx.fill();                                                       // base with built-in shadow
  ctx.fillStyle = h.rgba('#ffffff', 0.35); h.rr(-110, -48, 180, 26, 13); ctx.fill();                                // highlight streak
  ctx.strokeStyle = kit.palette.ink; ctx.lineWidth = 4; h.rr(-140, -60, 280, 120, 60); ctx.stroke();                // consistent outline

## shots
- Three layers: background (simple, low contrast, slightly desaturated), midground, foreground subject (most detail, most contrast).
- The focal subject is big: in a hero moment it fills 40 to 70% of the frame height (or width for wide subjects). Small things are supporting details only.
- Use the rule of thirds; put the subject where the action is going, with space in front of it.
- Keep the bottom 450 px (y > 1470) free of important action: captions live there.
- Avoid big empty areas: if half the frame has nothing in it, the subject is too small or badly placed. The band between the subject and the caption (y 1100 to 1440) must not be empty: move the subject down or scale it up.
- Keep all text between y 180 and 1440 (the top is covered by phone UI, the bottom by captions).
- A number that changes over time is a line graph drawn with h.graph, its count following the tip; a journey from one place to another is a route drawn with h.route. Never draw these by hand.
- Every label: set the font, measure the text with ctx.measureText, draw the panel sized to the text plus 20 to 28 px padding on each side, THEN draw the text centred on it in a light colour. Never a panel without its text, never text spilling out of its panel, never text on a panel of similar colour.
- Glows and highlights hug their shape: draw copies of the same shape scaled 1.05 to 1.15 around that shape's own centre (translate to its centre, scale, translate back). Never stretched streaks or blobs that leave the shape.
- Everything you draw yourself (tools, icons, props, particles, arrows) follows the same craft as the assets: palette colours, the style's edge weight, base, shadow and highlight values, a contact shadow when it sits on something. Never a flat single-colour blob.

## director
- Flag a fact as wrong only when you are certain from standard textbook knowledge. Many subjects have several standard variants (partial or total, early or late, one type or another); any standard variant is correct, so do not "correct" one into another. When unsure, leave the line alone.
- Look for these in every frame: label panels without text or text spilling out of its panel, text cut off at a frame edge, an empty band between the subject and the caption, glows that leave their shape, and labels that are not part names, steps or key numbers.
