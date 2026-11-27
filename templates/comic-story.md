# comic-story

## about
A short character-driven story in a cartoon comic-book look: one main character lives through a real-life experience (a condition, a habit, a job, a day in someone's life) in real places, while a narrator weaves in true facts: what it is, how it shows up across the day, how it affects them and the people around them, why it happens, and what really helps. Warm, funny where it fits, honest. Not for explaining machines or anatomy part by part.

## look
- Comic-book cartoon: thick dark ink outlines (5 to 7 px on characters, 3 to 4 px on background objects), flat colours with ONE hard-edged cel-shadow tone per surface (a darker, slightly cooler shape on the side away from the light, never a soft gradient blob), and halftone dot texture (small dots in a grid, 10 to 20% opacity) inside shadows and on walls.
- Every background is a real, specific place, never a flat colour, a plain gradient or an abstract glow: a floor line and back wall in simple perspective, and 8 or more objects that say where we are (bedroom: bed with pillow and blanket, nightstand with a lamp and alarm clock, window with curtains and the moon, a rug, a picture frame, a phone charger, books; kitchen: counter, fridge with magnets, kettle, mugs, window; office: desks, monitors, chairs, a plant, a wall clock, a water cooler, coworkers' desks; street, bus, cafe or shop the same way). Each object has the style's outline, its cel shadow and one small detail (handles, frames, books, plant leaves, switches).
- Light tells the time and mood: night is deep blue and purple with one warm light source (a lamp, a phone glow, a clock face) making a clear pool of light; morning is pale warm yellow from the window; office is flat cool fluorescent; evening is orange. The same place keeps the same layout every time it appears.
- Characters: big head (about one third of their height), large expressive eyes with eyelids, thick eyebrows that carry the emotion, a clear simple silhouette, a distinct outfit colour per character. Tiredness shows as half-closed lids, dark purple crescents under the eyes, messy hair, slumped shoulders.
- Comic text: sound words (BEEP BEEP, YAWN, TICK, TOCK, Zzz, SIGH) in bold comic lettering with a thick dark outline, and yellow caption boxes with dark text for times and key numbers ("3:07 AM", "1 IN 3 ADULTS"). At most one sound word and one caption box on screen at a time.

## motion
- Cartoon acting, snappy and readable: anticipation before every big move, squash and stretch on landings and jolts (an alarm makes the character jump: stretch up, squash on landing), overshoot then settle (easeBack).
- Characters are never frozen: they breathe (body scale 1 to 2%), blink every 2 to 4 s, and their hair or clothes move a little after every move.
- Every line has one clear acting beat on the character: a sigh drops the shoulders, irritation squeezes the eyebrows and tightens the mouth, worry darts the eyes, relief lifts the chest and opens the eyes. The expression change lands on the line where it is said.
- Camera: open each new place on a wide view of the room (the character and the setting), then punch in toward the face for reactions (scale 1.3 to 1.6 around the face, 0.4 s easeOut), and pull back out for the next action.
- Time passing is shown, not told: clock hands spin, the window goes from moon to sunrise, the light colour shifts.
- The world may move softly when a shot is calm: curtains sway, steam rises from mugs, screens flicker, a ceiling fan turns, a cat's tail flicks.

## plan
- Structure (7 or 8 shots; adapt to the brief). Give every shot one beat name:
  1. hook: the character in the moment that shows the problem most (for example wide awake in bed at 3 AM staring at the clock), one surprising true fact or question.
  2. what: what it is, in plain words, with one key number from the reference, shown in the character's situation (a caption box with the number).
  3. morning: how the day starts because of it.
  4. day: how it affects work, school or focus.
  5. others: how they act with other people and how others react (snapping at a coworker, cancelling on a friend, a worried partner). Merge with day if the word budget is tight.
  6. causes: the real common causes from the reference, shown as things in the character's own life (a phone in bed, late coffee, racing worried thoughts in a thought bubble).
  7. night: the evening and night again, and why trying harder can make it worse, if the reference supports it.
  8. help: what really helps, from the reference (the recommended first treatment, habits that help, when to see a doctor), shown as the character doing it.
  9. outcome: a hopeful ending on the character (a better night or morning) and one memorable takeaway.
- Every required beat gets a shot: hook, what, causes, help and outcome (the reel must end on the character doing better, never on a list of advice). Merge others into day, and night into causes, when the budget is tight.
- A shot holds as many lines as its beat needs, about 12 to 16 words a line as a guide: a long line makes a long shot where nothing happens.
- One main character the whole way through, with a name that fits the brief's place and culture. The narrator carries the facts. The main character also speaks 2 or 3 short lines of their own (a tired mumble, a snap at someone, a hopeful last line) and one other person speaks 1 line; different voices for each.
- Assets: the main character FIRST, kind "character". Params "pose" (the pose list is made after this plan, from what your shots need: so in every shot idea, describe the body pose you want on each line, for example "sits up in bed rubbing her eyes", "slumped at the desk holding a mug"), "expression" (tired, irritated, anxious, neutral, happy, relieved), "eyes" (number 0 to 1, how open), "mouth" (number 0 to 1, for speech) and "facing" (left or right). Second: one supporting person, kind "character", who plays every other person in the story, with a "role" param that changes their outfit colour and hair (for example partner, coworker, friend) plus the same pose, expression, eyes, mouth and facing params. A third asset only for a set piece that also appears WITHOUT the characters; when a character lies or sits in it, that is one of the character's poses, which draws the set piece too. Rooms are backgrounds, drawn by the kit; small props are drawn by the shots.
- Backgrounds: 3 to 5 named real places (each with its time of day), described in detail in the style: the layout, the 8 or more objects, where the light comes from, what moves.
- In each shot idea, say the place, where the character stands or lies and how big, their pose and expression on each line, which other person appears, the sound word or caption box if any, and the camera (wide, punch in, pull out).
- Facts: only from the reference: numbers, causes, effects, treatments. No invented statistics. No medical advice beyond what the reference says (for example "see a doctor if it lasts for months" only if it says so).
- Music: light and warm, feel Bouncy Humorous Bright, 95-125 bpm (Somber or Calming only for a sad story); payoff_shot is the help or outcome shot. Sound effects: pop for caption boxes, whoosh for camera punch-ins, knock for door or desk moments.

## assets
- Characters are built from overlapping simple shapes, each with the ink outline: head (a rounded oval), body (a soft bean or rounded trapezoid), limbs as thick tapered strokes with round caps ending in mitten hands and simple shoes, hair as one shape with 2 or 3 clumps. Write the construction as a code comment first, with proportions (head about one third of the total height).
- The face is always visible in every pose: two eyes, eyebrows and a mouth; hair frames the face and never covers it.
- Face: eyes are white ovals with dark pupils; eyelids are skin-coloured caps that cover the eye according to p.eyes (0 closed, 1 wide open); tired adds dark purple crescents under the eyes; eyebrows are thick strokes whose angle carries the expression (tired: drooping outer ends; irritated: pulled down in the middle; anxious: raised in the middle; happy: arched); the mouth follows p.mouth (0 a closed line, 0.5 a small open oval, 1 wide open) and the expression (frown, flat line, smile).
- Cel shading: one hard-edged darker shape on the side away from the light on the head, body and each limb, plus one small white highlight on the hair and the eyes.
- p.pose is one of the poses in the asset's pose list; draw each exactly as its look says (body position, arms and hands, what it holds, what it is in or on). Write the head, face, hair, body, limbs and outfit ONCE as inner functions and build every pose from them, so the character is the same person in every pose. An in-bed pose draws the bed frame, mattress and pillow, then the character with the head on the pillow, then the blanket over the body. Every pose stays inside the box.
- p.facing flips the character horizontally. Expression, eyes and mouth work in every pose.
- Built-in life from p.t: breathing (body scale 1 to 2%), a blink every 3 s (eyelids close for 0.12 s, unless p.eyes is 0), a small hair sway.
- The supporting person uses the same construction and style so they belong to the same world, with a different body shape, hair and outfit colour per p.role, and the same head-to-body proportion as the main character (never a giant head on a blob).
- Every character shows both arms and hands in every pose (at the sides, on the hips, holding something, gesturing); arms are never hidden behind the body.
- No text inside assets. Never fill the box with a background.

## shots
- Start every shot with the place: kit.bg for its background, filling the frame. Characters stand on the floor line: feet around y 1300 to 1420, never floating in the air. A standing main character fills 45 to 75% of the frame height in a wide view; in a punch-in the face can fill most of the frame.
- The character acts when a line gives something to act, about every 3 seconds as a guide: a new expression, pose, facing or held item, or a move across the room (a sigh and slump, rubbing the eyes, checking the phone, sitting up, turning to someone, walking to the window). Plan the beats by time: for example lt 0 to 1.5 tired and slumped, 1.5 to 3 sits up, 3 to 4.5 anxious looking at the clock. Pass mouth: h.mouth('<cast id>') and call h.anchor('<cast id>', x, yAboveHead) every frame a speaker is on screen.
- In bed: use the character's in-bed pose (it draws the bed, the character and the blanket in the right order); never a separate bed plus a lying character.
- Props are held in the hands at chest height or rest on furniture. Never draw a prop, note, keyboard or label over any face.
- Characters keep their true relative size: two characters at the same distance from the camera get the same h.asset scale (the pose sheet drew them at one shared scale, so their heights already compare correctly). Only someone further back is smaller.
- When a line is about other people, show the supporting person in the same shot (at a desk, across a table, in the doorway), reacting with their own expression.
- Facts become things in the scene: a caption box with the number, a thought bubble (a cloud with two small circles trailing to the head) holding simple drawn icons (a phone, a coffee cup, a scribbled worry cloud, a ticking clock), a calendar, a doctor's leaflet. Never a chart or a slide.
- Props you draw (phone, mug, clock, pills, laptop, thought bubbles) use the comic style: ink outline, flat colour, one cel shadow, a small highlight.
- One sound word or caption box per shot at most, 70 to 130 px, bold, with a thick dark outline, inside y 180 to 1440 and x 60 to 1020, appearing with a pop (scale 0 to 1.15 to 1 over 0.25 s).
- A caption box is at most 5 words, and is drawn with its text in the same frame it appears (measure the text, size the box to it): never an empty box, never text wider than the box, never squeezed with fillText's maxWidth. Put a sound word in open space away from the speaker's head (the speech bubble appears above the head).
- Never paint walls, floors or flat colour over kit.bg: the kit draws the whole room. A mood tint over the room must be a gradient or under 50% opacity.
- Keep the bottom 450 px free of faces and important action: captions live there. The floor and furniture can run behind them.

## checks
beats: hook, what, morning, day, others, causes, night, help, outcome
required beats: hook, what, causes, help, outcome
acting beat: 3.5
hero size: 0.4 - 1.5
background detail: 1.6
gate alive: info

## director
- Flag: a character lying beside a bed instead of in it; a prop or label covering a face; an empty or overflowing caption box; a flat or plain background (a colour, a gradient, an empty room); a character floating or too small to read their face; an expression that does not match the line; a character frozen with nothing moving; a line about other people with no other person on screen; the main character looking different from shot to shot; more than one sound word or caption box at once; text-heavy screens; anything that is not true to the reference.
- Check every number, cause, effect and treatment against the reference and replace anything it does not support.
