# Prompts ChatGPT — assets manquants (octobre 2026)

> **Fournis et intégrés** : 1 à 14, 16 à 21. **Restent** : 15 (`machine_reparations.png`) et 22–23 (souvenirs et fin).

Mode d'emploi : un nouveau fil ChatGPT, le bloc STYLE en premier message, puis une demande par message. Télécharge chaque image en PNG, renomme-la comme indiqué et dépose-la à la racine de `src/assets/pack_laverie/` (les sous-dossiers marchent aussi). Fond magenta uni `#FF00FF`, comme pour Mme Bulle.

## Récapitulatif

| # | Fichier | Contenu | Grille (colonnes × lignes) | Taille en jeu d'une case | Image à joindre | Priorité |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `pnj_capitaine.png` | Capitaine Barbe-Mouillée | 4 × 3 (repos 4, parle 2, content 2) | 48 × 48 (perso ≈ 38 px) | `pnj_bulle.png` | ★★★ |
| 2 | `portrait_capitaine.png` | son portrait | 1 | 40 × 40 | — | ★★★ |
| 3 | `pnj_bobine.png` | Bobine, le robot | 4 × 3 | 48 × 48 | `pnj_bulle.png` | ★★★ |
| 4 | `portrait_bobine.png` | son portrait | 1 | 40 × 40 | — | ★★★ |
| 5 | `pnj_kage.png` | Kage, le ninja | 4 × 3 | 48 × 48 | `pnj_bulle.png` | ★★★ |
| 6 | `portrait_kage.png` | son portrait | 1 | 40 × 40 | — | ★★★ |
| 7 | `pnj_firmin.png` | Grand-père Firmin | 4 × 3 | 48 × 48 | `pnj_bulle.png` | ★★★ |
| 8 | `portrait_firmin.png` | son portrait | 1 | 40 × 40 | `portrait_bulle.png` | ★★★ |
| 9 | `robot_marcheur.png` | robot marcheur (ancienne aventure) | 4 × 2 (marche 4, fonce 4) | ≈ 24 px de haut | — | ★★ |
| 10 | `robot_canon.png` | robot-canon | 4 × 1 (repos 2, vise 2) | ≈ 24 px de haut | — | ★★ |
| 11 | `drone_ancien.png` | petit drone | 4 × 1 (vol 4) | ≈ 14 px de haut | — | ★★ |
| 12 | `armoire.png` | vestiaire | 4 × 1 (fermée 1, ouverture 3) | 40 × 56 | — | ★★ |
| 13 | `album_lutrin.png` | pupitre des collections | 4 × 1 (fermé 1, ouverture 3) | 32 × 32 | — | ★★ |
| 14 | `enseigne.png` | enseigne néon (sans texte) | 1 × 2 (allumée, clignote) | 96 × 24 | — | ★★ |
| 15 | `machine_reparations.png` | machine temporelle, 7 étapes de réparation | 7 × 1 | 72 × 65 | `assets/sprites/machine.png` | ★★ |
| 16 | `bulles_pnj.png` | bulles ! … ✓ au-dessus des clients | 2 × 3 | 12 × 12 | — | ★ |
| 17 | `objets_quete.png` | objets de quête | 8 × 1 | 16 × 16 | — | ★ |
| 18 | `chaussette_bonus.png` | chaussette dorée | 4 × 2 (flotte 4, collecte 4) | comme la chaussette | `sock_sprite.png` | ★ |
| 19 | `badges.png` | 19 médailles | 5 × 4 (dernière case vide) | 16 × 16 | — | ★ |
| 20 | `illus_monstres.png` | 6 monstres de l'album | 6 × 1 | 40 × 40 | `assets/sprites/ennemi_*.png` | ★ |
| 21 | `accessoires.png` | 12 accessoires du vestiaire | 6 × 2 | 24 × 24 | — | ★ |
| 22 | `souvenir_1.png` … `souvenir_6.png` | 6 scènes de souvenir | 1 image chacune | 240 × 136 (demander 960 × 544) | `souvenir_5` : `assets/sprites/portraits.png` | ★ |
| 23 | `fin.png` | scène de fin | 1 | 240 × 136 (demander 960 × 544) | `pnj_bulle.png` | ★ |

