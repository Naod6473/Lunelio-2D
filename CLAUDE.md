# Lunelio — guide pour Claude Code

Jeu d'action 2D en pixel art néon, jouable dans le navigateur (PC, tablette, téléphone). Projet familial : le jeu est fait pour deux enfants de **6 et 8 ans**, avec un mode Doom très difficile pour les parents. Hélio et Lune, inspirés des enfants, sont rejoints par six autres héros (robot, singe, ninja, Rumi, Steve, randonneur).

Deux aventures : la **nouvelle campagne** (6 mondes × 12 salles, issue du pack graphique, voir « Nouvelle campagne ») et l'**ancienne aventure** (8 mondes × 4 salles décrits en texte dans `worlds.py`), jouable comme « Monde bonus » depuis le choix des mondes. Entre deux mondes, le joueur revient à la **laverie** (hub jouable, voir « Laverie, collections et activités ») : la vieille machine à laver temporelle de Mme Bulle est le fil rouge de l'histoire.

Toute l'interface et tous les textes du jeu sont **en français**. Réponds-moi en français.

## Règles importantes

- **Public enfant** : pas de sang, pas de violence réaliste. Les robots explosent en étincelles et en boulons ; les créatures de la nouvelle campagne disparaissent en éclaboussure, fumée, étoiles ou poussière (`FOE_DEFEATS`). Ton positif, consignes courtes et simples, lisibles par un enfant de 6 ans.
- **Ne modifie pas l'apparence d'Hélio et Lune** (sprites, couleurs, tenues) sans me le demander.
- **Aucune photo réelle** des enfants dans le dépôt. Seuls les sprites pixel art et les logos y ont leur place.
- **Pas d'outillage lourd** : pas de npm, pas de bundler, pas de framework. Le jeu est du JavaScript vanilla dans un seul fichier HTML, construit par un script Python sans dépendance. Seul l'outil de préparation du pack (`preparer_pack.py`) utilise Pillow, numpy et scipy ; on ne le relance que si le pack change. Pas de bibliothèque externe chargée depuis internet (seule exception : la police Google Fonts « Pixelify Sans », avec police de secours).
- **`main` est en production** : le serveur de la maison se synchronise tout seul sur `main` toutes les 5 minutes. Pour un gros chantier, travaille sur une branche et ne fusionne qu'après validation.
- Avant tout commit : régénérer et vérifier (voir « Construire et tester »). `index.html` est commité car c'est lui que le serveur sert.

## Structure du dépôt

