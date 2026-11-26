#!/usr/bin/env bash
# First look at a reference reel: a 1-frame-per-second contact sheet and full-resolution frames to read by eye.
#   bash studio/tools/ref_prep.sh studio/references/<ref>.mp4
# Writes studio/runs/<ref>/sheets/contact.jpg and studio/runs/<ref>/crops/f_<t>.png (9 frames).
set -eu
cd "$(dirname "$0")/../.."
SRC="$1"; REF=$(basename "$SRC" .mp4); D="studio/runs/$REF"; mkdir -p "$D/sheets" "$D/crops"
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of compact "$SRC"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
ffmpeg -loglevel error -y -i "$SRC" -vf "fps=1,scale=180:-2,tile=10x6" -frames:v 1 "$D/sheets/contact.jpg"
for k in 1 2 3 4 5 6 7 8 9; do t=$(python -c "print(round($DUR*($k-0.5)/9,1))"); ffmpeg -loglevel error -y -ss "$t" -i "$SRC" -frames:v 1 "$D/crops/f_$t.png"; done
ls "$D/sheets/contact.jpg" "$D"/crops/*.png