★★★ : visible tout de suite dans la laverie · ★★ : visible souvent · ★ : collections, détails et histoire.

## 0. Bloc STYLE (premier message du fil)

```
Tu vas m'aider à créer des sprites pour « Lunelio », un jeu de plateforme 2D pour enfants de 6 et 8 ans.

Style obligatoire pour TOUTES les images de cette conversation :
- Pixel art net, pixels carrés bien visibles, sans anti-crénelage, sans flou, sans dégradé lisse.
- Ambiance néon synthwave : violets, bleus nuit, roses, cyan, avec des lueurs colorées.
- Chaque objet ou personnage a un contour sombre de 1 pixel couleur #0e0a1a.
- Palette limitée (environ 16 à 24 couleurs par image), couleurs saturées pour les éléments importants.
- Ton mignon, drôle et rassurant : aucune violence, aucun sang, rien d'effrayant.
- Vue de profil (jeu de plateforme), lumière venant du haut.
- Fond magenta pur #FF00FF, parfaitement uni.
- Aucun texte, aucune lettre, aucun chiffre, aucune signature, aucun cadre décoratif autour de l'image.
- Pour les planches d'animation : grille régulière, toutes les cases de même taille, sujet au même endroit dans chaque case, pieds sur la même ligne, aucune bordure entre les cases.
- Les personnages et objets orientés regardent vers la DROITE.

Contexte du jeu : une vieille machine à laver temporelle, la « Lavotron 3000 », installée dans une laverie de quartier tenue par Mme Bulle, envoie les héros dans six époques (centrale électrique, usine robotique, temple des ombres, volcan primordial, port pirate, grotte néon). Les chaussettes perdues dans les machines voyagent dans le temps : c'est le gag du jeu.

Réponds juste « Compris » ; je vais t'envoyer les demandes une par une.
```

## 1 à 8. Clients de la laverie (joindre `pnj_bulle.png` comme modèle de style)

**Modèle de planche** (remplacer [DESCRIPTION]) :
```
Voici Mme Bulle, un personnage de mon jeu (image jointe). Crée un nouveau personnage dans exactement le même style, la même taille et la même grille : planche d'animation vue de profil, regard vers la droite, grille régulière de 4 colonnes et 3 lignes de cases carrées identiques (12 cases), fond magenta uni #FF00FF :
ligne 1 « repos » : 4 images (il respire, petit mouvement) ;
ligne 2 « parle » : 2 images (bouche ouverte, une main levée) puis 2 cases vides ;
ligne 3 « content » : 2 images (petit saut de joie, bras en l'air) puis 2 cases vides.
Même taille dans toutes les cases, pieds sur la même ligne.
Personnage : [DESCRIPTION]
```

**Modèle de portrait** (dans le même fil, juste après sa planche) :
```
Même personnage, portrait carré tête et épaules, de trois quarts vers la droite, grand sourire, même style que le portrait de Mme Bulle, fond magenta uni #FF00FF.
```

Descriptions :

- **Capitaine Barbe-Mouillée** → `pnj_capitaine.png` / `portrait_capitaine.png`
  ```
  un vieux capitaine pirate rigolo et un peu ronchon, grosse barbe bleue toute mouillée qui goutte, chapeau de pirate noir avec une chaussette dessinée à la place de la tête de mort, manteau rouge trop grand à boutons dorés, un pied porte une chaussette rayée rouge et blanche, l'autre pied est nu (il a perdu l'autre chaussette).
  ```
- **Bobine** → `pnj_bobine.png` / `portrait_bobine.png`
  ```
  un petit robot rond et maladroit, corps en forme de bidon gris clair avec un hublot sur le ventre, antenne avec une ampoule jaune, porte un tee-shirt orange beaucoup trop petit qui a rétréci au lavage, yeux en écran bleu cyan, air perplexe.
  ```
