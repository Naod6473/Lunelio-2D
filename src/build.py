"""Assemble le jeu dans ../index.html.

  python3 worlds.py            valide les niveaux et écrit worlds.json
  python3 build.py             version serveur : les sons restent dans ../audio/ (recommandé)
  python3 build.py --embed     version autonome : les sons sont intégrés dans le fichier (plus lourd)

Sons : tous les .mp3 de ../audio/ et de ses sous-dossiers (musique/, jingles/, sfx/, voir docs/sons_a_fournir.md).
Leur liste est écrite dans le jeu : après avoir déposé un son, relancer build.py (il met aussi à jour ../sw.js,
le service worker de l'appli, à partir de sw.js). Un son absent garde le bruitage synthétisé ou la musique de secours.

Nouvelle campagne : les modules JS_FILES (campagne.js, registres.js, sauvegarde.js…) sont insérés dans le jeu,
avec campagne.json (atlas et salles, écrit par preparer_pack.py), campagne_ajouts.json (chaussettes, objets de quête,
secrets et défis, écrit à la main) et laverie.json (images de la laverie, si preparer_laverie.py l'a écrit). Ses images restent dans ../assets/ en version serveur (avec une empreinte ?v=… pour que
le navigateur et l'appli prennent toujours la bonne version) ; la version autonome les intègre.
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
# sons : chemins relatifs à audio/, sans .mp3 (« musique/heros/backgroundhelio », « sfx/joueur/coup »…)
audio_list = sorted(os.path.relpath(os.path.join(d, f), AUDIO).replace(os.sep, "/")[:-4]
                    for d, _, fs in os.walk(AUDIO) for f in fs if f.endswith(".mp3"))
sounds = {n: "data:audio/mpeg;base64," + b64(os.path.join(AUDIO, n + ".mp3")) for n in audio_list} if embed else {}
t = t.replace("__AUDIO_MODE__", "embed" if embed else "files")
t = t.replace("__AUDIO_LIST__", json.dumps(audio_list))
t = t.replace("__AUDIO_EMBED__", json.dumps(sounds))
t = t.replace("__WORLDS__", open(os.path.join(HERE, "worlds.json"), encoding="utf-8").read())
# nouvelle campagne : moteur et systèmes (JS_FILES, dans cet ordre), données (campagne.json) et images de ../assets/
JS_FILES = ["campagne.js", "registres.js", "sauvegarde.js", "laverie.js", "ecrans.js", "defis.js", "armes.js", "coop.js", "rush.js", "profils.js", "pluie.js", "secrets.js", "dahaka.js", "eglise.js", "versus.js"]
t = t.replace("/*__CAMPAGNE_JS__*/", "\n".join(open(os.path.join(HERE, f), encoding="utf-8").read() for f in JS_FILES))
camp = json.load(open(os.path.join(HERE, "campagne.json"), encoding="utf-8"))
# images de la laverie, des cartes et des cosmétiques (écrites par preparer_laverie.py quand elles existent)
lav = os.path.join(HERE, "laverie.json")
if os.path.exists(lav): camp["atlas"].update(json.load(open(lav, encoding="utf-8")).get("atlas", {}))
ajouts = json.load(open(os.path.join(HERE, "campagne_ajouts.json"), encoding="utf-8"))
t = t.replace("__AJOUTS__", json.dumps(ajouts, ensure_ascii=False, separators=(",", ":")))
# écran de chargement : une image par palier de 10 % (assets/chargement/chargement_<p>.webp, écrites par preparer_laverie.py)
LD = os.path.join(ROOT, "assets", "chargement")
loader_imgs = sorted((f"assets/chargement/{f}" for f in (os.listdir(LD) if os.path.isdir(LD) else []) if f.endswith(".webp")), key=lambda p: int(p.rsplit("_", 1)[1][:-5]))
asset_paths = sorted({a["src"] for a in camp["atlas"].values()} | {r["bg"] for w in camp["worlds"] for r in w["rooms"]} | set(loader_imgs))
missing = [a for a in asset_paths if not os.path.exists(os.path.join(ROOT, a))]
if missing: sys.exit(f"Images manquantes dans assets/ ({len(missing)}), relancer preparer_pack.py : {missing[:5]}")
asset_ver = {a: hashlib.sha256(open(os.path.join(ROOT, a), "rb").read()).hexdigest()[:10] for a in asset_paths}
mime = {".png": "image/png", ".webp": "image/webp"}
asset_embed = {a: f"data:{mime[os.path.splitext(a)[1]]};base64," + b64(os.path.join(ROOT, a)) for a in asset_paths} if embed else {}
t = t.replace("__CAMPAGNE__", json.dumps(camp, ensure_ascii=False, separators=(",", ":")))
t = t.replace("__LOADER_IMGS__", json.dumps([asset_embed[p] if embed else f"{p}?v={asset_ver[p]}" for p in loader_imgs]))
t = t.replace("__ASSET_EMBED__", json.dumps(asset_embed)).replace("__ASSET_VER__", json.dumps(asset_ver))
# appli installable (PWA) : seulement en version serveur, la version autonome s'ouvre sans serveur
PWA_HEAD = """<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">"""
t = t.replace("__PWA_HEAD__", "" if embed else PWA_HEAD)
open(out, "w", encoding="utf-8", newline="\n").write(t)
if not embed:
    # la version du service worker change dès que le jeu, ses icônes ou la liste des sons changent :
    # le navigateur installe alors le nouveau service worker tout seul
    audio_files = ["audio/" + n + ".mp3" for n in audio_list]
    sw = open(os.path.join(HERE, "sw.js"), encoding="utf-8").read()
    asset_urls = [f"{a}?v={v}" for a, v in asset_ver.items()]
    h = hashlib.sha256((t + sw + "\n".join(audio_files)).encode())
    for f in ("manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-32.png"):
        h.update(open(os.path.join(ROOT, f), "rb").read())
    sw = sw.replace("__VERSION__", h.hexdigest()[:12]).replace("__AUDIO__", json.dumps(audio_files)).replace("__ASSETS__", json.dumps(asset_urls))
    open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8", newline="\n").write(sw)
print(f"{os.path.relpath(out, ROOT)} généré ({len(t) / 1e6:.1f} Mo, sons {'intégrés' if embed else 'dans audio/'})")
