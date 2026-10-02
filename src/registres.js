/* ---------------- Registres : laverie, collections, histoire ---------------- */
// Toutes les définitions ont un identifiant stable (jamais renommé : la sauvegarde s'en sert).
// Les conditions sont écrites en données et lues par testCond() (sauvegarde.js) :
//   { start: true }                 toujours vrai              { world: n }        n mondes de la campagne terminés
//   { boss: id } / { foe: sp }      boss / ennemi vaincu       { char: id }        une salle terminée avec ce héros
//   { socks: n }                    n chaussettes principales  { socksWorld: wid } toutes les chaussettes d'un monde
//   { socksWorldAny: true }         toutes celles d'un monde   { quest: id }       quête terminée (récompense reçue)
//   { questsDone: n }               n quêtes terminées         { challenge: id }   défi réussi
//   { challengesDone: n }           n défis réussis            { programsDone: n } n programmes différents réussis
//   { memory: id } / { memories: n } souvenir(s) débloqué(s)   { badge: id }       badge obtenu
//   { cardCat: cat }                catégorie de cartes complète { cardCatComplete: n } n catégories complètes
//   { cardsAll: true }              album complet              { charsAll: true }  une salle avec chacun des 8 héros
//   { oldFoe: type } / { oldBoss: monde } / { bonusWorld: n }  ancienne aventure
//   { flag: nom }                   exploit noté (noDamageBoss, doomBoss, secret, doomRoom…)
//   { visited: wid }                monde visité               { met: pnj }        client rencontré
//   { weapons: n }                  n armes possédées (râtelier) { all: [c1, c2…] }  toutes les conditions
// Une récompense s'écrit "type:id" (card, badge, cos, decor, track, mem) et n'est donnée qu'une fois (SAVE.got).

// Données placées à la main dans les salles (chaussettes, objets de quête, secrets, défis) : src/campagne_ajouts.json
const AJOUTS = __AJOUTS__;

// Pièces de la machine temporelle, une par monde : le boss du monde la garde
const PIECES = {
  "01_centrale": { id: "condensateur", name: "le condensateur", color: "#fccc28" },
  "02_usine": { id: "engrenages", name: "les engrenages du tambour", color: "#c8d0dc" },
  "03_temple": { id: "cadran", name: "le cadran des programmes", color: "#c86eff" },
  "04_volcan": { id: "resistance", name: "la résistance chauffante", color: "#ff8a3c" },
  "05_port": { id: "joint", name: "le joint du hublot", color: "#7dd8ff" },
  "06_grotte": { id: "cristal", name: "le cristal-mémoire", color: "#ff4fd8" },
};

// Personnages non jouables (portrait provisoire dessiné par le code tant que pnj/ et portrait_… n'existent pas)
const NPCS = {
  bulle: { name: "Mme Bulle", color: "#7dd8ff", skin: "#f0c8a0", hair: "#c8c8d8", cloth: "#7dd8ff", accent: "#ff8ab0", talk: "talk_bulle" },
  capitaine: { name: "Capitaine Barbe-Mouillée", color: "#ff5a3c", skin: "#e8b088", hair: "#3a6aff", cloth: "#c8302a", accent: "#fccc28", talk: "talk_capitaine" },
  bobine: { name: "Bobine", color: "#9fe8ff", skin: "#c8d0dc", hair: "#5ef0ff", cloth: "#ff8a3c", accent: "#5ef0ff", talk: "talk_bobine", robot: true },
  kage: { name: "Kage", color: "#c86eff", skin: "#e8c0a0", hair: "#2a1a3a", cloth: "#4a2a7a", accent: "#c86eff", talk: "talk_kage" },
  // l'église (eglise.js) : les mariés et leur chienne, dans les dialogues seulement (portraits portrait_<id>)
  laurene: { name: "Laurène", color: "#ff5a7a", talk: "talk_laurene", eglise: true },
  jules: { name: "Jules", color: "#6a8aff", talk: "talk_jules", eglise: true },
  brie: { name: "Brie", color: "#ff9a4a", talk: "talk_brie", eglise: true },
  firmin: { name: "Grand-père Firmin", color: "#fccc28", skin: "#f0c8a0", hair: "#ffffff", cloth: "#4a6aa8", accent: "#fccc28", talk: "talk_bulle" },
};

// Histoire : dialogues courts. who = clé de NPCS, "hero" (héros joué) ou "machine".
const STORY = {
  prologue: [
    ["bulle", "Bienvenue à la laverie ! Je suis Mme Bulle."],
    ["bulle", "Attention, cette vieille machine est un peu… farceuse."],
    ["machine", "BLOUB ! BLOUB ! Programme : « Essorage 3000 ans » !"],
    ["hero", "Hé ! Le hublot m'aspire !"],
    ["bulle", "Ses programmes envoient les gens dans d'autres époques !"],
    ["bulle", "Le programmateur est cassé : six pièces ont disparu."],
    ["bulle", "Ramène-les, et la machine te ramènera à la maison !"],
    ["bulle", "Entre dans la machine quand tu es prêt. Bonne chance !"],
  ],
  // retour à la laverie après chaque boss : la pièce est remise en place
  repair: {
    "01_centrale": [["bulle", "Tu as le condensateur ! La machine retrouve de l'énergie."], ["machine", "Bzzt ! Programme « Coton 40 » … presque !"], ["bulle", "Ha ha ! Encore cinq pièces."]],
    "02_usine": [["bulle", "Les engrenages du tambour ! Écoute-la ronronner."], ["machine", "Vrrrr… Programme « Linge robotique » activé."], ["bulle", "Pourvu qu'elle ne mélange plus les chaussettes…"]],
    "03_temple": [["bulle", "Le cadran des programmes ! On peut enfin les lire."], ["bulle", "Tiens, il y a un programme « Retour à la maison »…"], ["bulle", "Mais il lui manque encore trois pièces."]],
    "04_volcan": [["bulle", "La résistance chauffante ! Attention, ça brûle."], ["machine", "Programme « Lavage à 3000 degrés »… non merci !"], ["bulle", "Plus que deux pièces !"]],
    "05_port": [["bulle", "Le joint du hublot ! Il ne fuira plus."], ["bulle", "Tu sens cette odeur ? Ce sont les chaussettes du pirate…"], ["bulle", "Dernière pièce : le cristal-mémoire, dans la grotte néon."]],
    "06_grotte": [["bulle", "Le cristal-mémoire ! La machine est réparée !"], ["machine", "Programme « Retour à la maison » : PRÊT."], ["bulle", "Merci, petit héros. Tu peux rentrer chez toi !"]],
  },
  ending: [
    ["machine", "Programme « Retour à la maison » : C'EST PARTI !"],
    ["bulle", "Elle tourne… elle tourne… et elle ne mange aucune chaussette !"],
    ["hero", "Je suis rentré ! Merci Mme Bulle !"],
    ["bulle", "Reviens quand tu veux : la laverie reste ouverte."],
    ["bulle", "Il reste peut-être des chaussettes perdues à retrouver…"],
  ],
  // petites phrases de Mme Bulle selon l'avancée (la dernière qui convient est choisie)
  bulle: [
    { cond: { start: true }, lines: [["bulle", "Le programme « Délicat », c'est pour les chaussettes fragiles. Et les héros prudents !"]] },
    { cond: { socks: 1 }, lines: [["bulle", "Une chaussette puante ! Accroche-la sur l'étendoir, elle séchera."], ["bulle", "Chaque salle en cache une. Cherche bien !"]] },
    { cond: { world: 1 }, lines: [["bulle", "La machine de défis s'est allumée ! Essaie un programme de lavage."]] },
    { cond: { world: 2 }, lines: [["bulle", "Un drôle de robot attend son linge. Va lui parler !"]] },
    { cond: { world: 3 }, lines: [["bulle", "Mes bigoudis ? C'est pour le style, pas pour le lavage !"]] },
    { cond: { world: 4 }, lines: [["bulle", "Ce pirate sent la marée. Il cherche une chaussette, comme tout le monde ici."]] },
    { cond: { world: 6 }, lines: [["bulle", "La machine est réparée. Mais les chaussettes perdues, elles, sont toujours là-bas !"]] },
  ],
};

