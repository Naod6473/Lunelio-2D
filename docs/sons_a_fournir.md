# Sons à fournir — musiques, jingles et bruitages

## Où les déposer

Tout va dans **`audio/`**, à la racine du dépôt, dans les sous-dossiers ci-dessous. Ce dossier est déjà servi par Nginx et mis en cache par l'appli.

- Les fichiers qui existaient déjà sont **déjà rangés** dans cette arborescence (`musique/heros/`, `musique/doom/`, `sfx/joueur/coup.mp3`, `sfx/ennemis/laser.mp3`, `jingles/gameover.mp3`). Les dossiers vides contiennent un `.gitkeep` pour montrer où déposer.
- **Après avoir déposé des sons, relancer `python3 build.py`** dans `src/` : il écrit la liste des sons dans le jeu et dans le service worker (le jeu ne cherche plus les fichiers tout seul, ce qui évite les erreurs 404).
- **Tout est facultatif** : un fichier absent garde le comportement actuel (bruitage synthétisé, ou musique du personnage). Rien ne plante.
- **Variantes** : `nom.mp3`, puis `nom2.mp3`, `nom3.mp3`… Les numéros doivent se suivre (pas de `nom3` sans `nom2`).
- Noms en **minuscules, sans accent ni espace**, exactement comme ci-dessous.

## Sons déjà fournis (octobre 2026)

