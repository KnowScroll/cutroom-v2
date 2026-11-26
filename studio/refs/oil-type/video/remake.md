---
videomd: 1
part: remake
tokens: 28310
---

## Remake plan

### Step by step

This is a motion-graphics explainer. Do the steps in this order; the detail for each is in the matching subsection below. 25% of the time is a 3D / animation; its steps are included.

1. **Write the content**: write yours in the same 15 steps as the original (narrative line under “Content and structure”)
2. **Collect material**: the real material in the picture (screen recording, photo) needs the original files, listed under “What to prepare”; one reference image per character, the same one in every shot: narrator
3. **AI shots**: 14 shots (33 s) to make with a video model. Pick the model first: tell the agent which one and it plans the stretches, inputs and prompts for it (`rea-video plan <folder> --model <model>`)
4. **Motion graphics**: have the agent run `rea-video code-remake` for an editable first version and change the text and pictures on top of it rather than starting from scratch; the first version is only a start, where it differs from the original is under “Code build”
5. **Voice**: the original is TTS voice-over; record it yourself or use TTS; 33 lines with their pace in the script table under “Sound”
6. **Edit**: follow the order and lengths in the shot list; the original has 60 shots at 2.2s each; 23 transitions under “Edit”
7. **Subtitles and styled text**: import `packaging/subtitles.srt` and replace the words; timing and style under “Packaging layer”
8. **Sound effects**: 28; place similar ones from a library at the times under “Sound”
9. **Put it together and compare**: hand the shots you made to the agent; `rea-video remake` places them on the original timeline, keeps the original where yours are missing, and renders a side-by-side comparison with the original

**14 3D render shots → 3 generation units, 3 Seedance 2.0 calls; code render / screen capture 46 shots → 1 code project (10 parts)**

### Generation units

- Grouping: consecutive shots share a call where they fit, ≤15s per call; a long stretch is cut at a scene change first
- Inputs: the source stretch, subtitles erased, is the reference video; the model follows its shots, camera and pacing
- Audio: the model can generate action sound effects and ambience along with the picture; voice-over is better done as separate TTS and mixed in, so copy and timing stay editable
- Packaging: the subtitle, text label, counter, styled text on the generated shots is post-production packaging: keep it out of the prompts (erased from source references) and lay it back on from the packaging timeline after generation

| Unit | Shots | Time | Length | Feed | Prompt |
|---|---|---|---|---|---|
| G1 | #1, #4, #12 | 0.0–1.3s, 3.4–8.2s, 20.7–25.1s | 10.5s | reference video | draft |
| G2 | #19, #28, #31, #35, #36, #42, #43 | 37.0–41.7s, 60.8–62.2s, 66.3–68.1s, 76.4–77.5s, 87.5–91.0s | 12.4s | reference video | draft |
| G3 | #50, #57, #59, #60 | 108.5–111.9s, 121.3–124.8s, 127.2–130.4s | 10.2s | reference video | draft |

**G1 · shots #1, #4, #12 · 10.5s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 0.0–1.3s, 3.4–8.2s, 20.7–25.1s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

- these shots are separated by inserts in the cut: generate them together and put the inserts back in the edit

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, hard light (sharp shadow edge), cool (daylight / cool-white LED), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: Night scene: a pumpjack drawn as a soft-shaded semi-realistic render (rust-orange horse head and walking beam, dark grey frame) on a dark brown plain under a near-black sky, centred in the picture band (y about 225 to 630 of 832). The caption band above shows the first words; tiny grey small print sits at the bottom-left of the picture.
Shot 2: Push-in from a speckled grey rock surface to a magnified view: angular grey mineral grains with thin dark boundaries, and in the gap between them a glossy brown drop of oil with a highlight. Small print reads that it is a magnified illustration, not a micrograph.
Shot 3: First-person view from a car: a dashboard with a cartoon hand on the wheel in the foreground, a dusk road and a flat scrubby plain; pumpjacks nod in a field. Muted brown-grey dusk palette.
```

**G2 · shots #19, #28, #31, #35, #36, #42, #43 · 12.4s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 37.0–41.7s, 60.8–62.2s, 66.3–68.1s, 76.4–77.5s, 87.5–91.0s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

- these shots are separated by inserts in the cut: generate them together and put the inserts back in the edit

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, hard light (sharp shadow edge), cool (daylight / cool-white LED), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: A large soft-shaded 3D cut-away of the drill bit in grey with round cutters, rotating against the rock face; the photo inset stays at the top-right.
Shot 2: Aerial 3D diorama of the pad with label PUMP TRUCKS and a leader line.
Shot 3: A cut-away pile of sand grains (pale beige spheres) heaped in a column.
Shot 4: Zoom transition into the sand grains.
Shot 5: Big pale sand spheres beside grey rock grains, oil seeping between.
Shot 6: Side view of the pumpjack drawn as before, the beam rocking; a clipping at the top.
Shot 7: Close-up of the pumpjack head with label HORSE HEAD; the rod moves up.
```

**G3 · shots #50, #57, #59, #60 · 10.2s · remix of the source**

| Input | Needed | From | Why |
|---|---|---|---|
| text prompt | yes | see the prompt below | final version in this model's format (remake/prompts.json) |
| reference video | yes | `@视频1` source 108.5–111.9s, 121.3–124.8s, 127.2–130.4s (subtitles and stickers erased) | the model copies its cuts, camera and action and makes the stretch in one go |

- these shots are separated by inserts in the cut: generate them together and put the inserts back in the edit

