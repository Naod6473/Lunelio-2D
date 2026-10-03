# Images à générer avec ChatGPT : la tour qui tourne

Le niveau : le héros grimpe un escalier en spirale autour d'une tour qui tourne sur elle-même. Le jeu enroule tout seul une texture plate sur un cylindre : il n'y a donc **pas besoin de vues de la tour sous plusieurs angles**, mais d'une **texture de pierres qui se répète sans raccord**.

## Mode d'emploi

1. Ouvre une **nouvelle conversation** ChatGPT et colle le **bloc STYLE** en premier message.
2. Envoie ensuite **une demande par message**. Chaque image donne un fichier.
3. Si le résultat ne va pas, redemande dans le même fil : « même chose, mais… ».
4. Télécharge chaque image en **PNG** et renomme-la avec le nom indiqué.
5. Dépose tout dans **`src/assets/pack_laverie/tour/`**.

Ce qui compte :
- le fond : **transparent**, ou magenta `#FF00FF` uni ;
- pour les animations, des **cases régulières** : le personnage ou l'objet au même endroit dans chaque case ;
- **aucun texte** dans l'image ;
- tout ce qui a un sens **regarde vers la droite**.

La taille exacte n'a pas d'importance : je réduis et je recale.

---

## Bloc STYLE (à coller en premier)

```
Tu vas m'aider à créer les images d'un niveau pour « Lunelio », un jeu de plateforme 2D pour enfants de 6 et 8 ans.
Le niveau : une haute tour de pierre magique, la nuit, qui tourne sur elle-même ; un escalier en spirale fait le tour de la tour
à l'extérieur, et le héros doit monter le plus haut possible.

Style obligatoire pour TOUTES les images de cette conversation :
- Pixel art net, pixels carrés bien visibles, sans anti-crénelage, sans flou, sans dégradé lisse.
- Ambiance néon synthwave : nuit violette et bleu nuit, lueurs cyan, roses et dorées.
- Contours sombres (#0e0a1a) autour des objets jouables (marches, plateformes, ennemis), pour qu'ils se détachent du décor.
- Le décor (fond, pierres de la tour) reste plus sombre et moins contrasté que les objets jouables.
- Ton joyeux et mignon, rien d'effrayant, pas de sang, pas d'armes réalistes.
- Aucun texte, aucune lettre, aucun chiffre, aucun logo dans les images.
- Fond transparent quand je le demande (sinon magenta #FF00FF uni, sans dégradé ni ombre).
Réponds seulement avec l'image demandée.
```

---

## T1 · Texture de la tour (la plus importante)

Fichier : `tour/tour_texture.png`

```
Une texture de mur de tour en pierre, vue parfaitement de face, à plat, sans perspective, sans ombre portée sur les côtés.
Format paysage large, environ 2 fois plus large que haute (par exemple 1024 × 512).
IMPORTANT : la texture doit se répéter SANS RACCORD visible : le bord gauche se raccorde exactement au bord droit,
et le bord du haut exactement au bord du bas (texture « tileable »).
Grosses pierres taillées violet foncé et bleu nuit, joints sombres, quelques pierres légèrement plus claires,
de petites touches de mousse lumineuse cyan et quelques runes magiques gravées qui brillent faiblement en rose.
Lumière uniforme sur toute l'image (pas plus clair au centre ni sur les bords).
Pas d'escalier, pas de fenêtre, pas de porte : seulement le mur. Pixel art.
```

## T2 · Marches de l'escalier

Fichier : `tour/marches.png`

```
Une planche de 3 marches d'escalier en pierre, vues de face légèrement par au-dessus (on voit le dessus et l'avant de chaque marche),
fond transparent, rangées sur une ligne dans 3 cases de même taille.
Chaque marche est un bloc horizontal (environ 4 fois plus large que haut) : dessus clair en pierre dorée et lavande,
avant plus sombre, bord avant bien net avec un fin liseré lumineux cyan.
Les 3 marches sont légèrement différentes (une fissurée, une avec un peu de mousse, une neuve), même taille, même position dans leur case.
Contour sombre #0e0a1a. Pixel art.
```

## T3 · Plateformes

Fichier : `tour/plateformes.png`

```
Une planche de plateformes pour un jeu de plateforme, fond transparent, sur une ligne, dans 4 cases de même taille :
1. une corniche de pierre qui dépasse du mur (plus large qu'une marche), solide et rassurante ;
2. une plateforme en bois et métal, avec deux petites lumières cyan (elle bougera de gauche à droite) ;
3. la même corniche de pierre, mais fissurée, prête à s'effondrer ;
4. la corniche fissurée qui s'effondre : morceaux de pierre qui tombent et petit nuage de poussière.
Vues de face, légèrement par au-dessus, contour sombre #0e0a1a. Pixel art.
```

## T4 · Fond (3 images, une par plan)

Fichiers : `tour/fond_ciel.png`, `tour/fond_loin.png`, `tour/fond_nuages.png`

Envoie les trois demandes l'une après l'autre.

