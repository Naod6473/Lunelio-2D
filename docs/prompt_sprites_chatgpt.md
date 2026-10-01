# Sprites à générer avec ChatGPT — laverie, collections, cartes, cosmétiques

## Mode d'emploi

1. Ouvre une **nouvelle conversation** ChatGPT et colle le **bloc STYLE** ci-dessous en premier message.
2. Ensuite, envoie **une demande par message** (les blocs numérotés). Une image = un fichier.
3. Si le résultat n'est pas bon, redemande dans le même fil : « même chose, mais… ». ChatGPT garde mieux le style dans un même fil.
4. Télécharge chaque image en **PNG** et renomme-la avec le **nom de fichier indiqué** (colonne « Fichier »).
5. Dépose tout dans **`src/assets/pack_laverie/`**, avec les sous-dossiers indiqués, puis commite. Ce dossier n'est pas servi par Nginx. Je découpe, réduis et recale les images avec `preparer_pack.py`, comme pour le pack actuel.

Tu n'as pas besoin d'obtenir la taille exacte : ChatGPT génère en grand et je réduis. Ce qui compte :
- un **fond uni** (transparent, sinon magenta `#FF00FF` sans dégradé) ;
- des **cases régulières** pour les animations : toutes les images de la même taille, alignées sur une grille, le personnage au même endroit dans chaque case ;
- **aucun texte** dans l'image (je l'écris par le code) ;
- tout ce qui a une direction **regarde vers la droite**.

