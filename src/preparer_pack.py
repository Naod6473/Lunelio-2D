"""Prépare le pack graphique de Lunelio pour le moteur du jeu.

  python3 preparer_pack.py [dossier_du_pack]     (par défaut ../Lunelio_pack_complet)

Le pack (PNG sources, plans et JSON de placement) n'est pas modifié. Le script écrit :
  ../assets/fonds/<salle>.webp      les 72 fonds réduits à 480 × 272 (WebP qualité 92)
  ../assets/sprites/<id>.png        les planches recalées (personnages, ennemis, boss, effets, objets…)
  campagne.json                     les atlas (cadres, ancrages, animations) et les 72 salles, lu par build.py
  ../apercu_atlas_planche.png       planche de contrôle de toutes les découpes (ignorée par Git)

Découpe : les planches générées n'ont pas une grille exacte. Chaque planche est décrite par
son nombre de lignes et de colonnes ; les lignes sont trouvées d'après les zones transparentes,
les colonnes suivent un pas régulier. Chaque tache de pixels (composante connexe) est rattachée
à la case de son centre, avec ses étincelles et ses armes ; une tache qui déborde sur plusieurs
cases est coupée à la colonne la plus vide près de la frontière. Les poses sont ensuite réduites
(moyenne par blocs, alpha net), puis recalées dans des cases régulières sur un point d'ancrage
stable (pieds, centre ou base) pour que l'animation ne tremble pas.

Dépendances : Pillow, numpy et scipy (outil de préparation seulement, pas pour build.py).
"""
import json, os, sys, glob, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
PACK = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "Lunelio_pack_complet")
OUT_FONDS = os.path.join(ROOT, "assets", "fonds")
OUT_SPR = os.path.join(ROOT, "assets", "sprites")
os.makedirs(OUT_FONDS, exist_ok=True); os.makedirs(OUT_SPR, exist_ok=True)
P = lambda *a: os.path.join(PACK, *a)
ATLAS = {}
PREVIEW = []

# ---------------------------------------------------------------- découpe
def load(path):
    return np.array(Image.open(path).convert("RGBA"))

def runs(mask, gap):
    idx = np.where(mask)[0]
    if not len(idx): return []
    out = [[idx[0], idx[0]]]
    for i in idx[1:]:
        if i - out[-1][1] <= gap: out[-1][1] = i
        else: out.append([i, i])
    return [[a, b + 1] for a, b in out]

