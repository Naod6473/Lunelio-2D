# Armes et râtelier — prompts ChatGPT et propositions de gameplay

Proposition du 2 octobre 2026, **à valider**. Rien n'est codé tant que les choix du parent ne sont pas faits.

Public enfant : les armes restent des **jouets rigolos** sur le thème de la laverie. Le pistolet tire des bulles et le canon des confettis. Les flèches ont des ventouses. Rien ne ressemble à une vraie arme à feu, et les ennemis disparaissent comme aujourd'hui (étincelles, fumée, étoiles).

## Mode d'emploi

1. Ouvre un nouveau fil ChatGPT et colle le **bloc STYLE** de `prompt_sprites_chatgpt.md` en premier message.
2. Envoie ensuite les demandes W1 à W5 dans cet ordre, une par message. Joins à W2 et W5 les images indiquées.
3. Fond **transparent** (sinon magenta pur `#FF00FF`).
4. Dépose les fichiers à la racine de `src/assets/pack_laverie/`.

| # | Fichier | Contenu | Grille | Taille en jeu d'une case |
| --- | --- | --- | --- | --- |
| W1 | `armes_icones.png` | les 10 armes, en icônes | 5 × 2 | 32 × 32 |
| W2 | `armes_main.png` | les 10 armes tenues en main (profil) | 5 × 2 | 32 × 32 |
| W3 | `ratelier.png` | le râtelier d'armes de la laverie | 4 × 1 (fermé + 3 d'ouverture) | 48 × 56 |
| W4 | `projectiles_armes.png` | flèches, bulles, confettis, rayon, boomerang, éclairs | 8 × 3 | 24 × 24 |
| W5 | `perso_<id>_armes.png` (× 8) | poses supplémentaires de chaque héros, mains libres | 6 × 4 | même case que sa planche actuelle |

Ordre des armes, toujours le même (W1, W2) :
1. arc à ventouses
2. lance
3. pistolet à bulles
4. canon à confettis
5. laser
6. boomerang
7. nunchaku
8. espadon
9. bouclier
10. poings électriques

---

## W1 — Icônes des armes (`armes_icones.png`)

```
Planche de 10 icônes d'armes-jouets pour un jeu de plateforme pour enfants, grille de 5 colonnes et 2 lignes de cases carrées identiques, fond transparent, chaque arme vue de profil pointant vers la DROITE, bien centrée, avec un petit éclat brillant. Style jouet coloré, rien de réaliste ni d'effrayant. Dans l'ordre :
ligne 1 : 1) un arc en bois avec une flèche à ventouse rose, 2) une lance légère avec une pointe arrondie en mousse cyan et un ruban, 3) un pistolet à bulles transparent violet avec un réservoir de savon rose (forme de jouet, très arrondie), 4) un petit canon à confettis en forme de tambour de machine à laver sur deux roues, 5) un bâton laser compact avec un cristal bleu au bout ;
ligne 2 : 6) un boomerang orange et jaune en forme de V, 7) un nunchaku en bois relié par une chaîne dorée, 8) une grande épée large en métal clair avec une garde dorée (espadon de chevalier de dessin animé), 9) un bouclier rond bleu avec une étoile, 10) une paire de gros gants de boxe jaunes entourés de petits éclairs cyan.
32 × 32 px en jeu : formes simples, contours épais, très lisibles en petit.
```

## W2 — Armes tenues en main (`armes_main.png`)

Joins `assets/sprites/perso_helio.png` comme échelle.

```
Voici un héros de mon jeu (image jointe) pour l'échelle. Dessine les 10 mêmes armes-jouets que la planche précédente, dans le même ordre et la même grille (5 colonnes × 2 lignes de cases carrées identiques), fond transparent, mais cette fois À LA TAILLE où le héros les tient en main : vues de profil, pointées vers la DROITE, à l'horizontale. IMPORTANT : dans chaque case, la poignée (l'endroit où la main tient l'arme) est exactement au CENTRE de la case. L'arc est tenu par le milieu, la lance et l'espadon par le bas du manche, le bouclier par sa poignée intérieure (bouclier vu de profil, bombé vers la droite), les poings électriques sont un seul gant vu de profil, le nunchaku a un bâton tenu et l'autre qui pend. Aucune main ni personnage dessiné. Longueurs en jeu pour un héros de 38 px : arc 18 px de haut, lance 30 px, pistolet 10 px, canon 16 px, laser 14 px, boomerang 10 px, nunchaku 16 px, espadon 28 px, bouclier 14 px de haut, gant 8 px.
```

