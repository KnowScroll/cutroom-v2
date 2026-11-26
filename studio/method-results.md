# Reference test 1: `studio/references/test1.mp4` → "supernova explosion"

(Paths below are relative to that run's folder, `studio/runs/ref-test1/`, now archived outside the repo.)

Reference: 44 s pixel-art explainer of nuclear fission, art drawn at 180 x 320 pixels and scaled 6x, no voice (music, 5 sound effects, 22 on-screen captions in HUD panels), 6 shots, ends on its own first frame. Every test made a 45 s target reel for the brief "supernova explosion" with the same engine (`asset_reel.mjs`, MiniMax-M3, thinking off).

| | Test 1 | Test 2 | Test 3 |
|---|---|---|---|
| Who reads the reference | Claude | MiniMax-M3 | Claude (test 1's analysis) |
| Who writes the template | Claude | MiniMax-M3 | nobody: raw VIDEO.md pasted in, plus 3 keyframe sheets shown to M3 |
| Reel | `test-1-claude-template/reel-v2/reel.mp4` | `test-2-m3-template/reel-v2/reel.mp4` | `test-3-direct/reel-v2/reel.mp4` |
| Contact sheet | `sheets/test1.jpg` | `sheets/test2.jpg` | `sheets/test3.jpg` |

## Cost and time

| Step | Test 1 | Test 2 | Test 3 |
|---|---|---|---|
| Analysis (once per reference) | Claude, about $1 (estimate) | M3 $0.160, 23 min; plus $0.082 lost to an adapter bug (fixed) | shared with test 1 |
| Template (once per kind) | Claude (in the $1 above) | M3 $0.037, 6 min | $0, no model |
| Reel (every reel) | M3 $0.237, 14.4 min | M3 $0.177, 6.7 min | M3 $0.245, 14.7 min |
| Failed reel attempts | plan rejected 4x, about $0.03 | kit rejected 3x, about $0.03 | plan rejected 4x, about $0.03 |
| Film length | 54.9 s | 58.0 s | 52.6 s |

Claude's cost is an estimate (Opus 5.5: $4 / $20 per million input / output tokens, cache reads $0.20); it includes reading about 10 frame images, answering the survey and review questions, and writing the template, in a long session.

## Closeness to the reference (rea-video on each reel; `compare.md`)

| | reference | test 1 | test 2 | test 3 |
|---|---|---|---|---|
| art pixels across | 180 | **180** | 66 | none (smooth) |
| flat fills | 0.89 | **0.84** | 0.69 | 0.64 |
| gentle gradients | 0.05 | **0.06** | 0.18 | 0.20 |
| held frames | 0.18 | **0.18** | 0.54 | 0.02 |
| cuts per minute | 6.8 | 12.0 | 6.2 | **6.8** |
| frame-to-frame change | 1.82 | 0.48 | 0.32 | 0.31 |
| rendering distance (0 = same) | 0 | **0.13** | 0.35 | 0.41 |
| rhythm distance | 0 | 0.33 | 0.26 | **0.21** |
| colour distance | 0 | **0.26** | 0.27 | 0.32 |

## What each reel looks like

- **Test 1:** real pixel art on the reference's exact grid, HUD panels at the top, dark space ground, hot red-to-cream ramp, white flash between the micro and macro worlds, banded violet sky, stat cards, ends back on the opening star core. Faults: labels "PINK" and "BLUE" (copied from a colour example in the template), some empty or overflowing panels, a counter that jumps (128, 4K, 8, 50), the real-scale supernova is a small dot on the horizon, small panel text unreadable after pixelation.
- **Test 2:** blocky grid-snapped look (66 blocks across), teal and orange. The star is a teal cross of squares; the template kept "the consequence on the ground", so the supernova becomes an orange pillar rising between buildings (the reference's mushroom cloud leaking through); about 12 s of black frames; broken panels ("61 YEARS", "MASSES") and a title hidden by a panel.
- **Test 3:** smooth flat illustration, not pixel art (M3 read "pixel art, 180 across" but never worked out how to draw it); a big readable star; about 4 s of black; no counter cascade, no white flash, no loop; odd panel text ("BRILLIANT AMBER SPHERE", "MASS EXPELLED 9.0").

## Verdict

Test 1 wins clearly, and it is the only one whose reel is recognisably the reference's style. What made the difference is not seeing the reference (M3's per-shot descriptions in test 2 were good) but turning the analysis into directions M3 can draw from: the pixel grid needs a concrete technique (shrink the finished frame to 180 x 320 and blow it back up in kit.post), and the structure needs to be written as beats with the topic stripped out. M3 writing its own template produced a plausible-looking document that copied the reference's scene and broke the engine's checks; raw VIDEO.md lost the look entirely.

So: Claude analyses and writes each template once (about $1), MiniMax makes every reel (about $0.24). The fully MiniMax path costs about $0.37 per template but is not good enough yet.

## Found along the way

Fixed in this run:
- rea-video through MiniMax: thinking text broke its JSON parsing (proxy now sends `reasoning_split`); thinking used the whole 4096-token answer budget (proxy now gives at least 16000); runaway thinking to the cap (proxy now retries once with thinking off).
- Engine: a narration line with "SN 1987A" was rejected 4 times in a row because M3 ignored "write numbers as words"; the rejection now spells each number out (`write "1987" as "nineteen eighty-seven"`), and test 2's plan passed on the second try.

Shared engine problems, for the self-heal loop:
1. Every reel overshoots the 45 s target (53 to 58 s).
2. A shot that keeps failing validation ships as black frames (tests 2 and 3).
3. All reels move far less than the reference (frame change 0.3 to 0.5 against 1.8): the reference never stops moving.
4. HUD panel text breaks in every test (empty, overflowing, cut).
5. The engine always narrates; the reference is music plus captions only.

Test 1 template fixes before it goes into `templates/`: never use colour names as labels and no concrete colour examples; panel text at least 54 px; the macro event as a big subject (60 to 85% of the frame width) at real scale; counter steps that follow one rule.

## Locked in (2026-11-18)

Test 1 won. Its template now lives in the engine as `templates/pixel-sim-explainer.md` (fix log: `templates/pixel-sim-explainer.log`). Tests 2 and 3 and the M3 analyses are in `archive/`. Fix rounds on the brief "supernova explosion" (all MiniMax): `var/runs/supernova-pixel-e1-v2` ($0.209, 42.4 s), `-e2-v2` ($0.226, 37.6 s), `-e3-v2` ($0.237, 43.8 s, every shot passed every check). Epoch 3 against the reference: pixel grid 180 (same), length 43.8 s (target 45), still much less motion (frame-to-frame change 0.49 vs 1.82, held frames 56% vs 18%). The style extractor now detects dithering and merges colour-scene slivers (`analysis-claude-v2`).
