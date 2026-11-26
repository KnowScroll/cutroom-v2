---
videomd: 1
part: sound
tokens: 830
---

## Sound

- loudness -17.5 dBFS, peak -1.5 dBFS; sound runs across cuts, laid in post as one bed (background changes 6.5dB at cuts vs 5.8dB within shots)
- Sources: Video type: voice-over / talking head + music → voice: TTS voice-over; music: stock library music (leaning, to confirm); SFX: added in post from an SFX library / editor (leaning, to confirm)

**Voice**

- 78% of the duration; pitch about 123.5Hz (male-leaning)
- Source: TTS voice-over (TTS voice-over 64%, human recording 27%, native dialogue from the AI video model 9%)
  - Voice and background sound run across cuts: the voice-over was laid on separately in post (TTS or a human voice-over)
- Remake: TTS voice-over: CapCut text-to-speech or another TTS tool, with a similar voice and pace
- Lines are in the script table under “Content and structure”

**Music**

- Tempo: 139.7 BPM (or 69.8/279.3); key A minor (confidence 0.847); 40% of the duration (6.0–36.5s); section changes at 17.0s, 22.5s, 26.5s; ending: cut off hard
- Cuts vs beat: 7% of cuts land on a beat (chance: about 13%)
- Source: to confirm (stock library music 63%, well-known song 23%, AI-generated music 13%)
  - The music is a bed under the picture: in a regular video the bed usually comes from a stock library (prior)
  - The voice is speech / narration, not singing (sustained-pitch ratio 0.07): a regular "voice-over + music bed" video
  - The music is hard-cut at the end (still at full level when the video stops): typical of a trimmed existing track
  - Nothing about this track beyond the format prior and weak cues like the ending (no source heard, no platform music tag): source to confirm; an AI-generated bed cannot be told from a library bed here
  - How to confirm: Check the music tag on the original Douyin / Xiaohongshu / TikTok post: a song title → existing track; "original sound - @creator" → uploaded by the creator (for music videos, usually an AI song)
  - How to confirm: Run it through Shazam / ACRCloud or another song-ID service: a hit means an existing song
- Remake: The original track leans stock library music: search a library by BPM / mood / key for a similar track, or generate a royalty-free track in a similar style with AI

**Sound effects** (15 hits, 6 distinct sounds)

| Sound | Listen | Type | Times used | At | On screen |
|---|---|---|---|---|---|
| F1 | [listen](sfx/sfx_01.wav) | pop | 2 | 0.3s, 2.9s | subtitle "patches had" appears |
| F2 | [listen](sfx/sfx_02.wav) | pop | 6 | 3.7s, 5.3s, 11.2s, 13.7s, 28.8s, 32.0s | cut; subtitle "boarded a" appears; subtitle "afterthem" appears |
| F3 | [listen](sfx/sfx_03.wav) | click | 1 | 12.6s | subtitle "a thing" appears |
| F4 | [listen](sfx/sfx_04.wav) | pop | 3 | 15.4s, 21.4s, 23.6s | subtitle "your eyes" appears; cut; subtitle "othereye" appears |
| F5 | [listen](sfx/sfx_05.wav) | pop | 2 | 26.5s, 29.9s | subtitle "eventested" appears |
| F6 | [listen](sfx/sfx_06.wav) | ding | 1 | 36.2s | subtitle "could see" appears |

- Remake: play each sound first (separated out, without voice or music), find one similar effect in the editor's library, and place it at every time listed under “At”

- Separated stems: `stems/original.wav` (original), `stems/vocals.wav` (dry voice), `stems/music.wav` (music + ambience), `stems/effects.wav` (effects track)
<!--stems-->
