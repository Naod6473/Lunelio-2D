/* ---------------- Versus : duel entre deux héros ---------------- */
// Carte « Versus » de l'écran des mondes (VS_CARD, toujours ouverte) → écran des réglages (vssetup) → combat (versus).
// Deux joueurs sur le même écran (le joueur 2 rejoint comme en coop : Start sur une autre manette, ou la touche 2), ou un
// adversaire ordinateur (3 niveaux). Manches (1, 2 ou 3 gagnantes), chrono facultatif (à la fin, la plus grande part de vie
// gagne la manche), force réglée pour chaque joueur (VS_FORCE : vie et force des coups), arènes des boss et de l'église.
// Pas de récompense. On perd une manche « étourdi » (pose de KO ou héros couché avec des étoiles), jamais de violence.
// Les coups passent par le moteur normal : chaque joueur voit l'autre comme un « ennemi » (vsProxy, type "vsp") dans
// enemies, et hitEnemy() renvoie à vsHit(). Les tirs de chaque joueur ne cherchent que son adversaire (vsLasers).
const VS_FORCE = [
  { id: "facile", label: "Facile", hp: 140, dmg: 1.25 },
  { id: "normal", label: "Normal", hp: 100, dmg: 1 },
  { id: "doom", label: "Doom", hp: 70, dmg: 0.8 }];
const VS_AI = ["Ordinateur gentil", "Ordinateur malin", "Ordinateur redoutable", "Joueur 2 (humain)"];
const VS_ROUNDS = [{ n: 2, label: "2 manches gagnantes" }, { n: 3, label: "3 manches gagnantes" }, { n: 1, label: "1 seule manche" }];
const VS_TIMES = [{ t: 60, label: "60 s" }, { t: 90, label: "90 s" }, { t: 0, label: "Sans chrono" }];
// Arènes : les 6 arènes de boss de la campagne (sol à 240, deux plateformes) et les plans de l'église (sol à 236)
const VS_ARENAS = [
  ...[0, 1, 2, 3, 4, 5].map(wi => ({ camp: wi })),
  { eg: 1, name: "Le parvis" }, { eg: 2, name: "Les marches" }, { eg: 3, name: "La nef" }, { eg: 4, name: "Le cimetière" }];
const vsArenaName = a => a.camp !== undefined ? CWORLDS[a.camp].name : a.name;
const VS_RANGED = new Set(["arc", "boomerang", "pistolet", "canon", "laser", "lancepierre"]);   // armes qui tirent : l'ordinateur garde ses distances
const KAI = { left: ["ALeft"], right: ["ARight"], jump: ["AJump"], drop: ["ADown"], attack: ["AAtk"], special: ["ASpec"], power: ["APow"], act: [] };
const VS_NOIN = { left: [], right: [], jump: [], drop: [], attack: [], special: [], power: [], act: [] };
const VS = { cfg: { c1: 0, c2: 1, f1: 1, f2: 1, ai: 0, arena: -1, rounds: 0, time: 0 }, sel: 0, st: "intro", t: 0, wins: [0, 0], round: 0,
  clock: 0, arena: null, paused: false, winner: -1, endSel: 0, notes: [] };
const VS_CARD = () => campCardCount() - 1;   // toujours la dernière carte de l'écran des mondes

