# script-sketch

## about
A short scripted scene performed by cartoon characters: the brief is a script (scenes, dialogue, inner monologue, stage directions, character looks, visual style) and the reel acts it out exactly, every line word for word and in order, with the characters performing each stage direction in the requested mood. For comedy sketches, parodies, dramatic scenes and dialogues. Not for explainers or facts.

## look
- Follow the brief's visual style first. Draw it as a cartoon comic: thick dark ink outlines (5 to 7 px on characters, 3 to 4 px on background objects), flat colours with ONE hard-edged cel-shadow tone per surface, halftone dot texture (10 to 20% opacity) in shadows.
- Lighting carries the mood. For a dark or thriller mood: low-key lighting with one hard light source (a bare bulb, a desk lamp, a window) making a clear pool of light and deep shadows around it, a desaturated palette, and one accent colour (for example a red) used sparingly. Dark scenes still show the place clearly: the lit area reveals the objects.
- Every location in the script is a real, specific place: a floor line and back wall in simple perspective, and 8 or more objects that match the script (for example an apartment wall covered in photos joined by red string, a desk and a lamp; a room wrapped in plastic sheeting with a table and an overhead lamp). The same place keeps the same layout in every shot.
- Characters look exactly as the brief describes them (hair, face, clothes, colours, build), with big readable heads, expressive eyebrows, and personality in their posture (calm: upright and still; panicking: wide eyes, raised shoulders, open mouth).
- Never graphic: no gore and no wounds. A knife is a simple steel shape that is never used on anyone. Red liquid only where the script says it is fake, and then as a cartoon prop.
- On-screen text only where the script implies it (a price tag on a price line, a sound word on a big beat). Spoken lines get speech bubbles from the host and inner monologue gets the caption, so never write dialogue on screen yourself.

## motion
- Acting first: every line has one clear acting beat for the speaker and a visible reaction from the listener; the comedy lives in the reactions.
- Dramatic camera: punch in to a close-up on a face for an intense line (scale 1.4 to 2.0 around the face over 0.3 to 0.5 s), a slow push-in during inner monologue, a held wide two-shot for an awkward silence.
- Awkward pauses are held: almost nothing moves (a blink, a slow eye shift) for the length of the pause.
- Panic is big and fast (a shake of plus or minus 6 px, eyes wide, squash on every jolt); calm is still and slow.
- Stage directions are acted literally: circling a photo with a marker moves the arm and draws a red circle; looking down at a knife tilts the head down and the eyes follow; struggling with knots pulls and strains with squash and stretch.
- "Cut to black": the frame fades to black in 0.3 s and holds.

