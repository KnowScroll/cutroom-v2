# Reel quality investigation: detailed findings (2026-11-27)

Companion to [HANDOFF.md](../HANDOFF.md), which has the summary, decisions and plan. This file keeps the per-reel evidence and each investigator's root causes, so the next session does not have to rebuild them.

- **Who found what:** six read-only investigators (Opus) watched the reels as dense timestamped contact sheets and full frames, aligned the narration through the burned-in captions and `silencedetect`, read each script on its own, and traced every issue through the run artifacts and the code. The orchestrator re-checked the key code claims (noted per section) and viewed the key frames.
- **V / H:** **V** (verified) means an artifact, a log line or a code line shows it, cited as file:line. **H** (hypothesis) means it is not proven.
- **Evidence on disk (gitignored, this machine only):** `var/investigation-2026-11-27/`. It holds `inv-globe/`, `inv-kz/`, `inv-atom/`, `inv-cb/` (frames, contact sheets, the selected cuts' extracted shot code, replay scripts), `inv-pipe/` (all engine logs joined plus classifier scripts), `inv-own/` (fastreel diffs) and `findings/` (these notes). To rebuild a contact sheet anywhere: `ffmpeg -i reel.mp4 -vf "fps=2,scale=270:-1,tile=6x2" sheet_%02d.png` (add a drawtext timestamp if needed).
- **Run folders:**
  - Windows: `var/runs/<id>`.
  - WSL: `~/cutroom-var/runs/<id>`, from Windows at `\\wsl.localhost\Ubuntu\home\xznon\cutroom-var\runs\<id>`.
  - Selected cuts are copied in `var/reels-to-watch/`.
- **Line numbers** refer to main at 5977c33.

## A. globe-zoom-explainer: Venus day vs year / F. globe-zoom-explainer: Point Nemo

### Runs and evidence
- A: var/runs/20261127-013542-why-a-day-on-venus-is-longer-than-its-ye, selected cut 4 (copy 04-…mp4).
- F: WSL ~/cutroom-var/runs/20261127-042300-why-is-point-nemo-the-loneliest-place-on, selected cut 3 (copy 09-…mp4).
- Evidence in var/investigation-2026-11-27/inv-globe/:
  - venus/sheet_01-04.jpg, nemo/sheet_01-04.jpg; venus/full/v_<t>.jpg, nemo/full/n_<t>.jpg;
  - nemo/frames/inv_check.png (the colour-inversion strip);
  - nemo/code3/ (cut 3's code from reel-v3/plan.json; reel-work holds cut 4);
  - replay scripts: scripts/invert_sim.mjs, scripts/invert_parts.mjs, scripts/cue_pos.mjs.
- Orchestrator verified:
  - stage_asset.html:137-145 globeFill pushes points behind the globe out to the rim radius;
  - asset_reel.mjs:158 the places check returns when a name has no coordinates;
  - src/job.ts:111 bestCut takes the highest score sum after fewest blocking FAILs.

### Issues (V = verified, H = hypothesis)
| time | issue | stage | |
|---|---|---|---|
| **Venus cut 4** | | | |
| 0-43 s | Earth (Africa) stands in for Venus. "Venus" is a pole at [0,0] in the Gulf of Guinea; no Sun, orbit or other planet appears. | intake -> template -> plan | V |
| 0-4 s | Title "A DAY LONGER THAN ITS YEAR"; the voice says "about half as long". | fact check -> revision | V |
| whole | Narration says the opposite of the brief: "day shorter than its year", a made-up sum of 341.45, a 1.92 ratio. | facts validator -> script rule | V |
| 8-14 s | "Rotation" drawn as a straight line along latitude -24. | shot (the template's line/ring vocabulary) | V |
| 14-18 s | "EARTH TIME" label, a calendar card the template forbids, stray rings. | shot/plan | V |
| 18-24 s | 5 s of a blank blue sphere; the counter never reaches 224.7. | shot camera is NaN + cue timing | V |
| 29-35 s | Counters read "0 D" for 5.5 s; the spoken 341.45 never appears. | cue on the line's last word + a workaround for the overflow check | V |
| 37-43 s | Counters disagree with the line; "DAYS" clipped (shipped failing). | kit counter code | V |
| **Point Nemo cut 3** | | | |
| 0.7-3.5, 20-21.5, 23.5, 40.5-45 s | Land and ocean colours swap; the reel ends swapped. | stage helper globeFill | V |
| 4-8 s | Dives to scale 6.5 over empty water; "SOUTH PACIFIC" label at a fixed screen point. | template locate rule + shot | V |
| 4-38 s | Zoomed views flat and pale next to the navy whole globe. | asset gradient in asset coordinates | V |
| 8-11.5 s | Nothing on screen until the ring; the ring is wider than the frame, so the 3 landmasses are off-screen. | shot / no "fit the measurement" rule | V |
| 13.5-19 s | Ducie Island marker on blank ocean. | data / template | V |
| 19-23.5 s | "Three landmasses": one line at a time, never all three; "2,688 KM" shown up to three times. | template "max 2 lines/markers" + review note | V |
| 23.5-29 s | A 250 px "gyre", an orange 2,688, a "CUTOFF" label, "MAHER ISLAND" under the caption. | plan's orange slot + shot + validator gap | V |
| 29-35 s | The payoff shows one line (gold and blue on the same arc); counters arrive 5.5 s after the number is spoken. | stale cue + shot | V |
| 35-45 s | Gold 2,688 next to ice-blue 2,688, lingering over the close. | template plan rules + a one-number fact sheet | V |
| whole | Camera moves back and forth with no purpose; the story repeats one number, uses the banned word "remarkable", and the gyre beat is a non sequitur. | template motion rule + review-written lines | V |

### Root causes
**Venus**
1. **Intake picked an Earth-only template.**
   - The about says "places ... on Earth" (templates/globe-zoom-explainer.md:4), and kurzgesagt is the template for things in space.
   - The intake reason contradicts itself ("a place on Earth... rather...") but rates the fit "good".
   - src/intake.ts:93-104 checks only the JSON shape. The prompt asks for "Subject kind" (intake.txt:7), but the output has no field for it.
2. **No step checks that the drawn subject is the brief's subject.**
   - The places check skips names that have no coordinates (asset_reel.mjs:158), so Venus and the Sun at [0,0] pass.
   - The sheet review never sees the brief (asset_reel.mjs:631) and passed the Earth globe.
3. **The template can't draw any other body.**
   - Exactly 2 assets (md:73); "no insets or diagrams" (md:7); Earth-radius helpers; world.js has Earth map data only.
   - The review can't add assets (review.txt:24).
4. **The reviews flip-flopped, then patched the shared template.**
   - Review 1 asked for a Venus globe, reviews 2-3 for Earth back, review 4 for Venus again.
   - Round 3 appended "adapt to another planet" text to story and shots. It passed the content-word check (src/templates.ts:297) but left look and assets Earth-only.
   - The Windows var/templates/globe-zoom-explainer.md is now permanently patched with this planet text.
5. **The story patch re-rolled the facts, and the new facts were inverted (engine-4.log).**
   - The first fact draft had the right claim (a 243-day day, longer than the 225-day year) but wrong arithmetic (224.7 + 116.75).
   - The validator said "write the computed value in the text" (writer.mjs:166), so the claim was rewritten to the sum: "day shorter than year".
   - The payoff-number rule (writer.mjs:291) then forced "three hundred forty-one" into the payoff line.
6. **The reference lacked the 243-day fact, and the fact checker flipped the hook.**
   - The model's first article title ("Day on Venus") doesn't exist, so the real Venus article got the 4,000-character budget instead of 7,000 (asset_reel.mjs:94).
   - The fact checker never sees the brief (writer.mjs:393). It rejected 243 as unsupported and rewrote the hook to "about half as long", against its own rules (factcheck.txt:9-10).
   - The revision applies its fixes verbatim (writer.mjs:418).
7. **Best-cut selection ranks by score sum (src/job.ts:111):** the inverted cut 4 (18) beat the factually correct cut 1 (17).
8. **Shot 5's camera is NaN, and nothing catches it.**
   - kit.view returns an object and kit.frame an array, and shot_5.js reads them the other way round; the template defines these helpers with mixed shapes (md:28/31/32).
   - ctx.scale(NaN) is ignored and the size check passes (stage_asset.html:624-625).
9. **Cues sit at line ends:** 6 of 8 Venus cues fall at 90-94% of their line, and the kit counter centres only the number, so "DAYS" runs off the edge.

**Point Nemo**
1. **The colour swap is a globeFill bug (stage_asset.html:137-145).** It pushes hidden points to the rim. When a continent with any visible sliver encloses the hidden point opposite the view centre (here Afro-Eurasia), its outline wraps the whole disc and the 'evenodd' fill swaps land and ocean. The investigator's replay matches every swapped and correct frame.
2. **The reviews blamed the globe asset twice** ("restore navy ocean"), so the round-1 redraw was wasted.
3. **The fact sheet has one number; the template needs four** (gold, ice blue, white, orange). The facts step reads only about and story (writer.mjs:185), and this template has no story section, so every colour slot became 2,688.
4. **Template rules fight the story:**
   - max 2 lines/markers (md:7);
   - zoom scale 3-7 at "locate" (md:62);
   - move the camera every shot (md:41);
   - a line's counter must equal the computed distance (md:93), which gave 2,695 against the spoken 2,688;
   - the close repeats both counters (md:68).
5. **Review-written lines skip every writer check, and their cues go stale.**
   - checkNotes validates only shot and asset ids (src/job.ts:148); applyNotes keeps the old cue (asset_reel.mjs:749-757).
   - Results: "remarkable"; 2,688 spoken in shots 4, 7 and 8; cues "own name" and "lifeless" that the new lines never say.

### Cross-cutting patterns
- **Verified in the code path, so likely in other templates:**
  - review line notes are unvalidated and their cues go stale;
  - the derived-fact message rewrites claims to fit wrong arithmetic;
  - the fact checker has no brief and treats facts missing from the reference as false;
  - template patches can widen a template's scope;
  - best-cut selection ignores factual errors;
  - text under the caption band is never checked (stage_asset.html:935);
  - NaN positions and scales pass silently.
- **Hypotheses:**
  - cues on the last word plus `gate alive: info` (17 of 19 templates) give thin animation everywhere;
  - templates needing several numbers (kurzgesagt, mirror-parable, pixel-sim) may starve the same way;
  - templates name the narrator by voice (chris, george, will, brian) while the engine expects "narrator" (verified only for Venus cut 1, where all 8 shots were first rejected with "chris not anchored");
  - "at most N things" rules may clash with stories that name more.
- **Scope of the colour swap:** only orthographic globe views; the flat-map templates (countryball, sourced-cutaway) are safe.

### Keep
- Real Natural Earth geometry, correct continents, and the Wikipedia coordinates check (Nemo's three islands were placed correctly).
- The continuous camera and smooth cut transitions.
- Counter roll-and-pop with gold/ice-blue coding (Nemo 15.5-17 s is the model).
- Validators that worked: text overflow at the frame edge; "not animated"; unbalanced save/restore; full-frame fills; cue word not in the line; repeated numbers.
- The shipped_failing gate; the concrete, timestamped review diagnoses; the audio gates.
- The writer's own first scripts: Venus cuts 1-3 were correct.

### Fixes proposed by the investigator
Engine items are outside §4.2 today.
1. **Intake:** output subject_kind plus a verbatim quote of the "For..." clause it matches; code checks the quote against the chosen template's about, else fit "none" (src/prompts/intake.txt, src/intake.ts).
2. **Review:** a wrong_template verdict that stops the loop or re-runs intake; patches may not widen what a template is for; the brief wins on facts, the template on style (src/prompts/review.txt, src/job.ts).
3. **Line notes:** run review-written lines through the writer's checks (digits, hype words, repeated numbers, word budget) in src/job.ts checkNotes; applyNotes resets cues [engine].
4. **Writer [engine]:**
   - the derived-fact message says "fix the arithmetic or the source, never the claim" (writer.mjs:166);
   - every number in the brief must be on the sheet or rejected with a reason;
   - the fact checker gets the brief and reports conflicts instead of flipping the premise (writer.mjs:393);
   - the first article found gets the 7,000-character budget (asset_reel.mjs:94).
5. **Template (developer edit, globe-zoom-explainer.md):**
   - a story section stating the numbers needed;
   - up to 3 lines/markers; the locate zoom shows nearby context;
   - measurements fit the frame;
   - the close keeps counters only with their lines;
   - the camera moves only to show something new;
   - centre the whole counter line (md:37);
   - name the narrator "narrator".
6. **globeFill [engine]:** clip each outline at the exact horizon crossing and join along the shorter rim arc, instead of pushing hidden points to the rim (stage_asset.html:137-145).
7. **Stage strict mode [engine]:** throw on NaN in h.asset (stage_asset.html:620); check text in the caption band (:935).
8. **Places check [engine]:** a name whose Wikipedia page exists but has no Earth coordinates becomes a plan error (asset_reel.mjs:158).
9. **Cues:** the cue is the first word of the thing that appears and sits in the first two-thirds of the line (engine/prompts/script.txt, or a template line).
10. **Best cut:** a review fact_wrong flag counts as blocking (src/job.ts:111, design §6.5).
11. **Patched template:** decide whether to revert the planet text in var/templates/globe-zoom-explainer.md before the next globe job.

### Orchestrator note on the user's framing
The user wants globe-zoom to "adapt to different planets". Today the template is Earth-geography only by design (world.js Natural Earth data; about = places on Earth), and kurzgesagt covers space. Two options for the new session:
- (a) widen globe-zoom with a generic body renderer (any sphere with a base colour/texture, no Earth data), keeping Earth geography when the subject is on Earth;
- (b) keep globe-zoom Earth-only, route planets to kurzgesagt, and make intake enforce scope.
The user's text asks for (a). The handoff lists it as a user-confirm item, because it widens a template's scope.

---

## B. kurzgesagt: walk to the Moon / C. kurzgesagt: how big is the Sun

Runs:
- B: var/runs/20261127-002302-how-long-would-it-take-to-walk-to-the-mo, selected cut 2 (copy 03-…mp4).
- C: WSL ~/cutroom-var/runs/20261127-024513-how-big-is-the-sun, selected cut 3 (copy 05-…mp4).

Evidence: var/investigation-2026-11-27/inv-kz/moon/{sheet_01..04.png (2 fps), full_{08.5,13.0,16.9,21.6,26.6,33.9,38.5,43.0}s.png}, inv-kz/sun/{sheet_01..04.png (3 fps), full_{05.5,09.0,13.5,18.5,25.5,29.0}s.png, crop_earth_09.0s.png}.
- Both selected cuts used the original templates/kurzgesagt.md (sha c20ff1f…).
- Moon cut 2's shot code is in reel-v2/plan.json; reel-work holds cut 4's state.
- Sun cut 3: shots 3, 4 and 5 are cut 1's code, shipped failing; every later revision of them was rejected.
- Orchestrator verified: stage_asset.html:637-643 cover check (fillRect area > 30% counted, clip ignored, rgba regex missing backslashes); kurzgesagt.md:32-33 body recipe fills its square with fillRect inside a clip; stage_asset.html:1020 hero-size check (< 380 px rejected).

### Issues
| time | issue | stage | status |
|---|---|---|---|
| **Moon** | | | |
| 4-10 s | Walker stands still; the asset has only which/glow params, no pose. | template assets rule / plan | V |
| 9.0 | Tag "5 kilometers": a speed shown as a distance. | plan | V |
| 10.4-16.5 | Earth and Moon overlap: both start at x 540 and move only on the cue "away", the line's last word (16.48 s). | script cue / shot code | V |
| 16.9-21.5 | "378,000 km" tag shows 3.1 s after it is spoken, for 0.45 s; "75,600 hours" 2.9 s late, for 0.7 s. | cue word / timing | V |
| 17-28 | Earth:Moon ratio changes every shot (16:1, 11:1; real 3.7:1); the gap is never to scale. | hero-size validator / plan | V |
| 33.8 | "2,442 hours longer" as a tag and a pink answer chip in a non-answer shot; the number is wrong. | facts f11 -> shot code | V |
| 28-33 | "Moon orbits in 29.5 days, so the walk lasts far longer" is a non sequitur. | spine | V |
| 34-41 | Column clutter: radii 210/176/164/142/102 in 955 px, a -158 px gap, so every item overlaps. | plan + hero-size validator | V |
| 37.6 | Answer chip lands on "ninth", 2.1 s after "eight point six years". | cue / shot code | V |
| 41-46 | "...just not inside one lifetime" is false. | intake -> spine -> script; the fix step did nothing | V |
| 42.6 | The close adds the Moon's 3,474 km diameter, unrelated and unspoken. | template close rule | V |
| **Sun** | | | |
| 2.5-6.8 | "12,700 km" is never visible in its shot: kit.tag(..., {k:0}) pops at scale 0. | shot code | V |
| 6.8-11.1 | Tags float over an empty stage: tags are timed from line start, the Sun from the cue "wide" (the last word); Earth is an 8 px dark speck. | shot code / cue | V |
| 12.1-15.3 | "1,391,400 km" sits under Earth and covers "12,700 km" (oldX = 155); cut 1 shipped this failing. | shot code | V |
| 11-21 | Sun cropped (R 436, then a horizon at R 763); Earth a 14 px dot floating ~230 px above the surface. | template ratio>6 rule / validator | V |
| 21-27 | A small Sun and no Earths: "109 Earths" is said but never shown. | shot 6 bugs | V |
| 22-27 | "Earth" tag covers the "Sun" tag. | shot code; the validator can't see it | V |
| 17-31 | Answer "109" said 3 times; the miles shot repeats the km shot. | spine / repeat check | V |

### Root causes
1. **A false "solid rectangle" rejection blocks every big body.** The template's kit.body fills its square with ctx.fillRect inside a clip (kurzgesagt.md:32; Sun kit line 274). The stage cover check counts that square and ignores the clip (stage_asset.html:638-643). Any body above about R 394 is rejected: R 436 37%, R 763 112%, the bigger Sun for the 109-Earth row 123% (engine-1..4.log). So the template's own horizon recipe can never pass; three Sun rounds were wasted, and the review repeated the misleading "remove the solid rectangle" note.
2. **The hero-size check (stage_asset.html:1020, 380 px) distorts scale.** The plan used Earth R 92 (box 270 px) and got rejected, so the coders enlarged one body only and broke the ratio. In Moon shot 7 they inflated the whole column into overlap. The same check forbids a true-scale Earth-Moon view (R 16 and R 4.5 across 1000 px).
3. **Cue words sit at the ends of lines.** Moon cues: "away", "longer", "lifetime"; Sun cues: "wide", "miles", "across". The template chain adds thing -> 0.2 s -> tag -> 0.4 s -> number tag, so numbers land 2-3 s after they are spoken, often in the last 0.5 s of the shot. engine/prompts/script.txt:12,28 never says where the cue belongs. Letter-share word timing (heygen has no alignment) is off by only ~0.3-0.5 s on the cached clips; it is secondary.
4. **The Moon maths contradiction.**
   - 378,000/5 = 75,600 h = 8.63 years non-stop (8.8 years with the standard 384,400 km). At 8 h a day it is ~26 years, still inside a lifetime.
   - f11 mixes units: 378000/5/24 - 29.5*24 = 3,150 days minus 708 hours. The real difference is 74,892 h, so 2,442 is ~30x too small.
   - The contradiction entered at intake: the goal says "a human lifetime or more" (src/prompts/intake.txt:5 doesn't stop it predicting the answer).
   - facts.answer said "19 years, one-quarter", which nothing checks against the payoff fact; the spine copied both.
   - Fact check 2 caught the lifetime claim, but the fix step had to keep the cue word "lifetime", accepted nothing, and still logged "rewrote shots 8" (writer.mjs:349-351).
   - Neither the fact checker nor the harness review sees calc; the review called the facts "accurate" and even proposed speaking the 2,442 number.
5. **Sun shot 6 code bugs.** It scales twice (ctx.scale(s) plus h.asset(..., s)), so the Sun comes out R 162 and the Earths 0.05 px. earthR = sunR*2/109 uses a diameter as a radius. No validator checks that planned things become visible.
6. **Template vocabulary mismatch.**
   - kurzgesagt is a one-quantity size chain: fixed rows for things, lines and tags (y 840/1190/1280) and a "to scale" column.
   - A speed x distance -> time question becomes a stack of clock, calculator and orbit.
   - For 109:1 the column formula caps the Sun at R <= 300, so Earth R <= 2.75. There is no "N copies laid across" device.
   - Intake rated both requests "good".
7. **The harness keeps old failures without reporting them.** The shipped_failing gate reads only the current cut's log (src/engine.ts:474, src/gates/basic.ts:86-104), so Sun shots 3-5, carried over failing, passed the gate in cuts 2-4. That is how cut 3 won selection. The Moon's template round was spent on caption fading, which the engine draws.

### Cross-cutting patterns
1. Cue on the last word: shots open empty or wrong, and the payoff comes late.
2. Validators push the wrong way: hero size and the fillRect cover check.
3. Validators miss what matters: asset overlap, tag-pill overlap (kit.tag uses the kit's own panel, not the tracked KIT.panel, stage_asset.html:818-821), invisible planned items, a chip outside the answer shot, labels before their object.
4. Failures are dropped without a record: the fix-claims log, rejected revisions keeping old code, the gate forgetting carried-over failures.
5. Fixed layout rows detach each measurement from its thing.
6. Shots are coded in parallel with no continuity, so things vanish and jump scale at cuts.
7. Free text (the intake goal, facts.answer, spine points) carries claims nobody checks.

### Keep
- The derived-fact arithmetic check and the reference-number check.
- Fact check 1 ("one ninth"), fact check 2's detection, and the viewer's non-stop question.
- The word-budget loop; the voice and music gates.
- The look and bookends.
- The right plan ideas: time as progress along the gap; the Sun 763/7 true ratio; 109 Earths along the diameter.
- Concrete review notes.

### Fixes proposed by the investigator
- **Template (templates/kurzgesagt.md):**
  - T1 (lines 32-33): fill the silhouette path, not fillRect.
  - T2 (100-103): measuring line at cy + R + 40, number tag under it, name tag above the thing.
  - T3 (66, 98): anything under R 10 drawn as a kit.body bright dot plus a ring callout, never a tiny h.asset.
  - T4 (75): zoom out to the whole big thing; for "N fit across", a horizontal row of N discs at one scale (big R >= 450).
  - T5 (64/77/104): the column holds only things in the one quantity; no column when the quantity changes.
  - T6 (51/108): the number tag lands on the first word of its spoken number; no tag before its thing is visible.
  - T7 (66): scale every thing by the same factor; `subject size: off` is a judgement call.
  - T8 (4): rates and conversions go under "Not for", or add a journey device.
- **Harness:**
  - H1: carry shipped-failing shots forward while unchanged.
  - H2: a new block gate when a fact-check-2 claim survives in the final lines.
  - H3 (src/review.ts:26,251): send calc and unresolved fact-check problems; add a frame at each spoken number.
  - H4 (intake prompt): the goal never predicts the answer.
  - H5 (review prompt): captions are the engine's.
- **Engine (outside §4.2 today):**
  - The cover check respects the clip; escape its rgba regex.
  - Track tag pills for overlap; add asset-overlap and visibility checks.
  - fix-claims logs honestly and may change the cue word.
  - Check facts.answer against the payoff fact; show calc to the fact checker; key repeated numbers without the next word.
  - Reject a cue that starts in the last 30% of its line.
  - The hero-size message becomes "scale all things together".

---

## D. countryball-map-story: Norway breaks away from Sweden (1905)

Run (WSL): ~/cutroom-var/runs/20261127-031544-how-did-norway-break-away-from-sweden-in, selected cut 3. Copy: var/reels-to-watch/06-…mp4.
Evidence: var/investigation-2026-11-27/inv-cb/: sheets/sheet_01..06.png (2 fps), full/f_<t>.png, half/h_<t>.png, v3code/shot_N.js (cut-3 code from reel-v3/plan.json), assets-v3.jpg, audio.wav.

Which code is cut 3's: the video is byte-identical to reel-v3/reel.mp4. Shot 2 was written in cut 1; shots 1, 3, 5, 10 and 13 in cut 2; the rest in cut 3. The cut-3 redraws of shots 10 and 13 failed three times each, so the old code shipped.
Audio: speech, captions and timeline agree within ~0.2 s (silencedetect). Audio is not the problem.

### Issues (V = verified, H = hypothesis)
| t (s) | seen | evidence | stage | |
|---|---|---|---|---|
| 0-3.9 | Balls at 1.55x overlap each other and cover the whole map. | shot_1.js x 330/750, scale 1.55 | shot code, following the harness note "make them large" | V |
| 3.9-7.9 | Sweden drawn twice; a hidden second Norway; labels behind the sign. | shot_2.js 34-52, 139-158 (four h.asset calls) | shot code (since cut 1) | V |
| 13-17 | Norway's speech bubble covers the sign word; the two bubbles overlap. | stage_asset.html:663,798 | host bubble placement | V |
| 12.7-61.7 | Sign word goes SWEDEN, NORWAY, KINGDOM OF NORWAY, NORWAY; "SWEDEN" for Norway is false. | grep word: | plan, harness notes | V |
| all | The hold_post ball carries its own stick and never holds the sign. | poses.json, sheet-review r2, drawCentralPost | poses step, sheet review | V |
| 18-21.6 | Green check and cards cover the balls. | frames | shot code | V |
| 26-29.7 | Balls forced to x=300/x=780, off their countries; the Carl medallion covers Denmark and never arrives. | shot_7.js:36-37 | shot code | V |
| 29.7-34.1 | Invented "6 JUNE 1905"; the 72-to-5 counter is hidden behind Norway's ball; Sweden shrinks while the line says the vote backed the union. | shot_8.js | facts, harness notes-3 | V |
| 34-38.8 | A 300x410 paper covers Norway's ball for the whole shot. | shot_9.js:12,69 | shot code | V |
| 38.8-43.3 | Stale visuals: the line changed but the old code stayed; its cue 'paper' is no longer said. | shot_10.js:6, asset_reel.mjs:393 | engine (kept code not revalidated) | V |
| 43-48.5 | At the music payoff Sweden's ball sits exactly on Norway's; the fill split is hidden. | shot_11.js:27-58 (both at kit.centre) | shot code; the template's 380 px rule is not enforced | V |
| 48.5-53 | Night moment: balls overlap, Denmark holds a stick, the two medallion names garble together. | shot_12.js | poses, shot code | V |
| 53-56.7 | Zooms out to a world map; the Storting building floats over the world. | shot_13.js:31-47 (r: V.r*0.30) | shot code; the meaning of view r is undocumented | V (cause H) |
| whole | 11 of 14 shots share one view; 10 have the same sign layout; Norway left, Sweden right every time. | grep kit.view | template + plan | V |
| whole | The union fill is never shown; Svalbard is the most visible Norway. | frames | plan + shot code | V |

The harness review saw the duplicate (shot 2), the stacked balls (shot 11) and the covered Norway (shot 9) and flagged none of them. Its notes made things worse: they asserted "6 June, vote rejected joining" and dictated slogan titles.

### Fact check
| claim (shot) | verdict | where the error came in |
|---|---|---|
| 4 Nov 1814, Charles XIII elected (3) | correct | - |
| sign "SWEDEN" (1-3) | wrong framing: Norway was a separate kingdom in the union | plan |
| 23 May 1905 consular law (5) | correct; the 27 May veto (the real trigger) is missing | reference |
| "7 June, power passed to the Storting" (6) | wrong: that was Oct 1814 | reference extraction -> fact f8 |
| 72-5 vote, "6 JUNE 1905" (8) | wrong: the vote was 20 Oct 1814; the date is invented | f9, harness notes-3 |
| Charles XIII motion failed (9) | an 1814 event shown as 1905; contradicts shot 3 | f10, spine |
| "7 June, Norway declared independence" (10) | correct (Storting dissolved the union on 7 June 1905) | - |
| "Sweden accepted" (11) | imprecise: missing the 13 Aug referendum (368,208 to 184), Karlstad (31 Aug-23 Sep) and the 26 Oct recognition | main article never fetched |
| "Carl entered Norway, became Haakon VII" (12) | imprecise: after the 12-13 Nov referendum he was elected 18 Nov and arrived 25 Nov; shot 7 places him before June | script, spine order |
| "OSLO SINCE 1866" (13) | imprecise: the city was Kristiania until 1925 | plan |
Sources: en.wikipedia.org/wiki/Dissolution_of_the_union_between_Norway_and_Sweden, en.wikipedia.org/wiki/Union_between_Sweden_and_Norway, stortinget.no (the first Storting, the union and the election of the king).

### Root causes
1. The reference mixed up the eras.
   - The model guessed the article title wrong and the engine has no search fallback, so "Dissolution of the union between Norway and Sweden" was never fetched (engine-1.log 2.8 s, 15.6 s; asset_reel.mjs:89-91).
   - fetchPassages (asset_reel.mjs:116-121) glues keyword-matched sentences together without section headings, so sentences about 1814 and 1884 followed the 7 June 1905 sentence and the facts step dated them 1905.
   - The date guard checks each number on its own and skips one-digit numbers (writer.mjs:177-179, asset_reel.mjs:524), so "6 June 1905" passed.
2. The story order can't be fixed, and the template beats are shaped for wars.
   - 14 fixed beats, with "odds" (one ball swells) required.
   - Nothing enforces that time runs forward.
   - Revision is told to keep the spine (writer.mjs:418), so the test viewer's exact chronology complaint was ignored.
3. There are no interaction poses or expressions. The ball has 5 poses, each for one body, and holds at most a paper; the plan's BALLS line is only a placement (country, expression, pose, size); the asset reports no hand points. So a negotiation, quarrel, union, split or handover all render as two balls standing side by side.
4. Shot code places every object independently.
   - The validators check text against text, hero size and acting, and a solid cover over the background; nothing checks a character against another character, a prop, a label or a bubble.
   - TRACK stores the asset id 'ball', not the country, so one country can be drawn twice.
   - Bubbles are placed blind.
5. The template's fixed sign composition and slot rule (template lines 107-108) push balls off their countries when the countries are neighbours. That repeats one composition and turns the map into a backdrop.
6. A failed redraw ships stale code with no flag.
7. The asset sheet always shows grey balls because the pose states drop the flag parameter (asset_reel.mjs:564), so every round asked for flag redraws.

### Cross-cutting patterns
- No step checks a claim against an unambiguous source, so errors compound: reference, facts, spine, then the review "confirms" them.
- Rules exist only as template prose and none is enforced: the 380 px gap, one fill per union, time forward, titles <= 18 chars, sign words <= 10.
- Harness review notes contradict the template (slogan titles, "make them large").
- Drawing order decides what gets hidden.

### Positive behaviours (keep)
- Real map data; correct flags and fills.
- The sign flip animation works.
- Expressions change line by line.
- Audio and captions in sync; all audio gates pass.
- The text-overlap validator caught label collisions.
- The draft fact check caught two errors, and the test viewer diagnosed the chronology problem.
- Correct dates on screen (1814, 23 May, 7 June).
- Cut 3 cost $0.07.

### Fixes proposed by the investigator (none country-specific)
1. asset_reel.mjs fetchArticles/fetchPassages: Wikipedia search fallback when a title is missing; prefix each passage with its section heading.
2. writer.mjs:
   - a full date in a fact must appear as one unit in the reference;
   - a spine check that dated facts never go backwards outside a flashback;
   - rebuild the spine when the test viewer is lost in >= 3 shots.
3. Template (countryball-map-story.md):
   - "odds" optional; the sign only in the hook, word and payoff;
   - at most 4 shots per view (as a check);
   - a RELATION per two-ball shot (ask/refuse, argue, join, split, hand over, sign), each with its own staging;
   - give, receive and turn_away poses;
   - the union as one fill until it ends;
   - document that a bigger view.r means closer.
4. stage_asset.html:
   - h.asset takes `who` (the cast id) and anchors the speech bubble from it;
   - validator errors: a cast member drawn twice; two characters overlapping > 15%; a face or the sign word > 35% covered in the final frame;
   - bubbles pick the least-overlapping of three positions, one at a time;
   - h.asset returns hand points.
5. asset_reel.mjs:
   - keep the plan state's params in pose states so the sheet shows real flags (line 564);
   - use the template's pose descriptions word for word;
   - revalidate kept code against changed lines (line 393).
6. src/prompts/review.txt: identity and occlusion checks; notes may cite only sheet facts; notes must obey the template's text rules.

---

## G. kurzgesagt: atom vs grain of sand (positive reference + maths failure)

Run (WSL): ~/cutroom-var/runs/20261127-060125-how-small-is-an-atom-compared-to-a-grain, selected cut 2. Copy: var/reels-to-watch/10-…mp4.
Evidence: var/investigation-2026-11-27/inv-atom/ (sheets 3 fps, frames f_<sec>.jpg, code-v2/ = cut 2's asset and shot code reconstructed from reel-v2/plan.json; engine-2.log: cut 2 rebuilt all 7 shots and both assets).
The orchestrator checked writer.mjs:54 (UNIT_FACTORS has 1e6 and 1e9), writer.mjs:166 (message "write the computed value in the text") and asset_reel.mjs:674 (assetCatalog(plan, s.uses)).

### Issues (V = verified, H = hypothesis)
| t (s) | seen / heard | evidence | stage | |
|---|---|---|---|---|
| 0-3.0 | Only stars. The sand pops in on the last word "sand"; the atom is never shown. | shot_1.js:4,17 waits for h.cue("sand"). frame0 gate passed at 0.054 (threshold 0.05) on stars. validateShot has no subject-visible check (stage_asset.html:925-1022). | script cue, shot code, weak gate | V |
| 10.6-12.3 | Tag "1,000,000 picometers" (wrong by 1000x). | shot_3.js:100. review-1 (harness) asked for this tag. | facts f3 -> plan -> review | V |
| 12.6-16.3 | Atom drawn about as big as the sand or bigger (inverted comparison). | shot_4.js:93 draws the atom at scale 1 (R 272); R_ATOM=7 (line 17) is unused; sand shrinks 62%. review-2 misread it as "sand 30x atom". | shot code; no size check | V |
| 13-18.5 | Pills overlap: "Grain of sand"/"Atom" by ~10 px, "1 millimeter"/"100 picometers" by ~18 px. | shot_5.js:210-222 (34 px gap, but each pill pads 26 px per side). The overlap check sees glyph boxes only (stage_asset.html:963-965); kit tag pills use the kit's own panel (kit.js:415), not the wrapped KIT.panel (stage_asset.html:818). | shot code; blind check | V |
| 16.4 | Continuity jump: small sand + huge atom becomes big sand + invisible atom. | cut_4to5.jpg | shot code | V |
| 18.3-19.3 | Microscope on screen ~1 s, slides across the sand, not the atom; why it matters is never said. | shot_5.js:23-27 hand-drawn (not the bodies microscope). In the spine, shot 5's point doesn't match its fact f6; the reason (f5, smaller than light's wavelength) went to shot 7 and is never spoken. | spine + shot code | V |
| 20.4-21.6 | Empty screen at the start of the answer shot. | shot_6.js:20-21: entries at line start + 0.2 s; the line starts at 0.95 s (0.6 s pause). | timing | V |
| 22.3-33.4 | Answer chip "10,000 times smaller" (true ratio ~10^7). | shot_6.js:151, shot_7.js:115 | facts f4 | V |
| 27.3-31 | Analogy spoken while only the atom is on screen; the sand arrives on the last word "kilometers". | shot_7.js:5,47 | last-word cue | V |
| 31-33.4 | Sand changes look: a plain beige ellipse. | shot_7.js:37-70 hand-draws it. The plan gives shot 7 uses:["atom"] and the shot prompt only offers assetCatalog(plan, s.uses) (asset_reel.mjs:674). Review-2's "reuse the sand asset" could never be applied (cut 4 still has ["atom"]). | plan uses | V |
| 31-33.4 | Analogy not shown: the "1 m" atom and "10 km" sand drawn the same size (R 260 vs 250-270), no familiar scale object. Tag and line say "10 kilometers" (true ~10,000 km). | shot_7.js:12,17,99. The template ratio recipe is not applied; the close beat has no analogy recipe (kurzgesagt.md:78). | plan, shot code, template | V |
| 8.3/12.3/16.4 | Every tag blinks out and pops again at each cut. | cut_2to3.jpg | shot code (no continuity) | V |
| whole | 33.4 s vs 45 s target. The script was budgeted for eleven-v4 at 2.18 words/s; after HTTP 402 it was spoken by heygen at 2.9 words/s, but the checkpointed script was kept. | engine-1.log:18,42,59 | voice fallback vs word budget | V |
| whole | balance (block) failed in all 4 cuts, so no cut could be approved. Also: the ending holds 1.6 s (< 2 s); shot 2 is static ~2.5 s; the sand reads as a moon. | report.md | template layout | V (cause H) |

### How the maths error entered and survived
1. The reference text had the Atom article ("100 picometers") and a sand disambiguation page. Nothing converts mm to pm.
2. facts#1 had f4 = "about 10 million times smaller" (correct). Its calc was `1000000 / 100`, using the model's wrong f3 (1 mm = 1,000,000 pm). The engine rejected it: "...= 10000 ... write the computed value in the text" (writer.mjs:166). The same round dropped the only cross-check (hair = "a million carbon atoms") because numbersNotIn wanted digits for "1 million" (asset_reel.mjs:521-528).
3. facts#2 obeyed: f4 became "10,000 times smaller". f3 (calc "1 * 1000000") passes because 1e6 is in UNIT_FACTORS (writer.mjs:54,164). The check is arithmetic-only, with no units.
4. The yardstick (free text, never checked: writer.mjs:238,379) said "atom 1 m -> sand ~10,000 km, wider than Earth": right magnitude, false Earth claim.
5. Same pattern in the mirror-parable run: f9 "10,000 atoms across a hair" was accepted although it contradicts f3; the check rejected correct factors (1e-7, 1e12).
6. Spine checks fact ids, not numbers. The viewer (reads blind) scored 5/4/4/4.
7. The fact checker treated the sheet's 10,000x as true and "corrected" the right 10,000 km to "ten kilometers"; it never tested f3 despite factcheck.txt:10. fixClaims applied it; fix.txt:9 validates against the sheet; fix acceptance (writer.mjs:338,349) checks only word count, digits and the cue word, so a number not on the sheet got in.
8. The only deterministic arithmetic: the calc evaluation, text match and operand check (writer.mjs:157-167), plus "the payoff number is said" (:285-291). Nothing checks units, the yardstick, numbers in spoken lines, fact-check fixes or reviewer line notes.
9. Harness review is told to check against the sheet (review.txt:18) and gets facts without calc (src/review.ts:37). Review-1 asked for the 1,000,000 pm tag; review-2 wrote "1 mm vs 100 pm is 10,000-to-1"; review-3 changed line 7 to "ten thousand kilometers"; review-4 changed it back to "ten kilometers" and rewrote shot 3 as "one million picometers". No review questioned f3. The engine director ran 0 rounds (engine-1.log:1).
10. The visuals show the wrong numbers too: 1,000,000 pm tag, 10,000x chip, 10 km tag, 1:1 analogy drawing.
Why every check passed: each tests consistency with the sheet, or arithmetic on given numbers. None tests a unit conversion factor, and that was the one wrong thing; the one right number (10,000 km) was "fixed" to match the wrong ones.

### Root causes
- R1: no units in derived facts; the factor whitelist passes wrong factors and blocks right ones.
- R2: the mismatch message assumes the calc is right.
- R3: unchecked number entry points: the yardstick, fix outputs, review line notes.
- R4: every checker treats the sheet as truth.
- R5: the hook's cue is the last word; the shot prompt's "k<0: not yet" pattern hides everything until then; no check that the opening shows a subject.
- R6: pills are invisible to the overlap check.
- R7: plan `uses` stops shots from using existing assets (identity drift).
- R8: drawn sizes are never checked against the plan's R values.
- R9: the spine pairs points and facts loosely.
- R10: a voice fallback keeps the old word budget.
- R11: the hard 30% word cap fails runs (mirror-parable: drafts 172/148/133/130 vs budget 98, cap 127, "no usable script"); fitWords runs only after a script passes (writer.mjs:302,137,354).

### What works and why (preserve)
- Story order (establish, measure, compare, answer, analogy) comes from three rules working together: the template's beats (hook, yardstick, step, turn, answer, close); the spine's one point per shot with "so" links; the script's "one new number per line, never repeated". Each shot answers "how big is that?" from the one before, and the known thing (1 mm) comes before the unknown (100 pm).
- Pictures land on the word: cue words make tags pop as the number is said.
- A consistent visual grammar: name tag, dotted measuring line, number pill, one colour per object.
- A pause before the answer and a hold after it.
- Engine-computed derived facts are the right idea; they need units.

### Fixes proposed by the investigator (general)
1. Units in calc (writer.mjs ~54-167, facts.txt:20): the model writes `1 mm / 100 pm`; the engine converts with a small SI table, evaluates, compares with the text. Drop 1e6/1e9 from UNIT_FACTORS. ~20 lines.
2. Neutral mismatch message (writer.mjs:166): "one of calc or text is wrong; check factors and units first".
3. Yardstick derived, or only sheet numbers (writer.mjs factErrors, facts.txt:11).
4. No new numbers after the sheet: editShots/fixClaims (writer.mjs:338,349) and review line notes (src/review.ts readAnswer) reject numbers not on the sheet.
5. numbersNotIn reads "a million" as 1e6 (asset_reel.mjs:521).
6. Reviewer gets calc and the computed value (src/review.ts:37,261).
7. Shot 1 must show a subject at t=0.25 s (validateShot, stage_asset.html ~925); optionally the hook cue word in the first half of the line (script.txt:28).
8. Wrap KIT.tag/KIT.chip so pill boxes are recorded; reject intersecting pills (stage_asset.html ~818, ~960).
9. Offer every asset to every shot (asset_reel.mjs:674); shot.txt: never hand-draw a thing that has an asset.
10. Optional size check: drawn radius vs the plan's STAGE/COLUMN R values (reject >2x off).
11. Template (developer edit): an analogy recipe for the close, familiar things at true ratio.
12. Spine rule: a "but" turn carries its reason fact in the same shot.
13. Length: word overrun always soft so fitWords can cut; on a voice switch in cut 1, drop the script/plan checkpoints so the budget follows the new voice.

### Not verified
- The full facts#1 sheet was not saved; only the rejection quotes f4. f3 in it is inferred from the identical calc.
- Why fact check 1 skipped f3, and why review-2 misread the shot 4 sizes, are hypotheses.
- silencedetect speech segments match timeline.json within ~0.3-0.5 s (music blurs edges); word times are estimated from letter share.

---

## P. Pipeline: systemic causes (all 11 jobs, 38 engine logs)

Evidence in var/investigation-2026-11-27/inv-pipe/: all.log (38 engine logs joined), wrej.txt, shotrej.txt, classify.mjs, classify2.mjs, scripts/cuepos.mjs, scripts/drift.mjs, scripts/air.mjs.

Headline: none of the 11 jobs was approved; 0 of 37 reviews said approve; 0 of 16 sprite-sheet review rounds approved.

### Pipeline map
- intake: src/intake.ts (template from `## about` only, :39-47, 75).
- reference: asset_reel.mjs:99-133 (Wikipedia extracts).
- facts: writer.mjs:146-200, facts.txt.
- spine: writer.mjs:203-244, spine.txt (shot count, beat, point, link, device).
- script: writer.mjs:248-388, script.txt, fit.txt (lines, cue word, budget).
- viewer / factcheck / revise: writer.mjs:391-437, viewer.txt, factcheck.txt, fix.txt.
- plan: asset_reel.mjs:348-368, plan.txt (2-3 assets, a storyboard "idea" per shot).
- kit / assets / sheet review: asset_reel.mjs:569-646, 798-804, kit.txt, draw*.txt, sheet.txt.
- voice: asset_reel.mjs:422-448, audio.mjs.
- shots: asset_reel.mjs:647-679, shot*.txt; validateShot at stage_asset.html:920-1026.
- timeline and render: asset_reel.mjs:449-460, 692-715; stage render :784-805.
- engine director: asset_reel.mjs:717-739; off in the harness (--rounds 0).
- gates: src/gates/*.
- review: src/review.ts, review.txt.
- fix routing: job.ts:351-432, plus --apply-notes (asset_reel.mjs:742-763).
- best cut: job.ts:112-123.

### Systemic root causes
**1. Fact-list scripts (VERIFIED, MEASURED).**
- The word budget: seconds minus 0.95 s per shot, times the voice rate (asset_reel.mjs:35-38, writer.mjs:123). Over by more than 30% is a hard reject (writer.mjs:302), and fitWords only runs on scripts with soft errors.
  - Atom job 055821: 172 -> 148 -> 133 -> 130 words against 98, so "no usable script".
- fit.txt:9 keeps every fact and number and cuts "filler ... restated ideas".
- Templates say "One line per shot ... split it evenly" (kurzgesagt.md:82, globe-zoom-explainer.md:72).
- The writer forbids reusing a fact or phrase in another shot (writer.mjs:215-221, 78-95) and forces a link word (:211, :292).
- Each shot has a 0.35 s lead-in and a 0.6 s tail; speech never crosses a cut (asset_reel.mjs:452, 458).
- Measured on the final cuts: 1.0 lines per shot, 8-13 words per shot, 17-37% of each reel silent, a 0.95 s gap at every cut.
- Writer rejections: 91 in total. Word budget is 44 of the 55 script/revise rejections; one-fact-one-shot 14 of 18 spine rejections; derived calc 15 of 17 facts rejections.

**2. Maths errors (VERIFIED).**
- writer.mjs:54,157-167 only checks that calc evaluates to the number in the text. The free factors include 1e6/1e9, and scientific notation is rejected.
- Atom: 1 mm = 1,000,000 pm and "10,000 times smaller" passed every check and 4 reviews; review 4 proposed "A millimeter is one million picometers wide."
- Venus engine-4.log:4-26: the first sheet had 243 vs 225 days, and "write the computed value" turned it into "341.45 days, the combined length". The payoff-number check forced that number into the script.
- factcheck.txt:9 and review.txt:18 treat the fact sheet as true.

**3. Wrong subject (VERIFIED).**
- Intake gave Venus to globe-zoom (fit "good"); the hero is "the Earth" from h.landPath (globe-zoom-explainer.md:77-85), and the stage has Earth map data only.
- Notes-2 asked for Venus; review-2, judged against the same guide, asked to redraw "the actual orthographic Earth" (notes-3.json).
- Intake also sent the atom question to mirror-parable with fit "good".
- No check ties the hero asset to the brief's subject (checkProduction, asset_reel.mjs:251-270).

**4. Identity drift (VERIFIED).** At most 3 assets (asset_reel.mjs:254), and plan.txt:42 says everything else is drawn by each shot. Venus shot_5.js has its own drawSun/drawVenus.

**5. Late labels, end-loaded animation (MEASURED, VERIFIED).**
- Heygen is not aligned: all 62 voice passes logged "word timings measured for 0 of N lines", so every reel used letter-share times (audio.mjs:157-169). The letter-share error is small: mean 0.11-0.28 s, max 0.51 s on 4 heygen reels. NOT the cause.
- The cue word is the cause. Over 289 cues it sits at a median 0.68 of its line (51% in the last third), with a median 1.99 s of shot left (25% have <= 1.29 s).
- Templates chain delays after the cue: arrival 0.34 s, tag 0.2 s, line 0.4 s (kurzgesagt.md:50-51). Counters roll 1.0-1.4 s from the cue (globe-zoom-explainer.md:43).
  - Venus shot 5's counter lands at ~5.48 s in a 5.26 s shot, so it never lands.
- No validator checks that the cue's change finishes before the shot ends.
- The 0.2 s transition is a 4-copy horizontal smear entering each shot after the first (stage_asset.html:801-803).

**6. Clutter and overlap (VERIFIED).**
- There are no layout or label helpers; kit helpers are rewritten per reel by M3 from template prose.
- validateShot checks only text-vs-text and panel-vs-panel (:958-965). It never checks text against assets, and checks the caption band only for `captions: select` (:942).
- Half of the 332 rejected shot attempts are runtime crashes.

**7. Purposeless camera moves (VERIFIED).**
- The host zooms 3% over every shot (stage_asset.html:790).
- shot.txt:24 says "something moves in every frame"; the validator rejects a shot whose 55% and 80% frames match (:1017).
- 12 templates mandate "never still / every frame moves" (kurzgesagt.md:53, globe-zoom-explainer.md:41, 99).
- The alive gate still fails in nearly every cut.

### Constraints to loosen
- The 1.3x hard budget; one line per shot with an even split.
- One fact per shot, the no-repeat rule, the forced link list.
- Visual devices chosen by the writer (writer.mjs:26-39).
- Fixed beat orders: 13 of 17 templates say "in this order"; globe, mirror and countryball have fixed counts.
- The 0.95 s gap at every cut; the 2-3 asset cap.
- "Never still" drift mandates.
- Kurzgesagt's 7 px clamp, which draws a 1e7 ratio as 31x.

### Missing capabilities
- Unit-aware arithmetic with scientific notation.
- A check that the drawn subject is the named subject; things used in several shots kept as assets.
- Label anchoring that avoids asset boxes and the caption band.
- Measurement and true-scale comparison helpers, with nested zoom for huge ratios.
- A non-Earth planet renderer.
- Timing checks: the change lands >= 0.8 s before the shot ends; a label shows while its word is said.
- Aligned word times for non-ElevenLabs voices (low priority).
- A review that sees motion.

### Why review and repair fail
- **Packet:** 3 stills per shot at 20/55/92%, scaled to 270x480 (review.ts:26, 126-133). The reviewer can't see motion, sync, cuts between shots, small text or calc (the schema drops it, :28-43, 261). The same model family makes and reviews.
- **Routing:** only notes, template patch or voice. Nothing re-runs intake or changes facts, cues or storyboard.
  - Notes re-roll shot code, and 27 of 164 shot revisions failed validation and silently kept the old code (asset_reel.mjs:392-393).
  - A template round re-runs the writer and drops earlier notes rounds: Venus cut 1 had the correct 243/225 script, cut 4 inverted it.
  - Patches persist in the template for later jobs. The kurzgesagt patch targets a caption fade the host draws (stage_asset.html:800).
- **Oscillation:** notes flip between rounds (Venus globe Venus -> Earth; atom "ten kilometers" <-> "ten thousand kilometers"); the same complaint returns after notes (Nemo shot 7 rounds 3/4, Venus shot 5 rounds 2/4).
- **Selection:**
  - Facts are not a criterion: Venus cut 4 was selected although its own review says "central fact is inverted".
  - Kurzgesagt balance blocks 12 of 12 cuts (centre 0.39-0.41 vs a 0.42 threshold), so no kurzgesagt reel can be approved.

### Fixes at the source, simplest first (investigator)
1. **Templates (no §1 change):**
   - 2-3 lines per shot allowed;
   - label entrances start 0.3 s before h.cue(word); counters start rolling ~1.2 s before the first number word;
   - drop the "never still" drifts;
   - globe-zoom marked Earth-only in about (NOTE: the user wants globe-zoom widened to planets instead);
   - a kurzgesagt zoom chain for huge ratios instead of the clamp.
2. **Review packet (review.ts, review.txt):**
   - include calc, and say the sheet may be wrong;
   - frames at the cue time and cue + 0.8 s, plus full-resolution text crops;
   - the topic wins over the template when they conflict.
3. **Selection (job.ts:112-123):** a facts_ok review finding ranks correct cuts first.
4. **Harness facts gate (new, src/gates):** check unit conversions in facts.json and the lines against an SI table; catches the atom error without an engine edit.
5. **Intake and routing:** give intake each template's "not for" lines and check the subject's world; a re-intake fix route when a template can't depict the subject.
6. **Gates and patches:**
   - kurzgesagt balance -> info under the D23 rule;
   - keep a template patch only if the next cut scores better;
   - a look or shots patch must not re-roll the writer.
7. **Engine (needs §1 approval):**
   - unit-aware derived facts (writer.mjs:54, 157-167); fitWords may cut any overrun (:302); soften the reuse rules (:78-95, 215-221);
   - configurable lead and tail (asset_reel.mjs:452-458);
   - validateShot: text vs asset overlap, the caption band, cue timing (stage_asset.html:935-965);
   - helpers h.label, h.measure, h.scale;
   - a larger asset cap (asset_reel.mjs:254, plan.txt:42) and a subject-binding plan check (:251-270);
   - pause-aware word times (audio.mjs:157-169).

### §1 / §4.2 conflict (docs/design.md)
- Line 3: "Later sections never override §1; a change to a decision in §1 needs the user's approval and a dated line here."
- D1: "Its creative steps, prompts, validators and render are not improved or redesigned."
- D9: "The engine stays JavaScript; it gets only the edits in §4.2."
- §2 Out: "improving the engine's prompts, drawing, voice or music".
- §4.2: "Allowed engine edits (the only ones)" E1-E4; "Any other engine change is an architecture change: escalate."

Where problems live:
- Engine: writer rules, the maths check, timeline padding, helpers, validators.
- Templates: fixed structures, timing rules, motion mandates, the Earth-only globe.
- Harness: intake choice, the review packet and prompt, fix routing, selection, gate calibration, permanent patches.

---

## Ownership (fastreel vs cutroom-v2) and script-sketch removal

Evidence: var/investigation-2026-11-27/inv-own/:
- engine.diff, templates.diff (fastreel vs cutroom-v2, CRLF ignored);
- issue2/13/18.txt;
- frames/*.jpg (12-frame contact sheets: fastreel betel-kz-e2, ussr-e3, latlong-e4, planes-curve-e1; cutroom-v2 atom, nemo, norway).

### Diff classification (fastreel working tree vs cutroom-v2 5977c33)
| cutroom-v2 file | change | class |
|---|---|---|
| engine/asset_reel.mjs (root in fastreel) | import paths, VAR/TEMPLATE_DIR, default --out under $VAR/runs, voice cache under VAR | E1 |
| same | --cut and --apply-notes; director-round body becomes applyNotes(); redraws and changed lines saved to checkpoints | E2 |
| engine/lib.mjs | VAR, TEMPLATE_DIR, CUTROOM_ENV_FILE (was hard-coded C:/Users/XZNON/cutroom-v2/.env) | E1 |
| same | fonts URL allowed through; waits for document.fonts | E3 |
| audio.mjs, check_work.mjs | cache under VAR | E1 |
| stage_asset.html, stage3d.js, stage3d_lowpoly.js, prompts/plan.txt, prompts/plan3dlp.txt | @font-face rules and open font names | E3 |
| writer.mjs, photos.mjs, cost_report.mjs, three.js, world.js, the other 20 prompts, _base.md, every .log | byte-identical | none |
| templates | 14 reference-analysis paths now point at studio/refs (#2); font names in 15 templates (#16, E3); `gate <name>: info` lines in 16 templates (#13, D23) | import / E3 / D23 |
| studio/, .claude/skills/* | path rewrites only (reference-lab -> studio, reels -> var/runs) | import |

- No engine edit outside E1-E3; E4 was never needed.
- Not imported: classic/ (D14), reels/, cache/, references/*.mp4, and reference-lab/rea-video with its 332 MB .venv (editable install points at C:\Users\XZNON\fastreel\reference-lab\rea-video).

### Divergence since import
- fastreel: last commit d08cf42 (2026-11-26 23:27 IST); no PRs or issues.
  - Its uncommitted working-tree edits are dated 2026-11-26 23:50, before the import (e0cbf2c, 2026-11-27 02:53), and the import copied them.
  - Nothing has changed since 2026-11-27 00:00.
- cutroom-v2: only 3713298 (E2), 4e5b00b (E3 fonts) and 2a63883 (#13 gate lines) touch engine/, templates/ or studio/.
- The divergence is one-way: fastreel has nothing cutroom-v2 lacks.

### The problems already exist in fastreel (same engine, same kinds)
- **Facts and numbers:**
  - ussr-e3: the director flagged "Russia ... 16 million" (really ~147 M) and wrong dates; the final still shows "16M VS 0.5M".
  - countryball-map-story.log:85: "Wrong numbers the director kept ... -> engine: check ...".
  - globe-zoom-explainer.log:53,85: Dubai at Doha's longitude; a spoken 1.6 km over a 69.2 km counter.
  - planes-curve-e1: a 7,130 KM counter while the line says 5,923; Earth's radius used as the payoff counter.
- **Scale:** kurzgesagt log epochs 1-2: the Sun drawn 3x Earth (really 109x), Betelgeuse 20x the Sun (really ~700x); betel-kz-e2 final frames still show them at the same size.
- **Clutter and late labels:** kurzgesagt log: "tags piled up over each other", "the answer shot showed only the dotted line for its first half"; betel-kz-e2 has overlapping and clipped tags.
- **Wrong subject or identity:**
  - the Betelgeuse "bodies" asset drew the Sun as a generic Earth;
  - the Sun drawn as a crescent ("reads as a moon");
  - ussr-e3: the USSR ball in Spain's stripes (log fix: "engine: real flag data behind h.flag");
  - planes-curve: the "curved" route drawn straight.
- **Empty shots:** betel-kz-e2 has a frame with only a dotted line; shots "shipped anyway" after 6 rejections.
- **The 1 mm/pm error was checked nowhere.** writer.mjs:54-166 (identical in both repos) checks arithmetic only, UNIT_FACTORS accepts 1e6/1e9, and units are never compared; facts.txt and factcheck.txt have no unit or magnitude rule.
  - No fastreel reel ever exercised a unit conversion: only 5 of 21 used the writer, with derived facts like 41/10000, 1-1/10 and 1025-920. The bug was latent upstream.
- **Template wording alone didn't fix these kinds:** many logged fixes were engine or stage changes (lowpoly-cutaway 11, toon3d-story 10, breakdown 6, comic 6), and there are many "Engine limits met (not changed)" blocks.

### Who uses fastreel and the tools
- fastreel: nothing uses it; it is dormant. It actually depends on cutroom-v2 (its lib.mjs reads cutroom-v2/.env).
- /new-template and /fix-template live in both repos' .claude/skills (not ~/.claude/skills). The cutroom-v2 copies already use cutroom-v2 paths.
  - Leftovers: the descriptions still say "fastreel template"; new-template's engine file list is stale; fix-template says "Do not edit engine files ... without asking".
- reference-lab was imported as studio/. Only in fastreel: the 14 reference mp4s and the rea-video clone + venv. Until those are set up under studio/, rea-video survey/decompose and grade_reel.sh cannot run in cutroom-v2.
- run_reel.sh works in cutroom-v2, but it uses the original templates and a process scan instead of var/engine.lock.
- fastreel's 42 reels were the baseline for #13 (gate calibration) and #16 (fonts).

### Recommendation (investigator)
Repair in cutroom-v2 and freeze fastreel as a read-only baseline, with nothing propagated back. Split by layer inside cutroom-v2:
- templates (look, staging, label timing, beats): allowed today (D4);
- engine prompts, writer, validators and stage: need the decision change below;
- harness (gates, review prompt): already allowed.

Why:
- The repos have diverged: E2 restructured main(), fonts were renamed in the engine, prompts and 15 templates, 16 templates carry D23 gate lines, and studio and skills were re-pathed.
- There is no re-import script; #2 was a one-time copy, so every upstream fix would be done twice and re-ported with E1-E3 reapplied.
- fastreel is read-only for agents, has no tests or CI, and is dormant; cutroom-v2 has the tests, run records and template history.
- Templates alone cannot fix the fact, identity and maths kinds.
Prerequisite for template work: set up studio/rea-video and a fresh studio/.venv (apply studio/rea-video-patches); copy the reference mp4s to studio/references/ (gitignored).

### Decision lines that must change (user approval)
- D1: "One engine: fastreel's (KnowScroll/fastreel, private), imported into this repo. Its creative steps, prompts, validators and render are not improved or redesigned."
- D9: "... The engine stays JavaScript; it gets only the edits in §4.2."
- §2: "Out: new templates or new styles (developer work in studio/); improving the engine's prompts, drawing, voice or music; ..."
- §4.2: the heading "Allowed engine edits (the only ones)" and "Any other engine change is an architecture change: escalate."
- AGENTS.md: "engine/ is imported JavaScript: change only what design §4.2 allows, in its existing style, no refactors, no lint or type rules applied to it."
- Follow-ups (not decisions): the fix-template "Do not edit engine files..." line, the new-template engine list, the §3 engine/ line.
- Draft: "D24: Reel-quality repairs are made in cutroom-v2 (templates/, engine/prompts/, engine code); fastreel is frozen as a read-only baseline. E5: an engine repair is allowed when its issue names the failure with run evidence, keeps the §4.1 contract and checkpoints, and is verified by a real run or a re-render."

### script-sketch removal inventory
- **Remove:**
  - templates/script-sketch.md and .log;
  - docs/usage.md:118 (table row), and rephrase :97 (the CP5 example);
  - optionally a "deleted original" note in the usage.md sync list;
  - studio/briefs/dexter-wrong-serial-killer.md (the only studio brief, script-sketch only): delete or keep, user's choice.
- **Keep as records:** PROGRESS.md:58, the #13 table, the #18 report, the WSL WarmMate run and its index.jsonl line.
- **Tests:** none names the template; intake.test.ts asserts >= 15 templates and 17 remain. Nothing in src, its prompts, design, README or plan mentions it. Run npm run check after.
- **Dormant engine code (leave it):** keyed by `script: yes` and `reference: off`, which only script-sketch sets: writer.mjs:12, 97-110, 119, 254, 264, 270, 276, 304, 307-321, 355, 381-383, 407-409; asset_reel.mjs:773 and :744 (inside E2's applyNotes). Deleting it is outside §4.2 today.
- **Shared features to keep:**
  | feature | other templates using it |
  |---|---|
  | several speakers each with a voice; director speaker mapping (byVoice) | comic-story, countryball-map-story |
  | speech bubbles, anchors, mouth sync (stage_asset.html:632,663,798,1019; shot.txt) | comic-story, countryball-map-story |
  | character assets with pose and expression params; pose sheets | comic-story, countryball-map-story, toon3d-story-2d, low-poly, lowpoly-cutaway-explainer, minecraft, stick-figure |
  | gap_before pauses (_base.md) | all |
  | acting beat check | comic-story, countryball-map-story, stick-figure, toon3d-story, toon3d-story-2d |
  | hero size check | comic-story, low-poly, minecraft, toon3d-story, toon3d-story-2d |
  | background detail check | comic-story, low-poly, minecraft, toon3d-story-2d |
  | plain backgrounds (cut to black, title card) | any 2D template |
- **Why deleting the original is not enough:** syncTemplates (src/templates.ts:181-185, D15) logs "kept" for a working copy whose original is gone and keeps it. Intake lists from var/templates (intake.ts:39), the API accepts names from it (server.ts:101), and the engine reads CUTROOM_TEMPLATE_DIR. So script-sketch stays selectable in every existing var.
- **Current state:** both vars (C:\Users\XZNON\cutroom-v2\var\templates\ and WSL ~/cutroom-var/templates/) hold an unpatched copy equal to the original (sha 42c4739f...), with a patched:false manifest entry and no history. The WSL clone ~/cutroom-v2 is at bde64c0.
- **Clean removal:**
  1. Merge the PR.
  2. In each var, with no job running: delete script-sketch.md, remove its key from manifest.json, run `node src/cli.ts sync` and expect no "kept" line.
  3. git pull in the WSL clone.
  Then the API returns 400 for template script-sketch and the CLI says unknown template. Ad or sketch requests get the closest other template, flagged fit none.
- This one-off cleanup needs no decision change; making sync delete such copies automatically would change D15.
