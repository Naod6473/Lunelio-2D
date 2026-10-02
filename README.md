# Lunelio

Jeu d'action en pixel art néon, jouable dans le navigateur, sur ordinateur, tablette et téléphone. Huit héros au sabre lumineux voyagent d'époque en époque à bord d'une vieille machine à laver temporelle, à travers six mondes et 72 salles. Entre deux mondes, on revient à la **laverie** de Mme Bulle : on y répare la machine, on range ses trouvailles, on aide des clients et on essaie des programmes de lavage. L'ancienne aventure d'Hélio et Lune contre le Dr. Boulon reste jouable en monde bonus.

Le jeu se compose de `index.html` (code et niveaux), du dossier `assets/` (fonds et sprites de la campagne) et du dossier `audio/` (musiques et bruitages). Il doit être servi par un serveur web pour que les sons et les images fonctionnent. Il se joue au clavier, à la souris, au tactile ou à la manette, et peut s'installer comme une appli.

## Les personnages

Chaque héros a un dash ou un double saut, et un pouvoir qui utilise la jauge.

- **Hélio**, le soleil : dash éclair qui traverse les ennemis, et super vitesse.
- **Lune**, la nuit : double saut, attaque plus large, et ralenti du temps.
- **Robot** : dash et bouclier d'énergie (plus aucun coup tant qu'on le maintient).
- **Singe** : dash et super saut.
- **Ninja** : dash et invisibilité (les ennemis ne le voient plus).
- **Rumi des Huntrix** : dash et chant magique qui endort les ennemis.
- **Steve** : dash et blocs à poser sous ses pieds pour grimper.
- **Randonneur** : dash et pique-nique qui rend un cœur.

Les pouvoirs des six nouveaux héros sont une première proposition. Le dernier héros choisi est retenu. La progression, les collections et les quêtes sont **communes à tous les héros** : on peut changer de héros au vestiaire de la laverie sans rien perdre. Le logo animé du titre suit le héros : celui d'Hélio pour la plupart, celui de Lune pour Lune et Rumi.

## Les mondes

| Monde | Boss |
| --- | --- |
| 1. Centrale électrique | Roi Slime électrique |
| 2. Usine robotique | Drone Titan |
| 3. Temple des ombres | Maître des ombres |
| 4. Volcan primordial | Colosse de lave |
| 5. Port pirate | Singe roi pirate |
| 6. Grotte néon | Reine chauve-souris néon |

Chaque monde compte onze salles puis une arène de boss à deux ou trois phases (le Singe roi pirate en a deux). Chaque boss garde une pièce de la machine : après la victoire, la machine ramène le héros à la laverie, où la pièce est remise en place et où se débloque un souvenir. Un drapeau avant chaque boss garde la place, et on reprend un monde à la dernière salle atteinte (en mode Doom : au drapeau, ou au début du monde). La pause permet de rentrer à la laverie et indique où l'on reprendra. Les mondes se débloquent un par un.

Les boss changent de comportement à chaque phase : en P1 ils attaquent posément pour qu'on apprenne leurs gestes ; en P2 ils accélèrent, enchaînent de nouvelles attaques et commencent à fumer ; en dernière phase ils se déchaînent, puis s'essoufflent : c'est le moment de frapper. Le décor de l'arène réagit (lumières, alarme, ombres, braises, pluie, cristaux), sans rien changer au parcours.

**Chaussettes puantes** : chaque salle cache une chaussette perdue (sur une plateforme en plus, derrière un décor, dans une caisse, au bout d'un détour, dans un recoin couvert qui s'éclaire quand on y entre, ou après le boss). Une chaussette trouvée le reste ; une fois trouvée, elle apparaît en transparence. Six chaussettes dorées se cachent tout en haut de certaines salles : il faut sauter plus haut (super saut du singe, double saut de Lune, blocs de Steve).

**Monde bonus — Ancienne aventure** : la dernière carte du choix des mondes ouvre l'ancienne aventure, avec sa propre progression et ses records :

| Monde | Boss |
| --- | --- |
| 1. Le bar | Le Videur |
| 2. L'immeuble | Le Directeur |
| 3. La ruelle | La Mère-Drone |
| 4. Le cinéma | Le Projectionniste |
| 5. L'avion | Le Pilote |
| 6. Le parking | Le Bulldozer |
| 7. Le métro | Le Contrôleur |
| 8. Le labo | Dr. Boulon |

Chaque monde de l'ancienne aventure compte trois salles puis un combat de boss. Des cœurs à ramasser sont cachés dans certaines salles.

## La laverie

