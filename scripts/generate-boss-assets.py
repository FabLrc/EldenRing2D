"""Build the Warden's fixed-grid sprite and attack-effect sheets.

Run with the bundled workspace Python (Pillow required). Source paintings are
kept in scripts/boss-sources; only the compact sheets ship in assets/.
"""
from pathlib import Path
from math import cos, pi, sin
from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "scripts/boss-sources"
OUTPUT = ROOT / "assets/generated/boss"
FRAME_W, FRAME_H, FRAMES = 144, 112, 10
DIRECTIONS = ("south", "north", "east", "west")
CLIPS = ("idle", "move", "windup", "sweep", "charge", "slam", "hit", "death")
# The head remains at x=72 and the feet at y=108 in every cell.
ANCHORS = {
    "idle": ((354, 623), (866, 624), (352, 1238), (871, 1240)),
    "stride": ((397, 635), (851, 637), (371, 1234), (834, 1237)),
    "windup": ((354, 636), (862, 637), (365, 1234), (868, 1236)),
    "strike": ((422, 624), (809, 620), (413, 1210), (808, 1213)),
}


def load_pose(name, direction):
    index = DIRECTIONS.index(direction)
    side_strike = name == "strike" and direction in ("east", "west")
    source = Image.open(SOURCES / ("strike-side.png" if side_strike else f"{name}.png")).convert("RGBA")
    if side_strike:
        half_w = source.width // 2
        left, top = (0 if direction == "east" else half_w), 0
        crop = source.crop((left, top, left + half_w, 600))
        anchor_x, anchor_y = (420, 550) if direction == "east" else (1370, 550)
    else:
        half_w, half_h = source.width // 2, source.height // 2
        left, top = (index % 2) * half_w, (index // 2) * half_h
        crop = source.crop((left, top, left + half_w, top + half_h))
        anchor_x, anchor_y = ANCHORS[name][index]
    # Keep one consistent pixel density across poses and directions.
    crop = crop.resize((round(crop.width * .158), round(crop.height * .158)), Image.Resampling.LANCZOS)
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = pixels[x, y]
            if a < 115:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                pixels[x, y] = (min(255, round(r / 12) * 12), min(255, round(g / 12) * 12), min(255, round(b / 12) * 12), 255)
    frame = Image.new("RGBA", (FRAME_W, FRAME_H))
    x = round(72 - (anchor_x - left) * .158)
    y = round(108 - (anchor_y - top) * .158)
    frame.alpha_composite(crop, (x, y))
    return frame


def shifted(sprite, dx=0, dy=0, scale_y=1, lean=0):
    result = Image.new("RGBA", sprite.size)
    if scale_y != 1:
        h = max(1, round(FRAME_H * scale_y))
        sprite = sprite.resize((FRAME_W, h), Image.Resampling.NEAREST)
        result.alpha_composite(sprite, (dx, FRAME_H - h + dy))
    elif lean:
        # Shear preserves the feet and lets the shoulders lead a step or blow.
        result = sprite.transform(sprite.size, Image.Transform.AFFINE, (1, lean, -lean * 108 - dx, 0, 1, -dy), resample=Image.Resampling.NEAREST)
    else:
        result.alpha_composite(sprite, (dx, dy))
    return result


def ember(sprite, frame, phase=1):
    result = sprite.copy()
    draw = ImageDraw.Draw(result)
    for i in range(3 + phase * 2):
        x = 53 + (i * 19 + frame * 7) % 39
        y = 20 + (i * 23 - frame * 5) % 65
        if result.getpixel((x, y))[3] == 0:
            draw.rectangle((x, y, x + (i % 2), y + (i % 2)), fill=(238, 131 + i % 3 * 20, 58, 200))
    return result


def death_frame(sprite, n):
    if n < 3:
        return shifted(sprite, -n, n, lean=-n * .025)
    if n < 8:
        return shifted(sprite, -4, 0, scale_y=max(.25, 1 - (n - 2) * .15))
    image = Image.new("RGBA", sprite.size)
    draw = ImageDraw.Draw(image)
    draw.ellipse((47, 99, 98, 109), fill=(48, 40, 37, 230))
    for i in range(14):
        x = 49 + (i * 17) % 47
        y = 100 + (i * 11) % 8
        draw.rectangle((x, y, x + 1 + i % 2, y + 1), fill=(92 + i % 3 * 23, 69 + i % 4 * 11, 55, 255))
    if n == 8:
        image.alpha_composite(shifted(sprite, -4, 0, scale_y=.18))
    return image


def make_character_sheet():
    poses = {name: {direction: load_pose(name, direction) for direction in DIRECTIONS}
             for name in ("idle", "stride", "windup", "strike")}
    sheet = Image.new("RGBA", (FRAME_W * FRAMES, FRAME_H * len(CLIPS) * len(DIRECTIONS)))
    for clip_index, clip in enumerate(CLIPS):
        for dir_index, direction in enumerate(DIRECTIONS):
            still = poses["idle"][direction]
            stride = poses["stride"][direction]
            raised = poses["windup"][direction]
            strike = poses["strike"][direction]
            for n in range(FRAMES):
                bob = round(sin(n * pi / 5) * 1.4)
                if clip == "idle":
                    frame = shifted(still, dy=bob)
                elif clip == "move":
                    frame = shifted(stride if n in (2, 3, 4, 7, 8) else still,
                                    dx=(1 if n < 5 else -1), dy=round(sin(n * pi / 2.5) * 2), lean=.025 if n < 5 else -.025)
                elif clip == "windup":
                    frame = shifted(still if n < 2 else raised, dy=1 if n >= 7 else 0,
                                    lean=-.015 * max(0, n - 5))
                elif clip == "sweep":
                    frame = shifted(raised if n < 2 else strike if n < 8 else still,
                                    dx=(n - 3) // 2 if 2 <= n < 8 else 0, lean=.03 if 3 <= n < 7 else 0)
                elif clip == "charge":
                    frame = shifted(strike if n < 8 else stride, dx=min(7, n),
                                    lean=.04 if n < 8 else 0)
                elif clip == "slam":
                    frame = shifted(raised if n < 5 else strike if n < 8 else still,
                                    dy=3 if n in (5, 6) else 0, scale_y=.94 if n in (5, 6) else 1)
                elif clip == "hit":
                    frame = shifted(still, dx=round(sin(n * 2.6) * (5 - n / 2)), lean=-.04 * (1 - n / 10))
                    if n < 3:
                        frame = ImageEnhance.Brightness(frame).enhance(1.25)
                else:
                    frame = death_frame(still, n)
                if clip != "death":
                    frame = ember(frame, n)
                sheet.alpha_composite(frame, (n * FRAME_W, (clip_index * 4 + dir_index) * FRAME_H))
    sheet.save(OUTPUT / "warden.webp", format="WEBP", lossless=True, method=6)


def effect_frame(kind, n):
    size = 160
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    t = n / 9
    if kind == "sweep":
        # The blade's direction is +x; runtime rotates the frame to face.
        for j, color in enumerate(((96, 42, 33, 100), (191, 91, 43, 170), (255, 194, 107, 210), (255, 231, 170, 245))):
            radius = round(49 + 29 * t + j * 2)
            box = (80 - radius, 80 - radius, 80 + radius, 80 + radius)
            draw.arc(box, -74 + n * 8, 44 + n * 8, fill=color, width=max(1, 8 - j * 2))
        for i in range(17):
            angle = (-65 + (i * 13 + n * 8) % 115) * pi / 180
            radius = 45 + (i * 9 + n * 5) % 40
            x, y = round(80 + cos(angle) * radius), round(80 + sin(angle) * radius)
            draw.rectangle((x, y, x + 1 + i % 2, y + 1), fill=(235, 129 + i % 3 * 30, 64, max(40, 220 - n * 18)))
    elif kind == "charge":
        for j in range(6):
            y = 80 + (j - 3) * 7
            x0 = max(0, round(75 - n * 8 - j * 6))
            draw.line((x0, y, 85 + n * 4, y + (j - 3) * 2), fill=(232, 148 + j * 12, 75, max(45, 180 - n * 10)), width=1 + j % 2)
        draw.polygon(((90 + n * 2, 74), (121 + n * 2, 80), (90 + n * 2, 86)), fill=(255, 194, 115, max(50, 190 - n * 10)))
    else:
        radius = round(15 + 61 * t)
        for inset, color, width in ((0, (237, 139, 70, 190), 5), (5, (255, 223, 145, 220), 2)):
            r = max(2, radius - inset)
            draw.ellipse((80-r, 80-r, 80+r, 80+r), outline=color, width=width)
        if n >= 2:
            for i in range(12):
                angle = i * pi / 6
                r0, r1 = radius - 12, radius + 6 + i % 3 * 4
                draw.line((80 + cos(angle) * r0, 80 + sin(angle) * r0,
                           80 + cos(angle) * r1, 80 + sin(angle) * r1),
                          fill=(242, 180, 96, max(45, 200 - n * 14)), width=2)
    return image


def make_effect_sheet():
    sheet = Image.new("RGBA", (160 * FRAMES, 160 * 3))
    for row, kind in enumerate(("sweep", "charge", "slam")):
        for n in range(FRAMES):
            sheet.alpha_composite(effect_frame(kind, n), (160 * n, 160 * row))
    sheet.save(OUTPUT / "warden-fx.webp", format="WEBP", lossless=True, method=6)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    make_character_sheet()
    make_effect_sheet()
    print("Generated warden.webp and warden-fx.webp")
