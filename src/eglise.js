/* ---------------- L'église : le mariage de Laurène et Jules ---------------- */
// Après les 6 mondes, une cloche sonne dans la laverie à chaque retour (la première fois, Mme Bulle en parle) et la machine
// propose « L'église » (EGLISE_CARD). Dans une réalité alternative, Laurène et Jules se marient ; ils sont méchants et se moquent
// du héros. Actes (EG_SCRIPT) sur trois plans fixes (eglise_1 à 3, sans plateforme, sol à EG_FLOOR) : Brie, Jules, Laurène, puis
// Laurène (en furie) et Jules ensemble, 10 % plus rapides, Brie aboyant depuis le bord ; dialogues à portraits entre les actes
// (EG_DLG). Les boss sont des ennemis « egboss » (le sabre, le dash et les armes les touchent : egDamage) qui enchaînent des
// coups (EG_MOVES), avec des répliques en bulles et des tremblements d'écran quand ils crient. Musique : l'église, « à fond » au
// début, pendant les dialogues, qui reprend là où elle s'était arrêtée (audio.resume) ; pendant un combat, le thème du boss
// (musique/eglise/<boss>.mp3) s'il existe, les deux thèmes en alternance pour le duo. À la fin, les mariés explosent en confettis.
// Puis Mamie Florence, la mère de Jules, venge le mariage : deux combats dans le cimetière (le deuxième plus rapide), une
// transformation, puis la géante derrière le muret de la place (plan 4, en parallaxe) : il faut lui renvoyer ses voitures
// en les frappant juste avant qu'elles tombent (voir « Mamie Florence » plus bas).
// Pas de récompense : le niveau est fini (SAVE.flags.egliseWon) et la cloche se tait.
const EG_READY = true, EG_MUSIC = "musique/eglise/eglise", EG_LEVEL = 0.9;
// Sol de chaque plan (parvis, marches, nef, cimetière, place au muret : le héros est devant le muret, plus bas)
const EG_FLOORS = [236, 236, 236, 236, 258], EG_PLANS = ["Le parvis", "Les marches", "La nef", "Le cimetière", "La place"];
let EG_FLOOR = 236;
function egSetPlan(plan) { EG.plan = plan; EG_FLOOR = EG_FLOORS[plan] || 236; if (lvl && lvl.eglise) { lvl.solids[0].y = EG_FLOOR; lvl.plats = []; } EG.cars = []; }
const EG = { step: 0, plan: 0, st: "intro", t: 0, fade: 0, trans: null, paused: false, music: null, bell: null, bosses: [], poops: [], bubbles: [], brieEdge: null, deathT: 0, endT: 0, nextT: 0, loudT: 0, cars: [] };
function egliseOpen() { return SAVE.camp.done >= CWORLDS.length && (EG_READY || !!SAVE.flags.egliseTest); }
// Écran des mondes : Maj + E montre ou cache l'église tant qu'elle est en chantier (EG_READY faux)
function egliseCheat() {
  if (EG_READY || !((keys.ShiftLeft || keys.ShiftRight) && hit("KeyE"))) return;
  SAVE.flags.egliseTest = SAVE.flags.egliseTest ? 0 : 1; saveGame();
  msg = { text: SAVE.flags.egliseTest ? "Église en chantier : visible" : "Église en chantier : cachée", t: 2.5 };
  audio.sfx("eg_cloche");
}
// Son long (cloches) qu'on peut arrêter en fondu
function egSound(name, vol = 1) {
  const f = SFX_FILES[name], buf = f && audio.buffers[f];
  if (!audio.ctx || !OPT.sfx || !buf) { audio.sfx(name); return { stop() {} }; }
  const c = audio.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(audio.sfxG); s.start();
  return { stop(sec = 1) { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, sec / 3); try { s.stop(t + sec + 0.5); } catch (e) {} } };
}
// Carte de l'écran des mondes : le parvis assombri, les mariés devant
function drawEgliseCard(r, tw, th) {
  if (hasAtlas("eglise_1")) drawFrame("eglise_1", 0, r.x + 4 + tw / 2, r.y + 4 + th, 1, 1, tw / VW); else R(r.x + 4, r.y + 4, tw, th, "#2a0a1a");
  ctx.imageSmoothingEnabled = false;
  R(r.x + 4, r.y + 4, tw, th, `rgba(30,0,20,${0.25 + 0.1 * Math.sin(time * 2)})`);
  if (hasAtlas("eg_jules")) drawFrame("eg_jules", 0, r.x + r.w / 2 - 14, r.y + 4 + th, 1, 1, 0.55);
  if (hasAtlas("eg_laurene")) drawFrame("eg_laurene", 0, r.x + r.w / 2 + 14, r.y + 4 + th, -1, 1, 0.55);
}

/* ---- Script : dialogues et actes ---- */
const EG_DLG = {
  cloche: [
    ["bulle", "Tu entends cette cloche ? Elle ne vient pas de chez nous…"],
    ["bulle", "La machine capte un mariage dans une autre réalité. Un mariage très, très bizarre."],
  ],
  arrivee: [
    ["jules", "Oh, regarde chérie… un invité qui n'est pas sur la liste."],
    ["laurene", "Avec des chaussettes pareilles ? Quelle élégance…"],
    ["hero", "C'est quoi, ce mariage tout noir ?"],
    ["laurene", "Le plus beau jour de notre vie. Et tu vas le gâcher. Brie, mon trésor… attaque !"],
    ["brie", "Grrr… WAF ! WAF !"],
    ["jules", "Attention, elle n'a rien mangé depuis la mairie."],
  ],
  brie_fin: [
    ["brie", "Wouf…"],
    ["jules", "Tu as battu notre chienne ? Le jour de notre MARIAGE ?"],
    ["laurene", "Jules, mon amour, occupe-toi de lui. Et ne froisse pas ton costume."],
  ],
  jules_debut: [
    ["jules", "J'ai répété ma danse pendant des mois. Tu vas l'adorer…"],
    ["hero", "Je préfère les danses sans boules violettes !"],
  ],
  jules_fin: [
    ["jules", "Ma boutonnière… Tu as abîmé ma boutonnière…"],
    ["laurene", "Pathétique. Il faut toujours tout faire soi-même."],
  ],
  laurene_debut: [
    ["laurene", "Tu n'étais pas invité, mais tu auras droit au gâteau… en pleine figure."],
  ],
  duo: [
    ["laurene", "Jules ! Debout ! On ne laisse pas un petit héros gâcher notre fête !"],
    ["jules", "Oui, ma chérie… Pour le meilleur…"],
    ["laurene", "… ET POUR LE PIRE !"],
    ["hero", "Deux contre un ? Ce n'est pas très gentil !"],
    ["jules", "Gentil ? Ce n'était pas dans nos vœux."],
  ],
  fin: [
    ["laurene", "Non… Ma robe… Mon mariage…"],
    ["jules", "Chérie… Je crois qu'on va… exploser."],
  ],
  mamie_arrivee: [
    ["mamie", "QUI a transformé mon fils en confettis ?!"],
    ["hero", "Euh… C'était joli, non ? Plein de couleurs…"],
    ["mamie", "Mon petit Jules… et sa Laurène… le jour de leur mariage !"],
    ["mamie", "Je suis Mamie Florence. Et Mamie Florence n'est PAS contente."],
    ["mamie", "Tu aimes les voitures ? Moi, je les LANCE !"],
  ],
  mamie_1_fin: [
    ["mamie", "Aïe, mon dos… Tu crois que c'est fini ?"],
    ["mamie", "J'ai fait de la gym toute ma vie. Je ne fais que m'échauffer !"],
  ],
  mamie_2_debut: [
    ["hero", "Mamie, on pourrait plutôt boire un chocolat chaud ?"],
    ["mamie", "Plus tard ! D'abord, la deuxième manche. Et plus vite !"],
  ],
  mamie_furie: [
    ["mamie", "ASSEZ !"],
    ["mamie", "Tu vas voir la VRAIE Mamie Florence !"],
    ["hero", "Euh… Elle grandit, là ?!"],
  ],
  mamie_geante: [
    ["mamie", "Alors, petit invité ? On fait moins le malin ?"],
    ["hero", "Ses voitures… Si je les frappe juste avant qu'elles tombent, elles repartent vers elle !"],
  ],
  mamie_fin: [
    ["mamie", "Ma voiture… Mes pneus… Mon fils…"],
    ["mamie", "Bon. Tu as gagné. Mais tu viendras goûter dimanche !"],
  ],
  apres: [
    ["hero", "Tous mes vœux de bonheur… dans votre réalité !"],
    ["hero", "Et pas de voiture au goûter, d'accord ?"],
  ],
};
// Chaque étape : plan de l'arène, dialogue (avant le combat), combat (boss qui entrent)
const EG_SCRIPT = [
  { plan: 0, dlg: "arrivee", fight: ["brie"] },
  { plan: 0, dlg: "brie_fin" },
  { plan: 1, dlg: "jules_debut", fight: ["jules"] },
  { plan: 1, dlg: "jules_fin" },
  { plan: 2, dlg: "laurene_debut", fight: ["laurene"] },
  { plan: 2, dlg: "duo", fight: ["laurene", "jules"], duo: true },
  { plan: 2, dlg: "fin", confetti: true },
  { plan: 3, dlg: "mamie_arrivee", fight: ["mamie"], extras: [{ id: "mamie", x: 390 }] },
  { plan: 3, dlg: "mamie_1_fin" },
  { plan: 3, dlg: "mamie_2_debut", fight: ["mamie"], fast: true },
  { plan: 3, dlg: "mamie_furie" },
  { plan: 4, dlg: "mamie_geante", fight: ["mamie_geante"], giant: true },
  { plan: 4, dlg: "mamie_fin", end: true },
];