def bands(alpha, n):
    """n bandes horizontales séparées par du vide (les petites bandes rejoignent la plus proche)."""
    r = runs(alpha.any(1), 4)
    while len(r) > n:
        # fusion : d'abord les bandes minuscules, sinon l'écart le plus petit
        hs = [b - a for a, b in r]
        i = int(np.argmin(hs))
        if hs[i] < 0.25 * max(hs):
            j = i - 1 if i == len(r) - 1 or (i > 0 and r[i][0] - r[i - 1][1] < r[i + 1][0] - r[i][1]) else i + 1
        else:
            gaps = [r[k + 1][0] - r[k][1] for k in range(len(r) - 1)]
            i = int(np.argmin(gaps)); j = i + 1
        a, b = sorted((i, j)); r[a] = [r[a][0], r[b][1]]; del r[b]
    if len(r) < n:
        H = alpha.shape[0]; r = [[k * H // n, (k + 1) * H // n] for k in range(n)]
    return r

def frames(path, nrows, ncols, region="full", thr=40, keep_min=6, rowcounts=None):
    """Renvoie [ligne][colonne] -> (image RGBA recadrée, (x, y) de son coin dans la source) ou None.
    region : "full" (pas régulier sur toute la largeur), "content" (sur la largeur occupée),
    "row" (chaque ligne a son propre nombre d'images, rowcounts, réparties sur sa largeur occupée)."""
    im = load(path); a = im[:, :, 3] > thr
    H, W = a.shape
    lab, n = ndimage.label(a, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    rows = bands(a, nrows)
    if region == "full": x0, x1 = 0, W
    else:
        cols = np.where(a.any(0))[0]; x0, x1 = int(cols[0]), int(cols[-1]) + 1
    grid = []
    for r, (ya, yb) in enumerate(rows):
        if region == "row":
            n = rowcounts[r]; c = np.where(a[ya:yb].any(0))[0]
            grid.append((int(c[0]), (int(c[-1]) + 1 - int(c[0])) / n, n))
        else: grid.append((x0, (x1 - x0) / ncols, ncols))
    masks = {}
    def put(r, c, m, sl):
        c = max(0, min(ncols - 1, c))
        key = (r, c)
        if key not in masks: masks[key] = np.zeros_like(a)
        masks[key][sl] |= m
    for k, sl in enumerate(objs, 1):
        if sl is None: continue
        m = lab[sl] == k
        if m.sum() < keep_min: continue
        ys, xs = np.nonzero(m)
        cy = sl[0].start + ys.mean(); cx = sl[1].start + xs.mean()
        r = min(range(len(rows)), key=lambda i: 0 if rows[i][0] <= cy < rows[i][1] else min(abs(cy - rows[i][0]), abs(cy - rows[i][1])))
        bx0, bx1 = sl[1].start, sl[1].stop
        x0, pitch, nc = grid[r]
        if bx1 - bx0 <= 1.3 * pitch:
            put(r, int((cx - x0) // pitch), m, sl); continue
        # tache trop large : coupe à la colonne la plus vide près de chaque frontière
        colsum = m.sum(0); cuts = [0]
        for c in range(1, nc):
            b = x0 + c * pitch - bx0
            if b <= 0 or b >= bx1 - bx0: continue
            lo, hi = int(max(1, b - 0.22 * pitch)), int(min(bx1 - bx0 - 1, b + 0.22 * pitch))
            cuts.append(lo + int(np.argmin(colsum[lo:hi])))
        cuts.append(bx1 - bx0)
        for i in range(len(cuts) - 1):
            part = np.zeros_like(m); part[:, cuts[i]:cuts[i + 1]] = m[:, cuts[i]:cuts[i + 1]]
            if part.sum() < keep_min: continue
            pcx = bx0 + np.nonzero(part)[1].mean()
            put(r, int((pcx - x0) // pitch), part, sl)
    out = []
    for r in range(len(rows)):
        line = []
        for c in range(ncols):
            m = masks.get((r, c))
            if m is None: line.append(None); continue
            ys, xs = np.nonzero(m); y0, y1, xa, xb = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = im[y0:y1, xa:xb].copy(); crop[:, :, 3] = np.where(m[y0:y1, xa:xb], crop[:, :, 3], 0)
            line.append((crop, (int(xa), int(y0))))
        out.append(line)
    return out

def shrink(rgba, s, soft=False):
    """Réduction par moyenne de blocs (alpha prémultiplié), puis alpha net sauf pour les effets doux."""
    h, w = rgba.shape[:2]
    W, H = max(1, round(w * s)), max(1, round(h * s))
    f = rgba.astype(np.float64); f[:, :, :3] *= f[:, :, 3:] / 255
    r = np.array(Image.fromarray(f.clip(0, 255).astype(np.uint8)).resize((W, H), Image.BOX)).astype(np.float64)
    al = r[:, :, 3:]
    r[:, :, :3] = np.where(al > 0, r[:, :, :3] * 255 / np.maximum(al, 1), 0)
    if soft: r[:, :, 3] = np.where(r[:, :, 3] < 24, 0, np.minimum(255, r[:, :, 3] * 1.15))
    else: r[:, :, 3] = np.where(r[:, :, 3] > 110, 255, 0)
    return r.clip(0, 255).astype(np.uint8)

def anchor_of(img, kind):
    a = img[:, :, 3] > 0
    if not a.any(): return (img.shape[1] / 2, img.shape[0])
    ys, xs = np.nonzero(a)
    bottom = ys.max() + 1
    if kind == "feet":   # centre des jambes : tiers bas de la silhouette
        top = ys.min(); lim = bottom - max(2, (bottom - top) * 0.3)
        sel = ys >= lim
        return (xs[sel].mean() + 0.5, bottom)
    if kind == "mass":   # centre de masse horizontal, base
        return (xs.mean() + 0.5, bottom)
    if kind == "center": return ((xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2)
    return ((xs.min() + xs.max() + 1) / 2, bottom)   # "bottom" : base centrée

def pack(aid, seq, anims, cols, anchor="feet", fixed=None, soft=False, note=""):
    """seq : liste de (image réduite ou None). Recale tout sur un ancrage commun et écrit l'atlas."""
    items = [(im, anchor_of(im, anchor)) if im is not None else None for im in seq]
    if fixed: cw, ch, ax, ay = fixed
    else:
        left = max((p[1][0] for p in items if p), default=1); right = max((p[0].shape[1] - p[1][0] for p in items if p), default=1)
        up = max((p[1][1] for p in items if p), default=1); down = max((p[0].shape[0] - p[1][1] for p in items if p), default=0)
        half = int(np.ceil(max(left, right))); cw = 2 * half; ax = half
        ay = int(np.ceil(up)); ch = ay + int(np.ceil(down))
    rows = (len(seq) + cols - 1) // cols
    sheet = Image.new("RGBA", (cw * cols, ch * rows), (0, 0, 0, 0))
    boxes = []
    for i, p in enumerate(items):
        if not p: boxes.append(None); continue
        im, (fx, fy) = p
        px, py = (i % cols) * cw + int(round(ax - fx)), (i // cols) * ch + int(round(ay - fy))
        tile = Image.new("RGBA", (cw, ch)); tile.paste(Image.fromarray(im), (px - (i % cols) * cw, py - (i // cols) * ch))
        sheet.alpha_composite(tile, ((i % cols) * cw, (i // cols) * ch))
        bb = tile.getbbox()   # partie visible de la case (sert à découper sol et plateformes)
        boxes.append(list(bb[:2]) + [bb[2] - bb[0], bb[3] - bb[1]] if bb else None)
    sheet.save(os.path.join(OUT_SPR, aid + ".png"), optimize=True)
    ATLAS[aid] = {"src": f"assets/sprites/{aid}.png", "cw": cw, "ch": ch, "ax": ax, "ay": ay, "cols": cols, "anims": anims, "boxes": boxes}
    if note: ATLAS[aid]["note"] = note
    PREVIEW.append((aid, sheet))
    return ATLAS[aid]

def flat(fr):
    return [x[0] if x else None for row in fr for x in row]

# ---------------------------------------------------------------- personnages
CHAR_ANIMS = {"idle": [0, 4], "run": [6, 6], "attack": [12, 5], "jump": [18, 2], "special": [24, 2]}
for cid in ("robot", "singe", "ninja", "rumi", "steve", "homme"):
    fr = frames(P("assets", "personnages", f"{cid}_spritesheet.png"), 5, 6, region="row", rowcounts=[4, 6, 5, 2, 2])
    idle_h = np.median([x[0].shape[0] for x in fr[0] if x])
    # les pieds tombent au même endroit que ceux d'Hélio et Lune ; la taille suit la leur (≈ 38 px)
    s = 38 / idle_h
    seq = []
    for r in range(5):
        for c in range(6):
            x = fr[r][c]; seq.append(shrink(x[0], s) if x else None)
    pack(f"perso_{cid}", seq, CHAR_ANIMS, 6, anchor="feet", note=f"échelle {s:.4f}")
for cid in ("helio", "lune"):
    # grille d'origine vérifiée 48 × 48 : recopiée telle quelle
    src = P("assets", "personnages", f"{cid}_spritesheet.png")
    Image.open(src).save(os.path.join(OUT_SPR, f"perso_{cid}.png"), optimize=True)
    an = dict(CHAR_ANIMS)
    if cid == "lune": an["special"] = [24, 4]
    ATLAS[f"perso_{cid}"] = {"src": f"assets/sprites/perso_{cid}.png", "cw": 48, "ch": 48, "ax": 23, "ay": 45, "cols": 6, "anims": an, "note": "grille 48 × 48 d'origine"}

# ---------------------------------------------------------------- ennemis
ENEMIES = {  # id: (fichier, taille visée de la pose de repos (largeur max, hauteur), ancrage)
    "slime": ("slime_electrique", (32, 26), "mass"),
    "drone": ("drone_sentinelle", (32, 24), "center"),
    "ninja_ombre": ("ninja_ombre", (44, 36), "feet"),
    "golem": ("golem_lave", (40, 36), "feet"),
    "singe_pirate": ("singe_pirate", (44, 34), "feet"),
    "chauve_souris": ("chauve_souris_neon", (34, 24), "center"),
}
EN_ANIMS = {"idle": [0, 1], "move": [1, 2], "attack": [3, 1], "hurt": [4, 1]}
for eid, (f, (tw, th), anc) in ENEMIES.items():
    fr = frames(P("assets", "ennemis", f + ".png"), 1, 5)
    i0 = fr[0][0][0]; s = min(tw / i0.shape[1], th / i0.shape[0])
    pack(f"ennemi_{eid}", [shrink(x[0], s) if x else None for x in fr[0]], EN_ANIMS, 5, anchor=anc, note=f"échelle {s:.4f}")

# ---------------------------------------------------------------- boss
BOSSES = {  # id: (fichier, phases, hauteur de P1 au repos, ancrage)
    "roi_slime": ("roi_slime", 3, 52, "mass"),
    "drone_titan": ("drone_titan", 3, 64, "mass"),
    "maitre_ombres": ("maitre_ombres", 3, 64, "feet"),
    "colosse_lave": ("colosse_lave", 3, 68, "feet"),
    "singe_roi_pirate": ("singe_roi_pirate", 2, 62, "feet"),
    "reine_chauve_souris": ("reine_chauve_souris", 3, 66, "mass"),
}
for bid, (f, nph, th, anc) in BOSSES.items():
    ph = [frames(P("assets", "boss", f"{f}_P{k + 1}.png"), 1, 6)[0] for k in range(nph)]
    s = th / ph[0][0][0].shape[0]
    seq = []; anims = {}
    names = ["idle", "moveA", "moveB", "prep", "attack", "hurt"]
    for k in range(nph):
        for i, x in enumerate(ph[k]): seq.append(shrink(x[0], s) if x else None)
        anims[f"P{k + 1}"] = [k * 6, 6]
    an = frames(P("assets", "boss", "animations", f"{f}_animations.png"), 4, 5)
    ref = an[2][4] or an[2][3]   # dernière image de l'apparition : le boss entier
    sa = s * ph[0][0][0].shape[0] / ref[0].shape[0]
    base = nph * 6
    seq += [None] * (base - len(seq))
    for r, nm in enumerate(["death", "victory", "appear", "transform"]):
        for x in an[r]: seq.append(shrink(x[0], sa) if x else None)
        anims[nm] = [base + r * 5, 5]
    # 6 colonnes : les phases sur une ligne chacune, puis les animations (5 images, 1 case vide)
    seq2 = seq[:base]
    for r in range(4):
        seq2 += seq[base + r * 5: base + r * 5 + 5] + [None]
        anims[["death", "victory", "appear", "transform"][r]] = [base + r * 6, 5]
    pack(f"boss_{bid}", seq2, anims, 6, anchor=anc, note=f"échelle {s:.4f} / animations {sa:.4f}")

# ---------------------------------------------------------------- effets
EFFECTS = {  # id: (fichier, images, largeur visée de la plus grande image, ancrage)
    "laser": ("laser", 3, 22, "center"), "explosion": ("explosion", 5, 40, "center"),
    "electricite": ("electricite", 4, 34, "center"), "flaque": ("flaque_eau", 3, 56, "center"),
    "jet_eau": ("borne_jet_eau", 5, 44, "bottom"), "impact": ("impact_epee", 3, 26, "center"),
    "poussiere": ("poussiere_atterrissage", 3, 26, "bottom"), "bouclier": ("bouclier_lumineux", 3, 40, "center"),
    "flammes": ("flammes", 4, 22, "bottom"), "nuage": ("nuage_toxique", 4, 30, "center"),
    "teleport": ("teleportation", 5, 34, "bottom"), "eclaboussure": ("eclaboussure", 4, 30, "bottom"),
    "collecte": ("collecte_bonus", 3, 26, "center"),
}
for fid, (f, n, tw, anc) in EFFECTS.items():
    fr = frames(P("assets", "effets", f + ".png"), 1, n)[0]
    s = tw / max(x[0].shape[1] for x in fr if x)
    pack(f"fx_{fid}", [shrink(x[0], s, soft=True) if x else None for x in fr], {"play": [0, n]}, n, anchor=anc)
# impulsion de cristal de la grotte : l'électricité teintée en magenta
im = np.array(Image.open(os.path.join(OUT_SPR, "fx_electricite.png")).convert("RGBA")).astype(np.float64)
lum = im[:, :, :3].mean(2, keepdims=True)
im[:, :, :3] = np.clip(lum * np.array([1.25, 0.55, 1.2]) + np.array([30, 0, 40]), 0, 255)
Image.fromarray(im.astype(np.uint8)).save(os.path.join(OUT_SPR, "fx_cristal.png"), optimize=True)
ATLAS["fx_cristal"] = dict(ATLAS["fx_electricite"], src="assets/sprites/fx_cristal.png")

# ---------------------------------------------------------------- objets
def rows_scaled(fr, targets, soft=False):
    seq = []
    for r, line in enumerate(fr):
        t = targets[r]
        first = next(x for x in line if x)
        s = t[1] / first[0].shape[0] if t[0] == "h" else t[1] / first[0].shape[1]
        seq += [shrink(x[0], s, soft) if x else None for x in line]
    return seq
fr = frames(P("assets", "objets", "bonus.png"), 6, 3, region="content")
pack("bonus", rows_scaled(fr, [("h", 14)] * 6), {k: [i * 3, 3] for i, k in enumerate(["heart", "energy", "shield", "speed", "jump", "coin"])}, 3, anchor="center")
fr = frames(P("assets", "objets", "destructibles.png"), 4, 3, region="content")
pack("destructibles", rows_scaled(fr, [("w", 24), ("w", 22), ("h", 30), ("w", 32)]), {k: [i * 3, 3] for i, k in enumerate(["crate", "barrel", "hydrant", "generator"])}, 3, anchor="bottom")
fr = frames(P("assets", "objets", "interactifs.png"), 6, 3, region="content")
pack("interactifs", rows_scaled(fr, [("h", 32), ("h", 16), ("w", 32), ("w", 32), ("h", 32), ("h", 32)]), {k: [i * 3, 3] for i, k in enumerate(["door", "lever", "elevator", "moving", "checkpoint", "gate"])}, 3, anchor="bottom")
fr = frames(P("assets", "objets", "pieges.png"), 6, 3, region="content")
pack("pieges", rows_scaled(fr, [("w", 24), ("w", 24), ("w", 26), ("w", 26), ("w", 34), ("w", 26)]), {k: [i * 3, 3] for i, k in enumerate(["spikes", "saw", "laser", "lava", "cable", "steam"])}, 3, anchor="bottom")
DOORS = {}
doors_atlas = json.load(open(P("assets", "objets", "portes_6_mondes.atlas.json"), encoding="utf-8"))
for d in doors_atlas["worlds"]:
    src = load(P(*d["path"].split("/"))); seq = []
    rects = [d["sourceRects"][k] for k in doors_atlas["stateOrder"]]
    vis = d.get("visibleBoundsPerCell") or []
    vw = max((v[2] - v[0]) for v in vis) if vis else rects[0]["width"]
    s = min(48 / vw, 40 / rects[0]["height"])
    for rc in rects:
        crop = src[rc["y"]:rc["y"] + rc["height"], rc["x"]:rc["x"] + rc["width"]]
        seq.append(shrink(crop, s))
    # cadre commun aux trois états : la base et le centre ne bougent pas pendant l'ouverture
    h = max(x.shape[0] for x in seq); w = max(x.shape[1] for x in seq)
    pack(f"porte_{d['world']}", seq, {"closed": [0, 1], "half": [1, 1], "open": [2, 1]}, 3, fixed=(w, h, w // 2, h))
    DOORS[d["world"]] = f"porte_{d['world']}"
fr = frames(P("assets", "passerelle", "machine_temporelle.png"), 3, 5)
s = 64 / fr[0][0][0].shape[0]
pack("machine", [shrink(x[0], s) if x else None for line in fr for x in line], {"idle": [0, 5], "activate": [5, 5], "depart": [10, 5]}, 5, anchor="bottom", note=f"échelle {s:.4f}")
fr = frames(P("assets", "interface", "interface_atlas.png"), 3, 6)
pack("hud", rows_scaled(fr, [("h", 12)] * 3, soft=False),
     {k: [i, 1] for i, k in enumerate(["heart", "heart_empty", "energy", "shield", "speed", "jump", "coin", "skull", "pause", "play", "sound", "mute", "bar_empty", "bar_full", "bar_half", "P1", "P2", "P3"])}, 6, anchor="center")
fr = frames(P("assets", "interface", "portraits_personnages.png"), 2, 4)
pack("portraits", [shrink(x[0], 40 / max(x[0].shape)) if x else None for line in fr for x in line],
     {k: [i, 1] for i, k in enumerate(["helio", "lune", "robot", "singe", "ninja", "rumi", "steve", "homme"])}, 4, anchor="bottom")
fr = frames(P("assets", "interface", "portraits_boss.png"), 1, 6)
pack("portraits_boss", [shrink(x[0], 40 / max(x[0].shape)) if x else None for line in fr for x in line],
     {k: [i, 1] for i, k in enumerate(BOSSES)}, 6, anchor="bottom")

# ---------------------------------------------------------------- mondes et salles
WORLDS = [("01_centrale", "centrale", "Centrale électrique", "roi_slime", "slime"),
          ("02_usine", "usine", "Usine robotique", "drone_titan", "drone"),
          ("03_temple", "temple", "Temple des ombres", "maitre_ombres", "ninja_ombre"),
          ("04_volcan", "volcan", "Volcan primordial", "colosse_lave", "golem"),
          ("05_port", "port", "Port pirate", "singe_roi_pirate", "singe_pirate"),
          ("06_grotte", "grotte", "Grotte néon", "reine_chauve_souris", "chauve_souris")]
def tile_cells(path):
    """Cases de l'atlas de terrain (3 lignes × 4) : rectangle source de chaque case, pour retrouver les accessoires."""
    fr = frames(path, 3, 4, region="content")
    return fr
def fit(img, w, h, soft=False):
    s = min(w / img.shape[1], h / img.shape[0]); return shrink(img, s, soft)

LEVELS = []; out_worlds = []
DECOR = {}   # (monde, nom d'asset, w, h) -> id de sprite
for wi, (wid, short, wname, boss, enemy) in enumerate(WORLDS):
    tiles_path = P("assets", "mondes", wid, f"{wid}_tiles.png")
    tc = tile_cells(tiles_path)
    # sol : case (0,0) à 32 px de haut ; plateforme : case (1,0) à 16 px ; bords du sol pour les trous
    floor = shrink(tc[0][0][0], 32 / tc[0][0][0].shape[0]); edge_l = shrink(tc[0][1][0], 32 / tc[0][1][0].shape[0]); edge_r = shrink(tc[0][2][0], 32 / tc[0][2][0].shape[0])
    plat = shrink(tc[1][0][0], 16 / tc[1][0][0].shape[0])
    pack(f"terrain_{short}", [floor, edge_l, edge_r, plat], {"floor": [0, 1], "edgeL": [1, 1], "edgeR": [2, 1], "platform": [3, 1]}, 4, anchor="bottom")
    idx = json.load(open(P("levels", wid, "index.json"), encoding="utf-8"))
    rooms = []
    for e in idx["levels"]:
        L = json.load(open(P(*e["json"].split("/")), encoding="utf-8"))
        # fond propre à la salle
        bg = Image.open(P(*e["background"].split("/"))).convert("RGB")
        bw, bh = bg.size; s = max(480 / bw, 272 / bh)   # cover centré
        cw, chh = 480 / s, 272 / s
        bg = bg.crop((round((bw - cw) / 2), round((bh - chh) / 2), round((bw + cw) / 2), round((bh + chh) / 2))).resize((480, 272), Image.BOX)
        bg.save(os.path.join(OUT_FONDS, L["id"] + ".webp"), "WEBP", quality=92, method=6)
        objs = []
        for o in L["objects"]:
            o = {k: v for k, v in o.items() if k not in ("label", "description")}
            r = o.pop("rect"); o["r"] = [r["x"], r["y"], r["width"], r["height"]]
            if o["kind"] == "decor":
                # accessoire : on cherche sa case dans l'atlas du monde grâce au cadre d'aperçu du JSON
                sr = L["assets"][o["asset"]]["sourceRect"]
                cx, cy = sr["x"] + sr["width"] / 2, sr["y"] + sr["height"] / 2
                best = None
                for line in tc:
                    for x in line:
                        if not x: continue
                        (img, (sx, sy)) = x
                        d = (sx + img.shape[1] / 2 - cx) ** 2 + (sy + img.shape[0] / 2 - cy) ** 2
                        if best is None or d < best[0]: best = (d, img)
                key = (short, o["asset"], r["width"], r["height"])
                if key not in DECOR:
                    DECOR[key] = f"decor_{short}_{o['asset']}_{r['width']}x{r['height']}"
                    pack(DECOR[key], [fit(best[1], r["width"], r["height"])], {"idle": [0, 1]}, 1, anchor="bottom")
                o["sprite"] = DECOR[key]
            objs.append(o)
        rooms.append({"id": L["id"], "n": L["number"], "name": L["name"], "bg": f"assets/fonds/{L['id']}.webp",
                      "rules": L.get("rules", {}), "objects": objs})
    out_worlds.append({"id": wid, "short": short, "name": wname, "boss": boss, "enemy": enemy,
                       "door": DOORS[wid], "terrain": f"terrain_{short}", "rooms": rooms})

data = {"source": "Lunelio_pack_complet", "atlas": ATLAS, "worlds": out_worlds}
json.dump(data, open(os.path.join(HERE, "campagne.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# planche de contrôle
W = 1400; y = 0; rowsimg = []
for aid, sh in PREVIEW:
    if aid.startswith("decor_"): continue
    s = max(1, min(4, int(600 / max(sh.width, 1)) or 1))
    rowsimg.append((aid, sh.resize((sh.width * s, sh.height * s), Image.NEAREST)))
H = sum(im.height + 14 for _, im in rowsimg)
prev = Image.new("RGBA", (W, H), (46, 40, 70, 255)); y = 0
from PIL import ImageDraw
dr = ImageDraw.Draw(prev)
for aid, im in rowsimg:
    dr.text((4, y), aid, fill=(255, 255, 255, 255)); y += 12
    # cases de l'atlas visibles
    a = ATLAS[aid]; s = im.width // max(1, Image.open(os.path.join(ROOT, a["src"])).width)
    prev.alpha_composite(im.crop((0, 0, min(im.width, W), im.height)), (0, y))
    for cx in range(0, min(im.width, W), a["cw"] * s): dr.line([(cx, y), (cx, y + im.height)], fill=(90, 80, 130, 255))
    y += im.height + 2
prev.save(os.path.join(ROOT, "apercu_atlas_planche.png"))
n = sum(len(w["rooms"]) for w in out_worlds)
size = sum(os.path.getsize(f) for f in glob.glob(os.path.join(ROOT, "assets", "**", "*.*"), recursive=True))
print(f"{len(ATLAS)} atlas, {n} salles, assets/ : {size / 1e6:.1f} Mo")