```
index.html               Jeu construit (généré par src/build.py, commité)
sw.js                    Service worker de l'appli (généré par src/build.py, commité)
manifest.json            Manifeste de l'appli installable (PWA)
icons/                   Icônes de l'appli (générées par src/generer_icones.py, commitées)
audio/                   Musiques (musique/…), jingles (jingles/) et bruitages (sfx/…), servis à côté de index.html (liste : docs/sons_a_fournir.md)
assets/laverie/          Planches de la laverie préparées par preparer_laverie.py (absentes tant que les images ne sont pas fournies)
assets/fonds/            Les 72 fonds de la nouvelle campagne (WebP 480 × 272, générés par preparer_pack.py, commités)
assets/sprites/          Planches recalées : personnages, ennemis, boss, effets, objets, portes, machine, HUD (générées, commitées)
src/template.html        Code source du jeu (HTML + CSS + JS) avec des marqueurs à remplacer
src/campagne.js          Moteur de la nouvelle campagne (salles en rectangles, ennemis, boss, pièges, portes, machine), inséré par build.py
src/registres.js         Registres à identifiants stables : cartes, badges, quêtes, cosmétiques, décorations, souvenirs, programmes de lavage, jukebox, dialogues
src/sauvegarde.js        Sauvegarde commune versionnée (lunelio-save), migration, conditions (testCond), événements (emit) et récompenses uniques (grant)
src/laverie.js           Laverie (hub) : scène, postes, clients, dialogues, prologue, réparations, fin ; rendu des cosmétiques
src/ecrans.js            Écrans de la laverie : Collections (cartes, badges, chaussettes), Vestiaire, Décoration, Jukebox, Souvenirs
src/defis.js             Programmes de lavage (défis) : écran de choix, règles en jeu, résultats
src/armes.js             Armes du râtelier : déblocage, coups et tirs, arme tenue en main, écran du râtelier
src/dahaka.js            Niveau secret « La course du Dahaka » : mot de passe, niveau sans fin fabriqué par morceaux, poursuite, record
src/campagne_ajouts.json Ajouts écrits à la main par-dessus les salles du pack : chaussettes, chaussettes dorées, objets de quête, plateformes et caisses en plus, cibles des défis
src/preparer_laverie.py  Découpe les images de src/assets/pack_laverie/ (fournies par le parent ; noms et grilles dans SPEC) en planches assets/laverie/ et écrit laverie.json (Pillow)
src/assets/pack_laverie/ Images sources de la laverie, des clients, des cartes et des cosmétiques (voir docs/prompt_sprites_chatgpt.md ; dossier non servi)
docs/                    Prompt de génération des sprites, liste des sons à fournir, décisions validées
src/campagne.json        Atlas (cadres, ancrages, animations) et 72 salles, écrit par preparer_pack.py (commité : le pack n'est pas dans Git)
src/preparer_pack.py     Découpe le pack graphique (../Lunelio_pack_complet, non commité) en planches et données pour le moteur
src/sw.js                Modèle du service worker (marqueurs __VERSION__, __AUDIO__ et __ASSETS__)
src/worlds.py            Les 8 mondes et 32 salles, décrits en texte ; valide et écrit worlds.json
src/verifier_niveaux.py  Vérifie que robots marcheurs, robots-canons et sortie sont atteignables (ancienne aventure), puis les 72 salles de la nouvelle campagne
src/build.py             Assemble index.html à partir du template, des images et des niveaux, et écrit sw.js
src/generateur_sprites.py  Génère les planches de sprites d'Hélio et Lune (Pillow)
src/generer_icones.py    Génère les icônes de icons/ à partir des sprites (Pillow) ; à relancer si les sprites changent
src/assets/images/       <id>_spritesheet.png et logo_<id>.webp de chaque personnage (tous intégrés par build.py)
deploy/                  Config Nginx et scripts pour le conteneur LXC
README.md                Présentation pour GitHub
```

`src/worlds.json` est généré et ignoré par Git. Le pack graphique source (`Lunelio_pack_complet/`, ≈ 190 Mo) et les sources des logos animés (`assets/Lunelio_logos_animes/`) restent hors de Git ; la planche de contrôle `apercu_atlas_planche.png` aussi. `preparer_pack.py` lit les deux et écrit les versions prêtes pour le jeu dans `assets/sprites/` (dont `logo_helio_anime.png` et `logo_lune_anime.png`, 4 images à 3 × leur taille d'affichage, durées dans `frameMs`).

## Construire et tester

```bash
cd src
python3 preparer_pack.py     # seulement si le pack graphique change : écrit ../assets/ et campagne.json
python3 preparer_laverie.py  # seulement si les images de src/assets/pack_laverie/ changent : écrit ../assets/laverie/ et laverie.json
python3 worlds.py            # valide les salles et écrit worlds.json
python3 verifier_niveaux.py  # chaque salle doit afficher OK (ancienne aventure puis nouvelle campagne, chaussettes et objets de quête compris)
python3 build.py             # écrit ../index.html (liste des sons de ../audio/ comprise) et ../sw.js : à relancer après tout ajout de son
python3 build.py --embed --out ../lunelio-autonome.html   # version tout-en-un, sons et images intégrés (≈ 6 Mo d'images en plus des sons), sans PWA
```

`build.py` est reproductible : relancé sans modification, `git status` doit rester propre (`index.html` et `sw.js` identiques).

Pour tester, servir la racine du dépôt avec un serveur HTTP : `python3 -m http.server 8000` puis ouvrir `http://localhost:8000`. En ouvrant `index.html` directement depuis le disque (`file://`), les sons ne se chargent pas.

Tests à faire après une modification de gameplay : plusieurs personnages (au moins un de chaque type de pouvoir touché), les trois difficultés, au moins une salle normale et une salle de boss, la laverie (un poste, un client), au clavier, en mode tactile (outils de développement du navigateur, émulation mobile en paysage) et à la manette si possible. La console ne doit afficher aucune erreur JavaScript (le jeu ne demande que les sons présents : aucun 404 attendu). Playwright et Chromium sont installés dans l'environnement cloud : un petit serveur Node et des scénarios `page.evaluate` permettent de tester les systèmes (voir l'historique des branches).

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

