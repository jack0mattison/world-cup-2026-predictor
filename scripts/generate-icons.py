#!/usr/bin/env python3
"""Generate PNG icons from the app palette for favicon + PWA manifest."""

import math
from pathlib import Path

from PIL import Image, ImageDraw

BG = (10, 31, 18)
CARD = (18, 42, 28)
ACCENT = (61, 255, 138)
OUT = Path(__file__).resolve().parent.parent / "public"


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)
    margin = size * 0.08
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=size * 0.18,
        fill=BG,
    )
    cx = cy = size / 2
    r = size * 0.34
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CARD, outline=ACCENT, width=max(1, size // 24))
    star_r = size * 0.22
    points = []
    for i in range(5):
        angle = -90 + i * 72
        rad = math.radians(angle)
        points.append((cx + star_r * math.cos(rad), cy + star_r * math.sin(rad)))
        rad2 = math.radians(angle + 36)
        points.append((cx + star_r * 0.42 * math.cos(rad2), cy + star_r * 0.42 * math.sin(rad2)))
    draw.polygon(points, fill=ACCENT)
    cr = size * 0.1
    draw.ellipse((cx - cr, cy - cr, cx + cr, cy + cr), fill=BG, outline=ACCENT, width=max(1, size // 40))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in [(32, "favicon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        draw_icon(size).save(OUT / name, format="PNG")
    print("Wrote favicon.png, icon-192.png, icon-512.png")


if __name__ == "__main__":
    main()
