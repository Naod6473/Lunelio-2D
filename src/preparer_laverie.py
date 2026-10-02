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
# Le fichier source peut être une liste : le premier qui existe est pris (noms du prompt ou noms des images déjà fournies).
# Chaque fichier est aussi cherché à la racine de pack_laverie/ (sans son sous-dossier).
# FIT : pour une planche à même échelle, hauteur visée et images qui servent à la mesurer (sinon toutes, ajustées à la case).
NPCS = ["bulle", "capitaine", "bobine", "kage", "firmin"]
SPEC = {
    # images fournies : trois pièces de la laverie, portes, chaussette, tas de chaussettes, trophées
    "laverie_salle": ("laundry_room.png", 1, 1, 816, 272, "bottom", {"play": [0, 1]}, True),
    "laverie_chaussettes": ("laundry_socks_room.png", 1, 1, 680, 272, "bottom", {"play": [0, 1]}, True),
    "laverie_trophees": ("trophyroom.png", 1, 1, 680, 272, "bottom", {"play": [0, 1]}, True),
    "portes_laverie": ("laundrydoors.png", 3, 2, 48, 58, "bottom", {"fermee": [0, 3], "ouverte": [3, 3]}, True),
    "tas_chaussettes": ("laundrysocks.png", 3, 2, 170, 104, "bottom", {"play": [0, 6]}, True),
    "trophees": (["trophy_sprite.png", "laverie/trophees.png"], 3, 2, 30, 34, "bottom", {"play": [0, 6]}, True),
    "chaussette": (["sock_sprite.png", "objets/chaussette.png"], 4, 2, 28, 28, "center", {"flotte": [0, 4], "collecte": [4, 4]}, True),
    # robots de l'ancienne aventure (prompt H2) : remplacent les robots dessinés par le code
    "robot_marcheur": (["robot_marcheur.png", "ennemis/robot_marcheur.png"], 4, 2, 30, 30, "feet", {"marche": [0, 4], "charge": [4, 4]}, True),
    "robot_canon": (["robot_canon.png", "ennemis/robot_canon.png"], 4, 1, 34, 30, "feet", {"repos": [0, 2], "vise": [2, 2]}, True),
    "drone_ancien": (["drone_ancien.png", "ennemis/drone_ancien.png"], 4, 1, 24, 20, "center", {"vol": [0, 4]}, True),
    # images du prompt (docs/prompt_sprites_chatgpt.md), pas encore fournies
    "laverie_fond": ("laverie/laverie_fond.png", 1, 1, 480, 272, "bottom", {"play": [0, 1]}, True),
    "laverie_carrelage": ("laverie/laverie_carrelage.png", 4, 1, 16, 16, "center", {"damier": [0, 1], "losanges": [1, 1], "uni": [2, 1], "neon": [3, 1]}, False),
    "machine_defis": ("laverie/machine_defis.png", 4, 2, 48, 56, "bottom", {"repos": [0, 4], "marche": [4, 4]}, True),
    "jukebox": ("laverie/jukebox.png", 4, 2, 32, 48, "bottom", {"repos": [0, 4], "musique": [4, 4]}, True),
    "album_lutrin": ("laverie/album_lutrin.png", 4, 1, 32, 32, "bottom", {"ferme": [0, 1], "ouverture": [1, 3]}, True),
    "armoire": ("laverie/armoire.png", 4, 1, 40, 56, "bottom", {"fermee": [0, 1], "ouverture": [1, 3]}, True),
    "vitrine": ("laverie/vitrine.png", 1, 1, 48, 40, "bottom", {"play": [0, 1]}, True),
    "presentoir_badges": ("laverie/presentoir_badges.png", 1, 1, 40, 32, "bottom", {"play": [0, 1]}, True),
    "etendoir": ("laverie/etendoir.png", 1, 1, 64, 40, "bottom", {"play": [0, 1]}, True),
    "affiches_boss": ("laverie/affiches_boss.png", 6, 1, 24, 32, "bottom", {"play": [0, 6]}, False),
    "enseigne": ("laverie/enseigne.png", 1, 2, 96, 24, "center", {"allumee": [0, 1], "clignote": [1, 1]}, True),
    "coin_detente": ("laverie/coin_detente.png", 5, 1, 48, 48, "bottom", {"canape": [0, 1], "plante": [1, 1], "distributeur": [2, 1], "panier": [3, 1], "table": [4, 1]}, False),
    "bulles_pnj": ("laverie/bulles_pnj.png", 2, 3, 12, 12, "center", {"quete": [0, 2], "parler": [2, 2], "fini": [4, 2]}, True),
    "machine_reparations": ("laverie/machine_reparations.png", 7, 1, 72, 65, "bottom", {"play": [0, 7]}, True),
    **{f"pnj_{n}": ([f"pnj/pnj_{n}.png", f"pnj_{n}.png"], 4, 3, 48, 48, "feet", {"repos": [0, 4], "parle": [4, 2], "content": [8, 2]}, True) for n in NPCS},
    **{f"portrait_{n}": ([f"pnj/portrait_{n}.png", f"portrait_{n}.png"], 1, 1, 40, 40, "bottom", {"play": [0, 1]}, True) for n in NPCS},
    "cadres_cartes": ("cartes/cadres_cartes.png", 5, 1, 80, 112, "center", {"play": [0, 5]}, True),
    "illus_monstres": ("cartes/illus_monstres.png", 6, 1, 40, 40, "bottom", {"play": [0, 6]}, False),
    "badges": ("icones/badges.png", 5, 4, 16, 16, "center", {"play": [0, 19]}, False),
    "icones_jeu": ("icones/icones_jeu.png", 8, 1, 12, 12, "center", {"play": [0, 8]}, False),
    "chaussette_bonus": ("objets/chaussette_bonus.png", 4, 2, 28, 28, "center", {"flotte": [0, 4], "collecte": [4, 4]}, True),
    "objets_quete": ("objets/objets_quete.png", 8, 1, 16, 16, "center", {"play": [0, 8]}, False),
    "fx_vent": ("objets/fx_vent.png", 4, 1, 32, 16, "center", {"play": [0, 4]}, True),
    "ratelier": (["ratelier.png", "laverie/ratelier.png"], 4, 1, 48, 56, "bottom", {"fermee": [0, 1], "ouverture": [1, 3]}, True),
    # trésors de la collection : une ligne par objet, 4 images animées (de simple à très brillant)
    **{f"tresors_{i}": (f"tresors_{i}.png", 4, 5 if i == 4 else 6, 32, 32, "center", {"play": [0, 4]}, True) for i in range(1, 6)},
    "etagere": ("etagere.png", 1, 1, 64, 72, "bottom", {"play": [0, 1]}, True),
    "livre_deco": ("livre_deco.png", 2, 1, 52, 56, "feet", {"fermee": [0, 1], "ouverture": [1, 1]}, True),
    # niveau secret du Dahaka, la grotte : scènes (terrain de jeu), cadres de premier plan, cascade, monstres du fond et gardiens du premier plan
    **{f"grotte_scene_{i}": (f"dahaka_grotte/scene_{i}.png", 1, 1, 480, 272, "bottom", {"play": [0, 1]}, True) for i in range(1, 7)},
    **{f"grotte_avant_{i}": (f"dahaka_grotte/avant_{i}.png", 1, 1, 480, 272, "bottom", {"play": [0, 1]}, True) for i in range(1, 5)},
    "grotte_cascade": ("dahaka_grotte/cascade.png", 2, 1, 112, 184, "bottom", {"play": [0, 2]}, True),
    "grotte_lezard": ("dahaka_grotte/fond_lezard.png", 3, 1, 52, 24, "feet", {"play": [0, 3]}, True),
    "grotte_golem": ("dahaka_grotte/fond_golem.png", 3, 1, 36, 36, "feet", {"play": [0, 3]}, True),
    "grotte_chauvesouris": ("dahaka_grotte/fond_chauvesouris.png", 3, 1, 44, 32, "center", {"play": [0, 3]}, True),
    "grotte_gardiens": ("dahaka_grotte/gardiens.png", 5, 3, 60, 56, "feet", {"cristal": [0, 5], "spectre": [5, 5], "champignon": [10, 5]}, True),
    "armes_icones": ("armes_icones.png", 5, 2, 32, 32, "center", {"play": [0, 10]}, False),
    "accessoires": ("cosmetiques/accessoires.png", 6, 2, 24, 24, "bottom", {"play": [0, 12]}, False),
    "autocollants_machine": ("cosmetiques/autocollants_machine.png", 6, 1, 16, 16, "center", {"play": [0, 6]}, False),
    **{f"souvenir_{i}": (f"souvenirs/souvenir_{i}.png", 1, 1, 240, 136, "bottom", {"play": [0, 1]}, True) for i in range(1, 7)},
    "souvenir_fin": ("souvenirs/fin.png", 1, 1, 240, 136, "bottom", {"play": [0, 1]}, True),
}

