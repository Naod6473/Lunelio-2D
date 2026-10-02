# Laverie, collections et activités — décisions validées

Brainstorm du 1er octobre 2026 (rien n'est encore codé).

- **Sauvegarde commune à tous les personnages** : campagne, collections, quêtes et records partagés. Les sauvegardes actuelles peuvent être remises à zéro : pas de migration obligatoire de `lunelio-v2-*` (une sauvegarde versionnée `lunelio-save` remplace tout ; les réglages `lunelio-options` sont gardés).
- **Entrée dans le jeu** : la laverie d'abord (court prologue : la machine aspire le héros), puis choix des portes. Les postes de la laverie s'allument au fil de la progression.
- **Histoire** : les chaussettes perdues dans les machines voyagent dans le temps ; les six pièces du programmateur sont gardées par les six boss ; la machine a été construite par Grand-père Firmin (proposition), grand-père de Mme Bulle. **Le Dr. Boulon n'est pas relié à cette histoire.**
- **Cosmétiques autorisés pour tous les héros, Hélio et Lune compris** : facultatifs, l'apparence d'origine reste celle par défaut. On commence par des accessoires de tête communs et des variantes de couleur.
- **Sons et sprites fournis par le parent** : voir `sons_a_fournir.md` et `prompt_sprites_chatgpt.md`. En attendant, versions provisoires dessinées ou synthétisées par le code.
- **L'ancienne aventure a sa place dans l'album** (robots et 8 boss).

## État de la livraison (branche `claude/great-franklin-6czzel`)

Tout ce qui est décrit dans la demande est jouable ; les images et les sons définitifs restent à fournir.

| Système | Où | État |
| --- | --- | --- |
| Sauvegarde commune v3 et migration | `src/sauvegarde.js` | Fait, anciennes clés reprises puis laissées en place |
| 72 chaussettes, 6 chaussettes dorées | `src/campagne_ajouts.json` | Fait, vérifiées par `verifier_niveaux.py` |
| Laverie en trois pièces (grande salle, salle des chaussettes, salle des trophées), Mme Bulle, 3 clients | `src/laverie.js` | Fait avec les décors fournis ; clients et quelques postes encore dessinés par le code |
| Album (36 cartes), 19 badges, paliers | `src/registres.js`, `src/ecrans.js` | Fait |
| 3 quêtes (Bobine, Kage, capitaine) | `src/registres.js` | Fait |
| 5 programmes de lavage | `src/defis.js` | Fait, un défi par programme, testés |
| Cosmétiques (12 tenues, 6 couleurs, 6 effets, 3 machines) et décoration | `src/laverie.js`, `src/ecrans.js` | Fait |
| 6 souvenirs et fin « Retour à la maison » | `src/registres.js`, `src/ecrans.js` | Fait, scènes provisoires |
| Jukebox | `src/ecrans.js` | Fait ; les morceaux absents sont marqués « à venir » |
| Boss : P1 / P2 / dernière phase, décor qui réagit | `src/campagne.js` | Fait (17 phases respectées) |
| Mécaniques de monde, nouveaux secrets | `WORLD_MECHANICS`, `campagne_ajouts.json` | Points d'extension prêts, à remplir avec les prochaines salles |

### Images déjà fournies (octobre 2026)

Les trois décors de la laverie (`laundry_room.png`, `laundry_socks_room.png`, `trophyroom.png`), les portes entre les pièces (`laundrydoors.png`), la chaussette animée (`sock_sprite.png`), le tas de chaussettes en six tailles (`laundrysocks.png`) et les six trophées (`trophy_sprite.png`). Elles remplacent le fond unique prévu au départ : la laverie a maintenant trois pièces reliées par des portes, et la grande salle défile avec le héros. Dans la grande salle, le banc, les machines empilées et l'étagère sont des plateformes : on grimpe jusqu'au jukebox.

### Éléments provisoires (remplacés automatiquement dès que l'image existe)

Dessinés par le code en attendant les images de `docs/prompt_sprites_chatgpt.md`, à déposer dans `src/assets/pack_laverie/` puis `python3 preparer_laverie.py` et `python3 build.py` :

- encore dessinés par le code, à fournir en priorité : les 4 clients (sprites et portraits), le vestiaire, le lutrin des collections, le pot de peinture de la décoration, le présentoir à badges ;
- branchés (l'image remplace le dessin dès qu'elle est là) : enseigne, machine de défis, jukebox, lutrin, armoire, machine réparée (7 états), bulles des clients, sprites et portraits des 4 clients, illustrations des monstres, badges, chaussette dorée, objets de quête, accessoires, scènes des souvenirs ;
- découpés par le script mais pas encore utilisés (le dessin par le code reste) : carrelage, vitrine, présentoir, étendoir, coin détente, cadres des cartes, petites icônes, traînées de vent, autocollants de la machine, image de fin.

Sons : tous facultatifs, voir `docs/sons_a_fournir.md`. Aujourd'hui seules les musiques des héros et du mode Doom, le coup de sabre, le laser et le game over sont des fichiers ; le reste est synthétisé.

### Questions encore ouvertes

1. Les capacités des six nouveaux héros restent des propositions à valider.
2. Le prénom « Grand-père Firmin » et les textes des souvenirs : à relire.
3. Les seuils des paliers de chaussettes et les récompenses associées : à ajuster après quelques parties.
