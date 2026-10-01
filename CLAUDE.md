# Lunelio — guide pour Claude Code

Jeu d'action 2D en pixel art néon, jouable dans le navigateur (PC, tablette, téléphone). Projet familial : le jeu est fait pour deux enfants de **6 et 8 ans**, avec un mode Doom très difficile pour les parents. Les deux personnages jouables, Hélio et Lune, sont inspirés des enfants.

Toute l'interface et tous les textes du jeu sont **en français**. Réponds-moi en français.

## Règles importantes

- **Public enfant** : pas de sang, pas de violence réaliste. Les ennemis sont des robots qui explosent en étincelles et en boulons. Ton positif, consignes courtes et simples, lisibles par un enfant de 6 ans.
- **Ne modifie pas l'apparence d'Hélio et Lune** (sprites, couleurs, tenues) sans me le demander.
- **Aucune photo réelle** des enfants dans le dépôt. Seuls les sprites pixel art et les logos y ont leur place.
- **Pas d'outillage lourd** : pas de npm, pas de bundler, pas de framework. Le jeu est du JavaScript vanilla dans un seul fichier HTML, construit par un script Python sans dépendance. Pas de bibliothèque externe chargée depuis internet (seule exception : la police Google Fonts « Pixelify Sans », avec police de secours).
- **`main` est en production** : le serveur de la maison se synchronise tout seul sur `main` toutes les 5 minutes. Pour un gros chantier, travaille sur une branche et ne fusionne qu'après validation.
- Avant tout commit : régénérer et vérifier (voir « Construire et tester »). `index.html` est commité car c'est lui que le serveur sert.

## Structure du dépôt

```
index.html               Jeu construit (généré par src/build.py, commité)
sw.js                    Service worker de l'appli (généré par src/build.py, commité)
manifest.json            Manifeste de l'appli installable (PWA)
icons/                   Icônes de l'appli (générées par src/generer_icones.py, commitées)
audio/                   Musiques et bruitages, servis à côté de index.html
src/template.html        Code source du jeu (HTML + CSS + JS) avec des marqueurs à remplacer
src/sw.js                Modèle du service worker (marqueurs __VERSION__ et __AUDIO__)
src/worlds.py            Les 8 mondes et 32 salles, décrits en texte ; valide et écrit worlds.json
src/verifier_niveaux.py  Vérifie que robots marcheurs, robots-canons et sortie sont atteignables dans chaque salle
src/build.py             Assemble index.html à partir du template, des images et des niveaux, et écrit sw.js
src/generateur_sprites.py  Génère les planches de sprites d'Hélio et Lune (Pillow)
src/generer_icones.py    Génère les icônes de icons/ à partir des sprites (Pillow) ; à relancer si les sprites changent
src/assets/images/       <id>_spritesheet.png et logo_<id>.webp de chaque personnage (tous intégrés par build.py)
deploy/                  Config Nginx et scripts pour le conteneur LXC
README.md                Présentation pour GitHub
```

`src/worlds.json` est généré et ignoré par Git.

## Construire et tester

```bash
cd src
python3 worlds.py            # valide les salles et écrit worlds.json
python3 verifier_niveaux.py  # chaque salle doit afficher OK
python3 build.py             # écrit ../index.html (sons lus dans ../audio/) et ../sw.js
python3 build.py --embed --out ../lunelio-autonome.html   # version tout-en-un, sons intégrés (≈ 11 Mo), sans PWA
```

`build.py` est reproductible : relancé sans modification, `git status` doit rester propre (`index.html` et `sw.js` identiques).

Pour tester, servir la racine du dépôt avec un serveur HTTP : `python3 -m http.server 8000` puis ouvrir `http://localhost:8000`. En ouvrant `index.html` directement depuis le disque (`file://`), les sons ne se chargent pas.

