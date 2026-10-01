"""Assemble le jeu dans ../index.html.

  python3 worlds.py            valide les niveaux et écrit worlds.json
  python3 build.py             version serveur : les sons restent dans ../audio/ (recommandé)
  python3 build.py --embed     version autonome : les sons sont intégrés dans le fichier (plus lourd)

En version serveur, ajouter une musique ne demande pas de reconstruire le jeu :
déposer backgroundhelio2.mp3, backgroundlune2.mp3… dans ../audio/ suffit.
"""
import base64, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
IMGS = os.path.join(HERE, "assets", "images")
AUDIO = os.path.join(ROOT, "audio")
embed = "--embed" in sys.argv
out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(ROOT, "index.html")

b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
t = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
for n in ("helio", "lune"):
    t = t.replace(f"__LOGO_{n.upper()}__", b64(os.path.join(IMGS, f"logo_{n}.webp")))
    t = t.replace(f"__{n.upper()}__", b64(os.path.join(IMGS, f"{n}_spritesheet.png")))
sounds = {}
if embed:
    for f in sorted(os.listdir(AUDIO)):
        if f.endswith(".mp3"):
            sounds[f[:-4]] = "data:audio/mpeg;base64," + b64(os.path.join(AUDIO, f))
t = t.replace("__AUDIO_MODE__", "embed" if embed else "files")
t = t.replace("__AUDIO_EMBED__", json.dumps(sounds))
t = t.replace("__WORLDS__", open(os.path.join(HERE, "worlds.json"), encoding="utf-8").read())
open(out, "w", encoding="utf-8").write(t)
print(f"{os.path.relpath(out, ROOT)} généré ({len(t) / 1e6:.1f} Mo, sons {'intégrés' if embed else 'dans audio/'})")