**Marqueurs remplacés par `build.py`** : `/*__CAMPAGNE_JS__*/` (les modules `JS_FILES` de `build.py`, dans l'ordre : `campagne.js`, `registres.js`, `sauvegarde.js`, `laverie.js`, `ecrans.js`, `defis.js`, `armes.js`, `dahaka.js`, insérés juste avant la section Menu), `__CAMPAGNE__` (campagne.json, plus les atlas de laverie.json), `__AJOUTS__` (campagne_ajouts.json), `__ASSET_EMBED__` (images en data URL, version autonome seulement), `__ASSET_VER__` (empreinte de chaque image, ajoutée en `?v=` à son adresse), `__SPRITES__` (objet `{id: data URL}` de toutes les planches `*_spritesheet.png` et de tous les logos `logo_*.webp` de `src/assets/images/`), `__WORLDS__` (JSON des mondes), `__AUDIO_MODE__` (`files` ou `embed`), `__AUDIO_LIST__` (sons présents, chemins relatifs à `audio/` sans `.mp3`), `__AUDIO_EMBED__` (dictionnaire de data URLs, vide en mode `files`), `__PWA_HEAD__` (liens vers le manifeste et les icônes, vide en mode `embed`). Ne pas les renommer sans adapter `build.py`.

**Rendu** : résolution logique 480×272 (`VW`, `VH`), dessinée sur un canvas 3× plus grand (`SC = 3`) avec `imageSmoothingEnabled = false`. Tuiles de 16 px (`T`), salles de 30×17 tuiles. Scanlines et vignette par-dessus tout (`scanCanvas`).

**Boucle et états** : `frame()` appelle `update…`/`draw…` selon `state` : `loading`, `menu` (titre et difficulté), `chars` (choix du héros), `worlds` (choix du monde : nouvelle campagne, ou ancienne aventure si `mode === "bonus"`), `play`, `pause`, `clear` (salle terminée, ancienne aventure), `worldclear`, `win`, `campwin` (« Retour à la maison », fin de la nouvelle campagne), `options`, `keys` (choix des touches), et les écrans de l'objet `SCREENS` (`{update(rdt), draw()}`) : `hub`, `hubmenu`, `album`, `wardrobe`, `deco`, `jukebox`, `memories`, `memview`, `chalsel`, `chalres`, `armory`, `dahaka`. `optFrom` (`menu`, `pause` ou `hub`) dit où revenir en quittant les options ; `charsFrom` (`menu` ou `hub`) pour le choix du héros. Parcours : menu → héros → laverie → machine → mondes. Les annonces de récompense (`toasts`) sont mises à jour et dessinées pour tous les états sauf le menu. Les entrées « appuyées cette image » (`pressed`) sont vidées à la fin de chaque image.

**Données principales**
- `DIFFS` : facile (5 cœurs), normal (3), doom (1). Champs : `eSpeed`, `laser`, `cd`, `tele`, `power`, `drain`, `regen`, `bossHp`.
- `CHARS` : fiches des 8 personnages. Champs : `id`, `name`, `desc` (phrase de l'écran de choix), `special` (clé de `SPECIALS` : `dash`, `doublejump`, ou `null`), `power` (clé de `POWERS`), `music` (nom de base des musiques dans `audio/` : `backgroundhelio` pour la plupart, `backgroundlune` pour Lune et Rumi), `logo` (logo animé du titre : `helio` ou `lune`), `theme` (boucle WebAudio de `SYNTH_THEMES` si aucun fichier n'existe), `unlock` (`null` = disponible), couleurs (`color`, `glow`, `ui`, `ui2`, ciel `sky`, `moon`, `stripe`, `stars`, `city`) et portée d'attaque `atkW`. Les sprites viennent de l'atlas `perso_<id>` (`drawChar(C, frame, x, y)` : x, y = milieu des pieds) ; Hélio et Lune ont chacun une planche complète 64 × 64 (pieds en 32, 60) préparée par `preparer_laverie.py` (`HEROES` : planche `perso_<id>_complet.png` et son découpage `.json`), avec, aux mêmes indices que l'ancienne, repos, course, coup, saut et dash au sabre, puis les poses mains libres pour les futures armes (`idle_free`, `run_free`, `jump_free`, `special_free`, `shoot`, `throw`, `heavy`). Une planche complète dans `laverie.json` remplace d'elle-même la planche d'origine. Portrait : atlas `portraits`. **Ne jamais tester l'identifiant d'un personnage dans le moteur** : passer par `specialOf(C)`, `powerOf(C)` ou un champ de la fiche.
- Pouvoirs (`POWERS`) : maintenus (`fast` Hélio, `slow` Lune, `shield` robot, `superjump` singe, `invisible` ninja) ou à coup unique avec `burst` = part de jauge dépensée et `effect` (`stun` Rumi, `block` Steve, `heal` randonneur, dans `burstPower()`). Les capacités des six nouveaux sont des propositions en attente de validation par le parent.
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
- Arborescence de `audio/` (détail et noms exacts : `docs/sons_a_fournir.md`) : `musique/heros|doom|laverie|mondes|boss|defis|histoire|quetes|bonus/`, `jingles/`, `sfx/joueur|pouvoirs|collecte|ennemis|boss|pieges|machine|laverie|interface|defis/`. `AUDIO_LIST` (écrite par `build.py`) dit quels fichiers existent : aucune requête de détection.
- Bruitages : `audio.sfx(nom)` joue le fichier de `SFX_FILES[nom]` (ou le jingle `JINGLES[nom]`, qui baisse la musique) s'il existe et qu'il est chargé, sinon le son synthétisé du `switch`. Tous les bruitages et jingles présents sont chargés à `audio.init()`. Variantes facultatives : `nom2.mp3`, `nom3.mp3`… à côté de `nom.mp3`, tirées au hasard (`soundAlts()`, `pickAlt()`), et chaque bruitage est joué avec une hauteur légèrement différente (± 6 %, jamais les jingles). `pickSfx(a, b)` : le fichier de a, sinon celui de b. Sons d'armes rangés pour le râtelier : `sfx/armes/<arme>-<son>.mp3` (noms `arme:<arme>-<son>`). Nouveaux noms : défaites par type (`def_robot`, `def_slime`…), `sock`, `quest_item`, `transform`, `boss_intro`, `sig_<boss>`, `talk_<pnj>`, `gust_warn`, `gust`, `tick`, `slip`, jingles `piece`, `repair`, `badge`, `card`…
- Listes de musiques (`MUSIC_BASES`, `audio.list(clé, base)` pour celles déclarées à la volée) : `base`, `base2`… tant que les numéros se suivent. `char:<id>` (`musique/heros/<music>`), `doom`, `boss` (`bossbackground`), `world:<monde>` (`musique/mondes/<short>`), `boss:<boss>` et `bossrage:<boss>` (dernière phase), `laverie`, `laverie_nuit`, `defis`, histoire, `bonus:<monde>` (ancienne aventure).
- `musicKey()` : `screenMusic()` (laverie.js) d'abord pour la laverie et ses écrans (piste du jukebox `SAVE.jukebox`, sinon `laverie`/`laverie_nuit`, sinon le héros), les souvenirs et la fin ; en salle de la campagne `campMusic()` (boss, sinon monde, sinon Doom ou héros) ; ancienne aventure : `bonus:<monde>`, puis boss, Doom ou héros. Une liste vide est sautée. Ambiance de la laverie : `audio.setAmbience()` (`sfx/laverie/ambiance`), coupée hors de la laverie.
- Le contexte audio ne démarre qu'après une interaction (touche, clic ou toucher) : appeler `audio.init()` dans tout nouveau gestionnaire d'entrée.

**Appli installable (PWA)** : `manifest.json` et `icons/` à la racine, service worker `sw.js` enregistré à la fin du script (mode `files` seulement). `build.py` écrit `sw.js` depuis `src/sw.js` avec `VERSION` (empreinte du jeu, du service worker, des icônes et de la liste des sons), `AUDIO_FILES` (les `.mp3` de `audio/` et de ses sous-dossiers) et `ASSET_URLS` (images de `assets/`, y compris `assets/laverie/`). Toute nouvelle version change donc `sw.js`, que le navigateur installe tout seul (`skipWaiting` + `clients.claim`), en supprimant l'ancien cache `lunelio-jeu-…`. Stratégies : réseau d'abord pour le jeu (cache seulement hors ligne ou si le serveur ne répond pas en 4 s) ; sons dans le cache `lunelio-audio`, rafraîchis en arrière-plan ; requêtes `HEAD` de `audio.discover()` répondues depuis le cache hors ligne. Un fichier ajouté au jeu et nécessaire hors ligne doit être ajouté à `GAME_FILES` dans `src/sw.js`.

**Sauvegarde** (`sauvegarde.js`, `localStorage` toujours dans un `try/catch`) : une seule sauvegarde **commune à tous les héros**, `lunelio-save` (`SAVE`, version 3) : `camp` (`done` mondes terminés, `resume` salle de reprise par monde, `rooms` salles terminées, `visited`), `bonus.done` (ancienne aventure), `best` (`camp|diff|monde`, `bonus|diff|monde`), `socks` et `gold` (chaussettes), `seen` (ennemis, boss, phases vues, héros utilisés, clients rencontrés), `flags`, `got` (registre des récompenses données), `quests`, `chal` (défis réussis et records par difficulté), `memSeen`, `repaired`, `cos` (équipement par héros, machine, décoration de la laverie), `weapons` (armes possédées et arme de chaque héros), `dahaka.best` (record du niveau secret par difficulté), `jukebox`, `lastChar`. Les réglages restent dans `lunelio-options`. `loadGame()` relit ou crée la sauvegarde ; sans `lunelio-save`, `migrateOld()` fusionne les anciennes clés `lunelio-v2-…`, `lunelio-progress-…`, `lunelio-best-…` (le meilleur de chaque héros), sans les effacer. Accès : `campProgress()`, `campResume()`, `setCampResume()`, `campBest()`, `getProgress()`, `getBest()`, `setBest()`. « Effacer la partie » dans les options (depuis le titre) appelle `resetGame()`. **Maj + D** sur l'écran des mondes débloque tout (astuce parent).

## Nouvelle campagne (`src/campagne.js`, `src/campagne.json`)

**Préparation du pack** (`preparer_pack.py`) : chaque planche est décrite par ses lignes et colonnes ; les lignes sont trouvées dans les zones vides, chaque tache de pixels est rattachée à la case de son centre (armes, ailes et étincelles comprises), une tache trop large est coupée à la colonne la plus vide. Les poses sont réduites (moyenne de blocs, alpha net) puis recalées sur un ancrage stable (`feet`, `mass`, `center`, `bottom`) dans des cases régulières. Atlas : `{src, cw, ch, ax, ay, cols, anims: {nom: [première image, nombre]}, boxes}`. Les personnages gardent la disposition d'Hélio (repos 0–3, course 6–11, attaque 12–16, saut 18–19, spécial 24–25 ou 24–27). Tailles : personnages ≈ 38 px, boss ≈ 52–68 px, portes 48 × 33, machine ≈ 61 × 64. Les fonds sont réduits en 480 × 272 (WebP).

**Salles** : rectangles en pixels logiques, repris tels quels des JSON du pack (`objects`, champ `r` = [x, y, w, h]). `buildRoom()` les range : `solids` (sol `solid`), `plats` (`one_way_top`), `hazards`, `dest` (destructibles), `items`, `ckpt`, `exits`, `machine` (position de mise en scène), apparitions. Les collisions ne viennent jamais du fond. `lvl.json` vaut `true` dans une salle de la campagne : `solidAt`, `moveBody` (→ `moveBodyJ`), `onOneWay`, `supportAt` choisissent la bonne version. Le sol est pré-rendu par `makeTerrain()` à partir de l'atlas `terrain_<monde>` (bords seulement au bord d'un trou).

