import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))

# Lettres des ennemis qui marchent au sol (doivent être posés sur # ou -). Une nouvelle lettre d'ennemi au sol s'ajoute ici,
# dans GROUND de verifier_niveaux.py, et dans ENEMIES de template.html.
GROUND_ENEMIES = "WS"
# Un monde peut déclarer ses musiques : music="nom" (audio/nom.mp3, nom2.mp3… une par salle, en boucle)
# et bossMusic="nom" (salle de boss). Sans elles, les musiques du personnage sont utilisées.

FULL = "#" * 30
EMPTY = "#" + "." * 28 + "#"

def room(name, rows, hint=None, **opt):
    m = [FULL] + rows + [FULL, FULL]
    return dict(name=name, map=m, hint=hint, **opt)

def row(spec=None, fill="."):
    """Construit une ligne de 30 cases : murs aux bords, et les caractères donnés aux colonnes indiquées."""
    r = ["#"] + [fill] * 28 + ["#"]
    for c, ch in (spec or {}).items():
        if isinstance(c, tuple):
            for k in range(c[0], c[1] + 1): r[k] = ch
        else: r[c] = ch
    return "".join(r)

def arena(kind, name, deco, hint=None, **opt):
    """Salle de boss. deco = dict de lignes -> décors {colonne: lettre}."""
    D = lambda r: deco.get(r, {})
    rows = {r: row(D(r)) for r in range(1, 15)}
    if kind == "brute":
        rows[9] = row({**D(9), (11, 18): "-"})
        rows[11] = row({**D(11), 5: "H", 24: "H"})
        rows[12] = row({**D(12), (3, 8): "-", (21, 26): "-"})
        rows[14] = row({**D(14), 2: "P", 23: "B", 28: "E"})
    elif kind == "canon":
        rows[8] = row({**D(8), 4: "H"})
        rows[9] = row({**D(9), (2, 7): "-", (22, 27): "-"})
        rows[12] = row({**D(12), (2, 7): "-", (22, 27): "-"})
        rows[11] = row({**D(11), 25: "H"})
        rows[14] = row({**D(14), 2: "P", 25: "B", 28: "E"})
    elif kind == "mother":
        rows[4] = row({**D(4), 14: "B"})
        rows[9] = row({**D(9), (11, 18): "-"})
        rows[11] = row({**D(11), 6: "H", 22: "H"})
        rows[12] = row({**D(12), (4, 9): "-", (20, 25): "-"})
        rows[14] = row({**D(14), 2: "P", 28: "E"})
    else:  # final
        rows[8] = row({**D(8), 4: "H", 25: "H"})
        rows[9] = row({**D(9), (2, 7): "-", (22, 27): "-"})
        rows[12] = row({**D(12), (2, 7): "-", (22, 27): "-"})
        rows[14] = row({**D(14), 2: "P", 15: "B", 28: "E"})
    return room(name, [rows[r] for r in range(1, 15)], hint=hint, boss=True, **opt)

