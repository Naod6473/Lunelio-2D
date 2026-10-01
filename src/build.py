"""Assemble le jeu dans ../index.html.

  python3 worlds.py            valide les niveaux et écrit worlds.json
  python3 build.py             version serveur : les sons restent dans ../audio/ (recommandé)
  python3 build.py --embed     version autonome : les sons sont intégrés dans le fichier (plus lourd)

En version serveur, ajouter une musique ne demande pas de reconstruire le jeu :
déposer backgroundhelio2.mp3, backgroundlune2.mp3… dans ../audio/ suffit.
La version serveur écrit aussi ../sw.js (service worker de l'appli, à partir de sw.js).
"""
import base64, hashlib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
IMGS = os.path.join(HERE, "assets", "images")
AUDIO = os.path.join(ROOT, "audio")
embed = "--embed" in sys.argv
out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(ROOT, "index.html")

b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
t = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
# toutes les planches <id>_spritesheet.png et tous les logos logo_<id>.webp : un nouveau personnage n'a qu'à déposer les siens
sprites = {}
for f in sorted(os.listdir(IMGS)):
    if f.endswith("_spritesheet.png"):
        sprites[f[:-len("_spritesheet.png")]] = "data:image/png;base64," + b64(os.path.join(IMGS, f))
    elif f.startswith("logo_") and f.endswith(".webp"):
        sprites[f[:-5]] = "data:image/webp;base64," + b64(os.path.join(IMGS, f))
t = t.replace("__SPRITES__", json.dumps(sprites))
sounds = {}
if embed:
    for f in sorted(os.listdir(AUDIO)):
        if f.endswith(".mp3"):
            sounds[f[:-4]] = "data:audio/mpeg;base64," + b64(os.path.join(AUDIO, f))
t = t.replace("__AUDIO_MODE__", "embed" if embed else "files")
t = t.replace("__AUDIO_EMBED__", json.dumps(sounds))
t = t.replace("__WORLDS__", open(os.path.join(HERE, "worlds.json"), encoding="utf-8").read())
# appli installable (PWA) : seulement en version serveur, la version autonome s'ouvre sans serveur
PWA_HEAD = """<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">"""
t = t.replace("__PWA_HEAD__", "" if embed else PWA_HEAD)
open(out, "w", encoding="utf-8", newline="\n").write(t)
if not embed:
    # la version du service worker change dès que le jeu, ses icônes ou la liste des sons changent :
    # le navigateur installe alors le nouveau service worker tout seul
    audio_files = sorted("audio/" + f for f in os.listdir(AUDIO) if f.endswith(".mp3"))
    sw = open(os.path.join(HERE, "sw.js"), encoding="utf-8").read()
    h = hashlib.sha256((t + sw + "\n".join(audio_files)).encode())
    for f in ("manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-32.png"):
        h.update(open(os.path.join(ROOT, f), "rb").read())
    sw = sw.replace("__VERSION__", h.hexdigest()[:12]).replace("__AUDIO__", json.dumps(audio_files))
    open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8", newline="\n").write(sw)
print(f"{os.path.relpath(out, ROOT)} généré ({len(t) / 1e6:.1f} Mo, sons {'intégrés' if embed else 'dans audio/'})")
