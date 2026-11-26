---
videomd: 1
part: sound
tokens: 867
---

## Sound

- loudness -19.7 dBFS, peak -1.4 dBFS; sound runs across cuts, laid in post as one bed (background changes 10.2dB at cuts vs 10.3dB within shots)
- Sources: Video type: voice-over / talking head + music → voice: TTS voice-over; music: stock library music (leaning, to confirm); SFX: added in post from an SFX library / editor (leaning, to confirm)

**Voice**

- 55% of the duration; pitch about 131.2Hz (male-leaning)
- Speakers: 3 voices told apart by timbre
  - Speaker 1: 78s (75%), 18 turns, first heard at 0.0s, pitch about 128Hz (male-leaning), `stems/voice_S1.wav`
  - Speaker 2: 5s (5%), 3 turns, first heard at 9.8s, pitch about 152Hz (gender unclear), `stems/voice_S2.wav`
  - Speaker 3: 21s (20%), 4 turns, first heard at 13.0s, pitch about 154Hz (gender unclear), `stems/voice_S3.wav`
  - Two people with similar voices may be merged, and one person changing tone may be split; listen to the tracks when the head count matters
- Source: TTS voice-over (TTS voice-over 64%, human recording 27%, native dialogue from the AI video model 9%)
  - Voice and background sound run across cuts: the voice-over was laid on separately in post (TTS or a human voice-over)
- Remake: TTS voice-over: CapCut text-to-speech or another TTS tool, with a similar voice and pace
- Lines are in the script table under “Content and structure”

**Music**

- Tempo: 112.3 BPM (or 56.2/224.7); key F major (confidence 0.876); 55% of the duration (2.5–114.5s); section changes at 50.5s, 54.5s, 58.5s, 87.5s, 91.5s; ending: ends_early
- Cuts vs beat: 16% of cuts land on a beat (chance: about 14%)
- Source: to confirm (stock library music 60%, AI-generated music 20%, well-known song 20%)
  - The music is a bed under the picture: in a regular video the bed usually comes from a stock library (prior)
  - The voice is speech / narration, not singing (sustained-pitch ratio 0.15): a regular "voice-over + music bed" video
  - Nothing about this track beyond the format prior and weak cues like the ending (no source heard, no platform music tag): source to confirm; an AI-generated bed cannot be told from a library bed here
  - How to confirm: Check the music tag on the original Douyin / Xiaohongshu / TikTok post: a song title → existing track; "original sound - @creator" → uploaded by the creator (for music videos, usually an AI song)
  - How to confirm: Run it through Shazam / ACRCloud or another song-ID service: a hit means an existing song
- Remake: The original track leans stock library music: search a library by BPM / mood / key for a similar track, or generate a royalty-free track in a similar style with AI

**Sound effects** (7 hits, 4 distinct sounds)

| Sound | Listen | Type | Times used | At | On screen |
|---|---|---|---|---|---|
| F1 | [listen](sfx/sfx_01.wav) | ding | 1 | 55.4s | subtitle "telegraphed his " appears |
| F2 | [listen](sfx/sfx_02.wav) | ding | 2 | 69.8s, 105.0s | subtitle "India's army cro" appears; subtitle "and a revolution" appears |
| F3 | [listen](sfx/sfx_03.wav) | ding | 3 | 96.9s, 99.7s, 100.8s | — |
| F4 | [listen](sfx/sfx_04.wav) | pop | 1 | 99.3s | — |

- Remake: play each sound first (separated out, without voice or music), find one similar effect in the editor's library, and place it at every time listed under “At”

- Separated stems: `stems/original.wav` (original), `stems/vocals.wav` (dry voice), `stems/music.wav` (music + ambience), `stems/effects.wav` (effects track)
<!--stems-->
