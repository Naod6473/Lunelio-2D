# Lunelio

Jeu d'action en pixel art néon, jouable dans le navigateur, sur ordinateur, tablette et téléphone. Hélio et Lune, deux ninjas au sabre lumineux, traversent huit mondes envahis par les robots du Dr. Boulon.

Le jeu se compose de `index.html` (code, sprites, logos et niveaux) et du dossier `audio/` (musiques et bruitages). Il doit être servi par un serveur web pour que les sons fonctionnent. Il se joue au clavier, à la souris, au tactile ou à la manette, et peut s'installer comme une appli.

## Les personnages

- **Hélio**, le soleil : dash éclair qui traverse les robots, et super vitesse.
- **Lune**, la nuit : double saut, attaque plus large, et ralenti du temps.

## Les mondes

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

Chaque monde compte trois salles puis un combat de boss. Les mondes se débloquent un par un, et la progression est sauvegardée dans le navigateur, séparément pour chaque personnage. Des cœurs à ramasser sont cachés dans certaines salles.

## Difficultés

- **Facile** : 5 cœurs, robots lents, boss moins résistants.
- **Normal** : 3 cœurs.
- **Doom** : 1 cœur, robots et lasers rapides, pas de pouvoir, et une chute renvoie au début du monde.

## Commandes

| Action | Clavier | Souris | Manette Xbox | Manette PlayStation |
| --- | --- | --- | --- | --- |
| Se déplacer | Flèches ou ZQSD | | Stick gauche ou croix | Stick gauche ou croix |
| Sauter (deux fois pour le double saut de Lune) | Espace | | A | ✕ |
| Trancher | J | Clic gauche | X ou Y | □ ou △ |
| Dash d'Hélio | K | Clic droit | B | ○ |
| Super vitesse (Hélio) ou ralenti (Lune) | Maj ou L | | Gâchettes (LB, RB, LT, RT) | Gâchettes (L1, R1, L2, R2) |
| Descendre d'une plateforme | Flèche bas ou S | | Bas | Bas |
| Recommencer la salle | R | | Vue (Select) | Share / Create |
| Pause | Échap ou P | | Menu (Start) | Options |
| Couper le son | M | | | |

Dans les menus, la manette se pilote avec la croix ou le stick : **A / ✕** pour valider, **B / ○** pour revenir. Sur l'écran de pause et l'écran de fin de monde, la croix choisit le bouton et A / ✕ le valide. Dès qu'une manette est utilisée, les consignes à l'écran affichent ses boutons (lettres Xbox ou symboles PlayStation selon la manette détectée) ; une touche du clavier ou un toucher de l'écran remet les consignes habituelles.

Avec deux manettes branchées, c'est la première sur laquelle on appuie qui joue ; l'autre est ignorée. Si elle est débranchée en pleine partie, le jeu se met en pause. Les autres manettes (Switch Pro, 8BitDo…) fonctionnent avec la disposition Xbox. Le navigateur ne laisse démarrer le son qu'après un clic, un toucher ou une touche : si le menu affiche « Clic : activer le son », un clic dans le jeu suffit.

Sur téléphone et tablette, des commandes tactiles apparaissent automatiquement : une croix à gauche, et à droite les boutons saut, coup, dash et pouvoir. Le jeu se joue en mode paysage.

Astuce parent : **Maj + D** sur l'écran de choix des mondes débloque tous les mondes.

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
| `doombackground.mp3`, `doombackground2.mp3`… | Musiques du mode Doom |
| `bossbackground.mp3`, `bossbackground2.mp3`… | Musiques des combats de boss (facultatif) |
| `attack.mp3`, `laser.mp3`, `gameover.mp3` | Bruitages |

Chaque monde prend une musique différente dans la liste du personnage, en boucle : avec deux musiques, les mondes 1, 3, 5, 7 jouent la première et les mondes 2, 4, 6, 8 la seconde. Les numéros doivent se suivre (2, 3, 4…), jusqu'à 9. Il suffit de déposer le fichier dans `audio/`, puis de faire `git add`, `git commit` et `git push` : le serveur se met à jour tout seul.

## Modifier le jeu

Les sources sont dans `src/` :

- `template.html` : le code du jeu (moteur, menus, effets, sons).
- `worlds.py` : les 32 salles, dessinées en texte.
- `verifier_niveaux.py` : vérifie que chaque robot marcheur, chaque robot-canon et chaque sortie sont atteignables.
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