/* ---- Les boss ---- */
// hp : points de vie (× bossHp de la difficulté) ; w, h : boîte de collision ; spd : vitesse de marche
const EGB = {
  brie: { name: "Brie", atlas: "eg_brie", hp: 12, w: 30, h: 22, spd: 140, color: "#ff9a4a",
    say: ["WAF !", "Grrr…", "WAF WAF !", "Ouaf !"] },
  jules: { name: "Jules", atlas: "eg_jules", hp: 18, w: 16, h: 54, spd: 70, color: "#6a8aff",
    say: ["Prends ça !", "Tiens, attaque-le, mon orbe !", "Admire ma danse !", "Pas sur les chaussures !", "Trop lent !"] },
  laurene: { name: "Laurène", atlas: "eg_laurene", hp: 20, w: 18, h: 58, spd: 70, color: "#ffe0f0",
    say: ["Prends ça !", "Tiens, attrape le bouquet !", "Une petite chèvre pour toi !", "Santé !", "Tu n'étais pas invité !"] },
  mamie: { name: "Mamie Florence", atlas: "eg_mamie", hp: 22, w: 22, h: 60, spd: 72, color: "#f0e6d0",
    say: ["Attrape, mon chou !", "Un petit pneu ?", "À mon âge, je lance encore loin !", "Range ta chambre !", "Bip bip !"] },
  mamie_geante: { name: "Mamie Florence (géante)", atlas: "eg_mamie_furie", hp: 5, w: 60, h: 120, spd: 25, color: "#ff5a7a", giant: true,
    say: ["Attrape celle-là !", "J'en ai plein d'autres !", "Bip bip !", "Tu ne m'auras pas !"] },
};
const EG_FPS = { repos: 7, course: 12, aboie: 9, saut: 9, crotte: 6, morte: 1, marche: 7, glissade: 10, cri: 8, lancer: 10, combat_pieds: 10,
  lancer_bouquet: 10, lancer_chevre: 9, lancer_bouteille: 10, furie: 7, lancer_avant: 6, lancer_haut: 6, lancer_rotation: 7 };
function egMakeBoss(id, x, duo, fast) {
  const B = EGB[id], d = df(), hp = Math.max(B.giant ? 3 : 4, Math.round(B.hp * d.bossHp * (duo ? 0.8 : 1)));
  const e = { type: "egboss", id, B, alive: true, x: x - B.w / 2, y: EG_FLOOR - B.h, w: B.w, h: B.h, vx: 0, vy: 0, face: -1, ground: true,
    hp, max: hp, mv: null, mt: 0, cd: 1.2, an: id === "brie" ? "repos" : "marche", anT: 0, inv: 0, flash: 0,
    spd: (duo ? 1.1 : 1) * (fast ? 1.25 : 1) * (d.id === "doom" ? 1.15 : d.id === "facile" ? 0.85 : 1), rage: false, furie: duo && id === "laurene", duo, fast: !!fast, down: false, sayCd: 2 };
  if (B.giant) { e.x = x - B.w / 2; e.y = 30; e.ground = false; e.an = "repos"; e.cd = 2; }   // derrière le muret, hors d'atteinte
  return e;
}
const egCx = e => e.x + e.w / 2;
function egSay(e, text) { EG.bubbles = EG.bubbles.filter(b => b.e !== e); EG.bubbles.push({ e, text, t: 1.6 }); }
function egTaunt(e, chance = 0.5) { if (e.sayCd <= 0 && Math.random() < chance) { egSay(e, e.B.say[Math.floor(Math.random() * e.B.say.length)]); e.sayCd = 3 + Math.random() * 2; } }
function egAnim(e, an) { if (e.an !== an) { e.an = an; e.anT = 0; } }
// Laurène en furie : sa planche à elle (course, boule de feu, saut, laser des yeux) une fois transformée ; la transformation
// et la défaite restent sur la planche de la mariée
const FURIE_AN = { course: "course", marche: "course", glissade: "course", saut: "saut", orbe: "orbe", laser: "laser" };
const egAtlas = e => e.furie && e.an !== "furie" && !e.down && hasAtlas("eg_laurene_furie") ? "eg_laurene_furie" : e.B.atlas;
function egFrame(e) {
  const A = ATL[e.B.atlas]; if (!A) return 0;
  if (egAtlas(e) === "eg_laurene_furie") {
    const F = ATL.eg_laurene_furie, an = FURIE_AN[e.an] || "orbe", [s0, n] = F.anims[an];
    if (an === "laser") return s0 + (e.mt < 0.25 ? 0 : e.mt < 0.6 ? 1 : e.mt < 1.4 ? 2 + Math.floor(e.mt * 12) % 3 : 5);   // les yeux s'allument, puis le rayon
    if (an === "saut") return s0 + Math.min(n - 1, Math.floor(e.anT * 7));
    if (an === "orbe") return e.mv === "orbe_furie" ? s0 + Math.min(n - 1, Math.floor(e.anT * 10)) : s0;
    return s0 + (e.vx ? Math.floor(e.anT * 12) % n : 0);
  }
  if (e.transf) return A.anims.furie[0] + Math.min(5, Math.floor(e.anT * 7));   // Mamie se transforme (dernière pose maintenue)
  if (e.B.giant) {   // la géante en furie (planche eg_mamie_furie) ; au repos : la première pose du lancer
    if (e.down) return A.anims.explosion[0] + Math.min(5, Math.floor(e.anT * 6));
    if (e.an === "repos" || !A.anims[e.an]) return A.anims.lancer[0];
    const [s0, n] = A.anims[e.an];
    if (e.an === "regard" && e.beam) return s0 + 3 + Math.floor(time * 8) % 2;   // les yeux brillent pendant le rayon
    return s0 + Math.min(n - 1, Math.floor(e.anT * (GIANT_FPS[e.an] || 7)));
  }
  if (e.furie) return A.anims.furie[0] + (e.an === "furie" ? Math.min(5, Math.floor(e.anT * 7)) : 5);   // la transformation, puis sa dernière pose
  if (e.down) return e.id === "brie" ? A.anims.morte[0] : A.anims.glissade[0] + 5;   // à terre
  const [s, n] = A.anims[e.an] || A.anims[Object.keys(A.anims)[0]], f = Math.floor(e.anT * (EG_FPS[e.an] || 8));
  return s + (["repos", "course", "marche"].includes(e.an) ? f % n : Math.min(n - 1, f));
}
// Projectiles (dans lasers, avec eg) : orbe et bouquet se renvoient au sabre ; bouteille, chèvre, aboiement et onde, non
function egShot(kind, x, y, vx, vy, o = {}) {
  const size = { orb: 10, bouquet: 14, bouteille: 10, chevre: 22, bark: 16, shock: 14, shard: 6, pneu: 20 }[kind] || 10;
  lasers.push({ eg: true, kind, x: x - size / 2, y: y - size / 2, w: size, h: kind === "chevre" ? 16 : size, vx, vy, g: o.g || 0, owner: "enemy", alive: true,
    noReflect: !["orb", "bouquet", "pneu"].includes(kind), t: 0, life: o.life || 5, color: o.color || "#c86eff", ...o });
}
function egProj(l, dt) {
  l.t += dt; if (l.t > l.life) { l.alive = false; return; }
  if (l.owner === "player") l.g = 0;
  l.vy += (l.g || 0) * dt; l.x += l.vx * dt; l.y += l.vy * dt;
  const bottom = l.y + l.h;
  if (bottom >= EG_FLOOR && l.vy > 0) {
    if (l.kind === "bouteille") {   // la bouteille se brise : deux éclats qui roulent
      l.alive = false; audio.sfx("break"); burst(l.x + 5, EG_FLOOR - 4, 14, ["#7dffb0", "#ffffff", "#2a6a3a"], 160, 0.5, 300, 2);
      for (const s of [-1, 1]) egShot("shard", l.x + 5, EG_FLOOR - 4, s * 150, 0, { life: 0.7 });
      return;
    }
    if (l.kind === "pneu" && l.owner === "enemy") { l.y = EG_FLOOR - l.h; if (l.bounce > 0 && l.vy > 60) { l.vy = -l.vy * 0.55; l.bounce--; audio.sfx("land"); } else { l.vy = 0; l.g = 0; } }
    else if (l.kind === "chevre" && !l.run) { l.run = true; l.y = EG_FLOOR - l.h; l.vy = 0; l.g = 0; l.vx = Math.sign(l.vx || 1) * 190; l.life = l.t + 2.2; audio.sfx("land"); }
    else if (l.kind === "orb" || l.kind === "bouquet") { l.alive = false; burst(l.x + l.w / 2, EG_FLOOR - 3, 10, [l.kind === "orb" ? (l.red ? "#ff2d6a" : "#c86eff") : "#ff8ab0", "#ffffff"], 110, 0.4, 200, 2); return; }
    else if (l.vy > 0) { l.y = EG_FLOOR - l.h; l.vy = 0; }
  }
  if (l.x < -30 || l.x > VW + 30) { l.alive = false; return; }
  if (l.owner === "enemy") {
    for (const p of players) if (!p.dead && ov(l, p) && p.inv <= 0 && p.dashT <= 0) { if (!["bark", "shock"].includes(l.kind)) l.alive = false; hurtPlayer(p, l.x); break; }
  } else for (const e of enemies) if (e.alive && e.type === "egboss" && ov(l, e)) { hitEnemy(e, "laser"); l.alive = false; break; }
}
function egDamage(e, n, car) {
  if (!e.alive || e.down || e.inv > 0 || EG.st !== "fight") return;
  if (e.B.giant && !car) return;   // la géante est hors d'atteinte : seules ses voitures renvoyées la touchent
  e.hp -= n; e.inv = 0.22; e.flash = 0.15; hitstop = 0.05; shake = Math.max(shake, 3);
  audio.sfx("bosshit"); burst(egCx(e), e.y + e.h / 2, 10, [e.B.color, "#ffffff"], 150, 0.4, 200, 2);
  if (e.hp <= 0) { e.hp = 0; if (e.id === "mamie" && e.fast) egTransform(e); else egDown(e); return; }
  if (!e.rage && e.hp <= e.max / 2) {   // à mi-vie : un cri, l'écran tremble, il accélère
    e.rage = true; e.spd *= 1.15; e.mv = null; egStartMove(e, "cri");
    egSay(e, e.id === "brie" ? "GRRRR… WAF !" : e.id === "jules" ? "Pas sur les chaussures ! Elles sont neuves !" : e.id === "mamie" ? "Ah, tu veux jouer ? Mamie accélère !" : e.B.giant ? "MES VOITURES !" : e.furie ? "TU VAS ME LE PAYER !" : "Tu vas voir, petit invité !");
    audio.setLevel(1, 0.2); EG.loudT = 2.5;   // la musique monte un instant
  } else egTaunt(e, 0.25);
}
// Mamie, à la fin du deuxième combat : elle ne tombe pas, elle se transforme (la géante arrive au plan suivant)
function egTransform(e) {
  e.carry = false; e.down = true; e.transf = true; e.mv = null; e.vx = 0; e.inv = 99; e.alive = false; egAnim(e, "furie");
  audio.sfx("transform"); shake = 8; rumble(500, 0.8, 0.6); lasers = lasers.filter(l => !l.eg); egCarsBoom();
  for (let k = 0; k < 40; k++) parts.push({ x: egCx(e) + (Math.random() - 0.5) * 40, y: e.y + Math.random() * e.h, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 80, life: 1, max: 1, color: k % 2 ? "#ff2d6a" : "#ff8ac8", size: 2, grav: 0 });
}
function egDown(e) {
  e.carry = false; e.down = true; e.mv = null; e.beam = null; e.vx = 0; e.inv = 99; e.alive = false;
  if (e.id.startsWith("mamie")) egCarsBoom();
  if (e.B.giant) { egAnim(e, "explosion"); e.anT = 0; for (let k = 0; k < 50; k++) parts.push({ x: egCx(e) - egPar() * 8 + (Math.random() - 0.5) * 90, y: GIANT_FEET - Math.random() * 160, vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 90, life: 1.2 + Math.random(), max: 2.2, color: ["#ffb43c", "#ff6a2a", "#fccc28", "#8a8a9a"][k % 4], size: 2, grav: -20 }); }
  audio.sfx(e.id === "brie" ? "eg_aboie" : "boom"); shake = 6; rumble(300, 0.6, 0.5);
  burst(egCx(e), e.y + e.h / 2, 24, [e.B.color, "#ffffff", "#ff4f8a"], 200, 0.7, 250, 2);
  lasers = lasers.filter(l => !l.eg);
}