Draft prompt (generic; rewrite it in Seedance 2.0's format into remake/prompts.json before generating):

```text
@视频1 is the source: follow its shots (count, length, size, camera, movement, action and cutting rhythm) and change only what is written below. Vertical 9:16; night / low-light ambient, no dedicated fill, hard light (sharp shadow edge), cool (daylight / cool-white LED), background clearly blurred (shallow depth of field / portrait mode). No subtitles, captions or watermarks in the picture.
Shot 1: A flat dark 3D plain seen from above with thin well lines and a clipping of a survey text.
Shot 2: The 3D block of layered rock seen at an angle, the well through it.
Shot 3: Field of pumpjacks at dusk.
Shot 4: The 3D block again, the lake outline idea echoed.
```

### Code composition

Rebuild it as one project in an HTML video framework (such as HyperFrames or Remotion): cuts, transitions and each shot's key frames from "Rhythm and key frames", layout, colours and elements from the scenes below. Text and UI are 100% controllable, changing copy is a data change, and an AI coding assistant can write the project.

`rea-video code-remake <breakdown folder>` only makes a quick draft: it renders `code/remake.mp4` from each scene's sampled points / cut-out, motion and background glow and scores it. Particles, point clouds and data visualisations on a dark ground come close; an illustrated character's acting and morph transitions do not.

- Part 1: shots #2, #3 (1.3–3.4s)
- Part 2: shots #5–#11 (8.2–20.7s)
- Part 3: shots #13–#18 (25.1–37.0s)
- Part 4: shots #20–#27 (41.7–60.8s)
- Part 5: shots #29, #30 (62.2–66.3s)
- Part 6: shots #32–#34 (68.1–76.4s)
- Part 7: shots #37–#41 (77.5–87.5s)
- Part 8: shots #44–#49 (91.0–108.5s)
- Part 9: shots #51–#56 (111.9–121.3s)
- Part 10: shots #58 (124.8–127.2s)

Remake assets (all in the report folder; hand them over together with the data below to whoever writes the code, or to an LLM):
- `shots/shot_XXX_first.jpg` / `_last.jpg`: first / last frame of each shot at full size, for layout, type size and margins
- `shots/shot_XXX_strip.jpg`: key frames about every 0.5 s, to follow the animation
- `shots/shot_XXX_elements.jpg` and `_el_NN.jpg` / `_st_NN.jpg` / `_ly_NN.jpg`: full-size crop of every element once settled, numbered as in the motion timeline; redraw shapes from them, cut out icons, logos and illustrations that cannot be redrawn
- `packaging/overlays.ass`, `packaging/timeline.json`: timing, position and colour of the text

How to build the pictures (by the measured picture type):
- vector shapes: SVG shapes + interpolate() / spring() keyframes, positions and timing measured from the frame
- particles / point cloud: Three.js particle system (points sampled on the target shape, morph between shapes, bloom), rendered frame by frame with @remotion/three
- data chart: SVG / D3 scales for axes and marks, numbers counted up with interpolate(), bars / lines grown with spring()
- kinetic type: Word-by-word spring() entrances (offset + scale + opacity), highlight boxes on key words; match font, size and leading from the frame
- UI / document: HTML / CSS cards and layout matched to the frame (radius, shadow, type sizes), elements enter with spring(); a real UI can be screen-recorded

Particle shots: what shape the particles form in each shot and how it moves decides whether the remake works; chapter cards, labels and counters go in an HTML layer on top. Build shot by shot from the table below, not one shared background.

| Shot | Time | Build | Picture | Camera | Colours | On-screen text |
|---|---|---|---|---|---|---|
| #2 | 1.3–1.3s | vector shapes | Transition: the frame slides down from the surface into horizontal grey rock layers. | static | ground #0c0e12 · #262a2f #313238 #5e6168 #302923 · drawn #606167 #44413e | SPEFoundation,Energy4me:Petroleum |
| #3 | 1.3–3.4s | particles / point cloud | Cut-away cross-section: horizontal strata bands in slate greys with fine streaks, a thin vertical well line from the surface, and a thin white outline of a bowl-shaped underground lake that appears on the word lake, then fades. | static | ground #0c0e12 · #2f3036 #1d1c1f #1b191c #211f24 · drawn #5f6066 #424141 | from alake / of / from a lakeof oil. / The / The oil issoaked |
| #5 | 8.2–8.3s | vector shapes | One-frame transition back to the strata. | static | ground #0c0e12 · #1c1c1e #1c1c23 #222125 #26262c · drawn #39393c #525154 #e3e1e3 | EIA:Ollandpetroleum products explained / oil |
| #6 | 8.3–10.7s | vector shapes | Strata cross-section with a thin vertical well line growing down from the surface as the question is asked. | static | ground #0c0e12 · #262a2f #303137 #2c2722 #1b1b1e · drawn #5f6066 #3d3b38 | oil outofarock? / You / Youdrilldown / Youdrilldown to it, |
| #7 | 10.7–16.2s | data chart | The well line curves into a horizontal lateral along one layer; short cracks appear around it on "crack"; a white diagram line and a tiny label sit at the top of the picture. | static | ground #0a0d10 · #34302c #dfddda #212225 #c8c6c3 · drawn #606165 #403f3d #e0deda #b4b2ae | This was equal to about 64%of total U.S.crude oil production in 2023. / cracktherock / crack / ktherockopen, / and ilifti / whatseeps |
| #8 | 16.2–19.2s | particles / point cloud | A paper clipping of a source sentence with the number and year underlined sits at the top of the picture, its source in small grey print under it; below, a dark grey country map with faint state borders and a large white percentage above it; a white dot marks the region. | static | ground #0c0e12 · #262c34 #2f3138 #373c43 #1b1e22 · drawn #dededc #35373c #51545a #969695 | 64% / PERMIANBASIN / almosttwo / OfAmerica's / America'soil / came |
| #9 | 19.2–19.6s | particles / point cloud | Zoom into the region on the map: a pale grey irregular basin outline with an uppercase label in white small caps. | static frame, elements move inside it | ground #0c0e12 · #373532 #26292e · drawn #383636 #55585e #e6ebf0 #909baa | USGS Fact Sheet 2016-3092,Wolfcamp shale of the Midland Basin,p / likethis. / came from tightrock |
| #10 | 19.6–20.5s | kinetic type | A 3D block of layered rock seen from above at an angle, its sides showing the strata bands. | static | ground #0c0e12 · #29292e #303239 #1c1c1e #37332f · drawn #5e5f65 #3f3f40 | USGS Fact Sheet 2016-3092,Wolfcamp shale of the Midland Basin,p.1 / like this. / came fromtightrock |
| #11 | 20.5–20.7s | vector shapes | Zoom transition from the block to a road scene. | static | ground #0c0e12 · #35302b #2d2a28 #262423 #191a1d · drawn #f1eff2 #6e6e6f #b9b7ba #434243 | you're / Imagine |
| #13 | 25.1–27.0s | data chart | Camera drops below the field into the strata; a paper clipping of a source text sits top-left with its underlined sentence and a grey source line. | static | ground #0c0e12 · #1b1b1e #2f2e31 #252427 #424145 · drawn #e2dfdb #c8c6c2 #4a494e #929295 | WOLFCAMPSHALE / is shale, / shale, / therockthe |
| #14 | 27.0–30.9s | kinetic type | Close-up of fine grey streaked shale with an uppercase white label and a leader line; a framed black-and-white photo of a rock core is pinned at the right with its credit line beneath; a second label marks the organic material. | static | ground #0d0e10 · #52555b #878b91 #5a5e64 #b0b3b8 · drawn #8d8e93 #b5b6bb #57585c #dededf | therockthe / withpores / theoilcan / the oil can |
| #15 | 30.9–31.5s | kinetic type | Magnified grains again with the oil drop squeezed between them; label PORES at the bottom-left. | static | ground #0c0e12 · #28292e #313238 #1b1c20 #5c6068 · drawn #5e5f66 #3c3b3b | barelymove. / theoil can |
| #16 | 31.5–31.9s | particles / point cloud | Strata with the well position, the word First in the caption. | static frame, elements move inside it | ground #0c0e12 · #2a2b31 #313339 #47433c #1f1b1b · drawn #454447 #57565b #eceaec #979597 | First, |
| #17 | 31.9–35.4s | particles / point cloud | Night drilling rig drawn as a thin lattice tower with lights on a dark plain, the pipe going down into the strata; a framed black-and-white photo of a real rig at night is pinned top-right with its credit. | static | ground #0c0e12 · #282b31 #323339 #48443d #1f2123 · drawn #494848 #828284 #b6b5b8 #ecebed | DRILLPIPE / drills / drillsstraight / drillsstraightdown, / spinning a / Ofsteel |
| #18 | 35.4–37.0s | kinetic type | Push-in to the bottom of the pipe: label DRILL BIT with a leader line, and a framed black-and-white close-up photo of real bit cutters top-right with its credit. | static frame, elements move inside it | ground #0c0e12 · #33343a #494d53 #212429 #666a70 · drawn #515258 #808186 #b5b4b6 #e5e4e6 | OSHA eTool, Oil and Gas Well Drilling and Servicing: Glossary (text by PETEX) / DRILLBIT / that / thatgrinds |
| #20 | 41.7–42.2s | kinetic type | Surface equipment (mud pumps) drawn in muted greys with a quote clipping about mud pumps at the top. | static frame, elements move inside it | ground #0c0e12 · #272b30 #48453e #343439 #e0e1dd · drawn #e3e0dc #c5c2be #4f4d4c #898781 | OSHA eTool, Oil and Gas Well Drilling and Servicing: Drilling Ahead / andkeepthewell |
| #21 | 42.2–42.8s | kinetic type | Cut-away of the pipe with crushed rock pieces travelling up the annulus, label DRILL CUTTINGS; a clipping at the top. | static frame, elements move inside it | ground #0c0e12 · #666051 #575349 #726b5d #ddded9 · drawn #e0ddd8 #837c6e #5f5a51 #b2afaa | OSHA eTool, Oil and Gas Well Drilling and Servicing: Drilling Ahead / fromblowing / andkeepthewell |
| #22 | 42.8–44.1s | particles / point cloud | Close-up of granular rock wall with the pipe in the middle, pressure particles held back. | static | ground #0c0e12 · #47433c #434038 · drawn #47443f #676159 #e6ebef | OSHA eTool, Oil and Gas Well Drilling and Servicing: Drilling Ahead / OSHA eTool, Oil and Gas Well Drilling and Servicing: Casing Operations / CASING / The hole gets / With |
| #23 | 44.1–54.6s | data chart | Cut-away of the well: a CASING line, then CEMENT around it, then the GROUNDWATER layer near the surface, each with an uppercase label and leader line; clippings of the regulation text at the top with underlined words and their sources. | static | ground #0c0e12 · #292422 #1b1a1c #3a3632 #d6d7d3 · drawn #dddbd7 #6a6a6b #aba9a7 #444444 | and / cement, / sealing / the groundwater / the / groundwater |
| #24 | 54.6–58.9s | UI / document | The well curves into a long horizontal lateral along a layer, label LATERAL, a big white number with a small unit for the average length; then a truck at the surface and a framed photo of a perforating gun. | static | ground #0c0e12 · #1b1b1e #1e1f23 #242426 #414044 · drawn #999896 #dcdbd8 #79797c #494a4e | PERFORATIONS / and / and shoots / throughthesteel / throughthe steel / into the |
| #25 | 58.9–59.3s | particles / point cloud | The lateral pipe in close-up with small holes appearing, label PERFORATIONS. | static frame, elements move inside it | ground #0c0e12 · #313339 #282b31 #34302c #45423e · drawn #4f4e51 #39383a #676464 #86837e | fracking / That'swhen the |
| #26 | 59.3–60.0s | kinetic type | A framed black-and-white photo of a real fracking site with many trucks, pinned at the top of the picture, its credit under it. | static | ground #0c0e12 · #35312e #45423c #2a2726 #7a7776 · drawn #837e7d #a5a1a0 #4c4946 #dad7d7 | fracking starts. / A hydraulic fracturing site.Photo:USGS / That'swhenthe |
| #27 | 60.0–60.8s | particles / point cloud | The photo stays at the top; below, an aerial 3D diorama of the site: rows of trucks and tanks on a pad. | static | ground #0c0e12 · #363331 #464440 #2a2829 #747576 · drawn #828081 #a7a5a5 #4d4a49 #dbdbdc | OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion / Trucks |
| #29 | 62.2–65.6s | kinetic type | Strata cross-section with the lateral glowing amber (pressure) and a clipping at the top. | static frame, elements move inside it | ground #0c0e12 · #1c1c1e #222124 #d9d9d5 #2c2a2a · drawn #dcdad6 #a6a096 #545354 #ebae4d | OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion / forhours, / SO / hard / hardthat therock / cracksopen |
| #30 | 65.6–66.3s | particles / point cloud | Thin amber vertical cracks shoot up and down from the lateral at regular intervals across the strata. | static | ground #0c0e12 · #1c1c1e #222225 #2f2f32 #423f39 · drawn #42403f #6a655c #b5a17b #dee6ee | OSHA eTool, Oiland Gas Well Drilling and Servicing: Well Completion / aroundtheholes. |
| #32 | 68.1–70.5s | data chart | A big white counter number with the unit in small caps over the strata. | static | ground #0a0d10 · #171718 #242628 #393b3e #a1a09e · drawn #5c5c5d #dbdad9 #43403f #8e8d8c | uptos / sixteen / up to sixteenmillion / gallons / gallonsforonewell. |
| #33 | 70.5–71.4s | vector shapes | Strata with the vertical well and amber cracks; the number held. | static frame, elements move inside it | ground #0c0e12 · #313238 #29292e #1e1c1d #403d36 · drawn #636262 #423f3b #b1a180 | sdund / When the |
| #34 | 71.4–76.4s | data chart | Close-up of a crack filled with pale sand grains (proppant) between dark streaked layers, label PROPPANT, a small framed photo of real proppant on the left with its credit. | static frame, elements move inside it | ground #0c0e12 · #1c1d21 #2e2e33 #464649 #d1d2cd · drawn #dedbd5 #beb29b #4b494e #998f7c | therocktries / butthesand / stuckin / props them open, / and |
| #37 | 77.5–78.0s | kinetic type | The proppant column with a clipping at the top. | static | ground #0c0e12 · #2b2a2d #252427 #343337 #c7c8c4 · drawn #dddbd7 #454446 #b8b7b3 #82817e | throughinto |
| #38 | 78.0–78.8s | particles / point cloud | The crack meets the well, oil moving in. | static frame, elements move inside it | ground #0c0e12 · #333338 #1b1c20 #2f3036 #282a2f · drawn #3e3d40 #58575a | EIA,Todayin Energy,March15,2016 |
| #39 | 78.8–80.3s | data chart | A framed black-and-white photo of a real wellhead (christmas tree) top-right, credit under it; below, the well line in the strata with an amber pressure line. | static | ground #0c0e12 · #2f3036 #1d1d22 #392e1d #d0d1d3 · drawn #dad8da #606165 #aaa8aa #44403d | Atfirst, / Atfirst,the / pressure |
| #40 | 80.3–83.0s | kinetic type | Amber glow travelling up the well line. | static | ground #0c0e12 · #272a2e #303137 #1d1c1e #5c5f66 · drawn #606065 #413e38 #dbd9d6 #8f8576 | OSHA eTool, Oil and Gas Well Drilling and Servicing: Special Services / pushestheoil / On its / own. / When itfades, / the |
| #41 | 83.0–87.5s | UI / document | Strata and the surface; a clipping about beam pumps at the top. | static frame, elements move inside it | ground #0c0e12 · #3a3632 #1a191b #282523 #57453d · drawn #584035 #5e5c5b #dfdedc #969393 | thepumpjack / Amotor / with / withheavy / thebeam / thebeamrocks, |
| #44 | 91.0–92.2s | particles / point cloud | A framed photo of stacked sucker rods with label SUCKER RODS. | static | ground #0c0e12 · #292a30 #3c3c3f #1c1c1e #58595a · drawn #7c7a7c #a19fa1 #555559 #e6e4e5 | Wikipedia:Pumpjack / downthewell. / At |
| #45 | 92.2–95.7s | data chart | Strata with the rod line going down. | static frame, elements move inside it | ground #0c0e12 · #28292e #dadbd6 #a2a5a4 #8c8b8a · drawn #dfdcd9 #b1b0af #908f8d #4e4f52 | TRAVELINGVALVE / STANDINGVALVE / Atthebottom, / therod / therodworks / with |
| #46 | 95.7–104.9s | data chart | Cut-away of the downhole pump drawn in greys and brown oil: barrel, plunger (label PLUNGER), two steel balls in their seats moving; on the right a patent figure (black line drawing on white) pinned as evidence, its source in small print. | static frame, elements move inside it | ground #0c0e12 · #2b2b30 #acafb4 #939391 #312116 · drawn #b2b1b3 #94928f #dfdcd8 | the / thetoponecloses / and / lifts_the oil, / while / while the |
| #47 | 104.9–105.1s | kinetic type | Short transition. | static | ground #0c0e12 · #a1916c #8f9091 #616264 #49453c · drawn #998f7c #dedcd8 #b8b8b9 #625e59 | Cut-awayview,flustration / Saltywater |
| #48 | 105.1–106.2s | kinetic type | Rock grains with water; clipping at the top with the underlined sentence. | static | ground #0c0e12 · #2b2c32 #3c3d43 #4f5258 #1b1d21 · drawn #595a5f #e0deda #8f8e8f #c0bebb | Magnifiednlusuraton.notamicrograph / fromdeep / comes |
| #49 | 106.2–108.5s | kinetic type | Strata with the clipping held. | static | ground #0c0e12 · #35312e #302a26 #242221 #dcdad6 · drawn #e0deda #4f4e50 #878684 #bfbcb9 | comesupwithlit, / atnearly / every / everywell. |
| #51 | 111.9–112.8s | particles / point cloud | Strata cut-away with a disposal well line. | static frame, elements move inside it | ground #0c0e12 · #32343c #1b1f26 #42474e · drawn #3f4047 #61646d #a7a9af #eaf0f6 | and inOklahoma, / andinoklahoma, |
| #52 | 112.8–115.0s | particles / point cloud | Dark map of the state outline; dots appear. | static frame, elements move inside it | ground #0c0e12 · #2e2b30 #1a1b20 #383739 #282523 · drawn #605b59 #424143 #858186 #acabb0 | earthquakes. / those / those wellssetoff / mostofthe / mostoftherecent |
| #53 | 115.0–120.2s | data chart | A clipping of the survey statement with underlined words, a small bar histogram of earthquakes and a big white percentage. | static frame, elements move inside it | ground #0c0e12 · #2e2a2e #303137 #413e38 #211f20 · drawn #e3e0dc #c9c6c1 #585450 #9c9b98 | magnitude3andgreater,1978 to2018 / mostoftherecent / The U.S. / TheU.S. / linksonly. / oneto |
| #54 | 120.2–120.4s | kinetic type | Clipping held, transition. | static | ground #0c0e12 · #191b22 #0f0b10 #1a1a1d #131417 · drawn #5f5d5f #323134 #474548 | Pressure shown in amber / So |
| #55 | 120.4–120.7s | particles / point cloud | Dark zoom out toward the surface. | static | ground #0c0e12 · #0f0b10 #373532 #1b1e24 · drawn #393735 #4b5566 #e8edf3 #959fad | Wellandmachines drawn larger than true / So that pumpjack |
| #56 | 120.7–121.3s | particles / point cloud | The opening pumpjack at the surface again, small in a dark field. | static frame, elements move inside it | ground #0c0e12 · #252220 #302925 #403c36 #34302b · drawn #613f30 #4a4541 #5f524b #6a625d | SPEFoundation,Energy4me:Petroleum / was / never |
| #58 | 124.8–127.2s | particles / point cloud | Strata with the lateral and the cracks. | static | ground #0c0e12 · #5f6067 #2d3136 #22252a #272b30 · drawn #5c5c5f #3e3d3a #818282 | EIA, Today in Energy,March 15,2016 / with/sand. / and / and held open / andheldopen |

**Picture scenes** (a new scene whenever what is drawn moves or changes shape as a whole inside a shot. `frames/` holds first / middle / last full-size frames per scene, `scene_XX_layer.png` the drawn layer of the middle frame (background and text removed, alpha by how strongly it stands out), `frames/points/scene_XX.json` samples of that layer, one `x y r g b a` per row with x, y in 0–1. Place particles, trace lines or redraw shapes from these instead of guessing from a description. `track` in `frames/scenes.json` follows the layer's centre and spread over time)

| Scene | Shot | Time | Ground | Background glow | Drawn colours | Pieces | Area (x0 y0 x1 y1) | Motion |
|---|---|---|---|---|---|---|---|---|
| scene_01 | #3 | 1.3–3.4s | #0f0f0f | #2f3336, centre (0.50, 0.49), radius 0.51 | #5b5f63 #4e5255 #6a6e71 | 3 | 0.13 0.31 0.88 0.59 | zoom in 18%/s, pans (-0.5%, -0.7%)/s, points wander |
| scene_02 | #6 | 8.3–10.7s | #0f0f0f | #3e4245, centre (0.49, 0.48), radius 0.45 | #5f6366 #3a3a31 #46463b | 15 | 0.02 0.34 0.98 0.75 | near still |
| scene_03 | #7 | 10.7–13.4s | #0f0f0f | #3e4245, centre (0.49, 0.49), radius 0.47 | #5f6366 #424137 #565958 | 63 | 0.02 0.33 0.98 0.75 | near still |
| scene_04 | #7 | 13.4–16.2s | #0f0f0f | #a4a5a0, centre (0.50, 0.33), radius 0.28 | #3e4243 #545859 | 70 | 0.01 0.38 0.95 0.68 | morphs in from the last scene, zoom in 1%/s |
| scene_05 | #8 | 16.2–17.7s | #0f0f0f | #3d3f3e, centre (0.41, 0.30), radius 0.21 | #2b2f32 | 62 | 0.11 0.40 0.94 0.69 | zoom in 1%/s, pans (+0.6%, +0.1%)/s |
| scene_06 | #8 | 17.7–19.2s | #0f0f0f | #3d403f, centre (0.45, 0.42), radius 0.35 | #464a4e #2e3235 | 99 | 0.11 0.42 0.95 0.70 | morphs in from the last scene, zoom in 4%/s, pans (+0.5%, -0.3%)/s |
| scene_07 | #9 | 19.2–19.6s | #0f0f0f | #2d3133, centre (0.45, 0.50), radius 0.53 | #3b3f41 #444647 #4a4b4d | 47 | 0.34 0.29 0.69 0.67 | — |
| scene_08 | #10 | 19.6–20.5s | #0f0f0f | #393c3f, centre (0.51, 0.46), radius 0.39 | #5e6265 #464743 #3a3933 | 114 | 0.07 0.34 0.93 0.67 | near still |
| scene_11 | #16 | 31.5–31.9s | #0f0f0f | #3d3d36, centre (0.49, 0.53), radius 0.49 | #515045 #4c493f #5b574e | 12 | 0.08 0.34 0.18 0.40 | — |
| scene_12 | #17 | 31.9–33.7s | #0f0f0f | #878989, centre (0.74, 0.43), radius 0.20 | #afb0b1 #e4e5e4 #7c7e7d | 22 | 0.45 0.29 0.95 0.51 | near still |
| scene_13 | #17 | 33.7–35.4s | #0f0f0f | #41413a, centre (0.49, 0.51), radius 0.50 | #4a4a42 #6a6b6b #90918f | 82 | 0.01 0.28 0.98 0.69 | morphs in from the last scene, zoom in 4%/s, pans (-0.1%, -1.0%)/s |
| scene_14 | #22 | 42.8–44.1s | #0f0f0f | #49473b, centre (0.50, 0.51), radius 0.53 | #47463b #7b796d #676559 | 49 | 0.01 0.28 0.99 0.76 | near still |
| scene_15 | #23 | 44.1–47.3s | #0f0f0f | #5c5a50, centre (0.52, 0.50), radius 0.53 | #b1b0ae #58574b #747269 | 270 | 0.00 0.29 0.98 0.75 | zoom in 19%/s, pans (-3.0%, +1.0%)/s |
| scene_16 | #23 | 47.3–51.8s | #0f0f0f | #2d3134, centre (0.49, 0.46), radius 0.49 | #4d4f51 #5a5d5e #7a7c7d | 2 | 0.03 0.49 0.97 0.59 | morphs in from the last scene, zoom in 10%/s, pans (-4.6%, -6.4%)/s |
| scene_17 | #23 | 51.8–54.6s | #0f0f0f | #676865, centre (0.54, 0.38), radius 0.40 | #616467 #3c3b31 #d2d2cc | 11 | 0.01 0.28 0.99 0.76 | morphs in from the last scene |
| scene_18 | #24 | 54.6–58.9s | #0f0f0f | #5d5e5c, centre (0.49, 0.44), radius 0.45 | #959691 #6f7274 #b1b3b2 | 10 | 0.01 0.46 0.98 0.59 | zoom in 3%/s, pans (-0.1%, -0.7%)/s |
| scene_19 | #25 | 58.9–59.3s | #0f0f0f | #4e5255, centre (0.50, 0.60), radius 0.47 | #5f6365 #47463d | 49 | 0.01 0.36 0.98 0.75 | — |
| scene_20 | #26 | 59.3–60.0s | #0f0f0f | #777472, centre (0.53, 0.39), radius 0.37 | #8f8d89 #cfccc9 #55534b | 91 | 0.07 0.28 0.92 0.75 | zoom in 2%/s |
| scene_21 | #27 | 60.0–60.8s | #0f0f0f | #767676, centre (0.53, 0.40), radius 0.37 | #91918f #d1d1ce #5a5952 | 138 | 0.07 0.28 0.92 0.75 | near still |
| scene_22 | #30 | 65.6–66.3s | #0f0f0f | #2a2824, centre (0.49, 0.48), radius 0.55 | #827c63 #4f4d3b #c2b085 | 7 | 0.04 0.34 0.79 0.71 | near still |
| scene_23 | #37 | 77.5–78.0s | #0f0f0f | #5b5b59, centre (0.51, 0.31), radius 0.28 | #d0d0ca #dcdcd5 #7e7d78 | 3 | 0.59 0.29 0.95 0.32 | — |
| scene_24 | #38 | 78.0–78.8s | #0f0f0f | #292d30, centre (0.49, 0.47), radius 0.53 | #60615f #3f4040 | 52 | 0.02 0.26 0.81 0.57 | near still |
| scene_25 | #40 | 80.3–83.0s | #0f0f0f | #494844, centre (0.49, 0.44), radius 0.50 | #5f6364 #3d3c31 #938567 | 9 | 0.02 0.40 0.98 0.75 | zoom in 12%/s, pans (+3.1%, +1.9%)/s |
| scene_27 | #44 | 91.0–92.2s | #0f0f0f | #676767, centre (0.53, 0.36), radius 0.33 | #717070 #9f9e9d #e9e9e8 | 101 | 0.06 0.28 0.92 0.67 | near still |
| scene_28 | #45 | 92.2–93.7s | #0f0f0f | #34383b, centre (0.50, 0.49), radius 0.52 | #5b5d5e #4a4b4a #6e6f6f | 2 | 0.56 0.28 0.57 0.74 | zoom out 2%/s, pans (+0.6%, -0.4%)/s |
| scene_29 | #45 | 93.7–95.7s | #0f0f0f | #91928e, centre (0.80, 0.53), radius 0.32 | #b3b4b0 #dfded7 #92928d | 46 | 0.55 0.37 0.94 0.75 | morphs in from the last scene |
| scene_30 | #47 | 104.9–105.1s | #0f0f0f | #575856, centre (0.50, 0.32), radius 0.31 | #aacbed #3c444d #6686af | 6 | 0.11 0.16 0.51 0.71 | — |
| scene_31 | #51 | 111.9–112.8s | #0f0f0f | #303438, centre (0.60, 0.34), radius 0.27 | #45494c #63676a #888c8f | 44 | 0.29 0.31 0.78 0.45 | — |
| scene_32 | #52 | 112.8–115.0s | #0f0f0f | #3d383b, centre (0.50, 0.53), radius 0.49 | #5e5948 #777775 #989a9c | 32 | 0.10 0.37 0.89 0.64 | zoom in 3%/s, pans (+0.6%, -0.4%)/s |
| scene_33 | #55 | 120.4–120.7s | #0f0f0f | #262829, centre (0.47, 0.43), radius 0.41 | #3f4345 #323639 #515558 | 5 | 0.57 0.49 0.63 0.50 | — |
| scene_34 | #56 | 120.7–121.3s | #0f0f0f | #36342c, centre (0.48, 0.56), radius 0.50 | #5f4030 #64615a #4a4843 | 24 | 0.18 0.41 0.91 0.69 | — |
| scene_36 | #58 | 124.8–127.2s | #0f0f0f | #313436, centre (0.49, 0.50), radius 0.50 | #5e5f5c #3f3e37 #90918b | 5 | 0.02 0.58 0.97 0.76 | zoom in 10%/s, points wander |

When built, score it with `rea-video compare original remake --scenes frames/scenes.json -o dir` (each side's drawn layer is taken against its own ground, so a new ground colour still compares) and fix the lowest-scoring scenes first, from `compare_worst.jpg`.

Per-shot motion timeline (measured: positions in % of frame width / height, colours sampled once the element settles; read together with the key-frame strip)

**Motion #2 1.3–1.3s (slide in) · 0 events**

- Ground #0c0e12; other main colours #262a2f #313238 #5e6168 #302923; drawn layer #606167 #44413e
- No element motion measured (still picture or only slight changes)

**Motion #3 1.3–3.4s · 5 events**

- Ground #0c0e12; other main colours #2f3036 #1d1c1f #1b191c #211f24; drawn layer #5f6066 #424141
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_003_ly_01.jpg) [crop L2](shots/shot_003_ly_02.jpg) · Continuous layer: 17% of the frame moves through the whole shot (x 0%–100%, y 16%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 1.80–3.13s · top (x 0%–100%, y 26%–27%) · changes, moves leftward, ease-out · #191719 · [crop](shots/shot_003_el_01.jpg)
2. 2.93–3.33s · middle (x 0%–100%, y 52%–59%) · appears, slides rightward, ease-in-out · #1d1b1f · [crop](shots/shot_003_el_02.jpg)
3. 2.93–3.33s · bottom (x 0%–100%, y 60%–80%) · changes, ease-in · #3a383c · text “The lake people picture, not what is there / SPE Foundation,Energy4me:Petroleum / SPE Foundation, Energy4me: Petroleum” · [crop](shots/shot_003_el_03.jpg)
4. 3.00–3.33s · middle (x 0%–100%, y 34%–38%) · changes, moves rightward, ease-in-out · #1d1b1f · [crop](shots/shot_003_el_04.jpg)
5. 3.00–3.33s · middle (x 0%–100%, y 39%–51%) · appears, slides rightward, ease-in-out · #1e1c20 · [crop](shots/shot_003_el_05.jpg)

**Motion #5 8.2–8.3s (zoom in) · 5 events**

- Ground #0c0e12; other main colours #1c1c1e #1c1c23 #222125 #26262c; drawn layer #39393c #525154 #e3e1e3
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_005_ly_01.jpg) [crop L2](shots/shot_005_ly_02.jpg) · Continuous layer: 40% of the frame moves through the whole shot (x 0%–100%, y 18%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 8.23–8.30s · top right (x 38%–100%, y 26%–30%) · disappears, instant · #4f4d4f · [crop](shots/shot_005_el_01.jpg)
2. 8.23–8.30s · top left (x 0%–31%, y 26%–29%) · disappears, instant · #383638 · [crop](shots/shot_005_el_02.jpg)
3. 8.23–8.30s · middle (x 0%–100%, y 49%–56%) · changes, instant · #27252b · [crop](shots/shot_005_el_03.jpg)
4. 8.23–8.30s · middle left (x 0%–11%, y 55%–58%) · disappears, instant · #43454a · [crop](shots/shot_005_el_04.jpg)
5. 8.23–8.30s · bottom left (x 0%–47%, y 74%–76%) · changes, instant · #252629 · [crop](shots/shot_005_el_05.jpg)

**Motion #6 8.3–10.7s · 11 events**

- Ground #0c0e12; other main colours #262a2f #303137 #2c2722 #1b1b1e; drawn layer #5f6066 #3d3b38
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 76%–89%, y 42%–43% · #292a30 · [crop](shots/shot_006_st_01.jpg)
- [crop L1](shots/shot_006_ly_01.jpg) [crop L2](shots/shot_006_ly_02.jpg) · Continuous layer: 3% of the frame moves through the whole shot (x 4%–80%, y 18%–80%), e.g. drifting gradients, particle flow, breathing glow
1. 8.40–10.73s · top (x 22%–78%, y 15%–22%) · disappears, unfolds downward (draw-on / grow / wipe), ease-in-out · #3c3a3c · text “oil outofarock? / You / Youdrilldown” · [crop](shots/shot_006_el_01.jpg)
2. 8.40–8.60s · top (x 0%–100%, y 26%–29%) · changes, moves rightward, ease-in-out · #1f1d1d · [crop](shots/shot_006_el_02.jpg)
3. 8.40–8.60s · middle (x 0%–100%, y 31%–35%) · appears, slides rightward, linear · #47403a · [crop](shots/shot_006_el_03.jpg)
4. 8.40–8.60s · middle (x 0%–100%, y 38%–41%) · changes, moves rightward, linear · #323339 · [crop](shots/shot_006_el_04.jpg)
5. 8.40–8.60s · middle (x 0%–100%, y 44%–50%) · appears, ease-in-out · #5f6066 · [crop](shots/shot_006_el_05.jpg)
6. 8.40–8.53s · middle (x 0%–100%, y 51%–65%) · changes, unfolds leftward (draw-on / grow / wipe), instant · #2a2b30 · [crop](shots/shot_006_el_06.jpg)
7. 8.40–8.53s · middle (x 24%–100%, y 59%–61%) · changes, moves leftward, instant · #323339 · [crop](shots/shot_006_el_07.jpg)
8. 8.40–8.60s · bottom (x 0%–100%, y 68%–76%) · changes, moves downward, ease-out · #1c1a1e · text “Depths illustrative,none measured / Well andmachines drawn larger than true / Depths illustrative, none measured” · [crop](shots/shot_006_el_08.jpg)
9. 9.33–10.67s · top (x 29%–56%, y 15%–21%) · disappears, moves rightward, ease-in-out · #3e3c3e · text “oil outofarock? / You / Youdrilldown” · [crop](shots/shot_006_el_09.jpg)
10. 10.27–10.67s · top (x 20%–82%, y 15%–21%) · disappears, moves rightward, ease-in-out · #424b59 · text “oil outofarock? / You / Youdrilldown” · [crop](shots/shot_006_el_10.jpg)
11. 10.27–10.67s · bottom (x 4%–96%, y 62%–76%) · changes, unfolds leftward (draw-on / grow / wipe), ease-in-out · #403e42 · text “Depths illustrative,none measured / Well andmachines drawn larger than true / Depths illustrative, none measured” · [crop](shots/shot_006_el_11.jpg)

**Motion #7 10.7–16.2s · 3 events**

- Ground #0a0d10; other main colours #34302c #dfddda #212225 #c8c6c3; drawn layer #606165 #403f3d #e0deda #b4b2ae
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_007_ly_01.jpg) [crop L2](shots/shot_007_ly_02.jpg) · Continuous layer: 5% of the frame moves through the whole shot (x 0%–96%, y 16%–80%), e.g. drifting gradients, particle flow, breathing glow
1. 10.77–15.63s · top (x 24%–60%, y 15%–22%) · appears, slides leftward, ease-in-out · #484749 · text “cracktherock / crack / ktherockopen,” · [crop](shots/shot_007_el_01.jpg)
2. 11.37–14.37s · top left (x 16%–40%, y 15%–22%) · disappears, ease-in-out · #24304e · text “crack / whatseeps” · [crop](shots/shot_007_el_02.jpg)
3. 14.57–15.30s · top (x 13%–91%, y 30%–35%) · appears, slides rightward, ease-out · #e4e1dc · text “es forcing a liquid (primarily water) under high pressure from a wellbore against a rock / rhens as the high-pressure liquid in the wellbore flows into the formation. This injeciec / articles (usually sand or a manmade granular solid of similar size] that fills the expandi” · [crop](shots/shot_007_el_03.jpg)

**Motion #8 16.2–19.2s · 7 events**

- Ground #0c0e12; other main colours #262c34 #2f3138 #373c43 #1b1e22; drawn layer #dededc #35373c #51545a #969695
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_008_ly_01.jpg) [crop L2](shots/shot_008_ly_02.jpg) · Continuous layer: 14% of the frame moves through the whole shot (x 4%–98%, y 16%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 16.30–16.37s · middle left (x 13%–49%, y 41%–76%) · disappears, instant · #3a393c · text “Shale plays for oll and gas, traced from the ElA map (2016) / Shale plays for oil and gas, traced from the ElA map (2016) / PERMIANBASIN” · [crop](shots/shot_008_el_01.jpg)
2. 16.50–16.57s · middle left (x 0%–22%, y 57%–66%) · changes, instant · #0c0d10 · [crop](shots/shot_008_el_02.jpg)
3. 17.57–17.63s · middle (x 9%–80%, y 40%–62%) · changes, instant · #292b33 · [crop](shots/shot_008_el_03.jpg)
4. 18.17–18.23s · bottom (x 4%–69%, y 74%–76%) · appears, instant · #313235 · text “Shale plays for oll and gas, traced from the ElA map (2016) / Shale plays for oil and gas, traced from the ElA map (2016) / Shale plays for oil and gas, traced from the ElAmap (2016)” · [crop](shots/shot_008_el_04.jpg)
5. 18.17–18.30s · bottom (x 4%–67%, y 79%–80%) · appears, slides leftward, instant · #333133 · text “After the EIA map: Lower 48 states shale plays,June 2016 / After the EIA map:Lower 48 states shale plays,June 2016 / After the ElA map: Lower 48 states shale plays, June 2016” · [crop](shots/shot_008_el_05.jpg)
6. 18.90–19.17s · bottom left (x 4%–53%, y 64%–73%) · changes, moves leftward, ease-in-out · #292b33 · text “Shale plays for oll and gas, traced from the ElA map (2016) / Shale plays for oil and gas, traced from the ElA map (2016) / PERMIANBASIN” · [crop](shots/shot_008_el_06.jpg)
7. 18.97–19.17s · top right (x 69%–78%, y 16%–22%) · appears, scales up, linear · #2c394a · [crop](shots/shot_008_el_07.jpg)

**Motion #9 19.2–19.6s · 4 events**

- Ground #0c0e12; other main colours #373532 #26292e; drawn layer #383636 #55585e #e6ebf0 #909baa
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_009_ly_01.jpg) [crop L2](shots/shot_009_ly_02.jpg) · Continuous layer: 34% of the frame moves through the whole shot (x 0%–100%, y 26%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 19.30–19.37s · top (x 16%–84%, y 15%–22%) · changes, instant · #2e343c · text “came from tightrock / likethis.” · [crop](shots/shot_009_el_01.jpg)
2. 19.30–19.50s · middle (x 0%–100%, y 26%–78%) · disappears, unfolds leftward (draw-on / grow / wipe), ease-in · #363840 · text “Well and machines drawm larqer than true / Depthe illustFative,none meAsuired / USGS Fact Sheet 2016-3092,Wolfcamp shale of the Midland Basin,p” · [crop](shots/shot_009_el_02.jpg)
3. 19.37–19.43s · bottom (x 18%–67%, y 76%–77%) · disappears, instant · #28292c · text “Depthe illustFative,none meAsuired / USGS Fact Sheet 2016-3092,Wolfcamp shale of the Midland Basin,p” · [crop](shots/shot_009_el_03.jpg)
4. 19.43–19.50s · bottom (x 4%–67%, y 79%–80%) · disappears, instant · #333234 · text “USGS Fact Sheet 2016-3092,Wolfcamp shale of the Midland Basin,p” · [crop](shots/shot_009_el_04.jpg)

**Motion #10 19.6–20.5s (zoom in) · 4 events**

- Ground #0c0e12; other main colours #29292e #303239 #1c1c1e #37332f; drawn layer #5e5f65 #3f3f40
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 44%–54%, y 40%–41% · #2a2b31 · [crop](shots/shot_010_st_01.jpg)
- S2. never moves: shape / text block · x 56%–60%, y 41%–42% · #323339 · [crop](shots/shot_010_st_02.jpg)
- S3. never moves: shape / text block · x 67%–73%, y 44%–45% · #323339 · [crop](shots/shot_010_st_03.jpg)
- S4. never moves: shape / text block · x 38%–42%, y 50%–52% · #2f3036 · [crop](shots/shot_010_st_04.jpg)
1. 19.63–19.90s · middle (x 4%–96%, y 31%–76%) · changes, unfolds downward (draw-on / grow / wipe), ease-out · #2e2b30 · text “Well and machines drawn larger than true / Depths illustrative, none measured” · [crop](shots/shot_010_el_01.jpg)
2. 19.83–19.90s · bottom (x 4%–82%, y 78%–80%) · appears, instant · #333133 · text “USGS Fact Sheet 2016-3092,Wolfcamp shale of the Midland Basin,p.1” · [crop](shots/shot_010_el_02.jpg)
3. 20.43–20.50s · top (x 16%–84%, y 15%–22%) · changes, instant · #100e10 · text “came fromtightrock / like this.” · [crop](shots/shot_010_el_03.jpg)
4. 20.50–20.57s · middle (x 4%–100%, y 30%–77%) · changes, instant · #2f2d30 · text “Well and machines drawn larger than true / Depths illustrative, none measured / USGS Fact Sheet 2016-3092,Wolfcamp shale of the Midland Basin,p.1” · [crop](shots/shot_010_el_04.jpg)

**Motion #11 20.5–20.7s (zoom in) · 0 events**

- Ground #0c0e12; other main colours #35302b #2d2a28 #262423 #191a1d; drawn layer #f1eff2 #6e6e6f #b9b7ba #434243
- No element motion measured (still picture or only slight changes)

**Motion #13 25.1–27.0s · 6 events**

- Ground #0c0e12; other main colours #1b1b1e #2f2e31 #252427 #424145; drawn layer #e2dfdb #c8c6c2 #4a494e #929295
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_013_ly_01.jpg) [crop L2](shots/shot_013_ly_02.jpg) · Continuous layer: 43% of the frame moves through the whole shot (x 0%–100%, y 16%–77%), e.g. drifting gradients, particle flow, breathing glow
1. 25.27–25.53s · top (x 31%–58%, y 20%–25%) · disappears, moves leftward, ease-in-out · #373f57 · text “is shale, / shale, / therockthe” · [crop](shots/shot_013_el_01.jpg)
2. 25.47–25.53s · top (x 29%–42%, y 15%–18%) · disappears, instant · #142438 · [crop](shots/shot_013_el_02.jpg)
3. 26.53–27.00s · bottom (x 2%–100%, y 76%–80%) · appears, slides leftward, ease-out · #353336 · text “Well and machines drawn larger than true / Magnified illustration,not a micrograpn / Msgnitiudustration.nota mcrograpn” · [crop](shots/shot_013_el_03.jpg)
4. 26.73–27.00s · middle left (x 0%–53%, y 31%–46%) · changes, moves leftward, ease-in · #92908f · text “Wolfcamp shale throughout this region is / mature for oil generation bascd on them / naturation data (Pawlewicz.and others” · [crop](shots/shot_013_el_04.jpg)
5. 26.80–27.00s · top (x 33%–67%, y 20%–25%) · appears, unfolds downward (draw-on / grow / wipe), ease-in · #595759 · text “is shale, / shale, / therockthe” · [crop](shots/shot_013_el_05.jpg)
6. 26.87–27.00s · middle left (x 18%–44%, y 54%–59%) · appears, slides rightward, instant · #5b595d · [crop](shots/shot_013_el_06.jpg)

**Motion #14 27.0–30.9s · 1 events**

- Ground #0d0e10; other main colours #52555b #878b91 #5a5e64 #b0b3b8; drawn layer #8d8e93 #b5b6bb #57585c #dededf
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_014_ly_01.jpg) [crop L2](shots/shot_014_ly_02.jpg) · Continuous layer: 16% of the frame moves through the whole shot (x 0%–100%, y 16%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 29.23–29.63s · top right (x 69%–80%, y 16%–21%) · disappears, ease-in-out · #a19fa1 · text “SO” · [crop](shots/shot_014_el_01.jpg)

**Motion #15 30.9–31.5s · 0 events**

- Ground #0c0e12; other main colours #28292e #313238 #1b1c20 #5c6068; drawn layer #5e5f66 #3c3b3b
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 69%–76%, y 51%–52% · #2f3036 · [crop](shots/shot_015_st_01.jpg)
- S2. never moves: shape / text block · x 0%–7%, y 53%–55% · #24252b · [crop](shots/shot_015_st_02.jpg)
- S3. never moves: shape / text block · x 9%–13%, y 53%–55% · #24252b · [crop](shots/shot_015_st_03.jpg)
- S4. never moves: shape / text block · x 56%–71%, y 53%–55% · #24252b · [crop](shots/shot_015_st_04.jpg)
- S5. never moves: shape / text block · x 76%–80%, y 53%–55% · #24252b · [crop](shots/shot_015_st_05.jpg)
- S6. never moves: shape / text block · x 91%–96%, y 53%–55% · #24252b · [crop](shots/shot_015_st_06.jpg)
- S7. never moves: horizontal line · x 67%–100%, y 72%–73% · #272529 · [crop](shots/shot_015_st_07.jpg)

**Motion #16 31.5–31.9s (slide in) · 4 events**

- Ground #0c0e12; other main colours #2a2b31 #313339 #47433c #1f1b1b; drawn layer #454447 #57565b #eceaec #979597
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 42%–58%, y 17%–21% · #e9e7e9 · text “First,” · [crop](shots/shot_016_st_01.jpg)
- [crop L1](shots/shot_016_ly_01.jpg) [crop L2](shots/shot_016_ly_02.jpg) · Continuous layer: 6% of the frame moves through the whole shot (x 0%–100%, y 32%–69%), e.g. drifting gradients, particle flow, breathing glow
1. 31.57–31.77s · top left (x 0%–22%, y 30%–35%) · disappears, ease-in-out · #362e28 · [crop](shots/shot_016_el_01.jpg)
2. 31.57–31.83s · middle (x 29%–100%, y 34%–38%) · disappears, moves rightward, ease-out · #2f3034 · [crop](shots/shot_016_el_02.jpg)
3. 31.57–31.83s · middle (x 0%–100%, y 39%–66%) · changes, linear · #49433b · [crop](shots/shot_016_el_03.jpg)
4. 31.57–31.70s · bottom (x 0%–100%, y 69%–77%) · changes, unfolds rightward (draw-on / grow / wipe), instant · #2a2b31 · text “Well and machines drawn larger than true / Depths illustrative,none measured” · [crop](shots/shot_016_el_04.jpg)

**Motion #17 31.9–35.4s · 4 events**

- Ground #0c0e12; other main colours #282b31 #323339 #48443d #1f2123; drawn layer #494848 #828284 #b6b5b8 #ecebed
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_017_ly_01.jpg) [crop L2](shots/shot_017_ly_02.jpg) · Continuous layer: 11% of the frame moves through the whole shot (x 0%–100%, y 18%–80%), e.g. drifting gradients, particle flow, breathing glow
1. 32.00–35.20s · top (x 33%–69%, y 15%–22%) · appears, slides leftward, ease-in-out · #343234 · text “drills / drillsstraight / drillsstraightdown,” · [crop](shots/shot_017_el_01.jpg)
2. 32.00–32.93s · middle (x 0%–100%, y 32%–76%) · changes, moves upward, ease-in-out · #323338 · text “Well and machines drawn larger than true / A and rlling nig at night. Photo: Allan D. Hasty, CC BY-SA 3.O, Via Wikimedla / Well and machinesdrawn larger than true” · [crop](shots/shot_017_el_02.jpg)
3. 32.20–32.73s · top (x 22%–58%, y 28%–30%) · appears, slides leftward, ease-in-out · #545558 · [crop](shots/shot_017_el_03.jpg)
4. 33.20–33.73s · middle (x 4%–96%, y 32%–80%) · disappears, moves downward, ease-in · #514f4f · text “Well and machines drawn larger than true / A and rlling nig at night. Photo: Allan D. Hasty, CC BY-SA 3.O, Via Wikimedla / Commons” · [crop](shots/shot_017_el_04.jpg)