- **Kage** → `pnj_kage.png` / `portrait_kage.png`
  ```
  un jeune ninja mince et gentil, tenue violet foncé, foulard sur le bas du visage, yeux souriants, son kimono flotte car il a perdu sa ceinture, il le tient d'une main, un peu gêné.
  ```
- **Grand-père Firmin** → `pnj_firmin.png` / `portrait_firmin.png`
  ```
  un vieil inventeur souriant et un peu distrait, le grand-père de Mme Bulle, petit et voûté, grande moustache blanche en guidon, cheveux blancs en épi, lunettes de soudeur jaunes relevées sur le front, salopette bleue avec une clé à molette dans la poche, chemise jaune, une burette d'huile à la main.
  ```

## 9 à 11. Robots de l'ancienne aventure

Ne génère que la couleur d'origine : le jeu crée lui-même les variantes de couleur.

**Robot marcheur** → `robot_marcheur.png`
```
Planche d'animation pour un jeu de plateforme, vue de profil, regard vers la droite, grille de 4 colonnes et 2 lignes de cases carrées identiques, fond magenta uni #FF00FF.
Sujet : un petit robot marcheur trapu (environ 24 px de haut en jeu), corps carré bleu-gris (#6f7ea8, reflets #9fb0d8), une antenne avec une ampoule jaune, un œil-visière rose, une bande jaune sur le ventre, deux petites jambes.
Ligne 1 « marche » : 4 images de marche tranquille.
Ligne 2 « fonce » : 4 images où il fonce penché en avant, l'œil devenu rouge vif, petites étincelles derrière lui.
```

**Robot-canon** → `robot_canon.png`
```
Planche d'animation, vue de profil, regard vers la droite, 4 cases carrées identiques sur une seule ligne, fond magenta uni #FF00FF.
Sujet : un robot-canon (environ 24 px de haut en jeu), corps carré violet (#7a5cc4, reflets #a98cf0), un petit canon sur le côté droit, un œil cyan, pieds courts.
Images 1 et 2 « repos » : il attend en se balançant un peu.
Images 3 et 4 « vise » : il pointe son canon, l'œil clignote rouge et blanc.
```

**Petit drone** → `drone_ancien.png`
```
Planche d'animation, vue de profil, regard vers la droite, 4 cases carrées identiques sur une seule ligne, fond magenta uni #FF00FF.
Sujet : un petit drone volant rond et aplati (environ 14 px de haut en jeu), coque bleu-gris (#5a6488, reflets #8a96c0), deux hélices sur le dessus, un œil cyan.
4 images : les hélices tournent et le drone flotte légèrement de haut en bas.
```

## 12 à 16. Meubles de la laverie

**Vestiaire** → `armoire.png`
```
Planche d'animation de 4 images sur une ligne, cases identiques, fond magenta uni #FF00FF : une armoire-vestiaire de laverie en métal peint bleu, avec des autocollants (étoile, soleil, lune). Image 1 : fermée. Images 2 à 4 : les portes s'ouvrent petit à petit ; ouverte, on voit des cintres avec des vêtements colorés, une cape et des chapeaux. Proportions : 40 px de large pour 56 px de haut. Même position et même taille dans chaque case.
```

**Pupitre des collections** → `album_lutrin.png`
```
Planche d'animation de 4 images sur une ligne, cases carrées identiques, fond magenta uni #FF00FF : un lutrin en bois sur lequel est posé un gros album de cartes à collectionner, avec une étoile dorée sur la couverture. Image 1 : album fermé. Images 2 à 4 : l'album s'ouvre et une petite lueur dorée sort des pages. Proportions carrées (32 × 32 px en jeu). Même position dans chaque case.
```