WORLDS = [
 dict(id="bar", name="Le bar", rooms=[
  room("Le comptoir", [
    EMPTY,
    "#...l........l........l......#",
    EMPTY,
    "#....b...........n.......b...#",
    EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
    "#..........------............#",
    EMPTY, EMPTY,
    "#.P..k.k..j..W...k.k...W....E#",
  ], hint=["MOVE", "ATTACK"]),
  room("La salle de billard", [
    EMPTY,
    "#...l.........l.........l....#",
    EMPTY, EMPTY,
    "#.........n..................#",
    EMPTY, EMPTY,
    "#.............S..............#",
    "#..........#######...........#",
    EMPTY, EMPTY,
    "#....------..........------..#",
    EMPTY,
    "#.P.....p.....W.......S..k..E#",
  ], hint=["Les robots-canons tirent des lasers", "Tranche le laser au bon moment pour le renvoyer !"]),
  room("L'arrière-boutique", [
    EMPTY,
    "#.....l..........l.......l...#",
    EMPTY,
    "#.b.....................b....#",
    EMPTY,
    "#......S.................S...#",
    "#....------.........-------..#",
    EMPTY, EMPTY,
    "#..........--------..........#",
    EMPTY, EMPTY,
    "#.......##........##.........#",
    "#.P..k..##...W....##..W..j..E#",
  ], hint=["POWER", "SPECIAL"]),
  arena("brute", "La cave", {2: {3: "l", 10: "l", 18: "l", 26: "l"}, 4: {14: "n"}, 14: {6: "k", 9: "j", 17: "k", 19: "k"}}, hint=["Quand il fonce dans un mur, il est étourdi", "C'est le moment de frapper !"]),
 ]),
 dict(id="immeuble", name="L'immeuble", rooms=[
  room("L'open space", [
    EMPTY,
    "#..l......l......l......l....#",
    EMPTY,
    "#.....g...............g......#",
    EMPTY,
    "#.............D..............#",
    EMPTY,
    "#..h..d.....W....d......S..f.#",
    "#######....#########....######",
    EMPTY,
    "#..................D.........#",
    "#......----.........----.....#",
    EMPTY,
    "#.P..d...w.....W.....d....h.E#",
  ], hint=["Attention aux drones !", "Ils volent vers toi quand ils te repèrent"]),
  room("Les ascenseurs", [
    EMPTY,
    "#..l........l........l.......#",
    EMPTY,
    "#....................D.......#",
    "#..W.....S....e..............#",
    "#----------------------......#",
    EMPTY,
    "#.....................W...S..#",
    "#......-------------------####",
    EMPTY, EMPTY,
    "#----------..........--------#",
    EMPTY,
    "#.P..w....f.....W.......h...E#",
  ]),
  room("Le bureau du directeur", [
    EMPTY,
    "#...l.........l.........l....#",
    EMPTY,
    "#......g............g........#",
    EMPTY, EMPTY,
    "#............D.........D.....#",
    "#.S..h..................h..S.#",
    "#------....----------....----#",
    EMPTY,
    "#.........W..........W.......#",
    "#.....--------..--------.....#",
    EMPTY,
    "#.P..f..d....S.....d....w...E#",
  ]),
  arena("canon", "La salle du conseil", {2: {4: "l", 12: "l", 20: "l"}, 4: {9: "g", 17: "g"}, 14: {8: "d", 13: "h", 16: "d", 20: "f"}}, hint=["Renvoie ses lasers avec ton sabre", "Ça lui fait très mal !"]),
 ]),
 dict(id="ruelle", name="La ruelle", outdoor=True, rooms=[
  room("Le passage", [
    EMPTY,
    EMPTY,
    "#..a........g............a...#",
    EMPTY, EMPTY, EMPTY, EMPTY,
    "#.......D.........S..........#",
    "#...............------.......#",
    EMPTY, EMPTY,
    "#.........------.............#",
    EMPTY,
    "#.P..t..l....W..c...l.t..W..E#",
  ]),
  room("Les escaliers de secours", [
    EMPTY,
    "#..a.......................E.#",
    "#......................#######",
    EMPTY,
    "#..S.......D.................#",
    "#----------........------....#",
    EMPTY,
    "#..........W.............S...#",
    "#.......----------....------.#",
    EMPTY, EMPTY,
    "#-----.......-------.........#",
    EMPTY,
    "#.P...t...W.....c...l..t..W..#",
  ], hint=["La sortie est tout en haut !", None]),
  room("Le marché de nuit", [
    EMPTY,
    EMPTY,
    "#....n..........n.........n..#",
    EMPTY, EMPTY, EMPTY,
    "#.....D..............D.......#",
    EMPTY,
    "#............S...............#",
    "#........##########..........#",
    EMPTY,
    "#...----..............----...#",
    EMPTY,
    "#.P..x..W...t....S...x..W...E#",
  ]),
  arena("mother", "La place", {2: {5: "n", 20: "n"}, 6: {14: "g"}, 14: {5: "t", 9: "l", 17: "c", 21: "l", 25: "t"}}, hint=["Frappe-la quand elle plonge vers toi", "Et détruis ses petits drones"]),
 ]),
 dict(id="cinema", name="Le cinéma", rooms=[
  room("Le hall", [
    EMPTY,
    "#...l.......l.......l.......l#",
    EMPTY,
    "#..o....o.....n.....o....o...#",
    EMPTY, EMPTY, EMPTY, EMPTY,
    "#.........S..................#",
    "#......----------............#",
    EMPTY, EMPTY,
    "#...##.......................#",
    "#.P.##..p..W......p...W.....E#",
  ]),
  room("La salle 3", [
    EMPTY, EMPTY,
    "#.......D....................#",
    "#.................D..........#",
    EMPTY, EMPTY, EMPTY,
    "#" + "."*24 + "W..E" + "#",
    "#" + "."*22 + "s." + "#"*5,
    "#" + "."*19 + "S." + "#"*8,
    "#" + "."*16 + "s." + "#"*11,
    "#" + "."*13 + "W." + "#"*14,
    "#" + "."*10 + "s." + "#"*17,
    "#.P..W...." + "#"*20,
  ], screen=True, hint=["Grimpe les gradins jusqu'à la sortie", None]),
  room("La cabine de projection", [
    EMPTY,
    "#..l..........l..........l...#",
    EMPTY, EMPTY,
    "#.S.......................S..#",
    "######.................#######",
    EMPTY,
    "#..........D.......D.........#",
    "#.......------....------.....#",
    EMPTY, EMPTY,
    "#...-----............-----...#",
    EMPTY,
    "#.P...s...W.....S....W..s...E#",
  ]),
  arena("canon", "Les coulisses", {2: {5: "l", 14: "l", 23: "l"}, 4: {12: "o", 16: "o"}, 14: {9: "p", 17: "s"}}, hint=["Attention, il tire trois lasers à la fois", "quand il est en colère"]),
 ]),
 dict(id="avion", name="L'avion", rooms=[
  room("La classe éco", [
    FULL, FULL, FULL, FULL,
    "#..x........l.........x......#",
    EMPTY, EMPTY,
    "#.....D..............D.......#",
    EMPTY, EMPTY, EMPTY,
    "#...------.....------....----#",
    EMPTY,
    "#.P..q.q...W..q.q.S...q.q..cE#",
  ], windows=[140]),
  room("La soute", [
    FULL, FULL,
    "#..x......l.........l....x...#",
    EMPTY, EMPTY,
    "#..q.q..W..q.q..S..q.q...W.E.#",
    "#####################....#####",
    EMPTY, EMPTY,
    "#...................------...#",
    "#...........D................#",
    "#...........-------..........#",
    EMPTY,
    "#.P..c....W....c....S.......c#",
  ], windows=[62], hint=["Monte par la trappe jusqu'à la cabine", None]),
  room("Le cockpit", [
    FULL, FULL,
    "#...l.........l.........l....#",
    EMPTY,
    "#.....D...........D..........#",
    EMPTY, EMPTY,
    "#..S...........S.............#",
    "#------....----------....----#",
    EMPTY, EMPTY,
    "#.......------....------.....#",
    EMPTY,
    "#.P..q.q..W..q.q..W..q.q.S..E#",
  ], windows=[100]),
  arena("mother", "La première classe", {2: {3: "x", 13: "l", 24: "x"}, 14: {5: "q", 7: "q", 11: "q", 13: "q", 17: "q", 19: "q", 23: "c"}}, windows=[100]),
 ]),
 dict(id="parking", name="Le parking", rooms=[
  room("Niveau -1", [
    EMPTY,
    "#..l.......l.......l.......l.#",
    EMPTY,
    "#......n.............n.......#",
    EMPTY, EMPTY, EMPTY,
    "#.....D............D.........#",
    EMPTY, EMPTY,
    "#...........S................#",
    "#.........########...........#",
    EMPTY,
    "#.P..v....W....c......v..W..E#",
  ]),
  room("La rampe", [
    EMPTY,
    "#.l.........l..........l.....#",
    EMPTY, EMPTY,
    "#.......................S..E.#",
    "#.....................########",
    EMPTY,
    "#..........D.....W...........#",
    "#............########........#",
    EMPTY,
    "#.....S..............D.......#",
    "#...########.................#",
    EMPTY,
    "#.P.......v...W......v...c...#",
  ]),
  room("Le toit-terrasse", [
    EMPTY,
    "#..l.......l.......l......l..#",
    EMPTY,
    "#...D.........D.........D....#",
    EMPTY,
    "#..S......................S..#",
    "#-------.............--------#",
    "#.........W.......S..........#",
    "#.......--------------.......#",
    EMPTY, EMPTY,
    "#----......--------.....-----#",
    EMPTY,
    "#.P..v....S....W.....v....W.E#",
  ], hint=["Le toit grouille de robots", "Le boss du parking t'attend juste après"]),
  arena("brute", "Le niveau -3", {2: {3: "l", 11: "l", 19: "l", 26: "l"}, 4: {14: "n"}, 14: {5: "v", 16: "c", 18: "c"}}, hint=["Saute par-dessus ses ondes de choc", None]),
 ]),
 dict(id="metro", name="Le métro", rooms=[
  room("Le quai", [
    row(), row({3: "l", 11: "l", 19: "l", 27: "l"}), row(), row({7: "n", 19: "m"}), row(),
    row({10: "D", 21: "D"}), row(), row({13: "S"}), row({(11, 18): "-"}), row(), row(),
    row({(5, 9): "-", (20, 24): "-"}), row(),
    row({2: "P", 5: "b", 9: "t", 12: "W", 18: "H", 22: "b", 25: "W", 28: "E"}),
  ]),
  room("Le wagon", [
    FULL, FULL, FULL, FULL, row({3: "l", 10: "l", 17: "l", 24: "l"}), row(), row({5: "D", 21: "D"}),
    row(), row(), row(), row({15: "H"}), row({(4, 7): "-", (14, 17): "-", (24, 27): "-"}), row(),
    row({2: "P", 4: "k", 6: "q", 8: "q", 10: "W", 12: "k", 14: "q", 16: "q", 18: "S", 20: "k", 22: "q", 24: "q", 26: "W", 28: "E"}),
  ], wagon=True, hint=["Le métro roule à toute vitesse !", None]),
  room("Les tunnels de service", [
    row(), row({3: "l", 14: "l", 25: "l"}), row(), row(), row({5: "S", 24: "S"}),
    row({(2, 7): "-", (22, 27): "-"}), row({14: "D"}), row({11: "W"}), row({(9, 20): "#"}), row(), row(),
    row({(3, 7): "-", (22, 26): "-"}), row(),
    row({2: "P", 7: "W", 15: "H", 23: "S", 28: "E"}),
  ]),
  arena("brute", "Le terminus", {2: {3: "l", 11: "l", 19: "l"}, 4: {12: "m", 22: "n"}, 14: {5: "b", 16: "t"}}, hint=["Il tire avant de foncer", "Saute ou renvoie son laser"]),
 ]),
 dict(id="labo", name="Le labo", rooms=[
  room("Le sas", [
    row(), row({4: "l", 14: "l", 24: "l"}), row(), row({9: "n", 19: "n"}), row(),
    row({5: "D", 23: "D"}), row(), row({13: "S"}), row({(10, 17): "-"}), row(), row(),
    row({(5, 9): "-", (19, 23): "-"}), row(),
    row({2: "P", 5: "t", 8: "c", 13: "W", 18: "b", 21: "t", 24: "W", 28: "E"}),
  ], hint=["Le laboratoire du Dr. Boulon", "C'est lui qui fabrique tous les robots !"]),
  room("Les cuves", [
    row(), row({3: "k", 10: "k", 17: "k", 24: "k"}), row(), row(), row({3: "S", 13: "H", 26: "S"}),
    row({(1, 6): "-", (11, 18): "-", (23, 28): "-"}), row(), row({8: "D", 18: "D"}),
    row({(6, 11): "-", (16, 21): "-"}), row(), row({18: "W"}), row({(3, 8): "-", (17, 22): "-"}), row(),
    row({2: "P", 5: "t", 9: "b", 13: "W", 18: "c", 22: "t", 25: "S", 28: "E"}),
  ]),
  room("Le bureau du Dr. Boulon", [
    row(), row({4: "l", 14: "l", 24: "l"}), row(), row({7: "n", 20: "n"}), row(), row(),
    row({6: "D", 14: "D", 22: "D"}), row({2: "S", 4: "t", 13: "H", 25: "S", 27: "t"}),
    row({(1, 6): "-", (11, 20): "-", (25, 28): "-"}), row(), row({10: "W", 21: "W"}),
    row({(6, 13): "-", (16, 23): "-"}), row(),
    row({2: "P", 5: "c", 8: "b", 13: "S", 19: "c", 22: "b", 24: "W", 28: "E"}),
  ]),
  arena("final", "Le cœur du labo", {2: {3: "k", 12: "k", 20: "k"}, 4: {9: "n", 19: "n"}, 14: {6: "t", 10: "c", 19: "c", 24: "t"}}, hint=["Le combat final contre Dr. Boulon !", "Il change d'attaque : reste attentif"]),
 ]),
]

