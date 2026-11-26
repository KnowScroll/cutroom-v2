---
videomd: 1
part: packaging
tokens: 453
---

## Packaging layer (subtitles / styled text / stickers / sound-effect hits)

- 6 subtitle lines (middle/top, up to 1 rows): black text, yellow outline, keywords highlighted in yellow, line height 3.5%; entrance: fade in×2, hard in×1; bounce / colour-change motion inside lines
- Exports: `packaging/subtitles.srt`, `packaging/overlays.ass`, `packaging/timeline.json` (SRT is the subtitle timeline; ASS carries colour, outline, position and entrance animation, swap in the original font; timeline.json is the full timeline)

| Time | Kind | Text | Style | In / out | SFX |
|---|---|---|---|---|---|
| 0.00–0.80s | subtitle | SHIBUYA | black text, yellow outline, gradient, line height 5.4% (about 103px) | fade out | — |
| 0.00–0.80s | subtitle | HARAJUKU | yellow text, yellow outline, line height 3.1% (about 60px) | fade out | — |
| 0.30–2.50s | subtitle | he waited every day | yellow text, black outline, line height 3.8% (about 72px) | hard in / hard out | — |
| 2.50–3.60s | subtitle · follows an object | SHIBUTA | black text, yellow outline, keywords highlighted in yellow, line height 6.2% (about 120px) | fade in / fade out (bounces / changes colour midway) | — |
| 2.50–3.60s | subtitle · follows an object | <EBISU | black text, orange outline, keywords highlighted in white, line height 3.3% (about 63px) | fade in / fade out (bounces / changes colour midway) | — |
| 2.50–4.80s | subtitle | for almost 10 years | yellow text, black outline, keywords highlighted in brown, line height 3.0% (about 59px) | — | — |

Remake: burn subtitles and styled text in with `packaging/overlays.ass` (ffmpeg -vf ass=overlays.ass), or rebuild them from timeline.json in CapCut / Remotion; stickers and GIFs need matching assets (meme / GIF libraries), crops are under packaging/.