La laverie est une zone sûre en trois pièces reliées par des portes : la grande salle (qui défile avec le héros), la salle des chaussettes et la salle des trophées. On s'y promène et on utilise chaque objet en se plaçant devant (Haut, ▲ en tactile, A à la manette) ou en cliquant / touchant dessus. Dans la grande salle, on grimpe sur le banc et les machines pour atteindre le jukebox.

- **Machine temporelle** (grande salle) : choix du monde (et du monde bonus). Ses six voyants montrent les pièces déjà réparées.
- **Salle des chaussettes** : le tas de chaussettes grandit avec la collection ; les machines à hublot magique lancent les programmes de lavage.
- **Salle des trophées** : chaque boss vaincu laisse son trophée dans la vitrine de son monde (elle ouvre sa carte) ; le portail montre les souvenirs, le présentoir les badges.
- **Vestiaire** : changer de héros et choisir sa tenue (accessoire de tête), ses couleurs (dont la variante brillante) et la couleur de son sabre. Les tenues changent l'apparence, jamais les capacités ; elles sont gardées pour chaque héros.
- **Collections** : l'album de cartes (clients, héros, monstres, boss ; filtres par catégorie et par lieu), les badges, et les chaussettes (compteur global, par monde, salle par salle, et paliers avec leurs récompenses). Les cartes de monstres donnent leurs faiblesses, celles des boss leurs phases vues.
- **Jukebox** : écouter les musiques découvertes ; une musique pas encore fournie est marquée « à venir ».
- **Souvenirs** : les six scènes de l'histoire de la machine, à revoir quand on veut.
- **Programmes de lavage** : cinq défis sur des salles déjà connues (Express : contre la montre ; Délicat : sans être touché ; Essorage : bourrasques annoncées ; Lavage à froid : sol gelé ; Chaussette solitaire : retrouver une chaussette avec des indices). Règles, réussite, échec, récompense et record sont affichés avant le départ ; les records sont gardés par difficulté.
- **Décoration** : couleur du sol, éclairage, enseigne, couleur de la machine et objets du coin détente. Les trophées, le tas de chaussettes et le présentoir à badges se remplissent tout seuls.
- **Mme Bulle et ses clients** : le robot Bobine (après l'usine), le ninja Kage (après le temple) et le capitaine Barbe-Mouillée (après le volcan) ont chacun une quête facultative, avec sa récompense (carte, tenue, décoration, musique). Ils restent ensuite dans la laverie et leurs phrases changent avec la progression.

Chaque récompense n'est donnée qu'une fois, même après un rechargement. Les images de la laverie, des clients et des cartes sont pour l'instant dessinées par le jeu (provisoires), en attendant les images définitives.

Les ennemis ont des variantes tirées au hasard : une nuance proche de leur couleur d'origine et parfois un petit effet (aura, scintillement, ombre, éclat). Seule l'apparence change ; une salle recommencée garde les mêmes ennemis.

## Difficultés

- **Facile** : 5 cœurs, robots lents, boss moins résistants.
- **Normal** : 3 cœurs.
- **Doom** : 1 cœur, ennemis et lasers rapides, pas de pouvoir, et une chute renvoie au début du monde (ou au drapeau avant le boss).

## Commandes

| Action | Clavier | Souris | Manette Xbox | Manette PlayStation |
| --- | --- | --- | --- | --- |
| Se déplacer | Flèches ou ZQSD | | Stick gauche ou croix | Stick gauche ou croix |
| Sauter (deux fois pour le double saut de Lune) | Espace | | A | ✕ |
| Trancher | J | Clic gauche | X ou Y | □ ou △ |
| Entrer par une porte ou dans la machine, utiliser un objet de la laverie | Flèche haut ou Z | Clic sur l'objet (laverie) | Haut ou A | Haut ou ✕ |
| Dash | K | Clic droit | B | ○ |
| Pouvoir du héros (maintenu ou en un coup) | Maj ou L | | Gâchettes (LB, RB, LT, RT) | Gâchettes (L1, R1, L2, R2) |
| Descendre d'une plateforme | Flèche bas ou S | | Bas | Bas |
| Recommencer la salle | R | | Vue (Select) | Share / Create |
| Pause | Échap ou P | | Menu (Start) | Options |
| Couper tout le son | M | | | |
| Options | O (menu et pause) | Bouton Options | Y | △ |

Dans les menus, la manette se pilote avec la croix ou le stick : **A / ✕** pour valider, **B / ○** pour revenir. Sur l'écran de pause et l'écran de fin de monde, la croix choisit le bouton et A / ✕ le valide. Dès qu'une manette est utilisée, les consignes à l'écran affichent ses boutons (lettres Xbox ou symboles PlayStation selon la manette détectée) ; une touche du clavier ou un toucher de l'écran remet les consignes habituelles.

Avec deux manettes branchées, c'est la première sur laquelle on appuie qui joue ; l'autre est ignorée. Si elle est débranchée en pleine partie, le jeu se met en pause. Les autres manettes (Switch Pro, 8BitDo…) fonctionnent avec la disposition Xbox. Le navigateur ne laisse démarrer le son qu'après un clic, un toucher ou une touche : si le menu affiche « Clic : activer le son », un clic dans le jeu suffit.

Sur téléphone et tablette, des commandes tactiles apparaissent automatiquement : une croix à gauche, et à droite les boutons saut (qui sert aussi à entrer par une porte), coup, dash et pouvoir. Le jeu se joue en mode paysage.

Astuce parent : **Maj + D** sur l'écran de choix des mondes débloque tous les mondes.

## Options

Le bouton **Options** du menu (ou de l'écran de pause) règle le jeu. Les choix restent enregistrés dans le navigateur.

- **Musique** et **Bruitages** : à couper séparément.
- **Voix** : une voix française lit les consignes de chaque salle, le nom du monde et du boss, et annonce l'ouverture de la porte. Elle utilise la synthèse vocale du navigateur (rien à télécharger) ; désactivée au départ.
- **Mode copain** : quand on n'a plus de cœurs, on repart sur place avec tous ses cœurs, sans recommencer la salle. Sans effet en mode Doom.
- **Vibration de la manette** : quand on est touché, qu'on perd ou qu'un boss tombe (si la manette et le navigateur le permettent).
- **Touches du clavier** et **Boutons de la manette** : choisir la touche ou le bouton de chaque action, avec un retour aux touches de base. Les consignes à l'écran suivent les touches choisies. Échap, P, R, M et O restent réservées au jeu ; à la manette, la croix et le stick servent toujours à se déplacer.
- **Effacer la partie** (depuis l'écran titre, deux appuis pour confirmer) : efface mondes, chaussettes, cartes, quêtes et décoration ; les réglages restent.

La partie est enregistrée dans le navigateur (`lunelio-save`). Les sauvegardes des versions précédentes sont reprises automatiquement à la première ouverture (le meilleur de chaque héros est gardé).

## Installer comme une appli

Lunelio peut s'installer sur l'écran d'accueil d'un téléphone ou d'une tablette, ou comme une application sur ordinateur, et se lancer en plein écran. Une fois ouvert une première fois, le jeu et ses sons restent sur l'appareil : on peut y jouer hors ligne.

- **Android (Chrome)** : menu ⋮, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- **iPhone et iPad (Safari)** : bouton Partager, puis « Sur l'écran d'accueil ».
- **Ordinateur (Chrome, Edge)** : icône d'installation à droite de la barre d'adresse.

Les mises à jour arrivent toutes seules : à chaque lancement avec du réseau, le jeu demande d'abord la dernière version au serveur, et ne se sert de la copie enregistrée que hors ligne. Il n'y a jamais de cache à vider.

**Important** : les navigateurs n'autorisent l'installation et le jeu hors ligne que sur une adresse en **HTTPS** (ou `localhost`). Sur `http://IP_DU_CONTENEUR`, le jeu fonctionne normalement, manettes comprises, mais sans installation ni mode hors ligne. Il faut pour cela un certificat devant Nginx, par exemple avec un proxy inverse qui gère HTTPS ou avec Tailscale (`tailscale serve`).

## Installation sur Proxmox (LXC Debian)

Dans un conteneur Debian, en root :

```bash
apt update && apt install -y curl
curl -fsSL https://raw.githubusercontent.com/Naod6473/Lunelio-2D/main/deploy/installer-lxc.sh | bash
```

Le script installe Nginx et Git, clone ce dépôt dans `/var/www/lunelio` et configure le site. Le jeu est ensuite accessible sur `http://IP_DU_CONTENEUR`.

Pour récupérer une nouvelle version après un `git push` :

```bash
/var/www/lunelio/deploy/mettre-a-jour.sh
```

## Ajouter des musiques et des bruitages

Les sons sont rangés dans `audio/` : `musique/` (héros, laverie, mondes, boss, défis, histoire, quêtes, ancienne aventure), `jingles/` et `sfx/` (joueur, pouvoirs, collecte, ennemis, boss, pièges, machine, laverie, interface, défis). La liste complète des fichiers attendus, avec leurs noms exacts et leur format, est dans [`docs/sons_a_fournir.md`](docs/sons_a_fournir.md).

- Chaque fichier est facultatif : s'il manque, le jeu garde son bruitage synthétisé ou sa musique de secours.
- Plusieurs versions d'une même musique : `centrale.mp3`, `centrale2.mp3`, `centrale3.mp3`… (les numéros doivent se suivre, jusqu'à 9).
- Après avoir déposé des sons, relancer `python3 build.py` (il écrit la liste des sons dans le jeu et dans le service worker), puis `git add`, `git commit` et `git push`.

En salle, le jeu joue la musique du boss (et sa version `_rage` en dernière phase), sinon celle du monde, sinon celle du mode Doom ou du héros. Dans la laverie : la piste choisie au jukebox, sinon la musique de la laverie.

## Ajouter les images de la laverie

Les images à générer (laverie, clients, cartes, badges, objets, accessoires, souvenirs) sont décrites dans [`docs/prompt_sprites_chatgpt.md`](docs/prompt_sprites_chatgpt.md), avec leur nom de fichier. Les déposer dans `src/assets/pack_laverie/`, puis :

```bash
cd src
python3 preparer_laverie.py -v   # découpe et réduit les images (Pillow), écrit ../assets/laverie/ et laverie.json
python3 build.py
```

Chaque image fournie remplace le dessin provisoire correspondant ; celles qui manquent sont listées.

## Modifier le jeu

Les sources sont dans `src/` :

- `template.html` : le code du jeu (moteur, menus, effets, sons).
- `campagne.js` : le moteur de la nouvelle campagne (salles, ennemis, boss, pièges, portes, machine temporelle).
- `registres.js` : les définitions (cartes, badges, quêtes, cosmétiques, décorations, souvenirs, programmes de lavage, musiques du jukebox, dialogues).
- `sauvegarde.js` : la sauvegarde commune, sa migration, les conditions et l'attribution unique des récompenses.
- `laverie.js`, `ecrans.js`, `defis.js` : la laverie, ses écrans et les programmes de lavage.
- `campagne_ajouts.json` : chaussettes, chaussettes dorées, objets de quête, plateformes et caisses ajoutées par-dessus les salles du pack.
- `preparer_laverie.py` : prépare les images de la laverie (voir plus haut).
- `campagne.json` et `../assets/` : les 72 salles et les images préparées par `preparer_pack.py` à partir du pack graphique (`Lunelio_pack_complet/`, gardé hors de GitHub). À relancer seulement si le pack change (Pillow, numpy et scipy nécessaires) : `python3 preparer_pack.py`.
- `worlds.py` : les 32 salles de l'ancienne aventure, dessinées en texte.
- `verifier_niveaux.py` : vérifie que les sorties, les ennemis, les boss, les 72 chaussettes et les objets de quête sont atteignables par un saut simple dans toutes les salles des deux aventures (et que les chaussettes dorées demandent bien un saut plus haut).
- `generateur_sprites.py` : génère les planches de sprites d'Hélio et Lune.
- `generer_icones.py` : génère les icônes de l'appli dans `icons/` à partir des sprites (Pillow nécessaire, à relancer seulement si les sprites changent).
- `sw.js` : modèle du service worker de l'appli ; `build.py` écrit le vrai `sw.js` à la racine.
- `assets/images/` : sprites et logos.

Pour reconstruire `index.html` et `sw.js` après une modification (Python 3 suffit) :

```bash
cd src
python3 worlds.py
python3 verifier_niveaux.py
python3 build.py
```

`python3 build.py --embed --out lunelio-autonome.html` produit une version en un seul fichier, sons compris, à ouvrir sans serveur (plus lourde).

### Légende des salles (`worlds.py`)

| Caractère | Signification |
| --- | --- |
| `#` | Mur ou sol plein |
| `-` | Plateforme qu'on peut traverser par en dessous |
| `P` | Départ du joueur |
| `E` | Porte de sortie |
| `W` | Robot marcheur |
| `S` | Robot-canon |
| `D` | Drone |
| `B` | Boss du monde |
| `H` | Cœur à ramasser |
| lettres minuscules | Décors propres à chaque monde (lampes, tabourets, voitures…) |

Chaque salle fait 30 colonnes sur 17 lignes. Les salles de boss sont générées par la fonction `arena()`, et `row()` permet d'écrire une ligne en ne donnant que les colonnes utiles.

## Idées pour la suite

- Mécaniques propres à chaque monde pour les prochaines séries de salles (point d'extension prévu : `WORLD_MECHANICS`).
- Nouveaux programmes de lavage et nouveaux clients (il suffit d'ajouter une entrée dans `registres.js`).
- Mode coop à deux.
- Rejeu de la salle en accéléré à la fin.
- Mode « boss rush » : tous les boss à la suite.
