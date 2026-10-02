#!/usr/bin/env python3
"""Service des sauvegardes de Lunelio : profils, sauvegarde par profil et tableau des scores familial.

Python 3 sans dépendance. Il écoute seulement en local (127.0.0.1) ; Nginx lui transmet /api/ (voir nginx-lunelio.conf).
Les données sont rangées dans /var/lib/lunelio (hors du dossier du jeu, que la mise à jour automatique remet à zéro) :
  profils.json             {id: {nom, cree, maj}}
  saves/<id>.json          {rev, maj, nom, save}
  versions/<id>/<rev>.json les 10 dernières versions de chaque profil (pour revenir en arrière à la main)

API (toujours en JSON, jamais en cache) :
  GET /api/etat                  le service répond (le jeu s'en sert pour savoir s'il peut synchroniser)
  GET /api/profils               liste des profils
  GET /api/save/<id>             sauvegarde d'un profil (404 si elle n'existe pas encore)
  PUT /api/save/<id>             {nom, rev, save} : enregistre ; 409 si la version du serveur a changé entre-temps
                                 (le jeu fusionne alors et renvoie), ou si le nom est déjà pris par un autre profil
  GET /api/scores                résumé de chaque profil pour le tableau des scores
  GET /api/connexion             renvoie vers le jeu (sert à se connecter à Cloudflare Access)

Protections : taille maximale, format contrôlé, nombre de profils limité, limite de requêtes par adresse,
écritures atomiques. Sur internet, /api/ doit être derrière Cloudflare Access (docs/cloudflare_api.md).

Réglages par variables d'environnement : LUNELIO_DATA (dossier), LUNELIO_PORT (8770).
"""
import json
import os
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DATA = os.environ.get("LUNELIO_DATA", "/var/lib/lunelio")
PORT = int(os.environ.get("LUNELIO_PORT", "8770"))
MAX_BODY = 300 * 1024          # une sauvegarde fait quelques dizaines de Ko
MAX_PROFILS = 30
GARDER_VERSIONS = 10
LIMITES = {"lecture": (120, 60), "ecriture": (30, 60)}   # (requêtes, secondes) par adresse

ID_RE = re.compile(r"^[a-z0-9]{6,24}$")
NOM_RE = re.compile(r"^[^\W_](?:[\w' -]{0,10}[^\W_])?$", re.UNICODE)   # 1 à 12 caractères : lettres, chiffres, espace, ' et -

verrou = threading.Lock()
compteurs = {}


def chemin(*parts):
    return os.path.join(DATA, *parts)


def lire_json(p, defaut=None):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return defaut


def ecrire_json(p, obj):
    """Écriture atomique : fichier temporaire, puis remplacement."""
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def nom_valide(nom):
    return isinstance(nom, str) and len(nom.strip()) == len(nom) and 1 <= len(nom) <= 12 and bool(NOM_RE.match(nom))


def profils():
    return lire_json(chemin("profils.json"), {}) or {}


def resume(sv):
    """Ce que montre le tableau des scores : progression et records, rien d'autre."""
    sv = sv if isinstance(sv, dict) else {}
    got = sv.get("got") or {}
    chal = {}
    for cid, c in (sv.get("chal") or {}).items():
        if isinstance(c, dict) and isinstance(c.get("best"), dict):
            chal[cid] = {d: t for d, t in c["best"].items() if isinstance(t, (int, float))}
    best = {k: v.get("time") for k, v in (sv.get("best") or {}).items()
            if isinstance(v, dict) and isinstance(v.get("time"), (int, float)) and k.startswith("camp|")}
    rush = sv.get("rush") or {}
    return {
        "mondes": (sv.get("camp") or {}).get("done", 0),
        "chaussettes": len(sv.get("socks") or {}),
        "badges": sum(1 for k in got if k.startswith("badge:")),
        "best": best,
        "rush": {k: t for k, t in (rush.get("best") or {}).items() if isinstance(t, (int, float))},
        "rushAvec": {k: n for k, n in (rush.get("avec") or {}).items() if isinstance(n, str)},
        "dahaka": {k: m for k, m in ((sv.get("dahaka") or {}).get("best") or {}).items() if isinstance(m, (int, float))},
        "chal": chal,
    }


def trop_de_requetes(ip, genre):
    n, sec = LIMITES[genre]
    now = time.time()
    with verrou:
        liste = [t for t in compteurs.get((ip, genre), []) if now - t < sec]
        if len(liste) >= n:
            compteurs[(ip, genre)] = liste
            return True
        liste.append(now)
        compteurs[(ip, genre)] = liste
        if len(compteurs) > 5000:   # ménage de temps en temps
            for k in [k for k, v in compteurs.items() if not v or now - v[-1] > 120]:
                compteurs.pop(k, None)
    return False