**Motion #18 35.4–37.0s · 6 events**

- Ground #0c0e12; other main colours #33343a #494d53 #212429 #666a70; drawn layer #515258 #808186 #b5b4b6 #e5e4e6
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 80%–100%, y 27%–68% · #2a2b31 · [crop](shots/shot_018_st_01.jpg)
- S2. never moves: shape / text block · x 0%–18%, y 29%–68% · #2a2b31 · text “DRILLBIT” · [crop](shots/shot_018_st_02.jpg)
- S3. never moves: shape / text block · x 73%–78%, y 35%–37% · #2a2b31 · [crop](shots/shot_018_st_03.jpg)
- S4. never moves: horizontal line · x 5%–88%, y 78%–80% · #3f4043 · text “Drill bit cutters, close up.Photo: Geolina163, CC BY-SA 3.0,via Wikimedia Commons / OSHA eTool, Oil and Gas Well Drilling and Servicing: Glossary (text by PETEX)” · [crop](shots/shot_018_st_04.jpg)
- [crop L1](shots/shot_018_ly_01.jpg) [crop L2](shots/shot_018_ly_02.jpg) · Continuous layer: 31% of the frame moves through the whole shot (x 0%–100%, y 16%–77%), e.g. drifting gradients, particle flow, breathing glow
1. 35.43–35.97s · top (x 18%–56%, y 15%–21%) · appears, slides leftward, ease-in-out · #565456 · text “that / thatgrinds” · [crop](shots/shot_018_el_01.jpg)
2. 35.70–35.97s · top right (x 69%–84%, y 16%–21%) · disappears, moves rightward, ease-in-out · #797779 · [crop](shots/shot_018_el_02.jpg)
3. 36.30–36.77s · middle right (x 69%–84%, y 60%–69%) · disappears, moves rightward, ease-in · #212228 · [crop](shots/shot_018_el_03.jpg)
4. 36.57–36.83s · top (x 24%–78%, y 21%–26%) · appears, slides rightward, ease-in-out · #484749 · text “throughthe / throughtherock.” · [crop](shots/shot_018_el_04.jpg)
5. 36.77–36.90s · middle right (x 58%–96%, y 30%–50%) · disappears, instant · #999799 · [crop](shots/shot_018_el_05.jpg)
6. 36.77–36.90s · bottom (x 4%–96%, y 76%–79%) · disappears, unfolds downward (draw-on / grow / wipe), instant · #36373a · text “Cut-awayview,illustration / Drill bit cutters, close up.Photo: Geolina163, CC BY-SA 3.0,via Wikimedia Commons / OSHA eTool, Oil and Gas Well Drilling and Servicing: Glossary (text by PETEX)” · [crop](shots/shot_018_el_06.jpg)