## plan
- The brief is a script: keep EVERY spoken line verbatim (same words, same order) with its speaker. The only change: numbers and symbols written out as words for the voice (for example a price "$49.99" is spoken "forty-nine ninety-nine"); on-screen text can still show the symbols.
- Inner monologue lines use "narrator" (shown as a caption, no speech bubble), and the narrator gets the SAME voice as that character's spoken lines. Every other line belongs to its character (speech bubble).
- One shot per beat of the script: a beat is one moment or a short exchange in one place (usually 1 to 3 lines). Follow the scenes in order; the brief's scene timings are a guide.
- Stage directions become what the shot shows. Silences and pauses become "gap_before" seconds (0.6 to 1.5 s) on the next line.
- An offscreen line: the shot shows what the script says (for example the black screen), and the speaker's bubble comes from the frame edge.
- Voices that fit the characters: a calm, low voice for a calm character; a higher, energetic voice for a panicking one.
- Assets: every speaking character, main character FIRST, kind "character", with params "pose" (the pose list is made after this plan from what your shots need, so in every shot idea describe each character's body pose on each line), "expression" (neutral, calm, confused, awkward, shocked, panicked, angry, smug), "eyes" (number 0 to 1, how open), "mouth" (number 0 to 1, for speech) and "facing" (left or right). A character who lies or sits IN something for several shots (for example strapped to a table) gets that as a pose which draws it too. Locations are backgrounds, drawn by the kit; small props (a marker, photos, a knife, ropes, a price tag) are drawn by the shots. At most 3 assets.
- Backgrounds: one per location in the script, each described in detail with its light source and what moves softly (a flickering bulb, swaying plastic sheets, dust in the light), plus a plain black one if the script cuts to black.
- In each shot idea: the place, who is on screen, where and how big, each character's pose and expression on each line, the listener's reaction, and the camera (wide, two-shot, close-up, push-in).
- Music: feel Suspenseful Mysterious for a thriller mood, Humorous Bouncy for a light sketch, 80-120 bpm; payoff_shot is the punchline shot. Sound effects sparingly: a whoosh on a camera punch-in, a knock on a reveal, nothing during a pause.

## assets
- Characters are built from overlapping simple shapes, each with the ink outline: head (a rounded oval), body (a soft trapezoid), limbs as thick tapered strokes with round caps ending in mitten hands and simple shoes, hair as one shape with 2 or 3 clumps. Write the construction as a code comment first, with proportions: an adult's head is a quarter to a third of the standing height.
- The face is always visible in every pose: two eyes, eyebrows and a mouth; hair frames the face and never covers it. Facial hair (a beard, stubble) sits on the jaw below the mouth line.
- Face: eyes are white ovals with dark pupils; eyelids are skin-coloured caps that cover the eye according to p.eyes (0 closed, 1 wide open); eyebrows carry the expression (calm: flat; confused: one raised; shocked or panicked: both high, eyes wide; angry: pulled down in the middle; awkward: one up, a crooked small mouth); the mouth follows p.mouth (0 closed line, 0.5 small open oval, 1 wide open) and the expression.
- Cel shading: one hard-edged darker shape on the side away from the light on the head, body and each limb, plus a small white highlight on the hair and the eyes.
- p.pose is one of the poses in the asset's pose list; draw each exactly as its look says. Write the head, face, hair, body, limbs and outfit ONCE as inner functions and build every pose from them, so the character is the same person in every pose. A pose with a set piece (a table, a chair) draws the back part, then the character, then whatever is in front (straps, ropes).
- p.facing flips the character horizontally. Expression, eyes and mouth work in every pose.
- Built-in life from p.t: breathing (body scale 1 to 2%), a blink every 3 s (eyelids close for 0.12 s, unless p.eyes is 0).
- Every character shows both arms and hands in every pose; arms are never hidden behind the body.
- No text inside assets. Never fill the box with a background.

## shots
- Start every shot with its place: kit.bg for its background, filling the frame. Characters stand on the floor line (feet around y 1300 to 1420), never floating.
- Every frame a speaker is on screen: call h.anchor('<cast id>', x, yAboveHead) and pass mouth: h.mouth('<cast id>'). The listener reacts with their own expression change on the speaker's line.
- Close-ups: punch in around the speaking face (scale 1.4 to 2.0) and keep the face above y 1300 so the caption does not cover it.
- Characters keep their true relative size: two characters at the same distance get the same h.asset scale.
- Props you draw (marker, photos, knife, ropes, price tag) use the comic style: ink outline, flat colour, one cel shadow, a small highlight. Props are held in the hands or rest on furniture, never over a face.
- At most one sound word or text element at a time, 70 to 130 px, bold, with a thick dark outline, inside x 60 to 1020 and y 180 to 1440.
- Never paint walls, floors or flat colour over kit.bg: the kit draws the whole room. A mood tint must be a gradient or under 50% opacity. A black "cut to black" shot uses the black background.
- Keep the bottom 450 px free of faces and important action: captions live there.

## checks
script: yes
reference: off
shots: 8 - 13
hero size: 0.35 - 2.2
acting beat: 5
background detail: 1.2
gate blank: info
gate alive: info

## director
- Flag: any line changed, missing or out of order compared with the script; a wrong speaker; a stage direction not acted; a listener with no reaction; characters that do not match their described looks or change between shots; a pause that is not held; text-heavy screens; anything graphic.
- Never rewrite the script's lines except to spell numbers and symbols as words.
