#!/usr/bin/env bash
# Per-shot review sheets for a reel: 6 frames per shot in a row, shots 1-4 in a.png, 5+ in b.png.
# The thin red box is the part Instagram leaves uncovered (x 100 to 980, y 220 to 1500 of 1080x1920; SAFE=0 hides it),
# after claude-animation-skills' contact sheet (MIT, Copyright (c) 2026 Artem Novitckii).
#   bash tools/shot_rows.sh <reel dir with reel.mp4 and timeline.json> <out dir>
set -e
R="$1/reel.mp4"; T="$1/timeline.json"; O="$2"; mkdir -p "$O"
B=$(python -c "import json;t=json.load(open(r'$T'));print(' '.join(str(s['start']) for s in t['shots'])+' '+str(t['total']-0.05))")
arr=($B); n=$((${#arr[@]}-1))
SAFEBOX=""; [ "${SAFE:-1}" = "0" ] || SAFEBOX=",drawbox=x=22:y=49:w=196:h=284:color=red@0.7:t=1"
for ((i=0;i<n;i++)); do a=${arr[$i]}; b=${arr[$((i+1))]}
  for k in 0 1 2 3 4 5; do t=$(python -c "print($a+($b-$a)*($k+0.5)/6)"); ffmpeg -loglevel error -y -ss $t -i "$R" -frames:v 1 -vf "scale=240:-2$SAFEBOX" "$O/s${i}_$k.png"; done
  ffmpeg -loglevel error -y -i "$O/s${i}_0.png" -i "$O/s${i}_1.png" -i "$O/s${i}_2.png" -i "$O/s${i}_3.png" -i "$O/s${i}_4.png" -i "$O/s${i}_5.png" -filter_complex hstack=6 "$O/row$i.png"; done
rows=(); for ((i=0;i<n && i<4;i++)); do rows+=(-i "$O/row$i.png"); done; ffmpeg -loglevel error -y "${rows[@]}" -filter_complex vstack=$((${#rows[@]}/2)) "$O/a.png"
if ((n>4)); then rows=(); for ((i=4;i<n;i++)); do rows+=(-i "$O/row$i.png"); done; if ((n-4>1)); then ffmpeg -loglevel error -y "${rows[@]}" -filter_complex vstack=$((n-4)) "$O/b.png"; else cp "$O/row4.png" "$O/b.png"; fi; fi
echo "$O/a.png ${n} shots"
