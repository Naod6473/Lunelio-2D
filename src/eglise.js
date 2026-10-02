/* ---------------- L'église : le mariage de Laurène et Jules ---------------- */
// Après les 6 mondes, une cloche sonne dans la laverie à chaque retour (la première fois, Mme Bulle en parle) et la machine
// propose « L'église » (EGLISE_CARD). Dans une réalité alternative, Laurène et Jules se marient ; ils sont méchants et se moquent
// du héros. Actes (EG_SCRIPT) sur trois plans fixes (eglise_1 à 3, sans plateforme, sol à EG_FLOOR) : Brie, Jules, Laurène, puis
// Laurène (en furie) et Jules ensemble, 10 % plus rapides, Brie aboyant depuis le bord ; dialogues à portraits entre les actes
// (EG_DLG). Les boss sont des ennemis « egboss » (le sabre, le dash et les armes les touchent : egDamage) qui enchaînent des
// coups (EG_MOVES), avec des répliques en bulles et des tremblements d'écran quand ils crient. Musique : l'église, « à fond » au
// début, pendant les dialogues, qui reprend là où elle s'était arrêtée (audio.resume) ; pendant un combat, le thème du boss
// (musique/eglise/<boss>.mp3) s'il existe, les deux thèmes en alternance pour le duo. À la fin, les mariés explosent en confettis.
// Pas de récompense : le niveau est fini (SAVE.flags.egliseWon) et la cloche se tait.
const EG_READY = true, EG_FLOOR = 236, EG_MUSIC = "musique/eglise/eglise", EG_LEVEL = 0.9;
const EG = { step: 0, plan: 0, st: "intro", t: 0, fade: 0, trans: null, paused: false, music: null, bell: null, bosses: [], poops: [], bubbles: [], brieEdge: null, deathT: 0, endT: 0, nextT: 0, loudT: 0 };
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
  apres: [
    ["hero", "Tous mes vœux de bonheur… dans votre réalité !"],
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
  { plan: 2, dlg: "fin", end: true },
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
};
const EG_FPS = { repos: 7, course: 12, aboie: 9, saut: 9, crotte: 6, morte: 1, marche: 7, glissade: 10, cri: 8, lancer: 10, combat_pieds: 10,
  lancer_bouquet: 10, lancer_chevre: 9, lancer_bouteille: 10, furie: 7 };