**Ennemis** (`FOES`, `updateFoe`) : `type: "foe"` dans `enemies`. Variantes : chaque ennemi (campagne et ancienne aventure) reçoit `e.var = foeVariant(clé)` (graine : salle et place de l'ennemi, donc stable quand on recommence) : nuance proche (`FOE_VARIANTS`, planche recolorée par `recolor()` ou `shiftHex()` pour les robots dessinés par le code) et effet visuel éventuel (`FOE_EFFECTS` : aura, scintille, ombre, éclat, dessiné par `drawFoeFx()`). Apparence seulement. Les robots de l'ancienne aventure utilisent les planches `robot_marcheur`, `robot_canon`, `drone_ancien` si elles existent (`drawOldSprite()`). Comportements et attaques lus dans les JSON (`behavior`, `patrolBounds`, `activation.delaySeconds`, `attack` : portée, anticipation, durée, récupération). Au plus `MAX_ATTACKERS` (2) en train d'attaquer en même temps. Les planches regardent vers la droite.

**Boss** (`BIG`, `updateBig`, `damageBig`) : `type: "bigboss"`, une suite d'actions par phase (`moves`), seuils de phase du JSON (`phaseThresholds`, sinon 65 % / 30 %, 50 % pour le singe). P2 : enchaînements plus longs et signes de dégradation (fumée, étincelles) ; dernière phase : l'action `tired` (le boss s'essouffle 1,6 s, sans blesser au contact : l'ouverture pour frapper). `ARENA_FX` / `drawArenaFx()` : réaction visuelle du décor par monde à partir de P2 (jamais de nouveau danger). `BOSS_PHASE_SAY` : annonce des phases. Transformation 0,8 s invulnérable ; mort : animation `death` (P1, P2) ou disparition de la pose P3 ; pendant la défaite du joueur, pose `victory` du boss. Les flaques de l'arène du Roi Slime suivent `updateArena()` (jamais les deux à la fois, alternées en P3, la flaque gauche coupée si le générateur est détruit).

**Ajouts** (`campagne_ajouts.json`, lu par `addRoomExtras()` dans `buildRoom()`) : plateformes et caisses en plus, la chaussette de la salle (`lvl.sock` : cachée dans une caisse, derrière un décor, sous un rideau `lvl.covers` qui s'efface quand on y entre, ou après le boss), chaussettes dorées (`lvl.gold`, `requires` : capacités qui permettent de les atteindre), objets de quête (`lvl.qitems`, seulement pendant la quête). `verifier_niveaux.py` contrôle tout. Pour ajouter une chaussette ou un secret : modifier ce fichier, pas le pack.

**Portes et machine** : dans une salle normale (hors programmes de lavage), la porte est verrouillée tant qu'il reste des ennemis (`foeLock`, cadenas et lueur rouge ; `updateDoorLocks()` l'ouvre au dernier ennemi : étincelles, son `unlock`, « Sortie ouverte ! » ; devant une porte verrouillée, Haut la fait trembler et dit combien il en reste). Les drones trop hauts descendent à hauteur de saut quand le héros passe dessous (`dipT`), et `verifier_niveaux.py` vérifie qu'une surface atteinte se trouve sous chaque ennemi volant. `campTryInteract()` (haut, ou ▲ en tactile, devant une porte : pas de saut) ; porte fermée → entrouverte → ouverte (0,15 s chacune), un seul départ grâce à `lvl.leaving`. Boss vaincu → `campVictory()` (pièce de la machine, monde terminé `emit("worldDone")`, chaussette d'après-boss, ouverture) ; centrale : la sortie est la machine ; autres mondes : porte puis machine à `lvl.machine`. Machine : `mach.st` = `activating → ready → entering → departing → loading` (un seul `campNextWorld()` grâce à `mach.started`), puis retour à la laverie (`enterHub({ arrive: true })`) : réparation de la pièce, souvenir, et à la fin la scène « Retour à la maison ». Tout avance avec le temps du jeu (la pause arrête la cinématique). `MACH_HOLE` : centre et rayon du hublot, réglés à l'œil.