# hauteur visée et images de référence pour l'échelle commune (la chaussette se mesure sans les étincelles de la collecte)
FIT = {"livre_deco": (54, None), "grotte_cascade": (180, None), "grotte_lezard": (20, None), "grotte_golem": (32, None), "grotte_chauvesouris": (26, None), "grotte_gardiens": (50, None), "robot_marcheur": (24, None), "robot_canon": (24, None), "drone_ancien": (14, None), "chaussette": (22, [0, 1, 2, 3]), "chaussette_bonus": (22, [0, 1, 2, 3]), "tas_chaussettes": (100, None), "trophees": (32, None), "portes_laverie": (56, None)}

# lignes d'une planche aux hauteurs inégales (y début, y fin dans l'image source), au lieu de parts égales
ROWS = {"grotte_gardiens": [(14, 300), (300, 646), (646, 1000)]}

for _n in NPCS: FIT["pnj_" + _n] = (38, None)   # clients : environ 38 px de haut, comme les héros

def unmagenta(im):
    """Fond magenta (#FF00FF, à peu près) → transparent ; image déjà transparente : inchangée."""
    im = im.convert("RGBA")
    px = im.load(); w, h = im.size
    if any(px[x, y][3] < 250 for x in (0, w - 1) for y in (0, h - 1)): return im
    mag = lambda r, g, b: r >= 185 and b >= 185 and g <= 95 and abs(r - b) <= 50   # magenta à peu près uni (les images générées varient un peu)
    if not mag(*px[0, 0][:3]): return im   # fond plein (décor) : rien à détourer
    for y in range(h):
        for x in range(w):
            if mag(*px[x, y][:3]): px[x, y] = (0, 0, 0, 0)
    return im