/* ---- Réglages ---- */
const vsPickable = C => !charLocked(C);
function vsNextChar(i, d) { const n = CHARS.length; for (let k = 1; k <= n; k++) { const j = (i + d * k + n * k) % n; if (vsPickable(CHARS[j])) return j; } return i; }
function openVersus() {
  const c = VS.cfg; c.c1 = charIdx; if (c.c2 === c.c1 || !vsPickable(CHARS[c.c2])) c.c2 = COOP.on ? COOP.ci : vsNextChar(c.c1, 1);
  if (COOP.on) c.ai = 3;
  VS.sel = 0; state = "vssetup"; audio.sfx("start"); voice.say("Versus ! Choisis les combattants.", true);
}
const VS_ROWS = ["c1", "f1", "ai", "c2", "f2", "arena", "rounds", "time", "go"];
function vsRowText(k) {
  const c = VS.cfg;
  switch (k) {
    case "c1": return ["Joueur 1", CHARS[c.c1].name];
    case "f1": return ["Force J1", VS_FORCE[c.f1].label];
    case "ai": return ["Adversaire", VS_AI[c.ai]];
    case "c2": return [c.ai === 3 ? "Joueur 2" : "Ordinateur", CHARS[c.c2].name];
    case "f2": return [c.ai === 3 ? "Force J2" : "Force ordi", VS_FORCE[c.f2].label];
    case "arena": return ["Arène", c.arena < 0 ? "Au hasard" : vsArenaName(VS_ARENAS[c.arena])];
    case "rounds": return ["Manches", VS_ROUNDS[c.rounds].label];
    case "time": return ["Chrono", VS_TIMES[c.time].label];
    case "go": return ["", "Combattez !"];
  }
}
function vsChange(k, d) {
  const c = VS.cfg, wrap = (v, n) => (v + d + n) % n;
  if (k === "c1") c.c1 = vsNextChar(c.c1, d);
  else if (k === "c2") c.c2 = vsNextChar(c.c2, d);
  else if (k === "f1") c.f1 = wrap(c.f1, 3);
  else if (k === "f2") c.f2 = wrap(c.f2, 3);
  else if (k === "ai") { c.ai = wrap(c.ai, 4); if (c.ai === 3 && !COOP.on) msg = { text: say("Joueur 2 : appuie sur 2, ou sur Start d'une autre manette", "Joueur 2 : il faut une manette ou un clavier", "Joueur 2 : appuie sur Start d'une autre manette"), t: 3 }; }
  else if (k === "arena") c.arena = (c.arena + 1 + d + VS_ARENAS.length + 1) % (VS_ARENAS.length + 1) - 1;
  else if (k === "rounds") c.rounds = wrap(c.rounds, VS_ROUNDS.length);
  else if (k === "time") c.time = wrap(c.time, VS_TIMES.length);
  else return;
  audio.sfx("select");
}
const VUI = { row: i => ({ x: 14, y: 40 + i * 21, w: 236, h: 18 }), arrowL: i => ({ x: 120, y: 40 + i * 21, w: 18, h: 18 }), arrowR: i => ({ x: 232, y: 40 + i * 21, w: 18, h: 18 }) };
SCREENS.vssetup = {
  update() {
    const c = VS.cfg;
    if (hit("Escape", "GB") || (hit("Mouse0") && inside({ x: 8, y: 6, w: 50, h: 20 }))) { audio.sfx("back"); openWorlds(); worldSel = VS_CARD(); return; }
    // le joueur 2 rejoint ici aussi (comme sur l'écran des héros)
    if (hit("Digit2")) { if (!COOP.on) { coopJoin("kb"); c.ai = 3; msg = null; } else if (COOP.dev === "kb") { coopLeave(); if (c.ai === 3) c.ai = 1; } }
    if (COOP.on && c.ai === 3) {   // le joueur 2 choisit son héros avec ses propres commandes
      if (hit(...K2.left)) vsChange("c2", -1);
      if (hit(...K2.right)) vsChange("c2", 1);
    }
    if (COOP.on && VS.wasCoop === false) { c.ai = 3; msg = null; }
    VS.wasCoop = COOP.on;
    if (hit(...K.up)) { VS.sel = (VS.sel + VS_ROWS.length - 1) % VS_ROWS.length; audio.sfx("select"); }
    if (hit(...K.down)) { VS.sel = (VS.sel + 1) % VS_ROWS.length; audio.sfx("select"); }
    const k = VS_ROWS[VS.sel];
    if (hit(...K.left)) vsChange(k, -1);
    if (hit(...K.right)) vsChange(k, 1);
    if (hit("Mouse0")) for (let i = 0; i < VS_ROWS.length; i++) {
      if (VS_ROWS[i] !== "go" && inside(VUI.arrowL(i))) { VS.sel = i; vsChange(VS_ROWS[i], -1); return; }
      if (VS_ROWS[i] !== "go" && inside(VUI.arrowR(i))) { VS.sel = i; vsChange(VS_ROWS[i], 1); return; }
      if (inside(VUI.row(i))) { if (VS_ROWS[i] === "go") { vsTryStart(); return; } VS.sel = i; audio.sfx("select"); }
    }
    if (hit(...K.ok) && k === "go") vsTryStart();
    if (msg && msg.t > 0) msg.t -= 1 / 60;
  },
  draw() {
    const c = VS.cfg, C1 = CHARS[c.c1], C2 = CHARS[c.c2];
    drawMenuBg(); R(0, 0, VW, VH, "rgba(13,8,32,0.6)");
    text("Versus", VW / 2, 18, 16, "#ff5a7a", "center", "#ff5a7a");
    VS_ROWS.forEach((k, i) => {
      const r = VUI.row(i), sel = i === VS.sel, [lab, val] = vsRowText(k);
      R(r.x, r.y, r.w, r.h, sel ? "rgba(255,90,122,0.22)" : "rgba(14,8,30,0.8)");
      if (sel) { ctx.strokeStyle = "#ff5a7a"; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
      if (k === "go") { text(val, r.x + r.w / 2, r.y + 9, 10, sel ? "#ffffff" : "#ff8ab0", "center", sel ? "#ff5a7a" : null); return; }
      text(lab, r.x + 6, r.y + 9, 8, "#b9a6e0");
      text("◀", r.x + 113, r.y + 9, 8, sel ? "#ffffff" : "#6a5a88", "center");
      text(val, r.x + 176, r.y + 9, 8, k === "c1" ? COOP_COL[0] : k === "c2" ? COOP_COL[1] : "#ffffff", "center");
      text("▶", r.x + r.w - 9, r.y + 9, 8, sel ? "#ffffff" : "#6a5a88", "center");
    });
    // aperçu : l'arène et les deux héros face à face
    const px = 262, py = 40, pw = 204, ph = Math.round(pw * VH / VW), a = c.arena < 0 ? null : VS_ARENAS[c.arena];
    R(px - 2, py - 2, pw + 4, ph + 4, "#0e0a1a");
    ctx.imageSmoothingEnabled = true;
    if (a && a.camp !== undefined) { const im = getImg(CWORLDS[a.camp].rooms[CWORLDS[a.camp].rooms.length - 1].bg); if (im.ok) ctx.drawImage(im.img, px, py, pw, ph); }
    else if (a && hasAtlas("eglise_" + a.eg)) { const A = ATL["eglise_" + a.eg]; ctx.drawImage(atlasImg("eglise_" + a.eg), 0, 0, A.cw, A.ch, px, py, pw, ph); }
    else { R(px, py, pw, ph, "#1a1030"); text("?", px + pw / 2, py + ph / 2, 30, "#6a5a88", "center"); }
    ctx.imageSmoothingEnabled = false;
    R(px, py, pw, ph, "rgba(10,6,24,0.25)");
    const fy = py + ph - 8, an = (C, t) => { const A = ATL[charAtlas(C)]; return A && A.anims.idle ? A.anims.idle[0] + Math.floor(t * 6) % A.anims.idle[1] : 0; };
    drawChar(C1, an(C1, time), px + 60, fy, 1, 1.3); drawChar(C2, an(C2, time + 0.3), px + pw - 60, fy, -1, 1.3);
    text("VS", px + pw / 2, py + ph / 2, 16, "#ffffff", "center", "#ff5a7a");
    text(C1.name, px + 4, py + ph + 10, 8, COOP_COL[0]); text(C2.name, px + pw - 4, py + ph + 10, 8, COOP_COL[1], "right");
    text(`Force : ${VS_FORCE[c.f1].label}`, px + 4, py + ph + 21, 7, "#b9a6e0"); text(`Force : ${VS_FORCE[c.f2].label}`, px + pw - 4, py + ph + 21, 7, "#b9a6e0", "right");
    if (c.ai === 3 && !COOP.on) text(say(`Joueur 2 : appuie sur ${keyName("Digit2")} ou sur Start`, "Joueur 2 : branche une manette", "Joueur 2 : Start sur une autre manette"), px + pw / 2, py + ph + 36, 7, "#fccc28", "center");
    else if (c.ai === 3) text(COOP.dev === "pad" ? "Joueur 2 : ◀ ▶ sur sa manette pour son héros" : "Joueur 2 : ← → pour son héros", px + pw / 2, py + ph + 36, 7, "#e8dcff", "center");
    text("Gagne tes manches pour gagner le match !", px + pw / 2, py + ph + 50, 7, "#8a7aa8", "center");
    text(say("▲ ▼ choisir, ◀ ▶ changer, Entrée : combattre, Échap : retour", "Touche les flèches pour changer", "Croix pour choisir, {A} : combattre, {B} : retour"), VW / 2, 254, 8, "#b9a6e0", "center");
    drawBackBtn("◀ Retour");
    if (msg && msg.t > 0) text(msg.text, VW / 2, 242, 8, "#fccc28", "center");
  }
};
function vsTryStart() {
  if (VS.cfg.ai === 3 && !COOP.on) { msg = { text: "Il manque le joueur 2 !", t: 2.5 }; audio.sfx("nope"); voice.say(msg.text, true); return; }
  vsStartMatch();
}

/* ---- Match et manches ---- */
function vsStartMatch() {
  const c = VS.cfg;
  VS.arena = c.arena < 0 ? VS_ARENAS[Math.floor(Math.random() * VS_ARENAS.length)] : VS_ARENAS[c.arena];
  VS.wins = [0, 0]; VS.round = 0; VS.winner = -1; VS.paused = false;
  vsStartRound();
}
function vsBuildArena(a) {
  if (a.camp !== undefined) {
    const W = CWORLDS[a.camp];
    return { json: true, vs: true, W, R: W.rooms[W.rooms.length - 1], width: VW, solids: [{ x: 0, y: 240, w: 480, h: 32 }],
      plats: [{ x: 80, y: 184, w: 80, h: 16 }, { x: 304, y: 184, w: 80, h: 16 }], blocks: [], decor: [], hazards: [], dest: [], items: [], exits: [],
      machine: null, ckpt: null, start: { x: 100, y: 200 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null, floor: 240 };
  }
  return { json: true, vs: true, eg: a.eg, W: CWORLDS[2], R: CWORLDS[2].rooms[11], width: VW, solids: [{ x: -40, y: 236, w: 560, h: 40 }], plats: [], blocks: [], decor: [], hazards: [], dest: [],
    items: [], exits: [], machine: null, ckpt: null, start: { x: 100, y: 196 }, foeSpawns: [], bossSpawn: null, lastSafe: null, leaving: false, arena: null, covers: [], gold: [], qitems: [], sock: null, floor: 236 };
}
// Un joueur vu comme un « ennemi » par l'autre : ses coups, tirs et pouvoirs passent par hitEnemy → vsHit
function vsProxy(o) {
  return { type: "vsp", pl: o, alive: true,
    get x() { return o.x; }, set x(v) {}, get y() { return o.y; }, set y(v) {}, get w() { return o.w; }, set w(v) {}, get h() { return o.h; }, set h(v) {} };
}
function vsStartRound() {
  const c = VS.cfg, F1 = VS_FORCE[c.f1], F2 = VS_FORCE[c.f2];
  lvl = vsBuildArena(VS.arena); terrainFor = null;
  enemies = []; lasers = []; parts = []; pickups = []; ghosts = []; fxs = []; mach = null; chal = null; rush = null; pluie = null; hitstop = 0; roomTime = 0;
  const p1 = makePlayer(CHARS[c.c1], K, 0), p2 = makePlayer(CHARS[c.c2], c.ai === 3 ? K2 : KAI, 1);
  players = [p1, p2];
  [[p1, 110, 1, F1], [p2, 360, -1, F2]].forEach(([p, x, f, F]) => {
    Object.assign(p, { x, y: lvl.floor - p.h - 30, face: f, vhp: F.hp, vmax: F.hp, dmgMul: F.dmg, hp: 99, inv: 0, gauge: 0.5, stunT: 0, koT: 0, realIn: p.input, ai: { t: 0, hold: 0, powHold: 0 } });
  });
  VS.st = "intro"; VS.t = 0; VS.round++; VS.clock = VS_TIMES[c.time].t; VS.notes = [];
  setTimeFx(false, false);
  state = "versus";
  voice.say(`Manche ${VS.round}`, true); audio.sfx("start");
}
const vsOther = p => players[1 - p.idx];
// Coup reçu : src "atk" (coup), "dash", "proj" (tir, dmg), "laser"
function vsHit(t, src, p, dmg) {
  if (!p || t === p || VS.st !== "fight" || t.dead) return;
  if (src === "atk") { if (p.hitList.has(t)) return; p.hitList.add(t); }
  if (src === "dash") { if (p.dashHits.has(t)) return; p.dashHits.add(t); }
  if (t.inv > 0) return;
  const pw = powerOf(t.C);
  if (t.powerOn && pw && pw.shield) { t.inv = 0.3; audio.sfx("deflect"); burst(t.x + 5, t.y + 16, 12, [fxCol(t), "#ffffff"], 140, 0.3, 0, 1); return; }
  const bark = src === "proj" && dmg >= 9;   // super aboiement : il renverse
  let n = src === "atk" ? 8 : src === "dash" ? 6 : src === "laser" ? 8 : bark ? 12 : 6 * Math.min(dmg || 1, 3);
  n = Math.round(n * p.dmgMul);
  t.vhp = Math.max(0, t.vhp - n); t.inv = 0.4; t.hurtT = 0.35;
  const dir = Math.sign(t.x - p.x) || p.face;
  t.vx = dir * (bark ? 300 : 170); t.vy = bark ? -300 : -180; t.dashT = 0;
  if (t.C.grunt) audio.sfx("voix:" + t.C.grunt);
  audio.sfx(src === "atk" ? "sword_hit" : "hurt"); hitstop = Math.max(hitstop, 0.06); shake = Math.max(shake, 4);
  burst(t.x + 5, t.y + 14, 14, [fxCol(p), "#ffffff", t.C.color], 170, 0.45, 300, 2);
  VS.notes.push({ x: t.x + 5, y: t.y - 4, s: "-" + n, t: 0, col: COOP_COL[t.idx] });
  rumble(120, 0.4, 0.4);
  if (t.vhp <= 0) vsKO(t);
}
function vsKO(t) {
  const w = vsOther(t);
  t.dead = true; t.powerOn = false; t.koT = 0; t.vy = -200;
  if (t.C.koSound) audio.sfx("ko:" + t.C.koSound);
  burst(t.x + 5, t.y + 10, 24, ["#fccc28", "#ffffff", t.C.color], 160, 0.7, 120, 2);
  VS.wins[w.idx]++; vsRoundEnd(w.idx, "K.O. !");
}
function vsRoundEnd(wi, why) {
  VS.st = "ko"; VS.t = 0; VS.winner = wi; VS.why = why;
  setTimeFx(false, false); shake = 8; flash = 0.15; audio.sfx(wi < 0 ? "nope" : "victory"); rumble(400, 0.8, 0.6);
  const name = wi < 0 ? "" : players[wi].C.name;
  VS.say = wi < 0 ? "Égalité !" : `${name} gagne la manche !`;
  voice.say(VS.say, true);
  for (const p of players) { p.powerOn = false; p.input = VS_NOIN; }
}
function vsTarget() { return VS_ROUNDS[VS.cfg.rounds].n; }

/* ---- Pouvoirs en versus ---- */
// Comme en jeu (jauges de la difficulté normale), avec trois adaptations : le ralenti ne ralentit que l'adversaire,
// le rugissement étourdit l'adversaire, le pique-nique redonne de la vie.
function vsPowers(rdt) {
  const d = DIFFS[1];
  for (const p of players) {
    const pw = powerOf(p.C), can = VS.st === "fight" && !p.dead && !(p.stunT > 0);
    if (!pw) continue;
    if (pw.burst) {
      p.powerOn = false;
      if (can && hit(...p.input.power)) {
        if (p.gauge < pw.burst - 1e-6) audio.sfx("nope");
        else if (pw.effect === "stun") {
          const o = vsOther(p); if (!o.dead && Math.abs(o.x - p.x) < 220) { o.stunT = 1.3; o.vx = 0; }
          for (let i = 0; i < 10; i++) parts.push({ x: p.x + 5, y: p.y + 16, vx: Math.cos(i * 0.63) * 140, vy: Math.sin(i * 0.63) * 80 - 40, life: 0.8, max: 0.8, color: i % 2 ? "#ff6ec7" : "#ffffff", size: 3, grav: 0 });
          flash = 0.06; audio.sfx("stun"); p.gauge -= pw.burst;
        } else if (pw.effect === "heal") {
          if (p.vhp >= p.vmax) audio.sfx("nope");
          else { p.vhp = Math.min(p.vmax, p.vhp + 15); p.gauge -= pw.burst; audio.sfx("heal"); burst(p.x + 5, p.y + 16, 18, ["#ff4f8a", "#ffffff", "#ffb0d0"], 120, 0.6, 0, 1); VS.notes.push({ x: p.x + 5, y: p.y - 4, s: "+15", t: 0, col: "#7dffb0" }); }
        } else { enemies = [vsProxy(vsOther(p))]; burstPower(p, pw); }
      }
      p.gauge = Math.min(1, p.gauge + d.regen * rdt);
    } else {
      p.powerOn = !!(can && down(...p.input.power) && p.gauge > 0);
      p.gauge = p.powerOn ? Math.max(0, p.gauge - d.drain * rdt) : Math.min(1, p.gauge + d.regen * rdt);
    }
  }
  // effets sur le temps : seulement pour le son et l'image (le ralenti est appliqué à l'adversaire dans vsUpdateFight)
  setTimeFx(players.some(p => usingPower(p, "slow")), players.some(p => usingPower(p, "fast")));
}
// Tirs : chacun ne cherche que l'adversaire de son tireur
function vsLasers(dt) {
  for (const l of lasers) {
    if (!l.alive) continue;
    if (!l.wpn) { l.alive = false; continue; }
    enemies = l.p ? [vsProxy(vsOther(l.p))] : [];
    updateWProj(l, dt);
  }
  lasers = lasers.filter(l => l.alive);
}

/* ---- Adversaire ordinateur ---- */
// Il joue avec des touches virtuelles (KAI), comme un joueur : réflexes, précision et ruses selon le niveau.
const VS_AI_LV = [
  { react: 0.42, aim: 0.45, dodge: 0.12, pause: 0.35, dash: 0, power: 0.15 },
  { react: 0.24, aim: 0.75, dodge: 0.35, pause: 0.12, dash: 0.25, power: 0.35 },
  { react: 0.12, aim: 0.95, dodge: 0.65, pause: 0, dash: 0.45, power: 0.6 }];
function vsAI(p, dt) {
  const o = vsOther(p), A = p.ai, L = VS_AI_LV[Math.min(VS.cfg.ai, 2)], C = p.C;
  const out = { ALeft: false, ARight: false, AJump: false, ADown: false, AAtk: false, ASpec: false, APow: false };
  if (VS.st === "fight" && !p.dead && !o.dead) {
    A.t -= dt; A.hold -= dt; A.powHold -= dt;
    const dx = o.x - p.x, adx = Math.abs(dx), dy = o.y - p.y, toward = Math.sign(dx) || 1;
    const ranged = C.attack === "magie" || VS_RANGED.has(curWeapon(p).id);
    const want = ranged ? 110 : (C.atkW || 24) + 2;
    if (A.t <= 0) {
      A.t = L.react * (0.7 + Math.random() * 0.6);
      A.move = Math.random() < L.pause ? 0 : adx > want + 6 ? toward : ranged && adx < 60 ? -toward : 0;
      A.atk = adx < want + 10 && Math.abs(dy) < 34 && Math.random() < L.aim;
      // esquive : il saute quand l'autre frappe tout près, ou qu'un tir arrive
      const danger = (o.atkT >= 0 && adx < 60) || lasers.some(l => l.alive && l.p === o && Math.abs(l.x - p.x) < 70 && Math.sign(l.vx || 0) === -toward);
      if (danger && Math.random() < L.dodge) A.hold = 0.3;
      if (dy < -40 && adx < 100 && p.onGround) A.hold = 0.3;                         // l'autre est sur une plateforme
      if (A.move && Math.abs(p.vx) < 10 && p.onGround && Math.random() < 0.5) A.hold = 0.25;   // bloqué contre un mur
      if (!p.onGround && dy < -30 && p.vy > -60 && C.special === "doublejump") A.dj = true;
      A.drop = dy > 40 && p.onGround && onOneWay(p);
      A.dash = C.special === "dash" && adx > 50 && adx < 150 && Math.abs(dy) < 30 && Math.random() < L.dash;
      const pw = powerOf(C);
      if (pw && Math.random() < L.power) {
        if (pw.burst) A.pow = p.gauge >= pw.burst && (pw.effect === "heal" ? p.vhp < p.vmax * 0.6 : adx < 160);
        else if (p.gauge > 0.7 && adx < 170) A.powHold = 1 + Math.random();
      }
    }
    if (A.move < 0) out.ALeft = true; else if (A.move > 0) out.ARight = true;
    if (A.atk) { if (toward < 0) { out.ALeft = true; out.ARight = false; } else { out.ARight = true; out.ALeft = false; } out.AAtk = true; A.atk = false; }
    if (A.hold > 0) out.AJump = true;
    if (A.dj) { out.AJump = !keys.AJump; A.dj = false; }
    if (A.drop) { out.ADown = true; A.drop = false; }
    if (A.dash) { if (toward < 0) out.ALeft = true; else out.ARight = true; out.ASpec = true; A.dash = false; }
    if (A.pow) { out.APow = true; A.pow = false; }
    if (A.powHold > 0) out.APow = true;
  }
  for (const k in out) vkey(k, out[k]);
}

/* ---- Combat ---- */
SCREENS.versus = {
  update(rdt) {
    if (VS.st === "end") { vsEndUpdate(); updateParts(rdt); return; }
    if (hit("Escape", "KeyP", "TPause", "GStart", "HStart")) { VS.paused = !VS.paused; audio.sfx("pause"); setTimeFx(false, false); }
    if (VS.paused) {
      if (hit("KeyQ", "Backspace", "GB") || (hit("Mouse0") && inside({ x: 170, y: 150, w: 140, h: 22 }))) { VS.paused = false; state = "vssetup"; audio.sfx("back"); }
      return;
    }
    VS.t += rdt; if (msg && msg.t > 0) msg.t -= rdt;
    if (VS.st === "intro" && VS.t > 1.6) { VS.st = "fight"; VS.t = 0; for (const p of players) p.input = p.realIn; audio.sfx("boss_intro"); voice.say("Combattez !", true); }
    else if (VS.st === "intro") for (const p of players) p.input = VS_NOIN;
    if (VS.st === "fight") {
      vsPowers(rdt);
      if (VS.clock > 0) {
        VS.clock -= rdt;
        if (VS.clock <= 0) {
          VS.clock = 0;
          const [a, b] = players.map(p => p.vhp / p.vmax), wi = Math.abs(a - b) < 0.005 ? -1 : a > b ? 0 : 1;
          if (wi >= 0) VS.wins[wi]++;
          vsRoundEnd(wi, "Temps écoulé !");
        }
      }
    }
    if (hitstop > 0) { hitstop -= rdt; return; }
    // ralenti au K.O. ; le ralenti de Lune ne ralentit que son adversaire
    const base = rdt * (VS.st === "ko" && VS.t < 0.8 ? 0.35 : 1);
    if (VS.cfg.ai < 3) vsAI(players[1], rdt);
    for (const p of players) {
      const o = vsOther(p);
      p.stunT = Math.max(0, (p.stunT || 0) - rdt);
      if (VS.st === "fight") p.input = p.stunT > 0 ? VS_NOIN : p.realIn;
      enemies = VS.st === "fight" ? [vsProxy(o)] : [];
      const dt = base * (usingPower(o, "slow") ? 0.45 : 1);
      if (p.dead) { p.koT += dt; if (!p.onGround || p.vy < 0) { p.vy = Math.min(p.vy + 1500 * dt, 600); moveBody(p, dt); } continue; }
      updatePlayer(p, dt);
      if (p.x < 6 || p.x > VW - 16) { p.x = clamp(p.x, 6, VW - 16); p.vx = 0; }   // toujours en entier dans l'écran
      if (p.y > VH + 8) { p.x = clamp(p.x, 40, VW - 50); p.y = 40; p.vy = 0; }   // jamais de chute sans fin (au cas où)
    }
    enemies = [];
    vsLasers(base);
    updateParts(base); updateFx(base);
    for (const n of VS.notes) { n.t += rdt; n.y -= 20 * rdt; }
    VS.notes = VS.notes.filter(n => n.t < 0.9);
    if (VS.st === "ko") {
      if (VS.winner >= 0 && Math.random() < 0.3) { const w = players[VS.winner]; parts.push({ x: w.x + 5 + (Math.random() - 0.5) * 30, y: w.y - 10, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 60, life: 1, max: 1, color: ["#ff4f8a", "#fccc28", "#5ef0ff", "#7dffb0"][Math.floor(Math.random() * 4)], size: 2, grav: 120 }); }
      if (VS.t > 3) {
        if (VS.wins.some(w => w >= vsTarget())) vsMatchEnd();
        else vsStartRound();
      }
    }
  },
  draw() {
    vsDrawArena();
    ctx.save();
    drawFxList(true);
    for (const l of lasers) if (l.wpn) drawWProj(l);
    drawGhosts();
    for (const p of players) vsDrawPlayer(p);
    drawFxList(false);
    for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(Math.round(q.x), Math.round(q.y), q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    for (const n of VS.notes) { ctx.globalAlpha = Math.min(1, (0.9 - n.t) * 3); text(n.s, n.x, n.y, 8, n.col, "center"); ctx.globalAlpha = 1; }
    ctx.restore();
    vsDrawHUD();
    if (VS.st === "intro") {
      const k = VS.t < 1 ? `Manche ${VS.round}` : "Combattez !";
      R(0, 108, VW, 40, "rgba(10,6,24,0.6)"); text(k, VW / 2, 128, 20, "#ffffff", "center", "#ff5a7a");
    }
    if (VS.st === "ko") { R(0, 100, VW, 52, "rgba(10,6,24,0.6)"); text(VS.why, VW / 2, 116, 14, "#fccc28", "center", "#ff5a7a"); text(VS.say, VW / 2, 138, 11, VS.winner >= 0 ? COOP_COL[VS.winner] : "#ffffff", "center"); }
    if (VS.st === "end") vsEndDraw();
    if (VS.paused) {
      R(0, 0, VW, VH, "rgba(10,6,24,0.7)"); text("Pause", VW / 2, 110, 18, "#ffffff", "center", "#ff5a7a");
      text(say("Échap : reprendre", "Touche ⏸ : reprendre", "{START} : reprendre"), VW / 2, 136, 9, "#e8dcff", "center");
      R(170, 150, 140, 22, "rgba(255,90,122,0.25)"); text(say("Q : arrêter le match", "Arrêter le match", "{B} : arrêter le match"), VW / 2, 161, 9, "#ffffff", "center");
    }
  }
};
function vsDrawArena() {
  const a = VS.arena;
  if (a.eg) { if (hasAtlas("eglise_" + a.eg)) drawFrame("eglise_" + a.eg, 0, VW / 2, VH, 1); else R(0, 0, VW, VH, "#1a0612"); R(0, 0, VW, VH, "rgba(20,0,16,0.15)"); return; }
  const bg = getImg(lvl.R.bg);
  if (bg.ok) ctx.drawImage(bg.img, 0, 0, VW, VH); else R(0, 0, VW, VH, "#120a22");
  R(0, 0, VW, VH, "rgba(8,4,20,0.16)");
  if (terrainFor !== lvl) { terrainCanvas = makeTerrain(lvl); if (terrainCanvas) terrainFor = lvl; }
  if (terrainCanvas) ctx.drawImage(terrainCanvas, 0, 0);
  else { ctx.fillStyle = "#2a2440"; for (const s of lvl.solids) ctx.fillRect(s.x, s.y, s.w, s.h); for (const s of lvl.plats) ctx.fillRect(s.x, s.y, s.w, 6); }
}
// Héros en versus : comme en jeu ; étourdi : petites étoiles ; K.O. : sa pose de KO (ou couché) ; vainqueur : sa pose de victoire
function vsDrawPlayer(p) {
  const A = ATL[charAtlas(p.C)] || { anims: {} }, An = A.anims, x = p.x + 5, y = p.y + p.h;
  // flèche 1 / 2 au-dessus de la tête
  const col = COOP_COL[p.idx], ty = p.y - 14 + Math.sin(time * 5 + p.idx) * 1.5;
  if (p.dead) {
    const fr = An.ko ? An.ko[0] + Math.min(An.ko[1] - 1, Math.floor(p.koT * 8)) : An.dead ? An.dead[0] : null;
    if (fr !== null) drawChar(p.C, fr, x, y, p.face);
    else { ctx.save(); ctx.translate(Math.round(x), Math.round(y - 4)); ctx.rotate(-p.face * Math.PI / 2 * Math.min(1, p.koT * 4)); drawChar(p.C, 0, 0, 4, p.face); ctx.restore(); }
    vsStars(x, y - 14);
    return;
  }
  if (VS.st === "ko" && VS.winner === p.idx && p.onGround && VS.t > 0.6) {
    const fr = An.victoire ? An.victoire[0] + Math.floor(VS.t * 6) % An.victoire[1] : An.joie ? An.joie[0] : An.jump ? An.jump[0] : 0;
    const hop = An.victoire || An.joie ? 0 : Math.round(Math.abs(Math.sin(VS.t * 6)) * 6);
    drawChar(p.C, fr, x, y - hop, p.face);
  } else drawCampPlayer(p);
  if (p.stunT > 0) vsStars(x, p.y - 2);
  text(String(p.idx + 1), x, ty - 6, 7, col, "center"); R(Math.round(x) - 2, Math.round(ty), 5, 2, col); R(Math.round(x) - 1, Math.round(ty) + 2, 3, 1, col);
}
function vsStars(x, y) { for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; R(Math.round(x + Math.cos(a) * 9) - 1, Math.round(y + Math.sin(a) * 3) - 1, 3, 3, i % 2 ? "#fccc28" : "#ffffff"); } }
function vsDrawHUD() {
  R(0, 0, VW, 30, "rgba(10,6,24,0.72)");
  players.forEach((p, i) => {
    const w = 170, x = i === 0 ? 8 : VW - 8 - w, col = COOP_COL[i], k = p.vhp / p.vmax;
    R(x, 6, w, 8, "#0e0a1a"); R(x + 1, 7, w - 2, 6, "#3a1a2a");
    const fw = Math.round((w - 2) * k), lowC = k < 0.25 ? "#ff3b5c" : k < 0.5 ? "#fccc28" : "#7dffb0";
    if (i === 0) R(x + 1, 7, fw, 6, lowC); else R(x + w - 1 - fw, 7, fw, 6, lowC);
    text(p.C.name, i === 0 ? x : x + w, 20, 8, col, i === 0 ? "left" : "right");
    // jauge de pouvoir
    if (powerOf(p.C)) { const gw = 60, gx = i === 0 ? x + w - gw : x; R(gx, 17, gw, 4, "#2a1a3a"); R(i === 0 ? gx : gx + gw - Math.round(gw * p.gauge), 17, Math.round(gw * p.gauge), 4, p.C.color); }
    // manches gagnées
    for (let r = 0; r < vsTarget(); r++) { const cx = i === 0 ? x + w + 8 : x - 8, cy = 8 + r * 8; ctx.fillStyle = r < VS.wins[i] ? col : "#3a2a5c"; ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2); ctx.fill(); }
  });
  if (VS_TIMES[VS.cfg.time].t) text(String(Math.ceil(VS.clock)), VW / 2, 12, 14, VS.clock < 10 ? "#ff5a7a" : "#ffffff", "center");
  text(vsArenaName(VS.arena), VW / 2, 24, 6, "#b9a6e0", "center");
}

/* ---- Fin du match ---- */
function vsMatchEnd() {
  VS.st = "end"; VS.t = 0; VS.endSel = 0;
  const w = players[VS.wins[0] > VS.wins[1] ? 0 : 1]; VS.champ = w.idx;
  audio.sfx("victory"); voice.say(`${w.C.name} gagne le match !`, true);
}
const VS_END = [{ x: 96, y: 210, w: 92, h: 20, label: "Revanche" }, { x: 194, y: 210, w: 92, h: 20, label: "Réglages" }, { x: 292, y: 210, w: 92, h: 20, label: "Laverie" }];
function vsEndUpdate() {
  VS.t += 1 / 60;
  if (Math.random() < 0.6) parts.push({ x: Math.random() * VW, y: -4, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 60, life: 4, max: 4, color: ["#ff4f8a", "#fccc28", "#5ef0ff", "#7dffb0", "#c86eff"][Math.floor(Math.random() * 5)], size: 2, grav: 20 });
  if (VS.t < 0.8) return;
  if (hit(...K.left)) { VS.endSel = (VS.endSel + 2) % 3; audio.sfx("select"); }
  if (hit(...K.right)) { VS.endSel = (VS.endSel + 1) % 3; audio.sfx("select"); }
  let go = hit(...K.ok) ? VS.endSel : -1;
  if (hit("Mouse0")) VS_END.forEach((b, i) => { if (inside(b)) go = i; });
  if (hit("Escape", "GB")) go = 1;
  if (go === 0) vsStartMatch();
  else if (go === 1) { state = "vssetup"; audio.sfx("back"); }
  else if (go === 2) { setTimeFx(false, false); enterHub({ x: 380 }); }
}
function vsEndDraw() {
  const w = players[VS.champ], col = COOP_COL[VS.champ];
  R(0, 0, VW, VH, "rgba(10,6,24,0.55)");
  text(`${w.C.name} gagne le match !`, VW / 2, 60, 18, col, "center", col);
  text(`${VS.wins[0]} – ${VS.wins[1]}`, VW / 2, 84, 14, "#ffffff", "center");
  drawHeroPortrait(w.C, VW / 2, 180, 1, 2);
  VS_END.forEach((b, i) => {
    const sel = i === VS.endSel;
    R(b.x, b.y, b.w, b.h, sel ? "rgba(255,90,122,0.35)" : "rgba(14,8,30,0.9)");
    ctx.strokeStyle = sel ? "#ff5a7a" : "#3a2a5c"; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    text(b.label, b.x + b.w / 2, b.y + 10, 9, "#ffffff", "center");
  });
}
// Musique : celle du boss de l'arène, ou un thème de l'église (réglages : la musique du héros du joueur 1)
function versusMusic() {
  if (state === "vssetup" || !VS.arena) return charMusic(CHARS[VS.cfg.c1]);
  const a = VS.arena;
  if (a.eg) { const th = ["jules", "laurene", "mamie", "eglise"].map(n => "musique/eglise/" + n).filter(hasSound); if (th.length) return th[(a.eg + VS.round) % th.length]; }
  else { const id = CWORLDS[a.camp].boss, m = pickList(audio.list("boss:" + id, "musique/boss/" + id), VS.round); if (m) return m; }
  return pickList(audio.list("boss", MUSIC_BASES.boss), 0) || "synth:boss";
}
// Carte de l'écran des mondes
function drawVersusCard(r, tw, th) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + tw, r.y + th); g.addColorStop(0, "#3a0a2a"); g.addColorStop(1, "#0a1a3a");
  ctx.fillStyle = g; ctx.fillRect(r.x + 4, r.y + 4, tw, th);
  const C1 = ch(), C2 = CHARS[VS.cfg.c2 === charIdx ? vsNextChar(charIdx, 1) : VS.cfg.c2];
  ctx.imageSmoothingEnabled = false;
  drawChar(C1, 0, r.x + 4 + tw * 0.3, r.y + 4 + th - 4, 1, 0.9); drawChar(C2, 0, r.x + 4 + tw * 0.7, r.y + 4 + th - 4, -1, 0.9);
  text("VS", r.x + 4 + tw / 2, r.y + 4 + th / 2, 12, "#ffffff", "center", "#ff5a7a");
}
