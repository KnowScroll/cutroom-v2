#!/usr/bin/env bash
# Grade a finished reel against its template's reference reel with rea-video (light run: no audio stems, speech,
# packaging or OCR, so it is quick and fits in memory) and tools/compare.py.
#   bash studio/tools/grade_reel.sh <slug> [reference dir]
# <slug> as given to run_reel.sh ($V/runs/<slug>-v2/reel.mp4 is graded). The reference dir defaults to the template's
# "reference analysis:" line under "## checks" (for example studio/refs/ref2). Writes $V/runs/<slug>-grade.md.
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"; V="${CUTROOM_VAR:-var}"
SLUG="$1"; REEL="$V/runs/$SLUG-v2/reel.mp4"
[ -f "$REEL" ] || { echo "no $REEL"; exit 1; }
TPL=$(python -c "import json;print(json.load(open('$V/runs/$SLUG-summary.json',encoding='utf-8')).get('template') or '')")
REF="${2:-}"
if [ -z "$REF" ] && [ -f "templates/$TPL.md" ]; then
  REF=$(sed -n 's/^reference analysis:[[:space:]]*//p' "templates/$TPL.md" | head -1 | tr -d '\r')
fi
[ -n "$REF" ] && [ -f "$REF/breakdown.json" ] || { echo "no reference analysis for template '$TPL' (add 'reference analysis: <dir>' under ## checks, or pass it)"; exit 1; }
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
OUT="studio/runs/grades/$SLUG"; mkdir -p "$(dirname "$OUT")"
studio/.venv/Scripts/rea-video decompose "$REEL" -o "$OUT" --lang en --no-stems --no-asr --no-speakers --no-packaging --no-ocr > "$OUT.log" 2>&1 \
  || { echo "decompose failed, see $OUT.log"; tail -5 "$OUT.log"; exit 1; }
{ echo "# Grade: $SLUG (template $TPL) vs reference $REF"; echo; echo "rea-video light decompose of $REEL; distance 0 = same as the reference."; echo
  studio/.venv/Scripts/python studio/tools/compare.py "$REF" "$SLUG=$OUT"; } > "$V/runs/$SLUG-grade.md"
cat "$V/runs/$SLUG-grade.md"