**Motion #20 41.7–42.2s · 2 events**

- Ground #0c0e12; other main colours #272b30 #48453e #343439 #e0e1dd; drawn layer #e3e0dc #c5c2be #4f4d4c #898781
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: horizontal line · x 7%–96%, y 27%–31% · #e8e5e0 · text “atethedrillbit / fragmentsordrillcuttingsfromthedrillingareaandtransportthemtothesur” · [crop](shots/shot_020_st_01.jpg)
- S2. never moves: shape / text block · x 9%–13%, y 30%–31% · #e6e3e0 · text “atethedrillbit” · [crop](shots/shot_020_st_02.jpg)
- S3. never moves: shape / text block · x 7%–9%, y 32%–35% · #dbd8d2 · [crop](shots/shot_020_st_03.jpg)
- S4. never moves: shape / text block · x 16%–27%, y 32%–34% · #e2dfda · [crop](shots/shot_020_st_04.jpg)
- S5. never moves: shape / text block · x 42%–47%, y 32%–34% · #e8e5e0 · [crop](shots/shot_020_st_05.jpg)
- S6. never moves: shape / text block · x 67%–71%, y 32%–34% · #e6e3de · [crop](shots/shot_020_st_06.jpg)
- S7. never moves: shape / text block · x 84%–89%, y 32%–34% · #dcd9d4 · [crop](shots/shot_020_st_07.jpg)
- S8. never moves: horizontal line · x 5%–76%, y 78%–80% · #3e3f40 · text “OSHA eTool, Oil and Gas Well Drilling and Servicing: Drilling Ahead” · [crop](shots/shot_020_st_08.jpg)
1. 41.90–42.17s · top right (x 71%–78%, y 16%–21%) · appears, ease-in-out · #3d3b3d · [crop](shots/shot_020_el_01.jpg)
2. 42.17–42.23s · top (x 22%–62%, y 18%–25%) · changes, instant · #414042 · text “andkeepthewell” · [crop](shots/shot_020_el_02.jpg)

**Motion #21 42.2–42.8s (dissolve in) · 0 events**

- Ground #0c0e12; other main colours #666051 #575349 #726b5d #ddded9; drawn layer #e0ddd8 #837c6e #5f5a51 #b2afaa
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 37%–52%, y 17%–20% · #595759 · text “andkeepthewell” · [crop](shots/shot_021_st_01.jpg)
- S2. never moves: shape / text block · x 53%–63%, y 17%–20% · #5b595c · [crop](shots/shot_021_st_02.jpg)
- S3. never moves: shape / text block · x 23%–36%, y 17%–20% · #575557 · [crop](shots/shot_021_st_03.jpg)
- S4. never moves: shape / text block · x 64%–77%, y 17%–20% · #575557 · [crop](shots/shot_021_st_04.jpg)
- S5. never moves: shape / text block · x 53%–64%, y 29%–31% · #dedbd6 · [crop](shots/shot_021_st_05.jpg)
- S6. never moves: shape / text block · x 67%–76%, y 29%–31% · #dddad5 · [crop](shots/shot_021_st_06.jpg)
- S7. never moves: shape / text block · x 82%–91%, y 29%–31% · #d8d5d0 · [crop](shots/shot_021_st_07.jpg)
- S8. never moves: horizontal line · x 5%–76%, y 78%–80% · #3e3f40 · text “OSHA eTool, Oil and Gas Well Drilling and Servicing: Drilling Ahead” · [crop](shots/shot_021_st_08.jpg)
- [crop L1](shots/shot_021_ly_01.jpg) [crop L2](shots/shot_021_ly_02.jpg) · Continuous layer: 38% of the frame moves through the whole shot (x 0%–100%, y 22%–76%), e.g. drifting gradients, particle flow, breathing glow

