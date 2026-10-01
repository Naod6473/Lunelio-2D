"""Vérifie que chaque robot et la sortie sont atteignables dans toutes les salles. Lancer après worlds.py."""
import json, os
from collections import deque
GROUND = "WS"   # ennemis au sol, comme GROUND_ENEMIES dans worlds.py
W=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'worlds.json'), encoding='utf-8'))
def check(m):
    R,C=17,30
    t=lambda r,c: m[r][c] if 0<=r<R and 0<=c<C else '#'
    solid=lambda r,c: t(r,c)=='#'
    sup=lambda r,c: t(r,c) in '#-'
    def stand(r,c): return not solid(r,c) and not solid(r-1,c) and sup(r+1,c)
    start=[(r,c) for r in range(R) for c in range(C) if m[r][c]=='P'][0]
    seen={start}; q=deque([start])
    while q:
        r,c=q.popleft()
        for r2 in range(1,16):
            for c2 in range(1,29):
                if (r2,c2) in seen or not stand(r2,c2): continue
                dy=r-r2; dx=abs(c2-c)
                ok=False
                if dy==0 and dx==1: ok=True
                elif 1<=dy<=3 and dx<=5:
                    # need clear column above start or target (crude headroom check)
                    ok = all(not solid(rr,c) for rr in range(r2-1,r)) or all(not solid(rr,c2) for rr in range(r2-1,r+1))
                elif dy<0 and dx<=7: ok=True
                elif dy==0 and dx<=4: ok=all(not solid(r,cc) for cc in range(min(c,c2),max(c,c2)+1))
                if ok: seen.add((r2,c2)); q.append((r2,c2))
    bad=[]
    for r in range(R):
        for c in range(C):
            ch=m[r][c]
            if ch in GROUND + 'E':
                if not any((r,cc) in seen for cc in (c-1,c,c+1)): bad.append((ch,r,c))
    return bad
for w in W:
    for i,rm in enumerate(w['rooms']):
        b=check(rm['map'])
        print(w['id'],i+1,rm['name'],'OK' if not b else b)

# ---------------------------------------------------------------- nouvelle campagne (campagne.json)
# Les salles sont des rectangles : on relie les surfaces (sol, plateformes) par la physique du saut simple
# (450 px/s, gravité 1500, course 132 px/s, corps 10 × 32), sans double saut ni dash, puis on vérifie que la
# sortie, les ennemis au sol et le boss sont atteignables, que les décors et portes reposent sur le sol,
# et que le départ et la sortie sont dégagés des pièges.
import math
V0, G, RUN, BW, BH = 450.0, 1500.0, 132.0, 10, 32
APEX = V0 * V0 / (2 * G)
def reach(dh):
    """Distance horizontale maximale pour monter de dh pixels (dh < 0 : descendre) avec un saut simple."""
    if dh > APEX - 2: return -1
    disc = V0 * V0 - 2 * G * dh
    return RUN * (V0 + math.sqrt(disc)) / G * 0.92   # 8 % de marge : on ne court pas toujours à fond
def envelope(surf, seen, x, y, w, h, v0=V0):
    """Le rectangle (x, y, w, h) est-il touché par le corps du joueur, debout ou au sommet d'un saut, depuis une surface atteinte ?"""
    apex = v0 * v0 / (2 * G)
    return any(j in seen and x + w > a - BW and x < b + BW and y + h > sy - BH - apex and y < sy for j, (a, b, sy) in enumerate(surf))