```
Fond de jeu en pixel art, format paysage 16:9, ciel de nuit synthwave : dégradé en bandes nettes du bleu nuit (en haut) au violet
puis au rose (en bas), étoiles, une grosse lune ronde et douce. Pas de sol, pas de bâtiment. Plutôt sombre.
Le haut et le bas doivent pouvoir se répéter verticalement (le joueur monte très haut).
```

```
Même style, fond transparent : une rangée de montagnes et de collines lointaines violet sombre, avec quelques petites tours
et châteaux lointains aux fenêtres lumineuses roses, sur toute la largeur, en bas de l'image.
Le bord gauche se raccorde au bord droit. Très peu contrasté (c'est loin).
```

```
Même style, fond transparent : 5 ou 6 nuages de nuit séparés, violets et roses, bords lumineux, de tailles différentes,
bien espacés sur une grande image (ils défileront devant le ciel). Pixel art.
```

## T5 · Ennemi qui descend : le tonneau qui roule

Fichier : `tour/ennemi_tonneau.png`

```
Une planche d'animation pour un ennemi mignon : un petit tonneau de lessive vivant, avec de grands yeux espiègles,
qui dévale un escalier en roulant.
Fond transparent, cases régulières de même taille, l'objet centré au même endroit dans chaque case :
- ligne 1 : 6 images du tonneau qui roule vers la droite (il tourne sur lui-même) ;
- ligne 2 : 3 images de rebond sur une marche (écrasé, en l'air, retombe) ;
- ligne 3 : 4 images de disparition sans violence : il éclate en bulles de savon et en étoiles.
Contour sombre #0e0a1a, couleurs vives (bleu, blanc, une étiquette rose sans texte). Pixel art.
```

## T6 · Ennemi qui descend : le petit robot

Fichier : `tour/ennemi_robot.png`

```
Une planche d'animation pour un petit robot mignon et maladroit qui descend un escalier, vu de profil, regard vers la droite.
Fond transparent, cases régulières de même taille, robot centré, pieds au même endroit dans chaque case :
- ligne 1 : 6 images de marche ;
- ligne 2 : 4 images où il saute d'une marche à la suivante (accroupi, en l'air, atterrit, se relève) ;
- ligne 3 : 2 images où il tient sa tête en tournant (étourdi, petites étoiles) ;
- ligne 4 : 4 images de disparition : il explose en étincelles et en boulons, sans violence.
Robot rond, métal lavande, yeux cyan lumineux, petite antenne. Contour sombre #0e0a1a. Pixel art.
```

## T7 · Décors animés sur la tour

Fichier : `tour/decors.png`

```
Une planche de petits décors à accrocher sur un mur de tour, fond transparent, cases régulières de même taille :
- ligne 1 : 4 images d'une torche murale à flamme rose et dorée qui vacille ;
- ligne 2 : 4 images d'une petite fenêtre en arc, lumière dorée qui scintille à l'intérieur ;
- ligne 3 : 4 images d'un petit drapeau violet qui flotte au vent ;
- ligne 4 : 4 images d'un cristal cyan accroché au mur qui brille et pulse.
Vus de face, contour sombre #0e0a1a. Pixel art.
```

## T8 · La mousse qui monte

Fichier : `tour/mousse.png`

```
Une planche, fond transparent, en 2 lignes :
- ligne 1 : une bande de mousse de savon très large (le bord gauche se raccorde au bord droit), blanche et rose pâle,
  avec des bulles irisées cyan et roses ; le haut de la bande est bosselé, le bas uni ; 4 images de la même bande
  dont les bulles bougent un peu (animation en boucle) ;
- ligne 2 : 6 bulles de savon seules de tailles différentes, et 3 images d'une bulle qui éclate.
Pixel art, joyeux.
```

## T9 · Base et sommet de la tour (facultatif)

Fichier : `tour/base_sommet.png`

```
Deux images côte à côte, fond transparent, même largeur :
1. la base d'une tour de pierre ronde vue de face : un socle plus large avec une grande porte en arc fermée et deux lanternes ;
2. le haut d'une tour ronde vue de face : créneaux, un petit toit pointu violet et un drapeau rose.
Pierres violet foncé, comme un mur de château la nuit, liserés cyan. Pixel art.
```

## T10 · Vignette pour l'écran des mondes (facultatif)

Fichier : `tour/vignette.png`

```
Illustration en pixel art, format paysage 16:9 : une haute tour de pierre ronde la nuit, un escalier en spirale qui fait le tour
de la tour, un petit héros qui court sur les marches, un tonneau mignon qui dévale vers lui, de la mousse de savon rose en bas,
une grosse lune derrière. Ambiance synthwave violette, joyeuse et aventureuse. Aucun texte.
```

---

## Ce que je fais par le code (rien à générer)

- La rotation de la tour : la texture T1 est enroulée sur un cylindre, plus sombre et plus étroite sur les bords.
- La position des marches et des plateformes autour de la tour.
- La hauteur en mètres, le record, les consignes.
- En attendant les images, un dessin provisoire pour chacune.

Musique facultative : `audio/musique/bonus/tour.mp3`.