**Motion #22 42.8–44.1s (wipe in) · 1 events**

- Ground #0c0e12; other main colours #47433c #434038; drawn layer #47443f #676159 #e6ebef
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–44%, y 27%–76% · #49443b · text “Cut-awayview,illustration / Pressure shown In amber / gwellcompletion.” · [crop](shots/shot_022_st_01.jpg)
- S2. never moves: shape / text block · x 51%–100%, y 27%–76% · #49443b · text “sually largerin diameter and longer than drill pipe and is used toline the hole.( / rilling process starting with the surface casing, intermediate casing, and ending / CASING” · [crop](shots/shot_022_st_02.jpg)
- [crop L1](shots/shot_022_ly_01.jpg) [crop L2](shots/shot_022_ly_02.jpg) · Continuous layer: 18% of the frame moves through the whole shot (x 0%–96%, y 16%–80%), e.g. drifting gradients, particle flow, breathing glow
1. 42.90–42.97s · middle (x 36%–62%, y 39%–76%) · changes, instant · #4a443b · text “OSHA eTool, Oil and Gas Well Drilling and Servicing: Casing Operations / CASING” · [crop](shots/shot_022_el_01.jpg)

**Motion #23 44.1–54.6s · 7 events**

- Ground #0c0e12; other main colours #292422 #1b1a1c #3a3632 #d6d7d3; drawn layer #dddbd7 #6a6a6b #aba9a7 #444444
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_023_ly_01.jpg) [crop L2](shots/shot_023_ly_02.jpg) · Continuous layer: 34% of the frame moves through the whole shot (x 0%–100%, y 16%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 46.27–53.67s · top (x 22%–80%, y 16%–22%) · disappears, moves rightward, ease-in · #201e20 · text “and / cement, / sealing” · [crop](shots/shot_023_el_01.jpg)
2. 50.13–53.67s · top (x 20%–82%, y 16%–22%) · disappears, moves rightward, ease-in-out · #413f41 · text “and / cement, / sealing” · [crop](shots/shot_023_el_02.jpg)
3. 51.80–51.93s · top (x 0%–100%, y 26%–27%) · disappears, instant · #1f1f21 · text “te.the well production.casingisinstalled and cemented / andthedrillingrigis / ete thewellproductioncasingisinstalledandcemented and thedrillingrigis” · [crop](shots/shot_023_el_03.jpg)
4. 52.40–53.67s · top (x 16%–84%, y 15%–21%) · disappears, moves downward, ease-out · #3d3b3d · text “and / cement, / sealing” · [crop](shots/shot_023_el_04.jpg)
5. 53.87–54.40s · middle right (x 62%–91%, y 42%–44%) · appears, slides leftward, linear · #181619 · text “and the drillingngis” · [crop](shots/shot_023_el_05.jpg)
6. 54.27–54.53s · middle (x 0%–100%, y 36%–62%) · changes, moves leftward, ease-in · #312a24 · text “gwellcompletion. / QSHA eTool, Oiland Gas Well Drilling and Servicing: Casing Operations / CASING” · [crop](shots/shot_023_el_06.jpg)
7. 54.40–54.53s · bottom (x 0%–100%, y 64%–78%) · changes, moves rightward, instant · #4a443b · text “Well andmachinesdrawn larger than true / Cut-awayview,illustration / CEMENT” · [crop](shots/shot_023_el_07.jpg)

**Motion #24 54.6–58.9s · 10 events**

- Ground #0c0e12; other main colours #1b1b1e #1e1f23 #242426 #414044; drawn layer #999896 #dcdbd8 #79797c #494a4e
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_024_ly_01.jpg) [crop L2](shots/shot_024_ly_02.jpg) · Continuous layer: 24% of the frame moves through the whole shot (x 0%–100%, y 16%–65%), e.g. drifting gradients, particle flow, breathing glow
1. 54.67–55.13s · middle (x 0%–100%, y 36%–44%) · changes, moves leftward, ease-in-out · #1e1c1f · text “Perforating guns, unused and / spent. Photo: William L. / Cunningham, USGS” · [crop](shots/shot_024_el_01.jpg)
2. 54.67–55.07s · bottom (x 0%–100%, y 65%–78%) · changes, moves rightward, ease-out · #1e1c20 · text “Cut-away view,illustration / Cut-away view, illustration / PERFORATIONS” · [crop](shots/shot_024_el_02.jpg)
3. 55.67–55.80s · middle right (x 58%–98%, y 36%–44%) · disappears, instant · #6f6d6f · text “Perforating guns, unused and / spent. Photo: William L. / Cunningham, USGS” · [crop](shots/shot_024_el_03.jpg)
4. 57.07–57.20s · bottom left (x 4%–27%, y 79%–80%) · appears, slides leftward, instant · #353335 · text “Wikipedia:Pumpjack / Wikipedia: Pumpjack” · [crop](shots/shot_024_el_04.jpg)
5. 58.07–58.13s · middle right (x 56%–82%, y 65%–66%) · disappears, instant · #767478 · text “PERFORATIONS” · [crop](shots/shot_024_el_05.jpg)
6. 58.80–58.87s · middle (x 0%–100%, y 26%–45%) · changes, instant · #312f36 · text “Perforating guns, unused and / spent. Photo: William L. / Cunningham, USGS” · [crop](shots/shot_024_el_06.jpg)
7. 58.80–58.87s · middle (x 0%–100%, y 50%–56%) · disappears, instant · #292a30 · [crop](shots/shot_024_el_07.jpg)
8. 58.80–58.87s · middle (x 0%–100%, y 57%–59%) · disappears, instant · #999690 · [crop](shots/shot_024_el_08.jpg)
9. 58.80–58.87s · bottom (x 0%–100%, y 60%–76%) · changes, instant · #1e1c20 · text “Cut-away view,illustration / Cut-away view, illustration / PERFORATIONS” · [crop](shots/shot_024_el_09.jpg)
10. 58.87–58.93s · top left (x 16%–36%, y 26%–27%) · appears, instant · #222022 · [crop](shots/shot_024_el_10.jpg)

**Motion #25 58.9–59.3s · 7 events**

- Ground #0c0e12; other main colours #313339 #282b31 #34302c #45423e; drawn layer #4f4e51 #39383a #676464 #86837e
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–4%, y 36%–37% · #342f2d · [crop](shots/shot_025_st_01.jpg)
- S2. never moves: shape / text block · x 47%–51%, y 36%–37% · #312b27 · [crop](shots/shot_025_st_02.jpg)
- S3. never moves: shape / text block · x 58%–73%, y 36%–37% · #352f2b · [crop](shots/shot_025_st_03.jpg)
- [crop L1](shots/shot_025_ly_01.jpg) [crop L2](shots/shot_025_ly_02.jpg) · Continuous layer: 24% of the frame moves through the whole shot (x 0%–100%, y 18%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 58.97–59.17s · middle right (x 56%–96%, y 41%–44%) · appears, ease-in-out · #3f3935 · [crop](shots/shot_025_el_01.jpg)
2. 58.97–59.23s · middle (x 0%–67%, y 42%–46%) · appears, slides rightward, ease-in-out · #322c28 · [crop](shots/shot_025_el_02.jpg)
3. 58.97–59.23s · middle (x 0%–100%, y 49%–66%) · changes, moves upward, ease-in-out · #49433b · [crop](shots/shot_025_el_03.jpg)
4. 58.97–59.23s · bottom (x 0%–100%, y 74%–78%) · changes, moves leftward, ease-in-out · #3d3a3a · text “Wellandmachunes drawn larger than true / Cut-away view,illustration” · [crop](shots/shot_025_el_04.jpg)
5. 59.03–59.23s · top (x 27%–76%, y 16%–21%) · changes, moves rightward, ease-in-out · #3e3c3e · text “That'swhen the” · [crop](shots/shot_025_el_05.jpg)
6. 59.03–59.17s · top left (x 0%–62%, y 26%–37%) · changes, instant · #322c28 · [crop](shots/shot_025_el_06.jpg)
7. 59.17–59.23s · bottom left (x 4%–29%, y 79%–80%) · disappears, instant · #363536 · [crop](shots/shot_025_el_07.jpg)

**Motion #26 59.3–60.0s (zoom in) · 3 events**

- Ground #0c0e12; other main colours #35312e #45423c #2a2726 #7a7776; drawn layer #837e7d #a5a1a0 #4c4946 #dad7d7
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 26%–44%, y 17%–20% · #5a585a · [crop](shots/shot_026_st_01.jpg)
- S2. never moves: shape / text block · x 46%–63%, y 17%–20% · #595759 · text “That'swhenthe” · [crop](shots/shot_026_st_02.jpg)
- S3. never moves: shape / text block · x 63%–74%, y 17%–20% · #595759 · [crop](shots/shot_026_st_03.jpg)
- S4. never moves: shape / text block · x 0%–100%, y 27%–70% · #36302c · text “A hydraulic fracturing site.Photo:USGS” · [crop](shots/shot_026_st_04.jpg)
- S5. never moves: shape / text block · x 9%–24%, y 29%–32% · #393536 · [crop](shots/shot_026_st_05.jpg)
- S6. never moves: shape / text block · x 47%–64%, y 35%–40% · #312f2f · [crop](shots/shot_026_st_06.jpg)
- S7. never moves: shape / text block · x 13%–100%, y 58%–76% · #4a443c · text “Wellandmachines drawn larger than true / Cut-awayview,illustration” · [crop](shots/shot_026_st_07.jpg)
- S8. never moves: shape / text block · x 0%–40%, y 63%–75% · #3b3632 · text “Wellandmachines drawn larger than true / Cut-awayview,illustration” · [crop](shots/shot_026_st_08.jpg)
1. 59.37–59.77s · top (x 22%–76%, y 20%–26%) · appears, slides rightward, ease-in-out · #2a3544 · text “That'swhenthe / fracking starts.” · [crop](shots/shot_026_el_01.jpg)
2. 59.37–59.57s · middle (x 4%–93%, y 28%–48%) · appears, slides leftward, linear · #7b7574 · text “A hydraulic fracturing site.Photo:USGS” · [crop](shots/shot_026_el_02.jpg)
3. 59.37–59.43s · middle (x 0%–100%, y 49%–78%) · changes, instant · #393531 · text “Wellandmachines drawn larger than true / Cut-awayview,illustration” · [crop](shots/shot_026_el_03.jpg)

**Motion #27 60.0–60.8s · 3 events**

- Ground #0c0e12; other main colours #363331 #464440 #2a2829 #747576; drawn layer #828081 #a7a5a5 #4d4a49 #dbdbdc
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–100%, y 27%–76% · #5b595b · text “Ahydraulic fracturing site.Photo:UsGS / PUMPTRUCKS / Welland machinesdrawnlarger than true” · [crop](shots/shot_027_st_01.jpg)
- Continuous layer: 1% of the frame moves through the whole shot (x 11%–78%, y 51%–71%), e.g. drifting gradients, particle flow, breathing glow
1. 60.33–60.73s · top (x 22%–76%, y 15%–26%) · changes, moves upward, ease-in-out · #100e11 · text “Trucks” · [crop](shots/shot_027_el_01.jpg)
2. 60.47–60.53s · bottom (x 4%–78%, y 78%–80%) · appears, instant · #333133 · text “OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion” · [crop](shots/shot_027_el_02.jpg)
3. 60.73–60.80s · middle (x 4%–87%, y 28%–45%) · changes, instant · #d1cfcf · text “Ahydraulic fracturing site.Photo:UsGS” · [crop](shots/shot_027_el_03.jpg)

**Motion #29 62.2–65.6s · 7 events**

- Ground #0c0e12; other main colours #1c1c1e #222124 #d9d9d5 #2c2a2a; drawn layer #dcdad6 #a6a096 #545354 #ebae4d
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: horizontal line · x 5%–79%, y 78%–80% · #403f40 · text “OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion” · [crop](shots/shot_029_st_01.jpg)
- [crop L1](shots/shot_029_ly_01.jpg) [crop L2](shots/shot_029_ly_02.jpg) · Continuous layer: 25% of the frame moves through the whole shot (x 0%–100%, y 18%–75%), e.g. drifting gradients, particle flow, breathing glow
1. 62.27–62.33s · bottom (x 18%–100%, y 76%–77%) · disappears, instant · #303136 · text “Welland machines drawn larger than true / OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion / Cut-away view,illustration” · [crop](shots/shot_029_el_01.jpg)
2. 62.73–63.07s · middle (x 0%–100%, y 45%–48%) · disappears, moves rightward, ease-in-out · #2a2b31 · [crop](shots/shot_029_el_02.jpg)
3. 62.73–63.13s · bottom (x 7%–82%, y 61%–76%) · disappears, moves rightward, ease-in-out · #2e2f34 · text “Hours shown inseconds / Welland machines drawn larger than true / Pressure shown in amber” · [crop](shots/shot_029_el_03.jpg)
4. 62.80–63.13s · middle (x 0%–100%, y 26%–41%) · changes, moves rightward, ease-in-out · #232124 · text “biend andpump fracturing fluid into the well through high pressure lines. hre /  (sand, or an altermative proppant), and chemical additives (see Fracturing Flui / ouslyforseveralhourswhileworkersmonitorwellpressureandfractureprogres” · [crop](shots/shot_029_el_04.jpg)
5. 64.13–64.53s · middle (x 0%–100%, y 36%–41%) · changes, moves rightward, ease-in-out · #292527 · [crop](shots/shot_029_el_05.jpg)
6. 64.20–65.53s · bottom (x 0%–100%, y 60%–77%) · changes, moves rightward, ease-in · #2a282b · text “Hours shown inseconds / Welland machines drawn larger than true / OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion” · [crop](shots/shot_029_el_06.jpg)
7. 64.87–65.53s · middle (x 0%–100%, y 28%–43%) · changes, moves rightward, ease-in · #b5b2ad · text “biend andpump fracturing fluid into the well through high pressure lines. hre /  (sand, or an altermative proppant), and chemical additives (see Fracturing Flui / ouslyforseveralhourswhileworkersmonitorwellpressureandfractureprogres” · [crop](shots/shot_029_el_07.jpg)

**Motion #30 65.6–66.3s · 4 events**

- Ground #0c0e12; other main colours #1c1c1e #222225 #2f2f32 #423f39; drawn layer #42403f #6a655c #b5a17b #dee6ee
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 5%–37%, y 72%–75% · #424245 · text “Cracksdrawnwider than true / Pressure shown in amber” · [crop](shots/shot_030_st_01.jpg)
- S2. never moves: shape / text block · x 83%–89%, y 74%–74% · #29272b · [crop](shots/shot_030_st_02.jpg)
- S3. never moves: horizontal line · x 5%–79%, y 78%–80% · #3d3e3f · text “OSHA eTool, Oiland Gas Well Drilling and Servicing: Well Completion” · [crop](shots/shot_030_st_03.jpg)
1. 65.67–65.73s · middle (x 7%–96%, y 32%–36%) · disappears, instant · #6a6765 · [crop](shots/shot_030_el_01.jpg)
2. 65.93–66.27s · middle (x 0%–100%, y 26%–76%) · appears, slides rightward, ease-in · #222023 · text “Cracksdrawnwider than true / Pressure shown in amber” · [crop](shots/shot_030_el_02.jpg)
3. 66.13–66.27s · top (x 22%–80%, y 15%–22%) · changes, moves leftward, instant · #0f0d0f · text “aroundtheholes.” · [crop](shots/shot_030_el_03.jpg)
4. 66.20–66.27s · middle left (x 0%–22%, y 62%–65%) · disappears, instant · #2f2d2f · [crop](shots/shot_030_el_04.jpg)

**Motion #32 68.1–70.5s (zoom in) · 3 events**

- Ground #0a0d10; other main colours #171718 #242628 #393b3e #a1a09e; drawn layer #5c5c5d #dbdad9 #43403f #8e8d8c
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_032_ly_01.jpg) [crop L2](shots/shot_032_ly_02.jpg) · Continuous layer: 23% of the frame moves through the whole shot (x 0%–98%, y 16%–80%), e.g. drifting gradients, particle flow, breathing glow
1. 68.13–68.20s · top (x 20%–76%, y 21%–27%) · disappears, instant · #36404e · text “ateruseperwellcanbeanywherefromabout1.5milliongallons / herefromabout1.5milliongallonstoabout16milliongallons. / erefromabout1.5milliongallonstoabout16milliongallons.” · [crop](shots/shot_032_el_01.jpg)
2. 69.80–70.40s · middle (x 0%–100%, y 28%–78%) · changes, unfolds downward (draw-on / grow / wipe), ease-in · #393531 · text “ateruseperwellcanbeanywherefromabout1.5milliongallons / USGS FAQ How much water does the typlcal hydraullically fractured well require? / 16,000.000” · [crop](shots/shot_032_el_02.jpg)
3. 69.93–70.40s · top (x 18%–84%, y 15%–22%) · appears, slides rightward, ease-in · #434144 · text “uptos / sixteen / up to sixteenmillion” · [crop](shots/shot_032_el_03.jpg)