**Enseigne** → `enseigne.png`
```
Planche de 2 images l'une sous l'autre, fond magenta uni #FF00FF : une enseigne néon rectangulaire de laverie, cadre en tubes néon violets avec une petite chaussette et une bulle de savon dans les coins, ZONE CENTRALE VIDE ET SOMBRE (le texte sera ajouté par le jeu). Image 1 : néon allumé. Image 2 : la moitié droite du néon est éteinte (clignotement). Proportions très allongées : 96 de large pour 24 de haut.
```

**Machine temporelle réparée pas à pas** → `machine_reparations.png` (joindre `assets/sprites/machine.png`)
```
Voici la machine à laver temporelle de mon jeu (image jointe). Redessine-la avec exactement le même cadrage, la même taille et le même style, en 7 états côte à côte sur une seule ligne, cases identiques, fond magenta uni #FF00FF, pour montrer sa réparation :
0) cassée : cadran fendu, hublot terne, voyants éteints, petite fumée ;
1) + un condensateur jaune électrique brillant sur le côté ;
2) + des engrenages argentés visibles qui tournent ;
3) + le cadran des programmes réparé et lumineux ;
4) + une résistance orange incandescente en bas ;
5) + le joint du hublot neuf et brillant, hublot bleu lumineux ;
6) + un cristal rose au sommet et un gros bouton en forme de maison qui brille : la machine est entièrement réparée.
Chaque état garde toutes les réparations des états précédents.
```

**Bulles au-dessus des clients** → `bulles_pnj.png`
```
Planche de 6 petites bulles de dialogue de jeu vidéo, grille de 2 colonnes et 3 lignes de cases carrées identiques, fond magenta uni #FF00FF. Chaque ligne = 2 images d'un léger rebond :
ligne 1 : bulle jaune avec un point d'exclamation (nouvelle quête) ;
ligne 2 : bulle bleu ciel avec trois petits points (quête en cours) ;
ligne 3 : bulle verte avec une coche (quête terminée).
12 × 12 px en jeu : formes très simples et épaisses. Ces symboles sont la seule exception autorisée à la règle « pas de texte ».
```

## 17 à 19. Objets et badges

**Objets de quête** → `objets_quete.png`
```
Planche de 8 petits objets brillants sur une ligne, cases carrées identiques (16 × 16 px en jeu), fond magenta uni #FF00FF, chacun avec un léger halo :
1) une chaussette rayée rouge et blanche de pirate,
2) un morceau de ceinture de ninja violette,
3) un condensateur électrique jaune,
4) deux engrenages argentés,
5) un cadran rond de machine à laver avec une aiguille,
6) une résistance chauffante orange incandescente,
7) un joint de hublot rond en caoutchouc bleu,
8) un cristal rose avec un petit bouton en forme de maison.
```

**Chaussette dorée** → `chaussette_bonus.png` (joindre `sock_sprite.png`)
```
Voici la chaussette de mon jeu (image jointe). Refais exactement la même planche (même grille de 4 colonnes et 2 lignes, mêmes mouvements, même taille), fond magenta uni #FF00FF, mais avec une chaussette DORÉE brillante avec des reflets blancs et de petites étoiles autour : ligne 1 « flotte » 4 images, ligne 2 « ramassée » 4 images (éclat et étincelles dorées).
```

**Badges** → `badges.png`
```
Planche de 19 petites médailles rondes de jeu vidéo, grille de 5 colonnes et 4 lignes de cases carrées identiques (la 20e case, en bas à droite, reste vide), fond magenta uni #FF00FF. Chaque médaille a un petit ruban et un symbole simple au centre, très lisible en tout petit (16 × 16 px en jeu). Dans l'ordre, ligne par ligne :
1) une chaussette (bronze), 2) un petit panier avec deux chaussettes (argent), 3) un grand panier qui déborde de chaussettes (or), 4) une chaussette dorée qui brille (or néon), 5) une bulle de savon avec une étoile ;
6) un hublot de machine avec un tourbillon, 7) une maison, 8) une bulle de dialogue avec un cœur, 9) deux mains qui se serrent, 10) un cœur intact qui brille ;
11) un cadran de machine à laver, 12) une machine à laver avec une couronne, 13) une carte à jouer, 14) un livre ouvert avec une étoile, 15) trois petites silhouettes de héros ;
16) un cristal rose de souvenir, 17) un petit robot rétro, 18) un bouclier avec une flamme (courage), 19) une loupe sur une clé (chemin secret).
Couleurs variées : bronze, argent, or et néon.
```

