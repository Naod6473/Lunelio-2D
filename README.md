# Lunelio

Jeu d'action en pixel art néon, jouable dans le navigateur, sur ordinateur, tablette et téléphone. Hélio et Lune, deux ninjas au sabre lumineux, traversent huit mondes envahis par les robots du Dr. Boulon.

Le jeu se compose de `index.html` (code, sprites, logos et niveaux) et du dossier `audio/` (musiques et bruitages). Il doit être servi par un serveur web pour que les sons fonctionnent.

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

| Action | Clavier | Souris |
| --- | --- | --- |
| Se déplacer | Flèches ou ZQSD | |
| Sauter (deux fois pour le double saut de Lune) | Espace | |
| Trancher | J | Clic gauche |
| Dash d'Hélio | K | Clic droit |
| Super vitesse (Hélio) ou ralenti (Lune) | Maj ou L | |
| Descendre d'une plateforme | Flèche bas ou S | |
| Recommencer la salle | R | |
| Pause | Échap ou P | |
| Couper le son | M | |

Sur téléphone et tablette, des commandes tactiles apparaissent automatiquement : une croix à gauche, et à droite les boutons saut, coup, dash et pouvoir. Le jeu se joue en mode paysage.

Astuce parent : **Maj + D** sur l'écran de choix des mondes débloque tous les mondes.

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
- `worlds.py` : les 18 salles, dessinées en texte.
- `verifier_niveaux.py` : vérifie que chaque robot et chaque sortie sont atteignables.
- `generateur_sprites.py` : génère les planches de sprites d'Hélio et Lune.
- `assets/images/` : sprites et logos.

Pour reconstruire `index.html` après une modification (Python 3 suffit) :

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
