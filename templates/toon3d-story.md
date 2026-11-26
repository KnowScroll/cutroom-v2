# toon3d-story

## about
A funny true story about an ordinary person, rendered in real 3D with a toon look: ball-headed cartoon people (a huge sphere head about half their height, a short tube body, stick arms and legs ending in balls) in warm lamp-lit rooms, filmed like a sitcom: wide shots of the room, reaction close-ups of the huge face, over-the-shoulder views and full-frame inserts of the paper or screen that holds the key number. It opens on the absurd outcome, jumps back to how it started, and ends on a deadpan punchline. A quick, dry narrator, one word of caption at a time. For true anecdotes with a twist: a mistake that paid off, a loophole, a lucky or unlucky deal, an odd purchase or bet, a stunt that worked (a person, the odd thing they did, what happened, the catch, how it ended). Not for explainers of mechanisms, lists, data comparisons or sad stories.

## look
- Real 3D (the engine renders it): every character, room and piece of furniture is built by the engine with toon shading, an ink outline on every shape, one warm lamp per room, soft shadows. Shots never draw people, rooms or furniture in 2D; they place them (see shots).
- Colour is a set of OKLCH relations by role; the plan's palette uses these names (10 in all), and every room and character uses only them:
  - ink: warm near-black, lightness 0.13 to 0.16, chroma about 0.03, hue about 25. bg: dark warm brown, lightness about 0.26, chroma 0.03 to 0.05.
  - cream: lightness 0.95 to 0.97, chroma 0.04 to 0.06, hue about 100: rails, papers, counter tops. skin: lightness 0.93 to 0.95, chroma about 0.03, the same hue: a neutral cream, never pink, peach or beige.
  - warm: a pure tomato red, lightness 0.55 to 0.60, chroma 0.21 to 0.24, hue about 30, the most saturated colour on screen. cool: a clear teal-green, lightness 0.62 to 0.72, chroma 0.10 to 0.12, hue 165 to 180 (about 140 degrees from warm).
  - wood: lightness 0.45 to 0.52, chroma about 0.10, hue 55 to 65. amber: lightness 0.62 to 0.70, chroma about 0.13, hue 70 to 80.
  - accent: highlighter yellow, lightness 0.90 to 0.93, chroma about 0.17, hue about 100: the bar behind a key number. accent2: screen green, lightness 0.50 to 0.58, chroma 0.13 to 0.15, hue about 148: screens, signs, one lamp shade.