## 20 et 21. Album et vestiaire

**Monstres de l'album** → `illus_monstres.png` (joindre les planches `assets/sprites/ennemi_slime.png`, `ennemi_drone.png`, `ennemi_ninja_ombre.png`, `ennemi_golem.png`, `ennemi_singe_pirate.png`, `ennemi_chauve_souris.png`)
```
Planche de 6 portraits carrés de monstres mignons sur une ligne, cases identiques, fond magenta uni #FF00FF, en buste, regard vers la droite, d'après les sprites joints, dans cet ordre :
1) slime électrique cyan, 2) drone sentinelle rouge, 3) ninja de l'ombre violet, 4) golem de lave orange, 5) singe pirate avec un bandana, 6) chauve-souris néon rose.
Expressions malicieuses, jamais effrayantes.
```

**Accessoires** → `accessoires.png`
```
Planche de 12 accessoires de tête pour un petit personnage de jeu de plateforme, vus de PROFIL tournés vers la droite, SANS personnage (juste l'objet, posé comme s'il était sur une tête), grille de 6 colonnes et 2 lignes de cases carrées identiques, fond magenta uni #FF00FF, 24 × 24 px en jeu. Dans l'ordre :
ligne 1 : chapeau de pirate, bandana rouge, écharpe de nuit violette qui flotte, couronne de slime cyan, lunettes de soleil néon, bonnet de laine bleu à pompon ;
ligne 2 : casque de chantier jaune, trois bigoudis colorés (rose, cyan, jaune), oreilles de chauve-souris roses, couronne de fleurs, casquette à hélice, bulle de savon géante transparente autour de la tête.
```

## 22 et 23. Souvenirs et fin

**Modèle** (une image par message, remplacer [SCÈNE]) :
```
Illustration de 960 × 544 pixels pour une scène de souvenir dans un jeu pour enfants, en pixel art néon, ambiance douce et nostalgique, légèrement violette comme un vieux souvenir, sans texte, cadrage plein (pas de fond magenta pour cette image) : [SCÈNE]
```

| Fichier | [SCÈNE] |
| --- | --- |
| `souvenir_1.png` | Dans un atelier rempli d'outils, Grand-père Firmin (le vieil inventeur à moustache blanche, salopette bleue, lunettes de soudeur jaunes sur le front) assemble une machine à laver ronde. Un éclair joyeux jaillit d'une prise. |
| `souvenir_2.png` | La machine à laver toute neuve tourne ; par le hublot, une chaussette disparaît dans un tourbillon d'étoiles. Grand-père Firmin se gratte la tête, étonné. |
| `souvenir_3.png` | Un soir d'orage, un éclair frappe le toit de la laverie ; le cadran de la machine se fend, des étincelles en sortent. |
| `souvenir_4.png` | Six pièces de la machine s'envolent par le hublot dans six tourbillons de couleurs différentes : jaune électrique, argent, violet, orange, bleu océan, rose néon. |
| `souvenir_5.png` | (joindre `assets/sprites/portraits.png`) Les huit héros du portrait joint, vus de dos en silhouettes colorées, se penchent vers le hublot lumineux, qui les aspire dans une spirale d'étoiles, comme un toboggan amusant. |
| `souvenir_6.png` | Dans une grotte de cristaux roses, un grand cristal montre l'image de Grand-père Firmin qui sourit et pointe un gros bouton en forme de maison sur sa machine. |
| `fin.png` | (joindre `pnj_bulle.png`) Toute la bande de héros sort du hublot de la machine réparée, dans une laverie lumineuse au lever du soleil, avec Mme Bulle qui applaudit et des chaussettes qui volent comme des confettis. Ambiance joyeuse et lumineuse, pas violette. |