/* ---- Les coups de chaque boss ---- */
// start(e, p) prépare le coup ; update(e, p, dt) renvoie true quand il est fini. e.mt : temps depuis le début du coup.
const towards = (e, p) => (p.x + 5 > egCx(e) ? 1 : -1);
const EG_MOVES = {
  // Brie
  charge: { start(e, p) { e.face = towards(e, p); egAnim(e, "repos"); audio.sfx("eg_aboie"); },
    update(e, p, dt) { if (e.mt < 0.45) return false; egAnim(e, "course"); e.vx = e.face * 250 * e.spd; return e.mt > 2.2 || (e.face < 0 ? e.x < 6 : e.x + e.w > VW - 6); } },
  aboie: { start(e, p) { e.face = towards(e, p); egAnim(e, "aboie"); e.n = 0; },
    update(e, p, dt) {
      const times = e.rage ? [0.25, 0.6] : [0.25];
      if (e.n < times.length && e.mt > times[e.n]) { e.n++; egShot("bark", egCx(e) + e.face * 18, EG_FLOOR - 8, e.face * 170 * e.spd, 0, { life: 3 }); audio.sfx("eg_aboie"); shake = Math.max(shake, 2); }
      return e.mt > 0.9; } },
  bond: { start(e, p) { e.face = towards(e, p); egAnim(e, "saut"); e.vy = -380; e.vx = clamp((p.x + 5 - egCx(e)) / 0.75, -260, 260) * e.spd; e.ground = false; },
    update(e, p, dt) { if (e.ground && e.mt > 0.2) { e.vx = 0; shake = Math.max(shake, 3); return true; } return false; } },
  crotte: { start(e, p) { egAnim(e, "crotte"); e.vx = 0; },
    update(e, p, dt) {
      if (e.mt > 0.7 && !e.done) { e.done = true; EG.poops.push({ x: egCx(e) - e.face * 14 - 7, y: EG_FLOOR - 9, w: 14, h: 9, t: e.rage ? 7 : 5 }); if (EG.poops.length > 4) EG.poops.shift(); audio.sfx("slip"); egSay(e, "Hé hé…"); }
      if (e.mt > 0.9) { egAnim(e, "course"); e.vx = -e.face * 200 * e.spd; }
      return e.mt > 1.4; } },
  // Jules
  orbe: { start(e, p) { e.face = towards(e, p); egAnim(e, "lancer"); e.n = 0; egTaunt(e, 0.4); },
    update(e, p, dt) {
      const times = e.rage ? [0.3, 0.55] : [0.3];
      if (e.n < times.length && e.mt > times[e.n]) { egShot("orb", egCx(e) + e.face * 16, e.y + 14, e.face * (150 + e.n * 30) * e.spd, e.n ? -170 : -60, { g: e.n ? 260 : 60, color: "#c86eff" }); e.n++; audio.sfx("laser"); }
      return e.mt > 0.7; } },
  glissade: { start(e, p) { e.face = towards(e, p); egAnim(e, "glissade"); e.atkBox = true; },
    update(e, p, dt) { e.vx = e.mt > 0.1 && e.mt < 0.5 ? e.face * 300 * e.spd : 0; return e.mt > 0.65; } },
  pieds: { start(e, p) { e.face = towards(e, p); egAnim(e, "marche"); e.kick = false; },
    update(e, p, dt) {
      if (!e.kick) { e.vx = e.face * 110 * e.spd; if (Math.abs(p.x + 5 - egCx(e)) < 34 || e.mt > 1.2) { e.kick = true; e.vx = 0; egAnim(e, "combat_pieds"); e.k0 = e.mt; egTaunt(e, 0.5); } return false; }
      const k = Math.floor((e.mt - e.k0) * 10);
      if ((k === 2 || k === 4) && e.lastK !== k) { e.lastK = k; audio.sfx("slash"); const box = { x: e.face > 0 ? e.x + e.w : e.x - 26, y: e.y + 10, w: 26, h: 30 }; for (const q of players) if (!q.dead && ov(box, q)) hurtPlayer(q, egCx(e)); }
      return e.mt - e.k0 > 0.65; } },
  saut: { start(e, p) { e.face = towards(e, p); egAnim(e, "saut"); e.vy = -420; e.vx = clamp((p.x + 5 - egCx(e)) / 0.9, -200, 200) * e.spd; e.ground = false; },
    update(e, p, dt) {
      if (e.ground && e.mt > 0.2) { e.vx = 0; shake = Math.max(shake, 5); audio.sfx("boom"); addFx("fx_poussiere", egCx(e), EG_FLOOR, { scale: 1.5 }); for (const s of [-1, 1]) egShot("shock", egCx(e) + s * 12, EG_FLOOR - 7, s * 160 * e.spd, 0, { life: 3 }); return true; }
      return false; } },
  cri: { start(e, p) { egAnim(e, e.furie ? "furie" : e.id === "brie" ? "aboie" : "cri"); e.vx = 0; audio.sfx(e.id === "brie" ? "eg_aboie" : "boss_intro"); },
    update(e, p, dt) { shake = Math.max(shake, 4); if (Math.random() < 0.3) parts.push({ x: egCx(e) + (Math.random() - 0.5) * 30, y: e.y + Math.random() * e.h, vx: 0, vy: -40, life: 0.5, max: 0.5, color: e.furie || e.id === "laurene" ? "#ff2d6a" : "#c86eff", size: 2, grav: 0 }); return e.mt > 0.9; } },
  // Laurène
  bouquet: { start(e, p) { e.face = towards(e, p); egAnim(e, "lancer_bouquet"); e.n = 0; egTaunt(e, 0.5); },
    update(e, p, dt) {
      const times = e.rage || e.furie ? [0.3, 0.5] : [0.3];
      if (e.n < times.length && e.mt > (e.furie ? times[e.n] + 0.2 : times[e.n])) { const dx = p.x + 5 - egCx(e); egShot("bouquet", egCx(e) + e.face * 14, e.y + 12, clamp(dx / 1.0, -240, 240) * e.spd + e.n * e.face * 40, -230, { g: 420 }); e.n++; audio.sfx("dash"); }
      return e.mt > (e.furie ? 0.9 : 0.7); } },
  chevre: { start(e, p) { e.face = towards(e, p); egAnim(e, "lancer_chevre"); e.n = 0; egSay(e, "Une petite chèvre pour toi !"); },
    update(e, p, dt) { if (!e.n && e.mt > (e.furie ? 0.55 : 0.35)) { e.n = 1; egShot("chevre", egCx(e) + e.face * 16, e.y + 14, e.face * 120 * e.spd, -260, { g: 500, life: 6 }); audio.sfx("dash"); } return e.mt > 0.8; } },
  bouteille: { start(e, p) { e.face = towards(e, p); egAnim(e, "lancer_bouteille"); e.n = 0; if (Math.random() < 0.5) egSay(e, "Santé !"); },
    update(e, p, dt) { if (!e.n && e.mt > (e.furie ? 0.5 : 0.3)) { e.n = 1; const dx = p.x + 5 - egCx(e); egShot("bouteille", egCx(e) + e.face * 14, e.y + 12, clamp(dx / 0.9, -260, 260) * e.spd, -260, { g: 520 }); audio.sfx("dash"); } return e.mt > 0.7; } },
  // Laurène en furie : boule de feu rouge visée (renvoyable au sabre), course, laser des yeux (rester au sol !)
  orbe_furie: { start(e, p) { e.face = towards(e, p); egAnim(e, "orbe"); e.n = 0; if (Math.random() < 0.5) egSay(e, "Brûle, petit invité !"); },
    update(e, p, dt) {
      const times = e.rage ? [0.32, 0.5] : [0.32];
      if (e.n < times.length && e.mt > times[e.n]) {
        const x = egCx(e) + e.face * 36, y = EG_FLOOR - 48, dx = p.x + 5 - x, dy = p.y + 16 - y, d = Math.hypot(dx, dy) || 1, v = 175 * e.spd;
        egShot("orb", x, y, dx / d * v, dy / d * v, { color: "#ff2d6a", red: true }); e.n++; audio.sfx("laser");
      }
      return e.mt > 0.7; } },
  course: { start(e, p) { e.face = towards(e, p); egAnim(e, "course"); egTaunt(e, 0.4); },
    update(e, p, dt) { e.vx = e.mt > 0.15 && e.mt < 0.95 ? e.face * 250 * e.spd : 0; if (Math.random() < 0.4) parts.push({ x: egCx(e) - e.face * 10, y: EG_FLOOR - 4 - Math.random() * 30, vx: -e.face * 40, vy: -10, life: 0.4, max: 0.4, color: e.furie ? "#ff2d6a" : "#c8c0b0", size: 2, grav: 0 }); return e.mt > 1.05; } },
  laser: { start(e, p) { e.face = towards(e, p); egAnim(e, "laser"); e.beam = null; egSay(e, "Mes yeux te voient !"); audio.sfx("aim"); },
    update(e, p, dt) {
      const on = e.mt > 0.6 && e.mt < 1.4;
      if (on && !e.beam) { audio.sfx("laser"); shake = Math.max(shake, 2); }
      e.beam = on ? { x1: egCx(e) + e.face * 15, x2: e.face > 0 ? VW + 10 : -10, y: EG_FLOOR - 52 } : null;
      if (e.beam) for (const q of players) if (!q.dead && q.inv <= 0 && q.y < e.beam.y + 4 && q.y + q.h > e.beam.y - 4 && (e.face > 0 ? q.x + q.w > e.beam.x1 : q.x < e.beam.x1)) hurtPlayer(q, egCx(e));
      if (e.mt > 1.6) { e.beam = null; return true; } return false; } },
  glisse: { start(e, p) { e.face = towards(e, p); egAnim(e, "glissade"); },
    update(e, p, dt) { e.vx = e.mt > 0.1 && e.mt < 0.5 ? e.face * 290 * e.spd : 0; return e.mt > 0.65; } },
  bascule: { start(e, p) { e.face = egCx(e) < VW / 2 ? 1 : -1; egAnim(e, "saut"); e.vy = -400; e.vx = e.face * 230 * e.spd; e.ground = false; },   // saute de l'autre côté
    update(e, p, dt) { if (e.ground && e.mt > 0.2) { e.vx = 0; shake = Math.max(shake, 2); return true; } return false; } },
  // Mamie Florence : pneus qui roulent (renvoyables au sabre), voitures lancées (elles restent posées : des plateformes, puis
  // elles explosent), course, glissade, saut avec ondes de choc
  pneu: { start(e, p) { e.face = towards(e, p); egAnim(e, "lancer_avant"); e.n = 0; egTaunt(e, 0.4); },
    update(e, p, dt) {
      const times = e.rage || e.fast ? [0.5, 0.75] : [0.5];
      if (e.n < times.length && e.mt > times[e.n] / e.spd) { egShot("pneu", egCx(e) + e.face * 20, e.y + 20, e.face * (170 + e.n * 30) * e.spd, -60, { g: 600, life: 4.5, bounce: e.rage ? 2 : 0 }); e.n++; audio.sfx("dash"); }
      return e.mt > 1.0 / e.spd; } },
  voiture: { start(e, p) { e.face = towards(e, p); egAnim(e, ["lancer_haut", "lancer_rotation", "lancer_avant"][Math.floor(Math.random() * 3)]); e.n = 0; e.carry = true; if (Math.random() < 0.6) egSay(e, ["Bip bip !", "Attrape, mon chou !", "Gare-toi là !"][Math.floor(Math.random() * 3)]); },
    update(e, p, dt) {
      const rel = 3 / ((EG_FPS[e.an] || 6));   // 4e pose : elle lâche la voiture
      if (!e.n && e.anT >= rel) { e.n = 1; e.carry = false; const h = egCarHold(e); egThrowCar(h.x, h.y, clamp(p.x + 5 + (Math.random() - 0.5) * 30, 50, VW - 50), e.face, e.rage); audio.sfx("dash"); }
      return e.anT > 6 / (EG_FPS[e.an] || 6); } },
};
const EG_CONTACT = { course: e => e.mt > 0.15 && e.mt < 0.95, charge: e => e.mt > 0.45, bond: e => !e.ground, glissade: e => e.mt > 0.1 && e.mt < 0.5, glisse: e => e.mt > 0.1 && e.mt < 0.5, saut: e => !e.ground, bascule: e => !e.ground };
const EG_SETS = {
  brie: e => [["charge", 3], ["aboie", 3], ["bond", 2], ["crotte", e.rage ? 2 : 1]],
  jules: e => [["orbe", 3], ["glissade", 2], ["pieds", 2], ["saut", 2]],
  mamie: e => [["voiture", e.fast ? 3 : 2], ["pneu", 3], ["course", 2], ["glisse", 1], ["saut", e.rage ? 2 : 1]],
  laurene: e => e.furie ? (hasAtlas("eg_laurene_furie") ? [["orbe_furie", 3], ["laser", 2], ["course", 2], ["bascule", 1]] : [["bouquet", 3], ["chevre", 2], ["bouteille", 3], ["bascule", 1]]) : [["bouquet", 3], ["chevre", 2], ["bouteille", 2], ["glisse", 2], ["bascule", 1]],
};
function egStartMove(e, name) { e.beam = null; e.carry = false; e.mv = name; e.mt = 0; e.done = false; e.atkBox = false; EG_MOVES[name].start(e, targetOf(e)); }
function egPick(e) {
  const set = EG_SETS[e.id](e), tot = set.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot;
  for (const [n, w] of set) { r -= w; if (r <= 0) { if (n === e.lastMv && Math.random() < 0.6) continue; e.lastMv = n; return n; } }
  return set[0][0];
}
function egUpdateBoss(e, dt) {
  const p = targetOf(e);
  e.inv = Math.max(0, e.inv - dt); e.flash = Math.max(0, e.flash - dt); e.sayCd -= dt; e.anT += dt;
  if (e.B.giant) { egUpdateGiant(e, p, dt); return; }
  if (e.down) { e.vx = 0; }
  else if (EG.st !== "fight") { e.vx = 0; e.mv = null; e.face = towards(e, p); egAnim(e, e.id === "brie" ? "repos" : "marche"); if (e.id !== "brie") e.anT = 0; }
  else if (e.mv) { e.mt += dt; if (EG_MOVES[e.mv].update(e, p, dt)) { e.mv = null; e.vx = 0; e.cd = (e.rage ? 0.45 : 0.75) / e.spd + Math.random() * 0.4; } }
  else {
    // entre deux coups : il se place (Brie trotte, les mariés marchent) à bonne distance, en regardant le héros
    e.face = towards(e, p); e.cd -= dt;
    const dx = p.x + 5 - egCx(e), want = e.id === "brie" ? 70 : e.id === "mamie" ? 130 : 110, dir = Math.abs(dx) > want + 30 ? Math.sign(dx) : Math.abs(dx) < want - 30 ? -Math.sign(dx) : 0;
    e.vx = dir * e.B.spd * e.spd; egAnim(e, dir ? (e.id === "brie" ? "course" : "marche") : (e.id === "brie" ? "repos" : "marche"));
    if (!dir && e.id !== "brie") e.anT = 0;   // immobile : première pose de la marche
    // duo : un seul mari attaque à la fois
    const busy = e.duo && EG.bosses.some(o => o !== e && o.mv && !o.down);
    if (e.cd <= 0 && !busy) egStartMove(e, egPick(e));
  }
  // déplacement, gravité, murs
  e.vy += 1100 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
  if (e.y + e.h >= EG_FLOOR) { e.y = EG_FLOOR - e.h; e.vy = 0; e.ground = true; } else e.ground = false;
  e.x = clamp(e.x, 2, VW - e.w - 2);
  // le contact ne fait mal que pendant les attaques qui foncent (charge, bond, glissade, saut) : on peut frôler un boss qui marche
  if (!e.down && EG.st === "fight" && e.mv && EG_CONTACT[e.mv] && EG_CONTACT[e.mv](e)) touchPlayers(e, egCx(e));
}