// Mécaniques propres à chaque monde (pour les prochaines séries de salles) : points d'extension, vides pour l'instant.
// Une mécanique = { id, monde, intro (salle qui l'introduit), params } ; le moteur les lira dans buildRoom().
const WORLD_MECHANICS = {};

// Armes du râtelier (armes.js). Identifiants stables (sauvegarde : SAVE.weapons). icon : case de armes_icones.png.
// Tenue en main : a0 = angle de l'arme dans son icône (degrés, 0 = vers la droite, négatif = vers le haut), grip = position de la
// poignée (part de la demi-longueur, en arrière du centre), len = taille en jeu, carry = angle au repos, aim = angle pour viser.
// stats : portée, vitesse, force (1 à 3) affichées au râtelier. Le sabre est l'arme de départ ; deux autres sont tirées au
// hasard dans une nouvelle partie, puis une de plus après chaque boss vaincu.
const WEAPONS = [
  { id: "sabre", name: "Sabre lumineux", icon: -1, stats: [2, 2, 2], desc: "L'arme de départ. Renvoie les tirs des ennemis." },
  { id: "arc", name: "Arc à ventouses", icon: 0, a0: 0, grip: 0, len: 18, carry: 60, aim: 0, stats: [3, 2, 1], desc: "Tire des flèches. Garde le bouton appuyé : flèche chargée qui traverse deux ennemis." },
  { id: "boomerang", name: "Boomerang", icon: 5, a0: 0, grip: 0.3, len: 11, carry: 30, aim: 0, stats: [3, 3, 1], desc: "Fonce tout seul sur l'ennemi le plus proche. Ne revient pas : lance-le encore et encore !" },
  { id: "lance", name: "Lance en mousse", icon: 1, a0: -40, grip: 0.6, len: 28, carry: -70, aim: 0, stats: [2, 2, 2], desc: "Pique loin devant. En l'air, Bas + coup : rebondis sur les ennemis !" },
  { id: "pistolet", name: "Pistolet à bulles", icon: 2, a0: 0, grip: 0.1, len: 13, carry: 40, aim: 0, stats: [2, 2, 1], desc: "Enferme les ennemis dans une bulle qui finit par éclater." },
  { id: "canon", name: "Canon à confettis", icon: 3, a0: -15, grip: 0, len: 17, carry: 20, aim: 0, stats: [2, 1, 3], desc: "Un gros boulet qui éclate en confettis et casse les caisses. Attention au recul !" },
  { id: "laser", name: "Bâton laser", icon: 4, a0: -35, grip: 0.6, len: 17, carry: -60, aim: 0, stats: [3, 3, 1], desc: "Rayon continu tant que tu appuies. S'il chauffe trop, attends qu'il refroidisse." },
  { id: "nunchaku", name: "Nunchaku", icon: 6, a0: -55, grip: 0.5, len: 14, carry: 60, aim: 0, stats: [1, 3, 1], desc: "Trois coups très rapides. Renvoie les tirs des ennemis comme le sabre." },
  { id: "espadon", name: "Espadon", icon: 7, a0: -40, grip: 0.65, len: 24, carry: 40, aim: 0, stats: [2, 1, 3], desc: "Lent mais très fort contre les boss. Le coup lance une onde dorée au sol." },
  { id: "lancepierre", name: "Lance-pierre", icon: 8, a0: -90, grip: 0.6, len: 12, carry: 0, aim: -90, stats: [2, 2, 1], desc: "Le caillou rebondit sur les murs et le sol." },
  { id: "maillet", name: "Maillet rigolo", icon: 9, a0: -45, grip: 0.6, len: 20, carry: -70, aim: 0, stats: [1, 1, 3], desc: "Tape le sol : l'onde étourdit les ennemis proches et casse les caisses." },
];
const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Trésors de la collection (onglet « Trésors » de l'album, étagère de la salle des trophées) : planche tresors_<n>.png,
// ligne row, 4 images en boucle. Récompense « tres:<id> », donnée une seule fois quand la condition devient vraie.
const TREASURES = [
  ["bulle_savon", "Bulle de savon", 3, 4, { met: "bulle" }, "Rencontre Mme Bulle"],
  ["chaussette_rose", "Chaussette rose", 3, 3, { socks: 1 }, "Trouve ta première chaussette"],
  ["coffre", "Coffre étoilé", 1, 0, { world: 1 }, "Termine la centrale électrique"],
  ["eclair", "Éclair", 3, 2, { boss: "roi_slime" }, "Bats le Roi Slime"],
  ["machine", "Mini machine à laver", 2, 1, { world: 2 }, "Termine l'usine"],
  ["pile", "Pile qui pétille", 5, 4, { boss: "drone_titan" }, "Bats le Drone Titan"],
  ["cadenas", "Cadenas cœur", 3, 0, { world: 3 }, "Termine le temple"],
  ["savon", "Savon de Marseille", 5, 2, { world: 4 }, "Termine le volcan"],
  ["chaine", "Chaîne dorée", 5, 1, { world: 5 }, "Termine le port"],
  ["cristal", "Cristal bleu", 1, 2, { boss: "reine_chauve_souris" }, "Bats la Reine chauve-souris"],
  ["etoile_filante", "Étoile filante", 4, 0, { world: 6 }, "Termine toute la campagne"],
  ["panier", "Panier de linge", 2, 2, { socks: 18 }, "Trouve 18 chaussettes"],
  ["piece", "Pièce étoile", 2, 4, { socks: 36 }, "Trouve 36 chaussettes"],
  ["chaussette_fantome", "Chaussette fantôme", 4, 2, { socksWorldAny: true }, "Trouve toutes les chaussettes d'un monde"],
  ["cle", "Clé étoile", 1, 1, { flag: "secret" }, "Trouve un chemin secret"],
  ["canard", "Canard de bain", 4, 3, { quest: "bobine" }, "Aide Bobine"],
  ["cintre", "Cintre doré", 2, 0, { quest: "kage" }, "Aide Kage"],
  ["etoile", "Étoile", 3, 1, { questsDone: 1 }, "Termine une quête"],
  ["cotillon", "Cotillon", 3, 5, { cardCatComplete: 1 }, "Complète une catégorie de cartes"],
  ["basket", "Basket ailée", 1, 5, { challenge: "express_centrale" }, "Réussis le programme Express"],
  ["bouclier", "Bouclier étoile", 1, 4, { challenge: "delicat_temple" }, "Réussis le programme Délicat"],
  ["elastique", "Élastique", 5, 3, { challenge: "essorage_port" }, "Réussis le programme Essorage"],
  ["lessive", "Bidon de lessive", 2, 3, { challenge: "froid_usine" }, "Réussis le programme Lavage à froid"],
  ["pinces", "Pinces à linge", 4, 4, { challengesDone: 3 }, "Réussis 3 programmes de lavage"],
  ["ticket", "Ticket magique", 2, 5, { memories: 3 }, "Débloque 3 souvenirs"],
  ["portail", "Portail du temps", 4, 1, { memories: 6 }, "Débloque les 6 souvenirs"],
  ["coeur", "Cœur brillant", 1, 3, { flag: "noDamageBoss" }, "Bats un boss sans être touché"],
  ["carquois", "Carquois", 5, 0, { weapons: 4 }, "Possède 4 armes"],
  ["boomerang", "Boomerang d'or", 5, 5, { weapons: 10 }, "Possède les 10 armes"],
].map(([id, name, sheet, row, cond, how]) => ({ id, name, atlas: "tresors_" + sheet, row, cond, how }));
const TREASURE_BY_ID = Object.fromEntries(TREASURES.map(t => [t.id, t]));
// Dessine un trésor (animé en boucle s'il est gagné, silhouette sinon)
function drawTreasure(t, x, y, s = 1, own = true) {
  if (!hasAtlas(t.atlas)) { text(own ? "★" : "?", x, y, 10 * s, own ? "#fccc28" : "#4a3a68", "center"); return; }
  const fr = t.row * 4 + (own ? Math.floor(time * 6 + t.row) % 4 : 0);
  if (own) drawFrame(t.atlas, fr, x, y, 1, 1, s);
  else { ctx.save(); ctx.filter = "brightness(0)"; drawFrame(t.atlas, fr, x, y, 1, 0.35, s); ctx.restore(); }   // silhouette (simplement pâle si le navigateur ignore filter)
}

/* ---- Surprises du calendrier (secrets.js) ---- */
// birthdays : anniversaires des enfants, « JJ-MM » (jour et mois seulement), par exemple ["14-03", "02-11"]
const CALENDAR = { birthdays: [] };

/* ---- Cartes ---- */
// cat : pnj, heros, monstres, boss. world : filtre (id de monde, "laverie" ou "bonus").
// art : { atlas, frame } (portrait du pack) ou { npc } (portrait dessiné) ou { foe } / { old } (sprite du jeu).
const CARD_CATS = [["pnj", "Clients"], ["heros", "Héros"], ["monstres", "Monstres"], ["boss", "Boss"]];
const CARDS = [
  { id: "pnj_bulle", cat: "pnj", world: "laverie", name: "Mme Bulle", art: { npc: "bulle" }, cond: { met: "bulle" }, how: "Entre dans la laverie",
    desc: "La gérante de la laverie. Elle connaît tous les programmes.", tip: "Ses bigoudis ne sont pas des pièces de la machine. Promis." },
  { id: "pnj_bulle_secret", cat: "pnj", world: "laverie", name: "Mme Bulle (en secret)", art: { npc: "bulle" }, cond: { flag: "bulleSecret" }, how: "Un secret de la laverie",
    desc: "Elle connaît des devinettes, des blagues… et elle danse avec le balai.", tip: "Plus on lui parle, plus elle en raconte." },
  { id: "pnj_capitaine", cat: "pnj", world: "05_port", name: "Capitaine Barbe-Mouillée", art: { npc: "capitaine" }, cond: { quest: "capitaine" }, how: "Termine la quête du capitaine",
    desc: "Un pirate perdu dans la laverie, avec un seul pied chaussé.", tip: "Sa barbe goutte toujours. Même au soleil." },
  { id: "pnj_bobine", cat: "pnj", world: "02_usine", name: "Bobine", art: { npc: "bobine" }, cond: { quest: "bobine" }, how: "Termine la quête de Bobine",
    desc: "Un petit robot qui lave son tee-shirt… beaucoup trop chaud.", tip: "Bobine fait « bip » quand il est content. Il fait souvent « bip »." },
  { id: "pnj_kage", cat: "pnj", world: "03_temple", name: "Kage", art: { npc: "kage" }, cond: { quest: "kage" }, how: "Termine la quête de Kage",
    desc: "Un jeune ninja qui a perdu sa ceinture dans les ombres.", tip: "Il est si discret qu'on oublie parfois qu'il est là." },
  { id: "pnj_firmin", cat: "pnj", world: "laverie", name: "Grand-père Firmin", art: { npc: "firmin" }, cond: { memory: "souvenir_1" }, how: "Débloque le premier souvenir",
    desc: "L'inventeur de la Lavotron 3000, et le grand-père de Mme Bulle.", tip: "Il voulait juste laver le linge plus vite que l'éclair." },
  ...["helio", "lune", "robot", "singe", "ninja", "rumi", "steve", "homme"].map(id => ({ id: "heros_" + id, cat: "heros", world: "laverie", heroId: id,
    art: { atlas: "portraits", anim: id }, cond: { char: id }, how: "Termine une salle de la campagne avec ce héros" })),
  { id: "monstre_slime", cat: "monstres", world: "01_centrale", foe: "slime", name: "Slime électrique", art: { foe: "slime" }, cond: { foe: "slime" }, how: "Bats un slime électrique",
    desc: "Il glisse lentement et pique au contact.", tip: "Faiblesse : un seul coup de sabre. Ne le touche pas avec les mains !" },
  { id: "monstre_drone", cat: "monstres", world: "02_usine", foe: "drone", name: "Drone sentinelle", art: { foe: "drone" }, cond: { foe: "drone" }, how: "Bats un drone sentinelle",
    desc: "Il vise avec un trait rouge, puis il tire.", tip: "Faiblesse : renvoie son laser au sabre, il fait 2 dégâts !" },
  { id: "monstre_ninja", cat: "monstres", world: "03_temple", foe: "ninja_ombre", name: "Ninja de l'ombre", art: { foe: "ninja_ombre" }, cond: { foe: "ninja_ombre" }, how: "Bats un ninja de l'ombre",
    desc: "Il lève son sabre (« ! ») puis il frappe devant lui.", tip: "Faiblesse : recule quand il lève le sabre, puis frappe pendant qu'il se relève." },
  { id: "monstre_golem", cat: "monstres", world: "04_volcan", foe: "golem", name: "Golem de lave", art: { foe: "golem" }, cond: { foe: "golem" }, how: "Bats un golem de lave",
    desc: "Il brille, puis il fonce droit devant.", tip: "Faiblesse : il faut deux coups. Saute par-dessus sa charge." },
  { id: "monstre_singe", cat: "monstres", world: "05_port", foe: "singe_pirate", name: "Singe pirate", art: { foe: "singe_pirate" }, cond: { foe: "singe_pirate" }, how: "Bats un singe pirate",
    desc: "Il bondit avec son petit sabre.", tip: "Faiblesse : recule pendant son bond, puis tranche à l'atterrissage." },
  { id: "monstre_chauve_souris", cat: "monstres", world: "06_grotte", foe: "chauve_souris", name: "Chauve-souris néon", art: { foe: "chauve_souris" }, cond: { foe: "chauve_souris" }, how: "Bats une chauve-souris néon",
    desc: "Elle plane, puis plonge vers toi.", tip: "Faiblesse : esquive le plongeon, elle reste en bas un instant." },
  { id: "monstre_marcheur", cat: "monstres", world: "bonus", old: "walker", name: "Robot marcheur", art: { old: "walker" }, cond: { oldFoe: "walker" }, how: "Ancienne aventure : bats un robot marcheur",
    desc: "Il marche, et fonce quand il te voit.", tip: "Faiblesse : un coup de sabre suffit." },
  { id: "monstre_canon", cat: "monstres", world: "bonus", old: "shooter", name: "Robot-canon", art: { old: "shooter" }, cond: { oldFoe: "shooter" }, how: "Ancienne aventure : bats un robot-canon",
    desc: "Il vise (trait rouge) puis tire un laser.", tip: "Faiblesse : renvoie son laser au sabre." },
  { id: "monstre_drone_ancien", cat: "monstres", world: "bonus", old: "drone", name: "Petit drone", art: { old: "drone" }, cond: { oldFoe: "drone" }, how: "Ancienne aventure : bats un petit drone",
    desc: "Il vole vers toi quand tu es proche.", tip: "Faiblesse : attends qu'il descende, puis tranche." },
  { id: "boss_roi_slime", cat: "boss", world: "01_centrale", boss: "roi_slime", name: "Roi Slime électrique", art: { atlas: "portraits_boss", anim: "roi_slime" }, cond: { boss: "roi_slime" }, how: "Bats le boss de la centrale",
    desc: "Il garde le condensateur… sur sa tête, comme une couronne.",
    phases: ["P1 : il marche et saute. Frappe-le quand il retombe.", "P2 : il lance des orbes et électrise une flaque à la fois.", "P3 : orbes triples, les flaques alternent. Après un grand saut, il souffle : frappe !"] },
  { id: "boss_drone_titan", cat: "boss", world: "02_usine", boss: "drone_titan", name: "Drone Titan", art: { atlas: "portraits_boss", anim: "drone_titan" }, cond: { boss: "drone_titan" }, how: "Bats le boss de l'usine",
    desc: "Il a vissé les engrenages du tambour sur son ventre.",
    phases: ["P1 : il plane et tire trois lasers. Renvoie-les !", "P2 : tirs doubles et petits drones en renfort.", "P3 : il plonge (trait rouge au sol) puis tire en éventail. Après le plongeon, il fume : frappe !"] },
  { id: "boss_maitre_ombres", cat: "boss", world: "03_temple", boss: "maitre_ombres", name: "Maître des ombres", art: { atlas: "portraits_boss", anim: "maitre_ombres" }, cond: { boss: "maitre_ombres" }, how: "Bats le boss du temple",
    desc: "Il prend le cadran des programmes pour un miroir sacré.",
    phases: ["P1 : il marche puis fonce (trait rouge). Saute par-dessus.", "P2 : il se téléporte derrière toi et lance des lames.", "P3 : téléportations et trois lames. Après sa charge, il s'essouffle : frappe !"] },
  { id: "boss_colosse_lave", cat: "boss", world: "04_volcan", boss: "colosse_lave", name: "Colosse de lave", art: { atlas: "portraits_boss", anim: "colosse_lave" }, cond: { boss: "colosse_lave" }, how: "Bats le boss du volcan",
    desc: "Il garde la résistance chauffante comme une bouillotte.",
    phases: ["P1 : il frappe le sol : saute au-dessus des ondes.", "P2 : pluie de rochers annoncée au sol (« ! »).", "P3 : double frappe et grosse pluie. Ensuite il s'assoit, épuisé : frappe !"] },
  { id: "boss_singe_roi_pirate", cat: "boss", world: "05_port", boss: "singe_roi_pirate", name: "Singe roi pirate", art: { atlas: "portraits_boss", anim: "singe_roi_pirate" }, cond: { boss: "singe_roi_pirate" }, how: "Bats le boss du port",
    desc: "Il porte le joint du hublot comme une bouée en or.",
    phases: ["P1 : il marche et bondit vers toi.", "P2 : bonds et noix de coco. Après trois bonds, il reprend son souffle : frappe !"] },
  { id: "boss_reine_chauve_souris", cat: "boss", world: "06_grotte", boss: "reine_chauve_souris", name: "Reine chauve-souris néon", art: { atlas: "portraits_boss", anim: "reine_chauve_souris" }, cond: { boss: "reine_chauve_souris" }, how: "Bats le boss de la grotte",
    desc: "Le cristal-mémoire brille dans son nid.",
    phases: ["P1 : elle plane et lance des orbes.", "P2 : elle appelle des chauves-souris et lance trois orbes.", "P3 : plongeons et cinq orbes. Après un plongeon, elle reste au sol : frappe !"] },
  ...Object.entries(BOSSES).map(([wid, b]) => ({ id: "boss_ancien_" + wid, cat: "boss", world: "bonus", oldBoss: wid, name: b.name, art: { oldBoss: wid },
    cond: { oldBoss: wid }, how: "Ancienne aventure : bats ce boss",
    desc: { brute: "Il charge et saute : saute par-dessus ses ondes de choc.", canon: "Il vole de place en place et tire des rafales.",
      mother: "Il lâche des drones et plonge vers toi.", final: "Le Dr. Boulon enchaîne charge, canon et drones." }[b.kind],
    tip: { brute: "Contre un mur, il reste étourdi : frappe !", canon: "Renvoie ses lasers au sabre.", mother: "Après le plongeon, il reste en bas un instant.", final: "Le boss final de l'ancienne aventure." }[b.kind] })),
];
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

/* ---- Badges ---- */
// icon : symbole dessiné sur la médaille (provisoire, en attendant icones/badges.png)
const BADGES = [
  { id: "premiere_chaussette", name: "Première chaussette", how: "Trouve ta première chaussette puante", cond: { socks: 1 }, icon: "sock", col: "#cd7f32" },
  { id: "dix_chaussettes", name: "Panier de linge", how: "Trouve 10 chaussettes", cond: { socks: 10 }, icon: "socks", col: "#c0c8d8" },
  { id: "moitie_chaussettes", name: "Grand panier", how: "Trouve 36 chaussettes", cond: { socks: 36 }, icon: "basket", col: "#fccc28" },
  { id: "toutes_chaussettes", name: "Chaussettes en or", how: "Trouve les 72 chaussettes", cond: { socks: 72 }, icon: "gold", col: "#ffd23c" },
  { id: "monde_propre", name: "Monde tout propre", how: "Trouve toutes les chaussettes d'un monde", cond: { socksWorldAny: true }, icon: "star", col: "#7dffb0" },
  { id: "premier_monde", name: "Premier voyage", how: "Termine un monde", cond: { world: 1 }, icon: "machine", col: "#5ef0ff" },
  { id: "campagne", name: "Retour à la maison", how: "Termine la campagne", cond: { world: 6 }, icon: "home", col: "#ffd23c" },
  { id: "premiere_quete", name: "Rendre service", how: "Termine une quête d'un client", cond: { questsDone: 1 }, icon: "bubble", col: "#ff8ab0" },
  { id: "toutes_quetes", name: "Ami de la laverie", how: "Termine les trois quêtes", cond: { questsDone: 3 }, icon: "heart", col: "#ff4f8a" },
  { id: "sans_degats", name: "Sans une égratignure", how: "Bats un boss sans être touché", cond: { flag: "noDamageBoss" }, icon: "shield", col: "#7dd8ff" },
  { id: "premier_programme", name: "Premier programme", how: "Réussis un programme de lavage", cond: { challengesDone: 1 }, icon: "bolt", col: "#ffb43c" },
  { id: "tous_programmes", name: "Maître lavandier", how: "Réussis les cinq programmes", cond: { programsDone: 5 }, icon: "swirl", col: "#c86eff" },
  { id: "premiere_categorie", name: "Collectionneur", how: "Complète une catégorie de cartes", cond: { cardCatComplete: 1 }, icon: "card", col: "#5ef0ff" },
  { id: "album_complet", name: "Album complet", how: "Trouve toutes les cartes", cond: { cardsAll: true }, icon: "book", col: "#ffd23c" },
  { id: "tous_heros", name: "Toute la bande", how: "Termine une salle avec chacun des 8 héros", cond: { charsAll: true }, icon: "crown", col: "#ff8a3c" },
  { id: "souvenirs", name: "Mémoire de la machine", how: "Débloque les six souvenirs", cond: { memories: 6 }, icon: "crystal", col: "#ff4fd8" },
  { id: "ancienne_aventure", name: "Vieux souvenirs", how: "Termine l'ancienne aventure", cond: { bonusWorld: 8 }, icon: "trophy", col: "#b6ff5a" },
  { id: "doom_boss", name: "Courage de parent", how: "Bats un boss en mode Doom", cond: { flag: "doomBoss" }, icon: "skull", col: "#ff3b5c" },
  { id: "secret", name: "Chemin secret", how: "Trouve une chaussette dorée cachée", cond: { flag: "secret" }, icon: "key", col: "#fccc28" },
  // frame : image de la planche badges.png reprise d'un autre badge ; tint : teinte de l'icône (médailles)
  { id: "main_dans_la_main", name: "Main dans la main", how: "Termine un monde à deux", cond: { flag: "duoWorld" }, icon: "heart", col: "#c86eff", frame: 8 },
  { id: "sauveteur", name: "Sauveteur", how: "À deux, sauve ton copain de sa bulle", cond: { flag: "rescue" }, icon: "bubble", col: "#bff4ff", frame: 7 },
  { id: "boss_rush", name: "Boss rush", how: "Termine le boss rush", cond: { flag: "rushDone" }, icon: "skull", col: "#ff5a7a", frame: 17 },
  { id: "premier_or", name: "Première médaille d'or", how: "Gagne une médaille d'or (temps d'un monde ou du boss rush)", cond: { flag: "goldMedal" }, icon: "star", col: "#ffd23c", frame: 4, tint: "#ffd23c" },
  { id: "pluie", name: "Pluie de chaussettes", how: "Un secret de la laverie… puis attrape 50 chaussettes", cond: { flag: "pluieDone" }, icon: "socks", col: "#5ef0ff", frame: 1, tint: "#5ef0ff" },
  { id: "or_partout", name: "Or partout", how: "Une médaille d'or dans chacun des 6 mondes", cond: { medalsGold: 6 }, icon: "trophy", col: "#ffd23c", frame: 16, tint: "#ffd23c" },
];

/* ---- Médailles du chrono ---- */
// Temps (secondes) pour l'or, l'argent et le bronze : un monde fait d'une traite (meilleur temps de la difficulté), et le boss rush.
// Les mêmes seuils pour toutes les difficultés. Réglés à l'estimation : à ajuster après les premières parties.
const MEDALS = {
  "01_centrale": [240, 360, 600], "02_usine": [270, 400, 660], "03_temple": [300, 440, 720],
  "04_volcan": [300, 440, 720], "05_port": [330, 480, 780], "06_grotte": [330, 480, 780],
  rush: [480, 720, 1140],
};
const MEDAL_NAMES = ["", "bronze", "argent", "or"], MEDAL_COLS = ["", "#cd7f32", "#d8e0f0", "#ffd23c"];
const MEDAL_LABELS = ["", "Médaille de bronze", "Médaille d'argent", "Médaille d'or"];
// 3 : or, 2 : argent, 1 : bronze, 0 : pas de médaille
function medalOf(kind, time) {
  const m = MEDALS[kind]; if (!m || typeof time !== "number") return 0;
  return time <= m[0] ? 3 : time <= m[1] ? 2 : time <= m[2] ? 1 : 0;
}

/* ---- Cosmétiques ---- */
// slot : acc (accessoire de tête), pal (couleurs du héros), fx (couleur du sabre et des effets), machine (machine temporelle).
// Ils changent l'apparence seulement : les capacités restent celles du héros. Équipés par héros (SAVE.cos.char[id]).
const COSMETICS = [
  { id: "acc_chapeau_pirate", slot: "acc", name: "Chapeau de pirate", cond: { quest: "capitaine" }, how: "Quête du capitaine" },
  { id: "acc_bandana", slot: "acc", name: "Bandana rouge", cond: { socks: 12 }, how: "12 chaussettes" },
  { id: "acc_echarpe", slot: "acc", name: "Écharpe de nuit", cond: { quest: "kage" }, how: "Quête de Kage" },
  { id: "acc_couronne_slime", slot: "acc", name: "Couronne de slime", cond: { socksWorld: "01_centrale" }, how: "Toutes les chaussettes de la centrale" },
  { id: "acc_lunettes", slot: "acc", name: "Lunettes néon", cond: { challenge: "express_centrale" }, how: "Programme Express" },
  { id: "acc_bonnet", slot: "acc", name: "Bonnet à pompon", cond: { challenge: "froid_usine" }, how: "Programme Lavage à froid" },
  { id: "acc_casque", slot: "acc", name: "Casque de chantier", cond: { world: 2 }, how: "Termine l'usine" },
  { id: "acc_bigoudis", slot: "acc", name: "Bigoudis de Mme Bulle", cond: { socks: 24 }, how: "24 chaussettes" },
  { id: "acc_oreilles", slot: "acc", name: "Oreilles de chauve-souris", cond: { boss: "reine_chauve_souris" }, how: "Bats la reine chauve-souris" },
  { id: "acc_fleurs", slot: "acc", name: "Couronne de fleurs", cond: { memories: 6 }, how: "Les six souvenirs" },
  { id: "acc_helice", slot: "acc", name: "Casquette à hélice", cond: { socks: 48 }, how: "48 chaussettes" },
  { id: "acc_bulle", slot: "acc", name: "Bulle de savon", cond: { socks: 72 }, how: "Les 72 chaussettes" },
  { id: "pal_menthe", slot: "pal", name: "Menthe", hue: 120, sat: 1, light: 0, cond: { socks: 6 }, how: "6 chaussettes" },
  { id: "pal_nuit", slot: "pal", name: "Bleu nuit", hue: 200, sat: 0.8, light: -0.08, cond: { challenge: "delicat_temple" }, how: "Programme Délicat" },
  { id: "pal_coucher", slot: "pal", name: "Coucher de soleil", hue: -40, sat: 1.15, light: 0.02, cond: { socks: 36 }, how: "36 chaussettes" },
  { id: "pal_rose", slot: "pal", name: "Rose néon", hue: 300, sat: 1.2, light: 0.03, cond: { questsDone: 2 }, how: "Deux quêtes" },
  { id: "pal_brillant", slot: "pal", name: "Variante brillante", hue: 0, sat: 1.1, light: 0.06, shiny: true, cond: { world: 6 }, how: "Termine la campagne" },
  { id: "pal_dore", slot: "pal", name: "Doré", gold: true, cond: { cardsAll: true }, how: "Album complet" },
  { id: "pal_pluie", slot: "pal", name: "Pluie", hue: 190, sat: 1.15, light: 0.02, cond: { flag: "pluieDone" }, how: "Un secret de la laverie" },
  { id: "fx_bulles", slot: "fx", name: "Bulles de savon", color: "#9fe8ff", color2: "#ffffff", cond: { questsDone: 1 }, how: "Première quête" },
  { id: "fx_or", slot: "fx", name: "Éclat d'or", color: "#ffd23c", color2: "#fff4c0", cond: { challengesDone: 2 }, how: "Deux défis réussis" },
  { id: "fx_glace", slot: "fx", name: "Givre", color: "#bff4ff", color2: "#5ec8ff", cond: { challenge: "essorage_port" }, how: "Programme Essorage" },
  { id: "fx_feu", slot: "fx", name: "Braise", color: "#ff8a3c", color2: "#ffd23c", cond: { boss: "colosse_lave" }, how: "Bats le colosse de lave" },
  { id: "fx_ombre", slot: "fx", name: "Ombre violette", color: "#b07dff", color2: "#5a2a9a", cond: { boss: "maitre_ombres" }, how: "Bats le maître des ombres" },
  { id: "fx_arcenciel", slot: "fx", name: "Arc-en-ciel", rainbow: true, color: "#ff4fd8", color2: "#5ef0ff", cond: { challenge: "solitaire_grotte" }, how: "Programme Chaussette solitaire" },
  { id: "machine_neon", slot: "machine", name: "Machine néon", hue: 260, sat: 1.3, light: 0.04, cond: { socks: 30 }, how: "30 chaussettes" },
  { id: "machine_menthe", slot: "machine", name: "Machine menthe", hue: 110, sat: 1, light: 0, cond: { world: 3 }, how: "Termine le temple" },
  { id: "machine_doree", slot: "machine", name: "Machine dorée", gold: true, cond: { world: 6 }, how: "Termine la campagne" },
];
const COS_BY_ID = Object.fromEntries(COSMETICS.map(c => [c.id, c]));
const COS_SLOTS = [["acc", "Tenue"], ["pal", "Couleurs"], ["fx", "Sabre et effets"]];

/* ---- Décoration de la laverie ---- */
// slot : tile (carrelage), light (éclairage), sign (couleur de l'enseigne), item (objet du coin détente, à poser ou ranger).
// Les trophées, le tas de chaussettes et le présentoir suivent les progrès du joueur (show : on peut les masquer).
const DECOR = [
  { id: "tile_damier", slot: "tile", name: "Damier", cond: { start: true }, how: "", colors: ["#d8d4e8", "#3a3450"] },
  { id: "tile_losanges", slot: "tile", name: "Losanges", cond: { socks: 18 }, how: "18 chaussettes", colors: ["#7a5aa8", "#3a2a5a"] },
  { id: "tile_bleu", slot: "tile", name: "Bleu piscine", cond: { world: 2 }, how: "Termine l'usine", colors: ["#5ac8e8", "#2a6a8a"] },
  { id: "tile_neon", slot: "tile", name: "Néon", cond: { socks: 60 }, how: "60 chaussettes", colors: ["#1a1030", "#ff4fd8"] },
  { id: "light_blanc", slot: "light", name: "Blanc", cond: { start: true }, how: "", color: "255,250,235" },
  { id: "light_rose", slot: "light", name: "Rose", cond: { world: 3 }, how: "Termine le temple", color: "255,120,220" },
  { id: "light_cyan", slot: "light", name: "Cyan", cond: { challengesDone: 1 }, how: "Un programme réussi", color: "120,240,255" },
  { id: "light_or", slot: "light", name: "Or", cond: { world: 6 }, how: "Termine la campagne", color: "255,210,90" },
  { id: "sign_violet", slot: "sign", name: "Violet", cond: { start: true }, how: "", color: "#c86eff" },
  { id: "sign_cyan", slot: "sign", name: "Cyan", cond: { world: 1 }, how: "Termine la centrale", color: "#5ef0ff" },
  { id: "sign_rose", slot: "sign", name: "Rose", cond: { badge: "premiere_chaussette" }, how: "Badge « Première chaussette »", color: "#ff4fd8" },
  { id: "sign_vert", slot: "sign", name: "Vert", cond: { questsDone: 1 }, how: "Une quête terminée", color: "#7dffb0" },
  { id: "sign_or", slot: "sign", name: "Or", cond: { socks: 72 }, how: "Les 72 chaussettes", color: "#ffd23c" },
  { id: "item_canape", slot: "item", name: "Canapé", cond: { world: 1 }, how: "Termine la centrale" },
  { id: "item_plante", slot: "item", name: "Plante verte", cond: { socks: 6 }, how: "6 chaussettes" },
  { id: "item_distributeur", slot: "item", name: "Distributeur de jus", cond: { world: 4 }, how: "Termine le volcan" },
  { id: "item_panier", slot: "item", name: "Panier à linge", cond: { socks: 30 }, how: "30 chaussettes" },
  { id: "item_table", slot: "item", name: "Table basse", cond: { questsDone: 1 }, how: "Une quête terminée" },
  { id: "item_drapeau", slot: "item", name: "Drapeau pirate", cond: { quest: "capitaine" }, how: "Quête du capitaine" },
  { id: "item_affiche_bobine", slot: "item", name: "Affiche de Bobine", cond: { quest: "bobine" }, how: "Quête de Bobine" },
  { id: "item_lanterne", slot: "item", name: "Lanterne du temple", cond: { quest: "kage" }, how: "Quête de Kage" },
];
const DECOR_BY_ID = Object.fromEntries(DECOR.map(d => [d.id, d]));
const DECOR_SLOTS = [["tile", "Carrelage"], ["light", "Éclairage"], ["sign", "Enseigne"], ["machine", "Machine"], ["item", "Coin détente"], ["show", "Trophées"]];
// éléments qui reflètent les progrès (toujours débloqués, on peut seulement les masquer)
const SHOWCASE = [["trophees", "Trophées des boss vaincus"], ["tas", "Tas de chaussettes"], ["presentoir", "Présentoir à badges"], ["etagere", "Étagère à trésors"]];

/* ---- Paliers de chaussettes ---- */
// Annoncés dans le menu de collection ; les récompenses sont celles dont la condition est { socks: n }.
const SOCK_TIERS = [6, 10, 12, 18, 24, 30, 36, 48, 60, 72];

/* ---- Souvenirs de la machine ---- */
// Un par monde, débloqué en ramenant la pièce du monde. scene : illustration provisoire dessinée par le code
// (remplacée par assets/laverie/souvenir_<n>.png quand elle existe).
const MEMORIES = [
  { id: "souvenir_1", world: "01_centrale", title: "L'atelier de Grand-père Firmin", cond: { world: 1 }, scene: "atelier",
    lines: ["Il y a longtemps, Grand-père Firmin avait un atelier plein d'outils.", "Il construisit une machine à laver ronde : la Lavotron 3000.", "« Elle lavera le linge plus vite que l'éclair ! » disait-il."] },
  { id: "souvenir_2", world: "02_usine", title: "La première chaussette", cond: { world: 2 }, scene: "chaussette",
    lines: ["Le premier jour, la machine tourna si vite…", "… qu'une chaussette disparut dans un tourbillon d'étoiles !", "Firmin comprit : sa machine voyageait dans le temps. Et les chaussettes aussi."] },
  { id: "souvenir_3", world: "03_temple", title: "La nuit de l'orage", cond: { world: 3 }, scene: "orage",
    lines: ["Un soir d'orage, un éclair tomba sur la laverie.", "Le programmateur se fendit en mille étincelles.", "Depuis, la machine choisit ses programmes toute seule."] },
  { id: "souvenir_4", world: "04_volcan", title: "Les pièces envolées", cond: { world: 4 }, scene: "pieces",
    lines: ["Six pièces s'échappèrent par le hublot.", "Elles tombèrent dans six époques différentes.", "Les boss les trouvèrent si brillantes qu'ils les gardèrent comme des trésors."] },
  { id: "souvenir_5", world: "05_port", title: "Le grand plongeon", cond: { world: 5 }, scene: "plongeon",
    lines: ["Bien plus tard, huit amis entrèrent dans la laverie.", "La machine s'alluma toute seule : BLOUB !", "Le hublot les aspira, comme un grand toboggan."] },
  { id: "souvenir_6", world: "06_grotte", title: "Le message de Firmin", cond: { world: 6 }, scene: "message",
    lines: ["Dans le cristal, Firmin sourit.", "« Avec les six pièces, appuie sur le bouton en forme de maison. »", "« Le programme Retour à la maison ramènera tout le monde. Même les chaussettes ! »"] },
];
const MEM_BY_ID = Object.fromEntries(MEMORIES.map(m => [m.id, m]));

/* ---- Programmes de lavage et défis ---- */
// Les programmes sont des variantes de salles existantes (copies : la campagne n'est jamais modifiée).
// Ils sont distincts des difficultés Facile, Normal et Doom, qui restent appliquées.
const PROGRAMS = {
  express: { name: "Express", color: "#ffb43c", icon: "⏱", rule: "Atteins la sortie avant la fin du chronomètre." },
  delicat: { name: "Délicat", color: "#ff8ab0", icon: "♥", rule: "Termine sans te faire toucher une seule fois." },
  essorage: { name: "Essorage", color: "#7dd8ff", icon: "≋", rule: "Des bourrasques de vent soufflent. Elles sont annoncées avant." },
  froid: { name: "Lavage à froid", color: "#bff4ff", icon: "❄", rule: "Le sol est gelé : ça glisse !" },
  solitaire: { name: "Chaussette solitaire", color: "#c86eff", icon: "?", rule: "Retrouve la chaussette cachée grâce aux indices." },
};
// rooms : salles jouées à la suite. unlock : condition d'accès. reward : récompenses à la première réussite.
// limit : temps (s) pour Express et Chaussette solitaire, calibré sans dash ni super vitesse.
// win / lose : textes affichés avant le départ. record : "time" (plus petit = mieux).
const CHALLENGES = [
  { id: "express_centrale", prog: "express", world: "01_centrale", rooms: ["centrale_01", "centrale_02", "centrale_03"], limit: 40, unlock: { world: 1 },
    win: "Passer la porte de la salle 3 avant 0 s", lose: "Le chronomètre arrive à 0", reward: ["cos:acc_lunettes"], record: "time" },
  { id: "delicat_temple", prog: "delicat", world: "03_temple", rooms: ["temple_02"], unlock: { world: 3 },
    win: "Passer la porte sans être touché", lose: "Un seul coup reçu (le bouclier protège)", reward: ["cos:pal_nuit"], record: "time" },
  { id: "essorage_port", prog: "essorage", world: "05_port", rooms: ["port_02"], unlock: { world: 5 }, gust: { every: 4.5, warn: 1.5, push: 1.2, force: 120 },
    win: "Passer la porte malgré le vent", lose: "Pas d'échec : si tu tombes, la salle recommence", reward: ["cos:fx_glace"], record: "time" },
  { id: "froid_usine", prog: "froid", world: "02_usine", rooms: ["usine_02"], unlock: { world: 2 }, grip: 0.22,
    win: "Passer la porte sur le sol gelé", lose: "Pas d'échec : si tu tombes, la salle recommence", reward: ["cos:acc_bonnet"], record: "time" },
  { id: "solitaire_grotte", prog: "solitaire", world: "06_grotte", rooms: ["grotte_04"], unlock: { world: 6 }, limit: 120,
    hints: ["Elle n'aime pas le sol : elle se cache en hauteur.", "Elle se cache du côté gauche de la salle.", "Elle brille quand tu passes tout près."],
    win: "Trouver la chaussette cachée", lose: "Le temps arrive à 0", reward: ["cos:fx_arcenciel"], record: "time" },
];
const CHAL_BY_ID = Object.fromEntries(CHALLENGES.map(c => [c.id, c]));

/* ---- Quêtes des clients ---- */
// appear : condition d'apparition dans la laverie. goal : objectif (items à ramasser dans les salles, ou défi à réussir).
// Les objets de quête sont placés dans AJOUTS.questItems et n'apparaissent que pendant la quête.
// after : dialogues une fois la quête terminée, qui évoluent avec la progression (la dernière qui convient est choisie).
const QUESTS = [
  { id: "bobine", npc: "bobine", appear: { world: 2 }, room: "salle", x: 196,
    intro: [["bobine", "Bip ! Bonjour ! Mon tee-shirt rétrécit à chaque lavage."], ["bobine", "Je le lave à 90 degrés. C'est normal, non ?"], ["bulle", "Ha ha ! Trop chaud, ça rétrécit !"], ["bobine", "Montre-moi le programme « Lavage à froid » ! Bip ?"]],
    goal: { type: "challenge", challenge: "froid_usine", text: "Réussis le programme « Lavage à froid » (machine de défis)" },
    outro: [["bobine", "BIP ! Mon linge reste à la bonne taille !"], ["bobine", "Tiens, voici une affiche de moi. Je suis très beau dessus."]],
    reward: ["card:pnj_bobine", "decor:item_affiche_bobine"], rewardText: "Carte de Bobine et son affiche pour la laverie",
    after: [{ cond: { start: true }, lines: [["bobine", "Bip ! Je lave tout à froid maintenant."]] },
      { cond: { world: 4 }, lines: [["bobine", "Le volcan, c'est trop chaud pour le linge. Bip."]] },
      { cond: { world: 6 }, lines: [["bobine", "La machine est réparée ! Je vais laver mes boulons."]] }] },
  { id: "kage", npc: "kage", appear: { world: 3 }, room: "salle", x: 335,
    intro: [["kage", "… Pardon, je ne voulais pas te faire peur."], ["kage", "J'ai perdu ma ceinture dans les ombres du temple."], ["kage", "Elle s'est coupée en trois morceaux. Tu peux les retrouver ?"]],
    goal: { type: "items", items: ["ceinture_1", "ceinture_2", "ceinture_3"], text: "Retrouve les 3 morceaux de ceinture dans le temple" },
    outro: [["kage", "Ma ceinture ! Mon kimono ne flotte plus."], ["kage", "Prends cette écharpe de nuit. Elle rend… un peu plus discret."]],
    reward: ["card:pnj_kage", "cos:acc_echarpe", "decor:item_lanterne", "track:ombres_kage"], rewardText: "Carte de Kage, écharpe de nuit, lanterne et une musique",
    after: [{ cond: { start: true }, lines: [["kage", "… Tu ne m'avais pas vu ? C'est normal."]] },
      { cond: { world: 5 }, lines: [["kage", "Le capitaine fait beaucoup de bruit. Les ninjas, non."]] }] },
  { id: "capitaine", npc: "capitaine", appear: { world: 4 }, room: "salle", x: 500,
    intro: [["capitaine", "Mille sabords ! Ma chaussette rayée a disparu !"], ["capitaine", "La machine l'a envoyée dans le volcan, j'en suis sûr."], ["capitaine", "Trouve-la, moussaillon, et je te donne un trésor !"]],
    goal: { type: "items", items: ["chaussette_rayee"], text: "Retrouve la chaussette rayée du capitaine dans le volcan" },
    outro: [["capitaine", "Ma chaussette ! Encore un peu chaude, mais elle sent bon le pirate."], ["capitaine", "Voici mon vieux chapeau et mon drapeau. Et ma chanson !"]],
    reward: ["card:pnj_capitaine", "cos:acc_chapeau_pirate", "decor:item_drapeau", "track:chanson_capitaine"], rewardText: "Carte du capitaine, chapeau, drapeau et sa chanson",
    after: [{ cond: { start: true }, lines: [["capitaine", "Deux pieds chaussés ! Je suis le pirate le plus élégant des sept mers."]] },
      { cond: { world: 5 }, lines: [["capitaine", "Tu as battu le Singe roi ? C'était mon perroquet… enfin, presque."]] },
      { cond: { world: 6 }, lines: [["capitaine", "Une machine réparée, des chaussettes propres : la belle vie !"]] }] },
];
const QUEST_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

/* ---- Jukebox ---- */
// base : musique (chemin dans audio/, sans .mp3) ou synth:<thème> (composition WebAudio du jeu).
// Une piste débloquée dont le fichier manque est affichée comme « à venir » (fichier attendu indiqué).
const TRACKS = [
  { id: "helio_1", group: "Héros", name: "Thème d'Hélio", base: "musique/heros/backgroundhelio", cond: { start: true }, how: "" },
  { id: "helio_2", group: "Héros", name: "Thème d'Hélio 2", base: "musique/heros/backgroundhelio2", cond: { start: true }, how: "" },
  { id: "lune_1", group: "Héros", name: "Thème de Lune", base: "musique/heros/backgroundlune", cond: { start: true }, how: "" },
  { id: "lune_2", group: "Héros", name: "Thème de Lune 2", base: "musique/heros/backgroundlune2", cond: { start: true }, how: "" },
  { id: "lune_3", group: "Héros", name: "Thème de Lune 3", base: "musique/heros/backgroundlune3", cond: { start: true }, how: "" },
  ...["robot", "singe", "ninja", "rumi", "steve", "homme"].map(id => ({ id: "synth_" + id, group: "Héros", name: `Thème : ${{ robot: "Robot", singe: "Singe", ninja: "Ninja", rumi: "Rumi", steve: "Steve", homme: "Randonneur" }[id]}`,
    base: "synth:" + id, cond: { char: id }, how: "Termine une salle avec ce héros" })),
  { id: "laverie", group: "Laverie", name: "La laverie", base: "musique/laverie/laverie", cond: { start: true }, how: "" },
  { id: "laverie_2", group: "Laverie", name: "La laverie 2", base: "musique/laverie/laverie2", cond: { start: true }, how: "" },
  { id: "laverie_nuit", group: "Laverie", name: "La laverie, la nuit", base: "musique/laverie/laverie_nuit", cond: { world: 6 }, how: "Termine la campagne" },
  { id: "defis", group: "Laverie", name: "Programmes de lavage", base: "musique/defis/defis", cond: { challengesDone: 1 }, how: "Réussis un programme" },
  ...[["centrale", "01_centrale", "Centrale électrique"], ["usine", "02_usine", "Usine robotique"], ["temple", "03_temple", "Temple des ombres"],
    ["volcan", "04_volcan", "Volcan primordial"], ["port", "05_port", "Port pirate"], ["grotte", "06_grotte", "Grotte néon"]].map(([s, w, n]) =>
    ({ id: "monde_" + s, group: "Mondes", name: n, base: "musique/mondes/" + s, cond: { visited: w }, how: "Entre dans ce monde" })),
  ...[["roi_slime", "Roi Slime électrique"], ["drone_titan", "Drone Titan"], ["maitre_ombres", "Maître des ombres"], ["colosse_lave", "Colosse de lave"],
    ["singe_roi_pirate", "Singe roi pirate"], ["reine_chauve_souris", "Reine chauve-souris néon"]].map(([b, n]) =>
    ({ id: "boss_" + b, group: "Boss", name: n, base: "musique/boss/" + b, cond: { boss: b }, how: "Bats ce boss" })),
  { id: "boss_synth", group: "Boss", name: "Combat (composition)", base: "synth:boss", cond: { boss: "roi_slime" }, how: "Bats un boss" },
  { id: "doom_1", group: "Doom", name: "Mode Doom", base: "musique/doom/doombackground", cond: { flag: "doomRoom" }, how: "Termine une salle en mode Doom" },
  { id: "doom_2", group: "Doom", name: "Mode Doom 2", base: "musique/doom/doombackground2", cond: { flag: "doomRoom" }, how: "Termine une salle en mode Doom" },
  { id: "prologue", group: "Histoire", name: "Introduction", base: "musique/histoire/intro", cond: { met: "bulle" }, how: "" },
  { id: "souvenir", group: "Histoire", name: "Souvenirs", base: "musique/histoire/souvenir", cond: { memories: 1 }, how: "Débloque un souvenir" },
  { id: "fin", group: "Histoire", name: "Retour à la maison", base: "musique/histoire/fin", cond: { world: 6 }, how: "Termine la campagne" },
  { id: "generique", group: "Histoire", name: "Générique", base: "musique/histoire/generique", cond: { world: 6 }, how: "Termine la campagne" },
  { id: "chanson_capitaine", group: "Quêtes", name: "Chanson du capitaine", base: "musique/quetes/chanson_capitaine", cond: { quest: "capitaine" }, how: "Quête du capitaine" },
  { id: "danse_bobine", group: "Quêtes", name: "Danse de Bobine", base: "musique/quetes/danse_bobine", cond: { quest: "bobine" }, how: "Quête de Bobine" },
  { id: "ombres_kage", group: "Quêtes", name: "Ombres de Kage", base: "musique/quetes/ombres_kage", cond: { quest: "kage" }, how: "Quête de Kage" },
];
const TRACK_BY_ID = Object.fromEntries(TRACKS.map(t => [t.id, t]));
const trackAvailable = t => t.base.startsWith("synth:") ? !!SYNTH_THEMES[t.base.slice(6)] : hasSound(t.base);
