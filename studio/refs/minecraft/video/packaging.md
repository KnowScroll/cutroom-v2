---
videomd: 1
part: packaging
tokens: 236
---

## Packaging layer (subtitles / styled text / stickers / sound-effect hits)

- title ×2: "block by blook", "home."
- Exports: `packaging/overlays.ass`, `packaging/timeline.json` (SRT is the subtitle timeline; ASS carries colour, outline, position and entrance animation, swap in the original font; timeline.json is the full timeline)

| Time | Kind | Text | Style | In / out | SFX |
|---|---|---|---|---|---|
| 0.50–2.10s | title | block by blook | black text, white outline, keywords highlighted in green, line height 4.7% (about 89px) | fade in / slide out | — |
| 2.50–4.00s | title | home. | black text, keywords highlighted in white, line height 6.7% (about 129px) | — | — |

Remake: burn subtitles and styled text in with `packaging/overlays.ass` (ffmpeg -vf ass=overlays.ass), or rebuild them from timeline.json in CapCut / Remotion; stickers and GIFs need matching assets (meme / GIF libraries), crops are under packaging/.
