# breakdown-explainer

## about
Shows one real physical thing (an organ or body system, a machine, a device, a structure) or a procedure done to it: where it sits, its parts one by one, what each part does, and how a process or procedure unfolds step by step. Calm, clear and educational, in a medical or technical illustration look. Not for abstract ideas, stories, history or comedy.

## look
- Clean modern illustration, like a good medical or engineering textbook animation: soft-shaded, semi-flat shapes with gentle gradients. Thin edges (2 to 3 px, a darker tone of the fill colour) instead of heavy black ink. No cartoon faces, no comic effects, no speed lines.
- Background: a dark field (deep navy, slate or dark teal) lit by a soft radial glow behind where the subject sits (centre clearly lighter, for example a mid blue-grey, fading to near-black corners), a technical grid at 10 to 15% opacity, and 30 to 60 small particles drifting slowly. The glow breathes (size and brightness plus or minus 8%) over a 3 to 4 s cycle. Still quieter than the subject: the subject is the brightest, most saturated thing on screen.
- Context is "ghosted": the surroundings of the subject (the body around an organ, the housing around a mechanism) are translucent outlines or 15 to 30% opacity fills, so the subject reads solid and clearly in place.
- Subject colours are believable but stylised: living tissue in warm pinks and reds, nerves pale yellow, arteries red, veins blue, bone and cartilage off-white, metal in cool greys with a bright specular streak, plastics in muted solids. Reserve ONE accent colour (cyan or amber) for highlights only: the part being talked about, labels, flow arrows.
- Labels: a small dot on the part, a thin leader line (2 to 3 px, accent colour), and a short label (1 to 3 words, bold, 40 to 56 px) on a dark translucent panel. Labels sit in the left or right margin, never on top of the subject.
- Never graphic: no blood, gore, open wounds or realistic surgery. A procedure is shown as a clean diagram: a thin dashed line marks an incision, removed tissue fades or lifts away, instruments are simple steel icons.

## motion
- Calm and precise, never bouncy: easeInOut for camera moves and travel, gentle easeOut for reveals. A small overshoot is allowed only on label pop-ins.
- The "camera" is the scale and position of the subject (and its ghosted context, moved together): push in toward the part being discussed, pull out to show where it lives. One camera move per shot, 0.8 to 1.5 s long, then hold.
- When a part is named: it brightens in the accent colour with a soft glow and pulses gently (scale 1.00 to 1.03), the other parts dim to about 60%, its leader line draws out (0.3 s), then its label pops in (0.25 s).
- Function is shown as things moving along paths: small glowing dots travelling along curves (fluid, signals, current, air, substances being released), at a steady speed, the whole time the function is being explained.
- A process step is one clear change from before to after (a cut line draws itself, a part lifts and fades away, a part slides into place, a flow stops or starts). Hold the after-state at least 1 s.
- Something always moves softly: background particles drift, the subject breathes (scale plus or minus 1%) or flows keep running.

## plan
- Structure (6 to 8 shots; adapt to the brief):
  1. hook: the subject big on screen, with one surprising fact or a question the viewer wants answered.
  2. where: where it is: start from the whole (the body, the machine) ghosted, push in to the subject's location; the subject lights up.
  3. parts: the subject large; name 2 to 4 key parts, one or two per shot, each with its label.
  4. function: what it does: animate its function (what flows in, what comes out, what it controls).
  5. why: why it matters, or why the procedure is needed. Never skip this: for a procedure, name the common reasons it is done (the conditions that lead to it). Merge two parts shots if the word budget is tight.
  6. steps: the process or procedure as 2 to 4 numbered steps, each a clear before and after change, with a step badge (STEP ONE, STEP TWO). Use the real standard steps in order, as a patient-information leaflet or textbook lists them (for surgery: anaesthesia, the incision, what is moved aside, what is carefully protected, what is tied off or cut, what is removed, closing). Never invent a step, and never call something protected when it is actually tied off or cut.
  7. outcome: one memorable takeaway, with the subject shown whole again (recovery, what changes afterwards, any lifelong follow-up).
