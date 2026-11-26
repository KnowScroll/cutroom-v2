---
videomd: 1
part: packaging
tokens: 275
---

## Packaging layer (subtitles / styled text / stickers / sound-effect hits)

- 3 subtitle lines (bottom, up to 1 rows): white text, line height 2.8%; entrance: hard in×2
- Exports: `packaging/subtitles.srt`, `packaging/overlays.ass`, `packaging/timeline.json` (SRT is the subtitle timeline; ASS carries colour, outline, position and entrance animation, swap in the original font; timeline.json is the full timeline)

| Time | Kind | Text | Style | In / out | SFX |
|---|---|---|---|---|---|
| 0.00–1.30s | subtitle | Could every planet fit | white text, line height 2.9% (about 55px) | hard out | — |
| 1.30–2.50s | subtitle | between Earth and the Moon? | white text, line height 2.3% (about 44px) | hard in / hard out | — |
| 2.50–4.00s | subtitle | At its farthest, yes. | white text, line height 2.8% (about 54px) | hard in | — |

Remake: burn subtitles and styled text in with `packaging/overlays.ass` (ffmpeg -vf ass=overlays.ass), or rebuild them from timeline.json in CapCut / Remotion; stickers and GIFs need matching assets (meme / GIF libraries), crops are under packaging/.
