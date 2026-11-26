"""Compare rea-video breakdowns of our reels against the reference's, on the numbers a template can control.

  .venv/Scripts/python tools/compare.py <reference analysis dir> <label>=<reel analysis dir> [<label>=<dir> ...]

Prints a markdown table: rhythm (cut rate, shot length, how much the picture changes), rendering (pixel grid, flat
fills, outlines, dithering, detail, colours, held frames), colour (key, harmony, colour scenes, contrast), sound
(BPM, effects) and on-screen text. Each reel column also gets a distance-from-reference score per group (0 = same)."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def load(d: str) -> dict:
    return json.loads((Path(d) / "breakdown.json").read_text(encoding="utf-8"))


def metrics(b: dict) -> dict:
    shots = b.get("shots") or []
    dur = float((b.get("source") or {}).get("duration") or 0) or sum(s["duration"] for s in shots) or 1.0
    st = (b.get("aspects") or {}).get("style") or {}
    m, rc = st.get("measured") or {}, st.get("recipe") or {}
    # motion from every shot's forensic features, weighted by duration (the survey's change curve exists only for the reference)
    wavg = lambda k: round(sum(((s.get("features") or {}).get(k) or 0) * s["duration"] for s in shots) / dur, 3) if shots else None
    au = b.get("audio") or {}
    pk = (b.get("packaging") or {}).get("counts") or {}
    sfx = au.get("sfx") or {}
    return {
        "duration s": round(float((b.get("source") or {}).get("duration") or 0), 1),
        "cuts per min": round((len(shots) - 1) / dur * 60, 1),
        "mean shot s": round(dur / max(1, len(shots)), 2),
        "frame-to-frame change": wavg("pair_mad_median"),
        "moving frames share": wavg("moving_pair_ratio"),
        "art pixels across": (m.get("grid") or {}).get("across"),
        "flat fills": m.get("flat"), "gentle gradients": m.get("smooth"), "outlines": m.get("outline"), "dither": m.get("dither"),
        "detail score": m.get("detail"), "colours (95%)": m.get("colours"), "held frames": m.get("dup"),
        "key": rc.get("key"), "harmony": rc.get("harmony"), "colour scenes": len(st.get("scenes") or []),
        "ground lightness": (rc.get("ground") or {}).get("L"), "contrast": rc.get("contrast"),
        "tempo bpm": au.get("tempo_bpm"), "voice": bool((b.get("speech") or {}).get("lines")) or bool((au.get("voice") or {}).get("present")),
        "sound effects": len(sfx.get("events") or []) if isinstance(sfx, dict) else None,
        "text cues": pk.get("text") if isinstance(pk, dict) else None,
    }


GROUPS = {
    "rhythm": (("cuts per min", 20), ("mean shot s", 10), ("frame-to-frame change", 3), ("moving frames share", 1)),
    "rendering": (("art pixels across", 180), ("flat fills", 1), ("outlines", 1), ("dither", 1), ("detail score", 5), ("held frames", 1)),
    "colour": (("ground lightness", 1), ("contrast", 20), ("colour scenes", 7)),
}


def distance(ref: dict, got: dict, keys) -> float | None:
    ds = []
    for k, scale in keys:
        a, b = ref.get(k), got.get(k)
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            ds.append(min(1.0, abs(a - b) / scale))
    return round(sum(ds) / len(ds), 2) if ds else None


def main() -> None:
    ref = metrics(load(sys.argv[1]))
    reels = [(a.split("=", 1)[0], metrics(load(a.split("=", 1)[1]))) for a in sys.argv[2:]]
    names = ["reference"] + [n for n, _ in reels]
    print("| | " + " | ".join(names) + " |")
    print("|---" * (len(names) + 1) + "|")
    for k in ref:
        row = [ref[k]] + [m[k] for _, m in reels]
        print(f"| {k} | " + " | ".join("" if v is None else str(v) for v in row) + " |")
    for g, keys in GROUPS.items():
        print(f"| **{g} distance** (0 = same) | 0 | " + " | ".join(str(distance(ref, m, keys)) for _, m in reels) + " |")


if __name__ == "__main__":
    main()