Tests à faire après une modification de gameplay : les deux personnages, les trois difficultés, au moins une salle normale et une salle de boss, au clavier, en mode tactile (outils de développement du navigateur, émulation mobile en paysage) et à la manette si possible. La console ne doit afficher aucune erreur JavaScript (les 404 sur `audio/backgroundhelio2.mp3` etc. sont normaux : c'est la détection des musiques).

## Le serveur (contexte)

Conteneur LXC Debian sur Proxmox, Nginx sert `/var/www/lunelio` (clone Git du dépôt, `--depth 1`).

- Clé de déploiement GitHub en lecture seule, hôte SSH `github-lunelio`.
- `/usr/local/bin/lunelio-update` : fetch + `reset --hard origin/main` + `git gc`. Option `-v` pour un message même sans changement.
- Timer systemd `lunelio-update.timer` toutes les 5 minutes.
- `deploy/nginx-lunelio.conf` bloque `/.git`, `/src/` et `/deploy/`, et envoie `Cache-Control: no-cache`.

Toute nouvelle ressource servie au navigateur doit donc être à la racine ou dans un dossier non bloqué (comme `audio/` ou `icons/`).

Le site est servi en `http://` sur l'IP du conteneur. Les navigateurs n'activent le service worker (installation et hors ligne) qu'en HTTPS ou sur `localhost` : sans HTTPS devant Nginx, le jeu marche mais sans la partie PWA.

## Architecture de `src/template.html`

Un seul `<script>`, organisé en sections commentées `/* ---------------- Nom ---------------- */`.

**Marqueurs remplacés par `build.py`** : `__SPRITES__` (objet `{id: data URL}` de toutes les planches `*_spritesheet.png` et de tous les logos `logo_*.webp` de `src/assets/images/`), `__WORLDS__` (JSON des mondes), `__AUDIO_MODE__` (`files` ou `embed`), `__AUDIO_EMBED__` (dictionnaire de data URLs, vide en mode `files`), `__PWA_HEAD__` (liens vers le manifeste et les icônes, vide en mode `embed`). Ne pas les renommer sans adapter `build.py`.

**Rendu** : résolution logique 480×272 (`VW`, `VH`), dessinée sur un canvas 3× plus grand (`SC = 3`) avec `imageSmoothingEnabled = false`. Tuiles de 16 px (`T`), salles de 30×17 tuiles. Scanlines et vignette par-dessus tout (`scanCanvas`).

**Boucle et états** : `frame()` appelle `update…`/`draw…` selon `state` : `loading`, `menu`, `worlds` (choix du monde), `play`, `pause`, `clear` (salle terminée), `worldclear`, `win`, `options`, `keys` (choix des touches). `optFrom` (`menu` ou `pause`) dit où revenir en quittant les options. Les entrées « appuyées cette image » (`pressed`) sont vidées à la fin de chaque image.

**Données principales**
- `DIFFS` : facile (5 cœurs), normal (3), doom (1). Champs : `eSpeed`, `laser`, `cd`, `tele`, `power`, `drain`, `regen`, `bossHp`.
- `CHARS` : fiches des personnages. Champs : `id` (nom de la planche `<id>_spritesheet.png` et du logo), `name`, `special` (clé de `SPECIALS` : `dash`, `doublejump`, ou `null`), `power` (clé de `POWERS` : `fast`, `slow`, ou `null`), `music` (nom de base des musiques dans `audio/`), `unlock` (`null` = disponible ; prévu pour les personnages à débloquer), couleurs (`color`, `glow`, `ui`, `ui2`, ciel `sky`, `moon`, `stripe`, `stars`, `city`) et portée d'attaque `atkW`. Hélio : dash et super vitesse ; Lune : double saut et ralenti. **Ne jamais tester l'identifiant d'un personnage dans le moteur** : passer par `specialOf(C)`, `powerOf(C)` ou un champ de la fiche.
- `SPECIALS` / `POWERS` : capacités, avec icône et libellé du bouton tactile, nom affiché (`abilityText(C)`), consigne `hint` [clavier, tactile, manette] et `kbHint` (consigne clavier recomposée quand les touches ont changé). `POWERS[].timeFx` (`fast` ou `slow`) dit l'effet sur le temps. Une nouvelle capacité demande sa fiche et son effet dans `updatePlayer()` (ou `updatePlay()` pour un pouvoir).
- `HINTS` : consignes communes `MOVE` et `ATTACK`, chacune en version clavier, tactile et manette ; `SPECIAL` et `POWER` viennent de la capacité du personnage (`hintText(tok)` choisit, et renvoie `""` si le personnage n'a pas la capacité ; si les touches du clavier ont été changées, la version clavier est recomposée par `KB_HINTS` ou `kbHint`). Dans les textes manette, `{A}`, `{B}`, `{X}`, `{Y}`, `{START}`, `{SELECT}` donnent le nom du bouton lui-même, et `{JUMP}`, `{ATK}`, `{SPEC}`, `{POW}` le nom du bouton choisi pour l'action (Xbox ou PlayStation). Pour tout autre texte qui dépend de la commande, utiliser `say(clavier, tactile, manette)`. Dans `worlds.py`, les consignes peuvent être des jetons : `MOVE`, `ATTACK`, `SPECIAL`, `POWER`.
- `WORLDS` / `ROOMS` : `ROOMS` est la liste à plat de toutes les salles, avec `w` (index du monde) et `ri` (index dans le monde). La dernière salle de chaque monde a `boss: true`.
- `WORLD_STYLE` : couleurs des tuiles et enseignes par monde. `BG` dessine le fond de chaque monde, `PROPS` dessine les décors (lettres minuscules des cartes). Fonds et décors sont pré-rendus une fois par salle dans `makeWorldBg()`, les tuiles dans `makeTiles()`.
- `BOSSES` : un boss par monde avec `kind` (clé de `BOSS_KINDS`), `name`, `hp`, couleurs et options (`fast`, `spread`, `lasers`).

**Entités**
- Joueurs : `players` (liste ; un seul joueur pour l'instant, la coop en ajoutera). `makePlayer(C, input, idx)` crée un joueur avec son personnage `C`, ses commandes `input` (au format de `K`), ses cœurs `hp` et sa jauge de pouvoir `gauge`. `players[0]` (`player1()`) est le joueur principal : HUD, menus. Les fonctions de joueur prennent le joueur en paramètre : `updatePlayer(p, dt)`, `hurtPlayer(p, srcX)`, `drawPlayer(p)`, `hitEnemy(e, src, p)`. Les ennemis visent `targetOf(e)` (joueur vivant le plus proche) et blessent au contact via `touchPlayers(e, srcX)`. La salle recommence quand `allDead()`.
- Joueur : boîte de collision 10×32. Saut à 450 px/s (hauteur ≈ 67 px, soit un peu plus de 4 tuiles), gravité 1500. Lune a un double saut, Hélio un dash (`dashT`, `dashCd`).
- Ennemis dans `enemies`, décrits par les fiches `ENEMIES` : `walker` (W), `shooter` (S, laser après un temps de visée), `drone` (D, vole vers le joueur). Champs d'une fiche : `letter` (caractère des cartes), `w`, `h`, `spawn(c, r, fiche)` (position d'apparition, `ground` = posé sur le sol), `update(e, p, dt)`, `draw(e)`, `defeat` (clé de `DEFEATS` : effet de disparition, étincelles et boulons pour les robots). `makeEnemy(type, x, y)` crée un ennemi. Un nouvel ennemi (singe, monstre, ninja…) = une fiche, sa lettre dans `GROUND_ENEMIES` de `worlds.py` et `GROUND` de `verifier_niveaux.py` s'il marche au sol, et un effet de défaite sans violence. Les drones de la mère-drone ont `minion: true`.
- `lasers` : tirs ennemis renvoyables au sabre (deviennent `owner: "player"`). Les ondes de choc des boss ont `kind: "wave"` et ne se renvoient pas.
- `pickups` : cœurs à ramasser (absents en mode Doom).
- Dégâts : `hitEnemy(e, source)` tue un ennemi normal ; un boss perd 1 PV par coup de sabre ou dash (une seule fois par attaque) et 2 PV par laser renvoyé. `checkDoor()` ouvre la sortie quand tout est détruit.
- Pouvoirs : chaque joueur a sa jauge `p.gauge` et `p.powerOn`. `setTimeFx(slow, fast)` applique les effets globaux : ralenti (`slowOn`, le temps du jeu passe à 0,35 pour tous) et super vitesse (`fastOn`, son et effets d'écran ; le joueur concerné va ×1,75 avec images fantômes `ghosts`).

**Boss** (`updateBoss`) : intro de 1,8 s, puis le mode d'attaque en cours. `BOSS_MODES` décrit chaque mode (`flying`, `update`, `start` après l'intro, `enter` en cours de combat, `actions` avant de changer, phrase `say`) : `brute` (télégraphe, charge, étourdi contre un mur, saut avec ondes de choc), `canon` (vole entre 6 positions `canonSpots()`, alignées sur les plateformes des arènes, vise puis tire des rafales), `mother` (survole, lâche des drones, plonge vers le joueur). `BOSS_KINDS` donne la taille et la suite de modes de chaque type : `final` (Dr. Boulon) enchaîne les trois. Un nouveau boss = une entrée dans `BOSSES`, et si besoin un nouveau kind ou mode (et son dessin dans `drawBoss`).

**Options** (`OPT`, sauvegardé dans `lunelio-options`) : `music`, `sfx`, `voice`, `buddy` (mode copain, ignoré en Doom via `buddyOn()`), `rumble`, `kb` (codes clavier par action, défauts `KB_DEFAULT`), `pad` (indices de boutons par action, défauts `PAD_DEFAULT`), `labels` (nom affiché des touches choisies). `loadOptions()` valide tout ce qui est relu. Écrans dans la section « Écran des options » : `OPT_ROWS`, `keysRows()`, `assign()` (une touche prise à une autre action lui est retirée). Touches réservées : `KB_RESERVED`.

**Voix** (objet `voice`) : `voice.say(texte, couper)` lit un texte en français avec `speechSynthesis` si `OPT.voice` ; `speakable()` remplace les symboles (▲, ⚔, flèches…) par des mots. `speakRoom()` est appelé par `loadLevel()` à l'arrivée dans une nouvelle salle (pas quand on la recommence). `roomHints()` donne les consignes de la salle, pour l'affichage et la voix. Vibration : `rumble(ms, fort, faible)`.

**Entrées** : `K` regroupe les touches par action (`up`, `down`, `ok` pour les menus, fixes). Les actions de jeu (`left`, `right`, `jump`, `drop`, `attack`, `special`, `power`) sont reconstruites par `rebuildK()` à partir de `OPT.kb`, plus la souris, le tactile et les touches virtuelles de manette. Les codes clavier sont des codes physiques (`e.code`), donc `KeyW`/`KeyA`/`KeyS`/`KeyD` correspondent à ZQSD sur un clavier AZERTY. Les commandes tactiles produisent des touches virtuelles (`TLeft`, `TRight`, `TDown`, `TJump`, `TAtk`, `TSpec`, `TPow`, `TPause`). Elles ne s'affichent que sur appareil tactile (`TOUCH`, classe `touch` sur `body`) et seulement en jeu (classe `playing`, gérée par `syncTouchUI()`). Sur tactile, toucher le canvas en jeu n'attaque pas : seuls les boutons comptent. En mode portrait, un écran demande de tourner l'appareil.

**Manettes** (Gamepad API, disposition `standard`) : `readPads()` est appelé au début de chaque image et produit des touches virtuelles : `GLeft`, `GRight`, `GUp`, `GDown`, `GA`, `GB`, `GX`, `GY`, `GStart`, `GSelect` (les boutons eux-mêmes, pour les menus) et `GJump`, `GAtk`, `GSpec`, `GPower` (les boutons choisis dans `OPT.pad`, pour le jeu). `padRaw`/`padRawPrev` gardent l'état brut des boutons pour le choix d'un nouveau bouton. Correspondance de base : A/✕ saut et valider, B/○ dash et retour, X/□ et Y/△ coup, toutes les gâchettes pouvoir, Start/Options pause, Select/Share recommencer, Y/△ ouvre les options depuis le menu. La première manette sur laquelle on appuie est retenue (`padIdx`) ; les autres sont ignorées, en attendant la coop. `padStyle` (`xbox` ou `ps`, d'après l'identifiant) choisit les noms de boutons de `PAD_LABELS`. `PAD` vaut `true` dès qu'une manette sert (classe `pad` sur `body`, qui masque les boutons tactiles) et repasse à `false` au clavier, à la souris ou au toucher. Pause et fin de monde ont une sélection à la croix (`pauseSel`, `wcSel`), affichée seulement en mode manette. Débrancher la manette en jeu met en pause. Une pression de manette ne compte pas comme interaction pour le son : `audio.init()` n'est appelé que si la page a déjà eu un clic ou une touche, et le menu affiche « Clic : activer le son » sinon.

**Audio** (objet `audio`, Web Audio)
- Bruitages fichiers : `attack.mp3` (coup de sabre), `laser.mp3` (tir ennemi), `gameover.mp3` (mort). Les autres bruitages sont synthétisés dans `audio.sfx()`.
- Musiques détectées au démarrage par `audio.discover()` (requêtes `HEAD`) : `backgroundhelio`, `backgroundhelio2`… jusqu'à 9, idem `backgroundlune`, `doombackground`, `bossbackground`. Les numéros doivent se suivre.
- Listes détectées (`MUSIC_BASES`) : `char:<id>` pour chaque personnage (champ `music`), `doom`, `boss`, et les musiques déclarées par les mondes (`music`, `bossMusic` dans `worlds.py`).
- `musicKey()` choisit la piste. En salle : `bossMusic` du monde en salle de boss, puis `music` du monde (une piste par salle, hors Doom), puis `bossbackground` en salle de boss, puis Doom ou la liste du personnage (une piste différente par monde). Une liste absente ou vide est sautée, jamais d'erreur. Chargement à la demande, fondu enchaîné.
- Le contexte audio ne démarre qu'après une interaction (touche, clic ou toucher) : appeler `audio.init()` dans tout nouveau gestionnaire d'entrée.

**Appli installable (PWA)** : `manifest.json` et `icons/` à la racine, service worker `sw.js` enregistré à la fin du script (mode `files` seulement). `build.py` écrit `sw.js` depuis `src/sw.js` avec `VERSION` (empreinte du jeu, du service worker, des icônes et de la liste des sons) et `AUDIO_FILES` (les `.mp3` de `audio/`). Toute nouvelle version change donc `sw.js`, que le navigateur installe tout seul (`skipWaiting` + `clients.claim`), en supprimant l'ancien cache `lunelio-jeu-…`. Stratégies : réseau d'abord pour le jeu (cache seulement hors ligne ou si le serveur ne répond pas en 4 s) ; sons dans le cache `lunelio-audio`, rafraîchis en arrière-plan ; requêtes `HEAD` de `audio.discover()` répondues depuis le cache hors ligne. Un fichier ajouté au jeu et nécessaire hors ligne doit être ajouté à `GAME_FILES` dans `src/sw.js`.

**Sauvegardes** (`localStorage`, toujours dans un `try/catch`) : `lunelio-progress-<perso>` (nombre de mondes débloqués), `lunelio-best-<perso>-<difficulté>-<monde>` (meilleur temps) et `lunelio-options` (réglages). **Maj + D** sur l'écran des mondes débloque tout (astuce parent).

## Écrire des salles (`src/worlds.py`)

Chaque salle fait 30 colonnes × 17 lignes ; la ligne 0 et les lignes 15–16 sont ajoutées par `room()`, on écrit donc les lignes 1 à 14.

| Caractère | Sens |
| --- | --- |
| `#` | mur ou sol plein |
| `-` | plateforme traversable par en dessous (↓ pour descendre) |
| `P` | départ du joueur |
| `E` | porte de sortie (posée sur le sol) |
| `W` / `S` / `D` | robot marcheur / robot-canon / drone |
| `B` | boss du monde |
| `H` | cœur à ramasser |
| minuscules | décors propres à chaque monde (voir `PROPS` dans le template) |

Aides : `row({colonne: "X", (début, fin): "-"})` construit une ligne de 30 cases ; `arena(kind, nom, décors)` génère une salle de boss avec la disposition attendue par ce type de boss.

Règles de conception :
- Écart vertical entre deux surfaces où l'on se tient : **3 tuiles (48 px) maximum**, pour qu'un saut simple suffise. Ne jamais rendre une salle obligatoirement dépendante du double saut ou du dash, puisque les deux personnages doivent pouvoir la finir.
- Pas de trou mortel dans le sol.
- Un saut ne doit pas buter sous un bloc plein pour atteindre une plateforme : laisser un passage sur le côté.
- Difficulté progressive au fil des mondes ; les premières salles d'un monde introduisent la nouveauté.
- Lancer `worlds.py` puis `verifier_niveaux.py` après chaque modification.

Ennemis au sol : leurs lettres sont dans `GROUND_ENEMIES` (doivent être posés sur `#` ou `-`). Musiques facultatives d'un monde : `music="nom"` et `bossMusic="nom"` dans le `dict` du monde.

Mondes et décors disponibles : `bar`, `immeuble`, `ruelle` (extérieur), `cinema` (option `screen=True` pour le grand écran), `avion` (option `windows=[y, …]` pour les hublots), `parking`, `metro` (option `wagon=True` pour l'intérieur d'une rame), `labo`. Un nouveau monde demande une entrée dans `WORLD_STYLE`, `BG`, `PROPS` et `BOSSES`, un cas dans `makeTiles()` si besoin, et sa vignette sur l'écran de choix des mondes se place toute seule (pages de 4 × 2, `WPAGE`).

## Style visuel

Néon synthwave : fonds sombres violets et bleu nuit, lueurs colorées, contours sombres `#0e0a1a` autour des sprites. Dualité des personnages : **Hélio = soleil** (or, orange, coucher de soleil), **Lune = nuit** (violet, rose). Police « Pixelify Sans ». Le décor doit rester plus sombre et moins contrasté que les éléments jouables, pour que plateformes, robots et lasers restent toujours lisibles.

## Feuille de route

Validées par le parent, dans cet ordre conseillé :

1. ~~Support des manettes (Gamepad API), en plus du clavier et du tactile.~~ Fait.
2. ~~Installation comme une appli (PWA) : manifeste, icônes, service worker pour jouer hors ligne.~~ Fait (actif seulement en HTTPS).
   - ~~Options : musique, bruitages, voix qui lit les consignes, mode copain, vibration de la manette, choix des touches.~~ Fait.
   - Restructuration (branche `restructuration`) : personnages, ennemis et boss en fiches, liste de joueurs, musiques par monde, pages de mondes.
3. Éditeur de niveaux dans le jeu : poser tuiles, robots, cœurs, départ et sortie, tester, sauvegarder dans `localStorage`, et pouvoir partager une salle (code texte).
4. Coop à deux sur le même écran (Hélio et Lune ensemble).
5. Étoiles cachées dans les salles, médailles chrono bronze/argent/or, costumes et succès à débloquer.
6. Mode boss rush.
7. Tableau des scores familial et sauvegarde partagée entre appareils via le serveur LXC (petit service à ajouter à côté de Nginx).
8. Minuteur de temps de jeu et statistiques dans un menu parent protégé.
9. Nouveaux ennemis (robot à bouclier, téléporteur), pièges, et une petite histoire autour du Dr. Boulon.
10. Rejeu accéléré de la salle en fin de niveau.

Pour chaque fonctionnalité : présenter d'abord un plan court, puis l'implémenter, mettre à jour le README (commandes, contenu) et ce fichier si l'architecture change.