def campaign_check(room, aj=None):
    objs = room["objects"]; bad = []
    rect = lambda o: o["r"]
    aj = aj or {}
    rid = room["id"]
    surfaces = [("sol", *rect(o)) for o in objs if o["kind"] == "terrain" and o["collision"] == "solid"]
    surfaces += [("plateforme", *rect(o)) for o in objs if o["kind"] == "platform"]
    surfaces += [("plateforme", *q) for q in aj.get("platforms", {}).get(rid, [])]
    surf = [(x, x + w, y) for _, x, y, w, h in surfaces]
    floors = [(x, x + w, y) for k, x, y, w, h in surfaces if k == "sol"]
    def surface_at(px0, px1, py):
        return [i for i, (a, b, y) in enumerate(surf) if abs(y - py) < 0.5 and px1 > a and px0 < b]
    spawn = [o for o in objs if o["kind"] == "spawn"]
    if len(spawn) != 1: bad.append("départ absent ou multiple"); return bad
    sx, sy, sw, sh = rect(spawn[0])
    start = surface_at(sx, sx + sw, sy + sh)
    if not start: bad.append("départ pas posé sur une surface"); return bad
    seen = set(start); todo = list(start)
    while todo:
        i = todo.pop(); a0, a1, ay = surf[i]
        for j, (b0, b1, by) in enumerate(surf):
            if j in seen: continue
            r = reach(ay - by)
            if r < 0: continue
            gap = max(0, (b0 - BW + 1) - (a1 - 1), (a0 - BW + 1) - (b1 - 1))
            if gap <= r: seen.add(j); todo.append(j)
    def reachable(x0, x1, y_bottom):
        return any(j in seen for j in surface_at(x0, x1, y_bottom))
    hazards = [o for o in objs if o["kind"] == "hazard"]
    for o in objs:
        x, y, w, h = rect(o)
        if o["kind"] == "exit":
            if not reachable(x, x + w, y + h): bad.append(f"sortie {o['id']} inatteignable")
            if any(hx < x + w + 8 and hx + hw > x - 8 and hy < y + h and hy + hh > y for hx, hy, hw, hh in (rect(z) for z in hazards if z.get("asset") is not None)):
                bad.append(f"piège contre la sortie {o['id']}")
        elif o["kind"] == "enemy_spawn" and o.get("movement", "ground") == "ground":
            if not reachable(x, x + w, y + h): bad.append(f"ennemi {o['id']} hors d'atteinte")
        elif o["kind"] == "boss_spawn" and o.get("movement") not in ("hovering", "flying"):
            if not any(abs(fy - (y + h)) < 0.5 and x + w > a and x < b for a, b, fy in floors): bad.append("boss pas posé sur le sol")
        elif o["kind"] == "decor" and o.get("placement", {}).get("attachment", "floor") == "floor":
            if not any(abs(fy - (y + h)) < 0.5 and x >= a - 0.5 and x + w <= b + 0.5 for a, b, fy in floors): bad.append(f"décor {o['id']} ne repose pas sur le sol")
        elif o["kind"] == "pickup":
            # bonus facultatif : on le signale seulement s'il est hors de portée d'un saut depuis une surface atteinte
            if not any(j in seen and x + w > a - BW and x < b + BW and y + h > sy2 - BH - APEX and y < sy2 for j, (a, b, sy2) in enumerate(surf)):
                bad.append(f"bonus {o['id']} hors d'atteinte (facultatif)")
    for z in hazards:
        if z.get("asset") is None: continue
        hx, hy, hw, hh = rect(z)
        if hx < sx + sw + 24 and hx + hw > sx - 24: bad.append(f"piège {z['id']} trop près du départ")
    exits = [o for o in objs if o["kind"] == "exit"]
    if len(exits) != 1: bad.append("sortie absente ou multiple")
    # ajouts (campagne_ajouts.json) : chaussette principale atteignable par tous les héros (saut simple), caisses posées au sol,
    # chaussettes dorées hors de portée d'un saut simple mais atteignables avec un saut plus haut (super saut, double saut, bloc)
    if aj:
        s = aj.get("socks", {}).get(rid)
        if not s: bad.append("pas de chaussette")
        else:
            x, y = s["r"]
            if s.get("crate"):
                cr = [c["r"] for c in aj.get("crates", {}).get(rid, []) if c["id"] == s["crate"]] + [rect(o) for o in objs if o.get("id") == s["crate"] and o["kind"] == "destructible"]
                if not cr: bad.append(f"caisse {s['crate']} introuvable")
                elif not reachable(cr[0][0], cr[0][0] + cr[0][2], cr[0][1] + cr[0][3]): bad.append("caisse de la chaussette inatteignable")
            elif not envelope(surf, seen, x, y, 12, 12): bad.append(f"chaussette {s['type']} hors d'atteinte")
            if not (0 <= x <= VW - 12 and 18 <= y <= 240): bad.append("chaussette hors de l'écran")
        for c in aj.get("crates", {}).get(rid, []):
            x, y, w, h = c["r"]
            if not any(abs(fy - (y + h)) < 0.5 and x >= a and x + w <= b for a, b, fy in floors): bad.append(f"caisse {c['id']} pas posée sur le sol")
            if any(hx < x + w and hx + hw > x and hy < y + h + 8 and hy + hh > y for hx, hy, hw, hh in (rect(z) for z in hazards)): bad.append(f"caisse {c['id']} sur un piège")
        for g in aj.get("gold", []):
            if g["room"] != rid: continue
            x, y = g["r"]
            if envelope(surf, seen, x, y, 12, 12): bad.append(f"chaussette dorée {g['id']} trop facile (saut simple)")
            if not envelope(surf, seen, x, y, 12, 12, v0=570): bad.append(f"chaussette dorée {g['id']} inatteignable même en super saut")
        for q in aj.get("questItems", []):
            if q["room"] == rid and not envelope(surf, seen, q["r"][0], q["r"][1], 12, 12): bad.append(f"objet de quête {q['id']} hors d'atteinte")
        for cid, t in aj.get("challengeTargets", {}).items():
            if CH_ROOMS.get(cid) == rid and not envelope(surf, seen, t[0], t[1], 12, 12): bad.append(f"cible du défi {cid} hors d'atteinte")
    return bad
VW = 480
HERE = os.path.dirname(os.path.abspath(__file__))
CAMP = os.path.join(HERE, "campagne.json")
AJ = json.load(open(os.path.join(HERE, "campagne_ajouts.json"), encoding="utf-8"))
# salle utilisée par chaque défi à cible (lue dans registres.js : id du défi → première salle)
import re
CH_ROOMS = {m.group(1): m.group(2) for m in re.finditer(r'\{ id: "(\w+)", prog: "\w+", world: "\w+", rooms: \["(\w+)"', open(os.path.join(HERE, "registres.js"), encoding="utf-8").read())}
if os.path.exists(CAMP):
    C = json.load(open(CAMP, encoding="utf-8"))
    total = 0; ids = set()
    for w in C["worlds"]:
        if len(w["rooms"]) != 12: print(w["id"], "n'a pas 12 salles")
        for r in w["rooms"]:
            b = campaign_check(r, AJ); total += 1; ids.add(r["id"])
            print(w["id"], r["n"], r["name"], "OK" if not b else b)
    stray = [k for k in list(AJ["socks"]) + [g["room"] for g in AJ.get("gold", [])] + [q["room"] for q in AJ.get("questItems", [])] if k not in ids]
    if stray: print("Ajouts pour des salles inconnues :", stray)
    print(f"Nouvelle campagne : {len(C['worlds'])} mondes, {total} salles, {len(AJ['socks'])} chaussettes, {len(AJ.get('gold', []))} chaussettes dorées, {len(AJ.get('questItems', []))} objets de quête")