class Handler(BaseHTTPRequestHandler):
    server_version = "LunelioAPI/1"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):   # journal court (systemd le garde)
        sys.stderr.write("%s %s\n" % (self.ip(), fmt % args))

    def ip(self):
        return (self.headers.get("CF-Connecting-IP") or self.headers.get("X-Real-IP") or self.client_address[0]).strip()

    def repondre(self, code, obj=None, entetes=None):
        corps = b"" if obj is None else json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (entetes or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        if corps and self.command != "HEAD":
            self.wfile.write(corps)

    def route(self):
        p = self.path.split("?", 1)[0]
        if not p.startswith("/api/"):
            return None, None
        parts = [x for x in p[5:].split("/") if x]
        return (parts[0] if parts else ""), parts[1:]

    def do_GET(self):
        if trop_de_requetes(self.ip(), "lecture"):
            return self.repondre(429, {"erreur": "trop de requêtes"})
        quoi, reste = self.route()
        if quoi == "etat" and not reste:
            return self.repondre(200, {"ok": True, "profils": len(profils())})
        if quoi == "connexion" and not reste:
            return self.repondre(302, None, {"Location": "/"})
        if quoi == "profils" and not reste:
            liste = [{"id": i, "nom": p.get("nom"), "maj": p.get("maj", 0), "mondes": p.get("mondes", 0)} for i, p in profils().items()]
            return self.repondre(200, {"profils": sorted(liste, key=lambda x: -x["maj"])})
        if quoi == "save" and len(reste) == 1 and ID_RE.match(reste[0]):
            d = lire_json(chemin("saves", reste[0] + ".json"))
            return self.repondre(200, d) if d else self.repondre(404, {"erreur": "profil inconnu"})
        if quoi == "scores" and not reste:
            out = []
            for i, p in profils().items():
                d = lire_json(chemin("saves", i + ".json")) or {}
                out.append({"id": i, "nom": p.get("nom"), **resume(d.get("save"))})
            return self.repondre(200, {"profils": out})
        return self.repondre(404, {"erreur": "inconnu"})

    def do_PUT(self):
        if trop_de_requetes(self.ip(), "ecriture"):
            return self.repondre(429, {"erreur": "trop de requêtes"})
        quoi, reste = self.route()
        if quoi != "save" or len(reste) != 1 or not ID_RE.match(reste[0]):
            return self.repondre(404, {"erreur": "inconnu"})
        pid = reste[0]
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = -1
        if n <= 0 or n > MAX_BODY:
            return self.repondre(413, {"erreur": "taille"})
        try:
            corps = json.loads(self.rfile.read(n).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.repondre(400, {"erreur": "format"})
        nom, rev, sv = corps.get("nom") if isinstance(corps, dict) else None, corps.get("rev") if isinstance(corps, dict) else None, corps.get("save") if isinstance(corps, dict) else None
        if not nom_valide(nom) or not isinstance(sv, dict) or not isinstance(sv.get("v"), int) or not isinstance(rev, int):
            return self.repondre(400, {"erreur": "format"})
        with verrou:
            idx = profils()
            fichier = chemin("saves", pid + ".json")
            actuel = lire_json(fichier)
            if pid not in idx:
                pris = next((i for i, p in idx.items() if (p.get("nom") or "").casefold() == nom.casefold()), None)
                if pris:
                    return self.repondre(409, {"conflit": "nom", "id": pris})
                if len(idx) >= MAX_PROFILS:
                    return self.repondre(403, {"erreur": "trop de profils"})
            cur = actuel.get("rev", 0) if actuel else 0
            if actuel and rev != cur:
                return self.repondre(409, {"conflit": "version", **actuel})
            now = int(time.time() * 1000)
            neuf = {"rev": cur + 1, "maj": now, "nom": nom, "save": sv}
            ecrire_json(fichier, neuf)
            ecrire_json(chemin("versions", pid, "%06d.json" % neuf["rev"]), neuf)
            vdir = chemin("versions", pid)
            for vieux in sorted(os.listdir(vdir))[:-GARDER_VERSIONS]:
                try:
                    os.remove(os.path.join(vdir, vieux))
                except OSError:
                    pass
            p = idx.get(pid, {"cree": now})
            p.update({"nom": nom, "maj": now, "mondes": (sv.get("camp") or {}).get("done", 0) if isinstance(sv.get("camp"), dict) else 0})
            idx[pid] = p
            ecrire_json(chemin("profils.json"), idx)
        return self.repondre(200, {"rev": neuf["rev"], "maj": now})

    def do_POST(self):
        return self.repondre(405, {"erreur": "méthode"})

    do_DELETE = do_POST


def main():
    os.makedirs(chemin("saves"), exist_ok=True)
    os.makedirs(chemin("versions"), exist_ok=True)
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    srv.daemon_threads = True
    sys.stderr.write("Lunelio API sur 127.0.0.1:%d, données dans %s\n" % (PORT, DATA))
    srv.serve_forever()


if __name__ == "__main__":
    main()