/* ---- Mamie Florence : voitures, pneus et géante ---- */
// Voitures (EG.cars) : lancées en cloche vers le héros (une ombre montre où elles tombent), elles font mal en atterrissant,
// restent posées quelques secondes (leur toit est une plateforme), clignotent puis explosent (eg_boum ; on s'éloigne).
// La géante (plan 4, derrière le muret, hors d'atteinte) lance ses voitures vers l'avant : chacune est un « egcar » dans
// enemies ; la frapper (sabre, dash, arme) pendant les derniers instants de sa chute (cercle vert, voiture qui brille) la
// renvoie sur Mamie (egDamage(…, car)) ; trop tôt, rien ; ratée, elle atterrit et devient une voiture posée.
// Poses de lancer (planche de Mamie, en pixels de la planche, depuis les pieds) : où sont les mains pendant les 4 premières
// images (la 4e : le lâcher), relevées sur les lancers assemblés du pack.
const MAMIE_HOLD = {
  lancer_avant: [[28, -88], [43, -72], [30, -107], [116, -117]],
  lancer_haut: [[12, -105], [14, -149], [6, -167], [99, -168]],
  lancer_rotation: [[33, -121], [-35, -123], [25, -117], [119, -124]],
};
const CAR_W = 84, CAR_H = 44, GIANT_S = 1, GIANT_FEET = 230;
const GIANT_FPS = { lancer: 7, seisme: 7, cri: 6, regard: 7 };
const carLife = () => ({ facile: 4.5, normal: 3.5, doom: 2.6 }[df().id] || 3.5);
const carWindow = () => ({ facile: 0.55, normal: 0.42, doom: 0.3 }[df().id] || 0.42);
// Parallaxe du plan 4 (héros à gauche : le décor glisse un peu vers la droite) : -1 à 1
const egPar = () => { const ps = players.filter(q => !q.dead); return ps.length ? clamp((ps.reduce((a, q) => a + q.x + 5, 0) / ps.length - VW / 2) / (VW / 2), -1, 1) : 0; };
// Où est la voiture qu'elle porte (centre), d'après la pose en cours
function egCarHold(e) {
  const H = MAMIE_HOLD[e.an] || MAMIE_HOLD.lancer_haut, k = Math.min(3, Math.floor(e.anT * (EG_FPS[e.an] || 6))), o = H[k];
  return { x: egCx(e) + e.face * o[0] * EG_SCALE_JS, y: e.y + e.h + o[1] * EG_SCALE_JS };
}
const EG_SCALE_JS = 0.55;   // réduction des planches de l'église (EG_SCALE de preparer_laverie.py)
function egThrowCar(x, y, tx, face, furie) {
  const g = 700, yl = EG_FLOOR - CAR_H / 2, T = 0.85 + Math.abs(tx - x) / 700;
  EG.cars.push({ st: "fly", x, y, tx, vx: (tx - x) / T, vy: (yl - y - 0.5 * g * T * T) / T, g, t: 0, face: tx >= x ? 1 : -1, furie: !!furie });
}
// Une voiture se pose : elle fait mal dessous, la poussière vole, son toit devient une plateforme
function egCarLand(c) {
  c.st = "park"; c.t = 0; c.y = EG_FLOOR - CAR_H / 2; c.vx = c.vy = 0;
  shake = Math.max(shake, 5); audio.sfx("land"); rumble(160, 0.5, 0.4); addFx("fx_poussiere", c.x, EG_FLOOR, { scale: 2 });
  const box = { x: c.x - CAR_W / 2 + 6, y: c.y - CAR_H / 2, w: CAR_W - 12, h: CAR_H };
  for (const q of players) if (!q.dead && ov(box, q)) hurtPlayer(q, c.x);
  c.plat = { x: c.x - CAR_W / 2 + 12, y: EG_FLOOR - CAR_H + 4, w: CAR_W - 24, h: 8 }; lvl.plats.push(c.plat);
  const parked = EG.cars.filter(o => o.st === "park");
  if (parked.length > 2) egCarBoom(parked[0]);   // pas plus de deux voitures posées
}
function egCarBoom(c) {
  if (c.st === "boom") return;
  c.st = "boom"; c.t = 0; if (c.plat) lvl.plats = lvl.plats.filter(s => s !== c.plat); c.plat = null;
  audio.sfx("boom"); shake = Math.max(shake, 6); rumble(260, 0.7, 0.5);
  const box = { x: c.x - CAR_W / 2 - 6, y: c.y - CAR_H / 2 - 10, w: CAR_W + 12, h: CAR_H + 10 };
  for (const q of players) if (!q.dead && ov(box, q)) hurtPlayer(q, c.x);
  for (let k = 0; k < 26; k++) parts.push({ x: c.x + (Math.random() - 0.5) * 50, y: c.y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 260, vy: -60 - Math.random() * 200, life: 0.8, max: 0.8, color: ["#ffb43c", "#ff6a2a", "#5a5a6a", "#c8c8d8"][k % 4], size: 2, grav: 400 });
}
function egCarsBoom() { for (const c of EG.cars) if (c.st !== "fly") egCarBoom(c); EG.cars = EG.cars.filter(c => c.st === "boom"); for (const c of enemies) if (c.type === "egcar") c.alive = false; }
function egUpdateCars(dt) {
  for (const c of EG.cars) {
    c.t += dt;
    if (c.st === "fly") { c.vy += c.g * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.vy > 0 && c.y >= EG_FLOOR - CAR_H / 2) egCarLand(c); }
    else if (c.st === "park" && c.t > carLife()) egCarBoom(c);
  }
  EG.cars = EG.cars.filter(c => c.st !== "boom" || c.t < 0.5);
}
// Voiture de la géante : elle arrive du fond (elle grossit) en cloche jusqu'au sol, devant le muret
function egIncoming(e, x0, y0, tx) {
  const T = ({ facile: 1.9, normal: 1.6, doom: 1.3 }[df().id] || 1.6) * (e.rage ? 0.88 : 1);
  const c = { type: "egcar", alive: true, st: "in", x0, y0, tx, T, u1: Math.max(0.35, 1 - carWindow() / T), t: 0, face: tx >= x0 ? 1 : -1, furie: e.rage, early: false, x: 0, y: 0, w: 0, h: 0, sc: 0.8 };
  egIncPos(c); enemies.push(c); return c;
}
function egIncPos(c) {
  const u = clamp(c.t / c.T, 0, 1), yl = EG_FLOOR - CAR_H / 2;
  if (c.st === "back") {   // renvoyée : elle repart vers Mamie en rapetissant
    const v = clamp(c.t / 0.6, 0, 1); c.cx = c.bx + (c.gx - c.bx) * v; c.cy = c.by + (c.gy - c.by) * v - Math.sin(Math.PI * v) * 30; c.sc = 1.1 - 0.5 * v;
  } else if (u <= c.u1) {   // elle vole par-dessus le muret jusqu'à hauteur du héros…
    const v = u / c.u1, ylow = EG_FLOOR - 50; c.cx = c.x0 + (c.tx - c.x0) * 0.85 * v; c.cy = c.y0 + (ylow - c.y0) * v - Math.sin(Math.PI * v) * 40; c.sc = 0.8 + 0.3 * u;
  } else {   // … puis elle descend doucement : c'est le moment de la frapper
    const v = (u - c.u1) / (1 - c.u1), ylow = EG_FLOOR - 50; c.cx = c.x0 + (c.tx - c.x0) * (0.85 + 0.15 * v); c.cy = ylow + (yl - ylow) * v; c.sc = 0.8 + 0.3 * u;
  }
  c.w = CAR_W * c.sc; c.h = CAR_H * c.sc + 10; c.x = c.cx - c.w / 2; c.y = c.cy - c.h / 2;
}
const carHittable = c => c.st === "in" && c.t >= c.T * c.u1;
// Coup sur une voiture qui arrive (hitEnemy) : au bon moment, elle repart vers Mamie
function egCarHit(c, p) {
  if (c.st !== "in") return;
  if (!carHittable(c)) { if (!c.early) { c.early = true; audio.sfx("nope"); EG.bubbles.push({ e: null, at: { x: c.cx, y: c.cy - 22 }, text: "Trop tôt !", t: 0.9 }); } return; }
  const g = EG.bosses.find(b => b.B.giant && !b.down); if (!g) return;
  c.st = "back"; c.t = 0; c.bx = c.cx; c.by = c.cy; c.gx = egCx(g) - egPar() * 8; c.gy = GIANT_FEET - 110;
  audio.sfx("sword_hit"); audio.sfx("dash"); hitstop = 0.06; shake = Math.max(shake, 3); rumble(120, 0.6, 0.3);
  for (let k = 0; k < 12; k++) parts.push({ x: c.cx, y: c.cy, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.4, max: 0.4, color: "#fccc28", size: 2, grav: 0 });
}
function egUpdateIncoming(dt) {
  for (const c of enemies) {
    if (c.type !== "egcar" || !c.alive) continue;
    c.t += dt; egIncPos(c);
    if (c.st === "back" && c.t >= 0.6) {   // elle revient sur Mamie : boum !
      c.alive = false; const g = EG.bosses.find(b => b.B.giant && !b.down);
      EG.cars.push({ st: "boom", x: c.cx, y: c.cy, t: 0, sc: 1.2, magic: true }); audio.sfx("boom"); shake = Math.max(shake, 7);
      if (g) { g.inv = 0; egDamage(g, 1, true); if (!g.down) egSay(g, ["Aïe ! Ma voiture !", "Ouille ! Mes lunettes !", "Ma belle voiture !"][Math.floor(Math.random() * 3)]); }
    } else if (c.st === "in" && c.t >= c.T) {   // ratée : elle atterrit devant le muret
      c.alive = false; const car = { st: "fly", x: c.cx, y: EG_FLOOR - CAR_H / 2, vx: 0, vy: 1, g: 0, t: 0, face: c.face, furie: c.furie }; EG.cars.push(car); egCarLand(car);
    }
  }
  enemies = enemies.filter(c => c.type !== "egcar" || c.alive);
}
// La géante en furie : elle se promène derrière le muret et enchaîne lancer de voiture (la voiture est dessinée dans ses
// mains ; elle part à la 5e pose), saut et séisme (ondes de choc au sol, à sauter ; en rage, des pneus tombent), regard laser
// (un rayon des yeux balaie le sol : sauter par-dessus) ; à mi-vie, cri monstrueux. Vaincue : elle explose en flammes.
function egUpdateGiant(e, p, dt) {
  if (e.down) { if (e.anT > 1.1) e.gone = true; return; }
  if (EG.st !== "fight") { e.mv = null; e.beam = null; egAnim(e, "repos"); return; }
  const f = e.anT * (GIANT_FPS[e.an] || 7), gx = egCx(e) - egPar() * 8, end = (cd) => { e.mv = null; e.beam = null; egAnim(e, "repos"); e.cd = cd; };
  if (e.mv === "g_car") {
    if (!e.n && f >= 4) { e.n = 1; egIncoming(e, gx + e.face * 90 * GIANT_S, Math.max(16, GIANT_FEET - 125 * GIANT_S), clamp(p.x + 5 + (Math.random() - 0.5) * 40, 50, VW - 50)); audio.sfx("dash"); }
    if (f >= 6) end((e.rage ? 1.0 : 1.5) + Math.random() * 0.6);
  } else if (e.mv === "g_seisme") {
    if (!e.n && f >= 4) {   // elle retombe : le sol tremble, des ondes de choc courent vers le héros
      e.n = 1; shake = 9; rumble(400, 1, 0.8); audio.sfx("boom");
      for (const sd of [-1, 1]) egShot("shock", clamp(gx, 20, VW - 20) + sd * 14, EG_FLOOR - 7, sd * 170 * e.spd, 0, { life: 3 });
      if (e.rage) for (let k = 0; k < 2; k++) egShot("pneu", clamp(p.x + 5 + (k ? 70 : -70) + (Math.random() - 0.5) * 30, 30, VW - 30), -20 - k * 40, (Math.random() < 0.5 ? -1 : 1) * 110, 0, { g: 520, life: 5, bounce: 1, rain: true });
    }
    if (f >= 6) end(1.2 + Math.random() * 0.5);
  } else if (e.mv === "g_laser") {
    // les yeux s'allument (0,45 s), puis le rayon part sous elle et balaie le sol vers le héros jusqu'au bord
    const on = e.anT > 0.45 && e.anT < 2.1;
    if (on) {
      if (!e.beam) { audio.sfx("laser"); e.beamX = gx; e.beamDir = p.x + 5 >= gx ? 1 : -1; }
      e.beamX += e.beamDir * 230 * e.spd * dt;
      e.beam = { x0: gx + e.face * 14 * GIANT_S, y0: GIANT_FEET - 120 * GIANT_S, x: clamp(e.beamX, 0, VW), y: EG_FLOOR };
      for (const q of players) if (!q.dead && q.inv <= 0 && q.y + q.h > EG_FLOOR - 12 && Math.abs(q.x + 5 - e.beam.x) < 9) hurtPlayer(q, e.beam.x);
      if (Math.random() < 0.6) parts.push({ x: e.beam.x + (Math.random() - 0.5) * 8, y: EG_FLOOR - 2, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 60, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? "#ff2d6a" : "#ffd0dc", size: 2, grav: 200 });
      if (e.beamX < -10 || e.beamX > VW + 10) e.anT = Math.max(e.anT, 2.1);
    } else e.beam = null;
    if (e.anT > 2.4) end(1.1 + Math.random() * 0.5);
  } else if (e.mv === "g_cri") {
    shake = Math.max(shake, 4);
    if (f >= 6.5) end(0.8);
  } else {
    // entre deux attaques : elle suit le héros, lentement
    e.face = towards(e, p); const dx = p.x + 5 - egCx(e); e.x += clamp(dx, -1, 1) * Math.min(Math.abs(dx), e.B.spd * dt * e.spd); e.x = clamp(e.x, 110, VW - 110 - e.w);
    e.cd -= dt;
    const busy = enemies.some(c => c.type === "egcar");   // une voiture à la fois
    if (e.cd <= 0 && !busy) {
      if (!e.rage && e.hp <= e.max / 2) { e.rage = true; e.mv = "g_cri"; egAnim(e, "cri"); egSay(e, "MES VOITURES ! Tu vas voir !"); audio.sfx("boss_intro"); audio.setLevel(1, 0.2); EG.loudT = 2.5; return; }
      const r = Math.random();
      e.mv = r < (e.rage ? 0.45 : 0.55) ? "g_car" : r < (e.rage ? 0.75 : 0.8) ? "g_seisme" : "g_laser"; e.n = 0;
      egAnim(e, { g_car: "lancer", g_seisme: "seisme", g_laser: "regard" }[e.mv]);
      if (e.mv === "g_laser") egSay(e, "Mes yeux te voient !"); else if (Math.random() < 0.35) egTaunt(e, 1);
    }
  }
}
function drawCar(c) {
  if (!hasAtlas("eg_voiture")) { R(Math.round(c.x - CAR_W / 2), Math.round(c.y - CAR_H / 2), CAR_W, CAR_H, "#e8e4dc"); return; }
  const A = ATL.eg_voiture, base = A.anims[c.furie ? "furie" : "rotation"][0];
  if (c.st === "boom" && hasAtlas("fx_explosion")) { const id = c.magic ? "fx_explosion_magique" : "fx_explosion"; drawFrame(id, Math.min(4, Math.floor(c.t * 10)), Math.round(c.x), Math.round(c.y - 8), 1, 1, (c.sc || 1) * 0.95); return; }   // explosion en 5 images
  if (c.st === "boom") { drawFrame("eg_boum", c.t < 0.2 ? 0 : 1, Math.round(c.x), Math.round(c.y - 6), 1, Math.min(1, (0.5 - c.t) * 4), (c.sc || 1) * 0.9); return; }
  const fr = c.st === "fly" ? base + (c.vy < -90 ? 0 : c.vy > 90 ? 2 : 1) : base + 1;
  const left = carLife() - c.t, blink = c.st === "park" && left < 1.2 && Math.floor(c.t * (left < 0.5 ? 16 : 8)) % 2;
  drawFrame("eg_voiture", fr, Math.round(c.x), Math.round(c.y), c.face);
  if (blink) { ctx.save(); ctx.globalCompositeOperation = "lighter"; drawFrame("eg_voiture", fr, Math.round(c.x), Math.round(c.y), c.face, 0.7); ctx.restore(); }
}
function drawIncoming(c) {
  const hit = carHittable(c), base = hasAtlas("eg_voiture") ? ATL.eg_voiture.anims[c.furie ? "furie" : "rotation"][0] : 0;
  if (c.st === "in") {   // cercle au sol : il se resserre ; vert quand c'est le moment de frapper
    const u = clamp(c.t / c.T, 0, 1), r = 10 + 30 * (1 - u);
    ctx.globalAlpha = 0.25 + 0.5 * u; ctx.fillStyle = "#0e0a1a"; ctx.beginPath(); ctx.ellipse(c.tx, EG_FLOOR - 1, 30 * (0.4 + 0.6 * u), 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hit ? "#7dffb0" : "#fccc28"; ctx.lineWidth = hit ? 2 : 1; ctx.beginPath(); ctx.ellipse(c.tx, EG_FLOOR - 1, r * 1.6, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (!hasAtlas("eg_voiture")) { R(Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h), "#e8e4dc"); return; }
  const fr = base + (c.st === "back" ? 0 : c.t < c.T * c.u1 * 0.45 ? 0 : c.t < c.T * c.u1 ? 2 : 1);
  if (hit) glow(ctx, c.cx, c.cy, 40, "125,255,176", 0.35 + 0.2 * Math.sin(time * 20));
  drawFrame("eg_voiture", fr, Math.round(c.cx), Math.round(c.cy), c.st === "back" ? -c.face : c.face, 1, c.sc);
  if (hit) { ctx.save(); ctx.globalCompositeOperation = "lighter"; drawFrame("eg_voiture", fr, Math.round(c.cx), Math.round(c.cy), c.face, 0.35 + 0.25 * Math.sin(time * 24), c.sc); ctx.restore(); text("!", c.cx, c.cy - 24 * c.sc, 12, "#7dffb0", "center", "#0e0a1a"); }
}
// Plan 4 : la place, la géante derrière le muret (en parallaxe : le fond, la géante et le muret ne glissent pas autant)
function drawGiantScene() {
  const k = egPar();
  if (hasAtlas("eglise_5")) drawFrame("eglise_5", 0, Math.round(VW / 2 - k * 4), VH + 6); else R(0, 0, VW, VH, "#2a0a2a");
  for (const e of EG.bosses) {
    if (!e.B.giant || e.gone) continue;
    const x = Math.round(egCx(e) - k * 8), a = e.inv > 0 && !e.down && Math.floor(time * 30) % 2 ? 0.6 : 1;
    if (!e.down) glow(ctx, x, GIANT_FEET - 100, 90, "255,40,90", 0.18 + 0.06 * Math.sin(time * 3));
    const bob = e.down ? 0 : Math.round(Math.sin(time * 1.6) * 2);
    if (hasAtlas("eg_mamie_furie")) {
      drawFrame("eg_mamie_furie", egFrame(e), x, GIANT_FEET + bob, e.face, a, GIANT_S);
      if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; drawFrame("eg_mamie_furie", egFrame(e), x, GIANT_FEET + bob, e.face, 0.6, GIANT_S); ctx.restore(); }
    } else R(x - 40, 40, 80, 190, "#f0e6d0");
  }
  if (hasAtlas("eglise_muret")) drawFrame("eglise_muret", 0, Math.round(VW / 2 - k * 14), 244);
  for (const e of EG.bosses) if (e.B.giant && e.beam && !e.down) {   // le rayon de ses yeux, par-dessus le muret jusqu'au sol
    const b = e.beam, fl = Math.sin(time * 40) > 0;
    glow(ctx, b.x0, b.y0, 12, "255,45,106", 0.8); glow(ctx, b.x, b.y, 16, "255,45,106", 0.6);
    for (const [w, c] of [[6, "rgba(255,45,106,0.5)"], [fl ? 2 : 3, "#ffd0dc"]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }
}

/* ---- Déroulement ---- */
function egArena() {
  const W = CWORLDS[2];
  lvl = { json: true, eglise: true, W, R: W.rooms[0], width: VW, solids: [{ x: -40, y: EG_FLOOR, w: VW + 80, h: VH }], plats: [], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [],
    machine: null, ckpt: null, start: { x: 40, y: EG_FLOOR - 32 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null };
}
// Héros au bord gauche de l'arène (à deux : côte à côte)
function egPlace() { for (const p of players) { p.x = 40 + p.idx * 20; p.y = EG_FLOOR - p.h; p.vx = 0; p.face = 1; } }
function startEglise() {
  egArena();
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = []; mach = null; chal = null; roomTime = 0; hitstop = 0; hub.dlg = null;
  players = makePlayers(); egPlace();
  Object.assign(EG, { step: 0, plan: 0, st: "intro", t: 0, fade: 1, trans: null, paused: false, music: null, bosses: [], poops: [], bubbles: [], brieEdge: null, deathT: 0, endT: 0, nextT: 0, loudT: 0, saidEnd: false });
  egSetPlan(0); egPlace();
  audio.resume.add(EG_MUSIC); audio.load(EG_MUSIC);   // gros fichier : chargé pendant les cloches
  EG.bell = egSound("eg_mariage", 0.9);   // les cloches du mariage, puis la musique de l'église, à fond
  // les mariés et Brie attendent sur le parvis
  EG.bosses = [egMakeBoss("brie", 330, false)]; EG.extras = [{ id: "jules", x: 400 }, { id: "laurene", x: 440 }];
  state = "eglise"; voice.say("L'église.", true);
}
// Lance l'étape i : changement de plan (fondu), dialogue, puis combat
function egStep(i) {
  EG.step = i; const S = EG_SCRIPT[i]; if (!S) return;
  const go = () => {
    EG.music = EG_MUSIC; audio.setLevel(EG_LEVEL, 0.5);
    startDialog(EG_DLG[S.dlg], () => { if (S.fight) egFight(S); else if (S.end) egEnd(); else if (S.confetti) { egConfetti(); EG.nextT = 3.2; } else egStep(i + 1); });
  };
  if (S.plan !== EG.plan) { EG.trans = { t: 0, done: false, plan: S.plan, then: go }; audio.sfx("eg_glas"); }
  else go();
}
function egFight(S) {
  EG.st = "fight"; EG.fightT = 0; lasers = []; EG.poops = []; EG.bubbles = [];
  // les boss du combat entrent (à leur place s'ils étaient déjà là, debout ou à terre) ; les vaincus des autres actes restent à terre en décor
  const fighters = S.fight.map((id, k) => {
    const old = EG.bosses.find(b => b.id === id), x0 = S.duo ? (id === "jules" ? 270 : 370) : S.giant ? VW / 2 : old ? egCx(old) : 380;
    return old && !old.down && !S.duo ? old : egMakeBoss(id, x0, !!S.duo, S.fast);
  });
  EG.bosses = EG.bosses.filter(b => b.down && !S.fight.includes(b.id)).concat(fighters);
  EG.extras = S.duo ? [] : (EG.extras || []).filter(x => !S.fight.includes(x.id));
  enemies = fighters; for (const b of fighters) b.cd = 1 + Math.random() * 0.5;
  // le duo : ils se relèvent en criant (Laurène se transforme) ; Brie aboie depuis le bord
  if (S.duo) { for (const b of fighters) egStartMove(b, "cri"); EG.brieEdge = { x: VW - 26, t: 0 }; }
  EG.music = egFightMusic(S);
  for (const p of players) p.inv = 1;
  if (S.giant) msg = { text: say("Frappe ses voitures juste avant qu'elles tombent !", "Touche ⚔ juste avant que la voiture tombe !", "{ATK} juste avant que la voiture tombe !"), t: 4 };
}
// Musique d'un combat : le thème du boss s'il existe (musique/eglise/<boss>), sinon l'église ; le duo alterne les deux thèmes
function egFightMusic(S) {
  if (!S || !S.fight) return EG_MUSIC;
  const th = S.fight.map(id => "musique/eglise/" + id.replace("_geante", "")).filter(hasSound);
  for (const m of th) audio.resume.add(m);   // en alternance, chaque thème reprend là où il s'était arrêté
  if (!th.length) return EG_MUSIC;
  if (S.duo && th.length > 1) return th[Math.floor((EG.fightT || 0) / 20) % th.length];
  return th[0];
}
function egliseMusic() {
  if (!EG.music) return null;
  if (EG.st === "fight") EG.music = egFightMusic(EG_SCRIPT[EG.step]);
  if (EG.music === EG_MUSIC && !hasSound(EG_MUSIC)) return pickList(audio.list("boss:maitre_ombres", "musique/boss/maitre_ombres"), 0) || "synth:boss";
  return EG.music;
}
// Fin du combat d'une étape : quand tous les boss sont à terre
function egCheckWin() {
  if (EG.st !== "fight" || enemies.some(b => b.type === "egboss" && !b.down)) return;
  EG.st = "talk"; lasers = lasers.filter(l => !l.eg); EG.poops = [];
  if (rush) { rushWin(null); return; }   // boss rush : pas de dialogue, le combat suivant
  EG.nextT = 1.2;
}
// Boss rush (rush.js) : un combat de l'église (étape i de EG_SCRIPT), sans dialogue ; l'arène est préparée en arrivant
function egRushFight(i) {
  const S = EG_SCRIPT[i];
  if (state !== "eglise") {
    egArena();
    pickups = []; ghosts = []; fxs = []; mach = null; chal = null; roomTime = 0; hitstop = 0; hub.dlg = null;
    Object.assign(EG, { st: "talk", t: 0, trans: null, paused: false, music: null, deathT: 0, endT: 0, nextT: 0, loudT: 0, saidEnd: false });
    audio.resume.add(EG_MUSIC); state = "eglise";
  }
  enemies = []; lasers = []; parts = [];
  Object.assign(EG, { step: i, fade: 1, bosses: [], extras: [], poops: [], bubbles: [], brieEdge: null }); egSetPlan(S.plan);
  players = makePlayers(); egPlace(); rushApply(false);
  egFight(S);
}
// Fin : les mariés explosent en confettis, Brie remue la queue, et le niveau est fini
function egEnd() {
  EG.st = "end"; EG.endT = 0;
  egConfetti();
}
function egConfetti() {
  shake = 10; audio.sfx("boom"); rumble(600, 1, 0.8);
  for (const b of EG.bosses) { if (b.gone) continue; b.gone = true; for (let k = 0; k < 90; k++) parts.push({ x: egCx(b) + (Math.random() - 0.5) * 20, y: b.y + Math.random() * b.h, vx: (Math.random() - 0.5) * 340, vy: -120 - Math.random() * 300, life: 1.6 + Math.random(), max: 2.6, color: ["#ff4f8a", "#fccc28", "#5ef0ff", "#7dffb0", "#c86eff", "#ffffff"][k % 6], size: 2 + (k % 2), grav: 320 }); }
  if (EG.brieEdge) EG.brieEdge.happy = true;
  audio.sfx("victory");
}
function egLeave() {
  if (EG.bell) EG.bell.stop(0.5); EG.bell = null;
  audio.setLevel(0.5); audio.setAmbience(null); hub.dlg = null; enemies = []; lasers = [];
  enterHub({ x: 380 });
}
// Le héros est tombé : on recommence le combat en cours (sans redire le dialogue)
function egRetry() {
  const S = EG_SCRIPT[EG.step];
  egSetPlan(EG.plan); players = makePlayers(); egPlace();
  EG.bosses = EG.bosses.filter(b => b.down && !(S.fight || []).includes(b.id)); lasers = []; parts = []; EG.poops = []; EG.bubbles = [];
  if (S.fight) egFight(S);
  if (rush) rushApply(true);
  msg = { text: "On recommence !", t: 2 };
}

SCREENS.eglise = {
  update(rdt) {
    const p = players[0];
    if (hub.dlg && !EG.trans) { updateDialog(rdt); return; }
    if (EG.st !== "end" && hit("Escape", "KeyP", "TPause", "GStart", "HStart")) { EG.paused = !EG.paused; audio.sfx("pause"); }
    if (EG.paused) { if (hit("KeyQ", "GB", "Backspace")) egLeave(); return; }
    if (hitstop > 0) { hitstop -= rdt; return; }
    const dt = rdt * (slowOn ? 0.35 : 1);
    EG.t += dt; roomTime += dt; EG.fade = Math.max(0, EG.fade - rdt * 1.5); if (msg && msg.t > 0) msg.t -= rdt;
    if (rush && !rush.res) { rush.t += rdt; updateRush(rdt); if (state !== "eglise") return; }
    if (EG.st === "fight") EG.fightT += rdt;
    if (EG.nextT > 0 && (EG.nextT -= rdt) <= 0) { egStep(EG.step + 1); return; }
    if (EG.loudT > 0 && (EG.loudT -= rdt) <= 0) audio.setLevel(EG_LEVEL, 1);
    audio.setAmbience(OPT.sfx ? "sfx/eglise/ambiance" : null);
    // arrivée : les cloches sonnent, puis la musique démarre à fond et les mariés parlent
    if (EG.st === "intro" && EG.t > 3) { EG.st = "talk"; if (EG.bell) EG.bell.stop(2); EG.bell = null; shake = 4; egStep(0); }
    // changement de plan : fondu au noir
    if (EG.trans) {
      const T0 = EG.trans; T0.t += rdt;
      if (T0.t > 0.6 && !T0.done) {
        T0.done = true; egSetPlan(T0.plan); egPlace(); for (const q of players) if (q.dead) coopRevive(q, true); lasers = []; EG.poops = []; audio.duck(1.2);
        if (T0.plan >= 3) {   // chez Mamie : les mariés sont partis en confettis ; au plan 4, la géante attend derrière le muret
          const S = EG_SCRIPT[EG.step]; EG.brieEdge = null; EG.extras = (S.extras || []).map(x => ({ ...x }));
          EG.bosses = T0.plan === 4 ? [egMakeBoss("mamie_geante", VW / 2, false)] : [];
        } else {
          for (const b of EG.bosses) if (b.down && b.id !== "brie") { b.x = VW - 120; }   // le marié vaincu suit sa femme dans la nef
          if (EG.bosses.some(b => b.id === "brie")) EG.bosses = EG.bosses.filter(b => b.id !== "brie");   // Brie reste sur le parvis… jusqu'au duo
          EG.extras = (EG.extras || []).map(x => ({ ...x, x: x.id === "laurene" ? 400 : 360 }));
        }
      }
      if (T0.t > 1.2) { const f = T0.then; EG.trans = null; if (f) f(); }
      updateParts(dt); return;
    }
    // pouvoirs comme en jeu
    const d = df();
    for (const q of players) {
      const pw = powerOf(q.C);
      if (pw && pw.burst) { q.powerOn = false; if (d.power && hit(...q.input.power) && !q.dead) burstPower(q, pw); q.gauge = Math.min(1, q.gauge + d.regen * rdt); }
      else { q.powerOn = !!(d.power && pw && down(...q.input.power) && q.gauge > 0 && !q.dead); q.gauge = q.powerOn ? Math.max(0, q.gauge - d.drain * rdt) : Math.min(1, q.gauge + d.regen * rdt); }
    }
    setTimeFx(players.some(q => usingPower(q, "slow")), players.some(q => usingPower(q, "fast")));
    for (const q of players) { if (!q.dead && EG.st !== "end") updatePlayer(q, dt); q.x = clamp(q.x, 2, VW - 12); }
    updateBubbles(dt);
    for (const e of EG.bosses) egUpdateBoss(e, dt);
    egUpdateCars(dt); egUpdateIncoming(dt);
    updateLasers(dt);
    // crottes de Brie : elles restent quelques secondes ; les toucher fait mal
    for (const c of EG.poops) { c.t -= dt; for (const q of players) if (!q.dead && ov(c, q)) hurtPlayer(q, c.x + 7); }
    EG.poops = EG.poops.filter(c => c.t > 0);
    // Brie aboie depuis le bord pendant le duo (sans attaquer)
    if (EG.brieEdge && !EG.brieEdge.happy) { const B = EG.brieEdge; B.t += dt; if (B.t > 2.2 + Math.random()) { B.t = 0; audio.sfx("eg_aboie"); EG.bubbles.push({ edge: true, text: Math.random() < 0.5 ? "WAF !" : "WAF WAF !", t: 1 }); } }
    for (const b of EG.bubbles) b.t -= rdt;
    EG.bubbles = EG.bubbles.filter(b => b.t > 0 && (b.edge || b.at || (EG.bosses.includes(b.e) && !b.e.gone)));
    egCheckWin();
    // le héros est tombé : on recommence ce combat
    if (roomLost() && !(rush && rush.next > 0)) { EG.deathT += rdt; if (EG.deathT > 1.6) { EG.deathT = 0; egRetry(); } }
    if (EG.st === "end") {
      EG.endT += rdt;
      if (EG.endT > 2.5 && !EG.saidEnd) { EG.saidEnd = true; startDialog(EG_DLG.apres, () => {}); }
      if (EG.endT > 3 && !hub.dlg && hit(...K.ok, "Mouse0", "Escape", "GB", "TJump")) { SAVE.flags.egliseWon = 1; saveGame(); EG.saidEnd = false; egLeave(); return; }
    }
    updateParts(dt); updateFx(dt);
  },
  draw() {
    const p = players[0];
    if (EG.plan === 4) drawGiantScene();
    else if (hasAtlas("eglise_" + (EG.plan + 1))) drawFrame("eglise_" + (EG.plan + 1), 0, VW / 2, VH, 1); else R(0, 0, VW, VH, "#1a0612");
    // la lumière des cierges vacille ; plus sombre et plus rouge pendant le duo
    const duo = EG_SCRIPT[EG.step] && EG_SCRIPT[EG.step].duo && EG.st === "fight";
    R(0, 0, VW, VH, `rgba(${duo ? 40 : 20},0,16,${(duo ? 0.25 : 0.12) + 0.05 * Math.sin(time * 3) + 0.03 * Math.sin(time * 11)})`);
    // crottes
    for (const c of EG.poops) { ctx.globalAlpha = c.t < 1 ? c.t : 1; if (hasAtlas("eg_crotte")) drawFrame("eg_crotte", 0, c.x + 7, EG_FLOOR + 1); else R(c.x, c.y, c.w, c.h, "#7a4a1a"); ctx.globalAlpha = 1; if (Math.random() < 0.05) parts.push({ x: c.x + 4 + Math.random() * 6, y: c.y - 2, vx: 0, vy: -14, life: 0.8, max: 0.8, color: "#9ac860", size: 1, grav: 0 }); }
    // mariés en décor (avant leur combat), Brie au bord pendant le duo
    for (const x of EG.extras || []) if (hasAtlas("eg_" + x.id)) drawFrame("eg_" + x.id, ATL["eg_" + x.id].anims.marche[0], x.x, EG_FLOOR, -1);
    if (EG.brieEdge && hasAtlas("eg_brie")) {
      const B = EG.brieEdge, A = ATL.eg_brie, fr = B.happy ? A.anims.repos[0] + Math.floor(time * 7) % 6 : EG.bubbles.some(b => b.edge) ? A.anims.aboie[0] + Math.floor(time * 9) % 5 : A.anims.repos[0] + Math.floor(time * 7) % 6;
      drawFrame("eg_brie", fr, B.x, EG_FLOOR, -1, 0.95);
    }
    // les boss
    for (const c of EG.cars) drawCar(c);
    for (const c of enemies) if (c.type === "egcar" && c.alive) drawIncoming(c);
    for (const e of EG.bosses) {
      if (e.gone || e.B.giant) continue;
      if (e.furie) glow(ctx, egCx(e), e.y + e.h / 2, 40, "255,40,80", 0.3 + 0.1 * Math.sin(time * 8));
      else if (e.rage) glow(ctx, egCx(e), e.y + e.h / 2, 32, e.id === "jules" ? "160,80,255" : "255,90,120", 0.2);
      const a = e.inv > 0 && !e.down && Math.floor(time * 30) % 2 ? 0.5 : 1;
      if (e.carry && hasAtlas("eg_voiture")) { const h = egCarHold(e); drawFrame("eg_voiture", ATL.eg_voiture.anims.rotation[0] + 1, Math.round(h.x), Math.round(h.y), e.face); }   // derrière elle : on la voit porter
      if (hasAtlas(e.B.atlas)) drawFrame(egAtlas(e), egFrame(e), Math.round(egCx(e)), EG_FLOOR + (e.ground ? 0 : Math.round(e.y + e.h - EG_FLOOR)), e.face, a);
      else R(e.x, e.y, e.w, e.h, e.B.color);
      if (e.beam && !e.down) {   // le laser des yeux, prolongé jusqu'au bord de l'écran
        const b = e.beam, x0 = Math.min(b.x1, b.x2), w = Math.abs(b.x2 - b.x1), fl = Math.sin(time * 40) > 0;
        glow(ctx, b.x1, b.y, 14, "255,45,106", 0.7);
        R(Math.round(x0), b.y - 3, Math.round(w), 6, "rgba(255,45,106,0.55)"); R(Math.round(x0), b.y - (fl ? 1 : 2), Math.round(w), fl ? 2 : 4, "#ffd0dc");
      }
    }
    // projectiles
    for (const l of lasers) {
      if (l.wpn) { drawWProj(l); continue; }
      if (!l.eg) continue;
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2, spin = Math.floor(l.t * 10) % 3;
      if (l.kind === "orb" && l.red) { glow(ctx, cx, cy, 12, l.owner === "player" ? "255,255,255" : "255,45,106", 0.7); if (hasAtlas("eg_orbe")) drawTinted("eg_orbe", 0, l.owner === "player" ? "#ffffff" : "#ff2d6a", cx, cy); else R(cx - 4, cy - 4, 8, 8, "#ff2d6a"); if (Math.random() < 0.5) parts.push({ x: cx, y: cy, vx: -l.vx * 0.2, vy: -10, life: 0.3, max: 0.3, color: "#ff8aa0", size: 1, grav: 0 }); }
      else if (l.kind === "orb") { glow(ctx, cx, cy, 10, l.owner === "player" ? "255,255,255" : "200,110,255", 0.6); if (hasAtlas("eg_orbe")) drawFrame("eg_orbe", 0, cx, cy); }
      else if (l.kind === "bouquet" || l.kind === "bouteille") drawFrame("eg_proj", ATL.eg_proj.anims[l.kind][0] + spin, cx, cy, l.vx < 0 ? -1 : 1);
      else if (l.kind === "chevre") drawFrame("eg_proj", ATL.eg_proj.anims.chevre[0] + (l.run ? 0 : 1 + spin % 2), cx, cy - 2, l.vx < 0 ? -1 : 1, 1, 0.8);
      else if (l.kind === "bark") { ctx.strokeStyle = "#fccc28"; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx - Math.sign(l.vx) * k * 5, cy, 4 + k * 3, Math.sign(l.vx) > 0 ? -0.9 : Math.PI - 0.9, Math.sign(l.vx) > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke(); } }
      else if (l.kind === "shock") {   // onde violette qui court au sol
        glow(ctx, cx, cy + 2, 12, "190,120,255", 0.55);
        for (let k = 0; k < 3; k++) { const h = 4 + ((Math.floor(l.t * 20) + k) % 3) * 3; R(Math.round(l.x + 2 + k * 4), Math.round(l.y + l.h - h), 2, h, k === 1 ? "#ffffff" : "#c8a0ff"); }
      }
      else if (l.kind === "shard") R(Math.round(l.x), Math.round(l.y), 4, 3, "#7dffb0");
      else if (l.kind === "pneu") {   // pneu qui roule (traits de vitesse quand il va vite) ; qui tombe : son ombre au sol
        if (l.rain && l.vy > 0 && l.y < EG_FLOOR - 40) { ctx.globalAlpha = 0.4; ctx.fillStyle = "#0e0a1a"; ctx.beginPath(); ctx.ellipse(cx, EG_FLOOR - 1, 10, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        if (l.owner === "player") glow(ctx, cx, cy, 12, "255,255,255", 0.5);
        if (hasAtlas("eg_pneu")) drawFrame("eg_pneu", Math.abs(l.vx) > 120 ? 1 + spin % 2 : 0, Math.round(cx), Math.round(cy), l.vx < 0 ? -1 : 1); else R(l.x, l.y, l.w, l.h, "#2a2a32");
      }
    }
    drawFxList(true); for (const q of players) drawCampPlayer(q); drawBubbles(); drawCoopTags(); drawFxList(false);
    for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    // bulles des répliques
    for (const b of EG.bubbles) {
      const x = b.at ? b.at.x : b.edge ? (EG.brieEdge ? EG.brieEdge.x : VW - 26) : b.e.B.giant ? egCx(b.e) - egPar() * 8 : egCx(b.e), y = b.at ? b.at.y : b.edge ? EG_FLOOR - 34 : b.e.B.giant ? 40 : b.e.y - 10;
      ctx.font = `700 8px ${FONT}`; const w = Math.ceil(ctx.measureText(b.text).width) + 8, bx = clamp(Math.round(x - w / 2), 2, VW - w - 2);
      ctx.globalAlpha = Math.min(1, b.t * 3); R(bx, y - 10, w, 13, "rgba(255,255,255,0.92)"); R(Math.round(x) - 2, y + 3, 4, 3, "rgba(255,255,255,0.92)");
      text(b.text, bx + w / 2, y - 3, 8, "#2a0a1a", "center"); ctx.globalAlpha = 1;
    }
    // haut de l'écran : lieu, cœurs, pouvoir
    R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
    if (rush) { text(`Boss rush  ${Math.min(rush.i + 1, RUSH_TOTAL)}/${RUSH_TOTAL}`, 6, 8, 9, "#ff5a7a"); text(fmtTime(rush.t), VW / 2, 8, 9, ch().ui, "center"); }
    else { text("L'église", 6, 8, 9, "#ff5a7a"); text(EG_PLANS[EG.plan], 58, 8, 8, "#e8dcff"); }
    const d = df(); let hx = VW - (TOUCH && !PAD ? 52 : 8);
    if (d.id === "doom") text("☠ DOOM", hx, 8, 9, d.color, "right", d.color);
    else {
      for (let i = d.hp - 1; i >= 0; i--) { hx -= 10; drawHeartIcon(hx + 4, 8, i < p.hp); }
      const pw = powerOf(p.C); hx -= 8;
      if (pw) { R(hx - 44, 5, 44, 6, "#2a1a44"); R(hx - 44, 5, Math.round(44 * p.gauge), 6, p.powerOn ? "#ffffff" : pw.color); }
    }
    drawCoopHud();
    // barres de vie des boss, en bas
    const fs = enemies.filter(e => e.type === "egboss").sort((a, b) => egCx(a) - egCx(b));   // une barre par combattant, dans l'ordre de l'écran
    if (EG.st === "fight") fs.forEach((e, k) => {
      const bw = fs.length > 1 ? 150 : 220, bx = fs.length > 1 ? (k ? VW - bw - 20 : 20) : (VW - bw) / 2, by = VH - 14;
      text(e.furie ? "Laurène (furie)" : e.fast ? "Mamie Florence (2e manche)" : e.B.name, bx, by - 6, 8, e.B.color);
      R(bx, by, bw, 6, "#2a0a1a"); R(bx, by, Math.round(bw * e.hp / e.max), 6, e.rage || e.furie ? "#ff2d6a" : "#c8304a"); ctx.strokeStyle = "#0e0a1a"; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 5);
    });
    if (msg && msg.t > 0) text(msg.text, VW / 2, 40, 10, "#e8dcff", "center", "#ff5a7a");
    if (EG.st === "end" && EG.endT > 3 && !hub.dlg) {
      R(0, 96, VW, 64, "rgba(10,6,24,0.75)");
      text("L'église : niveau terminé !", VW / 2, 118, 14, "#fccc28", "center", "#ff5a7a");
      text(say("Entrée : retour à la laverie", "Touche l'écran : retour à la laverie", "{A} : retour à la laverie"), VW / 2, 142, 8, "#e8dcff", "center");
    }
    const f = EG.trans ? (EG.trans.t < 0.6 ? EG.trans.t / 0.6 : 1 - (EG.trans.t - 0.6) / 0.6) : EG.fade;
    if (f > 0) R(0, 0, VW, VH, `rgba(0,0,0,${Math.min(1, f)})`);
    if (!EG.trans) drawDialog();
    if (EG.paused) {
      R(0, 0, VW, VH, "rgba(10,6,24,0.7)"); text("Pause", VW / 2, 110, 16, "#ff5a7a", "center", "#ff5a7a");
      text(say("Échap : reprendre   Q : laverie", "⏸ : reprendre", "Start : reprendre   {B} : laverie"), VW / 2, 136, 8, "#e8dcff", "center");
    }
  },
};