## W3 — Râtelier d'armes (`ratelier.png`)

Joins `src/assets/pack_laverie/armoire.png` (le vestiaire) pour garder le même style.

```
Voici le vestiaire de ma laverie (image jointe). Dans exactement le même style, la même lumière et des proportions voisines, dessine un râtelier d'armes-jouets : une grande armoire-vitrine en bois peint violet et métal, avec des autocollants (étoile, éclair, chaussette), 4 images sur une ligne, cases identiques, fond transparent. Image 1 : fermée, portes vitrées dépolies avec un petit cadenas en forme de cœur. Images 2 à 4 : les portes s'ouvrent petit à petit ; ouverte, on voit les 10 armes-jouets de la planche précédente accrochées sur des crochets et un présentoir (arc, lance, pistolet à bulles, canon à confettis, laser, boomerang, nunchaku, espadon, bouclier, gants électriques), avec une lumière douce à l'intérieur. Proportions : 48 px de large pour 56 px de haut. Même position et même taille dans chaque case, base sur la même ligne.
```

## W4 — Projectiles et effets (`projectiles_armes.png`)

```
Planche d'effets pour un jeu de plateforme pour enfants, grille de 8 colonnes et 3 lignes de cases carrées identiques (24 × 24 px en jeu), fond transparent, tout ce qui a une direction va vers la DROITE. Style pixel art néon doux, aucun sang, aucune explosion violente.
ligne 1 : 1-2) une flèche à ventouse rose qui vole (2 images), 3) la même flèche plantée dans un mur, ventouse écrasée, 4-5) une bulle de savon irisée qui flotte (2 images), 6) une bulle qui enferme une petite silhouette sombre, 7-8) une bulle qui éclate en gouttelettes et étoiles (2 images) ;
ligne 2 : 1-2) un boulet de confettis roulé en boule (2 images), 3-4) une explosion de confettis multicolores et de petites chaussettes (2 images), 5-6) un segment de rayon laser bleu cyan qui se répète horizontalement (2 images, raccordables à gauche et à droite), 7-8) l'impact du rayon : petite étoile lumineuse (2 images) ;
ligne 3 : 1-4) un boomerang orange qui tourne sur lui-même (4 images, rotation d'un quart de tour à chaque image), 5-6) des petits éclairs cyan et jaunes autour d'un poing (2 images), 7) une onde en arc de cercle dorée (coup d'espadon), 8) un éclat de bouclier : demi-cercle bleu lumineux.
```

## W5 — Poses supplémentaires des 8 héros (`perso_<id>_armes.png`)

Un message par héros. Joins sa planche actuelle (`assets/sprites/perso_<id>.png`) et `armes_main.png` (W2).

> **À valider d'abord** : ces poses montrent le héros **sans son sabre**, les mains libres, pour que le jeu y place l'arme choisie. Pour Hélio et Lune, c'est un changement d'apparence : la règle du projet demande ton accord. Leur planche d'origine reste celle du jeu tant qu'aucune autre arme que le sabre n'est équipée.

```
Voici la planche d'animation d'un héros de mon jeu (première image jointe) et des armes-jouets (deuxième image, pour comprendre les gestes uniquement). Crée une NOUVELLE planche pour ce même héros, identique en style, taille, couleurs, proportions, tenue et cadrage : même taille de case que sa planche, pieds sur la même ligne, regard vers la DROITE, fond transparent, grille de 6 colonnes × 4 lignes. Le héros ne tient AUCUNE arme et son sabre a disparu : ses mains sont vides et bien visibles, poings fermés comme s'il tenait un manche (le jeu ajoutera l'arme). Ne dessine aucune arme.
ligne 1 « repos mains libres » : 4 images (respiration, comme sa pose de repos actuelle) puis 2 cases vides ;
ligne 2 « tir » : 3 images, bras tendu à l'horizontale vers la droite (viser, tirer avec un petit recul, revenir) puis 3 cases vides ;
ligne 3 « lancer » : 3 images, bras qui part de derrière l'épaule et lance vers l'avant (préparer, lancer, bras tendu) puis 3 cases vides ;
ligne 4 « coup lourd » : 4 images, les deux mains au-dessus de la tête puis grand coup vertical vers l'avant jusqu'au sol (lever, haut, frappe, fin) puis 2 cases vides.
```

