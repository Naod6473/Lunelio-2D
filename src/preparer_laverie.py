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
    # l'église (combat des mariés) : trois plans fixes d'arène, sol à y = 236
    **{f"eglise_{i}": (f"eglise/eglise_{i}.jpeg", 1, 1, 480, 272, "bottom", {"play": [0, 1]}, True) for i in range(1, 4)},
    "livre_deco": ("livre_deco.png", 2, 1, 52, 56, "feet", {"fermee": [0, 1], "ouverture": [1, 1]}, True),
    # livre des secrets (salle des chaussettes, il flotte) : fermé, entrouvert, ouvert ; fond gris d'origine retiré
    "carnet_secrets": ("livre_secrets.png", 3, 1, 72, 52, "bottom", {"fermee": [0, 1], "ouverture": [1, 2], "ouvert": [2, 1]}, True),
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
}

# hauteur visée et images de référence pour l'échelle commune (la chaussette se mesure sans les étincelles de la collecte)
FIT = {"livre_deco": (54, None), "carnet_secrets": (46, None), "grotte_cascade": (180, None), "grotte_lezard": (20, None), "grotte_golem": (32, None), "grotte_chauvesouris": (26, None), "grotte_gardiens": (50, None), "robot_marcheur": (24, None), "robot_canon": (24, None), "drone_ancien": (14, None), "chaussette": (22, [0, 1, 2, 3]), "chaussette_bonus": (22, [0, 1, 2, 3]), "tas_chaussettes": (100, None), "trophees": (32, None), "portes_laverie": (56, None)}

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

