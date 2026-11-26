---
videomd: 1
part: packaging
tokens: 875
---

## Packaging layer (subtitles / styled text / stickers / sound-effect hits)

- 22 subtitle lines (middle/top, up to 2 rows): white text, line height 2.6%; entrance: hard in×12, fade in×6, slide in×1, type-on×1
- SFX hits on: subtitle in ×1
- Exports: `packaging/subtitles.srt`, `packaging/overlays.ass`, `packaging/timeline.json` (SRT is the subtitle timeline; ASS carries colour, outline, position and entrance animation, swap in the original font; timeline.json is the full timeline)

**text timeline (22 rows)**

| Time | Kind | Text | Style | In / out | SFX |
|---|---|---|---|---|---|
| 0.00–2.40s | subtitle | HHUCLEAR ⏎ FISSIOH | white text, line height 4.6% (about 48px) | fade out | — |
| 2.50–4.50s | subtitle | URANIUM-235 | green text, line height 2.5% (about 26px) | fade in / hard out | — |
| 2.50–4.50s | subtitle | CATCHES A NEUTRON | white text, line height 2.5% (about 26px) | hard out | — |
| 4.50–7.00s | subtitle | NUCLEAR FISSION | yellow text, line height 2.5% (about 26px) | hard in / hard out | — |
| 4.50–7.00s | subtitle | 0.1XOF MASS+ENERGY | white text, line height 2.7% (about 28px) | hard in / hard out | — |
| 8.30–19.50s | subtitle | GENERATION 11 | white text, line height 2.5% (about 26px) | hard in / hard out | — |
| 8.50–8.60s | subtitle | CHAIN REACTION | white text, line height 2.5% (about 26px) | hard in / hard out | — |
| 8.50–12.50s | subtitle | CHAIN REACTION ⏎ 2-3 NEUTRONS PER SPLIT | white text, line height 2.6% (about 26px) | fade in / hard out | — |
| 12.50–14.50s | subtitle | X2 EVERY GENERATION | white text, line height 2.5% (about 26px) | hard in / hard out | — |
| 17.00–17.60s | subtitle | B0 GENERATIONS ⏎ IN ABOUT 1 MICROSECONO | white text, line height 2.5% (about 25px) | fade in / hard out | — |
| 18.00–18.60s | subtitle | 80 GENERATIONS | white text, line height 2.5% (about 26px) | hard in / shrink out | ding |
| 18.00–18.70s | subtitle | IN ABOUT 1 MICROSECONO | white text, line height 2.4% (about 25px) | hard in / slide out | — |
| 21.00–24.50s | subtitle | TRINITY TEST,1945 | yellow text, keywords highlighted in white, line height 2.5% (about 26px) | slide in / hard out | — |
| 21.00–24.50s | subtitle | FIRST ATOMIC BOMB | white text, line height 2.7% (about 28px) | fade in / hard out | — |
| 24.50–28.00s | subtitle | PLUTONIUM FISSION | purple text, line height 2.5% (about 26px) | hard in / hard out | — |
| 24.50–28.00s | subtitle | TONS OF TNT | white text, line height 2.7% (about 28px) | hard in / hard out | — |
| 25.00–27.10s | subtitle | 20.000+ | white text, line height 4.9% (about 50px) | hard in | — |
| 32.50–36.00s | subtitle | THE CLOUD ROSE | white text, line height 2.8% (about 29px) | fade in / hard out | — |
| 32.50–36.00s | subtitle | 12 KM | yellow text, line height 5.0% (about 51px) | type-on / hard out | — |
| 32.50–36.00s | subtitle | HIGH | white text, line height 3.1% (about 32px) | fade in / hard out | — |
| 36.00–40.50s | subtitle | ABOUT | white text, line height 3.3% (about 34px) | hard in / hard out | — |
| 36.00–40.50s | subtitle | OF MASS BECAME ENERGY | white text, line height 3.0% (about 31px) | hard in / hard out | — |

Remake: burn subtitles and styled text in with `packaging/overlays.ass` (ffmpeg -vf ass=overlays.ass), or rebuild them from timeline.json in CapCut / Remotion; stickers and GIFs need matching assets (meme / GIF libraries), crops are under packaging/.