function egMakeBoss(id, x, duo) {
  const B = EGB[id], d = df(), hp = Math.max(4, Math.round(B.hp * d.bossHp * (duo ? 0.8 : 1)));
  return { type: "egboss", id, B, alive: true, x: x - B.w / 2, y: EG_FLOOR - B.h, w: B.w, h: B.h, vx: 0, vy: 0, face: -1, ground: true,
    hp, max: hp, mv: null, mt: 0, cd: 1.2, an: id === "brie" ? "repos" : "marche", anT: 0, inv: 0, flash: 0,
    spd: (duo ? 1.1 : 1) * (d.id === "doom" ? 1.15 : d.id === "facile" ? 0.85 : 1), rage: false, furie: duo && id === "laurene", duo, down: false, sayCd: 2 };
}
const egCx = e => e.x + e.w / 2;
function egSay(e, text) { EG.bubbles = EG.bubbles.filter(b => b.e !== e); EG.bubbles.push({ e, text, t: 1.6 }); }
function egTaunt(e, chance = 0.5) { if (e.sayCd <= 0 && Math.random() < chance) { egSay(e, e.B.say[Math.floor(Math.random() * e.B.say.length)]); e.sayCd = 3 + Math.random() * 2; } }
function egAnim(e, an) { if (e.an !== an) { e.an = an; e.anT = 0; } }
function egFrame(e) {
  const A = ATL[e.B.atlas]; if (!A) return 0;
  if (e.furie) return A.anims.furie[0] + (e.an === "furie" ? Math.min(5, Math.floor(e.anT * 7)) : 5);   // Laurène en furie : la transformation, puis sa dernière pose
  if (e.down) return e.id === "brie" ? A.anims.morte[0] : A.anims.glissade[0] + 5;   // à terre
  const [s, n] = A.anims[e.an] || A.anims[Object.keys(A.anims)[0]], f = Math.floor(e.anT * (EG_FPS[e.an] || 8));
  return s + (["repos", "course", "marche"].includes(e.an) ? f % n : Math.min(n - 1, f));
}
// Projectiles (dans lasers, avec eg) : orbe et bouquet se renvoient au sabre ; bouteille, chèvre, aboiement et onde, non
function egShot(kind, x, y, vx, vy, o = {}) {
  const size = { orb: 10, bouquet: 14, bouteille: 10, chevre: 22, bark: 16, shock: 14, shard: 6 }[kind] || 10;
  lasers.push({ eg: true, kind, x: x - size / 2, y: y - size / 2, w: size, h: kind === "chevre" ? 16 : size, vx, vy, g: o.g || 0, owner: "enemy", alive: true,
    noReflect: !["orb", "bouquet"].includes(kind), t: 0, life: o.life || 5, color: o.color || "#c86eff", ...o });
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
    if (l.kind === "chevre" && !l.run) { l.run = true; l.y = EG_FLOOR - l.h; l.vy = 0; l.g = 0; l.vx = Math.sign(l.vx || 1) * 190; l.life = l.t + 2.2; audio.sfx("land"); }
    else if (l.kind === "orb" || l.kind === "bouquet") { l.alive = false; burst(l.x + l.w / 2, EG_FLOOR - 3, 10, [l.kind === "orb" ? "#c86eff" : "#ff8ab0", "#ffffff"], 110, 0.4, 200, 2); return; }
    else if (l.vy > 0) { l.y = EG_FLOOR - l.h; l.vy = 0; }
  }
  if (l.x < -30 || l.x > VW + 30) { l.alive = false; return; }
  if (l.owner === "enemy") {
    for (const p of players) if (!p.dead && ov(l, p) && p.inv <= 0 && p.dashT <= 0) { if (!["bark", "shock"].includes(l.kind)) l.alive = false; hurtPlayer(p, l.x); break; }
  } else for (const e of enemies) if (e.alive && e.type === "egboss" && ov(l, e)) { hitEnemy(e, "laser"); l.alive = false; break; }
}
function egDamage(e, n) {
  if (!e.alive || e.down || e.inv > 0 || EG.st !== "fight") return;
  e.hp -= n; e.inv = 0.22; e.flash = 0.15; hitstop = 0.05; shake = Math.max(shake, 3);
  audio.sfx("bosshit"); burst(egCx(e), e.y + e.h / 2, 10, [e.B.color, "#ffffff"], 150, 0.4, 200, 2);
  if (e.hp <= 0) { e.hp = 0; egDown(e); return; }
  if (!e.rage && e.hp <= e.max / 2) {   // à mi-vie : un cri, l'écran tremble, il accélère
    e.rage = true; e.spd *= 1.15; e.mv = null; egStartMove(e, "cri");
    egSay(e, e.id === "brie" ? "GRRRR… WAF !" : e.id === "jules" ? "Pas sur les chaussures ! Elles sont neuves !" : e.furie ? "TU VAS ME LE PAYER !" : "Tu vas voir, petit invité !");
    audio.setLevel(1, 0.2); EG.loudT = 2.5;   // la musique monte un instant
  } else egTaunt(e, 0.25);
}
function egDown(e) {
  e.down = true; e.mv = null; e.vx = 0; e.inv = 99; e.alive = false;
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
  glisse: { start(e, p) { e.face = towards(e, p); egAnim(e, "glissade"); },
    update(e, p, dt) { e.vx = e.mt > 0.1 && e.mt < 0.5 ? e.face * 290 * e.spd : 0; return e.mt > 0.65; } },
  bascule: { start(e, p) { e.face = egCx(e) < VW / 2 ? 1 : -1; egAnim(e, "saut"); e.vy = -400; e.vx = e.face * 230 * e.spd; e.ground = false; },   // saute de l'autre côté
    update(e, p, dt) { if (e.ground && e.mt > 0.2) { e.vx = 0; shake = Math.max(shake, 2); return true; } return false; } },
};
const EG_CONTACT = { charge: e => e.mt > 0.45, bond: e => !e.ground, glissade: e => e.mt > 0.1 && e.mt < 0.5, glisse: e => e.mt > 0.1 && e.mt < 0.5, saut: e => !e.ground, bascule: e => !e.ground };
const EG_SETS = {
  brie: e => [["charge", 3], ["aboie", 3], ["bond", 2], ["crotte", e.rage ? 2 : 1]],
  jules: e => [["orbe", 3], ["glissade", 2], ["pieds", 2], ["saut", 2]],
  laurene: e => e.furie ? [["bouquet", 3], ["chevre", 2], ["bouteille", 3], ["bascule", 1]] : [["bouquet", 3], ["chevre", 2], ["bouteille", 2], ["glisse", 2], ["bascule", 1]],
};
function egStartMove(e, name) { e.mv = name; e.mt = 0; e.done = false; e.atkBox = false; EG_MOVES[name].start(e, targetOf(e)); }
function egPick(e) {
  const set = EG_SETS[e.id](e), tot = set.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot;
  for (const [n, w] of set) { r -= w; if (r <= 0) { if (n === e.lastMv && Math.random() < 0.6) continue; e.lastMv = n; return n; } }
  return set[0][0];
}
function egUpdateBoss(e, dt) {
  const p = targetOf(e);
  e.inv = Math.max(0, e.inv - dt); e.flash = Math.max(0, e.flash - dt); e.sayCd -= dt; e.anT += dt;
  if (e.down) { e.vx = 0; }
  else if (EG.st !== "fight") { e.vx = 0; e.mv = null; e.face = towards(e, p); egAnim(e, e.id === "brie" ? "repos" : "marche"); if (e.id !== "brie") e.anT = 0; }
  else if (e.mv) { e.mt += dt; if (EG_MOVES[e.mv].update(e, p, dt)) { e.mv = null; e.vx = 0; e.cd = (e.rage ? 0.45 : 0.75) / e.spd + Math.random() * 0.4; } }
  else {
    // entre deux coups : il se place (Brie trotte, les mariés marchent) à bonne distance, en regardant le héros
    e.face = towards(e, p); e.cd -= dt;
    const dx = p.x + 5 - egCx(e), want = e.id === "brie" ? 70 : 110, dir = Math.abs(dx) > want + 30 ? Math.sign(dx) : Math.abs(dx) < want - 30 ? -Math.sign(dx) : 0;
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

/* ---- Déroulement ---- */
function egArena() {
  const W = CWORLDS[2];
  lvl = { json: true, eglise: true, W, R: W.rooms[0], width: VW, solids: [{ x: -40, y: EG_FLOOR, w: VW + 80, h: VH }], plats: [], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [],
    machine: null, ckpt: null, start: { x: 40, y: EG_FLOOR - 32 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null };
}
function startEglise() {
  egArena();
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = []; mach = null; chal = null; roomTime = 0; hitstop = 0; hub.dlg = null;
  players = [makePlayer(ch(), K, 0)]; const p = players[0]; p.x = 40; p.y = EG_FLOOR - p.h; p.face = 1;
  Object.assign(EG, { step: 0, plan: 0, st: "intro", t: 0, fade: 1, trans: null, paused: false, music: null, bosses: [], poops: [], bubbles: [], brieEdge: null, deathT: 0, endT: 0, nextT: 0, loudT: 0, saidEnd: false });
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
    startDialog(EG_DLG[S.dlg], () => { if (S.fight) egFight(S); else if (S.end) egEnd(); else egStep(i + 1); });
  };
  if (S.plan !== EG.plan) { EG.trans = { t: 0, done: false, plan: S.plan, then: go }; audio.sfx("eg_glas"); }
  else go();
}
function egFight(S) {
  const p = players[0];
  EG.st = "fight"; EG.fightT = 0; lasers = []; EG.poops = []; EG.bubbles = [];
  // les boss du combat entrent (à leur place s'ils étaient déjà là, debout ou à terre) ; les vaincus des autres actes restent à terre en décor
  const fighters = S.fight.map((id, k) => {
    const old = EG.bosses.find(b => b.id === id), x0 = S.duo ? (id === "jules" ? 270 : 370) : old ? egCx(old) : 380;
    return old && !old.down && !S.duo ? old : egMakeBoss(id, x0, !!S.duo);
  });
  EG.bosses = EG.bosses.filter(b => b.down && !S.fight.includes(b.id)).concat(fighters);
  EG.extras = S.duo ? [] : (EG.extras || []).filter(x => !S.fight.includes(x.id));
  enemies = fighters; for (const b of fighters) b.cd = 1 + Math.random() * 0.5;
  // le duo : ils se relèvent en criant (Laurène se transforme) ; Brie aboie depuis le bord
  if (S.duo) { for (const b of fighters) egStartMove(b, "cri"); EG.brieEdge = { x: VW - 26, t: 0 }; }
  EG.music = egFightMusic(S);
  p.inv = 1;
}
// Musique d'un combat : le thème du boss s'il existe (musique/eglise/<boss>), sinon l'église ; le duo alterne les deux thèmes
function egFightMusic(S) {
  const th = S.fight.map(id => "musique/eglise/" + id).filter(hasSound);
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
  if (EG.st !== "fight" || enemies.some(b => !b.down)) return;
  EG.st = "talk"; lasers = lasers.filter(l => !l.eg); EG.poops = []; EG.nextT = 1.2;
}
// Fin : les mariés explosent en confettis, Brie remue la queue, et le niveau est fini
function egEnd() {
  EG.st = "end"; EG.endT = 0; shake = 10; audio.sfx("boom"); rumble(600, 1, 0.8);
  for (const b of EG.bosses) { b.gone = true; for (let k = 0; k < 90; k++) parts.push({ x: egCx(b) + (Math.random() - 0.5) * 20, y: b.y + Math.random() * b.h, vx: (Math.random() - 0.5) * 340, vy: -120 - Math.random() * 300, life: 1.6 + Math.random(), max: 2.6, color: ["#ff4f8a", "#fccc28", "#5ef0ff", "#7dffb0", "#c86eff", "#ffffff"][k % 6], size: 2 + (k % 2), grav: 320 }); }
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
  const S = EG_SCRIPT[EG.step], p = players[0];
  players = [makePlayer(ch(), K, 0)]; const q = players[0]; q.x = 40; q.y = EG_FLOOR - q.h; q.face = 1;
  EG.bosses = EG.bosses.filter(b => b.down && !(S.fight || []).includes(b.id)); lasers = []; parts = []; EG.poops = []; EG.bubbles = [];
  if (S.fight) egFight(S);
  msg = { text: "On recommence !", t: 2 };
}

SCREENS.eglise = {
  update(rdt) {
    const p = players[0];
    if (hub.dlg && !EG.trans) { updateDialog(rdt); return; }
    if (EG.st !== "end" && hit("Escape", "KeyP", "TPause", "GStart")) { EG.paused = !EG.paused; audio.sfx("pause"); }
    if (EG.paused) { if (hit("KeyQ", "GB", "Backspace")) egLeave(); return; }
    if (hitstop > 0) { hitstop -= rdt; return; }
    const dt = rdt * (slowOn ? 0.35 : 1);
    EG.t += dt; roomTime += dt; EG.fade = Math.max(0, EG.fade - rdt * 1.5); if (msg && msg.t > 0) msg.t -= rdt;
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
        T0.done = true; EG.plan = T0.plan; p.x = 40; p.y = EG_FLOOR - p.h; p.vx = 0; p.face = 1; lasers = []; EG.poops = []; audio.duck(1.2);
        for (const b of EG.bosses) if (b.down && b.id !== "brie") { b.x = VW - 120; }   // le marié vaincu suit sa femme dans la nef
        if (EG.bosses.some(b => b.id === "brie")) EG.bosses = EG.bosses.filter(b => b.id !== "brie");   // Brie reste sur le parvis… jusqu'au duo
        EG.extras = (EG.extras || []).map(x => ({ ...x, x: x.id === "laurene" ? 400 : 360 }));
      }
      if (T0.t > 1.2) { const f = T0.then; EG.trans = null; if (f) f(); }
      updateParts(dt); return;
    }
    // pouvoirs comme en jeu
    const d = df(), pw = powerOf(p.C);
    if (pw && pw.burst) { p.powerOn = false; if (d.power && hit(...p.input.power) && !p.dead) burstPower(p, pw); p.gauge = Math.min(1, p.gauge + d.regen * rdt); }
    else { p.powerOn = !!(d.power && pw && down(...p.input.power) && p.gauge > 0 && !p.dead); p.gauge = p.powerOn ? Math.max(0, p.gauge - d.drain * rdt) : Math.min(1, p.gauge + d.regen * rdt); }
    setTimeFx(usingPower(p, "slow"), usingPower(p, "fast"));
    if (!p.dead && EG.st !== "end") updatePlayer(p, dt);
    p.x = clamp(p.x, 2, VW - 12);
    for (const e of EG.bosses) egUpdateBoss(e, dt);
    updateLasers(dt);
    // crottes de Brie : elles restent quelques secondes ; les toucher fait mal
    for (const c of EG.poops) { c.t -= dt; if (!p.dead && ov(c, p)) hurtPlayer(p, c.x + 7); }
    EG.poops = EG.poops.filter(c => c.t > 0);
    // Brie aboie depuis le bord pendant le duo (sans attaquer)
    if (EG.brieEdge && !EG.brieEdge.happy) { const B = EG.brieEdge; B.t += dt; if (B.t > 2.2 + Math.random()) { B.t = 0; audio.sfx("eg_aboie"); EG.bubbles.push({ edge: true, text: Math.random() < 0.5 ? "WAF !" : "WAF WAF !", t: 1 }); } }
    for (const b of EG.bubbles) b.t -= rdt;
    EG.bubbles = EG.bubbles.filter(b => b.t > 0 && (b.edge || (EG.bosses.includes(b.e) && !b.e.gone)));
    egCheckWin();
    // le héros est tombé : on recommence ce combat
    if (p.dead) { EG.deathT += rdt; if (EG.deathT > 1.6) { EG.deathT = 0; egRetry(); } }
    if (EG.st === "end") {
      EG.endT += rdt;
      if (EG.endT > 2.5 && !EG.saidEnd) { EG.saidEnd = true; startDialog(EG_DLG.apres, () => {}); }
      if (EG.endT > 3 && !hub.dlg && hit(...K.ok, "Mouse0", "Escape", "GB", "TJump")) { SAVE.flags.egliseWon = 1; saveGame(); EG.saidEnd = false; egLeave(); return; }
    }
    updateParts(dt); updateFx(dt);
  },
  draw() {
    const p = players[0];
    if (hasAtlas("eglise_" + (EG.plan + 1))) drawFrame("eglise_" + (EG.plan + 1), 0, VW / 2, VH, 1); else R(0, 0, VW, VH, "#1a0612");
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
    for (const e of EG.bosses) {
      if (e.gone) continue;
      if (e.furie) glow(ctx, egCx(e), e.y + e.h / 2, 40, "255,40,80", 0.3 + 0.1 * Math.sin(time * 8));
      else if (e.rage) glow(ctx, egCx(e), e.y + e.h / 2, 32, e.id === "jules" ? "160,80,255" : "255,90,120", 0.2);
      const a = e.inv > 0 && !e.down && Math.floor(time * 30) % 2 ? 0.5 : 1;
      if (hasAtlas(e.B.atlas)) drawFrame(e.B.atlas, egFrame(e), Math.round(egCx(e)), EG_FLOOR + (e.ground ? 0 : Math.round(e.y + e.h - EG_FLOOR)), e.face, a);
      else R(e.x, e.y, e.w, e.h, e.B.color);
    }
    // projectiles
    for (const l of lasers) {
      if (l.wpn) { drawWProj(l); continue; }
      if (!l.eg) continue;
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2, spin = Math.floor(l.t * 10) % 3;
      if (l.kind === "orb") { glow(ctx, cx, cy, 10, l.owner === "player" ? "255,255,255" : "200,110,255", 0.6); if (hasAtlas("eg_orbe")) drawFrame("eg_orbe", 0, cx, cy); }
      else if (l.kind === "bouquet" || l.kind === "bouteille") drawFrame("eg_proj", ATL.eg_proj.anims[l.kind][0] + spin, cx, cy, l.vx < 0 ? -1 : 1);
      else if (l.kind === "chevre") drawFrame("eg_proj", ATL.eg_proj.anims.chevre[0] + (l.run ? 0 : 1 + spin % 2), cx, cy - 2, l.vx < 0 ? -1 : 1, 1, 0.8);
      else if (l.kind === "bark") { ctx.strokeStyle = "#fccc28"; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx - Math.sign(l.vx) * k * 5, cy, 4 + k * 3, Math.sign(l.vx) > 0 ? -0.9 : Math.PI - 0.9, Math.sign(l.vx) > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke(); } }
      else if (l.kind === "shock") {   // onde violette qui court au sol
        glow(ctx, cx, cy + 2, 12, "190,120,255", 0.55);
        for (let k = 0; k < 3; k++) { const h = 4 + ((Math.floor(l.t * 20) + k) % 3) * 3; R(Math.round(l.x + 2 + k * 4), Math.round(l.y + l.h - h), 2, h, k === 1 ? "#ffffff" : "#c8a0ff"); }
      }
      else if (l.kind === "shard") R(Math.round(l.x), Math.round(l.y), 4, 3, "#7dffb0");
    }
    drawFxList(true); if (!p.dead) drawCampPlayer(p); drawFxList(false);
    for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    // bulles des répliques
    for (const b of EG.bubbles) {
      const x = b.edge ? (EG.brieEdge ? EG.brieEdge.x : VW - 26) : egCx(b.e), y = b.edge ? EG_FLOOR - 34 : b.e.y - 10;
      ctx.font = `700 8px ${FONT}`; const w = Math.ceil(ctx.measureText(b.text).width) + 8, bx = clamp(Math.round(x - w / 2), 2, VW - w - 2);
      ctx.globalAlpha = Math.min(1, b.t * 3); R(bx, y - 10, w, 13, "rgba(255,255,255,0.92)"); R(Math.round(x) - 2, y + 3, 4, 3, "rgba(255,255,255,0.92)");
      text(b.text, bx + w / 2, y - 3, 8, "#2a0a1a", "center"); ctx.globalAlpha = 1;
    }
    // haut de l'écran : lieu, cœurs, pouvoir
    R(0, 0, VW, 16, "rgba(10,6,24,0.7)");
    text("L'église", 6, 8, 9, "#ff5a7a");
    text(["Le parvis", "Les marches", "La nef"][EG.plan], 58, 8, 8, "#e8dcff");
    const d = df(); let hx = VW - (TOUCH && !PAD ? 52 : 8);
    if (d.id === "doom") text("☠ DOOM", hx, 8, 9, d.color, "right", d.color);
    else {
      for (let i = d.hp - 1; i >= 0; i--) { hx -= 10; drawHeartIcon(hx + 4, 8, i < p.hp); }
      const pw = powerOf(p.C); hx -= 8;
      if (pw) { R(hx - 44, 5, 44, 6, "#2a1a44"); R(hx - 44, 5, Math.round(44 * p.gauge), 6, p.powerOn ? "#ffffff" : pw.color); }
    }
    // barres de vie des boss, en bas
    const fs = enemies.filter(e => e.type === "egboss").sort((a, b) => egCx(a) - egCx(b));   // une barre par combattant, dans l'ordre de l'écran
    if (EG.st === "fight") fs.forEach((e, k) => {
      const bw = fs.length > 1 ? 150 : 220, bx = fs.length > 1 ? (k ? VW - bw - 20 : 20) : (VW - bw) / 2, by = VH - 14;
      text(e.furie ? "Laurène (furie)" : e.B.name, bx, by - 6, 8, e.B.color);
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