- Every numbered item above gets at least one shot; merge 3 and 4 when the word budget is tight, never drop 5 or 7.
- List the hero asset FIRST in "assets". Plan the subject as ONE detailed hero asset with params so every shot can stage it: "focus" (string: which part glows; list every part name in the param description, plus "none") and, if there is a procedure, "stage" (string: each state of the procedure, for example intact, marked, partly removed, removed). Its states must preview the important focus and stage values.
- The second asset is the ghosted context (the surroundings), so it can fade and scale on its own. A third asset only for a genuinely different object that needs craft (for example the main instrument when the procedure centres on it). Never draw the subject a second time as a separate diagram: show the procedure on the hero itself through its "stage" param, in the same view the viewer has already learned. Tools, flow dots, arrows, labels and step badges are drawn by the shots, not planned as assets.
- In each shot idea, say which part is focused, which labels appear on which line, and which camera move (push in, pull out, hold) happens.
- Facts: standard textbook knowledge only. Part names correct, relative positions correct (left and right, front and back, above and below, what is attached to what). For a part that connects or bridges others, say exactly which portion it joins (upper, middle or lower) and check it against how a standard labelled textbook diagram shows it; the hero asset is drawn from your description, so a wrong position there is a wrong drawing in every shot. Describe procedures at a patient-education level; no doses, no medical advice. Leave out anything uncertain.
- Lines: one calm, clear narrator (bf_emma, bm_george or af_sarah). Short sentences, one idea per line. Name each part in the line where its label should appear, early in the line.
- Music: feel Bright Uplifting Driving, 90-110 bpm: curious with a pulse, never a sleepy pad; payoff_shot is the outcome shot. Sound effects: a soft pop when a label appears, a whoosh on a big camera move. No booms, thunder or zaps.

## assets
- The hero subject is the most important drawing in the reel: a large box (about 800 to 1000 px wide), a recognisable, accurate silhouette, and every named part drawn as its own distinct shape with its own shading, so it can be highlighted alone.
- Build the silhouette first: write the description's outline as a code comment (basic shapes, proportions, where they join), then draw each part as ONE smooth closed bezier path through 8 to 16 points that follows that outline. Organic parts have no straight edges and no sharp corners. A viewer who knows the subject must recognise it from the silhouette alone.
- p.focus: draw the focused part brighter, tinted toward the accent colour, with a glow made of 2 or 3 larger copies of its shape behind it in the accent colour at falling opacity (do not use ctx.shadowBlur; it is too slow). Draw every other part at 55 to 65% opacity. With focus "none", draw everything normally.
- p.stage: each stage must look clearly different (a dashed cut line drawn, a part partly faded, a part gone with a clean empty outline where it was).
- Organic shapes: smooth bezier curves, never jagged polygons; a radial gradient from a lighter centre to a darker rim; a subtle surface texture (fine curved strokes, lobules, fibres) at 10 to 20% opacity; a soft specular highlight top-left.
- Mechanical shapes: crisp edges, a linear light-to-dark gradient, panel lines, bolts, one bright specular streak.
- Ghosted context: outline strokes 3 to 4 px at 35 to 50% opacity plus a 10 to 20% fill; little detail inside; it must never compete with the hero.
- No text inside assets.

## shots
- The hero subject fills 50 to 80% of the frame width during its moment, centred around x 540, y 850 to 1000 (not higher: the band above the caption must not be empty).
- Labels name a part, a step or one key number, nothing else. Never invent commentary labels. Labels use the margins (x 60 to 330 or 750 to 1020); each leader line ends exactly on its part.
- At most 3 labels on screen at once; older labels fade to 50% when a new one appears.
- On-screen text is key terms only: part names, step badges, one big number. Never write the narration sentence on screen; the host already captions it.
- Name, highlight, label: all on the line where the part is named. If the name comes late in a long line, start at sh.lines[i].start plus that fraction of the line's duration.
- Each shot starts with its camera move or reveal in the first 0.6 s and holds its payoff (all labels shown, or the step's after-state) for the last second.
- Draw the ghosted context behind the hero and move it with the hero (same scale and offset), so zooms feel like one camera.
- Instruments and tools you draw yourself: clean steel shapes, 150 to 300 px long, a light-to-dark linear gradient, one bright specular streak, a 2 to 3 px darker edge, a soft contact shadow. Simple and icon-like, never realistic.
- Flow dots you draw yourself: small circles (10 to 18 px) with a bright core and 2 larger halo circles behind at falling opacity, moving along smooth bezier paths at a steady speed.

## checks
beats: hook, where, parts, function, why, steps, outcome
required beats: hook, why, steps, outcome
hero width: 0.5 - 0.8
hero centre y: 850 - 1000
labels: from narration
gate alive: info

## director
- Flag: the subject too small (under half the frame width) or off-centre with empty space; parts that are hard to tell apart; a part named but not highlighted or labelled; a label pointing at the wrong part; more than 3 labels at once; labels covering the subject; sentences written on screen; positions or proportions that are anatomically or mechanically wrong; anything graphic; shots where nothing moves.
- Check every part name, function and procedure step against standard textbook knowledge and replace wrong lines.