**Reprise** : la salle de reprise est mise à jour à chaque salle et au drapeau ; en quittant par la pause, on reprend la salle en cours (en Doom : au drapeau, sinon au début du monde), et l'écran de pause l'annonce (`resumeInfo()`). Meilleur temps : seulement si le monde est fait d'une traite. Doom : une chute renvoie au début du monde, ou au drapeau s'il a été touché.

**Ajouter une salle ou un monde** : modifier le pack (JSON de placement, fond), relancer `preparer_pack.py`, `verifier_niveaux.py`, `build.py`. Pour corriger un passage sans toucher au pack, modifier le JSON du pack et le documenter.

## Laverie, collections et activités

Toutes les définitions sont dans `registres.js`, avec des identifiants stables (jamais renommés : la sauvegarde s'en sert) : `PIECES` (pièce de la machine par monde), `NPCS`, `STORY` (prologue, réparations, fin, phrases de Mme Bulle), `CARDS` (catégories `pnj`, `heros`, `monstres`, `boss` ; filtre `world`), `BADGES`, `COSMETICS` (slots `acc`, `pal`, `fx`, `machine`), `DECOR` (slots `tile`, `light`, `sign`, `item`) et `SHOWCASE`, `SOCK_TIERS`, `MEMORIES`, `PROGRAMS` et `CHALLENGES`, `QUESTS`, `TRACKS`, `WORLD_MECHANICS` (point d'extension pour les mécaniques des prochaines salles, vide). Les conditions sont des données (`{ boss: id }`, `{ socks: n }`, `{ quest: id }`…, liste en tête de `registres.js`) lues par `testCond()`.

