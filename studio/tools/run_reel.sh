#!/usr/bin/env bash
# Make one reel with MiniMax (asset_reel.mjs), never two at once: waits while any other asset_reel.mjs runs.
#   bash studio/tools/run_reel.sh "<brief>" <template> <slug> [seconds]
#   VOICE_MODEL=kokoro bash ... picks the voice model (default eleven-v4, see engine/audio.mjs VOICE_MODELS)
# Writes $V/runs/<slug>.log, $V/runs/<slug>-v2/reel.mp4 (final), $V/runs/<slug>-cost.txt, $V/runs/<slug>-summary.json.
set -u
cd "$(dirname "$0")/../.."; V="${CUTROOM_VAR:-var}"
BRIEF="$1"; TPL="$2"; SLUG="$3"; SEC="${4:-45}"
busy() {
  if command -v powershell >/dev/null 2>&1; then
    powershell -NoProfile -Command "@(Get-CimInstance Win32_Process | Where-Object { \$_.Name -eq 'node.exe' -and \$_.CommandLine -match 'asset_reel' }).Count" | tr -d '\r'
  else
    pgrep -fc 'node .*asset_reel' || true
  fi
}
while [ "$(busy)" != "0" ]; do echo "waiting: another reel is running ($(date +%T))"; sleep 30; done
echo "launch $SLUG $(date +%T)"
node engine/asset_reel.mjs "$BRIEF" --template "$TPL" --seconds "$SEC" --out "$V/runs/$SLUG" ${VOICE_MODEL:+--voice-model "$VOICE_MODEL"} > "$V/runs/$SLUG.log" 2>&1
code=$?
echo "exit $code $(date +%T)"
grep -E "rejected|using the last" "$V/runs/$SLUG.log" | cut -c1-200 | tail -40
grep -E "TOTAL|film" "$V/runs/$SLUG-cost.txt" 2>/dev/null
exit $code