Ensuite, je mesure moi-même la position de la main dans chaque image, comme pour les accessoires. Les poses « course » et « saut » actuelles serviront avec l'arme accrochée dans le dos ou à la main.

---

## Propositions de gameplay

**Principe** : le sabre reste l'arme de départ. Le **râtelier** de la laverie, à côté du vestiaire, sert à choisir **une arme** par héros. L'arme remplace le coup ; les capacités et les pouvoirs ne changent pas. Les commandes restent les mêmes partout : clavier, tactile (aucun bouton en plus) et manette. Chaque arme a trois petites jauges lisibles par un enfant : **portée, vitesse, force**.

| Arme | Coup | Idée propre à l'arme | Limite pour l'équilibre |
| --- | --- | --- | --- |
| Arc à ventouses | Flèche droite. Maintenir le bouton = flèche chargée, plus loin. | La flèche plantée dans un mur devient une **petite marche** pendant 3 s : chemins secrets vers les chaussettes dorées. | Lent à recharger, rien au corps à corps. |
| Lance | Estoc loin devant. | Coup vers le bas en l'air = **rebond** sur un ennemi ou un piège (comme un pogo). | Ne renvoie pas les lasers. |
| Pistolet à bulles | Bulles qui avancent en ondulant. | La bulle **enferme** l'ennemi 2 s : il flotte, un second coup le fait éclater. Une bulle vide sert de petit tremplin. | Faible contre les boss (la bulle éclate tout de suite). |
| Canon à confettis | Gros boulet lent, éclate en confettis. | **Casse les caisses et les murs fissurés.** Tiré vers le bas en l'air, le recul fait un petit saut en plus. | Long à recharger ; le recul repousse le héros. |
| Laser | Rayon continu tant qu'on maintient. | **Ricoche sur les miroirs** et allume les interrupteurs éloignés. | Surchauffe : petite jauge qui se vide. |
| Boomerang | Part et revient. | **Ramasse au passage** chaussettes, cœurs et objets de quête. Touche à l'aller et au retour. | Un seul en l'air à la fois. |
| Nunchaku | Enchaînement rapide de 3 coups, le 3e repousse. | Maintenir = **moulinet** qui renvoie les lasers de tous les côtés. | Portée courte. |
| Espadon | Grand coup lent, 2 de force contre les boss. | Coup lourd au sol : une **onde dorée** court sur quelques tuiles. | Le plus lent ; on avance moins vite pendant le coup. |
| Bouclier | Coup de bouclier court qui repousse. | Maintenir = **garde** : bloque tout devant et renvoie les lasers droit devant. | On marche lentement en garde, faible force. |
| Poings électriques | Crochets très rapides, portée minuscule. | Le coup **étourdit** 1 s. Attaque + Haut = uppercut avec un petit saut. Recharge les **générateurs** (centrale, usine). | Il faut aller tout près. |

**Comment on gagne les armes** (une fois chacune, enregistrées dans la sauvegarde comme les cosmétiques) :
- chaque boss vaincu en donne une : arc (centrale), boomerang (usine), nunchaku (temple), poings électriques (volcan), canon (port), laser (grotte) ;
- les quêtes : lance (Kage), pistolet à bulles (Bobine), bouclier (Capitaine) ;
- l'espadon s'obtient avec les 72 chaussettes.

**Petites mécaniques de salle**, facultatives, seulement sur les **chemins secrets** et les **chaussettes dorées**, pour ne jamais bloquer un enfant :
- murs fissurés (canon, espadon) ;
- miroirs et interrupteurs (laser) ;
- générateurs à recharger (poings) ;
- cibles à ventouse (arc) ;
- chaussettes en hauteur (boomerang).

La porte et le chemin normal restent faisables avec n'importe quelle arme.

**Programmes de lavage** : chaque programme pourrait proposer une arme imposée en option, avec son propre record, par exemple « Express à l'arc ».

**Doom** : les armes à distance sont un peu moins fortes, pour garder le défi des parents.