def prepare_grid(name, rel, n, foot, s, anims, note):
    """Planche en cases régulières de n px, repère commun foot (pieds), réduite à l'échelle s (même échelle partout)."""
    png = os.path.join(SRC, rel)
    if not os.path.exists(png): return None
    im = Image.open(png).convert("RGBA")
    cols, rows = im.width // n, im.height // n
    cw = ch = round(n * s); ax, ay = round(foot[0] * s), round(foot[1] * s)
    sheet = Image.new("RGBA", (cw * cols, ch * rows))
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * n, r * n, (c + 1) * n, (r + 1) * n)).resize((cw, ch), Image.BOX)   # même échelle partout : le repère reste en place
            cell.putalpha(cell.split()[3].point(lambda v: 255 if v > 110 else 0))                 # alpha net
            sheet.paste(cell, (c * cw, r * ch))
    os.makedirs(OUT, exist_ok=True)
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    return {"src": f"assets/laverie/{name}.png", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": anims, "note": note}

def prepare_dahaka():
    return prepare_grid("dahaka", DAHAKA_SRC, DAHAKA_CELL, DAHAKA_FOOT, DAHAKA_SCALE, DAHAKA_ANIMS, "Dahaka (niveau secret) : démon spectral")

# L'église : Jules et Laurène (cases de 192 px, pieds en (96, 160), comme le démon spectral), Brie (planche aux cases
# irrégulières, découpée à la main : BRIE_ROWS), projectiles, crotte et portraits des dialogues
EG_SCALE = 0.55
JULES_ANIMS = {"marche": [0, 6], "course": [6, 6], "saut": [12, 6], "glissade": [18, 6], "cri": [24, 6], "lancer": [30, 6], "combat_pieds": [36, 6]}
LAURENE_ANIMS = {"marche": [0, 6], "course": [6, 6], "saut": [12, 6], "glissade": [18, 6], "cri": [24, 6], "lancer_bouquet": [30, 6],
                 "lancer_chevre": [36, 6], "lancer_bouteille": [42, 6], "furie": [48, 6]}
# Brie : (y début, y fin) de chaque ligne, puis les fenêtres (x début, x fin) de ses images, dans la planche brie_sprite.png
BRIE_ROWS = [((21, 198), [(26, 300), (310, 560), (565, 810), (815, 1045), (1050, 1255), (1260, 1500)]),        # repos
             ((215, 375), [(16, 282), (283, 528), (530, 786), (788, 1056), (1057, 1292), (1293, 1530)]),       # course
             ((383, 562), [(21, 290), (300, 610), (615, 900), (900, 1170), (1180, 1440)]),                     # aboiement
             ((569, 786), [(62, 350), (370, 660), (670, 910), (920, 1190), (1205, 1485)]),                     # saut
             ((784, 985), [(20, 282), (284, 500), (503, 725), (740, 965), (1030, 1500)])]                      # crotte (4), morte
BRIE_ANIMS = {"repos": [0, 6], "course": [6, 6], "aboie": [12, 5], "saut": [17, 5], "crotte": [22, 4], "morte": [26, 1]}
BRIE_SCALE, BRIE_CELL = 0.17, (84, 40)

# Laurène en furie (après la transformation du duo) : planche aux images de largeurs inégales, découpée à la main.
# (y début, y fin) de chaque ligne, puis les fenêtres (x début, x fin) ; les pieds sont en bas de la ligne, au milieu du bas
# du corps de chaque image. Le laser et la boule de feu restent dans l'image (cases larges : ax laisse la place à droite).
FURIE_ROWS = [((31, 177), [(18, 156), (196, 342), (384, 545), (577, 733), (770, 940), (965, 1099)]),     # course
              ((206, 358), [(19, 155), (204, 363), (390, 539), (567, 757), (757, 966), (973, 1100)]),    # boule de feu
              ((378, 552), [(19, 159), (197, 355), (393, 537), (583, 727), (776, 917), (964, 1108)]),    # saut
              ((575, 728), [(22, 154), (181, 328), (349, 540), (563, 737), (756, 940), (973, 1104)])]    # laser des yeux
FURIE_ANIMS = {"course": [0, 6], "orbe": [6, 6], "saut": [12, 6], "laser": [18, 6]}
FURIE_SCALE, FURIE_CELL, FURIE_ANCHOR = 0.46, (150, 90), (50, 86)

def prepare_laurene_furie():
    png = os.path.join(SRC, "eglise/laurene_furie.png")
    if not os.path.exists(png): return None
    im = Image.open(png).convert("RGBA"); s = FURIE_SCALE; cw, ch = FURIE_CELL; ax, ay = FURIE_ANCHOR
    frames = []
    for (y0, y1), wins in FURIE_ROWS:
        for (x0, x1) in wins:
            cell = im.crop((x0, y0, x1, y1)); al = cell.split()[3]
            # milieu du bas du corps : colonnes opaques des 30 dernières lignes non vides
            bb = al.getbbox(); low = al.crop((0, max(0, bb[3] - 30), cell.width, bb[3])).getbbox() or bb
            fx = (low[0] + low[2]) / 2
            sm = cell.resize((max(1, round(cell.width * s)), max(1, round(cell.height * s))), Image.BOX)
            sm.putalpha(sm.split()[3].point(lambda v: 255 if v > 110 else 0))
            out = Image.new("RGBA", (cw, ch)); out.paste(sm, (round(ax - fx * s), round(ay - (y1 - y0) * s)), sm)
            frames.append(out)
    cols = 6; sheet = Image.new("RGBA", (cw * cols, ch * ((len(frames) + cols - 1) // cols)))
    for i, f in enumerate(frames): sheet.paste(f, ((i % cols) * cw, (i // cols) * ch))
    os.makedirs(OUT, exist_ok=True); sheet.save(os.path.join(OUT, "eg_laurene_furie.png"), optimize=True)
    return {"src": "assets/laverie/eg_laurene_furie.png", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": FURIE_ANIMS, "note": "Laurène en furie (église)"}

def prepare_brie():
    png = os.path.join(SRC, "eglise/brie_sprite.png")
    if not os.path.exists(png): return None, None
    im = Image.open(png).convert("RGBA"); s = BRIE_SCALE; cw, ch = BRIE_CELL
    frames = []
    for (y0, y1), wins in BRIE_ROWS:
        for x0, x1 in wins: frames.append(im.crop((x0, y0, x1, y1)))
    cols = 6; sheet = Image.new("RGBA", (cw * cols, ch * ((len(frames) + cols - 1) // cols)))
    for i, f in enumerate(frames):
        b = bbox(f)
        if not b: continue
        part = f.crop(b); small = part.resize((max(1, round(part.width * s)), max(1, round(part.height * s))), Image.BOX)
        small.putalpha(small.split()[3].point(lambda v: 255 if v > 110 else 0))
        cell = Image.new("RGBA", (cw, ch)); cell.paste(small, ((cw - small.width) // 2, ch - small.height), small)   # pieds en bas, centrée
        sheet.paste(cell, ((i % cols) * cw, (i // cols) * ch))
    os.makedirs(OUT, exist_ok=True); sheet.save(os.path.join(OUT, "eg_brie.png"), optimize=True)
    # la crotte, seule : recadrée à la main sous la dernière image accroupie (elle touche la patte dans la planche)
    crotte = im.crop((754, 937, 796, 976))
    c2 = crotte.resize((max(1, round(crotte.width * s * 1.7)), max(1, round(crotte.height * s * 1.7))), Image.BOX)
    c2.putalpha(c2.split()[3].point(lambda v: 255 if v > 110 else 0)); cell = Image.new("RGBA", (16, 14)); cell.paste(c2, ((16 - c2.width) // 2, 14 - c2.height), c2)
    cell.save(os.path.join(OUT, "eg_crotte.png"), optimize=True)
    return ({"src": "assets/laverie/eg_brie.png", "cw": cw, "ch": ch, "ax": cw // 2, "ay": ch, "cols": cols, "anims": BRIE_ANIMS, "note": "Brie (église)"},
            {"src": "assets/laverie/eg_crotte.png", "cw": 16, "ch": 14, "ax": 8, "ay": 14, "cols": 1, "anims": {"play": [0, 1]}, "note": "crotte de Brie"})

def drop_frame_lines(cell, n=18):
    """Efface les longues lignes sombres droites (cadre dessiné autour d'une image), horizontales et verticales."""
    px = cell.load(); w, h = cell.size
    dark = lambda x, y: px[x, y][3] > 40 and max(px[x, y][:3]) < 60
    for horiz in (True, False):
        for a in range(h if horiz else w):
            run = []
            for b in range((w if horiz else h) + 1):
                x, y = (b, a) if horiz else (a, b)
                if b < (w if horiz else h) and dark(x, y): run.append((x, y)); continue
                if len(run) >= n:
                    for x2, y2 in run:   # la ligne et son voisinage immédiat (trait de 2 px)
                        for dx, dy in ((0, 0), (0, 1), (0, -1)) if horiz else ((0, 0), (1, 0), (-1, 0)):
                            if 0 <= x2 + dx < w and 0 <= y2 + dy < h and max(px[x2 + dx, y2 + dy][:3]) < 60: px[x2 + dx, y2 + dy] = (0, 0, 0, 0)
                run = []
    return cell

def prepare_eg_proj():
    """Orbe de Jules ; bouquet, bouteille et chèvre de Laurène (3 × 3 cases de 96 px ; on retire le cadre noir des chèvres)."""
    out = {}
    o = os.path.join(SRC, "eglise/orbe_violet.png")
    if os.path.exists(o):
        im = Image.open(o).convert("RGBA").resize((24, 24), Image.BOX); im.putalpha(im.split()[3].point(lambda v: 255 if v > 90 else 0))
        im.save(os.path.join(OUT, "eg_orbe.png"), optimize=True)
        out["eg_orbe"] = {"src": "assets/laverie/eg_orbe.png", "cw": 24, "ch": 24, "ax": 12, "ay": 12, "cols": 1, "anims": {"play": [0, 1]}, "note": "orbe de Jules"}
    p = os.path.join(SRC, "eglise/projectiles.png")
    if os.path.exists(p):
        im = Image.open(p).convert("RGBA"); c = 40; sheet = Image.new("RGBA", (c * 3, c * 3))
        for r in range(3):
            for k in range(3):
                cell = im.crop((k * 96, r * 96, (k + 1) * 96, (r + 1) * 96))
                if r == 2: cell = drop_frame_lines(cell)   # le cadre noir autour des chèvres
                cell = cell.resize((c, c), Image.BOX)
                cell.putalpha(cell.split()[3].point(lambda v: 255 if v > 110 else 0))
                sheet.paste(cell, (k * c + (c - cell.width) // 2, r * c + (c - cell.height) // 2))
        sheet.save(os.path.join(OUT, "eg_proj.png"), optimize=True)
        out["eg_proj"] = {"src": "assets/laverie/eg_proj.png", "cw": c, "ch": c, "ax": c // 2, "ay": c // 2, "cols": 3,
                          "anims": {"bouquet": [0, 3], "bouteille": [3, 3], "chevre": [6, 3]}, "note": "projectiles de Laurène"}
    return out

# portraits des dialogues : (fichier, carré à recadrer dans la source)
EG_PORTRAITS = {"laurene": ("eglise/laurene_portrait.png", (330, 0, 790, 460)), "jules": ("eglise/jules_portrait.png", (260, 0, 680, 420)),
                "brie": ("eglise/brie_portrait.png", (680, 150, 1200, 670)), "mamie": ("eglise/mamie/mamie_portrait.png", (310, 120, 720, 530))}

def prepare_eg_portraits():
    out = {}
    for n, (rel, box) in EG_PORTRAITS.items():
        f = os.path.join(SRC, rel)
        if not os.path.exists(f): continue
        im = Image.open(f).convert("RGBA").crop(box).resize((40, 40), Image.BOX)
        im.save(os.path.join(OUT, f"portrait_{n}.png"), optimize=True)
        out[f"portrait_{n}"] = {"src": f"assets/laverie/portrait_{n}.png", "cw": 40, "ch": 40, "ax": 20, "ay": 40, "cols": 1, "anims": {"play": [0, 1]}, "note": f"portrait de {n} (église)"}
    return out

# Mamie Florence (la mère de Jules, boss de l'église après le duo) : planche de 9 lignes de 6 cases de 192 px, pieds en
# (96, 160), tournée vers la droite (mamie.png, assemblée depuis les bandes du pack). Elle est réduite comme Jules (EG_SCALE) ;
# la géante en furie (dernier combat, derrière le muret) a sa planche à elle (furie/*.png : 5 bandes de 6 cases de 192 px,
# pieds vers y = 185) : lancer de voiture, saut et séisme, cri monstrueux, regard laser vers le bas, explosion en flammes.
# Voitures (voitures.png : 3 × 3 cases de 256 × 192 : vues, inclinaisons, furie), pneu et explosion (pneu_explosion.png :
# 5 images sur une ligne), portrait recadré sur la tête (cri, image 0), arènes 1 et 3, muret de l'arène 3 (premier plan).
MAMIE_DIR = "eglise/mamie"
MAMIE_ANIMS = {"marche": [0, 6], "course": [6, 6], "saut": [12, 6], "glissade": [18, 6], "cri": [24, 6], "lancer_avant": [30, 6],
               "lancer_haut": [36, 6], "lancer_rotation": [42, 6], "furie": [48, 6]}
MAMIE_FURIE = [("lancer", "lancer"), ("seisme", "saut_seisme"), ("cri", "cri_monstrueux"), ("regard", "regard_laser_bas"), ("explosion", "explosion_flammes")]
MAMIE_FURIE_FOOT = (96, 185)
VOITURE_SCALE, VOITURE_CELL = 0.48, (104, 76)
PNEU_SPANS = [(99, 301), (472, 727), (873, 1127), (1263, 1537), (1661, 1939)]   # colonnes de chaque image (pneu ×3, explosion ×2)
PNEU_SCALE, PNEU_CELL, BOUM_SCALE, BOUM_CELL = 0.13, (36, 32), 0.42, (124, 124)

def recentre(im, cell, s):
    """Image réduite à l'échelle s (alpha net), centrée sur sa silhouette dans une case cell."""
    b = im.getbbox(); cw, ch = cell; out = Image.new("RGBA", cell)
    if not b: return out
    part = im.crop(b); part = part.resize((max(1, round(part.width * s)), max(1, round(part.height * s))), Image.BOX)
    part.putalpha(part.split()[3].point(lambda v: 255 if v > 110 else 0))
    out.paste(part, ((cw - part.width) // 2, (ch - part.height) // 2), part)
    return out

def prepare_mamie():
    out = {}
    a = prepare_grid("eg_mamie", MAMIE_DIR + "/mamie.png", 192, (96, 160), EG_SCALE, MAMIE_ANIMS, "Mamie Florence (église)")
    if not a: return out
    out["eg_mamie"] = a
    im = Image.open(os.path.join(SRC, MAMIE_DIR, "mamie.png")).convert("RGBA")
    # la géante en furie : sa planche à elle (les petits morceaux des poses voisines, au bord des cases, sont effacés)
    old = os.path.join(OUT, "eg_mamie_geante.png")
    if os.path.exists(old): os.remove(old)
    if all(os.path.exists(os.path.join(SRC, MAMIE_DIR, "furie", f + ".png")) for _, f in MAMIE_FURIE):
        g = Image.new("RGBA", (192 * 6, 192 * len(MAMIE_FURIE))); anims = {}
        for k, (name, f) in enumerate(MAMIE_FURIE):
            row = Image.open(os.path.join(SRC, MAMIE_DIR, "furie", f + ".png")).convert("RGBA")
            for c in range(6):
                cell = drop_edge_bits(row.crop((c * 192, 0, (c + 1) * 192, 192)))
                cell.putalpha(cell.split()[3].point(lambda v: 255 if v > 110 else 0)); g.paste(cell, (c * 192, k * 192))
            anims[name] = [k * 6, 6]
        g.quantize(colors=255, method=Image.Quantize.FASTOCTREE).save(os.path.join(OUT, "eg_mamie_furie.png"), optimize=True)   # 256 couleurs : 4 × plus léger
        out["eg_mamie_furie"] = {"src": "assets/laverie/eg_mamie_furie.png", "cw": 192, "ch": 192, "ax": MAMIE_FURIE_FOOT[0], "ay": MAMIE_FURIE_FOOT[1],
                                 "cols": 6, "anims": anims, "note": "Mamie Florence géante en furie (église, dernier combat)"}
    # voitures : chaque image centrée sur la carrosserie
    v = Image.open(os.path.join(SRC, MAMIE_DIR, "voitures.png")).convert("RGBA"); cw, ch = VOITURE_CELL; sheet = Image.new("RGBA", (cw * 3, ch * 3))
    for i in range(9): sheet.paste(recentre(v.crop(((i % 3) * 256, (i // 3) * 192, (i % 3 + 1) * 256, (i // 3 + 1) * 192)), VOITURE_CELL, VOITURE_SCALE), ((i % 3) * cw, (i // 3) * ch))
    sheet.save(os.path.join(OUT, "eg_voiture.png"), optimize=True)
    out["eg_voiture"] = {"src": "assets/laverie/eg_voiture.png", "cw": cw, "ch": ch, "ax": cw // 2, "ay": ch // 2, "cols": 3,
                         "anims": {"vues": [0, 3], "rotation": [3, 3], "furie": [6, 3]}, "note": "voitures de Mamie Florence"}
    # pneu (3 images : immobile, puis avec des traits de vitesse) et explosion (2 images)
    p = Image.open(os.path.join(SRC, MAMIE_DIR, "pneu_explosion.png")).convert("RGBA")
    cells = [p.crop((x0 - 4, 0, x1 + 4, p.height)) for x0, x1 in PNEU_SPANS]
    for name, idx, s, cell in (("eg_pneu", (0, 1, 2), PNEU_SCALE, PNEU_CELL), ("eg_boum", (3, 4), BOUM_SCALE, BOUM_CELL)):
        cw, ch = cell; sheet = Image.new("RGBA", (cw * len(idx), ch))
        for k, i in enumerate(idx): sheet.paste(recentre(cells[i], cell, s), (k * cw, 0))
        sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
        out[name] = {"src": f"assets/laverie/{name}.png", "cw": cw, "ch": ch, "ax": cw // 2, "ay": ch // 2, "cols": len(idx), "anims": {"play": [0, len(idx)]},
                     "note": "pneu de Mamie Florence" if name == "eg_pneu" else "explosion des voitures"}
    # portrait provisoire (tant que eglise/mamie/mamie_portrait.png manque) : la tête du cri
    if not os.path.exists(os.path.join(SRC, MAMIE_DIR, "mamie_portrait.png")):
      im.crop((76, 4 * 192 + 36, 126, 4 * 192 + 86)).resize((40, 40), Image.BOX).save(os.path.join(OUT, "portrait_mamie.png"), optimize=True)
      out["portrait_mamie"] = {"src": "assets/laverie/portrait_mamie.png", "cw": 40, "ch": 40, "ax": 20, "ay": 40, "cols": 1, "anims": {"play": [0, 1]}, "note": "portrait de Mamie Florence (église)"}
    # arènes (480 × 272) et muret de l'arène 3 (premier plan, en parallaxe ; un peu plus large que l'écran)
    for name, f, size in (("eglise_4", "arene_1.jpeg", (480, 272)), ("eglise_5", "arene_3.jpeg", (504, 284))):
        Image.open(os.path.join(SRC, MAMIE_DIR, f)).convert("RGB").resize(size, Image.LANCZOS).save(os.path.join(OUT, name + ".webp"), quality=86, method=6)
        out[name] = {"src": f"assets/laverie/{name}.webp", "cw": size[0], "ch": size[1], "ax": size[0] // 2, "ay": size[1], "cols": 1, "anims": {"play": [0, 1]}, "note": "arène de Mamie Florence"}
    m = Image.open(os.path.join(SRC, MAMIE_DIR, "arene_3_muret.png")).convert("RGBA"); m = m.crop(m.split()[3].point(lambda v: 255 if v > 100 else 0).getbbox())   # sans le halo transparent
    mw = 504; m = m.resize((mw, round(m.height * mw / m.width)), Image.LANCZOS); m.putalpha(m.split()[3].point(lambda v: 255 if v > 110 else 0))
    m.save(os.path.join(OUT, "eglise_muret.png"), optimize=True)
    out["eglise_muret"] = {"src": "assets/laverie/eglise_muret.png", "cw": m.width, "ch": m.height, "ax": m.width // 2, "ay": m.height, "cols": 1, "anims": {"play": [0, 1]}, "note": "muret de l'arène 3 de Mamie (premier plan)"}
    return out

# Nouveau héros (heros/dino.png : 8 lignes de 6 poses sur fond noir, lignes aux hauteurs inégales : DINO_ROWS) : planche
# perso_dino aux mêmes indices que les autres héros (repos 0–3, course 6–11, attaque 12–16, saut 18–19, dash 24–29), plus
# la marche (30–35), la ligne 7 (36–41 : joie, assis, à quatre pattes, étourdi, dégât en 41) et la ligne 8 (42–47 : victoire,
# assis, mort en 47). Chaque pose est recalée sur le centre de masse du corps (sans les effets magiques ni les étoiles) et le
# bas des pieds. Le dinosaure magique de la 5e attaque devient un projectile (magie_dino) ; portrait recadré sur la tête.
DINO_SRC = "heros/dino.png"
DINO_ROWS = [(8, 207), (210, 410), (410, 607), (605, 795), (790, 990), (985, 1115), (1112, 1262), (1258, 1402)]
DINO_COLW, DINO_SCALE, DINO_CELL, DINO_ANCHOR = 187, 0.2, (72, 56), (36, 53)
# colonnes à part : la 5e attaque (le héros seul, le dinosaure à droite devient le projectile), la pose assise et la pose
# allongée de la dernière ligne (qui déborde sur la case voisine)
DINO_XR = {(4, 4): (749, 895), (7, 4): (749, 862), (7, 5): (862, 1122)}
DINO_BEAST = (880, 795, 1110, 990)  # le dinosaure magique
# (ligne, colonne) de chaque case de la planche du jeu, dans l'ordre
DINO_LAYOUT = ([(0, c) for c in range(6)] + [(2, c) for c in range(6)] + [(4, c) for c in range(5)] + [None]
               + [(3, 2), (3, 3), (3, 0), (3, 1), (3, 4), (3, 5)] + [(5, c) for c in range(6)] + [(1, c) for c in range(6)]
               + [(6, c) for c in range(6)] + [(7, c) for c in range(6)])
DINO_ANIMS = {"idle": [0, 4], "run": [6, 6], "attack": [12, 5], "jump": [18, 2], "special": [24, 6], "dash": [25, 3],
              "walk": [30, 6], "joie": [36, 2], "etourdi": [40, 1], "hurt": [41, 1], "victoire": [42, 4], "dead": [47, 1]}

def unblack(im):
    """Fond noir uni → transparent : seulement le noir relié au bord (les contours sombres du dessin restent)."""
    from PIL import ImageDraw
    im = im.convert("RGB"); w, h = im.size
    m = Image.eval(im.convert("L"), lambda v: 255 if v > 14 else 0)    # 0 = presque noir
    for x, y in [(x, 0) for x in range(0, w, 7)] + [(x, h - 1) for x in range(0, w, 7)] + [(0, y) for y in range(0, h, 7)] + [(w - 1, y) for y in range(0, h, 7)]:
        if m.getpixel((x, y)) == 0: ImageDraw.floodfill(m, (x, y), 128)
    out = im.convert("RGBA"); out.putalpha(Image.eval(m, lambda v: 0 if v == 128 else 255))
    return out

def fx_dino(r, g, b):
    """Effets de la planche de Dino : lueurs bleues et vertes, poussière claire, étoiles jaunes."""
    return (b > 150 and b > r + 60) or (g > 170 and r < 140) or min(r, g, b) > 195 or (r > 200 and g > 170 and b < 110)

def fx_marylou(r, g, b):
    """Effets de la planche de Marylou : croissants de magie rose et lavande, petits cœurs roses, étoiles jaunes."""
    return (b > 180 and b > g + 40) or (r > 200 and g < 150 and b > 100) or (r > 200 and g > 170 and b < 110)

def body_mass(cell, fx=fx_dino):
    """Centre de masse et bas du corps, sans les effets (fx : couleurs à ignorer)."""
    px = cell.load(); w, h = cell.size; sx = n = 0; bottom = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128 or fx(r, g, b): continue
            sx += x; n += 1; bottom = max(bottom, y)
    return (sx / n if n else w / 2), (bottom if n else h - 1)

def hero_sheet(name, im, rows, colw, scale, cell, anchor, layout, xr, anims, fx, note, rscale=None):
    """Planche d'un héros aux indices du jeu (layout : (ligne, colonne) de la source pour chaque case), poses recalées sur le
    centre de masse du corps et le bas des pieds."""
    cw, ch = cell; ax, ay = anchor; cols = 6
    sheet = Image.new("RGBA", (cw * cols, ch * ((len(layout) + cols - 1) // cols)))
    for i, rc in enumerate(layout):
        if not rc: continue
        r, c = rc; y0, y1 = rows[r]
        x0, x1 = xr.get((r, c), (c * colw, min(im.width, (c + 1) * colw)))
        part = drop_edge_bits(im.crop((x0, y0, x1, y1)))
        mx, by = body_mass(part, fx); s = scale * (rscale or {}).get(r, 1)   # rscale : lignes dessinées plus petites dans la source
        small = part.resize((max(1, round(part.width * s)), max(1, round(part.height * s))), Image.BOX)
        small.putalpha(small.split()[3].point(lambda v: 255 if v > 110 else 0))
        sheet.paste(small, ((i % cols) * cw + round(ax - mx * s), (i // cols) * ch + round(ay - (by + 1) * s)), small)
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    return {name: {"src": f"assets/laverie/{name}.png", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": anims, "note": note}}

def hero_portrait(name, im, box, note):
    im.crop(box).resize((40, 40), Image.BOX).save(os.path.join(OUT, name + ".png"), optimize=True)
    return {name: {"src": f"assets/laverie/{name}.png", "cw": 40, "ch": 40, "ax": 20, "ay": 40, "cols": 1, "anims": {"play": [0, 1]}, "note": note}}

def prepare_dino():
    f = os.path.join(SRC, DINO_SRC)
    if not os.path.exists(f): return {}
    im = unblack(Image.open(f))
    out = hero_sheet("perso_dino", im, DINO_ROWS, DINO_COLW, DINO_SCALE, DINO_CELL, DINO_ANCHOR, DINO_LAYOUT, DINO_XR, DINO_ANIMS, fx_dino, "héros : heros/dino.png")
    beast = im.crop(DINO_BEAST); beast = beast.crop(beast.getbbox())
    beast = beast.resize((round(beast.width * DINO_SCALE), round(beast.height * DINO_SCALE)), Image.BOX)
    beast.putalpha(beast.split()[3].point(lambda v: 255 if v > 90 else 0)); beast.save(os.path.join(OUT, "magie_dino.png"), optimize=True)
    out["magie_dino"] = {"src": "assets/laverie/magie_dino.png", "cw": beast.width, "ch": beast.height, "ax": beast.width // 2, "ay": beast.height // 2, "cols": 1,
                         "anims": {"play": [0, 1]}, "note": "dinosaure magique (attaque du nouveau héros)"}
    out.update(hero_portrait("portrait_perso_dino", im, (62, 12, 182, 132), "portrait du nouveau héros"))
    return out

# Marylou (heros/marylou.png : 7 lignes de 6 poses sur fond transparent) : repos, marche, course, saut, lancer de cœur, dash et
# dégâts, joie et mort. Pas de dash : son double saut prend les 4 poses du saut (24–27, « special »). Dégât : l'image étourdie
# (ligne 6, 5e) ; mort : la dernière image. Le cœur lancé (heros/marylou_coeur.png, 6 images sur une ligne : départ, 4 en vol,
# dispersion) devient le projectile magie_coeur.
MARYLOU_SRC, MARYLOU_COEUR = "heros/marylou.png", "heros/marylou_coeur.png"
MARYLOU_ROWS = [(10, 172), (180, 340), (347, 503), (497, 677), (680, 836), (840, 966), (964, 1120)]
MARYLOU_COLW, MARYLOU_SCALE = 150, 0.24
MARYLOU_XR = {(6, 4): (600, 705), (6, 5): (705, 900),   # dernière ligne : la pose allongée déborde
              (4, 1): (155, 318), (4, 2): (318, 472), (4, 3): (472, 615), (4, 4): (615, 768), (4, 5): (768, 900)}   # croissants de l'attaque
MARYLOU_LAYOUT = ([(0, c) for c in range(6)] + [(2, c) for c in range(6)] + [(4, c) for c in range(6)]
                  + [(3, 2), (3, 3), (3, 0), (3, 1), (3, 4), (3, 5)] + [(3, 1), (3, 2), (3, 3), (3, 4), (5, 0), (5, 5)]
                  + [(1, c) for c in range(6)] + [(5, c) for c in range(6)] + [(6, c) for c in range(6)])
MARYLOU_ANIMS = {"idle": [0, 4], "run": [6, 6], "attack": [12, 5], "jump": [18, 2], "special": [24, 4], "walk": [30, 6],
                 "hurt": [40, 1], "victoire": [42, 4], "dead": [47, 1]}
COEUR_SPANS = [(22, 235), (262, 561), (582, 900), (923, 1288), (1317, 1672), (1694, 1988)]
COEUR_SCALE, COEUR_CELL = 0.15, (56, 34)

def prepare_marylou():
    f = os.path.join(SRC, MARYLOU_SRC)
    if not os.path.exists(f): return {}
    im = Image.open(f).convert("RGBA")
    out = hero_sheet("perso_marylou", im, MARYLOU_ROWS, MARYLOU_COLW, MARYLOU_SCALE, DINO_CELL, DINO_ANCHOR, MARYLOU_LAYOUT, MARYLOU_XR, MARYLOU_ANIMS, fx_marylou, "héros : heros/marylou.png")
    out.update(hero_portrait("portrait_perso_marylou", im, (50, 8, 152, 110), "portrait de Marylou"))
    c = os.path.join(SRC, MARYLOU_COEUR)
    if os.path.exists(c):
        strip = Image.open(c).convert("RGBA"); cw, ch = COEUR_CELL; sheet = Image.new("RGBA", (cw * len(COEUR_SPANS), ch))
        for k, (x0, x1) in enumerate(COEUR_SPANS):
            part = strip.crop((x0, 0, x1, strip.height)); part = part.crop(part.getbbox())
            part = part.resize((max(1, round(part.width * COEUR_SCALE)), max(1, round(part.height * COEUR_SCALE))), Image.BOX)
            part.putalpha(part.split()[3].point(lambda v: 255 if v > 90 else 0))
            x = k * cw + (cw - part.width if 1 <= k <= 4 else (cw - part.width) // 2)   # en vol : le cœur devant (à droite de la case)
            sheet.paste(part, (x, (ch - part.height) // 2), part)
        sheet.save(os.path.join(OUT, "magie_coeur.png"), optimize=True)
        out["magie_coeur"] = {"src": "assets/laverie/magie_coeur.png", "cw": cw, "ch": ch, "ax": cw // 2, "ay": ch // 2, "cols": len(COEUR_SPANS),
                              "anims": {"depart": [0, 1], "vol": [1, 4], "fin": [5, 1]}, "note": "cœur lancé par Marylou"}
    return out

# Mme Bulle (PNJ de la laverie) : pnj/bulle_repos.png (4 poses de repos, grandes) et pnj/bulle_planche.png (grand portrait,
# visages, marche, coup de balai, vaporisateur et bulles, étoiles, cœurs, tasse, joie, nettoyage, sieste). Planche pnj_bulle
# (mêmes noms d'animations que les autres clients : repos, parle, content, plus ses activités), portrait_bulle recadré sur le
# grand portrait, et le nuage de bulles du vaporisateur (bulle_bulles).
BULLE_REPOS, BULLE_PLANCHE = "pnj/bulle_repos.png", "pnj/bulle_planche.png"
BULLE_CELL, BULLE_ANCHOR = (84, 52), (42, 49)
BULLE_IDLE = [(40, 470), (520, 1000), (1010, 1460), (1510, 1960)]   # colonnes des 4 poses de repos (lignes 0 à 667)
BULLE_ROWS = {"marche": (190, 368, [(530, 680), (680, 835), (835, 990), (990, 1140), (1140, 1310), (1310, 1470)]),
              "balai": (370, 538, [(525, 690), (690, 905), (905, 1095), (1095, 1290), (1290, 1495)]),
              "vapo": (548, 722, [(500, 680), (680, 830), (848, 990)]),
              "divers": (782, 978, [(20, 200), (230, 440), (480, 670), (730, 935), (935, 1215), (1215, 1495)])}
BULLE_BUBBLES = (990, 552, 1495, 722)
BULLE_PORTRAIT = (140, 18, 420, 298)
# visages (1 à 6 du portrait) : rire, rire les yeux fermés, sourire, clin d'œil malin, surprise, grand rire
BULLE_FACES = [(522, 677), (675, 830), (830, 985), (975, 1130), (1146, 1310), (1318, 1473)]

def fx_bulle(r, g, b):
    """Effets de Mme Bulle : bulles et coup de balai bleu clair, étoiles et traits jaunes, cœurs roses."""
    return (b > 200 and r < 190) or (r > 220 and g > 170 and b < 120) or (r > 220 and g < 140 and b > 100)

def prepare_bulle():
    f1, f2 = os.path.join(SRC, BULLE_REPOS), os.path.join(SRC, BULLE_PLANCHE)
    if not (os.path.exists(f1) and os.path.exists(f2)): return {}
    big, sheet_src = Image.open(f1).convert("RGBA"), Image.open(f2).convert("RGBA")
    parts = [(big, (x0, 0, x1, big.height), 0.071) for x0, x1 in BULLE_IDLE]
    for k in ("marche", "balai", "vapo", "divers"):
        y0, y1, xs = BULLE_ROWS[k]; parts += [(sheet_src, (x0, y0, x1, y1), 0.255) for x0, x1 in xs]
    cw, ch = BULLE_CELL; ax, ay = BULLE_ANCHOR; cols = 6
    sheet = Image.new("RGBA", (cw * cols, ch * ((len(parts) + cols - 1) // cols)))
    for i, (src, box, s) in enumerate(parts):
        part = drop_edge_bits(src.crop(box)); mx, by = body_mass(part, fx_bulle)
        small = part.resize((max(1, round(part.width * s)), max(1, round(part.height * s))), Image.BOX)
        small.putalpha(small.split()[3].point(lambda v: 255 if v > 110 else 0))
        sheet.paste(small, ((i % cols) * cw + round(ax - mx * s), (i // cols) * ch + round(ay - (by + 1) * s)), small)
    sheet.save(os.path.join(OUT, "pnj_bulle.png"), optimize=True)
    # indices : repos 0–3, marche 4–9, balai 10–14, vaporisateur 15–17, étoiles 18, cœurs 19, tasse 20, joie 21, nettoyage 22, sieste 23
    anims = {"repos": [0, 4], "parle": [0, 1], "content": [19, 1], "marche": [4, 6], "balai": [10, 5], "vapo": [15, 3],
             "etoiles": [18, 1], "coeurs": [19, 1], "tasse": [20, 1], "joie": [21, 1], "nettoie": [22, 1], "dort": [23, 1]}
    out = {"pnj_bulle": {"src": "assets/laverie/pnj_bulle.png", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": anims, "note": "Mme Bulle (laverie)"}}
    bub = sheet_src.crop(BULLE_BUBBLES); bub = bub.crop(bub.getbbox())
    bub = bub.resize((round(bub.width * 0.255), round(bub.height * 0.255)), Image.BOX); bub.putalpha(bub.split()[3].point(lambda v: 255 if v > 90 else 0))
    bub.save(os.path.join(OUT, "bulle_bulles.png"), optimize=True)
    out["bulle_bulles"] = {"src": "assets/laverie/bulle_bulles.png", "cw": bub.width, "ch": bub.height, "ax": 0, "ay": bub.height // 2, "cols": 1, "anims": {"play": [0, 1]}, "note": "bulles du vaporisateur de Mme Bulle"}
    # portrait : le grand dessin (image 0), puis ses 6 visages (images 1 à 6), choisis selon ce qu'elle dit
    ps = Image.new("RGBA", (40 * 7, 40)); ps.paste(sheet_src.crop(BULLE_PORTRAIT).resize((40, 40), Image.BOX), (0, 0))
    for k, (x0, x1) in enumerate(BULLE_FACES):
        w = x1 - x0; ps.paste(sheet_src.crop((x0, 172 - w, x1, 172)).resize((40, 40), Image.BOX), (40 * (k + 1), 0))
    ps.save(os.path.join(OUT, "portrait_bulle.png"), optimize=True)
    out["portrait_bulle"] = {"src": "assets/laverie/portrait_bulle.png", "cw": 40, "ch": 40, "ax": 20, "ay": 40, "cols": 7,
                             "anims": {"play": [0, 1], "visages": [1, 6]}, "note": "portrait de Mme Bulle : grand dessin et 6 visages"}
    return out

# Guillie, la chienne noire (héroïne secrète) : heros/guillie.png (9 bandes de cases de 192 px assemblées depuis le pack :
# repos, marche, course, saut, réception, coup de patte, dégâts, étourdissement, KO) et heros/guillie_portrait.png.
GUILLIE_SRC, GUILLIE_PORTRAIT = "heros/guillie.png", "heros/guillie_portrait.png"
GUILLIE_SCALE = 0.2
GUILLIE_LAYOUT = ([(0, c) for c in range(4)] + [None, None] + [(2, c) for c in range(6)] + [(5, c) for c in range(4)] + [(5, 3), None]
                  + [(3, 1), (3, 2), (3, 0), (4, 0), (4, 1), None] + [(7, 0), (7, 1), (7, 2), (6, 0), (6, 1), None]
                  + [(1, c) for c in range(6)] + [(8, c) for c in range(4)])
GUILLIE_ANIMS = {"idle": [0, 4], "run": [6, 6], "attack": [12, 5], "jump": [18, 2], "land": [21, 2], "etourdi": [24, 3],
                 "hurt": [27, 1], "walk": [30, 6], "ko": [36, 4], "dead": [39, 1]}

def fx_guillie(r, g, b):
    """Effets de la planche de Guillie : étoiles jaunes de l'étourdissement."""
    return r > 200 and g > 150 and b < 120

def prepare_guillie():
    f = os.path.join(SRC, GUILLIE_SRC)
    if not os.path.exists(f): return {}
    im = Image.open(f).convert("RGBA")
    rows = [(r * 192, (r + 1) * 192) for r in range(im.height // 192)]
    out = hero_sheet("perso_guillie", im, rows, 192, GUILLIE_SCALE, DINO_CELL, DINO_ANCHOR, GUILLIE_LAYOUT, {}, GUILLIE_ANIMS, fx_guillie, "héros secret : heros/guillie.png")
    # pelage noir : un peu éclairci, et un fin liseré lilas autour de la silhouette pour qu'elle reste lisible sur les fonds de nuit
    from PIL import ImageEnhance, ImageFilter
    f2 = os.path.join(OUT, "perso_guillie.png"); sh = Image.open(f2).convert("RGBA"); a = sh.split()[3]
    rgb = ImageEnhance.Brightness(sh.convert("RGB")).enhance(1.45); lit = rgb.convert("RGBA"); lit.putalpha(a)
    ring = Image.eval(a.filter(ImageFilter.MaxFilter(3)), lambda v: 255 if v > 0 else 0)
    rim = Image.new("RGBA", sh.size, (150, 130, 190, 0)); rim.putalpha(Image.eval(ring, lambda v: 170 if v else 0))
    rim.alpha_composite(lit); rim.save(f2, optimize=True)
    p = os.path.join(SRC, GUILLIE_PORTRAIT)
    if os.path.exists(p):
        pim = Image.open(p).convert("RGBA"); out.update(hero_portrait("portrait_perso_guillie", pim, (0, 0, pim.width, pim.height), "portrait de Guillie"))
    return out

# Simon : heros/simon.png (16 bandes de cases de 192 px assemblées depuis le pack : repos, marche, course, saut, réception,
# coup léger, coup fort, coup vers le haut, coup de pied en saut, roulade, dégâts, étourdissement, KO, victoire, ramassage,
# interaction) et heros/simon_portrait.png. Les 30 premières cases suivent la disposition des héros (coup fort en 12–16,
# roulade du dash en 24–27) ; les autres poses suivent.
SIMON_SRC, SIMON_PORTRAIT = "heros/simon.png", "heros/simon_portrait.png"
SIMON_ROWS_N = {"idle": (0, 4), "marche": (1, 6), "course": (2, 6), "saut": (3, 3), "reception": (4, 2), "legere": (5, 4), "forte": (6, 5),
                "haut": (7, 3), "air": (8, 3), "roulade": (9, 4), "degats": (10, 2), "etourdi": (11, 3), "ko": (12, 4), "victoire": (13, 4),
                "ramasse": (14, 3), "levier": (15, 3)}

def simon_layout():
    R = lambda n: [(SIMON_ROWS_N[n][0], c) for c in range(SIMON_ROWS_N[n][1])]
    lay = R("idle") + [None, None] + R("course") + R("forte") + [None] + [(3, 1), (3, 2), (3, 0)] + R("reception") + [None] + R("roulade") + R("degats")
    anims = {"idle": [0, 4], "run": [6, 6], "attack": [12, 5], "jump": [18, 2], "land": [21, 2], "dash": [24, 4], "special": [24, 4], "hurt": [28, 1]}
    for name, key in (("walk", "marche"), ("attack2", "legere"), ("attack_up", "haut"), ("attack_air", "air"), ("etourdi", "etourdi"),
                      ("ko", "ko"), ("victoire", "victoire"), ("ramasse", "ramasse"), ("levier", "levier")):
        anims[name] = [len(lay), SIMON_ROWS_N[key][1]]; lay += R(key)
    anims["dead"] = [anims["ko"][0] + 3, 1]
    return lay, anims

def fx_simon(r, g, b):
    """Effets de la planche de Simon : éclat doré du coup fort, étoiles jaunes, pièce."""
    return r > 210 and g > 160 and b < 120

def prepare_simon():
    f = os.path.join(SRC, SIMON_SRC)
    if not os.path.exists(f): return {}
    im = Image.open(f).convert("RGBA"); lay, anims = simon_layout()
    rows = [(r * 192, (r + 1) * 192) for r in range(im.height // 192)]
    out = hero_sheet("perso_simon", im, rows, 192, 0.2, DINO_CELL, DINO_ANCHOR, lay, {}, anims, fx_simon, "héros : heros/simon.png", {2: 1.33, 6: 1.5})   # course et coup fort dessinés plus petits
    p = os.path.join(SRC, SIMON_PORTRAIT)
    if os.path.exists(p):
        pim = Image.open(p).convert("RGBA"); out.update(hero_portrait("portrait_perso_simon", pim, (0, 0, pim.width, pim.height), "portrait de Simon"))
    return out

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

# Souvenirs : chaque scène en trois vues (<id>.png, <id>_02.png, <id>_03.png, même cadrage, ambiance qui change) pour des fondus.
# Une planche WebP de 3 images en 672 × 378 par scène ; « lazy » : chargée seulement quand on regarde le souvenir.
MEM_SCENES = [("souvenir_" + str(i), "souvenir_" + str(i)) for i in range(1, 7)] + [("souvenir_fin", "fin")]
MEM_W, MEM_H = 672, 378

def prepare_souvenirs():
    out = {}
    for name, base in MEM_SCENES:
        files = [os.path.join(SRC, "souvenirs", base + s + ".png") for s in ("", "_02", "_03")]
        files = [f for f in files if os.path.exists(f)]
        if not files: continue
        sheet = Image.new("RGB", (MEM_W * len(files), MEM_H))
        for k, f in enumerate(files): sheet.paste(Image.open(f).convert("RGB").resize((MEM_W, MEM_H), Image.LANCZOS), (k * MEM_W, 0))
        os.makedirs(OUT, exist_ok=True)
        for old in (os.path.join(OUT, name + e) for e in (".png", ".webp")):
            if os.path.exists(old): os.remove(old)
        sheet.save(os.path.join(OUT, name + ".webp"), quality=82, method=6)
        out[name] = {"src": f"assets/laverie/{name}.webp", "cw": MEM_W, "ch": MEM_H, "ax": MEM_W // 2, "ay": MEM_H, "cols": len(files),
                     "anims": {"play": [0, len(files)]}, "lazy": True, "note": f"souvenir : {base} (3 vues pour les fondus)"}
    return out

def prepare_loading():
    """Écran de chargement : chargement/chargement_<pourcentage>.png (une image par palier de 10 %) → ../assets/chargement/*.webp (960 × 540)."""
    d = os.path.join(SRC, "chargement"); out = os.path.join(HERE, "..", "assets", "chargement")
    if not os.path.isdir(d): return 0
    os.makedirs(out, exist_ok=True); n = 0
    for f in sorted(os.listdir(d)):
        if not (f.startswith("chargement_") and f.endswith(".png")): continue
        Image.open(os.path.join(d, f)).convert("RGB").resize((960, 540), Image.LANCZOS).save(os.path.join(out, f[:-4] + ".webp"), quality=80, method=6)
        n += 1
    return n

def main():
    atlas, missing = {}, []
    d = prepare_dahaka()
    if d: atlas["dahaka"] = d
    for name, rel, anims in (("eg_jules", "eglise/jules.png", JULES_ANIMS), ("eg_laurene", "eglise/laurene.png", LAURENE_ANIMS)):
        a = prepare_grid(name, rel, 192, (96, 160), EG_SCALE, anims, name[3:].capitalize() + " (église)")
        if a: atlas[name] = a
    f = prepare_laurene_furie()
    if f: atlas["eg_laurene_furie"] = f
    b, c = prepare_brie()
    if b: atlas["eg_brie"], atlas["eg_crotte"] = b, c
    atlas.update(prepare_eg_proj()); atlas.update(prepare_eg_portraits()); atlas.update(prepare_mamie()); atlas.update(prepare_dino()); atlas.update(prepare_marylou()); atlas.update(prepare_guillie()); atlas.update(prepare_simon()); atlas.update(prepare_souvenirs())
    for name, (base, anims) in HEROES.items():
        a = prepare_hero(name, base, anims)
        if a: atlas[name] = a
    for name, spec in SPEC.items():
        a = prepare(name, spec)
        if a: atlas[name] = a
        else: missing.append(spec[0])
    atlas.update(prepare_bulle())   # après les planches génériques : remplace l'ancienne Mme Bulle
    fade_foreground()
    prepare_loading()
    json.dump({"atlas": atlas}, open(os.path.join(HERE, "laverie.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(atlas)} planches prêtes dans assets/laverie/ ; {len(missing)} images pas encore fournies (dessin provisoire)")
    if "-v" in sys.argv: print("\n".join("  manque : " + m for m in missing))

if __name__ == "__main__":
    main()
