"""Génère les icônes de l'appli (PWA) à partir des sprites d'Hélio et Lune.
Lancer : python3 generer_icones.py (Pillow nécessaire). Écrit les PNG dans ../icons/, à commiter.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
IMGS = os.path.join(HERE, "assets", "images")
OUT = os.path.join(HERE, "..", "icons")
F = 48  # taille d'une case des planches de sprites

def sprite(name, mirror=False):
    sheet = Image.open(os.path.join(IMGS, f"{name}_spritesheet.png")).convert("RGBA")
    im = sheet.crop((0, 0, F, F))
    im = im.crop(im.getbbox())
    return im.transpose(Image.FLIP_LEFT_RIGHT) if mirror else im

def background(size):
    # coucher de soleil d'Hélio à gauche, nuit violette de Lune à droite
    n = 64
    bg = Image.new("RGBA", (n, n))
    px = bg.load()
    sun, night = (120, 34, 62), (52, 16, 84)
    for y in range(n):
        for x in range(n):
            t = x / (n - 1)
            v = 1 - 0.6 * abs(y - n * 0.4) / n
            px[x, y] = tuple(round((sun[k] * (1 - t) + night[k] * t) * v) for k in range(3)) + (255,)
    return bg.resize((size, size), Image.BICUBIC)

def icon(size, content):
    """content : part de la hauteur occupée par le dessin (plus petite pour l'icône « maskable »)."""
    bg = background(size)
    top = size * (1 - content) / 2
    # croissant de lune : un disque doré, creusé par un second disque décalé
    r = size * content * 0.2
    cx, cy = size * 0.5, top + r * 1.1
    disc = Image.new("L", (size, size), 0)
    ImageDraw.Draw(disc).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    ImageDraw.Draw(disc).ellipse((cx - r * 0.35, cy - r * 1.2, cx + r * 1.65, cy + r * 0.8), fill=0)
    bg.paste(Image.new("RGBA", (size, size), (255, 214, 120, 255)), (0, 0), disc)
    # Hélio et Lune face à face, agrandis sans lissage
    h, l = sprite("helio"), sprite("lune", mirror=True)
    scale = max(1, int(size * content * 0.62 / max(h.height, l.height)))
    h = h.resize((h.width * scale, h.height * scale), Image.NEAREST)
    l = l.resize((l.width * scale, l.height * scale), Image.NEAREST)
    bottom = round(top + size * content)
    gap = scale * 2
    x0 = round(size / 2 - (h.width + l.width + gap) / 2)
    bg.alpha_composite(h, (x0, bottom - h.height))
    bg.alpha_composite(l, (x0 + h.width + gap, bottom - l.height))
    return bg

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, size, content in [("icon-192.png", 192, 0.8), ("icon-512.png", 512, 0.8),
                                ("icon-maskable-512.png", 512, 0.6), ("apple-touch-icon.png", 180, 0.72),
                                ("favicon-32.png", 32, 0.95)]:
        icon(size, content).convert("RGB").save(os.path.join(OUT, name), optimize=True)
        print("icons/" + name)
