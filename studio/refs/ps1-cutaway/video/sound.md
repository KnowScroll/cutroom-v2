---
videomd: 1
part: sound
tokens: 841
---

## Sound

- loudness -17.7 dBFS, peak -1.8 dBFS; sound runs across cuts, laid in post as one bed (background changes 6.5dB at cuts vs 7.9dB within shots)
- Sources: Video type: voice-over / talking head + music → voice: TTS voice-over; music: stock library music (leaning, to confirm); SFX: added in post from an SFX library / editor (leaning, to confirm)

**Voice**

- 50% of the duration; pitch about 182.2Hz (gender unclear)
- Source: TTS voice-over (TTS voice-over 64%, human recording 27%, native dialogue from the AI video model 9%)
  - Voice and background sound run across cuts: the voice-over was laid on separately in post (TTS or a human voice-over)
- Remake: TTS voice-over: CapCut text-to-speech or another TTS tool, with a similar voice and pace
- Lines are in the script table under “Content and structure”

**Music**

- Tempo: 172.3 BPM (or 86.1/344.5); key F major (confidence 0.854); 27% of the duration (18.5–42.5s); section changes at 7.5s, 17.0s, 30.5s; ending: cut off hard
- Cuts vs beat: 5% of cuts land on a beat (chance: about 11%)
- Source: to confirm (stock library music 63%, well-known song 23%, AI-generated music 13%)
  - The music is a bed under the picture: in a regular video the bed usually comes from a stock library (prior)
  - The voice is speech / narration, not singing (sustained-pitch ratio 0.06): a regular "voice-over + music bed" video
  - The music is hard-cut at the end (still at full level when the video stops): typical of a trimmed existing track
  - Nothing about this track beyond the format prior and weak cues like the ending (no source heard, no platform music tag): source to confirm; an AI-generated bed cannot be told from a library bed here
  - How to confirm: Check the music tag on the original Douyin / Xiaohongshu / TikTok post: a song title → existing track; "original sound - @creator" → uploaded by the creator (for music videos, usually an AI song)
  - How to confirm: Run it through Shazam / ACRCloud or another song-ID service: a hit means an existing song
- Remake: The original track leans stock library music: search a library by BPM / mood / key for a similar track, or generate a royalty-free track in a similar style with AI

**Sound effects** (13 hits, 7 distinct sounds)

| Sound | Listen | Type | Times used | At | On screen |
|---|---|---|---|---|---|
| F1 | [listen](sfx/sfx_01.wav) | click | 1 | 5.3s | subtitle "need" appears |
| F2 | [listen](sfx/sfx_02.wav) | ding | 1 | 5.9s | subtitle "Blender" appears |
| F3 | [listen](sfx/sfx_03.wav) | ding | 5 | 10.7s, 14.6s, 18.6s, 21.7s, 29.6s | subtitle "flats" appears; subtitle "Two" appears; subtitle "Three" appears |
| F4 | [listen](sfx/sfx_04.wav) | ding | 2 | 24.5s, 35.0s | subtitle "wobble" appears; subtitle "makea racco" appears |
| F5 | [listen](sfx/sfx_05.wav) | ding | 2 | 25.5s, 36.9s | subtitle "volcano!" appears |
| F6 | [listen](sfx/sfx_06.wav) | pop | 1 | 26.2s | subtitle "explaining" appears |
| F7 | [listen](sfx/sfx_07.wav) | click | 1 | 26.7s | — |

- Remake: play each sound first (separated out, without voice or music), find one similar effect in the editor's library, and place it at every time listed under “At”

- Separated stems: `stems/original.wav` (original), `stems/vocals.wav` (dry voice), `stems/music.wav` (music + ambience), `stems/effects.wav` (effects track)
<!--stems-->