**Récompenses** : le jeu signale un fait avec `emit(type, données)` (`sock`, `gold`, `foe`, `oldFoe`, `phase`, `boss`, `oldBoss`, `roomDone`, `worldDone`, `bonusDone`, `visit`, `met`, `questItem`, `challenge`) ; `checkUnlocks()` donne alors, une seule fois (`grant(clé)`, registre `SAVE.got`), tout ce dont la condition est devenue vraie, et annonce chaque nouveauté (`toast`). Une collecte, un rechargement ou une relecture ne redonne jamais rien.

**Laverie** (`laverie.js`) : trois pièces `HUB_ROOMS` (`salle` 816 px de large, `chaussettes` et `trophees` 680 px ; décor fourni, hauteur du sol, plateformes, portes). `enterHub(opts)` (`opts.room`, `opts.x`) puis `hubSetRoom()` construisent la pièce (`lvl.width` : la physique et `rectSolidAt` acceptent les pièces plus larges que l'écran) ; la caméra `hub.cam` suit le héros (dessin décalé, clics convertis en coordonnées de la pièce). Portes : `hubGo()`, fondu, arrivée devant la porte du retour. `STATIONS` (postes avec leur pièce, `fy` hauteur des pieds pour s'en servir, `art` s'il fait partie du décor fourni, `need` condition pour s'allumer) et les clients des quêtes apparues (`hubNpcs()`). On utilise le plus proche, à la bonne hauteur, avec Haut / ▲ / {JUMP} ou en cliquant / touchant dessus. File d'attente `hub.queue` à l'arrivée : prologue, réparation de chaque pièce non encore montrée, souvenir, fin. Dialogues : `startDialog(lignes, fin)` (avancer, passer avec Échap ; voix si l'option est active). Dessins provisoires par le code ; chaque image de `assets/laverie/` (préparée par `preparer_laverie.py`) les remplace dès qu'elle existe (`hasAtlas()`).

**Quêtes** : `QUESTS` (apparition, intro, objectif `items` ou `challenge`, outro, récompenses, phrases d'après qui évoluent). État dans `SAVE.quests[id].st` : `active` → `ready` (objectif atteint, `updateQuests()`) → `done` (récompenses données en parlant au client). Un nouveau client = une entrée dans `NPCS` et `QUESTS`, et ses objets dans `campagne_ajouts.json`.

**Programmes de lavage** (`defis.js`) : `chal` vaut le défi en cours. Les salles sont reconstruites (`buildRoom`), la progression et les chaussettes ne bougent pas. Règles : chronomètre (`limit`), `chalHurt()` (Délicat), bourrasques annoncées (`gust` : calme → annonce → poussée), adhérence (`grip`, via `chalGrip()` dans `updatePlayer`), cible cachée (`challengeTargets`, `hints`). Tout avance avec le temps du jeu (pause comprise). Fin : `chalEnd()` (récompense à la première réussite, record par difficulté), écran `chalres` (recommencer ou laverie).

**Armes** (`armes.js`, registre `WEAPONS` dans `registres.js`, possession et choix par héros dans `SAVE.weapons` : `owned`, `eq`) : le sabre est l'arme de départ ; `newSave()` en donne deux au hasard (`randomWeapons`), puis `weaponReward()` une de plus après chaque boss (`emit("boss")`, `emit("oldBoss")`) ; une partie d'avant le râtelier en reçoit une par boss déjà vaincu (`flags.armes`). Seuls les héros dont la planche a les poses mains libres peuvent en changer (`canWield(C)`, jamais l'identifiant). `updateWeapon(p)` remplace le coup de sabre dans `updatePlayer` (même bouton ; maintenir : arc chargé, rayon laser) ; `playerFrame` passe alors par `weaponFrame` (poses `idle_free`, `shoot`, `throw`, `heavy`) et `drawHeldWeapon` dessine l'icône de `armes_icones.png` dans la main (`HAND` : position de la main par image, `POSE_ANGLE`, et pour chaque arme `a0`, `grip`, `len`, `carry`, `aim`). Les tirs sont dans `lasers` avec `wpn` (`updateWProj`, `drawWProj`) ; les dégâts passent par `hitEnemy(e, "proj", p, dégâts)`. Pas de tir dans la laverie. Râtelier : poste `ratelier` de la salle des chaussettes, écran `armory` ; image `ratelier.png` (fermé puis ouverture, comme le vestiaire). Sons `sfx/armes/<arme>-<son>.mp3` (`wsfx`, son synthétisé sinon).

**Trésors** (`TREASURES` dans `registres.js`, récompense `tres:<id>`, condition en données comme les cartes, dont `{ weapons: n }`) : 29 objets des planches `tresors_1` à `tresors_5` (une ligne par objet, 4 images en boucle, `drawTreasure()` ; silhouette tant qu'on ne l'a pas). Onglet « Trésors » de l'album (`ALB.tab` 3) et étagère murale de la salle des trophées (poste `etagere`, `SHOWCASE` ; image `etagere.png`, trésors posés sur ses 5 planches). `preparer_laverie.py` efface les petits morceaux d'objets voisins coupés au bord des cases (`drop_edge_bits`).

**Cosmétiques** (`laverie.js`) : `drawChar()` passe par `drawCharCos()` : couleurs (planche recolorée une fois et gardée en cache par `recolor()`), accessoire posé sur le haut de la tête (`headOf()` mesure l'image ; taille et position de chaque image de `accessoires.png` dans `ACC_FIT` : tête, yeux ou cou), traînée du sabre et couleur des effets (`fxCol(p)`, `drawSlash()`), couleur de la machine (`drawMachineSkin()`). Jamais d'effet sur les capacités. Hélio et Lune gardent leur apparence d'origine tant qu'aucun cosmétique n'est équipé.

**Niveau secret : la course du Dahaka** (`dahaka.js`, atlas `dahaka` : planche `dahaka.png` découpée par `prepare_dahaka()` de `preparer_laverie.py`, fenêtres qui se chevauchent et plus grande tache gardée ; animations `repos`, `course`, `attrape`, `apparait`, `disparait`). Mot de passe `DAHAKA` tapé sur l'écran des mondes (`typedBuf` garde les vraies lettres, AZERTY ou QWERTY ; `dahakaType()`), qui pose `SAVE.flags.dahaka` et ajoute la carte « Niveau secret » après le monde bonus (`SECRET_CARD()`). `startDahaka()` construit un `lvl` sans fin (`width` immense) fait de morceaux de 480 px (`dkChunk` : sol, 1 ou 2 trous, plateforme à 48 px au-dessus de tout trou de plus de 52 px, lames du sol annoncées), décor et terrain du Temple des ombres ; on garde les 4 derniers morceaux. Le Dahaka est invincible, court un peu moins vite que le héros (plus vite avec la distance) et revient à 260 px s'il est distancé ; il attrape le héros à moins de 22 px (`dkCaught`). Un trou ou une lame ne coûte pas de cœur : retour au dernier endroit sûr (`DK.safe`, loin d'un bord) et ralentissement. Score en mètres (16 px), record par difficulté dans `SAVE.dahaka.best`, écran de résultat (Rejouer, Laverie). Musique : `musique/bonus/dahaka`, sinon celle du Maître des ombres.

## Écrire des salles de l'ancienne aventure (`src/worlds.py`)

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

Validées par le parent, dans cet ordre conseillé (la nouvelle campagne de 72 salles, les huit héros, puis la laverie avec les collections, les quêtes, les programmes de lavage et les cosmétiques sont en cours de validation sur une branche ; images et sons définitifs attendus, voir `docs/`) :

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