Tes fichiers ont été renommés et rangés ainsi (les noms d'origine sont entre parenthèses) :

| Fichier dans le jeu | Fichier fourni | Quand on l'entend |
| --- | --- | --- |
| `musique/laverie/laverie.mp3`, `laverie2.mp3` | `backgroundlaundry`, `backgroundlaundry2` | Laverie (une musique différente à chaque retour) |
| `musique/boss/roi_slime.mp3` … `reine_chauve_souris.mp3` | `bossfight1` à `bossfight6` (dans l'ordre des mondes) | Combat contre ce boss ; les boss de l'ancienne aventure les reprennent |
| `sfx/boss/intro.mp3` | `evillaughtboss` | Arrivée d'un boss |
| `sfx/boss/defaite_<boss>.mp3` | `deathboss1` à `deathboss6` (dans l'ordre des mondes) | Défaite de ce boss |
| `sfx/boss/attaque1.mp3` … `attaque5.mp3` | `bossattack1` à `bossattack5` | Attaques des boss : 1 frappe au sol et pluie de rochers, 2 tirs et orbes, 3 coup de sabre et charge, 4 sauts et noix de coco, 5 plongeon et renforts (au plus un son toutes les 1,2 s) |
| `sfx/machine/demarrage.mp3` | `washingmachineeffect` | La machine temporelle s'allume |

Si une musique de boss ne va pas avec son boss, il suffit d'échanger les deux fichiers dans `audio/musique/boss/`.

## Format

| | Musiques (boucles) | Jingles | Bruitages |
| --- | --- | --- | --- |
| Format | MP3 | MP3 | MP3 |
| Débit | 128–160 kbit/s | 128 kbit/s | 96–128 kbit/s |
| Canaux | stéréo | stéréo | **mono** |
| Fréquence | 44,1 kHz | 44,1 kHz | 44,1 kHz |
| Durée | 1 à 3 min | 2 à 6 s, sans boucle | 0,1 à 1,5 s |
| Début et fin | Boucle propre : la fin rejoint le début, sans silence | Fin naturelle | Pas de silence au début (le son doit partir tout de suite) |
| Volume | Environ −16 LUFS, toutes au même niveau | Un peu plus fort que la musique | Crête à −1 dB |

Taille totale à viser : moins de 40 Mo, car tout est mis en cache pour jouer hors ligne.

---

## Arborescence

★ = prioritaire pour la première livraison.

```
audio/
├── musique/
│   ├── heros/            (existants, déjà rangés)
│   │   ├── backgroundhelio.mp3, backgroundhelio2.mp3
│   │   └── backgroundlune.mp3, backgroundlune2.mp3, backgroundlune3.mp3
│   ├── doom/             (existants, déjà rangés)
│   │   └── doombackground.mp3, doombackground2.mp3
│   ├── laverie/
│   │   ├── laverie.mp3                ★ thème du hub : calme, rétro, ronronnement de machines
│   │   └── laverie_nuit.mp3           version plus douce, après la fin de la campagne
│   ├── mondes/           (une ou plusieurs variantes par monde : centrale2.mp3…)
│   │   ├── centrale.mp3               ★ électrique, bourdonnements, synthés qui grésillent
│   │   ├── usine.mp3                  ★ rythme mécanique, percussions métalliques
│   │   ├── temple.mp3                 ★ mystérieux, flûte, gong léger
│   │   ├── volcan.mp3                 ★ tambours graves, chaleur, énergique
│   │   ├── port.mp3                   ★ chanson de pirate joyeuse, accordéon
│   │   └── grotte.mp3                 ★ cristallin, échos, carillons néon
│   ├── boss/
│   │   ├── roi_slime.mp3              ★
│   │   ├── drone_titan.mp3            ★
│   │   ├── maitre_ombres.mp3          ★
│   │   ├── colosse_lave.mp3           ★
│   │   ├── singe_roi_pirate.mp3       ★
│   │   ├── reine_chauve_souris.mp3    ★
│   │   ├── bossbackground.mp3         musique de boss générique (de secours, et pour l'ancienne aventure)
│   │   └── <boss>_rage.mp3            facultatif : version plus intense pour la dernière phase (P3, P2 pour le singe)
│   ├── defis/
│   │   └── defis.mp3                  machine de défis : rapide, ludique, un peu de compte à rebours
│   ├── histoire/
│   │   ├── prologue.mp3               ★ la machine s'emballe et aspire le héros (30 s à 1 min, sans boucle)
│   │   ├── souvenir.mp3               douce, nostalgique, boîte à musique (scènes de souvenir)
│   │   ├── fin.mp3                    ★ « Retour à la maison » : triomphale et tendre
│   │   └── generique.mp3              générique de fin
│   ├── quetes/                        pistes gagnées par les quêtes, ajoutées au jukebox
│   │   ├── chanson_capitaine.mp3      récompense de la quête du Capitaine Barbe-Mouillée
│   │   ├── danse_bobine.mp3           récompense de la quête de Bobine (robot, électro rigolote)
│   │   └── ombres_kage.mp3            récompense de la quête de Kage (calme, flûte)
│   └── bonus/                         facultatif : ancienne aventure, une piste par monde
│       └── bar.mp3, immeuble.mp3, ruelle.mp3, cinema.mp3, avion.mp3, parking.mp3, metro.mp3, labo.mp3
│
├── jingles/
│   ├── victoire_boss.mp3      ★ boss vaincu
│   ├── monde_termine.mp3      ★ arrivée à la machine en fin de monde
│   ├── piece_machine.mp3      ★ une pièce de la machine récupérée
│   ├── reparation.mp3         ★ la pièce est posée sur la machine dans la laverie
│   ├── quete_acceptee.mp3
│   ├── quete_reussie.mp3      ★
│   ├── carte.mp3              nouvelle carte dans l'album
│   ├── badge.mp3              ★ nouveau badge
│   ├── palier.mp3             palier de chaussettes atteint
│   ├── defi_reussi.mp3        ★
│   ├── defi_rate.mp3          gentil, pas triste (« presque ! »)
│   ├── souvenir.mp3           nouveau souvenir débloqué
│   └── gameover.mp3           (existant, déjà rangé)
│
└── sfx/
    ├── joueur/
    │   ├── saut.mp3           ★ remplace le son synthétisé « jump »
    │   ├── double_saut.mp3        « dj »
    │   ├── dash.mp3               « dash »
    │   ├── atterrissage.mp3
    │   ├── coup.mp3               (existant, déjà rangé)
    │   ├── renvoi.mp3             laser renvoyé au sabre, « deflect »
    │   ├── touche.mp3         ★ le héros est touché, « hurt » (doux, pas de cri de douleur)
    │   └── soin.mp3               « heal »
    ├── pouvoirs/
    │   ├── rapide.mp3             Hélio, super vitesse
    │   ├── ralenti.mp3            Lune, ralenti
    │   ├── bouclier.mp3           robot
    │   ├── super_saut.mp3         singe
    │   ├── invisible.mp3          ninja
    │   ├── etourdir.mp3           Rumi, « stun »
    │   ├── bloc.mp3               Steve, « block »
    │   ├── soin_groupe.mp3        randonneur
    │   ├── jauge_pleine.mp3       la jauge de pouvoir est remplie
    │   └── fin_pouvoir.mp3
    ├── collecte/
    │   ├── chaussette.mp3     ★ chaussette trouvée (drôle : « pouic » + petit carillon)
    │   ├── chaussette_bonus.mp3   chaussette secrète, plus brillant
    │   ├── coeur.mp3
    │   ├── energie.mp3
    │   ├── objet_quete.mp3
    │   └── cristal.mp3            fragment de souvenir
    ├── ennemis/
    │   ├── laser.mp3              (existant, déjà rangé)
    │   ├── visee.mp3              un ennemi se prépare à attaquer, « aim »
    │   ├── defaite_robot.mp3  ★ étincelles et boulons
    │   ├── defaite_slime.mp3  ★ « splotch » rigolo
    │   ├── defaite_ombre.mp3      pouf de fumée
    │   ├── defaite_lave.mp3       effritement de pierre
    │   └── defaite_etoiles.mp3    pluie d'étoiles (singe, chauve-souris)
    ├── boss/
    │   ├── intro.mp3          ★ apparition d'un boss
    │   ├── coup_boss.mp3      ★ le boss est touché, « bosshit »
    │   ├── transformation.mp3 ★ changement de phase
    │   ├── onde_choc.mp3          « boom »
    │   ├── defaite.mp3            disparition du boss
    │   ├── roi_slime.mp3          signature : gros « bloup » électrique
    │   ├── drone_titan.mp3        moteur qui monte en régime
    │   ├── maitre_ombres.mp3      téléportation « fshh »
    │   ├── colosse_lave.mp3       grondement de pierre
    │   ├── singe_roi_pirate.mp3   cri de singe rigolo + noix de coco
    │   └── reine_chauve_souris.mp3 cri aigu, pas effrayant
    ├── pieges/
    │   ├── electricite.mp3        « zap »
    │   ├── alerte.mp3             un piège va s'activer (flaques, laser)
    │   ├── jet_eau.mp3
    │   ├── flammes.mp3
    │   ├── mur_casse.mp3          destructible détruit
    │   └── drapeau.mp3            point de sauvegarde touché
    ├── machine/
    │   ├── porte.mp3          ★ porte qui s'ouvre, « door »
    │   ├── demarrage.mp3      ★ la machine s'allume, « machine »
    │   ├── tambour.mp3            essorage (boucle de 2 s)
    │   ├── depart.mp3         ★ aspiration dans le hublot
    │   ├── arrivee.mp3        ★ sortie du hublot dans un nouveau monde
    │   └── programmateur.mp3      clic du cadran
    ├── laverie/
    │   ├── ambiance.mp3           boucle de fond : machines qui tournent, très discrète (30 s)
    │   ├── voix_bulle.mp3         « blabla » de dialogue façon jeu vidéo, une syllabe courte et aiguë
    │   ├── voix_capitaine.mp3     syllabe grave et bourrue
    │   ├── voix_bobine.mp3        bip robotique
    │   ├── voix_kage.mp3          syllabe soufflée
    │   ├── album_page.mp3         page qui tourne
    │   ├── armoire.mp3            porte de casier
    │   ├── equiper.mp3            accessoire équipé
    │   └── jukebox_piece.mp3      pièce dans le jukebox
    ├── interface/
    │   ├── deplacer.mp3           curseur dans un menu, « select »
    │   ├── valider.mp3            « start »
    │   ├── retour.mp3
    │   ├── refus.mp3              action impossible, « nope »
    │   └── pause.mp3
    └── defis/
        ├── bourrasque_alerte.mp3  ★ annonce de bourrasque (sifflet montant, 1,5 s avant)
        ├── bourrasque.mp3     ★ coup de vent
        ├── chrono_tic.mp3     ★ dernières 10 secondes
        ├── chrono_fin.mp3         temps écoulé
        └── glissade.mp3           glissade sur sol gelé
```

## Résumé des priorités

1. **Musiques ★** : laverie, 6 mondes, 6 boss, prologue, fin (15 morceaux).
2. **Jingles ★** : victoire de boss, monde terminé, pièce de machine, réparation, quête réussie, badge, défi réussi.
3. **Bruitages ★** : chaussette, saut, touché, défaites robot et slime, intro, coup et transformation de boss, porte, démarrage, départ et arrivée de la machine, bourrasques, chrono.

Le reste peut venir petit à petit : chaque fichier ajouté remplace automatiquement le son synthétisé correspondant.