- Rooms (each background's "room" spec): every room is dominated by a saturated wall pair, never beige or pale: the person's own room cool over warm (teal upper wall, red wainscot, wood floor, a cool rug, a warm lamp); a public place cream over a deep band (lower: a dark mix of cool and ink, given as hex) with a tile floor and an accent2 lamp; a back office warm over cool or amber over cool with an amber or accent2 lamp. Never the same pair for two rooms. 3 to 5 room props on the back wall that say where we are (door, clock, shelf, frame, poster, board, window, cabinet, shelf_unit, lockers, plant, tv, fridge, sink, counter_back).
- Characters ("look3d"): the main person in one saturated outfit (shirt warm) with a cap in the other family (cap cool) and stubble; the supporting person plays everyone else through roles that read apart at a glance (a clerk: cream shirt, warm cap; a boss: dark jacket, cream shirt, warm tie, glasses, moustache, grey puffs; a buyer or friend: cool shirt, short hair in wood). Every face has two eyes, thick brows and a mouth; the head is half the height on purpose.
- The 2D layer (drawn by shots after the 3D frame): kit.panel draws a paper (cream with an ink outline and a thickness strip) or, with {accent}, a screen in a dark bezel; kit.title draws text only. Type: "Selawik", heavy weights.

## motion
- Sitcom timing: holds, then snaps. An expression or pose changes on the word it belongs to, never as a slow fade.
- The reaction take (on every surprise): expr "surprised", jolt animated 0 to 1 over 0.25 s from the word, sweat 1, and hands_up or a step back; then it holds.
- Characters are calm between beats: the engine breathes and blinks them; heads turn (turn, nod, tilt) to look at what the line is about.
- Continuity: inside one shot, people and things stay exactly where they are; only the camera cuts between setups, each with a slow push-in (push = the setup's progress). Correct staging matters more than movement.

## plan
- Structure: 6 to 9 shots, one beat each, in this order. The reel opens on how it ended, then goes back to the start. hook, setup, thing, surprise, reveal and ending are ALWAYS there. question, act and twist are used only when the REFERENCE has the real event for them; a beat the reference has no fact for is left out, never filled with an invented event, date, number, authority or reaction:
  1. hook: the person in the place of the outcome: a WIDE, then a CLOSE on a sly face, then an INSERT of the result's number. Line: "[Who, in a few words] [did the small odd thing] [as a joke or on a whim], and [the absurd real result, with its number]." One sentence, 14 to 20 words.
  2. setup: back to the start, the person's own room; the date card shows the real year (and month and day when known). Lines: one ordinary detail of their life with a small real number, then "It's [year]." as its own short line.
  3. thing: the odd thing arrives, is found or is made (a letter, an ad, a post, an offer, a ticket, an idea): the person with it (holds: paper or phone), then an INSERT of it with its real name and its key number on the highlight bar. Line: what it was and what it said, with the number.
  4. act: what the person did with it, casually (signed, sent, bought, posted, swapped, filed): a MEDIUM of the act (type, hold, point), then an OTS toward whoever received it.
  5. surprise: "[Time] later, [they check, or it arrives]." then a reaction line of one to three words as its own line, on the reaction take in a CLOSE; an INSERT of the new number; the date card flips.
  6. question: the narrator asks the viewer "So what [did they do] with [the thing or the number]?" and answers in one or two words with the unexpected real choice, then what they really did.
  7. twist (only when the reference tells a real later turn): "[Time] later, [the other side acts]" with the real date; the date card flips; the supporting person in that role, angry or stunned, in a TWO or an OTS; an INSERT of the warning or the new number.
  8. reveal: "You see, [one true fact from the reference that changes how the whole story reads: a rule or fine print that decided it, what the thing was really worth then or later (a later value only if the reference states it, with its date), the record it set]." A CLOSE of a smug face (point_up), then an INSERT of that detail with the highlight bar. Never state what someone knew, planned, thought or felt unless the reference says so.
  9. ending: how it ended, with the final real number, in a TWO held to the end (both people, a paper or screen between them on the counter or table); the last line is a deadpan punchline that is a true fact and flips the meaning of the story, never a moral or a call to follow.
- Facts: a TRUE story from the REFERENCE. Every name, date, amount, count and event comes from it; never an invented number, line of dialogue or feeling. Real people appear only as the generic ball-head characters.
- Lines: one narrator, am_echo (a casual American male storyteller; it is chris on ElevenLabs), quick and dry, like telling a friend a story at a table: plain short words, contractions, 4 to 16 words a sentence, several sentences per shot; at least one line of one to three words (the reaction). Never stack labels before a name ("[city] [job] [name]"), never encyclopedia words ("notable", "commemorated", "enthusiasts", "recognized as"). Say each number once in the whole reel (the hook's result may come back only in the punchline). Every sentence carries one concrete fact (a name, a number, a date, a place or an action); never a teaser that promises a fact without giving it ("held a startling little fact", "became a legend"). Numbers in lines are written as words. Say the brief's subject by its name in line 1 or 2, then call the person "he" or "she". Tones: wry for the hook, matter-of-fact for setup, thing and act, surprised for the reaction line, curious for the question, deadpan for the twist and the ending, confident for the reveal.
- On-screen words live only on INSERT papers and screens and the date card (2D layer). At most 3 text rows per insert: a header (what the thing is, at most 22 characters), the key number with its unit or currency in digits (at most 12 characters) and one detail row (at most 26 characters). No brand or company names on screen. Every number and date on screen is stated in the REFERENCE, with the right unit (a dollar value in dollars, a coin count in coins). Write every insert's rows and every date card's text in the shot's idea. No other words on screen.
- Date card text: the strip holds the month and year (at most 9 characters), the big text the day number, or the year alone when there is no day; never the same number in both.
- Assets: exactly TWO characters, whatever the cast size: FIRST the main person, SECOND the supporting person who plays everyone else through look3d roles (one role per other person in the story). No third asset unless the story turns on an object the built-in props do not cover.
- Backgrounds: 3 to 5 real places of the story, each with its room spec (see look).
- Each shot idea gives the staging: the room; where each person stands or sits (behind or in front of the counter, desk or table; left or right), whom they face, their role; the built-in things and where (a counter in the middle, a computer on the desk, a paper in the hand); the setups in order (WIDE, MEDIUM, CLOSE, OTS, TWO, INSERT) and the line or word each starts on; each person's pose and expression per setup; the insert rows and the date card text if any.
- Music: feel Humorous Bouncy, 95-115 bpm (the reference has no music bed, so the band comes from the kind: a light comedy pulse under a quick voice); payoff_shot is the reveal shot. Sound effects: a few, 1 or 2 per shot: a pop when an insert's number appears, a whoosh when a shot opens in a new place, a knock on the twist's first line.

## assets
- Only for the optional prop (characters and rooms are built by the engine): chunky, clean parts in real proportions, palette colours, a clear silhouette first and 2 or 3 details that make it read, no text.

## shots
- Each shot is 2 or 3 camera setups, each held 1.5 to 3.5 s (the ending's last setup up to 6 s), cut on a line start or a word; at least one setup shows a character whole and big (WIDE, MEDIUM or TWO). The setups and the h.d3 camera types:
  - WIDE: S.cam('wide') on everyone in the scene: the room, the furniture, who stands where.
  - MEDIUM: S.cam('medium', {on}) for an action (holding, typing, pointing).
  - CLOSE: S.cam('close', {on}) for every expression beat: the reaction take, the smug reveal, the sly hook.
  - OTS: S.cam('ots', {from: the hero, to: the other person}) whenever two people deal with each other across a counter or a table.
  - TWO: S.cam('two', {on: [both]}) for the ending and for confrontations.
  - INSERT: S.cam('insert', {on: the thing on the counter, desk or table}), then the 2D insert panel over it.
- Staging, every shot: place the furniture first, then the people; the person behind a counter, desk or table stands 0.65 m behind it (or sits on a chair behind it) and the visitor stands 0.85 m or more in front of it; people who deal with each other face each other; nothing stands inside anything (the engine rejects it with the z to use). Small things stand on a surface (on: ...) or are held (holds: ...).
- The frame is tall and narrow: at 3 m from the camera it shows only about 1 m from side to side. Stage people in DEPTH, not side by side: one nearer the camera, the other further back (behind the counter, at the desk), at most 1.2 m apart in x. Two people side by side across a table end up tiny in a wide; use TWO for them instead.
- A computer, screen or tall prop on a desk never stands between the camera and a face: put it 0.45 m or more to the side of a person who faces the camera, or turn the person toward it and film from the side (medium or ots).
- INSERT panel (2D, after S.render()): first a translucent ink dim at 25 to 35% over the frame, then kit.panel(ctx, 90, 360, 900, 600) (a screen: {accent: kit.palette.accent2}); rows centred at x 540: the header at y 460 (48 px, 800), the key number at y 660 (110 to 150 px, 900) on a highlight bar (kit.palette.accent, h.rr around the measured text plus 30 px each side, 150 px tall, behind the number), the detail row at y 840 (42 px, 700). The key number is always digits with a unit or currency (never a word such as a name or "coins"). It shows whole from the insert's first frame, popping in (scale 0.8 to 1, easeBack, 0.2 s); it counts up only in the surprise shot and only when the story's number really grew (a balance, a price), never for an amount someone offered or paid. The highlight bar wipes in left to right over 0.3 s as the narrator says it. Measure every text and shrink it (never under 40 px) to fit the panel with 40 px to spare on each side.
- The date card (2D, only in a shot whose line names a real date or year from the reference; never for "years later" or "today" without one, and never the same date again in a later shot): kit.panel(ctx, 90, 230, 240, 280), a warm strip 70 px tall across its top (y 230 to 300) with the month and year (34 px, 800, cream) centred at (210, 265), the big text (the day, or the year, 110 px, 900, ink; shrink to fit 200 px) centred at (210, 410). It flips when the time jumps: its top page squashes up (scale y 1 to 0 over 0.25 s) and the new date unfolds.
- Keep the bottom 450 px (y > 1470) free of text: the one-word caption pops in there.

## checks
renderer: three
shots: 6-10
beats: hook, setup, thing, act, surprise, question, twist, reveal, ending
required beats: hook, setup, thing, surprise, reveal, ending
hook: number or question
hero size: 0.3 - 1.4
acting beat: 6
captions: words
labels: panels only
numbers: reference
reference analysis: studio/refs/3d

## director
- Flag first, in every frame: a person standing inside or on furniture, or two people overlapping; a camera setup where the person it is about is hidden, cut off or tiny; people who talk to each other not facing each other; a small thing floating or standing on the floor; a number or date on screen the reference does not give, or with the wrong unit; an invented event to fill a beat.
- Also flag: a shot that never cuts (one setup for the whole shot) or a setup held over 3.5 s (except the ending); an insert whose number is missing, wrapped or spilling out of its panel, or more than 3 rows; a surprise without the reaction take; an expression that does not match its line; the supporting person's roles not reading apart; a pale or beige room; the same number said in two shots; a line claiming what someone knew or felt; an ending that preaches or asks to follow.
- Check every name, date, amount and event against the reference; remove a number rather than keep a doubtful one, and never let the punchline be an invented fact.
