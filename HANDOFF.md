# HANDOFF: repair reel quality in cutroom-v2

Start a new Claude Code session in `C:\Users\XZNON\cutroom-v2` and give it this file. It was written on 2026-11-27 by an investigation-only session. The build itself (issues #1-#18, CP1-CP5) is complete; its handoff is in git history (`git show 5977c33:HANDOFF.md`).

## 1. Objective

Make the engine produce reels that are coherent, accurate, visually meaningful, simple to understand and animated with purpose, across topics. Fix the generation capabilities, not individual videos.

The user's full requirements are in [docs/reel-quality-brief.md](docs/reel-quality-brief.md), verbatim. Read it first; it is the acceptance standard. The per-reel evidence and root causes are in [docs/reel-quality-findings.md](docs/reel-quality-findings.md); this file summarizes it and gives the plan.

## 2. Decisions already made (user, 2026-11-27)

- **D24, ownership:** repairs happen in cutroom-v2: engine code, prompts, stage, templates and harness. fastreel (`C:\Users\XZNON\fastreel`) is frozen as a read-only baseline, and nothing is synced back. This supersedes these rules:
  - D1's "not improved or redesigned";
  - D9's "only the edits in §4.2";
  - the §2 "Out" item "improving the engine's prompts, drawing, voice or music";
  - §4.2 "(the only ones)" and "Any other engine change is an architecture change: escalate";
  - the AGENTS.md `engine/` rule.

  Task T0 records it (wording in §11).
- **Real-run budget for this phase: 80 cuts.** A cut is one engine invocation that makes model calls; `--until script` counts. A re-render from checkpoints without model calls is free. Log every cut in PROGRESS.md in a new table. Going past 80 is a user escalation.
- **Remove the `script-sketch` template** (brief §E).
- **globe-zoom-explainer must support other planets** and other appropriate subjects, not only Earth (brief §A, §10). This widens the template's scope on the user's explicit request.
- **Still in force:**
  - all other design §1 decisions (D2-D23);
  - AGENTS.md (keys, kill only your own pids, never `npx` a bare name, one engine run at a time);
  - no image or video generation models;
  - the programmable canvas approach;
  - "Lightweight. Fast. Simple.";
  - no silent fallbacks.

## 3. Constraints for every change

- Fix the cause at its source, once, in the shared layer when several templates share it. No topic-specific code, assets, coordinates, timings or placements: nothing Venus, Moon, Sun, Norway, Nemo or atom.
- **Deterministic checks are for objective failures:** units and arithmetic, geometry overlap, visibility, NaN, timing against the voice, a subject that is never drawn. **Model judgement is for creative choices.** Don't add creative gates; loosen mechanical rules that choke the story.
- **No new subsystems or dependencies** unless an issue justifies one. Prefer deleting a bad rule to adding a new one.
- **Engine JS** keeps its existing style, still without lint or type rules (D9 otherwise stands). Where a deterministic engine function can be tested from `test/` with node:test (unit conversion, globe clipping maths, validator geometry), add a test.
- **Harness TypeScript:** `npm run check` must pass. Tests check behaviour.
- **Templates:**
  - The originals in `templates/` are edited by developers and issues, never by the harness.
  - Working copies in `$CUTROOM_VAR/templates/` are reset after an original changes (delete the copy, then `node src/cli.ts sync`).
  - Test new rules first on a working copy or a scratch template file, then edit the original in the PR.

## 4. Where things live

| stage | files |
|---|---|
| intake (template choice, audience, goal, tone, seconds) | `src/intake.ts`, `src/prompts/intake.txt` |
| reference (Wikipedia) | `engine/asset_reel.mjs:85-133` (fetchArticles, fetchPassages) |
| facts, spine, script, viewer, factcheck, revise | `engine/writer.mjs`, `engine/prompts/{facts,spine,script,fit,viewer,factcheck,fix}.txt` |
| word budget and shot timing | `engine/asset_reel.mjs:30-38, 449-460` |
| plan and storyboard, kit, assets, sheet review | `engine/asset_reel.mjs:251-270, 348-368, 560-646`, `engine/prompts/{plan,kit,draw,poses,sheet}.txt` |
| voice and word times | `engine/audio.mjs` (`speak`, `wordTimes` :157-169) |
| shots (model-written canvas JS) and their validator | `engine/asset_reel.mjs:647-679`, `engine/prompts/shot.txt`, `engine/stage_asset.html` (`validateShot` :920-1026, helpers, `globeFill` :137, cover check :637-643, render :784-805) |
| geography data | `engine/world.js` (Natural Earth, Earth only) |
| notes rounds (`--apply-notes`), kept code | `engine/asset_reel.mjs:380-395, 742-763` |
| gates | `src/gates/basic.ts`, `src/gates/frames.ts` |
| review (M3 vision) | `src/review.ts`, `src/prompts/review.txt` |
| fix loop, routing, best cut | `src/job.ts` (`bestCut` :106-123, `checkNotes` :148, rounds :351-432) |
| template store, patches | `src/templates.ts` |
| templates | `templates/_base.md`, `templates/<name>.md` |

## 5. Findings per reel (summary; timestamps in the selected cut)

Full tables with evidence: docs/reel-quality-findings.md. The frames and the selected cuts' extracted shot code are in `var/investigation-2026-11-27/` (gitignored, this machine). The reels are copied in `var/reels-to-watch/`.

**A. Venus, globe-zoom** (`var/runs/20261127-013542-…`, cut 4)
- 0-43 s: Earth (Africa) labelled "VENUS"; no Sun, orbit or other planet. Intake chose an Earth-only template and rated the fit "good"; nothing checks that the drawn subject is the brief's subject. **V**
- Narration inverts the brief ("day shorter than its year", an invented sum of 341.45). The derived-fact message "write the computed value in the text" rewrote a correct claim to fit wrong arithmetic. **V**
- 0-4 s: title and voice disagree; the fact checker, which never sees the brief, flipped the hook. **V**
- 18-24 s: 5 s of a blank sphere; the shot's camera is NaN and nothing catches it. **V**
- 29-35 s: counters read "0 D" while 341.45 is spoken; cues sit at 90-94% of their line. **V**
- Selection picked inverted cut 4 (score sum 18) over factually correct cut 1 (17). **V**
- The reviews flip-flopped Venus / Earth / Venus and patched the shared template (the Windows working copy is still patched). **V**

**B. Walk to the Moon, kurzgesagt** (`var/runs/20261127-002302-…`, cut 2)
- 10.4-16.5 s: Moon drawn on top of Earth while "378,000 km away" is said; both wait for the cue "away", the last word. **V**
- 16.9-21.5 s: number tags 3 s late and on screen < 1 s. **V**
- 17-28 s: Earth:Moon ratio changes per shot; never to scale (the hero-size check pushes single bodies bigger). **V**
- 34-41 s: column clutter: radii in 955 px overlap by 158 px. **V**
- Maths:
  - 378,000/5 km/h = 75,600 h = 8.6 years non-stop (8.8 with 384,400 km);
  - "not inside one lifetime" is false (that claim came from the intake goal);
  - the "2,442 hours longer" derived fact mixes days and hours.
  Fact check 2 caught the lifetime claim, but the fix step changed nothing and still logged a rewrite. **V**
- 4-10 s: walker has no walking pose; 9 s: a speed tagged as a distance. **V**

**C. How big is the Sun, kurzgesagt** (WSL `20261127-024513-how-big-is-the-sun`, cut 3)
- 2.5-11 s: tags pop over an empty stage (timed from line start; objects wait for the last-word cue); "12,700 km" never visible. **V**
- 11-21 s: Sun cropped. The template's own big-body recipe (`fillRect` inside a clip) trips the stage's "solid rectangle" cover check, so every body over ~R 394 is rejected, and the fallbacks crop or shrink. **V**
- 21-27 s: "109 Earths" said, never shown: shot 6 scales twice (Earths 0.05 px) and uses a diameter as a radius; no check that planned things are visible. **V**
- Sun shots 3-5 are cut 1's failing code carried forward. The `shipped_failing` gate reads only the current cut's log, so they passed. **V**

**D. Norway 1905, countryball-map-story** (WSL `20261127-031544-…`, cut 3)
- 3.9-7.9 s: Sweden drawn twice; 43-48.5 s: Sweden's ball exactly on Norway's; 34-38.8 s: a paper covers Norway. No validator compares characters, props, labels or bubbles; identity is tracked by asset id ('ball'), not by country. **V**
- Interactions: the ball has 5 single-body poses and no hand points, so negotiation, union, split and handover all render as two balls side by side. 11 of 14 shots share one view and sign layout. **V**
- Facts wrong:
  - "7 June 1905, power passed to the Storting" and the 72-5 vote happened in 1814;
  - "6 JUNE 1905" is invented;
  - the referendums, Karlstad and the 26 Oct recognition are missing.
  Causes: the model guessed the article title wrong and there is no search fallback; passages are glued together without section headings, which mixed the eras. **V**
- 38.8-43.3 s: a failed redraw silently shipped stale code whose cue word is no longer spoken. **V**
- Audio and caption sync is good (within 0.2 s).

**E. script-sketch: remove.** Inventory in the findings doc §Ownership:
- the original and its `.log`, the usage.md rows, and an optional studio brief;
- **plus the working copies in both vars**, because sync keeps a copy whose original is deleted (D15).

Shared features it uses stay: multiple speakers, bubbles, poses, gap_before. Its dormant engine branches (`script: yes`, `reference: off`) can stay, or be deleted now that D24 allows it.

**F. Point Nemo, globe-zoom** (WSL `20261127-042300-…`, cut 3)
- 0.7-3.5, 20-21.5, 23.5, 40.5-45 s: land and ocean swap colours. A `globeFill` bug (`stage_asset.html:137-145`) pushes hidden points to the rim, so a continent straddling the horizon wraps the disc and the even-odd fill inverts. Replayed by the investigator, and the orchestrator saw it in the frames. **V**
- 8-11.5 s: ring wider than the frame; 19-23.5 s: the three landmasses are never shown together (template "max 2 lines/markers"). **V**
- "2,688 KM" shown up to three times and lingering: a one-number fact sheet against a template that wants four coloured numbers (the template has no story section). **V**
- Purposeless camera moves (the template's "move every shot" rule plus the host's 3% zoom on every shot). **V**
- Review-written lines skipped every writer check: the banned word "remarkable", stale cues. **V**

**G. Atom vs grain of sand, kurzgesagt** (WSL `20261127-060125-…`, cut 2). The positive reference, and also a factual failure.
- **What works:** establish, measure, compare, answer, analogy; one new number per line; tags that pop as the number is said; one visual grammar (name tag, dotted line, number pill, one colour per object); a pause before the answer. Keep it.
- **Maths:**
  - "1 mm = 1,000,000 pm" (true 10^9), so "10,000 times smaller" (true ~10^7) and the "10 km" analogy (true ~10,000 km).
  - It entered at the facts step: the derived-fact check accepts 1e6 as a free "unit factor" and checks no units. The first draft had the right 10 million; the mismatch message made the model rewrite it to 10,000.
  - The fact checker "corrected" the one right number to match. Four reviews and the viewer passed it, because every checker treats the fact sheet as truth and none sees `calc`.
  **V**
- 0-3 s: only stars (the cue is the last word); 12.6-16.3 s: the atom drawn as big as the sand; 13-18.5 s: pills overlap (the kit's tag pills are not tracked by the overlap check). **V**
- 31-33 s: the sand changes look; the plan's `uses` list keeps the asset from shot 7, so the shot hand-draws it. **V**
- Reel is 33 s for a 45 s target: the script was budgeted for eleven-v4, then voiced by heygen after a 402. **V**
- `balance` (block) fails in every kurzgesagt cut (centre 0.39-0.41 against 0.42), so no kurzgesagt cut can ever be approved. **V**

Overall: 0 of 11 jobs approved, 0 of 37 reviews approved.

## 6. Positive behaviours to preserve

- The atom reel's structure and visual grammar (above).
- Cue-synced pops when the cue is placed well.
- Real Natural Earth geometry and the Wikipedia coordinate check (Nemo's islands were placed correctly).
- Continuous camera between shots.
- Counter roll-and-pop with colour coding (Nemo 15.5-17 s).
- Correct flags and fills.
- The sign flip; per-line expressions.
- Audio and caption sync, and the voice and music gates.
- Validators that work: text overflow, text-vs-text overlap, "not animated", unbalanced save/restore, full-frame fills, cue word missing, repeated numbers.
- The writer's derived-fact idea (the engine does the arithmetic); the test viewer's diagnoses (it spotted the Norway chronology and the Moon's non-stop assumption).
- Concrete, timestamped review notes.
- Cheap cuts: $0.03-0.30.

## 7. Verified root causes (cross-cutting)

Each cause names the reels that show it and the evidence. Details and line numbers are in the findings doc.

| # | root cause | seen in | layer |
|---|---|---|---|
| RC1 | **Facts and maths:**<br>- the derived-fact check tests arithmetic only, and its `UNIT_FACTORS` whitelist includes 1e6/1e9 (`writer.mjs:54,157-167`);<br>- the mismatch message assumes `calc` is right;<br>- free-text numbers are never checked (the yardstick, facts.answer, the intake goal, fix outputs, review line notes);<br>- every checker treats the sheet as truth;<br>- the fact checker gets no brief and no `calc`, and its fixes are accepted on word count and cue only. | G, B, A | engine writer, harness review |
| RC2 | **Reference retrieval:** no search fallback for a wrong article title; passages lose their section headings (eras mix); the first article found gets the small budget (`asset_reel.mjs:85-133`). | D, A | engine |
| RC3 | **Mechanical script rules choke the story:**<br>- a hard reject at 1.3x the word budget, with `fitWords` only after a pass;<br>- one line per shot, split evenly;<br>- one fact per shot, no reuse, forced link words;<br>- fixed beat orders (13 of 17 templates);<br>- revision must keep the spine;<br>- a 0.95 s dead gap at every cut;<br>- a voice fallback keeps the old voice's budget.<br>Measured: 1.0 lines per shot, 17-37% silence; 44 of 55 script rejections are word budget; the atom's first post failed "no usable script". | all | engine writer, templates |
| RC4 | **Cue placement:** the cue word sits at a median 68% of its line (51% in the last third, median 1.99 s of shot left), and templates chain delays after it. So objects and labels arrive late, openings are empty and counters never land. Not voice drift: letter-share word times are off only 0.1-0.5 s. | B, C, A, F, G | script prompt, templates, validator |
| RC5 | **Subject binding and scope:** intake rates out-of-scope templates "good" and has no subject-kind check; no check that the drawn hero is the brief's subject; the places check skips names without coordinates; the review can't route back to intake; globe-zoom is Earth-only (world.js). | A (also atom→mirror-parable) | harness intake/review, engine plan check, stage |
| RC6 | **Asset identity:** a 2-3 asset cap, and the plan's `uses` limits which assets a shot may use, so shots hand-draw known things. TRACK keys the asset id, not the character, so duplicates pass. Pose states drop the flag params. Drawn sizes are never checked against the plan. | D, G, A | engine plan/shot prompt, stage |
| RC7 | **Composition blindness:** the validator checks text-vs-text and panel-vs-panel only. It does not track kit tag pills, never compares asset/asset, asset/label or bubbles, checks the caption band only for `captions: select`, and lets NaN pass. Bubbles are placed blind. No helper anchors a label or measurement to its object. | D, G, B, C, F | stage, shot prompt |
| RC8 | **Validators that push the wrong way:**<br>- the cover check counts a clipped `fillRect`, so big bodies can't pass (its rgba regex is also missing its backslashes);<br>- the 380 px hero-size rule distorts true scale;<br>- "something moves in every frame", the same-frames rejection, the host's 3% zoom and template "never still" rules produce purposeless motion. | C, B, F, all | stage, shot prompt, templates |
| RC9 | **Stage bugs:** the globeFill inversion; mixed return shapes in the template's view/frame helpers led to a NaN camera. | F, A | stage, template |
| RC10 | **Review and repair can't see or fix causes:**<br>- 3 stills per shot at 270x480: no motion, sync, continuity, small text or `calc`;<br>- notes re-roll code, and a failed redraw silently keeps stale code (27 of 164);<br>- kept code is not revalidated against changed lines or cues;<br>- review-written lines skip the writer's checks;<br>- a template round re-rolls the writer and drops notes;<br>- patches persist and can widen scope;<br>- notes oscillate between rounds;<br>- `shipped_failing` reads only the current log;<br>- selection ignores facts;<br>- kurzgesagt `balance` blocks every cut. | all | harness review/job/gates, engine applyNotes |
| RC11 | **Template rules that fight stories:** fixed sequences and counts; "max N markers"; camera every shot; the close repeats counters; a fixed sign composition (countryball); kurzgesagt as a one-quantity size chain with no device for "N fit across" or journeys; templates that name the narrator by voice. | all reviewed | templates |

**Ownership evidence:** the same failure kinds appear in fastreel's own reels and logs: wrong numbers, the Sun drawn 3x Earth, piled-up tags, wrong-subject assets. So they were not introduced by the import (cutroom-v2 changed only paths, flags and fonts: E1-E3).

## 8. Unresolved hypotheses (check before building on them)

- H1. Last-word cues plus `gate alive: info` (17 of 19 templates) make thin animation in every template, not just the reviewed ones.
- H2. Templates that name the narrator by voice (chris, george, ...) cause "not anchored" rejections broadly; this is verified only in Venus cut 1.
- H3. Half of the 332 rejected shot attempts are runtime crashes. The cause is unknown (API shape mismatches like kit.view/kit.frame?). Classifying them would show which helper contracts are unclear.
- H4. Why fact check 1 skipped f3 (atom), and why review 2 misread the atom/sand sizes. Same-model blindness or packet resolution?
- H5. Whether the 0.2 s 4-copy smear transition hurts comprehension, or is fine as a style.
- H6. Whether a stronger or different review model is needed, or the M3 review is enough once it sees the right frames and data. Changing the reviewer model is a §1 decision: escalate with evidence if so.
- H7. Whether the free re-render path (copy a run folder, `--cut <n> --apply-notes <empty notes>`, as #9/#16 did) re-renders all shots from the checkpoints with no model calls. Verify in `applyNotes` before relying on it for free verification.

## 9. Ownership: repairs in cutroom-v2 (approved as D24)

- **The engine has diverged:** cutroom-v2's engine is fastreel's plus E1 (paths/env), E2 (`--cut`, `--apply-notes`, which restructured `main()` into `applyNotes`) and E3 (fonts); 16 templates have D23 gate lines and 15 have font renames; studio and skills are re-pathed.
- **fastreel is dormant:** no change since 2026-11-27 00:00, no tests or CI, read-only for agents. Its `lib.mjs` even reads cutroom-v2's `.env`.
- **The faults are not import-made:** the same kinds already exist in fastreel's reels, and the 1 mm/pm bug was latent there (no fastreel reel ever did a unit conversion).
- **cutroom-v2 has what repairs need:** the tests, CI, run records, template history and harness.
- **Propagation:** none. fastreel stays the frozen baseline for comparison.
- **Leftovers to tidy when touched:** the `/new-template` and `/fix-template` skill texts still say "fastreel" and "do not edit engine files"; rea-video, its venv and the 14 reference mp4s exist only in fastreel. Set them up under `studio/` only if a template task needs reference analysis.

## 10. Repair strategy

Fix in this order, because each layer feeds the next:

1. **Facts and story.** A wrong or disconnected script can't be rescued visually (brief §3, §4).
2. **Shared stage and validators.** Remove the false rejections and blind spots that force bad code.
3. **Planning and identity.** Plans say what each shot must show; known things stay assets.
4. **Templates.** Rules become capabilities, not fixed sequences.
5. **Review, repair and selection.** These see what matters and route fixes to causes.

Verify each layer as cheaply as possible:
- deterministic unit tests;
- free re-renders of existing checkpoints (H7);
- `--until script` runs (cheap, but they count as cuts) read by a fresh reviewer;
- single cuts (`--rounds 0`);
- full jobs only at the end.

## 11. Tasks

Create one GitHub issue per task, with the AGENTS.md headings, in a new milestone "Q: Reel quality". **Owner** names the workstream; one agent owns a file set at a time.

**`engine/asset_reel.mjs` is shared by T2, T3, T4 and T6:** run those edits one after another, or give one agent the whole file for that period.

| task | what | files | owner (model) | depends on |
|---|---|---|---|---|
| **T0** | **Set up:**<br>- record D24 as a dated line in design §1, and amend D1, D9, §2 Out, §4.2 and AGENTS.md. Wording: "D24 (2026-11-27, user): reel-quality repairs are made in cutroom-v2: engine code, prompts, stage, templates and harness. fastreel is frozen as a read-only baseline. An engine change needs run evidence of the failure in its issue, keeps the §4.1 contract and checkpoints, and is verified by a test, a re-render or a real run.";<br>- add a PROGRESS.md phase section with the 80-cut table;<br>- reset the patched working copies (Windows `var/templates/globe-zoom-explainer.md` and `kurzgesagt.md`; WSL `~/cutroom-var/templates/globe-zoom-explainer.md`: delete, then `sync`);<br>- check voice credit (free heygen ends 2026-11-30; OpenRouter was low and eleven-v4 returned 402). | docs, PROGRESS, var | orchestrator | none |
| **T1** | **Facts and maths:**<br>- units in `calc` (the model writes quantities with units; a small SI table converts them; drop 1e6/1e9 as free factors; accept scientific notation);<br>- a neutral mismatch message ("one of calc or text is wrong; check factors and units first; never change the claim to fit");<br>- every number spoken or shown must trace to the sheet or a derived fact (the yardstick, facts.answer, fix outputs and review line notes included);<br>- give the fact checker the brief and `calc`, and have it report conflicts instead of flipping the premise;<br>- fix acceptance checks numbers, not just word count;<br>- dates: a full date in a fact must appear as one unit in the reference. | `engine/writer.mjs`, `engine/prompts/{facts,factcheck,fix}.txt`, `engine/asset_reel.mjs` (numbersNotIn) | writer (opus) | T0 |
| **T2** | **Reference retrieval:** a Wikipedia search fallback for missing titles; passages keep their section heading; the main article gets the larger budget. | `engine/asset_reel.mjs:85-133` | writer (opus) | T0 |
| **T3** | **Story and script freedom:**<br>- the word overrun becomes soft (`fitWords` cuts any draft), and a voice switch recomputes the budget;<br>- allow several lines per shot and uneven splits; soften one-fact-per-shot and no-reuse to "no pointless repetition"; drop the forced link-word list;<br>- chronology: dated facts move forward outside an explicit flashback; revision may change the spine when the viewer is lost;<br>- a configurable lead and tail per shot instead of a fixed 0.95 s gap;<br>- the writer says what the story is for before the beats.<br>Keep the atom reel's good structure; read 6-8 scripts on their own before and after. | `engine/writer.mjs`, `engine/prompts/{spine,script,fit,viewer}.txt`, `engine/asset_reel.mjs:30-38, 449-460` | writer (opus) | T1 |
| **T4** | **Cues and timing:**<br>- the cue is the word where the thing first matters, normally in the first two-thirds of the line;<br>- a validator rejects a shot whose cue-driven change can't land at least ~0.8 s before the shot ends, and a label or number that appears before its object is visible or more than ~0.5 s after its word;<br>- use real word times where the voice gives them; keep letter-share otherwise (measured error is small). | `engine/prompts/script.txt`, `shot.txt`, `stage_asset.html` validateShot | stage (opus) | T3 for the prompt part |
| **T5** | **Stage bugs and false rejections:**<br>- globeFill clips each outline at the horizon and joins along the rim arc (with a test);<br>- the cover check respects the clip, and its rgba regex is fixed;<br>- the hero-size rule becomes relative ("scale things together; the subject reads clearly");<br>- NaN in `h.asset`/transforms is an error;<br>- a failed redraw is logged and flagged as shipped-failing, never silent; kept code is revalidated against changed lines and cues. | `engine/stage_asset.html`, `engine/asset_reel.mjs:380-395, 742-763` | stage (opus) | T0 |
| **T6** | **Composition and identity:**<br>- the validator tracks the boxes of assets, kit tag pills, labels and bubbles; rejects unintended overlaps over a threshold and text in the caption band; flags a character drawn twice (`h.asset` takes a `who`); flags a planned thing never visible; and requires the opening to show the subject;<br>- helpers for an anchored label, a measurement between two things and a true-scale comparison, kept small;<br>- the asset cap raised, and every asset offered to every shot ("never hand-draw a thing that has an asset");<br>- bubbles placed to avoid faces and other bubbles;<br>- pose states keep their params; `h.asset` returns hand points. | `engine/stage_asset.html`, `engine/prompts/{shot,plan,poses,draw}.txt`, `engine/asset_reel.mjs` (plan checks :251-270, assetCatalog :674, :564) | stage (opus) | T5 |
| **T7** | **Purposeful motion:** remove "something moves in every frame" and the same-frames rejection, or make them judge "nothing happens while the line says something should"; make the host zoom optional per template; motion rules state purpose ("move to show something new"). | `engine/prompts/shot.txt`, `stage_asset.html:790, 1017`, templates | stage (opus) | T5 |
| **T8** | **Plan says what each shot must show:** per shot, the claim being explained and the demonstration (relation, comparison, journey, interaction) with its start and end states; a subject-binding check (the hero asset is the brief's subject; a named place or body that can't be located is a plan error, not skipped). | `engine/prompts/plan.txt`, `engine/asset_reel.mjs:158, 251-270` | planner (opus) | T6 |
| **T9** | **Harness intake, review, repair and selection:**<br>- **intake:** a subject kind, matched against each template's "For"/"Not for" (the about text), with fit none on a mismatch; the goal never predicts the answer;<br>- **review packet:** frames at each cue and cue +0.8 s, full-resolution text crops, `calc` and unresolved fact-check problems; the brief wins on facts and the template on style; identity and occlusion checks; captions are the engine's; a `wrong_template` verdict that re-runs intake;<br>- **line notes:** go through the writer's checks;<br>- **template rounds:** a story patch only re-rolls the writer; a look/shots patch must not; a patch is kept only if the next cut is better; patches may not widen a template's purpose;<br>- **selection:** a factual error counts as blocking;<br>- **gates:** `shipped_failing` carries unchanged failing shots forward; re-check kurzgesagt `balance` by the D23 rule after T6. | `src/intake.ts`, `src/prompts/*.txt`, `src/review.ts`, `src/job.ts`, `src/gates/*`, design §6 | harness (opus; sonnet for routine parts) | T1 for the calc fields |
| **T10a** | **kurzgesagt:**<br>- fill the silhouette, not `fillRect`;<br>- measurement and tag anchored to their thing;<br>- tiny things as a bright dot plus a callout;<br>- scale devices chosen by the story (a zoom chain for huge ratios, N copies across, a familiar-object analogy at true ratio);<br>- a column only for one quantity;<br>- a journey device (distance over speed over time), or move such requests to "Not for";<br>- relax fixed rows and beats;<br>- the close shows the analogy.<br>Atom-reel regression. | `templates/kurzgesagt.md` | templates (opus) | T5, T6, T8 |
| **T10b** | **globe-zoom:**<br>- a generic body renderer (any planet or moon: base colour, bands, craters, clouds; Earth keeps real geography), with the about widened accordingly;<br>- markers and lines as the story needs;<br>- the locate zoom keeps context; measurements fit the frame;<br>- counters only with their lines; the camera moves only to show something new;<br>- a story section saying which numbers are needed;<br>- name the narrator "narrator";<br>- consistent helper return shapes. | `templates/globe-zoom-explainer.md`, stage helper if needed | templates (opus) | T5, T6, T8 |
| **T10c** | **countryball:**<br>- a relation per two-ball shot (ask/refuse, argue, join, split, hand over, sign), each with its own staging;<br>- give, receive and turn-away poses; hand points;<br>- the sign only where it carries the story; view variety; the union as one fill until it ends; balls stay on their countries;<br>- document view.r. | `templates/countryball-map-story.md`, `engine/prompts/poses.txt` if needed | templates (opus) | T6, T8 |
| **T10d** | **Remove script-sketch**, using the inventory in the findings doc. | templates, docs/usage.md, both vars | sonnet | T0 |
| **T10e** | **Audit the other 14 templates** for the RC3/RC8/RC11 rules ("never still", fixed beats, one line per shot, narrator named by voice); make only the needed edits. | templates | templates (sonnet, opus review) | T3, T7 |
| **T11** | **Regeneration and audiovisual acceptance** (§13, §14). | runs, reviews | orchestrator + fresh AV reviewers (opus) | all |

**Parallel lanes:**
- After T0: T1→T3 (writer) runs alongside T5→T6→T7 (stage), with T2 slotted between writer edits.
- T9 (harness, `src/`) runs in parallel with both.
- T8 follows T6; T10a-c follow T8; T10d any time; T10e after T3 and T7.
- At most 3-4 implementers at once.

## 12. Checkpoints

| checkpoint | what is checked | cost |
|---|---|---|
| **QC0** | T0 done: D24 recorded, vars reset, voice credit known, PROGRESS phase table. | free |
| **QC1, scripts** | After T1-T3: `--until script` for the 7 original briefs (the WarmMate ad included, to see where it routes once script-sketch is gone) and 6 new briefs. A fresh reviewer reads each script on its own and the fact sheet with its arithmetic: coherent? true? cues early? Compare against the current scripts. | ~13 cuts |
| **QC2, stage** | After T5-T7: unit tests for globeFill, units and validator geometry. Use the selected cuts' saved shot code (`var/investigation-2026-11-27/inv-*/…code…`) as fixtures, where it is small and generic: the validator must now flag the atom pill overlap, the Norway duplicate Sweden and the Moon/Earth overlap, and must stop rejecting a big kurzgesagt body. Free re-renders where H7 holds. | free |
| **QC3, originals** | After T8-T10: one single cut (`--rounds 0`) for each original brief (A, B, C, D, F, G); full audiovisual review (§14). | ~6-12 cuts |
| **QC4, new topics** | ≥ 8 untried topics across kurzgesagt, globe-zoom and countryball, plus 3 other templates for regression; AV review. | ~12-16 cuts |
| **QC5, acceptance** | 5 full API jobs with fix rounds (the old #18 shape), including the atom brief as the regression reference; the AV review signs off on §15 below. | ~20 cuts |

Budget: about 60-70 of 80, leaving a reserve for repair iterations. Log every cut.

**New-topic ideas** (pick substantially different ones; don't optimize against them):
- **Scale:** Jupiter vs Earth; a virus vs a hair; a blue whale's heart vs a car; Burj Khalifa vs the Eiffel Tower.
- **Distance:** Proxima Centauri.
- **Planets and Earth places:** Olympus Mons on Mars (another planet); the Mariana Trench; why Iceland has so many volcanoes.
- **History:** German reunification 1990 (a union); Panama leaving Colombia 1903 (a separation with a third party); the Louisiana Purchase (a sale/handover).
- **Regression on other templates:** reruns of the CP5 microwave (lowpoly-cutaway) and the Fresnel lens (breakdown-explainer) briefs, and one dan-koe idea.

## 13. Testing and regression

- **Unit tests** for every deterministic piece (unit conversion, number tracing, globe clipping, overlap and timing checks, intake scope check, selection with fact errors). `npm run check` stays green; CI on every PR.
- **Before and after** for each task: the issue states the failing evidence from the findings doc, and the PR shows it gone, with a frame, a log line or a test.
- **Intermediate artifacts first:** facts.json, spine, script, plan.json, shot code and logs show which stage failed before anyone watches the mp4.
- **Positive reference:** the atom reel's structure and look must survive (QC3/QC5 compare side by side), with its maths fixed.
- **No re-rolling to a pass:** a failure found in review gets a cause (stage and file) before any rerun.

## 14. Audiovisual review protocol (every QC3-QC5 reel)

The reviewer is a fresh Opus agent that did not implement the change. Give it the reel, the run folder and the brief, not the implementer's conclusions.

1. Read the script and fact sheet on their own first. Is it a story worth hearing? Recompute every number and unit.
2. Watch the whole timeline:
   - contact sheets at 2-4 fps with timestamps, plus full frames at each cue and shot change;
   - the narration via the captions, plus `silencedetect` for the real speech times against `timeline.json`.
3. For each shot, check:
   - does the picture show what the line says, when it says it?
   - is the right subject drawn, and drawn consistently?
   - do labels and measurements sit on their objects?
   - is there any unintended overlap or crop?
   - does every movement have a reason?
   - does it stay visible long enough?
4. The ordinary-viewer test: what is explained, can you follow it, what is the takeaway?
5. Report issues with a timestamp, evidence, the stage of origin, and verified or hypothesis. Separate objective failures (facts, wrong subject, overlap, timing) from creative preferences.

## 15. Acceptance (the brief's §14, made checkable)

The phase is done when all of these hold:
- T0-T11 are closed with their `Done when` verified on main, and CI is green.
- The QC5 reels and the QC4 new topics pass the §14 protocol with no objective failure: no wrong number or unit, no wrong subject, no unintended overlap or crop of the subject or its label, no label more than ~0.5 s from its word, no shot where the narrated thing never appears, and no purposeless camera move called out.
- The brief's §14 list holds for each: a coherent story, consistent information, the important concepts shown, meaningful animation, legibility, consistency, and generalization to the new topics.
- The atom regression keeps its structure and visual grammar.
- script-sketch is gone from `templates/` and both vars.
- PROGRESS.md logs ≤ 80 cuts.
- The user gets a report: per reel, a before/after note, the AV verdict and the cost; plus remaining limits and next steps.

## 16. Start the new session

1. **Read:** this file, then `docs/reel-quality-brief.md`, `docs/reel-quality-findings.md` (skim, then return per task), `AGENTS.md`, `PROGRESS.md`, and design §1, §4 and §6.
2. **Preflight:**
   - `main` is clean and CI green; `npm run check` passes;
   - `.env` key names are present (never print values);
   - WSL: `~/cutroom-v2` is pulled and `~/cutroom-var` is usable;
   - no stale `engine.lock`.
3. **Do T0 yourself.** Then create the issues T1-T11 with the AGENTS.md headings, and start the parallel lanes.
4. **Run the old orchestration loop** (`git show 5977c33:HANDOFF.md`, "The loop"):
   - brief implementers in worktrees;
   - CI;
   - a fresh Opus review with blocking findings only;
   - verify `Done when` yourself;
   - squash-merge; an issue handoff comment; update PROGRESS.md.

   Worktree env: `CUTROOM_ENV_FILE=C:\Users\XZNON\cutroom-v2\.env`, `CUTROOM_VAR=C:\Users\XZNON\cutroom-v2\var`; real runs use `--out` under `var\runs\`, one at a time, logged.
5. **Escalate to the user only for:**
   - a §1 change beyond D24, or a new reviewer model (H6);
   - the 80-cut budget reached;
   - voice credit gone with no working voice in the list;
   - the same failure twice after root-cause work with no verified alternative.
6. **Keep PROGRESS.md current**, especially before compaction. Don't trust a report as proof: check the merge, the frames and the run records.
