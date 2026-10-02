"""Prépare les images de la laverie, des clients, des cartes et des cosmétiques pour le jeu.

    python3 preparer_laverie.py

Lit src/assets/pack_laverie/ (images générées d'après docs/prompt_sprites_chatgpt.md, fond transparent ou magenta uni),
découpe chaque planche en cases régulières, réduit chaque image à sa taille en jeu (moyenne de blocs, alpha net),
la recale sur son ancrage (pieds, centre ou bas) et écrit :
  ../assets/laverie/<nom>.png   planches prêtes pour le jeu (servies par Nginx, mises en cache par l'appli)
  laverie.json                  atlas (même format que campagne.json), fusionné par build.py
Une image absente est simplement ignorée : le jeu garde alors son dessin provisoire.
Demande Pillow (comme preparer_pack.py). Relancer ensuite build.py.
"""
import json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "assets", "pack_laverie")
OUT = os.path.join(HERE, "..", "assets", "laverie")

# nom de l'atlas : (fichier source, colonnes, lignes, largeur et hauteur d'une case en jeu, ancrage, animations, même échelle pour toutes les cases)
# ancrage : "feet" (milieu du bas), "center", "bottom" (bas, pour les décors)
NPCS = ["bulle", "capitaine", "bobine", "kage"]
SPEC = {
    "laverie_fond": ("laverie/laverie_fond.png", 1, 1, 480, 272, "bottom", {"play": [0, 1]}, True),
    "laverie_carrelage": ("laverie/laverie_carrelage.png", 4, 1, 16, 16, "center", {"damier": [0, 1], "losanges": [1, 1], "uni": [2, 1], "neon": [3, 1]}, False),
    "machine_defis": ("laverie/machine_defis.png", 4, 2, 48, 56, "bottom", {"repos": [0, 4], "marche": [4, 4]}, True),
    "jukebox": ("laverie/jukebox.png", 4, 2, 32, 48, "bottom", {"repos": [0, 4], "musique": [4, 4]}, True),
    "album_lutrin": ("laverie/album_lutrin.png", 4, 1, 32, 32, "bottom", {"ferme": [0, 1], "ouverture": [1, 3]}, True),
    "armoire": ("laverie/armoire.png", 4, 1, 40, 56, "bottom", {"fermee": [0, 1], "ouverture": [1, 3]}, True),
    "vitrine": ("laverie/vitrine.png", 1, 1, 48, 40, "bottom", {"play": [0, 1]}, True),
    "trophees": ("laverie/trophees.png", 6, 1, 16, 16, "bottom", {"play": [0, 6]}, False),
    "presentoir_badges": ("laverie/presentoir_badges.png", 1, 1, 40, 32, "bottom", {"play": [0, 1]}, True),
    "etendoir": ("laverie/etendoir.png", 1, 1, 64, 40, "bottom", {"play": [0, 1]}, True),
    "affiches_boss": ("laverie/affiches_boss.png", 6, 1, 24, 32, "bottom", {"play": [0, 6]}, False),
    "enseigne": ("laverie/enseigne.png", 1, 2, 96, 24, "center", {"allumee": [0, 1], "clignote": [1, 1]}, True),
    "coin_detente": ("laverie/coin_detente.png", 5, 1, 48, 48, "bottom", {"canape": [0, 1], "plante": [1, 1], "distributeur": [2, 1], "panier": [3, 1], "table": [4, 1]}, False),
    "bulles_pnj": ("laverie/bulles_pnj.png", 2, 3, 12, 12, "center", {"quete": [0, 2], "parler": [2, 2], "fini": [4, 2]}, True),
    "machine_reparations": ("laverie/machine_reparations.png", 7, 1, 72, 65, "bottom", {"play": [0, 7]}, True),
    **{f"pnj_{n}": (f"pnj/pnj_{n}.png", 4, 3, 48, 48, "feet", {"repos": [0, 4], "parle": [4, 2], "content": [8, 2]}, True) for n in NPCS},
    **{f"portrait_{n}": (f"pnj/portrait_{n}.png", 1, 1, 40, 40, "bottom", {"play": [0, 1]}, True) for n in NPCS},
    "cadres_cartes": ("cartes/cadres_cartes.png", 5, 1, 80, 112, "center", {"play": [0, 5]}, True),
    "illus_monstres": ("cartes/illus_monstres.png", 6, 1, 40, 40, "bottom", {"play": [0, 6]}, False),
    "badges": ("icones/badges.png", 6, 3, 16, 16, "center", {"play": [0, 18]}, False),
    "icones_jeu": ("icones/icones_jeu.png", 8, 1, 12, 12, "center", {"play": [0, 8]}, False),
    "chaussette": ("objets/chaussette.png", 6, 2, 16, 16, "center", {"flotte": [0, 6], "collecte": [6, 6]}, True),
    "chaussette_bonus": ("objets/chaussette_bonus.png", 6, 2, 16, 16, "center", {"flotte": [0, 6], "collecte": [6, 6]}, True),
    "objets_quete": ("objets/objets_quete.png", 8, 1, 16, 16, "center", {"play": [0, 8]}, False),
    "fx_vent": ("objets/fx_vent.png", 4, 1, 32, 16, "center", {"play": [0, 4]}, True),
    "accessoires": ("cosmetiques/accessoires.png", 6, 2, 24, 24, "bottom", {"play": [0, 12]}, False),
    "autocollants_machine": ("cosmetiques/autocollants_machine.png", 6, 1, 16, 16, "center", {"play": [0, 6]}, False),
    **{f"souvenir_{i}": (f"souvenirs/souvenir_{i}.png", 1, 1, 240, 136, "bottom", {"play": [0, 1]}, True) for i in range(1, 7)},
    "souvenir_fin": ("souvenirs/fin.png", 1, 1, 240, 136, "bottom", {"play": [0, 1]}, True),
}

