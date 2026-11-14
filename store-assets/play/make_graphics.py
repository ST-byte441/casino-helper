"""Generate Google Play icon (512x512) and feature graphic (1024x500) from assets/chipLogo.png."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

repo = Path(sys.argv[1])
fonts = Path(sys.argv[2])
out = Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

logo = Image.open(repo / "assets/chipLogo.png").convert("RGB")

# --- Icon: Play wants 512x512 PNG, full square (Play applies its own rounded mask) ---
logo.resize((512, 512), Image.LANCZOS).save(out / "icon-512.png", optimize=True)

# --- Chip cut-out with alpha (chip centre ~ (627,627), radius ~ 432 in the 1254px source) ---
S = 4  # supersample for a smooth mask edge
cx, cy, r = 627, 627, 431
mask = Image.new("L", (logo.width * S, logo.height * S), 0)
ImageDraw.Draw(mask).ellipse(((cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S), fill=255)
mask = mask.resize(logo.size, Image.LANCZOS)
chip = logo.copy()
chip.putalpha(mask)
chip = chip.crop((cx - r, cy - r, cx + r, cy + r))

# --- Feature graphic 1024x500 ---
W, H = 1024, 500
bg = Image.new("RGB", (W, H), "#0d0d16")
# radial glow behind the chip, in the app's navy palette
glow = Image.new("L", (W, H), 0)
ImageDraw.Draw(glow).ellipse((560, -60, 1100, 560), fill=255)
glow = glow.filter(ImageFilter.GaussianBlur(120))
bg = Image.composite(Image.new("RGB", (W, H), "#2a2a3e"), bg, glow)

# chip with a soft drop shadow, right side
size = 340
c = chip.resize((size, size), Image.LANCZOS)
x, y = W - size - 64, (H - size) // 2
shadow = Image.new("L", (W, H), 0)
ImageDraw.Draw(shadow).ellipse((x + 10, y + 22, x + size + 10, y + size + 22), fill=170)
shadow = shadow.filter(ImageFilter.GaussianBlur(22))
bg = Image.composite(Image.new("RGB", (W, H), "#000000"), bg, shadow)
bg.paste(c, (x, y), c)

d = ImageDraw.Draw(bg)

def font(path, size, weight):
    f = ImageFont.truetype(str(path), size)
    f.set_variation_by_name(weight)
    return f

GOLD = "#FFD700"
title = font(fonts / "Playfair.ttf", 74, "Bold")
sub = font(fonts / "Inter.ttf", 27, "Medium")
small = font(fonts / "Inter.ttf", 21, "Regular")
suits = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)

left = 72
# suit row
sx = left
for s, col in (("♠", "#e8e8f0"), ("♥", "#e0393e"), ("♦", "#e0393e"), ("♣", "#e8e8f0")):
    d.text((sx, 108), s, font=suits, fill=col)
    sx += 40
d.text((left, 152), "Casino Helper", font=title, fill=GOLD)
d.line((left, 262, left + 96, 262), fill=GOLD, width=3)
d.text((left, 286), "Blackjack · Craps · Baccarat · Roulette", font=sub, fill="#f2f2f7")
d.text((left, 328), "Practice with a built-in strategy coach", font=sub, fill="#f2f2f7")
d.text((left, 378), "Play money only  ·  No ads  ·  No tracking", font=small, fill="#9a9ab0")

bg.save(out / "feature-graphic-1024x500.png", optimize=True)
print("ok")