def drop_edge_bits(cell):
    """Efface les petits morceaux coupés qui touchent le bord de la case (étincelles d'un objet voisin) ; garde le reste."""
    px = cell.load(); w, h = cell.size; seen = bytearray(w * h)
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or px[x0, y0][3] <= 40: continue
            comp, stack, edge = [], [(x0, y0)], False
            seen[y0 * w + x0] = 1
            while stack:
                x, y = stack.pop(); comp.append((x, y))
                if x in (0, w - 1) or y in (0, h - 1): edge = True
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny][3] > 40:
                        seen[ny * w + nx] = 1; stack.append((nx, ny))
            if edge and len(comp) < w * h * 0.03:
                for x, y in comp: px[x, y] = (0, 0, 0, 0)
    return cell

def bbox(cell):
    a = cell.split()[3].point(lambda v: 255 if v > 40 else 0)
    return a.getbbox()

def prepare(name, spec):
    path, cols, rows, cw, ch, anchor, anims, uniform = spec
    paths = path if isinstance(path, list) else [path]
    paths = paths + [os.path.basename(q) for q in paths if os.path.basename(q) not in paths]   # aussi accepté à la racine du dossier
    full = next((os.path.join(SRC, q) for q in paths if os.path.exists(os.path.join(SRC, q))), None)
    if not full: return None
    path = os.path.relpath(full, SRC).replace(os.sep, "/")
    im = unmagenta(Image.open(full))
    W, H = im.size
    sw, sh = W / cols, H / rows
    ys = ROWS.get(name) or [(round(r * sh), round((r + 1) * sh)) for r in range(rows)]
    cells = [im.crop((round(c * sw), y0, round((c + 1) * sw), y1)) for y0, y1 in ys for c in range(cols)]
    if name.startswith(("tresors_", "grotte_")) and cw < 200: cells = [drop_edge_bits(c) for c in cells]
    boxes = [bbox(c) for c in cells]
    if cw >= 200:   # fond ou illustration : on garde toute l'image, réduite à la bonne taille
        crops = [c.resize((cw, ch), Image.BOX) for c in cells]
        scales = [None] * len(cells)
    else:
        if uniform:   # animation : la même échelle pour toutes les images (le personnage ne change pas de taille)
            th, ref = FIT.get(name, (None, None))
            ref_boxes = [boxes[i] for i in (ref or range(len(boxes))) if boxes[i]]
            mw = max((b[2] - b[0]) for b in ref_boxes) if ref_boxes else 1
            mh = max((b[3] - b[1]) for b in ref_boxes) if ref_boxes else 1
            s = th / mh if th else min(cw / mw, ch / mh)
            s = min(s, cw / mw)
            scales = [s] * len(cells)
        else:
            scales = [min(cw / (b[2] - b[0]), ch / (b[3] - b[1])) if b else 1 for b in boxes]
        b0 = next((b for b in boxes if b), None)   # centre du corps mesuré sur la première image
        refx = (b0[0] + b0[2]) / 2 if b0 else None
        crops = []
        for c, b, s in zip(cells, boxes, scales):
            if not b: crops.append(Image.new("RGBA", (cw, ch))); continue
            part = c.crop(b)
            nw, nh = max(1, round(part.width * s)), max(1, round(part.height * s))
            small = part.resize((nw, nh), Image.BOX)
            alpha = small.split()[3].point(lambda v: 255 if v > 110 else 0)   # alpha net : pas de bord flou
            small.putalpha(alpha)
            cell = Image.new("RGBA", (cw, ch))
            if anchor == "center":
                # centre de la case d'origine conservé (une étincelle décalée reste décalée)
                cx0, cy0 = (b[0] + b[2]) / 2 - c.width / 2, (b[1] + b[3]) / 2 - c.height / 2
                ox, oy = round((cw - nw) / 2 + cx0 * s * 0.5), round((ch - nh) / 2 + cy0 * s * 0.5)
            elif anchor == "feet" and uniform and refx is not None:   # animation : même décalage que dans la planche (un bras levé ne fait pas glisser le corps)
                ox, oy = min(max(0, round(cw / 2 + (b[0] - refx) * s)), cw - nw), ch - nh
            else: ox, oy = (cw - nw) // 2, ch - nh   # pieds ou bas : posé sur le bord bas, centré
            cell.paste(small, (ox, oy), small)
            crops.append(cell)
    sheet = Image.new("RGBA", (cw * cols, ch * rows))
    for i, c in enumerate(crops): sheet.paste(c, ((i % cols) * cw, (i // cols) * ch))
    os.makedirs(OUT, exist_ok=True)
    for old in (os.path.join(OUT, name + e) for e in (".png", ".webp")):
        if os.path.exists(old): os.remove(old)
    ext = ".webp" if cw >= 200 else ".png"   # grands décors : WebP sans perte, plus léger
    if ext == ".webp": sheet.save(os.path.join(OUT, name + ext), lossless=True, quality=100, method=6)
    else: sheet.save(os.path.join(OUT, name + ext), optimize=True)
    ax, ay = cw // 2, ch if anchor in ("feet", "bottom") else ch // 2
    return {"src": f"assets/laverie/{name}{ext}", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": anims, "note": f"laverie : {path}"}

# Planche complète d'un héros livrée avec son découpage (<nom>.json : sourceRects et renderRects dans une case de 64 × 64,
# pieds en (32, 60)) : chaque pose est réduite à son rectangle de rendu, aux mêmes indices que dans la planche (6 colonnes).
HEROES = {
    "perso_helio": ("perso_helio_complet", {"idle": [0, 4], "run": [6, 6], "attack": [12, 5], "jump": [18, 2], "special": [24, 2],
        "idle_free": [30, 4], "run_free": [36, 6], "jump_free": [42, 2], "special_free": [48, 2], "shoot": [54, 3], "throw": [60, 3], "heavy": [66, 4]}),
    "perso_lune": ("perso_lune_complet", {"idle": [0, 4], "run": [6, 6], "attack": [12, 5], "jump": [18, 2], "special": [24, 2],
        "idle_free": [30, 4], "run_free": [36, 6], "jump_free": [42, 2], "special_free": [48, 2], "shoot": [54, 3], "throw": [60, 3], "heavy": [66, 4]}),
}

def prepare_hero(name, base, anims):
    png, meta = os.path.join(SRC, base + ".png"), os.path.join(SRC, base + ".json")
    if not (os.path.exists(png) and os.path.exists(meta)): return None
    M = json.load(open(meta, encoding="utf-8"))
    im = Image.open(png).convert("RGBA")
    cw, ch, cols, rows = M["logicalCell"]["width"], M["logicalCell"]["height"], M["columns"], M["rows"]
    sheet = Image.new("RGBA", (cw * cols, ch * rows))
    for f in M["frames"]:
        x, y, w, h = f["sourceRect"]; rx, ry, rw, rh = f["renderRect"]
        part = im.crop((x, y, x + w, y + h)).resize((max(1, round(rw)), max(1, round(rh))), Image.BOX)
        part.putalpha(part.split()[3].point(lambda v: 255 if v > 110 else 0))   # alpha net
        i = f["index"]; sheet.paste(part, ((i % cols) * cw + round(rx), (i // cols) * ch + round(ry)), part)
    os.makedirs(OUT, exist_ok=True)
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    return {"src": f"assets/laverie/{name}.png", "cw": cw, "ch": ch, "ax": round(M["logicalAnchor"]["x"]), "ay": round(M["logicalAnchor"]["y"]),
            "cols": cols, "anims": anims, "note": f"héros : {base}.png"}

# Dahaka (niveau secret) : planche en 5 lignes de hauteur connue, découpées en cases (la 3e ligne a une image très large).
# Chaque case est réduite à la même échelle, posée sur la même ligne de pieds ; le corps reste au même endroit (ax), un bras
# tendu déborde vers la droite.
# Dahaka (niveau secret) : planche « démon spectral » 6 × 6 cases de 192 px, repère commun (96, 160) aux pieds, tourné vers la droite.
# Lignes : course lente, course rapide, saut, saisie, mise à la bouche, cri.
DAHAKA_SRC, DAHAKA_CELL, DAHAKA_FOOT, DAHAKA_SCALE = "dahaka/demon_spectral.png", 192, (96, 160), 0.65
DAHAKA_ANIMS = {"course_lente": [0, 6], "course_rapide": [6, 6], "saut": [12, 6], "saisie": [18, 6], "mise_en_bouche": [24, 6], "cri": [30, 6]}

def prepare_dahaka():
    png = os.path.join(SRC, DAHAKA_SRC)
    if not os.path.exists(png): return None
    im = Image.open(png).convert("RGBA"); n, s = DAHAKA_CELL, DAHAKA_SCALE
    cols, rows = im.width // n, im.height // n
    cw = ch = round(n * s); ax, ay = round(DAHAKA_FOOT[0] * s), round(DAHAKA_FOOT[1] * s)
    sheet = Image.new("RGBA", (cw * cols, ch * rows))
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * n, r * n, (c + 1) * n, (r + 1) * n)).resize((cw, ch), Image.BOX)   # même échelle partout : le repère reste en place
            cell.putalpha(cell.split()[3].point(lambda v: 255 if v > 110 else 0))                 # alpha net
            sheet.paste(cell, (c * cw, r * ch))
    os.makedirs(OUT, exist_ok=True)
    sheet.save(os.path.join(OUT, "dahaka.png"), optimize=True)
    return {"src": "assets/laverie/dahaka.png", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": DAHAKA_ANIMS, "note": "Dahaka (niveau secret) : démon spectral"}

def fade_foreground():
    """Cadres de premier plan de la grotte : en bas (sous y = 150), seuls les bords gauche et droit restent, fondus vers le milieu."""
    for i in range(1, 5):
        f = os.path.join(OUT, f"grotte_avant_{i}.webp")
        if not os.path.exists(f): continue
        im = Image.open(f).convert("RGBA"); px = im.load(); w, h = im.size
        for y in range(150, h):
            for x in range(w):
                d = min(x, w - 1 - x)                       # distance au bord
                k = 1 if d < 56 else max(0, 1 - (d - 56) / 40)
                if k < 1: r, g, b, a = px[x, y]; px[x, y] = (r, g, b, round(a * k))
        im.save(f, lossless=True, quality=100, method=6)

def main():
    atlas, missing = {}, []
    d = prepare_dahaka()
    if d: atlas["dahaka"] = d
    for name, (base, anims) in HEROES.items():
        a = prepare_hero(name, base, anims)
        if a: atlas[name] = a
    for name, spec in SPEC.items():
        a = prepare(name, spec)
        if a: atlas[name] = a
        else: missing.append(spec[0])
    fade_foreground()
    json.dump({"atlas": atlas}, open(os.path.join(HERE, "laverie.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(atlas)} planches prêtes dans assets/laverie/ ; {len(missing)} images pas encore fournies (dessin provisoire)")
    if "-v" in sys.argv: print("\n".join("  manque : " + m for m in missing))

if __name__ == "__main__":
    main()
