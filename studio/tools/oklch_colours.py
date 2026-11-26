"""Measure a reference's colours by eye-level detail that rea-video's palette merge drops: thin bright overlay lines,
dots and keyword colours cover too few pixels to survive it. Prints, per image, the most common saturated colours and
the darkest / lightest neutrals, each as hex and OKLCH (lightness 0-1, chroma, hue degrees).
    python studio/tools/oklch_colours.py frame1.png [frame2.png ...]
Write them into a template as relations (lightness and chroma by role, hue offsets between families), never as hex."""
import colorsys
import math
import sys
from collections import Counter

from PIL import Image


def oklch(r, g, b):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (x ** (1 / 3) for x in (l, m, s))
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return round(L, 2), round(math.hypot(A, B), 3), round(math.degrees(math.atan2(B, A)) % 360)


def main():
    for f in sys.argv[1:]:
        im = Image.open(f).convert("RGB")
        im.thumbnail((720, 1280))
        sat, neu = Counter(), Counter()
        for r, g, b in im.getdata():
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            q = (r // 16 * 16 + 8, g // 16 * 16 + 8, b // 16 * 16 + 8)
            (sat if s > 0.35 and v > 0.45 else neu)[q] += 1
        print(f)
        print("  saturated:", ", ".join(f"#{k[0]:02x}{k[1]:02x}{k[2]:02x} {oklch(*k)} x{n}" for k, n in sat.most_common(8)))
        common = [k for k, _ in neu.most_common(40)]
        by_l = sorted(common, key=lambda k: oklch(*k)[0])
        print("  neutrals dark..light:", ", ".join(f"#{k[0]:02x}{k[1]:02x}{k[2]:02x} {oklch(*k)}" for k in by_l[:3] + by_l[-3:]))


if __name__ == "__main__":
    main()