def validate():
    ok = True
    for wi, w in enumerate(WORLDS):
        for ri, r in enumerate(w["rooms"]):
            m = r["map"]; tag = f"{w['id']} {ri+1} {r['name']}"
            if len(m) != 17: print(tag, "rows", len(m)); ok = False
            for i, row in enumerate(m):
                if len(row) != 30: print(tag, "row", i, "len", len(row), row); ok = False
            flat = "".join(m)
            if flat.count("P") != 1 or flat.count("E") != 1: print(tag, "P/E count"); ok = False
            for y, row in enumerate(m):
                for x, ch in enumerate(row):
                    if ch in GROUND_ENEMIES + "EB" and y + 1 < 17 and not (ch == "B" and r.get("boss") and w["id"] in ("ruelle", "avion")):
                        below = m[y+1][x] if x < len(m[y+1]) else "#"
                        if below not in "#-": print(tag, f"{ch} at r{y} c{x} unsupported ({below})"); ok = False
                    if ch == "E" and y + 1 < 17 and x + 1 < 30 and m[y+1][x+1] not in "#-":
                        print(tag, "door half unsupported"); ok = False
    return ok

if __name__ == "__main__":
    good = validate()
    print("OK" if good else "ERRORS")
    if good:
        open(os.path.join(HERE, "worlds.json"), "w", encoding="utf-8").write(json.dumps(WORLDS, ensure_ascii=False))
