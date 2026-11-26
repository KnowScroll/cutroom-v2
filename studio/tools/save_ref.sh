#!/usr/bin/env bash
# Keep a small, committed copy of a reference's finished rea-video analysis (runs/ is not committed), so grading and
# template work need only the repo: breakdown.json (what compare.py reads), VIDEO.md + video/*.md (the pack a template
# is written from), review_answers.json (what the reviewer saw) and the storyboard.
#   bash studio/tools/save_ref.sh <ref name> [analysis dir]     (default dir: studio/runs/<ref>/analysis-claude)
set -eu
cd "$(dirname "$0")/../.."
REF="$1"; SRC="${2:-studio/runs/$REF/analysis-claude}"; DST="studio/refs/$REF"
[ -f "$SRC/breakdown.json" ] || { echo "no $SRC/breakdown.json"; exit 1; }
rm -rf "$DST"; mkdir -p "$DST"
cp "$SRC/breakdown.json" "$SRC/VIDEO.md" "$DST/"; cp -r "$SRC/video" "$DST/"
for f in review_answers.json storyboard.jpg; do [ -f "$SRC/$f" ] && cp "$SRC/$f" "$DST/"; done
du -sh "$DST"