Les tailles « en jeu » sont en pixels logiques (l'écran fait 480 × 272).

Je dessine par le code, sans rien te demander :
- les couleurs de carrelage et d'éclairage ;
- les variantes brillantes des personnages ;
- les couleurs d'armes ;
- le texte de l'enseigne et des cartes ;
- l'état « déjà trouvée » des chaussettes ;
- les illustrations des robots et boss de l'ancienne aventure (provisoires, rendues depuis leurs dessins du jeu).

---

## Bloc STYLE (à coller en premier)

```
Tu vas m'aider à créer des sprites pour « Lunelio », un jeu de plateforme 2D pour enfants de 6 et 8 ans.

Style obligatoire pour TOUTES les images de cette conversation :
- Pixel art net, pixels carrés bien visibles, sans anti-crénelage, sans flou, sans dégradé lisse.
- Ambiance néon synthwave : violets, bleus nuit, roses, cyan, avec des lueurs colorées.
- Chaque objet ou personnage a un contour sombre de 1 pixel couleur #0e0a1a.
- Palette limitée (environ 16 à 24 couleurs par image), couleurs saturées pour les éléments importants.
- Ton mignon, drôle et rassurant : aucune violence, aucun sang, rien d'effrayant.
- Vue de profil (jeu de plateforme), lumière venant du haut.
- Fond uni TRANSPARENT (sinon magenta pur #FF00FF, parfaitement uni).
- Aucun texte, aucune lettre, aucun chiffre, aucune signature, aucun cadre décoratif autour de l'image.
- Pour les planches d'animation : grille régulière, toutes les cases de même taille, sujet centré au même endroit dans chaque case, pieds sur la même ligne, aucune bordure entre les cases.
- Les personnages et objets orientés regardent vers la DROITE.

Contexte du jeu : une vieille machine à laver temporelle, la « Lavotron 3000 », installée dans une laverie de quartier, envoie les héros dans six époques (centrale électrique, usine robotique, temple des ombres, volcan primordial, port pirate, grotte néon). Les chaussettes perdues dans les machines à laver voyagent dans le temps : c'est le gag du jeu.

Réponds juste « Compris » ; je vais t'envoyer les demandes une par une.
```

---

## A. La laverie (hub) — dossier `laverie/`

| # | Fichier | Taille en jeu | Animation |
| --- | --- | --- | --- |
| A1 | `laverie_fond.png` | 480 × 272 | fixe |
| A2 | `laverie_carrelage.png` | 4 tuiles de 16 × 16 | fixe |
| A3 | `machine_defis.png` | ≈ 48 × 56 | repos 4 + en marche 4 |
| A4 | `jukebox.png` | ≈ 32 × 48 | repos 4 + musique 4 |
| A5 | `album_lutrin.png` | ≈ 32 × 32 | fermé 1 + ouverture 3 |
| A6 | `armoire.png` | ≈ 40 × 56 | fermée 1 + ouverture 3 |
| A7 | `vitrine.png` | ≈ 48 × 40 | fixe |
| A8 | `trophees.png` | 6 × (16 × 16) | fixe |
| A9 | `presentoir_badges.png` | ≈ 40 × 32 | fixe |
| A10 | `etendoir.png` | ≈ 64 × 40 | fixe |
| A11 | `affiches_boss.png` | 6 × (24 × 32) | fixe |
| A12 | `enseigne.png` | ≈ 96 × 24 | allumée 1 + clignote 1 |
| A13 | `coin_detente.png` | 5 objets, 16 à 48 px | fixe |
| A14 | `bulles_pnj.png` | 3 × (12 × 12) | 2 images chacune |
| A15 | `machine_reparations.png` | 7 × (72 × 65), même cadrage que la machine actuelle | fixe |

**A1 — Fond de la laverie**
```
Image 1920 × 1088 pixels (sera réduite à 480 × 272) : intérieur d'une petite laverie automatique de quartier, la nuit, vue de profil comme un niveau de jeu de plateforme, un seul écran.
Mur du fond avec carrelage mural, une grande vitrine sur la rue avec la ville néon floue derrière, quelques néons au plafond, des tuyaux, un vieux calendrier sans texte, des prises et des étagères vides.
IMPORTANT : le bas de l'image (les 12 % inférieurs) est un sol plat et uni sombre, sans aucun objet, sur toute la largeur. Ne dessine AUCUNE machine, aucun meuble, aucun personnage : ils seront ajoutés séparément. Garde des zones de mur dégagées à gauche, au centre et à droite.
Décor plus sombre et moins contrasté que des personnages de jeu, pour qu'ils restent lisibles devant.
```

**A2 — Carrelage du sol**
```
Planche de 4 tuiles carrées de sol de laverie, côte à côte sur une ligne, chacune 128 × 128 pixels (seront réduites en 16 × 16), raccordables sans couture : 1) damier noir et blanc, 2) losanges, 3) carreaux unis avec joints, 4) carreaux sombres avec un liseré néon. Couleurs neutres (gris clair et gris foncé) : je les recolorerai.
```

**A3 — Machine de défis**
```
Planche d'animation : une machine à laver moderne et un peu farfelue, à hublot, avec un gros cadran à 5 programmes représentés par des pictogrammes (éclair, plume, tourbillon de vent, flocon, chaussette), des voyants néon. 8 images en 2 lignes de 4 cases carrées. Ligne 1 « repos » : le hublot luit doucement, les voyants clignotent. Ligne 2 « en marche » : le tambour tourne avec de la mousse colorée dans le hublot, la machine tremble légèrement. Proportions d'une machine haute de 56 px pour 48 px de large.
```

**A4 — Jukebox**
```
Planche d'animation : un jukebox rétro arrondi, façon néon, avec un petit hublot de machine à laver à la place des disques (clin d'œil). 8 images en 2 lignes de 4 cases. Ligne 1 « repos » : lumières qui ondulent lentement. Ligne 2 « musique » : lumières vives et petites notes de musique colorées qui sortent du haut. Proportions : 32 px de large pour 48 px de haut.
```

**A5 — Album (lutrin)**
```
Planche d'animation : un lutrin en bois sur lequel est posé un gros album de cartes à collectionner, avec une étoile sur la couverture. 4 images sur une ligne : fermé, puis ouverture en 3 étapes (les pages s'ouvrent et une petite lueur sort). Proportions carrées, 32 × 32 px en jeu.
```

**A6 — Armoire / vestiaire**
```
Planche d'animation : une armoire-vestiaire de laverie en métal peint, avec des autocollants (étoile, soleil, lune). 4 images sur une ligne : fermée, puis ouverture en 3 étapes ; ouverte, on voit des cintres avec des vêtements colorés et une cape. Proportions : 40 px de large pour 56 px de haut.
```

**A7 — Vitrine à trophées**
```
Une vitrine en verre posée sur un meuble bas, avec 3 étagères VIDES (les trophées seront posés par-dessus), reflets néon sur la vitre. Proportions : 48 px de large pour 40 px de haut. Une seule image.
```

**A8 — Trophées des boss**
```
Planche de 6 petits trophées dorés sur une ligne, cases carrées identiques, chacun une mini-statuette mignonne sur un socle : 1) un roi slime électrique bleu cyan avec une couronne, 2) un gros drone rouge, 3) un maître ninja d'ombre violet, 4) un colosse de lave orange, 5) un singe roi pirate jaune avec un chapeau de pirate, 6) une reine chauve-souris néon rose. 16 × 16 px en jeu chacun : formes très simples et lisibles.
```

**A9 — Présentoir à badges**
```
Un panneau en liège encadré de bois, accroché au mur, VIDE (les badges seront épinglés par-dessus), avec quelques punaises colorées. Proportions : 40 × 32 px. Une seule image.
```

**A10 — Étendoir**
```
Un étendoir à linge sur pied, avec une corde et des pinces à linge colorées, SANS linge (les chaussettes trouvées seront accrochées par-dessus). Proportions : 64 px de large pour 40 px de haut. Une seule image.
```

**A11 — Affiches des boss**
```
Planche de 6 affiches de film rétro sur une ligne, cases identiques, format portrait (proportions 24 × 32), avec un bord légèrement corné et un scotch en haut. Chacune montre un boss en pose héroïque et drôle, sans texte : 1) roi slime électrique cyan, 2) drone titan rouge, 3) maître des ombres violet, 4) colosse de lave orange, 5) singe roi pirate jaune, 6) reine chauve-souris néon rose. Fond de chaque affiche dans la couleur du boss.
```

**A12 — Enseigne**
```
Planche de 2 images l'une sous l'autre : une enseigne néon rectangulaire de laverie, cadre en tubes néon avec une petite chaussette et une bulle de savon dans les coins, ZONE CENTRALE VIDE (le texte sera ajouté par le jeu). Image 1 : néon allumé. Image 2 : la moitié droite du néon s'éteint (clignotement). Proportions : 96 × 24.
```

**A13 — Coin détente**
```
Planche de 5 objets séparés sur une ligne, sur fond uni : 1) un petit canapé usé violet (48 × 24), 2) une plante verte en pot (16 × 24), 3) un distributeur de boissons néon (24 × 48), 4) un panier à linge débordant de vêtements (24 × 16), 5) une table basse avec des magazines (32 × 16). Bien espacés pour pouvoir les découper.
```

**A14 — Bulles au-dessus des clients**
```
Planche de 3 petites bulles de dialogue de jeu vidéo, 2 images chacune (léger rebond), en 3 lignes de 2 cases : 1) bulle jaune avec un point d'exclamation (nouvelle quête), 2) bulle bleue avec trois petits points (parler), 3) bulle verte avec une coche (quête terminée). 12 × 12 px en jeu : formes très simples. C'est la seule exception autorisée aux symboles.
```

**A15 — Réparations de la machine temporelle**

Joins **`assets/sprites/machine.png`** (la machine actuelle) à ce message.
```
Voici la machine à laver temporelle de mon jeu. Redessine-la exactement avec le même cadrage, la même taille et le même style, en 7 états sur une ligne, pour montrer sa réparation : 0) cassée : cadran fendu, hublot terne, voyants éteints, petite fumée ; puis à chaque état une pièce de plus réparée et brillante : 1) un condensateur jaune électrique sur le côté, 2) des engrenages argentés visibles, 3) le cadran des programmes réparé et lumineux, 4) une résistance orange incandescente en bas, 5) le joint du hublot neuf et brillant, 6) un cristal rose au sommet avec un gros bouton en forme de maison qui brille. L'état 6 est la machine entièrement réparée.
```

---

## B. Clients PNJ — dossier `pnj/`

Planche par personnage : **cases de 48 × 48**, personnage ≈ 38 px de haut, regard vers la droite, 3 lignes. Ligne 1 « repos » (4 images, respiration), ligne 2 « parle » (2 images, bouche et main qui bougent), ligne 3 « content » (2 images, saut de joie). En plus, un **portrait 40 × 40** (tête et épaules, même style que les portraits du jeu).

| # | Fichiers | Personnage |
| --- | --- | --- |
| B1 | `pnj_bulle.png`, `portrait_bulle.png` | Mme Bulle, la gérante |
| B2 | `pnj_capitaine.png`, `portrait_capitaine.png` | Capitaine Barbe-Mouillée |
| B3 | `pnj_bobine.png`, `portrait_bobine.png` | Bobine, le robot |
| B4 | `pnj_kage.png`, `portrait_kage.png` | Kage, le ninja |

Modèle de demande, avec la description du personnage à remplacer :
```
Planche d'animation d'un personnage de jeu de plateforme, vu de profil, regard vers la droite, environ 38 px de haut en jeu, dans des cases carrées identiques, 3 lignes : ligne 1 « repos » 4 images (respiration), ligne 2 « parle » 2 images (bouche ouverte, un bras qui bouge), ligne 3 « content » 2 images (petit saut de joie, bras en l'air). Toutes les cases ont la même taille, les pieds sur la même ligne.
Personnage : [DESCRIPTION]
```
Puis :
```
Même personnage, portrait carré tête et épaules, de trois quarts vers la droite, sourire, fond uni transparent.
```

Descriptions :
- **B1 Mme Bulle** : « une gérante de laverie joyeuse d'environ soixante ans, cheveux gris en chignon avec des bigoudis colorés, grandes lunettes rondes, tablier bleu ciel avec une poche pleine de pinces à linge, chaussons roses, tient un panier à linge. »
- **B2 Capitaine Barbe-Mouillée** : « un vieux capitaine pirate rigolo et un peu ronchon, grosse barbe bleue toute mouillée qui goutte, chapeau de pirate avec une tête de mort remplacée par une chaussette, manteau rouge trop grand, un seul pied porte une chaussette rayée rouge et blanche, l'autre pied nu. »
- **B3 Bobine** : « un petit robot rond et maladroit, corps en forme de bidon gris clair avec un hublot sur le ventre, antenne avec une ampoule, porte un tee-shirt orange beaucoup trop petit qui a rétréci au lavage, yeux en écran bleu, air perplexe. »
- **B4 Kage** : « un jeune ninja mince et gentil, tenue violet foncé, foulard sur le bas du visage, yeux souriants, son kimono flotte car il a perdu sa ceinture, il le tient d'une main, gêné. »

---

## C. Album de cartes — dossier `cartes/`

| # | Fichier | Taille en jeu | Contenu |
| --- | --- | --- | --- |
| C1 | `cadres_cartes.png` | 5 × (80 × 112) | 4 cadres de catégorie + 1 dos |
| C2 | `illus_monstres.png` | 6 × (40 × 40) | les 6 monstres de la campagne |

**C1 — Cadres**
```
Planche de 5 cadres de cartes à collectionner sur une ligne, format portrait (proportions 80 × 112), style néon pixel art. Chaque cadre a une grande fenêtre carrée VIDE en haut (pour l'illustration) et une zone VIDE en bas (pour le texte), sans aucun texte. 1) cadre vert-menthe avec des bulles de savon (clients), 2) cadre doré avec un soleil et une lune (héros), 3) cadre bleu avec des empreintes (monstres), 4) cadre rouge-violet avec une couronne (boss), 5) dos de carte : violet foncé avec un hublot de machine à laver et un point d'interrogation (carte pas encore trouvée).
```

**C2 — Monstres**

Joins si possible les planches `assets/sprites/ennemi_*.png` pour que ChatGPT respecte les modèles.
```
Planche de 6 portraits carrés de monstres mignons sur une ligne, cases identiques, en buste, regard vers la droite, d'après les sprites joints : 1) slime électrique cyan, 2) drone de surveillance rouge, 3) ninja d'ombre violet, 4) golem de lave orange, 5) singe pirate avec un bandana, 6) chauve-souris néon rose. Expressions malicieuses, jamais effrayantes.
```

Les illustrations des héros et des boss réutilisent les portraits existants (`portraits`, `portraits_boss`).

---

## D. Badges et icônes — dossier `icones/`

**D1 — `badges.png`** : 18 médailles de 16 × 16 en jeu, en 3 lignes de 6.
```
Planche de 18 petites médailles rondes de jeu vidéo, 3 lignes de 6 cases identiques, chacune avec un ruban et un symbole simple au centre, très lisible en tout petit (16 × 16 px en jeu) :
ligne 1 : une chaussette, trois chaussettes, une chaussette dorée, un panier plein de chaussettes, une étoile, une carte à jouer ;
ligne 2 : un cœur intact, une bulle de dialogue, une machine à laver, un éclair, une plume, un flocon ;
ligne 3 : un tourbillon de vent, une loupe, une couronne, un livre ouvert, une maison, un trophée.
Couleurs variées : bronze, argent, or, néon.
```

**D2 — `icones_jeu.png`** : 8 icônes de 12 × 12 sur une ligne.
```
Planche de 8 petites icônes de jeu vidéo sur une ligne, cases identiques, très simples (12 × 12 px en jeu) : 1) chronomètre, 2) flèche de vent (alerte bourrasque), 3) flocon (sol glissant), 4) cœur barré d'un petit éclair (défi sans dégâts), 5) loupe (indice), 6) note de musique, 7) cadenas, 8) coche verte.
```

---

## E. Objets à trouver dans les salles — dossier `objets/`

La **chaussette principale** : c'est toi qui la fournis. Format attendu, `chaussette.png` :
- cases de **16 × 16** en jeu (ou un multiple exact, par exemple 64 × 64) ;
- ligne 1 « flotte » : 6 images ;
- ligne 2 « collecte » : 6 images.

Si tu fais aussi une **chaussette bonus** (chemins secrets), même format dans `chaussette_bonus.png` ; sinon je la dore par le code.

**E1 — `objets_quete.png`**
```
Planche de 8 petits objets brillants sur une ligne, cases carrées identiques (16 × 16 px en jeu), chacun avec un léger halo :
1) une chaussette rayée rouge et blanche de pirate,
2) un morceau de ceinture de ninja violette,
3) un condensateur électrique jaune,
4) deux engrenages argentés,
5) un cadran rond de machine à laver avec une aiguille,
6) une résistance chauffante orange incandescente,
7) un joint de hublot rond en caoutchouc bleu,
8) un cristal rose avec un petit bouton en forme de maison.
```

**E2 — `fx_vent.png`** (bourrasques de l'Essorage)
```
Planche d'animation de 4 images sur une ligne : traînées de vent stylisées blanches et cyan qui filent vers la droite, avec deux ou trois chaussettes et feuilles emportées. Proportions de chaque case 32 × 16. Effet léger et transparent.
```

---

## F. Cosmétiques — dossier `cosmetiques/`

Les accessoires se posent sur la tête de **n'importe quel** héros : ils marchent pour les 8 sans redessiner chaque planche. L'apparence d'origine d'Hélio et Lune reste celle par défaut.

**F1 — `accessoires.png`** : 12 accessoires de 24 × 24 en 2 lignes de 6, vus de profil vers la droite, sans tête dessous.
```
Planche de 12 accessoires de tête pour un petit personnage de jeu de plateforme, vus de PROFIL tournés vers la droite, SANS personnage (juste l'objet), 2 lignes de 6 cases identiques, 24 × 24 px en jeu, posés comme s'ils étaient sur une tête :
ligne 1 : chapeau de pirate, bandana rouge, écharpe de nuit violette qui flotte, couronne de slime cyan, lunettes de soleil néon, bonnet de laine à pompon ;
ligne 2 : casque de chantier, bigoudis colorés, oreilles de chauve-souris, couronne de fleurs, casquette à hélice, bulle de savon géante autour de la tête.
```

**F2 — `autocollants_machine.png`** : 6 autocollants de 16 × 16 pour la machine temporelle.
```
Planche de 6 autocollants ronds ou découpés sur une ligne, cases identiques, avec un fin bord blanc, pour décorer une machine à laver : un soleil, une lune, un éclair, une tête de pirate rigolote, une chaussette souriante, une étoile filante.
```

Costumes complets (nouvelle tenue par héros) : à faire plus tard, car il faut redessiner toute la planche d'animation. On commence par les accessoires et les variantes de couleur.

---

## G. Souvenirs de la machine — dossier `souvenirs/`

6 scènes de **240 × 136** en jeu (affichées en grand). Demande à ChatGPT des images de 960 × 544. L'histoire proposée : la machine a été construite par **Grand-père Firmin**, inventeur et grand-père de Mme Bulle. Dis-moi si tu veux changer ce personnage.

Modèle :
```
Illustration de 960 × 544 pixels pour une scène de souvenir dans un jeu pour enfants, en pixel art néon, ambiance douce et nostalgique, légèrement violette comme un vieux souvenir, sans texte : [SCÈNE]
```

| # | Fichier | Scène |
| --- | --- | --- |
| G1 | `souvenir_1.png` | « Dans un atelier rempli d'outils, un vieil inventeur souriant (Grand-père Firmin : moustache blanche, salopette, lunettes de soudeur sur le front) assemble une machine à laver ronde. Un éclair joyeux jaillit d'une prise. » |
| G2 | `souvenir_2.png` | « La machine à laver toute neuve tourne ; par le hublot, une chaussette disparaît dans un tourbillon d'étoiles. L'inventeur se gratte la tête, étonné. » |
| G3 | `souvenir_3.png` | « Un soir d'orage, un éclair frappe le toit de la laverie ; le cadran de la machine se fend, des étincelles en sortent. » |
| G4 | `souvenir_4.png` | « Six pièces de la machine s'envolent par le hublot dans six tourbillons de couleurs différentes : jaune électrique, argent, violet, orange, bleu océan, rose néon. » |
| G5 | `souvenir_5.png` | (joins `assets/sprites/portraits.png`) « Les huit héros du portrait joint, vus de dos en silhouettes colorées, se penchent vers le hublot lumineux, qui les aspire dans une spirale d'étoiles, comme un toboggan amusant. » |
| G6 | `souvenir_6.png` | « Dans une grotte de cristaux roses, un cristal montre l'image de l'inventeur qui sourit et pointe un gros bouton en forme de maison sur sa machine. » |
| G7 | `fin.png` | « Toute la bande de héros sort du hublot de la machine réparée, dans une laverie lumineuse au lever du soleil, avec Mme Bulle qui applaudit et des chaussettes qui volent comme des confettis. » |

---

## Récapitulatif de l'arborescence à déposer

```
src/assets/pack_laverie/
├── laverie/      laverie_fond, laverie_carrelage, machine_defis, jukebox, album_lutrin, armoire,
│                 vitrine, trophees, presentoir_badges, etendoir, affiches_boss, enseigne,
│                 coin_detente, bulles_pnj, machine_reparations
├── pnj/          pnj_bulle, pnj_capitaine, pnj_bobine, pnj_kage + portrait_… (×4)
├── cartes/       cadres_cartes, illus_monstres
├── icones/       badges, icones_jeu
├── objets/       chaussette (toi), chaussette_bonus (facultatif), objets_quete, fx_vent
├── cosmetiques/  accessoires, autocollants_machine
└── souvenirs/    souvenir_1 … souvenir_6, fin
```

**Priorités**
- Pour commencer : A1, A3, A4, A15, B1 à B4, C1, E1, et ta chaussette.
- Ensuite : le reste.

Tant qu'une image manque, le jeu affiche une version provisoire dessinée par le code.