**Motion #33 70.5–71.4s · 1 events**

- Ground #0c0e12; other main colours #313238 #29292e #1e1c1d #403d36; drawn layer #636262 #423f3b #b1a180
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 70.57–70.70s · middle (x 0%–100%, y 35%–77%) · changes, moves upward, instant · #2c2c31 · text “Well andmachines drawn larger than true / Pressure shown in amber / Cut-away view,illustration” · [crop](shots/shot_033_el_01.jpg)

**Motion #34 71.4–76.4s · 10 events**

- Ground #0c0e12; other main colours #1c1d21 #2e2e33 #464649 #d1d2cd; drawn layer #dedbd5 #beb29b #4b494e #998f7c
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_034_ly_01.jpg) [crop L2](shots/shot_034_ly_02.jpg) · Continuous layer: 32% of the frame moves through the whole shot (x 0%–100%, y 16%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 71.63–76.37s · bottom right (x 84%–100%, y 74%–76%) · appears, ease-in-out · #3a383c · [crop](shots/shot_034_el_01.jpg)
2. 73.77–76.37s · top (x 0%–100%, y 20%–32%) · changes, unfolds upward (draw-on / grow / wipe), linear · #bab6b0 · text “Ig itvolves forcing a liquid (primarily waler] uinder high prestire Irom a wellbore agm / Cture lengthens as the high-pressure liquid in the wellbore flows into the formation. Thi / lI, solid particles (usually sand or a manmade granular solid of similer size) ihat fills thc” · [crop](shots/shot_034_el_02.jpg)
3. 74.10–74.17s · bottom (x 4%–89%, y 79%–80%) · appears, instant · #312f31 · text “OSHA eTool, Oil and Gas Well Drilling and Servicing: Hydraullc Fracturing Fluid / OSHA eTool, Oil and Gas Well Drilling and Servicing:Hydraullc Fracturing Fluid / OSHA eTool, Oil and Gas Well Drilling and Servicing: Hydraullic Fracturing Fluid” · [crop](shots/shot_034_el_03.jpg)
4. 74.90–76.37s · middle right (x 87%–100%, y 35%–46%) · appears, slides downward, linear · #49474b · [crop](shots/shot_034_el_04.jpg)
5. 74.90–76.37s · bottom left (x 0%–58%, y 61%–77%) · appears, slides rightward, ease-in-out · #4d4b4e · text “Cut-awayview,llustration / Magnitiid illustibonpola mucrograpn / Magnified illustration,not a micrograph” · [crop](shots/shot_034_el_05.jpg)
6. 75.03–76.37s · middle (x 38%–58%, y 42%–46%) · appears, slides leftward, linear · #bfaf8a · text “PROPPANT” · [crop](shots/shot_034_el_06.jpg)
7. 75.17–76.37s · middle right (x 82%–100%, y 62%–68%) · appears, linear · #3a383c · [crop](shots/shot_034_el_07.jpg)
8. 75.50–76.37s · middle right (x 82%–100%, y 35%–46%) · changes, linear · #434145 · [crop](shots/shot_034_el_08.jpg)
9. 75.50–76.37s · middle left (x 0%–58%, y 38%–46%) · appears, linear · #4e4c50 · text “he fracture open,This allows hydrocarbons such as crudeoil andnatural gas to llow t / EIA,Today inEnergy,March 15,2016 / proppankeeps thefractureopenThisallowshydrocarbonssuchacrueoilandatu” · [crop](shots/shot_034_el_09.jpg)
10. 76.17–76.37s · bottom right (x 82%–100%, y 70%–71%) · appears, slides rightward, linear · #3a383c · [crop](shots/shot_034_el_10.jpg)

**Motion #37 77.5–78.0s · 3 events**

- Ground #0c0e12; other main colours #2b2a2d #252427 #343337 #c7c8c4; drawn layer #dddbd7 #454446 #b8b7b3 #82817e
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 84%–93%, y 44%–45% · #2a262a · [crop](shots/shot_037_st_01.jpg)
- S2. never moves: shape / text block · x 5%–9%, y 78%–80% · #3c3a3c · [crop](shots/shot_037_st_02.jpg)
- S3. never moves: shape / text block · x 36%–40%, y 78%–79% · #3c3d3e · [crop](shots/shot_037_st_03.jpg)
- Continuous layer: 3% of the frame moves through the whole shot (x 7%–100%, y 28%–78%), e.g. drifting gradients, particle flow, breathing glow
1. 77.53–77.67s · bottom right (x 76%–100%, y 65%–75%) · changes, moves downward, instant · #272529 · [crop](shots/shot_037_el_01.jpg)
2. 77.60–77.93s · top (x 31%–69%, y 16%–25%) · changes, unfolds downward (draw-on / grow / wipe), ease-in-out · #353335 · text “throughinto / the well.” · [crop](shots/shot_037_el_02.jpg)
3. 77.60–77.67s · middle left (x 0%–18%, y 62%–70%) · changes, instant · #262428 · [crop](shots/shot_037_el_03.jpg)

**Motion #38 78.0–78.8s · 2 events**

- Ground #0c0e12; other main colours #333338 #1b1c20 #2f3036 #282a2f; drawn layer #3e3d40 #58575a
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–4%, y 27%–31% · #353337 · [crop](shots/shot_038_st_01.jpg)
- S2. never moves: shape / text block · x 96%–100%, y 27%–31% · #343236 · [crop](shots/shot_038_st_02.jpg)
1. 78.07–78.73s · top (x 31%–69%, y 18%–26%) · disappears, moves leftward, ease-in · #3c3b3e · [crop](shots/shot_038_el_01.jpg)
2. 78.07–78.13s · bottom left (x 4%–44%, y 78%–80%) · changes, instant · #211f23 · text “EIA,Todayin Energy,March15,2016” · [crop](shots/shot_038_el_02.jpg)

**Motion #39 78.8–80.3s (dissolve in) · 6 events**

- Ground #0c0e12; other main colours #2f3036 #1d1d22 #392e1d #d0d1d3; drawn layer #dad8da #606165 #aaa8aa #44403d
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–100%, y 50%–62% · #2f3036 · text “A wellhead christmas tree,North Dakota.Photo.Tim Evanson,CC BY-SA 2.O,Via / Wikimedla.Commons / A wellhead christmas tree,North Dakota.Photo.Tim Evanson,CC BY-SA 2.0,via” · [crop](shots/shot_039_st_01.jpg)
- S2. never moves: horizontal line · x 20%–49%, y 73%–74% · #3b393d · text “Well andmachines drawn larger than true / One drop of oilmarked and drawnlarger / Pressure shown in amber” · [crop](shots/shot_039_st_02.jpg)
- [crop L1](shots/shot_039_ly_01.jpg) [crop L2](shots/shot_039_ly_02.jpg) · Continuous layer: 23% of the frame moves through the whole shot (x 0%–100%, y 16%–80%), e.g. drifting gradients, particle flow, breathing glow
1. 78.87–79.40s · middle (x 0%–96%, y 30%–57%) · changes, unfolds leftward (draw-on / grow / wipe), instant · #7e7c7f · text “A wellhead christmas tree,North Dakota.Photo.Tim Evanson,CC BY-SA 2.O,Via / Wikimedla.Commons / A wellhead christmas tree,North Dakota.Photo.Tim Evanson,CC BY-SA 2.0,via” · [crop](shots/shot_039_el_01.jpg)
2. 78.87–79.60s · middle left (x 0%–51%, y 36%–44%) · changes, moves leftward, ease-in-out · #24252b · [crop](shots/shot_039_el_02.jpg)
3. 78.93–79.73s · top (x 0%–100%, y 26%–27%) · changes, moves rightward, ease-in-out · #110f11 · [crop](shots/shot_039_el_03.jpg)
4. 79.40–79.60s · middle left (x 0%–51%, y 38%–40%) · changes, moves rightward, ease-in-out · #24252b · [crop](shots/shot_039_el_04.jpg)
5. 79.93–80.13s · middle left (x 0%–24%, y 62%–64%) · appears, linear · #2f2418 · [crop](shots/shot_039_el_05.jpg)
6. 80.20–80.27s · middle right (x 58%–96%, y 30%–52%) · changes, instant · #c9c7c9 · [crop](shots/shot_039_el_06.jpg)

**Motion #40 80.3–83.0s · 7 events**

- Ground #0c0e12; other main colours #272a2e #303137 #1d1c1e #5c5f66; drawn layer #606065 #413e38 #dbd9d6 #8f8576
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–7%, y 55%–58% · #323339 · [crop](shots/shot_040_st_01.jpg)
- S2. never moves: horizontal line · x 9%–100%, y 55%–58% · #323339 · [crop](shots/shot_040_st_02.jpg)
- [crop L1](shots/shot_040_ly_01.jpg) [crop L2](shots/shot_040_ly_02.jpg) · Continuous layer: 8% of the frame moves through the whole shot (x 4%–96%, y 16%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 80.33–80.67s · middle (x 0%–100%, y 28%–44%) · disappears, moves leftward, linear · #3f4046 · text “thecasingorliner.fpressureissufficienttheoilorgaswillrisetothesurface. / gaswillrise tothesurface.” · [crop](shots/shot_040_el_01.jpg)
2. 80.33–80.40s · middle (x 0%–100%, y 62%–64%) · disappears, instant · #2c241a · [crop](shots/shot_040_el_02.jpg)
3. 80.47–80.53s · top (x 9%–91%, y 26%–27%) · changes, instant · #131113 · text “thecasingorliner.fpressureissufficienttheoilorgaswillrisetothesurface. / gaswillrise tothesurface.” · [crop](shots/shot_040_el_03.jpg)
4. 82.87–82.93s · middle (x 0%–100%, y 32%–55%) · disappears, instant · #303136 · [crop](shots/shot_040_el_04.jpg)
5. 82.87–82.93s · middle left (x 0%–51%, y 50%–56%) · changes, instant · #323339 · [crop](shots/shot_040_el_05.jpg)
6. 82.87–82.93s · middle (x 0%–100%, y 59%–60%) · changes, instant · #3d3e44 · [crop](shots/shot_040_el_06.jpg)
7. 82.87–82.93s · bottom (x 0%–100%, y 64%–80%) · appears, instant · #606167 · text “Pressure shown in amber / One drop of oilmarked and drawn larger / OSHA eTool, Oil and Gas Well Drilling and Servicing: Special Services” · [crop](shots/shot_040_el_07.jpg)

**Motion #41 83.0–87.5s · 10 events**

- Ground #0c0e12; other main colours #3a3632 #1a191b #282523 #57453d; drawn layer #584035 #5e5c5b #dfdedc #969393
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_041_ly_01.jpg) [crop L2](shots/shot_041_ly_02.jpg) · Continuous layer: 21% of the frame moves through the whole shot (x 0%–100%, y 18%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 83.03–87.50s · top (x 42%–62%, y 16%–17%) · appears, slides leftward, ease-out · #415668 · text “thepumpjack / Amotor / with” · [crop](shots/shot_041_el_01.jpg)
2. 83.03–83.30s · middle right (x 64%–100%, y 29%–53%) · appears, slides downward, linear · #151318 · text “CRANK / COUNTERWEIGHTS” · [crop](shots/shot_041_el_02.jpg)
3. 84.37–84.57s · bottom (x 4%–78%, y 74%–79%) · changes, moves rightward, ease-in · #120f0f · text “awayview,llustration / compressed / OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion” · [crop](shots/shot_041_el_03.jpg)
4. 85.17–85.50s · bottom (x 11%–100%, y 71%–76%) · changes, moves rightward, ease-in-out · #393531 · text “awayview,llustration / compressed / OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion” · [crop](shots/shot_041_el_04.jpg)
5. 85.37–85.50s · middle right (x 62%–87%, y 45%–54%) · appears, slides rightward, instant · #3a352e · [crop](shots/shot_041_el_05.jpg)
6. 86.77–87.50s · middle (x 0%–100%, y 26%–56%) · changes, moves leftward, ease-in · #2b292d · text “If thewell doesn'tproduceadequately,abeampumpingunitmaybeinstalled / Ifthewelldoesn'tproduceadequatelyabeampumpingunitmaybeinstalled. / If thewell doesn'tproduceadequately,a beampumping unitmaybeinstalled.” · [crop](shots/shot_041_el_06.jpg)
7. 87.10–87.50s · bottom (x 0%–100%, y 69%–78%) · changes, moves leftward, ease-in-out · #2c2624 · text “awayview,llustration / compressed / OSHA eTool, Oil and Gas Well Drilling and Servicing: Well Completion” · [crop](shots/shot_041_el_07.jpg)
8. 87.23–87.50s · middle (x 0%–100%, y 59%–68%) · disappears, moves leftward, ease-in-out · #3c3630 · text “"generallywith counterweig / then / Wikipedla:Pumpjack” · [crop](shots/shot_041_el_08.jpg)
9. 87.43–87.50s · top right (x 67%–78%, y 16%–22%) · appears, instant · #91969a · [crop](shots/shot_041_el_09.jpg)
10. 87.43–87.50s · top left (x 24%–36%, y 18%–21%) · appears, instant · #3e3c3e · [crop](shots/shot_041_el_10.jpg)

**Motion #44 91.0–92.2s · 5 events**

- Ground #0c0e12; other main colours #292a30 #3c3c3f #1c1c1e #58595a; drawn layer #7c7a7c #a19fa1 #555559 #e6e4e5
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 60%–73%, y 29%–35% · #494747 · [crop](shots/shot_044_st_01.jpg)
- S2. never moves: shape / text block · x 7%–42%, y 30%–44% · #444244 · [crop](shots/shot_044_st_02.jpg)
- S3. never moves: shape / text block · x 93%–100%, y 32%–38% · #323339 · [crop](shots/shot_044_st_03.jpg)
- S4. never moves: shape / text block · x 67%–91%, y 36%–42% · #413e40 · [crop](shots/shot_044_st_04.jpg)
- S5. never moves: shape / text block · x 0%–44%, y 53%–67% · #292a30 · [crop](shots/shot_044_st_05.jpg)
- S6. never moves: shape / text block · x 58%–100%, y 53%–67% · #292a30 · [crop](shots/shot_044_st_06.jpg)
- S7. never moves: horizontal line · x 0%–44%, y 73%–76% · #2e2f34 · text “Wellandmachinesdrawn larger than true / Cut-awayview,llustration / Cut-away view,illustration” · [crop](shots/shot_044_st_07.jpg)
- S8. never moves: horizontal line · x 56%–100%, y 73%–76% · #292a30 · [crop](shots/shot_044_st_08.jpg)
- [crop L1](shots/shot_044_ly_01.jpg) [crop L2](shots/shot_044_ly_02.jpg) · Continuous layer: 14% of the frame moves through the whole shot (x 0%–100%, y 18%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 91.07–91.13s · middle right (x 58%–100%, y 48%–56%) · disappears, instant · #606166 · text “Richie,DeGolyer Library,Southern” · [crop](shots/shot_044_el_01.jpg)
2. 91.07–91.13s · middle left (x 0%–44%, y 48%–54%) · changes, instant · #2a2b30 · text “MethodistUniversity / Sucker rods,Dallas,1959.Photo:Robert / Methodist University” · [crop](shots/shot_044_el_02.jpg)
3. 92.07–92.13s · top (x 24%–73%, y 16%–21%) · changes, instant · #0f0d0f · text “downthewell. / At” · [crop](shots/shot_044_el_03.jpg)
4. 92.07–92.13s · middle (x 4%–93%, y 28%–46%) · changes, instant · #737072 · text “MethodistUniversity / Sucker rods,Dallas,1959.Photo:Robert / Richie,DeGolyer Library,Southern” · [crop](shots/shot_044_el_04.jpg)
5. 92.13–92.20s · middle (x 56%–58%, y 57%–68%) · appears, instant · #696669 · [crop](shots/shot_044_el_05.jpg)

**Motion #45 92.2–95.7s (dissolve in) · 11 events**

- Ground #0c0e12; other main colours #28292e #dadbd6 #a2a5a4 #8c8b8a; drawn layer #dfdcd9 #b1b0af #908f8d #4e4f52
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–4%, y 27%–45% · #292a30 · [crop](shots/shot_045_st_01.jpg)
- S2. never moves: shape / text block · x 93%–100%, y 27%–34% · #292a30 · [crop](shots/shot_045_st_02.jpg)
- S3. never moves: shape / text block · x 13%–18%, y 42%–43% · #292a30 · [crop](shots/shot_045_st_03.jpg)
- S4. never moves: shape / text block · x 0%–53%, y 46%–76% · #292a30 · text “Well and machines drawn larger than true / Cut-away view,illustration / Cut-away view, illustration” · [crop](shots/shot_045_st_04.jpg)
- S5. never moves: vertical line · x 76%–80%, y 47%–76% · #28292f · [crop](shots/shot_045_st_05.jpg)
- [crop L1](shots/shot_045_ly_01.jpg) [crop L2](shots/shot_045_ly_02.jpg) · Continuous layer: 17% of the frame moves through the whole shot (x 4%–98%, y 16%–79%), e.g. drifting gradients, particle flow, breathing glow
1. 92.27–95.60s · top (x 27%–76%, y 15%–28%) · appears, unfolds upward (draw-on / grow / wipe), ease-in-out · #605f5f · text “Atthebottom, / therod / therodworks” · [crop](shots/shot_045_el_01.jpg)
2. 92.27–92.33s · top right (x 87%–93%, y 28%–34%) · disappears, instant · #535154 · [crop](shots/shot_045_el_02.jpg)
3. 92.27–92.33s · middle left (x 4%–53%, y 35%–46%) · disappears, instant · #403e42 · text “PLUNGER / The oncrafion of a sucker rod oumn is relatively simnl” · [crop](shots/shot_045_el_03.jpg)
4. 92.27–92.33s · middle right (x 76%–80%, y 36%–46%) · disappears, instant · #2a282b · [crop](shots/shot_045_el_04.jpg)
5. 93.00–95.13s · top (x 29%–76%, y 20%–28%) · appears, slides rightward, ease-out · #2b2e4b · text “Atthebottom, / therod / therodworks” · [crop](shots/shot_045_el_05.jpg)
6. 93.07–93.80s · middle (x 7%–98%, y 36%–77%) · appears, slides rightward, ease-in · #959391 · text “Well and machines drawn larger than true / Cut-away view,illustration / Wikipedia:Pumpjack” · [crop](shots/shot_045_el_06.jpg)
7. 93.87–94.80s · middle left (x 7%–53%, y 39%–46%) · changes, moves rightward, linear · #292a30 · text “PLUNGER” · [crop](shots/shot_045_el_07.jpg)
8. 94.33–95.47s · middle left (x 4%–49%, y 50%–57%) · changes, unfolds downward (draw-on / grow / wipe), ease-in-out · #292a30 · text “TRAVELINGVALVE” · [crop](shots/shot_045_el_08.jpg)
9. 94.53–95.07s · middle left (x 4%–60%, y 48%–79%) · changes, moves downward, ease-in · #3f3f43 · text “Well and machines drawn larger than true / Cut-away view,illustration / Wikipedia:Pumpjack” · [crop](shots/shot_045_el_09.jpg)
10. 94.87–95.60s · top (x 4%–82%, y 15%–28%) · changes, ease-out · #100e10 · text “Atthebottom, / therod / therodworks” · [crop](shots/shot_045_el_10.jpg)
11. 95.67–95.73s · middle (x 4%–96%, y 49%–80%) · changes, instant · #b0aeab · text “Well and machines drawn larger than true / Cut-away view,illustration / Wikipedia:Pumpjack” · [crop](shots/shot_045_el_11.jpg)

**Motion #46 95.7–104.9s · 7 events**

- Ground #0c0e12; other main colours #2b2b30 #acafb4 #939391 #312116; drawn layer #b2b1b3 #94928f #dfdcd8
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–4%, y 27%–32% · #313238 · [crop](shots/shot_046_st_01.jpg)
- S2. never moves: vertical line · x 0%–9%, y 35%–76% · #323339 · [crop](shots/shot_046_st_02.jpg)
- S3. never moves: vertical line · x 98%–100%, y 36%–76% · #323339 · [crop](shots/shot_046_st_03.jpg)
- S4. never moves: shape / text block · x 13%–20%, y 38%–40% · #323339 · [crop](shots/shot_046_st_04.jpg)
- S5. never moves: shape / text block · x 13%–20%, y 42%–58% · #323339 · [crop](shots/shot_046_st_05.jpg)
- S6. never moves: shape / text block · x 13%–20%, y 60%–70% · #323339 · [crop](shots/shot_046_st_06.jpg)
- [crop L1](shots/shot_046_ly_01.jpg) [crop L2](shots/shot_046_ly_02.jpg) · Continuous layer: 24% of the frame moves through the whole shot (x 7%–89%, y 16%–77%), e.g. drifting gradients, particle flow, breathing glow
1. 95.80–95.87s · bottom left (x 4%–53%, y 78%–79%) · disappears, instant · #333435 · text “USPatent6,746,221B1(2004),background / US Patent 6,746,221B1(2004),background / USPatent 6,746,221B1(2004),background” · [crop](shots/shot_046_el_01.jpg)
2. 99.07–104.87s · middle (x 33%–42%, y 40%–70%) · changes, unfolds leftward (draw-on / grow / wipe), ease-in-out · #323339 · [crop](shots/shot_046_el_02.jpg)
3. 102.60–102.67s · bottom left (x 16%–47%, y 78%–80%) · disappears, instant · #2e2f30 · text “USPatent6,746,221B1(2004),background / US Patent 6,746,221B1(2004),background / USPatent 6,746,221B1(2004),background” · [crop](shots/shot_046_el_03.jpg)
4. 103.20–104.87s · middle (x 0%–100%, y 28%–76%) · changes, unfolds leftward (draw-on / grow / wipe), ease-in · #323339 · text “force of the sucker rod.During the upstroke,the traveling / valve is closed and the fluid above the plunger is lifted to the / surface by the plunger and sucker rod. At the same time, the” · [crop](shots/shot_046_el_04.jpg)
5. 104.27–104.80s · bottom (x 7%–76%, y 72%–79%) · disappears, scales up, ease-in-out · #969491 · text “Stroke timed to thewords / Cut-away view,illustration / USPatent6,746,221B1(2004),background” · [crop](shots/shot_046_el_05.jpg)
6. 104.33–104.80s · top (x 29%–51%, y 15%–22%) · appears, slides rightward, ease-in-out · #2b374a · text “the / thetoponecloses / and” · [crop](shots/shot_046_el_06.jpg)
7. 104.80–104.87s · top (x 62%–71%, y 18%–21%) · appears, instant · #909093 · [crop](shots/shot_046_el_07.jpg)

**Motion #47 104.9–105.1s (zoom in) · 5 events**

- Ground #0c0e12; other main colours #a1916c #8f9091 #616264 #49453c; drawn layer #998f7c #dedcd8 #b8b8b9 #625e59
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 71%–93%, y 30%–32% · #dddad5 · [crop](shots/shot_047_st_01.jpg)
- S2. never moves: horizontal line · x 5%–72%, y 33%–35% · #424346 · text “up alongwith oil duringthe extraction process. / USGS:Mythsand Misconceptions Abaut Induced Earthquakes” · [crop](shots/shot_047_st_02.jpg)
- S3. never moves: shape / text block · x 11%–100%, y 35%–52% · #2f3036 · text “USGS:Mythsand Misconceptions Abaut Induced Earthquakes” · [crop](shots/shot_047_st_03.jpg)
- S4. never moves: shape / text block · x 0%–9%, y 35%–52% · #2f3036 · [crop](shots/shot_047_st_04.jpg)
- S5. never moves: horizontal line · x 11%–89%, y 56%–58% · #2c2a2f · [crop](shots/shot_047_st_05.jpg)
- S6. never moves: shape / text block · x 0%–9%, y 61%–64% · #2d2b2f · [crop](shots/shot_047_st_06.jpg)
- S7. never moves: horizontal line · x 13%–89%, y 61%–63% · #2e2c30 · [crop](shots/shot_047_st_07.jpg)
- S8. never moves: horizontal line · x 11%–89%, y 64%–66% · #2b292d · [crop](shots/shot_047_st_08.jpg)
- [crop L1](shots/shot_047_ly_01.jpg) [crop L2](shots/shot_047_ly_02.jpg) · Continuous layer: 8% of the frame moves through the whole shot (x 0%–100%, y 26%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 104.97–105.03s · middle (x 0%–100%, y 26%–51%) · changes, instant · #52514e · text “hydraulie fracturing fluidMostof thewastewater in Oklahoma is / up alongwith oil duringthe extraction process. / USGS:Mythsand Misconceptions Abaut Induced Earthquakes” · [crop](shots/shot_047_el_01.jpg)
2. 104.97–105.03s · middle (x 0%–100%, y 56%–69%) · disappears, instant · #323339 · [crop](shots/shot_047_el_02.jpg)
3. 104.97–105.03s · bottom (x 22%–100%, y 76%–77%) · disappears, instant · #292a2b · [crop](shots/shot_047_el_03.jpg)
4. 105.03–105.10s · top (x 29%–71%, y 15%–22%) · disappears, instant · #35485a · text “Saltywater” · [crop](shots/shot_047_el_04.jpg)
5. 105.03–105.10s · middle (x 16%–84%, y 52%–56%) · changes, instant · #28262a · [crop](shots/shot_047_el_05.jpg)

**Motion #48 105.1–106.2s (zoom in) · 0 events**

- Ground #0c0e12; other main colours #2b2c32 #3c3d43 #4f5258 #1b1d21; drawn layer #595a5f #e0deda #8f8e8f #c0bebb
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: horizontal line · x 7%–93%, y 29%–34% · #e4e1dd · text “hydraulicfracturingfluid.MostofthewastewaterinOklahoma / upalongwithoilduringtheextractionprocess. / USGS:Myths and Misconceptions About Induced Earthquakes” · [crop](shots/shot_048_st_01.jpg)
- S2. never moves: shape / text block · x 67%–71%, y 33%–34% · #48494c · [crop](shots/shot_048_st_02.jpg)
- Continuous layer: 2% of the frame moves through the whole shot (x 0%–98%, y 28%–70%), e.g. drifting gradients, particle flow, breathing glow

**Motion #49 106.2–108.5s · 8 events**

- Ground #0c0e12; other main colours #35312e #302a26 #242221 #dcdad6; drawn layer #e0deda #4f4e50 #878684 #bfbcb9
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_049_ly_01.jpg) [crop L2](shots/shot_049_ly_02.jpg) · Continuous layer: 41% of the frame moves through the whole shot (x 0%–100%, y 16%–76%), e.g. drifting gradients, particle flow, breathing glow
1. 106.27–106.33s · top left (x 0%–60%, y 26%–27%) · disappears, instant · #3f3e3a · text “hydraulicfracturingfluid.Mostof thewastewaterin Oklahomai / extractlonprocess. / leextractionprocess.” · [crop](shots/shot_049_el_01.jpg)
2. 106.27–106.33s · bottom (x 9%–64%, y 76%–77%) · disappears, instant · #312c29 · text “Timecompressed / Time compressed / Well and machines drawn larger than true” · [crop](shots/shot_049_el_02.jpg)
3. 106.53–107.07s · middle (x 0%–100%, y 50%–56%) · changes, moves rightward, ease-in-out · #312b27 · [crop](shots/shot_049_el_03.jpg)
4. 106.80–106.93s · middle (x 0%–100%, y 49%–54%) · disappears, moves rightward, instant · #5f6066 · [crop](shots/shot_049_el_04.jpg)
5. 107.07–107.13s · middle (x 0%–100%, y 38%–40%) · changes, instant · #302a24 · [crop](shots/shot_049_el_05.jpg)
6. 107.27–107.33s · bottom right (x 73%–100%, y 76%–77%) · disappears, instant · #26211c · [crop](shots/shot_049_el_06.jpg)
7. 107.60–108.00s · top right (x 64%–82%, y 16%–22%) · appears, slides rightward, ease-in-out · #6b6a6d · text “every / everywell.” · [crop](shots/shot_049_el_07.jpg)
8. 107.93–108.00s · top (x 18%–53%, y 18%–21%) · appears, instant · #32343b · text “comesupwithlit, / atnearly” · [crop](shots/shot_049_el_08.jpg)

**Motion #51 111.9–112.8s (blur in) · 2 events**

- Ground #0c0e12; other main colours #32343c #1b1f26 #42474e; drawn layer #3f4047 #61646d #a7a9af #eaf0f6
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

1. 112.00–112.40s · top (x 22%–80%, y 15%–22%) · appears, slides rightward, ease-in-out · #2e3a4a · text “and inOklahoma, / andinoklahoma,” · [crop](shots/shot_051_el_01.jpg)
2. 112.07–112.67s · middle (x 0%–100%, y 26%–80%) · appears, slides rightward, ease-in · #32343c · text “Timecompressed / After USGS: Oklahoma area seismicity,magnitude 3 and greater, 1973 to July 2017 / AfterUSGS:Oklahoma area seismicity.magnitude 3 and greater,1973 toJuly 2017” · [crop](shots/shot_051_el_02.jpg)

**Motion #52 112.8–115.0s · 9 events**

- Ground #0c0e12; other main colours #2e2b30 #1a1b20 #383739 #282523; drawn layer #605b59 #424143 #858186 #acabb0
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- [crop L1](shots/shot_052_ly_01.jpg) [crop L2](shots/shot_052_ly_02.jpg) · Continuous layer: 24% of the frame moves through the whole shot (x 0%–100%, y 16%–80%), e.g. drifting gradients, particle flow, breathing glow
1. 112.83–113.17s · middle right (x 60%–80%, y 36%–44%) · disappears, unfolds upward (draw-on / grow / wipe), ease-in-out · #0c0d10 · [crop](shots/shot_052_el_01.jpg)
2. 112.83–113.17s · middle right (x 87%–100%, y 36%–44%) · changes, unfolds upward (draw-on / grow / wipe), ease-in-out · #313136 · [crop](shots/shot_052_el_02.jpg)
3. 112.83–113.17s · middle (x 18%–100%, y 46%–51%) · changes, moves leftward, linear · #2a2b31 · [crop](shots/shot_052_el_03.jpg)
4. 112.83–113.17s · middle (x 0%–100%, y 52%–80%) · changes, unfolds downward (draw-on / grow / wipe), linear · #30292e · text “Time compressed / "thepresenceofpathwaysforthe / FAULT” · [crop](shots/shot_052_el_04.jpg)
5. 113.03–113.17s · top (x 0%–100%, y 21%–35%) · appears, slides downward, instant · #282220 · text “earthquakes.” · [crop](shots/shot_052_el_05.jpg)
6. 113.43–114.90s · middle (x 0%–93%, y 51%–79%) · appears, slides leftward, ease-in-out · #514744 · text “Time compressed / "thepresenceofpathwaysforthe / FAULT” · [crop](shots/shot_052_el_06.jpg)
7. 113.97–114.57s · middle (x 18%–87%, y 46%–50%) · changes, unfolds rightward (draw-on / grow / wipe), linear · #3d383c · [crop](shots/shot_052_el_07.jpg)
8. 114.83–114.90s · top (x 27%–80%, y 20%–26%) · appears, instant · #83858e · text “those / those wellssetoff / mostofthe” · [crop](shots/shot_052_el_08.jpg)
9. 114.90–114.97s · middle left (x 0%–18%, y 46%–50%) · appears, instant · #a29f9e · text “ackingisnot / causingmostof / cedearthquakes.” · [crop](shots/shot_052_el_09.jpg)

**Motion #53 115.0–120.2s · 8 events**

- Ground #0c0e12; other main colours #2e2a2e #303137 #413e38 #211f20; drawn layer #e3e0dc #c9c6c1 #585450 #9c9b98
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–3%, y 31%–35% · #28221f · [crop](shots/shot_053_st_01.jpg)
- S2. never moves: shape / text block · x 65%–100%, y 31%–35% · #282220 · [crop](shots/shot_053_st_02.jpg)
- S3. never moves: shape / text block · x 0%–4%, y 42%–43% · #33343a · [crop](shots/shot_053_st_03.jpg)
- S4. never moves: shape / text block · x 0%–100%, y 58%–76% · #312a2f · text “productionistheprimary / USGS:Myths and Misconceptions About Induced Earthquakes / Tracedfrom theUsGSgraph,countsnot shown” · [crop](shots/shot_053_st_04.jpg)
- [crop L1](shots/shot_053_ly_01.jpg) [crop L2](shots/shot_053_ly_02.jpg) · Continuous layer: 13% of the frame moves through the whole shot (x 0%–100%, y 18%–59%), e.g. drifting gradients, particle flow, breathing glow
1. 115.07–115.33s · middle (x 0%–100%, y 35%–56%) · changes, moves leftward, ease-out · #312e31 · text “Fact1:Frackingisnot / directlycausingmostof / the induced earthquakes.” · [crop](shots/shot_053_el_01.jpg)
2. 115.60–115.67s · bottom (x 4%–87%, y 76%–80%) · disappears, instant · #343436 · text “Pressure shown in amber / After USGS and the Oklahoma Geological Survey: Oklahoma earthquakes of / magnitude3andgreater,1978 to2018” · [crop](shots/shot_053_el_02.jpg)
3. 115.80–115.93s · middle (x 4%–64%, y 59%–61%) · disappears, moves leftward, instant · #252222 · text “productionistheprimary / USGS:Myths and Misconceptions About Induced Earthquakes” · [crop](shots/shot_053_el_03.jpg)
4. 116.93–119.27s · middle (x 0%–100%, y 28%–56%) · changes, moves leftward, ease-in-out · #4c4a4b · text “Fact1:Frackingisnot / directlycausingmostof / the induced earthquakes.” · [crop](shots/shot_053_el_04.jpg)
5. 117.00–117.20s · top (x 24%–73%, y 20%–26%) · disappears, ease-in · #323e4f · text “mostoftherecent / earthquakes. / The U.S.” · [crop](shots/shot_053_el_05.jpg)
6. 119.60–119.67s · bottom left (x 4%–38%, y 71%–74%) · disappears, instant · #413d41 · text “Tracedfrom theUsGSgraph,countsnot shown / Pressure shown in amber / Cracks drawn wider than true” · [crop](shots/shot_053_el_06.jpg)
7. 120.00–120.13s · top (x 22%–78%, y 18%–21%) · disappears, instant · #343c4c · text “mostoftherecent / earthquakes. / The U.S.” · [crop](shots/shot_053_el_07.jpg)
8. 120.07–120.13s · middle (x 18%–93%, y 36%–47%) · changes, instant · #44454b · text “Fact1:Frackingisnot / directlycausingmostof / astewater disposal wells typlcall” · [crop](shots/shot_053_el_08.jpg)

**Motion #54 120.2–120.4s (zoom in) · 2 events**

- Ground #0c0e12; other main colours #191b22 #0f0b10 #1a1a1d #131417; drawn layer #5f5d5f #323134 #474548
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 38%–49%, y 50%–52% · #2c2e34 · [crop](shots/shot_054_st_01.jpg)
- S2. never moves: shape / text block · x 51%–58%, y 50%–52% · #2c2e34 · [crop](shots/shot_054_st_02.jpg)
- [crop L1](shots/shot_054_ly_01.jpg) [crop L2](shots/shot_054_ly_02.jpg) · Continuous layer: 16% of the frame moves through the whole shot (x 2%–80%, y 18%–62%), e.g. drifting gradients, particle flow, breathing glow
1. 120.27–120.33s · top right (x 64%–100%, y 29%–36%) · changes, instant · #1f2026 · [crop](shots/shot_054_el_01.jpg)
2. 120.27–120.33s · middle (x 0%–100%, y 38%–78%) · changes, instant · #1a1b21 · text “USGS: Myths and Misconceptions About Induced Earthquakes / Pressure shown in amber” · [crop](shots/shot_054_el_02.jpg)

**Motion #55 120.4–120.7s · 3 events**

- Ground #0c0e12; other main colours #0f0b10 #373532 #1b1e24; drawn layer #393735 #4b5566 #e8edf3 #959fad
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 22%–31%, y 17%–20% · #545254 · [crop](shots/shot_055_st_01.jpg)
- S2. never moves: shape / text block · x 31%–44%, y 17%–20% · #5b595b · [crop](shots/shot_055_st_02.jpg)
1. 120.50–120.63s · top (x 42%–80%, y 15%–22%) · appears, instant · #2f3947 · text “So that pumpjack” · [crop](shots/shot_055_el_01.jpg)
2. 120.50–120.63s · middle right (x 40%–100%, y 46%–75%) · appears, instant · #0f1013 · [crop](shots/shot_055_el_02.jpg)
3. 120.50–120.57s · middle left (x 0%–24%, y 56%–76%) · disappears, instant · #0c0d10 · [crop](shots/shot_055_el_03.jpg)

**Motion #56 120.7–121.3s (zoom in) · 6 events**

- Ground #0c0e12; other main colours #252220 #302925 #403c36 #34302b; drawn layer #613f30 #4a4541 #5f524b #6a625d
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 23%–28%, y 29%–30% · #282220 · [crop](shots/shot_056_st_01.jpg)
- S2. never moves: shape / text block · x 0%–100%, y 30%–42% · #2d2723 · [crop](shots/shot_056_st_02.jpg)
- S3. never moves: shape / text block · x 44%–58%, y 41%–42% · #382e29 · [crop](shots/shot_056_st_03.jpg)
- S4. never moves: shape / text block · x 62%–69%, y 41%–42% · #382e29 · [crop](shots/shot_056_st_04.jpg)
- S5. never moves: shape / text block · x 77%–82%, y 72%–73% · #292a30 · [crop](shots/shot_056_st_05.jpg)
- S6. never moves: shape / text block · x 56%–66%, y 73%–76% · #2a2b31 · [crop](shots/shot_056_st_06.jpg)
- S7. never moves: shape / text block · x 9%–22%, y 74%–76% · #2f2d2e · [crop](shots/shot_056_st_07.jpg)
- S8. never moves: horizontal line · x 76%–96%, y 74%–76% · #2a2b31 · [crop](shots/shot_056_st_08.jpg)
- [crop L1](shots/shot_056_ly_01.jpg) [crop L2](shots/shot_056_ly_02.jpg) · Continuous layer: 6% of the frame moves through the whole shot (x 0%–100%, y 45%–70%), e.g. drifting gradients, particle flow, breathing glow
1. 120.77–120.90s · top left (x 0%–42%, y 28%–30%) · disappears, instant · #0f0f10 · [crop](shots/shot_056_el_01.jpg)
2. 120.77–121.23s · middle (x 0%–100%, y 41%–59%) · appears, slides leftward, ease-in-out · #454039 · [crop](shots/shot_056_el_02.jpg)
3. 120.83–121.03s · middle (x 0%–100%, y 32%–40%) · changes, unfolds leftward (draw-on / grow / wipe), ease-in · #282220 · [crop](shots/shot_056_el_03.jpg)
4. 120.90–121.23s · top (x 22%–80%, y 15%–22%) · changes, ease-out · #100e10 · text “was / never” · [crop](shots/shot_056_el_04.jpg)
5. 121.23–121.30s · top (x 56%–67%, y 18%–21%) · appears, instant · #9b999b · text “never” · [crop](shots/shot_056_el_05.jpg)
6. 121.23–121.30s · bottom left (x 4%–49%, y 79%–80%) · appears, instant · #211f21 · text “SPEFoundation,Energy4me:Petroleum” · [crop](shots/shot_056_el_06.jpg)

**Motion #58 124.8–127.2s · 7 events**

- Ground #0c0e12; other main colours #5f6067 #2d3136 #22252a #272b30; drawn layer #5c5c5f #3e3d3a #818282
Element crops (numbers match the motion list below; L = the continuously moving layer mid-shot and at the end, S = elements that never move), full-size files in `shots/`:

- S1. never moves: shape / text block · x 0%–100%, y 34%–41% · #2a2b31 · [crop](shots/shot_058_st_01.jpg)
- S2. never moves: horizontal line · x 40%–100%, y 44%–45% · #2a2b31 · [crop](shots/shot_058_st_02.jpg)
- S3. never moves: shape / text block · x 0%–100%, y 48%–57% · #2a2b31 · [crop](shots/shot_058_st_03.jpg)
- [crop L1](shots/shot_058_ly_01.jpg) [crop L2](shots/shot_058_ly_02.jpg) · Continuous layer: 6% of the frame moves through the whole shot (x 0%–96%, y 18%–61%), e.g. drifting gradients, particle flow, breathing glow
1. 124.83–124.90s · middle (x 4%–96%, y 34%–38%) · disappears, instant · #646064 · [crop](shots/shot_058_el_01.jpg)
2. 125.03–125.17s · top (x 24%–47%, y 16%–26%) · disappears, instant · #223141 · [crop](shots/shot_058_el_02.jpg)
3. 126.83–126.90s · bottom left (x 4%–44%, y 78%–80%) · disappears, instant · #2f2f30 · text “EIA, Today in Energy,March 15,2016” · [crop](shots/shot_058_el_03.jpg)
4. 126.97–127.03s · top (x 4%–96%, y 28%–34%) · changes, instant · #292a30 · [crop](shots/shot_058_el_04.jpg)
5. 126.97–127.03s · middle (x 0%–100%, y 41%–49%) · changes, instant · #2a2b31 · [crop](shots/shot_058_el_05.jpg)
6. 126.97–127.10s · bottom (x 0%–100%, y 60%–76%) · disappears, instant · #1c1a1e · text “Cracks drawn wider than true / Well and machines drawn larger than true” · [crop](shots/shot_058_el_06.jpg)
7. 126.97–127.10s · bottom right (x 49%–100%, y 72%–76%) · changes, moves rightward, instant · #323339 · [crop](shots/shot_058_el_07.jpg)

### Real material in the picture (the original files are needed)

11 shots, 33.43s (26%) contain real material (screen recordings, screenshots, photos, embedded video); a model cannot stand in for them:

- **screen recording** (part of the frame x6% y28% w42% h17%): shots #13, 1.9s in all
- **photo** (part of the frame): shots #14, #17, #18, #24, #26, #27, #34, #39, #44, #46, 31.5s in all