def unmagenta(im):
    """Fond magenta (#FF00FF, à peu près) → transparent ; image déjà transparente : inchangée."""
    im = im.convert("RGBA")
    px = im.load(); w, h = im.size
    if any(px[x, y][3] < 250 for x in (0, w - 1) for y in (0, h - 1)): return im
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 200 and b > 200 and g < 90: px[x, y] = (0, 0, 0, 0)
    return im

def bbox(cell):
    a = cell.split()[3].point(lambda v: 255 if v > 40 else 0)
    return a.getbbox()

def prepare(name, spec):
    path, cols, rows, cw, ch, anchor, anims, uniform = spec
    full = os.path.join(SRC, path)
    if not os.path.exists(full): return None
    im = unmagenta(Image.open(full))
    W, H = im.size
    sw, sh = W / cols, H / rows
    cells = [im.crop((round(c * sw), round(r * sh), round((c + 1) * sw), round((r + 1) * sh))) for r in range(rows) for c in range(cols)]
    boxes = [bbox(c) for c in cells]
    if cw >= 200:   # fond ou illustration : on garde toute l'image, réduite à la bonne taille
        crops = [c.resize((cw, ch), Image.BOX) for c in cells]
        scales = [None] * len(cells)
    else:
        if uniform:   # animation : la même échelle pour toutes les images (le personnage ne change pas de taille)
            mw = max((b[2] - b[0]) for b in boxes if b) if any(boxes) else 1
            mh = max((b[3] - b[1]) for b in boxes if b) if any(boxes) else 1
            s = min(cw / mw, ch / mh)
            scales = [s] * len(cells)
        else:
            scales = [min(cw / (b[2] - b[0]), ch / (b[3] - b[1])) if b else 1 for b in boxes]
        crops = []
        for c, b, s in zip(cells, boxes, scales):
            if not b: crops.append(Image.new("RGBA", (cw, ch))); continue
            part = c.crop(b)
            nw, nh = max(1, round(part.width * s)), max(1, round(part.height * s))
            small = part.resize((nw, nh), Image.BOX)
            alpha = small.split()[3].point(lambda v: 255 if v > 110 else 0)   # alpha net : pas de bord flou
            small.putalpha(alpha)
            cell = Image.new("RGBA", (cw, ch))
            if anchor == "center": ox, oy = (cw - nw) // 2, (ch - nh) // 2
            else: ox, oy = (cw - nw) // 2, ch - nh   # pieds ou bas : posé sur le bord bas, centré
            cell.paste(small, (ox, oy), small)
            crops.append(cell)
    sheet = Image.new("RGBA", (cw * cols, ch * rows))
    for i, c in enumerate(crops): sheet.paste(c, ((i % cols) * cw, (i // cols) * ch))
    os.makedirs(OUT, exist_ok=True)
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    ax, ay = cw // 2, ch if anchor in ("feet", "bottom") else ch // 2
    return {"src": f"assets/laverie/{name}.png", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": anims, "note": f"laverie : {path}"}

def main():
    atlas, missing = {}, []
    for name, spec in SPEC.items():
        a = prepare(name, spec)
        if a: atlas[name] = a
        else: missing.append(spec[0])
    json.dump({"atlas": atlas}, open(os.path.join(HERE, "laverie.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(atlas)} planches prêtes dans assets/laverie/ ; {len(missing)} images pas encore fournies (dessin provisoire)")
    if "-v" in sys.argv: print("\n".join("  manque : " + m for m in missing))

if __name__ == "__main__":
    main()
