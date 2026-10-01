# Lunelio

Jeu d'action en pixel art néon, jouable dans le navigateur, sur ordinateur, tablette et téléphone. Huit héros au sabre lumineux voyagent d'époque en époque à bord d'une vieille machine à laver temporelle, à travers six mondes et 72 salles. L'ancienne aventure d'Hélio et Lune contre le Dr. Boulon reste jouable en monde bonus.

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

Les pouvoirs des six nouveaux héros sont une première proposition. Le dernier héros choisi est retenu, et la progression est enregistrée séparément pour chacun.

## Les mondes

| Monde | Boss |
| --- | --- |
| 1. Centrale électrique | Roi Slime électrique |
| 2. Usine robotique | Drone Titan |
| 3. Temple des ombres | Maître des ombres |
| 4. Volcan primordial | Colosse de lave |
| 5. Port pirate | Singe roi pirate |
| 6. Grotte néon | Reine chauve-souris néon |

Chaque monde compte onze salles puis une arène de boss à deux ou trois phases. Après chaque victoire, la machine à laver temporelle emporte le héros vers l'époque suivante. Un drapeau avant chaque boss garde la place, et on reprend un monde à la dernière salle atteinte. Les mondes se débloquent un par un.

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
| Entrer par une porte ou dans la machine | Flèche haut ou Z | | Haut ou A | Haut ou ✕ |
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

## Ajouter des musiques

Les musiques sont dans `audio/` et suivent une convention de nom. Le jeu détecte tout seul les fichiers présents, sans reconstruction :

| Fichiers | Utilisation |
| --- | --- |
| `backgroundhelio.mp3`, `backgroundhelio2.mp3`, `backgroundhelio3.mp3`… | Musiques d'Hélio |
| `backgroundlune.mp3`, `backgroundlune2.mp3`… | Musiques de Lune |
| `backgroundrobot.mp3`, `backgroundsinge.mp3`, `backgroundninja.mp3`, `backgroundrumi.mp3`, `backgroundsteve.mp3`, `backgroundhomme.mp3` (et leurs numéros 2, 3…) | Musiques des six nouveaux héros |
| `doombackground.mp3`, `doombackground2.mp3`… | Musiques du mode Doom |
| `bossbackground.mp3`, `bossbackground2.mp3`… | Musiques des combats de boss (facultatif) |
| `attack.mp3`, `laser.mp3`, `gameover.mp3` | Bruitages |

La première musique d'un héros est aussi son thème sur l'écran de choix. Tant qu'un nouveau héros n'a pas de fichier, le jeu joue un thème provisoire composé en WebAudio (même chose pour les boss sans `bossbackground.mp3`). Chaque monde prend une musique différente dans la liste du personnage, en boucle : avec deux musiques, les mondes 1, 3, 5, 7 jouent la première et les mondes 2, 4, 6, 8 la seconde. Les numéros doivent se suivre (2, 3, 4…), jusqu'à 9. Il suffit de déposer le fichier dans `audio/`, puis de faire `git add`, `git commit` et `git push` : le serveur se met à jour tout seul.

## Modifier le jeu

Les sources sont dans `src/` :

- `template.html` : le code du jeu (moteur, menus, effets, sons).
- `campagne.js` : le moteur de la nouvelle campagne (salles, ennemis, boss, pièges, portes, machine temporelle).
- `campagne.json` et `../assets/` : les 72 salles et les images préparées par `preparer_pack.py` à partir du pack graphique (`Lunelio_pack_complet/`, gardé hors de GitHub). À relancer seulement si le pack change (Pillow, numpy et scipy nécessaires) : `python3 preparer_pack.py`.
- `worlds.py` : les 32 salles de l'ancienne aventure, dessinées en texte.
- `verifier_niveaux.py` : vérifie que les sorties, les ennemis et les boss sont atteignables par un saut simple dans toutes les salles des deux aventures.
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

- Étoiles à collectionner, cachées dans chaque salle.
- Défis chrono avec médailles bronze, argent et or.
- Mode coop à deux.
- Costumes à débloquer pour Hélio et Lune.
- Rejeu de la salle en accéléré à la fin.
- Mode « boss rush » : tous les boss à la suite.
